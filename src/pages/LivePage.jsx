import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../context/LeagueContext'
import { GUNPOWDER_SCORECARD, getHoleInfo, PAR_3_HOLES, getAllHoles } from '../lib/courseData'
import { calculateRoundSettlement, formatMoney } from '../utils/moneyCalculations'

// Calculate team score for a 9-hole range
function calculateTeamScore(team, startHole, endHole) {
  let totalScore = 0
  for (let hole = startHole; hole <= endHole; hole++) {
    const holeInfo = getHoleInfo(hole)
    const par = holeInfo?.par || 4

    const playerScores = team.players
      .filter(p => !p.isDNF && p.includeInTeamScore)
      .map(p => p.scores[hole])
      .filter(s => s !== undefined && s !== null && s !== '' && s !== 'X')

    if (playerScores.length === 0) continue

    const underParScores = playerScores.filter(s => s < par)

    if (underParScores.length > 0) {
      totalScore += underParScores.reduce((sum, s) => sum + (s - par), 0)
    } else {
      const bestScore = Math.min(...playerScores)
      totalScore += (bestScore - par)
    }
  }
  return totalScore
}

function formatRelativeToPar(score) {
  if (score === 0) return 'E'
  if (score > 0) return `+${score}`
  return score.toString()
}

// Leaderboard Component
function Leaderboard({ liveRound }) {
  const [view, setView] = useState('overall')

  const teamsWithScores = liveRound.teams.map(team => {
    const front9 = calculateTeamScore(team, 1, 9)
    const back9 = calculateTeamScore(team, 10, 18)
    const total = front9 + back9

    return { ...team, front9, back9, total }
  }).sort((a, b) => {
    if (view === 'front') return a.front9 - b.front9
    if (view === 'back') return a.back9 - b.back9
    return a.total - b.total
  })

  return (
    <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%)',
        color: 'white',
        padding: '15px',
        fontSize: '18px',
        fontWeight: '600',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: '2px'
      }}>
        Leaderboard
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
        {['front', 'back', 'overall'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              background: view === v ? '#f0f0f0' : 'white',
              fontWeight: view === v ? '600' : 'normal',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {v === 'front' ? 'Front 9' : v === 'back' ? 'Back 9' : 'Overall'}
          </button>
        ))}
      </div>

      <div style={{ padding: '10px' }}>
        {teamsWithScores.map((team, idx) => {
          const displayScore = view === 'front' ? team.front9 : view === 'back' ? team.back9 : team.total
          return (
            <div key={team.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: idx === 0 ? '#fff8e1' : (idx % 2 === 0 ? '#f8f9fa' : 'white'),
              borderRadius: '8px',
              marginBottom: '8px',
              border: idx === 0 ? '2px solid #f9a825' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: idx === 0 ? '#f9a825' : '#95a5a6',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  {idx + 1}
                </span>
                <div>
                  <div style={{ fontWeight: '600' }}>{team.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {team.players.filter(p => !p.isDNF).length} players
                    {team.isFinished && <span style={{ color: '#27ae60', marginLeft: '8px' }}>Done</span>}
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: displayScore < 0 ? '#27ae60' : displayScore > 0 ? '#e74c3c' : '#333'
              }}>
                {formatRelativeToPar(displayScore)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Score Entry Component
function ScoringGrid({ liveRound, onUpdateScore, selectedTeamId, setSelectedTeamId }) {
  const [selectedHole, setSelectedHole] = useState(1)

  const selectedTeam = liveRound.teams.find(t => t.id === selectedTeamId)

  return (
    <div>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Select Team:</label>
        <select
          value={selectedTeamId || ''}
          onChange={(e) => setSelectedTeamId(parseInt(e.target.value))}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '2px solid #27ae60',
            fontSize: '16px'
          }}
        >
          {liveRound.teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {selectedTeam && (
        <>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Select Hole:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(hole => {
                const hasScores = selectedTeam.players.some(p => p.scores[hole] && p.scores[hole] !== 'X')
                return (
                  <button
                    key={hole}
                    onClick={() => setSelectedHole(hole)}
                    style={{
                      padding: '10px 0',
                      border: selectedHole === hole ? '2px solid #27ae60' : '1px solid #ddd',
                      background: selectedHole === hole ? '#27ae60' : hasScores ? '#d4edda' : 'white',
                      color: selectedHole === hole ? 'white' : '#333',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {hole}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px', marginTop: '4px' }}>
              {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(hole => {
                const hasScores = selectedTeam.players.some(p => p.scores[hole] && p.scores[hole] !== 'X')
                return (
                  <button
                    key={hole}
                    onClick={() => setSelectedHole(hole)}
                    style={{
                      padding: '10px 0',
                      border: selectedHole === hole ? '2px solid #e67e22' : '1px solid #ddd',
                      background: selectedHole === hole ? '#e67e22' : hasScores ? '#fff3e0' : 'white',
                      color: selectedHole === hole ? 'white' : '#333',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {hole}
                  </button>
                )
              })}
            </div>
          </div>

          {(() => {
            const holeInfo = getHoleInfo(selectedHole)
            return (
              <div style={{
                background: '#f8f9fa',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '15px',
                display: 'flex',
                justifyContent: 'space-around',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Hole</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedHole}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Par</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: holeInfo?.par === 3 ? '#e74c3c' : holeInfo?.par === 5 ? '#3498db' : '#333' }}>
                    {holeInfo?.par}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>Yards</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{holeInfo?.blue}</div>
                </div>
              </div>
            )
          })()}

          <div>
            {selectedTeam.players.map(player => {
              const isDNF = player.isDNF === true
              return (
                <div key={player.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '10px',
                  padding: '10px',
                  background: isDNF ? '#f8d7da' : 'white',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  opacity: isDNF ? 0.6 : 1
                }}>
                  <div style={{ flex: 1, fontWeight: '600' }}>
                    {player.name}
                    {isDNF && <span style={{ color: '#e74c3c', marginLeft: '8px' }}>DNF</span>}
                    {player.joinedLate && <span style={{ color: '#f39c12', marginLeft: '8px', fontSize: '12px' }}>Late</span>}
                  </div>
                  {!isDNF && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => {
                        const holeInfo = getHoleInfo(selectedHole)
                        const par = holeInfo?.par || 4
                        const isSelected = player.scores[selectedHole] === score
                        const relToPar = score - par

                        let bgColor = 'white'
                        let textColor = '#333'
                        if (isSelected) {
                          if (relToPar <= -2) { bgColor = '#f9a825'; textColor = 'white' }
                          else if (relToPar === -1) { bgColor = '#e74c3c'; textColor = 'white' }
                          else if (relToPar === 0) { bgColor = '#27ae60'; textColor = 'white' }
                          else if (relToPar === 1) { bgColor = '#3498db'; textColor = 'white' }
                          else { bgColor = '#95a5a6'; textColor = 'white' }
                        }

                        return (
                          <button
                            key={score}
                            onClick={() => onUpdateScore(selectedTeamId, player.id, selectedHole, score)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              border: isSelected ? 'none' : '1px solid #ddd',
                              background: bgColor,
                              color: textColor,
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                          >
                            {score}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// Greenies Component
function GreeniesTracker({ liveRound, onUpdateGreenie }) {
  const [selectedHole, setSelectedHole] = useState(PAR_3_HOLES[0])

  const allPlayers = liveRound.teams.flatMap(t => t.players.filter(p => !p.isDNF))

  const getCurrentGreenie = (hole) => {
    for (const team of liveRound.teams) {
      if (team.greenies && team.greenies[hole]) {
        return team.greenies[hole]
      }
    }
    return null
  }

  const currentGreenie = getCurrentGreenie(selectedHole)

  return (
    <div>
      <div style={{
        background: '#e8f5e9',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '20px',
        border: '2px solid #27ae60'
      }}>
        <h3 style={{ marginBottom: '10px', color: '#27ae60' }}>Par 3 Holes (Greenie Holes)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {PAR_3_HOLES.map(hole => {
            const greenie = getCurrentGreenie(hole)
            const holeInfo = getHoleInfo(hole)
            return (
              <button
                key={hole}
                onClick={() => setSelectedHole(hole)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: selectedHole === hole ? '3px solid #27ae60' : '1px solid #ddd',
                  background: greenie ? '#d4edda' : 'white',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>#{hole}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{holeInfo?.blue} yds</div>
                {greenie && (
                  <div style={{ fontSize: '11px', color: '#27ae60', marginTop: '4px' }}>
                    {greenie.playerName}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '10px' }}>
        <h4 style={{ marginBottom: '15px' }}>Hole {selectedHole} - Select Greenie Winner</h4>

        {currentGreenie && (
          <div style={{
            background: '#d4edda',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Current: <strong>{currentGreenie.playerName}</strong></span>
            <button
              onClick={() => onUpdateGreenie(selectedHole, null)}
              style={{
                padding: '6px 12px',
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {allPlayers.map(player => (
            <button
              key={player.id}
              onClick={() => onUpdateGreenie(selectedHole, player)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: currentGreenie?.playerId === player.id ? '2px solid #27ae60' : '1px solid #ddd',
                background: currentGreenie?.playerId === player.id ? '#d4edda' : 'white',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {player.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// DNF Management Component
function DNFManager({ liveRound, onMarkDNF, onUndoDNF, isAdmin }) {
  const [pendingDNF, setPendingDNF] = useState(null)
  const [dnfOptions, setDnfOptions] = useState({
    includeScores: true,
    paymentStatus: 'full',
    greeniesOwed: 4
  })

  if (!isAdmin) return null

  const handleConfirmDNF = () => {
    onMarkDNF(
      pendingDNF.teamId,
      pendingDNF.playerId,
      dnfOptions.includeScores,
      dnfOptions.paymentStatus,
      dnfOptions.greeniesOwed
    )
    setPendingDNF(null)
  }

  return (
    <div>
      <h3 style={{ marginBottom: '15px' }}>Player Status (DNF)</h3>
      <p style={{ color: '#666', marginBottom: '15px', fontSize: '13px' }}>
        Mark players as "Did Not Finish" if they leave early. Their existing scores can still count toward the team.
      </p>

      {liveRound.teams.map(team => (
        <div key={team.id} style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '10px', color: '#666' }}>{team.name}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {team.players.map(player => {
              const isDNF = player.isDNF === true
              return (
                <button
                  key={player.id}
                  onClick={() => {
                    if (isDNF) {
                      onUndoDNF(team.id, player.id)
                    } else {
                      setPendingDNF({ teamId: team.id, playerId: player.id, playerName: player.name })
                    }
                  }}
                  style={{
                    padding: '10px 15px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isDNF ? '#e74c3c' : '#e8e8e8',
                    color: isDNF ? 'white' : '#333',
                    cursor: 'pointer',
                    fontWeight: isDNF ? 'bold' : 'normal'
                  }}
                >
                  {player.name} {isDNF ? '(DNF - tap to undo)' : ''}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {pendingDNF && (
        <div className="modal-overlay" onClick={() => setPendingDNF(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mark {pendingDNF.playerName} as DNF?</h3>
              <button className="modal-close" onClick={() => setPendingDNF(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>
                  <input
                    type="checkbox"
                    checked={dnfOptions.includeScores}
                    onChange={e => setDnfOptions({ ...dnfOptions, includeScores: e.target.checked })}
                    style={{ marginRight: '8px' }}
                  />
                  Include existing scores in team total
                </label>
              </div>

              <div className="input-group">
                <label>Payment Status</label>
                <select
                  value={dnfOptions.paymentStatus}
                  onChange={e => setDnfOptions({ ...dnfOptions, paymentStatus: e.target.value })}
                >
                  <option value="full">Paid for full round</option>
                  <option value="front">Paid for front 9 only</option>
                  <option value="none">Did not pay</option>
                </select>
              </div>

              <div className="input-group">
                <label>Par 3s Played (Greenies Owed)</label>
                <select
                  value={dnfOptions.greeniesOwed}
                  onChange={e => setDnfOptions({ ...dnfOptions, greeniesOwed: parseInt(e.target.value) })}
                >
                  <option value={0}>0 - None</option>
                  <option value={1}>1 - Hole 4 only</option>
                  <option value={2}>2 - Holes 4, 8</option>
                  <option value={4}>4 - All front 9 + back 9</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button className="btn btn-danger" onClick={handleConfirmDNF} style={{ flex: 1 }}>
                  Confirm DNF
                </button>
                <button className="btn btn-secondary" onClick={() => setPendingDNF(null)} style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Late Player Component
function LatePlayerManager({ liveRound, players, onAddLatePlayer, isAdmin }) {
  const [showModal, setShowModal] = useState(false)
  const [step, setStep] = useState(1)
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState('back')

  if (!isAdmin) return null

  const playersInRound = new Set(liveRound.teams.flatMap(t => t.players.map(p => p.id)))
  const availablePlayers = players.filter(p => p.isActive !== false && !playersInRound.has(p.id))

  const handleAddPlayer = () => {
    const player = players.find(p => p.id === selectedPlayerId)
    if (player && selectedTeamId !== null) {
      onAddLatePlayer(selectedTeamId, player, paymentStatus)
      setShowModal(false)
      setStep(1)
      setSelectedTeamId(null)
      setSelectedPlayerId(null)
    }
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <button
        className="btn btn-secondary"
        onClick={() => setShowModal(true)}
        style={{ width: '100%' }}
        disabled={availablePlayers.length === 0}
      >
        + Add Late Player to Team
      </button>

      {availablePlayers.length === 0 && (
        <p style={{ color: '#666', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
          All active players are already in the round
        </p>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Late Player</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {step === 1 && (
                <>
                  <h4 style={{ marginBottom: '15px' }}>Step 1: Select Team</h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {liveRound.teams.map(team => (
                      <button
                        key={team.id}
                        onClick={() => {
                          setSelectedTeamId(team.id)
                          setStep(2)
                        }}
                        style={{
                          padding: '15px',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          background: 'white',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ fontWeight: '600' }}>{team.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {team.players.length} players
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h4 style={{ marginBottom: '15px' }}>Step 2: Select Player</h4>
                  <div style={{ display: 'grid', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                    {availablePlayers.map(player => (
                      <button
                        key={player.id}
                        onClick={() => {
                          setSelectedPlayerId(player.id)
                          setStep(3)
                        }}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          background: 'white',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        {player.name} ({player.skillRating?.toFixed(1) || '5.0'})
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setStep(1)}
                    style={{ marginTop: '15px' }}
                  >
                    Back
                  </button>
                </>
              )}

              {step === 3 && (
                <>
                  <h4 style={{ marginBottom: '15px' }}>Step 3: Payment Status</h4>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <button
                      onClick={() => setPaymentStatus('full')}
                      style={{
                        padding: '15px',
                        borderRadius: '8px',
                        border: paymentStatus === 'full' ? '2px solid #27ae60' : '1px solid #ddd',
                        background: paymentStatus === 'full' ? '#d4edda' : 'white',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontWeight: '600' }}>Full Round</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Paying for entire round</div>
                    </button>
                    <button
                      onClick={() => setPaymentStatus('back')}
                      style={{
                        padding: '15px',
                        borderRadius: '8px',
                        border: paymentStatus === 'back' ? '2px solid #27ae60' : '1px solid #ddd',
                        background: paymentStatus === 'back' ? '#d4edda' : 'white',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontWeight: '600' }}>Back 9 Only</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Joining on hole 10</div>
                    </button>
                    <button
                      onClick={() => setPaymentStatus('none')}
                      style={{
                        padding: '15px',
                        borderRadius: '8px',
                        border: paymentStatus === 'none' ? '2px solid #27ae60' : '1px solid #ddd',
                        background: paymentStatus === 'none' ? '#d4edda' : 'white',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontWeight: '600' }}>Just Playing</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Not in team competition</div>
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button className="btn btn-primary" onClick={handleAddPlayer} style={{ flex: 1 }}>
                      Add Player
                    </button>
                    <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>
                      Back
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Skins Game Component
function SkinsTracker({ liveRound, skinsMatch, setSkinsMatch, isAdmin }) {
  const [showSetup, setShowSetup] = useState(false)
  const [settings, setSettings] = useState({
    costPerSkin: 1,
    carryovers: true,
    parOrBetterRequired: false
  })

  const allPlayers = liveRound.teams.flatMap(t => t.players.filter(p => !p.isDNF))

  const setupSkinsMatch = () => {
    setSkinsMatch({
      settings: { ...settings },
      participants: []
    })
    setShowSetup(false)
  }

  const toggleParticipant = (playerId) => {
    if (!skinsMatch) return
    const isIn = skinsMatch.participants.includes(String(playerId))
    const newParticipants = isIn
      ? skinsMatch.participants.filter(id => id !== String(playerId))
      : [...skinsMatch.participants, String(playerId)]
    setSkinsMatch({ ...skinsMatch, participants: newParticipants })
  }

  const calculateSkins = () => {
    if (!skinsMatch || skinsMatch.participants.length < 2) return []

    const results = []
    const skinsPlayers = allPlayers.filter(p => skinsMatch.participants.includes(String(p.id)))
    let carryover = 0

    for (let hole = 1; hole <= 18; hole++) {
      const holeInfo = getHoleInfo(hole)
      const scores = skinsPlayers
        .map(p => ({ player: p, score: p.scores?.[hole] }))
        .filter(s => s.score && s.score !== 'X')

      if (scores.length === 0) {
        results.push({ hole, status: 'incomplete', carryover })
        continue
      }

      const minScore = Math.min(...scores.map(s => s.score))
      const winners = scores.filter(s => s.score === minScore)

      if (winners.length === 1) {
        const winner = winners[0]
        if (skinsMatch.settings.parOrBetterRequired && winner.score > holeInfo.par) {
          results.push({ hole, status: 'no-winner', reason: 'Not par or better', carryover })
          if (skinsMatch.settings.carryovers) carryover++
        } else {
          results.push({
            hole,
            status: 'won',
            winner: winner.player,
            score: winner.score,
            value: 1 + carryover
          })
          carryover = 0
        }
      } else {
        results.push({ hole, status: 'tie', carryover })
        if (skinsMatch.settings.carryovers) carryover++
      }
    }
    return results
  }

  const skinsResults = skinsMatch ? calculateSkins() : []
  const skinsSummary = {}
  skinsResults.filter(r => r.status === 'won').forEach(r => {
    const id = r.winner.id
    if (!skinsSummary[id]) skinsSummary[id] = { player: r.winner, skins: 0, value: 0 }
    skinsSummary[id].skins++
    skinsSummary[id].value += r.value
  })

  if (!skinsMatch) {
    return (
      <div>
        <div style={{
          background: '#fff3e0',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: '15px' }}>No Skins Match Active</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Set up a skins match to track individual hole winners.
          </p>
          <button className="btn btn-primary" onClick={() => setShowSetup(true)}>
            Setup Skins Match
          </button>
        </div>

        {showSetup && (
          <div className="modal-overlay" onClick={() => setShowSetup(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Skins Match Settings</h3>
                <button className="modal-close" onClick={() => setShowSetup(false)}>&times;</button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label>Cost Per Skin ($)</label>
                  <input
                    type="number"
                    value={settings.costPerSkin}
                    onChange={e => setSettings({ ...settings, costPerSkin: parseFloat(e.target.value) || 1 })}
                    min="0.5"
                    step="0.5"
                  />
                </div>
                <div className="input-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.carryovers}
                      onChange={e => setSettings({ ...settings, carryovers: e.target.checked })}
                      style={{ marginRight: '8px' }}
                    />
                    Carryovers on ties
                  </label>
                </div>
                <div className="input-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.parOrBetterRequired}
                      onChange={e => setSettings({ ...settings, parOrBetterRequired: e.target.checked })}
                      style={{ marginRight: '8px' }}
                    />
                    Par or better required to win
                  </label>
                </div>
                <button className="btn btn-primary" onClick={setupSkinsMatch} style={{ width: '100%', marginTop: '15px' }}>
                  Start Skins Match
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
        color: 'white',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Skins Match Active</strong>
            <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
              ${skinsMatch.settings.costPerSkin}/skin
              {skinsMatch.settings.carryovers && ' | Carryovers'}
              {skinsMatch.settings.parOrBetterRequired && ' | Par+'}
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setSkinsMatch(null)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '8px 15px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '10px' }}>Participants ({skinsMatch.participants.length})</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {allPlayers.map(player => {
            const isIn = skinsMatch.participants.includes(String(player.id))
            return (
              <button
                key={player.id}
                onClick={() => toggleParticipant(player.id)}
                style={{
                  padding: '8px 15px',
                  borderRadius: '20px',
                  border: isIn ? '2px solid #f39c12' : '1px solid #ddd',
                  background: isIn ? '#fff3e0' : 'white',
                  cursor: 'pointer',
                  fontWeight: isIn ? '600' : 'normal'
                }}
              >
                {player.name} {isIn ? '(IN)' : ''}
              </button>
            )
          })}
        </div>
      </div>

      {Object.keys(skinsSummary).length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '10px' }}>Current Standings</h4>
          {Object.values(skinsSummary)
            .sort((a, b) => b.value - a.value)
            .map(s => (
              <div key={s.player.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 15px',
                background: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '8px'
              }}>
                <span style={{ fontWeight: '600' }}>{s.player.name}</span>
                <span>
                  {s.skins} skin{s.skins !== 1 ? 's' : ''} ({s.value} total)
                  <span style={{ color: '#27ae60', marginLeft: '10px' }}>
                    +${(s.value * skinsMatch.settings.costPerSkin).toFixed(2)}
                  </span>
                </span>
              </div>
            ))}
        </div>
      )}

      <div>
        <h4 style={{ marginBottom: '10px' }}>Hole Results</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
          {skinsResults.map(r => (
            <div
              key={r.hole}
              style={{
                padding: '10px',
                borderRadius: '8px',
                textAlign: 'center',
                background: r.status === 'won' ? '#d4edda'
                  : r.status === 'tie' ? '#fff3e0'
                  : r.status === 'incomplete' ? '#f8f9fa'
                  : '#ffebee',
                border: r.status === 'won' ? '2px solid #27ae60' : '1px solid #e0e0e0'
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>#{r.hole}</div>
              {r.status === 'won' && (
                <div style={{ fontSize: '11px', color: '#27ae60' }}>
                  {r.winner.name.split(' ')[0]}
                  {r.value > 1 && <div>+{r.value - 1} CO</div>}
                </div>
              )}
              {r.status === 'tie' && (
                <div style={{ fontSize: '11px', color: '#f39c12' }}>Tie</div>
              )}
              {r.status === 'incomplete' && (
                <div style={{ fontSize: '11px', color: '#999' }}>--</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Money Tracker Component
function MoneyTracker({ liveRound, payoutFormats, holeInOnePot, skinsMatch }) {
  const settlement = calculateRoundSettlement(liveRound, payoutFormats, holeInOnePot, skinsMatch)

  if (!settlement) {
    return (
      <div className="alert alert-warning">
        Unable to calculate settlement. Make sure teams have scores entered.
      </div>
    )
  }

  return (
    <div>
      {/* Format Info */}
      <div style={{
        background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
        color: 'white',
        padding: '15px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{settlement.formatName}</div>
        <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '5px' }}>
          {settlement.totalPlayers} players |
          Front 9: ${settlement.pools.front9} |
          Back 9: ${settlement.pools.back9}
          {settlement.pools.overall > 0 && ` | Overall: $${settlement.pools.overall}`}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
          Greenies: ${settlement.pools.greeniePerHole}/hole
          {settlement.hio.enabled && ` | HIO Pot: $${settlement.hio.contribution}`}
        </div>
      </div>

      {/* Completion Status */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px'
      }}>
        <div style={{
          flex: 1,
          padding: '10px',
          background: settlement.completion.front9 ? '#d4edda' : '#fff3cd',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 'bold' }}>Front 9</div>
          <div style={{ fontSize: '13px' }}>{settlement.completion.front9 ? 'Complete' : 'In Progress'}</div>
        </div>
        <div style={{
          flex: 1,
          padding: '10px',
          background: settlement.completion.back9 ? '#d4edda' : '#fff3cd',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 'bold' }}>Back 9</div>
          <div style={{ fontSize: '13px' }}>{settlement.completion.back9 ? 'Complete' : 'In Progress'}</div>
        </div>
      </div>

      {/* Team Results */}
      <h4 style={{ marginBottom: '10px' }}>Team Results</h4>
      {settlement.teamSettlements.map(team => (
        <div key={team.teamId} style={{
          background: team.net > 0 ? '#d4edda' : team.net < 0 ? '#f8f9fa' : '#fff',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '10px',
          border: team.net > 0 ? '2px solid #27ae60' : '1px solid #e0e0e0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{team.teamName}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {team.wins.length > 0 ? `Won: ${team.wins.join(', ')}` : 'No wins yet'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontWeight: 'bold',
                fontSize: '18px',
                color: team.net > 0 ? '#27ae60' : team.net < 0 ? '#e74c3c' : '#333'
              }}>
                {formatMoney(team.net)}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                per player: {formatMoney(team.perPlayerNet)}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Greenie Results */}
      <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Greenies</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {[4, 8, 12, 17].map(hole => {
          const result = settlement.greenieResults[hole]
          return (
            <div key={hole} style={{
              background: result?.winner ? '#d4edda' : '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              textAlign: 'center',
              border: result?.winner ? '2px solid #27ae60' : '1px solid #e0e0e0'
            }}>
              <div style={{ fontWeight: 'bold' }}>Hole {hole}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>Pot: ${result?.pot || 0}</div>
              {result?.winnerName ? (
                <div style={{ fontSize: '13px', color: '#27ae60', marginTop: '5px', fontWeight: '500' }}>
                  {result.winnerName}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>No winner</div>
              )}
            </div>
          )
        })}
      </div>
      {settlement.carryoverRemaining > 0 && (
        <div style={{ marginTop: '10px', fontSize: '13px', color: '#f39c12' }}>
          Carryover: ${settlement.carryoverRemaining}
        </div>
      )}

      {/* Player Breakdown */}
      <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Player Breakdown</h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Player</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Team</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Greenies</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Net</th>
            </tr>
          </thead>
          <tbody>
            {settlement.playerSettlements
              .sort((a, b) => b.leagueNet - a.leagueNet)
              .map(player => (
                <tr key={player.playerId} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={{ padding: '10px' }}>
                    {player.playerName}
                    {player.isDNF && <span style={{ color: '#e74c3c', marginLeft: '5px' }}>(DNF)</span>}
                  </td>
                  <td style={{
                    padding: '10px',
                    textAlign: 'right',
                    color: player.team.net >= 0 ? '#27ae60' : '#e74c3c'
                  }}>
                    {formatMoney(player.team.net)}
                  </td>
                  <td style={{
                    padding: '10px',
                    textAlign: 'right',
                    color: player.greenies.net >= 0 ? '#27ae60' : '#e74c3c'
                  }}>
                    {formatMoney(player.greenies.net)}
                  </td>
                  <td style={{
                    padding: '10px',
                    textAlign: 'right',
                    fontWeight: 'bold',
                    color: player.leagueNet > 0 ? '#27ae60' : player.leagueNet < 0 ? '#e74c3c' : '#333'
                  }}>
                    {formatMoney(player.leagueNet)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Main LivePage Component
function LivePage() {
  const navigate = useNavigate()
  const {
    liveRound,
    setLiveRound,
    players,
    setPlayers,
    history,
    setHistory,
    teams,
    setTeams,
    skinsMatch,
    setSkinsMatch,
    isAdmin,
    payoutFormats,
    holeInOnePot,
    quickSkinsMode,
    setQuickSkinsMode
  } = useLeague()

  const [subTab, setSubTab] = useState(quickSkinsMode ? 'skins' : 'leaderboard')
  const [selectedTeamId, setSelectedTeamId] = useState(liveRound?.teams[0]?.id || 0)
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [finishPin, setFinishPin] = useState('')

  if (!liveRound) {
    return (
      <div>
        <h2 style={{ marginBottom: '20px' }}>Live Round</h2>
        <div className="alert alert-info">
          No active round. Generate teams and click "Start Live Round" to begin.
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/teams')}
          style={{ marginTop: '15px' }}
        >
          Go to Teams
        </button>
      </div>
    )
  }

  const updateScore = (teamId, playerId, hole, score) => {
    setLiveRound({
      ...liveRound,
      teams: liveRound.teams.map(team => {
        if (team.id !== teamId) return team
        return {
          ...team,
          players: team.players.map(player => {
            if (player.id !== playerId) return player
            return {
              ...player,
              scores: { ...player.scores, [hole]: score }
            }
          })
        }
      })
    })
  }

  const updateGreenie = (hole, player) => {
    const updatedTeams = liveRound.teams.map(team => ({
      ...team,
      greenies: { ...team.greenies, [hole]: null }
    }))

    if (player) {
      const playerTeam = liveRound.teams.find(t => t.players.some(p => p.id === player.id))
      if (playerTeam) {
        const teamIndex = updatedTeams.findIndex(t => t.id === playerTeam.id)
        updatedTeams[teamIndex] = {
          ...updatedTeams[teamIndex],
          greenies: {
            ...updatedTeams[teamIndex].greenies,
            [hole]: { playerId: player.id, playerName: player.name }
          }
        }
      }
    }

    setLiveRound({ ...liveRound, teams: updatedTeams })
  }

  const markPlayerDNF = (teamId, playerId, includeScores, paymentStatus, greeniesOwed) => {
    const allHoles = getAllHoles()
    setLiveRound({
      ...liveRound,
      teams: liveRound.teams.map(team => {
        if (team.id !== teamId) return team
        return {
          ...team,
          players: team.players.map(player => {
            if (player.id !== playerId) return player
            const updatedScores = { ...player.scores }
            const autoFilledXHoles = []
            allHoles.forEach(holeInfo => {
              if (!updatedScores[holeInfo.hole] || updatedScores[holeInfo.hole] === '') {
                updatedScores[holeInfo.hole] = 'X'
                autoFilledXHoles.push(holeInfo.hole)
              }
            })
            return {
              ...player,
              isDNF: true,
              includeInTeamScore: includeScores,
              paymentStatus,
              greeniesOwed,
              scores: updatedScores,
              autoFilledXHoles
            }
          })
        }
      })
    })
  }

  const undoPlayerDNF = (teamId, playerId) => {
    setLiveRound({
      ...liveRound,
      teams: liveRound.teams.map(team => {
        if (team.id !== teamId) return team
        return {
          ...team,
          players: team.players.map(player => {
            if (player.id !== playerId) return player
            const updatedScores = { ...player.scores }
            const autoFilledXHoles = player.autoFilledXHoles || []
            autoFilledXHoles.forEach(hole => {
              if (updatedScores[hole] === 'X') {
                updatedScores[hole] = ''
              }
            })
            return {
              ...player,
              isDNF: false,
              includeInTeamScore: true,
              scores: updatedScores,
              autoFilledXHoles: []
            }
          })
        }
      })
    })
  }

  const addLatePlayer = (teamId, player, paymentStatus) => {
    setLiveRound({
      ...liveRound,
      teams: liveRound.teams.map(team => {
        if (team.id !== teamId) return team
        return {
          ...team,
          players: [
            ...team.players,
            {
              id: player.id,
              name: player.name,
              skillRating: player.skillRating,
              scores: {},
              isDNF: false,
              includeInTeamScore: paymentStatus !== 'none',
              joinedLate: true,
              paymentStatus
            }
          ]
        }
      })
    })
  }

  const finishRound = () => {
    if (finishPin !== '1234') {
      alert('Incorrect PIN')
      setFinishPin('')
      return
    }

    const roundData = {
      id: liveRound.id,
      date: liveRound.date,
      teams: liveRound.teams.map(team => ({
        ...team,
        front9Score: calculateTeamScore(team, 1, 9),
        back9Score: calculateTeamScore(team, 10, 18),
        totalScore: calculateTeamScore(team, 1, 9) + calculateTeamScore(team, 10, 18)
      })),
      skinsMatch: skinsMatch ? { ...skinsMatch } : null
    }

    const updatedPlayers = players.map(player => {
      const roundPlayer = liveRound.teams.flatMap(t => t.players).find(p => p.id === player.id)
      if (!roundPlayer || roundPlayer.isDNF) return player

      const scores = roundPlayer.scores
      let front9 = 0, back9 = 0
      for (let h = 1; h <= 9; h++) if (scores[h] && scores[h] !== 'X') front9 += scores[h]
      for (let h = 10; h <= 18; h++) if (scores[h] && scores[h] !== 'X') back9 += scores[h]
      const total = front9 + back9

      if (total === 0) return player

      const newGamesPlayed = (player.gamesPlayed || 0) + 1
      const newScoreHistory = [
        ...(player.scoreHistory || []),
        {
          id: Date.now() + player.id,
          date: liveRound.date,
          frontNineScore: front9,
          backNineScore: back9,
          totalScore: total
        }
      ]

      const validRounds = newScoreHistory.filter(r => r.totalScore > 0)
      const avgTotal = validRounds.length > 0
        ? validRounds.reduce((sum, r) => sum + r.totalScore, 0) / validRounds.length
        : 0
      const avgFront = validRounds.length > 0
        ? validRounds.reduce((sum, r) => sum + (r.frontNineScore || 0), 0) / validRounds.length
        : 0
      const avgBack = validRounds.length > 0
        ? validRounds.reduce((sum, r) => sum + (r.backNineScore || 0), 0) / validRounds.length
        : 0

      return {
        ...player,
        gamesPlayed: newGamesPlayed,
        scoreHistory: newScoreHistory,
        avgTotal,
        avgFrontNine: avgFront,
        avgBackNine: avgBack
      }
    })

    setPlayers(updatedPlayers)
    setHistory([roundData, ...history])
    setLiveRound(null)
    setTeams([])
    setSkinsMatch(null)
    setShowFinishConfirm(false)
    navigate('/history')
  }

  // End Quick Skins game
  const endQuickSkins = () => {
    if (confirm('End Quick Skins game? All data will be lost.')) {
      setLiveRound(null)
      setSkinsMatch(null)
      setQuickSkinsMode(false)
      navigate('/settings')
    }
  }

  // Define tabs based on mode
  const subTabs = quickSkinsMode
    ? [
        { id: 'scoring', label: 'Scores' },
        { id: 'skins', label: 'Skins' },
        ...(liveRound?.quickSkinsGreenieSettings ? [{ id: 'greenies', label: 'Greenies' }] : [])
      ]
    : [
        { id: 'leaderboard', label: 'Board' },
        { id: 'scoring', label: 'Scores' },
        { id: 'greenies', label: 'Greenies' },
        { id: 'skins', label: 'Skins' },
        { id: 'money', label: 'Money' },
        { id: 'manage', label: 'Manage' }
      ]

  return (
    <div>
      {/* Quick Skins Mode Banner */}
      {quickSkinsMode && (
        <div style={{
          background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '10px',
          marginBottom: '15px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Quick Skins Game</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              Informal skins match - no stats saved
            </div>
          </div>
          <button
            onClick={endQuickSkins}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            End Game
          </button>
        </div>
      )}

      <h2 style={{ marginBottom: '20px' }}>{quickSkinsMode ? 'Quick Skins Game' : 'Live Round Scoring'}</h2>

      <div style={{
        display: 'flex',
        gap: '0',
        marginBottom: '20px',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '2px solid #27ae60'
      }}>
        {subTabs.map((tab, idx) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            style={{
              flex: 1,
              padding: '12px 4px',
              border: 'none',
              borderLeft: idx > 0 ? '1px solid #27ae60' : 'none',
              background: subTab === tab.id ? '#27ae60' : 'white',
              color: subTab === tab.id ? 'white' : '#27ae60',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'leaderboard' && <Leaderboard liveRound={liveRound} />}
      {subTab === 'scoring' && (
        <ScoringGrid
          liveRound={liveRound}
          onUpdateScore={updateScore}
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={setSelectedTeamId}
        />
      )}
      {subTab === 'greenies' && (
        <GreeniesTracker
          liveRound={liveRound}
          onUpdateGreenie={updateGreenie}
        />
      )}
      {subTab === 'skins' && (
        <SkinsTracker
          liveRound={liveRound}
          skinsMatch={skinsMatch}
          setSkinsMatch={setSkinsMatch}
          isAdmin={isAdmin}
        />
      )}
      {subTab === 'money' && (
        <MoneyTracker
          liveRound={liveRound}
          payoutFormats={payoutFormats}
          holeInOnePot={holeInOnePot}
          skinsMatch={skinsMatch}
        />
      )}
      {subTab === 'manage' && (
        <div>
          <DNFManager
            liveRound={liveRound}
            onMarkDNF={markPlayerDNF}
            onUndoDNF={undoPlayerDNF}
            isAdmin={isAdmin}
          />
          <LatePlayerManager
            liveRound={liveRound}
            players={players}
            onAddLatePlayer={addLatePlayer}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* Finish Round - only show for regular league rounds, not Quick Skins */}
      {isAdmin && !quickSkinsMode && (
        <div style={{ marginTop: '30px' }}>
          {showFinishConfirm ? (
            <div style={{
              background: '#fff3cd',
              padding: '20px',
              borderRadius: '10px',
              border: '2px solid #f9a825'
            }}>
              <h3 style={{ marginBottom: '15px' }}>Finish Round?</h3>
              <p style={{ marginBottom: '15px', color: '#666' }}>
                This will save all scores to history and update player statistics.
              </p>
              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label>Enter Admin PIN to confirm</label>
                <input
                  type="password"
                  value={finishPin}
                  onChange={(e) => setFinishPin(e.target.value)}
                  placeholder="Enter PIN"
                  maxLength={4}
                  style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '5px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={finishRound} style={{ flex: 1 }}>
                  Finish Round
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setShowFinishConfirm(false); setFinishPin('') }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn"
              onClick={() => setShowFinishConfirm(true)}
              style={{
                width: '100%',
                padding: '15px',
                background: '#e74c3c',
                color: 'white',
                fontSize: '16px'
              }}
            >
              Finish Round
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default LivePage
