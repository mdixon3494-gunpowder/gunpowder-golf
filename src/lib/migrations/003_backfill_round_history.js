import { supabase } from '../supabase'
import { saveRoundHistory, recalculateAndStoreHandicap } from '../roundHistoryService'
import { DEFAULT_COURSE_TEES } from '../../utils/handicapCalculation'

const MIGRATION_KEY = 'migration_003_backfill_round_history'

/**
 * Migration 003: Backfill existing league scoreHistory into round_history table.
 * This ensures that rounds played before the round_history system was introduced
 * are available for handicap calculation from round_history.
 *
 * Idempotent: checks localStorage flag before running, deduplicates by
 * matching on profile_id + source_id + date + total_score.
 */
export async function backfillRoundHistory(onProgress) {
  const log = (msg) => {
    console.log(`[backfillRoundHistory] ${msg}`)
    if (onProgress) onProgress(msg)
  }

  // Check if already completed
  if (localStorage.getItem(MIGRATION_KEY) === 'done') {
    log('Already completed, skipping.')
    return { skipped: true }
  }

  log('Starting backfill of league scoreHistory to round_history...')

  // Fetch all league-type rows
  let leagues = []
  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('id, data, type')
      .eq('type', 'league')

    if (error) {
      log(`Error fetching leagues: ${error.message}`)
      return { error: error.message }
    }
    leagues = data || []
  } catch (err) {
    log(`Failed to fetch leagues: ${err.message}`)
    return { error: err.message }
  }

  log(`Found ${leagues.length} league(s) to process`)

  const allEntries = []
  const affectedProfileIds = new Set()

  for (const league of leagues) {
    const leagueData = typeof league.data === 'string' ? JSON.parse(league.data) : league.data
    if (!leagueData?.players) continue

    for (const player of leagueData.players) {
      if (!player.profileId || !player.scoreHistory?.length) continue

      for (const round of player.scoreHistory) {
        const total = round.total || round.totalScore
        if (!total || total <= 0) continue

        allEntries.push({
          profile_id: player.profileId,
          source_id: league.id,
          round_type: 'league',
          date: round.date,
          course_name: 'Gunpowder Golf Course',
          holes_played: 18,
          total_score: total,
          front_nine: round.frontNine || round.frontNineScore || null,
          back_nine: round.backNine || round.backNineScore || null,
          scores: round.scores || null,
          handicap_used: round.handicap_used || null,
          applied_to_handicap: true,
          format_name: null,
          metadata: { tee: round.tee || 'blue' }
        })

        affectedProfileIds.add(player.profileId)
      }
    }
  }

  log(`Built ${allEntries.length} entries for ${affectedProfileIds.size} player(s)`)

  if (allEntries.length === 0) {
    localStorage.setItem(MIGRATION_KEY, 'done')
    log('No entries to backfill.')
    return { inserted: 0, profiles: 0 }
  }

  // Check for existing entries to avoid duplicates
  // We'll use upsert-like logic: fetch existing entries for affected profiles, then filter
  let existingEntries = []
  try {
    const profileIds = [...affectedProfileIds]
    // Fetch in batches of 10 profiles to avoid query size issues
    for (let i = 0; i < profileIds.length; i += 10) {
      const batch = profileIds.slice(i, i + 10)
      const { data } = await supabase
        .from('round_history')
        .select('profile_id, source_id, date, total_score')
        .in('profile_id', batch)
        .eq('round_type', 'league')

      if (data) existingEntries.push(...data)
    }
  } catch (err) {
    log(`Warning: Could not check for duplicates: ${err.message}`)
    // Continue anyway - duplicates are better than missing data
  }

  // Build a set of existing keys for deduplication
  const existingKeys = new Set(
    existingEntries.map(e => `${e.profile_id}|${e.source_id}|${e.date}|${e.total_score}`)
  )

  const newEntries = allEntries.filter(e => {
    const key = `${e.profile_id}|${e.source_id}|${e.date}|${e.total_score}`
    return !existingKeys.has(key)
  })

  log(`${allEntries.length - newEntries.length} duplicates filtered, ${newEntries.length} new entries to insert`)

  if (newEntries.length === 0) {
    localStorage.setItem(MIGRATION_KEY, 'done')
    log('All entries already exist.')
    return { inserted: 0, profiles: affectedProfileIds.size }
  }

  // Insert in batches of 50
  let insertedCount = 0
  for (let i = 0; i < newEntries.length; i += 50) {
    const batch = newEntries.slice(i, i + 50)
    try {
      const result = await saveRoundHistory(batch)
      insertedCount += result.length
      log(`Inserted batch ${Math.floor(i / 50) + 1}: ${result.length} entries`)
    } catch (err) {
      log(`Warning: Batch insert failed: ${err.message}`)
    }
  }

  log(`Inserted ${insertedCount} entries total`)

  // Recalculate handicaps for affected profiles (non-blocking)
  log(`Recalculating handicaps for ${affectedProfileIds.size} profile(s)...`)
  for (const profileId of affectedProfileIds) {
    try {
      await recalculateAndStoreHandicap(profileId, DEFAULT_COURSE_TEES)
    } catch (err) {
      log(`Warning: Handicap recalc failed for ${profileId}: ${err.message}`)
    }
  }

  localStorage.setItem(MIGRATION_KEY, 'done')
  log('Backfill complete!')

  return { inserted: insertedCount, profiles: affectedProfileIds.size }
}
