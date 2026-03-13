/**
 * Team Generation Algorithm - A-B-C-D Flight System with Randomization & Recency Checks
 * Creates balanced teams by assigning one player from each skill flight to each team
 * Randomizes selection within flights, then checks teammate recency to avoid repeats
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
 * Shuffle an array in-place (Fisher-Yates)
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Check if placing a player on a team violates recency rules.
 * Returns true if there's a conflict:
 *   - Played with any teammate 2+ rounds in a row (consecutive)
 *   - Played with any teammate 3+ of the last 5 rounds
 */
function hasRecencyConflict(player, teamPlayerIds) {
  const history = player.teammateHistory || []
  if (history.length === 0) return false

  for (const teammateId of teamPlayerIds) {
    // Check consecutive rounds (last 2)
    let consecutive = 0
    for (let i = 0; i < Math.min(history.length, 2); i++) {
      if (history[i].teammates.includes(teammateId)) {
        consecutive++
      } else {
        break
      }
    }
    if (consecutive >= 2) return true

    // Check frequency in last 5 rounds
    let count = 0
    for (let i = 0; i < Math.min(history.length, 5); i++) {
      if (history[i].teammates.includes(teammateId)) count++
    }
    if (count >= 3) return true
  }

  return false
}

/**
 * Count recency violations for a player with a team (for scoring, not binary)
 */
function recencyScore(player, teamPlayerIds) {
  const history = player.teammateHistory || []
  if (history.length === 0) return 0

  let score = 0
  for (const teammateId of teamPlayerIds) {
    // Consecutive penalty (heavier)
    let consecutive = 0
    for (let i = 0; i < Math.min(history.length, 2); i++) {
      if (history[i].teammates.includes(teammateId)) consecutive++
      else break
    }
    if (consecutive >= 2) score += 10

    // Frequency penalty
    let count = 0
    for (let i = 0; i < Math.min(history.length, 5); i++) {
      if (history[i].teammates.includes(teammateId)) count++
    }
    if (count >= 3) score += 5
    else if (count >= 2) score += 1
  }
  return score
}

/**
 * Select best player from a shuffled flight pool for a specific team.
 * Picks first player with no recency conflict; falls back to lowest-conflict player.
 */
function selectFromFlight(flightPool, team) {
  if (flightPool.length === 0) return null
  if (flightPool.length === 1) return flightPool.shift()

  const teamIds = team.map(p => p.id)

  // Try to find a player with no recency conflict
  for (let i = 0; i < flightPool.length; i++) {
    if (!hasRecencyConflict(flightPool[i], teamIds)) {
      return flightPool.splice(i, 1)[0]
    }
  }

  // All have conflicts — pick the one with the least severe conflict
  let bestIdx = 0
  let bestScore = Infinity
  for (let i = 0; i < flightPool.length; i++) {
    const s = recencyScore(flightPool[i], teamIds)
    if (s < bestScore) {
      bestScore = s
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

/**
 * Post-fill swap: try to resolve recency conflicts by swapping same-flight players between teams.
 * Only swaps if the swap doesn't create a new conflict for the other team.
 */
function resolveConflictsViaSwap(finalTeams, sortedPlayers, numFlights, pairedPlayerIds) {
  let improved = true
  let iterations = 0
  const maxIterations = 50 // Safety limit

  while (improved && iterations < maxIterations) {
    improved = false
    iterations++

    for (let ti = 0; ti < finalTeams.length; ti++) {
      const team = finalTeams[ti]

      for (let pi = 0; pi < team.length; pi++) {
        const player = team[pi]
        // Skip paired/manual players — don't swap them
        if (pairedPlayerIds.has(player.id)) continue

        const teammateIds = team.filter((_, idx) => idx !== pi).map(p => p.id)
        if (!hasRecencyConflict(player, teammateIds)) continue

        // This player has a conflict — try swapping with same-flight player on another team
        const playerFlight = getPlayerFlightByHandicap(player, sortedPlayers, numFlights)

        let bestSwap = null
        let bestSwapScore = Infinity

        for (let tj = 0; tj < finalTeams.length; tj++) {
          if (tj === ti) continue
          const otherTeam = finalTeams[tj]

          for (let pj = 0; pj < otherTeam.length; pj++) {
            const candidate = otherTeam[pj]
            // Skip paired/manual players
            if (pairedPlayerIds.has(candidate.id)) continue
            // Must be same flight
            if (getPlayerFlightByHandicap(candidate, sortedPlayers, numFlights) !== playerFlight) continue

            // Check if swap would be acceptable for both teams
            const newTeamI = [...team.slice(0, pi), candidate, ...team.slice(pi + 1)]
            const newTeamJ = [...otherTeam.slice(0, pj), player, ...otherTeam.slice(pj + 1)]

            const newTeamIIds = newTeamI.filter(p => p.id !== candidate.id).map(p => p.id)
            const newTeamJIds = newTeamJ.filter(p => p.id !== player.id).map(p => p.id)

            // Don't create new conflicts for the candidate
            const candidateScore = recencyScore(candidate, newTeamIIds)
            const playerNewScore = recencyScore(player, newTeamJIds)
            const totalScore = candidateScore + playerNewScore

            if (totalScore < bestSwapScore) {
              bestSwapScore = totalScore
              bestSwap = { ti, pi, tj, pj }
            }
          }
        }

        // Execute the best swap if it improves things
        if (bestSwap) {
          const currentScore = recencyScore(player, teammateIds)
          if (bestSwapScore < currentScore) {
            const temp = finalTeams[bestSwap.ti][bestSwap.pi]
            finalTeams[bestSwap.ti][bestSwap.pi] = finalTeams[bestSwap.tj][bestSwap.pj]
            finalTeams[bestSwap.tj][bestSwap.pj] = temp
            improved = true
            break // Restart scan after a swap
          }
        }
      }
      if (improved) break // Restart outer loop
    }
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

  // Track paired/manual player IDs (exempt from recency swaps)
  const pairedPlayerIds = new Set(manualTeamPlayerIds)

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
  const numFlights = 4 // Always 4 flights for A-B-C-D system

  // === Phase 1: Process pairing requests (before team size calculation) ===
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
      pairedPlayerIds.add(p1.id)
      pairedPlayerIds.add(p2.id)
    }
  })

  // Separate same-flight pairs from different-flight pairs
  const sameFlightPairs = pairsWithFlightInfo.filter(p => p.isSameFlight)
  const diffFlightPairs = pairsWithFlightInfo.filter(p => !p.isSameFlight)

  // Try to combine complementary same-flight pairs into complete foursomes
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

  // Add combined pair teams (already complete foursomes)
  for (const ct of combinedTeams) {
    finalTeams.push(ct.players)
  }

  // Count uncombined pairing teams that need fill slots
  const uncombinedPairTeams = [...remainingSameFlightPairs, ...diffFlightPairs]
  const combinedPlayerCount = combinedTeams.reduce((sum, ct) => sum + ct.players.length, 0)

  // === Phase 2: Calculate team count ===
  // Include ALL players: remaining + incomplete manual members - combined pairs
  const totalPlayersForSizing = remainingPlayers.length +
    incompleteManualTeams.reduce((sum, mt) => sum + mt.players.length, 0) -
    combinedPlayerCount

  const numFoursomes = Math.floor(totalPlayersForSizing / 4)
  const remainder = totalPlayersForSizing % 4

  // Determine total team count from ideal distribution
  let totalTeamCount
  if (remainder === 0) {
    totalTeamCount = numFoursomes
  } else {
    // remainder 1, 2, or 3 all add one team (threesomes replace foursomes)
    totalTeamCount = numFoursomes + 1
  }

  // Ensure enough team slots for pairings + manual teams
  totalTeamCount = Math.max(totalTeamCount,
    uncombinedPairTeams.length + incompleteManualTeams.length)

  // New empty teams = total minus pairing and manual team slots
  const newEmptyTeamCount = Math.max(0,
    totalTeamCount - uncombinedPairTeams.length - incompleteManualTeams.length)

  // === Phase 3: Build team objects — ALL target base size 3 ===
  // Teams fill to 3 first, then extra players upgrade weakest teams to 4
  const teamsToFill = []

  // Add incomplete manual teams (base target 3)
  for (const mt of incompleteManualTeams) {
    teamsToFill.push({
      players: [...mt.players],
      targetSize: 3,
      isManual: true
    })
  }

  // Add remaining same-flight pairs (base target 3, need 1 mirror fill)
  for (const pair of remainingSameFlightPairs) {
    teamsToFill.push({
      players: [...pair.players],
      targetSize: 3,
      needsMirror: pair.mirrorFlight,
      mirrorCount: 1
    })
  }

  // Add different-flight pairs (base target 3)
  for (const pair of diffFlightPairs) {
    teamsToFill.push({
      players: [...pair.players],
      targetSize: 3,
      filledFlights: pair.flights
    })
  }

  // Add new empty teams (base target 3)
  for (let i = 0; i < newEmptyTeamCount; i++) {
    teamsToFill.push({
      players: [],
      targetSize: 3
    })
  }

  // Get unpaired players for flight pools
  const unpairedPlayers = sortedPlayers.filter(p => !paired.has(p.id))

  // Create flight pools — SHUFFLED for randomization within each flight
  const flightPools = []
  if (unpairedPlayers.length > 0) {
    const baseFlightSize = Math.floor(unpairedPlayers.length / numFlights)
    const extraPlayers = unpairedPlayers.length % numFlights

    let playerIdx = 0
    for (let f = 0; f < numFlights; f++) {
      const flightSize = baseFlightSize + (f < extraPlayers ? 1 : 0)
      const pool = unpairedPlayers.slice(playerIdx, playerIdx + flightSize)
      shuffle(pool) // Randomize within each flight
      flightPools.push(pool)
      playerIdx += flightSize
    }
  } else {
    for (let f = 0; f < numFlights; f++) {
      flightPools.push([])
    }
  }

  // Fill teams to base size 3: mirror needs first, then manual, then rest
  teamsToFill.sort((a, b) => {
    if (a.needsMirror !== undefined && b.needsMirror === undefined) return -1
    if (a.needsMirror === undefined && b.needsMirror !== undefined) return 1
    if (a.isManual && !b.isManual) return -1
    if (!a.isManual && b.isManual) return 1
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

  // === Phase 5: Upgrade weakest teams from 3 to 4 ===
  // Remaining players in flight pools are the "upgrade" pool
  const upgradePool = flightPools.flat()

  // Distribute upgrades to the weakest teams (highest total handicap)
  for (const player of upgradePool) {
    let weakestIdx = -1
    let weakestHandicap = -Infinity
    for (let i = 0; i < finalTeams.length; i++) {
      if (finalTeams[i].length < 4) {
        const teamHandicap = finalTeams[i].reduce((sum, p) => sum + getPlayerHandicap(p), 0)
        if (teamHandicap > weakestHandicap) {
          weakestHandicap = teamHandicap
          weakestIdx = i
        }
      }
    }
    if (weakestIdx >= 0) {
      finalTeams[weakestIdx].push(player)
    } else {
      finalTeams.push([player])
    }
  }

  // Safety net: redistribute any undersized (<3) generated teams
  let needsRecheck = true
  while (needsRecheck) {
    needsRecheck = false
    for (let i = finalTeams.length - 1; i >= 0; i--) {
      if (finalTeams[i].length < 3) {
        const playersToRedistribute = finalTeams.splice(i, 1)[0]
        for (const player of playersToRedistribute) {
          let bestIdx = -1
          let bestSize = Infinity
          for (let j = 0; j < finalTeams.length; j++) {
            if (finalTeams[j].length < bestSize) {
              bestSize = finalTeams[j].length
              bestIdx = j
            }
          }
          if (bestIdx >= 0) finalTeams[bestIdx].push(player)
        }
        needsRecheck = true
        break
      }
    }
  }

  // === Phase 6: Post-fill recency conflict resolution via same-flight swaps ===
  resolveConflictsViaSwap(finalTeams, sortedPlayers, numFlights, pairedPlayerIds)

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
