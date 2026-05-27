import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../context/LeagueContext'
import { generateTeams, getPlayerHandicap, getPlayerFlightByHandicap, getPlayerSortKey, getPlayerTripAverage } from '../utils/teamGeneration'
import { formatHandicap, formatCourseHandicap, getEffectiveHandicap, getCourseHandicapForTee } from '../utils/handicapCalculation'
import { FORMAT_CONFIGS } from '../utils/formatScoring'

function PlayerCheckInPill({ player, isSelected, isInManualTeam, onToggle, courseTees }) {
  const borderColor = isInManualTeam ? 'var(--color-accent-purple)' : isSelected ? 'var(--color-primary)' : 'var(--color-border)'
  const bgColor = isInManualTeam ? '#F3EEFF' : isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)'
  const textColor = isInManualTeam ? 'var(--color-accent-purple)' : isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)'

  return (
    <button
      onClick={() => !isInManualTeam && onToggle()}
      style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-full)',
        border: `2px solid ${borderColor}`,
        background: bgColor,
        color: textColor,
        fontSize: 'var(--font-size-sm)',
        fontWeight: isSelected || isInManualTeam ? '600' : 'normal',
        cursor: isInManualTeam ? 'not-allowed' : 'pointer',
        opacity: isInManualTeam ? 0.7 : 1,
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      {isSelected ? '✓ ' : ''}{player.name}
    </button>
  )
}

