import { getHoleInfo, getActivePar3Holes } from '../lib/courseData'
import { getLeaderboardData } from './formatScoring'

export function calculateRoundSettlement(round, payoutFormats, holeInOnePot, skinsMatch, greenieCarryoverSettings, teamScoringRules, courseTees, options = {}) {
  if (!round) return null
  // Par-3 holes come from the active scorecard (e.g. Shenvalee's vary by nine selection).
  // Default to whatever's currently active; tests/back-compat callers can override via options.par3Holes.
  const par3Holes = options.par3Holes || getActivePar3Holes() || [4, 8, 12, 17]
  const par3Count = par3Holes.length
  // Team Greenies mode: greenie pot flows to the team of the closest-to-pin player,
  // then is split among that team's members for per-player display. Same buy-in either way.
  const teamGreenies = !!options.teamGreenies

  const numTeams = round.teams.length
  const isMatchPlay = numTeams === 2
  const format = isMatchPlay ? payoutFormats.matchPlay : payoutFormats.standard

  // Count all players
  const allPlayers = round.teams.flatMap(t => t.players)
  const totalPlayers = allPlayers.length

  // Determine eligible HIO players
  const hioEligiblePlayers = allPlayers.filter(p => holeInOnePot?.playerEligibility?.[p.id] !== false)
  const hioEnabled = hioEligiblePlayers.length >= (holeInOnePot?.minimumPlayers || 6)

  // Calculate pools
  const greeniePoolPerHole = totalPlayers * format.greeniePerHole
  const front9Pool = totalPlayers * format.front9
  const back9Pool = totalPlayers * format.back9
  const overallPool = isMatchPlay ? totalPlayers * format.overall : 0
  const hioContribution = hioEnabled ? hioEligiblePlayers.length * format.holeInOne : 0

  // Use format-aware leaderboard scoring to determine winners
  // holesCompleted from getLeaderboardData handles all scoring modes:
  // normal hole-by-hole, manual team scores (by-9 or by-hole), and manual player totals
  const { entries, sortDirection } = getLeaderboardData(round, teamScoringRules || null, courseTees || null)

  // Check completion using leaderboard-derived data (works for all scoring modes)
  const front9Complete = entries.every(e => e.holesCompleted >= 9)
  const back9Complete = entries.every(e => e.holesCompleted >= 18)
  const allComplete = front9Complete && back9Complete

  // Build team index lookup from leaderboard entries
  const entryByIdx = {}
  entries.forEach(entry => {
    const idx = round.teams.findIndex(t => t.id === entry.id)
    if (idx !== -1) entryByIdx[idx] = entry
  })

  // Find winner(s) for a given score accessor, respecting DQ and sort direction
  function findWinners(getScore, isComplete, getDQ) {
    if (!isComplete) return null
    const eligible = Object.entries(entryByIdx)
      .filter(([, e]) => !(getDQ && getDQ(e)))
      .filter(([, e]) => typeof getScore(e) === 'number')
    if (eligible.length === 0) return null
    const scores = eligible.map(([, e]) => getScore(e))
    const best = sortDirection === 'asc' ? Math.min(...scores) : Math.max(...scores)
    const winners = eligible.filter(([, e]) => getScore(e) === best).map(([idx]) => parseInt(idx))
    return winners.length > 0 ? winners : null
  }

  let front9Winner = findWinners(e => e.front9, front9Complete, e => e.dqFront9)
  let back9Winner = findWinners(e => e.back9, back9Complete, e => e.dqBack9)
  let overallWinner = findWinners(e => e.total, allComplete, e => e.dqTotal)

  // Manual match play overrides (2-team rounds where admin declares winners)
  const manual = round.manualMatchPlayResults
  if (isMatchPlay && manual) {
    if (manual.front9 != null) {
      if (manual.front9 === 'push') {
        front9Winner = [0, 1] // split
      } else {
        front9Winner = [manual.front9]
      }
    }
    if (manual.back9 != null) {
      if (manual.back9 === 'push') {
        back9Winner = [0, 1]
      } else {
        back9Winner = [manual.back9]
      }
    }
    if (manual.overall != null) {
      if (manual.overall === 'push') {
        overallWinner = [0, 1]
      } else {
        overallWinner = [manual.overall]
      }
    }
  }

  // Calculate team settlements
  const teamSettlements = round.teams.map((team, idx) => {
    const teamSize = team.players.length

    // Team competition entry (front 9, back 9, overall for match play)
    const teamCompEntry = teamSize * (format.front9 + format.back9 + (isMatchPlay ? format.overall : 0))

    // Greenies entry — one buy-in per player per par-3 hole on this course's active layout
    const greeniesEntry = teamSize * par3Count * format.greeniePerHole

    // HIO entry (per eligible player on this team)
    const teamHioEligible = team.players.filter(p => holeInOnePot?.playerEligibility?.[p.id] !== false).length
    const hioEntry = hioEnabled ? teamHioEligible * format.holeInOne : 0

    // Total entry fee (everything owed, excluding skins which is separate)
    const teamEntry = teamCompEntry + greeniesEntry + hioEntry

    let teamWinnings = 0
    const wins = []
    const ties = []

    if (front9Winner?.includes(idx)) {
      teamWinnings += front9Pool / front9Winner.length
      if (front9Winner.length > 1) {
        ties.push({ category: 'Front 9', numTeams: front9Winner.length })
      } else {
        wins.push('Front 9')
      }
    }
    if (back9Winner?.includes(idx)) {
      teamWinnings += back9Pool / back9Winner.length
      if (back9Winner.length > 1) {
        ties.push({ category: 'Back 9', numTeams: back9Winner.length })
      } else {
        wins.push('Back 9')
      }
    }
    if (isMatchPlay && overallWinner?.includes(idx)) {
      teamWinnings += overallPool / overallWinner.length
      if (overallWinner.length > 1) {
        ties.push({ category: 'Overall', numTeams: overallWinner.length })
      } else {
        wins.push('Overall')
      }
    }

    return {
      teamId: team.id,
      teamName: team.name,
      teamSize,
      entry: teamEntry,
      teamCompEntry,
      greeniesEntry,
      hioEntry,
      winnings: teamWinnings,
      net: teamWinnings - teamCompEntry, // Net is based on team comp only (greenies/HIO are individual winnings)
      wins,
      ties,
      perPlayerEntry: teamEntry / teamSize,
      perPlayerWinnings: teamWinnings / teamSize,
      perPlayerNet: (teamWinnings - teamCompEntry) / teamSize
    }
  })

  // Calculate greenie results
  const greenieResults = {}

  par3Holes.forEach(hole => {
    // Check round.greenies or team greenies
    let greenieData = round.greenies?.[hole]
    if (!greenieData) {
      // Try to find in team greenies
      round.teams.forEach(t => {
        if (t.greenies?.[hole]) {
          greenieData = t.greenies[hole]
        }
      })
    }

    greenieResults[hole] = {
      pot: totalPlayers * format.greeniePerHole,
      winner: greenieData?.playerId || greenieData?.leaderId || null,
      winnerName: greenieData?.playerName || null,
      distance: greenieData?.distance || null,
      isFinal: greenieData?.isFinal || !!greenieData?.playerId
    }
  })

  // Calculate greenie payouts with carryovers
  let carryover = 0
  const greeniePayouts = {}
  const carryoverSettings = greenieCarryoverSettings || {}
  const carryoverMode = carryoverSettings.carryoverMode || 'last_winner'
  const noWinnersMode = carryoverSettings.noWinnersMode || 'hio_pot'

  // Track first and last winners for carryover distribution
  let firstWinnerId = null
  let lastWinnerId = null
  const allWinnerIds = new Set()

  par3Holes.forEach(hole => {
    const result = greenieResults[hole]
    const totalPot = result.pot + carryover

    if (result.winner) {
      greeniePayouts[result.winner] = (greeniePayouts[result.winner] || 0) + totalPot
      carryover = 0
      if (!firstWinnerId) firstWinnerId = result.winner
      lastWinnerId = result.winner
      allWinnerIds.add(result.winner)
    } else {
      carryover = totalPot
    }
  })

  // Handle leftover carryover (unwon greenie money after last par 3)
  if (carryover > 0) {
    if (allWinnerIds.size > 0) {
      // Some greenies were won — distribute leftover based on carryoverMode
      if (carryoverMode === 'last_winner') {
        greeniePayouts[lastWinnerId] = (greeniePayouts[lastWinnerId] || 0) + carryover
        carryover = 0
      } else if (carryoverMode === 'first_winner') {
        greeniePayouts[firstWinnerId] = (greeniePayouts[firstWinnerId] || 0) + carryover
        carryover = 0
      } else if (carryoverMode === 'split') {
        const splitAmount = carryover / allWinnerIds.size
        allWinnerIds.forEach(id => {
          greeniePayouts[id] = (greeniePayouts[id] || 0) + splitAmount
        })
        carryover = 0
      }
      // 'hio_pot' — carryover remains, added to HIO pot below
    } else {
      // No greenies won at all — use noWinnersMode
      if (noWinnersMode === 'split') {
        const splitAmount = carryover / totalPlayers
        allPlayers.forEach(p => {
          greeniePayouts[p.id] = (greeniePayouts[p.id] || 0) + splitAmount
        })
        carryover = 0
      }
      // 'hio_pot' — carryover remains, added to HIO pot below
      // 'carry_next' — carryover remains as carryoverRemaining for next round
    }
  }

  // Team greenies: aggregate each team's greenie payouts (sum of its players' greenie wins),
  // then split evenly across that team's roster for per-player display.
  const teamGreenieTotals = {}
  if (teamGreenies) {
    for (const team of round.teams) {
      let sum = 0
      for (const p of team.players) sum += (greeniePayouts[p.id] || 0)
      teamGreenieTotals[team.id] = sum
    }
  }

  // Calculate player settlements
  const playerSettlements = allPlayers.map(player => {
    const team = round.teams.find(t => t.players.some(p => p.id === player.id))
    const teamSettlement = teamSettlements.find(ts => ts.teamId === team.id)

    const greeniesPaid = par3Count * format.greeniePerHole // One buy-in per par-3 hole on the active layout
    const greeniesWon = teamGreenies
      ? (teamGreenieTotals[team.id] || 0) / team.players.length
      : (greeniePayouts[player.id] || 0)

    let teamEntryShare = teamSettlement.perPlayerEntry
    let teamWinningsShare = teamSettlement.perPlayerWinnings

    // Handle late joiners
    if (player.joinedLate && player.paymentStatus === 'none') {
      teamEntryShare = 0
      teamWinningsShare = 0
    }

    const hioPaid = hioEnabled && holeInOnePot?.playerEligibility?.[player.id] !== false ? format.holeInOne : 0

    const leaguePaid = greeniesPaid + teamEntryShare + hioPaid
    const leagueWon = greeniesWon + teamWinningsShare
    const leagueNet = leagueWon - leaguePaid

    return {
      playerId: player.id,
      playerName: player.name,
      teamName: team.name,
      isDNF: player.isDNF || false,
      greenies: { paid: greeniesPaid, won: greeniesWon, net: greeniesWon - greeniesPaid },
      team: { paid: teamEntryShare, won: teamWinningsShare, net: teamWinningsShare - teamEntryShare },
      hio: { paid: hioPaid },
      leaguePaid,
      leagueWon,
      leagueNet
    }
  })

  return {
    format: isMatchPlay ? 'matchPlay' : 'standard',
    formatName: isMatchPlay ? 'Match Play' : 'Standard',
    totalPlayers,
    completion: { front9: front9Complete, back9: back9Complete, all: allComplete },
    pools: { front9: front9Pool, back9: back9Pool, overall: overallPool, greeniePerHole: greeniePoolPerHole },
    hio: { enabled: hioEnabled, contribution: hioContribution, eligibleCount: hioEligiblePlayers.length },
    teamSettlements,
    playerSettlements,
    greenieResults,
    greeniePayouts,
    carryoverRemaining: carryover
  }
}

export function formatMoney(amount) {
  if (amount === 0) return '$0'
  const sign = amount >= 0 ? '+' : ''
  return `${sign}$${Math.abs(amount).toFixed(0)}`
}
