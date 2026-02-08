import { supabase } from '../supabase'

/**
 * Migration: Populate new columns on existing leagues.
 *
 * 1. Set `name` on leagues that don't have one (derives from league code)
 * 2. Link all leagues to the Big Boys Format template via format_template_id
 *
 * This migration is idempotent - safe to run multiple times.
 */
export async function migrateLeagues(onProgress) {
  const log = (msg) => {
    console.log(`[migrateLeagues] ${msg}`)
    if (onProgress) onProgress(msg)
  }

  log('Starting league migration...')

  // 1. Find the Big Boys Format template
  const { data: template } = await supabase
    .from('format_templates')
    .select('id')
    .eq('is_default', true)
    .single()

  const templateId = template?.id || null
  if (templateId) {
    log(`Found default template: ${templateId}`)
  } else {
    log('Warning: No default format template found')
  }

  // 2. Load current league
  const targetLeagueId = localStorage.getItem('leagueId')
  if (!targetLeagueId) {
    log('No league ID found. Nothing to migrate.')
    return { updatedLeagues: 0 }
  }

  log(`Loading league: ${targetLeagueId}`)
  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, name, format_template_id, data')
    .eq('id', targetLeagueId)
    .single()

  if (error) {
    throw new Error(`Failed to load league: ${error.message}`)
  }

  const leagues = [league]

  let updatedLeagues = 0

  for (const league of leagues) {
    const updates = {}

    // Set name if not already set
    if (!league.name) {
      // Derive a readable name from the league code
      const leagueData = typeof league.data === 'string'
        ? JSON.parse(league.data)
        : league.data

      if (league.id === 'BIGBOYS') {
        updates.name = "Big Boy's League"
      } else if (leagueData?.isTestLeague) {
        updates.name = `Test League (${league.id})`
        updates.is_test = true
      } else {
        updates.name = `League ${league.id}`
      }
    }

    // Set format template if not already set
    if (!league.format_template_id && templateId) {
      updates.format_template_id = templateId
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      log(`Updating league ${league.id}: ${JSON.stringify(updates)}`)
      const { error: updateError } = await supabase
        .from('leagues')
        .update(updates)
        .eq('id', league.id)

      if (updateError) {
        log(`Error updating league ${league.id}: ${updateError.message}`)
      } else {
        updatedLeagues++
      }
    } else {
      log(`League ${league.id}: Already up to date`)
    }
  }

  log(`Migration complete: ${updatedLeagues} leagues updated`)
  return { updatedLeagues }
}
