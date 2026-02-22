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
 * 1) Calculates per-league handicaps from round_history (3+ rounds required)
 * 2) Falls back to stored handicaps from league JSONB player data
 * @param {string} profileId
 * @param {Object} courseTees
 * @returns {Promise<Array<{sourceId, sourceName, handicap, roundCount, type}>>}
 */
export async function getHandicapSourcesForProfile(profileId, courseTees = DEFAULT_COURSE_TEES) {
  const results = []
  const coveredSourceIds = new Set()

  // === Part 1: Calculated handicaps from round_history ===
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
  }

  if (rounds.length > 0) {
    // Group rounds by source_id
    const groupedBySource = {}
    for (const round of rounds) {
      const sid = round.source_id
      if (!sid) continue
      if (!groupedBySource[sid]) groupedBySource[sid] = []
      groupedBySource[sid].push(round)
    }

    for (const sid of Object.keys(groupedBySource)) {
      const sourceRounds = groupedBySource[sid]
      if (sourceRounds.length < 3) continue

      const mapped = sourceRounds.map(row => ({
        score: row.total_score,
        tee: row.metadata?.tee || 'blue',
        date: row.date
      }))

      const handicap = calculateHandicap(mapped, courseTees)
      if (handicap !== null) {
        results.push({
          sourceId: sid,
          sourceName: sid,
          handicap,
          roundCount: sourceRounds.length,
          type: 'calculated'
        })
        coveredSourceIds.add(sid)
      }
    }
  }

  // === Part 2: Stored handicaps from league player data ===
  // Find all leagues this profile is a member of
  const controller2 = new AbortController()
  const timeout2 = setTimeout(() => controller2.abort(), 5000)

  try {
    const { data: memberships, error } = await supabase
      .from('league_members')
      .select('league_id')
      .eq('profile_id', profileId)
      .abortSignal(controller2.signal)

    clearTimeout(timeout2)

    if (!error && memberships && memberships.length > 0) {
      // Only fetch leagues not already covered by round_history
      const uncoveredIds = memberships
        .map(m => m.league_id)
        .filter(id => !coveredSourceIds.has(id))

      if (uncoveredIds.length > 0) {
        const controller3 = new AbortController()
        const timeout3 = setTimeout(() => controller3.abort(), 5000)

        try {
          const { data: leagues, error: leagueErr } = await supabase
            .from('leagues')
            .select('id, name, data')
            .in('id', uncoveredIds)
            .is('deleted_at', null)
            .abortSignal(controller3.signal)

          clearTimeout(timeout3)

          if (!leagueErr && leagues) {
            for (const league of leagues) {
              const players = league.data?.players || []
              const player = players.find(p =>
                p.profileId === profileId || p.profile_id === profileId
              )
              if (player?.handicap != null) {
                results.push({
                  sourceId: league.id,
                  sourceName: league.name || league.id,
                  handicap: player.handicap,
                  roundCount: player.scoreHistory?.length || 0,
                  type: 'stored'
                })
                coveredSourceIds.add(league.id)
              }
            }
          }
        } catch (err) {
          clearTimeout(timeout3)
          console.warn('getHandicapSourcesForProfile: league data fetch failed', err.message)
        }
      }
    }
  } catch (err) {
    clearTimeout(timeout2)
    console.warn('getHandicapSourcesForProfile: league members fetch failed', err.message)
  }

  // === Resolve names for any round_history sources that still need them ===
  const needNames = results.filter(r => r.type === 'calculated' && r.sourceName === r.sourceId)
  if (needNames.length > 0) {
    const controller4 = new AbortController()
    const timeout4 = setTimeout(() => controller4.abort(), 5000)

    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('id, name')
        .in('id', needNames.map(s => s.sourceId))
        .abortSignal(controller4.signal)

      clearTimeout(timeout4)

      if (!error && data) {
        const nameMap = {}
        for (const league of data) nameMap[league.id] = league.name
        for (const source of needNames) {
          source.sourceName = nameMap[source.sourceId] || source.sourceId
        }
      }
    } catch (err) {
      clearTimeout(timeout4)
      console.warn('getHandicapSourcesForProfile: name resolve failed', err.message)
    }
  }

  return results
}
