import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../context/LeagueContext'
import { getTeamName, calculateTeamSkill, calculateTeamBalance } from '../utils/teamGeneration'
import { formatHandicap, formatCourseHandicap, getCourseHandicapForTee } from '../utils/handicapCalculation'
import { getDisplayName } from '../utils/playerNames'
import { SHENVALEE_COURSE } from '../lib/courseData'

function NinePicker({ roundNines, setRoundNines }) {
  const nineKeys = Object.keys(SHENVALEE_COURSE.nines)
  const front = roundNines?.front || ''
  const back = roundNines?.back || ''
  const duplicate = front && back && front === back

  const update = (which, val) => {
    setRoundNines({ ...(roundNines || {}), [which]: val })
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '2px solid var(--color-info)',
      borderRadius: '10px',
      padding: '15px',
      marginBottom: '12px'
    }}>
      <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>
        Shenvalee Nines for this Round
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
        Pick which nine plays as the front and which plays as the back.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Front Nine</label>
          <select
            value={front}
            onChange={(e) => update('front', e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '14px' }}
          >
            <option value="">— select —</option>
            {nineKeys.map(k => (
              <option key={k} value={k}>{SHENVALEE_COURSE.nines[k].name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Back Nine</label>
          <select
            value={back}
            onChange={(e) => update('back', e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '14px' }}
          >
            <option value="">— select —</option>
            {nineKeys.map(k => (
              <option key={k} value={k}>{SHENVALEE_COURSE.nines[k].name}</option>
            ))}
          </select>
        </div>
      </div>
      {duplicate && (
        <div style={{ marginTop: '10px', color: 'var(--color-danger)', fontSize: '12px' }}>
          Front and back nines must be different.
        </div>
      )}
    </div>
  )
}

function AddLatePlayer({ availablePlayers, onAdd, courseTees }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          padding: '6px',
          border: '1px dashed var(--color-border)',
          background: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          color: 'var(--color-text-tertiary)',
          marginTop: '4px'
        }}
      >
        + Add Player
      </button>
    )
  }

  return (
    <div style={{ marginTop: '4px', padding: '8px', background: 'var(--color-surface-sunken)', borderRadius: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: '600' }}>Add player to team:</span>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--color-text-tertiary)' }}>&times;</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
        {availablePlayers.map(p => {
          const courseHcp = getCourseHandicapForTee(p.handicap, p.tee || p.defaultTee || 'blue', courseTees)
          return (
            <button
              key={p.id}
              onClick={() => { onAdd(p); setOpen(false) }}
              style={{
                padding: '6px 10px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                textAlign: 'left'
              }}
            >
              {p.name} {p.handicap != null ? `(${formatCourseHandicap(courseHcp)})` : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TeamCard({ team, index, totalTeams, onMoveUp, onMoveDown, isAdmin, courseTees, swapSelection, onPlayerTap, onMovePlayerHere, canSwap, onAddPlayer, availablePlayers, allTeams }) {
  const teamSkill = calculateTeamSkill(team)
  const avgSkill = team.length > 0 ? teamSkill / team.length : 0

  // Calculate average handicap index and total course handicap
  const playersWithHandicap = team.filter(p => p.handicap !== undefined && p.handicap !== null)
  const avgHandicapIndex = playersWithHandicap.length > 0
    ? playersWithHandicap.reduce((sum, p) => sum + p.handicap, 0) / playersWithHandicap.length
    : null
  // Sum of course handicaps (what they actually play with)
  const totalCourseHcp = playersWithHandicap.reduce((sum, p) => {
    const courseHcp = getCourseHandicapForTee(p.handicap, p.tee || p.defaultTee || 'blue', courseTees)
    return sum + (courseHcp || 0)
  }, 0)

  return (
    <div className="team-container" style={{ position: 'relative', marginBottom: '15px' }}>
      {/* Reorder buttons - admin only */}
      {isAdmin && totalTeams > 1 && (
        <div style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            style={{
              padding: '4px 8px',
              background: index === 0 ? 'var(--color-border)' : 'var(--color-accent-blue)',
              color: 'var(--color-text-on-primary)',
              border: 'none',
              borderRadius: '4px',
              cursor: index === 0 ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            ▲
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalTeams - 1}
            style={{
              padding: '4px 8px',
              background: index === totalTeams - 1 ? 'var(--color-border)' : 'var(--color-accent-blue)',
              color: 'var(--color-text-on-primary)',
              border: 'none',
              borderRadius: '4px',
              cursor: index === totalTeams - 1 ? 'not-allowed' : 'pointer',
              fontSize: '12px'
            }}
          >
            ▼
          </button>
        </div>
      )}

      <div className="team-header" style={{ paddingRight: isAdmin ? '50px' : '0' }}>
        <span style={{
          background: '#95a5a6',
          color: 'var(--color-text-on-primary)',
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '12px',
          marginRight: '10px'
        }}>
          #{index + 1}
        </span>
        {getTeamName(team)} ({team.length})
        {avgHandicapIndex !== null
          ? ` - Team HCP: ${totalCourseHcp}`
          : ` - Avg Skill: ${avgSkill.toFixed(1)}`}
      </div>
      {/* Move-here action when a player from another team is selected */}
      {swapSelection && swapSelection.teamIndex !== index && onMovePlayerHere && (() => {
        const selectedPlayer = allTeams?.[swapSelection.teamIndex]?.find(p => p.id === swapSelection.playerId)
        const selectedName = selectedPlayer ? getDisplayName(selectedPlayer) : 'player'
        return (
          <button
            onClick={() => onMovePlayerHere(index)}
            style={{
              width: '100%',
              padding: '8px 12px',
              margin: '6px 0',
              background: 'var(--color-accent-blue)',
              color: 'var(--color-text-on-primary)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            ← Move {selectedName} to this team
          </button>
        )
      })()}
      {team.map(player => {
        const playerCourseHcp = getCourseHandicapForTee(
          player.handicap,
          player.tee || player.defaultTee || 'blue',
          courseTees
        )
        const isSelected = swapSelection?.playerId === player.id
        const isSwapTarget = swapSelection && swapSelection.teamIndex !== index
        return (
          <div
            key={player.id}
            className="team-member"
            onClick={canSwap ? () => onPlayerTap(player.id, index) : undefined}
            style={{
              cursor: canSwap ? 'pointer' : 'default',
              background: isSelected ? 'var(--color-accent-blue)' : undefined,
              color: isSelected ? 'var(--color-text-on-primary)' : undefined,
              borderLeft: isSwapTarget ? '3px solid var(--color-accent-blue)' : undefined,
              paddingLeft: isSwapTarget ? '9px' : undefined,
              borderRadius: '4px',
              transition: 'background 0.15s'
            }}
          >
            {getDisplayName(player)} ({player.handicap !== undefined && player.handicap !== null
              ? `${formatCourseHandicap(playerCourseHcp)}`
              : player.skillRating?.toFixed(1) || '5.0'})
          </div>
        )
      })}
      {/* Add late player - admin only, before round starts */}
      {isAdmin && availablePlayers?.length > 0 && (
        <AddLatePlayer availablePlayers={availablePlayers} onAdd={(player) => onAddPlayer(player, index)} courseTees={courseTees} />
      )}
    </div>
  )
}

function SkinsSetupModal({ onClose, skinsMatch, onSave, liveRound, setLiveRound }) {
  const [settings, setSettings] = useState(skinsMatch?.settings || {
    costPerSkin: '',
    carryovers: true,
    wrapUnwonSkins: true,
    wrapTo: 'front',
    payoutStyle: 'perSkin',
    parOrBetterRequired: false,
    birdieDoubleEagleTriple: false,
    useHandicaps: false,
    playerHandicaps: {}
  })
  const [greenieSettings, setGreenieSettings] = useState(() => {
    const qs = liveRound?.quickSkinsGreenieSettings
    if (qs) return { enabled: true, costPerGreenie: qs.costPerGreenie || '', carryovers: qs.carryovers !== false, wrapUnwonGreenies: qs.wrapUnwonGreenies || false, wrapTo: qs.wrapTo || 'front' }
    if (skinsMatch?.settings?.greeniesEnabled) return { enabled: true, costPerGreenie: skinsMatch.settings.greeniesCostPerHole || '', carryovers: skinsMatch.settings.greeniesCarryover !== false, wrapUnwonGreenies: skinsMatch.settings.greeniesWrap || false, wrapTo: skinsMatch.settings.greeniesWrapTo || 'front' }
    return { enabled: false, costPerGreenie: '', carryovers: true, wrapUnwonGreenies: false, wrapTo: 'front' }
  })

  const handleSave = () => {
    if (!settings.costPerSkin) {
      alert('Please enter a cost per skin')
      return
    }
    // Merge greenie settings into skins settings
    const mergedSettings = {
      ...settings,
      greeniesEnabled: greenieSettings.enabled,
      greeniesCostPerHole: greenieSettings.enabled ? (parseFloat(greenieSettings.costPerGreenie) || 1) : 0,
      greeniesCarryover: greenieSettings.carryovers,
      greeniesWrap: greenieSettings.wrapUnwonGreenies,
      greeniesWrapTo: greenieSettings.wrapTo
    }
    onSave({
      settings: mergedSettings,
      participants: skinsMatch?.participants || [],
      results: skinsMatch?.results || {}
    })
    // Update quickSkinsGreenieSettings on liveRound if applicable
    if (setLiveRound && liveRound) {
      setLiveRound({
        ...liveRound,
        quickSkinsGreenieSettings: greenieSettings.enabled ? {
          enabled: true,
          costPerGreenie: parseFloat(greenieSettings.costPerGreenie) || 1,
          carryovers: greenieSettings.carryovers,
          wrapUnwonGreenies: greenieSettings.wrapUnwonGreenies,
          wrapTo: greenieSettings.wrapTo
        } : null
      })
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header" style={{ background: 'var(--color-skins)' }}>
          <h2 style={{ margin: 0, color: 'var(--color-text-on-primary)' }}>{skinsMatch ? 'Edit' : 'Start'} Side Skins Match</h2>
          <button className="modal-close" onClick={onClose} style={{ color: 'var(--color-text-on-primary)' }}>&times;</button>
        </div>
        <div style={{ padding: '20px' }}>
          {/* Cost per skin */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Cost per Skin ($)
            </label>
            <input
              type="number"
              value={settings.costPerSkin}
              onChange={(e) => setSettings({ ...settings, costPerSkin: e.target.value })}
              placeholder="1.00"
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid var(--color-border)', fontSize: '16px' }}
            />
          </div>

          {/* Carryovers */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Carryovers</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSettings({ ...settings, carryovers: true })}
                style={{
                  flex: 1, padding: '12px', borderRadius: '6px',
                  border: settings.carryovers ? '2px solid var(--color-skins)' : '2px solid var(--color-border)',
                  background: settings.carryovers ? 'var(--color-warning-light)' : 'var(--color-surface)',
                  fontWeight: settings.carryovers ? '600' : 'normal',
                  cursor: 'pointer'
                }}
              >Yes</button>
              <button
                onClick={() => setSettings({ ...settings, carryovers: false })}
                style={{
                  flex: 1, padding: '12px', borderRadius: '6px',
                  border: !settings.carryovers ? '2px solid var(--color-skins)' : '2px solid var(--color-border)',
                  background: !settings.carryovers ? 'var(--color-warning-light)' : 'var(--color-surface)',
                  fontWeight: !settings.carryovers ? '600' : 'normal',
                  cursor: 'pointer'
                }}
              >No</button>
            </div>
          </div>

          {/* Wrap unwon skins (if carryovers ON) */}
          {settings.carryovers && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Wrap Unwon Skins</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setSettings({ ...settings, wrapUnwonSkins: true })}
                    style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.wrapUnwonSkins ? '2px solid var(--color-skins)' : '2px solid var(--color-border)', background: settings.wrapUnwonSkins ? 'var(--color-warning-light)' : 'var(--color-surface)', fontWeight: settings.wrapUnwonSkins ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                  <button onClick={() => setSettings({ ...settings, wrapUnwonSkins: false })}
                    style={{ flex: 1, padding: '12px', borderRadius: '6px', border: !settings.wrapUnwonSkins ? '2px solid var(--color-skins)' : '2px solid var(--color-border)', background: !settings.wrapUnwonSkins ? 'var(--color-warning-light)' : 'var(--color-surface)', fontWeight: !settings.wrapUnwonSkins ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                </div>
              </div>
              {settings.wrapUnwonSkins && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Wrap To</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setSettings({ ...settings, wrapTo: 'front' })}
                      style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.wrapTo === 'front' ? '2px solid var(--color-skins)' : '2px solid var(--color-border)', background: settings.wrapTo === 'front' ? 'var(--color-warning-light)' : 'var(--color-surface)', fontWeight: settings.wrapTo === 'front' ? '600' : 'normal', cursor: 'pointer' }}>Front 9</button>
                    <button onClick={() => setSettings({ ...settings, wrapTo: 'back' })}
                      style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.wrapTo === 'back' ? '2px solid var(--color-skins)' : '2px solid var(--color-border)', background: settings.wrapTo === 'back' ? 'var(--color-warning-light)' : 'var(--color-surface)', fontWeight: settings.wrapTo === 'back' ? '600' : 'normal', cursor: 'pointer' }}>Back 9</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Payout style (if carryovers OFF) */}
          {!settings.carryovers && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Payout Style</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setSettings({ ...settings, payoutStyle: 'perSkin' })}
                  style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.payoutStyle === 'perSkin' ? '2px solid var(--color-skins)' : '2px solid var(--color-border)', background: settings.payoutStyle === 'perSkin' ? 'var(--color-warning-light)' : 'var(--color-surface)', fontWeight: settings.payoutStyle === 'perSkin' ? '600' : 'normal', cursor: 'pointer', fontSize: '12px' }}>Per Skin</button>
                <button onClick={() => setSettings({ ...settings, payoutStyle: 'fixedPot' })}
                  style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.payoutStyle === 'fixedPot' ? '2px solid var(--color-skins)' : '2px solid var(--color-border)', background: settings.payoutStyle === 'fixedPot' ? 'var(--color-warning-light)' : 'var(--color-surface)', fontWeight: settings.payoutStyle === 'fixedPot' ? '600' : 'normal', cursor: 'pointer', fontSize: '12px' }}>Fixed Pot</button>
              </div>
            </div>
          )}

          {/* Optional settings */}
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

          {/* Greenies Section — hidden for league rounds since greenies are already managed by the league */}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>
              {skinsMatch ? 'Save Changes' : 'Create Side Skins Match'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkinsOptInSection({ teams, skinsMatch, setSkinsMatch, liveRound, setLiveRound, isAdmin, isCasualGame }) {
  const [showSetup, setShowSetup] = useState(false)

  // Get all unique players from teams
  const allPlayers = []
  const seen = new Set()
  teams.forEach(team => {
    team.forEach(player => {
      if (!seen.has(player.id)) {
        seen.add(player.id)
        allPlayers.push(player)
      }
    })
  })

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

  if (!skinsMatch) {
    return (
      <div style={{
        background: 'var(--color-skins)',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginBottom: '10px', color: 'var(--color-text-on-primary)' }}>Side Skins</h3>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', marginBottom: '15px' }}>
          Set up a side skins competition that runs alongside the league round.
        </p>
        <button
          className="btn"
          onClick={() => setShowSetup(true)}
          style={{ background: 'var(--color-surface)', color: 'var(--color-skins)', fontWeight: '600' }}
        >
          Set Up Side Skins Match
        </button>
        {showSetup && (
          <SkinsSetupModal
            onClose={() => setShowSetup(false)}
            skinsMatch={null}
            onSave={setSkinsMatch}
            liveRound={liveRound}
            setLiveRound={setLiveRound}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--color-warning-light)',
      border: '2px solid var(--color-skins)',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: 'var(--color-skins)' }}>Side Skins Match Active</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowSetup(true)}
            style={{ background: 'var(--color-skins)', color: 'var(--color-text-on-primary)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
          >
            Edit
          </button>
          <button
            onClick={cancelSkins}
            style={{ background: 'var(--color-danger)', color: 'var(--color-text-on-primary)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Settings summary */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: 'var(--color-text-secondary)', marginBottom: '15px', fontSize: '13px' }}>
        <span>${skinsMatch.settings.costPerSkin}/skin</span>
        {skinsMatch.settings.carryovers ? (
          <>
            <span>| Carryovers ON</span>
            {skinsMatch.settings.wrapUnwonSkins && (
              <span>| Wrap to {skinsMatch.settings.wrapTo === 'front' ? 'Front 9' : 'Back 9'}</span>
            )}
          </>
        ) : (
          <span>| {skinsMatch.settings.payoutStyle === 'fixedPot' ? 'Fixed Pot' : 'Per Skin'}</span>
        )}
        {skinsMatch.settings.parOrBetterRequired && <span>| Par or better</span>}
        {skinsMatch.settings.birdieDoubleEagleTriple && <span>| Birdie 2x/Eagle 3x</span>}
      </div>

      {/* Player opt-in - skip for casual games since everyone plays */}
      {!isCasualGame && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '13px' }}>
            Tap your name to {skinsMatch.participants.length > 0 ? 'join or leave' : 'join'}:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {allPlayers.map(player => {
              const inSkins = skinsMatch.participants.includes(String(player.id))
              const canToggle = !liveRound || isAdmin
              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  disabled={!canToggle}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '20px',
                    border: inSkins ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                    background: inSkins ? 'var(--color-success-light)' : 'var(--color-surface)',
                    color: inSkins ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontSize: '13px',
                    fontWeight: inSkins ? '600' : 'normal',
                    cursor: canToggle ? 'pointer' : 'not-allowed',
                    opacity: canToggle ? 1 : 0.7
                  }}
                >
                  {inSkins ? '✓ ' : ''}{player.name}
                </button>
              )
            })}
          </div>
          {liveRound && !isAdmin && (
            <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
              Round in progress. Contact admin to change skins participation.
            </p>
          )}
        </div>
      )}

      {/* Participant count */}
      <div style={{
        textAlign: 'center',
        padding: '10px',
        background: 'var(--color-surface-sunken)',
        borderRadius: '8px',
        fontSize: '13px'
      }}>
        {isCasualGame ? (
          <span style={{ color: 'var(--color-primary)' }}><strong>{allPlayers.length}</strong> player{allPlayers.length !== 1 ? 's' : ''} - All playing skins</span>
        ) : (
          <>
            <strong>{skinsMatch.participants.length}</strong> player{skinsMatch.participants.length !== 1 ? 's' : ''} in skins
            {skinsMatch.participants.length >= 2 && (
              <span style={{ color: 'var(--color-primary)' }}> - Ready to play</span>
            )}
            {skinsMatch.participants.length < 2 && skinsMatch.participants.length > 0 && (
              <span style={{ color: 'var(--color-skins)' }}> (need at least 2)</span>
            )}
          </>
        )}
      </div>

      {showSetup && (
        <SkinsSetupModal
          onClose={() => setShowSetup(false)}
          skinsMatch={skinsMatch}
          onSave={setSkinsMatch}
          liveRound={liveRound}
          setLiveRound={setLiveRound}
        />
      )}
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
          <h2 style={{ margin: 0, color: 'var(--color-text-on-primary)' }}>{nassauMatch ? 'Edit' : 'Set Up'} Side Nassau</h2>
          <button className="modal-close" onClick={onClose} style={{ color: 'var(--color-text-on-primary)' }}>&times;</button>
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

function NassauOptInSection({ teams, nassauMatch, setNassauMatch, liveRound, isAdmin, isCasualGame }) {
  const [showSetup, setShowSetup] = useState(false)

  // Get all unique players from teams
  const allPlayers = []
  const seen = new Set()
  teams.forEach(team => {
    team.forEach(player => {
      if (!seen.has(player.id)) {
        seen.add(player.id)
        allPlayers.push(player)
      }
    })
  })

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

  const nassauLabel = isCasualGame ? 'Nassau' : 'Side Nassau'

  if (!nassauMatch) {
    return (
      <div style={{ background: 'var(--color-nassau)', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '10px', color: 'var(--color-text-on-primary)' }}>{nassauLabel}</h3>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', marginBottom: '15px' }}>
          Set up a {nassauLabel.toLowerCase()} match — 3-bet match play (front 9, back 9, overall) between every pair.
        </p>
        <button className="btn" onClick={() => setShowSetup(true)} style={{ background: 'var(--color-surface)', color: 'var(--color-nassau)', fontWeight: '600' }}>
          Set Up {nassauLabel}
        </button>
        {showSetup && <NassauSetupModal onClose={() => setShowSetup(false)} nassauMatch={null} onSave={setNassauMatch} />}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--color-success-light)', border: '2px solid var(--color-nassau)', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: 'var(--color-nassau)' }}>{nassauLabel} Active</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowSetup(true)} style={{ background: 'var(--color-nassau)', color: 'var(--color-text-on-primary)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
          <button onClick={cancelNassau} style={{ background: 'var(--color-danger)', color: 'var(--color-text-on-primary)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: 'var(--color-text-secondary)', marginBottom: '15px', fontSize: '13px' }}>
        <span>${nassauMatch.settings.betAmount}/bet</span>
        <span>| 3 bets/pair (front, back, overall)</span>
        {nassauMatch.settings.useHandicaps && <span>| Net (handicaps)</span>}
      </div>

      {!isCasualGame && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '13px' }}>
            Tap your name to {nassauMatch.participants.length > 0 ? 'join or leave' : 'join'}:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {allPlayers.map(player => {
              const inNassau = nassauMatch.participants.includes(String(player.id))
              const canToggle = !liveRound || isAdmin
              return (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  disabled={!canToggle}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '20px',
                    border: inNassau ? '2px solid var(--color-nassau)' : '2px solid var(--color-border)',
                    background: inNassau ? 'var(--color-success-light)' : 'var(--color-surface)',
                    color: inNassau ? 'var(--color-nassau)' : 'var(--color-text-secondary)',
                    fontSize: '13px',
                    fontWeight: inNassau ? '600' : 'normal',
                    cursor: canToggle ? 'pointer' : 'not-allowed',
                    opacity: canToggle ? 1 : 0.7
                  }}
                >
                  {inNassau ? '✓ ' : ''}{player.name}
                </button>
              )
            })}
          </div>
          {liveRound && !isAdmin && (
            <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
              Round in progress. Contact admin to change Nassau participation.
            </p>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '10px', background: 'var(--color-surface-sunken)', borderRadius: '8px', fontSize: '13px' }}>
        {isCasualGame ? (
          <span style={{ color: 'var(--color-nassau)' }}><strong>{allPlayers.length}</strong> player{allPlayers.length !== 1 ? 's' : ''} - All playing Nassau</span>
        ) : (
          <>
            <strong>{nassauMatch.participants.length}</strong> player{nassauMatch.participants.length !== 1 ? 's' : ''} in Nassau
            {nassauMatch.participants.length >= 2 && <span style={{ color: 'var(--color-nassau)' }}> - Ready to play</span>}
            {nassauMatch.participants.length < 2 && nassauMatch.participants.length > 0 && (
              <span style={{ color: '#e65100' }}> (need at least 2)</span>
            )}
          </>
        )}
      </div>

      {showSetup && <NassauSetupModal onClose={() => setShowSetup(false)} nassauMatch={nassauMatch} onSave={setNassauMatch} />}
    </div>
  )
}

function TeamsPage() {
  const navigate = useNavigate()
  const {
    teams,
    setTeams,
    liveRound,
    setLiveRound,
    isAdmin,
    skinsMatch,
    setSkinsMatch,
    nassauMatch,
    setNassauMatch,
    setCheckedInPlayers,
    setManualTeams,
    setPairingRequests,
    players,
    courseTees,
    isCasualGame,
    isTestLeague,
    leagueSettings,
    leagueId,
    leagueName,
    roundFormatOverride,
    setRoundFormatOverride,
    roundNines,
    setRoundNines
  } = useLeague()

  const courseId = leagueSettings?.course || 'gunpowder'
  const isShenvalee = courseId === 'shenvalee'
  const ninesReady = !isShenvalee || (roundNines?.front && roundNines?.back && roundNines.front !== roundNines.back)

  const [swapSelection, setSwapSelection] = useState(null) // { playerId, teamIndex }

  const balance = teams.length > 0 ? calculateTeamBalance(teams) : null
  const canSwap = isAdmin

  const handlePlayerTap = (playerId, teamIndex) => {
    if (!canSwap) return

    if (!swapSelection) {
      setSwapSelection({ playerId, teamIndex })
      return
    }

    if (swapSelection.playerId === playerId) {
      setSwapSelection(null)
      return
    }

    if (swapSelection.teamIndex === teamIndex) {
      setSwapSelection({ playerId, teamIndex })
      return
    }

    // Different team — perform the swap
    const ti1 = swapSelection.teamIndex
    const ti2 = teamIndex
    const pid1 = swapSelection.playerId
    const pid2 = playerId

    // Swap in teams array
    const newTeams = teams.map(t => [...t])
    const idx1 = newTeams[ti1].findIndex(p => p.id === pid1)
    const idx2 = newTeams[ti2].findIndex(p => p.id === pid2)
    if (idx1 !== -1 && idx2 !== -1) {
      const temp = newTeams[ti1][idx1]
      newTeams[ti1][idx1] = newTeams[ti2][idx2]
      newTeams[ti2][idx2] = temp
      setTeams(newTeams)
    }

    // Also swap in liveRound if active
    if (liveRound) {
      const newRound = { ...liveRound, teams: liveRound.teams.map(t => ({ ...t, players: [...t.players] })) }
      const liveTeam1 = newRound.teams[ti1]
      const liveTeam2 = newRound.teams[ti2]
      const li1 = liveTeam1.players.findIndex(p => p.id === pid1)
      const li2 = liveTeam2.players.findIndex(p => p.id === pid2)
      if (li1 !== -1 && li2 !== -1) {
        const temp = liveTeam1.players[li1]
        liveTeam1.players[li1] = liveTeam2.players[li2]
        liveTeam2.players[li2] = temp
        // Update team names
        liveTeam1.name = getTeamName(liveTeam1.players)
        liveTeam2.name = getTeamName(liveTeam2.players)
        setLiveRound(newRound)
      }
    }

    setSwapSelection(null)
  }

  // Move the currently-selected player to the specified destination team (no swap)
  const handleMovePlayerHere = (destTeamIndex) => {
    if (!swapSelection) return
    if (swapSelection.teamIndex === destTeamIndex) return
    const srcTeamIndex = swapSelection.teamIndex
    const playerId = swapSelection.playerId

    // Update teams array
    const newTeams = teams.map(t => [...t])
    const srcIdx = newTeams[srcTeamIndex].findIndex(p => p.id === playerId)
    if (srcIdx === -1) {
      setSwapSelection(null)
      return
    }
    const [movedPlayer] = newTeams[srcTeamIndex].splice(srcIdx, 1)
    newTeams[destTeamIndex].push(movedPlayer)
    // Remove empty teams
    const cleanedTeams = newTeams.filter(t => t.length > 0)
    setTeams(cleanedTeams)

    // Also update liveRound if active
    if (liveRound) {
      const newRound = { ...liveRound, teams: liveRound.teams.map(t => ({ ...t, players: [...t.players] })) }
      const liveSrc = newRound.teams[srcTeamIndex]
      const liveDest = newRound.teams[destTeamIndex]
      const liveIdx = liveSrc.players.findIndex(p => p.id === playerId)
      if (liveIdx !== -1) {
        const [liveMoved] = liveSrc.players.splice(liveIdx, 1)
        liveDest.players.push(liveMoved)
        liveSrc.name = getTeamName(liveSrc.players)
        liveDest.name = getTeamName(liveDest.players)
        // Remove empty liveRound teams
        newRound.teams = newRound.teams.filter(t => t.players.length > 0)
        setLiveRound(newRound)
      }
    }

    setSwapSelection(null)
  }

  // Players not already on any team (available for late add) — includes all roster players
  const allTeamPlayers = liveRound
    ? liveRound.teams.flatMap(t => t.players)
    : teams.flat()
  const teamPlayerIds = new Set(allTeamPlayers.map(p => p.id))
  const availablePlayers = players
    .filter(p => p.isActive !== false && !teamPlayerIds.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  const handleAddPlayer = (player, teamIndex) => {
    const playerData = {
      ...player,
      handicap: player.handicap ?? player.effectiveHandicap ?? null,
      tee: player.defaultTee || 'blue'
    }

    // Update pre-round teams
    const newTeams = teams.map(t => [...t])
    newTeams[teamIndex].push(playerData)
    setTeams(newTeams)

    // If live round is active, also add to liveRound
    if (liveRound) {
      const fullPlayer = players.find(fp => fp.id === player.id) || player
      const newLiveRound = { ...liveRound, teams: liveRound.teams.map((t, idx) => {
        if (idx !== teamIndex) return t
        return {
          ...t,
          name: getTeamName([...t.players, playerData]),
          players: [...t.players, {
            id: player.id,
            name: player.name,
            skillRating: player.skillRating || fullPlayer.skillRating,
            handicap: player.handicap || fullPlayer.handicap,
            avgTotal: player.avgTotal || fullPlayer.avgTotal || 0,
            scores: {},
            isDNF: false,
            includeInTeamScore: true,
            joinedLate: true,
            tee: fullPlayer.defaultTee || 'blue'
          }]
        }
      })}
      setLiveRound(newLiveRound)
    }
  }

  const moveTeamUp = (idx) => {
    if (idx <= 0) return
    const newTeams = [...teams]
    ;[newTeams[idx - 1], newTeams[idx]] = [newTeams[idx], newTeams[idx - 1]]
    setTeams(newTeams)
  }

  const moveTeamDown = (idx) => {
    if (idx >= teams.length - 1) return
    const newTeams = [...teams]
    ;[newTeams[idx], newTeams[idx + 1]] = [newTeams[idx + 1], newTeams[idx]]
    setTeams(newTeams)
  }

  const startLiveRound = () => {
    if (teams.length === 0) {
      alert('Please generate teams first!')
      return
    }

    if (isShenvalee && !ninesReady) {
      alert('Please pick a front nine and a different back nine before starting the round.')
      return
    }

    const round = {
      id: Date.now(),
      date: new Date().toISOString(),
      ...(roundFormatOverride ? { formatConfig: roundFormatOverride } : {}),
      ...(isShenvalee && roundNines ? { course: 'shenvalee', nines: { ...roundNines } } : {}),
      teams: teams.map((team, idx) => ({
        id: idx,
        name: getTeamName(team),
        players: team.map(p => {
          // Get the full player data to include avgTotal and defaultTee
          const fullPlayer = players.find(fp => fp.id === p.id) || p
          return {
            id: p.id,
            name: p.name,
            skillRating: p.skillRating || fullPlayer.skillRating,
            handicap: p.handicap || fullPlayer.handicap,
            avgTotal: p.avgTotal || fullPlayer.avgTotal || 0,
            scores: {},
            isDNF: false,
            includeInTeamScore: true,
            joinedLate: false,
            tee: fullPlayer.defaultTee || 'blue'
          }
        }),
        totalScore: 0,
        isFinished: false,
        greenies: {}
      }))
    }

    setLiveRound(round)

    // Notify league members
    if (leagueId && !isCasualGame && !isTestLeague) {
      import('../lib/notificationService').then(({ sendPushNotification, isQuietHours }) => {
        if (isQuietHours(leagueSettings)) return
        const teamCount = teams.length
        const playerCount = teams.reduce((sum, t) => sum + t.length, 0)
        sendPushNotification(leagueId, leagueName || 'Round Started!',
          `${teamCount} teams, ${playerCount} players. Let's go!`,
          { tag: 'round-start', category: 'round_alerts' }
        )
      }).catch(() => {})
    }

    // Clear check-in state and format override
    setCheckedInPlayers([])
    setManualTeams([])
    setPairingRequests([])
    if (roundFormatOverride) setRoundFormatOverride(null)

    navigate('/live')
  }

  const clearTeams = () => {
    if (window.confirm('Clear teams and go back to check-in? Your checked-in players, manual teams, and pairing requests will be kept.')) {
      setTeams([])
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Today's Teams</h2>

      {teams.length === 0 ? (
        <div className="alert alert-info">
          No teams generated yet. Go to the Generate tab to create teams.
        </div>
      ) : (
        <>
          {/* Balance info */}
          {balance && (
            <div className="alert alert-success" style={{ marginBottom: '20px' }}>
              {teams.length} teams created with balanced skill levels
              <div style={{ fontSize: '13px', marginTop: '5px', opacity: 0.8 }}>
                Skill Range: {balance.range.toFixed(1)} | Average: {balance.avg?.toFixed(1) || '0'}
              </div>
            </div>
          )}

          {/* Side games opt-in sections */}
          {(isCasualGame || (leagueSettings.sideGames?.enabled && leagueSettings.sideGames?.allowSkins !== false)) && (
            <SkinsOptInSection
              teams={teams}
              skinsMatch={skinsMatch}
              setSkinsMatch={setSkinsMatch}
              liveRound={liveRound}
              setLiveRound={setLiveRound}
              isAdmin={isAdmin}
              isCasualGame={isCasualGame}
            />
          )}

          {(isCasualGame || (leagueSettings.sideGames?.enabled && leagueSettings.sideGames?.allowNassau !== false)) && (
            <NassauOptInSection
              teams={teams}
              nassauMatch={nassauMatch}
              setNassauMatch={setNassauMatch}
              liveRound={liveRound}
              isAdmin={isAdmin}
              isCasualGame={isCasualGame}
            />
          )}

          {/* Swap banner */}
          {swapSelection && (
            <div style={{
              background: 'var(--color-info-light, #e3f2fd)',
              border: '2px solid var(--color-accent-blue)',
              padding: '10px 15px',
              borderRadius: '8px',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px'
            }}>
              <span>
                <strong>{teams[swapSelection.teamIndex]?.find(p => p.id === swapSelection.playerId)?.name}</strong> selected — tap a player on another team to swap, or use "Move to this team"
              </span>
              <button
                onClick={() => setSwapSelection(null)}
                style={{
                  background: 'none',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Team list */}
          {teams.map((team, idx) => (
            <TeamCard
              key={idx}
              team={team}
              index={idx}
              totalTeams={teams.length}
              onMoveUp={moveTeamUp}
              onMoveDown={moveTeamDown}
              isAdmin={isAdmin}
              courseTees={courseTees}
              swapSelection={swapSelection}
              onPlayerTap={handlePlayerTap}
              onMovePlayerHere={handleMovePlayerHere}
              canSwap={canSwap}
              onAddPlayer={handleAddPlayer}
              availablePlayers={availablePlayers}
              allTeams={teams}
            />
          ))}

          {/* Action buttons */}
          <div style={{ marginTop: '20px' }}>
            {isShenvalee && !liveRound && isAdmin && (
              <NinePicker roundNines={roundNines} setRoundNines={setRoundNines} />
            )}

            {liveRound ? (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/live')}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px',
                  background: 'var(--color-warning)'
                }}
              >
                Go to Live Round in Progress
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={startLiveRound}
                disabled={!ninesReady}
                style={{ width: '100%', padding: '15px', fontSize: '16px', opacity: ninesReady ? 1 : 0.5, cursor: ninesReady ? 'pointer' : 'not-allowed' }}
              >
                Start Live Round
              </button>
            )}

            {isAdmin && !liveRound && (
              <button
                className="btn btn-secondary"
                onClick={clearTeams}
                style={{ width: '100%', marginTop: '10px' }}
              >
                Clear Teams
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default TeamsPage