function ManualTeamCard({ team, onDelete }) {
  return (
    <div style={{
      background: 'var(--color-accent-purple)',
      color: 'white',
      padding: '15px',
      borderRadius: '10px',
      marginBottom: '10px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <strong>Manual Team ({team.players.length} players)</strong>
        <button
          onClick={() => onDelete(team.id)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            padding: '4px 10px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Delete
        </button>
      </div>
      <div>
        {team.players.map(p => p.name).join(', ')}
      </div>
    </div>
  )
}

function CreateManualTeamForm({ availablePlayers, onSave, onCancel, courseTees }) {
  const [selectedIds, setSelectedIds] = useState([])

  const togglePlayer = (playerId) => {
    if (selectedIds.includes(playerId)) {
      setSelectedIds(selectedIds.filter(id => id !== playerId))
    } else {
      setSelectedIds([...selectedIds, playerId])
    }
  }

  const handleSave = () => {
    if (selectedIds.length >= 3 && selectedIds.length <= 4) {
      const selectedPlayers = availablePlayers.filter(p => selectedIds.includes(p.id))
      onSave(selectedPlayers)
    }
  }

  return (
    <div style={{ background: 'var(--color-surface-sunken)', padding: '15px', borderRadius: '10px' }}>
      <h4 style={{ marginBottom: '10px' }}>Select 3-4 Players</h4>
      {availablePlayers.map(player => (
        <div
          key={player.id}
          style={{
            background: selectedIds.includes(player.id) ? 'var(--color-success-light)' : 'var(--color-surface)',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '8px',
            cursor: 'pointer'
          }}
          onClick={() => togglePlayer(player.id)}
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(player.id)}
            onChange={() => {}}
            style={{ marginRight: '8px' }}
          />
          {player.name} ({player.handicap !== undefined && player.handicap !== null
            ? `Index: ${formatHandicap(player.handicap)} | Course: ${formatCourseHandicap(getCourseHandicapForTee(player.handicap, player.defaultTee || 'blue', courseTees))}`
            : player.skillRating?.toFixed(1) || '5.0'})
        </div>
      ))}
      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={selectedIds.length < 3 || selectedIds.length > 4}
          style={{ flex: 1 }}
        >
          Save Team ({selectedIds.length} selected)
        </button>
        <button
          className="btn btn-secondary"
          onClick={onCancel}
          style={{ flex: 1 }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function SkinsSetupModal({ onClose, skinsMatch, onSave }) {
  const [settings, setSettings] = useState(skinsMatch?.settings || {
    costPerSkin: '',
    carryovers: true,
    wrapUnwonSkins: true,
    wrapTo: 'front',
    payoutStyle: 'perSkin',
    parOrBetterRequired: false,
    birdieDoubleEagleTriple: false
  })

  const handleSave = () => {
    if (!settings.costPerSkin) {
      alert('Please enter a cost per skin')
      return
    }
    onSave({
      settings,
      participants: skinsMatch?.participants || [],
      results: skinsMatch?.results || {}
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header" style={{ background: 'var(--color-skins)' }}>
          <h2 style={{ margin: 0, color: 'white' }}>{skinsMatch ? 'Edit' : 'Start'} Skins Match</h2>
          <button className="modal-close" onClick={onClose} style={{ color: 'white' }}>&times;</button>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Cost per Skin ($)</label>
            <input type="number" value={settings.costPerSkin} onChange={(e) => setSettings({ ...settings, costPerSkin: e.target.value })} placeholder="1.00" style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid var(--color-border)', fontSize: '16px' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Carryovers</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setSettings({ ...settings, carryovers: true })} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.carryovers ? '2px solid var(--color-skins)' : '2px solid var(--color-border)', background: settings.carryovers ? 'var(--color-warning-light)' : 'var(--color-surface)', fontWeight: settings.carryovers ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
              <button onClick={() => setSettings({ ...settings, carryovers: false })} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: !settings.carryovers ? '2px solid var(--color-skins)' : '2px solid var(--color-border)', background: !settings.carryovers ? 'var(--color-warning-light)' : 'var(--color-surface)', fontWeight: !settings.carryovers ? '600' : 'normal', cursor: 'pointer' }}>No</button>
            </div>
          </div>
          {settings.carryovers && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Wrap Unwon Skins</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setSettings({ ...settings, wrapUnwonSkins: true })} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.wrapUnwonSkins ? '2px solid var(--color-skins)' : '2px solid var(--color-border)', background: settings.wrapUnwonSkins ? 'var(--color-warning-light)' : 'var(--color-surface)', fontWeight: settings.wrapUnwonSkins ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                  <button onClick={() => setSettings({ ...settings, wrapUnwonSkins: false })} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: !settings.wrapUnwonSkins ? '2px solid var(--color-skins)' : '2px solid var(--color-border)', background: !settings.wrapUnwonSkins ? 'var(--color-warning-light)' : 'var(--color-surface)', fontWeight: !settings.wrapUnwonSkins ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                </div>
              </div>
              {settings.wrapUnwonSkins && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Wrap To</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setSettings({ ...settings, wrapTo: 'front' })} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.wrapTo === 'front' ? '2px solid var(--color-skins)' : '2px solid var(--color-border)', background: settings.wrapTo === 'front' ? 'var(--color-warning-light)' : 'var(--color-surface)', fontWeight: settings.wrapTo === 'front' ? '600' : 'normal', cursor: 'pointer' }}>Front 9</button>
                    <button onClick={() => setSettings({ ...settings, wrapTo: 'back' })} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.wrapTo === 'back' ? '2px solid var(--color-skins)' : '2px solid var(--color-border)', background: settings.wrapTo === 'back' ? 'var(--color-warning-light)' : 'var(--color-surface)', fontWeight: settings.wrapTo === 'back' ? '600' : 'normal', cursor: 'pointer' }}>Back 9</button>
                  </div>
                </div>
              )}
            </>
          )}
          <div style={{ marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600' }}>Optional Rules</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.parOrBetterRequired} onChange={(e) => setSettings({ ...settings, parOrBetterRequired: e.target.checked })} style={{ width: '20px', height: '20px' }} />
              <span>Par or better required to win</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.birdieDoubleEagleTriple} onChange={(e) => setSettings({ ...settings, birdieDoubleEagleTriple: e.target.checked })} style={{ width: '20px', height: '20px' }} />
              <span>Birdie = 2x, Eagle = 3x value</span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>{skinsMatch ? 'Save Changes' : 'Create Skins Match'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkinsOptInSection({ selectedPlayers, activePlayers, skinsMatch, setSkinsMatch, liveRound, isAdmin }) {
  const [showSetup, setShowSetup] = useState(false)

  // Get checked-in players
  const checkedInPlayers = activePlayers.filter(p => selectedPlayers.includes(p.id))

  const togglePlayer = (playerId) => {
    const canToggle = !liveRound || isAdmin
    if (!canToggle) return

    const playerIdStr = String(playerId)
    const inSkins = skinsMatch.participants.includes(playerIdStr)
    let newParticipants
    if (inSkins) {
      newParticipants = skinsMatch.participants.filter(id => id !== playerIdStr)
    } else {
      newParticipants = [...skinsMatch.participants, playerIdStr]
    }
    setSkinsMatch({ ...skinsMatch, participants: newParticipants })
  }

  const cancelSkins = () => {
    if (confirm('Cancel skins match?')) {
      setSkinsMatch(null)
    }
  }

  if (checkedInPlayers.length === 0) return null

  if (!skinsMatch) {
    return (
      <div style={{ background: 'var(--color-skins)', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '10px', color: 'white' }}>Side Skins</h3>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', marginBottom: '15px' }}>Set up a side skins competition that runs alongside the league round.</p>
        <button className="btn" onClick={() => setShowSetup(true)} style={{ background: 'white', color: 'var(--color-skins)', fontWeight: '600' }}>Set Up Side Skins Match</button>
        {showSetup && <SkinsSetupModal onClose={() => setShowSetup(false)} skinsMatch={null} onSave={setSkinsMatch} />}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--color-warning-light)', border: '2px solid var(--color-skins)', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: 'var(--color-skins)' }}>Side Skins Match Active</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowSetup(true)} style={{ background: 'var(--color-skins)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
          <button onClick={cancelSkins} style={{ background: 'var(--color-danger)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: 'var(--color-text-secondary)', marginBottom: '15px', fontSize: '13px' }}>
        <span>${skinsMatch.settings.costPerSkin}/skin</span>
        {skinsMatch.settings.carryovers ? <span>| Carryovers ON</span> : <span>| No carryovers</span>}
      </div>
      <div style={{ marginBottom: '15px' }}>
        <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '13px' }}>Tap your name to join or leave:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {checkedInPlayers.map(player => {
            const inSkins = skinsMatch.participants.includes(String(player.id))
            const canToggle = !liveRound || isAdmin
            return (
              <button key={player.id} onClick={() => togglePlayer(player.id)} disabled={!canToggle} style={{ padding: '10px 14px', borderRadius: '20px', border: inSkins ? '2px solid var(--color-primary)' : '2px solid var(--color-border)', background: inSkins ? 'var(--color-success-light)' : 'var(--color-surface)', color: inSkins ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontSize: '13px', fontWeight: inSkins ? '600' : 'normal', cursor: canToggle ? 'pointer' : 'not-allowed', opacity: canToggle ? 1 : 0.7 }}>
                {inSkins ? '✓ ' : ''}{player.name}
              </button>
            )
          })}
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '10px', background: 'var(--color-surface-sunken)', borderRadius: '8px', fontSize: '13px' }}>
        <strong>{skinsMatch.participants.length}</strong> player{skinsMatch.participants.length !== 1 ? 's' : ''} in skins
        {skinsMatch.participants.length >= 2 && <span style={{ color: 'var(--color-primary)' }}> - Ready to play</span>}
      </div>
      {showSetup && <SkinsSetupModal onClose={() => setShowSetup(false)} skinsMatch={skinsMatch} onSave={setSkinsMatch} />}
    </div>
  )
}

function NassauSetupModal({ onClose, nassauMatch, onSave }) {
  const [settings, setSettings] = useState(nassauMatch?.settings || {
    betAmount: 2,
    useHandicaps: false
  })

  const handleSave = () => {
    onSave({
      settings: { ...settings, betAmount: parseFloat(settings.betAmount) || 2 },
      participants: nassauMatch?.participants || [],
      participantDetails: nassauMatch?.participantDetails || {},
      presses: nassauMatch?.presses || [],
      settlements: nassauMatch?.settlements || []
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header" style={{ background: 'var(--color-nassau)' }}>
          <h2 style={{ margin: 0, color: 'white' }}>{nassauMatch ? 'Edit' : 'Set Up'} Side Nassau</h2>
          <button className="modal-close" onClick={onClose} style={{ color: 'white' }}>&times;</button>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Bet Amount Per Segment ($)</label>
            <input
              type="number"
              value={settings.betAmount}
              onChange={(e) => setSettings({ ...settings, betAmount: parseFloat(e.target.value) || 2 })}
              min="0.5"
              step="0.5"
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid var(--color-border)', fontSize: '16px' }}
            />
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
              Each pair bets this amount on front 9, back 9, and overall (3 bets total)
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Use Handicaps</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setSettings({ ...settings, useHandicaps: true })} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.useHandicaps ? '2px solid var(--color-nassau)' : '2px solid var(--color-border)', background: settings.useHandicaps ? 'var(--color-success-light)' : 'var(--color-surface)', fontWeight: settings.useHandicaps ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
              <button onClick={() => setSettings({ ...settings, useHandicaps: false })} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: !settings.useHandicaps ? '2px solid var(--color-nassau)' : '2px solid var(--color-border)', background: !settings.useHandicaps ? 'var(--color-success-light)' : 'var(--color-surface)', fontWeight: !settings.useHandicaps ? '600' : 'normal', cursor: 'pointer' }}>No</button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
              Net strokes applied per hole based on player handicaps
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1, background: 'var(--color-nassau)' }}>
              {nassauMatch ? 'Save Changes' : 'Create Side Nassau'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function NassauOptInSection({ selectedPlayers, activePlayers, nassauMatch, setNassauMatch, liveRound, isAdmin }) {
  const [showSetup, setShowSetup] = useState(false)

  const checkedInPlayers = activePlayers.filter(p => selectedPlayers.includes(p.id))

  const togglePlayer = (playerId) => {
    const canToggle = !liveRound || isAdmin
    if (!canToggle) return

    const playerIdStr = String(playerId)
    const inNassau = nassauMatch.participants.includes(playerIdStr)
    let newParticipants
    let newDetails = { ...(nassauMatch.participantDetails || {}) }
    if (inNassau) {
      newParticipants = nassauMatch.participants.filter(id => id !== playerIdStr)
      delete newDetails[playerIdStr]
    } else {
      newParticipants = [...nassauMatch.participants, playerIdStr]
      newDetails[playerIdStr] = { joinedOnHole: 1, leftOnHole: null, isSettled: false, settledOnHole: null }
    }
    setNassauMatch({ ...nassauMatch, participants: newParticipants, participantDetails: newDetails })
  }

  const cancelNassau = () => {
    if (confirm('Cancel Side Nassau match?')) {
      setNassauMatch(null)
    }
  }

  if (checkedInPlayers.length === 0) return null

  if (!nassauMatch) {
    return (
      <div style={{ background: 'var(--color-nassau)', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '10px', color: 'white' }}>Side Nassau</h3>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', marginBottom: '15px' }}>Set up a side Nassau match — 3-bet match play (front 9, back 9, overall) between every pair.</p>
        <button className="btn" onClick={() => setShowSetup(true)} style={{ background: 'white', color: 'var(--color-nassau)', fontWeight: '600' }}>Set Up Side Nassau</button>
        {showSetup && <NassauSetupModal onClose={() => setShowSetup(false)} nassauMatch={null} onSave={setNassauMatch} />}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--color-success-light)', border: '2px solid var(--color-nassau)', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: 'var(--color-nassau)' }}>Side Nassau Active</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowSetup(true)} style={{ background: 'var(--color-nassau)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
          <button onClick={cancelNassau} style={{ background: 'var(--color-danger)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: 'var(--color-text-secondary)', marginBottom: '15px', fontSize: '13px' }}>
        <span>${nassauMatch.settings.betAmount}/bet</span>
        <span>| 3 bets/pair (front, back, overall)</span>
        {nassauMatch.settings.useHandicaps && <span>| Net (handicaps)</span>}
      </div>
      <div style={{ marginBottom: '15px' }}>
        <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '13px' }}>Tap your name to join or leave:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {checkedInPlayers.map(player => {
            const inNassau = nassauMatch.participants.includes(String(player.id))
            const canToggle = !liveRound || isAdmin
            return (
              <button key={player.id} onClick={() => togglePlayer(player.id)} disabled={!canToggle} style={{ padding: '10px 14px', borderRadius: '20px', border: inNassau ? '2px solid var(--color-nassau)' : '2px solid var(--color-border)', background: inNassau ? 'var(--color-success-light)' : 'var(--color-surface)', color: inNassau ? 'var(--color-nassau)' : 'var(--color-text-secondary)', fontSize: '13px', fontWeight: inNassau ? '600' : 'normal', cursor: canToggle ? 'pointer' : 'not-allowed', opacity: canToggle ? 1 : 0.7 }}>
                {inNassau ? '✓ ' : ''}{player.name}
              </button>
            )
          })}
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '10px', background: 'var(--color-surface-sunken)', borderRadius: '8px', fontSize: '13px' }}>
        <strong>{nassauMatch.participants.length}</strong> player{nassauMatch.participants.length !== 1 ? 's' : ''} in Nassau
        {nassauMatch.participants.length >= 2 && <span style={{ color: 'var(--color-nassau)' }}> - Ready to play</span>}
      </div>
      {showSetup && <NassauSetupModal onClose={() => setShowSetup(false)} nassauMatch={nassauMatch} onSave={setNassauMatch} />}
    </div>
  )
}

