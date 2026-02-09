import { getHoleInfo, getAllHoles } from '../lib/courseData'

// ── Format Configurations ──────────────────────────────────────────────
export const FORMAT_CONFIGS = {
  bigboys:     { label: 'Big Boys Format',      team: true,  leaderboard: 'relative' },
  bestball:    { label: 'Best Ball',             team: true,  leaderboard: 'relative' },
  scramble:    { label: 'Scramble',              team: true,  leaderboard: 'gross' },
  retirees:    { label: '2 Best Balls (Net)',    team: true,  leaderboard: 'net' },
  stroke:      { label: 'Stroke Play',           team: false, leaderboard: 'gross' },
  stroke_net:  { label: 'Stroke Play (Net)',     team: false, leaderboard: 'net' },
  stableford:  { label: 'Stableford',            team: false, leaderboard: 'points' },
  matchplay:   { label: 'Match Play',            team: true,  leaderboard: 'matchplay' },
  skins:       { label: 'Skins',                 team: false, leaderboard: null },
  track:       { label: 'Just Track Scores',     team: false, leaderboard: 'gross' },
}

// ── Net Scoring (WHS hole allocation) ──────────────────────────────────

/**
 * Get the number of handicap strokes a player receives on a given hole.
 * hcp field: 1 = hardest hole, 18 = easiest.
 * A player with HC N gets 1 stroke on holes ranked 1..N.
 * If HC > 18, they get 2 strokes on holes ranked 1..(N-18), etc.
 */
export function getNetStrokes(handicap, holeNumber) {
  if (!handicap || handicap <= 0) return 0
  const holeInfo = getHoleInfo(holeNumber)
  if (!holeInfo) return 0
  const holeHcp = holeInfo.hcp // 1-18 difficulty ranking

  let strokes = 0
  let remaining = Math.round(handicap)

  // Each full set of 18 = 1 stroke on every hole
  while (remaining > 18) {
    strokes++
    remaining -= 18
  }

  // Remaining strokes go to the hardest holes (lowest hcp values)
  if (holeHcp <= remaining) {
    strokes++
  }

  return strokes
}

/**
 * Get the net score for a hole: gross minus handicap strokes
 */
export function getNetScore(grossScore, handicap, holeNumber) {
  if (grossScore === undefined || grossScore === null || grossScore === '' || grossScore === 'X') return null
  return grossScore - getNetStrokes(handicap, holeNumber)
}

// ── Helper: get valid numeric scores from a team's players ─────────────

function getValidScores(team, hole) {
  return team.players
    .filter(p => !p.isDNF && p.includeInTeamScore)
    .map(p => ({ score: p.scores[hole], handicap: p.handicap || 0 }))
    .filter(s => s.score !== undefined && s.score !== null && s.score !== '' && s.score !== 'X')
}

// ── Big Boys Format ────────────────────────────────────────────────────
// All under-par scores summed + best score if none under par

export function calculateBigBoysScore(team, startHole, endHole) {
  let totalScore = 0
  for (let hole = startHole; hole <= endHole; hole++) {
    const holeInfo = getHoleInfo(hole)
    const par = holeInfo?.par || 4

    const playerScores = team.players
      .filter(p => !p.isDNF && p.includeInTeamScore)
      .map(p => p.scores[hole])
      .filter(s => s !== undefined && s !== null && s !== '' && s !== 'X')

    if (playerScores.length === 0) continue

    const underParScores = playerScores.filter(s => s < par)

    if (underParScores.length > 0) {
      totalScore += underParScores.reduce((sum, s) => sum + (s - par), 0)
    } else {
      const bestScore = Math.min(...playerScores)
      totalScore += (bestScore - par)
    }
  }
  return totalScore
}

// ── Best Ball ──────────────────────────────────────────────────────────
// 1 best score per hole per team (gross or net), relative to par

