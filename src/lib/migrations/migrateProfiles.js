import { supabase } from '../supabase'

/**
 * Migration: Create ghost profiles for existing players in the current league.
 * Uses batch insert for efficiency.
 */
export async function migrateProfiles(onProgress, { leagueId, players } = {}) {
  const log = (msg) => {
    console.log(`[migrateProfiles] ${msg}`)
    if (onProgress) onProgress(msg)
  }

  const targetLeagueId = leagueId || localStorage.getItem('leagueId')
  if (!targetLeagueId) {
    throw new Error('No league ID found')
  }

  if (!players || players.length === 0) {
    log('No players provided. Nothing to migrate.')
    return { migratedPlayers: 0, createdMembers: 0 }
  }

  // Filter to players that need profiles
  const needsProfile = players.filter(p => !p.profile_id)
  log(`${players.length} total players, ${needsProfile.length} need profiles`)

  if (needsProfile.length === 0) {
    log('All players already have profiles.')
    return { migratedPlayers: 0, createdMembers: 0 }
  }

  // Batch insert all ghost profiles at once
  log(`Batch creating ${needsProfile.length} ghost profiles...`)
  const profileInserts = needsProfile.map(p => ({
    user_id: null,
    display_name: p.name,
    email: p.email || null,
    phone: p.phone || null,
    default_tee: p.defaultTee || 'blue'
  }))

  const { data: createdProfiles, error: insertError } = await supabase
    .from('profiles')
    .insert(profileInserts)
    .select()

  if (insertError) {
    throw new Error(`Batch profile insert failed: ${insertError.message}`)
  }

  log(`Created ${createdProfiles.length} profiles`)

  // Map profiles back to players by index (same order as needsProfile)
  const updatedPlayers = [...players]
  let migratedPlayers = 0

  for (let i = 0; i < needsProfile.length; i++) {
    const player = needsProfile[i]
    const profile = createdProfiles[i]

    if (!profile) continue

    // Find this player in updatedPlayers and set profile_id
    const playerIdx = updatedPlayers.findIndex(p => p.id === player.id)
    if (playerIdx >= 0) {
      updatedPlayers[playerIdx] = { ...updatedPlayers[playerIdx], profile_id: profile.id }
      migratedPlayers++
    }
  }

  log(`Mapped ${migratedPlayers} profile IDs to players`)

  // Batch insert league_members
  log('Creating league member rows...')
  const memberInserts = createdProfiles.map(p => ({
    league_id: targetLeagueId,
    profile_id: p.id,
    role: 'player'
  }))

  // Also add members for players that already had profiles
  const existingProfilePlayers = players.filter(p => p.profile_id)
  for (const p of existingProfilePlayers) {
    memberInserts.push({
      league_id: targetLeagueId,
      profile_id: p.profile_id,
      role: 'player'
    })
  }

  const { error: memberError } = await supabase
    .from('league_members')
    .upsert(memberInserts, { onConflict: 'league_id,profile_id' })

  if (memberError) {
    log(`Warning: league_members insert error: ${memberError.message}`)
  } else {
    log(`Created ${memberInserts.length} league member rows`)
  }

  log(`Migration complete: ${migratedPlayers} profiles created`)
  return { migratedPlayers, createdMembers: memberInserts.length, updatedPlayers }
}
