/**
 * Handicap Calculation Utilities
 * Implements golf handicap system with support for multiple scopes and tee configurations
 */

import { GUNPOWDER_SCORECARD } from '../lib/courseData'

// Default tee configuration based on Gunpowder course ratings
export const DEFAULT_COURSE_TEES = {
  gold: { name: 'Gold', courseRating: 67.3, slopeRating: 110 },
  blue: { name: 'Blue', courseRating: 63.5, slopeRating: 100 },
  red: { name: 'Red', courseRating: 64.8, slopeRating: 105 }
}

// Default handicap settings
export const DEFAULT_HANDICAP_SETTINGS = {
  calculationMode: 'auto',  // 'auto' or 'manual'
  handicapScope: 'true',    // 'true', 'league', or 'gunpowder'
  maxHandicap: 54,
  minRoundsForAuto: 3,
  // Freeze period settings - rounds during this period don't count toward handicap
  freezeEnabled: false,
  freezeStartMonth: 11,     // November
  freezeStartDay: 1,
  freezeEndMonth: 3,        // March
  freezeEndDay: 31,
  // Update cycle settings
  updateMode: 'immediate',  // 'immediate' or 'monthly'
  lockedHandicaps: {},      // Player ID -> locked handicap value (for monthly mode)
  lastUpdateDate: null,     // ISO date string of last monthly update
  // Soft/Hard cap settings (sandbagger protection)
  capsEnabled: false,
  softCapThreshold: 3.0,    // Soft cap triggers at lowIndex + this
  softCapReduction: 0.5,    // Reduce increases by 50%
  hardCapThreshold: 5.0,    // Absolute max above lowIndex
  capMinRounds: 10,         // Exempt players with fewer rounds
  capExemptions: {}         // playerId -> { type: 'indefinite'|'until_date'|'reset', reason: '', expiresAt: null }
}

/**
 * Check if a date falls within the freeze period
 * Handles periods that span year boundaries (e.g., Nov 1 - Mar 31)
 */
export function isDateInFreezePeriod(dateStr, settings) {
  if (!settings?.freezeEnabled) return false

  const date = new Date(dateStr)
  const month = date.getMonth() + 1 // 1-12
  const day = date.getDate()

  const startMonth = settings.freezeStartMonth
  const startDay = settings.freezeStartDay
  const endMonth = settings.freezeEndMonth
  const endDay = settings.freezeEndDay

  // Create comparable values (month * 100 + day gives us sortable dates within a year)
  const dateVal = month * 100 + day
  const startVal = startMonth * 100 + startDay
  const endVal = endMonth * 100 + endDay

  if (startVal <= endVal) {
    // Normal range (e.g., Mar 1 - Jun 30)
    return dateVal >= startVal && dateVal <= endVal
  } else {
    // Spans year boundary (e.g., Nov 1 - Mar 31)
    return dateVal >= startVal || dateVal <= endVal
  }
}

/**
 * Check if today is the first of the month (for monthly update mode)
 */
export function isFirstOfMonth() {
  return new Date().getDate() === 1
}

/**
 * Check if handicaps should be updated based on settings
 * Returns true if immediate mode, or if monthly mode and it's time to update
 */
export function shouldUpdateHandicaps(settings, forceUpdate = false) {
  if (forceUpdate) return true
  if (settings?.updateMode !== 'monthly') return true

  // Monthly mode - check if we're on a new month
  const today = new Date()
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  if (!settings.lastUpdateDate) return true

  const lastUpdate = new Date(settings.lastUpdateDate)
  const lastMonthKey = `${lastUpdate.getFullYear()}-${String(lastUpdate.getMonth() + 1).padStart(2, '0')}`

  return currentMonthKey !== lastMonthKey
}

/**
 * Get the locked handicap for a player (for monthly mode)
 * Returns the locked value if in monthly mode, otherwise null
 */
export function getLockedHandicap(playerId, settings) {
  if (settings?.updateMode !== 'monthly') return null
  return settings?.lockedHandicaps?.[playerId] ?? null
}

/**
 * Calculate handicap differential for a single round
 * Formula: (Score - Course Rating) * 113 / Slope Rating
 */
export function calculateDifferential(score, courseRating, slopeRating) {
  if (!score || score <= 0) return null
  const rating = courseRating || 63.5  // Default to Gunpowder Blue
  const slope = slopeRating || 100
  return ((score - rating) * 113) / slope
}

/**
 * Calculate handicap from an array of rounds
 * Uses best 40% of most recent 20 rounds (minimum 3 rounds required)
 * Optionally filters out rounds that fall within a freeze period
 */
export function calculateHandicap(rounds, courseTees = DEFAULT_COURSE_TEES, maxHandicap = 54, handicapSettings = null) {
  // Filter valid rounds (must have a score > 0)
  let validRounds = rounds.filter(r => {
    const score = r.score || r.total || r.totalScore
    return score && score > 0
  })

  // Filter out rounds in freeze period if enabled
  if (handicapSettings?.freezeEnabled) {
    validRounds = validRounds.filter(r => !isDateInFreezePeriod(r.date, handicapSettings))
  }

  // Take most recent 20
  validRounds = validRounds.slice(0, 20)

  if (validRounds.length < 3) return null

  // Calculate differential for each round
  const differentials = validRounds.map(r => {
    const score = r.score || r.total || r.totalScore

    // Get rating/slope - check for tee first, then explicit values, then defaults
    let rating, slope
    if (r.tee && courseTees?.[r.tee]) {
      rating = courseTees[r.tee].courseRating
      slope = courseTees[r.tee].slopeRating
    } else {
      // External round with explicit rating/slope, or use defaults
      rating = r.courseRating || 63.5
      slope = r.slopeRating || 100
    }

    return calculateDifferential(score, rating, slope)
  }).filter(d => d !== null)

  if (differentials.length < 3) return null

  // Use best 40% of differentials (minimum 1)
  const numToUse = Math.max(1, Math.floor(differentials.length * 0.4))
  const bestDiffs = [...differentials].sort((a, b) => a - b).slice(0, numToUse)
  const avgDiff = bestDiffs.reduce((a, b) => a + b, 0) / bestDiffs.length

  // Apply WHS 0.96 multiplier, round to one decimal place, and cap at max
  const adjusted = avgDiff * 0.96
  return Math.min(maxHandicap, Math.round(adjusted * 10) / 10)
}

/**
 * Get all rounds for a player (league rounds + external rounds)
 * @param {Object} player - Player object
 * @param {String} leagueId - Current league ID (for filtering)
 * @returns {Array} Combined and sorted array of rounds
 */
export function getAllPlayerRounds(player, leagueId = null) {
  const leagueRounds = (player.scoreHistory || []).map(r => ({
    ...r,
    source: 'league',
    leagueId: leagueId,
    score: r.total || r.totalScore,
    // League rounds at Gunpowder use player's default tee or 'blue'
    tee: r.tee || player.defaultTee || 'blue'
  }))

  const externalRounds = (player.externalRounds || []).map(r => ({
    ...r,
    source: 'external',
    score: r.score
  }))

  // Combine and sort by date (most recent first)
  return [...leagueRounds, ...externalRounds].sort((a, b) => {
    const dateA = new Date(a.date)
    const dateB = new Date(b.date)
    return dateB - dateA
  })
}

/**
 * Get rounds filtered by scope
 * @param {Object} player - Player object
 * @param {String} scope - 'true', 'league', or 'gunpowder'
 * @param {String} leagueId - Current league ID
 * @returns {Array} Filtered rounds
 */
