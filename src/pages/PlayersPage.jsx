import { useState } from 'react'
import { useLeague } from '../context/LeagueContext'
import { GUNPOWDER_SCORECARD, getHoleInfo } from '../lib/courseData'
import { createProfile } from '../lib/profileService'
import {
  getAllHandicaps,
  formatHandicap,
  formatCourseHandicap,
  getScopeLabel,
  recalculatePlayerHandicaps,
  getCourseHandicapForTee,
  getEffectiveHandicap,
  DEFAULT_COURSE_TEES,
  DEFAULT_HANDICAP_SETTINGS
} from '../utils/handicapCalculation'

function PlayerCard({ player, onEdit, onView, onToggleActive, isAdmin, handicapScope, leagueId, courseTees, handicapSettings }) {
  // Calculate all three handicaps for display (these are always calculated from rounds)
  const handicaps = getAllHandicaps(player, leagueId, courseTees, handicapSettings?.maxHandicap || 54, handicapSettings)

  // Get the effective handicap (respects manual mode and uses manual fallback when needed)
  const effectiveHandicap = getEffectiveHandicap(player, handicapSettings, leagueId, courseTees)

  // Helper to get the calculated handicap based on scope (for informational display)
  const getCalculatedHandicap = () => {
    switch (handicapScope) {
      case 'league': return handicaps.leagueHandicap
      case 'gunpowder': return handicaps.gunpowderHandicap
      case 'true':
      default: return handicaps.trueHandicap
    }
  }

  // Use effective handicap for main display (respects manual mode / fallback)
  // Effective handicap is always for the configured scope
  const activeHandicap = effectiveHandicap
  const calculatedForScope = getCalculatedHandicap()
  const isUsingManual = effectiveHandicap !== calculatedForScope && effectiveHandicap === player.handicap
  const playerTee = player.defaultTee || 'blue'
  const courseHandicap = getCourseHandicapForTee(activeHandicap, playerTee, courseTees)

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
          {/* Primary display: Index and Course HCP */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              background: isUsingManual ? '#e67e22' : '#27ae60',
              color: 'white',
              fontWeight: '600'
            }}>
              Index: {formatHandicap(activeHandicap)}{isUsingManual ? ' (M)' : ''}
            </span>
            {player.capApplied && (
              <span
                title={`Raw: ${formatHandicap(player.rawHandicap)} | Low Index: ${formatHandicap(player.lowIndex)}`}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  background: '#e74c3c',
                  color: 'white',
                  fontWeight: '700',
                  cursor: 'help'
                }}
              >
                CAP
              </span>
            )}
            <span style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              background: '#3498db',
              color: 'white',
              fontWeight: '600'
            }}>
              Course HCP: {formatCourseHandicap(courseHandicap)}
            </span>
            <span style={{ color: '#666', fontSize: '12px' }}>
              Games: {player.gamesPlayed || 0}
            </span>
            {player.avgTotal > 0 && (
              <span style={{ color: '#666', fontSize: '12px' }}>
                | Avg: {player.avgTotal.toFixed(1)}
              </span>
            )}
          </div>
          {/* Secondary display: All three index values */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              padding: '1px 5px',
              borderRadius: '3px',
              fontSize: '10px',
              background: handicapScope === 'true' ? '#e8f5e9' : '#f5f5f5',
              color: handicapScope === 'true' ? '#2e7d32' : '#888',
              border: handicapScope === 'true' ? '1px solid #a5d6a7' : '1px solid #e0e0e0'
            }}>
              True: {formatHandicap(handicaps.trueHandicap)}
            </span>
            <span style={{
              padding: '1px 5px',
              borderRadius: '3px',
              fontSize: '10px',
              background: handicapScope === 'league' ? '#e8f5e9' : '#f5f5f5',
              color: handicapScope === 'league' ? '#2e7d32' : '#888',
              border: handicapScope === 'league' ? '1px solid #a5d6a7' : '1px solid #e0e0e0'
            }}>
              League: {formatHandicap(handicaps.leagueHandicap)}
            </span>
            <span style={{
              padding: '1px 5px',
              borderRadius: '3px',
              fontSize: '10px',
              background: handicapScope === 'gunpowder' ? '#e8f5e9' : '#f5f5f5',
              color: handicapScope === 'gunpowder' ? '#2e7d32' : '#888',
              border: handicapScope === 'gunpowder' ? '1px solid #a5d6a7' : '1px solid #e0e0e0'
            }}>
              Gunpowder: {formatHandicap(handicaps.gunpowderHandicap)}
            </span>
            <span style={{ fontSize: '10px', color: '#999' }}>
              ({courseTees?.[playerTee]?.name || playerTee} tees)
            </span>
          </div>
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

