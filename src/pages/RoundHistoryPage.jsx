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
    const colors = { gold: 'var(--color-accent-gold)', blue: 'var(--color-info)', red: 'var(--color-danger)' }
    return colors[tee] || 'var(--color-info)'
  }

  const allHoles = [...GUNPOWDER_SCORECARD.front9, ...GUNPOWDER_SCORECARD.back9]
  const totalPar = allHoles.reduce((s, h) => s + h.par, 0)
  const front9Par = GUNPOWDER_SCORECARD.front9.reduce((s, h) => s + h.par, 0)
  const back9Par = GUNPOWDER_SCORECARD.back9.reduce((s, h) => s + h.par, 0)

  // Aggregate stats across all rounds with holeStats
  const roundsWithStats = rounds.filter(r => r.metadata?.holeStats && Object.keys(r.metadata.holeStats).length > 0)
  const aggregateStats = (() => {
    if (roundsWithStats.length === 0) return null
    let firHoles = 0, firHit = 0, girHoles = 0, girHit = 0
    let totalPutts = 0, puttsCount = 0, totalPenalty = 0
    let scrambleChances = 0, scrambleMade = 0

    roundsWithStats.forEach(r => {
      const hs = r.metadata.holeStats
      const start = r.metadata?.startingHole || 1
      const end = r.holes_played === 9 ? start + 8 : 18
      for (let h = start; h <= end; h++) {
        const s = hs[h] || hs[String(h)]
        if (!s) continue
        const hInfo = allHoles.find(hd => hd.hole === h)
        if (hInfo?.par >= 4) { firHoles++; if (s.fir) firHit++ }
        girHoles++; if (s.gir) girHit++
        if (s.putts != null) { totalPutts += s.putts; puttsCount++ }
        if (s.penalty) totalPenalty += s.penalty
        if (s.gir === false) { scrambleChances++; if (s.scramble) scrambleMade++ }
      }
    })

    return { firHoles, firHit, girHoles, girHit, totalPutts, puttsCount, totalPenalty, scrambleChances, scrambleMade, roundCount: roundsWithStats.length }
  })()

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
              color: 'var(--color-info)',
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
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-tertiary)' }}>
              <div className="spinner-tiny" style={{ margin: '0 auto 10px' }} />
              Loading rounds...
            </div>
          ) : rounds.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--color-text-tertiary)'
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
                  background: 'var(--color-surface)',
                  padding: '16px 12px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid var(--color-border)'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-info)' }}>{totalRounds}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>Rounds</div>
                </div>
                <div style={{
                  background: 'var(--color-surface)',
                  padding: '16px 12px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid var(--color-border)'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-success)' }}>
                    {averageScore || '--'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>Avg (18h)</div>
                </div>
                <div style={{
                  background: 'var(--color-surface)',
                  padding: '16px 12px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid var(--color-border)'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-skins)' }}>
                    {bestRound ? bestRound.total_score : '--'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>Best (18h)</div>
                </div>
              </div>

              {/* Aggregate Stats */}
              {aggregateStats && (
                <div style={{
                  background: 'var(--color-surface)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Stats ({aggregateStats.roundCount} round{aggregateStats.roundCount !== 1 ? 's' : ''})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                    {aggregateStats.firHoles > 0 && (
                      <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--color-surface-sunken)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                          {Math.round(aggregateStats.firHit / aggregateStats.firHoles * 100)}%
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>FIR</div>
                      </div>
                    )}
                    {aggregateStats.girHoles > 0 && (
                      <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--color-surface-sunken)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-success)' }}>
                          {Math.round(aggregateStats.girHit / aggregateStats.girHoles * 100)}%
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>GIR</div>
                      </div>
                    )}
                    {aggregateStats.puttsCount > 0 && (
                      <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--color-surface-sunken)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-info)' }}>
                          {(aggregateStats.totalPutts / aggregateStats.puttsCount).toFixed(1)}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>Putts/Hole</div>
                      </div>
                    )}
                    {aggregateStats.scrambleChances > 0 && (
                      <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--color-surface-sunken)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-accent-blue)' }}>
                          {Math.round(aggregateStats.scrambleMade / aggregateStats.scrambleChances * 100)}%
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>Scramble</div>
                      </div>
                    )}
                    {aggregateStats.totalPenalty > 0 && (
                      <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--color-surface-sunken)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-danger)' }}>
                          {(aggregateStats.totalPenalty / aggregateStats.roundCount).toFixed(1)}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>Pen/Rnd</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                        background: 'var(--color-surface)',
                        borderRadius: '12px',
                        border: '1px solid var(--color-border)',
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
                            <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--color-text-primary)' }}>
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
                              <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                                {round.holes_played === 9 ? `9 holes (${startingHole === 1 ? 'Front' : 'Back'})` : '18 holes'}
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                              {round.total_score || '--'}
                            </div>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: '600',
                              color: round.total_score && round.total_score > roundPar ? 'var(--color-danger)'
                                : round.total_score && round.total_score < roundPar ? 'var(--color-success)'
                                : 'var(--color-text-tertiary)'
                            }}>
                              {formatVsPar(round.total_score, roundPar)}
                            </div>
                          </div>
                        </div>
                        {round.holes_played !== 9 && round.front_nine && round.back_nine && (
                          <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '6px' }}>
                            Front: {round.front_nine} | Back: {round.back_nine}
                          </div>
                        )}
                      </button>

                      {/* Expanded hole-by-hole scores + stats */}
                      {isExpanded && round.scores && (
                        <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px' }}>
                          {/* Front 9 */}
                          {(round.holes_played !== 9 || startingHole === 1) && (
                            <div style={{ overflowX: 'auto', marginBottom: round.holes_played !== 9 ? '10px' : '0' }}>
                              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', minWidth: '300px' }}>
                                <thead>
                                  <tr style={{ background: 'var(--color-success)', color: 'white' }}>
                                    <th style={{ padding: '5px 3px', textAlign: 'left', minWidth: '35px' }}>Hole</th>
                                    {GUNPOWDER_SCORECARD.front9.map(h => (
                                      <th key={h.hole} style={{ padding: '5px 2px', textAlign: 'center', minWidth: '22px' }}>{h.hole}</th>
                                    ))}
                                    <th style={{ padding: '5px 3px', textAlign: 'center', background: 'var(--color-success-dark)' }}>OUT</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr style={{ background: 'var(--color-surface-sunken)' }}>
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
                                            border: diff !== null && diff <= -2 ? '2px double var(--color-skins)'
                                              : diff === -1 ? '2px solid var(--color-success)' : 'none',
                                            background: diff !== null && diff <= -2 ? 'var(--color-warning-light)'
                                              : diff === -1 ? 'var(--color-success-light)' : 'transparent',
                                            fontWeight: 'bold',
                                            fontSize: '11px',
                                            color: 'var(--color-text-primary)'
                                          }}>
                                            {score || '-'}
                                          </div>
                                        </td>
                                      )
                                    })}
                                    <td style={{ padding: '4px 3px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', background: 'var(--color-success-light)' }}>
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
                                  <tr style={{ background: 'var(--color-back9)', color: 'white' }}>
                                    <th style={{ padding: '5px 3px', textAlign: 'left', minWidth: '35px' }}>Hole</th>
                                    {GUNPOWDER_SCORECARD.back9.map(h => (
                                      <th key={h.hole} style={{ padding: '5px 2px', textAlign: 'center', minWidth: '22px' }}>{h.hole}</th>
                                    ))}
                                    <th style={{ padding: '5px 3px', textAlign: 'center', background: 'var(--color-back9-dark)' }}>IN</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr style={{ background: 'var(--color-surface-sunken)' }}>
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
                                            border: diff !== null && diff <= -2 ? '2px double var(--color-skins)'
                                              : diff === -1 ? '2px solid var(--color-success)' : 'none',
                                            background: diff !== null && diff <= -2 ? 'var(--color-warning-light)'
                                              : diff === -1 ? 'var(--color-success-light)' : 'transparent',
                                            fontWeight: 'bold',
                                            fontSize: '11px',
                                            color: 'var(--color-text-primary)'
                                          }}>
                                            {score || '-'}
                                          </div>
                                        </td>
                                      )
                                    })}
                                    <td style={{ padding: '4px 3px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', background: 'var(--color-skins-light)' }}>
                                      {round.back_nine || '--'}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Per-round stats */}
                          {round.metadata?.holeStats && Object.keys(round.metadata.holeStats).length > 0 && (() => {
                            const hs = round.metadata.holeStats
                            const start = startingHole
                            const end = round.holes_played === 9 ? start + 8 : 18
                            let firH = 0, firY = 0, girH = 0, girY = 0, tp = 0, pc = 0, pen = 0, sc = 0, sm = 0
                            for (let h = start; h <= end; h++) {
                              const s = hs[h] || hs[String(h)]
                              if (!s) continue
                              const hi = allHoles.find(hd => hd.hole === h)
                              if (hi?.par >= 4) { firH++; if (s.fir) firY++ }
                              girH++; if (s.gir) girY++
                              if (s.putts != null) { tp += s.putts; pc++ }
                              if (s.penalty) pen += s.penalty
                              if (s.gir === false) { sc++; if (s.scramble) sm++ }
                            }
                            return (
                              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {firH > 0 && <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '10px', background: 'var(--color-surface-sunken)', color: 'var(--color-text-secondary)' }}>FIR {firY}/{firH} ({Math.round(firY/firH*100)}%)</span>}
                                {girH > 0 && <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '10px', background: 'var(--color-surface-sunken)', color: 'var(--color-text-secondary)' }}>GIR {girY}/{girH} ({Math.round(girY/girH*100)}%)</span>}
                                {pc > 0 && <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '10px', background: 'var(--color-surface-sunken)', color: 'var(--color-text-secondary)' }}>Putts {tp} ({(tp/pc).toFixed(1)}/hole)</span>}
                                {sc > 0 && <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '10px', background: 'var(--color-surface-sunken)', color: 'var(--color-text-secondary)' }}>Scramble {sm}/{sc}</span>}
                                {pen > 0 && <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '10px', background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>Penalties {pen}</span>}
                              </div>
                            )
                          })()}
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
