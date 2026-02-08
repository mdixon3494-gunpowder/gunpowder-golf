import { useState, useEffect } from 'react'
import { getRoundHistoryByType } from '../lib/roundHistoryService'
import { GUNPOWDER_SCORECARD, getHoleInfo } from '../lib/courseData'

function RoundHistoryPage({ profile, onBack }) {
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedRound, setExpandedRound] = useState(null)

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false)
      return
    }
    getRoundHistoryByType(profile.id, 'individual').then(data => {
      setRounds(data)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [profile?.id])

  // Stats calculations
  const totalRounds = rounds.length
  const roundsWithScores = rounds.filter(r => r.total_score && r.total_score > 0)
  const averageScore = roundsWithScores.length > 0
    ? Math.round((roundsWithScores.reduce((sum, r) => {
        // Normalize 9-hole rounds to 18-hole equivalent for average
        if (r.holes_played === 9 && r.total_score) return sum + (r.total_score * 2)
        return sum + r.total_score
      }, 0) / roundsWithScores.length) * 10) / 10
    : null
  const bestRound = roundsWithScores.length > 0
    ? roundsWithScores.reduce((best, r) => {
        // Only compare 18-hole rounds for "best round"
        if (r.holes_played === 9) return best
        if (!best || r.total_score < best.total_score) return r
        return best
      }, null)
    : null

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getTeeLabel = (tee) => {
    const labels = { gold: 'Gold', blue: 'Blue', red: 'Red' }
    return labels[tee] || tee || 'Blue'
  }

  const getTeeColor = (tee) => {
    const colors = { gold: '#f9a825', blue: '#3498db', red: '#e74c3c' }
    return colors[tee] || '#3498db'
  }

  const allHoles = [...GUNPOWDER_SCORECARD.front9, ...GUNPOWDER_SCORECARD.back9]
  const totalPar = allHoles.reduce((s, h) => s + h.par, 0)
  const front9Par = GUNPOWDER_SCORECARD.front9.reduce((s, h) => s + h.par, 0)
  const back9Par = GUNPOWDER_SCORECARD.back9.reduce((s, h) => s + h.par, 0)

  const getParForRound = (round) => {
    if (round.holes_played === 9) {
      const start = round.metadata?.startingHole || 1
      return start === 1 ? front9Par : back9Par
    }
    return totalPar
  }

  const formatVsPar = (score, par) => {
    if (!score) return '--'
    const diff = score - par
    if (diff === 0) return 'E'
    return diff > 0 ? `+${diff}` : `${diff}`
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Gunpowder Big Boy's Golf</h1>
        <div style={{ marginTop: '8px', fontSize: '15px', opacity: 0.9 }}>
          Round History
        </div>
      </header>

      <div className="content" style={{ paddingBottom: '40px' }}>
        <div style={{ maxWidth: '440px', margin: '0 auto' }}>

          {/* Back button */}
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#3498db',
              fontSize: '15px',
              cursor: 'pointer',
              padding: '8px 0',
              marginBottom: '16px',
              fontWeight: '600'
            }}
          >
            &larr; Back
          </button>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
              <div className="spinner-tiny" style={{ margin: '0 auto 10px' }} />
              Loading rounds...
            </div>
          ) : rounds.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#888'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>&#9971;</div>
              <div style={{ fontSize: '16px', marginBottom: '8px', fontWeight: '600' }}>
                No rounds yet
              </div>
              <div style={{ fontSize: '14px' }}>
                Start tracking your scores with Individual Play!
              </div>
            </div>
          ) : (
            <>
              {/* Stats Summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '10px',
                marginBottom: '20px'
              }}>
                <div style={{
                  background: 'white',
                  padding: '16px 12px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>{totalRounds}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Rounds</div>
                </div>
                <div style={{
                  background: 'white',
                  padding: '16px 12px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
                    {averageScore || '--'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Avg (18h)</div>
                </div>
                <div style={{
                  background: 'white',
                  padding: '16px 12px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f39c12' }}>
                    {bestRound ? bestRound.total_score : '--'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Best (18h)</div>
                </div>
              </div>

              {/* Round List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {rounds.map(round => {
                  const roundPar = getParForRound(round)
                  const isExpanded = expandedRound === round.id
                  const tee = round.metadata?.tee || 'blue'
                  const startingHole = round.metadata?.startingHole || 1

                  return (
                    <div
                      key={round.id}
                      style={{
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid #e0e0e0',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Round Summary Row */}
                      <button
                        onClick={() => setExpandedRound(isExpanded ? null : round.id)}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
                              {formatDate(round.date)}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                              <span style={{
                                background: getTeeColor(tee),
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: '600'
                              }}>
                                {getTeeLabel(tee)}
                              </span>
                              <span style={{ fontSize: '12px', color: '#888' }}>
                                {round.holes_played === 9 ? `9 holes (${startingHole === 1 ? 'Front' : 'Back'})` : '18 holes'}
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#333' }}>
                              {round.total_score || '--'}
                            </div>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: '600',
                              color: round.total_score && round.total_score > roundPar ? '#e74c3c'
                                : round.total_score && round.total_score < roundPar ? '#27ae60'
                                : '#888'
                            }}>
                              {formatVsPar(round.total_score, roundPar)}
                            </div>
                          </div>
                        </div>
                        {round.holes_played !== 9 && round.front_nine && round.back_nine && (
                          <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
                            Front: {round.front_nine} | Back: {round.back_nine}
                          </div>
                        )}
                      </button>

                      {/* Expanded hole-by-hole scores */}
                      {isExpanded && round.scores && (
                        <div style={{ borderTop: '1px solid #e0e0e0', padding: '12px' }}>
                          {/* Front 9 */}
                          {(round.holes_played !== 9 || startingHole === 1) && (
                            <div style={{ overflowX: 'auto', marginBottom: round.holes_played !== 9 ? '10px' : '0' }}>
                              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', minWidth: '300px' }}>
                                <thead>
                                  <tr style={{ background: '#27ae60', color: 'white' }}>
                                    <th style={{ padding: '5px 3px', textAlign: 'left', minWidth: '35px' }}>Hole</th>
                                    {GUNPOWDER_SCORECARD.front9.map(h => (
                                      <th key={h.hole} style={{ padding: '5px 2px', textAlign: 'center', minWidth: '22px' }}>{h.hole}</th>
                                    ))}
                                    <th style={{ padding: '5px 3px', textAlign: 'center', background: '#229954' }}>OUT</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr style={{ background: '#f0f0f0' }}>
                                    <td style={{ padding: '4px 3px', fontWeight: 'bold', fontSize: '10px' }}>Par</td>
                                    {GUNPOWDER_SCORECARD.front9.map(h => (
                                      <td key={h.hole} style={{ padding: '4px 2px', textAlign: 'center', fontSize: '10px' }}>{h.par}</td>
                                    ))}
                                    <td style={{ padding: '4px 3px', textAlign: 'center', fontWeight: 'bold', fontSize: '10px' }}>{front9Par}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '4px 3px', fontWeight: 'bold', fontSize: '10px' }}>Score</td>
                                    {GUNPOWDER_SCORECARD.front9.map(h => {
                                      const score = round.scores[h.hole] || round.scores[String(h.hole)]
                                      const diff = score ? parseInt(score) - h.par : null
                                      return (
                                        <td key={h.hole} style={{ padding: '2px', textAlign: 'center' }}>
                                          <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minWidth: '20px',
                                            height: '20px',
                                            borderRadius: diff !== null && diff <= -1 ? '50%' : '0',
                                            border: diff !== null && diff <= -2 ? '2px double #f39c12'
                                              : diff === -1 ? '2px solid #27ae60' : 'none',
                                            background: diff !== null && diff <= -2 ? '#fff8e1'
                                              : diff === -1 ? '#e8f5e9' : 'transparent',
                                            fontWeight: 'bold',
                                            fontSize: '11px',
                                            color: '#333'
                                          }}>
                                            {score || '-'}
                                          </div>
                                        </td>
                                      )
                                    })}
                                    <td style={{ padding: '4px 3px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', background: '#e8f5e9' }}>
                                      {round.front_nine || '--'}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Back 9 */}
                          {(round.holes_played !== 9 || startingHole === 10) && (
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', minWidth: '300px' }}>
                                <thead>
                                  <tr style={{ background: '#ef6c00', color: 'white' }}>
                                    <th style={{ padding: '5px 3px', textAlign: 'left', minWidth: '35px' }}>Hole</th>
                                    {GUNPOWDER_SCORECARD.back9.map(h => (
                                      <th key={h.hole} style={{ padding: '5px 2px', textAlign: 'center', minWidth: '22px' }}>{h.hole}</th>
                                    ))}
                                    <th style={{ padding: '5px 3px', textAlign: 'center', background: '#e65100' }}>IN</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr style={{ background: '#f0f0f0' }}>
                                    <td style={{ padding: '4px 3px', fontWeight: 'bold', fontSize: '10px' }}>Par</td>
                                    {GUNPOWDER_SCORECARD.back9.map(h => (
                                      <td key={h.hole} style={{ padding: '4px 2px', textAlign: 'center', fontSize: '10px' }}>{h.par}</td>
                                    ))}
                                    <td style={{ padding: '4px 3px', textAlign: 'center', fontWeight: 'bold', fontSize: '10px' }}>{back9Par}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '4px 3px', fontWeight: 'bold', fontSize: '10px' }}>Score</td>
                                    {GUNPOWDER_SCORECARD.back9.map(h => {
                                      const score = round.scores[h.hole] || round.scores[String(h.hole)]
                                      const diff = score ? parseInt(score) - h.par : null
                                      return (
                                        <td key={h.hole} style={{ padding: '2px', textAlign: 'center' }}>
                                          <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minWidth: '20px',
                                            height: '20px',
                                            borderRadius: diff !== null && diff <= -1 ? '50%' : '0',
                                            border: diff !== null && diff <= -2 ? '2px double #f39c12'
                                              : diff === -1 ? '2px solid #27ae60' : 'none',
                                            background: diff !== null && diff <= -2 ? '#fff8e1'
                                              : diff === -1 ? '#e8f5e9' : 'transparent',
                                            fontWeight: 'bold',
                                            fontSize: '11px',
                                            color: '#333'
                                          }}>
                                            {score || '-'}
                                          </div>
                                        </td>
                                      )
                                    })}
                                    <td style={{ padding: '4px 3px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', background: '#fff3e0' }}>
                                      {round.back_nine || '--'}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoundHistoryPage
