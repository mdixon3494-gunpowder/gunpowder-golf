import { useState } from 'react'
import { useLeague } from '../context/LeagueContext'
import { GUNPOWDER_SCORECARD, getHoleInfo } from '../lib/courseData'

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

function RoundDetailModal({ round, onClose }) {
  const total = round.total || round.totalScore
  const front = round.frontNine || round.frontNineScore
  const back = round.backNine || round.backNineScore

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>Round Details - {new Date(round.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Score summary */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Front 9</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>{front || '-'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Back 9</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e67e22' }}>{back || '-'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>Total</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{total || '-'}</div>
            </div>
          </div>

          {/* Score breakdown */}
          {round.breakdown && (
            <div style={{ background: '#e8f5e9', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '13px' }}>Score Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
                {round.breakdown.holeInOne > 0 && <div>Hole in One: <strong>{round.breakdown.holeInOne}</strong></div>}
                <div>Eagles: <strong>{round.breakdown.eagles || 0}</strong></div>
                <div>Birdies: <strong>{round.breakdown.birdies || 0}</strong></div>
                <div>Pars: <strong>{round.breakdown.pars || 0}</strong></div>
                <div>Bogeys: <strong>{round.breakdown.bogeys || 0}</strong></div>
                <div>Doubles: <strong>{round.breakdown.doubleBogeys || 0}</strong></div>
                <div>Triple+: <strong>{round.breakdown.worse || 0}</strong></div>
              </div>
            </div>
          )}

          {/* Greenies won */}
          {round.greeniesWon && round.greeniesWon.length > 0 && (
            <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }}>
              <strong>Greenies Won:</strong> {round.greeniesWon.map(h => `Hole ${h}`).join(', ')}
            </div>
          )}

          {/* Hole-by-hole scorecard */}
          {round.scores && (
            <>
              <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '14px' }}>Hole-by-Hole Scorecard</div>

              {/* Front 9 */}
              <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', minWidth: '400px' }}>
                  <thead>
                    <tr style={{ background: '#27ae60', color: 'white' }}>
                      <th style={{ padding: '6px 4px', textAlign: 'center' }}>Hole</th>
                      {[1,2,3,4,5,6,7,8,9].map(h => (
                        <th key={h} style={{ padding: '6px 4px', textAlign: 'center' }}>{h}</th>
                      ))}
                      <th style={{ padding: '6px 4px', textAlign: 'center', background: '#229954' }}>OUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: '#f8f9fa' }}>
                      <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold' }}>Par</td>
                      {GUNPOWDER_SCORECARD.front9.map(h => (
                        <td key={h.hole} style={{ padding: '6px 4px', textAlign: 'center' }}>{h.par}</td>
                      ))}
                      <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold' }}>
                        {GUNPOWDER_SCORECARD.front9.reduce((s, h) => s + h.par, 0)}
                      </td>
                    </tr>
                    <tr style={{ background: 'white' }}>
                      <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold' }}>Score</td>
                      {[1,2,3,4,5,6,7,8,9].map(h => {
                        const score = round.scores[h]
                        const par = getHoleInfo(h)?.par || 4
                        const diff = score ? score - par : 0
                        let bg = 'white'
                        if (score && score !== 'X') {
                          if (diff <= -2) bg = '#ffd700'
                          else if (diff === -1) bg = '#90EE90'
                          else if (diff === 0) bg = '#e8f5e9'
                          else if (diff === 1) bg = '#fff3e0'
                          else if (diff >= 2) bg = '#ffebee'
                        }
                        return (
                          <td key={h} style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', background: bg }}>
                            {score || '-'}
                          </td>
                        )
                      })}
                      <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', background: '#e8f5e9' }}>
                        {front || '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Back 9 */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', minWidth: '400px' }}>
                  <thead>
                    <tr style={{ background: '#ef6c00', color: 'white' }}>
                      <th style={{ padding: '6px 4px', textAlign: 'center' }}>Hole</th>
                      {[10,11,12,13,14,15,16,17,18].map(h => (
                        <th key={h} style={{ padding: '6px 4px', textAlign: 'center' }}>{h}</th>
                      ))}
                      <th style={{ padding: '6px 4px', textAlign: 'center', background: '#e65100' }}>IN</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: '#f8f9fa' }}>
                      <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold' }}>Par</td>
                      {GUNPOWDER_SCORECARD.back9.map(h => (
                        <td key={h.hole} style={{ padding: '6px 4px', textAlign: 'center' }}>{h.par}</td>
                      ))}
                      <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold' }}>
                        {GUNPOWDER_SCORECARD.back9.reduce((s, h) => s + h.par, 0)}
                      </td>
                    </tr>
                    <tr style={{ background: 'white' }}>
                      <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold' }}>Score</td>
                      {[10,11,12,13,14,15,16,17,18].map(h => {
                        const score = round.scores[h]
                        const par = getHoleInfo(h)?.par || 4
                        const diff = score ? score - par : 0
                        let bg = 'white'
                        if (score && score !== 'X') {
                          if (diff <= -2) bg = '#ffd700'
                          else if (diff === -1) bg = '#90EE90'
                          else if (diff === 0) bg = '#e8f5e9'
                          else if (diff === 1) bg = '#fff3e0'
                          else if (diff >= 2) bg = '#ffebee'
                        }
                        return (
                          <td key={h} style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', background: bg }}>
                            {score || '-'}
                          </td>
                        )
                      })}
                      <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', background: '#fff3e0' }}>
                        {back || '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total row */}
              <div style={{ marginTop: '10px', padding: '10px', background: '#1a472a', color: 'white', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>TOTAL</span>
                <span>{total || '-'}</span>
              </div>
            </>
          )}

          <button className="btn btn-secondary" onClick={onClose} style={{ width: '100%', marginTop: '20px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function PlayerStatsModal({ player, onClose }) {
  const history = player.scoreHistory || []
  const [statFilter, setStatFilter] = useState('all')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterLastX, setFilterLastX] = useState(5)
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [viewingRound, setViewingRound] = useState(null)

  // Get available years from history
  const availableYears = [...new Set(history.map(r => new Date(r.date).getFullYear()))].sort((a, b) => b - a)

  // Filter rounds based on selected filter
  const getFilteredRounds = () => {
    let filtered = [...history]

    if (statFilter === 'year') {
      filtered = filtered.filter(r => new Date(r.date).getFullYear() === filterYear)
    } else if (statFilter === 'lastX') {
      filtered = filtered.slice(0, filterLastX)
    } else if (statFilter === 'range' && filterStartDate && filterEndDate) {
      const start = new Date(filterStartDate)
      const end = new Date(filterEndDate)
      filtered = filtered.filter(r => {
        const d = new Date(r.date)
        return d >= start && d <= end
      })
    }

    return filtered
  }

  const filteredRounds = getFilteredRounds()
  const completeRounds = filteredRounds.filter(r => r.isComplete !== false)

  // Calculate lifetime stats from filtered rounds
  const calculateLifetimeStats = () => {
    const stats = {
      holeInOne: 0,
      eagles: 0,
      birdies: 0,
      pars: 0,
      bogeys: 0,
      doubleBogeys: 0,
      worse: 0,
      greeniesTotal: 0,
      greeniesByHole: { 4: 0, 8: 0, 12: 0, 17: 0 }
    }

    filteredRounds.forEach(round => {
      if (round.breakdown) {
        stats.holeInOne += round.breakdown.holeInOne || 0
        stats.eagles += round.breakdown.eagles || 0
        stats.birdies += round.breakdown.birdies || 0
        stats.pars += round.breakdown.pars || 0
        stats.bogeys += round.breakdown.bogeys || 0
        stats.doubleBogeys += round.breakdown.doubleBogeys || 0
        stats.worse += round.breakdown.worse || 0
      }
      if (round.greeniesWon && round.greeniesWon.length > 0) {
        stats.greeniesTotal += round.greeniesWon.length
        round.greeniesWon.forEach(hole => {
          if (stats.greeniesByHole[hole] !== undefined) {
            stats.greeniesByHole[hole]++
          }
        })
      }
    })

    return stats
  }

  const lifetimeStats = calculateLifetimeStats()

  // Calculate money totals from filtered rounds
  const calculateMoneyTotals = () => {
    const totals = {
      greeniesPaid: 0,
      greeniesWon: 0,
      teamPaid: 0,
      teamWon: 0,
      skinsPaid: 0,
      skinsWon: 0,
      skinsCount: 0,
      hioPaid: 0,
      leaguePaid: 0,
      leagueWon: 0,
      rounds: 0
    }

    filteredRounds.forEach(round => {
      if (round.greenies) {
        totals.greeniesPaid += round.greenies.paid || 0
        totals.greeniesWon += round.greenies.won || 0
      }
      if (round.team) {
        totals.teamPaid += round.team.paid || 0
        totals.teamWon += round.team.won || 0
      }
      if (round.skins) {
        totals.skinsPaid += round.skins.entry || 0
        totals.skinsWon += round.skins.winnings || 0
        totals.skinsCount += round.skins.skinsWon || 0
      }
      if (round.hio) {
        totals.hioPaid += round.hio.paid || 0
      }
      // Also check direct properties (legacy format)
      if (round.leaguePaid !== undefined) {
        totals.leaguePaid += round.leaguePaid || 0
        totals.leagueWon += round.leagueWon || 0
      } else {
        totals.leaguePaid += (round.greenies?.paid || 0) + (round.team?.paid || 0) + (round.hio?.paid || 0)
        totals.leagueWon += (round.greenies?.won || 0) + (round.team?.won || 0)
      }
      totals.rounds++
    })

    return totals
  }

  const moneyTotals = calculateMoneyTotals()
  const leagueNet = moneyTotals.leagueWon - moneyTotals.leaguePaid
  const skinsNet = moneyTotals.skinsWon - moneyTotals.skinsPaid
  const hasMoneyData = moneyTotals.leaguePaid > 0 || moneyTotals.leagueWon > 0 || moneyTotals.skinsPaid > 0

  // Calculate basic stats
  const calculateBasicStats = () => {
    const validRounds = completeRounds.filter(r => (r.total || r.totalScore) > 0)
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

  const basicStats = calculateBasicStats()

  const filterLabel = statFilter === 'all' ? 'All Time' :
    statFilter === 'year' ? `${filterYear}` :
    statFilter === 'lastX' ? `Last ${filterLastX} Rounds` :
    statFilter === 'range' ? 'Date Range' : ''

  if (viewingRound) {
    return <RoundDetailModal round={viewingRound} onClose={() => setViewingRound(null)} />
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h3>{player.name} - Stats</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Filter buttons */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <button onClick={() => setStatFilter('all')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: statFilter === 'all' ? '#27ae60' : 'white', color: statFilter === 'all' ? 'white' : '#333', cursor: 'pointer', fontWeight: statFilter === 'all' ? '600' : 'normal', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>All Time</button>
              <button onClick={() => setStatFilter('year')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: statFilter === 'year' ? '#3498db' : 'white', color: statFilter === 'year' ? 'white' : '#333', cursor: 'pointer', fontWeight: statFilter === 'year' ? '600' : 'normal', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>By Year</button>
              <button onClick={() => setStatFilter('lastX')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: statFilter === 'lastX' ? '#9b59b6' : 'white', color: statFilter === 'lastX' ? 'white' : '#333', cursor: 'pointer', fontWeight: statFilter === 'lastX' ? '600' : 'normal', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>Last X</button>
              <button onClick={() => setStatFilter('range')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: statFilter === 'range' ? '#e67e22' : 'white', color: statFilter === 'range' ? 'white' : '#333', cursor: 'pointer', fontWeight: statFilter === 'range' ? '600' : 'normal', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>Date Range</button>
            </div>

            {/* Filter options */}
            {statFilter === 'year' && (
              <select value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))} style={{ padding: '8px', borderRadius: '6px', border: '2px solid #ddd' }}>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            {statFilter === 'lastX' && (
              <select value={filterLastX} onChange={(e) => setFilterLastX(parseInt(e.target.value))} style={{ padding: '8px', borderRadius: '6px', border: '2px solid #ddd' }}>
                {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>Last {n} rounds</option>)}
              </select>
            )}
            {statFilter === 'range' && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '2px solid #ddd' }} />
                <span>to</span>
                <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '2px solid #ddd' }} />
              </div>
            )}
          </div>

          {history.length === 0 ? (
            <div className="empty-state">
              <h3>No Stats Available</h3>
              <p>This player hasn't completed any rounds yet.</p>
            </div>
          ) : (
            <>
              {/* Basic stats */}
              {basicStats && (
                <div className="stats-grid" style={{ marginBottom: '20px' }}>
                  <div className="stat-card">
                    <div className="stat-label">Rounds ({filterLabel})</div>
                    <div className="stat-value">{basicStats.rounds}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Average Score</div>
                    <div className="stat-value">{basicStats.avgTotal.toFixed(1)}</div>
                  </div>
                  <div className="stat-card" style={{ background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' }}>
                    <div className="stat-label">Best Round</div>
                    <div className="stat-value">{basicStats.bestTotal}</div>
                  </div>
                  <div className="stat-card" style={{ background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' }}>
                    <div className="stat-label">Worst Round</div>
                    <div className="stat-value">{basicStats.worstTotal}</div>
                  </div>
                </div>
              )}

              {/* Score breakdown */}
              <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>Score Breakdown - {filterLabel} ({completeRounds.length} rounds)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '13px' }}>
                  {lifetimeStats.holeInOne > 0 && <div>Hole in One: <strong>{lifetimeStats.holeInOne}</strong></div>}
                  <div>Eagles: <strong>{lifetimeStats.eagles}</strong></div>
                  <div>Birdies: <strong>{lifetimeStats.birdies}</strong></div>
                  <div>Pars: <strong>{lifetimeStats.pars}</strong></div>
                  <div>Bogeys: <strong>{lifetimeStats.bogeys}</strong></div>
                  <div>Doubles: <strong>{lifetimeStats.doubleBogeys}</strong></div>
                  <div>Triple+: <strong>{lifetimeStats.worse}</strong></div>
                </div>

                {/* Greenies section */}
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    Greenies Won: <strong>{lifetimeStats.greeniesTotal}</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '12px' }}>
                    {[4, 8, 12, 17].map(hole => (
                      <div key={hole} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: '6px', padding: '6px' }}>
                        <div style={{ fontWeight: '600' }}>Hole {hole}</div>
                        <div style={{ fontSize: '16px' }}>{lifetimeStats.greeniesByHole[hole]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Front/Back averages */}
              {basicStats && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#666' }}>Avg Front 9</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
                      {basicStats.avgFront > 0 ? basicStats.avgFront.toFixed(1) : '-'}
                    </div>
                  </div>
                  <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#666' }}>Avg Back 9</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e67e22' }}>
                      {basicStats.avgBack > 0 ? basicStats.avgBack.toFixed(1) : '-'}
                    </div>
                  </div>
                </div>
              )}

              {/* Money History */}
              {hasMoneyData && (
                <div style={{ marginBottom: '20px' }}>
                  {/* League Money Stats */}
                  <div style={{
                    background: leagueNet >= 0 ? '#e8f5e9' : '#ffebee',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    border: `2px solid ${leagueNet >= 0 ? '#27ae60' : '#e74c3c'}`
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '12px', color: '#333' }}>
                      League Money Stats ({moneyTotals.rounds} rounds)
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#666' }}>Paid</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#e74c3c' }}>
                          ${moneyTotals.leaguePaid.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#666' }}>Won</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#27ae60' }}>
                          ${moneyTotals.leagueWon.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#666' }}>Net</div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: leagueNet >= 0 ? '#27ae60' : '#e74c3c' }}>
                          {leagueNet >= 0 ? '+' : ''}${leagueNet.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Category breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '10px' }}>
                      {(moneyTotals.greeniesPaid > 0 || moneyTotals.greeniesWon > 0) && (
                        <div style={{ background: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                          <div style={{ color: '#666' }}>Greenies</div>
                          <div style={{ fontWeight: '600', color: (moneyTotals.greeniesWon - moneyTotals.greeniesPaid) >= 0 ? '#27ae60' : '#e74c3c' }}>
                            {(moneyTotals.greeniesWon - moneyTotals.greeniesPaid) >= 0 ? '+' : ''}${(moneyTotals.greeniesWon - moneyTotals.greeniesPaid).toFixed(2)}
                          </div>
                        </div>
                      )}
                      {(moneyTotals.teamPaid > 0 || moneyTotals.teamWon > 0) && (
                        <div style={{ background: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                          <div style={{ color: '#666' }}>Team</div>
                          <div style={{ fontWeight: '600', color: (moneyTotals.teamWon - moneyTotals.teamPaid) >= 0 ? '#27ae60' : '#e74c3c' }}>
                            {(moneyTotals.teamWon - moneyTotals.teamPaid) >= 0 ? '+' : ''}${(moneyTotals.teamWon - moneyTotals.teamPaid).toFixed(2)}
                          </div>
                        </div>
                      )}
                      {moneyTotals.hioPaid > 0 && (
                        <div style={{ background: 'white', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                          <div style={{ color: '#666' }}>HIO Pot</div>
                          <div style={{ fontWeight: '600', color: '#e74c3c' }}>-${moneyTotals.hioPaid.toFixed(2)}</div>
                        </div>
                      )}
                    </div>

                    {moneyTotals.rounds > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '10px', color: '#666', textAlign: 'center' }}>
                        Avg per round: {leagueNet >= 0 ? '+' : ''}${(leagueNet / moneyTotals.rounds).toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Skins Stats (separate) */}
                  {moneyTotals.skinsPaid > 0 && (
                    <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', border: '2px solid #2196f3' }}>
                      <div style={{ fontWeight: '600', marginBottom: '10px', color: '#1976d2' }}>Skins Stats (separate game)</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '11px' }}>
                          Entry: ${moneyTotals.skinsPaid.toFixed(2)} | Won: ${moneyTotals.skinsWon.toFixed(2)} ({moneyTotals.skinsCount} skins)
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: skinsNet >= 0 ? '#27ae60' : '#e74c3c' }}>
                          {skinsNet >= 0 ? '+' : ''}${skinsNet.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Round history */}
              <h4 style={{ marginBottom: '10px' }}>Round History ({filteredRounds.length})</h4>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {filteredRounds.length === 0 ? (
                  <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No rounds found for this filter</p>
                ) : (
                  filteredRounds.slice().reverse().map((round, idx) => {
                    const total = round.total || round.totalScore
                    const front = round.frontNine || round.frontNineScore
                    const back = round.backNine || round.backNineScore
                    return (
                      <div
                        key={round.id || idx}
                        onClick={() => setViewingRound(round)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          background: round.isComplete === false ? '#fff3e0' : (idx % 2 === 0 ? '#f8f9fa' : 'white'),
                          borderRadius: '6px',
                          marginBottom: '4px',
                          cursor: 'pointer',
                          border: round.isComplete === false ? '2px solid #ff9800' : '2px solid transparent',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#e3f2fd'}
                        onMouseLeave={(e) => e.currentTarget.style.background = round.isComplete === false ? '#fff3e0' : (idx % 2 === 0 ? '#f8f9fa' : 'white')}
                      >
                        <div>
                          <span style={{ fontWeight: '600' }}>
                            {new Date(round.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          {round.isComplete === false && (
                            <span style={{ marginLeft: '8px', background: '#ff9800', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                              INCOMPLETE
                            </span>
                          )}
                          {round.greeniesWon && round.greeniesWon.length > 0 && (
                            <span style={{ marginLeft: '8px', color: '#27ae60', fontSize: '12px' }}>
                              +{round.greeniesWon.length} greenie{round.greeniesWon.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span>
                            <strong style={{ fontSize: '16px' }}>{total}</strong>
                            <span style={{ color: '#666', marginLeft: '8px', fontSize: '12px' }}>
                              ({front} + {back})
                            </span>
                          </span>
                          <span style={{ color: '#3498db', fontSize: '12px' }}>View</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
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
