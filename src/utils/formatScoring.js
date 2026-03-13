import { getHoleInfo, getAllHoles, getFront9Par, getBack9Par } from '../lib/courseData'
import { getNetDoubleBogeyMax } from '../utils/handicapCalculation'

// ── Manual Team Score Resolution ─────────────────────────────────────

/**
 * Resolve manual team scores for a hole range.
 * Returns gross score total, or null if no manual data covers this range.
 */
/**
 * Resolve manual team score for a hole range.
 * Values are stored as relative-to-par (e.g. -1 = one under, +2 = two over).
 * Returns the relative-to-par value directly.
 */
export function resolveManualTeamScore(team, startHole, endHole) {
  const manual = team.manualTeamScores
  if (!manual) return null

  // Hole-by-hole data takes priority
  if (manual.holes) {
    const holeKeys = Object.keys(manual.holes).map(Number).filter(h => h >= startHole && h <= endHole)
    if (holeKeys.length > 0) {
      return holeKeys.reduce((sum, h) => sum + (parseInt(manual.holes[h]) || 0), 0)
    }
  }

  // Front 9 / Back 9 totals
  if (startHole <= 9 && endHole <= 9 && manual.front9 != null) return parseInt(manual.front9) || 0
  if (startHole >= 10 && endHole >= 10 && manual.back9 != null) return parseInt(manual.back9) || 0

  // Full 18
  if (startHole === 1 && endHole === 18) {
    const f = manual.front9 != null ? parseInt(manual.front9) || 0 : null
    const b = manual.back9 != null ? parseInt(manual.back9) || 0 : null
    if (f != null || b != null) return (f || 0) + (b || 0)
  }

  return null
}

/**
 * Convert a relative-to-par manual score to the appropriate display value.
 * Relative modes (bigboys, bestball) use the value directly.
 * Gross/net modes add par back to get the raw total.
 */
function convertManualScoreForDisplay(relativeScore, startHole, endHole, displayMode) {
  if (relativeScore === null) return 0
  if (displayMode === 'relative') {
    return relativeScore
  }
  // For gross/net display, convert back to actual score
  const par = startHole <= 9 && endHole <= 9
    ? getFront9Par()
    : startHole >= 10 && endHole >= 10
      ? getBack9Par()
      : getFront9Par() + getBack9Par()
  return relativeScore + par
}

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

// ── Team Scoring Rules ────────────────────────────────────────────────

/**
 * Get the max score a player can contribute to the team for a given hole.
 * Returns null if no cap is active.
 */
export function getTeamMaxScore(holeNumber, player, rules, courseTees) {
  if (!rules || rules.maxScoreMode === 'none' || !rules.maxScoreMode) return null
  const holeInfo = getHoleInfo(holeNumber)
  const par = holeInfo?.par || 4

  switch (rules.maxScoreMode) {
    case 'ndb': {
      const ndb = getNetDoubleBogeyMax(holeNumber, player.handicap, player.tee || player.defaultTee || 'blue', courseTees)
      return ndb != null ? ndb : par + 2 // fallback if handicap is null
    }
    case 'double_bogey':
      return par + 2
    case 'triple_bogey':
      return par + 3
    case 'fixed':
      return rules.maxScoreFixed || 10
    default:
      return null
  }
}

/**
 * Get processed scores for a team on a hole, applying team scoring rules.
 * Returns array of { score, handicap, rawScore, isXConverted }.
 */
export function getTeamScoresForHole(team, hole, rules, courseTees) {
  const activePlayers = team.players.filter(p => !p.isDNF && p.includeInTeamScore)
  const results = []

  for (const p of activePlayers) {
    const raw = p.scores[hole]
    if (raw === undefined || raw === null || raw === '') continue

    const maxForTeam = rules ? getTeamMaxScore(hole, p, rules, courseTees) : null

    if (raw === 'X') {
      // X score: convert to max if allowed and max exists, else skip
      if (rules?.allowXForTeamScore && maxForTeam !== null) {
        results.push({ score: maxForTeam, handicap: p.handicap || 0, rawScore: raw, isXConverted: true })
      }
      // else: skip X (current default behavior)
      continue
    }

    // Numeric score: cap at team max if set
    const numScore = typeof raw === 'number' ? raw : parseInt(raw)
    if (isNaN(numScore)) continue

    const capped = maxForTeam !== null ? Math.min(numScore, maxForTeam) : numScore
    results.push({ score: capped, handicap: p.handicap || 0, rawScore: numScore, isXConverted: false })
  }

  return results
}

/**
 * Check if a team is DQ'd for a 9-hole segment due to missing scores.
 * Only applies when dqOnMissingScores is true AND allowXForTeamScore is false.
 * requiredScores = minimum non-X scores needed per hole (format-dependent).
 */
