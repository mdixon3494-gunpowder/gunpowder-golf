import { getHoleInfo } from '../lib/courseData'
import { getNetStrokes } from './formatScoring'

/**
 * Find a player's score and handicap from liveRound data.
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
 * Check if a player is active on a given hole (joined and not left).
 */
function isActiveOnHole(nassauMatch, playerId, hole) {
  const details = nassauMatch.participantDetails?.[String(playerId)]
  if (!details) return false
  if (details.joinedOnHole > hole) return false
  if (details.leftOnHole != null && hole > details.leftOnHole) return false
  return true
}

/**
 * Generate all unique pairs from an array.
 */
function getAllPairs(arr) {
  const pairs = []
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      pairs.push([arr[i], arr[j]])
    }
  }
  return pairs
}

/**
 * Get the net score for a player on a hole.
 * If useHandicaps is false, returns the gross score.
 */
function getNetScore(grossScore, handicap, holeNumber, useHandicaps) {
  if (!useHandicaps) return grossScore
  const strokes = getNetStrokes(handicap, holeNumber)
  return grossScore - strokes
}

/**
 * Calculate hole-by-hole and segment results for all pairs.
 */
export function calculateNassauResults(nassauMatch, liveRound) {
  if (!nassauMatch || !liveRound) return { pairs: {} }

  const participants = nassauMatch.participants || []
  const useHandicaps = nassauMatch.settings?.useHandicaps || false
  const betAmount = nassauMatch.settings?.betAmount || 2
  const allPairs = getAllPairs(participants)
  const pairs = {}

  for (const [p1, p2] of allPairs) {
    const pairKey = `${p1}_vs_${p2}`
    const holeByHole = {}
    const front9 = { p1Wins: 0, p2Wins: 0, halved: 0 }
    const back9 = { p1Wins: 0, p2Wins: 0, halved: 0 }
    const overall = { p1Wins: 0, p2Wins: 0, halved: 0 }

    for (let hole = 1; hole <= 18; hole++) {
      if (!isActiveOnHole(nassauMatch, p1, hole) || !isActiveOnHole(nassauMatch, p2, hole)) {
        holeByHole[hole] = { status: 'inactive' }
        continue
      }

      const s1 = getPlayerScore(liveRound, p1, hole)
      const s2 = getPlayerScore(liveRound, p2, hole)

      if (!s1 || !s2) {
        holeByHole[hole] = { status: 'pending' }
        continue
      }

      const net1 = getNetScore(s1.score, s1.handicap, hole, useHandicaps)
      const net2 = getNetScore(s2.score, s2.handicap, hole, useHandicaps)

      let winner = null
      let status = 'halved'
      if (net1 < net2) {
        winner = p1
        status = 'p1'
      } else if (net2 < net1) {
        winner = p2
        status = 'p2'
      }

      holeByHole[hole] = { status, net1, net2, gross1: s1.score, gross2: s2.score, winner }

      const segment = hole <= 9 ? front9 : back9
      if (status === 'p1') { segment.p1Wins++; overall.p1Wins++ }
      else if (status === 'p2') { segment.p2Wins++; overall.p2Wins++ }
      else { segment.halved++; overall.halved++ }
    }

    // Evaluate press bets
    const presses = (nassauMatch.presses || []).filter(
      pr => (pr.pressedBy === p1 && pr.againstPlayer === p2) ||
            (pr.pressedBy === p2 && pr.againstPlayer === p1)
    )

    const pressResults = presses.map(press => {
      let pressWins = { p1: 0, p2: 0, halved: 0 }
      for (let h = press.startHole; h <= press.endHole; h++) {
        const hResult = holeByHole[h]
        if (!hResult || hResult.status === 'inactive' || hResult.status === 'pending') continue
        if (hResult.status === 'p1') pressWins.p1++
        else if (hResult.status === 'p2') pressWins.p2++
        else pressWins.halved++
      }

      let pressWinner = null
      if (pressWins.p1 > pressWins.p2) pressWinner = p1
      else if (pressWins.p2 > pressWins.p1) pressWinner = p2

      return { ...press, wins: pressWins, winner: pressWinner }
    })

    pairs[pairKey] = {
      player1: p1,
      player2: p2,
      front9,
      back9,
      overall,
      holeByHole,
      presses: pressResults,
      betAmount
    }
  }

  return { pairs }
}

/**
 * Determine segment winner: more holes won = winner, else push.
 */
function segmentWinner(segment, p1, p2) {
  if (segment.p1Wins > segment.p2Wins) return p1
  if (segment.p2Wins > segment.p1Wins) return p2
  return null // push
}

/**
 * Get per-player summary of net amounts across all pairs.
 */
