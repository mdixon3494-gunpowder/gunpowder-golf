import { supabase } from './supabase'

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
