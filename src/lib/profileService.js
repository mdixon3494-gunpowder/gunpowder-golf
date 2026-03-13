import { supabase, supabaseUrl, supabaseAnonKey } from './supabase'

/**
 * Profile CRUD operations
 * Handles both authenticated user profiles and ghost profiles (user_id = null)
 */

/**
 * Sanitize a display name — if it looks like an email, convert to a proper name.
 * e.g. "jeremy.lorinczy@gmail.com" → "Jeremy Lorinczy"
 */
export function sanitizeDisplayName(name) {
  if (!name || typeof name !== 'string') return name
  const trimmed = name.trim()
  if (!trimmed.includes('@')) return trimmed
  // Extract username before @, replace dots/underscores with spaces, title-case
  const username = trimmed.split('@')[0]
  return username
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

export async function getProfileByUserId(userId) {
  // Try Supabase client with AbortSignal
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .abortSignal(controller.signal)

    clearTimeout(timeoutId)

    if (error) {
      console.error('Error fetching profile by user_id:', error)
      throw error
    }
    return data?.[0] || null
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn('Supabase client profile query failed, trying direct fetch:', err.message)

    // Fallback: direct REST API call
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const fallbackController = new AbortController()
      const fallbackTimeout = setTimeout(() => fallbackController.abort(), 5000)

      const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&limit=1`,
        {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${token || supabaseAnonKey}`,
            'Accept': 'application/json'
          },
          signal: fallbackController.signal
        }
      )

      clearTimeout(fallbackTimeout)

      if (response.ok) {
        const data = await response.json()
        console.log('Direct fetch succeeded:', data?.length, 'results')
        return data?.[0] || null
      }
      console.error('Direct fetch failed:', response.status, response.statusText)
      return null
    } catch (fallbackErr) {
      console.error('Direct fetch also failed:', fallbackErr.message)
      return null
    }
  }
}

export async function getProfileById(profileId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (error) {
    console.error('Error fetching profile by id:', error)
  }
  return data || null
}

export async function createProfile({ userId = null, displayName, email = null, phone = null, defaultTee = 'blue' }) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      display_name: sanitizeDisplayName(displayName),
      email,
      phone,
      default_tee: defaultTee
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating profile:', error)
    throw error
  }
  return data
}

export async function updateProfile(profileId, updates) {
  const mappedUpdates = {}
  if (updates.displayName !== undefined) mappedUpdates.display_name = sanitizeDisplayName(updates.displayName)
  if (updates.email !== undefined) mappedUpdates.email = updates.email
  if (updates.phone !== undefined) mappedUpdates.phone = updates.phone
  if (updates.defaultTee !== undefined) mappedUpdates.default_tee = updates.defaultTee
  if (updates.avatarUrl !== undefined) mappedUpdates.avatar_url = updates.avatarUrl

  const { data, error } = await supabase
    .from('profiles')
    .update(mappedUpdates)
    .eq('id', profileId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    throw error
  }
  return data
}

export async function getGhostProfiles() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .is('user_id', null)
      .order('display_name')
      .abortSignal(controller.signal)

    clearTimeout(timeoutId)

    if (error) {
      console.error('Error fetching ghost profiles:', error)
      return []
    }
    return data || []
  } catch (err) {
    clearTimeout(timeoutId)
    console.error('Ghost profiles query failed:', err.message)
    return []
  }
}

export async function getGhostProfileByEmail(email) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .is('user_id', null)
      .eq('email', email)
      .limit(1)
      .abortSignal(controller.signal)

    clearTimeout(timeoutId)

    if (error) {
      console.error('Error fetching ghost profile by email:', error)
      return null
    }
    return data?.[0] || null
  } catch (err) {
    clearTimeout(timeoutId)
    console.error('Ghost profile by email query failed:', err.message)
    return null
  }
}

export async function assignEmailToProfile(profileId, email) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ email })
    .eq('id', profileId)
    .is('user_id', null)
    .select()

  if (error) {
    console.error('Error assigning email to profile:', error)
    throw error
  }
  return data?.[0] || null
}

export async function unlinkProfile(profileId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ user_id: null })
    .eq('id', profileId)
    .select()

  if (error) {
    console.error('Error unlinking profile:', error)
    throw error
  }
  return data?.[0] || null
}

