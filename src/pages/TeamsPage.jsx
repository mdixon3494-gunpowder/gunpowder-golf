import { useNavigate } from 'react-router-dom'
import { useLeague } from '../context/LeagueContext'
import { getTeamName, calculateTeamSkill, calculateTeamBalance } from '../utils/teamGeneration'

function TeamCard({ team, index, totalTeams, onMoveUp, onMoveDown, isAdmin }) {
  const teamSkill = calculateTeamSkill(team)
  const avgSkill = team.length > 0 ? teamSkill / team.length : 0

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
        {getTeamName(team)} ({team.length}) - Avg Skill: {avgSkill.toFixed(1)}
      </div>
      {team.map(player => (
        <div key={player.id} className="team-member">
          {player.name} ({player.skillRating?.toFixed(1) || '5.0'})
        </div>
      ))}
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
    isAdmin
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
        players: team.map(p => ({
          id: p.id,
          name: p.name,
          skillRating: p.skillRating,
          scores: {},
          isDNF: false,
          includeInTeamScore: true,
          joinedLate: false
        })),
        totalScore: 0,
        isFinished: false,
        greenies: {}
      }))
    }

    setLiveRound(round)
    navigate('/live')
  }

  const clearTeams = () => {
    if (window.confirm('Clear all teams? This cannot be undone.')) {
      setTeams([])
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
