import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../context/LeagueContext'
import { generateTeams } from '../utils/teamGeneration'

function PlayerCheckInCard({ player, isSelected, isInManualTeam, onToggle, showSkill }) {
  return (
    <div
      style={{
        background: isSelected ? '#d4edda' : '#f8f9fa',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        cursor: isInManualTeam ? 'not-allowed' : 'pointer',
        opacity: isInManualTeam ? 0.6 : 1
      }}
      onClick={() => !isInManualTeam && onToggle()}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => {}}
        disabled={isInManualTeam}
        style={{ marginRight: '12px' }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600' }}>
          {player.name}
          {isSelected && (
            <span style={{
              marginLeft: '10px',
              background: '#27ae60',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px'
            }}>
              Checked In
            </span>
          )}
        </div>
        {showSkill && (
          <div style={{ fontSize: '13px', color: '#333', fontWeight: '500' }}>
            Skill: {player.skillRating?.toFixed(1) || '5.0'}
          </div>
        )}
      </div>
      {isInManualTeam && (
        <span style={{ fontSize: '12px', color: '#666' }}>In Manual Team</span>
      )}
    </div>
  )
}

function ManualTeamCard({ team, onDelete }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
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

function CreateManualTeamForm({ availablePlayers, onSave, onCancel }) {
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
    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
      <h4 style={{ marginBottom: '10px' }}>Select 3-4 Players</h4>
      {availablePlayers.map(player => (
        <div
          key={player.id}
          style={{
            background: selectedIds.includes(player.id) ? '#d4edda' : 'white',
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
          {player.name} ({player.skillRating?.toFixed(1) || '5.0'})
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
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' }}>
          <h2 style={{ margin: 0, color: 'white' }}>{skinsMatch ? 'Edit' : 'Start'} Skins Match</h2>
          <button className="modal-close" onClick={onClose} style={{ color: 'white' }}>&times;</button>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Cost per Skin ($)</label>
            <input type="number" value={settings.costPerSkin} onChange={(e) => setSettings({ ...settings, costPerSkin: e.target.value })} placeholder="1.00" style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid #ddd', fontSize: '16px' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Carryovers</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setSettings({ ...settings, carryovers: true })} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.carryovers ? '2px solid #f39c12' : '2px solid #ddd', background: settings.carryovers ? '#fff8e1' : 'white', fontWeight: settings.carryovers ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
              <button onClick={() => setSettings({ ...settings, carryovers: false })} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: !settings.carryovers ? '2px solid #f39c12' : '2px solid #ddd', background: !settings.carryovers ? '#fff8e1' : 'white', fontWeight: !settings.carryovers ? '600' : 'normal', cursor: 'pointer' }}>No</button>
            </div>
          </div>
          {settings.carryovers && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Wrap Unwon Skins</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setSettings({ ...settings, wrapUnwonSkins: true })} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.wrapUnwonSkins ? '2px solid #f39c12' : '2px solid #ddd', background: settings.wrapUnwonSkins ? '#fff8e1' : 'white', fontWeight: settings.wrapUnwonSkins ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                  <button onClick={() => setSettings({ ...settings, wrapUnwonSkins: false })} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: !settings.wrapUnwonSkins ? '2px solid #f39c12' : '2px solid #ddd', background: !settings.wrapUnwonSkins ? '#fff8e1' : 'white', fontWeight: !settings.wrapUnwonSkins ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                </div>
              </div>
              {settings.wrapUnwonSkins && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Wrap To</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setSettings({ ...settings, wrapTo: 'front' })} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.wrapTo === 'front' ? '2px solid #f39c12' : '2px solid #ddd', background: settings.wrapTo === 'front' ? '#fff8e1' : 'white', fontWeight: settings.wrapTo === 'front' ? '600' : 'normal', cursor: 'pointer' }}>Front 9</button>
                    <button onClick={() => setSettings({ ...settings, wrapTo: 'back' })} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.wrapTo === 'back' ? '2px solid #f39c12' : '2px solid #ddd', background: settings.wrapTo === 'back' ? '#fff8e1' : 'white', fontWeight: settings.wrapTo === 'back' ? '600' : 'normal', cursor: 'pointer' }}>Back 9</button>
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
      <div style={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '10px', color: 'white' }}>Skins Match</h3>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', marginBottom: '15px' }}>Set up a skins competition that runs alongside the league round.</p>
        <button className="btn" onClick={() => setShowSetup(true)} style={{ background: 'white', color: '#e67e22', fontWeight: '600' }}>Set Up Skins Match</button>
        {showSetup && <SkinsSetupModal onClose={() => setShowSetup(false)} skinsMatch={null} onSave={setSkinsMatch} />}
      </div>
    )
  }

  return (
    <div style={{ background: '#fff8e1', border: '2px solid #f39c12', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#e67e22' }}>Skins Match Active</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowSetup(true)} style={{ background: '#f39c12', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
          <button onClick={cancelSkins} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: '#666', marginBottom: '15px', fontSize: '13px' }}>
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
              <button key={player.id} onClick={() => togglePlayer(player.id)} disabled={!canToggle} style={{ padding: '10px 14px', borderRadius: '20px', border: inSkins ? '2px solid #27ae60' : '2px solid #ddd', background: inSkins ? '#e8f8f5' : 'white', color: inSkins ? '#27ae60' : '#666', fontSize: '13px', fontWeight: inSkins ? '600' : 'normal', cursor: canToggle ? 'pointer' : 'not-allowed', opacity: canToggle ? 1 : 0.7 }}>
                {inSkins ? '✓ ' : ''}{player.name}
              </button>
            )
          })}
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '10px', background: '#f8f9fa', borderRadius: '8px', fontSize: '13px' }}>
        <strong>{skinsMatch.participants.length}</strong> player{skinsMatch.participants.length !== 1 ? 's' : ''} in skins
        {skinsMatch.participants.length >= 2 && <span style={{ color: '#27ae60' }}> - Ready to play</span>}
      </div>
      {showSetup && <SkinsSetupModal onClose={() => setShowSetup(false)} skinsMatch={skinsMatch} onSave={setSkinsMatch} />}
    </div>
  )
}

