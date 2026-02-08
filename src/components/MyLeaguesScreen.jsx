import { useState, useEffect } from 'react'
import { getLeaguesForProfileWithCounts } from '../lib/leagueService'
import { useLeague } from '../context/LeagueContext'

function MyLeaguesScreen({ profile, onSelectLeague, onCreateNew, onJoinExisting }) {
  const { isAdmin } = useLeague()
  const [allLeagues, setAllLeagues] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeagues = async () => {
      if (!profile?.id) {
        setLoading(false)
        return
      }
      try {
        const data = await getLeaguesForProfileWithCounts(profile.id)
        setAllLeagues(data)
      } catch (err) {
        console.error('Error fetching leagues:', err)
      }
      setLoading(false)
    }
    fetchLeagues()
  }, [profile?.id])

  // Hide test leagues unless user is an admin
  const leagues = isAdmin
    ? allLeagues
    : allLeagues.filter(m => !m.leagues?.is_test)

  return (
    <div className="app-container">
      <header className="header">
        <h1>Gunpowder Big Boy's Golf</h1>
        <div style={{ marginTop: '8px', fontSize: '15px', opacity: 0.9 }}>
          Choose Your Mode
        </div>
      </header>

      <div className="content">
        <div style={{ maxWidth: '440px', margin: '0 auto' }}>
          {/* Individual Play - Coming Soon */}
          <div style={{
            background: '#f8f9fa',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '2px solid #e0e0e0',
            opacity: 0.6,
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px', color: '#333' }}>
                  Individual Play
                </div>
                <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                  Track personal rounds & stats
                </div>
              </div>
              <span style={{
                background: '#f39c12',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                COMING SOON
              </span>
            </div>
          </div>

          {/* My Leagues Section */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '700',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '12px'
            }}>
              My Leagues
            </div>

            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#888'
              }}>
                <div className="spinner-tiny" style={{ margin: '0 auto 10px' }} />
                Loading leagues...
              </div>
            ) : leagues.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '30px 20px',
                color: '#888',
                background: '#f8f9fa',
                borderRadius: '12px',
                border: '2px dashed #ddd'
              }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                  No leagues yet
                </div>
                <div style={{ fontSize: '13px' }}>
                  Create a new league or join one with a code
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {leagues.map((membership) => {
                  const league = membership.leagues
                  if (!league) return null

                  const roleBadge = membership.role === 'owner'
                    ? 'Owner'
                    : membership.role === 'admin'
                      ? 'Admin'
                      : 'Player'

                  const roleColor = membership.role === 'owner'
                    ? '#27ae60'
                    : membership.role === 'admin'
                      ? '#f39c12'
                      : '#3498db'

                  return (
                    <button
                      key={league.id}
                      onClick={() => onSelectLeague(league.id)}
                      style={{
                        background: 'white',
                        border: '2px solid #e0e0e0',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = '#27ae60'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(39,174,96,0.15)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = '#e0e0e0'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '16px', color: '#333' }}>
                            {league.name || league.id}
                          </div>
                          <div style={{ fontSize: '13px', color: '#888', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              background: roleColor,
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              {roleBadge}
                            </span>
                            <span>{membership.memberCount || 0} member{membership.memberCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div style={{
                          color: '#ccc',
                          fontSize: '20px'
                        }}>
                          ›
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            <button
              className="btn"
              onClick={onCreateNew}
              style={{
                background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
                color: 'white',
                fontWeight: '600',
                width: '100%',
                padding: '14px'
              }}
            >
              + Create League
            </button>
            <button
              className="btn"
              onClick={onJoinExisting}
              style={{
                background: 'white',
                color: '#27ae60',
                border: '2px solid #27ae60',
                fontWeight: '600',
                width: '100%',
                padding: '14px'
              }}
            >
              Join with Code
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyLeaguesScreen
