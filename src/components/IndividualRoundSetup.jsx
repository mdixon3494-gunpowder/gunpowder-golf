import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLeague } from '../context/LeagueContext'
import { supabase } from '../lib/supabase'
import { addLeagueMember } from '../lib/leagueService'
import { getRoundHistory } from '../lib/roundHistoryService'

function IndividualRoundSetup({ onBack }) {
  const { profile } = useAuth()
  const { switchLeague } = useLeague()

  const [startingHole, setStartingHole] = useState(1)
  const [holesPlayed, setHolesPlayed] = useState(18)
  const [tee, setTee] = useState('blue')
  const [handicap, setHandicap] = useState(0)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  // Pre-fill handicap from profile.handicap_index, fallback to most recent round
  // Pre-fill tee from most recent round
  useEffect(() => {
    if (!profile?.id) return

    // Use calculated handicap_index if available
    if (profile.handicap_index != null) {
      setHandicap(Math.round(profile.handicap_index))
    }

    // Still fetch most recent round for tee preference (and handicap fallback)
    getRoundHistory(profile.id, 1).then(rounds => {
      if (rounds.length > 0) {
        if (profile.handicap_index == null && rounds[0].handicap_used != null) {
          setHandicap(rounds[0].handicap_used)
        }
        if (rounds[0].metadata?.tee) {
          setTee(rounds[0].metadata.tee)
        }
      }
    }).catch(() => {})
  }, [profile?.id, profile?.handicap_index])

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
        holesPlayed,
        startingHole,
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
          holes: holesPlayed,
          startingHole,
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
    { key: 'gold', label: 'Gold', color: 'var(--color-accent-gold)' },
    { key: 'blue', label: 'Blue', color: 'var(--color-info)' },
    { key: 'red', label: 'Red', color: 'var(--color-danger)' }
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

          {/* Course */}
          <div style={{
            background: 'var(--color-surface)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid var(--color-border)'
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: 'var(--color-text-primary)' }}>Course</h3>
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-primary-dark)' }}>
              Gunpowder Golf Course
            </div>
          </div>

          {/* Starting Hole */}
          <div style={{
            background: 'var(--color-surface)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid var(--color-border)'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--color-text-primary)' }}>Starting Hole</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[{ val: 1, label: 'Hole 1 (Front)' }, { val: 10, label: 'Hole 10 (Back)' }].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setStartingHole(opt.val)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: `2px solid ${startingHole === opt.val ? 'var(--color-info)' : 'var(--color-border)'}`,
                    background: startingHole === opt.val ? 'var(--color-info-light)' : 'var(--color-surface)',
                    color: startingHole === opt.val ? 'var(--color-info)' : 'var(--color-text-secondary)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Holes */}
          <div style={{
            background: 'var(--color-surface)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid var(--color-border)'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--color-text-primary)' }}>Holes</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[{ val: 18, label: '18 Holes' }, { val: 9, label: '9 Holes' }].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setHolesPlayed(opt.val)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: `2px solid ${holesPlayed === opt.val ? 'var(--color-info)' : 'var(--color-border)'}`,
                    background: holesPlayed === opt.val ? 'var(--color-info-light)' : 'var(--color-surface)',
                    color: holesPlayed === opt.val ? 'var(--color-info)' : 'var(--color-text-secondary)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tee */}
          <div style={{
            background: 'var(--color-surface)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid var(--color-border)'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--color-text-primary)' }}>Tee</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {tees.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTee(t.key)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: `2px solid ${tee === t.key ? t.color : 'var(--color-border)'}`,
                    background: tee === t.key ? 'var(--color-surface-sunken)' : 'var(--color-surface)',
                    color: tee === t.key ? t.color : 'var(--color-text-secondary)',
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
            background: 'var(--color-surface)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid var(--color-border)'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--color-text-primary)' }}>Handicap</h3>
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
                border: '1px solid var(--color-border)',
                fontSize: '16px',
                textAlign: 'center'
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'var(--color-danger-light)',
              color: 'var(--color-danger-dark)',
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
                ? 'var(--color-disabled)'
                : 'var(--color-info)',
              color: 'var(--color-text-on-primary)',
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