function AddPlayerForm({ onAdd, onCancel, courseTees }) {
  const [name, setName] = useState('')
  const [skillRating, setSkillRating] = useState('5')
  const [handicap, setHandicap] = useState('')
  const [defaultTee, setDefaultTee] = useState('blue')
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
      handicap: handicap ? parseFloat(handicap) : null,
      handicapSource: handicap ? 'manual' : null,
      defaultTee: defaultTee,
      externalRounds: [],
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
      lastRoundTeammates: [],
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
            <label>Starting Handicap (estimated)</label>
            <input
              type="number"
              value={handicap}
              onChange={(e) => setHandicap(e.target.value)}
              placeholder="e.g. 18"
              min="0"
              max="54"
              step="0.1"
            />
          </div>
          <div className="input-group" style={{ marginBottom: '0' }}>
            <label>Default Tee</label>
            <select
              value={defaultTee}
              onChange={(e) => setDefaultTee(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
            >
              {Object.entries(courseTees || DEFAULT_COURSE_TEES).map(([key, tee]) => (
                <option key={key} value={key}>{tee.name} ({tee.courseRating}/{tee.slopeRating})</option>
              ))}
            </select>
          </div>
          <div className="input-group" style={{ marginBottom: '0' }}>
            <label>Skill Rating (1-10, legacy)</label>
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

function EditPlayerModal({ player, onSave, onClose, onDelete, isAdmin, courseTees, leagueId, handicapSettings, onUpdateHandicapSettings }) {
  const [name, setName] = useState(player.name)
  const [skillRating, setSkillRating] = useState(player.skillRating?.toString() || '5')
  const [handicap, setHandicap] = useState(player.handicap?.toString() || '')
  const [defaultTee, setDefaultTee] = useState(player.defaultTee || 'blue')
  const [phone, setPhone] = useState(player.phone || '')
  const [email, setEmail] = useState(player.email || '')
  const [emergencyName, setEmergencyName] = useState(player.emergencyName || '')
  const [emergencyPhone, setEmergencyPhone] = useState(player.emergencyPhone || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePin, setDeletePin] = useState('')

  const settings = { ...DEFAULT_HANDICAP_SETTINGS, ...handicapSettings }
  const currentExemption = settings.capExemptions?.[player.id] || null

  const [exemptionType, setExemptionType] = useState(currentExemption?.type || 'none')
  const [exemptionReason, setExemptionReason] = useState(currentExemption?.reason || '')
  const [exemptionDate, setExemptionDate] = useState(currentExemption?.expiresAt || '')

  // Calculate current handicaps for display
  const calculatedHandicaps = getAllHandicaps(player, leagueId, courseTees, handicapSettings?.maxHandicap || 54, handicapSettings)

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a player name')
      return
    }

    onSave({
      ...player,
      name: name.trim(),
      skillRating: parseFloat(skillRating) || 5,
      handicap: handicap ? parseFloat(handicap) : null,
      handicapSource: handicap ? 'manual' : player.handicapSource,
      defaultTee: defaultTee,
      phone: phone.trim(),
      email: email.trim(),
      emergencyName: emergencyName.trim(),
      emergencyPhone: emergencyPhone.trim()
    })

    // Save cap exemption changes if caps are enabled
    if (settings.capsEnabled && onUpdateHandicapSettings) {
      const updatedExemptions = { ...(settings.capExemptions || {}) }
      if (exemptionType === 'none') {
        delete updatedExemptions[player.id]
      } else {
        updatedExemptions[player.id] = {
          type: exemptionType,
          reason: exemptionReason.trim(),
          expiresAt: exemptionType === 'until_date' ? exemptionDate : null
        }
      }
      onUpdateHandicapSettings({ ...settings, capExemptions: updatedExemptions })
    }
  }

  const handleRecalculateHandicap = () => {
    const updated = recalculatePlayerHandicaps(player, leagueId, courseTees)
    if (updated.handicap !== null) {
      setHandicap(updated.handicap.toString())
    } else {
      alert('Not enough rounds to calculate handicap (minimum 3 required)')
    }
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
              {/* Handicap Info Box */}
              <div style={{
                background: '#e8f5e9',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '15px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '13px' }}>
                  Calculated Handicaps
                </div>
                <div style={{ display: 'flex', gap: '15px', fontSize: '12px' }}>
                  <span>True: <strong>{formatHandicap(calculatedHandicaps.trueHandicap)}</strong></span>
                  <span>League: <strong>{formatHandicap(calculatedHandicaps.leagueHandicap)}</strong></span>
                  <span>Gunpowder: <strong>{formatHandicap(calculatedHandicaps.gunpowderHandicap)}</strong></span>
                </div>
              </div>

              {/* Cap Exemptions (admin only, when caps enabled) */}
              {isAdmin && settings.capsEnabled && (
                <div style={{
                  background: '#f0f4f8',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '15px'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '13px' }}>
                    Cap Status
                  </div>
                  <div style={{ display: 'flex', gap: '15px', fontSize: '12px', marginBottom: '10px' }}>
                    <span>Low Index: <strong>{player.lowIndex != null ? formatHandicap(player.lowIndex) : '--'}</strong></span>
                    {player.capApplied && (
                      <span style={{ color: '#e74c3c' }}>
                        Raw: <strong>{formatHandicap(player.rawHandicap)}</strong> (capped to {formatHandicap(player.handicap)})
                      </span>
                    )}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500' }}>
                      Cap Exemption
                    </label>
                    <select
                      value={exemptionType}
                      onChange={(e) => setExemptionType(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                    >
                      <option value="none">None (caps apply normally)</option>
                      <option value="indefinite">Waive Indefinitely</option>
                      <option value="until_date">Waive Until Date</option>
                      <option value="reset">Reset Low Index</option>
                    </select>
                  </div>
                  {exemptionType === 'until_date' && (
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500' }}>
                        Waive Until
                      </label>
                      <input
                        type="date"
                        value={exemptionDate}
                        onChange={(e) => setExemptionDate(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                      />
                    </div>
                  )}
                  {exemptionType !== 'none' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500' }}>
                        Reason (optional)
                      </label>
                      <input
                        type="text"
                        value={exemptionReason}
                        onChange={(e) => setExemptionReason(e.target.value)}
                        placeholder="e.g., Recovering from injury"
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                      />
                    </div>
                  )}
                </div>
              )}

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
                  <label>Manual Handicap Override</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      value={handicap}
                      onChange={(e) => setHandicap(e.target.value)}
                      placeholder="Auto-calculated"
                      min="0"
                      max="54"
                      step="0.1"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-small btn-secondary"
                      onClick={handleRecalculateHandicap}
                      title="Recalculate from scores"
                    >
                      Calc
                    </button>
                  </div>
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label>Default Tee</label>
                  <select
                    value={defaultTee}
                    onChange={(e) => setDefaultTee(e.target.value)}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                  >
                    {Object.entries(courseTees || DEFAULT_COURSE_TEES).map(([key, tee]) => (
                      <option key={key} value={key}>{tee.name} ({tee.courseRating}/{tee.slopeRating})</option>
                    ))}
                  </select>
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label>Skill Rating (1-10, legacy)</label>
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

function RoundDetailModal({ round, onClose, playerId, onSaveRound, onDeleteRound, isAdmin }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedScores, setEditedScores] = useState({})
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pendingAction, setPendingAction] = useState(null) // 'edit' or 'delete'
  const [activeKeypad, setActiveKeypad] = useState(null)
  const [keypadValue, setKeypadValue] = useState('')

  const total = round.total || round.totalScore
  const front = round.frontNine || round.frontNineScore
  const back = round.backNine || round.backNineScore
  const frontPar = GUNPOWDER_SCORECARD.front9.reduce((s, h) => s + h.par, 0)
  const backPar = GUNPOWDER_SCORECARD.back9.reduce((s, h) => s + h.par, 0)
  const totalPar = frontPar + backPar

  // Calculate totals from edited scores
  const calcFront = isEditing ? [1,2,3,4,5,6,7,8,9].reduce((sum, h) => {
    const val = editedScores[h]
    if (val === 'X' || val === 'x') return sum + 10
    return sum + (parseInt(val) || 0)
  }, 0) : front

  const calcBack = isEditing ? [10,11,12,13,14,15,16,17,18].reduce((sum, h) => {
    const val = editedScores[h]
    if (val === 'X' || val === 'x') return sum + 10
    return sum + (parseInt(val) || 0)
  }, 0) : back

  const calcTotal = isEditing ? calcFront + calcBack : total

  const cellStyle = {
    border: '1px solid #333',
    padding: '4px 2px',
    textAlign: 'center',
    fontSize: '11px',
    minWidth: '28px'
  }

  const headerCellStyle = {
    ...cellStyle,
    background: '#1a472a',
    color: 'white',
    fontWeight: 'bold'
  }

  const getScoreStyle = (score, par, isEditMode) => {
    const baseStyle = { ...cellStyle, fontWeight: 'bold', cursor: isEditMode ? 'pointer' : 'default' }
    if (!score || score === 'X') return baseStyle
    const diff = parseInt(score) - par
    let bg = 'white'
    let border = cellStyle.border
    if (diff <= -2) { bg = '#ffd700'; border = '2px solid #b8860b' }
    else if (diff === -1) { bg = '#90EE90'; border = '1px solid #333' }
    else if (diff === 0) { bg = '#e8f5e9' }
    else if (diff === 1) { bg = '#fff3e0' }
    else if (diff >= 2) { bg = '#ffcdd2' }
    return { ...baseStyle, background: bg, border }
  }

  const handleEditClick = () => {
    setPendingAction('edit')
    setShowPinPrompt(true)
  }

  const handleDeleteClick = () => {
    if (confirm('Are you sure you want to delete this round? This cannot be undone.')) {
      setPendingAction('delete')
      setShowPinPrompt(true)
    }
  }

  const handlePinSubmit = () => {
    if (pinInput === '1234') {
      if (pendingAction === 'edit') {
        setIsEditing(true)
        setEditedScores(round.scores ? { ...round.scores } : {})
      } else if (pendingAction === 'delete') {
        onDeleteRound(playerId, round.id)
        onClose()
      }
      setShowPinPrompt(false)
      setPinInput('')
      setPendingAction(null)
    } else {
      alert('Incorrect PIN')
      setPinInput('')
    }
  }

  const handleScoreClick = (hole) => {
    if (!isEditing) return
    setActiveKeypad(hole)
    setKeypadValue(editedScores[hole]?.toString() || '')
  }

  const handleKeypadPress = (key) => {
    if (key === 'backspace') {
      setKeypadValue(prev => prev.slice(0, -1))
    } else if (key === 'X') {
      setKeypadValue('X')
    } else if (key === 'clear') {
      setKeypadValue('')
    } else {
      if (keypadValue === 'X') {
        setKeypadValue(key)
      } else if (keypadValue.length < 2) {
        setKeypadValue(prev => prev + key)
      }
    }
  }

  const handleKeypadDone = () => {
    if (activeKeypad !== null) {
      const newScores = { ...editedScores }
      if (keypadValue === '' || keypadValue === null) {
        delete newScores[activeKeypad]
      } else {
        newScores[activeKeypad] = keypadValue === 'X' ? 'X' : parseInt(keypadValue)
      }
      setEditedScores(newScores)
    }
    setActiveKeypad(null)
    setKeypadValue('')
  }

  const handleSave = () => {
    // Calculate breakdown
    const allHoles = [...GUNPOWDER_SCORECARD.front9, ...GUNPOWDER_SCORECARD.back9]
    const breakdown = { holeInOne: 0, eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubleBogeys: 0, worse: 0 }

    allHoles.forEach(holeInfo => {
      const val = editedScores[holeInfo.hole]
      if (val && val !== 'X' && val !== 'x') {
        const score = parseInt(val)
        if (score === 1) breakdown.holeInOne++
        const diff = score - holeInfo.par
        if (diff <= -2) breakdown.eagles++
        else if (diff === -1) breakdown.birdies++
        else if (diff === 0) breakdown.pars++
        else if (diff === 1) breakdown.bogeys++
        else if (diff === 2) breakdown.doubleBogeys++
        else if (diff >= 3) breakdown.worse++
      } else if (val === 'X' || val === 'x') {
        breakdown.worse++
      }
    })

    const holesCompleted = Object.keys(editedScores).filter(k =>
      editedScores[k] !== undefined && editedScores[k] !== null && editedScores[k] !== ''
    ).length

    const updatedRound = {
      ...round,
      scores: editedScores,
      frontNine: calcFront,
      backNine: calcBack,
      total: calcTotal,
      frontNineScore: calcFront,
      backNineScore: calcBack,
      totalScore: calcTotal,
      breakdown,
      holesCompleted,
      isComplete: holesCompleted === 18
    }

    onSaveRound(playerId, updatedRound)
    setIsEditing(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={isEditing ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Round' : 'Round Details'} - {new Date(round.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h3>
          {!isEditing && <button className="modal-close" onClick={onClose}>&times;</button>}
        </div>
        <div className="modal-body">
          {/* Admin Edit/Delete buttons */}
          {isAdmin && !isEditing && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                onClick={handleEditClick}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Edit Scores
              </button>
              <button
                onClick={handleDeleteClick}
                style={{
                  padding: '10px 20px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          )}

          {/* Editing mode header */}
          {isEditing && (
            <div style={{
              background: '#fff3cd',
              border: '2px solid #f39c12',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '15px',
              textAlign: 'center'
            }}>
              <strong>Editing Mode</strong> - Tap any score to change it
            </div>
          )}

          {/* Score breakdown */}
          {round.breakdown && !isEditing && (
            <div style={{ background: '#e8f5e9', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '13px' }}>Score Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '12px' }}>
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
          {round.greeniesWon && round.greeniesWon.length > 0 && !isEditing && (
            <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }}>
              <strong>Greenies Won:</strong> {round.greeniesWon.map(h => `Hole ${h}`).join(', ')}
            </div>
          )}

          {/* Traditional Scorecard Grid */}
          {round.scores && (
            <div style={{
              background: 'white',
              border: '2px solid #1a472a',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
              {/* Course Header */}
              <div style={{
                background: '#1a472a',
                color: 'white',
                padding: '8px 12px',
                fontWeight: 'bold',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                Gunpowder Golf Course
              </div>

              {/* Front 9 */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...headerCellStyle, minWidth: '50px' }}>HOLE</th>
                      {[1,2,3,4,5,6,7,8,9].map(h => (
                        <th key={h} style={headerCellStyle}>{h}</th>
                      ))}
                      <th style={{ ...headerCellStyle, background: '#0d2818' }}>OUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Blue Tees */}
                    <tr>
                      <td style={{ ...cellStyle, background: '#e3f2fd', fontWeight: '600', fontSize: '10px' }}>BLUE</td>
                      {GUNPOWDER_SCORECARD.front9.map(h => (
                        <td key={h.hole} style={{ ...cellStyle, background: '#e3f2fd', fontSize: '10px' }}>{h.blue}</td>
                      ))}
                      <td style={{ ...cellStyle, background: '#e3f2fd', fontWeight: '600', fontSize: '10px' }}>
                        {GUNPOWDER_SCORECARD.front9.reduce((s, h) => s + h.blue, 0)}
                      </td>
                    </tr>
                    {/* Handicap */}
                    <tr>
                      <td style={{ ...cellStyle, background: '#f5f5f5', fontWeight: '600', fontSize: '10px' }}>HCP</td>
                      {GUNPOWDER_SCORECARD.front9.map(h => (
                        <td key={h.hole} style={{ ...cellStyle, background: '#f5f5f5', fontSize: '10px' }}>{h.hcp}</td>
                      ))}
                      <td style={{ ...cellStyle, background: '#f5f5f5' }}></td>
                    </tr>
                    {/* Par */}
                    <tr>
                      <td style={{ ...cellStyle, background: '#fff8e1', fontWeight: '600' }}>PAR</td>
                      {GUNPOWDER_SCORECARD.front9.map(h => (
                        <td key={h.hole} style={{ ...cellStyle, background: '#fff8e1', fontWeight: '600' }}>{h.par}</td>
                      ))}
                      <td style={{ ...cellStyle, background: '#fff8e1', fontWeight: 'bold' }}>{frontPar}</td>
                    </tr>
                    {/* Player Score */}
                    <tr>
                      <td style={{ ...cellStyle, fontWeight: '600', background: '#f0f0f0' }}>SCORE</td>
                      {[1,2,3,4,5,6,7,8,9].map(h => {
                        const score = isEditing ? editedScores[h] : round.scores[h]
                        const par = getHoleInfo(h)?.par || 4
                        return (
                          <td
                            key={h}
                            style={getScoreStyle(score, par, isEditing)}
                            onClick={() => handleScoreClick(h)}
                          >
                            {score || '-'}
                          </td>
                        )
                      })}
                      <td style={{ ...cellStyle, fontWeight: 'bold', background: '#e8f5e9', fontSize: '13px' }}>
                        {isEditing ? calcFront : front || '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Back 9 */}
              <div style={{ overflowX: 'auto', borderTop: '2px solid #1a472a' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...headerCellStyle, minWidth: '50px' }}>HOLE</th>
                      {[10,11,12,13,14,15,16,17,18].map(h => (
                        <th key={h} style={headerCellStyle}>{h}</th>
                      ))}
                      <th style={{ ...headerCellStyle, background: '#0d2818' }}>IN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Blue Tees */}
                    <tr>
                      <td style={{ ...cellStyle, background: '#e3f2fd', fontWeight: '600', fontSize: '10px' }}>BLUE</td>
                      {GUNPOWDER_SCORECARD.back9.map(h => (
                        <td key={h.hole} style={{ ...cellStyle, background: '#e3f2fd', fontSize: '10px' }}>{h.blue}</td>
                      ))}
                      <td style={{ ...cellStyle, background: '#e3f2fd', fontWeight: '600', fontSize: '10px' }}>
                        {GUNPOWDER_SCORECARD.back9.reduce((s, h) => s + h.blue, 0)}
                      </td>
                    </tr>
                    {/* Handicap */}
                    <tr>
                      <td style={{ ...cellStyle, background: '#f5f5f5', fontWeight: '600', fontSize: '10px' }}>HCP</td>
                      {GUNPOWDER_SCORECARD.back9.map(h => (
                        <td key={h.hole} style={{ ...cellStyle, background: '#f5f5f5', fontSize: '10px' }}>{h.hcp}</td>
                      ))}
                      <td style={{ ...cellStyle, background: '#f5f5f5' }}></td>
                    </tr>
                    {/* Par */}
                    <tr>
                      <td style={{ ...cellStyle, background: '#fff8e1', fontWeight: '600' }}>PAR</td>
                      {GUNPOWDER_SCORECARD.back9.map(h => (
                        <td key={h.hole} style={{ ...cellStyle, background: '#fff8e1', fontWeight: '600' }}>{h.par}</td>
                      ))}
                      <td style={{ ...cellStyle, background: '#fff8e1', fontWeight: 'bold' }}>{backPar}</td>
                    </tr>
                    {/* Player Score */}
                    <tr>
                      <td style={{ ...cellStyle, fontWeight: '600', background: '#f0f0f0' }}>SCORE</td>
                      {[10,11,12,13,14,15,16,17,18].map(h => {
                        const score = isEditing ? editedScores[h] : round.scores[h]
                        const par = getHoleInfo(h)?.par || 4
                        return (
                          <td
                            key={h}
                            style={getScoreStyle(score, par, isEditing)}
                            onClick={() => handleScoreClick(h)}
                          >
                            {score || '-'}
                          </td>
                        )
                      })}
                      <td style={{ ...cellStyle, fontWeight: 'bold', background: '#fff3e0', fontSize: '13px' }}>
                        {isEditing ? calcBack : back || '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Footer */}
              <div style={{
                background: '#1a472a',
                color: 'white',
                padding: '10px 15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                  <span>OUT: <strong>{isEditing ? calcFront : front || '-'}</strong></span>
                  <span>IN: <strong>{isEditing ? calcBack : back || '-'}</strong></span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  TOTAL: {isEditing ? calcTotal : total || '-'}
                  {(isEditing ? calcTotal : total) && (
                    <span style={{
                      marginLeft: '10px',
                      fontSize: '14px',
                      color: (isEditing ? calcTotal : total) - totalPar < 0 ? '#90EE90' : (isEditing ? calcTotal : total) - totalPar > 0 ? '#ffcdd2' : '#fff'
                    }}>
                      ({(isEditing ? calcTotal : total) - totalPar >= 0 ? '+' : ''}{(isEditing ? calcTotal : total) - totalPar})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          {!isEditing && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              background: '#f8f9fa',
              borderRadius: '6px',
              fontSize: '11px',
              display: 'flex',
              justifyContent: 'center',
              gap: '15px',
              flexWrap: 'wrap'
            }}>
              <span><span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#ffd700', border: '2px solid #b8860b', borderRadius: '2px', verticalAlign: 'middle', marginRight: '4px' }}></span> Eagle+</span>
              <span><span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#90EE90', border: '1px solid #333', borderRadius: '2px', verticalAlign: 'middle', marginRight: '4px' }}></span> Birdie</span>
              <span><span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#e8f5e9', border: '1px solid #333', borderRadius: '2px', verticalAlign: 'middle', marginRight: '4px' }}></span> Par</span>
              <span><span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#fff3e0', border: '1px solid #333', borderRadius: '2px', verticalAlign: 'middle', marginRight: '4px' }}></span> Bogey</span>
              <span><span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#ffcdd2', border: '1px solid #333', borderRadius: '2px', verticalAlign: 'middle', marginRight: '4px' }}></span> Double+</span>
            </div>
          )}

          {/* Buttons */}
          {isEditing ? (
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setIsEditing(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                style={{ flex: 1 }}
              >
                Save Changes
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={onClose} style={{ width: '100%', marginTop: '20px' }}>
              Close
            </button>
          )}
        </div>
      </div>

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
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowPinPrompt(false); setPinInput(''); setPendingAction(null) }}
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
                onClick={handlePinSubmit}
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
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Score Keypad Modal */}
      {activeKeypad !== null && (
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
          zIndex: 3000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '15px',
            width: '90%',
            maxWidth: '320px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid #e0e0e0' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#27ae60' }}>Hole {activeKeypad}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>Par {getHoleInfo(activeKeypad)?.par}</div>
            </div>

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
              {keypadValue || '-'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '15px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleKeypadPress(num.toString())}
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
                onClick={() => handleKeypadPress('X')}
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
                onClick={() => handleKeypadPress('0')}
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
                onClick={() => handleKeypadPress('backspace')}
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

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setActiveKeypad(null); setKeypadValue('') }}
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
                onClick={handleKeypadDone}
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
      )}
    </div>
  )
}

function PlayerStatsModal({ player, onClose, onUpdatePlayer, isAdmin, courseTees, leagueId, handicapSettings }) {
  const history = player.scoreHistory || []
  const externalRounds = player.externalRounds || []
  const [statFilter, setStatFilter] = useState('all')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterLastX, setFilterLastX] = useState(5)
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [viewingRound, setViewingRound] = useState(null)
  const [showExternalRounds, setShowExternalRounds] = useState(false)
  const [showAddExternal, setShowAddExternal] = useState(false)
  const [externalForm, setExternalForm] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    courseName: '',
    tee: '',
    courseRating: '72',
    slopeRating: '113',
    score: '',
    notes: ''
  })

  // Calculate handicaps for display
  const calculatedHandicaps = getAllHandicaps(player, leagueId, courseTees, handicapSettings?.maxHandicap || 54, handicapSettings)

  // Handle adding external round
  const handleAddExternalRound = () => {
    if (!externalForm.score || !externalForm.courseName) {
      alert('Please enter course name and score')
      return
    }

    const newExternal = {
      id: Date.now(),
      date: externalForm.date,
      courseName: externalForm.courseName.trim(),
      tee: externalForm.tee.trim() || undefined,
      courseRating: parseFloat(externalForm.courseRating) || 72,
      slopeRating: parseFloat(externalForm.slopeRating) || 113,
      score: parseInt(externalForm.score),
      notes: externalForm.notes.trim() || undefined
    }

    const updatedExternalRounds = [...(player.externalRounds || []), newExternal]
    const updatedPlayer = recalculatePlayerHandicaps(
      { ...player, externalRounds: updatedExternalRounds },
      leagueId,
      courseTees
    )

    onUpdatePlayer(updatedPlayer)
    setExternalForm({
      date: new Date().toLocaleDateString('en-CA'),
      courseName: '',
      tee: '',
      courseRating: '72',
      slopeRating: '113',
      score: '',
      notes: ''
    })
    setShowAddExternal(false)
  }

  // Handle deleting external round
  const handleDeleteExternalRound = (roundId) => {
    if (!confirm('Delete this external round?')) return

    const updatedExternalRounds = (player.externalRounds || []).filter(r => r.id !== roundId)
    const updatedPlayer = recalculatePlayerHandicaps(
      { ...player, externalRounds: updatedExternalRounds },
      leagueId,
      courseTees
    )

    onUpdatePlayer(updatedPlayer)
  }

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

  // Handler for saving edited round
  const handleSaveRound = (playerId, updatedRound) => {
    const updatedHistory = player.scoreHistory.map(round =>
      round.id === updatedRound.id ? updatedRound : round
    )

    // Recalculate player stats
    const validRounds = updatedHistory.filter(r => r.isComplete !== false && (r.total || r.totalScore) > 0)
    const totals = validRounds.map(r => r.total || r.totalScore)
    const fronts = validRounds.map(r => r.frontNine || r.frontNineScore).filter(s => s > 0)
    const backs = validRounds.map(r => r.backNine || r.backNineScore).filter(s => s > 0)

    const avgTotal = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0
    const avgFront = fronts.length > 0 ? fronts.reduce((a, b) => a + b, 0) / fronts.length : 0
    const avgBack = backs.length > 0 ? backs.reduce((a, b) => a + b, 0) / backs.length : 0

    onUpdatePlayer({
      ...player,
      scoreHistory: updatedHistory,
      gamesPlayed: validRounds.length,
      avgTotal,
      avgFrontNine: avgFront,
      avgBackNine: avgBack
    })
  }

  // Handler for deleting a round
  const handleDeleteRound = (playerId, roundId) => {
    const updatedHistory = player.scoreHistory.filter(round => round.id !== roundId)

    // Recalculate player stats
    const validRounds = updatedHistory.filter(r => r.isComplete !== false && (r.total || r.totalScore) > 0)
    const totals = validRounds.map(r => r.total || r.totalScore)
    const fronts = validRounds.map(r => r.frontNine || r.frontNineScore).filter(s => s > 0)
    const backs = validRounds.map(r => r.backNine || r.backNineScore).filter(s => s > 0)

    const avgTotal = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0
    const avgFront = fronts.length > 0 ? fronts.reduce((a, b) => a + b, 0) / fronts.length : 0
    const avgBack = backs.length > 0 ? backs.reduce((a, b) => a + b, 0) / backs.length : 0

    onUpdatePlayer({
      ...player,
      scoreHistory: updatedHistory,
      gamesPlayed: validRounds.length,
      avgTotal,
      avgFrontNine: avgFront,
      avgBackNine: avgBack
    })

    setViewingRound(null)
  }

  if (viewingRound) {
    return (
      <RoundDetailModal
        round={viewingRound}
        onClose={() => setViewingRound(null)}
        playerId={player.id}
        onSaveRound={handleSaveRound}
        onDeleteRound={handleDeleteRound}
        isAdmin={isAdmin}
      />
    )
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

              {/* Handicap Summary */}
              <div style={{
                background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
                color: 'white',
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '20px'
              }}>
                <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Handicap Summary</h4>
                <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                  <div>
                    <div style={{ opacity: 0.8 }}>True</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{formatHandicap(calculatedHandicaps.trueHandicap)}</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.8 }}>League</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{formatHandicap(calculatedHandicaps.leagueHandicap)}</div>
                  </div>
                  <div>
                    <div style={{ opacity: 0.8 }}>Gunpowder</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{formatHandicap(calculatedHandicaps.gunpowderHandicap)}</div>
                  </div>
                </div>
                {player.defaultTee && (
                  <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.9 }}>
                    Default Tee: {courseTees?.[player.defaultTee]?.name || player.defaultTee}
                  </div>
                )}
              </div>

              {/* External Rounds Section */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <h4 style={{ margin: 0 }}>
                    External Rounds ({externalRounds.length})
                  </h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {externalRounds.length > 0 && (
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => setShowExternalRounds(!showExternalRounds)}
                      >
                        {showExternalRounds ? 'Hide' : 'Show'}
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        className="btn btn-small btn-primary"
                        onClick={() => setShowAddExternal(true)}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Add External Round Form */}
                {showAddExternal && (
                  <div style={{
                    background: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '15px'
                  }}>
                    <h5 style={{ marginBottom: '12px' }}>Add External Round</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="input-group" style={{ marginBottom: '0' }}>
                        <label>Date</label>
                        <input
                          type="date"
                          value={externalForm.date}
                          onChange={(e) => setExternalForm({ ...externalForm, date: e.target.value })}
                        />
                      </div>
                      <div className="input-group" style={{ marginBottom: '0' }}>
                        <label>Course Name *</label>
                        <input
                          type="text"
                          value={externalForm.courseName}
                          onChange={(e) => setExternalForm({ ...externalForm, courseName: e.target.value })}
                          placeholder="e.g. Pine Valley"
                        />
                      </div>
                      <div className="input-group" style={{ marginBottom: '0' }}>
                        <label>Tee (optional)</label>
                        <input
                          type="text"
                          value={externalForm.tee}
                          onChange={(e) => setExternalForm({ ...externalForm, tee: e.target.value })}
                          placeholder="e.g. Blue"
                        />
                      </div>
                      <div className="input-group" style={{ marginBottom: '0' }}>
                        <label>Score *</label>
                        <input
                          type="number"
                          value={externalForm.score}
                          onChange={(e) => setExternalForm({ ...externalForm, score: e.target.value })}
                          placeholder="e.g. 85"
                        />
                      </div>
                      <div className="input-group" style={{ marginBottom: '0' }}>
                        <label>Course Rating</label>
                        <input
                          type="number"
                          step="0.1"
                          value={externalForm.courseRating}
                          onChange={(e) => setExternalForm({ ...externalForm, courseRating: e.target.value })}
                        />
                      </div>
                      <div className="input-group" style={{ marginBottom: '0' }}>
                        <label>Slope Rating</label>
                        <input
                          type="number"
                          value={externalForm.slopeRating}
                          onChange={(e) => setExternalForm({ ...externalForm, slopeRating: e.target.value })}
                        />
                      </div>
                      <div className="input-group" style={{ marginBottom: '0', gridColumn: 'span 2' }}>
                        <label>Notes (optional)</label>
                        <input
                          type="text"
                          value={externalForm.notes}
                          onChange={(e) => setExternalForm({ ...externalForm, notes: e.target.value })}
                          placeholder="Any notes about this round"
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <button className="btn btn-primary" onClick={handleAddExternalRound}>
                        Add Round
                      </button>
                      <button className="btn btn-secondary" onClick={() => setShowAddExternal(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* External Rounds List */}
                {showExternalRounds && externalRounds.length > 0 && (
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {externalRounds.slice().reverse().map((round, idx) => (
                      <div
                        key={round.id || idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          background: idx % 2 === 0 ? '#f0f7ff' : '#e3f2fd',
                          borderRadius: '6px',
                          marginBottom: '4px',
                          fontSize: '13px'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600' }}>{round.courseName}</div>
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            {new Date(round.date).toLocaleDateString()} |
                            {round.tee && ` ${round.tee} |`}
                            Rating: {round.courseRating}/{round.slopeRating}
                            {round.notes && ` | ${round.notes}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <strong style={{ fontSize: '16px' }}>{round.score}</strong>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteExternalRound(round.id)}
                              style={{
                                background: '#e74c3c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Round history */}
              <h4 style={{ marginBottom: '10px' }}>League Round History ({filteredRounds.length})</h4>
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
  const { players, setPlayers, isAdmin, leagueSettings, handicapSettings, setHandicapSettings, courseTees, leagueId } = useLeague()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [viewingPlayer, setViewingPlayer] = useState(null)
  const [filter, setFilter] = useState('active') // 'all', 'active', 'inactive'

  const handicapScope = handicapSettings?.handicapScope || 'true'

  const filteredPlayers = players.filter(player => {
    if (filter === 'active') return player.isActive !== false
    if (filter === 'inactive') return player.isActive === false
    return true
  }).sort((a, b) => a.name.localeCompare(b.name))

  const handleAddPlayer = async (newPlayer) => {
    // Create a ghost profile for the new player (non-blocking on failure)
    try {
      const ghostProfile = await createProfile({
        displayName: newPlayer.name,
        email: newPlayer.email || null,
        phone: newPlayer.phone || null,
        defaultTee: newPlayer.defaultTee || 'blue'
      })
      if (ghostProfile) {
        newPlayer.profile_id = ghostProfile.id
      }
    } catch (err) {
      console.warn('Could not create ghost profile for new player:', err)
    }

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
          courseTees={courseTees}
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
              handicapScope={handicapScope}
              leagueId={leagueId}
              courseTees={courseTees}
              handicapSettings={handicapSettings}
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
          courseTees={courseTees}
          leagueId={leagueId}
          handicapSettings={handicapSettings}
          onUpdateHandicapSettings={setHandicapSettings}
        />
      )}

      {/* Stats modal */}
      {viewingPlayer && (
        <PlayerStatsModal
          player={viewingPlayer}
          onClose={() => setViewingPlayer(null)}
          onUpdatePlayer={(updatedPlayer) => {
            setPlayers(players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p))
            setViewingPlayer(updatedPlayer)
          }}
          isAdmin={isAdmin}
          courseTees={courseTees}
          leagueId={leagueId}
          handicapSettings={handicapSettings}
        />
      )}
    </div>
  )
}

export default PlayersPage