function PairingRequestForm({ availablePlayers, existingRequests, onAdd, onRemove }) {
  const [player1, setPlayer1] = useState('')
  const [player2, setPlayer2] = useState('')

  const handleAdd = () => {
    if (player1 && player2 && player1 !== player2) {
      onAdd({ player1, player2 })
      setPlayer1('')
      setPlayer2('')
    }
  }

  return (
    <div style={{ marginBottom: '30px' }}>
      <h3 style={{ marginBottom: '15px' }}>Pairing Requests (Optional)</h3>

      {existingRequests.map(request => {
        const p1 = availablePlayers.find(p => p.id === parseInt(request.player1))
        const p2 = availablePlayers.find(p => p.id === parseInt(request.player2))
        return (
          <div key={request.id} style={{
            background: '#fff3cd',
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

      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <select
            value={player1}
            onChange={(e) => setPlayer1(e.target.value)}
            style={{
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          >
            <option value="">Select Player 1</option>
            {availablePlayers.map(player => (
              <option key={player.id} value={player.id}>{player.name}</option>
            ))}
          </select>
          <select
            value={player2}
            onChange={(e) => setPlayer2(e.target.value)}
            style={{
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          >
            <option value="">Select Player 2</option>
            {availablePlayers.map(player => (
              <option key={player.id} value={player.id}>{player.name}</option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleAdd}
          disabled={!player1 || !player2 || player1 === player2}
        >
          Add Pairing
        </button>
      </div>
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
    checkedInPlayers,
    setCheckedInPlayers,
    manualTeams,
    setManualTeams
  } = useLeague()

  const [creatingManualTeam, setCreatingManualTeam] = useState(false)

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
          background: '#fff3cd',
          border: '2px solid #f39c12',
          padding: '30px',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>⛳</div>
          <h3 style={{ marginBottom: '15px', color: '#856404' }}>Round In Progress</h3>
          <p style={{ color: '#856404', marginBottom: '20px' }}>
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
    setPairingRequests([...pairingRequests, newRequest])
  }

  const removePairingRequest = (requestId) => {
    setPairingRequests(pairingRequests.filter(r => r.id !== requestId))
  }

  const handleGenerateTeams = () => {
    const selectedPlayerObjects = activePlayers.filter(p => selectedPlayers.includes(p.id))
    const generated = generateTeams(selectedPlayerObjects, pairingRequests, manualTeams)

    // Save teams to context and navigate to Teams page
    setTeams(generated)
    navigate('/teams')
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Player Check-In</h2>

      {/* Player Selection / Check-In */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>
          {isAdmin ? "Select Players for Today's Round" : "Check In for Today's Round"}
        </h3>

        {!isAdmin && (
          <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
            Tap your name to check in for today's round
          </p>
        )}

        {activePlayers.length === 0 ? (
          <div className="alert alert-info">
            No active players available. Add players in the Players tab first.
          </div>
        ) : (
          <div>
            {/* Player count at top */}
            <div style={{
              padding: '10px 15px',
              background: '#e3f2fd',
              borderRadius: '8px',
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: '#1976d2', fontWeight: '600' }}>
                {selectedPlayers.length} of {activePlayers.length} Checked In
              </span>
              {selectedPlayers.length >= 6 && (
                <span style={{ color: '#27ae60', fontSize: '13px' }}>Ready to generate teams</span>
              )}
            </div>

            {activePlayers.map(player => (
              <PlayerCheckInCard
                key={player.id}
                player={player}
                isSelected={selectedPlayers.includes(player.id)}
                isInManualTeam={playersInManualTeams.has(player.id)}
                onToggle={() => togglePlayerSelection(player.id)}
                showSkill={isAdmin}
              />
            ))}

            {/* Player count at bottom */}
            <div style={{
              padding: '10px 15px',
              background: '#e3f2fd',
              borderRadius: '8px',
              marginTop: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: '#1976d2', fontWeight: '600' }}>
                {selectedPlayers.length} of {activePlayers.length} Checked In
              </span>
              {selectedPlayers.length >= 6 && (
                <span style={{ color: '#27ae60', fontSize: '13px' }}>Ready to generate teams</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Skins Opt-In Section */}
      <SkinsOptInSection
        selectedPlayers={selectedPlayers}
        activePlayers={activePlayers}
        skinsMatch={skinsMatch}
        setSkinsMatch={setSkinsMatch}
        liveRound={liveRound}
        isAdmin={isAdmin}
      />

      {/* Admin-only sections */}
      {isAdmin && (
        <>
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
            <p style={{ textAlign: 'center', color: '#e74c3c', marginTop: '10px' }}>
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