export function getRoundsByScope(player, scope, leagueId = null) {
  const allRounds = getAllPlayerRounds(player, leagueId)

  switch (scope) {
    case 'league':
      // Only rounds from the current league
      return allRounds.filter(r => r.source === 'league')

    case 'gunpowder':
      // Only rounds from Gunpowder course (league rounds + external Gunpowder rounds)
      return allRounds.filter(r => {
        if (r.source === 'league') return true
        // Check if external round is from Gunpowder
        const courseName = (r.courseName || '').toLowerCase()
        return courseName.includes('gunpowder')
      })

    case 'true':
    default:
      // All rounds (true handicap)
      return allRounds
  }
}

/**
 * Get player's handicap for a specific scope
 * @param {Object} player - Player object
 * @param {String} scope - 'true', 'league', or 'gunpowder'
 * @param {String} leagueId - Current league ID
 * @param {Object} courseTees - Course tee configuration
 * @param {Number} maxHandicap - Maximum allowed handicap
 * @param {Object} handicapSettings - Handicap settings (for freeze period)
 * @returns {Number|null} Calculated handicap or null if insufficient data
 */
export function getPlayerHandicapForScope(player, scope, leagueId = null, courseTees = DEFAULT_COURSE_TEES, maxHandicap = 54, handicapSettings = null) {
  const rounds = getRoundsByScope(player, scope, leagueId)
  return calculateHandicap(rounds, courseTees, maxHandicap, handicapSettings)
}

/**
 * Get all three handicap values for a player
 * @param {Object} player - Player object
 * @param {String} leagueId - Current league ID
 * @param {Object} courseTees - Course tee configuration
 * @param {Number} maxHandicap - Maximum allowed handicap
 * @param {Object} handicapSettings - Handicap settings (for freeze period)
 * @returns {Object} Object with trueHandicap, leagueHandicap, gunpowderHandicap
 */
export function getAllHandicaps(player, leagueId = null, courseTees = DEFAULT_COURSE_TEES, maxHandicap = 54, handicapSettings = null) {
  return {
    trueHandicap: getPlayerHandicapForScope(player, 'true', leagueId, courseTees, maxHandicap, handicapSettings),
    leagueHandicap: getPlayerHandicapForScope(player, 'league', leagueId, courseTees, maxHandicap, handicapSettings),
    gunpowderHandicap: getPlayerHandicapForScope(player, 'gunpowder', leagueId, courseTees, maxHandicap, handicapSettings)
  }
}

/**
 * Get the effective handicap to use for team generation based on league settings
 * @param {Object} player - Player object
 * @param {Object} handicapSettings - League handicap settings
 * @param {String} leagueId - Current league ID
 * @param {Object} courseTees - Course tee configuration
 * @returns {Number|null} Handicap to use, or null/manual handicap if not enough rounds
 */
export function getEffectiveHandicap(player, handicapSettings, leagueId = null, courseTees = DEFAULT_COURSE_TEES) {
  const settings = { ...DEFAULT_HANDICAP_SETTINGS, ...handicapSettings }
  const { calculationMode, handicapScope, maxHandicap, minRoundsForAuto, updateMode, lockedHandicaps } = settings

  // If manual mode, use the player's stored handicap
  if (calculationMode === 'manual') {
    return player.handicap
  }

  // If monthly update mode and we have a locked handicap, use it
  if (updateMode === 'monthly' && lockedHandicaps?.[player.id] !== undefined) {
    return lockedHandicaps[player.id]
  }

  // Auto mode - calculate based on scope
  const rounds = getRoundsByScope(player, handicapScope, leagueId)

  // Filter out freeze period rounds
  const validRounds = settings.freezeEnabled
    ? rounds.filter(r => !isDateInFreezePeriod(r.date, settings))
    : rounds

  // If not enough rounds for auto, fall back to manual handicap
  if (validRounds.length < minRoundsForAuto) {
    return player.handicap
  }

  return calculateHandicap(rounds, courseTees, maxHandicap, settings)
}

/**
 * Update the low index tracking for a player (rolling 12 months)
 * @param {Object} player - Player object
 * @param {Number} newHandicap - Newly calculated handicap
 * @returns {Object} Updated player object with lowIndex and lowIndexHistory
 */
export function updateLowIndex(player, newHandicap) {
  if (newHandicap === null || newHandicap === undefined) return player

  const today = new Date().toISOString().split('T')[0]
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

  // Start with existing history or empty array
  let history = [...(player.lowIndexHistory || [])]

  // Add current entry
  history.push({ handicap: newHandicap, date: today })

  // Prune entries older than 12 months
  history = history.filter(entry => new Date(entry.date) >= twelveMonthsAgo)

  // Calculate low index from remaining entries
  const lowIndex = Math.min(...history.map(e => e.handicap))

  return {
    ...player,
    lowIndex,
    lowIndexHistory: history
  }
}

/**
 * Apply soft/hard caps to a raw handicap (sandbagger protection)
 * @param {Number} rawHandicap - The raw calculated handicap
 * @param {Object} player - Player object (needs lowIndex, scoreHistory for round count)
 * @param {Object} settings - Handicap settings (merged with defaults)
 * @returns {Object} { handicap: number, capApplied: boolean }
 */
export function applyCaps(rawHandicap, player, settings) {
  if (rawHandicap === null || rawHandicap === undefined) {
    return { handicap: rawHandicap, capApplied: false }
  }

  // Caps disabled
  if (!settings?.capsEnabled) {
    return { handicap: rawHandicap, capApplied: false }
  }

  // Count player's rounds
  const roundCount = (player.scoreHistory || []).length + (player.externalRounds || []).length
  if (roundCount < (settings.capMinRounds || 10)) {
    return { handicap: rawHandicap, capApplied: false }
  }

  // No low index yet
  const lowIndex = player.lowIndex
  if (lowIndex === null || lowIndex === undefined) {
    return { handicap: rawHandicap, capApplied: false }
  }

  // Check exemptions
  const exemption = settings.capExemptions?.[player.id]
  if (exemption) {
    if (exemption.type === 'indefinite') {
      return { handicap: rawHandicap, capApplied: false }
    }
    if (exemption.type === 'until_date' && exemption.expiresAt) {
      if (new Date() < new Date(exemption.expiresAt)) {
        return { handicap: rawHandicap, capApplied: false }
      }
      // Exemption expired, fall through to apply caps
    }
    if (exemption.type === 'reset') {
      // Treat current handicap as the low index (effectively disabling caps)
      return { handicap: rawHandicap, capApplied: false }
    }
  }

  const softThreshold = settings.softCapThreshold ?? 3.0
  const softReduction = settings.softCapReduction ?? 0.5
  const hardThreshold = settings.hardCapThreshold ?? 5.0
  const maxHandicap = settings.maxHandicap ?? 54

  let result = rawHandicap

  // Soft cap
  if (rawHandicap > lowIndex + softThreshold) {
    const excess = rawHandicap - (lowIndex + softThreshold)
    result = (lowIndex + softThreshold) + (excess * softReduction)
  }

  // Hard cap
  if (result > lowIndex + hardThreshold) {
    result = lowIndex + hardThreshold
  }

  // Still respect max handicap
  result = Math.min(result, maxHandicap)

  // Round to one decimal
  result = Math.round(result * 10) / 10

  const capApplied = result !== rawHandicap
  return { handicap: result, capApplied }
}

/**
 * Recalculate and update all handicaps for a player
 * This should be called after a round is finished
 * @param {Object} player - Player object to update
 * @param {String} leagueId - Current league ID
 * @param {Object} courseTees - Course tee configuration
 * @param {Number} maxHandicap - Maximum allowed handicap
 * @param {Object} handicapSettings - Handicap settings (for freeze period and caps)
 * @returns {Object} Updated player object with new handicap values
 */
