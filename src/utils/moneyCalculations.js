import { getHoleInfo } from '../lib/courseData'

// Calculate team score for a 9-hole range (stroke play)
function calculateTeamStrokeScore(team, startHole, endHole) {
  let total = 0
  team.players.forEach(p => {
    if (p.includeInTeamScore === false || p.isDNF) return
    for (let h = startHole; h <= endHole; h++) {
      const s = p.scores?.[h]
      if (s && s !== 'X') total += parseInt(s) || 0
    }
  })
  return total
}

// Check if a 9-hole stretch is complete for all teams
function check9Complete(round, startHole, endHole) {
  return round.teams.every(team => {
    return team.players.some(p => {
      if (p.isDNF) return false
      const holes = []
      for (let h = startHole; h <= endHole; h++) holes.push(h)
      return holes.every(h => {
        const score = p.scores?.[h]
        return score !== undefined && score !== '' && score !== null && score !== 'X'
      })
    })
  })
}

export function calculateRoundSettlement(round, payoutFormats, holeInOnePot, skinsMatch) {
  if (!round) return null

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

  // Check completion status
  const front9Complete = check9Complete(round, 1, 9)
  const back9Complete = check9Complete(round, 10, 18)
  const allComplete = front9Complete && back9Complete

  // Determine winners (stroke play - lowest score wins)
  let front9Winner = null
  let back9Winner = null
  let overallWinner = null

  const teamScores = round.teams.map((team, idx) => {
    const front = calculateTeamStrokeScore(team, 1, 9)
    const back = calculateTeamStrokeScore(team, 10, 18)
    return { idx, front, back, total: front + back }
  })

  if (front9Complete && teamScores.some(t => t.front > 0)) {
    const minFront = Math.min(...teamScores.filter(t => t.front > 0).map(t => t.front))
    front9Winner = teamScores.filter(t => t.front === minFront).map(t => t.idx)
  }

  if (back9Complete && teamScores.some(t => t.back > 0)) {
    const minBack = Math.min(...teamScores.filter(t => t.back > 0).map(t => t.back))
    back9Winner = teamScores.filter(t => t.back === minBack).map(t => t.idx)
  }

  if (allComplete && teamScores.some(t => t.total > 0)) {
    const minTotal = Math.min(...teamScores.filter(t => t.total > 0).map(t => t.total))
    overallWinner = teamScores.filter(t => t.total === minTotal).map(t => t.idx)
  }

  // Calculate team settlements
  const teamSettlements = round.teams.map((team, idx) => {
    const teamSize = team.players.length

    // Team competition entry (front 9, back 9, overall for match play)
    const teamCompEntry = teamSize * (format.front9 + format.back9 + (isMatchPlay ? format.overall : 0))

    // Greenies entry (4 par 3 holes per player)
    const greeniesEntry = teamSize * 4 * format.greeniePerHole

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
  const par3Holes = [4, 8, 12, 17]
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

  par3Holes.forEach(hole => {
    const result = greenieResults[hole]
    const totalPot = result.pot + carryover

    if (result.winner) {
      greeniePayouts[result.winner] = (greeniePayouts[result.winner] || 0) + totalPot
      carryover = 0
    } else {
      carryover = totalPot
    }
  })

  // Calculate player settlements
  const playerSettlements = allPlayers.map(player => {
    const team = round.teams.find(t => t.players.some(p => p.id === player.id))
    const teamSettlement = teamSettlements.find(ts => ts.teamId === team.id)

    const greeniesPaid = 4 * format.greeniePerHole // All 4 par 3s
    const greeniesWon = greeniePayouts[player.id] || 0

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