export function getNassauSummary(nassauResults, nassauMatch) {
  if (!nassauResults?.pairs || !nassauMatch) return { playerSummaries: {} }

  const betAmount = nassauMatch.settings?.betAmount || 2
  const summaries = {}

  // Initialize all participants
  for (const pid of nassauMatch.participants || []) {
    summaries[pid] = { netAmount: 0, betsWon: 0, betsLost: 0, betsPushed: 0, pairResults: [] }
  }

  for (const [, pair] of Object.entries(nassauResults.pairs)) {
    const { player1: p1, player2: p2, front9, back9, overall, presses } = pair

    // Three main bets: front, back, overall
    const segments = [
      { name: 'front', data: front9 },
      { name: 'back', data: back9 },
      { name: 'overall', data: overall }
    ]

    const pairResult = { opponent: null, front: null, back: null, overall: null, pressNet: 0 }

    for (const seg of segments) {
      const winner = segmentWinner(seg.data, p1, p2)
      if (winner === p1) {
        summaries[p1].netAmount += betAmount
        summaries[p1].betsWon++
        summaries[p2].netAmount -= betAmount
        summaries[p2].betsLost++
      } else if (winner === p2) {
        summaries[p2].netAmount += betAmount
        summaries[p2].betsWon++
        summaries[p1].netAmount -= betAmount
        summaries[p1].betsLost++
      } else {
        summaries[p1].betsPushed++
        summaries[p2].betsPushed++
      }
    }

    // Press bets
    for (const pr of presses) {
      const pressBet = pr.betAmount || betAmount
      if (pr.winner === p1) {
        summaries[p1].netAmount += pressBet
        summaries[p1].betsWon++
        summaries[p2].netAmount -= pressBet
        summaries[p2].betsLost++
      } else if (pr.winner === p2) {
        summaries[p2].netAmount += pressBet
        summaries[p2].betsWon++
        summaries[p1].netAmount -= pressBet
        summaries[p1].betsLost++
      } else {
        summaries[p1].betsPushed++
        summaries[p2].betsPushed++
      }
    }
  }

  return { playerSummaries: summaries }
}

/**
 * Check whether a player can press against another in the current segment.
 * A player must be losing the current segment to press.
 */
export function canPress(nassauMatch, nassauResults, pressedBy, againstPlayer, currentHole) {
  if (!nassauResults?.pairs || !nassauMatch) return { canPress: false, reason: 'No active match' }

  const pairKey = findPairKey(nassauResults, pressedBy, againstPlayer)
  if (!pairKey) return { canPress: false, reason: 'Not a valid pair' }

  const pair = nassauResults.pairs[pairKey]
  const segment = currentHole <= 9 ? 'front' : 'back'
  const segEnd = segment === 'front' ? 9 : 18

  if (currentHole >= segEnd) return { canPress: false, reason: 'No holes remaining in segment' }

  // Determine who is p1/p2 in this pair
  const isP1 = pair.player1 === pressedBy
  const segData = segment === 'front' ? pair.front9 : pair.back9

  const myWins = isP1 ? segData.p1Wins : segData.p2Wins
  const oppWins = isP1 ? segData.p2Wins : segData.p1Wins

  if (myWins >= oppWins) {
    return { canPress: false, reason: 'Must be losing the current segment to press' }
  }

  // Check for existing press on same segment starting at same or later hole
  const existingPress = (nassauMatch.presses || []).find(
    pr => pr.pressedBy === pressedBy && pr.againstPlayer === againstPlayer &&
          pr.segment === segment && pr.startHole >= currentHole
  )
  if (existingPress) {
    return { canPress: false, reason: 'Already have an active press in this segment' }
  }

  return {
    canPress: true,
    segment,
    startHole: currentHole,
    endHole: segEnd
  }
}

/**
 * Find the pair key for two players (order-independent).
 */
function findPairKey(nassauResults, p1, p2) {
  const key1 = `${p1}_vs_${p2}`
  const key2 = `${p2}_vs_${p1}`
  if (nassauResults.pairs[key1]) return key1
  if (nassauResults.pairs[key2]) return key2
  return null
}

/**
 * Create a new press object.
 */
export function createPress(nassauMatch, pressedBy, againstPlayer, startHole, endHole, segment) {
  return {
    id: Date.now(),
    pressedBy,
    againstPlayer,
    startHole,
    endHole,
    segment,
    betAmount: nassauMatch.settings?.betAmount || 2
  }
}

/**
 * Get a display-friendly status string for a segment.
 * e.g. "2 UP", "ALL SQUARE", "1 DOWN" from perspective of player.
 */
export function getSegmentStatus(segData, playerId, pair) {
  const isP1 = pair.player1 === playerId
  const myWins = isP1 ? segData.p1Wins : segData.p2Wins
  const oppWins = isP1 ? segData.p2Wins : segData.p1Wins
  const diff = myWins - oppWins
  if (diff === 0) return { text: 'AS', color: '#666', diff: 0 }
  if (diff > 0) return { text: `${diff} UP`, color: '#27ae60', diff }
  return { text: `${Math.abs(diff)} DN`, color: '#e74c3c', diff }
}

/**
 * Get player name from liveRound data.
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
