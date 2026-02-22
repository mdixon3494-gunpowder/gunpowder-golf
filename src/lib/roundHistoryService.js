import { supabase } from './supabase'
import { calculateHandicap, DEFAULT_COURSE_TEES } from '../utils/handicapCalculation'

/**
 * Round history CRUD operations
 */

export async function saveRoundHistory(entries) {
  if (!entries || entries.length === 0) return []

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const { data, error } = await supabase
      .from('round_history')
      .insert(entries)
      .select()
      .abortSignal(controller.signal)

    clearTimeout(timeoutId)

    if (error) {
      console.error('Error saving round history:', error)
      return []
    }
    return data || []
  } catch (err) {
    clearTimeout(timeoutId)
    console.error('Round history save failed:', err.message)
    return []
  }
}

export async function getRoundHistoryByType(profileId, roundType, limit = 50) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const { data, error } = await supabase
      .from('round_history')
      .select('*')
      .eq('profile_id', profileId)
      .eq('round_type', roundType)
      .order('date', { ascending: false })
      .limit(limit)
      .abortSignal(controller.signal)

    clearTimeout(timeoutId)

    if (error) {
      console.error('Error fetching round history by type:', error)
      return []
    }
    return data || []
  } catch (err) {
    clearTimeout(timeoutId)
    console.error('Round history by type fetch failed:', err.message)
    return []
  }
}

export async function getRoundHistory(profileId, limit = 20) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const { data, error } = await supabase
      .from('round_history')
      .select('*')
      .eq('profile_id', profileId)
      .order('date', { ascending: false })
      .limit(limit)
      .abortSignal(controller.signal)

    clearTimeout(timeoutId)

    if (error) {
      console.error('Error fetching round history:', error)
      return []
    }
    return data || []
  } catch (err) {
    clearTimeout(timeoutId)
    console.error('Round history fetch failed:', err.message)
    return []
  }
}

/**
 * Get round history filtered for handicap calculation
 * @param {string} profileId
 * @param {'true'|'league'|'gunpowder'} scope
 * @param {string|null} leagueId - required when scope is 'league'
 * @param {number} limit
 */
export async function getRoundHistoryForHandicap(profileId, scope = 'true', leagueId = null, limit = 20) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    let query = supabase
      .from('round_history')
      .select('*')
      .eq('profile_id', profileId)
      .eq('applied_to_handicap', true)

    if (scope === 'league' && leagueId) {
      query = query.eq('source_id', leagueId)
    } else if (scope === 'gunpowder') {
      query = query.eq('course_name', 'Gunpowder Golf Course')
    }

    const { data, error } = await query
      .order('date', { ascending: false })
      .limit(limit)
      .abortSignal(controller.signal)

    clearTimeout(timeoutId)

    if (error) {
      console.error('Error fetching handicap round history:', error)
      return []
    }
    return data || []
  } catch (err) {
    clearTimeout(timeoutId)
    console.error('Handicap round history fetch failed:', err.message)
    return []
  }
}

/**
 * Calculate handicap from round_history for a profile
 * @param {string} profileId
 * @param {'true'|'league'|'gunpowder'} scope
 * @param {string|null} leagueId
 * @param {Object} courseTees
 */
export async function calculateHandicapFromHistory(profileId, scope = 'true', leagueId = null, courseTees = DEFAULT_COURSE_TEES) {
  const rounds = await getRoundHistoryForHandicap(profileId, scope, leagueId)
  if (rounds.length === 0) return null

  const mappedRounds = rounds.map(row => ({
    score: row.total_score,
    tee: row.metadata?.tee || 'blue',
    date: row.date
  }))

  return calculateHandicap(mappedRounds, courseTees)
}

/**
 * Update profile's handicap_index column
 */
