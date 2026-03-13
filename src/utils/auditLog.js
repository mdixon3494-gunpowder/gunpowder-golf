/**
 * Creates an audit log entry
 * @param {string} action - Action type (e.g., 'player_added', 'settings_changed', 'round_started')
 * @param {string} performedBy - Display name of the user who performed the action
 * @param {object} details - Additional details about the action
 * @returns {object} Audit log entry
 */
export function createAuditEntry(action, performedBy, details = {}) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    action,
    performedBy,
    details,
    timestamp: new Date().toISOString()
  }
}

// Action type constants
export const AUDIT_ACTIONS = {
  PLAYER_ADDED: 'player_added',
  PLAYER_REMOVED: 'player_removed',
  PLAYER_EDITED: 'player_edited',
  SETTINGS_CHANGED: 'settings_changed',
  ROUND_STARTED: 'round_started',
  ROUND_FINISHED: 'round_finished',
  MEMBER_ROLE_CHANGED: 'member_role_changed',
  MEMBER_REMOVED: 'member_removed',
  OWNERSHIP_TRANSFERRED: 'ownership_transferred',
  LEAGUE_CREATED: 'league_created',
  HANDICAP_RECALCULATED: 'handicap_recalculated'
}

// Human-readable labels
export const AUDIT_LABELS = {
  player_added: 'Player Added',
  player_removed: 'Player Removed',
  player_edited: 'Player Edited',
  settings_changed: 'Settings Changed',
  round_started: 'Round Started',
  round_finished: 'Round Finished',
  member_role_changed: 'Role Changed',
  member_removed: 'Member Removed',
  ownership_transferred: 'Ownership Transferred',
  league_created: 'League Created',
  handicap_recalculated: 'Handicap Recalculated'
}