// Merge a duplicate claimed profile into a ghost profile.
// Transfers user_id from duplicate to ghost, migrates league_members/round_history, deletes duplicate.
export async function mergeProfiles(ghostId, duplicateId) {
  // 1. Get the duplicate profile to grab its user_id
  const { data: dupeData, error: dupeError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', duplicateId)
    .limit(1)

  if (dupeError) throw dupeError
  const dupe = dupeData?.[0]
  if (!dupe) throw new Error('Duplicate profile not found')
  if (!dupe.user_id) throw new Error('Duplicate profile has no linked account')

  // 2. Migrate league_members rows from duplicate to ghost BEFORE deleting
  const { data: dupeMembers } = await supabase
    .from('league_members')
    .select('league_id')
    .eq('profile_id', duplicateId)

  if (dupeMembers && dupeMembers.length > 0) {
    const { data: ghostMembers } = await supabase
      .from('league_members')
      .select('league_id')
      .eq('profile_id', ghostId)

    const ghostLeagues = new Set((ghostMembers || []).map(m => m.league_id))

    for (const dm of dupeMembers) {
      if (!ghostLeagues.has(dm.league_id)) {
        await supabase
          .from('league_members')
          .update({ profile_id: ghostId })
          .eq('profile_id', duplicateId)
          .eq('league_id', dm.league_id)
      }
    }
    await supabase
      .from('league_members')
      .delete()
      .eq('profile_id', duplicateId)
  }

  // 3. Migrate round_history rows from duplicate to ghost
  await supabase
    .from('round_history')
    .update({ profile_id: ghostId })
    .eq('profile_id', duplicateId)

  // 4. Delete the duplicate profile (CASCADE cleans up any remaining FK refs)
  //    This frees up the user_id for the ghost profile
  const { error: deleteError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', duplicateId)

  if (deleteError) throw new Error('Failed to delete duplicate profile: ' + deleteError.message)

  // 5. Now transfer user_id to the ghost profile (no unique conflict since dupe is gone)
  const updateFields = { user_id: dupe.user_id }
  if (dupe.email) updateFields.email = dupe.email
  if (dupe.avatar_url) updateFields.avatar_url = dupe.avatar_url

  const { data: merged, error: mergeError } = await supabase
    .from('profiles')
    .update(updateFields)
    .eq('id', ghostId)
    .is('user_id', null)
    .select()

  if (mergeError) throw mergeError
  if (!merged || merged.length === 0) throw new Error('Failed to update ghost profile — it may already be claimed')

  if (deleteError) {
    console.warn('Could not delete duplicate profile:', deleteError)
    // Non-fatal — the merge itself succeeded
  }

  return merged[0]
}

export async function getClaimedProfiles() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .not('user_id', 'is', null)
      .order('display_name')
      .abortSignal(controller.signal)

    clearTimeout(timeoutId)

    if (error) {
      console.error('Error fetching claimed profiles:', error)
      return []
    }
    return data || []
  } catch (err) {
    clearTimeout(timeoutId)
    console.error('Claimed profiles query failed:', err.message)
    return []
  }
}

export async function searchGhostProfilesByName(name) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .is('user_id', null)
      .ilike('display_name', `%${name}%`)
      .abortSignal(controller.signal)

    clearTimeout(timeoutId)

    if (error) {
      console.error('Error searching ghost profiles:', error)
      return []
    }
    return data || []
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn('Ghost profile search failed, trying direct fetch:', err.message)

    // Fallback: direct REST API call
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const fallbackController = new AbortController()
      const fallbackTimeout = setTimeout(() => fallbackController.abort(), 5000)

      const encodedName = encodeURIComponent(`%${name}%`)
      const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?user_id=is.null&display_name=ilike.${encodedName}`,
        {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${token || supabaseAnonKey}`,
            'Accept': 'application/json'
          },
          signal: fallbackController.signal
        }
      )

      clearTimeout(fallbackTimeout)

      if (response.ok) {
        const data = await response.json()
        console.log('Direct ghost profile search succeeded:', data?.length, 'results')
        return data || []
      }
      return []
    } catch (fallbackErr) {
      console.error('Direct ghost search also failed:', fallbackErr.message)
      return []
    }
  }
}

export async function searchProfiles(query, excludeProfileId = null) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    let q = supabase
      .from('profiles')
      .select('id, display_name, avatar_url, email, phone, default_tee, handicap_index')
      .ilike('display_name', `%${query}%`)
      .limit(10)
      .abortSignal(controller.signal)

    if (excludeProfileId) {
      q = q.neq('id', excludeProfileId)
    }

    const { data, error } = await q
    clearTimeout(timeoutId)

    if (error) {
      console.error('Error searching profiles:', error)
      return []
    }
    return data || []
  } catch (err) {
    clearTimeout(timeoutId)
    console.error('Profile search failed:', err.message)
    return []
  }
}

export async function claimProfile(profileId, userId, email = null) {
  // First check if this profile is already claimed by this user
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .eq('user_id', userId)

  if (existing && existing.length > 0) {
    return existing[0] // Already claimed by this user
  }

  // Try to claim it - also sync email from auth account
  const updateFields = { user_id: userId }
  if (email) updateFields.email = email

  const { data, error } = await supabase
    .from('profiles')
    .update(updateFields)
    .eq('id', profileId)
    .is('user_id', null)
    .select()

  if (error) {
    console.error('Error claiming profile:', error)
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error('Profile has already been claimed by another user')
  }

  return data[0]
}
