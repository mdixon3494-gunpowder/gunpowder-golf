/**
 * Team Generation Algorithm - A-B-C-D Flight System with Smart Pairing
 * Creates balanced teams by assigning one player from each skill flight to each team
 * Handles pairing requests and incomplete manual teams with mirror-flight balancing
 */

/**
 * Get the player's handicap for sorting (lower = better player)
 */
function getPlayerHandicap(player) {
  if (player.effectiveHandicap !== undefined && player.effectiveHandicap !== null) {
    return player.effectiveHandicap
  }
  if (player.handicap !== undefined && player.handicap !== null) {
    return player.handicap
  }
  // Fallback: convert skillRating (1-10) to approximate handicap
  const skill = player.skillRating || 5
  return Math.round(36 - (skill - 1) * 4)
}

/**
 * Get rating for team skill calculations (higher = better)
 */
function getPlayerRating(player) {
  const handicap = getPlayerHandicap(player)
  return Math.max(0, 36 - handicap)
}

/**
 * Determine which flight (0-3 for A-D) a player belongs to
 * based on their handicap relative to all players
 */
function getPlayerFlightByHandicap(player, allPlayersSorted, numFlights = 4) {
  const idx = allPlayersSorted.findIndex(p => p.id === player.id)
  if (idx === -1) {
    // Player not in sorted list (manual team member) - calculate based on handicap position
    const handicap = getPlayerHandicap(player)
    let position = 0
    for (const p of allPlayersSorted) {
      if (getPlayerHandicap(p) < handicap) position++
      else break
    }
    const flightSize = Math.ceil(allPlayersSorted.length / numFlights) || 1
    return Math.min(Math.floor(position / flightSize), numFlights - 1)
  }
  const flightSize = Math.ceil(allPlayersSorted.length / numFlights)
  return Math.min(Math.floor(idx / flightSize), numFlights - 1)
}

/**
 * Get the mirror flight for balancing same-flight players
 * A(0) mirrors D(3), B(1) mirrors C(2)
 */
function getMirrorFlight(flight, numFlights = 4) {
  return numFlights - 1 - flight
}

/**
 * Calculate variety penalty for placing a player on a team
 */
function getVarietyPenalty(player, team) {
  if (!player.recentTeammates || player.recentTeammates.length === 0) return 0
  const recentCount = team.filter(p => player.recentTeammates.includes(p.id)).length
  return recentCount * 5
}

/**
 * Select best player from a flight pool for a specific team
 * Considers variety bonus to avoid recent teammates
 */
function selectFromFlight(flightPool, team) {
  if (flightPool.length === 0) return null
  if (flightPool.length === 1) return flightPool.shift()

  let bestIdx = 0
  let bestScore = -Infinity

  for (let i = 0; i < flightPool.length; i++) {
    const player = flightPool[i]
    const varietyPenalty = getVarietyPenalty(player, team)
    const score = -varietyPenalty

    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }

  return flightPool.splice(bestIdx, 1)[0]
}

/**
 * Analyze a team's flight composition and determine what's needed
 */
function analyzeTeamFlights(team, allPlayersSorted, numFlights, targetSize) {
  const flightCounts = new Array(numFlights).fill(0)

  for (const player of team) {
    const flight = getPlayerFlightByHandicap(player, allPlayersSorted, numFlights)
    if (flight >= 0 && flight < numFlights) {
      flightCounts[flight]++
    }
  }

  // Determine what flights are needed
  const flightsNeeded = []
  const spotsRemaining = targetSize - team.length

  // Check for same-flight duplicates that need mirror balancing
  const duplicateFlights = []
  for (let f = 0; f < numFlights; f++) {
    if (flightCounts[f] > 1) {
      duplicateFlights.push({ flight: f, count: flightCounts[f] })
    }
  }

  if (duplicateFlights.length > 0) {
    // Has same-flight players - use mirror logic
    for (const dup of duplicateFlights) {
      const mirror = getMirrorFlight(dup.flight, numFlights)
      // Need mirror-flight players to balance
      for (let i = 0; i < dup.count - 1 && flightsNeeded.length < spotsRemaining; i++) {
        flightsNeeded.push({ flight: mirror, priority: 'mirror' })
      }
    }
  }

  // Fill remaining spots with unfilled flights
  for (let f = 0; f < numFlights && flightsNeeded.length < spotsRemaining; f++) {
    if (flightCounts[f] === 0) {
      flightsNeeded.push({ flight: f, priority: 'normal' })
    }
  }

  // If still need more, add any available flights
  while (flightsNeeded.length < spotsRemaining) {
    // Find least-filled flight
    let minFlight = 0
    let minCount = flightCounts[0] + flightsNeeded.filter(fn => fn.flight === 0).length
    for (let f = 1; f < numFlights; f++) {
      const count = flightCounts[f] + flightsNeeded.filter(fn => fn.flight === f).length
      if (count < minCount) {
        minCount = count
        minFlight = f
      }
    }
    flightsNeeded.push({ flight: minFlight, priority: 'fill' })
  }

  return {
    flightCounts,
    flightsNeeded,
    hasDuplicates: duplicateFlights.length > 0
  }
}

