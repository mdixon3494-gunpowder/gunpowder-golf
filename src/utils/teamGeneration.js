/**
 * Team Generation Algorithm
 * Creates balanced teams based on handicap (preferred) or skill ratings (fallback)
 */

/**
 * Get the rating value to use for team balancing
 * Prioritizes handicap (inverted since lower handicap = better player)
 * Falls back to skillRating for backwards compatibility
 */
function getPlayerRating(player) {
  // If player has an effectiveHandicap (set during generation), use it
  if (player.effectiveHandicap !== undefined && player.effectiveHandicap !== null) {
    // Invert handicap: lower handicap = higher skill, so we subtract from a base
    // Use 36 as base (max typical handicap) so a 0 handicap = 36, 36 handicap = 0
    return Math.max(0, 36 - player.effectiveHandicap)
  }
  // If player has a handicap set, use it (inverted)
  if (player.handicap !== undefined && player.handicap !== null) {
    return Math.max(0, 36 - player.handicap)
  }
  // Fallback to skillRating (1-10 scale)
  return player.skillRating || 5
}

export function generateTeams(activePlayers, pairingRequests = [], manualTeams = []) {
  // Start with manual teams
  const finalTeams = manualTeams.map(mt => [...mt.players])

  // Get IDs of players already in manual teams
  const manualTeamPlayerIds = new Set(
    manualTeams.flatMap(team => team.players.map(p => p.id))
  )

  // Filter out players in manual teams
  const remainingPlayers = activePlayers.filter(p => !manualTeamPlayerIds.has(p.id))

  // Handle pairing requests
  const paired = new Set()
  const mustBeTogether = []

  pairingRequests.forEach(request => {
    const p1 = remainingPlayers.find(p => p.id === parseInt(request.player1))
    const p2 = remainingPlayers.find(p => p.id === parseInt(request.player2))

    if (p1 && p2) {
      mustBeTogether.push([p1, p2])
      paired.add(p1.id)
      paired.add(p2.id)
    }
  })

  // Get unpaired players and sort by rating (highest first)
  const unpairedPlayers = remainingPlayers.filter(p => !paired.has(p.id))
  unpairedPlayers.sort((a, b) => getPlayerRating(b) - getPlayerRating(a))

  // Smart auto-fill: Fill 3-person manual teams to 4 if it creates better balance
  const threePersonManualTeams = finalTeams.filter(team => team.length === 3)

  if (threePersonManualTeams.length > 0 && unpairedPlayers.length > 0) {
    const afterFillRemainder = (unpairedPlayers.length - 1) % 4

    if (afterFillRemainder === 0) {
      let bestTeam = null
      let bestPlayerIdx = -1
      let bestVariance = Infinity

      for (const team of threePersonManualTeams) {
        const teamSkill = team.reduce((sum, p) => sum + getPlayerRating(p), 0)

        for (let i = 0; i < unpairedPlayers.length; i++) {
          const player = unpairedPlayers[i]
          const newTeamSkill = teamSkill + getPlayerRating(player)

          const allTeamSkills = finalTeams.map(t => {
            if (t === team) return newTeamSkill
            return t.reduce((sum, p) => sum + getPlayerRating(p), 0)
          })

          const remainingAfter = unpairedPlayers.length - 1
          const numNewTeams = remainingAfter / 4
          for (let j = 0; j < numNewTeams; j++) {
            allTeamSkills.push(20) // Approximate
          }

          const avg = allTeamSkills.reduce((a, b) => a + b, 0) / allTeamSkills.length
          const variance = allTeamSkills.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0)

          if (variance < bestVariance) {
            bestVariance = variance
            bestTeam = team
            bestPlayerIdx = i
          }
        }
      }

      if (bestTeam && bestPlayerIdx >= 0) {
        bestTeam.push(unpairedPlayers[bestPlayerIdx])
        unpairedPlayers.splice(bestPlayerIdx, 1)
      }
    }
  }

  // Calculate team sizes
  const numRemainingPlayers = unpairedPlayers.length + paired.size
  const numFoursomes = Math.floor(numRemainingPlayers / 4)
  const remainder = numRemainingPlayers % 4

  let newTeamSizes = []
  if (remainder === 0) {
    newTeamSizes = new Array(numFoursomes).fill(4)
  } else if (remainder === 3) {
    newTeamSizes = new Array(numFoursomes).fill(4).concat([3])
  } else if (remainder === 2) {
    newTeamSizes = new Array(numFoursomes - 1).fill(4).concat([3, 3])
  } else if (remainder === 1) {
    newTeamSizes = new Array(numFoursomes - 2).fill(4).concat([3, 3, 3])
  }

  const newTeams = newTeamSizes.map(() => [])

  // Place paired players first
  mustBeTogether.sort((a, b) => {
    const skillA = a.reduce((sum, p) => sum + getPlayerRating(p), 0)
    const skillB = b.reduce((sum, p) => sum + getPlayerRating(p), 0)
    return skillB - skillA
  })

  mustBeTogether.forEach(pair => {
    let lowestSkillTeamIdx = 0
    let lowestSkill = newTeams[0].reduce((sum, p) => sum + getPlayerRating(p), 0)

    for (let i = 1; i < newTeams.length; i++) {
      const teamSkill = newTeams[i].reduce((sum, p) => sum + getPlayerRating(p), 0)
      if (teamSkill < lowestSkill) {
        lowestSkill = teamSkill
        lowestSkillTeamIdx = i
      }
    }

    newTeams[lowestSkillTeamIdx].push(...pair)
  })

  // Skill-aware draft for remaining players
  for (const player of unpairedPlayers) {
    let bestTeamIdx = -1
    let bestScore = -Infinity

    for (let i = 0; i < newTeams.length; i++) {
      if (newTeams[i].length < newTeamSizes[i]) {
        const teamSkill = newTeams[i].reduce((sum, p) => sum + getPlayerRating(p), 0)

        const recentTeammateCount = newTeams[i].filter(p =>
          player.recentTeammates && player.recentTeammates.includes(p.id)
        ).length

        const skillScore = -teamSkill
        const varietyScore = -recentTeammateCount * 5
        const totalScore = skillScore + varietyScore

        if (totalScore > bestScore) {
          bestScore = totalScore
          bestTeamIdx = i
        }
      }
    }

    if (bestTeamIdx !== -1) {
      newTeams[bestTeamIdx].push(player)
    }
  }

  // Combine all teams
  const allTeams = [...finalTeams, ...newTeams]

  // Sort teams: 4-person teams first, then 3-person teams
  allTeams.sort((a, b) => b.length - a.length)

  return allTeams
}

export function getTeamName(team) {
  if (!team || team.length === 0) return 'Empty Team'
  if (team.length === 1) return team[0].name

  // Get first name or initial of each player
  const names = team.map(p => {
    const parts = p.name.split(' ')
    return parts[0] // First name
  })

  return names.join(' / ')
}

export function calculateTeamSkill(team) {
  if (!team || team.length === 0) return 0
  return team.reduce((sum, p) => sum + getPlayerRating(p), 0)
}

export function calculateTeamBalance(teams) {
  if (!teams || teams.length < 2) return { variance: 0, range: 0 }

  const skills = teams.map(t => calculateTeamSkill(t))
  const avg = skills.reduce((a, b) => a + b, 0) / skills.length
  const variance = skills.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / skills.length
  const range = Math.max(...skills) - Math.min(...skills)

  return { variance, range, avg }
}
