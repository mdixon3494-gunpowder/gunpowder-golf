import { supabase } from './supabase'

/**
 * League metadata and membership operations
 */

export async function getLeagueMetadata(leagueId) {
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name, owner_id, format_template_id, is_test, visibility, join_approval_required, created_at, updated_at')
    .eq('id', leagueId)
    .single()

  if (error) {
    console.error('Error fetching league metadata:', error)
    return null
  }
  return data
}

export async function updateLeagueMetadata(leagueId, updates) {
  const { data, error } = await supabase
    .from('leagues')
    .update(updates)
    .eq('id', leagueId)
    .select()
    .single()

  if (error) {
    console.error('Error updating league metadata:', error)
    throw error
  }
  return data
}

export async function getLeagueMembers(leagueId) {
  const { data, error } = await supabase
    .from('league_members')
    .select('*, profiles(*)')
    .eq('league_id', leagueId)
    .order('joined_at', { ascending: true })

  if (error) {
    console.error('Error fetching league members:', error)
    return []
  }
  return data || []
}

export async function addLeagueMember(leagueId, profileId, role = 'player') {
  const { data, error } = await supabase
    .from('league_members')
    .upsert(
      { league_id: leagueId, profile_id: profileId, role },
      { onConflict: 'league_id,profile_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error adding league member:', error)
    throw error
  }
  return data
}

export async function removeLeagueMember(leagueId, profileId) {
  const { error } = await supabase
    .from('league_members')
    .delete()
    .eq('league_id', leagueId)
    .eq('profile_id', profileId)

  if (error) {
    console.error('Error removing league member:', error)
    throw error
  }
}

export async function getMemberRole(leagueId, profileId) {
  if (!leagueId || !profileId) return null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const { data, error } = await supabase
      .from('league_members')
      .select('role')
      .eq('league_id', leagueId)
      .eq('profile_id', profileId)
      .limit(1)
      .abortSignal(controller.signal)
    clearTimeout(timeout)
    if (error || !data?.length) return null
    return data[0].role
  } catch (err) {
    console.warn('getMemberRole failed:', err.message)
    return null
  }
}

export async function updateMemberRole(leagueId, profileId, newRole) {
  const { data, error } = await supabase
    .from('league_members')
    .update({ role: newRole })
    .eq('league_id', leagueId)
    .eq('profile_id', profileId)
    .select()
    .single()

  if (error) {
    console.error('Error updating member role:', error)
    throw error
  }
  return data
}

export async function transferOwnership(leagueId, currentOwnerId, newOwnerId) {
  // Demote current owner to co_owner, promote new owner
  const { error: demoteError } = await supabase
    .from('league_members')
    .update({ role: 'co_owner' })
    .eq('league_id', leagueId)
    .eq('profile_id', currentOwnerId)

  if (demoteError) {
    console.error('Error demoting current owner:', demoteError)
    throw demoteError
  }

  const { error: promoteError } = await supabase
    .from('league_members')
    .update({ role: 'owner' })
    .eq('league_id', leagueId)
    .eq('profile_id', newOwnerId)

  if (promoteError) {
    console.error('Error promoting new owner:', promoteError)
    throw promoteError
  }

  // Update leagues.owner_id
  const { error: metaError } = await supabase
    .from('leagues')
    .update({ owner_id: newOwnerId })
    .eq('id', leagueId)

  if (metaError) {
    console.warn('Could not update leagues.owner_id:', metaError)
  }
}

export async function softDeleteLeague(leagueId) {
  const { error } = await supabase
    .from('leagues')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', leagueId)

  if (error) {
    console.error('Error soft-deleting league:', error)
    throw error
  }
}

export async function restoreLeague(leagueId) {
  const { error } = await supabase
    .from('leagues')
    .update({ deleted_at: null })
    .eq('id', leagueId)

  if (error) {
    console.error('Error restoring league:', error)
    throw error
  }
}

export async function getLeaguesForProfile(profileId) {
  const { data, error } = await supabase
    .from('league_members')
    .select('*, leagues(id, name, owner_id, is_test, type, visibility, deleted_at, created_at, updated_at)')
    .eq('profile_id', profileId)
    .order('joined_at', { ascending: false })

  if (error) {
    console.error('Error fetching leagues for profile:', error)
    return []
  }
  // Filter out soft-deleted leagues (client-side)
  return (data || []).filter(m => !m.leagues?.deleted_at)
}

export async function getLeaguesForProfileWithCounts(profileId) {
  const memberships = await getLeaguesForProfile(profileId)
  if (!memberships.length) return []

  // Fetch member counts for each league in parallel
  const enriched = await Promise.all(
    memberships.map(async (membership) => {
      const leagueId = membership.league_id
      try {
        const { count, error } = await supabase
          .from('league_members')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', leagueId)

        return {
          ...membership,
          memberCount: error ? 0 : (count || 0)
        }
      } catch {
        return { ...membership, memberCount: 0 }
      }
    })
  )

  return enriched
}
