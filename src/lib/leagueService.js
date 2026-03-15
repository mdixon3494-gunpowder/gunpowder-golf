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

export async function getPublicLeagues(searchQuery) {
  let query = supabase
    .from('leagues')
    .select('id, name, owner_id, created_at')
    .eq('visibility', 'public')
    .eq('type', 'league')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (searchQuery && searchQuery.trim()) {
    query = query.ilike('name', `%${searchQuery.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching public leagues:', error)
    return []
  }

  // Fetch member counts in parallel
  const enriched = await Promise.all(
    (data || []).map(async (league) => {
      try {
        const { count, error: countError } = await supabase
          .from('league_members')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', league.id)

        return { ...league, memberCount: countError ? 0 : (count || 0) }
      } catch {
        return { ...league, memberCount: 0 }
      }
    })
  )

  return enriched
}

export async function initiatePendingTransfer(leagueId, currentOwnerId, newOwnerId, newOwnerName) {
  // Store pending transfer in the JSONB data blob
  const { data: league, error: fetchError } = await supabase
    .from('leagues')
    .select('data')
    .eq('id', leagueId)
    .single()

  if (fetchError) throw fetchError

  const leagueData = typeof league.data === 'string' ? JSON.parse(league.data) : league.data

  leagueData.pendingOwnershipTransfer = {
    fromOwnerId: currentOwnerId,
    toOwnerId: newOwnerId,
    toOwnerName: newOwnerName,
    initiatedAt: new Date().toISOString(),
    // Transfer completes after 7 days OR when all co-owners approve
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    coOwnerApprovals: {}, // { profileId: true/false }
    status: 'pending' // 'pending' | 'approved' | 'cancelled'
  }

  const { error: updateError } = await supabase
    .from('leagues')
    .update({ data: leagueData })
    .eq('id', leagueId)

  if (updateError) throw updateError
  return leagueData.pendingOwnershipTransfer
}

export async function cancelPendingTransfer(leagueId) {
  const { data: league, error: fetchError } = await supabase
    .from('leagues')
    .select('data')
    .eq('id', leagueId)
    .single()

  if (fetchError) throw fetchError

  const leagueData = typeof league.data === 'string' ? JSON.parse(league.data) : league.data
  delete leagueData.pendingOwnershipTransfer

  const { error: updateError } = await supabase
    .from('leagues')
    .update({ data: leagueData })
    .eq('id', leagueId)

  if (updateError) throw updateError
}

export async function approvePendingTransfer(leagueId, profileId, approve) {
  const { data: league, error: fetchError } = await supabase
    .from('leagues')
    .select('data')
    .eq('id', leagueId)
    .single()

  if (fetchError) throw fetchError

  const leagueData = typeof league.data === 'string' ? JSON.parse(league.data) : league.data
  if (!leagueData.pendingOwnershipTransfer) throw new Error('No pending transfer')

  leagueData.pendingOwnershipTransfer.coOwnerApprovals[profileId] = approve

  const { error: updateError } = await supabase
    .from('leagues')
    .update({ data: leagueData })
    .eq('id', leagueId)

  if (updateError) throw updateError
  return leagueData.pendingOwnershipTransfer
}

export async function executePendingTransfer(leagueId) {
  // Load league data to get pending transfer
  const { data: league, error: fetchError } = await supabase
    .from('leagues')
    .select('data')
    .eq('id', leagueId)
    .single()

  if (fetchError) throw fetchError

  const leagueData = typeof league.data === 'string' ? JSON.parse(league.data) : league.data
  const transfer = leagueData.pendingOwnershipTransfer
  if (!transfer) throw new Error('No pending transfer')

  // Execute the actual transfer
  await transferOwnership(leagueId, transfer.fromOwnerId, transfer.toOwnerId)

  // Clean up
  delete leagueData.pendingOwnershipTransfer

  const { error: updateError } = await supabase
    .from('leagues')
    .update({ data: leagueData })
    .eq('id', leagueId)

  if (updateError) throw updateError
}

export async function requestToJoinLeague(leagueId, profileId, displayName) {
  // Fetch current data blob
  const { data: league, error: fetchError } = await supabase
    .from('leagues')
    .select('data')
    .eq('id', leagueId)
    .single()

  if (fetchError) {
    console.error('Error fetching league data for join request:', fetchError)
    throw fetchError
  }

  const blob = league.data || {}
  const pendingRequests = blob.pendingPlayerRequests || []

  // Avoid duplicate requests
  if (pendingRequests.some(r => r.profileId === profileId)) {
    return { alreadyRequested: true }
  }

  pendingRequests.push({
    profileId,
    displayName,
    requestedAt: new Date().toISOString()
  })

  const { error: updateError } = await supabase
    .from('leagues')
    .update({ data: { ...blob, pendingPlayerRequests: pendingRequests } })
    .eq('id', leagueId)

  if (updateError) {
    console.error('Error saving join request:', updateError)
    throw updateError
  }

  // Notify league members about join request
  import('./notificationService').then(({ sendPushNotification }) => {
    sendPushNotification(leagueId, 'Join Request',
      `${displayName} wants to join the league`,
      { tag: 'join-request', category: 'admin_messages' }
    )
  }).catch(() => {})

  return { alreadyRequested: false }
}