export function recalculatePlayerHandicaps(player, leagueId = null, courseTees = DEFAULT_COURSE_TEES, maxHandicap = 54, handicapSettings = null) {
  const settings = { ...DEFAULT_HANDICAP_SETTINGS, ...handicapSettings }
  const allHandicaps = getAllHandicaps(player, leagueId, courseTees, maxHandicap, settings)

  const rawTrueHandicap = allHandicaps.trueHandicap

  // Update low index tracking based on raw true handicap
  let updatedPlayer = updateLowIndex(player, rawTrueHandicap)

  // Apply caps to the true handicap
  const { handicap: cappedHandicap, capApplied } = applyCaps(rawTrueHandicap, updatedPlayer, settings)

  return {
    ...updatedPlayer,
    // Store the capped handicap as the main handicap
    handicap: cappedHandicap,
    rawHandicap: rawTrueHandicap,
    capApplied,
    handicapSource: rawTrueHandicap !== null ? 'auto' : player.handicapSource,
    // Store all calculated values for display
    calculatedHandicaps: allHandicaps
  }
}

/**
 * Recalculate all players' handicaps and return updated locked handicaps
 * Used for monthly update mode
 * @param {Array} players - Array of all players
 * @param {String} leagueId - Current league ID
 * @param {Object} courseTees - Course tee configuration
 * @param {Object} handicapSettings - Handicap settings
 * @returns {Object} New lockedHandicaps object with player ID -> handicap mapping
 */
export function calculateLockedHandicaps(players, leagueId, courseTees, handicapSettings) {
  const settings = { ...DEFAULT_HANDICAP_SETTINGS, ...handicapSettings }
  const lockedHandicaps = {}

  players.forEach(player => {
    const effectiveHcp = getEffectiveHandicap(
      player,
      { ...settings, updateMode: 'immediate', lockedHandicaps: {} }, // Calculate fresh, not from locked
      leagueId,
      courseTees
    )
    if (effectiveHcp !== null) {
      lockedHandicaps[player.id] = effectiveHcp
    }
  })

  return lockedHandicaps
}

/**
 * Calculate Course Handicap from Handicap Index
 * Formula: Course Handicap = Handicap Index × (Slope Rating / 113)
 * @param {Number} handicapIndex - The player's handicap index
 * @param {Number} slopeRating - The slope rating of the tees being played
 * @returns {Number|null} Course handicap rounded to nearest integer
 */
export function calculateCourseHandicap(handicapIndex, slopeRating) {
  if (handicapIndex === null || handicapIndex === undefined) return null
  if (!slopeRating) slopeRating = 113 // Standard slope

  const courseHcp = handicapIndex * (slopeRating / 113)
  return Math.round(courseHcp)
}

/**
 * Get Course Handicap for a player at specific tees
 * @param {Number} handicapIndex - The player's handicap index
 * @param {String} teeKey - The tee key (e.g., 'blue', 'gold')
 * @param {Object} courseTees - Course tee configuration
 * @returns {Number|null} Course handicap for those tees
 */
export function getCourseHandicapForTee(handicapIndex, teeKey, courseTees = DEFAULT_COURSE_TEES) {
  if (handicapIndex === null || handicapIndex === undefined) return null

  const tee = courseTees?.[teeKey]
  const slopeRating = tee?.slopeRating || 113

  return calculateCourseHandicap(handicapIndex, slopeRating)
}

/**
 * Format handicap for display
 * @param {Number|null} handicap - Handicap value
 * @returns {String} Formatted string
 */
export function formatHandicap(handicap) {
  if (handicap === null || handicap === undefined) return '--'
  return handicap.toFixed(1)
}

/**
 * Format course handicap for display (integer)
 * @param {Number|null} courseHandicap - Course handicap value
 * @returns {String} Formatted string
 */
export function formatCourseHandicap(courseHandicap) {
  if (courseHandicap === null || courseHandicap === undefined) return '--'
  return courseHandicap.toString()
}

/**
 * Get display label for handicap scope
 * @param {String} scope - Scope value
 * @returns {String} Human-readable label
 */
export function getScopeLabel(scope) {
  switch (scope) {
    case 'true': return 'True'
    case 'league': return 'League'
    case 'gunpowder': return 'Gunpowder'
    default: return scope
  }
}
