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

export async function getLeaguesForProfile(profileId) {
  const { data, error } = await supabase
    .from('league_members')
    .select('*, leagues(id, name, owner_id, is_test, type, visibility, created_at, updated_at)')
    .eq('profile_id', profileId)
    .order('joined_at', { ascending: false })

  if (error) {
    console.error('Error fetching leagues for profile:', error)
    return []
  }
  return data || []
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