function PairingRequestForm({ availablePlayers, existingRequests, onAdd, onRemove }) {
  const [player1, setPlayer1] = useState('')
  const [player2, setPlayer2] = useState('')
  const [error, setError] = useState(null)

  // Players already used in an existing pairing request (map id -> name of their current partner)
  const alreadyPairedWith = {}
  existingRequests.forEach(req => {
    const p1Id = parseInt(req.player1)
    const p2Id = parseInt(req.player2)
    const p1 = availablePlayers.find(p => p.id === p1Id)
    const p2 = availablePlayers.find(p => p.id === p2Id)
    if (p1 && p2) {
      alreadyPairedWith[p1Id] = p2.name
      alreadyPairedWith[p2Id] = p1.name
    }
  })

  const conflictPlayer = [player1, player2]
    .map(id => parseInt(id))
    .find(id => id && alreadyPairedWith[id])

  const handleAdd = () => {
    if (!player1 || !player2 || player1 === player2) return
    const id1 = parseInt(player1)
    const id2 = parseInt(player2)
    if (alreadyPairedWith[id1] || alreadyPairedWith[id2]) {
      const dupeId = alreadyPairedWith[id1] ? id1 : id2
      const dupeName = availablePlayers.find(p => p.id === dupeId)?.name || 'That player'
      setError(
        `${dupeName} is already in a pairing request with ${alreadyPairedWith[dupeId]}. ` +
        `A player can only be in one pairing request. If all three need to play together, create a Manual Team instead.`
      )
      return
    }
    setError(null)
    onAdd({ player1, player2 })
    setPlayer1('')
    setPlayer2('')
  }

  // Clear error when selection changes
  const updatePlayer1 = (val) => { setPlayer1(val); setError(null) }
  const updatePlayer2 = (val) => { setPlayer2(val); setError(null) }

  return (
    <div style={{ marginBottom: '30px' }}>
      <h3 style={{ marginBottom: '15px' }}>Pairing Requests (Optional)</h3>

      {existingRequests.map(request => {
        const p1 = availablePlayers.find(p => p.id === parseInt(request.player1))
        const p2 = availablePlayers.find(p => p.id === parseInt(request.player2))
        return (
          <div key={request.id} style={{
            background: 'var(--color-warning-light)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{p1?.name} + {p2?.name}</span>
            <button
              onClick={() => onRemove(request.id)}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              Remove
            </button>
          </div>
        )
      })}

      <div style={{ background: 'var(--color-surface-sunken)', padding: '15px', borderRadius: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <select
            value={player1}
            onChange={(e) => updatePlayer1(e.target.value)}
            style={{
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              fontSize: '14px'
            }}
          >
            <option value="">Select Player 1</option>
            {availablePlayers.map(player => {
              const isPaired = alreadyPairedWith[player.id]
              return (
                <option key={player.id} value={player.id} disabled={!!isPaired}>
                  {player.name}{isPaired ? ` (paired with ${isPaired})` : ''}
                </option>
              )
            })}
          </select>
          <select
            value={player2}
            onChange={(e) => updatePlayer2(e.target.value)}
            style={{
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              fontSize: '14px'
            }}
          >
            <option value="">Select Player 2</option>
            {availablePlayers.map(player => {
              const isPaired = alreadyPairedWith[player.id]
              return (
                <option key={player.id} value={player.id} disabled={!!isPaired}>
                  {player.name}{isPaired ? ` (paired with ${isPaired})` : ''}
                </option>
              )
            })}
          </select>
        </div>
        {error && (
          <div style={{
            background: 'var(--color-danger-light)',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger-dark)',
            padding: '10px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '10px',
            lineHeight: '1.4'
          }}>
            {error}
          </div>
        )}
        <button
          className="btn btn-secondary"
          onClick={handleAdd}
          disabled={!player1 || !player2 || player1 === player2 || !!conflictPlayer}
        >
          Add Pairing
        </button>
      </div>
    </div>
  )
}

function CheckInWarningButton({ leagueId, leagueName }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(null)

  const sendWarning = async (minutes) => {
    setSending(true)
    try {
      const { sendPushNotification } = await import('../lib/notificationService')
      await sendPushNotification(leagueId, leagueName || 'Check-In Closing Soon',
        `Check-in closes in ${minutes} minute${minutes === 1 ? '' : 's'}! Get checked in now.`,
        { tag: 'checkin-warning', category: 'round_alerts' }
      )
      setSent(minutes)
      setTimeout(() => setSent(null), 3000)
    } catch (err) {
      console.error('Failed to send check-in warning:', err)
    }
    setSending(false)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px',
      padding: '12px', background: 'var(--color-surface)', borderRadius: '8px',
      border: '1px solid var(--color-border)'
    }}>
      <span style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>
        {sent ? `Sent! (${sent} min)` : 'Notify:'}
      </span>
      {[1, 5, 10, 15, 30].map(min => (
        <button
          key={min}
          onClick={() => sendWarning(min)}
          disabled={sending}
          style={{
            padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)',
            background: 'var(--color-surface-sunken)', color: 'var(--color-text-secondary)',
            fontSize: '12px', fontWeight: '600', cursor: sending ? 'default' : 'pointer',
            opacity: sending ? 0.6 : 1, flex: 1
          }}
        >
          {min}m
        </button>
      ))}
    </div>
  )
}

function GeneratePage() {
  const navigate = useNavigate()
  const {
    players,
    teams,
    setTeams,
    liveRound,
    setLiveRound,
    pairingRequests,
    setPairingRequests,
    isAdmin,
    skinsMatch,
    setSkinsMatch,
    nassauMatch,
    setNassauMatch,
    checkedInPlayers,
    setCheckedInPlayers,
    manualTeams,
    setManualTeams,
    handicapSettings,
    courseTees,
    leagueId,
    leagueName,
    leagueSettings,
    roundFormatOverride,
    setRoundFormatOverride
  } = useLeague()

  const [creatingManualTeam, setCreatingManualTeam] = useState(false)
  const [allowFivesomes, setAllowFivesomes] = useState(false)
  const [flightOverrides, setFlightOverrides] = useState({})
  const [showFlights, setShowFlights] = useState(false)

  // Use context state for checked-in players
  const selectedPlayers = checkedInPlayers
  const setSelectedPlayers = setCheckedInPlayers

  const activePlayers = players.filter(p => p.isActive !== false)

  // If there's a live round in progress, show message and redirect to Live tab
  if (liveRound) {
    return (
      <div>
        <h2 style={{ marginBottom: '20px' }}>Player Check-In</h2>
        <div style={{
          background: 'var(--color-warning-light)',
          border: '2px solid var(--color-skins)',
          padding: '30px',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>⛳</div>
          <h3 style={{ marginBottom: '15px', color: 'var(--color-warning)' }}>Round In Progress</h3>
          <p style={{ color: 'var(--color-warning)', marginBottom: '20px' }}>
            A live round is currently in progress. Check-in is not available until the current round is finished.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/live')}
            style={{ padding: '12px 30px', fontSize: '16px' }}
          >
            Go to Live Round
          </button>
        </div>
      </div>
    )
  }

  // Get players that are in manual teams
  const playersInManualTeams = new Set(
    manualTeams.flatMap(team => team.players.map(p => p.id))
  )

  // Available players for pairing requests (selected but not in manual teams)
  const availableForPairing = activePlayers.filter(
    p => selectedPlayers.includes(p.id) && !playersInManualTeams.has(p.id)
  )

  // Sorted player groups for compact check-in UI
  const checkedInPlayersList = activePlayers
    .filter(p => selectedPlayers.includes(p.id))
    .sort((a, b) => a.name.localeCompare(b.name))
  const notCheckedInPlayersList = activePlayers
    .filter(p => !selectedPlayers.includes(p.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  const handleSelectAll = () => {
    const allIds = activePlayers
      .filter(p => !playersInManualTeams.has(p.id))
      .map(p => p.id)
    // Keep manual-team players that are already selected, add all others
    const manualTeamSelected = selectedPlayers.filter(id => playersInManualTeams.has(id))
    setSelectedPlayers([...new Set([...manualTeamSelected, ...allIds])])
  }

  const handleSelectNone = () => {
    // Keep only manual-team players selected
    setSelectedPlayers(selectedPlayers.filter(id => playersInManualTeams.has(id)))
  }

  const togglePlayerSelection = (playerId) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerId))
    } else {
      setSelectedPlayers([...selectedPlayers, playerId])
    }
  }

  const handleSaveManualTeam = (teamPlayers) => {
    const newTeam = {
      id: Date.now(),
      players: teamPlayers
    }
    setManualTeams([...manualTeams, newTeam])

    // Auto-select these players if not already selected
    const newSelected = [...selectedPlayers]
    teamPlayers.forEach(p => {
      if (!newSelected.includes(p.id)) {
        newSelected.push(p.id)
      }
    })
    setSelectedPlayers(newSelected)
    setCreatingManualTeam(false)
  }

  const handleDeleteManualTeam = (teamId) => {
    setManualTeams(manualTeams.filter(t => t.id !== teamId))
  }

  const addPairingRequest = (pairing) => {
    const newRequest = {
      id: Date.now(),
      ...pairing
    }
    setPairingRequests(prev => [...prev, newRequest])
  }

  const removePairingRequest = (requestId) => {
    setPairingRequests(prev => prev.filter(r => r.id !== requestId))
  }

  const handleGenerateTeams = () => {
    // Get selected players and compute their effective handicaps for team generation
    const selectedPlayerObjects = activePlayers.filter(p => selectedPlayers.includes(p.id)).map(p => {
      // Calculate effective handicap index based on league settings
      const effectiveIndex = getEffectiveHandicap(p, handicapSettings, leagueId, courseTees)
      // Convert to Course Handicap for their tees (used for team balancing)
      const playerTee = p.defaultTee || 'blue'
      const effectiveHandicap = getCourseHandicapForTee(effectiveIndex, playerTee, courseTees)
      return {
        ...p,
        handicap: effectiveIndex,           // Store Index
        effectiveHandicap: effectiveHandicap // Course HCP for team balancing
      }
    })

    const overrides = Object.keys(flightOverrides).length > 0 ? flightOverrides : null
    const tripMode = leagueSettings?.tripMode?.enabled ? leagueSettings.tripMode : null
    const generated = generateTeams(selectedPlayerObjects, pairingRequests, manualTeams, { allowFivesomes, flightOverrides: overrides, tripMode })

    // Save teams to context and navigate to Teams page
    setTeams(generated)
    navigate('/teams')
  }

  const tripMode = leagueSettings?.tripMode?.enabled ? leagueSettings.tripMode : null
  const tripRoundsCompleted = activePlayers.reduce((max, p) => {
    const completed = (p.scoreHistory || []).filter(r => (r.totalScore || r.total) > 0 && r.isComplete !== false).length
    return Math.max(max, completed)
  }, 0)

  // In trip mode, default the round format to "2 best gross balls" (Retirees, no handicap)
  // so the admin doesn't have to set it every morning. They can still change it before generating.
  useEffect(() => {
    if (tripMode && !roundFormatOverride && isAdmin) {
      setRoundFormatOverride({ format: 'retirees', retireesScoresToCount: 2, useHandicaps: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripMode, isAdmin])

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Player Check-In</h2>

      {tripMode && isAdmin && (
        <div style={{
          background: 'var(--color-success-light)',
          border: '2px solid var(--color-success)',
          padding: '12px 15px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '13px',
          color: 'var(--color-success)'
        }}>
          <div style={{ fontWeight: '700', marginBottom: '4px' }}>
            Trip Mode Active — Round {tripRoundsCompleted + 1} of {tripMode.totalRounds || 4}
          </div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
            {tripRoundsCompleted === 0
              ? 'No trip scores yet — use Manual Teams or Flight Overrides to set Round 1 teams.'
              : `Flighting uses average gross across ${tripRoundsCompleted} trip round${tripRoundsCompleted === 1 ? '' : 's'}. Max ${tripMode.maxTimesTogether ?? 2} teammate matchups; ${tripMode.noConsecutive !== false ? 'no back-to-back teammates.' : 'consecutive teammates allowed.'}`}
          </div>
        </div>
      )}

      {/* Player Selection / Check-In */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>
          {isAdmin ? "Select Players for Today's Round" : "Check In for Today's Round"}
        </h3>

        {!isAdmin && (
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '15px', fontSize: '14px' }}>
            Tap your name to check in for today's round
          </p>
        )}

        {activePlayers.length === 0 ? (
          <div className="alert alert-info">
            No active players available. Add players in the Players tab first.
          </div>
        ) : (
          <div>
            {/* Count bar with All/None buttons */}
            <div style={{
              padding: '10px 15px',
              background: 'var(--color-info-light)',
              borderRadius: '8px',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: 'var(--color-info)', fontWeight: '600' }}>
                {selectedPlayers.length} of {activePlayers.length} Checked In
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedPlayers.length >= 6 && (
                  <span style={{ color: 'var(--color-primary)', fontSize: '13px' }}>Ready</span>
                )}
                {isAdmin && (
                  <>
                    <button
                      onClick={handleSelectAll}
                      style={{
                        padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--color-info)',
                        background: 'var(--color-surface)', color: 'var(--color-info)', fontSize: '12px', fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >All</button>
                    <button
                      onClick={handleSelectNone}
                      style={{
                        padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--color-text-tertiary)',
                        background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >None</button>
                  </>
                )}
              </div>
            </div>

            {/* Checked In group */}
            {checkedInPlayersList.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Checked In ({checkedInPlayersList.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {checkedInPlayersList.map(player => (
                    <PlayerCheckInPill
                      key={player.id}
                      player={player}
                      isSelected={true}
                      isInManualTeam={playersInManualTeams.has(player.id)}
                      onToggle={() => togglePlayerSelection(player.id)}
                      courseTees={courseTees}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Not Checked In group */}
            {notCheckedInPlayersList.length > 0 && (
              <div style={{ marginBottom: '4px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Not Checked In ({notCheckedInPlayersList.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {notCheckedInPlayersList.map(player => (
                    <PlayerCheckInPill
                      key={player.id}
                      player={player}
                      isSelected={false}
                      isInManualTeam={playersInManualTeams.has(player.id)}
                      onToggle={() => togglePlayerSelection(player.id)}
                      courseTees={courseTees}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Side Games Opt-In Sections */}
      {leagueSettings.sideGames?.enabled && leagueSettings.sideGames?.allowSkins !== false && (
        <SkinsOptInSection
          selectedPlayers={selectedPlayers}
          activePlayers={activePlayers}
          skinsMatch={skinsMatch}
          setSkinsMatch={setSkinsMatch}
          liveRound={liveRound}
          isAdmin={isAdmin}
        />
      )}

      {leagueSettings.sideGames?.enabled && leagueSettings.sideGames?.allowNassau !== false && (
        <NassauOptInSection
          selectedPlayers={selectedPlayers}
          activePlayers={activePlayers}
          nassauMatch={nassauMatch}
          setNassauMatch={setNassauMatch}
          liveRound={liveRound}
          isAdmin={isAdmin}
        />
      )}

      {/* Admin-only sections */}
      {isAdmin && (
        <>
          {/* Flight Preview */}
          {selectedPlayers.length >= 4 && (() => {
            const flightLabels = ['A', 'B', 'C', 'D']
            const flightColors = ['var(--color-danger)', 'var(--color-accent-blue)', 'var(--color-success)', 'var(--color-accent-purple)']
            const tripMode = leagueSettings?.tripMode?.enabled ? leagueSettings.tripMode : null
            // Compute flights for checked-in, non-manual-team players
            const flightPlayers = availableForPairing
              .map(p => {
                const effectiveIndex = getEffectiveHandicap(p, handicapSettings, leagueId, courseTees)
                const playerTee = p.defaultTee || 'blue'
                const effectiveHandicap = getCourseHandicapForTee(effectiveIndex, playerTee, courseTees)
                return { ...p, handicap: effectiveIndex, effectiveHandicap }
              })
              .sort((a, b) => getPlayerSortKey(a, tripMode) - getPlayerSortKey(b, tripMode))
            const numFlights = 4

            // Compute flights
            const flights = [[], [], [], []]
            flightPlayers.forEach(p => {
              const f = getPlayerFlightByHandicap(p, flightPlayers, numFlights, Object.keys(flightOverrides).length > 0 ? flightOverrides : null, tripMode)
              flights[f].push(p)
            })

            return (
              <div style={{ marginBottom: '30px' }}>
                <div
                  onClick={() => setShowFlights(!showFlights)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', marginBottom: showFlights ? '12px' : 0
                  }}
                >
                  <h3 style={{ margin: 0 }}>Player Flights (A-B-C-D)</h3>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {showFlights ? '▼ Hide' : '▶ Show'}
                  </span>
                </div>
                {showFlights && (
                  <>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                      {tripMode
                        ? 'Trip Mode: based on average trip score (lower = better). Round 1 players with no scores fall back to handicap. Tap a flight to override.'
                        : 'Based on handicap. Tap a player\'s flight letter to override.'}
                    </div>
                    {flights.map((players, fi) => (
                      <div key={fi} style={{ marginBottom: '10px' }}>
                        <div style={{
                          fontSize: '13px', fontWeight: '700', color: flightColors[fi],
                          marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px'
                        }}>
                          Flight {flightLabels[fi]} ({players.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {players.map(p => {
                            const isOverridden = flightOverrides[p.id] != null
                            const tripAvg = tripMode ? getPlayerTripAverage(p) : null
                            const metricLabel = tripAvg != null
                              ? `avg ${tripAvg.toFixed(1)}`
                              : (p.handicap != null ? Math.round(p.handicap) : '?')
                            return (
                              <div key={p.id} style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                background: isOverridden ? 'var(--color-warning-light)' : 'var(--color-surface-sunken)',
                                border: `1px solid ${isOverridden ? 'var(--color-warning)' : 'var(--color-border)'}`,
                                borderRadius: '20px', padding: '5px 10px', fontSize: '13px'
                              }}>
                                <span style={{ fontWeight: '500' }}>{p.name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>({metricLabel})</span>
                                <select
                                  value={flightOverrides[p.id] != null ? flightOverrides[p.id] : ''}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setFlightOverrides(prev => {
                                      const next = { ...prev }
                                      if (val === '' || parseInt(val) === getPlayerFlightByHandicap(p, flightPlayers, numFlights, null, tripMode)) {
                                        delete next[p.id]
                                      } else {
                                        next[p.id] = parseInt(val)
                                      }
                                      return next
                                    })
                                  }}
                                  style={{
                                    padding: '2px 4px', fontSize: '12px', fontWeight: '700',
                                    border: `1px solid ${isOverridden ? 'var(--color-warning)' : 'var(--color-border)'}`,
                                    borderRadius: '4px',
                                    background: isOverridden ? 'var(--color-warning-light)' : 'transparent',
                                    cursor: 'pointer',
                                    color: flightColors[flightOverrides[p.id] != null ? flightOverrides[p.id] : fi]
                                  }}
                                >
                                  <option value="">{flightLabels[fi]}</option>
                                  {flightLabels.map((label, idx) => idx !== fi && (
                                    <option key={idx} value={idx}>→ {label}</option>
                                  ))}
                                </select>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {Object.keys(flightOverrides).length > 0 && (
                      <button
                        onClick={() => setFlightOverrides({})}
                        style={{
                          marginTop: '8px', background: 'none', border: '1px solid var(--color-border)',
                          borderRadius: '6px', padding: '6px 12px', fontSize: '12px',
                          color: 'var(--color-text-secondary)', cursor: 'pointer'
                        }}
                      >
                        Reset All Overrides
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })()}

          {/* Manual Teams */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '15px' }}>Manual Teams (Optional)</h3>

            {manualTeams.map(team => (
              <ManualTeamCard
                key={team.id}
                team={team}
                onDelete={handleDeleteManualTeam}
              />
            ))}

            {creatingManualTeam ? (
              <CreateManualTeamForm
                availablePlayers={availableForPairing}
                onSave={handleSaveManualTeam}
                onCancel={() => setCreatingManualTeam(false)}
                courseTees={courseTees}
              />
            ) : (
              <button
                className="btn btn-secondary"
                onClick={() => setCreatingManualTeam(true)}
                disabled={availableForPairing.length < 3}
              >
                + Create Manual Team
              </button>
            )}
          </div>

          {/* Pairing Requests */}
          <PairingRequestForm
            availablePlayers={availableForPairing}
            existingRequests={pairingRequests}
            onAdd={addPairingRequest}
            onRemove={removePairingRequest}
          />

          {/* Round Format Override (admin only) */}
          {isAdmin && (
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '10px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <div
                onClick={() => setRoundFormatOverride(
                  roundFormatOverride === null
                    ? (tripMode
                        ? { format: 'retirees', retireesScoresToCount: 2, useHandicaps: false }
                        : { format: 'bigboys' })
                    : null
                )}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <h3 style={{ margin: 0, fontSize: '16px' }}>Round Format</h3>
                <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
                  {roundFormatOverride
                    ? FORMAT_CONFIGS[roundFormatOverride.format]?.label || 'Custom'
                    : 'Big Boys (default)'}
                  {' '}
                  {roundFormatOverride ? '▲' : '▼'}
                </span>
              </div>

              {roundFormatOverride && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Object.entries(FORMAT_CONFIGS)
                      .filter(([key]) => key !== 'skins' && key !== 'track')
                      .map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => setRoundFormatOverride({ ...roundFormatOverride, format: key })}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: `2px solid ${roundFormatOverride.format === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: roundFormatOverride.format === key ? 'var(--color-primary-light)' : 'var(--color-surface)',
                            color: roundFormatOverride.format === key ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            fontWeight: roundFormatOverride.format === key ? '600' : 'normal',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {cfg.label}
                        </button>
                      ))}
                  </div>

                  {/* Format-specific settings */}
                  {roundFormatOverride.format === 'bestball' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={roundFormatOverride.useHandicaps || false}
                        onChange={(e) => setRoundFormatOverride({ ...roundFormatOverride, useHandicaps: e.target.checked })}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                      />
                      <span style={{ fontSize: '13px' }}>Use Handicaps</span>
                    </label>
                  )}

                  {roundFormatOverride.format === 'retirees' && (
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: '600' }}>Scores to count per hole: </label>
                        <select
                          value={roundFormatOverride.retireesScoresToCount || 2}
                          onChange={(e) => setRoundFormatOverride({ ...roundFormatOverride, retireesScoresToCount: parseInt(e.target.value) })}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={roundFormatOverride.useHandicaps !== false}
                          onChange={(e) => setRoundFormatOverride({ ...roundFormatOverride, useHandicaps: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                        />
                        <span style={{ fontSize: '13px' }}>Use Handicaps (uncheck for pure gross 2-best)</span>
                      </label>
                    </div>
                  )}

                  {roundFormatOverride.format === 'stableford' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={roundFormatOverride.useNet !== false}
                        onChange={(e) => setRoundFormatOverride({ ...roundFormatOverride, useNet: e.target.checked })}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                      />
                      <span style={{ fontSize: '13px' }}>Net Scoring</span>
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Check-in Closing Warning */}
          {leagueId && (
            <CheckInWarningButton leagueId={leagueId} leagueName={leagueName} />
          )}

          {/* Fivesome toggle — show when player count doesn't divide evenly into foursomes */}
          {(() => {
            const manualPlayerCount = manualTeams.reduce((sum, mt) => sum + mt.players.length, 0)
            const remaining = selectedPlayers.length - manualPlayerCount
            const remainder = remaining % 4
            if (remainder > 0 && remaining >= 5) {
              const threesomeTeams = Math.floor(remaining / 4) + 1
              const fivesomeTeams = Math.floor(remaining / 4)
              return (
                <div style={{
                  background: 'var(--color-surface-sunken)',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                      Allow fivesomes
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {allowFivesomes
                        ? `${fivesomeTeams} teams (some with 5 players)`
                        : `${threesomeTeams} teams (some with 3 players)`
                      }
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={allowFivesomes}
                      onChange={(e) => setAllowFivesomes(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      background: allowFivesomes ? 'var(--color-success)' : 'var(--color-border)',
                      borderRadius: '13px', transition: 'background 0.2s'
                    }}>
                      <span style={{
                        position: 'absolute', height: '20px', width: '20px',
                        left: allowFivesomes ? '25px' : '3px', bottom: '3px',
                        background: 'white', borderRadius: '50%', transition: 'left 0.2s'
                      }} />
                    </span>
                  </label>
                </div>
              )
            }
            return null
          })()}

          {/* Generate Button */}
          <button
            className="btn btn-primary"
            onClick={handleGenerateTeams}
            disabled={selectedPlayers.length < 3}
            style={{ width: '100%', padding: '15px', fontSize: '18px' }}
          >
            Generate Teams
          </button>

          {selectedPlayers.length < 3 && selectedPlayers.length > 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-danger)', marginTop: '10px' }}>
              Need at least 3 players to generate teams
            </p>
          )}
        </>
      )}

      {/* Non-admin waiting message */}
      {!isAdmin && selectedPlayers.length > 0 && (
        <div className="alert alert-info" style={{ marginTop: '20px' }}>
          You're checked in! The admin will generate teams when everyone is ready.
        </div>
      )}
    </div>
  )
}

export default GeneratePage
