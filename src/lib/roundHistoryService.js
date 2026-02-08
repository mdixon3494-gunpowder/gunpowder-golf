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
