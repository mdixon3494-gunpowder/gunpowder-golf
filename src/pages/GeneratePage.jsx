import { useState } from 'react'
import { useLeague } from '../context/LeagueContext'
import { generateTeams, getTeamName, calculateTeamSkill, calculateTeamBalance } from '../utils/teamGeneration'

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
          <div style={{ fontSize: '13px', color: '#666' }}>
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

function GeneratedTeamsPreview({ teams, onAccept, onRegenerate }) {
  const balance = calculateTeamBalance(teams)

  return (
    <div style={{ marginTop: '30px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h3 style={{ marginBottom: '10px' }}>Teams Generated!</h3>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          {teams.length} teams created | Skill Range: {balance.range.toFixed(1)} | Avg: {balance.avg?.toFixed(1) || '0'}
        </div>
      </div>

      {teams.map((team, idx) => {
        const teamSkill = calculateTeamSkill(team)
        const avgSkill = team.length > 0 ? teamSkill / team.length : 0

        return (
          <div key={idx} className="team-container" style={{ marginBottom: '15px' }}>
            <div className="team-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>
                <span style={{
                  background: '#95a5a6',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  marginRight: '10px'
                }}>
                  #{idx + 1}
                </span>
                {getTeamName(team)} ({team.length})
              </span>
              <span style={{ fontSize: '13px', color: '#666' }}>
                Skill: {teamSkill.toFixed(1)} (Avg: {avgSkill.toFixed(1)})
              </span>
            </div>
            {team.map(player => (
              <div key={player.id} className="team-member">
                {player.name} ({player.skillRating?.toFixed(1) || '5.0'})
              </div>
            ))}
          </div>
        )
      })}

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button
          className="btn btn-primary"
          onClick={onAccept}
          style={{ flex: 2, padding: '15px', fontSize: '16px' }}
        >
          Save Teams
        </button>
        <button
          className="btn btn-secondary"
          onClick={onRegenerate}
          style={{ flex: 1, padding: '15px' }}
        >
          Regenerate
        </button>
      </div>
    </div>
  )
}

function GeneratePage() {
  const {
    players,
    teams,
    setTeams,
    pairingRequests,
    setPairingRequests,
    isAdmin
  } = useLeague()

  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [manualTeams, setManualTeams] = useState([])
  const [creatingManualTeam, setCreatingManualTeam] = useState(false)
  const [generatedTeams, setGeneratedTeams] = useState(null)

  const activePlayers = players.filter(p => p.isActive !== false)

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
    setGeneratedTeams(generated)
  }

  const handleAcceptTeams = () => {
    setTeams(generatedTeams)
    setGeneratedTeams(null)
    setManualTeams([])
    setSelectedPlayers([])
    setPairingRequests([])
  }

  const handleRegenerate = () => {
    handleGenerateTeams()
  }

  // If teams have been generated and are showing in preview
  if (generatedTeams) {
    return (
      <div>
        <h2 style={{ marginBottom: '20px' }}>Generate Teams</h2>
        <GeneratedTeamsPreview
          teams={generatedTeams}
          onAccept={handleAcceptTeams}
          onRegenerate={handleRegenerate}
        />
        <button
          className="btn btn-secondary"
          onClick={() => setGeneratedTeams(null)}
          style={{ marginTop: '10px', width: '100%' }}
        >
          Back to Selection
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>
        {isAdmin ? 'Generate Teams' : 'Player Check-In'}
      </h2>

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
          </div>
        )}

        {/* Check-In Summary */}
        <div style={{
          marginTop: '15px',
          padding: '15px',
          background: '#e3f2fd',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <strong style={{ fontSize: '18px', color: '#1976d2' }}>
            {selectedPlayers.length} Players Checked In
          </strong>
        </div>
      </div>

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
