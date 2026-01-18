import { useState } from 'react'
import { useLeague } from '../context/LeagueContext'
import { calculateRoundSettlement, formatMoney } from '../utils/moneyCalculations'
import { GUNPOWDER_SCORECARD, getHoleInfo } from '../lib/courseData'

function formatRelativeToPar(score) {
  if (score === 0) return 'E'
  if (score > 0) return `+${score}`
  return score.toString()
}

// Calculate team score for a 9-hole range
function calculateTeamScore(team, startHole, endHole) {
  let totalScore = 0
  for (let hole = startHole; hole <= endHole; hole++) {
    const holeInfo = getHoleInfo(hole)
    const par = holeInfo?.par || 4

    const playerScores = team.players
      .filter(p => !p.isDNF && p.includeInTeamScore !== false)
      .map(p => p.scores?.[hole])
      .filter(s => s !== undefined && s !== null && s !== '' && s !== 'X')
      .map(s => parseInt(s))

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

// Determine winners for a round
function determineRoundWinners(round) {
  if (!round.teams || round.teams.length === 0) return { front9: [], back9: [], overall: [] }

  const teamScores = round.teams.map((team, idx) => ({
    idx,
    teamId: team.id,
    front9: calculateTeamScore(team, 1, 9),
    back9: calculateTeamScore(team, 10, 18),
    total: calculateTeamScore(team, 1, 9) + calculateTeamScore(team, 10, 18)
  }))

  const minFront = Math.min(...teamScores.map(t => t.front9))
  const minBack = Math.min(...teamScores.map(t => t.back9))
  const minTotal = Math.min(...teamScores.map(t => t.total))

  return {
    front9: teamScores.filter(t => t.front9 === minFront).map(t => t.teamId),
    back9: teamScores.filter(t => t.back9 === minBack).map(t => t.teamId),
    overall: teamScores.filter(t => t.total === minTotal).map(t => t.teamId),
    isMatchPlay: round.teams.length === 2
  }
}

function RoundCard({ round, onView, onDelete, isAdmin }) {
  const date = new Date(round.date)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  // Calculate winners
  const winners = determineRoundWinners(round)

  // Find overall winning team for header display
  const sortedTeams = [...(round.teams || [])].map(team => ({
    ...team,
    front9Score: calculateTeamScore(team, 1, 9),
    back9Score: calculateTeamScore(team, 10, 18),
    totalScore: calculateTeamScore(team, 1, 9) + calculateTeamScore(team, 10, 18)
  })).sort((a, b) => a.totalScore - b.totalScore)
  const winner = sortedTeams[0]

  // Helper to get win/tie badges for a team
  const getTeamBadges = (teamId) => {
    const badges = []
    const isFront9Winner = winners.front9.includes(teamId)
    const isBack9Winner = winners.back9.includes(teamId)
    const isOverallWinner = winners.overall.includes(teamId)

    if (isFront9Winner) {
      const isTie = winners.front9.length > 1
      badges.push({ label: 'F9', type: isTie ? 'tie' : 'win' })
    }
    if (isBack9Winner) {
      const isTie = winners.back9.length > 1
      badges.push({ label: 'B9', type: isTie ? 'tie' : 'win' })
    }
    if (winners.isMatchPlay && isOverallWinner) {
      const isTie = winners.overall.length > 1
      badges.push({ label: 'Overall', type: isTie ? 'tie' : 'win' })
    }
    return badges
  }

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
            {round.teams?.length || 0} teams • {winners.isMatchPlay ? 'Match Play' : 'Standard'}
          </div>
        </div>
        {winner && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Winner</div>
            <div style={{ fontWeight: '600' }}>{winner.name}</div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: winner.totalScore < 0 ? '#2ecc71' : winner.totalScore > 0 ? '#e74c3c' : '#fff'
            }}>
              {formatRelativeToPar(winner.totalScore)}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '15px' }}>
        {/* Team scores summary */}
        {sortedTeams.map((team, idx) => {
          const badges = getTeamBadges(team.id)
          return (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                {badges.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {badges.map((badge, i) => (
                      <span key={i} style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        background: badge.type === 'win' ? '#27ae60' : '#3498db',
                        color: 'white'
                      }}>
                        {badge.type === 'win' ? '✓' : '≈'} {badge.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  F9: {formatRelativeToPar(team.front9Score)}
                </span>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  B9: {formatRelativeToPar(team.back9Score)}
                </span>
                <span style={{
                  fontWeight: 'bold',
                  color: team.totalScore < 0 ? '#27ae60' : team.totalScore > 0 ? '#e74c3c' : '#333'
                }}>
                  {formatRelativeToPar(team.totalScore)}
                </span>
              </div>
            </div>
          )
        })}

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

function MoneySettlement({ round, settlement, payoutFormats }) {
  const format = settlement.format === 'matchPlay' ? payoutFormats.matchPlay : payoutFormats.standard
  const perPlayerEntry = format.front9 + format.back9 + (settlement.format === 'matchPlay' ? format.overall : 0) + (4 * format.greeniePerHole) + (settlement.hio.enabled ? format.holeInOne : 0)

  // Calculate total greenie payouts
  const totalGreeniePayouts = Object.values(settlement.greeniePayouts).reduce((sum, amt) => sum + amt, 0)

  return (
    <div style={{ background: 'white', borderRadius: '10px' }}>
      <h3 style={{ marginBottom: '15px', color: '#27ae60' }}>Treasurer's Settlement Guide</h3>

      {/* Entry Fee Summary */}
      <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '2px solid #2196f3' }}>
        <div style={{ fontWeight: '700', marginBottom: '8px', color: '#1565c0' }}>Entry Fee Per Player: ${perPlayerEntry.toFixed(2)}</div>
        <div style={{ fontSize: '11px', color: '#666', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <span>Team: ${(format.front9 + format.back9 + (settlement.format === 'matchPlay' ? format.overall : 0)).toFixed(2)}</span>
          <span>Greenies: ${(4 * format.greeniePerHole).toFixed(2)}</span>
          {settlement.hio.enabled && <span>HIO: ${format.holeInOne.toFixed(2)}</span>}
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
          {settlement.totalPlayers} players × ${perPlayerEntry.toFixed(2)} = <strong>${(settlement.totalPlayers * perPlayerEntry).toFixed(2)}</strong> total collected
        </div>
      </div>

      {/* Step 1: Collect from Teams */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#1565c0', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>1</span>
          Collect From Each Team
        </h4>
        {settlement.teamSettlements.map(team => {
          const teamOwes = team.entry
          const teamWins = team.winnings
          const netAmount = teamWins - teamOwes
          const winsMore = netAmount > 0
          const owesMore = netAmount < 0

          return (
            <div key={team.teamId} style={{
              background: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '10px',
              border: '1px solid #ddd'
            }}>
              <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '15px' }}>
                {team.teamName} <span style={{ fontWeight: 'normal', fontSize: '12px', color: '#666' }}>({team.teamSize} players)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', fontSize: '12px' }}>
                <div style={{ background: '#ffebee', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ color: '#c62828', fontWeight: '600' }}>Team Owes</div>
                  <div style={{ fontSize: '18px', fontWeight: '700' }}>${teamOwes.toFixed(2)}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>${(teamOwes / team.teamSize).toFixed(2)}/player</div>
                </div>
                <div style={{ background: '#e8f5e9', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ color: '#2e7d32', fontWeight: '600' }}>Team Wins</div>
                  <div style={{ fontSize: '18px', fontWeight: '700' }}>${teamWins.toFixed(2)}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>${(teamWins / team.teamSize).toFixed(2)}/player</div>
                </div>
              </div>

              {/* Show what they won */}
              {(team.wins.length > 0 || team.ties?.length > 0) && (
                <div style={{ fontSize: '11px', marginBottom: '10px', padding: '6px', background: '#e8f5e9', borderRadius: '4px' }}>
                  {team.wins.length > 0 && <span style={{ color: '#2e7d32' }}>✓ Won: {team.wins.join(', ')}</span>}
                  {team.ties?.length > 0 && team.ties.map((tie, i) => (
                    <span key={i} style={{ color: '#1565c0', marginLeft: team.wins.length > 0 ? '8px' : '0' }}>
                      ≈ Tied: {tie.category} ({tie.numTeams} teams)
                    </span>
                  ))}
                </div>
              )}

              {/* Settlement Options */}
              <div style={{ background: '#fff8e1', padding: '10px', borderRadius: '6px', border: '1px solid #f9a825' }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '12px', color: '#f57f17' }}>Settlement Options:</div>

                {winsMore ? (
                  <>
                    <div style={{ fontSize: '12px', marginBottom: '6px', padding: '6px', background: 'white', borderRadius: '4px' }}>
                      <strong>Option A:</strong> Captain collects ${teamOwes.toFixed(2)}, gets back ${teamWins.toFixed(2)}
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                        Each player pays ${(teamOwes / team.teamSize).toFixed(2)}, gets back ${(teamWins / team.teamSize).toFixed(2)} = <span style={{ color: '#2e7d32', fontWeight: '600' }}>+${(netAmount / team.teamSize).toFixed(2)} net</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', padding: '6px', background: 'white', borderRadius: '4px' }}>
                      <strong>Option B:</strong> Captain collects $0, gets back ${netAmount.toFixed(2)} net
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                        Each player pays $0, gets back <span style={{ color: '#2e7d32', fontWeight: '600' }}>${(netAmount / team.teamSize).toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                ) : owesMore ? (
                  <>
                    <div style={{ fontSize: '12px', marginBottom: '6px', padding: '6px', background: 'white', borderRadius: '4px' }}>
                      <strong>Option A:</strong> Captain collects ${teamOwes.toFixed(2)}, gets back ${teamWins.toFixed(2)}
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                        Each player pays ${(teamOwes / team.teamSize).toFixed(2)}, gets back ${(teamWins / team.teamSize).toFixed(2)} = <span style={{ color: '#c62828', fontWeight: '600' }}>${(netAmount / team.teamSize).toFixed(2)} net</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', padding: '6px', background: 'white', borderRadius: '4px' }}>
                      <strong>Option B:</strong> Captain collects ${Math.abs(netAmount).toFixed(2)} net, gets back $0
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                        Each player pays <span style={{ color: '#c62828', fontWeight: '600' }}>${(Math.abs(netAmount) / team.teamSize).toFixed(2)}</span>, gets back $0
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '12px', padding: '6px', background: 'white', borderRadius: '4px' }}>
                    <strong>Break Even:</strong> Captain collects ${teamOwes.toFixed(2)}, gets back ${teamWins.toFixed(2)}
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                      Each player pays ${(teamOwes / team.teamSize).toFixed(2)}, gets back ${(teamWins / team.teamSize).toFixed(2)} = <span style={{ fontWeight: '600' }}>$0 net</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Step 2: Pay Greenie Winners */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#1565c0', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>2</span>
          Pay Greenie Winners
        </h4>
        <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {[4, 8, 12, 17].map(hole => {
              const result = settlement.greenieResults[hole]
              const winnerPlayer = result?.winner ? round.teams.flatMap(t => t.players).find(p => String(p.id) === String(result.winner)) : null
              return (
                <div key={hole} style={{
                  background: result?.isFinal ? (result.winner ? '#e8f5e9' : '#fff3e0') : '#f5f5f5',
                  padding: '8px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  border: result?.isFinal ? (result.winner ? '2px solid #27ae60' : '2px solid #f39c12') : '1px solid #ddd'
                }}>
                  <div style={{ fontSize: '11px', color: '#666' }}>Hole {hole}</div>
                  <div style={{ fontWeight: '700', color: '#27ae60' }}>${result?.pot?.toFixed(2) || '0.00'}</div>
                  {result?.isFinal && (
                    <div style={{ fontSize: '10px', marginTop: '4px', color: result.winner ? '#2e7d32' : '#e67e22' }}>
                      {result.winner ? `${winnerPlayer?.name || result.winnerName || 'Unknown'}` : 'No winner'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {Object.keys(settlement.greeniePayouts).length > 0 ? (
            <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '12px' }}>Pay to individuals:</div>
              {Object.entries(settlement.greeniePayouts).map(([playerId, amount]) => {
                const player = round.teams.flatMap(t => t.players).find(p => String(p.id) === String(playerId))
                return (
                  <div key={playerId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#e8f5e9', borderRadius: '4px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '500' }}>{player?.name || 'Unknown'}</span>
                    <span style={{ color: '#2e7d32', fontWeight: '700' }}>${amount.toFixed(2)}</span>
                  </div>
                )
              })}
              {settlement.carryoverRemaining > 0 && (
                <div style={{ marginTop: '8px', color: '#e67e22', fontSize: '11px' }}>
                  ${settlement.carryoverRemaining.toFixed(2)} carrying over (waiting for final greenie)
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: '#666', fontSize: '12px', fontStyle: 'italic' }}>
              No greenie winners recorded
            </div>
          )}
        </div>
      </div>

      {/* Step 3: HIO Pot */}
      {settlement.hio.enabled && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#1565c0', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>3</span>
            Hole-in-One Pot
          </h4>
          <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '8px', border: '2px solid #f39c12' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600' }}>Add to HIO Pot</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{settlement.hio.eligibleCount} eligible players × ${format.holeInOne.toFixed(2)}</div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#f57f17' }}>
                ${settlement.hio.contribution.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification */}
      <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h4 style={{ fontSize: '13px', marginBottom: '10px' }}>✓ Verification</h4>
        <div style={{ fontSize: '11px', display: 'grid', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Collected:</span>
            <span style={{ fontWeight: '600' }}>${(settlement.totalPlayers * perPlayerEntry).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Team Winnings Paid Out:</span>
            <span>${settlement.teamSettlements.reduce((sum, t) => sum + t.winnings, 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Greenie Payouts:</span>
            <span>${totalGreeniePayouts.toFixed(2)}</span>
          </div>
          {settlement.hio.enabled && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>HIO Pot:</span>
              <span>${settlement.hio.contribution.toFixed(2)}</span>
            </div>
          )}
          {settlement.carryoverRemaining > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e67e22' }}>
              <span>Greenie Carryover (pending):</span>
              <span>${settlement.carryoverRemaining.toFixed(2)}</span>
            </div>
          )}
          <div style={{ borderTop: '1px solid #ddd', paddingTop: '6px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
            <span>Remaining (should be $0):</span>
            <span style={{ color: Math.abs((settlement.totalPlayers * perPlayerEntry) - settlement.teamSettlements.reduce((sum, t) => sum + t.winnings, 0) - totalGreeniePayouts - (settlement.hio.enabled ? settlement.hio.contribution : 0) - settlement.carryoverRemaining) < 0.01 ? '#2e7d32' : '#c62828' }}>
              ${((settlement.totalPlayers * perPlayerEntry) - settlement.teamSettlements.reduce((sum, t) => sum + t.winnings, 0) - totalGreeniePayouts - (settlement.hio.enabled ? settlement.hio.contribution : 0) - settlement.carryoverRemaining).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkinsResults({ round, onUpdatePaidSettlements }) {
  const [skinsView, setSkinsView] = useState('front')

  const skinsMatch = round.skinsMatch
  if (!skinsMatch) return null

  const allPlayers = round.teams.flatMap(t => t.players)
  const skinsPlayers = allPlayers.filter(p => skinsMatch.participants.includes(String(p.id)))

  const frontHoles = GUNPOWDER_SCORECARD.front9
  const backHoles = GUNPOWDER_SCORECARD.back9
  const allHoles = [...frontHoles, ...backHoles]
  const displayHoles = skinsView === 'front' ? frontHoles : skinsView === 'back' ? backHoles : allHoles

  // Calculate skins results (same logic as LivePage)
  const calculateSkins = () => {
    if (!skinsMatch || skinsPlayers.length < 2) return {}

    const results = {}
    let carryoverCount = 0
    let carryoverFromHoles = []

    allHoles.forEach(holeInfo => {
      const hole = holeInfo.hole
      const par = holeInfo.par

      const playerScores = []
      skinsPlayers.forEach(player => {
        const score = player.scores?.[hole]
        if (score !== undefined && score !== null && score !== '' && score !== 'X') {
          playerScores.push({ playerId: player.id, score: parseInt(score), name: player.name })
        }
      })

      const allScored = playerScores.length === skinsPlayers.length

      if (playerScores.length === 0) {
        results[hole] = { winner: null, isTie: false, allScored: false, carryoverCount: 0 }
        return
      }

      const minScore = Math.min(...playerScores.map(p => p.score))
      const playersWithMin = playerScores.filter(p => p.score === minScore)

      if (playersWithMin.length > 1) {
        results[hole] = { winner: null, isTie: true, allScored, minScore, carryoverCount: 0 }
        if (skinsMatch.settings.carryovers) {
          carryoverCount++
          carryoverFromHoles.push(hole)
        }
      } else {
        const winner = playersWithMin[0]

        if (skinsMatch.settings.parOrBetterRequired && winner.score > par) {
          results[hole] = { winner: null, isTie: false, allScored, parNotMet: true, carryoverCount: 0 }
          if (skinsMatch.settings.carryovers) {
            carryoverCount++
            carryoverFromHoles.push(hole)
          }
        } else {
          let skinValue = 1
          const score = winner.score
          const scoreToPar = score - par
          const s = skinsMatch.settings

          // Check for backwards compatibility with old setting
          if (s.birdieDoubleEagleTriple) {
            if (scoreToPar === -1) skinValue = 2
            else if (scoreToPar <= -2) skinValue = 3
          } else {
            // Use flexible multipliers - apply highest applicable
            const multipliers = []
            if (score === 1 && s.holeInOneMultiplier > 1) multipliers.push(s.holeInOneMultiplier)
            if (scoreToPar <= -3 && s.doubleEagleMultiplier > 1) multipliers.push(s.doubleEagleMultiplier)
            if (scoreToPar === -2 && s.eagleMultiplier > 1) multipliers.push(s.eagleMultiplier)
            if (scoreToPar === -1 && s.birdieMultiplier > 1) multipliers.push(s.birdieMultiplier)
            if (multipliers.length > 0) skinValue = Math.max(...multipliers)
          }

          if (skinsMatch.settings.carryovers && carryoverCount > 0) {
            results[hole] = {
              winner: winner.playerId,
              winnerName: winner.name,
              score: winner.score,
              skinValue,
              carryoverCount,
              carryoverFromHoles: [...carryoverFromHoles],
              allScored
            }
            carryoverCount = 0
            carryoverFromHoles = []
          } else {
            results[hole] = { winner: winner.playerId, winnerName: winner.name, score: winner.score, skinValue, carryoverCount: 0, allScored }
          }
        }
      }
    })

    // Handle wrap unwon skins - if carryovers remain after hole 18, wrap to first winner
    if (skinsMatch.settings.carryovers && skinsMatch.settings.wrapUnwonSkins && carryoverCount > 0) {
      const wrapToFront = skinsMatch.settings.wrapTo === 'front'
      const searchHoles = wrapToFront ? [1,2,3,4,5,6,7,8,9] : [10,11,12,13,14,15,16,17,18]

      // Find the first hole with a winner on the target nine
      for (const hole of searchHoles) {
        if (results[hole]?.winner) {
          // Add the wrapped carryovers to this winner
          results[hole].carryoverCount = (results[hole].carryoverCount || 0) + carryoverCount
          results[hole].carryoverFromHoles = [
            ...(results[hole].carryoverFromHoles || []),
            ...carryoverFromHoles
          ]
          results[hole].hasWrappedCarryovers = true
          carryoverCount = 0
          carryoverFromHoles = []
          break
        }
      }
    }

    return results
  }

  // Get skins summary per player
  const getSkinsSummary = (results) => {
    const summary = {}
    skinsPlayers.forEach(p => {
      summary[String(p.id)] = { skinsWon: 0, totalValue: 0, holes: [] }
    })

    let totalSkinsWon = 0
    const cost = parseFloat(skinsMatch?.settings?.costPerSkin) || 0

    Object.entries(results).forEach(([hole, result]) => {
      if (result.winner) {
        const playerId = String(result.winner)
        if (summary[playerId]) {
          summary[playerId].skinsWon += 1
          summary[playerId].totalValue += result.skinValue || 1
          summary[playerId].holes.push(parseInt(hole))
          totalSkinsWon += 1

          if (result.carryoverCount > 0) {
            summary[playerId].skinsWon += result.carryoverCount
            summary[playerId].totalValue += result.carryoverCount
            totalSkinsWon += result.carryoverCount
          }
        }
      }

      // Handle dual winner scenario - carryovers won by different players
      if (result.carryoverWinners?.length > 0) {
        result.carryoverWinners.forEach(cw => {
          const coPlayerId = String(cw.playerId)
          if (summary[coPlayerId]) {
            summary[coPlayerId].skinsWon += cw.count
            summary[coPlayerId].totalValue += cw.count
            totalSkinsWon += cw.count
          }
        })
      }
    })

    const numParticipants = skinsPlayers.length
    Object.keys(summary).forEach(playerId => {
      const playerSummary = summary[playerId]
      // When you win a skin, you collect cost from each OTHER player
      const winnings = playerSummary.totalValue * cost * (numParticipants - 1)
      // When someone else wins, you pay them cost (use totalValue sum for birdie 2x/eagle 3x)
      const totalValueWon = Object.values(summary).reduce((sum, s) => sum + s.totalValue, 0)
      const othersValue = totalValueWon - playerSummary.totalValue
      const payments = othersValue * cost
      playerSummary.amountWon = winnings
      playerSummary.amountPaid = payments
      playerSummary.netAmount = winnings - payments
    })

    return { playerSummary: summary, totalSkinsWon }
  }

  const skinsResults = calculateSkins()
  const { playerSummary, totalSkinsWon } = getSkinsSummary(skinsResults)

  if (skinsPlayers.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
        No skins match data available for this round.
      </div>
    )
  }

  return (
    <div>
      {/* Skins Header */}
      <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
          color: 'white',
          padding: '12px 15px',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Skins Match Results</span>
          <span style={{ fontSize: '13px', opacity: 0.9 }}>
            ${skinsMatch.settings.costPerSkin}/skin - {skinsPlayers.length} players
          </span>
        </div>

        {/* Settings Summary */}
        <div style={{ padding: '10px 15px', background: '#fff8e1', fontSize: '12px', color: '#666', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {skinsMatch.settings.carryovers && <span>Carryovers</span>}
          {skinsMatch.settings.carryovers && skinsMatch.settings.wrapUnwonSkins && <span>Wrap to {skinsMatch.settings.wrapTo === 'front' ? 'Front 9' : 'Back 9'}</span>}
          {skinsMatch.settings.parOrBetterRequired && <span>Par or Better</span>}
          {skinsMatch.settings.birdieDoubleEagleTriple && <span>Birdie ×2/Eagle ×3</span>}
          {!skinsMatch.settings.birdieDoubleEagleTriple && (() => {
            const s = skinsMatch.settings
            const parts = []
            if (s.birdieMultiplier > 1) parts.push(`Birdie ×${s.birdieMultiplier}`)
            if (s.eagleMultiplier > 1) parts.push(`Eagle ×${s.eagleMultiplier}`)
            if (s.doubleEagleMultiplier > 1) parts.push(`Dbl Eagle ×${s.doubleEagleMultiplier}`)
            if (s.holeInOneMultiplier > 1) parts.push(`HIO ×${s.holeInOneMultiplier}`)
            return parts.length > 0 ? <span style={{ color: '#9c27b0' }}>{parts.join(', ')}</span> : null
          })()}
        </div>
      </div>

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', justifyContent: 'center' }}>
        {['front', 'back', 'overall'].map(view => (
          <button
            key={view}
            onClick={() => setSkinsView(view)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: skinsView === view ? '2px solid #f39c12' : '1px solid #ddd',
              background: skinsView === view ? '#f39c12' : 'white',
              color: skinsView === view ? 'white' : '#333',
              fontSize: '12px',
              fontWeight: skinsView === view ? '600' : 'normal',
              cursor: 'pointer'
            }}
          >
            {view === 'front' ? 'Front 9' : view === 'back' ? 'Back 9' : 'All 18'}
          </button>
        ))}
      </div>

      {/* Skins Scoreboard Table */}
      <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: skinsView === 'overall' ? '600px' : '400px' }}>
            <thead>
              <tr style={{ background: '#f39c12', color: 'white' }}>
                <th style={{ padding: '8px 6px', textAlign: 'left', position: 'sticky', left: 0, background: '#f39c12', zIndex: 1, minWidth: '70px' }}>Player</th>
                {displayHoles.map(h => (
                  <th key={h.hole} style={{ padding: '8px 4px', textAlign: 'center', minWidth: '28px' }}>{h.hole}</th>
                ))}
                <th style={{ padding: '8px 6px', textAlign: 'center', background: '#e67e22', minWidth: '40px' }}>Skins</th>
              </tr>
              <tr style={{ background: '#ffe0b2' }}>
                <td style={{ padding: '4px 6px', fontWeight: '600', position: 'sticky', left: 0, background: '#ffe0b2', zIndex: 1 }}>Par</td>
                {displayHoles.map(h => (
                  <td key={h.hole} style={{ padding: '4px', textAlign: 'center', fontWeight: '600' }}>{h.par}</td>
                ))}
                <td style={{ background: '#ffcc80' }}></td>
              </tr>
            </thead>
            <tbody>
              {skinsPlayers.map((player, idx) => {
                const pSummary = playerSummary[String(player.id)] || { skinsWon: 0 }
                return (
                  <tr key={player.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                    <td style={{
                      padding: '8px 6px',
                      fontWeight: '600',
                      position: 'sticky',
                      left: 0,
                      background: idx % 2 === 0 ? '#fff' : '#f9f9f9',
                      zIndex: 1,
                      borderRight: '1px solid #eee',
                      whiteSpace: 'nowrap'
                    }}>
                      {player.name.split(' ')[0]}
                    </td>
                    {displayHoles.map(h => {
                      const score = player.scores?.[h.hole]
                      const holeResult = skinsResults[h.hole] || {}
                      const hasScore = score !== undefined && score !== null && score !== ''

                      let bgColor = 'transparent'
                      let borderColor = 'transparent'
                      let isCarryoverWin = false

                      if (holeResult.winner === player.id) {
                        bgColor = '#d4edda'
                        borderColor = '#28a745'
                      } else {
                        for (const [otherHole, otherResult] of Object.entries(skinsResults)) {
                          if (otherResult.winner === player.id &&
                              otherResult.carryoverFromHoles &&
                              otherResult.carryoverFromHoles.includes(h.hole)) {
                            bgColor = '#e8f5e9'
                            borderColor = '#81c784'
                            isCarryoverWin = true
                            break
                          }
                        }
                      }

                      let isPushedHole = false
                      if (bgColor === 'transparent' && holeResult.isTie && holeResult.allScored) {
                        let claimedViaCarryover = false
                        for (const [otherHole, otherResult] of Object.entries(skinsResults)) {
                          if (otherResult.carryoverFromHoles &&
                              otherResult.carryoverFromHoles.includes(h.hole)) {
                            claimedViaCarryover = true
                            break
                          }
                        }
                        if (!claimedViaCarryover) {
                          isPushedHole = true
                          bgColor = '#ffebee'
                          borderColor = '#ef9a9a'
                        }
                      }

                      return (
                        <td key={h.hole} style={{
                          padding: '4px',
                          textAlign: 'center',
                          background: isCarryoverWin
                            ? `repeating-linear-gradient(45deg, ${bgColor}, ${bgColor} 3px, #c8e6c9 3px, #c8e6c9 6px)`
                            : bgColor,
                          border: borderColor !== 'transparent' ? `2px solid ${borderColor}` : 'none',
                          borderRadius: '4px'
                        }}>
                          {hasScore ? (score === 'X' ? 'X' : score) : '-'}
                          {holeResult.winner === player.id && holeResult.skinValue > 1 && (
                            <div style={{ fontSize: '8px', color: '#9c27b0', fontWeight: '700', marginTop: '1px' }}>
                              ×{holeResult.skinValue}
                            </div>
                          )}
                          {holeResult.winner === player.id && holeResult.carryoverCount > 0 && (
                            <div style={{ fontSize: '8px', color: '#2e7d32', marginTop: '1px' }}>
                              +{holeResult.carryoverCount}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td style={{
                      padding: '8px 6px',
                      textAlign: 'center',
                      fontWeight: '700',
                      fontSize: '14px',
                      background: pSummary.skinsWon > 0 ? '#fff3e0' : '#f5f5f5',
                      color: pSummary.skinsWon > 0 ? '#e65100' : '#999'
                    }}>
                      {(() => {
                        const s = skinsMatch.settings
                        const hasMultipliers = s.birdieDoubleEagleTriple || s.birdieMultiplier > 1 || s.eagleMultiplier > 1 || s.doubleEagleMultiplier > 1 || s.holeInOneMultiplier > 1
                        return hasMultipliers && pSummary.totalValue !== pSummary.skinsWon
                          ? <span>{pSummary.totalValue} <span style={{ fontSize: '9px', color: '#9c27b0' }}>({pSummary.skinsWon})</span></span>
                          : pSummary.skinsWon
                      })()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{ padding: '10px', borderTop: '1px solid #eee', display: 'flex', gap: '15px', flexWrap: 'wrap', fontSize: '11px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '14px', height: '14px', background: '#ffebee', border: '2px solid #ef9a9a', borderRadius: '3px' }}></span> Push
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '14px', height: '14px', background: '#d4edda', border: '2px solid #28a745', borderRadius: '3px' }}></span> Won Outright
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '14px', height: '14px', background: 'repeating-linear-gradient(45deg, #e8f5e9, #e8f5e9 3px, #c8e6c9 3px, #c8e6c9 6px)', border: '2px solid #81c784', borderRadius: '3px' }}></span> Won w/ Carryover
          </span>
          {(() => {
            const s = skinsMatch.settings
            if (s.birdieDoubleEagleTriple) {
              return (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#9c27b0', fontWeight: '700' }}>×2/×3</span> Birdie/Eagle
                </span>
              )
            }
            const parts = []
            if (s.birdieMultiplier > 1) parts.push(`Birdie ×${s.birdieMultiplier}`)
            if (s.eagleMultiplier > 1) parts.push(`Eagle ×${s.eagleMultiplier}`)
            if (s.doubleEagleMultiplier > 1) parts.push(`Dbl Eagle ×${s.doubleEagleMultiplier}`)
            if (s.holeInOneMultiplier > 1) parts.push(`HIO ×${s.holeInOneMultiplier}`)
            if (parts.length > 0) {
              return (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#9c27b0', fontWeight: '700' }}>{parts.join(', ')}</span>
                </span>
              )
            }
            return null
          })()}
        </div>
      </div>

      {/* Payout Summary */}
      {totalSkinsWon > 0 && (
        <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{
            background: '#27ae60',
            color: 'white',
            padding: '10px 15px',
            fontWeight: '600',
            fontSize: '14px'
          }}>
            Payout Summary
          </div>
          <div style={{ padding: '10px' }}>
            {skinsPlayers
              .sort((a, b) => (playerSummary[String(b.id)]?.netAmount || 0) - (playerSummary[String(a.id)]?.netAmount || 0))
              .map(player => {
                const summary = playerSummary[String(player.id)] || {}
                const netAmount = summary.netAmount || 0
                return (
                  <div key={player.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderBottom: '1px solid #eee'
                  }}>
                    <span>
                      <strong>{player.name}</strong>
                      <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>
                        ({summary.skinsWon || 0} skins)
                      </span>
                    </span>
                    <span style={{
                      fontWeight: '700',
                      color: netAmount > 0 ? '#27ae60' : netAmount < 0 ? '#e74c3c' : '#666'
                    }}>
                      {netAmount >= 0 ? '+' : ''}${netAmount.toFixed(2)}
                    </span>
                  </div>
                )
              })}
          </div>

          {/* Who Owes Who */}
          <div style={{
            borderTop: '2px solid #27ae60',
            padding: '10px 15px',
            background: '#f8fff8'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '10px', fontSize: '13px', color: '#27ae60' }}>
              Who Owes Who
            </div>
            {(() => {
              const cost = parseFloat(skinsMatch.settings.costPerSkin) || 0
              const settlements = []

              for (let i = 0; i < skinsPlayers.length; i++) {
                for (let j = i + 1; j < skinsPlayers.length; j++) {
                  const playerA = skinsPlayers[i]
                  const playerB = skinsPlayers[j]
                  const summaryA = playerSummary[String(playerA.id)] || {}
                  const summaryB = playerSummary[String(playerB.id)] || {}

                  const aOwesB = (summaryB.totalValue || 0) * cost
                  const bOwesA = (summaryA.totalValue || 0) * cost
                  const netOwed = aOwesB - bOwesA

                  if (Math.abs(netOwed) > 0.001) {
                    if (netOwed > 0) {
                      settlements.push({ from: playerA.name, to: playerB.name, amount: netOwed })
                    } else {
                      settlements.push({ from: playerB.name, to: playerA.name, amount: -netOwed })
                    }
                  }
                }
              }

              if (settlements.length === 0) {
                return <div style={{ color: '#666', fontSize: '12px' }}>Everyone is even!</div>
              }

              const paidSettlements = skinsMatch.paidSettlements || {}
              const paidCount = settlements.filter(s => paidSettlements[`${s.from}->${s.to}`]).length
              const remainingCount = settlements.length - paidCount

              const togglePaid = (from, to) => {
                const key = `${from}->${to}`
                const newPaidSettlements = { ...paidSettlements, [key]: !paidSettlements[key] }
                if (onUpdatePaidSettlements) {
                  onUpdatePaidSettlements(newPaidSettlements)
                }
              }

              // Sort: unpaid first, then paid
              const sortedSettlements = [...settlements].sort((a, b) => {
                const aKey = `${a.from}->${a.to}`
                const bKey = `${b.from}->${b.to}`
                const aPaid = paidSettlements[aKey] || false
                const bPaid = paidSettlements[bKey] || false
                if (aPaid === bPaid) return 0
                return aPaid ? 1 : -1
              })

              return (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                    padding: '6px 10px',
                    background: remainingCount === 0 ? '#d4edda' : '#fff3cd',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    <span>
                      {remainingCount === 0 ? (
                        <span style={{ color: '#27ae60', fontWeight: '600' }}>✓ All payments complete!</span>
                      ) : (
                        <span style={{ color: '#856404' }}>
                          <strong>{remainingCount}</strong> payment{remainingCount !== 1 ? 's' : ''} remaining
                        </span>
                      )}
                    </span>
                    {paidCount > 0 && (
                      <span style={{ color: '#666' }}>
                        {paidCount} of {settlements.length} paid
                      </span>
                    )}
                  </div>
                  {sortedSettlements.map((s, idx) => {
                    const key = `${s.from}->${s.to}`
                    const isPaid = paidSettlements[key] || false
                    return (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '6px 0',
                        borderBottom: idx < sortedSettlements.length - 1 ? '1px solid #e8f5e9' : 'none',
                        fontSize: '13px',
                        opacity: isPaid ? 0.75 : 1
                      }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isPaid}
                            onChange={() => togglePaid(s.from, s.to)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </label>
                        <span style={{
                          color: '#e74c3c',
                          textDecoration: isPaid ? 'line-through' : 'none'
                        }}>{s.from}</span>
                        <span style={{ margin: '0 8px', color: '#666' }}>owes</span>
                        <span style={{
                          color: '#27ae60',
                          textDecoration: isPaid ? 'line-through' : 'none'
                        }}>{s.to}</span>
                        <span style={{
                          marginLeft: 'auto',
                          fontWeight: '700',
                          color: isPaid ? '#999' : '#27ae60',
                          textDecoration: isPaid ? 'line-through' : 'none'
                        }}>${s.amount.toFixed(2)}</span>
                        {isPaid && (
                          <span style={{ marginLeft: '8px', color: '#27ae60', fontSize: '11px', fontWeight: '600' }}>
                            ✓ PAID
                          </span>
                        )}
                      </div>
                    )
                  })}
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

function RoundDetailModal({ round, onClose, payoutFormats, holeInOnePot, onUpdatePaidSettlements }) {
  const [showMoney, setShowMoney] = useState(false)
  const [activeTab, setActiveTab] = useState('scorecard')

  if (!round) return null

  const date = new Date(round.date)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const settlement = calculateRoundSettlement(round, payoutFormats, holeInOnePot, null)
  const winners = determineRoundWinners(round)

  const front9Holes = GUNPOWDER_SCORECARD.front9
  const back9Holes = GUNPOWDER_SCORECARD.back9

  // Get score cell style based on score vs par - matches live round format
  const getScoreStyle = (score, par) => {
    if (!score || score === '' || score === 'X') return {}
    const numScore = parseInt(score)
    const diff = numScore - par
    if (diff <= -2) return {
      background: '#fff8e1',
      border: '2px double #f39c12',
      borderRadius: '50%',
      fontWeight: '700'
    } // Eagle or better
    if (diff === -1) return {
      background: '#e8f5e9',
      border: '2px solid #27ae60',
      borderRadius: '50%',
      fontWeight: '600'
    } // Birdie
    return {} // Par and worse - no special styling
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '95%', width: '900px', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}
      >
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #1a472a 0%, #2d5a3d 100%)' }}>
          <h3 style={{ color: 'white', margin: 0 }}>{formattedDate}</h3>
          <button className="modal-close" onClick={onClose} style={{ color: 'white' }}>&times;</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e0e0e0' }}>
          <button
            onClick={() => setActiveTab('scorecard')}
            style={{
              flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
              background: activeTab === 'scorecard' ? '#1a472a' : '#f8f9fa',
              color: activeTab === 'scorecard' ? 'white' : '#333',
              fontWeight: '600'
            }}
          >
            Scorecard
          </button>
          <button
            onClick={() => setActiveTab('money')}
            style={{
              flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
              background: activeTab === 'money' ? '#1a472a' : '#f8f9fa',
              color: activeTab === 'money' ? 'white' : '#333',
              fontWeight: '600'
            }}
          >
            Money
          </button>
          {round.skinsMatch && (
            <button
              onClick={() => setActiveTab('skins')}
              style={{
                flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
                background: activeTab === 'skins' ? '#f39c12' : '#f8f9fa',
                color: activeTab === 'skins' ? 'white' : '#333',
                fontWeight: '600'
              }}
            >
              Skins
            </button>
          )}
        </div>

        <div className="modal-body" style={{ padding: '15px' }}>
          {activeTab === 'scorecard' && (
            <>
              {/* Scorecard for each team */}
              {round.teams?.map((team, teamIdx) => {
                const teamFront9 = calculateTeamScore(team, 1, 9)
                const teamBack9 = calculateTeamScore(team, 10, 18)
                const teamTotal = teamFront9 + teamBack9

                // Get badges for this team
                const badges = []
                if (winners.front9.includes(team.id)) {
                  badges.push({ label: 'F9', type: winners.front9.length > 1 ? 'tie' : 'win' })
                }
                if (winners.back9.includes(team.id)) {
                  badges.push({ label: 'B9', type: winners.back9.length > 1 ? 'tie' : 'win' })
                }
                if (winners.isMatchPlay && winners.overall.includes(team.id)) {
                  badges.push({ label: 'Overall', type: winners.overall.length > 1 ? 'tie' : 'win' })
                }

                return (
                  <div key={team.id || teamIdx} style={{ marginBottom: '25px' }}>
                    {/* Team Header */}
                    <div style={{
                      background: teamIdx === 0 ? 'linear-gradient(135deg, #f9a825 0%, #f57c00 100%)' : 'linear-gradient(135deg, #607d8b 0%, #455a64 100%)',
                      color: 'white',
                      padding: '10px 15px',
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{team.name}</span>
                        {badges.map((badge, i) => (
                          <span key={i} style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                            background: badge.type === 'win' ? '#27ae60' : '#3498db', color: 'white'
                          }}>
                            {badge.type === 'win' ? '✓' : '≈'} {badge.label}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px' }}>
                          <span style={{ opacity: 0.8 }}>F9: </span>
                          <span style={{ fontWeight: '600' }}>{formatRelativeToPar(teamFront9)}</span>
                        </span>
                        <span style={{ fontSize: '13px' }}>
                          <span style={{ opacity: 0.8 }}>B9: </span>
                          <span style={{ fontWeight: '600' }}>{formatRelativeToPar(teamBack9)}</span>
                        </span>
                        {winners.isMatchPlay && (
                          <span style={{ fontSize: '15px', fontWeight: 'bold', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                            {formatRelativeToPar(teamTotal)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Scorecard Table */}
                    <div style={{ overflowX: 'auto', border: '1px solid #e0e0e0', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '700px' }}>
                        {/* Front 9 */}
                        <thead>
                          <tr style={{ background: '#1a472a', color: 'white' }}>
                            <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: '600', minWidth: '80px' }}>HOLE</th>
                            {front9Holes.map(h => (
                              <th key={h.hole} style={{ padding: '8px 4px', textAlign: 'center', minWidth: '32px' }}>{h.hole}</th>
                            ))}
                            <th style={{ padding: '8px 6px', textAlign: 'center', background: '#0d2818', minWidth: '40px' }}>OUT</th>
                          </tr>
                          <tr style={{ background: '#2d5a3d', color: 'white' }}>
                            <td style={{ padding: '6px', fontWeight: '600' }}>PAR</td>
                            {front9Holes.map(h => (
                              <td key={h.hole} style={{ padding: '6px 4px', textAlign: 'center', fontWeight: '600' }}>{h.par}</td>
                            ))}
                            <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700', background: '#1a3d2a' }}>
                              {front9Holes.reduce((sum, h) => sum + h.par, 0)}
                            </td>
                          </tr>
                        </thead>
                        <tbody>
                          {team.players?.map((player, pIdx) => {
                            let front9Total = 0
                            front9Holes.forEach(h => {
                              const s = player.scores?.[h.hole]
                              if (s && s !== 'X') front9Total += parseInt(s)
                            })
                            return (
                              <tr key={player.id} style={{ background: pIdx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                                <td style={{ padding: '8px 6px', fontWeight: '500', borderRight: '1px solid #e0e0e0' }}>
                                  {player.name.split(' ')[0]}
                                  {player.isDNF && <span style={{ color: '#e74c3c', fontSize: '9px', marginLeft: '4px' }}>DNF</span>}
                                </td>
                                {front9Holes.map(h => {
                                  const score = player.scores?.[h.hole]
                                  const scoreStyle = getScoreStyle(score, h.par)
                                  const hasStyle = Object.keys(scoreStyle).length > 0
                                  return (
                                    <td key={h.hole} style={{
                                      padding: '4px 2px', textAlign: 'center',
                                      borderRight: '1px solid #eee'
                                    }}>
                                      {hasStyle ? (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: '24px',
                                          height: '24px',
                                          ...scoreStyle
                                        }}>
                                          {score}
                                        </span>
                                      ) : (
                                        score || '-'
                                      )}
                                    </td>
                                  )
                                })}
                                <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700', background: '#e8f5e9', borderLeft: '2px solid #1a472a' }}>
                                  {front9Total || '-'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>

                        {/* Back 9 */}
                        <thead>
                          <tr style={{ background: '#1a472a', color: 'white' }}>
                            <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: '600' }}>HOLE</th>
                            {back9Holes.map(h => (
                              <th key={h.hole} style={{ padding: '8px 4px', textAlign: 'center' }}>{h.hole}</th>
                            ))}
                            <th style={{ padding: '8px 6px', textAlign: 'center', background: '#0d2818' }}>IN</th>
                          </tr>
                          <tr style={{ background: '#2d5a3d', color: 'white' }}>
                            <td style={{ padding: '6px', fontWeight: '600' }}>PAR</td>
                            {back9Holes.map(h => (
                              <td key={h.hole} style={{ padding: '6px 4px', textAlign: 'center', fontWeight: '600' }}>{h.par}</td>
                            ))}
                            <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700', background: '#1a3d2a' }}>
                              {back9Holes.reduce((sum, h) => sum + h.par, 0)}
                            </td>
                          </tr>
                        </thead>
                        <tbody>
                          {team.players?.map((player, pIdx) => {
                            let front9Total = 0, back9Total = 0
                            front9Holes.forEach(h => {
                              const s = player.scores?.[h.hole]
                              if (s && s !== 'X') front9Total += parseInt(s)
                            })
                            back9Holes.forEach(h => {
                              const s = player.scores?.[h.hole]
                              if (s && s !== 'X') back9Total += parseInt(s)
                            })
                            const totalScore = front9Total + back9Total
                            return (
                              <tr key={player.id} style={{ background: pIdx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                                <td style={{ padding: '8px 6px', fontWeight: '500', borderRight: '1px solid #e0e0e0' }}>
                                  {player.name.split(' ')[0]}
                                </td>
                                {back9Holes.map(h => {
                                  const score = player.scores?.[h.hole]
                                  const scoreStyle = getScoreStyle(score, h.par)
                                  const hasStyle = Object.keys(scoreStyle).length > 0
                                  return (
                                    <td key={h.hole} style={{
                                      padding: '4px 2px', textAlign: 'center',
                                      borderRight: '1px solid #eee'
                                    }}>
                                      {hasStyle ? (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: '24px',
                                          height: '24px',
                                          ...scoreStyle
                                        }}>
                                          {score}
                                        </span>
                                      ) : (
                                        score || '-'
                                      )}
                                    </td>
                                  )
                                })}
                                <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700', background: '#e8f5e9', borderLeft: '2px solid #1a472a' }}>
                                  {back9Total || '-'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}

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
                          background: greenie?.playerName ? '#d4edda' : '#f8f9fa',
                          padding: '12px',
                          borderRadius: '8px',
                          textAlign: 'center',
                          border: greenie?.playerName ? '2px solid #27ae60' : '1px solid #e0e0e0'
                        }}>
                          <div style={{ fontWeight: 'bold' }}>Hole {hole}</div>
                          <div style={{ fontSize: '13px', color: greenie?.playerName ? '#27ae60' : '#999', marginTop: '4px' }}>
                            {greenie?.playerName || 'No winner'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Score Legend */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px', justifyContent: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '22px',
                    height: '22px',
                    background: '#fff8e1',
                    border: '2px double #f39c12',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '700'
                  }}>2</span> Eagle+
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '22px',
                    height: '22px',
                    background: '#e8f5e9',
                    border: '2px solid #27ae60',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}>3</span> Birdie
                </span>
              </div>
            </>
          )}

          {activeTab === 'money' && settlement && (
            <MoneySettlement round={round} settlement={settlement} payoutFormats={payoutFormats} />
          )}

          {activeTab === 'skins' && round.skinsMatch && (
            <SkinsResults round={round} onUpdatePaidSettlements={onUpdatePaidSettlements} />
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

// Quick Skins Card for history list
function QuickSkinsCard({ record, onView, onDelete, isAdmin }) {
  const date = new Date(record.date)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const skinsMatch = record.skinsMatch
  const players = record.players || []
  const numPlayers = skinsMatch?.participants?.length || players.length

  // Calculate quick summary of skins won
  const getQuickSummary = () => {
    if (!skinsMatch) return null
    const summary = {}
    const allHoles = [...GUNPOWDER_SCORECARD.front9, ...GUNPOWDER_SCORECARD.back9]

    players.filter(p => skinsMatch.participants?.includes(String(p.id))).forEach(p => {
      summary[p.id] = { name: p.name, totalValue: 0 }
    })

    let carryoverCount = 0
    allHoles.forEach(holeInfo => {
      const hole = holeInfo.hole
      const par = holeInfo.par
      const skinsPlayers = players.filter(p => skinsMatch.participants?.includes(String(p.id)))

      const playerScores = []
      skinsPlayers.forEach(player => {
        const score = player.scores?.[hole]
        if (score !== undefined && score !== null && score !== '' && score !== 'X') {
          playerScores.push({ playerId: player.id, score: parseInt(score) })
        }
      })

      if (playerScores.length === 0) return

      const minScore = Math.min(...playerScores.map(p => p.score))
      const playersWithMin = playerScores.filter(p => p.score === minScore)

      if (playersWithMin.length === 1) {
        const winner = playersWithMin[0]
        const meetsParRequirement = !skinsMatch.settings.parOrBetterRequired || winner.score <= par
        if (meetsParRequirement && summary[winner.playerId]) {
          let skinValue = 1
          const score = winner.score
          const scoreToPar = score - par
          const s = skinsMatch.settings

          if (s.birdieDoubleEagleTriple) {
            if (scoreToPar === -1) skinValue = 2
            else if (scoreToPar <= -2) skinValue = 3
          } else {
            const multipliers = []
            if (score === 1 && s.holeInOneMultiplier > 1) multipliers.push(s.holeInOneMultiplier)
            if (scoreToPar <= -3 && s.doubleEagleMultiplier > 1) multipliers.push(s.doubleEagleMultiplier)
            if (scoreToPar === -2 && s.eagleMultiplier > 1) multipliers.push(s.eagleMultiplier)
            if (scoreToPar === -1 && s.birdieMultiplier > 1) multipliers.push(s.birdieMultiplier)
            if (multipliers.length > 0) skinValue = Math.max(...multipliers)
          }
          summary[winner.playerId].totalValue += skinValue + carryoverCount
          carryoverCount = 0
        } else if (skinsMatch.settings.carryovers) {
          carryoverCount++
        }
      } else if (skinsMatch.settings.carryovers) {
        carryoverCount++
      }
    })

    return Object.values(summary).filter(s => s.totalValue > 0).sort((a, b) => b.totalValue - a.totalValue)
  }

  const winners = getQuickSummary() || []
  const cost = parseFloat(skinsMatch?.settings?.costPerSkin) || 0

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      marginBottom: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
        padding: '12px 15px',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600' }}>Quick Skins</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>{formattedDate}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', fontWeight: '600' }}>${cost}/skin</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>{numPlayers} players</div>
        </div>
      </div>

      {/* Winners Preview */}
      <div style={{ padding: '12px 15px' }}>
        {winners.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            {winners.slice(0, 3).map((w, idx) => (
              <div key={idx} style={{
                background: idx === 0 ? '#fff3cd' : '#f8f9fa',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px'
              }}>
                <span style={{ fontWeight: '600' }}>{w.name}</span>
                <span style={{ color: '#27ae60', marginLeft: '5px' }}>+${w.totalValue * cost * (numPlayers - 1)}</span>
              </div>
            ))}
            {winners.length > 3 && (
              <div style={{ color: '#666', fontSize: '12px', alignSelf: 'center' }}>
                +{winners.length - 3} more
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: '13px', marginBottom: '10px' }}>No skins won</div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onView(record)}
            style={{
              flex: 1,
              padding: '10px',
              background: '#f39c12',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            View Details
          </button>
          {isAdmin && (
            <button
              onClick={() => onDelete(record)}
              style={{
                padding: '10px 16px',
                background: '#fff',
                color: '#e74c3c',
                border: '2px solid #e74c3c',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Quick Skins Detail Modal
function QuickSkinsDetailModal({ record, onClose, onUpdatePaidSettlements }) {
  const [skinsView, setSkinsView] = useState('front')

  if (!record || !record.skinsMatch) return null

  const skinsMatch = record.skinsMatch
  const players = record.players || []
  const skinsPlayers = players.filter(p => skinsMatch.participants?.includes(String(p.id)))

  const frontHoles = GUNPOWDER_SCORECARD.front9
  const backHoles = GUNPOWDER_SCORECARD.back9
  const allHoles = [...frontHoles, ...backHoles]
  const displayHoles = skinsView === 'front' ? frontHoles : skinsView === 'back' ? backHoles : allHoles

  // Helper: Get active players for a specific hole (respects join/leave holes)
  const getActivePlayersForHole = (hole) => {
    const participantDetails = skinsMatch?.participantDetails || {}
    return skinsPlayers.filter(player => {
      const details = participantDetails[String(player.id)]
      if (!details) return true  // Backwards compat: assume active for all holes

      const joinedOnHole = details.joinedOnHole || 1
      const leftOnHole = details.leftOnHole || 18

      return hole >= joinedOnHole && hole <= leftOnHole
    })
  }

  // Calculate skins results (with player eligibility tracking like live version)
  const calculateSkins = () => {
    if (!skinsMatch || skinsPlayers.length < 2) return {}

    const results = {}
    // Track pending carryovers with their eligible player IDs
    let pendingCarryovers = []  // Array of { fromHole, eligiblePlayerIds }

    allHoles.forEach(holeInfo => {
      const hole = holeInfo.hole
      const par = holeInfo.par

      const activePlayers = getActivePlayersForHole(hole)
      const activePlayerIds = activePlayers.map(p => String(p.id))

      // Get scores for active players on this hole
      const playerScores = []
      let allScored = true

      activePlayers.forEach(player => {
        const score = player.scores?.[hole]
        if (score === undefined || score === null || score === '') {
          allScored = false
        } else if (score !== 'X') {
          playerScores.push({ playerId: player.id, score: parseInt(score), name: player.name })
        }
      })

      results[hole] = {
        winner: null,
        winnerName: null,
        isTie: false,
        allScored,
        carryoverCount: 0,
        carryoverFromHoles: [],
        skinValue: 1,
        activePlayers: activePlayerIds
      }

      if (playerScores.length === 0) {
        return
      }

      const minScore = Math.min(...playerScores.map(p => p.score))
      const playersWithMin = playerScores.filter(p => p.score === minScore)

      let holeWinner = null

      if (playersWithMin.length > 1) {
        // Tie - no winner
        results[hole].isTie = true
        results[hole].minScore = minScore
        if (skinsMatch.settings.carryovers) {
          pendingCarryovers.push({ fromHole: hole, eligiblePlayerIds: [...activePlayerIds] })
        }
      } else {
        const winner = playersWithMin[0]

        if (skinsMatch.settings.parOrBetterRequired && winner.score > par) {
          // Par not met - no winner
          results[hole].parNotMet = true
          if (skinsMatch.settings.carryovers) {
            pendingCarryovers.push({ fromHole: hole, eligiblePlayerIds: [...activePlayerIds] })
          }
        } else {
          // We have a winner
          holeWinner = winner
          let skinValue = 1
          const score = winner.score
          const scoreToPar = score - par
          const s = skinsMatch.settings

          if (s.birdieDoubleEagleTriple) {
            if (scoreToPar === -1) skinValue = 2
            else if (scoreToPar <= -2) skinValue = 3
          } else {
            const multipliers = []
            if (score === 1 && s.holeInOneMultiplier > 1) multipliers.push(s.holeInOneMultiplier)
            if (scoreToPar <= -3 && s.doubleEagleMultiplier > 1) multipliers.push(s.doubleEagleMultiplier)
            if (scoreToPar === -2 && s.eagleMultiplier > 1) multipliers.push(s.eagleMultiplier)
            if (scoreToPar === -1 && s.birdieMultiplier > 1) multipliers.push(s.birdieMultiplier)
            if (multipliers.length > 0) skinValue = Math.max(...multipliers)
          }

          results[hole].winner = winner.playerId
          results[hole].winnerName = winner.name
          results[hole].score = winner.score
          results[hole].skinValue = skinValue
        }
      }

      // Process pending carryovers - find winner among eligible players
      // IMPORTANT: Process even when current hole is a tie - eligible players can still win carryovers
      if (skinsMatch.settings.carryovers && pendingCarryovers.length > 0) {
        // Get carryovers that existed BEFORE this hole (exclude current hole if it was just added)
        const carryoversToProcess = pendingCarryovers.filter(co => co.fromHole !== hole)

        if (carryoversToProcess.length > 0) {
          // Group carryovers by eligible player sets
          const carryoversByEligibility = {}
          carryoversToProcess.forEach(co => {
            const key = [...co.eligiblePlayerIds].sort().join(',')
            if (!carryoversByEligibility[key]) {
              carryoversByEligibility[key] = { eligiblePlayerIds: co.eligiblePlayerIds, holes: [] }
            }
            carryoversByEligibility[key].holes.push(co.fromHole)
          })

          Object.values(carryoversByEligibility).forEach(group => {
            // Find the best score among eligible players on this hole
            const eligibleScores = playerScores.filter(ps =>
              group.eligiblePlayerIds.includes(String(ps.playerId))
            )

            if (eligibleScores.length === 0) {
              // No eligible players scored - carryovers stay pending (already in list)
              return
            }

            const eligibleMinScore = Math.min(...eligibleScores.map(s => s.score))
            const eligibleWinners = eligibleScores.filter(s => s.score === eligibleMinScore)

            // Check if there's a single winner among eligible players
            const eligibleValidWin = eligibleWinners.length === 1 &&
              (!skinsMatch.settings.parOrBetterRequired || eligibleWinners[0].score <= par)

            if (eligibleValidWin) {
              const coWinner = eligibleWinners[0]

              // Track carryover win (may be same as hole winner or different)
              if (holeWinner && String(coWinner.playerId) === String(holeWinner.playerId)) {
                // Same as hole winner - add to regular carryover count
                results[hole].carryoverCount = (results[hole].carryoverCount || 0) + group.holes.length
                results[hole].carryoverFromHoles = [
                  ...(results[hole].carryoverFromHoles || []),
                  ...group.holes
                ]
              } else {
                // Different winner for carryovers (or no hole winner - dual winner scenario)
                if (!results[hole].carryoverWinners) {
                  results[hole].carryoverWinners = []
                }
                results[hole].carryoverWinners.push({
                  playerId: coWinner.playerId,
                  playerName: coWinner.name,
                  count: group.holes.length,
                  fromHoles: group.holes
                })
              }

              // Remove these from pending
              group.holes.forEach(h => {
                pendingCarryovers = pendingCarryovers.filter(c => c.fromHole !== h)
              })
            }
            // If tie among eligible players, carryovers stay pending (no action needed)
          })
        }
      }
    })

    // Handle wrap unwon skins
    if (skinsMatch.settings.carryovers && skinsMatch.settings.wrapUnwonSkins && pendingCarryovers.length > 0) {
      const wrapToFront = skinsMatch.settings.wrapTo === 'front'
      const searchHoles = wrapToFront ? [1,2,3,4,5,6,7,8,9] : [10,11,12,13,14,15,16,17,18]

      // Group remaining carryovers by eligibility
      const carryoversByEligibility = {}
      pendingCarryovers.forEach(co => {
        const key = [...co.eligiblePlayerIds].sort().join(',')
        if (!carryoversByEligibility[key]) {
          carryoversByEligibility[key] = { eligiblePlayerIds: co.eligiblePlayerIds, holes: [] }
        }
        carryoversByEligibility[key].holes.push(co.fromHole)
      })

      Object.values(carryoversByEligibility).forEach(group => {
        // Find first winner in wrap range who is eligible
        for (const hole of searchHoles) {
          if (!results[hole]?.winner) continue

          // Check if hole winner is eligible
          if (group.eligiblePlayerIds.includes(String(results[hole].winner))) {
            results[hole].carryoverCount = (results[hole].carryoverCount || 0) + group.holes.length
            results[hole].carryoverFromHoles = [
              ...(results[hole].carryoverFromHoles || []),
              ...group.holes
            ]
            results[hole].hasWrappedCarryovers = true
            break
          }

          // Check carryover winners on this hole too
          const eligibleCoWinner = results[hole].carryoverWinners?.find(cw =>
            group.eligiblePlayerIds.includes(String(cw.playerId))
          )
          if (eligibleCoWinner) {
            eligibleCoWinner.count += group.holes.length
            eligibleCoWinner.fromHoles = [...eligibleCoWinner.fromHoles, ...group.holes]
            results[hole].hasWrappedCarryovers = true
            break
          }
        }
      })
    }

    return results
  }

  // Get skins summary per player (eligibility-aware)
  const getSkinsSummary = (results) => {
    const participantDetails = skinsMatch?.participantDetails || {}
    const summary = {}
    skinsPlayers.forEach(p => {
      const details = participantDetails[String(p.id)] || {}
      summary[String(p.id)] = {
        name: p.name,
        skinsWon: 0,
        totalValue: 0,
        holes: [],
        amountWon: 0,
        amountPaid: 0,
        joinedOnHole: details.joinedOnHole || 1,
        leftOnHole: details.leftOnHole || 18,
        isSettled: details.isSettled || false
      }
    })

    let totalSkinsWon = 0
    const cost = parseFloat(skinsMatch?.settings?.costPerSkin) || 0

    // Track all skin wins with their active players for payment calculation
    const skinWins = []

    Object.entries(results).forEach(([hole, result]) => {
      const holeNum = parseInt(hole)
      const activePlayerIds = result.activePlayers || skinsPlayers.map(p => String(p.id))

      if (result.winner) {
        const playerId = String(result.winner)
        const skinValue = result.skinValue || 1
        if (summary[playerId]) {
          summary[playerId].skinsWon += 1
          summary[playerId].totalValue += skinValue
          summary[playerId].holes.push(holeNum)
          totalSkinsWon += 1

          // Winner collects from other active players on this hole
          const otherActivePlayers = activePlayerIds.filter(id => id !== playerId)
          summary[playerId].amountWon += skinValue * cost * otherActivePlayers.length

          // Track for payment calculation
          skinWins.push({ winnerId: playerId, value: skinValue, activePlayerIds, hole: holeNum })

          if (result.carryoverCount > 0) {
            summary[playerId].skinsWon += result.carryoverCount
            summary[playerId].totalValue += result.carryoverCount
            totalSkinsWon += result.carryoverCount
            // Carryover wins also collect from active players
            summary[playerId].amountWon += result.carryoverCount * cost * otherActivePlayers.length
            skinWins.push({ winnerId: playerId, value: result.carryoverCount, activePlayerIds, hole: holeNum, isCarryover: true })
          }
        }
      }

      // Handle dual winner scenario - carryovers won by different players
      if (result.carryoverWinners?.length > 0) {
        result.carryoverWinners.forEach(cw => {
          const coPlayerId = String(cw.playerId)
          if (summary[coPlayerId]) {
            summary[coPlayerId].skinsWon += cw.count
            summary[coPlayerId].totalValue += cw.count
            totalSkinsWon += cw.count
            // Carryover winner collects from other active players
            const otherActivePlayers = activePlayerIds.filter(id => id !== coPlayerId)
            summary[coPlayerId].amountWon += cw.count * cost * otherActivePlayers.length
            skinWins.push({ winnerId: coPlayerId, value: cw.count, activePlayerIds, hole: holeNum, isCarryover: true })
          }
        })
      }
    })

    // Calculate payments - each player pays for skins won by others on holes where they were active
    Object.keys(summary).forEach(playerId => {
      let totalPayments = 0
      skinWins.forEach(sw => {
        // Only pay if this player was active on that hole AND is not the winner
        if (sw.activePlayerIds.includes(playerId) && sw.winnerId !== playerId) {
          totalPayments += sw.value * cost
        }
      })
      summary[playerId].amountPaid = totalPayments
      summary[playerId].netAmount = summary[playerId].amountWon - totalPayments
    })

    return { playerSummary: summary, totalSkinsWon }
  }

  // Calculate greenies if enabled (eligibility-aware)
  const calculateGreenies = () => {
    // Check if greenies are enabled - check both skinsMatch settings and Quick Skins settings
    const quickSkinsGreenies = record.quickSkinsGreenieSettings
    const greeniesEnabled = skinsMatch?.settings?.greeniesEnabled || !!quickSkinsGreenies

    if (!greeniesEnabled) return null

    const settings = {
      enabled: true,
      costPerHole: skinsMatch?.settings?.greeniesCostPerHole ||
        (quickSkinsGreenies ? parseFloat(quickSkinsGreenies.costPerGreenie) || 1 : 1),
      carryover: skinsMatch?.settings?.greeniesCarryover ?? quickSkinsGreenies?.carryovers ?? true
    }

    const par3Holes = [4, 8, 12, 17]
    const results = {}
    let carryover = 0
    let carryoverActivePlayerIds = []

    par3Holes.forEach(hole => {
      // Get active players for this hole
      const activePlayers = getActivePlayersForHole(hole)
      const activePlayerIds = activePlayers.map(p => String(p.id))

      // Look for greenie data in team.greenies (greenies are stored per team)
      let greenieData = null
      record.teams?.forEach(team => {
        if (team.greenies?.[hole]) {
          greenieData = team.greenies[hole]
        }
      })

      // Pot is based on active players, not total
      const pot = activePlayers.length * settings.costPerHole

      if (greenieData?.playerId) {
        results[hole] = {
          winner: greenieData.playerId,
          winnerName: greenieData.playerName,
          distance: greenieData.distance,
          pot: pot + carryover,
          activePlayerIds,
          carryoverActivePlayerIds: carryover > 0 ? [...carryoverActivePlayerIds] : []
        }
        carryover = 0
        carryoverActivePlayerIds = []
      } else {
        results[hole] = { winner: null, pot, activePlayerIds }
        if (settings.carryover) {
          carryover += pot
          // Track who contributed to this carryover
          carryoverActivePlayerIds = [...new Set([...carryoverActivePlayerIds, ...activePlayerIds])]
        }
      }
    })

    // Calculate greenie summary (eligibility-aware)
    const summary = {}
    skinsPlayers.forEach(p => {
      summary[p.id] = { name: p.name, greeniesWon: 0, amountWon: 0, amountPaid: 0 }
    })

    // Calculate payments - each player pays for par 3s they were active on
    par3Holes.forEach(hole => {
      const result = results[hole]
      const activePlayerIds = result.activePlayerIds || []

      // Each active player pays costPerHole
      activePlayerIds.forEach(playerId => {
        if (summary[playerId]) {
          summary[playerId].amountPaid += settings.costPerHole
        }
      })
    })

    // Calculate winnings
    Object.entries(results).forEach(([hole, result]) => {
      if (result.winner && summary[result.winner]) {
        summary[result.winner].greeniesWon++
        summary[result.winner].amountWon += result.pot
      }
    })

    // Calculate net
    Object.keys(summary).forEach(playerId => {
      summary[playerId].netAmount = summary[playerId].amountWon - summary[playerId].amountPaid
    })

    return { results, summary, settings }
  }

  const skinsResults = calculateSkins()
  const { playerSummary, totalSkinsWon } = getSkinsSummary(skinsResults)
  const greenieData = calculateGreenies()

  const cost = parseFloat(skinsMatch?.settings?.costPerSkin) || 0
  const date = new Date(record.date)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)', color: 'white' }}>
          <div>
            <h3 style={{ margin: 0 }}>Quick Skins Results</h3>
            <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>{formattedDate}</div>
          </div>
          <button className="modal-close" onClick={onClose} style={{ color: 'white' }}>&times;</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Settings Summary */}
          <div style={{ background: '#fff8e1', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '12px', color: '#666' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
              <span><strong>${cost}</strong> per skin</span>
              <span><strong>{skinsPlayers.length}</strong> players</span>
              {skinsMatch.settings.carryovers && <span>Carryovers enabled</span>}
              {skinsMatch.settings.carryovers && skinsMatch.settings.wrapUnwonSkins && (
                <span>Wrap to {skinsMatch.settings.wrapTo === 'front' ? 'Front 9' : 'Back 9'}</span>
              )}
              {skinsMatch.settings.parOrBetterRequired && <span>Par or better required</span>}
              {skinsMatch.settings.birdieDoubleEagleTriple && <span>Birdie 2x / Eagle 3x</span>}
              {!skinsMatch.settings.birdieDoubleEagleTriple && (() => {
                const s = skinsMatch.settings
                const parts = []
                if (s.birdieMultiplier > 1) parts.push(`Birdie ×${s.birdieMultiplier}`)
                if (s.eagleMultiplier > 1) parts.push(`Eagle ×${s.eagleMultiplier}`)
                if (s.doubleEagleMultiplier > 1) parts.push(`Dbl Eagle ×${s.doubleEagleMultiplier}`)
                if (s.holeInOneMultiplier > 1) parts.push(`HIO ×${s.holeInOneMultiplier}`)
                return parts.length > 0 ? <span style={{ color: '#9c27b0' }}>{parts.join(', ')}</span> : null
              })()}
            </div>
            {/* Show player eligibility if participantDetails exists */}
            {skinsMatch.participantDetails && Object.keys(skinsMatch.participantDetails).length > 0 && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ffe0b2' }}>
                <div style={{ fontWeight: '600', marginBottom: '5px' }}>Player Eligibility:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {skinsPlayers.map(player => {
                    const details = skinsMatch.participantDetails[String(player.id)] || {}
                    const joinHole = details.joinedOnHole || 1
                    const leftHole = details.leftOnHole
                    const isSettled = details.isSettled
                    if (joinHole === 1 && !leftHole) return null  // Default - don't show
                    return (
                      <span key={player.id} style={{
                        padding: '2px 8px',
                        background: isSettled ? '#ffebee' : '#e3f2fd',
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}>
                        {player.name}: h{joinHole}{leftHole ? `-${leftHole}` : '-18'}
                        {isSettled && ' (settled)'}
                      </span>
                    )
                  }).filter(Boolean)}
                </div>
              </div>
            )}
          </div>

          {/* Settlements History */}
          {skinsMatch.settlements?.length > 0 && (
            <div style={{ background: '#fff3e0', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px' }}>
              <div style={{ fontWeight: '600', fontSize: '14px', color: '#e65100', marginBottom: '10px' }}>
                Early Settlements
              </div>
              {skinsMatch.settlements.map((settlement, idx) => {
                const player = skinsPlayers.find(p => String(p.id) === settlement.playerId)
                return (
                  <div key={idx} style={{
                    background: 'white',
                    padding: '10px',
                    borderRadius: '6px',
                    marginBottom: idx < skinsMatch.settlements.length - 1 ? '8px' : 0,
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                      {player?.name || 'Unknown'} - Settled on hole {settlement.settledOnHole}
                    </div>
                    {settlement.resolvedTransactions?.map((tx, txIdx) => {
                      const otherPlayer = skinsPlayers.find(p => String(p.id) === tx.withPlayerId)
                      return (
                        <div key={txIdx} style={{ color: '#666', fontSize: '11px', marginLeft: '10px' }}>
                          {tx.direction === 'owed' ? (
                            <span>Owed {otherPlayer?.name}: <span style={{ color: '#e74c3c' }}>${tx.amount.toFixed(2)}</span></span>
                          ) : (
                            <span>Collected from {otherPlayer?.name}: <span style={{ color: '#27ae60' }}>${tx.amount.toFixed(2)}</span></span>
                          )}
                        </div>
                      )
                    })}
                    {settlement.carryoverCollection && (
                      <div style={{ color: '#e65100', fontSize: '11px', marginLeft: '10px', marginTop: '4px' }}>
                        Prepaid ${settlement.carryoverCollection.amount.toFixed(2)} for carryovers
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* View Toggle */}
          <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', justifyContent: 'center' }}>
            {['front', 'back', 'overall'].map(view => (
              <button
                key={view}
                onClick={() => setSkinsView(view)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: skinsView === view ? '2px solid #f39c12' : '1px solid #ddd',
                  background: skinsView === view ? '#f39c12' : 'white',
                  color: skinsView === view ? 'white' : '#333',
                  fontSize: '12px',
                  fontWeight: skinsView === view ? '600' : 'normal',
                  cursor: 'pointer'
                }}
              >
                {view === 'front' ? 'Front 9' : view === 'back' ? 'Back 9' : 'All 18'}
              </button>
            ))}
          </div>

          {/* Skins Scoreboard */}
          <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px', border: '1px solid #eee' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: skinsView === 'overall' ? '600px' : '400px' }}>
                <thead>
                  <tr style={{ background: '#f39c12', color: 'white' }}>
                    <th style={{ padding: '8px 6px', textAlign: 'left', position: 'sticky', left: 0, background: '#f39c12', zIndex: 1, minWidth: '70px' }}>Player</th>
                    {displayHoles.map(h => (
                      <th key={h.hole} style={{ padding: '8px 4px', textAlign: 'center', minWidth: '28px' }}>{h.hole}</th>
                    ))}
                    <th style={{ padding: '8px 6px', textAlign: 'center', background: '#e67e22', minWidth: '40px' }}>Skins</th>
                  </tr>
                  <tr style={{ background: '#ffe0b2' }}>
                    <td style={{ padding: '4px 6px', fontWeight: '600', position: 'sticky', left: 0, background: '#ffe0b2', zIndex: 1 }}>Par</td>
                    {displayHoles.map(h => (
                      <td key={h.hole} style={{ padding: '4px', textAlign: 'center', fontWeight: '600' }}>{h.par}</td>
                    ))}
                    <td style={{ background: '#ffcc80' }}></td>
                  </tr>
                </thead>
                <tbody>
                  {skinsPlayers.map((player, idx) => {
                    const pSummary = playerSummary[String(player.id)] || { skinsWon: 0 }
                    return (
                      <tr key={player.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                        <td style={{ padding: '8px 6px', fontWeight: '600', position: 'sticky', left: 0, background: idx % 2 === 0 ? '#fff' : '#f9f9f9', zIndex: 1, whiteSpace: 'nowrap' }}>
                          {player.name.split(' ')[0]}
                        </td>
                        {displayHoles.map(holeInfo => {
                          const h = holeInfo.hole
                          const score = player.scores?.[h]
                          const result = skinsResults[h]
                          const isWinner = result?.winner === player.id

                          // Determine highlight color (matching live skins styling)
                          let bgColor = 'transparent'
                          let borderColor = 'transparent'
                          let isCarryoverWin = false

                          // Check if this player won this hole outright
                          if (isWinner) {
                            bgColor = '#d4edda'  // Solid green for outright win
                            borderColor = '#28a745'
                          } else {
                            // Check if this hole was won via carryover by this player
                            for (const [otherHole, otherResult] of Object.entries(skinsResults)) {
                              if (otherResult.winner === player.id &&
                                  otherResult.carryoverFromHoles &&
                                  otherResult.carryoverFromHoles.includes(h)) {
                                bgColor = '#e8f5e9'  // Lighter green for carryover win
                                borderColor = '#81c784'
                                isCarryoverWin = true
                                break
                              }
                            }
                          }

                          // Check if this hole is a push (tied, not claimed via carryover)
                          if (bgColor === 'transparent' && result?.isTie) {
                            let claimedViaCarryover = false
                            for (const [otherHole, otherResult] of Object.entries(skinsResults)) {
                              if (otherResult.carryoverFromHoles &&
                                  otherResult.carryoverFromHoles.includes(h)) {
                                claimedViaCarryover = true
                                break
                              }
                            }
                            if (!claimedViaCarryover) {
                              bgColor = '#ffebee'  // Light red/pink for pushed hole
                              borderColor = '#ef9a9a'
                            }
                          }

                          return (
                            <td key={h} style={{
                              padding: '6px 4px',
                              textAlign: 'center',
                              background: isCarryoverWin
                                ? `repeating-linear-gradient(45deg, ${bgColor}, ${bgColor} 3px, #c8e6c9 3px, #c8e6c9 6px)`
                                : bgColor,
                              border: borderColor !== 'transparent' ? `2px solid ${borderColor}` : 'none',
                              borderRadius: '4px',
                              fontWeight: isWinner ? '700' : 'normal'
                            }}>
                              {score === 'X' ? 'X' : score || '-'}
                              {isWinner && result.skinValue > 1 && (
                                <div style={{ fontSize: '8px', color: '#9c27b0', fontWeight: '700', marginTop: '1px' }}>×{result.skinValue}</div>
                              )}
                              {isWinner && result.carryoverCount > 0 && (
                                <div style={{ fontSize: '8px', color: '#2e7d32', marginTop: '1px' }}>+{result.carryoverCount}</div>
                              )}
                            </td>
                          )
                        })}
                        <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700', background: '#fff3cd' }}>
                          {(() => {
                            const s = skinsMatch.settings
                            const hasMultipliers = s.birdieDoubleEagleTriple || s.birdieMultiplier > 1 || s.eagleMultiplier > 1 || s.doubleEagleMultiplier > 1 || s.holeInOneMultiplier > 1
                            return hasMultipliers && pSummary.totalValue !== pSummary.skinsWon
                              ? <span>{pSummary.totalValue} <span style={{ fontSize: '9px', color: '#9c27b0' }}>({pSummary.skinsWon})</span></span>
                              : pSummary.skinsWon
                          })()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Legend */}
            <div style={{ padding: '10px', borderTop: '1px solid #eee', display: 'flex', gap: '15px', flexWrap: 'wrap', fontSize: '11px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '14px', height: '14px', background: '#ffebee', border: '2px solid #ef9a9a', borderRadius: '3px' }}></span> Push
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '14px', height: '14px', background: '#d4edda', border: '2px solid #28a745', borderRadius: '3px' }}></span> Won
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '14px', height: '14px', background: 'repeating-linear-gradient(45deg, #e8f5e9, #e8f5e9 3px, #c8e6c9 3px, #c8e6c9 6px)', border: '2px solid #81c784', borderRadius: '3px' }}></span> Carryover
              </span>
              {(() => {
                const s = skinsMatch.settings
                if (s.birdieDoubleEagleTriple) {
                  return (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#9c27b0', fontWeight: '700' }}>×2/×3</span> Birdie/Eagle
                    </span>
                  )
                }
                const parts = []
                if (s.birdieMultiplier > 1) parts.push(`Birdie ×${s.birdieMultiplier}`)
                if (s.eagleMultiplier > 1) parts.push(`Eagle ×${s.eagleMultiplier}`)
                if (s.doubleEagleMultiplier > 1) parts.push(`Dbl Eagle ×${s.doubleEagleMultiplier}`)
                if (s.holeInOneMultiplier > 1) parts.push(`HIO ×${s.holeInOneMultiplier}`)
                if (parts.length > 0) {
                  return (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#9c27b0', fontWeight: '700' }}>{parts.join(', ')}</span>
                    </span>
                  )
                }
                return null
              })()}
            </div>
          </div>

          {/* Payout Summary */}
          <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '15px', marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Payout Summary</h4>
            <div style={{ display: 'grid', gap: '8px' }}>
              {Object.entries(playerSummary)
                .sort((a, b) => {
                  const aTotal = a[1].netAmount + (greenieData?.summary?.[a[0]]?.netAmount || 0)
                  const bTotal = b[1].netAmount + (greenieData?.summary?.[b[0]]?.netAmount || 0)
                  return bTotal - aTotal
                })
                .map(([playerId, summary]) => {
                  const greenieNet = greenieData?.summary?.[playerId]?.netAmount || 0
                  const totalNet = summary.netAmount + greenieNet
                  const greeniesWon = greenieData?.summary?.[playerId]?.greeniesWon || 0
                  const holesInfo = summary.isSettled
                    ? ` (h${summary.joinedOnHole}-${summary.leftOnHole})`
                    : summary.joinedOnHole > 1 || summary.leftOnHole < 18
                      ? ` (h${summary.joinedOnHole}-${summary.leftOnHole})`
                      : ''
                  return (
                    <div key={playerId} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: summary.isSettled ? '#fff8e1' : 'white',
                      borderRadius: '6px'
                    }}>
                      <span style={{ fontWeight: '600' }}>
                        {summary.name}
                        <span style={{ fontSize: '11px', color: '#999', fontWeight: 'normal' }}>{holesInfo}</span>
                      </span>
                      <div style={{ display: 'flex', gap: '15px', fontSize: '13px' }}>
                        <span style={{ color: '#666' }}>
                          {summary.skinsWon} skins
                          {greeniesWon > 0 && `, ${greeniesWon} greenies`}
                        </span>
                        <span style={{
                          fontWeight: '700',
                          color: totalNet > 0 ? '#27ae60' : totalNet < 0 ? '#e74c3c' : '#666'
                        }}>
                          {totalNet > 0 ? '+' : ''}${totalNet.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Greenies Section (if enabled) */}
          {greenieData && (
            <div style={{ background: '#e8f5e9', borderRadius: '10px', padding: '15px', marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#2e7d32' }}>Greenies</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' }}>
                {[4, 8, 12, 17].map(hole => {
                  const result = greenieData.results[hole]
                  return (
                    <div key={hole} style={{
                      background: 'white',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontWeight: '600' }}>Hole {hole}</span>
                      <span style={{ color: result?.winner ? '#27ae60' : '#666' }}>
                        {result?.winnerName || 'No winner'}
                        {result?.winner && <span style={{ marginLeft: '5px' }}>${result.pot}</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                ${greenieData.settings.costPerHole}/hole - {greenieData.settings.carryover ? 'Carryovers enabled' : 'No carryovers'}
              </div>
            </div>
          )}

          {/* Who Owes Who */}
          <div style={{ background: 'white', borderRadius: '10px', padding: '15px', border: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Who Owes Who</h4>
            {(() => {
              const settlements = []
              const balances = {}

              // Calculate total balances including greenies
              Object.entries(playerSummary).forEach(([playerId, summary]) => {
                let total = summary.netAmount
                if (greenieData?.summary?.[playerId]) {
                  total += greenieData.summary[playerId].netAmount
                }
                balances[playerId] = { name: summary.name, balance: total }
              })

              const debtors = Object.entries(balances).filter(([_, b]) => b.balance < 0).sort((a, b) => a[1].balance - b[1].balance)
              const creditors = Object.entries(balances).filter(([_, b]) => b.balance > 0).sort((a, b) => b[1].balance - a[1].balance)

              let dIdx = 0, cIdx = 0
              const remaining = {}
              debtors.forEach(([id, b]) => remaining[id] = Math.abs(b.balance))
              creditors.forEach(([id, b]) => remaining[id] = b.balance)

              while (dIdx < debtors.length && cIdx < creditors.length) {
                const [dId, dInfo] = debtors[dIdx]
                const [cId, cInfo] = creditors[cIdx]
                const amount = Math.min(remaining[dId], remaining[cId])

                if (amount > 0) {
                  settlements.push({ from: dInfo.name, to: cInfo.name, amount })
                }

                remaining[dId] -= amount
                remaining[cId] -= amount

                if (remaining[dId] <= 0) dIdx++
                if (remaining[cId] <= 0) cIdx++
              }

              if (settlements.length === 0) {
                return <div style={{ color: '#666', textAlign: 'center' }}>No settlements needed</div>
              }

              const paidSettlements = record.paidSettlements || {}
              const paidCount = settlements.filter(s => paidSettlements[`${s.from}->${s.to}`]).length
              const remainingCount = settlements.length - paidCount

              const togglePaid = (from, to) => {
                const key = `${from}->${to}`
                const newPaidSettlements = { ...paidSettlements, [key]: !paidSettlements[key] }
                if (onUpdatePaidSettlements) {
                  onUpdatePaidSettlements(newPaidSettlements)
                }
              }

              // Sort: unpaid first, then paid
              const sortedSettlements = [...settlements].sort((a, b) => {
                const aKey = `${a.from}->${a.to}`
                const bKey = `${b.from}->${b.to}`
                const aPaid = paidSettlements[aKey] || false
                const bPaid = paidSettlements[bKey] || false
                if (aPaid === bPaid) return 0
                return aPaid ? 1 : -1
              })

              return (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                    padding: '6px 10px',
                    background: remainingCount === 0 ? '#d4edda' : '#fff3cd',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    <span>
                      {remainingCount === 0 ? (
                        <span style={{ color: '#27ae60', fontWeight: '600' }}>✓ All payments complete!</span>
                      ) : (
                        <span style={{ color: '#856404' }}>
                          <strong>{remainingCount}</strong> payment{remainingCount !== 1 ? 's' : ''} remaining
                        </span>
                      )}
                    </span>
                    {paidCount > 0 && (
                      <span style={{ color: '#666' }}>
                        {paidCount} of {settlements.length} paid
                      </span>
                    )}
                  </div>
                  {sortedSettlements.map((s, idx) => {
                    const key = `${s.from}->${s.to}`
                    const isPaid = paidSettlements[key] || false
                    return (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: idx < sortedSettlements.length - 1 ? '1px solid #eee' : 'none',
                        opacity: isPaid ? 0.75 : 1
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isPaid}
                            onChange={() => togglePaid(s.from, s.to)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ textDecoration: isPaid ? 'line-through' : 'none' }}>
                            <strong>{s.from}</strong> owes <strong>{s.to}</strong>
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontWeight: '700',
                            color: isPaid ? '#999' : '#e74c3c',
                            textDecoration: isPaid ? 'line-through' : 'none'
                          }}>${s.amount.toFixed(0)}</span>
                          {isPaid && (
                            <span style={{ color: '#27ae60', fontSize: '11px', fontWeight: '600' }}>✓ PAID</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

function HistoryPage() {
  const { history, setHistory, isAdmin, payoutFormats, holeInOnePot, quickSkinsHistory, setQuickSkinsHistory } = useLeague()
  const [viewingRound, setViewingRound] = useState(null)
  const [deletingRound, setDeletingRound] = useState(null)
  const [viewingQuickSkins, setViewingQuickSkins] = useState(null)
  const [deletingQuickSkins, setDeletingQuickSkins] = useState(null)

  // Filter state
  const [historyType, setHistoryType] = useState('all') // 'all', 'league', 'quickSkins'
  const [historyFilter, setHistoryFilter] = useState('all')
  const [historyFilterYear, setHistoryFilterYear] = useState(new Date().getFullYear())
  const [historyFilterStartDate, setHistoryFilterStartDate] = useState('')
  const [historyFilterEndDate, setHistoryFilterEndDate] = useState('')
  const [historyFilterLastX, setHistoryFilterLastX] = useState(5)

  const handleDeleteRound = (roundId) => {
    setHistory(history.filter(r => r.id !== roundId))
    setDeletingRound(null)
  }

  const handleDeleteQuickSkins = (recordId) => {
    setQuickSkinsHistory((quickSkinsHistory || []).filter(r => r.id !== recordId))
    setDeletingQuickSkins(null)
  }

  // Update paid settlements for a league round
  const handleUpdateRoundPaidSettlements = (roundId, paidSettlements) => {
    setHistory(history.map(r => {
      if (r.id === roundId && r.skinsMatch) {
        return { ...r, skinsMatch: { ...r.skinsMatch, paidSettlements } }
      }
      return r
    }))
    // Also update viewingRound if it's the same round
    if (viewingRound?.id === roundId) {
      setViewingRound(prev => ({
        ...prev,
        skinsMatch: { ...prev.skinsMatch, paidSettlements }
      }))
    }
  }

  // Update paid settlements for a quick skins record
  const handleUpdateQuickSkinsPaidSettlements = (recordId, paidSettlements) => {
    setQuickSkinsHistory((quickSkinsHistory || []).map(r => {
      if (r.id === recordId) {
        return { ...r, paidSettlements }
      }
      return r
    }))
    // Also update viewingQuickSkins if it's the same record
    if (viewingQuickSkins?.id === recordId) {
      setViewingQuickSkins(prev => ({ ...prev, paidSettlements }))
    }
  }

  // Get available years from history
  const availableYears = [...new Set(history.map(r => new Date(r.date).getFullYear()))].sort((a, b) => b - a)

  // Apply filters
  const getFilteredHistory = () => {
    let filtered = [...history]

    if (historyFilter === 'year') {
      filtered = filtered.filter(r => new Date(r.date).getFullYear() === historyFilterYear)
    } else if (historyFilter === 'range' && historyFilterStartDate && historyFilterEndDate) {
      const start = new Date(historyFilterStartDate)
      const end = new Date(historyFilterEndDate)
      end.setHours(23, 59, 59) // Include the end date fully
      filtered = filtered.filter(r => {
        const rDate = new Date(r.date)
        return rDate >= start && rDate <= end
      })
    } else if (historyFilter === 'lastX') {
      filtered = filtered.slice(0, historyFilterLastX)
    }

    return filtered
  }

  const filteredHistory = getFilteredHistory()

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Round History</h2>

      {/* Type Filter Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px' }}>
        <button
          onClick={() => setHistoryType('all')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: historyType === 'all' ? '#1a472a' : '#e0e0e0',
            color: historyType === 'all' ? 'white' : '#666',
            fontWeight: '600',
            cursor: 'pointer',
            borderRadius: '8px 0 0 8px',
            fontSize: '14px'
          }}
        >
          All ({history.length + (quickSkinsHistory?.length || 0)})
        </button>
        <button
          onClick={() => setHistoryType('league')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: historyType === 'league' ? '#1a472a' : '#e0e0e0',
            color: historyType === 'league' ? 'white' : '#666',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          League Rounds ({history.length})
        </button>
        <button
          onClick={() => setHistoryType('quickSkins')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: historyType === 'quickSkins' ? '#f39c12' : '#e0e0e0',
            color: historyType === 'quickSkins' ? 'white' : '#666',
            fontWeight: '600',
            cursor: 'pointer',
            borderRadius: '0 8px 8px 0',
            fontSize: '14px'
          }}
        >
          Quick Skins ({quickSkinsHistory?.length || 0})
        </button>
      </div>

      {history.length === 0 && (!quickSkinsHistory || quickSkinsHistory.length === 0) ? (
        <div className="empty-state">
          <h3>No Rounds Yet</h3>
          <p>Completed rounds will appear here with full scoring details.</p>
        </div>
      ) : (
        <>
          {/* Filter Bar - only show for league rounds */}
          {(historyType === 'all' || historyType === 'league') && history.length > 0 && (
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '2px solid #e0e0e0', fontSize: '14px' }}
              >
                <option value="all">All Rounds</option>
                <option value="year">By Year</option>
                <option value="range">Date Range</option>
                <option value="lastX">Last X Rounds</option>
              </select>

              {historyFilter === 'year' && availableYears.length > 0 && (
                <select
                  value={historyFilterYear}
                  onChange={(e) => setHistoryFilterYear(parseInt(e.target.value))}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '2px solid #e0e0e0', fontSize: '14px' }}
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              )}

              {historyFilter === 'range' && (
                <>
                  <input
                    type="date"
                    value={historyFilterStartDate}
                    onChange={(e) => setHistoryFilterStartDate(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '2px solid #e0e0e0', fontSize: '14px' }}
                  />
                  <span style={{ color: '#666' }}>to</span>
                  <input
                    type="date"
                    value={historyFilterEndDate}
                    onChange={(e) => setHistoryFilterEndDate(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '2px solid #e0e0e0', fontSize: '14px' }}
                  />
                </>
              )}

              {historyFilter === 'lastX' && (
                <select
                  value={historyFilterLastX}
                  onChange={(e) => setHistoryFilterLastX(parseInt(e.target.value))}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '2px solid #e0e0e0', fontSize: '14px' }}
                >
                  <option value="3">Last 3</option>
                  <option value="5">Last 5</option>
                  <option value="10">Last 10</option>
                  <option value="20">Last 20</option>
                </select>
              )}

              <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#666' }}>
                Showing {filteredHistory.length} of {history.length} league round{history.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          )}

          {/* League Rounds */}
          {(historyType === 'all' || historyType === 'league') && (
            <>
              {historyType === 'all' && history.length > 0 && (
                <h3 style={{ marginBottom: '15px', marginTop: historyType === 'all' ? '0' : '20px' }}>
                  <span style={{
                    background: '#1a472a',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}>League Rounds</span>
                </h3>
              )}
              {filteredHistory.length === 0 && historyType === 'league' ? (
                <div className="alert alert-info">
                  No league rounds match the selected filter.
                </div>
              ) : (
                filteredHistory.map(round => (
                  <RoundCard
                    key={round.id}
                    round={round}
                    onView={setViewingRound}
                    onDelete={setDeletingRound}
                    isAdmin={isAdmin}
                  />
                ))
              )}
            </>
          )}

          {/* Quick Skins History */}
          {(historyType === 'all' || historyType === 'quickSkins') && quickSkinsHistory && quickSkinsHistory.length > 0 && (
            <div style={{ marginTop: historyType === 'all' ? '30px' : '0' }}>
              {historyType === 'all' && (
                <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}>Quick Skins</span>
                </h3>
              )}
              {quickSkinsHistory.map(record => (
                <QuickSkinsCard
                  key={record.id}
                  record={record}
                  onView={setViewingQuickSkins}
                  onDelete={setDeletingQuickSkins}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}

          {/* Show empty state for Quick Skins only view */}
          {historyType === 'quickSkins' && (!quickSkinsHistory || quickSkinsHistory.length === 0) && (
            <div className="alert alert-info">
              No Quick Skins matches yet.
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {viewingRound && (
        <RoundDetailModal
          round={viewingRound}
          onClose={() => setViewingRound(null)}
          payoutFormats={payoutFormats}
          holeInOnePot={holeInOnePot}
          onUpdatePaidSettlements={(paidSettlements) => handleUpdateRoundPaidSettlements(viewingRound.id, paidSettlements)}
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

      {/* Quick Skins Detail Modal */}
      {viewingQuickSkins && (
        <QuickSkinsDetailModal
          record={viewingQuickSkins}
          onClose={() => setViewingQuickSkins(null)}
          onUpdatePaidSettlements={(paidSettlements) => handleUpdateQuickSkinsPaidSettlements(viewingQuickSkins.id, paidSettlements)}
        />
      )}

      {/* Quick Skins Delete Confirm */}
      {deletingQuickSkins && (
        <div className="modal-overlay" onClick={() => setDeletingQuickSkins(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Quick Skins Record?</h3>
              <button className="modal-close" onClick={() => setDeletingQuickSkins(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '20px', color: '#666' }}>
                This will permanently delete this Quick Skins match record.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-danger" onClick={() => handleDeleteQuickSkins(deletingQuickSkins.id)}>
                  Delete
                </button>
                <button className="btn btn-secondary" onClick={() => setDeletingQuickSkins(null)}>
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

export default HistoryPage
