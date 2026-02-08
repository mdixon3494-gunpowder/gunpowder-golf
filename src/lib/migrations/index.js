import { migrateProfiles } from './migrateProfiles'
import { migrateLeagues } from './migrateLeagues'

/**
 * Migration runner - tracks completed migrations via localStorage.
 * All migrations are idempotent, so re-running is safe.
 * Receives league context data to avoid Supabase query issues.
 */

export async function getCompletedMigrations() {
  try {
    const stored = localStorage.getItem('gunpowder_migrations')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export async function getPendingMigrations() {
  const completed = await getCompletedMigrations()
  const completedIds = new Set(completed.map(m => m.id))
  const all = [
    { id: 'migrate_profiles_v1', name: 'Create ghost profiles' },
    { id: 'migrate_leagues_v1', name: 'Populate league metadata' }
  ]
  return all.filter(m => !completedIds.has(m.id))
}

async function markMigrationComplete(migrationId) {
  try {
    const completed = await getCompletedMigrations()
    completed.push({ id: migrationId, run_at: new Date().toISOString() })
    localStorage.setItem('gunpowder_migrations', JSON.stringify(completed))
  } catch (err) {
    console.warn(`Could not track migration ${migrationId}:`, err.message)
  }
}

export async function runAllPendingMigrations(onProgress, { leagueId, players } = {}) {
  const log = (msg) => {
    console.log(`[MigrationRunner] ${msg}`)
    if (onProgress) onProgress(msg)
  }

  const pending = await getPendingMigrations()

  if (pending.length === 0) {
    log('No pending migrations.')
    return { ran: 0, results: [] }
  }

  log(`Found ${pending.length} pending migration(s)`)
  const results = []

  for (const migration of pending) {
    log(`Running: ${migration.name} (${migration.id})`)
    try {
      let result
      if (migration.id === 'migrate_profiles_v1') {
        result = await migrateProfiles(onProgress, { leagueId, players })
      } else if (migration.id === 'migrate_leagues_v1') {
        result = await migrateLeagues(onProgress)
      }
      await markMigrationComplete(migration.id)
      results.push({ id: migration.id, name: migration.name, success: true, result })
      log(`Completed: ${migration.name}`)
    } catch (err) {
      log(`FAILED: ${migration.name} - ${err.message}`)
      results.push({ id: migration.id, name: migration.name, success: false, error: err.message })
      break
    }
  }

  return { ran: results.length, results }
}
