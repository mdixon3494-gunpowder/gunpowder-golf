import { useState } from 'react'
import { useLeague } from '../context/LeagueContext'

function LeagueSetup() {
  const { createNewLeague, joinExistingLeague } = useLeague()
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a league code')
      return
    }

    const success = await joinExistingLeague(joinCode)
    if (!success) {
      setError('League code not found. Please check the code and try again.')
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Gunpowder Big Boy's Golf</h1>
      </header>

      <div className="content">
        <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '30px' }}>Welcome to the League!</h2>

          <div style={{
            background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
            color: 'white',
            padding: '30px',
            borderRadius: '15px',
            marginBottom: '30px'
          }}>
            <h3 style={{ marginBottom: '15px' }}>Create New League</h3>
            <p style={{ marginBottom: '20px', opacity: 0.9 }}>
              Start a new league and invite your friends with the league code.
            </p>
            <button
              className="btn"
              onClick={createNewLeague}
              style={{
                background: 'white',
                color: '#27ae60',
                fontWeight: '600'
              }}
            >
              Create League
            </button>
          </div>

          <div style={{
            background: '#f8f9fa',
            padding: '30px',
            borderRadius: '15px',
            border: '2px solid #e0e0e0'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#333' }}>Join Existing League</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Enter the 6-character code from your league organizer.
            </p>

            <div className="input-group" style={{ marginBottom: '15px' }}>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase())
                  setError('')
                }}
                placeholder="Enter league code"
                maxLength={6}
                style={{
                  textAlign: 'center',
                  fontSize: '24px',
                  letterSpacing: '3px',
                  textTransform: 'uppercase'
                }}
              />
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '15px' }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleJoin}
              disabled={!joinCode.trim()}
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
