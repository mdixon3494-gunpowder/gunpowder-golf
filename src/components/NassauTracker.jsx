import { useState, useMemo } from 'react'
import {
  calculateNassauResults,
  getNassauSummary,
  canPress,
  createPress,
  getSegmentStatus,
  getPlayerName
} from '../utils/nassauCalculations'

export default function NassauTracker({ liveRound, setLiveRound, nassauMatch, setNassauMatch, isAdmin, leaguePlayers, isCasualGame }) {
  // Setup state
  const [showSetup, setShowSetup] = useState(false)
  const [settings, setSettings] = useState({ betAmount: 2, useHandicaps: false })

  // Active match state
  const [selectedPair, setSelectedPair] = useState(null)
  const [nassauView, setNassauView] = useState('front') // 'front' | 'back' | 'overall'

  // Player management
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pendingPlayerId, setPendingPlayerId] = useState(null)

  // Press state
  const [showPressModal, setShowPressModal] = useState(false)
  const [pressTarget, setPressTarget] = useState(null) // { pressedBy, againstPlayer }

  // Settlement state
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [settlePlayer, setSettlePlayer] = useState(null)
  const [settleLastHole, setSettleLastHole] = useState(0)

  // Cancel/edit
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelPinInput, setCancelPinInput] = useState('')

  // Calculate results
  const nassauResults = useMemo(
    () => calculateNassauResults(nassauMatch, liveRound),
    [nassauMatch, liveRound]
  )
  const nassauSummary = useMemo(
    () => getNassauSummary(nassauResults, nassauMatch),
    [nassauResults, nassauMatch]
  )

  // Get all players in the round
  const allRoundPlayers = useMemo(() => {
    if (!liveRound?.teams) return []
    const players = []
    for (const team of liveRound.teams) {
      for (const player of team.players) {
        players.push(player)
      }
    }
    return players
  }, [liveRound])

  // Get participant player objects
  const nassauPlayers = useMemo(() => {
    if (!nassauMatch?.participants) return []
    return nassauMatch.participants.map(pid => {
      const found = allRoundPlayers.find(p => String(p.id) === String(pid))
      return found || { id: pid, name: getPlayerName(liveRound, pid) }
    })
  }, [nassauMatch, allRoundPlayers, liveRound])

  // All unique pairs
  const pairKeys = useMemo(() => {
    if (!nassauResults?.pairs) return []
    return Object.keys(nassauResults.pairs)
  }, [nassauResults])

  // Auto-select first pair
  const activePairKey = selectedPair && nassauResults?.pairs?.[selectedPair] ? selectedPair : pairKeys[0] || null
  const activePair = activePairKey ? nassauResults.pairs[activePairKey] : null

  // Determine current hole (furthest hole with a score)
  const currentHole = useMemo(() => {
    if (!liveRound?.teams) return 1
    let maxHole = 1
    for (const team of liveRound.teams) {
      for (const player of team.players) {
        for (let h = 18; h >= 1; h--) {
          if (player.scores?.[h] != null && player.scores[h] !== '' && player.scores[h] !== 'X') {
            if (h > maxHole) maxHole = h
            break
          }
        }
      }
    }
    return maxHole
  }, [liveRound])

  // === SETUP SECTION ===
  const setupNassau = () => {
    const participants = isCasualGame
      ? allRoundPlayers.map(p => String(p.id))
      : []

    const participantDetails = {}
    participants.forEach(pid => {
      participantDetails[pid] = { joinedOnHole: 1, leftOnHole: null, isSettled: false, settledOnHole: null }
    })

    setNassauMatch({
      settings: { ...settings, betAmount: parseFloat(settings.betAmount) || 2 },
      participants,
      participantDetails,
      presses: [],
      settlements: []
    })
    setShowSetup(false)
  }

  // === PARTICIPANT MANAGEMENT ===
  const handleToggleParticipant = (playerId) => {
    if (!nassauMatch) return
    if (isAdmin && !isCasualGame) {
      setPendingPlayerId(playerId)
      setShowPinPrompt(true)
    } else if (isCasualGame) {
      toggleParticipant(playerId)
    }
  }

  const confirmToggleParticipant = () => {
    if (pinInput === '1234' && pendingPlayerId !== null) {
      toggleParticipant(pendingPlayerId)
      setShowPinPrompt(false)
      setPinInput('')
      setPendingPlayerId(null)
    } else {
      alert('Incorrect PIN')
      setPinInput('')
    }
  }

  const toggleParticipant = (playerId) => {
    const pid = String(playerId)
    const isIn = nassauMatch.participants.includes(pid)

    if (isIn) {
      const newParticipants = nassauMatch.participants.filter(id => id !== pid)
      const newDetails = { ...nassauMatch.participantDetails }
      delete newDetails[pid]
      setNassauMatch({ ...nassauMatch, participants: newParticipants, participantDetails: newDetails })
    } else {
      const newParticipants = [...nassauMatch.participants, pid]
      const newDetails = {
        ...(nassauMatch.participantDetails || {}),
        [pid]: { joinedOnHole: 1, leftOnHole: null, isSettled: false, settledOnHole: null }
      }
      setNassauMatch({ ...nassauMatch, participants: newParticipants, participantDetails: newDetails })
    }
  }

  // === PRESS ===
  const handlePress = (pressedBy, againstPlayer) => {
    const result = canPress(nassauMatch, nassauResults, pressedBy, againstPlayer, currentHole)
    if (!result.canPress) {
      alert(result.reason)
      return
    }
    const press = createPress(nassauMatch, pressedBy, againstPlayer, result.startHole, result.endHole, result.segment)
    setNassauMatch({
      ...nassauMatch,
      presses: [...(nassauMatch.presses || []), press]
    })
    setShowPressModal(false)
    setPressTarget(null)
  }

  // === SETTLEMENT ===
  const finalizeSettlement = () => {
    if (!settlePlayer) return
    const pid = String(settlePlayer.id)

    const newDetails = {
      ...(nassauMatch.participantDetails || {}),
      [pid]: {
        ...(nassauMatch.participantDetails?.[pid] || {}),
        leftOnHole: settleLastHole,
        isSettled: true,
        settledOnHole: settleLastHole
      }
    }

    const settlementRecord = {
      id: Date.now(),
      playerId: pid,
      settledOnHole: settleLastHole,
      settledAt: new Date().toISOString()
    }

    setNassauMatch({
      ...nassauMatch,
      participantDetails: newDetails,
      settlements: [...(nassauMatch.settlements || []), settlementRecord]
    })

    // Mark remaining holes as X
    if (liveRound && settleLastHole > 0) {
      const updatedTeams = liveRound.teams.map(team => ({
        ...team,
        players: team.players.map(player => {
          if (String(player.id) === pid) {
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

    setShowSettleModal(false)
    setSettlePlayer(null)
    setSettleLastHole(0)
  }

  // === CANCEL MATCH ===
  const cancelMatch = () => {
    if (!isCasualGame && cancelPinInput !== '1234') {
      alert('Incorrect PIN')
      setCancelPinInput('')
      return
    }
    setNassauMatch(null)
    setShowCancelConfirm(false)
    setCancelPinInput('')
  }

  // =====================
  // RENDER: No match yet
  // =====================
  if (!nassauMatch) {
    return (
      <div>
        <div style={{
          background: 'var(--color-success-light)',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: '15px' }}>No {isCasualGame ? 'Nassau' : 'Side Nassau'} Match Active</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            Set up a {isCasualGame ? 'Nassau' : 'Side Nassau'} match — 3-bet match play (front 9, back 9, overall) between every pair of players.
          </p>
          <button className="btn btn-primary" onClick={() => setShowSetup(true)}>
            Setup {isCasualGame ? 'Nassau' : 'Side Nassau'} Match
          </button>
        </div>

        {showSetup && (
          <div className="modal-overlay" onClick={() => setShowSetup(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-header" style={{ background: 'var(--color-nassau)' }}>
                <h3 style={{ color: 'var(--color-text-on-primary)', margin: 0 }}>{isCasualGame ? 'Nassau' : 'Side Nassau'} Match Settings</h3>
                <button className="modal-close" onClick={() => setShowSetup(false)} style={{ color: 'var(--color-text-on-primary)' }}>&times;</button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label>Bet Amount Per Segment ($)</label>
                  <input
                    type="number"
                    value={settings.betAmount}
                    onChange={e => setSettings({ ...settings, betAmount: parseFloat(e.target.value) || 2 })}
                    min="0.5"
                    step="0.5"
                  />
                  <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    Each pair bets this amount on front 9, back 9, and overall (3 bets total)
                  </div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Use Handicaps</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setSettings({ ...settings, useHandicaps: true })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: settings.useHandicaps ? '2px solid var(--color-nassau)' : '2px solid var(--color-border)', background: settings.useHandicaps ? 'var(--color-success-light)' : 'var(--color-surface)', fontWeight: settings.useHandicaps ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                    <button onClick={() => setSettings({ ...settings, useHandicaps: false })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: !settings.useHandicaps ? '2px solid var(--color-nassau)' : '2px solid var(--color-border)', background: !settings.useHandicaps ? 'var(--color-success-light)' : 'var(--color-surface)', fontWeight: !settings.useHandicaps ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    Net strokes applied per hole based on player handicaps
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={setupNassau}
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  Start {isCasualGame ? 'Nassau' : 'Side Nassau'} Match
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ===========================
  // RENDER: Active match
  // ===========================
  return (
    <div>
      {/* Nassau Header */}
      <div style={{ background: 'var(--color-surface)', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px' }}>
        <div style={{
          background: 'var(--color-nassau)',
          color: 'var(--color-text-on-primary)',
          padding: '12px 15px',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{isCasualGame ? 'Nassau' : 'Side Nassau'} Match</span>
          <span style={{ fontSize: '13px', opacity: 0.9 }}>
            ${nassauMatch.settings.betAmount}/bet - {nassauPlayers.length} players - {pairKeys.length} {pairKeys.length === 1 ? 'match' : 'matches'}
          </span>
        </div>

        {/* Settings Summary */}
        <div style={{ padding: '10px 15px', background: 'var(--color-success-light)', fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <span>3 bets/pair (front, back, overall)</span>
          {nassauMatch.settings.useHandicaps && <span style={{ color: 'var(--color-nassau)', fontWeight: '600' }}>Net (handicaps)</span>}
          {(nassauMatch.presses || []).length > 0 && (
            <span style={{ color: '#e65100', fontWeight: '600' }}>
              {nassauMatch.presses.length} active {nassauMatch.presses.length === 1 ? 'press' : 'presses'}
            </span>
          )}
          {isAdmin && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setShowCancelConfirm(true); setCancelPinInput('') }}
                style={{ background: 'var(--color-danger)', color: 'var(--color-text-on-primary)', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
              >
                Cancel Match
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Player Management */}
      {(isAdmin || isCasualGame) && (
        <div style={{ background: 'var(--color-surface)', borderRadius: '10px', padding: '15px', marginBottom: '15px' }}>
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '10px' }}>
            {isCasualGame ? 'Players' : 'Manage Players (Admin)'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {allRoundPlayers.map(player => {
              const pid = String(player.id)
              const inNassau = nassauMatch.participants.includes(pid)
              const details = nassauMatch.participantDetails?.[pid] || {}
              const isSettled = details.isSettled

              return (
                <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => !isSettled && handleToggleParticipant(player.id)}
                    disabled={isSettled}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: `2px solid ${isSettled ? '#ccc' : inNassau ? 'var(--color-nassau)' : 'var(--color-border)'}`,
                      background: isSettled ? '#f5f5f5' : inNassau ? 'var(--color-success-light)' : 'var(--color-surface)',
                      color: isSettled ? 'var(--color-text-tertiary)' : inNassau ? 'var(--color-nassau)' : 'var(--color-text-secondary)',
                      fontWeight: inNassau ? '600' : 'normal',
                      cursor: isSettled ? 'default' : 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    {inNassau && !isSettled && '✓ '}{player.name}
                    {isSettled && ' (settled)'}
                  </button>
                  {inNassau && !isSettled && (isAdmin || isCasualGame) && (
                    <button
                      onClick={() => { setSettlePlayer(player); setSettleLastHole(currentHole); setShowSettleModal(true) }}
                      style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--color-danger)', background: 'var(--color-surface)', color: 'var(--color-danger)', fontSize: '10px', cursor: 'pointer' }}
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

      {/* Pair Selector */}
      {pairKeys.length > 0 && (
        <div style={{ marginBottom: '15px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', gap: '8px', minWidth: 'min-content' }}>
            {pairKeys.map(key => {
              const pair = nassauResults.pairs[key]
              const p1Name = getPlayerName(liveRound, pair.player1)
              const p2Name = getPlayerName(liveRound, pair.player2)
              const isActive = key === activePairKey
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPair(key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: `2px solid ${isActive ? 'var(--color-nassau)' : 'var(--color-border)'}`,
                    background: isActive ? 'var(--color-success-light)' : 'var(--color-surface)',
                    fontWeight: isActive ? '600' : 'normal',
                    color: isActive ? 'var(--color-nassau)' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {p1Name.split(' ')[0]} vs {p2Name.split(' ')[0]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Hole-by-Hole for Selected Pair */}
      {activePair && (
        <div style={{ background: 'var(--color-surface)', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px' }}>
          <div style={{ padding: '12px 15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>
              {getPlayerName(liveRound, activePair.player1)} vs {getPlayerName(liveRound, activePair.player2)}
            </span>
            {/* View toggle */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {['front', 'back', 'overall'].map(v => (
                <button
                  key={v}
                  onClick={() => setNassauView(v)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: nassauView === v ? '1px solid var(--color-nassau)' : '1px solid var(--color-border)',
                    background: nassauView === v ? 'var(--color-success-light)' : 'var(--color-surface)',
                    fontSize: '11px',
                    fontWeight: nassauView === v ? '600' : 'normal',
                    cursor: 'pointer'
                  }}
                >
                  {v === 'front' ? 'F9' : v === 'back' ? 'B9' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Segment Status Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 15px', background: '#fafafa', borderBottom: '1px solid #eee' }}>
            {[
              { label: 'Front', data: activePair.front9 },
              { label: 'Back', data: activePair.back9 },
              { label: 'Overall', data: activePair.overall }
            ].map(seg => {
              const status = getSegmentStatus(seg.data, activePair.player1, activePair)
              return (
                <div key={seg.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{seg.label}</div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: status.color }}>{status.text}</div>
                </div>
              )
            })}
          </div>

          {/* Hole-by-hole grid */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', position: 'sticky', left: 0, background: '#f5f5f5', minWidth: '70px' }}>Hole</th>
                  {getHoleRange().map(h => (
                    <th key={h} style={{ padding: '6px 4px', textAlign: 'center', minWidth: '32px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Player 1 row */}
                <tr>
                  <td style={{ padding: '6px 8px', fontWeight: '600', position: 'sticky', left: 0, background: 'var(--color-surface)', borderRight: '1px solid #eee' }}>
                    {getPlayerName(liveRound, activePair.player1).split(' ')[0]}
                  </td>
                  {getHoleRange().map(h => {
                    const hResult = activePair.holeByHole[h]
                    return (
                      <td key={h} style={{
                        padding: '6px 4px',
                        textAlign: 'center',
                        fontWeight: '600',
                        background: getCellColor(hResult, 'p1'),
                        color: getCellTextColor(hResult, 'p1')
                      }}>
                        {hResult?.gross1 ?? '-'}
                      </td>
                    )
                  })}
                </tr>
                {/* Player 2 row */}
                <tr>
                  <td style={{ padding: '6px 8px', fontWeight: '600', position: 'sticky', left: 0, background: 'var(--color-surface)', borderRight: '1px solid #eee' }}>
                    {getPlayerName(liveRound, activePair.player2).split(' ')[0]}
                  </td>
                  {getHoleRange().map(h => {
                    const hResult = activePair.holeByHole[h]
                    return (
                      <td key={h} style={{
                        padding: '6px 4px',
                        textAlign: 'center',
                        fontWeight: '600',
                        background: getCellColor(hResult, 'p2'),
                        color: getCellTextColor(hResult, 'p2')
                      }}>
                        {hResult?.gross2 ?? '-'}
                      </td>
                    )
                  })}
                </tr>
                {/* Result row */}
                <tr style={{ borderTop: '2px solid #eee' }}>
                  <td style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--color-text-tertiary)', position: 'sticky', left: 0, background: 'var(--color-surface)', borderRight: '1px solid #eee' }}>Result</td>
                  {getHoleRange().map(h => {
                    const hResult = activePair.holeByHole[h]
                    return (
                      <td key={h} style={{ padding: '4px', textAlign: 'center', fontSize: '10px', color: getResultColor(hResult) }}>
                        {getResultSymbol(hResult)}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Press Buttons */}
          {(isAdmin || isCasualGame) && (
            <div style={{ padding: '10px 15px', borderTop: '1px solid #eee', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(() => {
                const buttons = []
                const p1 = activePair.player1
                const p2 = activePair.player2
                const p1Can = canPress(nassauMatch, nassauResults, p1, p2, currentHole)
                const p2Can = canPress(nassauMatch, nassauResults, p2, p1, currentHole)

                if (p1Can.canPress) {
                  buttons.push(
                    <button
                      key={`press-${p1}`}
                      onClick={() => handlePress(p1, p2)}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: '2px solid #e65100',
                        background: '#fff3e0', color: '#e65100', fontWeight: '600', fontSize: '12px', cursor: 'pointer'
                      }}
                    >
                      {getPlayerName(liveRound, p1).split(' ')[0]} Press ({p1Can.segment} h{p1Can.startHole}-{p1Can.endHole})
                    </button>
                  )
                }
                if (p2Can.canPress) {
                  buttons.push(
                    <button
                      key={`press-${p2}`}
                      onClick={() => handlePress(p2, p1)}
                      style={{
                        padding: '6px 12px', borderRadius: '6px', border: '2px solid #e65100',
                        background: '#fff3e0', color: '#e65100', fontWeight: '600', fontSize: '12px', cursor: 'pointer'
                      }}
                    >
                      {getPlayerName(liveRound, p2).split(' ')[0]} Press ({p2Can.segment} h{p2Can.startHole}-{p2Can.endHole})
                    </button>
                  )
                }

                if (buttons.length === 0) {
                  return <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>No press available</span>
                }
                return buttons
              })()}
            </div>
          )}

          {/* Active Presses for this pair */}
          {activePair.presses.length > 0 && (
            <div style={{ padding: '10px 15px', borderTop: '1px solid #eee', background: 'var(--color-warning-light)' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#e65100', marginBottom: '6px' }}>Active Presses</div>
              {activePair.presses.map(pr => {
                const presserName = getPlayerName(liveRound, pr.pressedBy).split(' ')[0]
                const statusText = pr.winner
                  ? `Won by ${getPlayerName(liveRound, pr.winner).split(' ')[0]}`
                  : pr.wins.p1 === pr.wins.p2
                  ? 'Push'
                  : 'In progress'
                return (
                  <div key={pr.id} style={{ fontSize: '12px', padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{presserName} pressed {pr.segment} h{pr.startHole}-{pr.endHole} (${pr.betAmount})</span>
                    <span style={{ fontWeight: '600', color: pr.winner ? 'var(--color-nassau)' : 'var(--color-text-secondary)' }}>{statusText}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Overall Summary Grid */}
      {pairKeys.length > 0 && (
        <div style={{ background: 'var(--color-surface)', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px' }}>
          <div style={{ padding: '12px 15px', borderBottom: '1px solid #eee', fontWeight: '600', fontSize: '14px' }}>
            Match Summary
          </div>

          {/* All pairs compact view */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Match</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Front</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Back</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Overall</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Presses</th>
                </tr>
              </thead>
              <tbody>
                {pairKeys.map(key => {
                  const pair = nassauResults.pairs[key]
                  const p1Name = getPlayerName(liveRound, pair.player1).split(' ')[0]
                  const p2Name = getPlayerName(liveRound, pair.player2).split(' ')[0]
                  const fStatus = getSegmentStatus(pair.front9, pair.player1, pair)
                  const bStatus = getSegmentStatus(pair.back9, pair.player1, pair)
                  const oStatus = getSegmentStatus(pair.overall, pair.player1, pair)
                  const pressCount = pair.presses.length

                  return (
                    <tr key={key} style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: key === activePairKey ? '#f0fff0' : 'var(--color-surface)' }}
                        onClick={() => setSelectedPair(key)}>
                      <td style={{ padding: '8px', fontWeight: '500' }}>{p1Name} v {p2Name}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: fStatus.color }}>{fStatus.text}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: bStatus.color }}>{bStatus.text}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: oStatus.color }}>{oStatus.text}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: pressCount > 0 ? '#e65100' : '#ccc' }}>{pressCount || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Per-player net amounts */}
          <div style={{ padding: '12px 15px', borderTop: '2px solid #eee' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Player Totals</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {nassauPlayers.map(player => {
                const pid = String(player.id)
                const summary = nassauSummary.playerSummaries[pid]
                if (!summary) return null
                const net = summary.netAmount
                return (
                  <div key={pid} style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: net > 0 ? 'var(--color-success-light)' : net < 0 ? 'var(--color-danger-light)' : '#f5f5f5',
                    border: `1px solid ${net > 0 ? '#c8e6c9' : net < 0 ? '#ffcdd2' : 'var(--color-border)'}`,
                    textAlign: 'center',
                    minWidth: '80px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '500' }}>{player.name?.split(' ')[0]}</div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: net > 0 ? 'var(--color-nassau)' : net < 0 ? '#c62828' : 'var(--color-text-secondary)'
                    }}>
                      {net > 0 ? '+' : ''}{net === 0 ? 'E' : `$${net}`}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
                      {summary.betsWon}W {summary.betsLost}L {summary.betsPushed}P
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {nassauPlayers.length < 2 && (
        <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '10px', textAlign: 'center', color: '#e65100' }}>
          Add at least 2 players to start tracking Nassau matches.
        </div>
      )}

      {/* PIN Prompt Modal */}
      {showPinPrompt && (
        <div className="modal-overlay" onClick={() => { setShowPinPrompt(false); setPinInput(''); setPendingPlayerId(null) }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px' }}>
            <div className="modal-header" style={{ background: 'var(--color-nassau)' }}>
              <h3 style={{ color: 'var(--color-text-on-primary)', margin: 0 }}>Enter Admin PIN</h3>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <p>PIN required to add/remove Nassau players during a live round</p>
              <input
                type="password"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                placeholder="Enter PIN"
                onKeyDown={e => e.key === 'Enter' && confirmToggleParticipant()}
                style={{ width: '100%', padding: '10px', fontSize: '16px', textAlign: 'center', borderRadius: '6px', border: '2px solid var(--color-border)', marginBottom: '15px' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn" onClick={() => { setShowPinPrompt(false); setPinInput(''); setPendingPlayerId(null) }} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary" onClick={confirmToggleParticipant} style={{ flex: 1 }}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Match Modal */}
      {showCancelConfirm && (
        <div className="modal-overlay" onClick={() => setShowCancelConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '350px' }}>
            <div className="modal-header" style={{ background: 'var(--color-danger)' }}>
              <h3 style={{ color: 'var(--color-text-on-primary)', margin: 0 }}>Cancel {isCasualGame ? 'Nassau' : 'Side Nassau'} Match?</h3>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <p>This will remove the {isCasualGame ? 'Nassau' : 'Side Nassau'} match and all results. This cannot be undone.</p>
              {!isCasualGame && (
                <input
                  type="password"
                  value={cancelPinInput}
                  onChange={e => setCancelPinInput(e.target.value)}
                  placeholder="Enter Admin PIN"
                  onKeyDown={e => e.key === 'Enter' && cancelMatch()}
                  style={{ width: '100%', padding: '10px', fontSize: '16px', textAlign: 'center', borderRadius: '6px', border: '2px solid var(--color-border)', marginBottom: '15px' }}
                  autoFocus
                />
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn" onClick={() => setShowCancelConfirm(false)} style={{ flex: 1 }}>Keep Match</button>
                <button className="btn" onClick={cancelMatch} style={{ flex: 1, background: 'var(--color-danger)', color: 'var(--color-text-on-primary)' }}>Cancel Match</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settle & Leave Modal */}
      {showSettleModal && settlePlayer && (
        <div className="modal-overlay" onClick={() => setShowSettleModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #e65100 0%, #f57c00 100%)' }}>
              <h3 style={{ color: 'var(--color-text-on-primary)', margin: 0 }}>Settle {settlePlayer.name}</h3>
              <button className="modal-close" onClick={() => setShowSettleModal(false)} style={{ color: 'var(--color-text-on-primary)' }}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '15px' }}>Select the last hole {settlePlayer.name} will play:</p>
              <select
                value={settleLastHole}
                onChange={e => setSettleLastHole(parseInt(e.target.value))}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid var(--color-border)', marginBottom: '15px', fontSize: '14px' }}
              >
                <option value={0}>None (left before playing)</option>
                {Array.from({ length: 18 }, (_, i) => i + 1).map(h => (
                  <option key={h} value={h}>Hole {h}</option>
                ))}
              </select>

              {/* Settlement preview */}
              {settleLastHole > 0 && (
                <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Settlement Preview</div>
                  {pairKeys.filter(key => {
                    const pair = nassauResults.pairs[key]
                    return pair.player1 === String(settlePlayer.id) || pair.player2 === String(settlePlayer.id)
                  }).map(key => {
                    const pair = nassauResults.pairs[key]
                    const oppId = pair.player1 === String(settlePlayer.id) ? pair.player2 : pair.player1
                    const oppName = getPlayerName(liveRound, oppId).split(' ')[0]
                    const betAmt = nassauMatch.settings.betAmount || 2

                    // Count settled segments
                    const segments = []
                    if (settleLastHole >= 9) segments.push({ name: 'Front', data: pair.front9 })
                    if (settleLastHole >= 18) segments.push({ name: 'Back', data: pair.back9 })
                    if (settleLastHole >= 18) segments.push({ name: 'Overall', data: pair.overall })

                    return (
                      <div key={key} style={{ fontSize: '12px', padding: '4px 0' }}>
                        <span style={{ fontWeight: '500' }}>vs {oppName}:</span>
                        {segments.length === 0 && <span style={{ color: 'var(--color-text-tertiary)' }}> No segments completed</span>}
                        {segments.map(seg => {
                          const status = getSegmentStatus(seg.data, String(settlePlayer.id), pair)
                          return (
                            <span key={seg.name} style={{ marginLeft: '8px', color: status.color, fontWeight: '600' }}>
                              {seg.name}: {status.text}
                            </span>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn" onClick={() => setShowSettleModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn btn-primary" onClick={finalizeSettlement} style={{ flex: 1 }}>Settle</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // === HELPER FUNCTIONS ===

  function getHoleRange() {
    if (nassauView === 'front') return [1, 2, 3, 4, 5, 6, 7, 8, 9]
    if (nassauView === 'back') return [10, 11, 12, 13, 14, 15, 16, 17, 18]
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
  }

  function getCellColor(hResult, player) {
    if (!hResult || hResult.status === 'inactive') return '#f9f9f9'
    if (hResult.status === 'pending') return 'var(--color-surface)'
    if (hResult.status === 'halved') return '#f5f5f5'
    if (hResult.status === player) return 'var(--color-success-light)'
    return 'var(--color-danger-light)'
  }

  function getCellTextColor(hResult, player) {
    if (!hResult || hResult.status === 'inactive') return '#ccc'
    if (hResult.status === 'pending') return 'var(--color-text-primary)'
    if (hResult.status === 'halved') return 'var(--color-text-secondary)'
    if (hResult.status === player) return 'var(--color-nassau)'
    return '#c62828'
  }

  function getResultColor(hResult) {
    if (!hResult || hResult.status === 'inactive' || hResult.status === 'pending') return '#ccc'
    if (hResult.status === 'halved') return 'var(--color-text-tertiary)'
    return 'var(--color-text-primary)'
  }

  function getResultSymbol(hResult) {
    if (!hResult || hResult.status === 'inactive') return ''
    if (hResult.status === 'pending') return '-'
    if (hResult.status === 'halved') return '='
    if (hResult.status === 'p1') return '1'
    if (hResult.status === 'p2') return '2'
    return ''
  }
}
