import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../context/LeagueContext'
import { GUNPOWDER_SCORECARD, getHoleInfo, PAR_3_HOLES, getAllHoles } from '../lib/courseData'
import { calculateRoundSettlement, formatMoney } from '../utils/moneyCalculations'

// Calculate team score for a 9-hole range
function calculateTeamScore(team, startHole, endHole) {
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

function formatRelativeToPar(score) {
  if (score === 0) return 'E'
  if (score > 0) return `+${score}`
  return score.toString()
}

// Leaderboard Component
function Leaderboard({ liveRound, view, setView }) {

  // Calculate holes completed for a team (based on all active players having a score)
  const getHolesCompleted = (team) => {
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

  const teamsWithScores = liveRound.teams.map(team => {
    const front9 = calculateTeamScore(team, 1, 9)
    const back9 = calculateTeamScore(team, 10, 18)
    const total = front9 + back9
    const holesCompleted = getHolesCompleted(team)

    return { ...team, front9, back9, total, holesCompleted }
  }).sort((a, b) => {
    if (view === 'front') return a.front9 - b.front9
    if (view === 'back') return a.back9 - b.back9
    return a.total - b.total
  })

  return (
    <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%)',
        color: 'white',
        padding: '12px 15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{
          fontSize: '18px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          Leaderboard
        </span>
        <select
          value={view}
          onChange={(e) => setView(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '6px',
            border: 'none',
            background: 'white',
            color: '#1a472a',
            cursor: 'pointer',
            minWidth: '120px'
          }}
        >
          <option value="front">Front 9</option>
          <option value="back">Back 9</option>
          <option value="overall">Total</option>
        </select>
      </div>

      <div style={{ padding: '10px' }}>
        {teamsWithScores.map((team, idx) => {
          const displayScore = view === 'front' ? team.front9 : view === 'back' ? team.back9 : team.total
          return (
            <div key={team.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: idx === 0 ? '#fff8e1' : (idx % 2 === 0 ? '#f8f9fa' : 'white'),
              borderRadius: '8px',
              marginBottom: '8px',
              border: idx === 0 ? '2px solid #f9a825' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: idx === 0 ? '#f9a825' : '#95a5a6',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  {idx + 1}
                </span>
                <div>
                  <div style={{ fontWeight: '600' }}>{team.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {team.holesCompleted === 18 ? (
                      <span style={{ color: '#27ae60', fontWeight: '600' }}>F</span>
                    ) : team.holesCompleted > 0 ? (
                      <span>thru {team.holesCompleted}</span>
                    ) : (
                      <span>--</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: displayScore < 0 ? '#27ae60' : displayScore > 0 ? '#e74c3c' : '#333'
              }}>
                {formatRelativeToPar(displayScore)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Score Keypad Modal
function ScoreKeypad({ playerName, hole, value, onKeyPress, onClose, onDone, onPrevHole, onNextHole, onClear }) {
  const holeInfo = getHoleInfo(hole)

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '15px',
        width: '90%',
        maxWidth: '320px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      }}>
        {/* Header with hole navigation */}
        <div style={{
          marginBottom: '15px',
          paddingBottom: '10px',
          borderBottom: '2px solid #e0e0e0'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#27ae60', textAlign: 'center' }}>
            {playerName}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px',
            marginTop: '8px'
          }}>
            <button
              onClick={onPrevHole}
              disabled={hole <= 1}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                background: hole > 1 ? 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' : '#e0e0e0',
                color: hole > 1 ? 'white' : '#999',
                fontSize: '20px',
                fontWeight: 'bold',
                cursor: hole > 1 ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ←
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                Hole {hole}
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                Par {holeInfo?.par}
              </div>
            </div>
            <button
              onClick={onNextHole}
              disabled={hole >= 18}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                background: hole < 18 ? 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' : '#e0e0e0',
                color: hole < 18 ? 'white' : '#999',
                fontSize: '20px',
                fontWeight: 'bold',
                cursor: hole < 18 ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              →
            </button>
          </div>
        </div>

        {/* Display */}
        <div style={{
          background: '#f8f9fa',
          padding: '15px',
          borderRadius: '10px',
          textAlign: 'center',
          fontSize: '42px',
          fontWeight: 'bold',
          marginBottom: '15px',
          minHeight: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #e0e0e0'
        }}>
          {value || '-'}
        </div>

        {/* Keypad */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '15px'
        }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => onKeyPress(num.toString())}
              style={{
                padding: '18px',
                fontSize: '24px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                border: '2px solid #dee2e6',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => onKeyPress('X')}
            style={{
              padding: '18px',
              fontSize: '24px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            X
          </button>
          <button
            onClick={() => onKeyPress('0')}
            style={{
              padding: '18px',
              fontSize: '24px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              border: '2px solid #dee2e6',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            0
          </button>
          <button
            onClick={() => onKeyPress('backspace')}
            style={{
              padding: '18px',
              fontSize: '20px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              border: '2px solid #dee2e6',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            ⌫
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#f8f9fa',
              border: '2px solid #dee2e6',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onClear}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
          <button
            onClick={onDone}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// Score Entry Component - Legacy Style
function ScoringGrid({ liveRound, onUpdateScore, selectedTeamId, setSelectedTeamId, players, onMarkTeamFinished, onUpdateGreenie }) {
  const [activeInput, setActiveInput] = useState(null)
  const [keypadValue, setKeypadValue] = useState('')
  const [isFirstKeypress, setIsFirstKeypress] = useState(true)
  const [trackedPlayers, setTrackedPlayers] = useState({}) // { [teamId]: Set of player IDs being tracked }
  const [showPlayerSelector, setShowPlayerSelector] = useState(false)
  const [greeniePrompt, setGreeniePrompt] = useState(null) // { hole: number, isLastTeam: boolean } when showing prompt
  const [markGreenieAsFinal, setMarkGreenieAsFinal] = useState(true) // Default to checked when last team

  const selectedTeam = selectedTeamId !== null
    ? liveRound.teams.find(t => t.id === selectedTeamId)
    : null

  // Get tracked player IDs for current team (default to all players if not set)
  const getTrackedPlayerIds = (teamId) => {
    if (trackedPlayers[teamId]) {
      return trackedPlayers[teamId]
    }
    // Default: track all active players
    const team = liveRound.teams.find(t => t.id === teamId)
    if (team) {
      return new Set(team.players.filter(p => !p.isDNF).map(p => p.id))
    }
    return new Set()
  }

  const toggleTrackedPlayer = (playerId) => {
    const teamId = selectedTeam.id
    const current = getTrackedPlayerIds(teamId)
    const updated = new Set(current)
    if (updated.has(playerId)) {
      updated.delete(playerId)
    } else {
      updated.add(playerId)
    }
    setTrackedPlayers({ ...trackedPlayers, [teamId]: updated })
  }

  const selectAllPlayers = () => {
    const teamId = selectedTeam.id
    const allIds = new Set(selectedTeam.players.filter(p => !p.isDNF).map(p => p.id))
    setTrackedPlayers({ ...trackedPlayers, [teamId]: allIds })
  }

  const selectNoPlayers = () => {
    const teamId = selectedTeam.id
    setTrackedPlayers({ ...trackedPlayers, [teamId]: new Set() })
  }

  const isPlayerTracked = (playerId) => {
    if (!selectedTeam) return false
    return getTrackedPlayerIds(selectedTeam.id).has(playerId)
  }

  // Calculate max score for a player
  const getMaxScore = (player, par) => {
    const fullPlayer = players?.find(p => p.id === player.id)
    if (fullPlayer?.avgTotal && fullPlayer.avgTotal > 0) {
      return fullPlayer.avgTotal <= 82 ? par + 2 : par + 3
    }
    const skill = player.skillRating || 5
    return skill >= 7 ? par + 2 : par + 3
  }

  // Find next score needed for a team (only for tracked players)
  const findNextScoreNeeded = (team) => {
    const trackedIds = getTrackedPlayerIds(team.id)
    const activePlayers = team.players.filter(p => !p.isDNF && trackedIds.has(p.id))
    for (let hole = 1; hole <= 18; hole++) {
      for (const player of activePlayers) {
        const score = player.scores[hole]
        if (score === undefined || score === null || score === '') {
          return { hole, player }
        }
      }
    }
    return null
  }

  // Calculate team score for a range of holes
  const calculateTeamTotal = (team, startHole, endHole) => {
    let total = 0
    for (let h = startHole; h <= endHole; h++) {
      const holeInfo = getHoleInfo(h)
      const par = holeInfo?.par || 4
      const playerScores = team.players
        .filter(p => !p.isDNF && p.includeInTeamScore !== false)
        .map(p => p.scores[h])
        .filter(s => s !== undefined && s !== null && s !== '' && s !== 'X')
        .map(s => parseInt(s))
        .filter(s => !isNaN(s))

      if (playerScores.length > 0) {
        const underPar = playerScores.filter(s => s < par)
        if (underPar.length > 0) {
          total += underPar.reduce((sum, s) => sum + (s - par), 0)
        } else {
          total += Math.min(...playerScores) - par
        }
      }
    }
    return total
  }

  const openKeypad = (teamId, playerId, hole, currentValue, playerName) => {
    setActiveInput({ teamId, playerId, hole, playerName })
    setKeypadValue(currentValue?.toString() || '')
    setIsFirstKeypress(true)
  }

  const handleKeypadPress = (key) => {
    if (key === 'backspace') {
      setKeypadValue(prev => prev.slice(0, -1))
      setIsFirstKeypress(false)
    } else if (key === 'X') {
      setKeypadValue('X')
      setIsFirstKeypress(false)
    } else {
      // On first keypress, replace the existing value instead of appending
      if (isFirstKeypress && keypadValue !== '') {
        setKeypadValue(key)
        setIsFirstKeypress(false)
      } else if (keypadValue === 'X') {
        setKeypadValue(key)
        setIsFirstKeypress(false)
      } else if (keypadValue.length < 2) {
        setKeypadValue(prev => prev + key)
        setIsFirstKeypress(false)
      }
    }
  }

  const handleKeypadDone = () => {
    if (activeInput && keypadValue) {
      const scoreValue = keypadValue === 'X' ? 'X' : parseInt(keypadValue)
      onUpdateScore(activeInput.teamId, activeInput.playerId, activeInput.hole, scoreValue)

      // Check if this is a par 3 hole - prompt for greenie
      const isPar3Hole = PAR_3_HOLES.includes(activeInput.hole)

      // Auto-advance to next TRACKED player on same team needing a score for this hole
      const team = liveRound.teams.find(t => t.id === activeInput.teamId)
      const trackedIds = getTrackedPlayerIds(activeInput.teamId)
      if (team) {
        const currentPlayerIndex = team.players.findIndex(p => p.id === activeInput.playerId)
        for (let i = 1; i < team.players.length; i++) {
          const nextIndex = (currentPlayerIndex + i) % team.players.length
          const nextPlayer = team.players[nextIndex]
          // Skip if DNF or not being tracked
          if (nextPlayer.isDNF || !trackedIds.has(nextPlayer.id)) continue
          const nextScore = nextPlayer.scores[activeInput.hole]
          if (nextScore === undefined || nextScore === null || nextScore === '') {
            setTimeout(() => {
              setActiveInput({
                teamId: activeInput.teamId,
                playerId: nextPlayer.id,
                hole: activeInput.hole,
                playerName: nextPlayer.name
              })
              setKeypadValue('')
              setIsFirstKeypress(true)
            }, 100)
            return
          }
        }

        // All tracked players have scores for this hole - show greenie prompt if par 3
        if (isPar3Hole && onUpdateGreenie) {
          // Check if greenie already set for this hole (across all teams)
          const existingGreenie = liveRound.teams.some(t => t.greenies?.[activeInput.hole])
          if (!existingGreenie) {
            // Check if this is the last team to finish this hole
            const otherTeamsFinishedHole = liveRound.teams
              .filter(t => t.id !== activeInput.teamId)
              .every(t => {
                const activePlayers = t.players.filter(p => !p.isDNF)
                return activePlayers.every(p => {
                  const score = p.scores[activeInput.hole]
                  return score !== undefined && score !== null && score !== ''
                })
              })
            setMarkGreenieAsFinal(otherTeamsFinishedHole) // Default to checked if last team
            setGreeniePrompt({ hole: activeInput.hole, isLastTeam: otherTeamsFinishedHole })
          }
        }
      }
    }
    setActiveInput(null)
    setKeypadValue('')
  }

  const closeKeypad = () => {
    setActiveInput(null)
    setKeypadValue('')
  }

  const handleClearScore = () => {
    if (activeInput) {
      onUpdateScore(activeInput.teamId, activeInput.playerId, activeInput.hole, null)
      setActiveInput(null)
      setKeypadValue('')
    }
  }

  // Navigate to previous hole for same player (saves current score first)
  const goToPrevHole = () => {
    if (!activeInput || activeInput.hole <= 1) return

    // Save current score if there is one
    if (keypadValue) {
      const scoreValue = keypadValue === 'X' ? 'X' : parseInt(keypadValue)
      onUpdateScore(activeInput.teamId, activeInput.playerId, activeInput.hole, scoreValue)
    }

    // Get current score for previous hole
    const team = liveRound.teams.find(t => t.id === activeInput.teamId)
    const player = team?.players.find(p => p.id === activeInput.playerId)
    const prevHole = activeInput.hole - 1
    const prevScore = player?.scores?.[prevHole]

    setActiveInput({ ...activeInput, hole: prevHole })
    setKeypadValue(prevScore?.toString() || '')
    setIsFirstKeypress(true)
  }

  // Navigate to next hole for same player (saves current score first)
  const goToNextHole = () => {
    if (!activeInput || activeInput.hole >= 18) return

    // Save current score if there is one
    if (keypadValue) {
      const scoreValue = keypadValue === 'X' ? 'X' : parseInt(keypadValue)
      onUpdateScore(activeInput.teamId, activeInput.playerId, activeInput.hole, scoreValue)
    }

    // Get current score for next hole
    const team = liveRound.teams.find(t => t.id === activeInput.teamId)
    const player = team?.players.find(p => p.id === activeInput.playerId)
    const nextHole = activeInput.hole + 1
    const nextScore = player?.scores?.[nextHole]

    setActiveInput({ ...activeInput, hole: nextHole })
    setKeypadValue(nextScore?.toString() || '')
    setIsFirstKeypress(true)
  }

  // Team selection view
  if (!selectedTeam) {
    return (
      <div>
        <h3 style={{ marginBottom: '15px' }}>Select Team to Score</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {liveRound.teams.map(t => {
            const nextNeeded = findNextScoreNeeded(t)
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTeamId(t.id)}
                style={{
                  padding: '15px',
                  background: t.isFinished ? '#d4edda' : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                  color: t.isFinished ? '#155724' : 'white',
                  border: t.isFinished ? '2px solid #27ae60' : 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  textAlign: 'left'
                }}
              >
                {t.isFinished ? '✓ ' : ''}{t.name}
                <div style={{ fontSize: '12px', fontWeight: 'normal', marginTop: '3px', opacity: 0.9 }}>
                  {t.players.map(p => p.name).join(', ')}
                </div>
                {nextNeeded && (
                  <div style={{ fontSize: '11px', marginTop: '5px', opacity: 0.8 }}>
                    Next: {nextNeeded.player.name} - Hole {nextNeeded.hole}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Scoring view for selected team
  const nextNeeded = findNextScoreNeeded(selectedTeam)
  const frontTotal = calculateTeamTotal(selectedTeam, 1, 9)
  const backTotal = calculateTeamTotal(selectedTeam, 10, 18)

  return (
    <div>
      {/* Team Header */}
      <div style={{
        background: selectedTeam.isFinished ? '#d4edda' : 'linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%)',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '15px',
        color: selectedTeam.isFinished ? '#155724' : 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', opacity: 0.9 }}>Team:</span>
            <select
              value={selectedTeam.id}
              onChange={(e) => setSelectedTeamId(parseInt(e.target.value))}
              style={{
                padding: '8px 12px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '6px',
                border: 'none',
                background: 'white',
                color: '#1a472a',
                cursor: 'pointer',
                minWidth: '150px'
              }}
            >
              {liveRound.teams.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isFinished ? '✓' : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedTeam.isFinished && <span style={{ fontSize: '14px', fontWeight: '600' }}>✓ Done</span>}
        </div>

        {/* Team Score Summary */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '30px',
          marginTop: '15px',
          padding: '10px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '8px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>FRONT</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {frontTotal === 0 ? 'E' : (frontTotal > 0 ? '+' : '') + frontTotal}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>BACK</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {backTotal === 0 ? 'E' : (backTotal > 0 ? '+' : '') + backTotal}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>TOTAL</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {(frontTotal + backTotal) === 0 ? 'E' : ((frontTotal + backTotal) > 0 ? '+' : '') + (frontTotal + backTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Player Tracking Selector */}
      <div style={{
        background: 'white',
        borderRadius: '10px',
        marginBottom: '15px',
        border: '1px solid #e0e0e0',
        overflow: 'hidden'
      }}>
        <button
          onClick={() => setShowPlayerSelector(!showPlayerSelector)}
          style={{
            width: '100%',
            padding: '10px 15px',
            background: '#f8f9fa',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px'
          }}
        >
          <span style={{ fontWeight: '600', color: '#555' }}>
            Keeping Score For: {getTrackedPlayerIds(selectedTeam.id).size} of {selectedTeam.players.filter(p => !p.isDNF).length} players
          </span>
          <span style={{ color: '#999' }}>{showPlayerSelector ? '▲' : '▼'}</span>
        </button>

        {showPlayerSelector && (
          <div style={{ padding: '12px', borderTop: '1px solid #e0e0e0' }}>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Select which players you're keeping score for. Auto-advance will only go to selected players.
              You can still tap any cell to enter scores for anyone.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <button
                onClick={selectAllPlayers}
                style={{
                  padding: '6px 12px',
                  background: '#e3f2fd',
                  border: '1px solid #2196f3',
                  borderRadius: '4px',
                  color: '#1976d2',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Select All
              </button>
              <button
                onClick={selectNoPlayers}
                style={{
                  padding: '6px 12px',
                  background: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  color: '#666',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Select None
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedTeam.players.filter(p => !p.isDNF).map(player => {
                const isTracked = isPlayerTracked(player.id)
                return (
                  <button
                    key={player.id}
                    onClick={() => toggleTrackedPlayer(player.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      border: isTracked ? '2px solid #27ae60' : '2px solid #ddd',
                      background: isTracked ? '#e8f5e9' : 'white',
                      color: isTracked ? '#27ae60' : '#666',
                      fontSize: '13px',
                      fontWeight: isTracked ? '600' : 'normal',
                      cursor: 'pointer'
                    }}
                  >
                    {isTracked ? '✓ ' : ''}{player.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Enter Next Score Button */}
      {nextNeeded && (
        <button
          onClick={() => openKeypad(selectedTeam.id, nextNeeded.player.id, nextNeeded.hole, '', nextNeeded.player.name)}
          style={{
            width: '100%',
            padding: '18px',
            background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '15px',
            boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)'
          }}
        >
          Enter Score: {nextNeeded.player.name} - Hole {nextNeeded.hole}
        </button>
      )}

      {!nextNeeded && !selectedTeam.isFinished && (
        <div style={{
          padding: '15px',
          background: '#d4edda',
          borderRadius: '10px',
          textAlign: 'center',
          marginBottom: '15px',
          color: '#155724'
        }}>
          All scores entered! Tap any cell below to edit.
        </div>
      )}

      {/* Scorecard Grid */}
      <div style={{
        background: 'white',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid #e0e0e0'
      }}>
        {/* Front 9 */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', minWidth: '340px' }}>
            <thead>
              <tr style={{ background: '#27ae60', color: 'white' }}>
                <th style={{ padding: '6px 4px', textAlign: 'left', minWidth: '60px', position: 'sticky', left: 0, background: '#27ae60' }}>Front 9</th>
                {GUNPOWDER_SCORECARD.front9.map(h => (
                  <th key={h.hole} style={{ padding: '6px 3px', textAlign: 'center', minWidth: '26px' }}>{h.hole}</th>
                ))}
                <th style={{ padding: '6px 4px', textAlign: 'center', background: '#229954', minWidth: '32px' }}>OUT</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#f0f0f0' }}>
                <td style={{ padding: '5px 4px', fontWeight: 'bold', fontSize: '10px', position: 'sticky', left: 0, background: '#f0f0f0' }}>Par</td>
                {GUNPOWDER_SCORECARD.front9.map(h => (
                  <td key={h.hole} style={{ padding: '5px 3px', textAlign: 'center', fontSize: '10px' }}>{h.par}</td>
                ))}
                <td style={{ padding: '5px 4px', textAlign: 'center', fontWeight: 'bold', fontSize: '10px' }}>
                  {GUNPOWDER_SCORECARD.front9.reduce((s, h) => s + h.par, 0)}
                </td>
              </tr>
              {selectedTeam.players.map((player, idx) => {
                const isDNF = player.isDNF === true
                let frontTotal = 0
                GUNPOWDER_SCORECARD.front9.forEach(h => {
                  const score = player.scores[h.hole]
                  if (score && score !== 'X') frontTotal += parseInt(score) || 0
                  else if (score === 'X') frontTotal += getMaxScore(player, h.par)
                })

                return (
                  <tr key={player.id} style={{
                    background: isDNF ? '#f8d7da' : (idx % 2 === 0 ? 'white' : '#fafafa'),
                    borderTop: '1px solid #e0e0e0'
                  }}>
                    <td style={{
                      padding: '4px',
                      fontWeight: 'bold',
                      fontSize: '10px',
                      position: 'sticky',
                      left: 0,
                      background: isDNF ? '#f8d7da' : (idx % 2 === 0 ? 'white' : '#fafafa'),
                      whiteSpace: 'nowrap',
                      maxWidth: '60px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {player.name.split(' ')[0]}{isDNF ? ' ❌' : ''}
                    </td>
                    {GUNPOWDER_SCORECARD.front9.map(hole => {
                      const score = player.scores[hole.hole]
                      const hasScore = score !== undefined && score !== null && score !== ''
                      const numScore = parseInt(score)
                      const maxScore = getMaxScore(player, hole.par)
                      const isCapped = hasScore && !isNaN(numScore) && numScore > maxScore
                      const effectiveScore = hasScore && score !== 'X' ? Math.min(numScore, maxScore) : null
                      const scoreToPar = effectiveScore !== null ? effectiveScore - hole.par : null

                      let bgColor = 'transparent'
                      let border = 'none'
                      let borderRadius = '0'

                      if (hasScore && score !== 'X') {
                        if (scoreToPar !== null && scoreToPar <= -2) {
                          bgColor = '#fff8e1'
                          border = '2px double #f39c12'
                          borderRadius = '50%'
                        } else if (scoreToPar === -1) {
                          bgColor = '#e8f5e9'
                          border = '2px solid #27ae60'
                          borderRadius = '50%'
                        }
                      }

                      let displayText = '-'
                      let isXorCapped = false
                      if (hasScore) {
                        if (score === 'X') {
                          displayText = `${maxScore}/X`
                          isXorCapped = true
                        } else if (isCapped) {
                          displayText = `${effectiveScore}/${score}`
                          isXorCapped = true
                        } else {
                          displayText = score
                        }
                      }

                      return (
                        <td
                          key={hole.hole}
                          onClick={() => !isDNF && openKeypad(selectedTeam.id, player.id, hole.hole, score, player.name)}
                          style={{
                            padding: '2px',
                            textAlign: 'center',
                            cursor: isDNF ? 'default' : 'pointer',
                            opacity: isDNF ? 0.5 : 1
                          }}
                        >
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '22px',
                            height: '22px',
                            background: bgColor,
                            border: border,
                            borderRadius: borderRadius,
                            fontWeight: 'bold',
                            fontSize: isXorCapped ? '8px' : '12px',
                            color: isXorCapped ? '#e74c3c' : '#333'
                          }}>
                            {displayText}
                          </div>
                        </td>
                      )
                    })}
                    <td style={{ padding: '4px 3px', textAlign: 'center', fontWeight: 'bold', background: '#e8f5e9', fontSize: '12px' }}>
                      {frontTotal || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Back 9 */}
        <div style={{ overflowX: 'auto', borderTop: '2px solid #34495e' }}>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', minWidth: '340px' }}>
            <thead>
              <tr style={{ background: '#ef6c00', color: 'white' }}>
                <th style={{ padding: '6px 4px', textAlign: 'left', minWidth: '60px', position: 'sticky', left: 0, background: '#ef6c00' }}>Back 9</th>
                {GUNPOWDER_SCORECARD.back9.map(h => (
                  <th key={h.hole} style={{ padding: '6px 3px', textAlign: 'center', minWidth: '26px' }}>{h.hole}</th>
                ))}
                <th style={{ padding: '6px 4px', textAlign: 'center', background: '#e65100', minWidth: '32px' }}>IN</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#f0f0f0' }}>
                <td style={{ padding: '5px 4px', fontWeight: 'bold', fontSize: '10px', position: 'sticky', left: 0, background: '#f0f0f0' }}>Par</td>
                {GUNPOWDER_SCORECARD.back9.map(h => (
                  <td key={h.hole} style={{ padding: '5px 3px', textAlign: 'center', fontSize: '10px' }}>{h.par}</td>
                ))}
                <td style={{ padding: '5px 4px', textAlign: 'center', fontWeight: 'bold', fontSize: '10px' }}>
                  {GUNPOWDER_SCORECARD.back9.reduce((s, h) => s + h.par, 0)}
                </td>
              </tr>
              {selectedTeam.players.map((player, idx) => {
                const isDNF = player.isDNF === true
                let backTotal = 0
                GUNPOWDER_SCORECARD.back9.forEach(h => {
                  const score = player.scores[h.hole]
                  if (score && score !== 'X') backTotal += parseInt(score) || 0
                  else if (score === 'X') backTotal += getMaxScore(player, h.par)
                })

                return (
                  <tr key={player.id} style={{
                    background: isDNF ? '#f8d7da' : (idx % 2 === 0 ? 'white' : '#fafafa'),
                    borderTop: '1px solid #e0e0e0'
                  }}>
                    <td style={{
                      padding: '4px',
                      fontWeight: 'bold',
                      fontSize: '10px',
                      position: 'sticky',
                      left: 0,
                      background: isDNF ? '#f8d7da' : (idx % 2 === 0 ? 'white' : '#fafafa'),
                      whiteSpace: 'nowrap',
                      maxWidth: '60px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {player.name.split(' ')[0]}{isDNF ? ' ❌' : ''}
                    </td>
                    {GUNPOWDER_SCORECARD.back9.map(hole => {
                      const score = player.scores[hole.hole]
                      const hasScore = score !== undefined && score !== null && score !== ''
                      const numScore = parseInt(score)
                      const maxScore = getMaxScore(player, hole.par)
                      const isCapped = hasScore && !isNaN(numScore) && numScore > maxScore
                      const effectiveScore = hasScore && score !== 'X' ? Math.min(numScore, maxScore) : null
                      const scoreToPar = effectiveScore !== null ? effectiveScore - hole.par : null

                      let bgColor = 'transparent'
                      let border = 'none'
                      let borderRadius = '0'

                      if (hasScore && score !== 'X') {
                        if (scoreToPar !== null && scoreToPar <= -2) {
                          bgColor = '#fff8e1'
                          border = '2px double #f39c12'
                          borderRadius = '50%'
                        } else if (scoreToPar === -1) {
                          bgColor = '#e8f5e9'
                          border = '2px solid #27ae60'
                          borderRadius = '50%'
                        }
                      }

                      let displayText = '-'
                      let isXorCapped = false
                      if (hasScore) {
                        if (score === 'X') {
                          displayText = `${maxScore}/X`
                          isXorCapped = true
                        } else if (isCapped) {
                          displayText = `${effectiveScore}/${score}`
                          isXorCapped = true
                        } else {
                          displayText = score
                        }
                      }

                      return (
                        <td
                          key={hole.hole}
                          onClick={() => !isDNF && openKeypad(selectedTeam.id, player.id, hole.hole, score, player.name)}
                          style={{
                            padding: '2px',
                            textAlign: 'center',
                            cursor: isDNF ? 'default' : 'pointer',
                            opacity: isDNF ? 0.5 : 1
                          }}
                        >
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '22px',
                            height: '22px',
                            background: bgColor,
                            border: border,
                            borderRadius: borderRadius,
                            fontWeight: 'bold',
                            fontSize: isXorCapped ? '8px' : '12px',
                            color: isXorCapped ? '#e74c3c' : '#333'
                          }}>
                            {displayText}
                          </div>
                        </td>
                      )
                    })}
                    <td style={{ padding: '4px 3px', textAlign: 'center', fontWeight: 'bold', background: '#fff3e0', fontSize: '12px' }}>
                      {backTotal || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark Team Done Button */}
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => onMarkTeamFinished(selectedTeam.id)}
          style={{
            width: '100%',
            padding: '14px',
            background: selectedTeam.isFinished ? '#e74c3c' : '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          {selectedTeam.isFinished ? '↩ Undo Team Done' : '✓ Mark Team Done'}
        </button>
      </div>

      {/* Keypad Modal */}
      {activeInput && (
        <ScoreKeypad
          playerName={activeInput.playerName}
          hole={activeInput.hole}
          value={keypadValue}
          onKeyPress={handleKeypadPress}
          onClose={closeKeypad}
          onDone={handleKeypadDone}
          onPrevHole={goToPrevHole}
          onNextHole={goToNextHole}
          onClear={handleClearScore}
        />
      )}

      {/* Greenie Prompt Modal */}
      {greeniePrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            width: '90%',
            maxWidth: '350px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              background: '#27ae60',
              color: 'white',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: 0 }}>Hole {greeniePrompt.hole} - Par 3</h3>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.9 }}>Who got the greenie?</p>
            </div>

            {/* Players remaining info and Mark as Final checkbox */}
            {(() => {
              const allActivePlayers = liveRound.teams.flatMap(t => t.players.filter(p => !p.isDNF))
              const totalPlayers = allActivePlayers.length
              const playersCompleted = allActivePlayers.filter(p => {
                const score = p.scores?.[greeniePrompt.hole]
                return score !== undefined && score !== null && score !== ''
              }).length

              return (
                <>
                  {!greeniePrompt.isLastTeam && playersCompleted < totalPlayers && (
                    <div style={{
                      padding: '10px 12px',
                      background: '#e3f2fd',
                      borderRadius: '8px',
                      marginBottom: '15px',
                      textAlign: 'center',
                      fontSize: '13px',
                      color: '#1976d2',
                      border: '1px solid #90caf9'
                    }}>
                      <strong>{playersCompleted}</strong> of <strong>{totalPlayers}</strong> players have played this hole
                    </div>
                  )}
                  {greeniePrompt.isLastTeam && (
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px',
                      background: '#fff3e0',
                      borderRadius: '8px',
                      marginBottom: '15px',
                      cursor: 'pointer',
                      border: '2px solid #f39c12'
                    }}>
                      <input
                        type="checkbox"
                        checked={markGreenieAsFinal}
                        onChange={(e) => setMarkGreenieAsFinal(e.target.checked)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: '600', color: '#e67e22' }}>Mark as Final</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>All teams have played this hole</div>
                      </div>
                    </label>
                  )}
                </>
              )
            })()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {liveRound.teams.flatMap(team =>
                team.players.filter(p => !p.isDNF).map(player => (
                  <button
                    key={player.id}
                    onClick={() => {
                      onUpdateGreenie(greeniePrompt.hole, player, greeniePrompt.isLastTeam && markGreenieAsFinal)
                      setGreeniePrompt(null)
                    }}
                    style={{
                      padding: '12px 15px',
                      background: 'white',
                      border: '2px solid #27ae60',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{player.name}</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>{team.name}</span>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => setGreeniePrompt(null)}
              style={{
                width: '100%',
                marginTop: '15px',
                padding: '12px',
                background: '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#666'
              }}
            >
              No Greenie / Skip
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Greenies Component
function GreeniesTracker({ liveRound, onUpdateGreenie }) {
  const [selectedHole, setSelectedHole] = useState(PAR_3_HOLES[0])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [markAsFinal, setMarkAsFinal] = useState(false)

  const allPlayers = liveRound.teams.flatMap(t => t.players.filter(p => !p.isDNF))

  const getCurrentGreenie = (hole) => {
    for (const team of liveRound.teams) {
      if (team.greenies && team.greenies[hole]) {
        return team.greenies[hole]
      }
    }
    return null
  }

  const getPlayersCompleted = (hole) => {
    return allPlayers.filter(p => {
      const score = p.scores?.[hole]
      return score !== undefined && score !== null && score !== ''
    }).length
  }

  const totalPlayers = allPlayers.length
  const currentGreenie = getCurrentGreenie(selectedHole)
  const playersCompleted = getPlayersCompleted(selectedHole)

  return (
    <div>
      <div style={{
        background: '#e8f5e9',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '20px',
        border: '2px solid #27ae60'
      }}>
        <h3 style={{ marginBottom: '10px', color: '#27ae60' }}>Par 3 Holes (Greenie Holes)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {PAR_3_HOLES.map(hole => {
            const greenie = getCurrentGreenie(hole)
            const holeInfo = getHoleInfo(hole)
            const completed = getPlayersCompleted(hole)
            const hasCurrentWinner = greenie && greenie.playerId
            const isCleared = greenie && !greenie.playerId && greenie.history?.length > 0
            return (
              <button
                key={hole}
                onClick={() => setSelectedHole(hole)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: selectedHole === hole ? '3px solid #27ae60' : '1px solid #ddd',
                  background: hasCurrentWinner
                    ? (greenie.isFinal ? '#d4edda' : '#fff3e0')
                    : (isCleared ? '#f5f5f5' : 'white'),
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>#{hole}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{holeInfo?.blue} yds</div>
                {greenie && greenie.playerId && (
                  <div style={{ fontSize: '11px', color: greenie.isFinal ? '#27ae60' : '#e67e22', marginTop: '4px' }}>
                    {greenie.playerName}
                    {greenie.isFinal && <span style={{ marginLeft: '4px' }}>✓</span>}
                  </div>
                )}
                {greenie && !greenie.playerId && greenie.history?.length > 0 && (
                  <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
                    (cleared)
                  </div>
                )}
                <div style={{ fontSize: '10px', color: '#1976d2', marginTop: '4px' }}>
                  {completed}/{totalPlayers}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={selectedHole}
              onChange={(e) => setSelectedHole(parseInt(e.target.value))}
              style={{
                padding: '8px 12px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '6px',
                border: '2px solid #27ae60',
                background: 'white',
                color: '#1a472a',
                cursor: 'pointer'
              }}
            >
              {PAR_3_HOLES.map(hole => {
                const greenie = getCurrentGreenie(hole)
                const completed = getPlayersCompleted(hole)
                return (
                  <option key={hole} value={hole}>
                    Hole {hole} {greenie?.playerId ? `- ${greenie.playerName}` : ''} ({completed}/{totalPlayers})
                  </option>
                )
              })}
            </select>
            <span style={{ fontSize: '14px', color: '#666' }}>Select Greenie Winner</span>
          </div>
          <span style={{
            background: playersCompleted === totalPlayers ? '#d4edda' : '#e3f2fd',
            color: playersCompleted === totalPlayers ? '#27ae60' : '#1976d2',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {playersCompleted} of {totalPlayers} played
          </span>
        </div>

        {currentGreenie && currentGreenie.playerId && (
          <div style={{
            background: currentGreenie.isFinal ? '#d4edda' : '#fff3e0',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '15px',
            border: currentGreenie.isFinal ? '2px solid #27ae60' : '2px solid #f39c12'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>
                Current: <strong>{currentGreenie.playerName}</strong>
                {currentGreenie.isFinal && (
                  <span style={{ marginLeft: '8px', color: '#27ae60', fontWeight: '600' }}>
                    (FINAL)
                  </span>
                )}
              </span>
              <button
                onClick={() => onUpdateGreenie(selectedHole, null)}
                style={{
                  padding: '6px 12px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
            {!currentGreenie.isFinal && (
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#e67e22' }}>
                  Pending - other teams may still play this hole
                </div>
                <button
                  onClick={() => onUpdateGreenie(selectedHole, { id: currentGreenie.playerId, name: currentGreenie.playerName }, true)}
                  style={{
                    padding: '6px 12px',
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  Mark Final
                </button>
              </div>
            )}
          </div>
        )}

        {/* History section - shown even when no current winner */}
        {currentGreenie?.history && currentGreenie.history.length > 0 && (
          <div style={{
            background: '#f8f9fa',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '15px',
            border: '1px solid #ddd'
          }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', fontWeight: '600' }}>
              Previous Winners (most recent first):
            </div>
            {currentGreenie.history.map((entry, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                padding: '4px 0',
                color: '#666'
              }}>
                <span>
                  <span style={{
                    display: 'inline-block',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#e0e0e0',
                    textAlign: 'center',
                    lineHeight: '20px',
                    fontSize: '10px',
                    fontWeight: '600',
                    marginRight: '8px'
                  }}>
                    {idx + 1}
                  </span>
                  {entry.playerName}
                  {entry.wasFinal && <span style={{ marginLeft: '4px', color: '#27ae60', fontSize: '10px' }}>(was final)</span>}
                </span>
                <button
                  onClick={() => onUpdateGreenie(selectedHole, { id: entry.playerId, name: entry.playerName }, false)}
                  style={{
                    padding: '3px 8px',
                    background: '#f0f0f0',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: '#555'
                  }}
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Winner Selection */}
        <div style={{
          background: '#f8f9fa',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px', fontWeight: '600' }}>
              Select Winner
            </label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Select Player --</option>
              {liveRound.teams.map(team => (
                <optgroup key={team.id} label={team.name}>
                  {team.players.filter(p => !p.isDNF).map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '15px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={markAsFinal}
              onChange={(e) => setMarkAsFinal(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px' }}>Mark as Final</span>
          </label>

          <button
            onClick={() => {
              if (selectedPlayerId) {
                const player = allPlayers.find(p => String(p.id) === String(selectedPlayerId))
                if (player) {
                  onUpdateGreenie(selectedHole, player, markAsFinal)
                  setSelectedPlayerId('')
                  setMarkAsFinal(false)
                }
              }
            }}
            disabled={!selectedPlayerId}
            style={{
              width: '100%',
              padding: '12px',
              background: selectedPlayerId ? 'linear-gradient(135deg, #27ae60 0%, #229954 100%)' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: selectedPlayerId ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Set Greenie Winner
          </button>
        </div>
      </div>
    </div>
  )
}

// DNF Management Component
function DNFManager({ liveRound, onMarkDNF, onUndoDNF, isAdmin }) {
  const [pendingDNF, setPendingDNF] = useState(null)
  const [dnfOptions, setDnfOptions] = useState({
    includeScores: true,
    paymentStatus: 'full',
    greeniesOwed: 4
  })

  if (!isAdmin) return null

  const handleConfirmDNF = () => {
    onMarkDNF(
      pendingDNF.teamId,
      pendingDNF.playerId,
      dnfOptions.includeScores,
      dnfOptions.paymentStatus,
      dnfOptions.greeniesOwed
    )
    setPendingDNF(null)
  }

  return (
    <div>
      <h3 style={{ marginBottom: '15px' }}>Player Status (DNF)</h3>
      <p style={{ color: '#666', marginBottom: '15px', fontSize: '13px' }}>
        Mark players as "Did Not Finish" if they leave early. Their existing scores can still count toward the team.
      </p>

      {liveRound.teams.map(team => (
        <div key={team.id} style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '10px', color: '#666' }}>{team.name}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {team.players.map(player => {
              const isDNF = player.isDNF === true
              return (
                <button
                  key={player.id}
                  onClick={() => {
                    if (isDNF) {
                      onUndoDNF(team.id, player.id)
                    } else {
                      setPendingDNF({ teamId: team.id, playerId: player.id, playerName: player.name })
                    }
                  }}
                  style={{
                    padding: '10px 15px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isDNF ? '#e74c3c' : '#e8e8e8',
                    color: isDNF ? 'white' : '#333',
                    cursor: 'pointer',
                    fontWeight: isDNF ? 'bold' : 'normal'
                  }}
                >
                  {player.name} {isDNF ? '(DNF - tap to undo)' : ''}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {pendingDNF && (
        <div className="modal-overlay" onClick={() => setPendingDNF(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mark {pendingDNF.playerName} as DNF?</h3>
              <button className="modal-close" onClick={() => setPendingDNF(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>
                  <input
                    type="checkbox"
                    checked={dnfOptions.includeScores}
                    onChange={e => setDnfOptions({ ...dnfOptions, includeScores: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  Include existing scores in team total
                </label>
              </div>

              <div className="input-group">
                <label>Payment Status</label>
                <select
                  value={dnfOptions.paymentStatus}
                  onChange={e => setDnfOptions({ ...dnfOptions, paymentStatus: e.target.value })}
                >
                  <option value="full">Paid for full round</option>
                  <option value="front">Paid for front 9 only</option>
                  <option value="none">Did not pay</option>
                </select>
              </div>

              <div className="input-group">
                <label>Par 3s Played (Greenies Owed)</label>
                <select
                  value={dnfOptions.greeniesOwed}
                  onChange={e => setDnfOptions({ ...dnfOptions, greeniesOwed: parseInt(e.target.value) })}
                >
                  <option value={0}>0 - None</option>
                  <option value={1}>1 - Hole 4 only</option>
                  <option value={2}>2 - Holes 4, 8</option>
                  <option value={4}>4 - All front 9 + back 9</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button className="btn btn-danger" onClick={handleConfirmDNF} style={{ flex: 1 }}>
                  Confirm DNF
                </button>
                <button className="btn btn-secondary" onClick={() => setPendingDNF(null)} style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Late Player Component
function LatePlayerManager({ liveRound, players, onAddLatePlayer, isAdmin }) {
  const [showModal, setShowModal] = useState(false)
  const [step, setStep] = useState(1)
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState('back')

  if (!isAdmin) return null

  const playersInRound = new Set(liveRound.teams.flatMap(t => t.players.map(p => p.id)))
  const availablePlayers = players.filter(p => p.isActive !== false && !playersInRound.has(p.id))

  const handleAddPlayer = () => {
    const player = players.find(p => p.id === selectedPlayerId)
    if (player && selectedTeamId !== null) {
      onAddLatePlayer(selectedTeamId, player, paymentStatus)
      setShowModal(false)
      setStep(1)
      setSelectedTeamId(null)
      setSelectedPlayerId(null)
    }
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <button
        className="btn btn-secondary"
        onClick={() => setShowModal(true)}
        style={{ width: '100%' }}
        disabled={availablePlayers.length === 0}
      >
        + Add Late Player to Team
      </button>

      {availablePlayers.length === 0 && (
        <p style={{ color: '#666', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
          All active players are already in the round
        </p>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Late Player</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {step === 1 && (
                <>
                  <h4 style={{ marginBottom: '15px' }}>Step 1: Select Team</h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {liveRound.teams.map(team => (
                      <button
                        key={team.id}
                        onClick={() => {
                          setSelectedTeamId(team.id)
                          setStep(2)
                        }}
                        style={{
                          padding: '15px',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          background: 'white',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ fontWeight: '600' }}>{team.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {team.players.length} players
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h4 style={{ marginBottom: '15px' }}>Step 2: Select Player</h4>
                  <div style={{ display: 'grid', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                    {availablePlayers.map(player => (
                      <button
                        key={player.id}
                        onClick={() => {
                          setSelectedPlayerId(player.id)
                          setStep(3)
                        }}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          background: 'white',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        {player.name} ({player.skillRating?.toFixed(1) || '5.0'})
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setStep(1)}
                    style={{ marginTop: '15px' }}
                  >
                    Back
                  </button>
                </>
              )}

              {step === 3 && (
                <>
                  <h4 style={{ marginBottom: '15px' }}>Step 3: Payment Status</h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <button
                      onClick={() => setPaymentStatus('full')}
                      style={{
                        padding: '15px',
                        borderRadius: '8px',
                        border: paymentStatus === 'full' ? '2px solid #27ae60' : '1px solid #ddd',
                        background: paymentStatus === 'full' ? '#d4edda' : 'white',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontWeight: '600' }}>Full Round</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Paying for entire round</div>
                    </button>
                    <button
                      onClick={() => setPaymentStatus('back')}
                      style={{
                        padding: '15px',
                        borderRadius: '8px',
                        border: paymentStatus === 'back' ? '2px solid #27ae60' : '1px solid #ddd',
                        background: paymentStatus === 'back' ? '#d4edda' : 'white',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontWeight: '600' }}>Back 9 Only</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Joining on hole 10</div>
                    </button>
                    <button
                      onClick={() => setPaymentStatus('none')}
                      style={{
                        padding: '15px',
                        borderRadius: '8px',
                        border: paymentStatus === 'none' ? '2px solid #27ae60' : '1px solid #ddd',
                        background: paymentStatus === 'none' ? '#d4edda' : 'white',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontWeight: '600' }}>Just Playing</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Not in team competition</div>
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button className="btn btn-primary" onClick={handleAddPlayer} style={{ flex: 1 }}>
                      Add Player
                    </button>
                    <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>
                      Back
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Skins Game Component
function SkinsTracker({ liveRound, skinsMatch, setSkinsMatch, isAdmin }) {
  const [showSetup, setShowSetup] = useState(false)
  const [showEditSettings, setShowEditSettings] = useState(false)
  const [skinsView, setSkinsView] = useState('front')
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pendingPlayerId, setPendingPlayerId] = useState(null)
  const [editPinInput, setEditPinInput] = useState('')
  const [editPinVerified, setEditPinVerified] = useState(false)
  const [settings, setSettings] = useState({
    costPerSkin: 1,
    carryovers: true,
    wrapUnwonSkins: true,
    wrapTo: 'front',
    parOrBetterRequired: false,
    birdieDoubleEagleTriple: false,
    // Greenie settings for Quick Skins
    greeniesEnabled: false,
    greeniesCostPerHole: 1,
    greeniesCarryover: true
  })
  const [editSettings, setEditSettings] = useState(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelPinInput, setCancelPinInput] = useState('')

  const allPlayers = liveRound.teams.flatMap(t => t.players.filter(p => !p.isDNF))
  const skinsPlayers = skinsMatch ? allPlayers.filter(p => skinsMatch.participants.includes(String(p.id))) : []

  const frontHoles = GUNPOWDER_SCORECARD.front9
  const backHoles = GUNPOWDER_SCORECARD.back9
  const allHoles = [...frontHoles, ...backHoles]
  const displayHoles = skinsView === 'front' ? frontHoles : skinsView === 'back' ? backHoles : allHoles

  const setupSkinsMatch = () => {
    setSkinsMatch({
      settings: { ...settings },
      participants: []
    })
    setShowSetup(false)
  }

  const handleToggleParticipant = (playerId) => {
    if (!skinsMatch) return
    if (isAdmin) {
      // Admin needs PIN during live round
      setPendingPlayerId(playerId)
      setShowPinPrompt(true)
    }
  }

  const confirmToggleParticipant = () => {
    if (pinInput === '1234' && pendingPlayerId !== null) {
      const isIn = skinsMatch.participants.includes(String(pendingPlayerId))
      const newParticipants = isIn
        ? skinsMatch.participants.filter(id => id !== String(pendingPlayerId))
        : [...skinsMatch.participants, String(pendingPlayerId)]
      setSkinsMatch({ ...skinsMatch, participants: newParticipants })
      setShowPinPrompt(false)
      setPinInput('')
      setPendingPlayerId(null)
    } else {
      alert('Incorrect PIN')
      setPinInput('')
    }
  }

  // Calculate skins results with all the features from legacy
  const calculateSkins = () => {
    if (!skinsMatch || skinsPlayers.length < 2) return {}

    const results = {}
    let carryoverCount = 0
    let carryoverFromHoles = []

    for (let hole = 1; hole <= 18; hole++) {
      const holeInfo = getHoleInfo(hole)

      // Get scores for all skins players on this hole
      const holeScores = []
      let allScored = true

      skinsPlayers.forEach(player => {
        const rawScore = player.scores?.[hole]
        if (rawScore === undefined || rawScore === null || rawScore === '') {
          allScored = false
        } else {
          const score = rawScore === 'X' ? 99 : parseInt(rawScore)
          holeScores.push({ playerId: player.id, playerName: player.name, score })
        }
      })

      results[hole] = {
        allScored,
        winner: null,
        isTie: false,
        isCarryover: false,
        carryoverCount: 0,
        skinValue: 1,
        currentLeader: null
      }

      if (holeScores.length === 0) {
        continue
      }

      const minScore = Math.min(...holeScores.map(s => s.score))
      const winners = holeScores.filter(s => s.score === minScore)

      if (!allScored) {
        // Find current leader
        if (winners.length === 1 && winners[0].score < 99) {
          results[hole].currentLeader = winners[0].playerId
        }
        continue
      }

      // All scored - determine winner
      if (winners.length > 1 || winners[0].score >= 99) {
        // Tie or everyone X'd
        results[hole].isTie = true
        if (skinsMatch.settings.carryovers) {
          carryoverCount++
          carryoverFromHoles.push(hole)
        }
      } else {
        // Single winner
        const winner = winners[0]

        // Check par or better requirement
        if (skinsMatch.settings.parOrBetterRequired && winner.score > holeInfo.par) {
          results[hole].isTie = true
          if (skinsMatch.settings.carryovers) {
            carryoverCount++
            carryoverFromHoles.push(hole)
          }
        } else {
          results[hole].winner = winner.playerId
          results[hole].winnerName = winner.playerName
          results[hole].winningScore = winner.score

          // Calculate skin value with birdie/eagle multiplier
          let skinValue = 1
          if (skinsMatch.settings.birdieDoubleEagleTriple) {
            const scoreToPar = winner.score - holeInfo.par
            if (scoreToPar === -1) skinValue = 2
            else if (scoreToPar <= -2) skinValue = 3
          }
          results[hole].skinValue = skinValue

          // Apply carryovers
          if (skinsMatch.settings.carryovers && carryoverCount > 0) {
            results[hole].carryoverCount = carryoverCount
            results[hole].carryoverFromHoles = [...carryoverFromHoles]
          }
          carryoverCount = 0
          carryoverFromHoles = []
        }
      }
    }

    // Handle wrap unwon skins - if carryovers remain after hole 18, wrap to first winner
    if (skinsMatch.settings.carryovers && skinsMatch.settings.wrapUnwonSkins && carryoverCount > 0) {
      const wrapToFront = skinsMatch.settings.wrapTo === 'front'
      const searchHoles = wrapToFront ? [1,2,3,4,5,6,7,8,9] : [10,11,12,13,14,15,16,17,18]

      // Find the first hole with a winner on the target nine
      for (const hole of searchHoles) {
        if (results[hole]?.winner) {
          // Add the wrapped carryovers to this winner
          results[hole].carryoverCount = (results[hole].carryoverCount || 0) + carryoverCount
          results[hole].carryoverFromHoles = [
            ...(results[hole].carryoverFromHoles || []),
            ...carryoverFromHoles
          ]
          results[hole].hasWrappedCarryovers = true
          carryoverCount = 0
          carryoverFromHoles = []
          break
        }
      }
    }

    return results
  }

  // Get skins summary per player
  const getSkinsSummary = (results) => {
    const summary = {}
    skinsPlayers.forEach(p => {
      summary[String(p.id)] = { skinsWon: 0, totalValue: 0, holes: [] }
    })

    let totalSkinsWon = 0
    const cost = parseFloat(skinsMatch?.settings?.costPerSkin) || 0

    Object.entries(results).forEach(([holeNum, result]) => {
      if (result.winner) {
        const playerId = String(result.winner)
        if (summary[playerId]) {
          summary[playerId].skinsWon += 1
          summary[playerId].totalValue += result.skinValue
          summary[playerId].holes.push({ hole: parseInt(holeNum), value: result.skinValue })
          totalSkinsWon += 1

          if (result.carryoverCount > 0) {
            summary[playerId].skinsWon += result.carryoverCount
            summary[playerId].totalValue += result.carryoverCount
            totalSkinsWon += result.carryoverCount
          }
        }
      }
    })

    // Calculate payouts
    const numParticipants = skinsPlayers.length
    Object.keys(summary).forEach(pId => {
      const playerSummary = summary[pId]
      // Per skin: each skin = cost from each other player
      playerSummary.amountWon = playerSummary.totalValue * cost * (numParticipants - 1)

      // Calculate amount paid (cost * skins won by others)
      const totalValueWon = Object.values(summary).reduce((sum, s) => sum + s.totalValue, 0)
      const othersValue = totalValueWon - playerSummary.totalValue
      playerSummary.amountPaid = othersValue * cost
      playerSummary.netAmount = playerSummary.amountWon - playerSummary.amountPaid
    })

    return { playerSummary: summary, totalSkinsWon }
  }

  // Calculate greenies for Quick Skins
  const PAR_3_HOLES = [4, 8, 12, 17]

  const calculateGreenies = () => {
    if (!skinsMatch?.settings?.greeniesEnabled || skinsPlayers.length < 2) return {}

    const results = {}
    let carryoverCount = 0
    let carryoverFromHoles = []

    PAR_3_HOLES.forEach(hole => {
      // Check if any player hit the green and has an odometer reading
      // For Quick Skins, we track greenies via the team greenies data
      const greenieData = liveRound.teams
        .flatMap(t => t.greenies?.[hole] ? [{ ...t.greenies[hole], teamId: t.id }] : [])
        .filter(g => g && g.playerId && skinsMatch.participants.includes(String(g.playerId)))
        .sort((a, b) => (a.distance || 999) - (b.distance || 999))[0]

      results[hole] = {
        winner: null,
        winnerName: null,
        distance: null,
        carryoverCount: 0,
        carryoverFromHoles: [],
        pot: skinsMatch.settings.greeniesCostPerHole * skinsPlayers.length
      }

      if (greenieData?.playerId && greenieData?.distance) {
        // We have a winner
        results[hole].winner = greenieData.playerId
        results[hole].winnerName = greenieData.playerName || skinsPlayers.find(p => String(p.id) === String(greenieData.playerId))?.name
        results[hole].distance = greenieData.distance

        // Apply carryovers
        if (skinsMatch.settings.greeniesCarryover && carryoverCount > 0) {
          results[hole].carryoverCount = carryoverCount
          results[hole].carryoverFromHoles = [...carryoverFromHoles]
        }
        carryoverCount = 0
        carryoverFromHoles = []
      } else {
        // No winner on this hole
        if (skinsMatch.settings.greeniesCarryover) {
          carryoverCount++
          carryoverFromHoles.push(hole)
        }
      }
    })

    // If carryovers remain after hole 17, wrap to first par 3 winner
    if (skinsMatch.settings.greeniesCarryover && carryoverCount > 0) {
      for (const hole of PAR_3_HOLES) {
        if (results[hole]?.winner) {
          results[hole].carryoverCount = (results[hole].carryoverCount || 0) + carryoverCount
          results[hole].carryoverFromHoles = [
            ...(results[hole].carryoverFromHoles || []),
            ...carryoverFromHoles
          ]
          break
        }
      }
    }

    return results
  }

  const getGreeniesSummary = (results) => {
    const summary = {}
    skinsPlayers.forEach(p => {
      summary[String(p.id)] = { greeniesWon: 0, totalPot: 0, holes: [] }
    })

    const cost = parseFloat(skinsMatch?.settings?.greeniesCostPerHole) || 0
    const potPerHole = cost * skinsPlayers.length
    let totalGreeniesWon = 0

    Object.entries(results).forEach(([hole, result]) => {
      if (result.winner) {
        const playerId = String(result.winner)
        if (summary[playerId]) {
          summary[playerId].greeniesWon += 1
          summary[playerId].totalPot += potPerHole
          summary[playerId].holes.push(parseInt(hole))
          totalGreeniesWon += 1

          if (result.carryoverCount > 0) {
            summary[playerId].greeniesWon += result.carryoverCount
            summary[playerId].totalPot += result.carryoverCount * potPerHole
            totalGreeniesWon += result.carryoverCount
          }
        }
      }
    })

    // Calculate net amounts
    const numParticipants = skinsPlayers.length
    const totalPotCollected = 4 * potPerHole // 4 par 3 holes
    Object.keys(summary).forEach(playerId => {
      const playerSummary = summary[playerId]
      playerSummary.amountWon = playerSummary.totalPot
      playerSummary.amountPaid = totalPotCollected / numParticipants
      playerSummary.netAmount = playerSummary.amountWon - playerSummary.amountPaid
    })

    return { playerSummary: summary, totalGreeniesWon }
  }

  const skinsResults = skinsMatch ? calculateSkins() : {}
  const { playerSummary, totalSkinsWon } = skinsMatch && skinsPlayers.length >= 2
    ? getSkinsSummary(skinsResults)
    : { playerSummary: {}, totalSkinsWon: 0 }

  const greenieResults = skinsMatch?.settings?.greeniesEnabled ? calculateGreenies() : {}
  const { playerSummary: greeniePlayerSummary, totalGreeniesWon } = skinsMatch?.settings?.greeniesEnabled && skinsPlayers.length >= 2
    ? getGreeniesSummary(greenieResults)
    : { playerSummary: {}, totalGreeniesWon: 0 }

  if (!skinsMatch) {
    return (
      <div>
        <div style={{
          background: '#fff3e0',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: '15px' }}>No Skins Match Active</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Set up a skins match to track individual hole winners.
          </p>
          <button className="btn btn-primary" onClick={() => setShowSetup(true)}>
            Setup Skins Match
          </button>
        </div>

        {showSetup && (
          <div className="modal-overlay" onClick={() => setShowSetup(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' }}>
                <h3 style={{ color: 'white', margin: 0 }}>Skins Match Settings</h3>
                <button className="modal-close" onClick={() => setShowSetup(false)} style={{ color: 'white' }}>&times;</button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label>Cost Per Skin ($)</label>
                  <input
                    type="number"
                    value={settings.costPerSkin}
                    onChange={e => setSettings({ ...settings, costPerSkin: parseFloat(e.target.value) || 1 })}
                    min="0.5"
                    step="0.5"
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Carryovers</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setSettings({ ...settings, carryovers: true })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: settings.carryovers ? '2px solid #f39c12' : '2px solid #ddd', background: settings.carryovers ? '#fff8e1' : 'white', fontWeight: settings.carryovers ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                    <button onClick={() => setSettings({ ...settings, carryovers: false })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: !settings.carryovers ? '2px solid #f39c12' : '2px solid #ddd', background: !settings.carryovers ? '#fff8e1' : 'white', fontWeight: !settings.carryovers ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                  </div>
                </div>
                {settings.carryovers && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Wrap Unwon Skins</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => setSettings({ ...settings, wrapUnwonSkins: true })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: settings.wrapUnwonSkins ? '2px solid #f39c12' : '2px solid #ddd', background: settings.wrapUnwonSkins ? '#fff8e1' : 'white', fontWeight: settings.wrapUnwonSkins ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                      <button onClick={() => setSettings({ ...settings, wrapUnwonSkins: false })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: !settings.wrapUnwonSkins ? '2px solid #f39c12' : '2px solid #ddd', background: !settings.wrapUnwonSkins ? '#fff8e1' : 'white', fontWeight: !settings.wrapUnwonSkins ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                    </div>
                  </div>
                )}
                <div style={{ marginBottom: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>Optional Rules</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={settings.parOrBetterRequired} onChange={e => setSettings({ ...settings, parOrBetterRequired: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                    <span>Par or better required to win</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={settings.birdieDoubleEagleTriple} onChange={e => setSettings({ ...settings, birdieDoubleEagleTriple: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                    <span>Birdie = 2x, Eagle = 3x value</span>
                  </label>
                </div>

                {/* Greenies Settings */}
                <div style={{ marginBottom: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Greenies (Par 3s)</label>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <button onClick={() => setSettings({ ...settings, greeniesEnabled: true })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: settings.greeniesEnabled ? '2px solid #27ae60' : '2px solid #ddd', background: settings.greeniesEnabled ? '#e8f5e9' : 'white', fontWeight: settings.greeniesEnabled ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                    <button onClick={() => setSettings({ ...settings, greeniesEnabled: false })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: !settings.greeniesEnabled ? '2px solid #27ae60' : '2px solid #ddd', background: !settings.greeniesEnabled ? '#e8f5e9' : 'white', fontWeight: !settings.greeniesEnabled ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                  </div>
                  {settings.greeniesEnabled && (
                    <>
                      <div className="input-group" style={{ marginBottom: '10px' }}>
                        <label>Cost Per Greenie Hole ($)</label>
                        <input
                          type="number"
                          value={settings.greeniesCostPerHole}
                          onChange={e => setSettings({ ...settings, greeniesCostPerHole: parseFloat(e.target.value) || 1 })}
                          min="0.5"
                          step="0.5"
                        />
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Greenie Carryovers</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => setSettings({ ...settings, greeniesCarryover: true })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: settings.greeniesCarryover ? '2px solid #27ae60' : '2px solid #ddd', background: settings.greeniesCarryover ? '#e8f5e9' : 'white', fontWeight: settings.greeniesCarryover ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                          <button onClick={() => setSettings({ ...settings, greeniesCarryover: false })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: !settings.greeniesCarryover ? '2px solid #27ae60' : '2px solid #ddd', background: !settings.greeniesCarryover ? '#e8f5e9' : 'white', fontWeight: !settings.greeniesCarryover ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                          Par 3 holes: 4, 8, 12, 17
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button className="btn btn-primary" onClick={setupSkinsMatch} style={{ width: '100%', marginTop: '10px' }}>
                  Start Skins Match
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Skins Header */}
      <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
          color: 'white',
          padding: '12px 15px',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Skins Match</span>
          <span style={{ fontSize: '13px', opacity: 0.9 }}>
            ${skinsMatch.settings.costPerSkin}/skin - {skinsPlayers.length} players
          </span>
        </div>

        {/* Settings Summary */}
        <div style={{ padding: '10px 15px', background: '#fff8e1', fontSize: '12px', color: '#666', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {skinsMatch.settings.carryovers && <span>Carryovers</span>}
          {skinsMatch.settings.carryovers && skinsMatch.settings.wrapUnwonSkins && <span>Wrap to {skinsMatch.settings.wrapTo === 'front' ? 'Front 9' : 'Back 9'}</span>}
          {skinsMatch.settings.parOrBetterRequired && <span>Par or Better</span>}
          {skinsMatch.settings.birdieDoubleEagleTriple && <span>Birdie 2x/Eagle 3x</span>}
          {skinsMatch.settings.greeniesEnabled && (
            <span style={{ color: '#27ae60', fontWeight: '600' }}>
              Greenies ${skinsMatch.settings.greeniesCostPerHole}/hole {skinsMatch.settings.greeniesCarryover && '(carryovers)'}
            </span>
          )}
          {isAdmin && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setEditSettings({ ...skinsMatch.settings })
                  setEditPinVerified(false)
                  setEditPinInput('')
                  setShowEditSettings(true)
                }}
                style={{ background: '#3498db', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
              >
                Edit Settings
              </button>
              <button
                onClick={() => { setShowCancelConfirm(true); setCancelPinInput('') }}
                style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
              >
                Cancel Match
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Admin Add/Remove Players */}
      {isAdmin && (
        <div style={{ background: 'white', borderRadius: '10px', padding: '15px', marginBottom: '15px' }}>
          <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '14px' }}>
            Add/Remove Players (Admin - PIN Required)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {allPlayers.map(player => {
              const inSkins = skinsMatch.participants.includes(String(player.id))
              return (
                <button
                  key={player.id}
                  onClick={() => handleToggleParticipant(player.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '20px',
                    border: inSkins ? '2px solid #27ae60' : '2px solid #ddd',
                    background: inSkins ? '#e8f8f5' : 'white',
                    color: inSkins ? '#27ae60' : '#666',
                    fontSize: '12px',
                    fontWeight: inSkins ? '600' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  {inSkins ? '✓ ' : ''}{player.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', justifyContent: 'center' }}>
        {['front', 'back', 'overall'].map(view => (
          <button
            key={view}
            onClick={() => setSkinsView(view)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: skinsView === view ? '2px solid #f39c12' : '1px solid #ddd',
              background: skinsView === view ? '#f39c12' : 'white',
              color: skinsView === view ? 'white' : '#333',
              fontSize: '12px',
              fontWeight: skinsView === view ? '600' : 'normal',
              cursor: 'pointer'
            }}
          >
            {view === 'front' ? 'Front 9' : view === 'back' ? 'Back 9' : 'All 18'}
          </button>
        ))}
      </div>

      {/* Skins Scoreboard Table */}
      {skinsPlayers.length >= 2 ? (
        <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: skinsView === 'overall' ? '600px' : '400px' }}>
              <thead>
                <tr style={{ background: '#f39c12', color: 'white' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'left', position: 'sticky', left: 0, background: '#f39c12', zIndex: 1, minWidth: '70px' }}>Player</th>
                  {displayHoles.map(h => (
                    <th key={h.hole} style={{ padding: '8px 4px', textAlign: 'center', minWidth: '28px' }}>{h.hole}</th>
                  ))}
                  <th style={{ padding: '8px 6px', textAlign: 'center', background: '#e67e22', minWidth: '40px' }}>Skins</th>
                </tr>
                <tr style={{ background: '#ffe0b2' }}>
                  <td style={{ padding: '4px 6px', fontWeight: '600', position: 'sticky', left: 0, background: '#ffe0b2', zIndex: 1 }}>Par</td>
                  {displayHoles.map(h => (
                    <td key={h.hole} style={{ padding: '4px', textAlign: 'center', fontWeight: '600' }}>{h.par}</td>
                  ))}
                  <td style={{ background: '#ffcc80' }}></td>
                </tr>
              </thead>
              <tbody>
                {skinsPlayers.map((player, idx) => {
                  const pSummary = playerSummary[String(player.id)] || { skinsWon: 0 }
                  return (
                    <tr key={player.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                      <td style={{
                        padding: '8px 6px',
                        fontWeight: '600',
                        position: 'sticky',
                        left: 0,
                        background: idx % 2 === 0 ? '#fff' : '#f9f9f9',
                        zIndex: 1,
                        borderRight: '1px solid #eee',
                        whiteSpace: 'nowrap'
                      }}>
                        {player.name.split(' ')[0]}
                      </td>
                      {displayHoles.map(h => {
                        const score = player.scores?.[h.hole]
                        const holeResult = skinsResults[h.hole] || {}
                        const hasScore = score !== undefined && score !== null && score !== ''

                        // Determine highlight color
                        let bgColor = 'transparent'
                        let borderColor = 'transparent'
                        let isCarryoverWin = false

                        // Check if this player won this hole outright
                        if (holeResult.winner === player.id) {
                          bgColor = '#d4edda'  // Solid green for outright win
                          borderColor = '#28a745'
                        } else {
                          // Check if this hole was won via carryover by this player
                          // (i.e., this hole is in another hole's carryoverFromHoles and that hole's winner is this player)
                          for (const [otherHole, otherResult] of Object.entries(skinsResults)) {
                            if (otherResult.winner === player.id &&
                                otherResult.carryoverFromHoles &&
                                otherResult.carryoverFromHoles.includes(h.hole)) {
                              bgColor = '#e8f5e9'  // Lighter green for carryover win
                              borderColor = '#81c784'
                              isCarryoverWin = true
                              break
                            }
                          }
                        }

                        // Check for current leader (not yet decided)
                        if (bgColor === 'transparent' && holeResult.currentLeader === player.id && !holeResult.allScored) {
                          bgColor = '#fff9c4'
                          borderColor = '#fbc02d'
                        }

                        // Check if this hole is a push (tied, not won, not claimed via carryover)
                        let isPushedHole = false
                        if (bgColor === 'transparent' && holeResult.isTie && holeResult.allScored) {
                          // Check if this hole has been claimed via carryover by anyone
                          let claimedViaCarryover = false
                          for (const [otherHole, otherResult] of Object.entries(skinsResults)) {
                            if (otherResult.carryoverFromHoles &&
                                otherResult.carryoverFromHoles.includes(h.hole)) {
                              claimedViaCarryover = true
                              break
                            }
                          }
                          if (!claimedViaCarryover) {
                            isPushedHole = true
                            bgColor = '#ffebee'  // Light red/pink for pushed hole
                            borderColor = '#ef9a9a'
                          }
                        }

                        return (
                          <td key={h.hole} style={{
                            padding: '4px',
                            textAlign: 'center',
                            background: isCarryoverWin
                              ? `repeating-linear-gradient(45deg, ${bgColor}, ${bgColor} 3px, #c8e6c9 3px, #c8e6c9 6px)`
                              : bgColor,
                            border: borderColor !== 'transparent' ? `2px solid ${borderColor}` : 'none',
                            borderRadius: '4px'
                          }}>
                            {hasScore ? (score === 'X' ? 'X' : score) : '-'}
                            {holeResult.winner === player.id && holeResult.carryoverCount > 0 && (
                              <div style={{ fontSize: '8px', color: '#2e7d32', marginTop: '1px' }}>
                                +{holeResult.carryoverCount}
                              </div>
                            )}
                          </td>
                        )
                      })}
                      <td style={{
                        padding: '8px 6px',
                        textAlign: 'center',
                        fontWeight: '700',
                        fontSize: '14px',
                        background: pSummary.skinsWon > 0 ? '#fff3e0' : '#f5f5f5',
                        color: pSummary.skinsWon > 0 ? '#e65100' : '#999'
                      }}>
                        {pSummary.skinsWon}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{ padding: '10px', borderTop: '1px solid #eee', display: 'flex', gap: '15px', flexWrap: 'wrap', fontSize: '11px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '14px', height: '14px', background: '#fff9c4', border: '2px solid #fbc02d', borderRadius: '3px' }}></span> Leading
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '14px', height: '14px', background: '#ffebee', border: '2px solid #ef9a9a', borderRadius: '3px' }}></span> Push
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '14px', height: '14px', background: '#d4edda', border: '2px solid #28a745', borderRadius: '3px' }}></span> Won Outright
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '14px', height: '14px', background: 'repeating-linear-gradient(45deg, #e8f5e9, #e8f5e9 3px, #c8e6c9 3px, #c8e6c9 6px)', border: '2px solid #81c784', borderRadius: '3px' }}></span> Won w/ Carryover
            </span>
          </div>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '10px', padding: '30px', textAlign: 'center', color: '#666' }}>
          Need at least 2 players to start skins match.
          <br /><br />
          Tap player names above to join.
        </div>
      )}

      {/* Greenies Section */}
      {skinsMatch.settings.greeniesEnabled && skinsPlayers.length >= 2 && (
        <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
            color: 'white',
            padding: '10px 15px',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Greenies (Par 3s)</span>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              ${skinsMatch.settings.greeniesCostPerHole}/hole × {skinsPlayers.length} players = ${(skinsMatch.settings.greeniesCostPerHole * skinsPlayers.length).toFixed(2)}/pot
            </span>
          </div>
          <div style={{ padding: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {PAR_3_HOLES.map(hole => {
                const result = greenieResults[hole] || {}
                const hasCarryover = result.carryoverCount > 0
                const totalPot = (1 + (result.carryoverCount || 0)) * skinsMatch.settings.greeniesCostPerHole * skinsPlayers.length
                return (
                  <div key={hole} style={{
                    background: result.winner ? (hasCarryover ? '#e8f5e9' : '#d4edda') : '#f8f9fa',
                    padding: '12px 8px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: result.winner ? '2px solid #27ae60' : '1px solid #ddd'
                  }}>
                    <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>#{hole}</div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>Par 3</div>
                    {result.winner ? (
                      <>
                        <div style={{ fontWeight: '600', color: '#27ae60', fontSize: '13px' }}>
                          {result.winnerName?.split(' ')[0] || 'Winner'}
                        </div>
                        {result.distance && (
                          <div style={{ fontSize: '11px', color: '#666' }}>{result.distance}</div>
                        )}
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#27ae60', marginTop: '4px' }}>
                          ${totalPot.toFixed(2)}
                          {hasCarryover && <span style={{ fontSize: '10px' }}> (+{result.carryoverCount})</span>}
                        </div>
                      </>
                    ) : (
                      <div style={{ color: '#999', fontSize: '12px' }}>
                        No winner
                        {skinsMatch.settings.greeniesCarryover && <div style={{ fontSize: '10px' }}>→ carries over</div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {totalGreeniesWon > 0 && (
              <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '12px' }}>Greenie Payouts:</div>
                {skinsPlayers
                  .filter(p => (greeniePlayerSummary[String(p.id)]?.greeniesWon || 0) > 0)
                  .map(player => {
                    const summary = greeniePlayerSummary[String(player.id)] || {}
                    return (
                      <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#e8f5e9', borderRadius: '4px', marginBottom: '4px' }}>
                        <span>{player.name} <span style={{ color: '#666', fontSize: '11px' }}>({summary.greeniesWon} greenie{summary.greeniesWon > 1 ? 's' : ''})</span></span>
                        <span style={{ color: '#27ae60', fontWeight: '700' }}>${summary.totalPot?.toFixed(2)}</span>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payout Summary */}
      {skinsPlayers.length >= 2 && (totalSkinsWon > 0 || totalGreeniesWon > 0) && (
        <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{
            background: '#27ae60',
            color: 'white',
            padding: '10px 15px',
            fontWeight: '600',
            fontSize: '14px'
          }}>
            Payout Summary
          </div>
          <div style={{ padding: '10px' }}>
            {skinsPlayers
              .sort((a, b) => {
                const aSkinsNet = playerSummary[String(a.id)]?.netAmount || 0
                const bSkinsNet = playerSummary[String(b.id)]?.netAmount || 0
                const aGreeniesNet = greeniePlayerSummary[String(a.id)]?.netAmount || 0
                const bGreeniesNet = greeniePlayerSummary[String(b.id)]?.netAmount || 0
                return (bSkinsNet + bGreeniesNet) - (aSkinsNet + aGreeniesNet)
              })
              .map(player => {
                const skinsSummary = playerSummary[String(player.id)] || {}
                const greenieSummary = greeniePlayerSummary[String(player.id)] || {}
                const skinsNet = skinsSummary.netAmount || 0
                const greeniesNet = greenieSummary.netAmount || 0
                const totalNet = skinsNet + greeniesNet
                return (
                  <div key={player.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderBottom: '1px solid #eee'
                  }}>
                    <span>
                      <strong>{player.name}</strong>
                      <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>
                        ({skinsSummary.skinsWon || 0} skins{skinsMatch.settings.greeniesEnabled && `, ${greenieSummary.greeniesWon || 0} greenies`})
                      </span>
                    </span>
                    <span style={{
                      fontWeight: '700',
                      color: totalNet > 0 ? '#27ae60' : totalNet < 0 ? '#e74c3c' : '#666'
                    }}>
                      {totalNet >= 0 ? '+' : ''}${totalNet.toFixed(2)}
                    </span>
                  </div>
                )
              })}
          </div>

          {/* Who Owes Who */}
          <div style={{
            borderTop: '2px solid #27ae60',
            padding: '10px 15px',
            background: '#f8fff8'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '13px', color: '#27ae60' }}>
              Who Owes Who
            </div>
            {(() => {
              const skinsCost = parseFloat(skinsMatch.settings.costPerSkin) || 0
              const greenieCost = parseFloat(skinsMatch.settings.greeniesCostPerHole) || 0
              const greeniesEnabled = skinsMatch.settings.greeniesEnabled
              const settlements = []

              for (let i = 0; i < skinsPlayers.length; i++) {
                for (let j = i + 1; j < skinsPlayers.length; j++) {
                  const playerA = skinsPlayers[i]
                  const playerB = skinsPlayers[j]
                  const skinsSummaryA = playerSummary[String(playerA.id)] || {}
                  const skinsSummaryB = playerSummary[String(playerB.id)] || {}
                  const greenieSummaryA = greeniePlayerSummary[String(playerA.id)] || {}
                  const greenieSummaryB = greeniePlayerSummary[String(playerB.id)] || {}

                  // Skins: A owes B for B's skins wins
                  let aOwesB = (skinsSummaryB.totalValue || 0) * skinsCost
                  let bOwesA = (skinsSummaryA.totalValue || 0) * skinsCost

                  // Greenies: Each greenie pot is split among all players, winner takes pot
                  // For greenies, A owes B = B's greenie pots won (since A contributed to those pots)
                  if (greeniesEnabled) {
                    const potPerHole = greenieCost * skinsPlayers.length
                    const aGreeniesValue = (greenieSummaryA.greeniesWon || 0)
                    const bGreeniesValue = (greenieSummaryB.greeniesWon || 0)
                    // A contributed greenieCost to each pot B won
                    aOwesB += bGreeniesValue * greenieCost
                    bOwesA += aGreeniesValue * greenieCost
                  }

                  const netOwed = aOwesB - bOwesA

                  if (Math.abs(netOwed) > 0.001) {
                    if (netOwed > 0) {
                      settlements.push({ from: playerA.name, to: playerB.name, amount: netOwed })
                    } else {
                      settlements.push({ from: playerB.name, to: playerA.name, amount: -netOwed })
                    }
                  }
                }
              }

              if (settlements.length === 0) {
                return <div style={{ color: '#666', fontSize: '12px' }}>Everyone is even!</div>
              }

              return settlements.map((s, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: idx < settlements.length - 1 ? '1px solid #e8f5e9' : 'none',
                  fontSize: '13px'
                }}>
                  <span style={{ color: '#e74c3c', fontWeight: '600' }}>{s.from}</span>
                  <span style={{ margin: '0 8px', color: '#666' }}>→</span>
                  <span style={{ color: '#27ae60', fontWeight: '600' }}>{s.to}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: '700', color: '#333' }}>
                    ${s.amount.toFixed(2)}
                  </span>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* PIN Prompt Modal */}
      {showPinPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000
        }}>
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '300px',
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: '15px' }}>Enter Admin PIN</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
              PIN required to add/remove skins players during a live round
            </p>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter PIN"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '18px',
                textAlign: 'center',
                border: '2px solid #ddd',
                borderRadius: '8px',
                marginBottom: '15px'
              }}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && confirmToggleParticipant()}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowPinPrompt(false); setPinInput(''); setPendingPlayerId(null) }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f8f9fa',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmToggleParticipant}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Settings Modal */}
      {showEditSettings && editSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '400px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#f39c12' }}>Edit Skins Settings</h3>

            {!editPinVerified ? (
              <div>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
                  Enter admin PIN to edit skins settings
                </p>
                <input
                  type="password"
                  value={editPinInput}
                  onChange={(e) => setEditPinInput(e.target.value)}
                  placeholder="Enter PIN"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '18px',
                    textAlign: 'center',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    marginBottom: '15px'
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editPinInput === '1234') {
                        setEditPinVerified(true)
                      } else {
                        alert('Incorrect PIN')
                        setEditPinInput('')
                      }
                    }
                  }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => { setShowEditSettings(false); setEditPinInput('') }}
                    style={{ flex: 1, padding: '12px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (editPinInput === '1234') {
                        setEditPinVerified(true)
                      } else {
                        alert('Incorrect PIN')
                        setEditPinInput('')
                      }
                    }}
                    style={{ flex: 1, padding: '12px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>Cost Per Skin ($)</label>
                  <input
                    type="number"
                    value={editSettings.costPerSkin}
                    onChange={(e) => setEditSettings({ ...editSettings, costPerSkin: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>Carryovers on Ties?</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setEditSettings({ ...editSettings, carryovers: true })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: editSettings.carryovers ? '2px solid #f39c12' : '2px solid #ddd', background: editSettings.carryovers ? '#fff8e1' : 'white', fontWeight: editSettings.carryovers ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                    <button onClick={() => setEditSettings({ ...editSettings, carryovers: false })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: !editSettings.carryovers ? '2px solid #f39c12' : '2px solid #ddd', background: !editSettings.carryovers ? '#fff8e1' : 'white', fontWeight: !editSettings.carryovers ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                  </div>
                </div>

                {editSettings.carryovers && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>Wrap Unwon Skins to Next 9?</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => setEditSettings({ ...editSettings, wrapUnwonSkins: true })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: editSettings.wrapUnwonSkins ? '2px solid #f39c12' : '2px solid #ddd', background: editSettings.wrapUnwonSkins ? '#fff8e1' : 'white', fontWeight: editSettings.wrapUnwonSkins ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                      <button onClick={() => setEditSettings({ ...editSettings, wrapUnwonSkins: false })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: !editSettings.wrapUnwonSkins ? '2px solid #f39c12' : '2px solid #ddd', background: !editSettings.wrapUnwonSkins ? '#fff8e1' : 'white', fontWeight: !editSettings.wrapUnwonSkins ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>Par or Better Required to Win?</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setEditSettings({ ...editSettings, parOrBetterRequired: true })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: editSettings.parOrBetterRequired ? '2px solid #f39c12' : '2px solid #ddd', background: editSettings.parOrBetterRequired ? '#fff8e1' : 'white', fontWeight: editSettings.parOrBetterRequired ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                    <button onClick={() => setEditSettings({ ...editSettings, parOrBetterRequired: false })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: !editSettings.parOrBetterRequired ? '2px solid #f39c12' : '2px solid #ddd', background: !editSettings.parOrBetterRequired ? '#fff8e1' : 'white', fontWeight: !editSettings.parOrBetterRequired ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>Birdie = 2x, Eagle = 3x?</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setEditSettings({ ...editSettings, birdieDoubleEagleTriple: true })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: editSettings.birdieDoubleEagleTriple ? '2px solid #f39c12' : '2px solid #ddd', background: editSettings.birdieDoubleEagleTriple ? '#fff8e1' : 'white', fontWeight: editSettings.birdieDoubleEagleTriple ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                    <button onClick={() => setEditSettings({ ...editSettings, birdieDoubleEagleTriple: false })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: !editSettings.birdieDoubleEagleTriple ? '2px solid #f39c12' : '2px solid #ddd', background: !editSettings.birdieDoubleEagleTriple ? '#fff8e1' : 'white', fontWeight: !editSettings.birdieDoubleEagleTriple ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                  </div>
                </div>

                {/* Greenies Settings */}
                <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px', color: '#27ae60' }}>Greenies (Par 3s)</label>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <button onClick={() => setEditSettings({ ...editSettings, greeniesEnabled: true })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: editSettings.greeniesEnabled ? '2px solid #27ae60' : '2px solid #ddd', background: editSettings.greeniesEnabled ? '#e8f5e9' : 'white', fontWeight: editSettings.greeniesEnabled ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                    <button onClick={() => setEditSettings({ ...editSettings, greeniesEnabled: false })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: !editSettings.greeniesEnabled ? '2px solid #27ae60' : '2px solid #ddd', background: !editSettings.greeniesEnabled ? '#e8f5e9' : 'white', fontWeight: !editSettings.greeniesEnabled ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                  </div>
                  {editSettings.greeniesEnabled && (
                    <>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '12px' }}>Cost Per Greenie Hole ($)</label>
                        <input
                          type="number"
                          value={editSettings.greeniesCostPerHole || 1}
                          onChange={(e) => setEditSettings({ ...editSettings, greeniesCostPerHole: parseFloat(e.target.value) || 1 })}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                          min="0.5"
                          step="0.5"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '12px' }}>Greenie Carryovers</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => setEditSettings({ ...editSettings, greeniesCarryover: true })} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: editSettings.greeniesCarryover ? '2px solid #27ae60' : '2px solid #ddd', background: editSettings.greeniesCarryover ? '#e8f5e9' : 'white', fontWeight: editSettings.greeniesCarryover ? '600' : 'normal', cursor: 'pointer', fontSize: '12px' }}>Yes</button>
                          <button onClick={() => setEditSettings({ ...editSettings, greeniesCarryover: false })} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: !editSettings.greeniesCarryover ? '2px solid #27ae60' : '2px solid #ddd', background: !editSettings.greeniesCarryover ? '#e8f5e9' : 'white', fontWeight: !editSettings.greeniesCarryover ? '600' : 'normal', cursor: 'pointer', fontSize: '12px' }}>No</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => { setShowEditSettings(false); setEditPinVerified(false) }}
                    style={{ flex: 1, padding: '12px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setSkinsMatch({ ...skinsMatch, settings: { ...editSettings } })
                      setShowEditSettings(false)
                      setEditPinVerified(false)
                    }}
                    style={{ flex: 1, padding: '12px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Match Confirmation Modal */}
      {showCancelConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000
        }}>
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '300px',
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#e74c3c' }}>Cancel Skins Match?</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
              Enter admin PIN to cancel the skins match. This cannot be undone.
            </p>
            <input
              type="password"
              value={cancelPinInput}
              onChange={(e) => setCancelPinInput(e.target.value)}
              placeholder="Enter PIN"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '18px',
                textAlign: 'center',
                border: '2px solid #ddd',
                borderRadius: '8px',
                marginBottom: '15px'
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (cancelPinInput === '1234') {
                    setSkinsMatch(null)
                    setShowCancelConfirm(false)
                    setCancelPinInput('')
                  } else {
                    alert('Incorrect PIN')
                    setCancelPinInput('')
                  }
                }
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowCancelConfirm(false); setCancelPinInput('') }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f8f9fa',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Keep Match
              </button>
              <button
                onClick={() => {
                  if (cancelPinInput === '1234') {
                    setSkinsMatch(null)
                    setShowCancelConfirm(false)
                    setCancelPinInput('')
                  } else {
                    alert('Incorrect PIN')
                    setCancelPinInput('')
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Money Tracker Component
function MoneyTracker({ liveRound, payoutFormats, holeInOnePot, skinsMatch }) {
  const settlement = calculateRoundSettlement(liveRound, payoutFormats, holeInOnePot, skinsMatch)

  if (!settlement) {
    return (
      <div className="alert alert-warning">
        Unable to calculate settlement. Make sure teams have scores entered.
      </div>
    )
  }

  const format = settlement.format === 'matchPlay' ? payoutFormats.matchPlay : payoutFormats.standard
  const perPlayerEntry = format.front9 + format.back9 + (settlement.format === 'matchPlay' ? format.overall : 0) + (4 * format.greeniePerHole) + (settlement.hio.enabled ? format.holeInOne : 0)

  // Calculate total greenie payouts
  const totalGreeniePayouts = Object.values(settlement.greeniePayouts).reduce((sum, amt) => sum + amt, 0)

  return (
    <div style={{ background: 'white', borderRadius: '10px', padding: '15px' }}>
      <h3 style={{ marginBottom: '15px', color: '#27ae60' }}>💰 Treasurer's Settlement Guide</h3>

      {/* Entry Fee Summary */}
      <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '2px solid #2196f3' }}>
        <div style={{ fontWeight: '700', marginBottom: '8px', color: '#1565c0' }}>Entry Fee Per Player: ${perPlayerEntry.toFixed(2)}</div>
        <div style={{ fontSize: '11px', color: '#666', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <span>Team: ${(format.front9 + format.back9 + (settlement.format === 'matchPlay' ? format.overall : 0)).toFixed(2)}</span>
          <span>Greenies: ${(4 * format.greeniePerHole).toFixed(2)}</span>
          {settlement.hio.enabled && <span>HIO: ${format.holeInOne.toFixed(2)}</span>}
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
          {settlement.totalPlayers} players × ${perPlayerEntry.toFixed(2)} = <strong>${(settlement.totalPlayers * perPlayerEntry).toFixed(2)}</strong> total collected
        </div>
      </div>

      {/* Step 1: Collect from Teams */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#1565c0', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>1</span>
          Collect From Each Team
        </h4>
        {settlement.teamSettlements.map(team => {
          const teamOwes = team.entry // Total owed (team comp + greenies + HIO)
          const teamWins = team.winnings // Team competition winnings
          const netAmount = teamWins - teamOwes
          const winsMore = netAmount > 0
          const owesMore = netAmount < 0
          const breaksEven = netAmount === 0

          return (
            <div key={team.teamId} style={{
              background: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '10px',
              border: '1px solid #ddd'
            }}>
              <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '15px' }}>
                {team.teamName} <span style={{ fontWeight: 'normal', fontSize: '12px', color: '#666' }}>({team.teamSize} players)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', fontSize: '12px' }}>
                <div style={{ background: '#ffebee', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ color: '#c62828', fontWeight: '600' }}>Team Owes</div>
                  <div style={{ fontSize: '18px', fontWeight: '700' }}>${teamOwes.toFixed(2)}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>${(teamOwes / team.teamSize).toFixed(2)}/player</div>
                </div>
                <div style={{ background: '#e8f5e9', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ color: '#2e7d32', fontWeight: '600' }}>Team Wins</div>
                  <div style={{ fontSize: '18px', fontWeight: '700' }}>${teamWins.toFixed(2)}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>${(teamWins / team.teamSize).toFixed(2)}/player</div>
                </div>
              </div>

              {/* Show what they won */}
              {(team.wins.length > 0 || team.ties?.length > 0) && (
                <div style={{ fontSize: '11px', marginBottom: '10px', padding: '6px', background: '#e8f5e9', borderRadius: '4px' }}>
                  {team.wins.length > 0 && <span style={{ color: '#2e7d32' }}>✓ Won: {team.wins.join(', ')}</span>}
                  {team.ties?.length > 0 && team.ties.map((tie, i) => (
                    <span key={i} style={{ color: '#1565c0', marginLeft: team.wins.length > 0 ? '8px' : '0' }}>
                      ≈ Tied: {tie.category} ({tie.numTeams} teams)
                    </span>
                  ))}
                </div>
              )}

              {/* Settlement Options */}
              <div style={{ background: '#fff8e1', padding: '10px', borderRadius: '6px', border: '1px solid #f9a825' }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '12px', color: '#f57f17' }}>Settlement Options:</div>

                {winsMore ? (
                  <>
                    <div style={{ fontSize: '12px', marginBottom: '6px', padding: '6px', background: 'white', borderRadius: '4px' }}>
                      <strong>Option A:</strong> Captain collects ${teamOwes.toFixed(2)}, gets back ${teamWins.toFixed(2)}
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                        Each player pays ${(teamOwes / team.teamSize).toFixed(2)}, gets back ${(teamWins / team.teamSize).toFixed(2)} = <span style={{ color: '#2e7d32', fontWeight: '600' }}>+${(netAmount / team.teamSize).toFixed(2)} net</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', padding: '6px', background: 'white', borderRadius: '4px' }}>
                      <strong>Option B:</strong> Captain collects $0, gets back ${netAmount.toFixed(2)} net
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                        Each player pays $0, gets back <span style={{ color: '#2e7d32', fontWeight: '600' }}>${(netAmount / team.teamSize).toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                ) : owesMore ? (
                  <>
                    <div style={{ fontSize: '12px', marginBottom: '6px', padding: '6px', background: 'white', borderRadius: '4px' }}>
                      <strong>Option A:</strong> Captain collects ${teamOwes.toFixed(2)}, gets back ${teamWins.toFixed(2)}
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                        Each player pays ${(teamOwes / team.teamSize).toFixed(2)}, gets back ${(teamWins / team.teamSize).toFixed(2)} = <span style={{ color: '#c62828', fontWeight: '600' }}>${(netAmount / team.teamSize).toFixed(2)} net</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', padding: '6px', background: 'white', borderRadius: '4px' }}>
                      <strong>Option B:</strong> Captain collects ${Math.abs(netAmount).toFixed(2)} net, gets back $0
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                        Each player pays <span style={{ color: '#c62828', fontWeight: '600' }}>${(Math.abs(netAmount) / team.teamSize).toFixed(2)}</span>, gets back $0
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '12px', padding: '6px', background: 'white', borderRadius: '4px' }}>
                    <strong>Break Even:</strong> Captain collects ${teamOwes.toFixed(2)}, gets back ${teamWins.toFixed(2)}
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                      Each player pays ${(teamOwes / team.teamSize).toFixed(2)}, gets back ${(teamWins / team.teamSize).toFixed(2)} = <span style={{ fontWeight: '600' }}>$0 net</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Step 2: Pay Greenie Winners */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#1565c0', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>2</span>
          Pay Greenie Winners
        </h4>
        <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {[4, 8, 12, 17].map(hole => {
              const result = settlement.greenieResults[hole]
              const winnerPlayer = result?.winner ? liveRound.teams.flatMap(t => t.players).find(p => String(p.id) === String(result.winner)) : null
              return (
                <div key={hole} style={{
                  background: result?.isFinal ? (result.winner ? '#e8f5e9' : '#fff3e0') : '#f5f5f5',
                  padding: '8px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  border: result?.isFinal ? (result.winner ? '2px solid #27ae60' : '2px solid #f39c12') : '1px solid #ddd'
                }}>
                  <div style={{ fontSize: '11px', color: '#666' }}>Hole {hole}</div>
                  <div style={{ fontWeight: '700', color: '#27ae60' }}>${result?.pot?.toFixed(2) || '0.00'}</div>
                  {result?.isFinal && (
                    <div style={{ fontSize: '10px', marginTop: '4px', color: result.winner ? '#2e7d32' : '#e67e22' }}>
                      {result.winner ? `${winnerPlayer?.name || 'Unknown'}` : 'No winner'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {Object.keys(settlement.greeniePayouts).length > 0 ? (
            <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '12px' }}>Pay to individuals:</div>
              {Object.entries(settlement.greeniePayouts).map(([playerId, amount]) => {
                const player = liveRound.teams.flatMap(t => t.players).find(p => String(p.id) === String(playerId))
                return (
                  <div key={playerId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#e8f5e9', borderRadius: '4px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '500' }}>{player?.name || 'Unknown'}</span>
                    <span style={{ color: '#2e7d32', fontWeight: '700' }}>${amount.toFixed(2)}</span>
                  </div>
                )
              })}
              {settlement.carryoverRemaining > 0 && (
                <div style={{ marginTop: '8px', color: '#e67e22', fontSize: '11px' }}>
                  ⏳ ${settlement.carryoverRemaining.toFixed(2)} carrying over (waiting for final greenie)
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: '#666', fontSize: '12px', fontStyle: 'italic' }}>
              No greenie winners yet
            </div>
          )}
        </div>
      </div>

      {/* Step 3: HIO Pot */}
      {settlement.hio.enabled && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#1565c0', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>3</span>
            Hole-in-One Pot
          </h4>
          <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '8px', border: '2px solid #f39c12' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600' }}>Add to HIO Pot</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{settlement.hio.eligibleCount} eligible players × ${format.holeInOne.toFixed(2)}</div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#f57f17' }}>
                ${settlement.hio.contribution.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification */}
      <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h4 style={{ fontSize: '13px', marginBottom: '10px' }}>✓ Verification</h4>
        <div style={{ fontSize: '11px', display: 'grid', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Collected:</span>
            <span style={{ fontWeight: '600' }}>${(settlement.totalPlayers * perPlayerEntry).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Team Winnings Paid Out:</span>
            <span>${settlement.teamSettlements.reduce((sum, t) => sum + t.winnings, 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Greenie Payouts:</span>
            <span>${totalGreeniePayouts.toFixed(2)}</span>
          </div>
          {settlement.hio.enabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>HIO Pot:</span>
              <span>${settlement.hio.contribution.toFixed(2)}</span>
            </div>
          )}
          {settlement.carryoverRemaining > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e67e22' }}>
              <span>Greenie Carryover (pending):</span>
              <span>${settlement.carryoverRemaining.toFixed(2)}</span>
            </div>
          )}
          <div style={{ borderTop: '1px solid #ddd', paddingTop: '6px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
            <span>Remaining (should be $0):</span>
            <span style={{ color: Math.abs((settlement.totalPlayers * perPlayerEntry) - settlement.teamSettlements.reduce((sum, t) => sum + t.winnings, 0) - totalGreeniePayouts - (settlement.hio.enabled ? settlement.hio.contribution : 0) - settlement.carryoverRemaining) < 0.01 ? '#2e7d32' : '#c62828' }}>
              ${((settlement.totalPlayers * perPlayerEntry) - settlement.teamSettlements.reduce((sum, t) => sum + t.winnings, 0) - totalGreeniePayouts - (settlement.hio.enabled ? settlement.hio.contribution : 0) - settlement.carryoverRemaining).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main LivePage Component
function LivePage() {
  const navigate = useNavigate()
  const {
    liveRound,
    setLiveRound,
    players,
    setPlayers,
    history,
    setHistory,
    teams,
    setTeams,
    skinsMatch,
    setSkinsMatch,
    isAdmin,
    payoutFormats,
    holeInOnePot,
    quickSkinsMode,
    setQuickSkinsMode,
    defaultStartingHole
  } = useLeague()

  // Leaderboard view state - defaults based on starting hole (front if 1-9, back if 10-18)
  const getInitialLeaderboardView = () => {
    if (defaultStartingHole >= 10) return 'back'
    return 'front'
  }
  const [leaderboardView, setLeaderboardView] = useState(getInitialLeaderboardView)

  const [subTab, setSubTab] = useState(quickSkinsMode ? 'skins' : 'leaderboard')
  const [selectedTeamId, setSelectedTeamId] = useState(liveRound?.teams[0]?.id || 0)
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [finishPin, setFinishPin] = useState('')

  if (!liveRound) {
    return (
      <div>
        <h2 style={{ marginBottom: '20px' }}>Live Round</h2>
        <div className="alert alert-info">
          No active round. Generate teams and click "Start Live Round" to begin.
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/teams')}
          style={{ marginTop: '15px' }}
        >
          Go to Teams
        </button>
      </div>
    )
  }

  const updateScore = (teamId, playerId, hole, score) => {
    setLiveRound({
      ...liveRound,
      teams: liveRound.teams.map(team => {
        if (team.id !== teamId) return team
        return {
          ...team,
          players: team.players.map(player => {
            if (player.id !== playerId) return player
            return {
              ...player,
              scores: { ...player.scores, [hole]: score }
            }
          })
        }
      })
    })
  }

  const updateGreenie = (hole, player, isFinal = false) => {
    // Find the current greenie for this hole (to add to history)
    let previousGreenie = null
    let existingHistory = []
    let wasFinalized = false
    for (const team of liveRound.teams) {
      if (team.greenies && team.greenies[hole]) {
        const current = team.greenies[hole]
        previousGreenie = {
          playerId: current.playerId,
          playerName: current.playerName,
          wasFinal: current.isFinal || false,
          clearedAt: new Date().toISOString()
        }
        existingHistory = current.history || []
        wasFinalized = current.isFinal || false
        break
      }
    }

    // Build new history array (keep previous greenie if different from new one)
    // Use String() to handle potential type mismatches between IDs
    let newHistory = [...existingHistory]
    const previousId = previousGreenie ? String(previousGreenie.playerId) : null
    const newId = player ? String(player.id) : null
    if (previousGreenie && previousId !== newId) {
      newHistory = [previousGreenie, ...existingHistory].slice(0, 10) // Keep last 10
    }

    const updatedTeams = liveRound.teams.map(team => ({
      ...team,
      greenies: { ...team.greenies, [hole]: null }
    }))

    if (player) {
      // Setting a new winner
      const playerTeam = liveRound.teams.find(t => t.players.some(p => p.id === player.id))
      if (playerTeam) {
        const teamIndex = updatedTeams.findIndex(t => t.id === playerTeam.id)
        updatedTeams[teamIndex] = {
          ...updatedTeams[teamIndex],
          greenies: {
            ...updatedTeams[teamIndex].greenies,
            [hole]: { playerId: player.id, playerName: player.name, isFinal, history: newHistory }
          }
        }
      }
    } else if (newHistory.length > 0) {
      // Clearing but preserving history - store on first team
      updatedTeams[0] = {
        ...updatedTeams[0],
        greenies: {
          ...updatedTeams[0].greenies,
          [hole]: { playerId: null, playerName: null, isFinal: false, history: newHistory }
        }
      }
    }

    setLiveRound({ ...liveRound, teams: updatedTeams })
  }

  const markTeamFinished = (teamId) => {
    const team = liveRound.teams.find(t => t.id === teamId)
    if (!team) return

    // If trying to mark as finished (not undoing), check for incomplete scores
    if (!team.isFinished) {
      const incompletePlayers = []

      team.players.forEach(player => {
        if (player.isDNF) return
        const missingHoles = []
        for (let hole = 1; hole <= 18; hole++) {
          const score = player.scores[hole]
          if (score === undefined || score === null || score === '') {
            missingHoles.push(hole)
          }
        }
        if (missingHoles.length > 0) {
          incompletePlayers.push({ name: player.name, missingHoles })
        }
      })

      if (incompletePlayers.length > 0) {
        const warningMsg = incompletePlayers.map(p =>
          `• ${p.name}: missing holes ${p.missingHoles.join(', ')}`
        ).join('\n')

        const proceed = window.confirm(
          `⚠️ INCOMPLETE SCORES DETECTED!\n\n${warningMsg}\n\nDo you still want to mark this team as done?`
        )
        if (!proceed) return
      }
    }

    setLiveRound({
      ...liveRound,
      teams: liveRound.teams.map(t =>
        t.id === teamId ? { ...t, isFinished: !t.isFinished } : t
      )
    })
  }

  const markPlayerDNF = (teamId, playerId, includeScores, paymentStatus, greeniesOwed) => {
    const allHoles = getAllHoles()
    setLiveRound({
      ...liveRound,
      teams: liveRound.teams.map(team => {
        if (team.id !== teamId) return team
        return {
          ...team,
          players: team.players.map(player => {
            if (player.id !== playerId) return player
            const updatedScores = { ...player.scores }
            const autoFilledXHoles = []
            allHoles.forEach(holeInfo => {
              if (!updatedScores[holeInfo.hole] || updatedScores[holeInfo.hole] === '') {
                updatedScores[holeInfo.hole] = 'X'
                autoFilledXHoles.push(holeInfo.hole)
              }
            })
            return {
              ...player,
              isDNF: true,
              includeInTeamScore: includeScores,
              paymentStatus,
              greeniesOwed,
              scores: updatedScores,
              autoFilledXHoles
            }
          })
        }
      })
    })
  }

  const undoPlayerDNF = (teamId, playerId) => {
    setLiveRound({
      ...liveRound,
      teams: liveRound.teams.map(team => {
        if (team.id !== teamId) return team
        return {
          ...team,
          players: team.players.map(player => {
            if (player.id !== playerId) return player
            const updatedScores = { ...player.scores }
            const autoFilledXHoles = player.autoFilledXHoles || []
            autoFilledXHoles.forEach(hole => {
              if (updatedScores[hole] === 'X') {
                updatedScores[hole] = ''
              }
            })
            return {
              ...player,
              isDNF: false,
              includeInTeamScore: true,
              scores: updatedScores,
              autoFilledXHoles: []
            }
          })
        }
      })
    })
  }

  const addLatePlayer = (teamId, player, paymentStatus) => {
    setLiveRound({
      ...liveRound,
      teams: liveRound.teams.map(team => {
        if (team.id !== teamId) return team
        return {
          ...team,
          players: [
            ...team.players,
            {
              id: player.id,
              name: player.name,
              skillRating: player.skillRating,
              scores: {},
              isDNF: false,
              includeInTeamScore: paymentStatus !== 'none',
              joinedLate: true,
              paymentStatus
            }
          ]
        }
      })
    })
  }

  const finishRound = () => {
    if (finishPin !== '1234') {
      alert('Incorrect PIN')
      setFinishPin('')
      return
    }

    const roundData = {
      id: liveRound.id,
      date: liveRound.date,
      teams: liveRound.teams.map(team => ({
        ...team,
        front9Score: calculateTeamScore(team, 1, 9),
        back9Score: calculateTeamScore(team, 10, 18),
        totalScore: calculateTeamScore(team, 1, 9) + calculateTeamScore(team, 10, 18)
      })),
      skinsMatch: skinsMatch ? { ...skinsMatch } : null
    }

    const updatedPlayers = players.map(player => {
      const roundPlayer = liveRound.teams.flatMap(t => t.players).find(p => p.id === player.id)
      if (!roundPlayer || roundPlayer.isDNF) return player

      const scores = roundPlayer.scores
      let front9 = 0, back9 = 0
      for (let h = 1; h <= 9; h++) if (scores[h] && scores[h] !== 'X') front9 += scores[h]
      for (let h = 10; h <= 18; h++) if (scores[h] && scores[h] !== 'X') back9 += scores[h]
      const total = front9 + back9

      if (total === 0) return player

      // Calculate score breakdown
      const allHoles = getAllHoles()
      const scoreBreakdown = {
        holeInOne: 0,
        eagles: 0,
        birdies: 0,
        pars: 0,
        bogeys: 0,
        doubleBogeys: 0,
        worse: 0
      }

      // Get max score based on player's average or skill rating
      const getMaxScore = (par) => {
        if (player.avgTotal && player.avgTotal > 0) {
          return player.avgTotal <= 82 ? par + 2 : par + 3
        }
        const skill = player.skillRating || 5
        return skill >= 7 ? par + 2 : par + 3
      }

      allHoles.forEach(holeInfo => {
        const scoreVal = scores[holeInfo.hole]
        if (scoreVal !== undefined && scoreVal !== null && scoreVal !== '') {
          let effectiveScore

          if (scoreVal === 'X' || scoreVal === 'x') {
            // X score - use max score based on player's handicap/skill
            effectiveScore = getMaxScore(holeInfo.par)
          } else {
            effectiveScore = parseInt(scoreVal)
            if (isNaN(effectiveScore)) return
          }

          // Check for hole-in-one
          if (effectiveScore === 1) {
            scoreBreakdown.holeInOne++
          }

          const diff = effectiveScore - holeInfo.par
          if (diff <= -2) scoreBreakdown.eagles++
          else if (diff === -1) scoreBreakdown.birdies++
          else if (diff === 0) scoreBreakdown.pars++
          else if (diff === 1) scoreBreakdown.bogeys++
          else if (diff === 2) scoreBreakdown.doubleBogeys++
          else if (diff >= 3) scoreBreakdown.worse++
        }
      })

      // Count holes completed (X counts as completed)
      const holesCompleted = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].filter(hole =>
        scores[hole] !== undefined && scores[hole] !== null && scores[hole] !== ''
      ).length
      const hasAllHoles = holesCompleted === 18

      // Calculate greenies won by this player
      const greeniesWon = []
      PAR_3_HOLES.forEach(hole => {
        const team = liveRound.teams.find(t => t.players.some(p => p.id === player.id))
        const greenieData = team?.greenies?.[hole]
        if (greenieData?.odometer && String(greenieData.playerId) === String(player.id)) {
          greeniesWon.push(hole)
        }
      })

      const newScoreHistory = [
        ...(player.scoreHistory || []),
        {
          id: Date.now() + player.id,
          date: liveRound.date,
          scores: { ...scores },
          frontNine: front9,
          backNine: back9,
          total: total,
          // Also include old property names for compatibility
          frontNineScore: front9,
          backNineScore: back9,
          totalScore: total,
          breakdown: scoreBreakdown,
          greeniesWon: greeniesWon,
          isComplete: hasAllHoles,
          holesCompleted: holesCompleted
        }
      ]

      // Only update games played and averages for complete rounds
      const newGamesPlayed = hasAllHoles ? (player.gamesPlayed || 0) + 1 : (player.gamesPlayed || 0)
      const validRounds = newScoreHistory.filter(r => (r.totalScore || r.total) > 0 && r.isComplete !== false)
      const avgTotal = validRounds.length > 0
        ? validRounds.reduce((sum, r) => sum + (r.totalScore || r.total), 0) / validRounds.length
        : player.avgTotal || 0
      const avgFront = validRounds.length > 0
        ? validRounds.reduce((sum, r) => sum + (r.frontNineScore || r.frontNine || 0), 0) / validRounds.length
        : player.avgFrontNine || 0
      const avgBack = validRounds.length > 0
        ? validRounds.reduce((sum, r) => sum + (r.backNineScore || r.backNine || 0), 0) / validRounds.length
        : player.avgBackNine || 0

      return {
        ...player,
        gamesPlayed: newGamesPlayed,
        scoreHistory: newScoreHistory,
        avgTotal,
        avgFrontNine: avgFront,
        avgBackNine: avgBack
      }
    })

    setPlayers(updatedPlayers)
    setHistory([roundData, ...history])
    setLiveRound(null)
    setTeams([])
    setSkinsMatch(null)
    setShowFinishConfirm(false)
    navigate('/history')
  }

  // End Quick Skins game
  const endQuickSkins = () => {
    if (confirm('End Quick Skins game? All data will be lost.')) {
      setLiveRound(null)
      setSkinsMatch(null)
      setQuickSkinsMode(false)
      navigate('/settings')
    }
  }

  // Define tabs based on mode
  const subTabs = quickSkinsMode
    ? [
        { id: 'scoring', label: 'Scores' },
        { id: 'skins', label: 'Skins' },
        ...(liveRound?.quickSkinsGreenieSettings ? [{ id: 'greenies', label: 'Greenies' }] : [])
      ]
    : [
        { id: 'leaderboard', label: 'Board' },
        { id: 'scoring', label: 'Scores' },
        { id: 'greenies', label: 'Greenies' },
        { id: 'skins', label: 'Skins' },
        { id: 'money', label: 'Money' },
        { id: 'manage', label: 'Manage' }
      ]

  return (
    <div>
      {/* Quick Skins Mode Banner */}
      {quickSkinsMode && (
        <div style={{
          background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '10px',
          marginBottom: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Quick Skins Game</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              Informal skins match - no stats saved
            </div>
          </div>
          <button
            onClick={endQuickSkins}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            End Game
          </button>
        </div>
      )}

      <h2 style={{ marginBottom: '20px' }}>{quickSkinsMode ? 'Quick Skins Game' : 'Live Round Scoring'}</h2>

      <div style={{
        display: 'flex',
        gap: '0',
        marginBottom: '20px',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '2px solid #27ae60'
      }}>
        {subTabs.map((tab, idx) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            style={{
              flex: 1,
              padding: '12px 4px',
              border: 'none',
              borderLeft: idx > 0 ? '1px solid #27ae60' : 'none',
              background: subTab === tab.id ? '#27ae60' : 'white',
              color: subTab === tab.id ? 'white' : '#27ae60',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'leaderboard' && <Leaderboard liveRound={liveRound} view={leaderboardView} setView={setLeaderboardView} />}
      {subTab === 'scoring' && (
        <ScoringGrid
          liveRound={liveRound}
          onUpdateScore={updateScore}
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={setSelectedTeamId}
          players={players}
          onMarkTeamFinished={markTeamFinished}
          onUpdateGreenie={updateGreenie}
        />
      )}
      {subTab === 'greenies' && (
        <GreeniesTracker
          liveRound={liveRound}
          onUpdateGreenie={updateGreenie}
        />
      )}
      {subTab === 'skins' && (
        <SkinsTracker
          liveRound={liveRound}
          skinsMatch={skinsMatch}
          setSkinsMatch={setSkinsMatch}
          isAdmin={isAdmin}
        />
      )}
      {subTab === 'money' && (
        <MoneyTracker
          liveRound={liveRound}
          payoutFormats={payoutFormats}
          holeInOnePot={holeInOnePot}
          skinsMatch={skinsMatch}
        />
      )}
      {subTab === 'manage' && (
        <div>
          <DNFManager
            liveRound={liveRound}
            onMarkDNF={markPlayerDNF}
            onUndoDNF={undoPlayerDNF}
            isAdmin={isAdmin}
          />
          <LatePlayerManager
            liveRound={liveRound}
            players={players}
            onAddLatePlayer={addLatePlayer}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* Admin Actions - Collapsible section for Finish Round */}
      {isAdmin && !quickSkinsMode && (
        <div style={{ marginTop: '30px' }}>
          {!showFinishConfirm ? (
            <details style={{
              background: '#f8f9fa',
              borderRadius: '10px',
              border: '1px solid #ddd'
            }}>
              <summary style={{
                padding: '12px 15px',
                cursor: 'pointer',
                fontWeight: '600',
                color: '#666',
                fontSize: '14px'
              }}>
                ⚙️ Admin Actions
              </summary>
              <div style={{ padding: '15px', borderTop: '1px solid #ddd' }}>
                <button
                  onClick={() => setShowFinishConfirm(true)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  Finish Round (End League Round)
                </button>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '10px', textAlign: 'center' }}>
                  This saves all scores to history and updates player statistics.
                </p>
              </div>
            </details>
          ) : (
            <div style={{
              background: '#fff3cd',
              padding: '20px',
              borderRadius: '10px',
              border: '2px solid #f9a825'
            }}>
              <h3 style={{ marginBottom: '15px' }}>Finish Round?</h3>
              <p style={{ marginBottom: '15px', color: '#666' }}>
                This will save all scores to history and update player statistics.
              </p>
              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label>Enter Admin PIN to confirm</label>
                <input
                  type="password"
                  value={finishPin}
                  onChange={(e) => setFinishPin(e.target.value)}
                  placeholder="Enter PIN"
                  maxLength={4}
                  style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '5px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={finishRound} style={{ flex: 1 }}>
                  Finish Round
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setShowFinishConfirm(false); setFinishPin('') }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LivePage