export async function updateProfileHandicap(profileId, handicapIndex) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        handicap_index: handicapIndex,
        handicap_updated_at: new Date().toISOString()
      })
      .eq('id', profileId)
      .abortSignal(controller.signal)

    clearTimeout(timeoutId)

    if (error) {
      console.error('Error updating profile handicap:', error)
      return false
    }
    return true
  } catch (err) {
    clearTimeout(timeoutId)
    console.error('Profile handicap update failed:', err.message)
    return false
  }
}

/**
 * Recalculate handicap from round_history and store in profile
 * Uses "true" scope (all rounds) for the profile-level handicap_index
 */
export async function recalculateAndStoreHandicap(profileId, courseTees = DEFAULT_COURSE_TEES) {
  try {
    const handicap = await calculateHandicapFromHistory(profileId, 'true', null, courseTees)
    await updateProfileHandicap(profileId, handicap)
    return handicap
  } catch (err) {
    console.warn('recalculateAndStoreHandicap failed:', err.message)
    return null
  }
}

/**
 * Get all available handicap sources for a profile.
 * Fetches round_history, groups by source_id (league), calculates per-league handicaps,
 * and resolves league names.
 * @param {string} profileId
 * @param {Object} courseTees
 * @returns {Promise<Array<{sourceId: string, sourceName: string, handicap: number, roundCount: number}>>}
 */
export async function getHandicapSourcesForProfile(profileId, courseTees = DEFAULT_COURSE_TEES) {
  // Query 1: Fetch all applicable rounds
  const controller1 = new AbortController()
  const timeout1 = setTimeout(() => controller1.abort(), 5000)

  let rounds = []
  try {
    const { data, error } = await supabase
      .from('round_history')
      .select('*')
      .eq('profile_id', profileId)
      .eq('applied_to_handicap', true)
      .order('date', { ascending: false })
      .limit(100)
      .abortSignal(controller1.signal)

    clearTimeout(timeout1)
    if (!error && data) rounds = data
  } catch (err) {
    clearTimeout(timeout1)
    console.warn('getHandicapSourcesForProfile: round fetch failed', err.message)
    return []
  }

  if (rounds.length === 0) return []

  // Group rounds by source_id
  const groupedBySource = {}
  for (const round of rounds) {
    const sid = round.source_id
    if (!sid) continue
    if (!groupedBySource[sid]) groupedBySource[sid] = []
    groupedBySource[sid].push(round)
  }

  // Calculate handicap per source group (need >= 3 rounds)
  const sourceIds = Object.keys(groupedBySource)
  const sourcesWithHandicap = []

  for (const sid of sourceIds) {
    const sourceRounds = groupedBySource[sid]
    if (sourceRounds.length < 3) continue

    const mapped = sourceRounds.map(row => ({
      score: row.total_score,
      tee: row.metadata?.tee || 'blue',
      date: row.date
    }))

    const handicap = calculateHandicap(mapped, courseTees)
    if (handicap !== null) {
      sourcesWithHandicap.push({
        sourceId: sid,
        sourceName: sid,
        handicap,
        roundCount: sourceRounds.length
      })
    }
  }

  if (sourcesWithHandicap.length === 0) return sourcesWithHandicap

  // Query 2: Resolve league names
  const idsToResolve = sourcesWithHandicap.map(s => s.sourceId)
  const controller2 = new AbortController()
  const timeout2 = setTimeout(() => controller2.abort(), 5000)

  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('id, name')
      .in('id', idsToResolve)
      .abortSignal(controller2.signal)

    clearTimeout(timeout2)

    if (!error && data) {
      const nameMap = {}
      for (const league of data) {
        nameMap[league.id] = league.name
      }
      for (const source of sourcesWithHandicap) {
        source.sourceName = nameMap[source.sourceId] || source.sourceId
      }
    }
  } catch (err) {
    clearTimeout(timeout2)
    console.warn('getHandicapSourcesForProfile: league name fetch failed', err.message)
  }

  return sourcesWithHandicap
}