export function generateTeams(activePlayers, pairingRequests = [], manualTeams = []) {
  // Separate complete and incomplete manual teams
  const completeManualTeams = manualTeams.filter(mt => mt.players.length >= 4)
  const incompleteManualTeams = manualTeams.filter(mt => mt.players.length > 0 && mt.players.length < 4)

  // Start with complete manual teams (these are final)
  const finalTeams = completeManualTeams.map(mt => [...mt.players])

  // Get IDs of players already in manual teams
  const manualTeamPlayerIds = new Set(
    manualTeams.flatMap(team => team.players.map(p => p.id))
  )

  // Filter out players in manual teams
  const remainingPlayers = activePlayers.filter(p => !manualTeamPlayerIds.has(p.id))

  // Handle edge case: no remaining players but have incomplete manual teams
  if (remainingPlayers.length === 0) {
    // Add incomplete manual teams as-is
    for (const mt of incompleteManualTeams) {
      finalTeams.push([...mt.players])
    }
    return finalTeams
  }

  // Sort all remaining players by handicap for flight assignment
  const sortedPlayers = [...remainingPlayers].sort((a, b) => getPlayerHandicap(a) - getPlayerHandicap(b))

  // Calculate how many new teams we need (excluding incomplete manual teams that will be filled)
  const playersForNewTeams = remainingPlayers.length - incompleteManualTeams.reduce(
    (sum, mt) => sum + Math.min(4 - mt.players.length, remainingPlayers.length), 0
  )

  // Estimate team structure
  const totalNewPlayers = remainingPlayers.length
  const incompleteTeamSpots = incompleteManualTeams.reduce((sum, mt) => sum + (4 - mt.players.length), 0)
  const playersAfterFillingIncomplete = Math.max(0, totalNewPlayers - incompleteTeamSpots)

  const numFoursomes = Math.floor(playersAfterFillingIncomplete / 4)
  const remainder = playersAfterFillingIncomplete % 4

  let newTeamSizes = []
  if (remainder === 0) {
    newTeamSizes = new Array(numFoursomes).fill(4)
  } else if (remainder === 3) {
    newTeamSizes = new Array(numFoursomes).fill(4).concat([3])
  } else if (remainder === 2) {
    newTeamSizes = new Array(Math.max(0, numFoursomes - 1)).fill(4).concat([3, 3])
  } else if (remainder === 1) {
    newTeamSizes = new Array(Math.max(0, numFoursomes - 2)).fill(4).concat([3, 3, 3])
  }

  // Determine number of flights based on team size
  const allTeamSizes = [
    ...incompleteManualTeams.map(() => 4), // Incomplete teams target 4
    ...newTeamSizes
  ]
  const numFlights = allTeamSizes.length > 0 ? Math.max(...allTeamSizes, 4) : 4

  // Process pairing requests
  const paired = new Set()
  const pairsWithFlightInfo = []

  pairingRequests.forEach(request => {
    const p1 = remainingPlayers.find(p => p.id === parseInt(request.player1))
    const p2 = remainingPlayers.find(p => p.id === parseInt(request.player2))

    if (p1 && p2) {
      const flight1 = getPlayerFlightByHandicap(p1, sortedPlayers, numFlights)
      const flight2 = getPlayerFlightByHandicap(p2, sortedPlayers, numFlights)

      pairsWithFlightInfo.push({
        players: [p1, p2],
        flights: [flight1, flight2],
        isSameFlight: flight1 === flight2,
        flight: flight1,
        mirrorFlight: getMirrorFlight(flight1, numFlights)
      })

      paired.add(p1.id)
      paired.add(p2.id)
    }
  })

  // Separate same-flight pairs from different-flight pairs
  const sameFlightPairs = pairsWithFlightInfo.filter(p => p.isSameFlight)
  const diffFlightPairs = pairsWithFlightInfo.filter(p => !p.isSameFlight)

  // Try to combine complementary same-flight pairs
  const combinedTeams = []
  const remainingSameFlightPairs = []

  const sameFlightByFlight = {}
  sameFlightPairs.forEach(pair => {
    if (!sameFlightByFlight[pair.flight]) {
      sameFlightByFlight[pair.flight] = []
    }
    sameFlightByFlight[pair.flight].push(pair)
  })

  const usedPairs = new Set()

  for (const pair of sameFlightPairs) {
    if (usedPairs.has(pair)) continue

    const mirrorFlight = pair.mirrorFlight
    const mirrorPairs = sameFlightByFlight[mirrorFlight] || []
    const availableMirror = mirrorPairs.find(mp => !usedPairs.has(mp))

    if (availableMirror) {
      combinedTeams.push({
        players: [...pair.players, ...availableMirror.players],
        isComplete: true
      })
      usedPairs.add(pair)
      usedPairs.add(availableMirror)
    } else {
      remainingSameFlightPairs.push(pair)
    }
  }

  // Build team objects for filling
  const teamsToFill = []

  // Add incomplete manual teams
  for (const mt of incompleteManualTeams) {
    teamsToFill.push({
      players: [...mt.players],
      targetSize: 4,
      isManual: true
    })
  }

  // Add combined pair teams (already complete)
  for (const ct of combinedTeams) {
    finalTeams.push(ct.players)
  }

  // Add remaining same-flight pairs as teams needing fill
  for (const pair of remainingSameFlightPairs) {
    teamsToFill.push({
      players: [...pair.players],
      targetSize: 4,
      needsMirror: pair.mirrorFlight,
      mirrorCount: 2
    })
  }

  // Add different-flight pairs as teams needing fill
  for (const pair of diffFlightPairs) {
    teamsToFill.push({
      players: [...pair.players],
      targetSize: 4,
      filledFlights: pair.flights
    })
  }

  // Add empty teams for remaining structure
  for (const size of newTeamSizes) {
    // Only add if we have players that aren't in pairs or manual teams
    teamsToFill.push({
      players: [],
      targetSize: size
    })
  }

  // Get unpaired players for flight pools
  const unpairedPlayers = sortedPlayers.filter(p => !paired.has(p.id))

  // Create flight pools
  const flightPools = []
  if (unpairedPlayers.length > 0) {
    const baseFlightSize = Math.floor(unpairedPlayers.length / numFlights)
    const extraPlayers = unpairedPlayers.length % numFlights

    let playerIdx = 0
    for (let f = 0; f < numFlights; f++) {
      const flightSize = baseFlightSize + (f < extraPlayers ? 1 : 0)
      flightPools.push(unpairedPlayers.slice(playerIdx, playerIdx + flightSize))
      playerIdx += flightSize
    }
  } else {
    for (let f = 0; f < numFlights; f++) {
      flightPools.push([])
    }
  }

  // Fill teams in order: manual teams first, then pair teams, then new teams
  // Sort so manual teams and teams needing mirror fills go first
  teamsToFill.sort((a, b) => {
    if (a.isManual && !b.isManual) return -1
    if (!a.isManual && b.isManual) return 1
    if (a.needsMirror !== undefined && b.needsMirror === undefined) return -1
    if (a.needsMirror === undefined && b.needsMirror !== undefined) return 1
    return 0
  })

  // Fill each team
  for (const team of teamsToFill) {
    const spotsNeeded = team.targetSize - team.players.length
    if (spotsNeeded <= 0) continue

    // Analyze what this team needs
    const analysis = analyzeTeamFlights(team.players, sortedPlayers, numFlights, team.targetSize)

    // If team has specific mirror needs, prioritize those
    if (team.needsMirror !== undefined && team.mirrorCount > 0) {
      for (let i = 0; i < team.mirrorCount && flightPools[team.needsMirror]?.length > 0; i++) {
        const player = selectFromFlight(flightPools[team.needsMirror], team.players)
        if (player) {
          team.players.push(player)
        }
      }
    }

    // Fill remaining spots based on analysis
    for (const need of analysis.flightsNeeded) {
      if (team.players.length >= team.targetSize) break
      if (flightPools[need.flight]?.length > 0) {
        const player = selectFromFlight(flightPools[need.flight], team.players)
        if (player) {
          team.players.push(player)
        }
      }
    }

    // If still not full, take from any available pool
    while (team.players.length < team.targetSize) {
      let added = false
      for (let f = 0; f < numFlights; f++) {
        if (flightPools[f]?.length > 0) {
          const player = selectFromFlight(flightPools[f], team.players)
          if (player) {
            team.players.push(player)
            added = true
            break
          }
        }
      }
      if (!added) break // No more players available
    }
  }

  // Add filled teams to final list
  for (const team of teamsToFill) {
    if (team.players.length > 0) {
      finalTeams.push(team.players)
    }
  }

  // Handle any leftover players
  const allLeftover = flightPools.flat()
  for (const player of allLeftover) {
    // Try to add to an existing team that's short
    let added = false
    for (const team of finalTeams) {
      if (team.length < 4) {
        team.push(player)
        added = true
        break
      }
    }
    if (!added) {
      // Create a new team
      finalTeams.push([player])
    }
  }

  // Sort teams: 4-person teams first, then by size descending
  finalTeams.sort((a, b) => b.length - a.length)

  return finalTeams
}

export function getTeamName(team) {
  if (!team || team.length === 0) return 'Empty Team'
  if (team.length === 1) return team[0].name

  const names = team.map(p => {
    const parts = p.name.split(' ')
    return parts[0]
  })

  return names.join(' / ')
}

export function calculateTeamSkill(team) {
  if (!team || team.length === 0) return 0
  return team.reduce((sum, p) => sum + getPlayerRating(p), 0)
}

export function calculateTeamHandicap(team) {
  if (!team || team.length === 0) return 0
  return team.reduce((sum, p) => sum + getPlayerHandicap(p), 0)
}

export function calculateTeamBalance(teams) {
  if (!teams || teams.length < 2) return { variance: 0, range: 0 }

  const handicaps = teams.map(t => calculateTeamHandicap(t))
  const avg = handicaps.reduce((a, b) => a + b, 0) / handicaps.length
  const variance = handicaps.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / handicaps.length
  const range = Math.max(...handicaps) - Math.min(...handicaps)

  return { variance, range, avg }
}
