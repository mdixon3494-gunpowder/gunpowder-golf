import { useState } from 'react'
import { useLeague } from '../context/LeagueContext'

function formatRelativeToPar(score) {
  if (score === 0) return 'E'
  if (score > 0) return `+${score}`
  return score.toString()
}

function RoundCard({ round, onView, onDelete, isAdmin }) {
  const date = new Date(round.date)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  // Find winning team
  const sortedTeams = [...(round.teams || [])].sort((a, b) =>
    (a.totalScore || 0) - (b.totalScore || 0)
  )
  const winner = sortedTeams[0]

  return (
    <div style={{
      background: 'white',
      borderRadius: '10px',
      marginBottom: '15px',
      overflow: 'hidden',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        color: 'white',
        padding: '15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '16px' }}>{formattedDate}</div>
          <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
            {round.teams?.length || 0} teams
          </div>
        </div>
        {winner && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Winner</div>
            <div style={{ fontWeight: '600' }}>{winner.name}</div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: (winner.totalScore || 0) < 0 ? '#2ecc71' : (winner.totalScore || 0) > 0 ? '#e74c3c' : '#fff'
            }}>
              {formatRelativeToPar(winner.totalScore || 0)}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '15px' }}>
        {/* Team scores summary */}
        {round.teams?.map((team, idx) => (
          <div key={team.id || idx} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px',
            background: idx === 0 ? '#fff8e1' : (idx % 2 === 0 ? '#f8f9fa' : 'white'),
            borderRadius: '6px',
            marginBottom: '6px',
            border: idx === 0 ? '1px solid #f9a825' : 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: idx === 0 ? '#f9a825' : '#95a5a6',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {idx + 1}
              </span>
              <span style={{ fontWeight: idx === 0 ? '600' : 'normal' }}>{team.name}</span>
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>
                F9: {formatRelativeToPar(team.front9Score || 0)}
              </span>
              <span style={{ fontSize: '12px', color: '#666' }}>
                B9: {formatRelativeToPar(team.back9Score || 0)}
              </span>
              <span style={{
                fontWeight: 'bold',
                color: (team.totalScore || 0) < 0 ? '#27ae60' : (team.totalScore || 0) > 0 ? '#e74c3c' : '#333'
              }}>
                {formatRelativeToPar(team.totalScore || 0)}
              </span>
            </div>
          </div>
        ))}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button
            className="btn btn-primary"
            onClick={() => onView(round)}
            style={{ flex: 1 }}
          >
            View Details
          </button>
          {isAdmin && (
            <button
              className="btn btn-secondary"
              onClick={() => onDelete(round)}
              style={{ background: '#e74c3c', color: 'white' }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function RoundDetailModal({ round, onClose }) {
  if (!round) return null

  const date = new Date(round.date)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="modal-header">
          <h3>Round Details - {formattedDate}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {round.teams?.map((team, teamIdx) => (
            <div key={team.id || teamIdx} style={{ marginBottom: '20px' }}>
              <div style={{
                background: teamIdx === 0
                  ? 'linear-gradient(135deg, #f9a825 0%, #f57c00 100%)'
                  : 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)',
                color: 'white',
                padding: '12px 15px',
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>{team.name}</span>
                  <span style={{ marginLeft: '10px', fontSize: '12px', opacity: 0.9 }}>
                    ({team.players?.length || 0} players)
                  </span>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                  {formatRelativeToPar(team.totalScore || 0)}
                </div>
              </div>

              <div style={{
                background: '#f8f9fa',
                borderRadius: '0 0 8px 8px',
                border: '1px solid #e0e0e0',
                borderTop: 'none'
              }}>
                {team.players?.map((player, playerIdx) => {
                  // Calculate player totals
                  let front9 = 0, back9 = 0
                  for (let h = 1; h <= 9; h++) if (player.scores?.[h]) front9 += player.scores[h]
                  for (let h = 10; h <= 18; h++) if (player.scores?.[h]) back9 += player.scores[h]
                  const total = front9 + back9

                  return (
                    <div key={player.id} style={{
                      padding: '10px 15px',
                      borderBottom: playerIdx < team.players.length - 1 ? '1px solid #e0e0e0' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <span style={{ fontWeight: '500' }}>{player.name}</span>
                        {player.isDNF && (
                          <span style={{
                            marginLeft: '8px',
                            background: '#e74c3c',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px'
                          }}>
                            DNF
                          </span>
                        )}
                      </div>
                      {!player.isDNF && total > 0 && (
                        <div style={{ display: 'flex', gap: '15px', fontSize: '13px' }}>
                          <span style={{ color: '#666' }}>F9: {front9}</span>
                          <span style={{ color: '#666' }}>B9: {back9}</span>
                          <span style={{ fontWeight: 'bold' }}>Total: {total}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Greenies section */}
          {round.teams?.some(t => t.greenies && Object.values(t.greenies).some(g => g)) && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '10px' }}>Greenies</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[4, 8, 12, 17].map(hole => {
                  const greenie = round.teams
                    ?.flatMap(t => t.greenies?.[hole] ? [t.greenies[hole]] : [])
                    ?.[0]
                  return (
                    <div key={hole} style={{
                      background: greenie ? '#d4edda' : '#f8f9fa',
                      padding: '12px',
                      borderRadius: '8px',
                      textAlign: 'center',
                      border: greenie ? '2px solid #27ae60' : '1px solid #e0e0e0'
                    }}>
                      <div style={{ fontWeight: 'bold' }}>Hole {hole}</div>
                      <div style={{ fontSize: '13px', color: greenie ? '#27ae60' : '#999', marginTop: '4px' }}>
                        {greenie?.playerName || 'No winner'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ round, onConfirm, onCancel }) {
  const [pin, setPin] = useState('')

  const handleDelete = () => {
    if (pin === '1234') {
      onConfirm(round.id)
    } else {
      alert('Incorrect PIN')
      setPin('')
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Delete Round?</h3>
          <button className="modal-close" onClick={onCancel}>&times;</button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>Warning</div>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            This action cannot be undone. All round data will be permanently deleted.
          </p>
          <div className="input-group">
            <label>Enter Admin PIN to confirm</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              maxLength={4}
              style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '5px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
            <button className="btn btn-danger" onClick={handleDelete}>Delete Round</button>
            <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HistoryPage() {
  const { history, setHistory, isAdmin } = useLeague()
  const [viewingRound, setViewingRound] = useState(null)
  const [deletingRound, setDeletingRound] = useState(null)

  const handleDeleteRound = (roundId) => {
    setHistory(history.filter(r => r.id !== roundId))
    setDeletingRound(null)
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Round History</h2>

      {history.length === 0 ? (
        <div className="empty-state">
          <h3>No Rounds Yet</h3>
          <p>Completed rounds will appear here with full scoring details.</p>
        </div>
      ) : (
        <>
          <div className="alert alert-info" style={{ marginBottom: '20px' }}>
            {history.length} round{history.length !== 1 ? 's' : ''} recorded
          </div>

          {history.map(round => (
            <RoundCard
              key={round.id}
              round={round}
              onView={setViewingRound}
              onDelete={setDeletingRound}
              isAdmin={isAdmin}
            />
          ))}
        </>
      )}

      {/* Detail Modal */}
      {viewingRound && (
        <RoundDetailModal
          round={viewingRound}
          onClose={() => setViewingRound(null)}
        />
      )}

      {/* Delete Confirm Modal */}
      {deletingRound && (
        <DeleteConfirmModal
          round={deletingRound}
          onConfirm={handleDeleteRound}
          onCancel={() => setDeletingRound(null)}
        />
      )}
    </div>
  )
}

export default HistoryPage
