import { useState, useEffect, useRef, useMemo } from 'react'
import { useLeague } from '../context/LeagueContext'
import { useAuth } from '../context/AuthContext'
import { GUNPOWDER_SCORECARD, getHoleInfo } from '../lib/courseData'
import { createProfile, searchProfiles } from '../lib/profileService'
import { addLeagueMember, getLeagueMembers } from '../lib/leagueService'
import { getHandicapSourcesForProfile } from '../lib/roundHistoryService'
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
  const settings = { ...DEFAULT_HANDICAP_SETTINGS, ...handicapSettings }
  const isUsingGhin = settings.allowGhinOverride && player.ghinIndex != null && settings.handicapScope === 'true' && effectiveHandicap === player.ghinIndex
  const isUsingManual = !isUsingGhin && effectiveHandicap !== calculatedForScope && effectiveHandicap === player.handicap
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
              background: 'var(--color-danger)',
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
              background: isUsingGhin ? 'var(--color-info-dark)' : isUsingManual ? 'var(--color-skins-dark)' : 'var(--color-success)',
              color: 'white',
              fontWeight: '600'
            }}>
              Index: {formatHandicap(activeHandicap)}{isUsingGhin ? ' (GHIN)' : isUsingManual ? ' (M)' : ''}
            </span>
            {player.capApplied && (
              <span
                title={`Raw: ${formatHandicap(player.rawHandicap)} | Low Index: ${formatHandicap(player.lowIndex)}`}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  background: 'var(--color-danger)',
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
              background: 'var(--color-info)',
              color: 'white',
              fontWeight: '600'
            }}>
              Course HCP: {formatCourseHandicap(courseHandicap)}
            </span>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
              Games: {player.gamesPlayed || 0}
            </span>
            {player.avgTotal > 0 && (
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
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
              background: handicapScope === 'true' ? 'var(--color-success-light)' : 'var(--color-surface-sunken)',
              color: handicapScope === 'true' ? 'var(--color-success-dark)' : 'var(--color-text-tertiary)',
              border: handicapScope === 'true' ? '1px solid var(--color-success-border)' : '1px solid var(--color-border)'
            }}>
              True: {formatHandicap(handicaps.trueHandicap)}
            </span>
            <span style={{
              padding: '1px 5px',
              borderRadius: '3px',
              fontSize: '10px',
              background: handicapScope === 'league' ? 'var(--color-success-light)' : 'var(--color-surface-sunken)',
              color: handicapScope === 'league' ? 'var(--color-success-dark)' : 'var(--color-text-tertiary)',
              border: handicapScope === 'league' ? '1px solid var(--color-success-border)' : '1px solid var(--color-border)'
            }}>
              League: {formatHandicap(handicaps.leagueHandicap)}
            </span>
            <span style={{
              padding: '1px 5px',
              borderRadius: '3px',
              fontSize: '10px',
              background: handicapScope === 'gunpowder' ? 'var(--color-success-light)' : 'var(--color-surface-sunken)',
              color: handicapScope === 'gunpowder' ? 'var(--color-success-dark)' : 'var(--color-text-tertiary)',
              border: handicapScope === 'gunpowder' ? '1px solid var(--color-success-border)' : '1px solid var(--color-border)'
            }}>
              Gunpowder: {formatHandicap(handicaps.gunpowderHandicap)}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
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
              background: player.isActive === false ? 'var(--color-success)' : 'var(--color-danger)',
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

