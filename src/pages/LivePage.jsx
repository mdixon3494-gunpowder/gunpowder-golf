import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../context/LeagueContext'
import { GUNPOWDER_SCORECARD, getHoleInfo, PAR_3_HOLES, getAllHoles } from '../lib/courseData'
import { calculateRoundSettlement, formatMoney } from '../utils/moneyCalculations'
import { getLeaderboardData, FORMAT_CONFIGS, calculateFormatScore } from '../utils/formatScoring'
import NassauTracker from '../components/NassauTracker'
import WolfTracker from '../components/WolfTracker'
import {
  recalculatePlayerHandicaps,
  DEFAULT_COURSE_TEES,
  shouldUpdateHandicaps,
  isDateInFreezePeriod
} from '../utils/handicapCalculation'

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

  const { entries, displayMode, sortDirection, matchResult } = getLeaderboardData(liveRound)

  // If no leaderboard for this format (e.g. skins), show nothing
  if (!displayMode || entries.length === 0) return null

  // Match Play: special display
  if (displayMode === 'matchplay' && matchResult) {
    return (
      <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%)',
          color: 'white',
          padding: '12px 15px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '18px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Match Play
          </span>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a472a', marginBottom: '8px' }}>
            {matchResult.holesUp === 0 ? 'ALL SQUARE' : (
              <>
                {entries.find(e => e.isLeader)?.name || ''}
                <span style={{ color: '#e74c3c', marginLeft: '10px' }}>
                  {matchResult.isDecided
                    ? `${matchResult.holesUp}&${matchResult.holesRemaining}`
                    : `${matchResult.holesUp} UP`
                  }
                </span>
              </>
            )}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {matchResult.thru >= 18 ? 'Final' : matchResult.thru > 0 ? `thru ${matchResult.thru}` : '--'}
          </div>
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '30px' }}>
            {entries.map(e => (
              <div key={e.id}>
                <div style={{ fontWeight: '600', fontSize: '15px' }}>{e.name}</div>
                <div style={{ fontSize: '13px', color: '#888' }}>{e.holesWon} holes won</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Sort entries
  const sorted = [...entries].sort((a, b) => {
    const aVal = view === 'front' ? a.front9 : view === 'back' ? a.back9 : a.total
    const bVal = view === 'front' ? b.front9 : view === 'back' ? b.back9 : b.total
    return sortDirection === 'desc' ? bVal - aVal : aVal - bVal
  })

  // Format label for header
  const formatConfig = liveRound.formatConfig
  const formatLabel = formatConfig?.format ? (FORMAT_CONFIGS[formatConfig.format]?.label || '') : ''

  // Score display helper
  const renderScore = (score) => {
    if (displayMode === 'relative') {
      return (
        <span style={{ color: score < 0 ? '#27ae60' : score > 0 ? '#e74c3c' : '#333' }}>
          {formatRelativeToPar(score)}
        </span>
      )
    }
    if (displayMode === 'points') {
      return <span style={{ color: '#b8860b' }}>{score} pts</span>
    }
    // gross or net: plain number
    return <span style={{ color: '#333' }}>{score}</span>
  }

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
        <div>
          <span style={{
            fontSize: '18px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            Leaderboard
          </span>
          {formatLabel && (
            <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
              {formatLabel}{displayMode === 'net' ? ' (net)' : ''}
            </div>
          )}
        </div>
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
        {sorted.map((entry, idx) => {
          const displayScore = view === 'front' ? entry.front9 : view === 'back' ? entry.back9 : entry.total
          return (
            <div key={entry.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: idx === 0 ? (displayMode === 'points' ? '#fff8e1' : '#fff8e1') : (idx % 2 === 0 ? '#f8f9fa' : 'white'),
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
                  <div style={{ fontWeight: '600' }}>{entry.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {entry.holesCompleted === 18 ? (
                      <span style={{ color: '#27ae60', fontWeight: '600' }}>F</span>
                    ) : entry.holesCompleted > 0 ? (
                      <span>thru {entry.holesCompleted}</span>
                    ) : (
                      <span>--</span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {renderScore(displayScore)}
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
function ScoringGrid({ liveRound, onUpdateScore, selectedTeamId, setSelectedTeamId, players, onMarkTeamFinished, onUpdateGreenie, isQuickSkins, isIndividualRound }) {
  const [activeInput, setActiveInput] = useState(null)
  const [keypadValue, setKeypadValue] = useState('')
  const [isFirstKeypress, setIsFirstKeypress] = useState(true)
  const [trackedPlayers, setTrackedPlayers] = useState({}) // { [teamId]: Set of player IDs being tracked }
  const [showPlayerSelector, setShowPlayerSelector] = useState(false)
  const [greeniePrompt, setGreeniePrompt] = useState(null) // { hole: number, isLastTeam: boolean } when showing prompt
  const [markGreenieAsFinal, setMarkGreenieAsFinal] = useState(false) // User must explicitly check to mark as final
  const [greenieSelectedPlayer, setGreenieSelectedPlayer] = useState(null) // Selected player in greenie prompt

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

  // Determine hole range for scoring
  const holesPlayed = liveRound.holesPlayed || 18
  const roundStartingHole = liveRound.startingHole || 1
  const roundEndingHole = holesPlayed === 9 ? roundStartingHole + 8 : 18
  const is9HoleRound = holesPlayed === 9

  // Find next score needed for a team (only for tracked players)
  const findNextScoreNeeded = (team) => {
    const trackedIds = getTrackedPlayerIds(team.id)
    const activePlayers = team.players.filter(p => !p.isDNF && trackedIds.has(p.id))
    for (let hole = roundStartingHole; hole <= roundEndingHole; hole++) {
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
            setMarkGreenieAsFinal(false) // User must explicitly check to mark as final
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
    if (!activeInput || activeInput.hole <= roundStartingHole) return

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
    if (!activeInput || activeInput.hole >= roundEndingHole) return

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

  // Auto-select team for individual rounds
  if (isIndividualRound && !selectedTeam && liveRound.teams.length > 0) {
    setSelectedTeamId(liveRound.teams[0].id)
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
  const frontTotal = (!is9HoleRound || roundStartingHole === 1) ? calculateTeamTotal(selectedTeam, 1, 9) : 0
  const backTotal = (!is9HoleRound || roundStartingHole === 10) ? calculateTeamTotal(selectedTeam, 10, 18) : 0

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
        {!isIndividualRound && (
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
        )}

        {/* Team Score Summary - Hide in Quick Skins mode */}
        {!isQuickSkins && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '30px',
            marginTop: '15px',
            padding: '10px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '8px'
          }}>
            {(!is9HoleRound || roundStartingHole === 1) && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>FRONT</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {frontTotal === 0 ? 'E' : (frontTotal > 0 ? '+' : '') + frontTotal}
              </div>
            </div>
            )}
            {(!is9HoleRound || roundStartingHole === 10) && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>BACK</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                {backTotal === 0 ? 'E' : (backTotal > 0 ? '+' : '') + backTotal}
              </div>
            </div>
            )}
            {!is9HoleRound && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>TOTAL</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {(frontTotal + backTotal) === 0 ? 'E' : ((frontTotal + backTotal) > 0 ? '+' : '') + (frontTotal + backTotal)}
              </div>
            </div>
            )}
          </div>
        )}
      </div>

      {/* Player Tracking Selector - hidden for individual rounds */}
      {!isIndividualRound && (
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
      )}

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
        {/* Front 9 - hidden for back-9 only individual rounds */}
        {!(is9HoleRound && roundStartingHole === 10) && (
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
        )}

        {/* Back 9 - hidden for front-9 only individual rounds */}
        {!(is9HoleRound && roundStartingHole === 1) && (
        <div style={{ overflowX: 'auto', borderTop: is9HoleRound ? 'none' : '2px solid #34495e' }}>
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
        )}
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

            {/* Players remaining info */}
            {(() => {
              const allActivePlayers = liveRound.teams.flatMap(t => t.players.filter(p => !p.isDNF))
              const totalPlayers = allActivePlayers.length
              const playersCompleted = allActivePlayers.filter(p => {
                const score = p.scores?.[greeniePrompt.hole]
                return score !== undefined && score !== null && score !== ''
              }).length

              return playersCompleted < totalPlayers ? (
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
              ) : (
                <div style={{
                  padding: '10px 12px',
                  background: '#d4edda',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#27ae60',
                  border: '1px solid #27ae60'
                }}>
                  All players have completed this hole
                </div>
              )
            })()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {liveRound.teams.flatMap(team =>
                team.players.filter(p => !p.isDNF).map(player => {
                  const isSelected = greenieSelectedPlayer?.id === player.id
                  return (
                    <button
                      key={player.id}
                      onClick={() => setGreenieSelectedPlayer(player)}
                      style={{
                        padding: '12px 15px',
                        background: isSelected ? '#e8f5e9' : 'white',
                        border: isSelected ? '3px solid #27ae60' : '2px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: isSelected ? '600' : '500',
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>{player.name}</span>
                      <span style={{ fontSize: '12px', color: '#666' }}>{team.name}</span>
                    </button>
                  )
                })
              )}
            </div>

            {/* Mark as Final checkbox - shown after player selection */}
            {greenieSelectedPlayer && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                background: markGreenieAsFinal ? '#e8f5e9' : '#fff3e0',
                borderRadius: '8px',
                marginTop: '15px',
                cursor: 'pointer',
                border: markGreenieAsFinal ? '2px solid #27ae60' : '2px solid #f39c12'
              }}>
                <input
                  type="checkbox"
                  checked={markGreenieAsFinal}
                  onChange={(e) => setMarkGreenieAsFinal(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: '600', color: markGreenieAsFinal ? '#27ae60' : '#e67e22' }}>
                    {markGreenieAsFinal ? 'Will be marked Final' : 'Mark as Final?'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Check this if all teams have played this hole
                  </div>
                </div>
              </label>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button
                onClick={() => {
                  setGreeniePrompt(null)
                  setGreenieSelectedPlayer(null)
                  setMarkGreenieAsFinal(false)
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f8f9fa',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#666'
                }}
              >
                Skip
              </button>
              <button
                onClick={() => {
                  if (greenieSelectedPlayer) {
                    onUpdateGreenie(greeniePrompt.hole, greenieSelectedPlayer, markGreenieAsFinal)
                  }
                  setGreeniePrompt(null)
                  setGreenieSelectedPlayer(null)
                  setMarkGreenieAsFinal(false)
                }}
                disabled={!greenieSelectedPlayer}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: greenieSelectedPlayer ? '#27ae60' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: greenieSelectedPlayer ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Greenies Component
function GreeniesTracker({ liveRound, onUpdateGreenie, skinsMatch }) {
  const [selectedHole, setSelectedHole] = useState(PAR_3_HOLES[0])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [markAsFinal, setMarkAsFinal] = useState(false)

  const allPlayers = liveRound.teams.flatMap(t => t.players.filter(p => !p.isDNF))

  // Get players eligible for a specific hole (filters out players who left before this hole)
  const getEligiblePlayersForHole = (hole) => {
    if (!skinsMatch?.participantDetails) return allPlayers
    return allPlayers.filter(p => {
      const details = skinsMatch.participantDetails[String(p.id)]
      if (!details?.isSettled) return true  // Not settled, still eligible
      // Settled - only eligible if they played this hole
      const leftOnHole = details.leftOnHole
      if (leftOnHole === 0 || leftOnHole === null || leftOnHole === undefined) return false
      return leftOnHole >= hole
    })
  }

  const getCurrentGreenie = (hole) => {
    for (const team of liveRound.teams) {
      if (team.greenies && team.greenies[hole]) {
        return team.greenies[hole]
      }
    }
    return null
  }

  const getPlayersCompleted = (hole) => {
    const eligible = getEligiblePlayersForHole(hole)
    return eligible.filter(p => {
      const score = p.scores?.[hole]
      return score !== undefined && score !== null && score !== ''
    }).length
  }

  const eligiblePlayersForHole = getEligiblePlayersForHole(selectedHole)
  const totalPlayers = eligiblePlayersForHole.length
  const currentGreenie = getCurrentGreenie(selectedHole)
  const playersCompleted = getPlayersCompleted(selectedHole)

  // Calculate carryover winners for display
  const getCarryoverInfo = () => {
    const greeniesCarryover = skinsMatch?.settings?.greeniesCarryover ?? true
    if (!greeniesCarryover) return {}

    // Check if a hole is fully completed (all eligible players have scores)
    const isHoleCompleted = (hole) => {
      const eligible = getEligiblePlayersForHole(hole)
      return eligible.every(p => {
        const score = p.scores?.[hole]
        return score !== undefined && score !== null && score !== ''
      })
    }

    const carryoverInfo = {} // { [hole]: { wonBy, wonByName, wonOnHole } }
    const pendingCarryovers = []

    PAR_3_HOLES.forEach(hole => {
      // Only process holes that are fully completed
      if (!isHoleCompleted(hole)) return

      const greenie = getCurrentGreenie(hole)
      if (greenie?.playerId) {
        // This hole has a winner - check if it also won any carryovers
        if (pendingCarryovers.length > 0) {
          pendingCarryovers.forEach(co => {
            carryoverInfo[co.fromHole] = {
              wonBy: greenie.playerId,
              wonByName: greenie.playerName,
              wonOnHole: hole
            }
          })
          pendingCarryovers.length = 0
        }
      } else {
        // No winner on this hole - add to pending carryovers
        pendingCarryovers.push({ fromHole: hole })
      }
    })

    // If there are still pending carryovers after all holes, wrap to first winner
    if (pendingCarryovers.length > 0) {
      for (const hole of PAR_3_HOLES) {
        const greenie = getCurrentGreenie(hole)
        if (greenie?.playerId && greenie.isFinal) {
          pendingCarryovers.forEach(co => {
            carryoverInfo[co.fromHole] = {
              wonBy: greenie.playerId,
              wonByName: greenie.playerName,
              wonOnHole: hole
            }
          })
          break
        }
      }
    }

    return carryoverInfo
  }

  const carryoverInfo = getCarryoverInfo()

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
            const coInfo = carryoverInfo[hole]
            const hasCarryoverWinner = !hasCurrentWinner && coInfo
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
                    : (hasCarryoverWinner ? '#fff3e0' : (isCleared ? '#f5f5f5' : 'white')),
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
                {hasCarryoverWinner && (
                  <>
                    <div style={{ fontSize: '11px', color: '#e67e22', marginTop: '4px' }}>
                      {coInfo.wonByName}
                    </div>
                    <div style={{
                      fontSize: '9px',
                      color: '#e67e22',
                      background: '#fff3e0',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      marginTop: '2px'
                    }}>
                      ↗ #{coInfo.wonOnHole}
                    </div>
                  </>
                )}
                {isCleared && !hasCarryoverWinner && (
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
                const eligibleForHole = getEligiblePlayersForHole(hole).length
                const coInfo = carryoverInfo[hole]
                const winnerDisplay = greenie?.playerId
                  ? `- ${greenie.playerName}`
                  : (coInfo ? `- ${coInfo.wonByName} (↗#${coInfo.wonOnHole})` : '')
                return (
                  <option key={hole} value={hole}>
                    Hole {hole} {winnerDisplay} ({completed}/{eligibleForHole})
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
              {(() => {
                const eligiblePlayers = getEligiblePlayersForHole(selectedHole)
                const eligibleIds = new Set(eligiblePlayers.map(p => String(p.id)))
                return liveRound.teams.map(team => {
                  const teamEligiblePlayers = team.players.filter(p => !p.isDNF && eligibleIds.has(String(p.id)))
                  if (teamEligiblePlayers.length === 0) return null
                  return (
                    <optgroup key={team.id} label={team.name}>
                      {teamEligiblePlayers.map(player => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                        </option>
                      ))}
                    </optgroup>
                  )
                })
              })()}
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
function LatePlayerManager({ liveRound, players, onAddLatePlayer, onAddGuestPlayer, isAdmin, isCasualGame }) {
  const [showModal, setShowModal] = useState(false)
  const [step, setStep] = useState(1)
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState('back')
  const [guestName, setGuestName] = useState('')
  const [guestHandicap, setGuestHandicap] = useState(0)

  if (!isAdmin && !isCasualGame) return null

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

  const handleAddGuest = () => {
    if (!guestName.trim()) {
      alert('Please enter a name')
      return
    }
    // For casual single-group games, use team 0
    const teamId = liveRound.teams.length === 1 ? liveRound.teams[0].id : selectedTeamId
    if (teamId === null || teamId === undefined) {
      alert('Please select a group')
      return
    }
    onAddGuestPlayer(teamId, guestName.trim(), guestHandicap)
    setShowModal(false)
    setStep(1)
    setGuestName('')
    setGuestHandicap(0)
    setSelectedTeamId(null)
  }

  const resetAndClose = () => {
    setShowModal(false)
    setStep(1)
    setSelectedTeamId(null)
    setSelectedPlayerId(null)
    setGuestName('')
    setGuestHandicap(0)
  }

  // Casual game: simplified "Add Player" flow
  if (isCasualGame) {
    return (
      <div style={{ marginTop: '20px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => setShowModal(true)}
          style={{ width: '100%' }}
        >
          + Add Player
        </button>

        {showModal && (
          <div className="modal-overlay" onClick={resetAndClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add Player</h3>
                <button className="modal-close" onClick={resetAndClose}>&times;</button>
              </div>
              <div className="modal-body">
                {/* Step 1: Select team (skip if only one group) */}
                {step === 1 && liveRound.teams.length > 1 && (
                  <>
                    <h4 style={{ marginBottom: '15px' }}>Select Group</h4>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {liveRound.teams.map(team => (
                        <button
                          key={team.id}
                          onClick={() => { setSelectedTeamId(team.id); setStep(2) }}
                          style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', textAlign: 'left' }}
                        >
                          <div style={{ fontWeight: '600' }}>{team.name}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{team.players.map(p => p.name).join(', ')}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Enter guest info (step 2, or step 1 if single group) */}
                {(step === 2 || (step === 1 && liveRound.teams.length === 1)) && (
                  <>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Name</label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        placeholder="Player name"
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
                        autoFocus
                      />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px' }}>Handicap</label>
                      <input
                        type="number"
                        value={guestHandicap}
                        onChange={e => setGuestHandicap(parseInt(e.target.value) || 0)}
                        style={{ width: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="btn btn-primary"
                        onClick={handleAddGuest}
                        style={{ flex: 1 }}
                      >
                        Add Player
                      </button>
                      {liveRound.teams.length > 1 && (
                        <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>Back</button>
                      )}
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

  // League mode: existing late player flow
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
        <div className="modal-overlay" onClick={resetAndClose}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Late Player</h3>
              <button className="modal-close" onClick={resetAndClose}>&times;</button>
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
function SkinsTracker({ liveRound, setLiveRound, skinsMatch, setSkinsMatch, isAdmin, leaguePlayers, isCasualGame }) {
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
    // Flexible multipliers (1 = no multiplier)
    birdieMultiplier: 1,      // 1 or 2
    eagleMultiplier: 1,       // 1, 2, or 3
    doubleEagleMultiplier: 1, // 1, 2, 3, or 4
    holeInOneMultiplier: 1,   // 1, 2, 3, 4, or 5
    // Greenie settings for Quick Skins
    greeniesEnabled: false,
    greeniesCostPerHole: 1,
    greeniesCarryover: true
  })
  const [editSettings, setEditSettings] = useState(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelPinInput, setCancelPinInput] = useState('')

  // Mid-round join/leave modal state
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false)
  const [addPlayerJoinHole, setAddPlayerJoinHole] = useState(1)
  const [selectedPlayerToAdd, setSelectedPlayerToAdd] = useState(null)
  const [addPlayerMode, setAddPlayerMode] = useState('existing') // 'existing' or 'guest'
  const [guestPlayerName, setGuestPlayerName] = useState('')
  const [selectedTeamToAdd, setSelectedTeamToAdd] = useState(null)
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [settlePlayer, setSettlePlayer] = useState(null)
  const [settleLastHole, setSettleLastHole] = useState(0)
  const [settleStep, setSettleStep] = useState(1)
  const [carryoverHandling, setCarryoverHandling] = useState('pay')
  const [carryoverCollector, setCarryoverCollector] = useState(null)

  const participantDetails = skinsMatch?.participantDetails || {}
  // Include settled players who played at least 1 hole (they're DNF but should show on skins scorecard)
  const allPlayers = liveRound.teams.flatMap(t => t.players.filter(p => {
    if (!p.isDNF) return true
    const details = participantDetails[String(p.id)]
    return details?.isSettled && details.leftOnHole > 0
  }))
  // All players including those who settled before playing (for the Players section)
  const allPlayersIncludingSettled = liveRound.teams.flatMap(t => t.players.filter(p => {
    if (!p.isDNF) return true
    const details = participantDetails[String(p.id)]
    return details?.isSettled
  }))
  // Get skins players - players from teams who are participants
  // (includes both league players and guests since they're added to teams)
  const skinsPlayers = skinsMatch
    ? (isCasualGame ? allPlayers : allPlayers.filter(p => skinsMatch.participants.includes(String(p.id))))
    : []

  // Check if greenies are enabled - check both skinsMatch settings and Quick Skins settings
  const quickSkinsGreenies = liveRound?.quickSkinsGreenieSettings
  const greeniesEnabled = skinsMatch?.settings?.greeniesEnabled || !!quickSkinsGreenies
  const greeniesCostPerHole = skinsMatch?.settings?.greeniesCostPerHole ||
    (quickSkinsGreenies ? parseFloat(quickSkinsGreenies.costPerGreenie) || 1 : 0)
  const greeniesCarryover = skinsMatch?.settings?.greeniesCarryover ?? quickSkinsGreenies?.carryovers ?? true
  const greeniesWrap = skinsMatch?.settings?.greeniesWrap ?? quickSkinsGreenies?.wrapUnwonGreenies ?? false

  const frontHoles = GUNPOWDER_SCORECARD.front9
  const backHoles = GUNPOWDER_SCORECARD.back9
  const allHoles = [...frontHoles, ...backHoles]
  const displayHoles = skinsView === 'front' ? frontHoles : skinsView === 'back' ? backHoles : allHoles

  const setupSkinsMatch = () => {
    setSkinsMatch({
      settings: { ...settings },
      participants: [],
      participantDetails: {},  // Track join/leave hole per player
      settlements: []          // Track early settlements
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
      const playerId = String(pendingPlayerId)
      const isIn = skinsMatch.participants.includes(playerId)

      if (isIn) {
        // Removing player - update participants list
        const newParticipants = skinsMatch.participants.filter(id => id !== playerId)
        const newDetails = { ...skinsMatch.participantDetails }
        delete newDetails[playerId]
        setSkinsMatch({
          ...skinsMatch,
          participants: newParticipants,
          participantDetails: newDetails
        })
      } else {
        // Adding player - initialize participantDetails with joinedOnHole: 1 (default for initial setup)
        const newParticipants = [...skinsMatch.participants, playerId]
        const newDetails = {
          ...(skinsMatch.participantDetails || {}),
          [playerId]: {
            joinedOnHole: 1,
            leftOnHole: null,
            isSettled: false,
            settledOnHole: null
          }
        }
        setSkinsMatch({
          ...skinsMatch,
          participants: newParticipants,
          participantDetails: newDetails
        })
      }

      setShowPinPrompt(false)
      setPinInput('')
      setPendingPlayerId(null)
    } else {
      alert('Incorrect PIN')
      setPinInput('')
    }
  }

  // Helper: Get active players for a specific hole
  const getActivePlayersForHole = (hole, players) => {
    const participantDetails = skinsMatch?.participantDetails || {}
    return players.filter(player => {
      const details = participantDetails[String(player.id)]
      if (!details) return true  // Backwards compat: assume active for all holes

      const joinedOnHole = details.joinedOnHole || 1
      const leftOnHole = details.leftOnHole !== null && details.leftOnHole !== undefined ? details.leftOnHole : 18

      if (leftOnHole === 0) return false  // Left before playing any holes
      return hole >= joinedOnHole && hole <= leftOnHole
    })
  }

  // Helper: Get active (non-settled) skins players
  const getActiveSkinsPlayers = () => {
    const participantDetails = skinsMatch?.participantDetails || {}
    return skinsPlayers.filter(player => {
      const details = participantDetails[String(player.id)]
      return !details?.isSettled
    })
  }

  // Calculate skins results with all the features from legacy + eligibility tracking
  const calculateSkins = () => {
    if (!skinsMatch || skinsPlayers.length < 2) return {}

    const participantDetails = skinsMatch.participantDetails || {}
    const results = {}

    // Track pending carryovers with eligibility info
    // Each carryover knows which players were active when it was created
    let pendingCarryovers = []  // Array of { fromHole, eligiblePlayerIds }

    for (let hole = 1; hole <= 18; hole++) {
      const holeInfo = getHoleInfo(hole)
      const activePlayers = getActivePlayersForHole(hole, skinsPlayers)
      const activePlayerIds = activePlayers.map(p => String(p.id))

      // Get scores for active skins players on this hole
      // Two-pass approach for smarter X score handling
      const holeScores = []
      const xScorePlayers = []
      let allScored = true

      // First pass: collect non-X scores and identify X score players
      activePlayers.forEach(player => {
        const rawScore = player.scores?.[hole]
        if (rawScore === undefined || rawScore === null || rawScore === '') {
          allScored = false
        } else if (rawScore === 'X') {
          xScorePlayers.push(player)
        } else {
          holeScores.push({ playerId: player.id, playerName: player.name, score: parseInt(rawScore) })
        }
      })

      // Second pass: calculate X scores as double/triple bogey
      // X scores are marked with isXScore: true and cannot win outright
      // This applies to both par-or-better and non-par-or-better modes
      if (xScorePlayers.length > 0) {
        const par = holeInfo.par

        xScorePlayers.forEach(player => {
          // League player with handicap < 18: double bogey (par + 2)
          // League player with handicap >= 18 or guest: triple bogey (par + 3)
          const isGuest = String(player.id).startsWith('guest_')
          const handicap = player.handicap || 0
          const xScore = (isGuest || handicap >= 18) ? par + 3 : par + 2

          holeScores.push({ playerId: player.id, playerName: player.name, score: xScore, isXScore: true })
        })
      }

      results[hole] = {
        allScored,
        winner: null,
        isTie: false,
        isCarryover: false,
        carryoverCount: 0,
        skinValue: 1,
        currentLeader: null,
        activePlayers: activePlayerIds,
        // Track carryover winners separately from hole winner
        carryoverWinners: []
      }

      if (holeScores.length === 0) {
        continue
      }

      const minScore = Math.min(...holeScores.map(s => s.score))
      const winners = holeScores.filter(s => s.score === minScore)

      if (!allScored) {
        // Find current leader (must not be an X score)
        if (winners.length === 1 && !winners[0].isXScore) {
          results[hole].currentLeader = winners[0].playerId
        }
        continue
      }

      // All active players scored - determine winner
      // Winner must not be an X score, and must meet par requirement if enabled
      const isValidWin = winners.length === 1 && !winners[0].isXScore &&
        (!skinsMatch.settings.parOrBetterRequired || winners[0].score <= holeInfo.par)

      let holeWinner = null
      if (!isValidWin) {
        // Tie or doesn't meet requirements - add to pending carryovers
        results[hole].isTie = true
        if (skinsMatch.settings.carryovers) {
          pendingCarryovers.push({
            fromHole: hole,
            eligiblePlayerIds: [...activePlayerIds]
          })
        }
      } else {
        // Single winner for this hole
        holeWinner = winners[0]
        results[hole].winner = holeWinner.playerId
        results[hole].winnerName = holeWinner.playerName
        results[hole].winningScore = holeWinner.score

        // Calculate skin value with flexible multipliers
        let skinValue = 1
        const score = holeWinner.score
        const scoreToPar = score - holeInfo.par
        const s = skinsMatch.settings

        // Check for backwards compatibility with old birdieDoubleEagleTriple setting
        if (s.birdieDoubleEagleTriple) {
          if (scoreToPar === -1) skinValue = 2
          else if (scoreToPar <= -2) skinValue = 3
        } else {
          // Use flexible multipliers - apply highest applicable
          const multipliers = []

          // Hole-in-one check (score of 1 on any hole)
          if (score === 1 && s.holeInOneMultiplier > 1) {
            multipliers.push(s.holeInOneMultiplier)
          }

          // Double eagle (albatross) or better: 3+ under par
          if (scoreToPar <= -3 && s.doubleEagleMultiplier > 1) {
            multipliers.push(s.doubleEagleMultiplier)
          }

          // Eagle: 2 under par
          if (scoreToPar === -2 && s.eagleMultiplier > 1) {
            multipliers.push(s.eagleMultiplier)
          }

          // Birdie: 1 under par
          if (scoreToPar === -1 && s.birdieMultiplier > 1) {
            multipliers.push(s.birdieMultiplier)
          }

          // Use highest applicable multiplier
          if (multipliers.length > 0) {
            skinValue = Math.max(...multipliers)
          }
        }
        results[hole].skinValue = skinValue
      }

      // Process pending carryovers - may have different winners based on eligibility
      // IMPORTANT: Process even when current hole is a tie - eligible players can still win carryovers
      if (skinsMatch.settings.carryovers && pendingCarryovers.length > 0) {
        // Get carryovers that existed BEFORE this hole (exclude current hole if it was just added)
        const carryoversToProcess = pendingCarryovers.filter(co => co.fromHole !== hole)

        if (carryoversToProcess.length > 0) {
          // Group carryovers by eligibility set
          const carryoversByEligibility = {}

          carryoversToProcess.forEach(co => {
            const key = [...co.eligiblePlayerIds].sort().join(',')
            if (!carryoversByEligibility[key]) {
              carryoversByEligibility[key] = {
                eligiblePlayerIds: co.eligiblePlayerIds,
                holes: []
              }
            }
            carryoversByEligibility[key].holes.push(co.fromHole)
          })

          // For each eligibility group, find winner among eligible players
          Object.values(carryoversByEligibility).forEach(group => {
            const eligibleScores = holeScores.filter(s =>
              group.eligiblePlayerIds.includes(String(s.playerId))
            )

            if (eligibleScores.length === 0) {
              // No eligible players scored - carryovers remain pending (already in list)
              return
            }

            const eligibleMinScore = Math.min(...eligibleScores.map(s => s.score))
            const eligibleWinners = eligibleScores.filter(s => s.score === eligibleMinScore)

            // Check if there's a single winner among eligible players (must not be X score)
            const eligibleValidWin = eligibleWinners.length === 1 && !eligibleWinners[0].isXScore &&
              (!skinsMatch.settings.parOrBetterRequired || eligibleWinners[0].score <= holeInfo.par)

            if (eligibleValidWin) {
              const coWinner = eligibleWinners[0]

              // Check if carryover winner is same as hole winner (if there is one)
              if (holeWinner && String(coWinner.playerId) === String(holeWinner.playerId)) {
                // Same winner - add to regular carryovers
                results[hole].carryoverCount = (results[hole].carryoverCount || 0) + group.holes.length
                results[hole].carryoverFromHoles = [
                  ...(results[hole].carryoverFromHoles || []),
                  ...group.holes
                ]
              } else {
                // Different winner for carryovers (or no hole winner - dual winner scenario)
                results[hole].carryoverWinners.push({
                  playerId: coWinner.playerId,
                  playerName: coWinner.playerName,
                  count: group.holes.length,
                  fromHoles: group.holes,
                  eligiblePlayerIds: group.eligiblePlayerIds
                })
              }

              // Remove these from pending
              group.holes.forEach(h => {
                pendingCarryovers = pendingCarryovers.filter(c => c.fromHole !== h)
              })
            }
            // If tie among eligible players, carryovers stay pending (no action needed)
          })
        }
      }
    }

    // Handle wrap unwon skins - if carryovers remain after hole 18, wrap to first winner
    // ONLY apply wrap after ALL holes have been scored by all active players
    const allHolesCompleted = (() => {
      for (let h = 1; h <= 18; h++) {
        const activePlayers = getActivePlayersForHole(h, skinsPlayers)
        const allScored = activePlayers.every(player => {
          const score = player.scores?.[h]
          return score !== undefined && score !== null && score !== ''
        })
        if (!allScored) return false
      }
      return true
    })()

    if (skinsMatch.settings.carryovers && skinsMatch.settings.wrapUnwonSkins && pendingCarryovers.length > 0 && allHolesCompleted) {
      const wrapToFront = skinsMatch.settings.wrapTo === 'front'
      const searchHoles = wrapToFront ? [1,2,3,4,5,6,7,8,9] : [10,11,12,13,14,15,16,17,18]

      // Group carryovers by eligibility
      const carryoversByEligibility = {}
      pendingCarryovers.forEach(co => {
        const key = [...co.eligiblePlayerIds].sort().join(',')
        if (!carryoversByEligibility[key]) {
          carryoversByEligibility[key] = {
            eligiblePlayerIds: co.eligiblePlayerIds,
            holes: []
          }
        }
        carryoversByEligibility[key].holes.push(co.fromHole)
      })

      // For each eligibility group, find the first winner among eligible players in wrap range
      Object.values(carryoversByEligibility).forEach(group => {
        for (const hole of searchHoles) {
          // Check if hole has a direct winner who is eligible
          if (results[hole]?.winner) {
            const holeWinnerId = String(results[hole].winner)
            if (group.eligiblePlayerIds.includes(holeWinnerId)) {
              // Winner is eligible - give them the carryovers
              results[hole].carryoverCount = (results[hole].carryoverCount || 0) + group.holes.length
              results[hole].carryoverFromHoles = [
                ...(results[hole].carryoverFromHoles || []),
                ...group.holes
              ]
              results[hole].hasWrappedCarryovers = true
              break
            }
          }

          // Check carryover winners on this hole too (even if hole itself was a tie)
          const eligibleCoWinner = results[hole]?.carryoverWinners?.find(cw =>
            group.eligiblePlayerIds.includes(String(cw.playerId))
          )
          if (eligibleCoWinner) {
            eligibleCoWinner.count += group.holes.length
            eligibleCoWinner.fromHoles = [...eligibleCoWinner.fromHoles, ...group.holes]
            eligibleCoWinner.hasWrappedCarryovers = true
            break
          }

          // Winner not eligible - check if any eligible player won on this hole
          // (need to recalculate based on eligibility)
          const activePlayers = getActivePlayersForHole(hole, skinsPlayers)
          const eligiblePlayers = activePlayers.filter(p =>
            group.eligiblePlayerIds.includes(String(p.id))
          )

          if (eligiblePlayers.length > 0) {
            const holeInfo = getHoleInfo(hole)

            // Collect scores, converting X to double/triple bogey
            const eligibleScores = []

            eligiblePlayers.forEach(player => {
              const rawScore = player.scores?.[hole]
              if (rawScore === undefined || rawScore === null || rawScore === '') return

              if (rawScore === 'X') {
                // X = double bogey for low handicap, triple bogey for guests/high handicap
                const isGuest = String(player.id).startsWith('guest_')
                const handicap = player.handicap || 0
                const xScore = (isGuest || handicap >= 18) ? holeInfo.par + 3 : holeInfo.par + 2
                eligibleScores.push({ playerId: player.id, playerName: player.name, score: xScore, isXScore: true })
              } else {
                eligibleScores.push({ playerId: player.id, playerName: player.name, score: parseInt(rawScore), isXScore: false })
              }
            })

            if (eligibleScores.length > 0) {
              const minScore = Math.min(...eligibleScores.map(s => s.score))
              const winners = eligibleScores.filter(s => s.score === minScore)

              if (winners.length === 1 && !winners[0].isXScore &&
                  (!skinsMatch.settings.parOrBetterRequired || winners[0].score <= holeInfo.par)) {
                const coWinner = winners[0]

                // Add as carryover winner
                const existingCoWinner = results[hole].carryoverWinners?.find(
                  cw => String(cw.playerId) === String(coWinner.playerId)
                )
                if (existingCoWinner) {
                  existingCoWinner.count += group.holes.length
                  existingCoWinner.fromHoles = [...existingCoWinner.fromHoles, ...group.holes]
                } else {
                  results[hole].carryoverWinners = results[hole].carryoverWinners || []
                  results[hole].carryoverWinners.push({
                    playerId: coWinner.playerId,
                    playerName: coWinner.playerName,
                    count: group.holes.length,
                    fromHoles: group.holes,
                    eligiblePlayerIds: group.eligiblePlayerIds,
                    hasWrappedCarryovers: true
                  })
                }
                break
              }
            }
          }
        }
      })
    }

    // Store remaining pending carryovers info for display
    results.pendingCarryovers = pendingCarryovers

    return results
  }

  // Get skins summary per player (with eligibility-aware payouts)
  const getSkinsSummary = (results) => {
    const participantDetails = skinsMatch?.participantDetails || {}
    const cost = parseFloat(skinsMatch?.settings?.costPerSkin) || 0

    const summary = {}
    skinsPlayers.forEach(p => {
      const details = participantDetails[String(p.id)] || {}
      summary[String(p.id)] = {
        skinsWon: 0,
        totalValue: 0,
        holes: [],
        carryoverWins: [],  // Wins from carryover eligibility
        joinedOnHole: details.joinedOnHole || 1,
        leftOnHole: details.leftOnHole || 18,
        isSettled: details.isSettled || false
      }
    })

    let totalSkinsWon = 0

    // Track wins with eligibility info for payout calculation
    const skinWins = []  // Array of { hole, winnerId, value, activePlayerIds, isCarryover, eligiblePlayerIds }

    Object.entries(results).forEach(([holeNum, result]) => {
      if (holeNum === 'pendingCarryovers') return  // Skip metadata
      const hole = parseInt(holeNum)

      // Handle direct hole winner
      if (result.winner) {
        const playerId = String(result.winner)
        if (summary[playerId]) {
          const skinValue = result.skinValue || 1  // Default to 1 if not set
          summary[playerId].skinsWon += 1
          summary[playerId].totalValue += skinValue
          summary[playerId].holes.push({ hole, value: skinValue })
          totalSkinsWon += 1

          skinWins.push({
            hole,
            winnerId: playerId,
            value: skinValue,
            activePlayerIds: result.activePlayers || skinsPlayers.map(p => String(p.id)),
            isCarryover: false
          })

          // Handle carryovers won by hole winner
          if (result.carryoverCount > 0) {
            summary[playerId].skinsWon += result.carryoverCount
            summary[playerId].totalValue += result.carryoverCount
            totalSkinsWon += result.carryoverCount

            // Each carried over hole has value of 1
            result.carryoverFromHoles?.forEach(coHole => {
              const coResult = results[coHole]
              skinWins.push({
                hole: coHole,
                winnerId: playerId,
                value: 1,
                activePlayerIds: coResult?.activePlayers || result.activePlayers || skinsPlayers.map(p => String(p.id)),
                isCarryover: true,
                wonOnHole: hole
              })
            })
          }
        }
      }

      // Handle carryover winners (dual winner scenario)
      if (result.carryoverWinners?.length > 0) {
        result.carryoverWinners.forEach(cw => {
          const playerId = String(cw.playerId)
          if (summary[playerId]) {
            summary[playerId].skinsWon += cw.count
            summary[playerId].totalValue += cw.count
            summary[playerId].carryoverWins.push({
              wonOnHole: hole,
              fromHoles: cw.fromHoles,
              count: cw.count
            })
            totalSkinsWon += cw.count

            // Track each carryover win for payout calculation
            cw.fromHoles?.forEach(coHole => {
              skinWins.push({
                hole: coHole,
                winnerId: playerId,
                value: 1,
                activePlayerIds: cw.eligiblePlayerIds || [],
                isCarryover: true,
                wonOnHole: hole
              })
            })
          }
        })
      }
    })

    // Calculate payouts with eligibility-aware logic
    // Each skin: winner receives cost from each other ELIGIBLE player
    // Each player pays cost for each skin won on holes they were ACTIVE
    Object.keys(summary).forEach(pId => {
      const playerSummary = summary[pId]
      let amountWon = 0
      let amountPaid = 0

      // Amount won: for each skin this player won, they receive from each other eligible player
      skinWins.filter(sw => sw.winnerId === pId).forEach(sw => {
        const otherEligible = sw.activePlayerIds.filter(id => id !== pId)
        amountWon += sw.value * cost * otherEligible.length
      })

      // Amount paid: for each skin won by others, if this player was active, they pay
      skinWins.filter(sw => sw.winnerId !== pId).forEach(sw => {
        if (sw.activePlayerIds.includes(pId)) {
          amountPaid += sw.value * cost
        }
      })

      playerSummary.amountWon = amountWon
      playerSummary.amountPaid = amountPaid
      playerSummary.netAmount = amountWon - amountPaid
    })

    return { playerSummary: summary, totalSkinsWon, skinWins }
  }

  // Calculate greenies for Quick Skins (with eligibility tracking)
  const PAR_3_HOLES = [4, 8, 12, 17]

  const calculateGreenies = () => {
    if (!greeniesEnabled || skinsPlayers.length < 2) return {}

    const participantDetails = skinsMatch.participantDetails || {}
    const results = {}

    // Track pending carryovers with eligibility info
    let pendingCarryovers = []  // Array of { fromHole, eligiblePlayerIds }

    PAR_3_HOLES.forEach(hole => {
      const activePlayers = getActivePlayersForHole(hole, skinsPlayers)
      const activePlayerIds = activePlayers.map(p => String(p.id))

      // Check if any ACTIVE player hit the green
      const greenieData = liveRound.teams
        .flatMap(t => t.greenies?.[hole] ? [{ ...t.greenies[hole], teamId: t.id }] : [])
        .filter(g => g && g.playerId && activePlayerIds.includes(String(g.playerId)))
        .sort((a, b) => (a.distance || 999) - (b.distance || 999))[0]

      results[hole] = {
        winner: null,
        winnerName: null,
        distance: null,
        carryoverCount: 0,
        carryoverFromHoles: [],
        pot: greeniesCostPerHole * activePlayers.length,
        activePlayers: activePlayerIds,
        carryoverWinners: []  // For dual winner scenarios
      }

      if (greenieData?.playerId) {
        // We have a winner (distance is optional)
        results[hole].winner = greenieData.playerId
        results[hole].winnerName = greenieData.playerName || skinsPlayers.find(p => String(p.id) === String(greenieData.playerId))?.name
        results[hole].distance = greenieData.distance || null

        // Process pending carryovers - check eligibility
        if (greeniesCarryover && pendingCarryovers.length > 0) {
          const carryoversByEligibility = {}
          pendingCarryovers.forEach(co => {
            const key = [...co.eligiblePlayerIds].sort().join(',')
            if (!carryoversByEligibility[key]) {
              carryoversByEligibility[key] = { eligiblePlayerIds: co.eligiblePlayerIds, holes: [] }
            }
            carryoversByEligibility[key].holes.push(co.fromHole)
          })

          Object.values(carryoversByEligibility).forEach(group => {
            // Check if winner is eligible for these carryovers
            if (group.eligiblePlayerIds.includes(String(greenieData.playerId))) {
              // Winner is eligible - give them the carryovers
              results[hole].carryoverCount = (results[hole].carryoverCount || 0) + group.holes.length
              results[hole].carryoverFromHoles = [
                ...(results[hole].carryoverFromHoles || []),
                ...group.holes
              ]
            } else {
              // Winner not eligible - find closest eligible player
              const eligibleGreenies = liveRound.teams
                .flatMap(t => t.greenies?.[hole] ? [{ ...t.greenies[hole], teamId: t.id }] : [])
                .filter(g => g && g.playerId && group.eligiblePlayerIds.includes(String(g.playerId)))
                .sort((a, b) => (a.distance || 999) - (b.distance || 999))

              if (eligibleGreenies.length > 0 && eligibleGreenies[0].playerId) {
                const coWinner = eligibleGreenies[0]
                results[hole].carryoverWinners.push({
                  playerId: coWinner.playerId,
                  playerName: coWinner.playerName || skinsPlayers.find(p => String(p.id) === String(coWinner.playerId))?.name,
                  count: group.holes.length,
                  fromHoles: group.holes,
                  eligiblePlayerIds: group.eligiblePlayerIds
                })
              } else {
                // No eligible player with greenie - carryovers stay pending
                group.holes.forEach(h => {
                  pendingCarryovers.push({ fromHole: h, eligiblePlayerIds: group.eligiblePlayerIds })
                })
              }
            }
          })

          // Clear processed carryovers
          const wonHoles = new Set([
            ...(results[hole].carryoverFromHoles || []),
            ...results[hole].carryoverWinners.flatMap(cw => cw.fromHoles)
          ])
          pendingCarryovers = pendingCarryovers.filter(co => !wonHoles.has(co.fromHole))
        }
      } else {
        // No winner on this hole - add to pending carryovers
        if (greeniesCarryover) {
          pendingCarryovers.push({ fromHole: hole, eligiblePlayerIds: [...activePlayerIds] })
        }
      }
    })

    // If carryovers remain after ALL par 3 holes have been played, wrap to first par 3 winner
    // Only wrap if greeniesWrap is enabled and all par 3 holes have been completed
    const allPar3Completed = PAR_3_HOLES.every(hole => {
      const activePlayers = getActivePlayersForHole(hole, skinsPlayers)
      return activePlayers.every(player => {
        const score = player.scores?.[hole]
        return score !== undefined && score !== null && score !== ''
      })
    })

    if (greeniesCarryover && greeniesWrap && pendingCarryovers.length > 0 && allPar3Completed) {
      const carryoversByEligibility = {}
      pendingCarryovers.forEach(co => {
        const key = [...co.eligiblePlayerIds].sort().join(',')
        if (!carryoversByEligibility[key]) {
          carryoversByEligibility[key] = { eligiblePlayerIds: co.eligiblePlayerIds, holes: [] }
        }
        carryoversByEligibility[key].holes.push(co.fromHole)
      })

      Object.values(carryoversByEligibility).forEach(group => {
        for (const hole of PAR_3_HOLES) {
          if (!results[hole]?.winner) continue

          if (group.eligiblePlayerIds.includes(String(results[hole].winner))) {
            results[hole].carryoverCount = (results[hole].carryoverCount || 0) + group.holes.length
            results[hole].carryoverFromHoles = [
              ...(results[hole].carryoverFromHoles || []),
              ...group.holes
            ]
            break
          }

          // Check carryover winners
          const coWinner = results[hole].carryoverWinners?.find(cw =>
            group.eligiblePlayerIds.includes(String(cw.playerId))
          )
          if (coWinner) {
            coWinner.count += group.holes.length
            coWinner.fromHoles = [...coWinner.fromHoles, ...group.holes]
            break
          }
        }
      })
    }

    results.pendingCarryovers = pendingCarryovers
    return results
  }

  const getGreeniesSummary = (results) => {
    const participantDetails = skinsMatch?.participantDetails || {}
    const cost = greeniesCostPerHole

    const summary = {}
    skinsPlayers.forEach(p => {
      const details = participantDetails[String(p.id)] || {}
      summary[String(p.id)] = {
        greeniesWon: 0,
        totalPot: 0,
        holes: [],
        holeDetails: [], // { hole, playerCount, pot, isCarryover, wonOnHole }
        carryoverWins: [],
        joinedOnHole: details.joinedOnHole || 1,
        leftOnHole: details.leftOnHole || 18,
        isSettled: details.isSettled || false
      }
    })

    let totalGreeniesWon = 0
    const greenieWins = []  // Track wins for eligibility-aware payout

    Object.entries(results).forEach(([holeStr, result]) => {
      if (holeStr === 'pendingCarryovers') return
      const hole = parseInt(holeStr)
      const activePlayers = result.activePlayers || skinsPlayers.map(p => String(p.id))

      if (result.winner) {
        const playerId = String(result.winner)
        if (summary[playerId]) {
          const holePot = cost * (activePlayers.length - 1)
          summary[playerId].greeniesWon += 1
          summary[playerId].totalPot += holePot
          summary[playerId].holes.push(hole)
          summary[playerId].holeDetails.push({
            hole,
            playerCount: activePlayers.length,
            pot: holePot,
            isCarryover: false
          })
          totalGreeniesWon += 1

          greenieWins.push({
            hole,
            winnerId: playerId,
            activePlayerIds: activePlayers,
            isCarryover: false
          })

          if (result.carryoverCount > 0) {
            summary[playerId].greeniesWon += result.carryoverCount
            totalGreeniesWon += result.carryoverCount

            result.carryoverFromHoles?.forEach(coHole => {
              const coResult = results[coHole]
              const coActivePlayers = coResult?.activePlayers || activePlayers
              const coPot = cost * (coActivePlayers.length - 1)
              summary[playerId].totalPot += coPot
              summary[playerId].holeDetails.push({
                hole: coHole,
                playerCount: coActivePlayers.length,
                pot: coPot,
                isCarryover: true,
                wonOnHole: hole
              })
              greenieWins.push({
                hole: coHole,
                winnerId: playerId,
                activePlayerIds: coActivePlayers,
                isCarryover: true,
                wonOnHole: hole
              })
            })
          }
        }
      }

      // Handle carryover winners
      if (result.carryoverWinners?.length > 0) {
        result.carryoverWinners.forEach(cw => {
          const playerId = String(cw.playerId)
          if (summary[playerId]) {
            summary[playerId].greeniesWon += cw.count
            summary[playerId].carryoverWins.push({
              wonOnHole: hole,
              fromHoles: cw.fromHoles,
              count: cw.count
            })
            totalGreeniesWon += cw.count

            cw.fromHoles?.forEach(coHole => {
              const coResult = results[coHole]
              const coActivePlayers = coResult?.activePlayers || cw.eligiblePlayerIds
              const coPot = cost * (coActivePlayers.length - 1)
              summary[playerId].totalPot += coPot
              summary[playerId].holeDetails.push({
                hole: coHole,
                playerCount: coActivePlayers.length,
                pot: coPot,
                isCarryover: true,
                wonOnHole: hole
              })
              greenieWins.push({
                hole: coHole,
                winnerId: playerId,
                activePlayerIds: coActivePlayers,
                isCarryover: true,
                wonOnHole: hole
              })
            })
          }
        })
      }
    })

    // Calculate net amounts with eligibility-aware logic
    Object.keys(summary).forEach(playerId => {
      const playerSummary = summary[playerId]
      let amountWon = playerSummary.totalPot
      let amountPaid = 0

      // Amount paid: cost for each greenie hole the player was active but didn't win
      greenieWins.forEach(gw => {
        if (gw.activePlayerIds.includes(playerId) && gw.winnerId !== playerId) {
          amountPaid += cost
        }
      })

      // Also pay for holes where player was active but no winner yet
      PAR_3_HOLES.forEach(hole => {
        const activePlayers = results[hole]?.activePlayers || []
        if (activePlayers.includes(playerId)) {
          // Already counted in greenieWins if there was a winner
          const hasWinner = greenieWins.some(gw => gw.hole === hole && !gw.isCarryover)
          if (!hasWinner && !results[hole]?.winner) {
            // No winner on this hole, player still contributed to pot
            // This will be resolved later (carryover or pending)
          }
        }
      })

      playerSummary.amountWon = amountWon
      playerSummary.amountPaid = amountPaid
      playerSummary.netAmount = amountWon - amountPaid
    })

    return { playerSummary: summary, totalGreeniesWon, greenieWins }
  }

  const skinsResults = skinsMatch ? calculateSkins() : {}
  const { playerSummary, totalSkinsWon } = skinsMatch && skinsPlayers.length >= 2
    ? getSkinsSummary(skinsResults)
    : { playerSummary: {}, totalSkinsWon: 0 }

  const greenieResults = greeniesEnabled ? calculateGreenies() : {}
  const { playerSummary: greeniePlayerSummary, totalGreeniesWon } = greeniesEnabled && skinsPlayers.length >= 2
    ? getGreeniesSummary(greenieResults)
    : { playerSummary: {}, totalGreeniesWon: 0 }

  // Helper function to finalize settlement when a player leaves
  const finalizeSettlement = () => {
    if (!settlePlayer) return

    const playerId = String(settlePlayer.id)
    const skinsCost = parseFloat(skinsMatch?.settings?.costPerSkin) || 0
    const greenieCost = greeniesCostPerHole

    // Calculate resolved transactions
    const resolvedTransactions = []

    // Get skinWins for payout calculation
    const { skinWins } = getSkinsSummary(skinsResults)

    // For each other player, calculate what's owed (greeniesEnabled is defined at component level)
    const { greenieWins } = greeniesEnabled ? getGreeniesSummary(greenieResults) : { greenieWins: [] }

    skinsPlayers.filter(p => String(p.id) !== playerId && !playerSummary[String(p.id)]?.isSettled).forEach(otherPlayer => {
      const otherId = String(otherPlayer.id)
      let skinsOwedToOther = 0
      let skinsOwedFromOther = 0
      let greeniesOwedToOther = 0
      let greeniesOwedFromOther = 0

      // This player owes other for skins other won where this player was active
      skinWins.filter(sw => sw.winnerId === otherId && sw.activePlayerIds.includes(playerId)).forEach(sw => {
        skinsOwedToOther += sw.value * skinsCost
      })

      // Other owes this player for skins this player won where other was active
      skinWins.filter(sw => sw.winnerId === playerId && sw.activePlayerIds.includes(otherId)).forEach(sw => {
        skinsOwedFromOther += sw.value * skinsCost
      })

      // Similar for greenies if enabled
      if (greeniesEnabled) {
        greenieWins.filter(gw => gw.winnerId === otherId && gw.activePlayerIds.includes(playerId)).forEach(() => {
          greeniesOwedToOther += greenieCost
        })
        greenieWins.filter(gw => gw.winnerId === playerId && gw.activePlayerIds.includes(otherId)).forEach(() => {
          greeniesOwedFromOther += greenieCost
        })
      }

      const netSkins = skinsOwedFromOther - skinsOwedToOther
      const netGreenies = greeniesOwedFromOther - greeniesOwedToOther
      const netOwed = netSkins + netGreenies

      if (Math.abs(netOwed) > 0.01) {
        resolvedTransactions.push({
          withPlayerId: otherId,
          amount: Math.abs(netOwed),
          direction: netOwed > 0 ? 'collect' : 'owed',
          skinsAmount: Math.abs(netSkins),
          greeniesAmount: Math.abs(netGreenies)
        })
      }
    })

    // Calculate carryover collection if paying
    let carryoverCollectionData = null
    if (carryoverHandling === 'pay' && carryoverCollector) {
      const pendingCOs = skinsResults.pendingCarryovers || []
      const playerDetails = skinsMatch?.participantDetails?.[playerId] || {}
      const joinHole = playerDetails.joinedOnHole || 1
      const relevantCOs = pendingCOs.filter(co =>
        co.eligiblePlayerIds.includes(playerId) &&
        co.fromHole >= joinHole && co.fromHole <= settleLastHole
      )

      const prepayAmount = relevantCOs.length * skinsCost
      carryoverCollectionData = {
        collectedBy: carryoverCollector,
        amount: prepayAmount,
        forHoles: relevantCOs.map(co => co.fromHole)
      }
    }

    // Create settlement record
    const settlementRecord = {
      id: Date.now(),
      playerId,
      settledOnHole: settleLastHole,
      settledAt: new Date().toISOString(),
      resolvedTransactions,
      carryoverHandling,
      carryoverCollection: carryoverCollectionData
    }

    // Update skinsMatch
    const newDetails = {
      ...(skinsMatch?.participantDetails || {}),
      [playerId]: {
        ...(skinsMatch?.participantDetails?.[playerId] || {}),
        leftOnHole: settleLastHole,
        isSettled: true,
        settledOnHole: settleLastHole
      }
    }

    const newSettlements = [...(skinsMatch?.settlements || []), settlementRecord]

    // Set X scores for remaining holes for guest players
    let newGuestPlayers = skinsMatch?.guestPlayers || {}
    if (newGuestPlayers[playerId]) {
      const updatedScores = { ...newGuestPlayers[playerId].scores }
      for (let h = settleLastHole + 1; h <= 18; h++) {
        updatedScores[h] = 'X'
      }
      newGuestPlayers = {
        ...newGuestPlayers,
        [playerId]: {
          ...newGuestPlayers[playerId],
          scores: updatedScores
        }
      }
    }

    // Set X scores for remaining holes and mark as DNF for regular players in liveRound
    if (liveRound) {
      const updatedTeams = liveRound.teams.map(team => ({
        ...team,
        players: team.players.map(player => {
          if (String(player.id) === playerId) {
            const updatedScores = { ...player.scores }
            for (let h = settleLastHole + 1; h <= 18; h++) {
              updatedScores[h] = 'X'
            }
            return { ...player, scores: updatedScores, isDNF: true }
          }
          return player
        })
      }))
      setLiveRound({ ...liveRound, teams: updatedTeams })
    }

    setSkinsMatch({
      ...skinsMatch,
      participantDetails: newDetails,
      settlements: newSettlements,
      guestPlayers: newGuestPlayers
    })

    // Reset modal state
    setShowSettleModal(false)
    setSettlePlayer(null)
    setSettleStep(1)
    setCarryoverHandling('pay')
    setCarryoverCollector(null)
  }

  if (!skinsMatch) {
    return (
      <div>
        <div style={{
          background: '#fff3e0',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: '15px' }}>No {isCasualGame ? 'Skins' : 'Side Skins'} Match Active</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Set up a {isCasualGame ? 'skins' : 'side skins'} match to track individual hole winners.
          </p>
          <button className="btn btn-primary" onClick={() => setShowSetup(true)}>
            Setup {isCasualGame ? 'Skins' : 'Side Skins'} Match
          </button>
        </div>

        {showSetup && (
          <div className="modal-overlay" onClick={() => setShowSetup(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' }}>
                <h3 style={{ color: 'white', margin: 0 }}>{isCasualGame ? 'Skins' : 'Side Skins'} Match Settings</h3>
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={settings.parOrBetterRequired} onChange={e => setSettings({ ...settings, parOrBetterRequired: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                    <span>Par or better required to win</span>
                  </label>

                  {/* Score Multipliers */}
                  <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '13px' }}>Score Multipliers</div>

                    {/* Birdie */}
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', marginBottom: '4px', color: '#666' }}>Birdie (1 under)</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[1, 2].map(val => (
                          <button
                            key={val}
                            onClick={() => {
                              // Cascade down: if setting birdie to X, set lower scores to at least X
                              const newSettings = { ...settings, birdieMultiplier: val }
                              if (val > 1) {
                                if ((settings.eagleMultiplier || 1) < val) newSettings.eagleMultiplier = val
                                if ((settings.doubleEagleMultiplier || 1) < val) newSettings.doubleEagleMultiplier = val
                                if ((settings.holeInOneMultiplier || 1) < val) newSettings.holeInOneMultiplier = val
                              }
                              setSettings(newSettings)
                            }}
                            style={{
                              flex: 1, padding: '6px', borderRadius: '4px', fontSize: '11px',
                              border: (settings.birdieMultiplier || 1) === val ? '2px solid #9c27b0' : '1px solid #ddd',
                              background: (settings.birdieMultiplier || 1) === val ? '#f3e5f5' : 'white',
                              fontWeight: (settings.birdieMultiplier || 1) === val ? '600' : 'normal',
                              cursor: 'pointer'
                            }}
                          >
                            {val === 1 ? 'Off' : `×${val}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Eagle */}
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', marginBottom: '4px', color: '#666' }}>Eagle (2 under)</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[1, 2, 3].map(val => (
                          <button
                            key={val}
                            onClick={() => {
                              // Cascade down: if setting eagle to X, set lower scores to at least X
                              const newSettings = { ...settings, eagleMultiplier: val }
                              if (val > 1) {
                                if ((settings.doubleEagleMultiplier || 1) < val) newSettings.doubleEagleMultiplier = val
                                if ((settings.holeInOneMultiplier || 1) < val) newSettings.holeInOneMultiplier = val
                              }
                              setSettings(newSettings)
                            }}
                            style={{
                              flex: 1, padding: '6px', borderRadius: '4px', fontSize: '11px',
                              border: (settings.eagleMultiplier || 1) === val ? '2px solid #9c27b0' : '1px solid #ddd',
                              background: (settings.eagleMultiplier || 1) === val ? '#f3e5f5' : 'white',
                              fontWeight: (settings.eagleMultiplier || 1) === val ? '600' : 'normal',
                              cursor: 'pointer'
                            }}
                          >
                            {val === 1 ? 'Off' : `×${val}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Double Eagle */}
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', marginBottom: '4px', color: '#666' }}>Double Eagle (3 under)</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[1, 2, 3, 4].map(val => (
                          <button
                            key={val}
                            onClick={() => {
                              // Cascade down: if setting double eagle to X, set hole-in-one to at least X
                              const newSettings = { ...settings, doubleEagleMultiplier: val }
                              if (val > 1 && (settings.holeInOneMultiplier || 1) < val) {
                                newSettings.holeInOneMultiplier = val
                              }
                              setSettings(newSettings)
                            }}
                            style={{
                              flex: 1, padding: '6px', borderRadius: '4px', fontSize: '11px',
                              border: (settings.doubleEagleMultiplier || 1) === val ? '2px solid #9c27b0' : '1px solid #ddd',
                              background: (settings.doubleEagleMultiplier || 1) === val ? '#f3e5f5' : 'white',
                              fontWeight: (settings.doubleEagleMultiplier || 1) === val ? '600' : 'normal',
                              cursor: 'pointer'
                            }}
                          >
                            {val === 1 ? 'Off' : `×${val}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hole in One */}
                    <div>
                      <div style={{ fontSize: '11px', marginBottom: '4px', color: '#666' }}>Hole in One</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[1, 2, 3, 4, 5].map(val => (
                          <button
                            key={val}
                            onClick={() => setSettings({ ...settings, holeInOneMultiplier: val })}
                            style={{
                              flex: 1, padding: '6px', borderRadius: '4px', fontSize: '11px',
                              border: (settings.holeInOneMultiplier || 1) === val ? '2px solid #9c27b0' : '1px solid #ddd',
                              background: (settings.holeInOneMultiplier || 1) === val ? '#f3e5f5' : 'white',
                              fontWeight: (settings.holeInOneMultiplier || 1) === val ? '600' : 'normal',
                              cursor: 'pointer'
                            }}
                          >
                            {val === 1 ? 'Off' : `×${val}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Greenies Settings — only for casual/quick skins; league rounds already have greenies */}
                {isCasualGame && (
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
                )}

                <button className="btn btn-primary" onClick={setupSkinsMatch} style={{ width: '100%', marginTop: '10px' }}>
                  Start {isCasualGame ? 'Skins' : 'Side Skins'} Match
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
          <span>{isCasualGame ? 'Skins' : 'Side Skins'} Match</span>
          <span style={{ fontSize: '13px', opacity: 0.9 }}>
            ${skinsMatch.settings.costPerSkin}/skin - {skinsPlayers.length} players
          </span>
        </div>

        {/* Settings Summary */}
        <div style={{ padding: '10px 15px', background: '#fff8e1', fontSize: '12px', color: '#666', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {skinsMatch.settings.carryovers && <span>Carryovers</span>}
          {skinsMatch.settings.carryovers && skinsMatch.settings.wrapUnwonSkins && <span>Wrap to {skinsMatch.settings.wrapTo === 'front' ? 'Front 9' : 'Back 9'}</span>}
          {skinsMatch.settings.parOrBetterRequired && <span>Par or Better</span>}
          {/* Backwards compatibility for old setting */}
          {skinsMatch.settings.birdieDoubleEagleTriple && <span>Birdie ×2/Eagle ×3</span>}
          {/* New flexible multipliers */}
          {!skinsMatch.settings.birdieDoubleEagleTriple && (() => {
            const s = skinsMatch.settings
            const parts = []
            if (s.birdieMultiplier > 1) parts.push(`Birdie ×${s.birdieMultiplier}`)
            if (s.eagleMultiplier > 1) parts.push(`Eagle ×${s.eagleMultiplier}`)
            if (s.doubleEagleMultiplier > 1) parts.push(`Dbl Eagle ×${s.doubleEagleMultiplier}`)
            if (s.holeInOneMultiplier > 1) parts.push(`HIO ×${s.holeInOneMultiplier}`)
            return parts.length > 0 ? <span style={{ color: '#9c27b0' }}>{parts.join(', ')}</span> : null
          })()}
          {greeniesEnabled && (
            <span style={{ color: '#27ae60', fontWeight: '600' }}>
              Greenies ${greeniesCostPerHole}/hole {greeniesCarryover && '(carryovers)'}
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

      {/* Admin/Casual Manage Players */}
      {(isAdmin || isCasualGame) && (
        <div style={{ background: 'white', borderRadius: '10px', padding: '15px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>
              {isCasualGame ? 'Players' : 'Manage Players (Admin)'}
            </div>
            {!isCasualGame && (
              <button
                onClick={() => setShowAddPlayerModal(true)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#27ae60',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                + Add Mid-Round
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {allPlayersIncludingSettled.map(player => {
              const playerId = String(player.id)
              const inSkins = isCasualGame || skinsMatch.participants.includes(playerId)
              const details = skinsMatch.participantDetails?.[playerId] || {}
              const isSettled = details.isSettled
              const joinHole = details.joinedOnHole || 1
              const leftHole = details.leftOnHole

              return (
                <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => !isCasualGame && !isSettled && handleToggleParticipant(player.id)}
                    disabled={isCasualGame || isSettled}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '20px',
                      border: isSettled ? '2px solid #95a5a6' : inSkins ? '2px solid #27ae60' : '2px solid #ddd',
                      background: isSettled ? '#ecf0f1' : inSkins ? '#e8f8f5' : 'white',
                      color: isSettled ? '#7f8c8d' : inSkins ? '#27ae60' : '#666',
                      fontSize: '12px',
                      fontWeight: inSkins ? '600' : 'normal',
                      cursor: isCasualGame ? 'default' : isSettled ? 'not-allowed' : 'pointer',
                      opacity: isSettled ? 0.7 : 1
                    }}
                  >
                    {inSkins && !isSettled ? '✓ ' : ''}{player.name}
                    {inSkins && !isSettled && joinHole > 1 && <span style={{ fontSize: '10px', marginLeft: '4px' }}>(h{joinHole}+)</span>}
                    {isSettled && <span style={{ fontSize: '10px', marginLeft: '4px' }}>({leftHole > 0 ? `settled h${leftHole}` : 'left before playing'})</span>}
                  </button>
                  {inSkins && !isSettled && (
                    <button
                      onClick={() => {
                        setSettlePlayer(player)
                        setSettleLastHole(0)
                        setSettleStep(1)
                        setShowSettleModal(true)
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #e67e22',
                        background: 'white',
                        color: '#e67e22',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                      title="Settle & Leave"
                    >
                      Settle
                    </button>
                  )}
                </div>
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
                          // (i.e., this hole is in another hole's carryoverFromHoles/carryoverWinners)
                          for (const [otherHole, otherResult] of Object.entries(skinsResults)) {
                            // Check carryoverFromHoles (when hole winner also won carryovers)
                            if (otherResult.winner === player.id &&
                                otherResult.carryoverFromHoles &&
                                otherResult.carryoverFromHoles.includes(h.hole)) {
                              bgColor = '#e8f5e9'  // Lighter green for carryover win
                              borderColor = '#81c784'
                              isCarryoverWin = true
                              break
                            }
                            // Check carryoverWinners (dual winner scenario - different player won carryovers)
                            const coWin = otherResult.carryoverWinners?.find(cw =>
                              cw.playerId === player.id && cw.fromHoles?.includes(h.hole)
                            )
                            if (coWin) {
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
                            // Check carryoverFromHoles
                            if (otherResult.carryoverFromHoles &&
                                otherResult.carryoverFromHoles.includes(h.hole)) {
                              claimedViaCarryover = true
                              break
                            }
                            // Check carryoverWinners (dual winner scenario)
                            if (otherResult.carryoverWinners?.some(cw => cw.fromHoles?.includes(h.hole))) {
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
                            {holeResult.winner === player.id && holeResult.skinValue > 1 && (
                              <div style={{ fontSize: '8px', color: '#9c27b0', fontWeight: '700', marginTop: '1px' }}>
                                ×{holeResult.skinValue}
                              </div>
                            )}
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
                        {(() => {
                          const s = skinsMatch.settings
                          const hasMultipliers = s.birdieDoubleEagleTriple || s.birdieMultiplier > 1 || s.eagleMultiplier > 1 || s.doubleEagleMultiplier > 1 || s.holeInOneMultiplier > 1
                          return hasMultipliers && pSummary.totalValue !== pSummary.skinsWon
                            ? <span>{pSummary.totalValue} <span style={{ fontSize: '9px', color: '#9c27b0' }}>({pSummary.skinsWon})</span></span>
                            : pSummary.skinsWon
                        })()}
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
            {/* Show multiplier legend if any multipliers are active */}
            {(skinsMatch.settings.birdieDoubleEagleTriple ||
              skinsMatch.settings.birdieMultiplier > 1 ||
              skinsMatch.settings.eagleMultiplier > 1 ||
              skinsMatch.settings.doubleEagleMultiplier > 1 ||
              skinsMatch.settings.holeInOneMultiplier > 1) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#9c27b0', fontWeight: '700' }}>×N</span> Multiplier
              </span>
            )}
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
      {greeniesEnabled && skinsPlayers.length >= 2 && (
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
              ${greeniesCostPerHole}/hole × {skinsPlayers.length} players = ${(greeniesCostPerHole * (skinsPlayers.length - 1)).toFixed(2)} won
            </span>
          </div>
          <div style={{ padding: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {PAR_3_HOLES.map(hole => {
                const result = greenieResults[hole] || {}
                const hasCarryover = result.carryoverCount > 0
                const activeCount = result.activePlayers?.length || skinsPlayers.length
                const totalPot = (1 + (result.carryoverCount || 0)) * greeniesCostPerHole * (activeCount - 1)
                const holePot = greeniesCostPerHole * (activeCount - 1)

                // Check if this hole was won via carryover on another hole
                let carryoverWonBy = null
                let carryoverWonOnHole = null
                if (!result.winner && greeniesCarryover) {
                  for (const [otherHoleStr, otherResult] of Object.entries(greenieResults)) {
                    if (otherHoleStr === 'pendingCarryovers') continue
                    const otherHole = parseInt(otherHoleStr)
                    // Check carryoverFromHoles (winner won the carryovers)
                    if (otherResult.carryoverFromHoles?.includes(hole)) {
                      carryoverWonBy = otherResult.winnerName
                      carryoverWonOnHole = otherHole
                      break
                    }
                    // Check carryoverWinners (different player won carryovers)
                    const coWin = otherResult.carryoverWinners?.find(cw => cw.fromHoles?.includes(hole))
                    if (coWin) {
                      carryoverWonBy = coWin.playerName
                      carryoverWonOnHole = otherHole
                      break
                    }
                  }
                }

                return (
                  <div key={hole} style={{
                    background: result.winner
                      ? (hasCarryover ? '#e8f5e9' : '#d4edda')
                      : (carryoverWonBy ? '#fff3e0' : '#f8f9fa'),
                    padding: '12px 8px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: result.winner
                      ? '2px solid #27ae60'
                      : (carryoverWonBy ? '2px solid #f39c12' : '1px solid #ddd')
                  }}>
                    <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>#{hole}</div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>Par 3</div>
                    {result.winner ? (
                      <>
                        <div style={{ fontWeight: '600', color: '#27ae60', fontSize: '13px' }}>
                          {result.winnerName || 'Winner'}
                        </div>
                        {result.distance && (
                          <div style={{ fontSize: '11px', color: '#666' }}>{result.distance}</div>
                        )}
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#27ae60', marginTop: '4px' }}>
                          ${holePot.toFixed(2)}
                        </div>
                        {hasCarryover && (
                          <div style={{ fontSize: '10px', color: '#2e7d32', marginTop: '2px' }}>
                            +{result.carryoverCount} carryover{result.carryoverCount > 1 ? 's' : ''}
                          </div>
                        )}
                      </>
                    ) : carryoverWonBy ? (
                      <>
                        <div style={{ fontWeight: '600', color: '#e67e22', fontSize: '13px' }}>
                          {carryoverWonBy}
                        </div>
                        <div style={{
                          fontSize: '10px',
                          color: '#e67e22',
                          background: '#fff3e0',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          marginTop: '2px',
                          fontWeight: '600'
                        }}>
                          ↗ Won on #{carryoverWonOnHole}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                          ${holePot.toFixed(2)}
                        </div>
                      </>
                    ) : (
                      <div style={{ color: '#999', fontSize: '12px' }}>
                        No winner
                        {greeniesCarryover && <div style={{ fontSize: '10px' }}>→ carries over</div>}
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
                      <div key={player.id} style={{ background: '#e8f5e9', borderRadius: '4px', marginBottom: '6px', padding: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600' }}>{player.name}</span>
                          <span style={{ color: '#27ae60', fontWeight: '700' }}>${summary.totalPot?.toFixed(2)}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {summary.holeDetails?.map((detail, idx) => (
                            <span key={idx} style={{
                              background: detail.isCarryover ? '#fff3e0' : '#d4edda',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: detail.isCarryover ? '1px solid #f39c12' : '1px solid #27ae60'
                            }}>
                              #{detail.hole} ({detail.playerCount}p = ${detail.pot.toFixed(2)})
                              {detail.isCarryover && <span style={{ color: '#e67e22' }}> ↗{detail.wonOnHole}</span>}
                            </span>
                          ))}
                        </div>
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
                const playerId = String(player.id)
                const skinsSummary = playerSummary[playerId] || {}
                const greenieSummary = greeniePlayerSummary[playerId] || {}
                const skinsNet = skinsSummary.netAmount || 0
                const greeniesNet = greenieSummary.netAmount || 0
                const totalNet = skinsNet + greeniesNet
                const details = skinsMatch.participantDetails?.[playerId] || {}
                const isSettled = details.isSettled
                const joinHole = details.joinedOnHole || 1
                const leftHole = details.leftOnHole

                return (
                  <div key={player.id} style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid #eee',
                    background: isSettled ? '#f5f5f5' : 'transparent',
                    opacity: isSettled ? 0.8 : 1
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <strong>{player.name}</strong>
                        {(joinHole > 1 || leftHole) && (
                          <span style={{ fontSize: '10px', color: '#999', marginLeft: '4px' }}>
                            (h{joinHole}{leftHole ? `-${leftHole}` : '-18'})
                          </span>
                        )}
                        {isSettled && (
                          <span style={{ fontSize: '10px', color: '#e67e22', marginLeft: '6px', fontWeight: '600' }}>
                            SETTLED
                          </span>
                        )}
                      </span>
                      <span style={{
                        fontWeight: '700',
                        color: totalNet > 0 ? '#27ae60' : totalNet < 0 ? '#e74c3c' : '#666'
                      }}>
                        {totalNet >= 0 ? '+' : ''}${totalNet.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px', display: 'flex', gap: '12px' }}>
                      <span>
                        Skins: {(() => {
                          const s = skinsMatch.settings
                          const hasMultipliers = s.birdieDoubleEagleTriple || s.birdieMultiplier > 1 || s.eagleMultiplier > 1 || s.doubleEagleMultiplier > 1 || s.holeInOneMultiplier > 1
                          const totalVal = skinsSummary.totalValue || 0
                          const skinsWon = skinsSummary.skinsWon || 0
                          return hasMultipliers && totalVal !== skinsWon
                            ? <>{totalVal} <span style={{ fontSize: '9px', color: '#9c27b0' }}>({skinsWon})</span></>
                            : skinsWon
                        })()} won
                        <span style={{ color: skinsNet >= 0 ? '#27ae60' : '#e74c3c', marginLeft: '4px' }}>
                          ({skinsNet >= 0 ? '+' : ''}${skinsNet.toFixed(2)})
                        </span>
                      </span>
                      {greeniesEnabled && (
                        <span>
                          Greenies: {greenieSummary.greeniesWon || 0} won
                          <span style={{ color: greeniesNet >= 0 ? '#27ae60' : '#e74c3c', marginLeft: '4px' }}>
                            ({greeniesNet >= 0 ? '+' : ''}${greeniesNet.toFixed(2)})
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Settled Players Summary */}
          {skinsMatch.settlements?.length > 0 && (
            <div style={{
              borderTop: '2px solid #e67e22',
              padding: '10px 15px',
              background: '#fff8e1'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '13px', color: '#e67e22' }}>
                Early Settlements
              </div>
              {skinsMatch.settlements.map((settlement, idx) => {
                const player = skinsPlayers.find(p => String(p.id) === settlement.playerId)
                return (
                  <div key={idx} style={{
                    background: 'white',
                    padding: '10px',
                    borderRadius: '6px',
                    marginBottom: idx < skinsMatch.settlements.length - 1 ? '8px' : 0,
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                      {player?.name || 'Unknown'} - Settled on hole {settlement.settledOnHole}
                    </div>
                    {settlement.resolvedTransactions?.map((tx, txIdx) => {
                      const otherPlayer = skinsPlayers.find(p => String(p.id) === tx.withPlayerId)
                      const hasBreakdown = tx.skinsAmount !== undefined || tx.greeniesAmount !== undefined
                      return (
                        <div key={txIdx} style={{ color: '#666', fontSize: '11px', marginLeft: '10px' }}>
                          {tx.direction === 'owed' ? (
                            <span>Owed {otherPlayer?.name}: <span style={{ color: '#e74c3c' }}>${tx.amount.toFixed(2)}</span></span>
                          ) : (
                            <span>Collected from {otherPlayer?.name}: <span style={{ color: '#27ae60' }}>${tx.amount.toFixed(2)}</span></span>
                          )}
                          {hasBreakdown && (tx.skinsAmount > 0.01 || tx.greeniesAmount > 0.01) && (
                            <span style={{ color: '#999', marginLeft: '6px' }}>
                              ({tx.skinsAmount > 0.01 && `Skins: $${tx.skinsAmount.toFixed(2)}`}
                              {tx.skinsAmount > 0.01 && tx.greeniesAmount > 0.01 && ', '}
                              {tx.greeniesAmount > 0.01 && `Greenies: $${tx.greeniesAmount.toFixed(2)}`})
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {settlement.carryoverCollection && (
                      <div style={{ color: '#e67e22', fontSize: '11px', marginLeft: '10px', marginTop: '4px' }}>
                        Paid ${settlement.carryoverCollection.amount.toFixed(2)} for carryovers (held by {skinsPlayers.find(p => String(p.id) === settlement.carryoverCollection.collectedBy)?.name})
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Who Owes Who - Only for active (non-settled) players */}
          <div style={{
            borderTop: '2px solid #27ae60',
            padding: '10px 15px',
            background: '#f8fff8'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '13px', color: '#27ae60' }}>
              Who Owes Who (Active Players)
            </div>
            {(() => {
              const skinsCost = parseFloat(skinsMatch.settings.costPerSkin) || 0
              const greenieCost = greeniesCostPerHole
              const settlements = []

              // Get skinWins and greenieWins for eligibility-aware calculations
              const { skinWins } = getSkinsSummary(skinsResults)
              const { greenieWins } = greeniesEnabled ? getGreeniesSummary(greenieResults) : { greenieWins: [] }

              // Only consider active (non-settled) players
              const activePlayers = skinsPlayers.filter(p => !playerSummary[String(p.id)]?.isSettled)

              for (let i = 0; i < activePlayers.length; i++) {
                for (let j = i + 1; j < activePlayers.length; j++) {
                  const playerA = activePlayers[i]
                  const playerB = activePlayers[j]
                  const playerAId = String(playerA.id)
                  const playerBId = String(playerB.id)

                  let aOwesBSkins = 0
                  let bOwesASkins = 0
                  let aOwesBGreenies = 0
                  let bOwesAGreenies = 0

                  // Use skinWins for eligibility-aware calculation
                  skinWins.forEach(sw => {
                    const aWasActive = sw.activePlayerIds.includes(playerAId)
                    const bWasActive = sw.activePlayerIds.includes(playerBId)

                    if (sw.winnerId === playerBId && aWasActive) {
                      aOwesBSkins += sw.value * skinsCost
                    }
                    if (sw.winnerId === playerAId && bWasActive) {
                      bOwesASkins += sw.value * skinsCost
                    }
                  })

                  // Use greenieWins for eligibility-aware calculation
                  if (greeniesEnabled) {
                    greenieWins.forEach(gw => {
                      const aWasActive = gw.activePlayerIds.includes(playerAId)
                      const bWasActive = gw.activePlayerIds.includes(playerBId)

                      if (gw.winnerId === playerBId && aWasActive) {
                        aOwesBGreenies += greenieCost
                      }
                      if (gw.winnerId === playerAId && bWasActive) {
                        bOwesAGreenies += greenieCost
                      }
                    })
                  }

                  const netSkins = aOwesBSkins - bOwesASkins
                  const netGreenies = aOwesBGreenies - bOwesAGreenies
                  const netOwed = netSkins + netGreenies

                  if (Math.abs(netOwed) > 0.001) {
                    if (netOwed > 0) {
                      settlements.push({
                        from: playerA.name,
                        to: playerB.name,
                        amount: netOwed,
                        skins: Math.abs(netSkins),
                        greenies: Math.abs(netGreenies),
                        skinsDirection: netSkins >= 0 ? 'owed' : 'collect',
                        greeniesDirection: netGreenies >= 0 ? 'owed' : 'collect'
                      })
                    } else {
                      settlements.push({
                        from: playerB.name,
                        to: playerA.name,
                        amount: -netOwed,
                        skins: Math.abs(netSkins),
                        greenies: Math.abs(netGreenies),
                        skinsDirection: netSkins <= 0 ? 'owed' : 'collect',
                        greeniesDirection: netGreenies <= 0 ? 'owed' : 'collect'
                      })
                    }
                  }
                }
              }

              if (settlements.length === 0) {
                return <div style={{ color: '#666', fontSize: '12px' }}>Everyone is even!</div>
              }

              const paidSettlements = skinsMatch.paidSettlements || {}
              // Calculate paid/remaining for each settlement
              const getSettlementStatus = (s) => {
                const key = `${s.from}->${s.to}`
                const paid = paidSettlements[key]
                if (!paid) return { paidAmount: 0, remaining: s.amount, isFullyPaid: false }
                // Legacy support: true means fully paid at some point
                const paidAmount = typeof paid === 'number' ? paid : s.amount
                const remaining = Math.max(0, s.amount - paidAmount)
                return { paidAmount, remaining, isFullyPaid: remaining < 0.01 }
              }
              const paidCount = settlements.filter(s => getSettlementStatus(s).isFullyPaid).length
              const remainingCount = settlements.length - paidCount
              const togglePaid = (from, to, currentAmount) => {
                const key = `${from}->${to}`
                const existing = paidSettlements[key]
                if (existing && (typeof existing === 'number' ? existing >= currentAmount - 0.01 : true)) {
                  // Uncheck: clear payment record
                  const newPaidSettlements = { ...paidSettlements }
                  delete newPaidSettlements[key]
                  setSkinsMatch({ ...skinsMatch, paidSettlements: newPaidSettlements })
                } else {
                  // Check: record current total amount as paid
                  const newPaidSettlements = { ...paidSettlements, [key]: currentAmount }
                  setSkinsMatch({ ...skinsMatch, paidSettlements: newPaidSettlements })
                }
              }

              // Sort: unpaid first, then partial, then fully paid
              const sortedSettlements = [...settlements].sort((a, b) => {
                const aStatus = getSettlementStatus(a)
                const bStatus = getSettlementStatus(b)
                const aOrder = aStatus.isFullyPaid ? 2 : aStatus.paidAmount > 0 ? 1 : 0
                const bOrder = bStatus.isFullyPaid ? 2 : bStatus.paidAmount > 0 ? 1 : 0
                return aOrder - bOrder
              })

              return (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                    padding: '6px 10px',
                    background: remainingCount === 0 ? '#d4edda' : '#fff3cd',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    <span>
                      {remainingCount === 0 ? (
                        <span style={{ color: '#27ae60', fontWeight: '600' }}>✓ All payments complete!</span>
                      ) : (
                        <span style={{ color: '#856404' }}>
                          <strong>{remainingCount}</strong> payment{remainingCount !== 1 ? 's' : ''} remaining
                        </span>
                      )}
                    </span>
                    {paidCount > 0 && (
                      <span style={{ color: '#666' }}>
                        {paidCount} of {settlements.length} paid
                      </span>
                    )}
                  </div>
                  {sortedSettlements.map((s, idx) => {
                const status = getSettlementStatus(s)
                const hasPartialPayment = status.paidAmount > 0 && !status.isFullyPaid
                return (
                  <div key={idx} style={{
                    padding: '8px 0',
                    borderBottom: idx < sortedSettlements.length - 1 ? '1px solid #e8f5e9' : 'none',
                    fontSize: '13px',
                    opacity: status.isFullyPaid ? 0.75 : 1
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '10px' }}>
                        <input
                          type="checkbox"
                          checked={status.isFullyPaid}
                          onChange={() => togglePaid(s.from, s.to, s.amount)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </label>
                      <span style={{
                        color: '#e74c3c',
                        fontWeight: '600',
                        textDecoration: status.isFullyPaid ? 'line-through' : 'none'
                      }}>{s.from}</span>
                      <span style={{ margin: '0 8px', color: '#666' }}>→</span>
                      <span style={{
                        color: '#27ae60',
                        fontWeight: '600',
                        textDecoration: status.isFullyPaid ? 'line-through' : 'none'
                      }}>{s.to}</span>
                      <span style={{
                        marginLeft: 'auto',
                        fontWeight: '700',
                        color: status.isFullyPaid ? '#999' : '#333',
                        textDecoration: status.isFullyPaid ? 'line-through' : 'none'
                      }}>
                        ${s.amount.toFixed(2)}
                      </span>
                      {status.isFullyPaid && (
                        <span style={{ marginLeft: '8px', color: '#27ae60', fontSize: '11px', fontWeight: '600' }}>
                          ✓ PAID
                        </span>
                      )}
                    </div>
                    {hasPartialPayment && (
                      <div style={{ marginLeft: '38px', marginTop: '4px', padding: '4px 8px', background: '#fff3cd', borderRadius: '4px', fontSize: '11px', border: '1px solid #ffc107', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#856404' }}>
                          Paid ${status.paidAmount.toFixed(2)} earlier — <strong>${status.remaining.toFixed(2)} additional owed</strong>
                        </span>
                        <button
                          onClick={() => {
                            const key = `${s.from}->${s.to}`
                            const newPaidSettlements = { ...paidSettlements }
                            delete newPaidSettlements[key]
                            setSkinsMatch({ ...skinsMatch, paidSettlements: newPaidSettlements })
                          }}
                          style={{
                            padding: '2px 8px',
                            background: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: '600',
                            marginLeft: '8px',
                            flexShrink: 0
                          }}
                        >
                          Undo
                        </button>
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: '#888', marginTop: '2px', marginLeft: '38px', display: 'flex', gap: '12px' }}>
                      {s.skins > 0.001 && <span>Skins: ${s.skins.toFixed(2)}</span>}
                      {greeniesEnabled && s.greenies > 0.001 && <span>Greenies: ${s.greenies.toFixed(2)}</span>}
                    </div>
                  </div>
                )
              })}
                </>
              )
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

                {/* Score Multipliers */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>Score Multipliers</label>

                  {/* Birdie */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', marginBottom: '4px', color: '#666' }}>Birdie (1 under par)</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2].map(val => (
                        <button
                          key={val}
                          onClick={() => {
                            // Cascade down: if setting birdie to X, set lower scores to at least X
                            const newSettings = { ...editSettings, birdieMultiplier: val, birdieDoubleEagleTriple: false }
                            if (val > 1) {
                              if ((editSettings.eagleMultiplier || 1) < val) newSettings.eagleMultiplier = val
                              if ((editSettings.doubleEagleMultiplier || 1) < val) newSettings.doubleEagleMultiplier = val
                              if ((editSettings.holeInOneMultiplier || 1) < val) newSettings.holeInOneMultiplier = val
                            }
                            setEditSettings(newSettings)
                          }}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px',
                            border: (editSettings.birdieMultiplier || 1) === val ? '2px solid #9c27b0' : '2px solid #ddd',
                            background: (editSettings.birdieMultiplier || 1) === val ? '#f3e5f5' : 'white',
                            fontWeight: (editSettings.birdieMultiplier || 1) === val ? '600' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          {val === 1 ? 'Off' : `×${val}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Eagle */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', marginBottom: '4px', color: '#666' }}>Eagle (2 under par)</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3].map(val => (
                        <button
                          key={val}
                          onClick={() => {
                            // Cascade down: if setting eagle to X, set lower scores to at least X
                            const newSettings = { ...editSettings, eagleMultiplier: val, birdieDoubleEagleTriple: false }
                            if (val > 1) {
                              if ((editSettings.doubleEagleMultiplier || 1) < val) newSettings.doubleEagleMultiplier = val
                              if ((editSettings.holeInOneMultiplier || 1) < val) newSettings.holeInOneMultiplier = val
                            }
                            setEditSettings(newSettings)
                          }}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px',
                            border: (editSettings.eagleMultiplier || 1) === val ? '2px solid #9c27b0' : '2px solid #ddd',
                            background: (editSettings.eagleMultiplier || 1) === val ? '#f3e5f5' : 'white',
                            fontWeight: (editSettings.eagleMultiplier || 1) === val ? '600' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          {val === 1 ? 'Off' : `×${val}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Double Eagle */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', marginBottom: '4px', color: '#666' }}>Double Eagle / Albatross (3 under par)</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4].map(val => (
                        <button
                          key={val}
                          onClick={() => {
                            // Cascade down: if setting double eagle to X, set hole-in-one to at least X
                            const newSettings = { ...editSettings, doubleEagleMultiplier: val, birdieDoubleEagleTriple: false }
                            if (val > 1 && (editSettings.holeInOneMultiplier || 1) < val) {
                              newSettings.holeInOneMultiplier = val
                            }
                            setEditSettings(newSettings)
                          }}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px',
                            border: (editSettings.doubleEagleMultiplier || 1) === val ? '2px solid #9c27b0' : '2px solid #ddd',
                            background: (editSettings.doubleEagleMultiplier || 1) === val ? '#f3e5f5' : 'white',
                            fontWeight: (editSettings.doubleEagleMultiplier || 1) === val ? '600' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          {val === 1 ? 'Off' : `×${val}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hole in One */}
                  <div>
                    <div style={{ fontSize: '12px', marginBottom: '4px', color: '#666' }}>Hole in One</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map(val => (
                        <button
                          key={val}
                          onClick={() => setEditSettings({ ...editSettings, holeInOneMultiplier: val, birdieDoubleEagleTriple: false })}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '6px', fontSize: '12px',
                            border: (editSettings.holeInOneMultiplier || 1) === val ? '2px solid #9c27b0' : '2px solid #ddd',
                            background: (editSettings.holeInOneMultiplier || 1) === val ? '#f3e5f5' : 'white',
                            fontWeight: (editSettings.holeInOneMultiplier || 1) === val ? '600' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          {val === 1 ? 'Off' : `×${val}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Greenies Settings — only for casual/quick skins; league rounds already have greenies */}
                {isCasualGame && (
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
                )}

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
            <h3 style={{ marginBottom: '15px', color: '#e74c3c' }}>Cancel {isCasualGame ? 'Skins' : 'Side Skins'} Match?</h3>
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

      {/* Add Player Mid-Round Modal */}
      {showAddPlayerModal && (
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
            maxWidth: '350px'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#27ae60' }}>Add Player Mid-Round</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
              Player will only be eligible for skins and greenies from their join hole onwards.
            </p>

            {/* Toggle between league player and guest */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                onClick={() => setAddPlayerMode('existing')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: addPlayerMode === 'existing' ? '2px solid #27ae60' : '1px solid #ddd',
                  background: addPlayerMode === 'existing' ? '#e8f5e9' : 'white',
                  fontWeight: addPlayerMode === 'existing' ? '600' : 'normal',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                League Player
              </button>
              <button
                onClick={() => setAddPlayerMode('guest')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: addPlayerMode === 'guest' ? '2px solid #27ae60' : '1px solid #ddd',
                  background: addPlayerMode === 'guest' ? '#e8f5e9' : 'white',
                  fontWeight: addPlayerMode === 'guest' ? '600' : 'normal',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Add Guest
              </button>
            </div>

            {addPlayerMode === 'existing' ? (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                  Select Player
                </label>
                <select
                  value={selectedPlayerToAdd || ''}
                  onChange={(e) => setSelectedPlayerToAdd(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px'
                  }}
                >
                  <option value="">-- Select a player --</option>
                  {(leaguePlayers || [])
                    .filter(p => !skinsMatch.participants.includes(String(p.id)))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))
                  }
                </select>
                {(leaguePlayers || []).filter(p => !skinsMatch.participants.includes(String(p.id))).length === 0 && (
                  <div style={{ fontSize: '11px', color: '#e74c3c', marginTop: '5px' }}>
                    All league players are already in the skins match. Use "Add Guest" to add someone new.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                  Guest Name
                </label>
                <input
                  type="text"
                  value={guestPlayerName}
                  onChange={(e) => setGuestPlayerName(e.target.value)}
                  placeholder="Enter guest name"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px'
                  }}
                />
              </div>
            )}

            {/* Team Selection */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                Add to Team
              </label>
              <select
                value={selectedTeamToAdd || ''}
                onChange={(e) => setSelectedTeamToAdd(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="">-- Select a team --</option>
                {liveRound.teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.players.map(p => p.name).join(', ')})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                Joining on Hole #
              </label>
              <input
                type="number"
                min="1"
                max="18"
                value={addPlayerJoinHole}
                onChange={(e) => setAddPlayerJoinHole(Math.min(18, Math.max(1, parseInt(e.target.value) || 1)))}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
              <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                Eligible for holes {addPlayerJoinHole}-18 only
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowAddPlayerModal(false)
                  setSelectedPlayerToAdd(null)
                  setAddPlayerJoinHole(1)
                  setAddPlayerMode('existing')
                  setGuestPlayerName('')
                  setSelectedTeamToAdd(null)
                }}
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
                onClick={() => {
                  // Validate team selection
                  if (!selectedTeamToAdd) {
                    alert('Please select a team')
                    return
                  }

                  // Create X scores for holes before join hole
                  const initialScores = {}
                  for (let h = 1; h < addPlayerJoinHole; h++) {
                    initialScores[h] = 'X'
                  }

                  if (addPlayerMode === 'existing') {
                    if (!selectedPlayerToAdd) {
                      alert('Please select a player')
                      return
                    }
                    const playerId = String(selectedPlayerToAdd)
                    const leaguePlayer = (leaguePlayers || []).find(p => String(p.id) === playerId)

                    if (!leaguePlayer) {
                      alert('Player not found')
                      return
                    }

                    // Add to skins match participants
                    const newParticipants = [...skinsMatch.participants, playerId]
                    const newDetails = {
                      ...(skinsMatch.participantDetails || {}),
                      [playerId]: {
                        joinedOnHole: addPlayerJoinHole,
                        leftOnHole: null,
                        isSettled: false,
                        settledOnHole: null
                      }
                    }
                    setSkinsMatch({
                      ...skinsMatch,
                      participants: newParticipants,
                      participantDetails: newDetails
                    })

                    // Add player to the selected team in liveRound
                    const teamId = parseInt(selectedTeamToAdd) || selectedTeamToAdd
                    setLiveRound({
                      ...liveRound,
                      teams: liveRound.teams.map(team => {
                        if (team.id !== teamId) return team
                        return {
                          ...team,
                          players: [
                            ...team.players,
                            {
                              id: leaguePlayer.id,
                              name: leaguePlayer.name,
                              scores: initialScores,
                              handicap: leaguePlayer.handicap || 0
                            }
                          ]
                        }
                      })
                    })
                  } else {
                    // Add guest player
                    if (!guestPlayerName.trim()) {
                      alert('Please enter a guest name')
                      return
                    }
                    // Generate a unique ID for the guest
                    const guestId = `guest_${Date.now()}`
                    const newParticipants = [...skinsMatch.participants, guestId]
                    const newDetails = {
                      ...(skinsMatch.participantDetails || {}),
                      [guestId]: {
                        joinedOnHole: addPlayerJoinHole,
                        leftOnHole: null,
                        isSettled: false,
                        settledOnHole: null,
                        isGuest: true,
                        guestName: guestPlayerName.trim()
                      }
                    }
                    // Store guest players info in skinsMatch
                    const newGuestPlayers = {
                      ...(skinsMatch.guestPlayers || {}),
                      [guestId]: {
                        id: guestId,
                        name: guestPlayerName.trim(),
                        scores: initialScores
                      }
                    }
                    setSkinsMatch({
                      ...skinsMatch,
                      participants: newParticipants,
                      participantDetails: newDetails,
                      guestPlayers: newGuestPlayers
                    })

                    // Add guest player to the selected team in liveRound
                    const teamId = parseInt(selectedTeamToAdd) || selectedTeamToAdd
                    setLiveRound({
                      ...liveRound,
                      teams: liveRound.teams.map(team => {
                        if (team.id !== teamId) return team
                        return {
                          ...team,
                          players: [
                            ...team.players,
                            {
                              id: guestId,
                              name: guestPlayerName.trim(),
                              scores: initialScores,
                              handicap: 0
                            }
                          ]
                        }
                      })
                    })
                  }
                  setShowAddPlayerModal(false)
                  setSelectedPlayerToAdd(null)
                  setAddPlayerJoinHole(1)
                  setAddPlayerMode('existing')
                  setGuestPlayerName('')
                  setSelectedTeamToAdd(null)
                }}
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
                Add Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settle & Leave Player Modal */}
      {showSettleModal && settlePlayer && (
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
            maxWidth: '400px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#e67e22' }}>
              Settle & Leave: {settlePlayer.name}
            </h3>

            {settleStep === 1 && (
              <>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
                  Select the last hole this player completed before leaving. Choose "None" if they left before playing.
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                    Last Hole Played
                  </label>
                  <select
                    value={settleLastHole}
                    onChange={(e) => setSettleLastHole(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      fontSize: '14px'
                    }}
                  >
                    <option value={0}>None (left before playing)</option>
                    {Array.from({ length: 18 }, (_, i) => i + 1).map(h => (
                      <option key={h} value={h}>Hole {h}</option>
                    ))}
                  </select>
                </div>

                {/* Show current settlement status with WHO owes whom */}
                <div style={{
                  background: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '14px' }}>
                    Settlement Preview
                  </div>
                  {(() => {
                    const playerId = String(settlePlayer.id)
                    const skinsCost = parseFloat(skinsMatch?.settings?.costPerSkin) || 0
                    const greenieCost = greeniesCostPerHole

                    // Get skinWins and greenieWins (greeniesEnabled is from component scope)
                    const { skinWins } = getSkinsSummary(skinsResults)
                    const { greenieWins } = greeniesEnabled ? getGreeniesSummary(greenieResults) : { greenieWins: [] }

                    // Calculate what this player owes/is owed by each other player
                    const transactions = []
                    let totalOwed = 0
                    let totalCollect = 0
                    let totalSkinsNet = 0
                    let totalGreeniesNet = 0

                    skinsPlayers.filter(p => String(p.id) !== playerId && !playerSummary[String(p.id)]?.isSettled).forEach(otherPlayer => {
                      const otherId = String(otherPlayer.id)
                      let skinsOwedToOther = 0
                      let skinsOwedFromOther = 0
                      let greeniesOwedToOther = 0
                      let greeniesOwedFromOther = 0

                      // Skins calculations
                      skinWins.filter(sw => sw.winnerId === otherId && sw.activePlayerIds.includes(playerId)).forEach(sw => {
                        skinsOwedToOther += sw.value * skinsCost
                      })
                      skinWins.filter(sw => sw.winnerId === playerId && sw.activePlayerIds.includes(otherId)).forEach(sw => {
                        skinsOwedFromOther += sw.value * skinsCost
                      })

                      // Greenies calculations
                      if (greeniesEnabled) {
                        greenieWins.filter(gw => gw.winnerId === otherId && gw.activePlayerIds.includes(playerId)).forEach(() => {
                          greeniesOwedToOther += greenieCost
                        })
                        greenieWins.filter(gw => gw.winnerId === playerId && gw.activePlayerIds.includes(otherId)).forEach(() => {
                          greeniesOwedFromOther += greenieCost
                        })
                      }

                      const totalOwedToOther = skinsOwedToOther + greeniesOwedToOther
                      const totalOwedFromOther = skinsOwedFromOther + greeniesOwedFromOther
                      const netWithOther = totalOwedFromOther - totalOwedToOther

                      if (Math.abs(netWithOther) > 0.01) {
                        transactions.push({
                          playerName: otherPlayer.name,
                          playerId: otherId,
                          net: netWithOther,
                          skinsOwed: skinsOwedToOther,
                          skinsCollect: skinsOwedFromOther,
                          greeniesOwed: greeniesOwedToOther,
                          greeniesCollect: greeniesOwedFromOther
                        })
                        totalSkinsNet += (skinsOwedFromOther - skinsOwedToOther)
                        totalGreeniesNet += (greeniesOwedFromOther - greeniesOwedToOther)
                        if (netWithOther > 0) {
                          totalCollect += netWithOther
                        } else {
                          totalOwed += Math.abs(netWithOther)
                        }
                      }
                    })

                    const grandTotal = totalCollect - totalOwed
                    const hasGreeniesTotal = greeniesEnabled && Math.abs(totalGreeniesNet) > 0.01

                    return (
                      <>
                        {transactions.length > 0 ? (
                          <div style={{ marginBottom: '10px' }}>
                            {transactions.map((tx, idx) => {
                              const netSkins = tx.skinsCollect - tx.skinsOwed
                              const netGreenies = tx.greeniesCollect - tx.greeniesOwed
                              const hasGreenies = tx.greeniesOwed > 0 || tx.greeniesCollect > 0
                              return (
                                <div key={idx} style={{
                                  padding: '8px',
                                  background: tx.net > 0 ? '#e8f5e9' : '#ffebee',
                                  borderRadius: '4px',
                                  marginBottom: '4px',
                                  fontSize: '12px'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>
                                      {tx.net > 0 ? (
                                        <><span style={{ color: '#27ae60' }}>Collect from</span> {tx.playerName}</>
                                      ) : (
                                        <><span style={{ color: '#e74c3c' }}>Owe</span> {tx.playerName}</>
                                      )}
                                    </span>
                                    <span style={{
                                      fontWeight: '600',
                                      color: tx.net > 0 ? '#27ae60' : '#e74c3c'
                                    }}>
                                      ${Math.abs(tx.net).toFixed(2)}
                                    </span>
                                  </div>
                                  {/* Breakdown of skins vs greenies */}
                                  <div style={{ fontSize: '10px', color: '#888', marginTop: '2px', display: 'flex', gap: '10px' }}>
                                    {Math.abs(netSkins) > 0.01 && (
                                      <span>Skins: {netSkins > 0 ? '+' : ''}${netSkins.toFixed(2)}</span>
                                    )}
                                    {hasGreenies && Math.abs(netGreenies) > 0.01 && (
                                      <span>Greenies: {netGreenies > 0 ? '+' : ''}${netGreenies.toFixed(2)}</span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ color: '#666', fontSize: '12px', marginBottom: '10px' }}>
                            No settlements needed - everyone is even!
                          </div>
                        )}

                        {/* Summary breakdown */}
                        {(Math.abs(totalSkinsNet) > 0.01 || hasGreeniesTotal) && (
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', display: 'flex', gap: '15px' }}>
                            {Math.abs(totalSkinsNet) > 0.01 && (
                              <span>Skins: <span style={{ color: totalSkinsNet >= 0 ? '#27ae60' : '#e74c3c' }}>{totalSkinsNet >= 0 ? '+' : ''}${totalSkinsNet.toFixed(2)}</span></span>
                            )}
                            {hasGreeniesTotal && (
                              <span>Greenies: <span style={{ color: totalGreeniesNet >= 0 ? '#27ae60' : '#e74c3c' }}>{totalGreeniesNet >= 0 ? '+' : ''}${totalGreeniesNet.toFixed(2)}</span></span>
                            )}
                          </div>
                        )}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '14px',
                          fontWeight: '600',
                          borderTop: '1px solid #ddd',
                          paddingTop: '8px'
                        }}>
                          <span>Net Total:</span>
                          <span style={{ color: grandTotal >= 0 ? '#27ae60' : '#e74c3c' }}>
                            {grandTotal >= 0 ? '+' : ''}${grandTotal.toFixed(2)}
                          </span>
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* Check if there are pending carryovers */}
                {(() => {
                  const pendingCOs = skinsResults.pendingCarryovers || []
                  const playerDetails = skinsMatch.participantDetails?.[String(settlePlayer.id)] || {}
                  const joinHole = playerDetails.joinedOnHole || 1
                  const relevantCOs = pendingCOs.filter(co =>
                    co.eligiblePlayerIds.includes(String(settlePlayer.id)) &&
                    co.fromHole >= joinHole && co.fromHole <= settleLastHole
                  )

                  if (relevantCOs.length > 0) {
                    return (
                      <div style={{
                        background: '#fff3e0',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '15px',
                        fontSize: '12px'
                      }}>
                        <strong>Pending Carryovers:</strong> This player contributed to {relevantCOs.length} unresolved carryover(s) from hole(s) {relevantCOs.map(c => c.fromHole).join(', ')}.
                        <br/><br/>
                        You'll choose how to handle these in the next step.
                      </div>
                    )
                  }
                  return null
                })()}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setShowSettleModal(false)
                      setSettlePlayer(null)
                      setSettleStep(1)
                    }}
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
                    onClick={() => {
                      // Check if there are pending carryovers for this player
                      const pendingCOs = skinsResults.pendingCarryovers || []
                      const playerDetails = skinsMatch.participantDetails?.[String(settlePlayer.id)] || {}
                      const joinHole = playerDetails.joinedOnHole || 1
                      const relevantCOs = pendingCOs.filter(co =>
                        co.eligiblePlayerIds.includes(String(settlePlayer.id)) &&
                        co.fromHole >= joinHole && co.fromHole <= settleLastHole
                      )

                      if (relevantCOs.length > 0) {
                        setSettleStep(2)
                      } else {
                        // No pending carryovers, finalize settlement
                        finalizeSettlement()
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#e67e22',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {settleStep === 2 && (
              <>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
                  How should {settlePlayer.name}'s unresolved carryovers be handled?
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <button
                    onClick={() => setCarryoverHandling('pay')}
                    style={{
                      width: '100%',
                      padding: '15px',
                      marginBottom: '10px',
                      borderRadius: '8px',
                      border: carryoverHandling === 'pay' ? '2px solid #e67e22' : '1px solid #ddd',
                      background: carryoverHandling === 'pay' ? '#fff8e1' : 'white',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: '600' }}>Pay my carryovers</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Leaving player pays their share for carryover holes. Someone holds the money until resolved.
                    </div>
                  </button>
                  <button
                    onClick={() => setCarryoverHandling('forgive')}
                    style={{
                      width: '100%',
                      padding: '15px',
                      borderRadius: '8px',
                      border: carryoverHandling === 'forgive' ? '2px solid #e67e22' : '1px solid #ddd',
                      background: carryoverHandling === 'forgive' ? '#fff8e1' : 'white',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: '600' }}>Forgive carryovers</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Remaining players absorb the cost. Treat as if there was one fewer player for those holes.
                    </div>
                  </button>
                </div>

                {carryoverHandling === 'pay' && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                      Who will hold the carryover money?
                    </label>
                    <select
                      value={carryoverCollector || ''}
                      onChange={(e) => setCarryoverCollector(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">-- Select collector --</option>
                      {skinsPlayers
                        .filter(p => String(p.id) !== String(settlePlayer.id) && !playerSummary[String(p.id)]?.isSettled)
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))
                      }
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setSettleStep(1)}
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
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (carryoverHandling === 'pay' && !carryoverCollector) {
                        alert('Please select who will hold the carryover money')
                        return
                      }
                      finalizeSettlement()
                    }}
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
                    Finalize Settlement
                  </button>
                </div>
              </>
            )}
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
    nassauMatch,
    setNassauMatch,
    wolfMatch,
    setWolfMatch,
    isAdmin,
    payoutFormats,
    holeInOnePot,
    quickSkinsMode,
    setQuickSkinsMode,
    quickSkinsHistory,
    setQuickSkinsHistory,
    defaultStartingHole,
    handicapSettings,
    setHandicapSettings,
    courseTees,
    leagueId,
    leagueSettings,
    isCasualGame,
    isIndividualRound,
    saveCasualRoundHistory,
    saveIndividualRoundHistory,
    saveLeagueRoundHistory
  } = useLeague()

  // Leaderboard view state - defaults based on starting hole (front if 1-9, back if 10-18)
  const getInitialLeaderboardView = () => {
    if (defaultStartingHole >= 10) return 'back'
    return 'front'
  }
  const [leaderboardView, setLeaderboardView] = useState(getInitialLeaderboardView)

  // Detect Quick Skins mode from data structure if flag is out of sync
  const isQuickSkinsGame = liveRound && 'quickSkinsGreenieSettings' in liveRound
  const effectiveQuickSkinsMode = quickSkinsMode || isQuickSkinsGame

  // Auto-correct quickSkinsMode if out of sync
  useEffect(() => {
    if (isQuickSkinsGame && !quickSkinsMode) {
      console.log('Auto-correcting quickSkinsMode flag')
      setQuickSkinsMode(true)
    }
  }, [isQuickSkinsGame, quickSkinsMode, setQuickSkinsMode])

  const [subTab, setSubTab] = useState(effectiveQuickSkinsMode ? 'skins' : 'leaderboard')
  const [selectedTeamId, setSelectedTeamId] = useState(liveRound?.teams[0]?.id || 0)
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [finishPin, setFinishPin] = useState('')
  const [showCasualSaveModal, setShowCasualSaveModal] = useState(false)
  const [casualHandicapChoices, setCasualHandicapChoices] = useState({})
  const [casualRoundData, setCasualRoundData] = useState(null)
  const [savingCasualRound, setSavingCasualRound] = useState(false)
  const [showIndividualSummary, setShowIndividualSummary] = useState(false)
  const [individualSummaryData, setIndividualSummaryData] = useState(null)
  const [savingIndividualRound, setSavingIndividualRound] = useState(false)

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

  const addGuestPlayer = (teamId, name, handicap) => {
    const guestId = `guest_${Date.now()}`
    const skillRating = Math.max(1, Math.min(10, Math.round(10 - (handicap / 5.4))))
    // Add to liveRound teams
    setLiveRound({
      ...liveRound,
      teams: liveRound.teams.map(team => {
        if (team.id !== teamId) return team
        return {
          ...team,
          players: [
            ...team.players,
            {
              id: guestId,
              name,
              skillRating,
              handicap,
              scores: {},
              isDNF: false,
              includeInTeamScore: true,
              joinedLate: true,
              isGuest: true,
              tee: 'blue'
            }
          ]
        }
      })
    })
    // Add to players array
    setPlayers([
      ...players,
      {
        id: guestId,
        name,
        handicap,
        skillRating,
        tee: 'blue',
        scoreHistory: [],
        checkedIn: true,
        isGuest: true,
        gamesPlayed: 0,
        avgTotal: 0
      }
    ])
    // Add to skinsMatch participants if skins is active
    if (skinsMatch) {
      setSkinsMatch({
        ...skinsMatch,
        participants: [...skinsMatch.participants, guestId]
      })
    }
  }

  const finishRound = () => {
    // Skip PIN check for casual games and individual rounds
    if (!isCasualGame && !isIndividualRound && finishPin !== '1234') {
      alert('Incorrect PIN')
      setFinishPin('')
      return
    }

    const formatKey = liveRound.formatConfig?.format || null
    const formatSettings = liveRound.formatConfig || {}

    const roundData = {
      id: liveRound.id,
      date: liveRound.date,
      ...(liveRound.formatConfig ? { formatConfig: liveRound.formatConfig } : {}),
      teams: liveRound.teams.map(team => {
        let front9Score, back9Score
        if (formatKey && FORMAT_CONFIGS[formatKey]) {
          front9Score = calculateFormatScore(formatKey, team, 1, 9, formatSettings)
          back9Score = calculateFormatScore(formatKey, team, 10, 18, formatSettings)
        } else {
          front9Score = calculateTeamScore(team, 1, 9)
          back9Score = calculateTeamScore(team, 10, 18)
        }
        return {
          ...team,
          front9Score,
          back9Score,
          totalScore: front9Score + back9Score
        }
      }),
      skinsMatch: skinsMatch ? { ...skinsMatch } : null,
      nassauMatch: nassauMatch ? { ...nassauMatch } : null,
      wolfMatch: wolfMatch ? { ...wolfMatch } : null
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
        if (greenieData?.playerId && String(greenieData.playerId) === String(player.id)) {
          greeniesWon.push(hole)
        }
      })

      // Get player's tee for this round (from liveRound player data or player's default)
      const teeUsed = roundPlayer.tee || player.defaultTee || 'blue'

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
          holesCompleted: holesCompleted,
          tee: teeUsed,
          holesPlayed: liveRound.holesPlayed || 18,
          startingHole: liveRound.startingHole || 1
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

      // Build updated player with new stats
      let updatedPlayer = {
        ...player,
        gamesPlayed: newGamesPlayed,
        scoreHistory: newScoreHistory,
        avgTotal,
        avgFrontNine: avgFront,
        avgBackNine: avgBack
      }

      // Recalculate handicaps if auto mode is enabled and conditions are met
      if (handicapSettings?.calculationMode === 'auto') {
        const teesConfig = courseTees || DEFAULT_COURSE_TEES
        const freezeMode = handicapSettings?.freezeMode || 'exclude'

        // Check if this round is in the freeze period
        const roundDate = liveRound.date
        const isInFreezePeriod = isDateInFreezePeriod(roundDate, handicapSettings)

        // Check if we should update handicaps (immediate mode or monthly mode with new month)
        const shouldUpdate = shouldUpdateHandicaps(handicapSettings)

        // Determine if recalculation should happen
        let shouldRecalculate = false
        if (isInFreezePeriod) {
          // During freeze: never recalculate (both modes)
          shouldRecalculate = false
        } else if (freezeMode === 'batch' && handicapSettings?.freezeEnabled) {
          // After freeze in batch mode: check grace period
          const gracePeriod = handicapSettings?.freezeGracePeriod || 0
          const postFreezeRounds = handicapSettings?.postFreezeRoundsPlayed || 0
          shouldRecalculate = shouldUpdate && postFreezeRounds >= gracePeriod
        } else {
          // Normal (exclude mode or no freeze): recalculate if shouldUpdate
          shouldRecalculate = shouldUpdate
        }

        if (shouldRecalculate) {
          updatedPlayer = recalculatePlayerHandicaps(
            updatedPlayer,
            leagueId,
            teesConfig,
            handicapSettings?.maxHandicap || 54,
            handicapSettings
          )
        }
      }

      // Update recent teammates for variety in team generation
      // Find the team this player was on
      const playerTeam = liveRound.teams.find(t => t.players.some(p => p.id === player.id))
      if (playerTeam) {
        // Get IDs of teammates (excluding self)
        const currentTeammateIds = playerTeam.players
          .filter(p => p.id !== player.id && !p.isDNF)
          .map(p => p.id)

        // Previous round's teammates (if any)
        const previousTeammates = player.lastRoundTeammates || []

        // recentTeammates = last 2 rounds combined (current + previous)
        updatedPlayer = {
          ...updatedPlayer,
          recentTeammates: [...new Set([...currentTeammateIds, ...previousTeammates])],
          lastRoundTeammates: currentTeammateIds
        }
      }

      return updatedPlayer
    })

    setPlayers(updatedPlayers)
    setHistory([roundData, ...history])
    setShowFinishConfirm(false)

    // Track post-freeze rounds for batch mode grace period
    if (handicapSettings?.freezeEnabled && (handicapSettings?.freezeMode === 'batch')) {
      const isInFreezePeriod = isDateInFreezePeriod(liveRound.date, handicapSettings)
      if (isInFreezePeriod) {
        // Entering freeze: reset counter
        if ((handicapSettings?.postFreezeRoundsPlayed || 0) > 0) {
          setHandicapSettings({ ...handicapSettings, postFreezeRoundsPlayed: 0 })
        }
      } else {
        // After freeze: increment counter
        setHandicapSettings({
          ...handicapSettings,
          postFreezeRoundsPlayed: (handicapSettings?.postFreezeRoundsPlayed || 0) + 1
        })
      }
    }

    // For league rounds, also save to round_history table (non-blocking)
    if (!isCasualGame && !isIndividualRound) {
      const roundPlayersForHistory = liveRound.teams.flatMap(t => t.players)
        .filter(p => !p.isDNF)
        .map(p => {
          const scores = p.scores || {}
          let front9 = 0, back9 = 0
          for (let h = 1; h <= 9; h++) if (scores[h] && scores[h] !== 'X') front9 += scores[h]
          for (let h = 10; h <= 18; h++) if (scores[h] && scores[h] !== 'X') back9 += scores[h]
          const playerData = players.find(pl => pl.id === p.id)
          return {
            profileId: playerData?.profileId || null,
            scores,
            front9,
            back9,
            total: front9 + back9,
            handicap: p.handicap || 0,
            tee: p.tee || playerData?.defaultTee || 'blue'
          }
        })
      saveLeagueRoundHistory(roundPlayersForHistory).catch(err => {
        console.warn('Failed to save league round history:', err)
      })
    }

    // For individual rounds, show summary modal before cleaning up
    if (isIndividualRound) {
      const player = liveRound.teams[0]?.players[0]
      if (player) {
        const scores = player.scores || {}
        const holesPlayed = liveRound.holesPlayed || 18
        const startHole = liveRound.startingHole || 1
        const endHole = holesPlayed === 9 ? startHole + 8 : 18

        let front9 = 0, back9 = 0
        for (let h = 1; h <= 9; h++) if (scores[h] && scores[h] !== 'X') front9 += parseInt(scores[h]) || 0
        for (let h = 10; h <= 18; h++) if (scores[h] && scores[h] !== 'X') back9 += parseInt(scores[h]) || 0

        const total = holesPlayed === 9 ? (startHole === 1 ? front9 : back9) : front9 + back9

        // Par calculation
        const allHolesData = getAllHoles()
        let parTotal = 0
        for (let h = startHole; h <= endHole; h++) {
          const hInfo = allHolesData.find(hd => hd.hole === h)
          if (hInfo) parTotal += hInfo.par
        }

        // Scoring breakdown
        const breakdown = { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubleBogeys: 0, worse: 0 }
        for (let h = startHole; h <= endHole; h++) {
          const s = scores[h]
          if (s === undefined || s === null || s === '' || s === 'X') continue
          const hInfo = allHolesData.find(hd => hd.hole === h)
          if (!hInfo) continue
          const diff = parseInt(s) - hInfo.par
          if (diff <= -2) breakdown.eagles++
          else if (diff === -1) breakdown.birdies++
          else if (diff === 0) breakdown.pars++
          else if (diff === 1) breakdown.bogeys++
          else if (diff === 2) breakdown.doubleBogeys++
          else breakdown.worse++
        }

        setIndividualSummaryData({
          scores,
          front9,
          back9,
          total,
          parTotal,
          holesPlayed,
          startingHole: startHole,
          tee: player.tee || 'blue',
          handicap: player.handicap || 0,
          breakdown
        })
        setShowIndividualSummary(true)
        return
      }
    }

    // For casual games, show the save round modal before cleaning up
    if (isCasualGame) {
      // Build round player data for history saving
      const roundPlayersForHistory = liveRound.teams.flatMap(t => t.players)
        .filter(p => !p.isDNF)
        .map(p => {
          const scores = p.scores || {}
          let front9 = 0, back9 = 0
          for (let h = 1; h <= 9; h++) if (scores[h] && scores[h] !== 'X') front9 += scores[h]
          for (let h = 10; h <= 18; h++) if (scores[h] && scores[h] !== 'X') back9 += scores[h]
          // Find the matching player data to get profileId
          const playerData = players.find(pl => pl.id === p.id)
          return {
            id: p.id,
            profileId: playerData?.profileId || null,
            isGuest: playerData?.isGuest || false,
            name: p.name,
            scores,
            front9,
            back9,
            total: front9 + back9,
            handicap: p.handicap || 0,
            tee: p.tee || 'blue'
          }
        })

      // Initialize handicap choices (all checked by default)
      const defaultChoices = {}
      roundPlayersForHistory
        .filter(p => p.profileId && !p.isGuest)
        .forEach(p => { defaultChoices[p.profileId] = true })
      setCasualHandicapChoices(defaultChoices)
      setCasualRoundData(roundPlayersForHistory)
      setShowCasualSaveModal(true)
      // Don't clear liveRound yet - keep scorecard visible
      return
    }

    setLiveRound(null)
    setTeams([])
    setSkinsMatch(null)
    setNassauMatch(null)
    setWolfMatch(null)
    navigate('/history')
  }

  // Casual game save handlers
  const handleCasualSaveAndExit = async () => {
    setSavingCasualRound(true)
    try {
      if (casualRoundData) {
        await saveCasualRoundHistory(casualRoundData, casualHandicapChoices)
      }
    } catch (err) {
      console.error('Failed to save casual round history:', err)
    }
    // Clean up the game
    setLiveRound(null)
    setTeams([])
    setSkinsMatch(null)
    setNassauMatch(null)
    setWolfMatch(null)
    setShowCasualSaveModal(false)
    setSavingCasualRound(false)
    // Navigate back - use leaveLeague behavior to return to MyLeaguesScreen
    navigate('/history')
  }

  const handleCasualSaveAndStay = async () => {
    setSavingCasualRound(true)
    try {
      if (casualRoundData) {
        await saveCasualRoundHistory(casualRoundData, casualHandicapChoices)
      }
    } catch (err) {
      console.error('Failed to save casual round history:', err)
    }
    // Clean up but stay on the page to view results
    setLiveRound(null)
    setTeams([])
    setSkinsMatch(null)
    setNassauMatch(null)
    setWolfMatch(null)
    setShowCasualSaveModal(false)
    setSavingCasualRound(false)
  }

  // Individual round save handler
  const handleIndividualSave = async () => {
    if (!individualSummaryData) return
    setSavingIndividualRound(true)
    try {
      const playerProfileId = players[0]?.profileId || players[0]?.id
      if (playerProfileId) {
        await saveIndividualRoundHistory(playerProfileId, individualSummaryData)
      }
    } catch (err) {
      console.error('Failed to save individual round history:', err)
    }
    setLiveRound(null)
    setTeams([])
    setShowIndividualSummary(false)
    setIndividualSummaryData(null)
    setSavingIndividualRound(false)
    navigate('/scorecard')
  }

  // End Quick Skins game
  const endQuickSkins = async (saveResults = false) => {
    if (saveResults) {
      // Save the results before clearing
      const quickSkinsRecord = {
        id: Date.now(),
        date: liveRound?.date || new Date().toISOString(),
        skinsMatch: { ...skinsMatch },
        teams: liveRound?.teams || [],
        players: liveRound?.teams?.flatMap(t => t.players) || [],
        quickSkinsGreenieSettings: liveRound?.quickSkinsGreenieSettings || null
      }
      setQuickSkinsHistory([quickSkinsRecord, ...(quickSkinsHistory || []).slice(0, 19)]) // Keep last 20

      // For casual skins games, also save round history for app users
      if (isCasualGame) {
        const roundPlayersForHistory = (liveRound?.teams || []).flatMap(t => t.players)
          .filter(p => !p.isDNF)
          .map(p => {
            const scores = p.scores || {}
            let front9 = 0, back9 = 0
            for (let h = 1; h <= 9; h++) if (scores[h] && scores[h] !== 'X') front9 += scores[h]
            for (let h = 10; h <= 18; h++) if (scores[h] && scores[h] !== 'X') back9 += scores[h]
            const playerData = players.find(pl => pl.id === p.id)
            return {
              id: p.id,
              profileId: playerData?.profileId || null,
              isGuest: playerData?.isGuest || false,
              name: p.name,
              scores,
              front9,
              back9,
              total: front9 + back9,
              handicap: p.handicap || 0
            }
          })
        try {
          await saveCasualRoundHistory(roundPlayersForHistory, {})
        } catch (err) {
          console.error('Failed to save casual skins round history:', err)
        }
      }

      setLiveRound(null)
      setSkinsMatch(null)
      setNassauMatch(null)
      setWolfMatch(null)
      setQuickSkinsMode(false)
      navigate('/history')
    } else if (confirm('End Quick Skins game without saving? All data will be lost.')) {
      setLiveRound(null)
      setSkinsMatch(null)
      setNassauMatch(null)
      setWolfMatch(null)
      setQuickSkinsMode(false)
      navigate(isCasualGame ? '/history' : '/settings')
    }
  }

  // Define tabs based on mode
  const sideGames = leagueSettings?.sideGames || {}
  const showSkinTab = (match) => match?.participants?.length && (isCasualGame || (sideGames.enabled && sideGames.allowSkins !== false))
  const showNassauTab = (match) => match?.participants?.length && (isCasualGame || (sideGames.enabled && sideGames.allowNassau !== false))

  const subTabs = isIndividualRound
    ? [{ id: 'scoring', label: 'Scores' }]
    : effectiveQuickSkinsMode
    ? [
        { id: 'scoring', label: 'Scores' },
        { id: 'skins', label: 'Skins' },
        ...(liveRound?.quickSkinsGreenieSettings ? [{ id: 'greenies', label: 'Greenies' }] : []),
        ...(showNassauTab(nassauMatch) ? [{ id: 'nassau', label: isCasualGame ? 'Nassau' : 'Side Nassau' }] : []),
        ...(wolfMatch?.participants?.length ? [{ id: 'wolf', label: 'Wolf' }] : []),
        ...(isCasualGame ? [{ id: 'manage', label: 'Manage' }] : [])
      ]
    : [
        { id: 'leaderboard', label: 'Board' },
        { id: 'scoring', label: 'Scores' },
        { id: 'greenies', label: 'Greenies' },
        ...(showSkinTab(skinsMatch) ? [{ id: 'skins', label: isCasualGame ? 'Skins' : 'Side Skins' }] : []),
        ...(showNassauTab(nassauMatch) ? [{ id: 'nassau', label: isCasualGame ? 'Nassau' : 'Side Nassau' }] : []),
        ...(wolfMatch?.participants?.length ? [{ id: 'wolf', label: 'Wolf' }] : []),
        { id: 'money', label: 'Money' },
        { id: 'manage', label: 'Manage' }
      ]

  return (
    <div>
      {/* Quick Skins Mode Banner */}
      {effectiveQuickSkinsMode && (
        <div style={{
          background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '10px',
          marginBottom: '15px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Quick Skins Game</div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Informal skins match
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => endQuickSkins(true)}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.95)',
                border: 'none',
                color: '#27ae60',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Finish & Save
            </button>
            {!isCasualGame && (
              <button
                onClick={() => endQuickSkins(false)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                End Without Saving
              </button>
            )}
          </div>
        </div>
      )}

      <h2 style={{ marginBottom: '20px' }}>{effectiveQuickSkinsMode ? 'Quick Skins Game' : 'Live Round Scoring'}</h2>

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
          isQuickSkins={effectiveQuickSkinsMode}
          isIndividualRound={isIndividualRound}
        />
      )}
      {subTab === 'greenies' && (
        <GreeniesTracker
          liveRound={liveRound}
          onUpdateGreenie={updateGreenie}
          skinsMatch={skinsMatch}
        />
      )}
      {subTab === 'skins' && (
        <SkinsTracker
          liveRound={liveRound}
          setLiveRound={setLiveRound}
          skinsMatch={skinsMatch}
          setSkinsMatch={setSkinsMatch}
          isAdmin={isAdmin}
          leaguePlayers={players}
          isCasualGame={isCasualGame}
        />
      )}
      {subTab === 'nassau' && (
        <NassauTracker
          liveRound={liveRound}
          setLiveRound={setLiveRound}
          nassauMatch={nassauMatch}
          setNassauMatch={setNassauMatch}
          isAdmin={isAdmin}
          leaguePlayers={players}
          isCasualGame={isCasualGame}
        />
      )}
      {subTab === 'wolf' && (
        <WolfTracker
          liveRound={liveRound}
          setLiveRound={setLiveRound}
          wolfMatch={wolfMatch}
          setWolfMatch={setWolfMatch}
          isAdmin={isAdmin}
          leaguePlayers={players}
          isCasualGame={isCasualGame}
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
            onAddGuestPlayer={addGuestPlayer}
            isAdmin={isAdmin}
            isCasualGame={isCasualGame}
          />
        </div>
      )}

      {/* Admin Actions - Collapsible section for Finish Round */}
      {(isAdmin || isCasualGame || isIndividualRound) && !effectiveQuickSkinsMode && (
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
                {isCasualGame ? 'Game Actions' : isIndividualRound ? 'Round Actions' : 'Admin Actions'}
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
                  {isCasualGame ? 'Finish Game' : isIndividualRound ? 'Finish Round' : 'Finish Round (End League Round)'}
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
              <h3 style={{ marginBottom: '15px' }}>{isCasualGame ? 'Finish Game?' : isIndividualRound ? 'Finish Round?' : 'Finish Round?'}</h3>
              <p style={{ marginBottom: '15px', color: '#666' }}>
                This will save all scores to history and update player statistics.
              </p>
              {/* Only show PIN for league games */}
              {!isCasualGame && !isIndividualRound && (
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
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={finishRound} style={{ flex: 1 }}>
                  {isCasualGame ? 'Finish Game' : isIndividualRound ? 'Finish Round' : 'Finish Round'}
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

      {/* Casual Game Save Modal */}
      {showCasualSaveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>Game Complete!</h3>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
              Save round results to player profiles.
            </p>

            {/* List app users with handicap toggle */}
            {casualRoundData && casualRoundData.filter(p => p.profileId && !p.isGuest).length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#888', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Apply to Handicap Tracking
                </div>
                {casualRoundData
                  .filter(p => p.profileId && !p.isGuest)
                  .map(player => (
                    <div
                      key={player.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{player.name}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>
                          Score: {player.total || '--'} ({player.front9 || '--'} / {player.back9 || '--'})
                        </div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={casualHandicapChoices[player.profileId] !== false}
                          onChange={(e) => {
                            setCasualHandicapChoices(prev => ({
                              ...prev,
                              [player.profileId]: e.target.checked
                            }))
                          }}
                          style={{ width: '18px', height: '18px', accentColor: '#27ae60' }}
                        />
                      </label>
                    </div>
                  ))}
              </div>
            )}

            {/* Guest players (info only) */}
            {casualRoundData && casualRoundData.filter(p => p.isGuest).length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#888', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Guests (no profile)
                </div>
                {casualRoundData
                  .filter(p => p.isGuest)
                  .map(player => (
                    <div
                      key={player.id}
                      style={{
                        padding: '10px 12px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        opacity: 0.7
                      }}
                    >
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>{player.name}</span>
                      <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
                        Score: {player.total || '--'}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleCasualSaveAndExit}
                disabled={savingCasualRound}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: savingCasualRound ? 'default' : 'pointer',
                  opacity: savingCasualRound ? 0.7 : 1
                }}
              >
                {savingCasualRound ? 'Saving...' : 'Save & Exit'}
              </button>
              <button
                onClick={handleCasualSaveAndStay}
                disabled={savingCasualRound}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '2px solid #27ae60',
                  background: 'white',
                  color: '#27ae60',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: savingCasualRound ? 'default' : 'pointer',
                  opacity: savingCasualRound ? 0.7 : 1
                }}
              >
                {savingCasualRound ? 'Saving...' : 'Save & Stay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Round Summary Modal */}
      {showIndividualSummary && individualSummaryData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', textAlign: 'center' }}>Round Complete!</h3>
            <div style={{ textAlign: 'center', color: '#666', fontSize: '13px', marginBottom: '20px' }}>
              Gunpowder Golf Course
            </div>

            {/* Score Summary */}
            <div style={{
              background: 'linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%)',
              color: 'white',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold' }}>
                {individualSummaryData.total}
              </div>
              <div style={{ fontSize: '16px', opacity: 0.9, marginTop: '4px' }}>
                {(() => {
                  const diff = individualSummaryData.total - individualSummaryData.parTotal
                  if (diff === 0) return 'Even Par'
                  return diff > 0 ? `+${diff} (${individualSummaryData.parTotal} par)` : `${diff} (${individualSummaryData.parTotal} par)`
                })()}
              </div>
              {individualSummaryData.holesPlayed === 18 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '30px',
                  marginTop: '15px',
                  paddingTop: '15px',
                  borderTop: '1px solid rgba(255,255,255,0.2)'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>FRONT</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{individualSummaryData.front9}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>BACK</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{individualSummaryData.back9}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Scoring Breakdown */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#888', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Scoring Breakdown
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Eagles+', count: individualSummaryData.breakdown.eagles, color: '#f39c12' },
                  { label: 'Birdies', count: individualSummaryData.breakdown.birdies, color: '#27ae60' },
                  { label: 'Pars', count: individualSummaryData.breakdown.pars, color: '#3498db' },
                  { label: 'Bogeys', count: individualSummaryData.breakdown.bogeys, color: '#e67e22' },
                  { label: 'Double', count: individualSummaryData.breakdown.doubleBogeys, color: '#e74c3c' },
                  { label: 'Worse', count: individualSummaryData.breakdown.worse, color: '#8e44ad' }
                ].map(item => (
                  <div key={item.label} style={{
                    textAlign: 'center',
                    padding: '8px',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: item.color }}>{item.count}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleIndividualSave}
              disabled={savingIndividualRound}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: savingIndividualRound ? 'default' : 'pointer',
                opacity: savingIndividualRound ? 0.7 : 1
              }}
            >
              {savingIndividualRound ? 'Saving...' : 'Save & Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LivePage
