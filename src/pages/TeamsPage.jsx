import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../context/LeagueContext'
import { getTeamName, calculateTeamSkill, calculateTeamBalance } from '../utils/teamGeneration'
import { formatHandicap } from '../utils/handicapCalculation'

function TeamCard({ team, index, totalTeams, onMoveUp, onMoveDown, isAdmin }) {
  const teamSkill = calculateTeamSkill(team)
  const avgSkill = team.length > 0 ? teamSkill / team.length : 0
  // Calculate average handicap for display
  const playersWithHandicap = team.filter(p => p.handicap !== undefined && p.handicap !== null)
  const avgHandicap = playersWithHandicap.length > 0
    ? playersWithHandicap.reduce((sum, p) => sum + p.handicap, 0) / playersWithHandicap.length
    : null

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
              background: index === 0 ? '#e0e0e0' : '#3498db',
              color: 'white',
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
              background: index === totalTeams - 1 ? '#e0e0e0' : '#3498db',
              color: 'white',
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
          color: 'white',
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '12px',
          marginRight: '10px'
        }}>
          #{index + 1}
        </span>
        {getTeamName(team)} ({team.length})
        {avgHandicap !== null ? ` - Avg HCP: ${avgHandicap.toFixed(1)}` : ` - Avg Skill: ${avgSkill.toFixed(1)}`}
      </div>
      {team.map(player => (
        <div key={player.id} className="team-member">
          {player.name} ({player.handicap !== undefined && player.handicap !== null
            ? `HCP ${formatHandicap(player.handicap)}`
            : player.skillRating?.toFixed(1) || '5.0'})
        </div>
      ))}
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
    birdieDoubleEagleTriple: false,
    useHandicaps: false,
    playerHandicaps: {}
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
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid #ddd', fontSize: '16px' }}
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
                  border: settings.carryovers ? '2px solid #f39c12' : '2px solid #ddd',
                  background: settings.carryovers ? '#fff8e1' : 'white',
                  fontWeight: settings.carryovers ? '600' : 'normal',
                  cursor: 'pointer'
                }}
              >Yes</button>
              <button
                onClick={() => setSettings({ ...settings, carryovers: false })}
                style={{
                  flex: 1, padding: '12px', borderRadius: '6px',
                  border: !settings.carryovers ? '2px solid #f39c12' : '2px solid #ddd',
                  background: !settings.carryovers ? '#fff8e1' : 'white',
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
                    style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.wrapUnwonSkins ? '2px solid #f39c12' : '2px solid #ddd', background: settings.wrapUnwonSkins ? '#fff8e1' : 'white', fontWeight: settings.wrapUnwonSkins ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                  <button onClick={() => setSettings({ ...settings, wrapUnwonSkins: false })}
                    style={{ flex: 1, padding: '12px', borderRadius: '6px', border: !settings.wrapUnwonSkins ? '2px solid #f39c12' : '2px solid #ddd', background: !settings.wrapUnwonSkins ? '#fff8e1' : 'white', fontWeight: !settings.wrapUnwonSkins ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                </div>
              </div>
              {settings.wrapUnwonSkins && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Wrap To</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setSettings({ ...settings, wrapTo: 'front' })}
                      style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.wrapTo === 'front' ? '2px solid #f39c12' : '2px solid #ddd', background: settings.wrapTo === 'front' ? '#fff8e1' : 'white', fontWeight: settings.wrapTo === 'front' ? '600' : 'normal', cursor: 'pointer' }}>Front 9</button>
                    <button onClick={() => setSettings({ ...settings, wrapTo: 'back' })}
                      style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.wrapTo === 'back' ? '2px solid #f39c12' : '2px solid #ddd', background: settings.wrapTo === 'back' ? '#fff8e1' : 'white', fontWeight: settings.wrapTo === 'back' ? '600' : 'normal', cursor: 'pointer' }}>Back 9</button>
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
                  style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.payoutStyle === 'perSkin' ? '2px solid #f39c12' : '2px solid #ddd', background: settings.payoutStyle === 'perSkin' ? '#fff8e1' : 'white', fontWeight: settings.payoutStyle === 'perSkin' ? '600' : 'normal', cursor: 'pointer', fontSize: '12px' }}>Per Skin</button>
                <button onClick={() => setSettings({ ...settings, payoutStyle: 'fixedPot' })}
                  style={{ flex: 1, padding: '12px', borderRadius: '6px', border: settings.payoutStyle === 'fixedPot' ? '2px solid #f39c12' : '2px solid #ddd', background: settings.payoutStyle === 'fixedPot' ? '#fff8e1' : 'white', fontWeight: settings.payoutStyle === 'fixedPot' ? '600' : 'normal', cursor: 'pointer', fontSize: '12px' }}>Fixed Pot</button>
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

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>
              {skinsMatch ? 'Save Changes' : 'Create Skins Match'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkinsOptInSection({ teams, skinsMatch, setSkinsMatch, liveRound, isAdmin }) {
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
        background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginBottom: '10px', color: 'white' }}>Skins Match</h3>
        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', marginBottom: '15px' }}>
          Set up a skins competition that runs alongside the league round.
        </p>
        <button
          className="btn"
          onClick={() => setShowSetup(true)}
          style={{ background: 'white', color: '#e67e22', fontWeight: '600' }}
        >
          Set Up Skins Match
        </button>
        {showSetup && (
          <SkinsSetupModal
            onClose={() => setShowSetup(false)}
            skinsMatch={null}
            onSave={setSkinsMatch}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{
      background: '#fff8e1',
      border: '2px solid #f39c12',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#e67e22' }}>Skins Match Active</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowSetup(true)}
            style={{ background: '#f39c12', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
          >
            Edit
          </button>
          <button
            onClick={cancelSkins}
            style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Settings summary */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: '#666', marginBottom: '15px', fontSize: '13px' }}>
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

      {/* Player opt-in */}
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
                  border: inSkins ? '2px solid #27ae60' : '2px solid #ddd',
                  background: inSkins ? '#e8f8f5' : 'white',
                  color: inSkins ? '#27ae60' : '#666',
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
          <p style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
            Round in progress. Contact admin to change skins participation.
          </p>
        )}
      </div>

      {/* Participant count */}
      <div style={{
        textAlign: 'center',
        padding: '10px',
        background: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '13px'
      }}>
        <strong>{skinsMatch.participants.length}</strong> player{skinsMatch.participants.length !== 1 ? 's' : ''} in skins
        {skinsMatch.participants.length >= 2 && (
          <span style={{ color: '#27ae60' }}> - Ready to play</span>
        )}
        {skinsMatch.participants.length < 2 && skinsMatch.participants.length > 0 && (
          <span style={{ color: '#e67e22' }}> (need at least 2)</span>
        )}
      </div>

      {showSetup && (
        <SkinsSetupModal
          onClose={() => setShowSetup(false)}
          skinsMatch={skinsMatch}
          onSave={setSkinsMatch}
        />
      )}
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
    setCheckedInPlayers,
    setManualTeams,
    setPairingRequests,
    players
  } = useLeague()

  const balance = teams.length > 0 ? calculateTeamBalance(teams) : null

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

    const round = {
      id: Date.now(),
      date: new Date().toISOString(),
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

    // Clear check-in state
    setCheckedInPlayers([])
    setManualTeams([])
    setPairingRequests([])

    navigate('/live')
  }

  const clearTeams = () => {
    if (window.confirm('Clear all teams? This cannot be undone.')) {
      setTeams([])
      setCheckedInPlayers([])
      setManualTeams([])
      setPairingRequests([])
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

          {/* Skins opt-in section */}
          <SkinsOptInSection
            teams={teams}
            skinsMatch={skinsMatch}
            setSkinsMatch={setSkinsMatch}
            liveRound={liveRound}
            isAdmin={isAdmin}
          />

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
            />
          ))}

          {/* Action buttons */}
          <div style={{ marginTop: '20px' }}>
            {liveRound ? (
              <button
                className="btn btn-primary"
                onClick={() => navigate('/live')}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '16px',
                  background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)'
                }}
              >
                Go to Live Round in Progress
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={startLiveRound}
                style={{ width: '100%', padding: '15px', fontSize: '16px' }}
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