export function calculateBestBallScore(team, startHole, endHole, useHandicaps = false) {
  let totalScore = 0
  for (let hole = startHole; hole <= endHole; hole++) {
    const holeInfo = getHoleInfo(hole)
    const par = holeInfo?.par || 4

    const entries = getValidScores(team, hole)
    if (entries.length === 0) continue

    let bestRelative
    if (useHandicaps) {
      bestRelative = Math.min(...entries.map(e => getNetScore(e.score, e.handicap, hole) - par))
    } else {
      bestRelative = Math.min(...entries.map(e => e.score - par))
    }
    totalScore += bestRelative
  }
  return totalScore
}

// ── Scramble ───────────────────────────────────────────────────────────
// Single score per hole (first active player's score), gross total

export function calculateScrambleScore(team, startHole, endHole) {
  let totalScore = 0
  for (let hole = startHole; hole <= endHole; hole++) {
    const entries = getValidScores(team, hole)
    if (entries.length === 0) continue
    // In scramble everyone enters the same score; take the first valid one
    totalScore += entries[0].score
  }
  return totalScore
}

// ── Retirees (N Best Balls Net) ────────────────────────────────────────

export function getRetireesAdjustment(teamSize, settings = {}) {
  if (teamSize >= 4) return { bonusPer9: 0, extraStrokes: 0 }
  // 3-player team: defaults configurable
  return {
    bonusPer9: settings.retireesBonusPer9 !== undefined ? settings.retireesBonusPer9 : -2,
    extraStrokes: settings.retireesExtraStrokes !== undefined ? settings.retireesExtraStrokes : 2
  }
}

export function calculateRetireesScore(team, startHole, endHole, settings = {}) {
  const scoresToCount = settings.retireesScoresToCount || 2
  const activePlayers = team.players.filter(p => !p.isDNF && p.includeInTeamScore)
  const teamSize = activePlayers.length
  const adj = getRetireesAdjustment(teamSize, settings)

  let totalNet = 0
  for (let hole = startHole; hole <= endHole; hole++) {
    const netScores = activePlayers
      .map(p => {
        const s = p.scores[hole]
        if (s === undefined || s === null || s === '' || s === 'X') return null
        const extraStrokes = adj.extraStrokes
        return s - getNetStrokes((p.handicap || 0) + extraStrokes, hole)
      })
      .filter(s => s !== null)
      .sort((a, b) => a - b)

    // Take the N best net scores
    const best = netScores.slice(0, Math.min(scoresToCount, netScores.length))
    totalNet += best.reduce((sum, s) => sum + s, 0)
  }

  // Apply 3-player bonus per 9
  if (adj.bonusPer9 !== 0) {
    const holesInRange = endHole - startHole + 1
    const ninesInRange = holesInRange >= 9 ? (holesInRange > 9 ? 2 : 1) : 0
    totalNet += adj.bonusPer9 * ninesInRange
  }

  return totalNet
}

// ── Stroke Play (Individual) ───────────────────────────────────────────

export function calculateStrokeScore(players, startHole, endHole, useNet = false) {
  return players
    .filter(p => !p.isDNF)
    .map(p => {
      let total = 0
      for (let hole = startHole; hole <= endHole; hole++) {
        const s = p.scores[hole]
        if (s === undefined || s === null || s === '' || s === 'X') continue
        if (useNet) {
          total += getNetScore(s, p.handicap || 0, hole)
        } else {
          total += s
        }
      }
      return { id: p.id, name: p.name, total, handicap: p.handicap || 0 }
    })
}

// ── Stableford ─────────────────────────────────────────────────────────

export function calculateStablefordPoints(score, par, handicap, holeNumber, useNet = true) {
  if (score === undefined || score === null || score === '' || score === 'X') return 0
  const effectiveScore = useNet ? getNetScore(score, handicap, holeNumber) : score
  if (effectiveScore === null) return 0
  const diff = effectiveScore - par
  if (diff >= 2) return 0       // double bogey or worse
  if (diff === 1) return 1      // bogey
  if (diff === 0) return 2      // par
  if (diff === -1) return 3     // birdie
  if (diff === -2) return 4     // eagle
  return 5                      // albatross or better
}

