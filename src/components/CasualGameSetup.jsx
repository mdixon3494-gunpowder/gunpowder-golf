import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLeague } from '../context/LeagueContext'
import { searchProfiles } from '../lib/profileService'
import { addLeagueMember } from '../lib/leagueService'
import { supabase } from '../lib/supabase'
import { generateTeams, getTeamName } from '../utils/teamGeneration'

function CasualGameSetup({ onBack }) {
  const { profile } = useAuth()
  const { switchLeague, setSkinsMatch, setQuickSkinsMode } = useLeague()

  // Game info
  const defaultName = `Casual - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  const [gameName, setGameName] = useState(defaultName)
  const [holes, setHoles] = useState(18)
  const [courseName, setCourseName] = useState('')

  // Players
  const [gamePlayers, setGamePlayers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [guestName, setGuestName] = useState('')
  const searchTimeout = useRef(null)

  // Format
  const [format, setFormat] = useState('stroke') // 'stroke' | 'bestball' | 'matchplay' | 'skins' | 'track'
  const [teamSize, setTeamSize] = useState(2)
  const [enableGreenies, setEnableGreenies] = useState(true)

  // Format-specific settings
  const [formatSettings, setFormatSettings] = useState({
    useHandicaps: false,           // bestball
    scrambleHandicapPct: 10,       // scramble
    retireesScoresToCount: 2,      // retirees
    retireesBonusPer9: -2,         // retirees 3-player bonus
    retireesExtraStrokes: 2,       // retirees 3-player extra HC strokes
    useNet: true,                  // stableford
  })
  const [scrambleTeamNames, setScrambleTeamNames] = useState({})

  // Skins-specific settings
  const [skinsSettings, setSkinsSettings] = useState({
    costPerSkin: '',
    carryovers: true,
    wrapUnwonSkins: true,
    wrapTo: 'front',
    parOrBetterRequired: false,
    birdieDoubleEagleTriple: false
  })
  const [greenieSettings, setGreenieSettings] = useState({
    enabled: true,
    costPerGreenie: '',
    carryovers: true,
    wrapUnwonGreenies: false,
    wrapTo: 'front'
  })

  // Creating
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  // Auto-add creator as first player
  useEffect(() => {
    if (profile && gamePlayers.length === 0) {
      setGamePlayers([{
        id: profile.id,
        name: profile.display_name,
        handicap: 0,
        profileId: profile.id,
        isGuest: false
      }])
    }
  }, [profile])

  // Debounced profile search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    searchTimeout.current = setTimeout(async () => {
      const results = await searchProfiles(searchQuery.trim(), profile?.id)
      // Filter out already-added players
      const addedIds = new Set(gamePlayers.filter(p => !p.isGuest).map(p => p.id))
      setSearchResults(results.filter(r => !addedIds.has(r.id)))
      setSearching(false)
    }, 400)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [searchQuery, gamePlayers])

  const addAppUser = (user) => {
    setGamePlayers(prev => [...prev, {
      id: user.id,
      name: user.display_name,
      handicap: 0,
      profileId: user.id,
      isGuest: false
    }])
    setSearchQuery('')
    setSearchResults([])
  }

  const addGuest = () => {
    const name = guestName.trim()
    if (!name) return
    setGamePlayers(prev => [...prev, {
      id: `guest_${Date.now()}`,
      name,
      handicap: 0,
      profileId: null,
      isGuest: true
    }])
    setGuestName('')
  }

  const removePlayer = (playerId) => {
    // Don't allow removing the creator
    if (playerId === profile?.id) return
    setGamePlayers(prev => prev.filter(p => p.id !== playerId))
  }

  const updateHandicap = (playerId, handicap) => {
    setGamePlayers(prev => prev.map(p =>
      p.id === playerId ? { ...p, handicap: parseInt(handicap) || 0 } : p
    ))
  }

  const isTeamFormat = ['bestball', 'scramble', 'retirees', 'matchplay'].includes(format)

  const generateGameCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const startGame = async () => {
    if (gamePlayers.length < 2) {
      setError('Need at least 2 players')
      return
    }
    setCreating(true)
    setError(null)

    try {
      const gameId = generateGameCode()

      // Build player objects matching league JSONB format
      const playersData = gamePlayers.map((p, idx) => ({
        id: p.id,
        name: p.name,
        handicap: p.handicap,
        skillRating: Math.max(1, Math.min(10, Math.round(10 - (p.handicap / 5.4)))),
        tee: 'blue',
        scoreHistory: [],
        checkedIn: true,
        profileId: p.profileId,
        isGuest: p.isGuest,
        gamesPlayed: 0,
        avgTotal: 0,
        defaultTee: 'blue'
      }))

      // Generate teams if team format
      let teamsData = []
      if (isTeamFormat && playersData.length >= teamSize * 2) {
        const generatedTeams = generateTeams(playersData)
        teamsData = generatedTeams
      } else if (!isTeamFormat) {
        // For non-team formats, each player is their own "team" or single group
        teamsData = [playersData]
      } else {
        // Not enough players for team format, put everyone in one group
        teamsData = [playersData]
      }

      const isSkins = format === 'skins'

      // Build live round (auto-start)
      const liveRound = {
        id: Date.now(),
        date: new Date().toLocaleDateString('en-CA'),
        formatConfig: {
          format,
          ...formatSettings
        },
        teams: teamsData.map((team, idx) => ({
          id: idx,
          name: format === 'scramble'
            ? (scrambleTeamNames[idx] || `Team ${idx + 1}`)
            : isTeamFormat ? getTeamName(team) : (team.length > 1 ? `Group ${idx + 1}` : team[0]?.name || `Group ${idx + 1}`),
          players: team.map(p => ({
            id: p.id,
            name: p.name,
            skillRating: p.skillRating,
            handicap: p.handicap,
            avgTotal: p.avgTotal || 0,
            scores: {},
            isDNF: false,
            includeInTeamScore: true,
            joinedLate: false,
            tee: p.tee || 'blue'
          })),
          totalScore: 0,
          isFinished: false,
          greenies: {}
        })),
        // Add Quick Skins greenie settings if skins format with greenies enabled
        ...(isSkins && greenieSettings.enabled ? {
          quickSkinsGreenieSettings: {
            enabled: true,
            costPerGreenie: parseFloat(greenieSettings.costPerGreenie) || 1,
            carryovers: greenieSettings.carryovers,
            wrapUnwonGreenies: greenieSettings.wrapUnwonGreenies,
            wrapTo: greenieSettings.wrapTo
          }
        } : {})
      }

      // Build skinsMatch data if skins format
      let skinsMatchData = null
      if (isSkins) {
        skinsMatchData = {
          settings: {
            ...skinsSettings,
            costPerSkin: parseFloat(skinsSettings.costPerSkin) || 1,
            playerHandicaps: {},
            greeniesEnabled: greenieSettings.enabled,
            greeniesCostPerHole: greenieSettings.enabled ? (parseFloat(greenieSettings.costPerGreenie) || 1) : 0,
            greeniesCarryover: greenieSettings.carryovers,
            greeniesWrap: greenieSettings.wrapUnwonGreenies,
            greeniesWrapTo: greenieSettings.wrapTo
          },
          participants: playersData.map(p => String(p.id)),
          results: {}
        }
      }

      // JSONB data blob
      const gameData = {
        players: playersData,
        teams: teamsData,
        liveRound,
        history: [],
        leagueSettings: { contactInfoVisibility: 'admin' },
        ...(isSkins ? { quickSkinsMode: true, skinsMatch: skinsMatchData } : {}),
        casualGameInfo: {
          gameName,
          courseName,
          holes,
          format,
          formatSettings,
          teamSize: isTeamFormat ? teamSize : null,
          enableGreenies,
          createdBy: profile?.id
        }
      }

      // Create the leagues row with type='casual'
      const { error: insertError } = await supabase
        .from('leagues')
        .upsert({
          id: gameId,
          data: gameData,
          name: gameName,
          owner_id: profile?.id || null,
          type: 'casual',
          updated_at: new Date()
        })

      if (insertError) {
        throw new Error(`Failed to create game: ${insertError.message}`)
      }

      // Add league_members rows for app users
      const appUsers = gamePlayers.filter(p => !p.isGuest && p.profileId)
      for (const user of appUsers) {
        try {
          const role = user.profileId === profile?.id ? 'owner' : 'player'
          await addLeagueMember(gameId, user.profileId, role)
        } catch (err) {
          console.warn('Could not add league member:', err)
        }
      }

      // Switch to the new casual game
      await switchLeague(gameId)
    } catch (err) {
      console.error('Failed to start casual game:', err)
      setError(err.message || 'Failed to create game')
      setCreating(false)
    }
  }

  const formats = [
    { key: 'stroke',     label: 'Stroke Play',         desc: 'Total strokes, lowest wins' },
    { key: 'stroke_net', label: 'Stroke Play (Net)',    desc: 'Handicap-adjusted strokes' },
    { key: 'bestball',   label: 'Best Ball',            desc: '1 best score per hole per team' },
    { key: 'scramble',   label: 'Scramble',             desc: 'Pick best shot, all play from there' },
    { key: 'retirees',   label: '2 Best Balls (Net)',   desc: '2 best net scores per hole' },
    { key: 'stableford', label: 'Stableford',           desc: 'Points-based scoring' },
    { key: 'matchplay',  label: 'Match Play',           desc: 'Hole-by-hole battle' },
    { key: 'skins',      label: 'Skins',                desc: 'Win holes outright' },
    { key: 'track',      label: 'Just Track Scores',    desc: 'No competition' },
  ]

  return (
    <div className="app-container">
      <header className="header">
        <h1>Gunpowder Big Boy's Golf</h1>
        <div style={{ marginTop: '8px', fontSize: '15px', opacity: 0.9 }}>
          New Casual Game
        </div>
      </header>

      <div className="content" style={{ paddingBottom: '100px' }}>
        <div style={{ maxWidth: '440px', margin: '0 auto' }}>

          {/* Back button */}
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#27ae60',
              fontSize: '15px',
              cursor: 'pointer',
              padding: '8px 0',
              marginBottom: '16px',
              fontWeight: '600'
            }}
          >
            &larr; Back
          </button>

          {/* Section 1: Game Info */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#333' }}>Game Info</h3>

            <div className="input-group" style={{ marginBottom: '12px' }}>
              <label>Game Name</label>
              <input
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="Saturday Skins"
              />
            </div>

            <div className="input-group" style={{ marginBottom: '12px' }}>
              <label>Holes</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[9, 18].map(h => (
                  <button
                    key={h}
                    onClick={() => setHoles(h)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: `2px solid ${holes === h ? '#27ae60' : '#e0e0e0'}`,
                      background: holes === h ? '#f0fff4' : 'white',
                      color: holes === h ? '#27ae60' : '#666',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '15px'
                    }}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label>Course Name (optional)</label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. Gunpowder Falls"
              />
            </div>
          </div>

          {/* Section 2: Players */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#333' }}>
              Players ({gamePlayers.length})
            </h3>

            {/* Search App Users */}
            <div className="input-group" style={{ marginBottom: '12px' }}>
              <label>Search App Users</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
              />
              {searching && (
                <div style={{ padding: '8px', color: '#888', fontSize: '13px' }}>Searching...</div>
              )}
              {searchResults.length > 0 && (
                <div style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  marginTop: '4px',
                  overflow: 'hidden'
                }}>
                  {searchResults.map(user => (
                    <button
                      key={user.id}
                      onClick={() => addAppUser(user)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        border: 'none',
                        borderBottom: '1px solid #f0f0f0',
                        background: 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '14px'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <span style={{ fontWeight: '600' }}>{user.display_name}</span>
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        color: '#27ae60',
                        background: '#f0fff4',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>App User</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add Guest */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Guest name"
                onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                style={{ flex: 1 }}
              />
              <button
                onClick={addGuest}
                disabled={!guestName.trim()}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '2px solid #27ae60',
                  background: guestName.trim() ? '#27ae60' : '#e0e0e0',
                  color: guestName.trim() ? 'white' : '#999',
                  fontWeight: '600',
                  cursor: guestName.trim() ? 'pointer' : 'default',
                  whiteSpace: 'nowrap'
                }}
              >
                + Add
              </button>
            </div>

            {/* Player List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {gamePlayers.map((player) => (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #eee'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
                      {player.name}
                      {player.id === profile?.id && (
                        <span style={{ fontSize: '11px', color: '#888', marginLeft: '6px' }}>(you)</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '10px',
                      color: player.isGuest ? '#e67e22' : '#27ae60',
                      fontWeight: '600'
                    }}>
                      {player.isGuest ? 'GUEST' : 'APP USER'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#888' }}>HC:</label>
                    <input
                      type="number"
                      value={player.handicap}
                      onChange={(e) => updateHandicap(player.id, e.target.value)}
                      style={{
                        width: '50px',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                        textAlign: 'center',
                        fontSize: '14px'
                      }}
                      min="0"
                      max="54"
                    />
                  </div>
                  {player.id !== profile?.id && (
                    <button
                      onClick={() => removePlayer(player.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#e74c3c',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '2px 6px',
                        lineHeight: 1
                      }}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Scramble Team Names */}
            {format === 'scramble' && gamePlayers.length >= teamSize * 2 && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#fff8e1', borderRadius: '8px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: '#333' }}>
                  Team Names (optional)
                </label>
                {Array.from({ length: Math.ceil(gamePlayers.length / teamSize) }, (_, i) => (
                  <input
                    key={i}
                    type="text"
                    value={scrambleTeamNames[i] || ''}
                    onChange={(e) => setScrambleTeamNames({ ...scrambleTeamNames, [i]: e.target.value })}
                    placeholder={`Team ${i + 1}`}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: '6px',
                      border: '1px solid #ddd', fontSize: '14px', marginBottom: '6px'
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Format */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#333' }}>Format</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {formats.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: `2px solid ${format === f.key ? '#27ae60' : '#e0e0e0'}`,
                    background: format === f.key ? '#f0fff4' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{
                    fontWeight: '600',
                    fontSize: '14px',
                    color: format === f.key ? '#27ae60' : '#333'
                  }}>
                    {f.label}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                    {f.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* Team Size (for team formats) */}
            {isTeamFormat && (
              <div className="input-group" style={{ marginBottom: '12px' }}>
                <label>Players Per Team</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[2, 3, 4].map(s => (
                    <button
                      key={s}
                      onClick={() => setTeamSize(s)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: `2px solid ${teamSize === s ? '#27ae60' : '#e0e0e0'}`,
                        background: teamSize === s ? '#f0fff4' : 'white',
                        color: teamSize === s ? '#27ae60' : '#666',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Format-specific settings */}
            {format === 'bestball' && (
              <div style={{ padding: '12px', background: '#f0fff4', borderRadius: '8px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formatSettings.useHandicaps}
                    onChange={(e) => setFormatSettings({ ...formatSettings, useHandicaps: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#27ae60' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>Use Handicaps (Net Best Ball)</span>
                </label>
              </div>
            )}

            {format === 'retirees' && (
              <div style={{ padding: '12px', background: '#f0fff4', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px' }}>
                    Best scores to count per hole
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3].map(n => (
                      <button
                        key={n}
                        onClick={() => setFormatSettings({ ...formatSettings, retireesScoresToCount: n })}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '6px',
                          border: `2px solid ${formatSettings.retireesScoresToCount === n ? '#27ae60' : '#e0e0e0'}`,
                          background: formatSettings.retireesScoresToCount === n ? '#f0fff4' : 'white',
                          fontWeight: '600', cursor: 'pointer', fontSize: '14px',
                          color: formatSettings.retireesScoresToCount === n ? '#27ae60' : '#666'
                        }}
                      >{n}</button>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
                  <strong>3-player team rules:</strong> {formatSettings.retireesBonusPer9} per 9, +{formatSettings.retireesExtraStrokes} extra HC strokes
                </div>
              </div>
            )}

            {format === 'stableford' && (
              <div style={{ padding: '12px', background: '#f0fff4', borderRadius: '8px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formatSettings.useNet}
                    onChange={(e) => setFormatSettings({ ...formatSettings, useNet: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#27ae60' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>Use Net Scoring (handicap-adjusted)</span>
                </label>
              </div>
            )}

            {/* Scramble team naming (shown in Players section overflow) */}

            {/* Simple greenies toggle for non-skins formats */}
            {format !== 'skins' && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0'
              }}>
                <span style={{ fontSize: '14px', fontWeight: '500' }}>Greenies (closest on par 3s)</span>
                <button
                  onClick={() => setEnableGreenies(!enableGreenies)}
                  style={{
                    width: '50px',
                    height: '28px',
                    borderRadius: '14px',
                    border: 'none',
                    background: enableGreenies ? '#27ae60' : '#ccc',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: enableGreenies ? '25px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </button>
              </div>
            )}
          </div>

          {/* Skins Settings (only when skins format selected) */}
          {format === 'skins' && (
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid #e0e0e0'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#333' }}>Skins Rules</h3>

              {/* Cost per skin */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>
                  Cost per Skin ($)
                </label>
                <input
                  type="number"
                  value={skinsSettings.costPerSkin}
                  onChange={(e) => setSkinsSettings({ ...skinsSettings, costPerSkin: e.target.value })}
                  placeholder="1.00"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px' }}
                />
              </div>

              {/* Carryovers */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Carryovers</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[true, false].map(val => (
                    <button
                      key={String(val)}
                      onClick={() => setSkinsSettings({ ...skinsSettings, carryovers: val })}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        border: `2px solid ${skinsSettings.carryovers === val ? '#f39c12' : '#e0e0e0'}`,
                        background: skinsSettings.carryovers === val ? '#fff8e1' : 'white',
                        fontWeight: skinsSettings.carryovers === val ? '600' : 'normal',
                        cursor: 'pointer', fontSize: '14px'
                      }}
                    >{val ? 'Yes' : 'No'}</button>
                  ))}
                </div>
              </div>

              {/* Wrap options (if carryovers ON) */}
              {skinsSettings.carryovers && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Wrap Unwon Skins</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[true, false].map(val => (
                        <button
                          key={String(val)}
                          onClick={() => setSkinsSettings({ ...skinsSettings, wrapUnwonSkins: val })}
                          style={{
                            flex: 1, padding: '10px', borderRadius: '8px',
                            border: `2px solid ${skinsSettings.wrapUnwonSkins === val ? '#f39c12' : '#e0e0e0'}`,
                            background: skinsSettings.wrapUnwonSkins === val ? '#fff8e1' : 'white',
                            fontWeight: skinsSettings.wrapUnwonSkins === val ? '600' : 'normal',
                            cursor: 'pointer', fontSize: '14px'
                          }}
                        >{val ? 'Yes' : 'No'}</button>
                      ))}
                    </div>
                  </div>
                  {skinsSettings.wrapUnwonSkins && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Wrap To</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {[{ val: 'front', label: 'Front 9' }, { val: 'back', label: 'Back 9' }].map(opt => (
                          <button
                            key={opt.val}
                            onClick={() => setSkinsSettings({ ...skinsSettings, wrapTo: opt.val })}
                            style={{
                              flex: 1, padding: '10px', borderRadius: '8px',
                              border: `2px solid ${skinsSettings.wrapTo === opt.val ? '#f39c12' : '#e0e0e0'}`,
                              background: skinsSettings.wrapTo === opt.val ? '#fff8e1' : 'white',
                              fontWeight: skinsSettings.wrapTo === opt.val ? '600' : 'normal',
                              cursor: 'pointer', fontSize: '14px'
                            }}
                          >{opt.label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Optional rules */}
              <div style={{ borderTop: '1px solid #eee', paddingTop: '12px', marginBottom: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={skinsSettings.parOrBetterRequired} onChange={(e) => setSkinsSettings({ ...skinsSettings, parOrBetterRequired: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#f39c12' }} />
                  <span style={{ fontSize: '14px' }}>Par or better required to win</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={skinsSettings.birdieDoubleEagleTriple} onChange={(e) => setSkinsSettings({ ...skinsSettings, birdieDoubleEagleTriple: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#f39c12' }} />
                  <span style={{ fontSize: '14px' }}>Birdie = 2x, Eagle = 3x value</span>
                </label>
              </div>

              {/* Greenies Section */}
              <div style={{ borderTop: '1px solid #eee', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ fontWeight: '600', fontSize: '15px' }}>Greenies (Par 3s)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[true, false].map(val => (
                      <button
                        key={String(val)}
                        onClick={() => setGreenieSettings({ ...greenieSettings, enabled: val })}
                        style={{
                          padding: '6px 14px', borderRadius: '6px',
                          border: `2px solid ${greenieSettings.enabled === val ? '#27ae60' : '#e0e0e0'}`,
                          background: greenieSettings.enabled === val ? '#f0fff4' : 'white',
                          fontWeight: greenieSettings.enabled === val ? '600' : 'normal',
                          color: greenieSettings.enabled === val ? '#27ae60' : '#666',
                          cursor: 'pointer', fontSize: '13px'
                        }}
                      >{val ? 'Yes' : 'No'}</button>
                    ))}
                  </div>
                </div>

                {greenieSettings.enabled && (
                  <div style={{ background: '#f0fff4', padding: '15px', borderRadius: '8px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>
                        Cost per Greenie ($)
                      </label>
                      <input
                        type="number"
                        value={greenieSettings.costPerGreenie}
                        onChange={(e) => setGreenieSettings({ ...greenieSettings, costPerGreenie: e.target.value })}
                        placeholder="1.00"
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                      />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Carryovers</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {[true, false].map(val => (
                          <button
                            key={String(val)}
                            onClick={() => setGreenieSettings({ ...greenieSettings, carryovers: val })}
                            style={{
                              flex: 1, padding: '10px', borderRadius: '6px',
                              border: `2px solid ${greenieSettings.carryovers === val ? '#27ae60' : '#e0e0e0'}`,
                              background: greenieSettings.carryovers === val ? '#f0fff4' : 'white',
                              fontWeight: greenieSettings.carryovers === val ? '600' : 'normal',
                              cursor: 'pointer', fontSize: '13px'
                            }}
                          >{val ? 'Yes' : 'No'}</button>
                        ))}
                      </div>
                    </div>

                    {/* Greenie Wrap options (if carryovers ON) */}
                    {greenieSettings.carryovers && (
                      <>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Wrap Unwon Greenies</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {[true, false].map(val => (
                              <button
                                key={String(val)}
                                onClick={() => setGreenieSettings({ ...greenieSettings, wrapUnwonGreenies: val })}
                                style={{
                                  flex: 1, padding: '10px', borderRadius: '6px',
                                  border: `2px solid ${greenieSettings.wrapUnwonGreenies === val ? '#27ae60' : '#e0e0e0'}`,
                                  background: greenieSettings.wrapUnwonGreenies === val ? '#f0fff4' : 'white',
                                  fontWeight: greenieSettings.wrapUnwonGreenies === val ? '600' : 'normal',
                                  cursor: 'pointer', fontSize: '13px'
                                }}
                              >{val ? 'Yes' : 'No'}</button>
                            ))}
                          </div>
                        </div>
                        {greenieSettings.wrapUnwonGreenies && (
                          <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Wrap To</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {[{ val: 'front', label: 'Front 9' }, { val: 'back', label: 'Back 9' }].map(opt => (
                                <button
                                  key={opt.val}
                                  onClick={() => setGreenieSettings({ ...greenieSettings, wrapTo: opt.val })}
                                  style={{
                                    flex: 1, padding: '10px', borderRadius: '6px',
                                    border: `2px solid ${greenieSettings.wrapTo === opt.val ? '#27ae60' : '#e0e0e0'}`,
                                    background: greenieSettings.wrapTo === opt.val ? '#f0fff4' : 'white',
                                    fontWeight: greenieSettings.wrapTo === opt.val ? '600' : 'normal',
                                    cursor: 'pointer', fontSize: '13px'
                                  }}
                                >{opt.label}</button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: '#fdeaea',
              color: '#c0392b',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={startGame}
            disabled={creating || gamePlayers.length < 2}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: creating || gamePlayers.length < 2
                ? '#ccc'
                : 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
              color: 'white',
              fontSize: '18px',
              fontWeight: '700',
              cursor: creating || gamePlayers.length < 2 ? 'default' : 'pointer'
            }}
          >
            {creating ? 'Creating Game...' : 'Start Game'}
          </button>

        </div>
      </div>
    </div>
  )
}

export default CasualGameSetup
