import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLeague } from '../context/LeagueContext'
import { supabase } from '../lib/supabase'
import { addLeagueMember } from '../lib/leagueService'
import { getRoundHistoryByType } from '../lib/roundHistoryService'

function IndividualRoundSetup({ onBack }) {
  const { profile } = useAuth()
  const { switchLeague } = useLeague()

  const [holes, setHoles] = useState(18)
  const [startingHole, setStartingHole] = useState(1)
  const [tee, setTee] = useState('blue')
  const [handicap, setHandicap] = useState(0)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  // Pre-fill handicap from most recent individual round
  useEffect(() => {
    if (!profile?.id) return
    getRoundHistoryByType(profile.id, 'individual', 1).then(rounds => {
      if (rounds.length > 0) {
        if (rounds[0].handicap_used != null) {
          setHandicap(rounds[0].handicap_used)
        }
        if (rounds[0].metadata?.tee) {
          setTee(rounds[0].metadata.tee)
        }
      }
    }).catch(() => {})
  }, [profile?.id])

  const generateRoundCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const startRound = async () => {
    if (!profile) {
      setError('You must be logged in to start an individual round')
      return
    }
    setCreating(true)
    setError(null)

    try {
      const roundId = generateRoundCode()
      const effectiveStartingHole = holes === 9 ? startingHole : 1

      // Build player object
      const playerData = {
        id: profile.id,
        name: profile.display_name,
        handicap,
        skillRating: Math.max(1, Math.min(10, Math.round(10 - (handicap / 5.4)))),
        tee,
        scoreHistory: [],
        checkedIn: true,
        profileId: profile.id,
        isGuest: false,
        gamesPlayed: 0,
        avgTotal: 0,
        defaultTee: tee
      }

      // Build live round with 1 team, 1 player
      const liveRound = {
        id: Date.now(),
        date: new Date().toLocaleDateString('en-CA'),
        holesPlayed: holes,
        startingHole: effectiveStartingHole,
        teams: [{
          id: 0,
          name: profile.display_name,
          players: [{
            id: profile.id,
            name: profile.display_name,
            skillRating: playerData.skillRating,
            handicap,
            avgTotal: 0,
            scores: {},
            isDNF: false,
            includeInTeamScore: true,
            joinedLate: false,
            tee
          }],
          totalScore: 0,
          isFinished: false,
          greenies: {}
        }]
      }

      // JSONB data blob
      const roundData = {
        players: [playerData],
        teams: [[playerData]],
        liveRound,
        history: [],
        leagueSettings: { contactInfoVisibility: 'admin' },
        individualRoundInfo: {
          courseName: 'Gunpowder Golf Course',
          holes,
          startingHole: effectiveStartingHole,
          tee,
          handicap,
          createdBy: profile.id
        }
      }

      // Create the leagues row with type='individual'
      const { error: insertError } = await supabase
        .from('leagues')
        .upsert({
          id: roundId,
          data: roundData,
          name: `Round - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          owner_id: profile.id,
          type: 'individual',
          updated_at: new Date()
        })

      if (insertError) {
        throw new Error(`Failed to create round: ${insertError.message}`)
      }

      // Add league_members row
      try {
        await addLeagueMember(roundId, profile.id, 'owner')
      } catch (err) {
        console.warn('Could not add league member:', err)
      }

      // Switch to the new individual round
      await switchLeague(roundId)
    } catch (err) {
      console.error('Failed to start individual round:', err)
      setError(err.message || 'Failed to create round')
      setCreating(false)
    }
  }

  const tees = [
    { key: 'gold', label: 'Gold', color: '#f9a825' },
    { key: 'blue', label: 'Blue', color: '#3498db' },
    { key: 'red', label: 'Red', color: '#e74c3c' }
  ]

  return (
    <div className="app-container">
      <header className="header">
        <h1>Gunpowder Big Boy's Golf</h1>
        <div style={{ marginTop: '8px', fontSize: '15px', opacity: 0.9 }}>
          Individual Round
        </div>
      </header>

      <div className="content" style={{ paddingBottom: '100px' }}>
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

          {/* Course */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#333' }}>Course</h3>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a472a' }}>
              Gunpowder Golf Course
            </div>
          </div>

          {/* Holes */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#333' }}>Holes</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[9, 18].map(h => (
                <button
                  key={h}
                  onClick={() => setHoles(h)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: `2px solid ${holes === h ? '#3498db' : '#e0e0e0'}`,
                    background: holes === h ? '#ebf5fb' : 'white',
                    color: holes === h ? '#3498db' : '#666',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '15px'
                  }}
                >
                  {h}
                </button>
              ))}
            </div>

            {/* Starting Hole (only for 9 holes) */}
            {holes === 9 && (
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#555' }}>
                  Starting Hole
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ val: 1, label: 'Front 9 (1-9)' }, { val: 10, label: 'Back 9 (10-18)' }].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setStartingHole(opt.val)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: `2px solid ${startingHole === opt.val ? '#3498db' : '#e0e0e0'}`,
                        background: startingHole === opt.val ? '#ebf5fb' : 'white',
                        color: startingHole === opt.val ? '#3498db' : '#666',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tee */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#333' }}>Tee</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {tees.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTee(t.key)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: `2px solid ${tee === t.key ? t.color : '#e0e0e0'}`,
                    background: tee === t.key ? `${t.color}15` : 'white',
                    color: tee === t.key ? t.color : '#666',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Handicap */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid #e0e0e0'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#333' }}>Handicap</h3>
            <input
              type="number"
              value={handicap}
              onChange={(e) => setHandicap(parseInt(e.target.value) || 0)}
              min="0"
              max="54"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px',
                textAlign: 'center'
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fdeaea',
              color: '#c0392b',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={startRound}
            disabled={creating}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: creating
                ? '#ccc'
                : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
              color: 'white',
              fontSize: '18px',
              fontWeight: '700',
              cursor: creating ? 'default' : 'pointer'
            }}
          >
            {creating ? 'Starting Round...' : 'Start Round'}
          </button>

        </div>
      </div>
    </div>
  )
}

export default IndividualRoundSetup
