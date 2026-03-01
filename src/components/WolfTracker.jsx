import { useState, useMemo } from 'react'
import {
  calculateWolfResults,
  getWolfSummary,
  getWolfForHole,
  canMakeDecision,
  getPlayerScore,
  getPlayerName
} from '../utils/wolfCalculations'

export default function WolfTracker({ liveRound, setLiveRound, wolfMatch, setWolfMatch, isAdmin, leaguePlayers, isCasualGame }) {
  // Setup state
  const [showSetup, setShowSetup] = useState(false)
  const [settings, setSettings] = useState({
    betAmount: 1,
    useHandicaps: false,
    selectionMode: 'blind',
    lastPlaceWolf17_18: false,
    blindWolfMultiplier: 3,
    loneWolfMultiplier: 2
  })
  const [setupOrder, setSetupOrder] = useState([])

  // Active match state
  const [selectedHole, setSelectedHole] = useState(null)
  const [showPartnerPicker, setShowPartnerPicker] = useState(false)

  // Cancel
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelPinInput, setCancelPinInput] = useState('')

  // Calculate results
  const wolfResults = useMemo(
    () => calculateWolfResults(wolfMatch, liveRound),
    [wolfMatch, liveRound]
  )
  const wolfSummary = useMemo(
    () => getWolfSummary(wolfResults, wolfMatch),
    [wolfResults, wolfMatch]
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

  // Auto-select current hole if none selected
  const activeHole = selectedHole || currentHole

  // Get participant player objects
  const wolfPlayers = useMemo(() => {
    if (!wolfMatch?.participants) return []
    return wolfMatch.participants.map(pid => {
      const found = allRoundPlayers.find(p => String(p.id) === String(pid))
      return found || { id: pid, name: getPlayerName(liveRound, pid) }
    })
  }, [wolfMatch, allRoundPlayers, liveRound])

  // Check if scores exist for all 4 players on a hole
  const allScoredForHole = (hole) => {
    if (!wolfMatch?.participants) return false
    return wolfMatch.participants.every(pid => getPlayerScore(liveRound, pid, hole) !== null)
  }

  // === SETUP ===
  const setupWolf = () => {
    if (setupOrder.length !== 4) return

    setWolfMatch({
      settings: {
        ...settings,
        betAmount: parseFloat(settings.betAmount) || 1
      },
      participants: setupOrder.map(p => String(p.id)),
      participantDetails: Object.fromEntries(
        setupOrder.map(p => [String(p.id), { joinedOnHole: 1, leftOnHole: null, isSettled: false, settledOnHole: null }])
      ),
      holeDecisions: {},
      settlements: []
    })
    setShowSetup(false)
  }

  // === DECISION MAKING ===
  const makeDecision = (hole, decision, partnerId = null) => {
    if (!wolfMatch) return
    const wolf = getWolfForHole(wolfMatch, hole, liveRound)
    if (!wolf) return

    const newDecisions = {
      ...(wolfMatch.holeDecisions || {}),
      [hole]: {
        wolf,
        decision,
        partner: partnerId
      }
    }

    setWolfMatch({
      ...wolfMatch,
      holeDecisions: newDecisions
    })
    setShowPartnerPicker(false)
  }

  // === CANCEL ===
  const cancelMatch = () => {
    if (!isCasualGame && cancelPinInput !== '1234') {
      alert('Incorrect PIN')
      setCancelPinInput('')
      return
    }
    setWolfMatch(null)
    setShowCancelConfirm(false)
    setCancelPinInput('')
  }

  // Toggle player in setup order
  const toggleSetupPlayer = (player) => {
    const pid = String(player.id)
    const existing = setupOrder.find(p => String(p.id) === pid)
    if (existing) {
      setSetupOrder(setupOrder.filter(p => String(p.id) !== pid))
    } else if (setupOrder.length < 4) {
      setSetupOrder([...setupOrder, player])
    }
  }

  const moveSetupPlayer = (idx, direction) => {
    const newOrder = [...setupOrder]
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= newOrder.length) return
    const temp = newOrder[idx]
    newOrder[idx] = newOrder[targetIdx]
    newOrder[targetIdx] = temp
    setSetupOrder(newOrder)
  }

  // =====================
  // RENDER: No match yet
  // =====================
  if (!wolfMatch) {
    return (
      <div>
        <div style={{
          background: '#F3EEFF',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: '15px' }}>No Wolf Game Active</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            Wolf is a 4-player rotation game. Each hole, one player is the Wolf and chooses a partner or goes alone.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => { setShowSetup(true); setSetupOrder([]) }}
            style={{ background: 'var(--color-wolf)' }}
          >
            Setup Wolf Game
          </button>
        </div>

        {showSetup && (
          <div className="modal-overlay" onClick={() => setShowSetup(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
              <div className="modal-header" style={{ background: 'var(--color-wolf)' }}>
                <h3 style={{ color: 'var(--color-text-on-primary)', margin: 0 }}>Wolf Game Settings</h3>
                <button className="modal-close" onClick={() => setShowSetup(false)} style={{ color: 'var(--color-text-on-primary)' }}>&times;</button>
              </div>
              <div className="modal-body">
                {/* Player Selection */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Select 4 Players (tap order = rotation)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                    {allRoundPlayers.map(player => {
                      const isSelected = setupOrder.some(p => String(p.id) === String(player.id))
                      const orderIdx = setupOrder.findIndex(p => String(p.id) === String(player.id))
                      return (
                        <button
                          key={player.id}
                          onClick={() => toggleSetupPlayer(player)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '20px',
                            border: `2px solid ${isSelected ? 'var(--color-wolf)' : 'var(--color-border)'}`,
                            background: isSelected ? '#F3EEFF' : 'var(--color-surface)',
                            color: isSelected ? 'var(--color-wolf)' : 'var(--color-text-secondary)',
                            fontWeight: isSelected ? '600' : 'normal',
                            cursor: 'pointer',
                            fontSize: '13px',
                            position: 'relative'
                          }}
                        >
                          {isSelected && <span style={{ marginRight: '4px', fontWeight: '700' }}>{orderIdx + 1}.</span>}
                          {player.name}
                        </button>
                      )
                    })}
                  </div>
                  {setupOrder.length > 0 && (
                    <div style={{ background: '#fafafa', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '6px' }}>Rotation Order (drag to reorder):</div>
                      {setupOrder.map((player, idx) => (
                        <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                          <span style={{ width: '20px', fontWeight: '700', color: 'var(--color-wolf)' }}>{idx + 1}.</span>
                          <span style={{ flex: 1, fontSize: '14px' }}>{player.name}</span>
                          <button
                            onClick={() => moveSetupPlayer(idx, -1)}
                            disabled={idx === 0}
                            style={{ padding: '2px 8px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--color-surface)', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}
                          >
                            Up
                          </button>
                          <button
                            onClick={() => moveSetupPlayer(idx, 1)}
                            disabled={idx === setupOrder.length - 1}
                            style={{ padding: '2px 8px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--color-surface)', cursor: idx === setupOrder.length - 1 ? 'default' : 'pointer', opacity: idx === setupOrder.length - 1 ? 0.3 : 1 }}
                          >
                            Dn
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {setupOrder.length !== 4 && (
                    <div style={{ fontSize: '12px', color: 'var(--color-danger)' }}>
                      Select exactly 4 players ({setupOrder.length}/4 selected)
                    </div>
                  )}
                </div>

                {/* Settings */}
                <div className="input-group" style={{ marginBottom: '12px' }}>
                  <label>Bet Amount Per Hole ($)</label>
                  <input
                    type="number"
                    value={settings.betAmount}
                    onChange={e => setSettings({ ...settings, betAmount: parseFloat(e.target.value) || 1 })}
                    min="0.5"
                    step="0.5"
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Partner Selection</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[{ val: 'blind', label: 'Blind' }, { val: 'informed', label: 'Informed' }].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => setSettings({ ...settings, selectionMode: opt.val })}
                        style={{
                          flex: 1, padding: '10px', borderRadius: '6px',
                          border: `2px solid ${settings.selectionMode === opt.val ? 'var(--color-wolf)' : 'var(--color-border)'}`,
                          background: settings.selectionMode === opt.val ? '#F3EEFF' : 'var(--color-surface)',
                          fontWeight: settings.selectionMode === opt.val ? '600' : 'normal',
                          cursor: 'pointer'
                        }}
                      >{opt.label}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    Blind: choose before scores entered. Informed: choose after seeing scores.
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Use Handicaps</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setSettings({ ...settings, useHandicaps: true })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: settings.useHandicaps ? '2px solid var(--color-wolf)' : '2px solid var(--color-border)', background: settings.useHandicaps ? '#F3EEFF' : 'var(--color-surface)', fontWeight: settings.useHandicaps ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                    <button onClick={() => setSettings({ ...settings, useHandicaps: false })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: !settings.useHandicaps ? '2px solid var(--color-wolf)' : '2px solid var(--color-border)', background: !settings.useHandicaps ? '#F3EEFF' : 'var(--color-surface)', fontWeight: !settings.useHandicaps ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.lastPlaceWolf17_18}
                    onChange={(e) => setSettings({ ...settings, lastPlaceWolf17_18: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--color-wolf)' }}
                  />
                  <span style={{ fontSize: '14px' }}>Last place is Wolf on 17 & 18</span>
                </label>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px' }}>Lone Wolf Mult.</label>
                    <input type="number" value={settings.loneWolfMultiplier} onChange={e => setSettings({ ...settings, loneWolfMultiplier: parseInt(e.target.value) || 2 })} min="1" max="5" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '14px', textAlign: 'center' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '12px' }}>Blind Wolf Mult.</label>
                    <input type="number" value={settings.blindWolfMultiplier} onChange={e => setSettings({ ...settings, blindWolfMultiplier: parseInt(e.target.value) || 3 })} min="1" max="5" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '14px', textAlign: 'center' }} />
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={setupWolf}
                  disabled={setupOrder.length !== 4}
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    background: setupOrder.length === 4 ? 'var(--color-wolf)' : '#ccc',
                    cursor: setupOrder.length === 4 ? 'pointer' : 'default'
                  }}
                >
                  Start Wolf Game
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

  const wolfForActiveHole = getWolfForHole(wolfMatch, activeHole, liveRound)
  const holeDecision = wolfMatch.holeDecisions?.[activeHole]
  const holeResult = wolfResults.holes?.[activeHole]
  const needsDecision = canMakeDecision(wolfMatch, activeHole) && wolfForActiveHole
  const isBlindMode = wolfMatch.settings?.selectionMode === 'blind'

  // Check if scores already entered (warn in blind mode)
  const scoresEnteredForHole = allScoredForHole(activeHole)

  return (
    <div>
      {/* Wolf Header */}
      <div style={{ background: 'var(--color-surface)', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px' }}>
        <div style={{
          background: 'var(--color-wolf)',
          color: 'var(--color-text-on-primary)',
          padding: '12px 15px',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Wolf Game</span>
          <span style={{ fontSize: '13px', opacity: 0.9 }}>
            ${wolfMatch.settings.betAmount}/hole - {wolfMatch.settings.selectionMode === 'blind' ? 'Blind' : 'Informed'}
            {wolfMatch.settings.useHandicaps ? ' - Net' : ''}
          </span>
        </div>

        <div style={{ padding: '10px 15px', background: '#F3EEFF', fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <span>Lone {wolfMatch.settings.loneWolfMultiplier}x, Blind {wolfMatch.settings.blindWolfMultiplier}x</span>
          {wolfMatch.settings.lastPlaceWolf17_18 && <span style={{ color: 'var(--color-wolf)', fontWeight: '600' }}>Last place Wolf 17/18</span>}
          {isAdmin && (
            <div style={{ marginLeft: 'auto' }}>
              <button
                onClick={() => { setShowCancelConfirm(true); setCancelPinInput('') }}
                style={{ background: 'var(--color-danger)', color: 'var(--color-text-on-primary)', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
              >
                Cancel Game
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hole Selector */}
      <div style={{ marginBottom: '15px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: '4px', minWidth: 'min-content' }}>
          {Array.from({ length: 18 }, (_, i) => i + 1).map(h => {
            const hr = wolfResults.holes?.[h]
            const isActive = h === activeHole
            const isComplete = hr?.status === 'complete'
            const isPending = !hr || hr.status === 'pending'
            const wolfId = getWolfForHole(wolfMatch, h, liveRound)
            const wolfIdx = wolfMatch.participants.indexOf(wolfId)
            const wolfColors = ['#e91e63', '#2196f3', '#ff9800', '#4caf50']

            return (
              <button
                key={h}
                onClick={() => setSelectedHole(h)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  border: isActive ? '2px solid var(--color-wolf)' : '1px solid var(--color-border)',
                  background: isActive ? '#F3EEFF' : isComplete ? (hr.winner === 'wolf' ? 'var(--color-success-light)' : hr.winner === 'field' ? 'var(--color-danger-light)' : '#f5f5f5') : 'var(--color-surface)',
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? 'var(--color-wolf)' : isComplete ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  position: 'relative',
                  flexShrink: 0
                }}
              >
                {h}
                {/* Wolf indicator dot */}
                <div style={{
                  position: 'absolute',
                  bottom: '2px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: wolfColors[wolfIdx] || 'var(--color-text-tertiary)'
                }} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Hole Detail */}
      <div style={{ background: 'var(--color-surface)', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px' }}>
        <div style={{
          padding: '12px 15px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontWeight: '700', fontSize: '16px' }}>Hole {activeHole}</span>
          <span style={{ fontSize: '14px', color: 'var(--color-wolf)', fontWeight: '600' }}>
            Wolf: {getPlayerName(liveRound, wolfForActiveHole)}
          </span>
        </div>

        {/* Decision Interface */}
        {needsDecision && (
          <div style={{ padding: '15px', background: '#F3EEFF', borderBottom: '1px solid #e1bee7' }}>
            {isBlindMode && scoresEnteredForHole && (
              <div style={{ background: '#fff3e0', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px', fontSize: '12px', color: '#e65100', fontWeight: '500' }}>
                Scores already entered - Blind Wolf decision should be made before scores are entered!
              </div>
            )}
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
              {getPlayerName(liveRound, wolfForActiveHole)} is the Wolf. Choose:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => setShowPartnerPicker(true)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid var(--color-wolf)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-wolf)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Pick a Partner (1x)
              </button>
              <button
                onClick={() => makeDecision(activeHole, 'lone')}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #e65100',
                  background: '#fff3e0',
                  color: '#e65100',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Lone Wolf ({wolfMatch.settings.loneWolfMultiplier}x)
              </button>
              <button
                onClick={() => makeDecision(activeHole, 'blind')}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #c62828',
                  background: 'var(--color-danger-light)',
                  color: '#c62828',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Blind Wolf ({wolfMatch.settings.blindWolfMultiplier}x)
              </button>
            </div>
          </div>
        )}

        {/* Partner Picker Modal */}
        {showPartnerPicker && (
          <div style={{ padding: '15px', background: '#F3EEFF', borderBottom: '1px solid #e1bee7' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>
              Choose a partner for {getPlayerName(liveRound, wolfForActiveHole)}:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {wolfMatch.participants
                .filter(pid => pid !== wolfForActiveHole)
                .map(pid => (
                  <button
                    key={pid}
                    onClick={() => makeDecision(activeHole, 'partner', pid)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid var(--color-wolf)',
                      background: 'var(--color-surface)',
                      color: 'var(--color-wolf)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {getPlayerName(liveRound, pid)}
                  </button>
                ))}
              <button
                onClick={() => setShowPartnerPicker(false)}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Decision Summary */}
        {holeDecision?.decision && (
          <div style={{ padding: '12px 15px', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '700',
                background: holeDecision.decision === 'blind' ? 'var(--color-danger-light)' : holeDecision.decision === 'lone' ? '#fff3e0' : '#F3EEFF',
                color: holeDecision.decision === 'blind' ? '#c62828' : holeDecision.decision === 'lone' ? '#e65100' : 'var(--color-wolf)'
              }}>
                {holeDecision.decision === 'partner' ? 'PARTNER' : holeDecision.decision === 'lone' ? 'LONE WOLF' : 'BLIND WOLF'}
              </span>
              {holeDecision.decision === 'partner' && holeDecision.partner && (
                <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  {getPlayerName(liveRound, holeDecision.wolf)} + {getPlayerName(liveRound, holeDecision.partner)}
                </span>
              )}
              {holeDecision.decision !== 'partner' && (
                <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                  {getPlayerName(liveRound, holeDecision.wolf)} vs Field
                </span>
              )}
            </div>
          </div>
        )}

        {/* Hole Scores */}
        {holeDecision?.decision && (
          <div style={{ padding: '12px 15px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Player</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Team</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Score</th>
                  {wolfMatch.settings.useHandicaps && <th style={{ padding: '6px 8px', textAlign: 'center' }}>Net</th>}
                </tr>
              </thead>
              <tbody>
                {wolfMatch.participants.map(pid => {
                  const score = getPlayerScore(liveRound, pid, activeHole)
                  const isWolfTeam = holeResult?.wolfTeam?.includes(pid) ?? (pid === holeDecision.wolf || pid === holeDecision.partner)
                  const isWolf = pid === holeDecision.wolf

                  return (
                    <tr key={pid} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '6px 8px', fontWeight: isWolf ? '700' : '500' }}>
                        {getPlayerName(liveRound, pid)}
                        {isWolf && <span style={{ fontSize: '10px', color: 'var(--color-wolf)', marginLeft: '4px' }}>W</span>}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                          background: isWolfTeam ? '#F3EEFF' : '#f5f5f5',
                          color: isWolfTeam ? 'var(--color-wolf)' : 'var(--color-text-secondary)'
                        }}>
                          {isWolfTeam ? 'Wolf' : 'Field'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600' }}>
                        {score ? score.score : '-'}
                      </td>
                      {wolfMatch.settings.useHandicaps && (
                        <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '600', color: 'var(--color-wolf)' }}>
                          {holeResult?.scores?.[pid]?.net ?? '-'}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Hole Result */}
            {holeResult?.status === 'complete' && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                borderRadius: '8px',
                textAlign: 'center',
                background: holeResult.winner === 'wolf' ? 'var(--color-success-light)' : holeResult.winner === 'field' ? 'var(--color-danger-light)' : '#f5f5f5',
                fontWeight: '700',
                fontSize: '14px',
                color: holeResult.winner === 'wolf' ? 'var(--color-nassau)' : holeResult.winner === 'field' ? '#c62828' : 'var(--color-text-secondary)'
              }}>
                {holeResult.winner === 'wolf' && `Wolf wins! (${holeResult.wolfBest} vs ${holeResult.fieldBest})`}
                {holeResult.winner === 'field' && `Field wins! (${holeResult.fieldBest} vs ${holeResult.wolfBest})`}
                {!holeResult.winner && `Tie (${holeResult.wolfBest} vs ${holeResult.fieldBest})`}
                {holeResult.multiplier > 1 && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.8 }}>
                    ({holeResult.multiplier}x)
                  </span>
                )}
              </div>
            )}

            {holeResult?.status === 'waiting_scores' && (
              <div style={{ marginTop: '10px', padding: '8px', borderRadius: '6px', background: '#f5f5f5', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                Waiting for all scores to be entered...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{ background: 'var(--color-surface)', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px' }}>
        <div style={{ padding: '12px 15px', borderBottom: '1px solid #eee', fontWeight: '600', fontSize: '14px' }}>
          Player Totals
        </div>
        <div style={{ padding: '12px 15px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {wolfPlayers.map(player => {
              const pid = String(player.id)
              const summary = wolfSummary.playerSummaries[pid]
              if (!summary) return null
              const net = summary.netAmount
              return (
                <div key={pid} style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: net > 0 ? 'var(--color-success-light)' : net < 0 ? 'var(--color-danger-light)' : '#f5f5f5',
                  border: `1px solid ${net > 0 ? '#c8e6c9' : net < 0 ? '#ffcdd2' : 'var(--color-border)'}`,
                  textAlign: 'center',
                  minWidth: '80px',
                  flex: '1 1 80px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>{player.name?.split(' ')[0]}</div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: net > 0 ? 'var(--color-nassau)' : net < 0 ? '#c62828' : 'var(--color-text-secondary)'
                  }}>
                    {net > 0 ? '+' : ''}{net === 0 ? 'E' : `$${net}`}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                    {summary.holesAsWolf}W {summary.holesWonAsWolf}-{summary.holesLostAsWolf}-{summary.tiesAsWolf}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Hole-by-hole compact results */}
        <div style={{ padding: '0 15px 12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '4px 6px', textAlign: 'left', position: 'sticky', left: 0, background: '#f5f5f5' }}>Hole</th>
                {Array.from({ length: 18 }, (_, i) => i + 1).map(h => (
                  <th key={h} style={{ padding: '4px 3px', textAlign: 'center', minWidth: '26px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '4px 6px', fontWeight: '600', position: 'sticky', left: 0, background: 'var(--color-surface)', fontSize: '10px', color: 'var(--color-text-tertiary)' }}>Wolf</td>
                {Array.from({ length: 18 }, (_, i) => i + 1).map(h => {
                  const hr = wolfResults.holes?.[h]
                  const wolfId = hr?.wolf || getWolfForHole(wolfMatch, h, liveRound)
                  const name = getPlayerName(liveRound, wolfId)
                  return (
                    <td key={h} style={{ padding: '4px 3px', textAlign: 'center', fontSize: '10px', color: 'var(--color-wolf)' }}>
                      {name?.charAt(0) || '?'}
                    </td>
                  )
                })}
              </tr>
              <tr>
                <td style={{ padding: '4px 6px', fontWeight: '600', position: 'sticky', left: 0, background: 'var(--color-surface)', fontSize: '10px', color: 'var(--color-text-tertiary)' }}>Result</td>
                {Array.from({ length: 18 }, (_, i) => i + 1).map(h => {
                  const hr = wolfResults.holes?.[h]
                  if (!hr || hr.status !== 'complete') {
                    return <td key={h} style={{ padding: '4px 3px', textAlign: 'center', color: 'var(--color-border)' }}>-</td>
                  }
                  const decLabel = hr.decision === 'blind' ? 'B' : hr.decision === 'lone' ? 'L' : 'P'
                  return (
                    <td key={h} style={{
                      padding: '4px 3px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: hr.winner === 'wolf' ? 'var(--color-nassau)' : hr.winner === 'field' ? '#c62828' : 'var(--color-text-tertiary)',
                      background: hr.winner === 'wolf' ? 'var(--color-success-light)' : hr.winner === 'field' ? 'var(--color-danger-light)' : 'transparent'
                    }}>
                      {hr.winner === 'wolf' ? 'W' : hr.winner === 'field' ? 'L' : 'T'}{decLabel}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Match Modal */}
      {showCancelConfirm && (
        <div className="modal-overlay" onClick={() => setShowCancelConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '350px' }}>
            <div className="modal-header" style={{ background: 'var(--color-danger)' }}>
              <h3 style={{ color: 'var(--color-text-on-primary)', margin: 0 }}>Cancel Wolf Game?</h3>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <p>This will remove the Wolf game and all results. This cannot be undone.</p>
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
                <button className="btn" onClick={() => setShowCancelConfirm(false)} style={{ flex: 1 }}>Keep Game</button>
                <button className="btn" onClick={cancelMatch} style={{ flex: 1, background: 'var(--color-danger)', color: 'var(--color-text-on-primary)' }}>Cancel Game</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