function AddPlayerForm({ onAdd, onCancel, courseTees, existingPlayers, leagueId }) {
  const [name, setName] = useState('')
  const [skillRating, setSkillRating] = useState('5')
  const [handicap, setHandicap] = useState('')
  const [defaultTee, setDefaultTee] = useState('blue')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')

  // Profile search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const searchTimeout = useRef(null)
  const [linkedProfile, setLinkedProfile] = useState(null)

  // League member suggestions
  const [memberSuggestions, setMemberSuggestions] = useState([])
  useEffect(() => {
    if (!leagueId) return
    const existingProfileIds = new Set(
      (existingPlayers || []).filter(p => p.profileId || p.profile_id).map(p => p.profileId || p.profile_id)
    )
    getLeagueMembers(leagueId).then(members => {
      const unlinked = members
        .filter(m => m.profiles && m.profile_id && !existingProfileIds.has(m.profile_id))
        .map(m => ({
          id: m.profile_id,
          display_name: m.profiles.display_name,
          avatar_url: m.profiles.avatar_url,
          email: m.profiles.email || '',
          phone: m.profiles.phone || '',
          default_tee: m.profiles.default_tee || '',
          handicap_index: m.profiles.handicap_index
        }))
      setMemberSuggestions(unlinked)
    }).catch(() => {})
  }, [leagueId, existingPlayers])

  // Handicap source picker state
  const [handicapSourceMode, setHandicapSourceMode] = useState('manual') // 'profile' | 'league:ID' | 'manual' | 'none'
  const [leagueHandicaps, setLeagueHandicaps] = useState([])
  const [loadingHandicaps, setLoadingHandicaps] = useState(false)
  const [handicapFetchFailed, setHandicapFetchFailed] = useState(false)

  // Fetch handicap sources when a profile is linked
  useEffect(() => {
    if (!linkedProfile?.id) {
      setLeagueHandicaps([])
      setHandicapSourceMode('manual')
      setLoadingHandicaps(false)
      setHandicapFetchFailed(false)
      return
    }

    let cancelled = false
    setLoadingHandicaps(true)
    setHandicapFetchFailed(false)

    getHandicapSourcesForProfile(linkedProfile.id, courseTees)
      .then(sources => {
        if (cancelled) return
        const otherLeagueSources = sources.filter(s => s.sourceId !== leagueId)
        setLeagueHandicaps(otherLeagueSources)
        setLoadingHandicaps(false)
      })
      .catch(() => {
        if (cancelled) return
        setLeagueHandicaps([])
        setLoadingHandicaps(false)
        setHandicapFetchFailed(true)
      })

    return () => { cancelled = true }
  }, [linkedProfile?.id, courseTees, leagueId])

  // Debounced profile search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    searchTimeout.current = setTimeout(async () => {
      const results = await searchProfiles(searchQuery.trim())
      // Filter out players already in the roster by profileId
      const existingProfileIds = new Set(
        (existingPlayers || []).filter(p => p.profileId || p.profile_id).map(p => p.profileId || p.profile_id)
      )
      setSearchResults(results.filter(r => !existingProfileIds.has(r.id)))
      setSearching(false)
    }, 400)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [searchQuery, existingPlayers])

  const selectProfile = (user) => {
    setLinkedProfile(user)
    setName(user.display_name)
    if (user.email) setEmail(user.email)
    if (user.phone) setPhone(user.phone)
    if (user.default_tee) setDefaultTee(user.default_tee)
    if (user.handicap_index != null) {
      setHandicap(String(user.handicap_index))
      setHandicapSourceMode('profile')
    } else {
      setHandicap('')
      setHandicapSourceMode('manual')
    }
    setSearchQuery('')
    setSearchResults([])
  }

  const unlinkProfile = () => {
    setLinkedProfile(null)
    setHandicapSourceMode('manual')
    setLeagueHandicaps([])
    setHandicap('')
  }

  const handleHandicapSourceChange = (mode) => {
    setHandicapSourceMode(mode)
    if (mode === 'profile') {
      setHandicap(linkedProfile?.handicap_index != null ? String(linkedProfile.handicap_index) : '')
    } else if (mode === 'none') {
      setHandicap('')
    } else if (mode.startsWith('league:')) {
      const leagueSourceId = mode.replace('league:', '')
      const found = leagueHandicaps.find(s => s.sourceId === leagueSourceId)
      if (found) setHandicap(String(found.handicap))
    }
    // 'manual' — keep current value, let user type
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('Please enter a player name')
      return
    }

    // Prevent linking a profile that's already in the roster
    if (linkedProfile) {
      const existingIds = new Set(
        (existingPlayers || []).filter(p => p.profileId || p.profile_id).map(p => p.profileId || p.profile_id)
      )
      if (existingIds.has(linkedProfile.id)) {
        alert('This profile is already linked to another player in the roster.')
        return
      }
    }

    const resolvedHandicap = handicap ? parseFloat(handicap) : null
    let resolvedSource = null
    if (resolvedHandicap !== null && linkedProfile) {
      if (handicapSourceMode === 'profile') resolvedSource = 'profile'
      else if (handicapSourceMode.startsWith('league:')) resolvedSource = handicapSourceMode
      else resolvedSource = 'manual'
    } else if (resolvedHandicap !== null) {
      resolvedSource = 'manual'
    }

    onAdd({
      id: linkedProfile ? linkedProfile.id : Date.now(),
      name: name.trim(),
      skillRating: parseFloat(skillRating) || 5,
      handicap: resolvedHandicap,
      handicapSource: resolvedSource,
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
      isActive: true,
      ...(linkedProfile ? { profileId: linkedProfile.id } : {})
    })
  }

  return (
    <div style={{
      background: 'var(--color-surface-sunken)',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Add New Player</h3>
      <form onSubmit={handleSubmit}>
        {/* League member suggestions */}
        {!linkedProfile && memberSuggestions.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '6px', display: 'block' }}>League Members</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {memberSuggestions.map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => selectProfile(member)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '20px',
                    background: 'var(--color-surface)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-success-light)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
                >
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                  ) : (
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                      {member.display_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                  {member.display_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Profile search section */}
        <div style={{ marginBottom: '15px' }}>
          {linkedProfile ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              background: 'var(--color-success-light)',
              border: '1px solid var(--color-success-border)',
              borderRadius: '8px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Linked to {linkedProfile.display_name}</span>
              <span style={{
                fontSize: '11px',
                color: 'var(--color-success)',
                background: 'var(--color-surface)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>App User</span>
              <button
                type="button"
                onClick={unlinkProfile}
                style={{
                  marginLeft: 'auto',
                  padding: '4px 10px',
                  fontSize: '12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  background: 'var(--color-surface)',
                  cursor: 'pointer'
                }}
              >Unlink</button>
            </div>
          ) : (
            <div className="input-group" style={{ marginBottom: '0' }}>
              <label>Search for existing player</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
              />
              {searching && (
                <div style={{ padding: '8px', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>Searching...</div>
              )}
              {searchResults.length > 0 && (
                <div style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  marginTop: '4px',
                  overflow: 'hidden'
                }}>
                  {searchResults.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => selectProfile(user)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        border: 'none',
                        borderBottom: '1px solid var(--color-border-light)',
                        background: 'var(--color-surface)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '14px'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-surface-sunken)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
                    >
                      <span style={{ fontWeight: '600' }}>{user.display_name}</span>
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        color: 'var(--color-success)',
                        background: 'var(--color-success-light)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>App User</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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
            <label>Starting Handicap</label>
            {linkedProfile ? (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                  {linkedProfile.handicap_index != null && (
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer', padding: '8px 10px', background: handicapSourceMode === 'profile' ? 'var(--color-success-light)' : 'var(--color-surface)', border: '1px solid', borderColor: handicapSourceMode === 'profile' ? 'var(--color-success-border)' : 'var(--color-border)', borderRadius: '8px' }}>
                      <input
                        type="radio"
                        name="handicapSource"
                        checked={handicapSourceMode === 'profile'}
                        onChange={() => handleHandicapSourceChange('profile')}
                        style={{ marginTop: '2px', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '600' }}>{Number(linkedProfile.handicap_index).toFixed(1)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>Profile handicap</div>
                      </div>
                    </label>
                  )}
                  {loadingHandicaps && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', padding: '4px 0' }}>Loading league handicaps...</div>
                  )}
                  {!loadingHandicaps && leagueHandicaps.map(source => (
                    <label key={source.sourceId} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer', padding: '8px 10px', background: handicapSourceMode === `league:${source.sourceId}` ? 'var(--color-success-light)' : 'var(--color-surface)', border: '1px solid', borderColor: handicapSourceMode === `league:${source.sourceId}` ? 'var(--color-success-border)' : 'var(--color-border)', borderRadius: '8px' }}>
                      <input
                        type="radio"
                        name="handicapSource"
                        checked={handicapSourceMode === `league:${source.sourceId}`}
                        onChange={() => handleHandicapSourceChange(`league:${source.sourceId}`)}
                        style={{ marginTop: '2px', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '600' }}>{source.handicap.toFixed(1)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {source.sourceName} {source.type === 'calculated' ? `(${source.roundCount} rds)` : '(stored)'}
                        </div>
                      </div>
                    </label>
                  ))}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer', padding: '8px 10px', background: handicapSourceMode === 'manual' ? 'var(--color-success-light)' : 'var(--color-surface)', border: '1px solid', borderColor: handicapSourceMode === 'manual' ? 'var(--color-success-border)' : 'var(--color-border)', borderRadius: '8px' }}>
                    <input
                      type="radio"
                      name="handicapSource"
                      checked={handicapSourceMode === 'manual'}
                      onChange={() => handleHandicapSourceChange('manual')}
                      style={{ marginTop: '2px', flexShrink: 0 }}
                    />
                    <span>Enter Manually</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer', padding: '8px 10px', background: handicapSourceMode === 'none' ? 'var(--color-success-light)' : 'var(--color-surface)', border: '1px solid', borderColor: handicapSourceMode === 'none' ? 'var(--color-success-border)' : 'var(--color-border)', borderRadius: '8px' }}>
                    <input
                      type="radio"
                      name="handicapSource"
                      checked={handicapSourceMode === 'none'}
                      onChange={() => handleHandicapSourceChange('none')}
                      style={{ marginTop: '2px', flexShrink: 0 }}
                    />
                    <span>None</span>
                  </label>
                </div>
                {handicapSourceMode === 'manual' && (
                  <input
                    type="number"
                    value={handicap}
                    onChange={(e) => setHandicap(e.target.value)}
                    placeholder="e.g. 18"
                    min="0"
                    max="54"
                    step="0.1"
                  />
                )}
                {handicapSourceMode !== 'manual' && handicapSourceMode !== 'none' && handicap && (
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '4px 0' }}>
                    Starting at: <strong>{parseFloat(handicap).toFixed(1)}</strong>
                  </div>
                )}
                {handicapFetchFailed && (
                  <div style={{ fontSize: '12px', color: 'var(--color-skins-dark)', padding: '4px 0' }}>
                    Could not load league handicaps.
                  </div>
                )}
              </div>
            ) : (
              <input
                type="number"
                value={handicap}
                onChange={(e) => setHandicap(e.target.value)}
                placeholder="e.g. 18"
                min="0"
                max="54"
                step="0.1"
              />
            )}
          </div>
          <div className="input-group" style={{ marginBottom: '0' }}>
            <label>Default Tee</label>
            <select
              value={defaultTee}
              onChange={(e) => setDefaultTee(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
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
  const [ghinIndex, setGhinIndex] = useState(player.ghinIndex?.toString() || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePin, setDeletePin] = useState('')
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkScores, setBulkScores] = useState('')
  const [bulkCourseRating, setBulkCourseRating] = useState('72')
  const [bulkSlopeRating, setBulkSlopeRating] = useState('113')
  const [bulkImportResult, setBulkImportResult] = useState(null)
  const [bulkImportAsLeague, setBulkImportAsLeague] = useState(false)

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
      ghinIndex: ghinIndex ? parseFloat(ghinIndex) : null,
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

  const handleBulkImport = () => {
    const lines = bulkScores.trim().split('\n').filter(l => l.trim())
    if (lines.length === 0) return

    const courseRating = parseFloat(bulkCourseRating) || 72
    const slopeRating = parseFloat(bulkSlopeRating) || 113
    const today = new Date()
    const newRounds = []

    lines.forEach((line, i) => {
      const parts = line.trim().split(',')
      const score = parseInt(parts[0])
      if (!score || score <= 0) return

      let date
      if (parts[1] && parts[1].trim().match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = parts[1].trim()
      } else {
        const d = new Date(today)
        d.setDate(d.getDate() - (lines.length - i))
        date = d.toISOString().split('T')[0]
      }

      newRounds.push({
        id: `import_${Date.now()}_${i}`,
        date,
        courseName: 'Historical',
        courseRating,
        slopeRating,
        score
      })
    })

    if (newRounds.length === 0) {
      setBulkImportResult('No valid scores found')
      return
    }

    let updatedPlayer
    if (bulkImportAsLeague) {
      // Save as league rounds (scoreHistory) — counts for league handicap scope
      const leagueEntries = newRounds.map(r => ({
        id: r.id,
        date: r.date,
        total: r.score,
        totalScore: r.score,
        frontNine: null,
        backNine: null,
        frontNineScore: null,
        backNineScore: null,
        scores: {},
        breakdown: null,
        isComplete: true,
        holesCompleted: 18,
        tee: defaultTee || 'blue',
        holesPlayed: 18,
        startingHole: 1,
        importedRound: true,
        courseRating: r.courseRating,
        slopeRating: r.slopeRating
      }))
      const updatedScoreHistory = [...(player.scoreHistory || []), ...leagueEntries]
      updatedPlayer = recalculatePlayerHandicaps(
        { ...player, scoreHistory: updatedScoreHistory },
        leagueId,
        courseTees
      )
      updatedPlayer.scoreHistory = updatedScoreHistory
    } else {
      // Save as external rounds (original behavior)
      const updatedExternalRounds = [...(player.externalRounds || []), ...newRounds]
      updatedPlayer = recalculatePlayerHandicaps(
        { ...player, externalRounds: updatedExternalRounds },
        leagueId,
        courseTees
      )
    }

    onSave({
      ...updatedPlayer,
      name: name.trim(),
      skillRating: parseFloat(skillRating) || 5,
      handicap: updatedPlayer.handicap,
      ghinIndex: ghinIndex ? parseFloat(ghinIndex) : null,
      defaultTee,
      phone: phone.trim(),
      email: email.trim(),
      emergencyName: emergencyName.trim(),
      emergencyPhone: emergencyPhone.trim()
    })

    setBulkImportResult(`Imported ${newRounds.length} rounds as ${bulkImportAsLeague ? 'league' : 'external'} rounds`)
    setBulkScores('')
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
              <p style={{ marginBottom: '20px', color: 'var(--color-text-secondary)' }}>
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
                background: 'var(--color-success-light)',
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
                  background: 'var(--color-surface-sunken)',
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
                      <span style={{ color: 'var(--color-danger)' }}>
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
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
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
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
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
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
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
                {settings.allowGhinOverride && (
                  <div className="input-group" style={{ marginBottom: '0' }}>
                    <label>GHIN Index Override</label>
                    <input
                      type="number"
                      value={ghinIndex}
                      onChange={(e) => setGhinIndex(e.target.value)}
                      placeholder="Official GHIN index"
                      min="-5"
                      max="54"
                      step="0.1"
                    />
                  </div>
                )}
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label>Default Tee</label>
                  <select
                    value={defaultTee}
                    onChange={(e) => setDefaultTee(e.target.value)}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}
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

              {/* Linked Profile Info (admin only) */}
              {isAdmin && (player.profileId || player.profile_id) && (
                <div style={{
                  background: 'var(--color-surface-sunken)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginTop: '15px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '12px' }}>
                    <span style={{ fontWeight: '600' }}>Linked Profile: </span>
                    <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'monospace', fontSize: '11px' }}>
                      {(player.profileId || player.profile_id).slice(0, 8)}...
                    </span>
                  </div>
                  <button
                    className="btn btn-small btn-danger"
                    onClick={() => {
                      if (confirm(`Unlink ${player.name} from their profile? This won't delete the profile, but the player will no longer be associated with it.`)) {
                        onSave({
                          ...player,
                          name: name.trim(),
                          skillRating: parseFloat(skillRating) || 5,
                          handicap: handicap ? parseFloat(handicap) : null,
                          handicapSource: handicap ? 'manual' : player.handicapSource,
                          ghinIndex: ghinIndex ? parseFloat(ghinIndex) : null,
                          defaultTee,
                          phone: phone.trim(),
                          email: email.trim(),
                          emergencyName: emergencyName.trim(),
                          emergencyPhone: emergencyPhone.trim(),
                          profileId: null,
                          profile_id: null
                        })
                      }
                    }}
                    style={{ fontSize: '11px' }}
                  >
                    Unlink
                  </button>
                </div>
              )}

              {/* Bulk Import Scores (admin only) */}
              {isAdmin && (
                <div style={{ marginTop: '15px' }}>
                  <button
                    onClick={() => setShowBulkImport(!showBulkImport)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-info)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      padding: '4px 0'
                    }}
                  >
                    {showBulkImport ? 'Hide' : 'Import Historical Scores'}
                  </button>
                  {showBulkImport && (
                    <div style={{
                      background: 'var(--color-surface-sunken)',
                      padding: '12px',
                      borderRadius: '8px',
                      marginTop: '8px'
                    }}>
                      {/* Quick-fill tee selector */}
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
                          Course Tees
                        </label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[
                            { key: 'gold', label: 'Gold', color: '#DAA520' },
                            { key: 'blue', label: 'Blue', color: 'var(--color-info)' },
                            { key: 'red', label: 'Red', color: 'var(--color-danger)' },
                            { key: 'custom', label: 'Other Course', color: 'var(--color-text-secondary)' }
                          ].map(tee => {
                            const ratings = GUNPOWDER_SCORECARD.ratings[tee.key]
                            const isSelected = tee.key === 'custom'
                              ? !Object.keys(GUNPOWDER_SCORECARD.ratings).some(k => {
                                  const r = GUNPOWDER_SCORECARD.ratings[k]
                                  return String(r.rating) === bulkCourseRating && String(r.slope) === bulkSlopeRating
                                })
                              : String(ratings?.rating) === bulkCourseRating && String(ratings?.slope) === bulkSlopeRating
                            return (
                              <button
                                key={tee.key}
                                onClick={() => {
                                  if (ratings) {
                                    setBulkCourseRating(String(ratings.rating))
                                    setBulkSlopeRating(String(ratings.slope))
                                  } else {
                                    setBulkCourseRating('72')
                                    setBulkSlopeRating('113')
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: isSelected ? `2px solid ${tee.color}` : '1px solid var(--color-border)',
                                  background: isSelected ? 'var(--color-surface)' : 'var(--color-surface-sunken)',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: isSelected ? '700' : '500',
                                  color: isSelected ? tee.color : 'var(--color-text-secondary)',
                                  textAlign: 'center'
                                }}
                              >
                                {tee.label}
                                {ratings && <div style={{ fontSize: '9px', opacity: 0.8 }}>{ratings.rating}/{ratings.slope}</div>}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
                            Course Rating
                          </label>
                          <input
                            type="number"
                            value={bulkCourseRating}
                            onChange={(e) => setBulkCourseRating(e.target.value)}
                            step="0.1"
                            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>
                            Slope Rating
                          </label>
                          <input
                            type="number"
                            value={bulkSlopeRating}
                            onChange={(e) => setBulkSlopeRating(e.target.value)}
                            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px' }}
                          />
                        </div>
                      </div>
                      {/* League round toggle */}
                      <div style={{
                        display: 'flex',
                        gap: '6px',
                        marginBottom: '10px',
                        background: 'var(--color-surface)',
                        borderRadius: '8px',
                        padding: '3px',
                        border: '1px solid var(--color-border)'
                      }}>
                        <button
                          onClick={() => setBulkImportAsLeague(false)}
                          style={{
                            flex: 1,
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: !bulkImportAsLeague ? 'var(--color-primary)' : 'transparent',
                            color: !bulkImportAsLeague ? 'white' : 'var(--color-text-secondary)'
                          }}
                        >
                          External Rounds
                        </button>
                        <button
                          onClick={() => setBulkImportAsLeague(true)}
                          style={{
                            flex: 1,
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: bulkImportAsLeague ? 'var(--color-primary)' : 'transparent',
                            color: bulkImportAsLeague ? 'white' : 'var(--color-text-secondary)'
                          }}
                        >
                          League Rounds
                        </button>
                      </div>
                      {bulkImportAsLeague && (
                        <p style={{ fontSize: '11px', color: 'var(--color-skins)', marginBottom: '8px', fontWeight: '500' }}>
                          League rounds count toward the league handicap and won't be overwritten by auto-calculation.
                        </p>
                      )}
                      <textarea
                        value={bulkScores}
                        onChange={(e) => setBulkScores(e.target.value)}
                        placeholder={"One score per line:\n85\n92\n88,2024-06-15\n91,2024-07-20"}
                        rows={5}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '4px',
                          border: '1px solid var(--color-border)',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          resize: 'vertical',
                          marginBottom: '8px'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          className="btn btn-small btn-primary"
                          onClick={handleBulkImport}
                          disabled={!bulkScores.trim()}
                        >
                          Import
                        </button>
                        {bulkImportResult && (
                          <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: '500' }}>
                            {bulkImportResult}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '6px' }}>
                        Format: score or score,YYYY-MM-DD. Scores without dates get sequential past dates.
                      </p>
                    </div>
                  )}
                </div>
              )}

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
    border: '1px solid var(--color-border-dark)',
    padding: '4px 2px',
    textAlign: 'center',
    fontSize: '11px',
    minWidth: '28px'
  }

  const headerCellStyle = {
    ...cellStyle,
    background: 'var(--color-primary-dark)',
    color: 'white',
    fontWeight: 'bold'
  }

  const getScoreStyle = (score, par, isEditMode) => {
    const baseStyle = { ...cellStyle, fontWeight: 'bold', cursor: isEditMode ? 'pointer' : 'default' }
    if (!score || score === 'X') return baseStyle
    const diff = parseInt(score) - par
    let bg = 'white'
    let border = cellStyle.border
    if (diff <= -2) { bg = 'var(--color-accent-gold)'; border = '2px solid var(--color-accent-gold)' }
    else if (diff === -1) { bg = 'var(--color-success-light)'; border = '1px solid var(--color-border-dark)' }
    else if (diff === 0) { bg = 'var(--color-success-light)' }
    else if (diff === 1) { bg = 'var(--color-skins-light)' }
    else if (diff >= 2) { bg = 'var(--color-danger-light)' }
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
                  background: 'var(--color-info)',
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
                  background: 'var(--color-danger)',
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
              background: 'var(--color-warning-light)',
              border: '2px solid var(--color-warning)',
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
            <div style={{ background: 'var(--color-success-light)', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
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
            <div style={{ background: 'var(--color-skins-light)', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }}>
              <strong>Greenies Won:</strong> {round.greeniesWon.map(h => `Hole ${h}`).join(', ')}
            </div>
          )}

          {/* Traditional Scorecard Grid */}
          {round.scores && (
            <div style={{
              background: 'var(--color-surface)',
              border: '2px solid var(--color-primary-dark)',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
              {/* Course Header */}
              <div style={{
                background: 'var(--color-primary-dark)',
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
                      <th style={{ ...headerCellStyle, background: 'var(--color-primary-dark)' }}>OUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Blue Tees */}
                    <tr>
                      <td style={{ ...cellStyle, background: 'var(--color-info-light)', fontWeight: '600', fontSize: '10px' }}>BLUE</td>
                      {GUNPOWDER_SCORECARD.front9.map(h => (
                        <td key={h.hole} style={{ ...cellStyle, background: 'var(--color-info-light)', fontSize: '10px' }}>{h.blue}</td>
                      ))}
                      <td style={{ ...cellStyle, background: 'var(--color-info-light)', fontWeight: '600', fontSize: '10px' }}>
                        {GUNPOWDER_SCORECARD.front9.reduce((s, h) => s + h.blue, 0)}
                      </td>
                    </tr>
                    {/* Handicap */}
                    <tr>
                      <td style={{ ...cellStyle, background: 'var(--color-surface-sunken)', fontWeight: '600', fontSize: '10px' }}>HCP</td>
                      {GUNPOWDER_SCORECARD.front9.map(h => (
                        <td key={h.hole} style={{ ...cellStyle, background: 'var(--color-surface-sunken)', fontSize: '10px' }}>{h.hcp}</td>
                      ))}
                      <td style={{ ...cellStyle, background: 'var(--color-surface-sunken)' }}></td>
                    </tr>
                    {/* Par */}
                    <tr>
                      <td style={{ ...cellStyle, background: 'var(--color-warning-light)', fontWeight: '600' }}>PAR</td>
                      {GUNPOWDER_SCORECARD.front9.map(h => (
                        <td key={h.hole} style={{ ...cellStyle, background: 'var(--color-warning-light)', fontWeight: '600' }}>{h.par}</td>
                      ))}
                      <td style={{ ...cellStyle, background: 'var(--color-warning-light)', fontWeight: 'bold' }}>{frontPar}</td>
                    </tr>
                    {/* Player Score */}
                    <tr>
                      <td style={{ ...cellStyle, fontWeight: '600', background: 'var(--color-border-light)' }}>SCORE</td>
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
                      <td style={{ ...cellStyle, fontWeight: 'bold', background: 'var(--color-success-light)', fontSize: '13px' }}>
                        {isEditing ? calcFront : front || '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Back 9 */}
              <div style={{ overflowX: 'auto', borderTop: '2px solid var(--color-primary-dark)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...headerCellStyle, minWidth: '50px' }}>HOLE</th>
                      {[10,11,12,13,14,15,16,17,18].map(h => (
                        <th key={h} style={headerCellStyle}>{h}</th>
                      ))}
                      <th style={{ ...headerCellStyle, background: 'var(--color-primary-dark)' }}>IN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Blue Tees */}
                    <tr>
                      <td style={{ ...cellStyle, background: 'var(--color-info-light)', fontWeight: '600', fontSize: '10px' }}>BLUE</td>
                      {GUNPOWDER_SCORECARD.back9.map(h => (
                        <td key={h.hole} style={{ ...cellStyle, background: 'var(--color-info-light)', fontSize: '10px' }}>{h.blue}</td>
                      ))}
                      <td style={{ ...cellStyle, background: 'var(--color-info-light)', fontWeight: '600', fontSize: '10px' }}>
                        {GUNPOWDER_SCORECARD.back9.reduce((s, h) => s + h.blue, 0)}
                      </td>
                    </tr>
                    {/* Handicap */}
                    <tr>
                      <td style={{ ...cellStyle, background: 'var(--color-surface-sunken)', fontWeight: '600', fontSize: '10px' }}>HCP</td>
                      {GUNPOWDER_SCORECARD.back9.map(h => (
                        <td key={h.hole} style={{ ...cellStyle, background: 'var(--color-surface-sunken)', fontSize: '10px' }}>{h.hcp}</td>
                      ))}
                      <td style={{ ...cellStyle, background: 'var(--color-surface-sunken)' }}></td>
                    </tr>
                    {/* Par */}
                    <tr>
                      <td style={{ ...cellStyle, background: 'var(--color-warning-light)', fontWeight: '600' }}>PAR</td>
                      {GUNPOWDER_SCORECARD.back9.map(h => (
                        <td key={h.hole} style={{ ...cellStyle, background: 'var(--color-warning-light)', fontWeight: '600' }}>{h.par}</td>
                      ))}
                      <td style={{ ...cellStyle, background: 'var(--color-warning-light)', fontWeight: 'bold' }}>{backPar}</td>
                    </tr>
                    {/* Player Score */}
                    <tr>
                      <td style={{ ...cellStyle, fontWeight: '600', background: 'var(--color-border-light)' }}>SCORE</td>
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
                      <td style={{ ...cellStyle, fontWeight: 'bold', background: 'var(--color-skins-light)', fontSize: '13px' }}>
                        {isEditing ? calcBack : back || '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals Footer */}
              <div style={{
                background: 'var(--color-primary-dark)',
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
                      color: (isEditing ? calcTotal : total) - totalPar < 0 ? 'var(--color-success-light)' : (isEditing ? calcTotal : total) - totalPar > 0 ? 'var(--color-danger-light)' : 'white'
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
              background: 'var(--color-surface-sunken)',
              borderRadius: '6px',
              fontSize: '11px',
              display: 'flex',
              justifyContent: 'center',
              gap: '15px',
              flexWrap: 'wrap'
            }}>
              <span><span style={{ display: 'inline-block', width: '14px', height: '14px', background: 'var(--color-accent-gold)', border: '2px solid var(--color-accent-gold)', borderRadius: '2px', verticalAlign: 'middle', marginRight: '4px' }}></span> Eagle+</span>
              <span><span style={{ display: 'inline-block', width: '14px', height: '14px', background: 'var(--color-success-light)', border: '1px solid var(--color-border-dark)', borderRadius: '2px', verticalAlign: 'middle', marginRight: '4px' }}></span> Birdie</span>
              <span><span style={{ display: 'inline-block', width: '14px', height: '14px', background: 'var(--color-success-light)', border: '1px solid var(--color-border-dark)', borderRadius: '2px', verticalAlign: 'middle', marginRight: '4px' }}></span> Par</span>
              <span><span style={{ display: 'inline-block', width: '14px', height: '14px', background: 'var(--color-skins-light)', border: '1px solid var(--color-border-dark)', borderRadius: '2px', verticalAlign: 'middle', marginRight: '4px' }}></span> Bogey</span>
              <span><span style={{ display: 'inline-block', width: '14px', height: '14px', background: 'var(--color-danger-light)', border: '1px solid var(--color-border-dark)', borderRadius: '2px', verticalAlign: 'middle', marginRight: '4px' }}></span> Double+</span>
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
            background: 'var(--color-surface)',
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
                border: '2px solid var(--color-border)',
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
                  background: 'var(--color-surface-sunken)',
                  border: '1px solid var(--color-border)',
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
                  background: 'var(--color-success)',
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
            background: 'var(--color-surface)',
            padding: '20px',
            borderRadius: '15px',
            width: '90%',
            maxWidth: '320px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '2px solid var(--color-border)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--color-success)' }}>Hole {activeKeypad}</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Par {getHoleInfo(activeKeypad)?.par}</div>
            </div>

            <div style={{
              background: 'var(--color-surface-sunken)',
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
              border: '2px solid var(--color-border)'
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
                    background: 'var(--color-surface-sunken)',
                    border: '2px solid var(--color-border)',
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
                  background: 'var(--color-danger)',
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
                  background: 'var(--color-surface-sunken)',
                  border: '2px solid var(--color-border)',
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
                  background: 'var(--color-surface-sunken)',
                  border: '2px solid var(--color-border)',
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
                  background: 'var(--color-surface-sunken)',
                  border: '2px solid var(--color-border)',
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
                  background: 'var(--color-success)',
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
              <button onClick={() => setStatFilter('all')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: statFilter === 'all' ? 'var(--color-success)' : 'var(--color-surface)', color: statFilter === 'all' ? 'white' : 'var(--color-text-primary)', cursor: 'pointer', fontWeight: statFilter === 'all' ? '600' : 'normal', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>All Time</button>
              <button onClick={() => setStatFilter('year')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: statFilter === 'year' ? 'var(--color-info)' : 'var(--color-surface)', color: statFilter === 'year' ? 'white' : 'var(--color-text-primary)', cursor: 'pointer', fontWeight: statFilter === 'year' ? '600' : 'normal', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>By Year</button>
              <button onClick={() => setStatFilter('lastX')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: statFilter === 'lastX' ? 'var(--color-accent-purple)' : 'var(--color-surface)', color: statFilter === 'lastX' ? 'white' : 'var(--color-text-primary)', cursor: 'pointer', fontWeight: statFilter === 'lastX' ? '600' : 'normal', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>Last X</button>
              <button onClick={() => setStatFilter('range')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: statFilter === 'range' ? 'var(--color-skins-dark)' : 'var(--color-surface)', color: statFilter === 'range' ? 'white' : 'var(--color-text-primary)', cursor: 'pointer', fontWeight: statFilter === 'range' ? '600' : 'normal', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>Date Range</button>
            </div>

            {/* Filter options */}
            {statFilter === 'year' && (
              <select value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))} style={{ padding: '8px', borderRadius: '6px', border: '2px solid var(--color-border)' }}>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            {statFilter === 'lastX' && (
              <select value={filterLastX} onChange={(e) => setFilterLastX(parseInt(e.target.value))} style={{ padding: '8px', borderRadius: '6px', border: '2px solid var(--color-border)' }}>
                {[3, 5, 10, 15, 20].map(n => <option key={n} value={n}>Last {n} rounds</option>)}
              </select>
            )}
            {statFilter === 'range' && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '2px solid var(--color-border)' }} />
                <span>to</span>
                <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '2px solid var(--color-border)' }} />
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
                  <div className="stat-card" style={{ background: 'var(--color-success)' }}>
                    <div className="stat-label">Best Round</div>
                    <div className="stat-value">{basicStats.bestTotal}</div>
                  </div>
                  <div className="stat-card" style={{ background: 'var(--color-danger)' }}>
                    <div className="stat-label">Worst Round</div>
                    <div className="stat-value">{basicStats.worstTotal}</div>
                  </div>
                </div>
              )}

              {/* Score breakdown */}
              <div style={{ background: 'var(--color-accent-purple)', color: 'white', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
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
                  <div style={{ background: 'var(--color-success-light)', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Avg Front 9</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-success)' }}>
                      {basicStats.avgFront > 0 ? basicStats.avgFront.toFixed(1) : '-'}
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-skins-light)', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Avg Back 9</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-skins-dark)' }}>
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
                    background: leagueNet >= 0 ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    border: `2px solid ${leagueNet >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}`
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '12px', color: 'var(--color-text-primary)' }}>
                      League Money Stats ({moneyTotals.rounds} rounds)
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Paid</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-danger)' }}>
                          ${moneyTotals.leaguePaid.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Won</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-success)' }}>
                          ${moneyTotals.leagueWon.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Net</div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: leagueNet >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {leagueNet >= 0 ? '+' : ''}${leagueNet.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Category breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', fontSize: '10px' }}>
                      {(moneyTotals.greeniesPaid > 0 || moneyTotals.greeniesWon > 0) && (
                        <div style={{ background: 'var(--color-surface)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                          <div style={{ color: 'var(--color-text-secondary)' }}>Greenies</div>
                          <div style={{ fontWeight: '600', color: (moneyTotals.greeniesWon - moneyTotals.greeniesPaid) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {(moneyTotals.greeniesWon - moneyTotals.greeniesPaid) >= 0 ? '+' : ''}${(moneyTotals.greeniesWon - moneyTotals.greeniesPaid).toFixed(2)}
                          </div>
                        </div>
                      )}
                      {(moneyTotals.teamPaid > 0 || moneyTotals.teamWon > 0) && (
                        <div style={{ background: 'var(--color-surface)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                          <div style={{ color: 'var(--color-text-secondary)' }}>Team</div>
                          <div style={{ fontWeight: '600', color: (moneyTotals.teamWon - moneyTotals.teamPaid) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {(moneyTotals.teamWon - moneyTotals.teamPaid) >= 0 ? '+' : ''}${(moneyTotals.teamWon - moneyTotals.teamPaid).toFixed(2)}
                          </div>
                        </div>
                      )}
                      {moneyTotals.hioPaid > 0 && (
                        <div style={{ background: 'var(--color-surface)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                          <div style={{ color: 'var(--color-text-secondary)' }}>HIO Pot</div>
                          <div style={{ fontWeight: '600', color: 'var(--color-danger)' }}>-${moneyTotals.hioPaid.toFixed(2)}</div>
                        </div>
                      )}
                    </div>

                    {moneyTotals.rounds > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                        Avg per round: {leagueNet >= 0 ? '+' : ''}${(leagueNet / moneyTotals.rounds).toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Skins Stats (separate) */}
                  {moneyTotals.skinsPaid > 0 && (
                    <div style={{ background: 'var(--color-info-light)', padding: '12px', borderRadius: '8px', border: '2px solid var(--color-info)' }}>
                      <div style={{ fontWeight: '600', marginBottom: '10px', color: 'var(--color-info-dark)' }}>Skins Stats (separate game)</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '11px' }}>
                          Entry: ${moneyTotals.skinsPaid.toFixed(2)} | Won: ${moneyTotals.skinsWon.toFixed(2)} ({moneyTotals.skinsCount} skins)
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: skinsNet >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {skinsNet >= 0 ? '+' : ''}${skinsNet.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Handicap Summary */}
              <div style={{
                background: 'var(--color-success)',
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
                    background: 'var(--color-surface-sunken)',
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
                          background: idx % 2 === 0 ? 'var(--color-surface-sunken)' : 'var(--color-info-light)',
                          borderRadius: '6px',
                          marginBottom: '4px',
                          fontSize: '13px'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600' }}>{round.courseName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
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
                                background: 'var(--color-danger)',
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
                  <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '20px' }}>No rounds found for this filter</p>
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
                          background: round.isComplete === false ? 'var(--color-skins-light)' : (idx % 2 === 0 ? 'var(--color-surface-sunken)' : 'var(--color-surface)'),
                          borderRadius: '6px',
                          marginBottom: '4px',
                          cursor: 'pointer',
                          border: round.isComplete === false ? '2px solid var(--color-warning)' : '2px solid transparent',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-info-light)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = round.isComplete === false ? 'var(--color-skins-light)' : (idx % 2 === 0 ? 'var(--color-surface-sunken)' : 'var(--color-surface)')}
                      >
                        <div>
                          <span style={{ fontWeight: '600' }}>
                            {new Date(round.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          {round.isComplete === false && (
                            <span style={{ marginLeft: '8px', background: 'var(--color-warning)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                              INCOMPLETE
                            </span>
                          )}
                          {round.greeniesWon && round.greeniesWon.length > 0 && (
                            <span style={{ marginLeft: '8px', color: 'var(--color-success)', fontSize: '12px' }}>
                              +{round.greeniesWon.length} greenie{round.greeniesWon.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span>
                            <strong style={{ fontSize: '16px' }}>{total}</strong>
                            <span style={{ color: 'var(--color-text-secondary)', marginLeft: '8px', fontSize: '12px' }}>
                              ({front} + {back})
                            </span>
                          </span>
                          <span style={{ color: 'var(--color-info)', fontSize: '12px' }}>View</span>
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

function PlayerProfileCard({ player, handicapScope, leagueId, courseTees, handicapSettings, onViewStats, onEdit }) {
  const handicaps = getAllHandicaps(player, leagueId, courseTees, handicapSettings?.maxHandicap || 54, handicapSettings)
  const effectiveHandicap = getEffectiveHandicap(player, handicapSettings, leagueId, courseTees)

  const getCalculatedHandicap = () => {
    switch (handicapScope) {
      case 'league': return handicaps.leagueHandicap
      case 'gunpowder': return handicaps.gunpowderHandicap
      case 'true':
      default: return handicaps.trueHandicap
    }
  }

  const activeHandicap = effectiveHandicap
  const calculatedForScope = getCalculatedHandicap()
  const settings = { ...DEFAULT_HANDICAP_SETTINGS, ...handicapSettings }
  const isUsingGhin = settings.allowGhinOverride && player.ghinIndex != null && settings.handicapScope === 'true' && effectiveHandicap === player.ghinIndex
  const isUsingManual = !isUsingGhin && effectiveHandicap !== calculatedForScope && effectiveHandicap === player.handicap
  const playerTee = player.defaultTee || 'blue'
  const courseHandicap = getCourseHandicapForTee(activeHandicap, playerTee, courseTees)

  const sourceLabel = isUsingGhin ? 'GHIN' : isUsingManual ? 'Manual' : 'Calculated'
  const sourceBg = isUsingGhin ? 'var(--color-info-dark)' : isUsingManual ? 'var(--color-skins-dark)' : 'var(--color-success)'

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: '12px',
      padding: '20px',
      border: '2px solid var(--color-border)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      {/* Name + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '20px' }}>{player.name}</h3>
        {player.isActive === false && (
          <span style={{
            background: 'var(--color-danger)',
            color: 'white',
            padding: '3px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600'
          }}>
            INACTIVE
          </span>
        )}
        {player.capApplied && (
          <span
            title={`Raw: ${formatHandicap(player.rawHandicap)} | Low Index: ${formatHandicap(player.lowIndex)}`}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              background: 'var(--color-danger)',
              color: 'white',
              fontWeight: '700',
              cursor: 'help'
            }}
          >
            CAP
          </span>
        )}
      </div>

      {/* Main stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          background: sourceBg,
          color: 'white',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>Handicap Index</div>
          <div style={{ fontSize: '22px', fontWeight: '700' }}>{formatHandicap(activeHandicap)}</div>
          <div style={{ fontSize: '10px', opacity: 0.8 }}>{sourceLabel}</div>
        </div>
        <div style={{
          background: 'var(--color-info)',
          color: 'white',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>Course HCP</div>
          <div style={{ fontSize: '22px', fontWeight: '700' }}>{formatCourseHandicap(courseHandicap)}</div>
          <div style={{ fontSize: '10px', opacity: 0.8 }}>{courseTees?.[playerTee]?.name || playerTee} tees</div>
        </div>
        <div style={{
          background: 'var(--color-surface-sunken)',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Games Played</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--color-text-primary)' }}>{player.gamesPlayed || 0}</div>
        </div>
        {player.avgTotal > 0 && (
          <div style={{
            background: 'var(--color-surface-sunken)',
            padding: '12px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Avg Score</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--color-text-primary)' }}>{player.avgTotal.toFixed(1)}</div>
          </div>
        )}
      </div>

      {/* Three scope handicaps */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'true', label: 'True', value: handicaps.trueHandicap },
          { key: 'league', label: 'League', value: handicaps.leagueHandicap },
          { key: 'gunpowder', label: 'Gunpowder', value: handicaps.gunpowderHandicap }
        ].map(scope => (
          <span key={scope.key} style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            background: handicapScope === scope.key ? 'var(--color-success-light)' : 'var(--color-surface-sunken)',
            color: handicapScope === scope.key ? 'var(--color-success-dark)' : 'var(--color-text-tertiary)',
            border: `1px solid ${handicapScope === scope.key ? 'var(--color-success-border)' : 'var(--color-border)'}`
          }}>
            {scope.label}: {formatHandicap(scope.value)}
          </span>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          className="btn btn-primary"
          onClick={() => onViewStats(player)}
          style={{ flex: 1, minHeight: '44px' }}
        >
          View Full Stats
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => onEdit(player)}
          style={{ flex: 1, minHeight: '44px' }}
        >
          Edit
        </button>
      </div>
    </div>
  )
}

const MANAGE_PAGE_SIZE = 10

function ManagePlayersModal({ players, onClose, onEdit, onView, onToggleActive, onAddPlayer, isAdmin, handicapScope, leagueId, courseTees, handicapSettings }) {
  const [filter, setFilter] = useState('active')
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(0)

  const activeCount = players.filter(p => p.isActive !== false).length
  const inactiveCount = players.filter(p => p.isActive === false).length

  const filteredPlayers = players.filter(player => {
    if (filter === 'active') return player.isActive !== false
    if (filter === 'inactive') return player.isActive === false
    return true
  }).filter(player => {
    if (!searchQuery) return true
    return player.name.toLowerCase().includes(searchQuery.toLowerCase())
  }).sort((a, b) => a.name.localeCompare(b.name))

  const totalPages = Math.ceil(filteredPlayers.length / MANAGE_PAGE_SIZE)
  const paginatedPlayers = filteredPlayers.slice(
    currentPage * MANAGE_PAGE_SIZE,
    (currentPage + 1) * MANAGE_PAGE_SIZE
  )

  const handleAdd = (newPlayer) => {
    onAddPlayer(newPlayer)
    setShowAddForm(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h3>Manage Players</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Add player button + filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px', alignItems: 'center' }}>
            <button
              className={`btn btn-small ${filter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilter('active'); setCurrentPage(0) }}
              style={{ minHeight: '36px' }}
            >
              Active ({activeCount})
            </button>
            <button
              className={`btn btn-small ${filter === 'inactive' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilter('inactive'); setCurrentPage(0) }}
              style={{ minHeight: '36px' }}
            >
              Inactive ({inactiveCount})
            </button>
            <button
              className={`btn btn-small ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilter('all'); setCurrentPage(0) }}
              style={{ minHeight: '36px' }}
            >
              All ({players.length})
            </button>
            <div style={{ flex: 1 }} />
            {!showAddForm && (
              <button
                className="btn btn-small btn-primary"
                onClick={() => setShowAddForm(true)}
                style={{ minHeight: '36px' }}
              >
                + Add Player
              </button>
            )}
          </div>

          {/* Add player form */}
          {showAddForm && (
            <AddPlayerForm
              onAdd={handleAdd}
              onCancel={() => setShowAddForm(false)}
              courseTees={courseTees}
              existingPlayers={players}
              leagueId={leagueId}
            />
          )}

          {/* Search box */}
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0) }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-sunken)',
              fontSize: '14px',
              marginBottom: '12px',
              boxSizing: 'border-box'
            }}
          />

          {/* Player list */}
          {filteredPlayers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-tertiary)' }}>
              {searchQuery ? 'No matching players.' : (
                <>
                  {filter === 'active' && 'No active players.'}
                  {filter === 'inactive' && 'No inactive players.'}
                  {filter === 'all' && 'No players yet.'}
                </>
              )}
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '8px'
              }}>
                {paginatedPlayers.map(player => {
                  const effectiveHcp = getEffectiveHandicap(player, handicapSettings, leagueId, courseTees)
                  return (
                    <div
                      key={player.id}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        background: 'var(--color-surface-sunken)'
                      }}
                    >
                      <div style={{ marginBottom: '6px' }}>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>
                          {player.name}
                          {player.isActive === false && (
                            <span style={{
                              marginLeft: '6px',
                              background: 'var(--color-danger)',
                              color: 'white',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontSize: '10px'
                            }}>
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          HCP: {formatHandicap(effectiveHcp)} | Games: {player.gamesPlayed || 0}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-small btn-primary"
                          onClick={() => { onView(player); onClose() }}
                          style={{ minHeight: '32px', flex: 1, fontSize: '12px' }}
                        >
                          Stats
                        </button>
                        <button
                          className="btn btn-small btn-secondary"
                          onClick={() => { onEdit(player); onClose() }}
                          style={{ minHeight: '32px', flex: 1, fontSize: '12px' }}
                        >
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            className="btn btn-small"
                            onClick={() => onToggleActive(player)}
                            style={{
                              minHeight: '32px',
                              background: player.isActive === false ? 'var(--color-success)' : 'var(--color-danger)',
                              color: 'white',
                              flex: 1,
                              fontSize: '12px'
                            }}
                          >
                            {player.isActive === false ? 'Activate' : 'Deactivate'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '12px'
                }}>
                  <button
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={currentPage === 0}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      cursor: currentPage === 0 ? 'default' : 'pointer',
                      fontSize: '13px',
                      opacity: currentPage === 0 ? 0.4 : 1
                    }}
                  >
                    Prev
                  </button>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage >= totalPages - 1}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      cursor: currentPage >= totalPages - 1 ? 'default' : 'pointer',
                      fontSize: '13px',
                      opacity: currentPage >= totalPages - 1 ? 0.4 : 1
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function PlayersPage() {
  const { players, setPlayers, isAdmin, leagueSettings, handicapSettings, setHandicapSettings, courseTees, leagueId } = useLeague()
  const { profile } = useAuth()
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [viewingPlayer, setViewingPlayer] = useState(null)
  const [showManageModal, setShowManageModal] = useState(false)

  const handicapScope = handicapSettings?.handicapScope || 'true'

  // Two-way sync between league_members table and JSONB player data
  useEffect(() => {
    if (!leagueId || !players.length) return
    getLeagueMembers(leagueId).then(async (members) => {
      // Direction 1: Backfill profileIds from league_members onto JSONB players (by name match)
      let changed = false
      const updatedPlayers = players.map(player => {
        if (player.profileId || player.profile_id) return player
        const match = members.find(m =>
          m.profiles?.display_name &&
          m.profiles.display_name.toLowerCase().trim() === player.name.toLowerCase().trim()
        )
        if (match) {
          changed = true
          return { ...player, profileId: match.profile_id, profile_id: match.profile_id }
        }
        return player
      })
      if (changed) {
        console.log('[PlayersPage] Synced profileIds from league_members to player data')
        setPlayers(updatedPlayers)
      }

      // Direction 2: Add missing league_members rows for JSONB players that have profileIds
      const memberProfileIds = new Set(members.map(m => m.profile_id))
      const playersToSync = (changed ? updatedPlayers : players).filter(p => {
        const pid = p.profileId || p.profile_id
        return pid && !memberProfileIds.has(pid)
      })
      for (const p of playersToSync) {
        const pid = p.profileId || p.profile_id
        try {
          await addLeagueMember(leagueId, pid, 'player')
          console.log('[PlayersPage] Added missing league_member for:', p.name)
        } catch (e) {
          console.warn('[PlayersPage] Failed to sync league_member for:', p.name, e)
        }
      }
    }).catch(() => {})
  }, [leagueId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Find logged-in user's player
  const myPlayer = useMemo(() => {
    if (!profile?.id) return null
    return players.find(p =>
      (p.profileId === profile.id || p.profile_id === profile.id)
    ) || null
  }, [players, profile?.id])

  // All active players sorted alphabetically
  const sortedPlayers = useMemo(() =>
    [...players].filter(p => p.isActive !== false).sort((a, b) => a.name.localeCompare(b.name)),
    [players]
  )

  // Track whether user has manually changed the dropdown
  const [userHasSelected, setUserHasSelected] = useState(false)

  // Determine effective selected player: myPlayer wins unless user manually picked someone else
  const effectiveSelectedId = useMemo(() => {
    if (myPlayer && !userHasSelected) return myPlayer.id
    if (selectedPlayerId && players.find(p => p.id === selectedPlayerId)) return selectedPlayerId
    if (myPlayer) return myPlayer.id
    return sortedPlayers[0]?.id || null
  }, [myPlayer, selectedPlayerId, userHasSelected, sortedPlayers, players])

  const selectedPlayer = players.find(p => p.id === effectiveSelectedId) || null

  // Build dropdown options: active players + any selected inactive player
  const dropdownPlayers = useMemo(() => {
    const list = [...sortedPlayers]
    // If selected player is inactive, include them so they remain selectable
    if (selectedPlayer && selectedPlayer.isActive === false && !list.find(p => p.id === selectedPlayer.id)) {
      list.push(selectedPlayer)
    }
    return list
  }, [sortedPlayers, selectedPlayer])

  const handleAddPlayer = async (newPlayer) => {
    if (newPlayer.profileId) {
      newPlayer.profile_id = newPlayer.profileId
      if (leagueId) {
        try {
          await addLeagueMember(leagueId, newPlayer.profileId, 'player')
        } catch (err) {
          console.warn('Could not add league member row:', err)
        }
      }
    } else {
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
    }

    setPlayers([...players, newPlayer])
  }

  const handleEditPlayer = (updatedPlayer) => {
    setPlayers(players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p))
    setEditingPlayer(null)
  }

  const handleDeletePlayer = (playerId) => {
    setPlayers(players.filter(p => p.id !== playerId))
    setEditingPlayer(null)
    // If deleted player was selected, reset selection
    if (playerId === effectiveSelectedId) {
      setSelectedPlayerId(myPlayer?.id || sortedPlayers[0]?.id || null)
      setUserHasSelected(false)
    }
  }

  const handleToggleActive = (player) => {
    setPlayers(players.map(p => {
      if (p.id === player.id) {
        return { ...p, isActive: p.isActive === false ? true : false }
      }
      return p
    }))
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Players</h2>

      {players.length === 0 ? (
        <div className="empty-state">
          <h3>No Players Yet</h3>
          <p>Add some players to get started!</p>
          {isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => setShowManageModal(true)}
              style={{ marginTop: '10px', minHeight: '44px' }}
            >
              + Add Player
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Player selector dropdown */}
          <div style={{ marginBottom: '16px' }}>
            <select
              value={effectiveSelectedId || ''}
              onChange={(e) => { setSelectedPlayerId(e.target.value === '' ? null : isNaN(e.target.value) ? e.target.value : Number(e.target.value)); setUserHasSelected(true) }}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '8px',
                border: '2px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                minHeight: '48px'
              }}
            >
              {!effectiveSelectedId && <option value="">Select a player...</option>}
              {dropdownPlayers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.isActive === false ? ' (Inactive)' : ''}{p.id === myPlayer?.id ? ' (You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Profile card for selected player */}
          {selectedPlayer ? (
            <PlayerProfileCard
              player={selectedPlayer}
              handicapScope={handicapScope}
              leagueId={leagueId}
              courseTees={courseTees}
              handicapSettings={handicapSettings}
              onViewStats={setViewingPlayer}
              onEdit={setEditingPlayer}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-tertiary)' }}>
              Select a player to view their profile.
            </div>
          )}

          {/* Manage Players button (admin only) */}
          {isAdmin && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowManageModal(true)}
              style={{
                width: '100%',
                marginTop: '16px',
                minHeight: '44px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Manage Players ({players.length})
            </button>
          )}
        </>
      )}

      {/* Manage Players modal (admin) */}
      {showManageModal && (
        <ManagePlayersModal
          players={players}
          onClose={() => setShowManageModal(false)}
          onEdit={setEditingPlayer}
          onView={setViewingPlayer}
          onToggleActive={handleToggleActive}
          onAddPlayer={handleAddPlayer}
          isAdmin={isAdmin}
          handicapScope={handicapScope}
          leagueId={leagueId}
          courseTees={courseTees}
          handicapSettings={handicapSettings}
        />
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