export function calculateStablefordScore(players, startHole, endHole, useNet = true) {
  return players
    .filter(p => !p.isDNF)
    .map(p => {
      let points = 0
      for (let hole = startHole; hole <= endHole; hole++) {
        const holeInfo = getHoleInfo(hole)
        const par = holeInfo?.par || 4
        points += calculateStablefordPoints(p.scores[hole], par, p.handicap || 0, hole, useNet)
      }
      return { id: p.id, name: p.name, total: points, handicap: p.handicap || 0 }
    })
}

// ── Match Play ─────────────────────────────────────────────────────────

export function calculateMatchPlayScore(team1, team2, startHole, endHole) {
  let team1Wins = 0
  let team2Wins = 0
  let lastHolePlayed = startHole - 1

  for (let hole = startHole; hole <= endHole; hole++) {
    // Use best ball per team
    const t1Scores = getValidScores(team1, hole).map(e => e.score)
    const t2Scores = getValidScores(team2, hole).map(e => e.score)

    if (t1Scores.length === 0 || t2Scores.length === 0) break
    lastHolePlayed = hole

    const t1Best = Math.min(...t1Scores)
    const t2Best = Math.min(...t2Scores)

    if (t1Best < t2Best) team1Wins++
    else if (t2Best < t1Best) team2Wins++
    // tied = no change
  }

  const holesUp = Math.abs(team1Wins - team2Wins)
  const thru = lastHolePlayed
  const holesRemaining = endHole - lastHolePlayed
  let leader = null
  if (team1Wins > team2Wins) leader = team1.id
  else if (team2Wins > team1Wins) leader = team2.id

  // Check for match decided (lead > remaining holes)
  const isDecided = holesUp > holesRemaining && holesRemaining >= 0

  return { holesUp, leader, thru, team1Wins, team2Wins, isDecided, holesRemaining }
}

// ── Dispatcher ─────────────────────────────────────────────────────────

export function calculateFormatScore(format, team, startHole, endHole, settings = {}) {
  switch (format) {
    case 'bigboys':
      return calculateBigBoysScore(team, startHole, endHole)
    case 'bestball':
      return calculateBestBallScore(team, startHole, endHole, settings.useHandicaps)
    case 'scramble':
      return calculateScrambleScore(team, startHole, endHole)
    case 'retirees':
      return calculateRetireesScore(team, startHole, endHole, settings)
    default:
      return calculateBigBoysScore(team, startHole, endHole)
  }
}

// ── Leaderboard Data Builder ───────────────────────────────────────────

