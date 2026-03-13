import { useState, useEffect, useCallback } from 'react'
import { getLeaguesForProfileWithCounts, getPublicLeagues } from '../lib/leagueService'
import { useLeague } from '../context/LeagueContext'

function MyLeaguesScreen({ profile, onSelectLeague, onCreateNew, onJoinExisting, onStartCasualGame, onStartIndividualRound, onViewRoundHistory }) {
  const { isAdmin } = useLeague()
  const [allLeagues, setAllLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [publicLeagues, setPublicLeagues] = useState([])
  const [publicLoading, setPublicLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  const fetchPublicLeagues = useCallback(async (query) => {
    setPublicLoading(true)
    try {
      const data = await getPublicLeagues(query)
      // Filter out leagues the user is already a member of
      const myLeagueIds = new Set(allLeagues.map(m => m.league_id))
      setPublicLeagues(data.filter(l => !myLeagueIds.has(l.id)))
    } catch (err) {
      console.error('Error fetching public leagues:', err)
    }
    setPublicLoading(false)
  }, [allLeagues])

  useEffect(() => {
    if (browseOpen) {
      fetchPublicLeagues(searchQuery)
    }
  }, [browseOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!browseOpen) return
    const timer = setTimeout(() => {
      fetchPublicLeagues(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Hide test leagues and casual/individual games from the league list
  const leagues = allLeagues.filter(m => {
    if (!isAdmin && m.leagues?.is_test) return false
    if (m.leagues?.type === 'casual' || m.leagues?.type === 'individual') return false
    return true
  })

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
          {/* Casual Game - Functional */}
          <button
            onClick={onStartCasualGame}
            style={{
              background: 'var(--color-surface)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '12px',
              border: '2px solid var(--color-success)',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              transition: 'box-shadow 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 2px 12px rgba(39,174,96,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px', color: 'var(--color-text-primary)' }}>
                  Casual Game
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Play a round with friends &mdash; same formats, no league needed
                </div>
              </div>
              <span style={{
                background: 'var(--color-success)',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                NEW
              </span>
            </div>
          </button>

          {/* Individual Play */}
          <button
            onClick={onStartIndividualRound}
            style={{
              background: 'var(--color-surface)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '4px',
              border: '2px solid var(--color-info)',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              transition: 'box-shadow 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 2px 12px rgba(52,152,219,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px', color: 'var(--color-text-primary)' }}>
                  Individual Play
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Track personal rounds & stats
                </div>
              </div>
              <span style={{
                background: 'var(--color-info)',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                NEW
              </span>
            </div>
          </button>
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <button
              onClick={onViewRoundHistory}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-info)',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '6px 12px',
                fontWeight: '500'
              }}
            >
              View Round History
            </button>
          </div>

          {/* My Leagues Section */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--color-text-tertiary)',
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
                color: 'var(--color-text-tertiary)'
              }}>
                <div className="spinner-tiny" style={{ margin: '0 auto 10px' }} />
                Loading leagues...
              </div>
            ) : leagues.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '30px 20px',
                color: 'var(--color-text-tertiary)',
                background: 'var(--color-surface-sunken)',
                borderRadius: '12px',
                border: '2px dashed var(--color-border)'
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
                    ? 'var(--color-success)'
                    : membership.role === 'admin'
                      ? 'var(--color-skins-dark)'
                      : 'var(--color-info)'

                  return (
                    <button
                      key={league.id}
                      onClick={() => onSelectLeague(league.id)}
                      style={{
                        background: 'var(--color-surface)',
                        border: '2px solid var(--color-border)',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-success)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(39,174,96,0.15)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '16px', color: 'var(--color-text-primary)' }}>
                            {league.name || league.id}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                          color: 'var(--color-disabled)',
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
                background: 'var(--color-success)',
                color: 'var(--color-text-on-primary)',
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
                background: 'var(--color-surface)',
                color: 'var(--color-success)',
                border: '2px solid var(--color-success)',
                fontWeight: '600',
                width: '100%',
                padding: '14px'
              }}
            >
              Join with Code
            </button>
          </div>

          {/* Browse Public Leagues */}
          <div style={{ marginTop: '24px' }}>
            <button
              onClick={() => setBrowseOpen(!browseOpen)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '8px 0',
                width: '100%',
                textAlign: 'center',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span style={{
                display: 'inline-block',
                transform: browseOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}>
                ›
              </span>
              Browse Public Leagues
            </button>

            {browseOpen && (
              <div style={{ marginTop: '12px' }}>
                <input
                  type="text"
                  placeholder="Search leagues by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '2px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                    marginBottom: '12px',
                    boxSizing: 'border-box'
                  }}
                />

                {publicLoading ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: 'var(--color-text-tertiary)'
                  }}>
                    <div className="spinner-tiny" style={{ margin: '0 auto 8px' }} />
                    Searching...
                  </div>
                ) : publicLeagues.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: 'var(--color-text-tertiary)',
                    fontSize: '13px'
                  }}>
                    No public leagues found
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {publicLeagues.map((league) => (
                      <div
                        key={league.id}
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--color-text-primary)' }}>
                            {league.name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                            {league.memberCount} member{league.memberCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => onSelectLeague(league.id)}
                          style={{
                            background: 'var(--color-success)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 14px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Request to Join
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyLeaguesScreen
