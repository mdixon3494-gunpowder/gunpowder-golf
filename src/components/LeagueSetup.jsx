import { useState, useRef, useEffect } from 'react'
import { useLeague } from '../context/LeagueContext'
import { useAuth } from '../context/AuthContext'

function LeagueSetup({ initialMode, initialJoinCode, onBack }) {
  const { createNewLeague, joinExistingLeague, checkLeagueCodeAvailable } = useLeague()
  const { profile } = useAuth()
  const [joinCode, setJoinCode] = useState(initialJoinCode || '')
  const [error, setError] = useState('')
  const [pendingMessage, setPendingMessage] = useState('')
  const [showCustomCode, setShowCustomCode] = useState(false)
  const [customCode, setCustomCode] = useState('')
  const [customCodeError, setCustomCodeError] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [leagueName, setLeagueName] = useState('')
  const joinRef = useRef(null)

  useEffect(() => {
    if (initialMode === 'join' && joinRef.current) {
      joinRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [initialMode])

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a league code')
      return
    }

    try {
      const result = await joinExistingLeague(joinCode, {
        profileId: profile?.id || null,
        displayName: profile?.display_name || null,
        email: profile?.email || null
      })
      if (result === 'pending') {
        setPendingMessage('Your request to join has been submitted. An admin will review it.')
        setError('')
      } else if (!result) {
        setError('League code not found. Please check the code and try again.')
      }
    } catch (err) {
      console.error('Join league error:', err)
      setError('Error joining league: ' + err.message)
    }
  }

  const handleCreateLeague = async (useCustomCode = false) => {
    setIsCreating(true)
    setCustomCodeError('')

    try {
      const result = await createNewLeague(useCustomCode ? customCode : null, {
        leagueName: leagueName.trim() || undefined,
        profileId: profile?.id || null
      })
      if (!result.success) {
        setCustomCodeError(result.error)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleCustomCodeChange = async (value) => {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setCustomCode(normalized)
    setCustomCodeError('')

    if (normalized.length >= 3) {
      setIsChecking(true)
      const result = await checkLeagueCodeAvailable(normalized)
      setIsChecking(false)
      if (!result.available) {
        setCustomCodeError(result.error)
      }
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Gunpowder Big Boy's Golf</h1>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '6px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              marginTop: '8px'
            }}
          >
            &larr; Back to My Leagues
          </button>
        )}
      </header>

      <div className="content">
        <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '30px' }}>Welcome to the League!</h2>

          <div style={{
            background: 'var(--color-success)',
            color: 'white',
            padding: '30px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '30px'
          }}>
            <h3 style={{ marginBottom: '15px' }}>Create New League</h3>
            <p style={{ marginBottom: '20px', opacity: 0.9 }}>
              Start a new league and invite your friends with the league code.
            </p>

            {/* League Name Field */}
            <div style={{ marginBottom: '15px', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', opacity: 0.9 }}>
                League Name (optional)
              </label>
              <input
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                placeholder="e.g. Big Boy's League"
                maxLength={50}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.15)',
                  color: 'white',
                  fontSize: '15px'
                }}
              />
            </div>

            {!showCustomCode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  className="btn"
                  onClick={() => handleCreateLeague(false)}
                  disabled={isCreating}
                  style={{
                    background: 'white',
                    color: 'var(--color-success)',
                    fontWeight: '600'
                  }}
                >
                  {isCreating ? 'Creating...' : 'Create League (Auto Code)'}
                </button>
                <button
                  className="btn"
                  onClick={() => setShowCustomCode(true)}
                  style={{
                    background: 'transparent',
                    color: 'white',
                    border: '2px solid white',
                    fontWeight: '600'
                  }}
                >
                  Use Custom Code
                </button>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: '10px', fontSize: '14px', opacity: 0.9 }}>
                  Enter a memorable code (letters & numbers only):
                </p>
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => handleCustomCodeChange(e.target.value)}
                  placeholder="e.g. GUNPOWDER"
                  maxLength={20}
                  style={{
                    textAlign: 'center',
                    fontSize: '20px',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    marginBottom: '10px',
                    width: '100%',
                    padding: '12px'
                  }}
                />
                {isChecking && (
                  <div style={{ fontSize: '14px', marginBottom: '10px' }}>Checking availability...</div>
                )}
                {customCodeError && (
                  <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    padding: '8px',
                    borderRadius: '5px',
                    marginBottom: '10px',
                    fontSize: '14px'
                  }}>
                    {customCodeError}
                  </div>
                )}
                {customCode.length >= 3 && !customCodeError && !isChecking && (
                  <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    padding: '8px',
                    borderRadius: '5px',
                    marginBottom: '10px',
                    fontSize: '14px'
                  }}>
                    ✓ "{customCode}" is available!
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn"
                    onClick={() => {
                      setShowCustomCode(false)
                      setCustomCode('')
                      setCustomCodeError('')
                    }}
                    style={{
                      background: 'transparent',
                      color: 'white',
                      border: '2px solid white',
                      flex: 1
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn"
                    onClick={() => handleCreateLeague(true)}
                    disabled={customCode.length < 3 || !!customCodeError || isChecking || isCreating}
                    style={{
                      background: 'white',
                      color: 'var(--color-success)',
                      fontWeight: '600',
                      flex: 1,
                      opacity: (customCode.length < 3 || !!customCodeError || isChecking) ? 0.5 : 1
                    }}
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div ref={joinRef} style={{
            background: 'var(--color-surface-sunken)',
            padding: '30px',
            borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--color-border)'
          }}>
            <h3 style={{ marginBottom: '15px', color: 'var(--color-text-primary)' }}>Join Existing League</h3>
            <p style={{ marginBottom: '20px', color: 'var(--color-text-secondary)' }}>
              Enter the league code from your organizer.
            </p>

            <div className="input-group" style={{ marginBottom: '15px' }}>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  setError('')
                }}
                placeholder="Enter league code"
                maxLength={20}
                style={{
                  textAlign: 'center',
                  fontSize: '20px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase'
                }}
              />
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '15px' }}>
                {error}
              </div>
            )}

            {pendingMessage && (
              <div style={{
                background: 'var(--color-warning-light)',
                color: 'var(--color-warning)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '15px',
                fontSize: '14px',
                border: '1px solid var(--color-warning)'
              }}>
                {pendingMessage}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleJoin}
              disabled={!joinCode.trim() || !!pendingMessage}
            >
              Join League
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeagueSetup
