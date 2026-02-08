import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { searchGhostProfilesByName, claimProfile } from '../../lib/profileService'

function ClaimProfileScreen() {
  const { user, createAndSetProfile, setClaimedProfile } = useAuth()
  const [ghostProfiles, setGhostProfiles] = useState([])
  const [searching, setSearching] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name || user?.user_metadata?.full_name || ''
  )

  useEffect(() => {
    searchForProfiles()
  }, [user])

  const searchForProfiles = async () => {
    setSearching(true)
    try {
      const timeoutMs = 5000
      const withTimeout = (p) => Promise.race([
        p,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Search timed out')), timeoutMs))
      ])

      // Search by display name from auth metadata
      const name = user?.user_metadata?.display_name || user?.user_metadata?.full_name || ''
      if (name) {
        const results = await withTimeout(searchGhostProfilesByName(name))
        setGhostProfiles(results)
      }
      // Also try email-based matching
      if (user?.email) {
        const emailResults = await withTimeout(searchGhostProfilesByName(user.email.split('@')[0]))
        // Merge results, avoiding duplicates
        setGhostProfiles(prev => {
          const ids = new Set(prev.map(p => p.id))
          const newResults = emailResults.filter(r => !ids.has(r.id))
          return [...prev, ...newResults]
        })
      }
    } catch (err) {
      console.error('Error searching ghost profiles:', err)
      // On timeout/error, just show the create form
    } finally {
      setSearching(false)
    }
  }

  const handleClaim = async (ghostProfile) => {
    setClaiming(true)
    setError('')
    try {
      const claimed = await claimProfile(ghostProfile.id, user.id, user.email)
      setClaimedProfile(claimed)
    } catch (err) {
      setError(err.message || 'Failed to claim profile. It may have already been claimed.')
      setClaiming(false)
    }
  }

  const handleCreateNew = async (e) => {
    e.preventDefault()
    if (!displayName.trim()) {
      setError('Please enter a display name')
      return
    }

    setCreating(true)
    setError('')
    try {
      await createAndSetProfile({
        displayName: displayName.trim()
      })
    } catch (err) {
      setError(err.message || 'Failed to create profile.')
      setCreating(false)
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Gunpowder Big Boy's Golf</h1>
      </header>

      <div className="content">
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '10px', textAlign: 'center' }}>Set Up Your Profile</h2>
          <p style={{ color: '#666', textAlign: 'center', marginBottom: '30px' }}>
            Welcome, {user?.email}! Let's link your account to a player profile.
          </p>

          {searching ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Searching for existing player profiles...
            </div>
          ) : ghostProfiles.length > 0 && !showCreateForm ? (
            <>
              <div style={{
                background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '15px',
                marginBottom: '20px'
              }}>
                <h3 style={{ marginBottom: '10px' }}>Existing Players Found</h3>
                <p style={{ opacity: 0.9, fontSize: '14px' }}>
                  We found player profiles that might be you. Claim yours to link it to your account.
                </p>
              </div>

              {ghostProfiles.map(ghost => (
                <div key={ghost.id} style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #e0e0e0',
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>
                      {ghost.display_name}
                    </div>
                    {ghost.league_count > 0 && (
                      <div style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>
                        Member of {ghost.league_count} league{ghost.league_count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleClaim(ghost)}
                    disabled={claiming}
                    style={{ padding: '10px 20px' }}
                  >
                    {claiming ? 'Claiming...' : 'Claim'}
                  </button>
                </div>
              ))}

              {error && (
                <div className="alert alert-error" style={{ marginTop: '15px' }}>
                  {error}
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                  onClick={() => setShowCreateForm(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#27ae60',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '14px',
                    padding: 0
                  }}
                >
                  None of these are me - Create New Profile
                </button>
              </div>
            </>
          ) : (
            <div style={{
              background: '#f8f9fa',
              padding: '30px',
              borderRadius: '15px',
              border: '2px solid #e0e0e0'
            }}>
              <h3 style={{ marginBottom: '15px', textAlign: 'center' }}>Create Your Profile</h3>
              <form onSubmit={handleCreateNew}>
                <div className="input-group" style={{ marginBottom: '15px' }}>
                  <label>Display Name *</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => { setDisplayName(e.target.value); setError('') }}
                    placeholder="Your name (shown to other players)"
                  />
                </div>

                <div style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
                  <label style={{ fontWeight: '500' }}>Email</label>
                  <div>{user?.email || 'Not set'}</div>
                </div>

                {error && (
                  <div className="alert alert-error" style={{ marginBottom: '15px' }}>
                    {error}
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={creating}
                  style={{ width: '100%', padding: '14px', fontSize: '16px' }}
                >
                  {creating ? 'Creating Profile...' : 'Create Profile'}
                </button>
              </form>

              {ghostProfiles.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: '13px',
                      padding: 0
                    }}
                  >
                    Back to existing profiles
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClaimProfileScreen
