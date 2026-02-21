import { getNetStrokes } from './formatScoring'

/**
 * Get a player's gross score and handicap from liveRound data.
 */
export function getPlayerScore(liveRound, playerId, hole) {
  if (!liveRound?.teams) return null
  const pid = String(playerId)
  for (const team of liveRound.teams) {
    for (const player of team.players) {
      if (String(player.id) === pid) {
        const score = player.scores?.[hole]
        if (score == null || score === '' || score === 'X') return null
        return { score: Number(score), handicap: player.handicap || 0 }
      }
    }
  }
  return null
}

/**
 * Get the net score for a player on a hole.
 */
function getNetScore(grossScore, handicap, holeNumber, useHandicaps) {
  if (!useHandicaps) return grossScore
  const strokes = getNetStrokes(handicap, holeNumber)
  return grossScore - strokes
}

/**
 * Get a player's display name from liveRound data.
 */
export function getPlayerName(liveRound, playerId) {
  if (!liveRound?.teams) return 'Unknown'
  const pid = String(playerId)
  for (const team of liveRound.teams) {
    for (const player of team.players) {
      if (String(player.id) === pid) return player.name
    }
  }
  return 'Unknown'
}

/**
 * Determine which player is the Wolf on a given hole.
 * Default rotation: participants[0] on hole 1, participants[1] on hole 2, etc., cycling.
 * If lastPlaceWolf17_18 is on, holes 17 and 18 go to the player in last place.
 */
export function getWolfForHole(wolfMatch, hole, liveRound) {
  if (!wolfMatch?.participants || wolfMatch.participants.length !== 4) return null

  // Check for explicit decision already recorded
  const decision = wolfMatch.holeDecisions?.[hole]
  if (decision?.wolf) return decision.wolf

  const participants = wolfMatch.participants
  const settings = wolfMatch.settings || {}

  // Last-place-on-17/18 rule
  if (settings.lastPlaceWolf17_18 && (hole === 17 || hole === 18) && liveRound) {
    const standings = getPlayerStandings(wolfMatch, liveRound, hole)
    if (standings.length === 4) {
      // Last place = worst net money (most negative)
      return standings[standings.length - 1].id
    }
  }

  // Standard rotation: cycle through 4 players
  return participants[(hole - 1) % 4]
}

/**
 * Get player standings up to (but not including) a given hole, sorted best to worst.
 */
function getPlayerStandings(wolfMatch, liveRound, upToHole) {
  const results = calculateWolfResults(wolfMatch, liveRound, upToHole - 1)
  const summary = getWolfSummary(results, wolfMatch)
  const entries = Object.entries(summary.playerSummaries)
  entries.sort((a, b) => b[1].netAmount - a[1].netAmount)
  return entries.map(([id, data]) => ({ id, ...data }))
}

/**
 * Check if a decision can still be made for a hole.
 */
export function canMakeDecision(wolfMatch, hole) {
  if (!wolfMatch?.holeDecisions) return true
  const decision = wolfMatch.holeDecisions[hole]
  // Already decided
  if (decision?.decision) return false
  return true
}

/**
 * Calculate per-hole Wolf results.
 * @param {number} maxHole - optional, only calculate up to this hole
 */
export function calculateWolfResults(wolfMatch, liveRound, maxHole = 18) {
  if (!wolfMatch || !liveRound) return { holes: {} }

  const participants = wolfMatch.participants || []
  if (participants.length !== 4) return { holes: {} }

  const settings = wolfMatch.settings || {}
  const useHandicaps = settings.useHandicaps || false
  const loneMultiplier = settings.loneWolfMultiplier || 2
  const blindMultiplier = settings.blindWolfMultiplier || 3
  const betAmount = settings.betAmount || 1

  const holes = {}

  for (let hole = 1; hole <= maxHole; hole++) {
    const decision = wolfMatch.holeDecisions?.[hole]
    if (!decision?.wolf || !decision?.decision) {
      holes[hole] = { status: 'pending', wolf: getWolfForHole(wolfMatch, hole, liveRound) }
      continue
    }

    const wolfId = decision.wolf
    const decisionType = decision.decision // 'partner' | 'lone' | 'blind'
    const partnerId = decision.partner || null

    // Get all 4 player scores
    const scores = {}
    let allScored = true
    for (const pid of participants) {
      const s = getPlayerScore(liveRound, pid, hole)
      if (!s) { allScored = false; break }
      scores[pid] = {
        gross: s.score,
        net: getNetScore(s.score, s.handicap, hole, useHandicaps),
        handicap: s.handicap
      }
    }

    if (!allScored) {
      holes[hole] = {
        status: 'waiting_scores',
        wolf: wolfId,
        decision: decisionType,
        partner: partnerId
      }
      continue
    }

    // Determine teams
    let wolfTeam, fieldTeam, multiplier

    if (decisionType === 'partner' && partnerId) {
      // 2v2: Wolf + partner vs other 2
      wolfTeam = [wolfId, partnerId]
      fieldTeam = participants.filter(p => p !== wolfId && p !== partnerId)
      multiplier = 1
    } else if (decisionType === 'blind') {
      // Blind Wolf: 1v3, higher multiplier
      wolfTeam = [wolfId]
      fieldTeam = participants.filter(p => p !== wolfId)
      multiplier = blindMultiplier
    } else {
      // Lone Wolf: 1v3
      wolfTeam = [wolfId]
      fieldTeam = participants.filter(p => p !== wolfId)
      multiplier = loneMultiplier
    }

    // Best ball for each side
    const wolfBest = Math.min(...wolfTeam.map(id => scores[id].net))
    const fieldBest = Math.min(...fieldTeam.map(id => scores[id].net))

    let winner = null // 'wolf' | 'field' | null (tie)
    if (wolfBest < fieldBest) winner = 'wolf'
    else if (fieldBest < wolfBest) winner = 'field'

    // Calculate money movement for this hole
    // Each losing player pays each winning player: betAmount * multiplier
    const holeMoney = {}
    for (const pid of participants) holeMoney[pid] = 0

    if (winner === 'wolf') {
      // Wolf side wins: each field player pays each wolf player
      for (const fId of fieldTeam) {
        for (const wId of wolfTeam) {
          const amt = betAmount * multiplier
          holeMoney[fId] -= amt
          holeMoney[wId] += amt
        }
      }
    } else if (winner === 'field') {
      // Field wins: each wolf player pays each field player
      for (const wId of wolfTeam) {
        for (const fId of fieldTeam) {
          const amt = betAmount * multiplier
          holeMoney[wId] -= amt
          holeMoney[fId] += amt
        }
      }
    }
    // Tie = no money

    holes[hole] = {
      status: 'complete',
      wolf: wolfId,
      decision: decisionType,
      partner: partnerId,
      wolfTeam,
      fieldTeam,
      wolfBest,
      fieldBest,
      scores,
      winner,
      multiplier,
      money: holeMoney
    }
  }

  return { holes }
}

/**
 * Get summary totals per player from wolf results.
 */
export function getWolfSummary(wolfResults, wolfMatch) {
  if (!wolfResults?.holes || !wolfMatch) return { playerSummaries: {} }

  const summaries = {}
  for (const pid of wolfMatch.participants || []) {
    summaries[pid] = {
      netAmount: 0,
      holesWonAsWolf: 0,
      holesLostAsWolf: 0,
      tiesAsWolf: 0,
      holesAsWolf: 0,
      holesWonAsField: 0,
      holesLostAsField: 0
    }
  }

  for (const [, holeResult] of Object.entries(wolfResults.holes)) {
    if (holeResult.status !== 'complete') continue

    const { wolf, winner, money, wolfTeam } = holeResult

    // Add money
    for (const pid of wolfMatch.participants) {
      if (money?.[pid]) {
        summaries[pid].netAmount += money[pid]
      }
    }

    // Stats
    if (summaries[wolf]) {
      summaries[wolf].holesAsWolf++
      if (winner === 'wolf') summaries[wolf].holesWonAsWolf++
      else if (winner === 'field') summaries[wolf].holesLostAsWolf++
      else summaries[wolf].tiesAsWolf++
    }

    // Field player stats
    for (const pid of wolfMatch.participants) {
      if (!wolfTeam.includes(pid)) {
        if (winner === 'field') summaries[pid].holesWonAsField++
        else if (winner === 'wolf') summaries[pid].holesLostAsField++
      }
    }
  }

  return { playerSummaries: summaries }
}
