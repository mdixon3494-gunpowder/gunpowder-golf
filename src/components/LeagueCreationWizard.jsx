import { useState } from 'react'
import { useLeague } from '../context/LeagueContext'
import { useAuth } from '../context/AuthContext'
import { updateLeagueMetadata } from '../lib/leagueService'
import { FORMAT_CONFIGS } from '../utils/formatScoring'

const WIZARD_FORMATS = Object.entries(FORMAT_CONFIGS)
  .filter(([key]) => key !== 'track')
  .map(([key, cfg]) => ({ key, label: cfg.label, team: cfg.team }))

const STEPS = ['Basic Info', 'Format', 'Handicap', 'Side Games', 'Membership', 'Review']

function StepIndicator({ current, total }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? '24px' : '10px',
            height: '10px',
            borderRadius: '5px',
            background: i <= current ? '#27ae60' : '#ddd',
            transition: 'all 0.2s'
          }}
        />
      ))}
    </div>
  )
}

function LeagueCreationWizard({ onBack, onCreated }) {
  const { createNewLeague, checkLeagueCodeAvailable } = useLeague()
  const { profile } = useAuth()

  const [step, setStep] = useState(0)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Basic Info
  const [leagueName, setLeagueName] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [useCustomCode, setUseCustomCode] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [codeChecking, setCodeChecking] = useState(false)
  const [courseName, setCourseName] = useState('')

  // Step 2: Format
  const [defaultFormat, setDefaultFormat] = useState('bigboys')
  const [teamSize, setTeamSize] = useState(4)

  // Step 3: Handicap
  const [handicapMode, setHandicapMode] = useState('auto')
  const [handicapScope, setHandicapScope] = useState('gunpowder')
  const [maxHandicap, setMaxHandicap] = useState(36)
  const [freezeEnabled, setFreezeEnabled] = useState(false)

  // Step 4: Side Games
  const [sideGames, setSideGames] = useState({
    allowSkins: true,
    allowNassau: true,
    allowWolf: true
  })

  // Step 5: Membership
  const [visibility, setVisibility] = useState('private')
  const [joinApprovalRequired, setJoinApprovalRequired] = useState(false)

  const handleCodeChange = async (value) => {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setCustomCode(normalized)
    setCodeError('')
    if (normalized.length >= 3) {
      setCodeChecking(true)
      const result = await checkLeagueCodeAvailable(normalized)
      setCodeChecking(false)
      if (!result.available) setCodeError(result.error)
    }
  }

  const handleQuickCreate = async () => {
    setCreating(true)
    setError('')
    try {
      const result = await createNewLeague(null, {
        leagueName: leagueName.trim() || 'My League',
        profileId: profile?.id || null
      })
      if (result.success) {
        if (onCreated) onCreated(result.leagueId)
      } else {
        setError(result.error)
        setCreating(false)
      }
    } catch (err) {
      setError(err.message)
      setCreating(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    setError('')
    try {
      const code = useCustomCode && customCode.length >= 3 ? customCode : null
      const result = await createNewLeague(code, {
        leagueName: leagueName.trim() || 'My League',
        profileId: profile?.id || null,
        initialSettings: {
          defaultFormat,
          teamSize,
          handicapSettings: {
            mode: handicapMode,
            scope: handicapScope,
            maxHandicap,
            freezeMode: freezeEnabled ? 'exclude' : 'off'
          },
          sideGames: { enabled: true, ...sideGames },
          courseName
        }
      })
      if (!result.success) {
        setError(result.error)
        setCreating(false)
        return
      }
      // Update league metadata columns for visibility/approval
      try {
        await updateLeagueMetadata(result.leagueId, {
          visibility,
          join_approval_required: joinApprovalRequired
        })
      } catch (err) {
        console.warn('Could not set league metadata:', err)
      }
      if (onCreated) onCreated(result.leagueId)
    } catch (err) {
      setError(err.message)
      setCreating(false)
    }
  }

  const canAdvance = () => {
    if (step === 0) return leagueName.trim().length > 0
    if (step === 0 && useCustomCode) return customCode.length >= 3 && !codeError && !codeChecking
    return true
  }

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <div>
          <h3 style={{ marginBottom: '20px' }}>League Details</h3>

          <button
            onClick={handleQuickCreate}
            disabled={creating}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #27ae60, #229954)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            {creating ? 'Creating...' : 'Quick Create (Big Boys defaults)'}
          </button>

          <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', marginBottom: '20px' }}>
            or customize your league settings below
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
              League Name *
            </label>
            <input
              type="text"
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              placeholder="e.g. Gunpowder Big Boys"
              maxLength={50}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '15px'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
              Primary Course (optional)
            </label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. Gunpowder Golf Course"
              maxLength={80}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '15px'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              <input
                type="checkbox"
                checked={useCustomCode}
                onChange={(e) => {
                  setUseCustomCode(e.target.checked)
                  if (!e.target.checked) { setCustomCode(''); setCodeError('') }
                }}
              />
              <span>Use custom league code</span>
            </label>

            {useCustomCode && (
              <div style={{ marginTop: '10px' }}>
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="e.g. GUNPOWDER"
                  maxLength={20}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: codeError ? '2px solid #e74c3c' : '1px solid #ddd',
                    fontSize: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    textAlign: 'center'
                  }}
                />
                {codeChecking && <div style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>Checking...</div>}
                {codeError && <div style={{ fontSize: '13px', color: '#e74c3c', marginTop: '4px' }}>{codeError}</div>}
                {customCode.length >= 3 && !codeError && !codeChecking && (
                  <div style={{ fontSize: '13px', color: '#27ae60', marginTop: '4px' }}>"{customCode}" is available</div>
                )}
              </div>
            )}
          </div>
        </div>
      )

      case 1: return (
        <div>
          <h3 style={{ marginBottom: '8px' }}>Default Format</h3>
          <p style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>
            You can override this per round. Choose your league's most common format.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {WIZARD_FORMATS.map(f => (
              <button
                key={f.key}
                onClick={() => setDefaultFormat(f.key)}
                style={{
                  padding: '14px 10px',
                  borderRadius: '10px',
                  border: defaultFormat === f.key ? '2px solid #27ae60' : '2px solid #e0e0e0',
                  background: defaultFormat === f.key ? '#e8f5e9' : 'white',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: defaultFormat === f.key ? '600' : '400'
                }}
              >
                {f.label}
                {f.team && <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>Team</div>}
              </button>
            ))}
          </div>

          {FORMAT_CONFIGS[defaultFormat]?.team && (
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
                Default Team Size
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setTeamSize(n)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: teamSize === n ? '2px solid #27ae60' : '2px solid #e0e0e0',
                      background: teamSize === n ? '#e8f5e9' : 'white',
                      cursor: 'pointer',
                      fontWeight: teamSize === n ? '600' : '400'
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )

      case 2: return (
        <div>
          <h3 style={{ marginBottom: '8px' }}>Handicap Settings</h3>
          <p style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>
            You can fine-tune these later in Settings.
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
              Calculation Mode
            </label>
            {[
              { value: 'auto', label: 'Auto Calculate', desc: 'Based on round history (recommended)' },
              { value: 'manual', label: 'Manual Entry', desc: 'Admin sets handicaps manually' },
              { value: 'none', label: 'No Handicaps', desc: 'Scratch play only' }
            ].map(opt => (
              <label key={opt.value} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px',
                borderRadius: '8px',
                border: handicapMode === opt.value ? '2px solid #27ae60' : '1px solid #e0e0e0',
                background: handicapMode === opt.value ? '#e8f5e9' : 'white',
                marginBottom: '8px',
                cursor: 'pointer'
              }}>
                <input
                  type="radio"
                  checked={handicapMode === opt.value}
                  onChange={() => setHandicapMode(opt.value)}
                  style={{ marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{opt.label}</div>
                  <div style={{ color: '#666', fontSize: '12px' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {handicapMode === 'auto' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
                  Handicap Scope
                </label>
                {[
                  { value: 'gunpowder', label: 'This Course Only', desc: 'Only rounds at this course count' },
                  { value: 'league', label: 'League Rounds', desc: 'Only rounds from this league' },
                  { value: 'true', label: 'All Rounds', desc: 'Include casual and other leagues' }
                ].map(opt => (
                  <label key={opt.value} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: handicapScope === opt.value ? '2px solid #27ae60' : '1px solid #e0e0e0',
                    background: handicapScope === opt.value ? '#e8f5e9' : 'white',
                    marginBottom: '6px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      checked={handicapScope === opt.value}
                      onChange={() => setHandicapScope(opt.value)}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>{opt.label}</div>
                      <div style={{ color: '#666', fontSize: '12px' }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
                  Max Handicap: {maxHandicap}
                </label>
                <input
                  type="range"
                  min={18}
                  max={54}
                  value={maxHandicap}
                  onChange={(e) => setMaxHandicap(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999' }}>
                  <span>18</span><span>36</span><span>54</span>
                </div>
              </div>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                <input
                  type="checkbox"
                  checked={freezeEnabled}
                  onChange={(e) => setFreezeEnabled(e.target.checked)}
                />
                <span>Enable handicap freeze (season-based)</span>
              </label>
            </>
          )}
        </div>
      )

      case 3: return (
        <div>
          <h3 style={{ marginBottom: '8px' }}>Side Games</h3>
          <p style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>
            Enable optional side games your members can play.
          </p>

          {[
            { key: 'allowSkins', label: 'Skins', desc: 'Win money on individual holes', color: '#e65100' },
            { key: 'allowNassau', label: 'Nassau', desc: 'Front 9 / Back 9 / Overall bets', color: '#2e7d32' },
            { key: 'allowWolf', label: 'Wolf', desc: '4-player rotation game (partner or lone wolf)', color: '#6a1b9a' }
          ].map(game => (
            <label key={game.key} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              borderRadius: '10px',
              border: sideGames[game.key] ? `2px solid ${game.color}` : '2px solid #e0e0e0',
              background: sideGames[game.key] ? `${game.color}10` : 'white',
              marginBottom: '10px',
              cursor: 'pointer'
            }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '15px', color: sideGames[game.key] ? game.color : '#333' }}>
                  {game.label}
                </div>
                <div style={{ color: '#666', fontSize: '12px', marginTop: '2px' }}>{game.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={sideGames[game.key]}
                onChange={(e) => setSideGames(prev => ({ ...prev, [game.key]: e.target.checked }))}
                style={{ width: '20px', height: '20px' }}
              />
            </label>
          ))}
        </div>
      )

      case 4: return (
        <div>
          <h3 style={{ marginBottom: '8px' }}>Membership Settings</h3>
          <p style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>
            Control who can find and join your league.
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
              Visibility
            </label>
            {[
              { value: 'private', label: 'Private', desc: 'Only joinable with league code or invite link' },
              { value: 'public', label: 'Public', desc: 'Anyone can find and request to join' }
            ].map(opt => (
              <label key={opt.value} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px',
                borderRadius: '8px',
                border: visibility === opt.value ? '2px solid #27ae60' : '1px solid #e0e0e0',
                background: visibility === opt.value ? '#e8f5e9' : 'white',
                marginBottom: '8px',
                cursor: 'pointer'
              }}>
                <input
                  type="radio"
                  checked={visibility === opt.value}
                  onChange={() => setVisibility(opt.value)}
                  style={{ marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{opt.label}</div>
                  <div style={{ color: '#666', fontSize: '12px' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={joinApprovalRequired}
              onChange={(e) => setJoinApprovalRequired(e.target.checked)}
              style={{ marginTop: '2px' }}
            />
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>Require Admin Approval</div>
              <div style={{ color: '#666', fontSize: '12px' }}>
                New members must be approved by an admin before joining
              </div>
            </div>
          </label>
        </div>
      )

      case 5: return (
        <div>
          <h3 style={{ marginBottom: '16px' }}>Review Your League</h3>

          {[
            { label: 'League Name', value: leagueName || 'My League' },
            { label: 'League Code', value: useCustomCode && customCode.length >= 3 ? customCode : 'Auto-generated' },
            { label: 'Course', value: courseName || 'Not set' },
            { label: 'Default Format', value: FORMAT_CONFIGS[defaultFormat]?.label || defaultFormat },
            { label: 'Handicap Mode', value: handicapMode === 'auto' ? `Auto (${handicapScope})` : handicapMode === 'manual' ? 'Manual' : 'None' },
            { label: 'Max Handicap', value: handicapMode !== 'none' ? maxHandicap : 'N/A' },
            { label: 'Side Games', value: Object.entries(sideGames).filter(([, v]) => v).map(([k]) => k.replace('allow', '')).join(', ') || 'None' },
            { label: 'Visibility', value: visibility === 'private' ? 'Private' : 'Public' },
            { label: 'Approval Required', value: joinApprovalRequired ? 'Yes' : 'No' }
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid #f0f0f0',
              fontSize: '14px'
            }}>
              <span style={{ color: '#666' }}>{item.label}</span>
              <span style={{ fontWeight: '600' }}>{item.value}</span>
            </div>
          ))}

          {error && (
            <div style={{
              background: '#ffebee',
              color: '#c62828',
              padding: '10px',
              borderRadius: '8px',
              marginTop: '16px',
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}
        </div>
      )

      default: return null
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Create League</h1>
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
            &larr; Back
          </button>
        )}
      </header>

      <div className="content">
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <StepIndicator current={step} total={STEPS.length} />

          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #e0e0e0',
            marginBottom: '20px'
          }}>
            {renderStep()}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: '2px solid #ddd',
                  background: 'white',
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Back
              </button>
            )}

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canAdvance()}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: canAdvance() ? '#27ae60' : '#ccc',
                  color: 'white',
                  fontSize: '15px',
                  cursor: canAdvance() ? 'pointer' : 'default',
                  fontWeight: '600'
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: creating ? '#ccc' : 'linear-gradient(135deg, #27ae60, #229954)',
                  color: 'white',
                  fontSize: '15px',
                  cursor: creating ? 'default' : 'pointer',
                  fontWeight: '600'
                }}
              >
                {creating ? 'Creating...' : 'Create League'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeagueCreationWizard
