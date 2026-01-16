import { useState } from 'react'
import { useLeague } from '../context/LeagueContext'

function PlayerCard({ player, onEdit, onView, onToggleActive, isAdmin }) {
  return (
    <div className="player-card">
      <div className="player-info">
        <div className="player-name">
          {player.name}
          {player.isActive === false && (
            <span style={{
              marginLeft: '10px',
              background: '#e74c3c',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px'
            }}>
              INACTIVE
            </span>
          )}
        </div>
        <div className="player-skill">
          Skill Rating: {player.skillRating?.toFixed(1) || '5.0'} |
          Games: {player.gamesPlayed || 0}
          {player.avgTotal > 0 && ` | Avg: ${player.avgTotal.toFixed(1)}`}
        </div>
      </div>
      <div className="player-actions">
        <button
          className="btn btn-small btn-primary"
          onClick={() => onView(player)}
        >
          Stats
        </button>
        <button
          className="btn btn-small btn-secondary"
          onClick={() => onEdit(player)}
        >
          Edit
        </button>
        {isAdmin && (
          <button
            className="btn btn-small"
            onClick={() => onToggleActive(player)}
            style={{
              background: player.isActive === false ? '#27ae60' : '#e74c3c',
              color: 'white'
            }}
          >
            {player.isActive === false ? 'Activate' : 'Deactivate'}
          </button>
        )}
      </div>
    </div>
  )
}

function AddPlayerForm({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [skillRating, setSkillRating] = useState('5')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('Please enter a player name')
      return
    }

    onAdd({
      id: Date.now(),
      name: name.trim(),
      skillRating: parseFloat(skillRating) || 5,
      phone: phone.trim(),
      email: email.trim(),
      emergencyName: emergencyName.trim(),
      emergencyPhone: emergencyPhone.trim(),
      gamesPlayed: 0,
      avgFrontNine: 0,
      avgBackNine: 0,
      avgTotal: 0,
      teammates: {},
      recentTeammates: [],
      scoreHistory: [],
      holeStats: {},
      isActive: true
    })
  }

  return (
    <div style={{
      background: '#f8f9fa',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Add New Player</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="input-group" style={{ marginBottom: '0' }}>
            <label>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Player name"
            />
          </div>
          <div className="input-group" style={{ marginBottom: '0' }}>
            <label>Skill Rating (1-10)</label>
            <input
              type="number"
              value={skillRating}
              onChange={(e) => setSkillRating(e.target.value)}
              min="1"
              max="10"
              step="0.5"
            />
          </div>
          <div className="input-group" style={{ marginBottom: '0' }}>
            <label>Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
          </div>
          <div className="input-group" style={{ marginBottom: '0' }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
            />
          </div>
          <div className="input-group" style={{ marginBottom: '0' }}>
            <label>Emergency Contact Name</label>
            <input
              type="text"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              placeholder="Emergency contact"
            />
          </div>
          <div className="input-group" style={{ marginBottom: '0' }}>
            <label>Emergency Contact Phone</label>
            <input
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="Emergency phone"
            />
          </div>
        </div>
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button type="submit" className="btn btn-primary">Add Player</button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

function EditPlayerModal({ player, onSave, onClose, onDelete, isAdmin }) {
  const [name, setName] = useState(player.name)
  const [skillRating, setSkillRating] = useState(player.skillRating?.toString() || '5')
  const [phone, setPhone] = useState(player.phone || '')
  const [email, setEmail] = useState(player.email || '')
  const [emergencyName, setEmergencyName] = useState(player.emergencyName || '')
  const [emergencyPhone, setEmergencyPhone] = useState(player.emergencyPhone || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePin, setDeletePin] = useState('')

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a player name')
      return
    }

    onSave({
      ...player,
      name: name.trim(),
      skillRating: parseFloat(skillRating) || 5,
      phone: phone.trim(),
      email: email.trim(),
      emergencyName: emergencyName.trim(),
      emergencyPhone: emergencyPhone.trim()
    })
  }

  const handleDelete = () => {
    if (deletePin === '1234') {
      onDelete(player.id)
    } else {
      alert('Incorrect PIN')
      setDeletePin('')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Player</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {showDeleteConfirm ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
              <h4 style={{ marginBottom: '15px' }}>Delete {player.name}?</h4>
              <p style={{ marginBottom: '20px', color: '#666' }}>
                This action cannot be undone. All player data will be permanently deleted.
              </p>
              <div className="input-group">
                <label>Enter Admin PIN to confirm</label>
                <input
                  type="password"
                  value={deletePin}
                  onChange={(e) => setDeletePin(e.target.value)}
                  placeholder="Enter PIN"
                  maxLength={4}
                  style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '5px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-danger" onClick={handleDelete}>Delete Player</button>
                <button className="btn btn-secondary" onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeletePin('')
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label>Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label>Skill Rating (1-10)</label>
                  <input
                    type="number"
                    value={skillRating}
                    onChange={(e) => setSkillRating(e.target.value)}
                    min="1"
                    max="10"
                    step="0.5"
                  />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label>Emergency Contact</label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label>Emergency Phone</label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
                  <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                </div>
                {isAdmin && (
                  <button
                    className="btn btn-danger"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PlayerStatsModal({ player, onClose }) {
  const history = player.scoreHistory || []

  const calculateStats = () => {
    if (history.length === 0) return null

    // Support both legacy property names (total/frontNine/backNine) and new names
    const validRounds = history.filter(r => (r.total || r.totalScore) > 0)
    if (validRounds.length === 0) return null

    const totalScores = validRounds.map(r => r.total || r.totalScore)
    const frontScores = validRounds.map(r => r.frontNine || r.frontNineScore).filter(s => s > 0)
    const backScores = validRounds.map(r => r.backNine || r.backNineScore).filter(s => s > 0)

    return {
      rounds: validRounds.length,
      avgTotal: totalScores.reduce((a, b) => a + b, 0) / totalScores.length,
      bestTotal: Math.min(...totalScores),
      worstTotal: Math.max(...totalScores),
      avgFront: frontScores.length > 0 ? frontScores.reduce((a, b) => a + b, 0) / frontScores.length : 0,
      avgBack: backScores.length > 0 ? backScores.reduce((a, b) => a + b, 0) / backScores.length : 0
    }
  }

  const stats = calculateStats()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h3>{player.name} - Stats</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {stats ? (
            <>
              <div className="stats-grid" style={{ marginBottom: '20px' }}>
                <div className="stat-card">
                  <div className="stat-label">Rounds Played</div>
                  <div className="stat-value">{stats.rounds}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Average Score</div>
                  <div className="stat-value">{stats.avgTotal.toFixed(1)}</div>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' }}>
                  <div className="stat-label">Best Round</div>
                  <div className="stat-value">{stats.bestTotal}</div>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' }}>
                  <div className="stat-label">Worst Round</div>
                  <div className="stat-value">{stats.worstTotal}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#666' }}>Avg Front 9</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
                    {stats.avgFront > 0 ? stats.avgFront.toFixed(1) : '-'}
                  </div>
                </div>
                <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#666' }}>Avg Back 9</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e67e22' }}>
                    {stats.avgBack > 0 ? stats.avgBack.toFixed(1) : '-'}
                  </div>
                </div>
              </div>

              <h4 style={{ marginBottom: '10px' }}>Recent Rounds</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {history.slice().reverse().slice(0, 10).map((round, idx) => {
                  const total = round.total || round.totalScore
                  const front = round.frontNine || round.frontNineScore
                  const back = round.backNine || round.backNineScore
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px',
                      background: idx % 2 === 0 ? '#f8f9fa' : 'white',
                      borderRadius: '4px'
                    }}>
                      <span>{new Date(round.date).toLocaleDateString()}</span>
                      <span>
                        <strong>{total}</strong>
                        <span style={{ color: '#666', marginLeft: '10px' }}>
                          ({front} + {back})
                        </span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>No Stats Available</h3>
              <p>This player hasn't completed any rounds yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PlayersPage() {
  const { players, setPlayers, isAdmin, leagueSettings } = useLeague()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [viewingPlayer, setViewingPlayer] = useState(null)
  const [filter, setFilter] = useState('active') // 'all', 'active', 'inactive'

  const filteredPlayers = players.filter(player => {
    if (filter === 'active') return player.isActive !== false
    if (filter === 'inactive') return player.isActive === false
    return true
  }).sort((a, b) => a.name.localeCompare(b.name))

  const handleAddPlayer = (newPlayer) => {
    setPlayers([...players, newPlayer])
    setShowAddForm(false)
  }

  const handleEditPlayer = (updatedPlayer) => {
    setPlayers(players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p))
    setEditingPlayer(null)
  }

  const handleDeletePlayer = (playerId) => {
    setPlayers(players.filter(p => p.id !== playerId))
    setEditingPlayer(null)
  }

  const handleToggleActive = (player) => {
    setPlayers(players.map(p => {
      if (p.id === player.id) {
        return { ...p, isActive: p.isActive === false ? true : false }
      }
      return p
    }))
  }

  const activeCount = players.filter(p => p.isActive !== false).length
  const inactiveCount = players.filter(p => p.isActive === false).length

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Players</h2>

      {/* Filter buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          className={`btn ${filter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('active')}
        >
          Active ({activeCount})
        </button>
        <button
          className={`btn ${filter === 'inactive' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('inactive')}
        >
          Inactive ({inactiveCount})
        </button>
        <button
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter('all')}
        >
          All ({players.length})
        </button>
        <div style={{ flex: 1 }} />
        {!showAddForm && (
          <button
            className="btn btn-primary"
            onClick={() => setShowAddForm(true)}
          >
            + Add Player
          </button>
        )}
      </div>

      {/* Add player form */}
      {showAddForm && (
        <AddPlayerForm
          onAdd={handleAddPlayer}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Player list */}
      {filteredPlayers.length === 0 ? (
        <div className="empty-state">
          <h3>No Players Found</h3>
          <p>
            {filter === 'active' && 'Add some players to get started!'}
            {filter === 'inactive' && 'No inactive players.'}
            {filter === 'all' && 'Add some players to get started!'}
          </p>
        </div>
      ) : (
        <div>
          {filteredPlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onEdit={setEditingPlayer}
              onView={setViewingPlayer}
              onToggleActive={handleToggleActive}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          onSave={handleEditPlayer}
          onClose={() => setEditingPlayer(null)}
          onDelete={handleDeletePlayer}
          isAdmin={isAdmin}
        />
      )}

      {/* Stats modal */}
      {viewingPlayer && (
        <PlayerStatsModal
          player={viewingPlayer}
          onClose={() => setViewingPlayer(null)}
        />
      )}
    </div>
  )
}

export default PlayersPage