export function getLeaderboardData(liveRound) {
  const formatConfig = liveRound.formatConfig
  const format = formatConfig?.format || null
  const settings = formatConfig || {}
  const config = format ? FORMAT_CONFIGS[format] : null

  // No format config → exact legacy behavior (Big Boys)
  if (!format || !config) {
    const entries = liveRound.teams.map(team => {
      const front9 = calculateBigBoysScore(team, 1, 9)
      const back9 = calculateBigBoysScore(team, 10, 18)
      return {
        id: team.id,
        name: team.name,
        front9,
        back9,
        total: front9 + back9,
        holesCompleted: getTeamHolesCompleted(team)
      }
    })
    return { entries, displayMode: 'relative', sortDirection: 'asc' }
  }

  // Match Play: special 2-team format
  if (format === 'matchplay' && liveRound.teams.length >= 2) {
    const team1 = liveRound.teams[0]
    const team2 = liveRound.teams[1]
    const result = calculateMatchPlayScore(team1, team2, 1, 18)
    const entries = [
      {
        id: team1.id,
        name: team1.name,
        holesWon: result.team1Wins,
        holesCompleted: result.thru,
        isLeader: result.leader === team1.id
      },
      {
        id: team2.id,
        name: team2.name,
        holesWon: result.team2Wins,
        holesCompleted: result.thru,
        isLeader: result.leader === team2.id
      }
    ]
    return {
      entries,
      displayMode: 'matchplay',
      sortDirection: 'asc',
      matchResult: result
    }
  }

  // Skins: no leaderboard scoring
  if (format === 'skins') {
    return { entries: [], displayMode: null, sortDirection: 'asc' }
  }

  // Individual formats: flatten players from all teams
  if (!config.team) {
    const allPlayers = liveRound.teams.flatMap(t => t.players)

    let playerEntries
    if (format === 'stableford') {
      const useNet = settings.useNet !== false // default true
      const results = calculateStablefordScore(allPlayers, 1, 18, useNet)
      const front9Results = calculateStablefordScore(allPlayers, 1, 9, useNet)
      const back9Results = calculateStablefordScore(allPlayers, 10, 18, useNet)
      playerEntries = results.map(r => {
        const f9 = front9Results.find(f => f.id === r.id)
        const b9 = back9Results.find(f => f.id === r.id)
        const player = allPlayers.find(p => p.id === r.id)
        return {
          id: r.id,
          name: r.name,
          front9: f9?.total || 0,
          back9: b9?.total || 0,
          total: r.total,
          holesCompleted: getPlayerHolesCompleted(player)
        }
      })
      return { entries: playerEntries, displayMode: 'points', sortDirection: 'desc' }
    }

    // stroke, stroke_net, track
    const useNet = format === 'stroke_net'
    const results = calculateStrokeScore(allPlayers, 1, 18, useNet)
    const front9Results = calculateStrokeScore(allPlayers, 1, 9, useNet)
    const back9Results = calculateStrokeScore(allPlayers, 10, 18, useNet)
    playerEntries = results.map(r => {
      const f9 = front9Results.find(f => f.id === r.id)
      const b9 = back9Results.find(f => f.id === r.id)
      const player = allPlayers.find(p => p.id === r.id)
      return {
        id: r.id,
        name: r.name,
        front9: f9?.total || 0,
        back9: b9?.total || 0,
        total: r.total,
        holesCompleted: getPlayerHolesCompleted(player)
      }
    })
    const displayMode = useNet ? 'net' : 'gross'
    return { entries: playerEntries, displayMode, sortDirection: 'asc' }
  }

  // Team formats: bestball, scramble, retirees
  const entries = liveRound.teams.map(team => {
    let front9, back9
    if (format === 'bestball') {
      front9 = calculateBestBallScore(team, 1, 9, settings.useHandicaps)
      back9 = calculateBestBallScore(team, 10, 18, settings.useHandicaps)
    } else if (format === 'scramble') {
      front9 = calculateScrambleScore(team, 1, 9)
      back9 = calculateScrambleScore(team, 10, 18)
    } else if (format === 'retirees') {
      front9 = calculateRetireesScore(team, 1, 9, settings)
      back9 = calculateRetireesScore(team, 10, 18, settings)
    } else {
      front9 = calculateBigBoysScore(team, 1, 9)
      back9 = calculateBigBoysScore(team, 10, 18)
    }
    return {
      id: team.id,
      name: team.name,
      front9,
      back9,
      total: front9 + back9,
      holesCompleted: getTeamHolesCompleted(team)
    }
  })

  const displayMode = config.leaderboard
  // For relative modes (bestball without handicaps), sort ascending (lower=better)
  // For net/gross raw totals, sort ascending (lower=better)
  const sortDirection = format === 'stableford' ? 'desc' : 'asc'

  return { entries, displayMode, sortDirection }
}

// ── Helpers ────────────────────────────────────────────────────────────

function getTeamHolesCompleted(team) {
  const activePlayers = team.players.filter(p => !p.isDNF)
  if (activePlayers.length === 0) return 0
  let holesCompleted = 0
  for (let hole = 1; hole <= 18; hole++) {
    const allHaveScore = activePlayers.every(p => {
      const score = p.scores?.[hole]
      return score !== undefined && score !== null && score !== ''
    })
    if (allHaveScore) {
      holesCompleted = hole
    } else {
      break
    }
  }
  return holesCompleted
}

function getPlayerHolesCompleted(player) {
  if (!player) return 0
  let holesCompleted = 0
  for (let hole = 1; hole <= 18; hole++) {
    const score = player.scores?.[hole]
    if (score !== undefined && score !== null && score !== '') {
      holesCompleted = hole
    } else {
      break
    }
  }
  return holesCompleted
}