export function checkTeamDQ(team, startHole, endHole, rules, requiredScores = 1) {
  if (!rules || !rules.dqOnMissingScores || rules.allowXForTeamScore) return false

  for (let hole = startHole; hole <= endHole; hole++) {
    const activePlayers = team.players.filter(p => !p.isDNF && p.includeInTeamScore)
    let validCount = 0
    for (const p of activePlayers) {
      const s = p.scores[hole]
      if (s !== undefined && s !== null && s !== '' && s !== 'X') {
        validCount++
      }
    }
    if (validCount < requiredScores) return true
  }
  return false
}

// ── Big Boys Format ────────────────────────────────────────────────────
// All under-par scores summed + best score if none under par

export function calculateBigBoysScore(team, startHole, endHole, rules = null, courseTees = null) {
  let totalScore = 0
  for (let hole = startHole; hole <= endHole; hole++) {
    const holeInfo = getHoleInfo(hole)
    const par = holeInfo?.par || 4

    let playerScores
    if (rules && rules.maxScoreMode && rules.maxScoreMode !== 'none') {
      playerScores = getTeamScoresForHole(team, hole, rules, courseTees).map(e => e.score)
    } else {
      playerScores = team.players
        .filter(p => !p.isDNF && p.includeInTeamScore)
        .map(p => p.scores[hole])
        .filter(s => s !== undefined && s !== null && s !== '' && s !== 'X')
    }

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

export function calculateBestBallScore(team, startHole, endHole, useHandicaps = false, rules = null, courseTees = null) {
  let totalScore = 0
  for (let hole = startHole; hole <= endHole; hole++) {
    const holeInfo = getHoleInfo(hole)
    const par = holeInfo?.par || 4

    let entries
    if (rules && rules.maxScoreMode && rules.maxScoreMode !== 'none') {
      entries = getTeamScoresForHole(team, hole, rules, courseTees)
    } else {
      entries = getValidScores(team, hole)
    }
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

export function calculateScrambleScore(team, startHole, endHole, rules = null, courseTees = null) {
  let totalScore = 0
  for (let hole = startHole; hole <= endHole; hole++) {
    let entries
    if (rules && rules.maxScoreMode && rules.maxScoreMode !== 'none') {
      entries = getTeamScoresForHole(team, hole, rules, courseTees)
    } else {
      entries = getValidScores(team, hole)
    }
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

export function calculateRetireesScore(team, startHole, endHole, settings = {}, rules = null, courseTees = null) {
  const scoresToCount = settings.retireesScoresToCount || 2
  const activePlayers = team.players.filter(p => !p.isDNF && p.includeInTeamScore)
  const teamSize = activePlayers.length
  const adj = getRetireesAdjustment(teamSize, settings)
  const hasRules = rules && rules.maxScoreMode && rules.maxScoreMode !== 'none'

  let totalNet = 0
  for (let hole = startHole; hole <= endHole; hole++) {
    let netScores
    if (hasRules) {
      // Cap gross scores before net calculation
      netScores = getTeamScoresForHole(team, hole, rules, courseTees)
        .map(e => {
          const extraStrokes = adj.extraStrokes
          return e.score - getNetStrokes((e.handicap || 0) + extraStrokes, hole)
        })
        .sort((a, b) => a - b)
    } else {
      netScores = activePlayers
        .map(p => {
          const s = p.scores[hole]
          if (s === undefined || s === null || s === '' || s === 'X') return null
          const extraStrokes = adj.extraStrokes
          return s - getNetStrokes((p.handicap || 0) + extraStrokes, hole)
        })
        .filter(s => s !== null)
        .sort((a, b) => a - b)
    }

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
  const rules = settings.teamScoringRules || null
  const courseTees = settings.courseTees || null

  switch (format) {
    case 'bigboys':
      return calculateBigBoysScore(team, startHole, endHole, rules, courseTees)
    case 'bestball':
      return calculateBestBallScore(team, startHole, endHole, settings.useHandicaps, rules, courseTees)
    case 'scramble':
      return calculateScrambleScore(team, startHole, endHole, rules, courseTees)
    case 'retirees':
      return calculateRetireesScore(team, startHole, endHole, settings, rules, courseTees)
    default:
      return calculateBigBoysScore(team, startHole, endHole, rules, courseTees)
  }
}

// ── Leaderboard Data Builder ───────────────────────────────────────────

export function getLeaderboardData(liveRound, teamScoringRules = null, courseTees = null) {
  const formatConfig = liveRound.formatConfig
  const format = formatConfig?.format || null
  const settings = formatConfig || {}
  const config = format ? FORMAT_CONFIGS[format] : null
  const rules = teamScoringRules || null

  // Determine requiredScores for DQ based on format
  const getRequiredScores = (fmt) => {
    if (fmt === 'retirees') return settings.retireesScoresToCount || 2
    return 1 // bigboys, bestball, scramble, default
  }

  // Apply DQ flags to a team entry
  const applyDQ = (entry, team, fmt) => {
    if (!rules || fmt === 'matchplay') return entry
    const req = getRequiredScores(fmt)
    const dqFront9 = checkTeamDQ(team, 1, 9, rules, req)
    const dqBack9 = checkTeamDQ(team, 10, 18, rules, req)
    const dqTotal = dqFront9 || dqBack9
    return {
      ...entry,
      dqFront9,
      dqBack9,
      dqTotal,
      front9: dqFront9 ? 'DQ' : entry.front9,
      back9: dqBack9 ? 'DQ' : entry.back9,
      total: dqTotal ? 'DQ' : entry.total
    }
  }

  // Sort helper: DQ entries go to bottom
  const sortWithDQ = (entries, sortDirection) => {
    return [...entries].sort((a, b) => {
      const aDQ = a.dqTotal || false
      const bDQ = b.dqTotal || false
      if (aDQ && !bDQ) return 1
      if (!aDQ && bDQ) return -1
      if (aDQ && bDQ) return 0
      // Normal sort for non-DQ entries handled by caller
      return 0
    })
  }

  // No format config → exact legacy behavior (Big Boys)
  if (!format || !config) {
    const entries = liveRound.teams.map(team => {
      let front9, back9
      if (team.isManualTeamScore && team.manualTeamScores) {
        front9 = convertManualScoreForDisplay(resolveManualTeamScore(team, 1, 9), 1, 9, 'relative')
        back9 = convertManualScoreForDisplay(resolveManualTeamScore(team, 10, 18), 10, 18, 'relative')
      } else {
        front9 = calculateBigBoysScore(team, 1, 9, rules, courseTees)
        back9 = calculateBigBoysScore(team, 10, 18, rules, courseTees)
      }
      const entry = {
        id: team.id,
        name: team.name,
        front9,
        back9,
        total: front9 + back9,
        holesCompleted: getTeamHolesCompleted(team),
        isManualTeamScore: team.isManualTeamScore || false
      }
      return applyDQ(entry, team, 'bigboys')
    })
    return { entries, displayMode: 'relative', sortDirection: 'asc' }
  }

  // Match Play: special 2-team format (exempt from DQ)
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

  // Individual formats: flatten players from all teams (no team DQ applies)
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
  const displayMode = config.leaderboard
  const entries = liveRound.teams.map(team => {
    let front9, back9
    if (team.isManualTeamScore && team.manualTeamScores) {
      front9 = convertManualScoreForDisplay(resolveManualTeamScore(team, 1, 9), 1, 9, displayMode)
      back9 = convertManualScoreForDisplay(resolveManualTeamScore(team, 10, 18), 10, 18, displayMode)
    } else if (format === 'bestball') {
      front9 = calculateBestBallScore(team, 1, 9, settings.useHandicaps, rules, courseTees)
      back9 = calculateBestBallScore(team, 10, 18, settings.useHandicaps, rules, courseTees)
    } else if (format === 'scramble') {
      front9 = calculateScrambleScore(team, 1, 9, rules, courseTees)
      back9 = calculateScrambleScore(team, 10, 18, rules, courseTees)
    } else if (format === 'retirees') {
      front9 = calculateRetireesScore(team, 1, 9, settings, rules, courseTees)
      back9 = calculateRetireesScore(team, 10, 18, settings, rules, courseTees)
    } else {
      front9 = calculateBigBoysScore(team, 1, 9, rules, courseTees)
      back9 = calculateBigBoysScore(team, 10, 18, rules, courseTees)
    }
    const entry = {
      id: team.id,
      name: team.name,
      front9,
      back9,
      total: front9 + back9,
      holesCompleted: getTeamHolesCompleted(team),
      isManualTeamScore: team.isManualTeamScore || false
    }
    return applyDQ(entry, team, format)
  })

  // For relative modes (bestball without handicaps), sort ascending (lower=better)
  // For net/gross raw totals, sort ascending (lower=better)
  const sortDirection = format === 'stableford' ? 'desc' : 'asc'

  return { entries, displayMode, sortDirection }
}

// ── Helpers ────────────────────────────────────────────────────────────

function getTeamHolesCompleted(team) {
  // Manual team scores: determine completion from manual data
  if (team.isManualTeamScore && team.manualTeamScores) {
    const manual = team.manualTeamScores
    if (manual.holes) {
      let completed = 0
      for (let h = 1; h <= 18; h++) {
        if (manual.holes[h] != null && manual.holes[h] !== '') completed = h
        else break
      }
      return completed
    }
    // By-9 totals: treat as 9 or 18 complete
    const hasFront = manual.front9 != null && manual.front9 !== ''
    const hasBack = manual.back9 != null && manual.back9 !== ''
    if (hasFront && hasBack) return 18
    if (hasFront) return 9
    return 0
  }

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
