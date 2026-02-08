import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../context/LeagueContext'
import { useAuth } from '../context/AuthContext'
import { removeLeagueMember } from '../lib/leagueService'
import CourseMappingTool from '../components/gps/CourseMappingTool'
import { runAllPendingMigrations, getPendingMigrations } from '../lib/migrations/index'
import {
  DEFAULT_HANDICAP_SETTINGS,
  DEFAULT_COURSE_TEES,
  getScopeLabel,
  calculateLockedHandicaps,
  isDateInFreezePeriod
} from '../utils/handicapCalculation'

function AdminLoginSection({ isAdmin, onLogin, onLogout }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const handleLogin = () => {
    const success = onLogin(pin)
    if (!success) {
      setError('Incorrect PIN')
      setPin('')
    }
  }

  if (isAdmin) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>Admin Mode Active</div>
            <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
              You have access to all admin features
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Admin Login</h3>
      <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
        Enter the admin PIN to access restricted features like editing players, finishing rounds, and managing settings.
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="password"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value)
            setError('')
          }}
          placeholder="Enter PIN"
          maxLength={4}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '6px',
            border: error ? '2px solid #e74c3c' : '1px solid #ddd',
            fontSize: '18px',
            textAlign: 'center',
            letterSpacing: '5px'
          }}
        />
        <button
          className="btn btn-primary"
          onClick={handleLogin}
        >
          Login
        </button>
      </div>
      {error && (
        <div style={{ color: '#e74c3c', marginTop: '10px', fontSize: '14px' }}>
          {error}
        </div>
      )}
    </div>
  )
}

function SiteOwnerAccessSection({
  isSiteOwner,
  actualSiteOwner,
  onLogin,
  onLogout,
  courseMapping,
  onUpdateCourseMapping,
  viewAsRole,
  onSetViewAsRole
}) {
  const [showPinModal, setShowPinModal] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [showMappingTool, setShowMappingTool] = useState(false)
  const tapCountRef = useRef(0)
  const tapTimeoutRef = useRef(null)

  const handleTripleTap = () => {
    tapCountRef.current += 1

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current)
    }

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0
      setShowPinModal(true)
    } else {
      tapTimeoutRef.current = setTimeout(() => {
        tapCountRef.current = 0
      }, 500)
    }
  }

  const handleLogin = () => {
    const success = onLogin(pin)
    if (success) {
      setShowPinModal(false)
      setPin('')
      setError('')
    } else {
      setError('Incorrect PIN')
      setPin('')
    }
  }

  // Show site owner panel if they have actual site owner access (even when "viewing as" a lower role)
  if (actualSiteOwner) {
    const viewAsOptions = [
      { value: null, label: 'Site Owner', desc: 'Full access' },
      { value: 'admin', label: 'Admin', desc: 'Admin features only' },
      { value: 'user', label: 'Regular User', desc: 'No admin features' }
    ]

    return (
      <>
        <div style={{
          background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          marginTop: '30px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                Site Owner Mode
                {viewAsRole && (
                  <span style={{
                    background: 'rgba(255,255,255,0.25)',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    marginLeft: '8px',
                    verticalAlign: 'middle'
                  }}>
                    Viewing as {viewAsRole === 'admin' ? 'Admin' : 'User'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
                You have access to course mapping and advanced features
              </div>
            </div>
          </div>

          {/* View As toggle */}
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '15px'
          }}>
            <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px', fontWeight: '600' }}>
              VIEW AS
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {viewAsOptions.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => onSetViewAsRole(opt.value)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: viewAsRole === opt.value
                      ? 'rgba(255,255,255,0.9)'
                      : 'rgba(255,255,255,0.15)',
                    color: viewAsRole === opt.value ? '#8e44ad' : 'white'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn"
            onClick={() => setShowMappingTool(true)}
            style={{
              background: 'rgba(255,255,255,0.9)',
              color: '#8e44ad',
              width: '100%',
              fontWeight: '600'
            }}
          >
            Open Course Mapping Tool
          </button>
        </div>

        {showMappingTool && (
          <CourseMappingTool
            courseMapping={courseMapping}
            onSave={onUpdateCourseMapping}
            onClose={() => setShowMappingTool(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
      {/* Hidden trigger - triple tap on app info to reveal */}
      <div
        onClick={handleTripleTap}
        style={{
          background: '#f8f9fa',
          padding: '15px',
          borderRadius: '10px',
          textAlign: 'center',
          fontSize: '13px',
          color: '#666',
          cursor: 'default',
          userSelect: 'none'
        }}
      >
        <div style={{ fontWeight: '600', marginBottom: '5px' }}>Gunpowder Big Boy's Golf</div>
        <div>League Management App</div>
        <div style={{ marginTop: '10px', fontSize: '11px' }}>
          Migrated from v5.18
        </div>
      </div>

      {/* PIN Entry Modal */}
      {showPinModal && (
        <div className="modal-overlay" onClick={() => setShowPinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '350px' }}>
            <div className="modal-header">
              <h3>Site Owner Access</h3>
              <button className="close-btn" onClick={() => setShowPinModal(false)}>&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
                Enter the Site Owner PIN to access course mapping tools.
              </p>
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value)
                  setError('')
                }}
                placeholder="Enter PIN"
                maxLength={4}
                autoFocus
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '8px',
                  border: error ? '2px solid #e74c3c' : '1px solid #ddd',
                  fontSize: '24px',
                  textAlign: 'center',
                  letterSpacing: '10px',
                  marginBottom: '15px'
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              {error && (
                <div style={{ color: '#e74c3c', marginBottom: '15px', fontSize: '14px', textAlign: 'center' }}>
                  {error}
                </div>
              )}
              <button
                className="btn btn-primary"
                onClick={handleLogin}
                style={{ width: '100%' }}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function LeagueInfoSection({ leagueId, onLeave, onCloneToTest, isAdmin, onSwitchLeague, isAuthenticated }) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showCloneForm, setShowCloneForm] = useState(false)
  const [testCode, setTestCode] = useState('')
  const [cloneStatus, setCloneStatus] = useState({ loading: false, error: '', success: '' })

  const copyLeagueCode = () => {
    navigator.clipboard.writeText(leagueId)
    alert('League code copied to clipboard!')
  }

  const handleCloneToTest = async () => {
    setCloneStatus({ loading: true, error: '', success: '' })
    const codeToUse = testCode.trim() || `TEST${leagueId}`
    const result = await onCloneToTest(codeToUse)

    if (result.success) {
      setCloneStatus({
        loading: false,
        error: '',
        success: `Test league created! Code: ${result.testLeagueId}`
      })
      setTestCode('')
    } else {
      setCloneStatus({
        loading: false,
        error: result.error,
        success: ''
      })
    }
  }

  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ marginBottom: '15px' }}>League Information</h3>

      <div style={{
        background: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>League Code</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '3px' }}>{leagueId}</div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={copyLeagueCode}
        >
          Copy
        </button>
      </div>

      <p style={{ color: '#666', fontSize: '13px', marginBottom: '15px' }}>
        Share this code with others so they can join your league and view live scores.
      </p>

      {/* Clone to Test League - Admin only */}
      {isAdmin && (
        <div style={{
          background: '#e3f2fd',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '15px',
          border: '1px solid #90caf9'
        }}>
          <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Clone to Test League</h4>
          <p style={{ color: '#666', fontSize: '13px', marginBottom: '10px' }}>
            Create a copy of this league for testing. All players, history, and settings will be copied.
          </p>

          {showCloneForm ? (
            <div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  Test League Code (optional)
                </label>
                <input
                  type="text"
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder={`Default: TEST${leagueId}`}
                  maxLength={20}
                  style={{
                    width: '100%',
                    padding: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                />
              </div>

              {cloneStatus.error && (
                <div style={{
                  background: '#ffebee',
                  color: '#c62828',
                  padding: '8px',
                  borderRadius: '4px',
                  marginBottom: '10px',
                  fontSize: '13px'
                }}>
                  {cloneStatus.error}
                </div>
              )}

              {cloneStatus.success && (
                <div style={{
                  background: '#e8f5e9',
                  color: '#2e7d32',
                  padding: '8px',
                  borderRadius: '4px',
                  marginBottom: '10px',
                  fontSize: '13px'
                }}>
                  {cloneStatus.success}
                  <br />
                  <span style={{ fontSize: '12px' }}>Leave this league and join the test code to access it.</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCloneForm(false)
                    setTestCode('')
                    setCloneStatus({ loading: false, error: '', success: '' })
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleCloneToTest}
                  disabled={cloneStatus.loading}
                >
                  {cloneStatus.loading ? 'Creating...' : 'Create Test League'}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => setShowCloneForm(true)}
              style={{ width: '100%' }}
            >
              Clone to Test League
            </button>
          )}
        </div>
      )}

      {/* Switch League - primary action for authenticated users */}
      {isAuthenticated && onSwitchLeague && (
        <button
          className="btn"
          onClick={onSwitchLeague}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
            color: 'white',
            fontWeight: '600',
            marginBottom: '10px',
            padding: '12px'
          }}
        >
          Switch League
        </button>
      )}

      {/* Leave League - secondary danger action */}
      {showLeaveConfirm ? (
        <div style={{
          background: '#fff3cd',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #f9a825'
        }}>
          <p style={{ marginBottom: '15px', fontWeight: '600' }}>
            Leave this league?
          </p>
          <p style={{ color: '#666', marginBottom: '15px', fontSize: '13px' }}>
            Your membership will be removed. You can rejoin later using the league code.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn"
              onClick={onLeave}
              style={{ background: '#e74c3c', color: 'white' }}
            >
              Leave League
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowLeaveConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowLeaveConfirm(true)}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            color: '#e74c3c',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '8px',
            opacity: 0.7
          }}
        >
          Leave League
        </button>
      )}
    </div>
  )
}

function PayoutSettingsSection({ payoutFormats, onUpdate, isAdmin }) {
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({})

  const startEditing = (key) => {
    setFormData({ ...payoutFormats[key] })
    setEditing(key)
  }

  const saveChanges = () => {
    onUpdate({
      ...payoutFormats,
      [editing]: formData
    })
    setEditing(null)
  }

  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Payout Formats</h3>

      {Object.entries(payoutFormats).map(([key, format]) => (
        <div key={key} style={{
          background: '#f8f9fa',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '10px'
        }}>
          {editing === key ? (
            <>
              <div className="input-group" style={{ marginBottom: '10px' }}>
                <label>Format Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label>Greenie/Hole ($)</label>
                  <input
                    type="number"
                    value={formData.greeniePerHole || 0}
                    onChange={(e) => setFormData({ ...formData, greeniePerHole: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label>Front 9 ($)</label>
                  <input
                    type="number"
                    value={formData.front9 || 0}
                    onChange={(e) => setFormData({ ...formData, front9: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label>Back 9 ($)</label>
                  <input
                    type="number"
                    value={formData.back9 || 0}
                    onChange={(e) => setFormData({ ...formData, back9: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label>Overall ($)</label>
                  <input
                    type="number"
                    value={formData.overall || 0}
                    onChange={(e) => setFormData({ ...formData, overall: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button className="btn btn-primary" onClick={saveChanges}>Save</button>
                <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: '600' }}>{format.name}</div>
                {isAdmin && (
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => startEditing(key)}
                  >
                    Edit
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#666', flexWrap: 'wrap' }}>
                <span>Greenie: ${format.greeniePerHole}/hole</span>
                <span>Front 9: ${format.front9}</span>
                <span>Back 9: ${format.back9}</span>
                <span>Overall: ${format.overall}</span>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function HoleInOnePotSection({ holeInOnePot, onUpdate, isAdmin }) {
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const addTransaction = (type) => {
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const newTransaction = {
      id: Date.now(),
      date: new Date().toISOString(),
      type,
      amount: type === 'deposit' ? amountNum : -amountNum,
      description: description || (type === 'deposit' ? 'Contribution' : 'Payout')
    }

    const newBalance = (holeInOnePot.balance || 0) + newTransaction.amount

    onUpdate({
      ...holeInOnePot,
      balance: newBalance,
      transactions: [...(holeInOnePot.transactions || []), newTransaction]
    })

    setAmount('')
    setDescription('')
    setShowAddTransaction(false)
  }

  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      border: '2px solid #f9a825'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3>Hole-in-One Pot</h3>
        <div style={{
          background: 'linear-gradient(135deg, #f9a825 0%, #f57c00 100%)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontWeight: 'bold',
          fontSize: '18px'
        }}>
          ${(holeInOnePot.balance || 0).toFixed(2)}
        </div>
      </div>

      {isAdmin && (
        <>
          {showAddTransaction ? (
            <div style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <div className="input-group">
                <label>Amount ($)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="input-group">
                <label>Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => addTransaction('deposit')}
                  style={{ flex: 1 }}
                >
                  Add Deposit
                </button>
                <button
                  className="btn"
                  onClick={() => addTransaction('withdrawal')}
                  style={{ flex: 1, background: '#e74c3c', color: 'white' }}
                >
                  Payout
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAddTransaction(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => setShowAddTransaction(true)}
              style={{ width: '100%', marginBottom: '15px' }}
            >
              + Add Transaction
            </button>
          )}
        </>
      )}

      {/* Transaction history */}
      {holeInOnePot.transactions && holeInOnePot.transactions.length > 0 && (
        <div>
          <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Recent Transactions</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {[...holeInOnePot.transactions].reverse().slice(0, 10).map(tx => (
              <div key={tx.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: tx.amount > 0 ? '#e8f5e9' : '#ffebee',
                borderRadius: '4px',
                marginBottom: '4px',
                fontSize: '13px'
              }}>
                <div>
                  <span>{tx.description}</span>
                  <span style={{ color: '#999', marginLeft: '8px', fontSize: '11px' }}>
                    {new Date(tx.date).toLocaleDateString()}
                  </span>
                </div>
                <span style={{
                  fontWeight: '600',
                  color: tx.amount > 0 ? '#27ae60' : '#e74c3c'
                }}>
                  {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function QuickSkinsSection({ players, liveRound, onStartQuickSkins }) {
  const [showSetup, setShowSetup] = useState(false)
  const [step, setStep] = useState(1)
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [teams, setTeams] = useState([])
  const [selectedForTeam, setSelectedForTeam] = useState([])
  const [guestName, setGuestName] = useState('')
  const [skinsSettings, setSkinsSettings] = useState({
    costPerSkin: '',
    carryovers: true,
    wrapUnwonSkins: true,
    wrapTo: 'front',
    payoutStyle: 'perSkin',
    parOrBetterRequired: false,
    birdieDoubleEagleTriple: false
  })
  const [greenieSettings, setGreenieSettings] = useState({
    enabled: false,
    costPerGreenie: '',
    carryovers: true,
    wrapUnwonGreenies: false,
    wrapTo: 'front'
  })

  const resetSetup = () => {
    setStep(1)
    setSelectedPlayers([])
    setTeams([])
    setSelectedForTeam([])
    setGuestName('')
    setSkinsSettings({
      costPerSkin: '',
      carryovers: true,
      wrapUnwonSkins: true,
      wrapTo: 'front',
      payoutStyle: 'perSkin',
      parOrBetterRequired: false,
      birdieDoubleEagleTriple: false
    })
    setGreenieSettings({
      enabled: false,
      costPerGreenie: '',
      carryovers: true,
      wrapUnwonGreenies: false,
      wrapTo: 'front'
    })
  }

  const addGuest = () => {
    if (guestName.trim()) {
      setSelectedPlayers([...selectedPlayers, {
        id: `guest_${Date.now()}`,
        name: guestName.trim(),
        isGuest: true,
        skillRating: 5
      }])
      setGuestName('')
    }
  }

  const togglePlayer = (player) => {
    const exists = selectedPlayers.some(p => p.id === player.id)
    if (exists) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id))
    } else {
      setSelectedPlayers([...selectedPlayers, {
        id: player.id,
        name: player.name,
        isGuest: false,
        skillRating: player.skillRating || 5
      }])
    }
  }

  const createTeam = () => {
    if (selectedForTeam.length > 0) {
      const newTeam = selectedForTeam.map(id => selectedPlayers.find(p => p.id === id))
      setTeams([...teams, newTeam])
      setSelectedForTeam([])
    }
  }

  const unassignedPlayers = selectedPlayers.filter(
    p => !teams.flat().some(tp => tp.id === p.id)
  )

  const handleStartGame = () => {
    onStartQuickSkins({
      players: selectedPlayers,
      teams,
      skinsSettings,
      greenieSettings
    })
    setShowSetup(false)
    resetSetup()
  }

  const isStartDisabled = !skinsSettings.costPerSkin ||
    (greenieSettings.enabled && !greenieSettings.costPerGreenie)

  return (
    <>
      <div style={{
        background: liveRound ? '#f5f5f5' : 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        opacity: liveRound ? 0.6 : 1
      }}>
        <h3 style={{ marginBottom: '10px', color: liveRound ? '#666' : 'white' }}>
          Quick Skins Game
        </h3>
        <p style={{ color: liveRound ? '#999' : 'rgba(255,255,255,0.9)', fontSize: '13px', marginBottom: '15px' }}>
          Start an informal skins match without the full league format.
          Add players, form teams, and track skins - no stats saved.
        </p>
        <button
          className="btn"
          onClick={() => {
            resetSetup()
            setShowSetup(true)
          }}
          disabled={!!liveRound}
          style={{
            background: liveRound ? '#ccc' : 'white',
            color: liveRound ? '#666' : '#e67e22',
            fontWeight: '600',
            cursor: liveRound ? 'not-allowed' : 'pointer'
          }}
        >
          {liveRound ? 'League Round in Progress' : 'Start Quick Skins'}
        </button>
      </div>

      {/* Quick Skins Setup Modal */}
      {showSetup && (
        <div className="modal-overlay" onClick={() => setShowSetup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' }}>
              <h2 style={{ margin: 0, color: 'white' }}>Quick Skins Setup</h2>
              <button className="modal-close" onClick={() => setShowSetup(false)} style={{ color: 'white' }}>&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              {/* Step indicator */}
              <div style={{ display: 'flex', marginBottom: '20px', justifyContent: 'center', gap: '10px' }}>
                {[1, 2, 3].map(s => (
                  <div key={s} style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: step >= s ? '#f39c12' : '#e0e0e0',
                    color: step >= s ? 'white' : '#999',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {s}
                  </div>
                ))}
              </div>

              {/* Step 1: Add Players */}
              {step === 1 && (
                <>
                  <h3 style={{ marginBottom: '15px' }}>Step 1: Add Players</h3>

                  {/* Add from league */}
                  {players.filter(p => p.isActive !== false).length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                        Add from League:
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                        {players.filter(p => p.isActive !== false).map(player => {
                          const isAdded = selectedPlayers.some(sp => sp.id === player.id)
                          return (
                            <button
                              key={player.id}
                              onClick={() => togglePlayer(player)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '15px',
                                border: isAdded ? '2px solid #27ae60' : '1px solid #ddd',
                                background: isAdded ? '#e8f8f5' : 'white',
                                color: isAdded ? '#27ae60' : '#666',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              {isAdded ? '✓ ' : ''}{player.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add guest player */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                      Add Guest Player:
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Enter name..."
                        style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '2px solid #ddd' }}
                        onKeyPress={(e) => e.key === 'Enter' && addGuest()}
                      />
                      <button className="btn btn-secondary" onClick={addGuest} disabled={!guestName.trim()}>
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Current players list */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                      Players in Game ({selectedPlayers.length}):
                    </label>
                    {selectedPlayers.length === 0 ? (
                      <p style={{ color: '#999', fontSize: '13px' }}>No players added yet</p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {selectedPlayers.map(player => (
                          <div key={player.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 10px',
                            background: player.isGuest ? '#fff3e0' : '#e3f2fd',
                            borderRadius: '15px',
                            fontSize: '12px'
                          }}>
                            <span>{player.name}</span>
                            {player.isGuest && <span style={{ color: '#e67e22' }}>(Guest)</span>}
                            <button
                              onClick={() => setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id))}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#e74c3c',
                                cursor: 'pointer',
                                padding: '0 2px',
                                fontSize: '14px'
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary" onClick={() => setShowSetup(false)} style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => setStep(2)}
                      style={{ flex: 1 }}
                      disabled={selectedPlayers.length < 2}
                    >
                      Next: Form Teams
                    </button>
                  </div>
                </>
              )}

              {/* Step 2: Form Teams */}
              {step === 2 && (
                <>
                  <h3 style={{ marginBottom: '15px' }}>Step 2: Form Teams</h3>
                  <p style={{ color: '#666', fontSize: '13px', marginBottom: '15px' }}>
                    Create teams for the scoring interface. Select players and tap "Create Team".
                  </p>

                  {/* Available players */}
                  {unassignedPlayers.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                        Available Players:
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {unassignedPlayers.map(player => {
                          const isSelected = selectedForTeam.includes(player.id)
                          return (
                            <button
                              key={player.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedForTeam(selectedForTeam.filter(id => id !== player.id))
                                } else {
                                  setSelectedForTeam([...selectedForTeam, player.id])
                                }
                              }}
                              style={{
                                padding: '8px 14px',
                                borderRadius: '20px',
                                border: isSelected ? '2px solid #3498db' : '2px solid #ddd',
                                background: isSelected ? '#e3f2fd' : 'white',
                                color: isSelected ? '#3498db' : '#666',
                                fontSize: '13px',
                                fontWeight: isSelected ? '600' : 'normal',
                                cursor: 'pointer'
                              }}
                            >
                              {isSelected ? '✓ ' : ''}{player.name}
                            </button>
                          )
                        })}
                      </div>

                      {selectedForTeam.length >= 1 && (
                        <button className="btn btn-primary" onClick={createTeam} style={{ marginTop: '10px' }}>
                          Create Team ({selectedForTeam.length} players)
                        </button>
                      )}
                    </div>
                  )}

                  {/* Created teams */}
                  {teams.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>
                        Teams Created:
                      </label>
                      {teams.map((team, idx) => (
                        <div key={idx} style={{
                          background: '#f0f7ff',
                          padding: '10px 15px',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>
                            <strong>Team {idx + 1}:</strong> {team.map(p => p.name).join(', ')}
                          </span>
                          <button
                            onClick={() => setTeams(teams.filter((_, i) => i !== idx))}
                            style={{
                              background: '#e74c3c',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ flex: 1 }}>
                      Back
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => setStep(3)}
                      style={{ flex: 1 }}
                      disabled={teams.length === 0 || unassignedPlayers.length > 0}
                    >
                      Next: Skins Rules
                    </button>
                  </div>
                  {unassignedPlayers.length > 0 && teams.length > 0 && (
                    <p style={{ color: '#e67e22', fontSize: '12px', marginTop: '10px', textAlign: 'center' }}>
                      All players must be assigned to a team
                    </p>
                  )}
                </>
              )}

              {/* Step 3: Skins Settings */}
              {step === 3 && (
                <>
                  <h3 style={{ marginBottom: '15px' }}>Step 3: Skins Rules</h3>

                  {/* Cost per skin */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Cost per Skin ($)
                    </label>
                    <input
                      type="number"
                      value={skinsSettings.costPerSkin}
                      onChange={(e) => setSkinsSettings({ ...skinsSettings, costPerSkin: e.target.value })}
                      placeholder="1.00"
                      style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '2px solid #ddd', fontSize: '16px' }}
                    />
                  </div>

                  {/* Carryovers */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Carryovers</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => setSkinsSettings({ ...skinsSettings, carryovers: true })}
                        style={{
                          flex: 1, padding: '12px', borderRadius: '6px',
                          border: skinsSettings.carryovers ? '2px solid #f39c12' : '2px solid #ddd',
                          background: skinsSettings.carryovers ? '#fff8e1' : 'white',
                          fontWeight: skinsSettings.carryovers ? '600' : 'normal',
                          cursor: 'pointer'
                        }}
                      >Yes</button>
                      <button
                        onClick={() => setSkinsSettings({ ...skinsSettings, carryovers: false })}
                        style={{
                          flex: 1, padding: '12px', borderRadius: '6px',
                          border: !skinsSettings.carryovers ? '2px solid #f39c12' : '2px solid #ddd',
                          background: !skinsSettings.carryovers ? '#fff8e1' : 'white',
                          fontWeight: !skinsSettings.carryovers ? '600' : 'normal',
                          cursor: 'pointer'
                        }}
                      >No</button>
                    </div>
                  </div>

                  {/* Wrap options (if carryovers ON) */}
                  {skinsSettings.carryovers && (
                    <>
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Wrap Unwon Skins</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => setSkinsSettings({ ...skinsSettings, wrapUnwonSkins: true })}
                            style={{ flex: 1, padding: '12px', borderRadius: '6px', border: skinsSettings.wrapUnwonSkins ? '2px solid #f39c12' : '2px solid #ddd', background: skinsSettings.wrapUnwonSkins ? '#fff8e1' : 'white', fontWeight: skinsSettings.wrapUnwonSkins ? '600' : 'normal', cursor: 'pointer' }}>Yes</button>
                          <button onClick={() => setSkinsSettings({ ...skinsSettings, wrapUnwonSkins: false })}
                            style={{ flex: 1, padding: '12px', borderRadius: '6px', border: !skinsSettings.wrapUnwonSkins ? '2px solid #f39c12' : '2px solid #ddd', background: !skinsSettings.wrapUnwonSkins ? '#fff8e1' : 'white', fontWeight: !skinsSettings.wrapUnwonSkins ? '600' : 'normal', cursor: 'pointer' }}>No</button>
                        </div>
                      </div>
                      {skinsSettings.wrapUnwonSkins && (
                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Wrap To</label>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setSkinsSettings({ ...skinsSettings, wrapTo: 'front' })}
                              style={{ flex: 1, padding: '12px', borderRadius: '6px', border: skinsSettings.wrapTo === 'front' ? '2px solid #f39c12' : '2px solid #ddd', background: skinsSettings.wrapTo === 'front' ? '#fff8e1' : 'white', fontWeight: skinsSettings.wrapTo === 'front' ? '600' : 'normal', cursor: 'pointer' }}>Front 9</button>
                            <button onClick={() => setSkinsSettings({ ...skinsSettings, wrapTo: 'back' })}
                              style={{ flex: 1, padding: '12px', borderRadius: '6px', border: skinsSettings.wrapTo === 'back' ? '2px solid #f39c12' : '2px solid #ddd', background: skinsSettings.wrapTo === 'back' ? '#fff8e1' : 'white', fontWeight: skinsSettings.wrapTo === 'back' ? '600' : 'normal', cursor: 'pointer' }}>Back 9</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Greenies Section */}
                  <div style={{ marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <label style={{ fontWeight: '600', fontSize: '15px' }}>Greenies (Par 3s)</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setGreenieSettings({ ...greenieSettings, enabled: true })}
                          style={{
                            padding: '6px 16px', borderRadius: '6px',
                            border: greenieSettings.enabled ? '2px solid #27ae60' : '2px solid #ddd',
                            background: greenieSettings.enabled ? '#e8f8f5' : 'white',
                            fontWeight: greenieSettings.enabled ? '600' : 'normal',
                            color: greenieSettings.enabled ? '#27ae60' : '#666',
                            cursor: 'pointer', fontSize: '13px'
                          }}
                        >Yes</button>
                        <button
                          onClick={() => setGreenieSettings({ ...greenieSettings, enabled: false })}
                          style={{
                            padding: '6px 16px', borderRadius: '6px',
                            border: !greenieSettings.enabled ? '2px solid #27ae60' : '2px solid #ddd',
                            background: !greenieSettings.enabled ? '#e8f8f5' : 'white',
                            fontWeight: !greenieSettings.enabled ? '600' : 'normal',
                            color: !greenieSettings.enabled ? '#27ae60' : '#666',
                            cursor: 'pointer', fontSize: '13px'
                          }}
                        >No</button>
                      </div>
                    </div>

                    {greenieSettings.enabled && (
                      <div style={{ background: '#f0fff4', padding: '15px', borderRadius: '8px' }}>
                        <div style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>
                            Cost per Greenie ($)
                          </label>
                          <input
                            type="number"
                            value={greenieSettings.costPerGreenie}
                            onChange={(e) => setGreenieSettings({ ...greenieSettings, costPerGreenie: e.target.value })}
                            placeholder="1.00"
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '2px solid #ddd', fontSize: '14px' }}
                          />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Carryovers</label>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={() => setGreenieSettings({ ...greenieSettings, carryovers: true })}
                              style={{
                                flex: 1, padding: '10px', borderRadius: '6px',
                                border: greenieSettings.carryovers ? '2px solid #27ae60' : '2px solid #ddd',
                                background: greenieSettings.carryovers ? '#e8f8f5' : 'white',
                                fontWeight: greenieSettings.carryovers ? '600' : 'normal',
                                cursor: 'pointer', fontSize: '13px'
                              }}
                            >Yes</button>
                            <button
                              onClick={() => setGreenieSettings({ ...greenieSettings, carryovers: false })}
                              style={{
                                flex: 1, padding: '10px', borderRadius: '6px',
                                border: !greenieSettings.carryovers ? '2px solid #27ae60' : '2px solid #ddd',
                                background: !greenieSettings.carryovers ? '#e8f8f5' : 'white',
                                fontWeight: !greenieSettings.carryovers ? '600' : 'normal',
                                cursor: 'pointer', fontSize: '13px'
                              }}
                            >No</button>
                          </div>
                        </div>

                        {/* Greenie Wrap options (if carryovers ON) */}
                        {greenieSettings.carryovers && (
                          <>
                            <div style={{ marginBottom: '15px' }}>
                              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Wrap Unwon Greenies</label>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                  onClick={() => setGreenieSettings({ ...greenieSettings, wrapUnwonGreenies: true })}
                                  style={{
                                    flex: 1, padding: '10px', borderRadius: '6px',
                                    border: greenieSettings.wrapUnwonGreenies ? '2px solid #27ae60' : '2px solid #ddd',
                                    background: greenieSettings.wrapUnwonGreenies ? '#e8f8f5' : 'white',
                                    fontWeight: greenieSettings.wrapUnwonGreenies ? '600' : 'normal',
                                    cursor: 'pointer', fontSize: '13px'
                                  }}
                                >Yes</button>
                                <button
                                  onClick={() => setGreenieSettings({ ...greenieSettings, wrapUnwonGreenies: false })}
                                  style={{
                                    flex: 1, padding: '10px', borderRadius: '6px',
                                    border: !greenieSettings.wrapUnwonGreenies ? '2px solid #27ae60' : '2px solid #ddd',
                                    background: !greenieSettings.wrapUnwonGreenies ? '#e8f8f5' : 'white',
                                    fontWeight: !greenieSettings.wrapUnwonGreenies ? '600' : 'normal',
                                    cursor: 'pointer', fontSize: '13px'
                                  }}
                                >No</button>
                              </div>
                            </div>
                            {greenieSettings.wrapUnwonGreenies && (
                              <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Wrap To</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <button
                                    onClick={() => setGreenieSettings({ ...greenieSettings, wrapTo: 'front' })}
                                    style={{
                                      flex: 1, padding: '10px', borderRadius: '6px',
                                      border: greenieSettings.wrapTo === 'front' ? '2px solid #27ae60' : '2px solid #ddd',
                                      background: greenieSettings.wrapTo === 'front' ? '#e8f8f5' : 'white',
                                      fontWeight: greenieSettings.wrapTo === 'front' ? '600' : 'normal',
                                      cursor: 'pointer', fontSize: '13px'
                                    }}
                                  >Front 9</button>
                                  <button
                                    onClick={() => setGreenieSettings({ ...greenieSettings, wrapTo: 'back' })}
                                    style={{
                                      flex: 1, padding: '10px', borderRadius: '6px',
                                      border: greenieSettings.wrapTo === 'back' ? '2px solid #27ae60' : '2px solid #ddd',
                                      background: greenieSettings.wrapTo === 'back' ? '#e8f8f5' : 'white',
                                      fontWeight: greenieSettings.wrapTo === 'back' ? '600' : 'normal',
                                      cursor: 'pointer', fontSize: '13px'
                                    }}
                                  >Back 9</button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Optional rules */}
                  <div style={{ marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={skinsSettings.parOrBetterRequired} onChange={(e) => setSkinsSettings({ ...skinsSettings, parOrBetterRequired: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                      <span>Par or better required to win</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={skinsSettings.birdieDoubleEagleTriple} onChange={(e) => setSkinsSettings({ ...skinsSettings, birdieDoubleEagleTriple: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                      <span>Birdie = 2x, Eagle = 3x value</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ flex: 1 }}>Back</button>
                    <button
                      className="btn btn-primary"
                      onClick={handleStartGame}
                      style={{ flex: 1 }}
                      disabled={isStartDisabled}
                    >
                      Start Quick Skins!
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function NextRoundAnnouncementSection({ leagueSettings, onUpdate, isAdmin }) {
  const nextRoundDate = leagueSettings?.nextRoundDate || ''
  const nextRoundTime = leagueSettings?.nextRoundTime || ''
  const nextRoundMessage = leagueSettings?.nextRoundMessage || ''

  const handleUpdate = (field, value) => {
    onUpdate({
      ...leagueSettings,
      [field]: value
    })
  }

  const handleClear = () => {
    onUpdate({
      ...leagueSettings,
      nextRoundDate: '',
      nextRoundTime: '',
      nextRoundMessage: ''
    })
  }

  const hasAnnouncement = nextRoundDate || nextRoundTime || nextRoundMessage
  const hasDateOrTime = nextRoundDate || nextRoundTime

  // Format the date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

  // Format time for display (convert 24h to 12h)
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  if (!isAdmin) {
    // Non-admin view - just show the announcement if one exists
    if (!hasAnnouncement) return null

    return (
      <div style={{
        background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        {hasDateOrTime && (
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: nextRoundMessage ? '5px' : '0' }}>
            Next Round: {formatDate(nextRoundDate)}
            {nextRoundTime && ` at ${formatTime(nextRoundTime)}`}
          </div>
        )}
        {nextRoundMessage && (
          <div style={{ fontSize: hasDateOrTime ? '14px' : '18px', opacity: hasDateOrTime ? 0.9 : 1, fontWeight: hasDateOrTime ? 'normal' : 'bold' }}>
            {nextRoundMessage}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      background: '#fff3cd',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      border: '2px solid #ffc107'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Next Round Announcement</h3>
      <p style={{ color: '#666', fontSize: '13px', marginBottom: '15px' }}>
        Set the next round date and time to display an announcement banner on the Players page.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Date</label>
          <input
            type="date"
            value={nextRoundDate}
            onChange={(e) => handleUpdate('nextRoundDate', e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Time</label>
          <input
            type="time"
            value={nextRoundTime}
            onChange={(e) => handleUpdate('nextRoundTime', e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Message (optional)</label>
        <textarea
          value={nextRoundMessage}
          onChange={(e) => handleUpdate('nextRoundMessage', e.target.value)}
          placeholder="e.g., Meet at clubhouse, bring lunch money..."
          rows={2}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Preview */}
      {hasAnnouncement && (
        <div style={{
          background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '15px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '5px' }}>Preview:</div>
          {hasDateOrTime && (
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
              Next Round: {formatDate(nextRoundDate)}
              {nextRoundTime && ` at ${formatTime(nextRoundTime)}`}
            </div>
          )}
          {nextRoundMessage && (
            <div style={{ fontSize: hasDateOrTime ? '13px' : '16px', opacity: hasDateOrTime ? 0.9 : 1, fontWeight: hasDateOrTime ? 'normal' : 'bold', marginTop: hasDateOrTime ? '5px' : '0' }}>
              {nextRoundMessage}
            </div>
          )}
        </div>
      )}

      {hasAnnouncement && (
        <button
          onClick={handleClear}
          style={{
            background: 'transparent',
            border: '1px solid #e74c3c',
            color: '#e74c3c',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          Clear Announcement
        </button>
      )}
    </div>
  )
}

function RoundSettingsSection({ defaultStartingHole, onUpdate, isAdmin }) {
  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Round Settings</h3>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
          Default Starting Hole
        </label>
        <p style={{ color: '#666', fontSize: '13px', marginBottom: '10px' }}>
          Set which hole the round typically starts on. This affects the default leaderboard view.
        </p>
        {isAdmin ? (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onUpdate(1)}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: defaultStartingHole === 1 || defaultStartingHole <= 9 ? '2px solid #27ae60' : '2px solid #ddd',
                background: defaultStartingHole === 1 || (defaultStartingHole >= 1 && defaultStartingHole <= 9) ? '#e8f5e9' : 'white',
                fontWeight: defaultStartingHole >= 1 && defaultStartingHole <= 9 ? '600' : 'normal',
                color: defaultStartingHole >= 1 && defaultStartingHole <= 9 ? '#27ae60' : '#666',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Front 9 (Hole 1)
            </button>
            <button
              onClick={() => onUpdate(10)}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: defaultStartingHole >= 10 ? '2px solid #e67e22' : '2px solid #ddd',
                background: defaultStartingHole >= 10 ? '#fff3e0' : 'white',
                fontWeight: defaultStartingHole >= 10 ? '600' : 'normal',
                color: defaultStartingHole >= 10 ? '#e67e22' : '#666',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Back 9 (Hole 10)
            </button>
          </div>
        ) : (
          <div style={{
            background: '#f8f9fa',
            padding: '12px 15px',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            Starting on: <strong>{defaultStartingHole >= 10 ? 'Back 9 (Hole 10)' : 'Front 9 (Hole 1)'}</strong>
            <span style={{ color: '#999', marginLeft: '10px', fontSize: '12px' }}>(Admin only)</span>
          </div>
        )}
      </div>
    </div>
  )
}

function HandicapSettingsSection({ handicapSettings, onUpdateHandicap, courseTees, onUpdateTees, isAdmin, players, leagueId }) {
  const settings = { ...DEFAULT_HANDICAP_SETTINGS, ...handicapSettings }
  const tees = { ...DEFAULT_COURSE_TEES, ...courseTees }

  const [showTeeEditor, setShowTeeEditor] = useState(false)
  const [newTeeKey, setNewTeeKey] = useState('')
  const [newTeeName, setNewTeeName] = useState('')
  const [newTeeRating, setNewTeeRating] = useState('72')
  const [newTeeSlope, setNewTeeSlope] = useState('113')

  const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ]

  // Check if today is in freeze period
  const todayInFreeze = isDateInFreezePeriod(new Date().toISOString(), settings)

  // Handle manual recalculation for monthly mode
  const handleRecalculateAll = () => {
    if (!confirm('Recalculate and lock handicaps for all players? This will update the locked handicaps used for team generation.')) {
      return
    }
    const newLockedHandicaps = calculateLockedHandicaps(players, leagueId, tees, settings)
    onUpdateHandicap({
      ...settings,
      lockedHandicaps: newLockedHandicaps,
      lastUpdateDate: new Date().toISOString()
    })
    alert(`Handicaps recalculated for ${Object.keys(newLockedHandicaps).length} players`)
  }

  const handleAddTee = () => {
    if (!newTeeKey.trim() || !newTeeName.trim()) {
      alert('Please enter a tee key and name')
      return
    }
    const key = newTeeKey.toLowerCase().replace(/\s+/g, '_')
    if (tees[key]) {
      alert('A tee with this key already exists')
      return
    }
    const updatedTees = {
      ...tees,
      [key]: {
        name: newTeeName.trim(),
        courseRating: parseFloat(newTeeRating) || 72,
        slopeRating: parseFloat(newTeeSlope) || 113
      }
    }
    onUpdateTees(updatedTees)
    setNewTeeKey('')
    setNewTeeName('')
    setNewTeeRating('72')
    setNewTeeSlope('113')
  }

  const handleDeleteTee = (key) => {
    if (Object.keys(tees).length <= 1) {
      alert('Must have at least one tee option')
      return
    }
    if (!confirm(`Delete ${tees[key].name} tee?`)) return
    const updatedTees = { ...tees }
    delete updatedTees[key]
    onUpdateTees(updatedTees)
  }

  const handleUpdateTee = (key, field, value) => {
    const updatedTees = {
      ...tees,
      [key]: {
        ...tees[key],
        [field]: field === 'name' ? value : parseFloat(value) || 0
      }
    }
    onUpdateTees(updatedTees)
  }

  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ marginBottom: '15px', color: '#27ae60' }}>Handicap Settings</h3>

      {/* Handicap Scope */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          Handicap Scope for Team Generation
        </label>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
          Choose which handicap to use when balancing teams
        </p>
        <select
          value={settings.handicapScope}
          onChange={(e) => onUpdateHandicap({ ...settings, handicapScope: e.target.value })}
          disabled={!isAdmin}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            fontSize: '14px'
          }}
        >
          <option value="true">True Handicap (All rounds from all courses)</option>
          <option value="league">League Handicap (Only rounds from this league)</option>
          <option value="gunpowder">Gunpowder Handicap (Only Gunpowder rounds)</option>
        </select>
      </div>

      {/* Calculation Mode */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          Calculation Mode
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => isAdmin && onUpdateHandicap({ ...settings, calculationMode: 'auto' })}
            disabled={!isAdmin}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '6px',
              border: settings.calculationMode === 'auto' ? '2px solid #27ae60' : '2px solid #ddd',
              background: settings.calculationMode === 'auto' ? '#e8f5e9' : 'white',
              fontWeight: settings.calculationMode === 'auto' ? '600' : 'normal',
              cursor: isAdmin ? 'pointer' : 'not-allowed',
              opacity: isAdmin ? 1 : 0.7
            }}
          >
            Auto-Calculate
          </button>
          <button
            onClick={() => isAdmin && onUpdateHandicap({ ...settings, calculationMode: 'manual' })}
            disabled={!isAdmin}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '6px',
              border: settings.calculationMode === 'manual' ? '2px solid #27ae60' : '2px solid #ddd',
              background: settings.calculationMode === 'manual' ? '#e8f5e9' : 'white',
              fontWeight: settings.calculationMode === 'manual' ? '600' : 'normal',
              cursor: isAdmin ? 'pointer' : 'not-allowed',
              opacity: isAdmin ? 1 : 0.7
            }}
          >
            Manual Only
          </button>
        </div>
        <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
          {settings.calculationMode === 'auto'
            ? 'Handicaps auto-calculate after each round (falls back to manual if not enough rounds)'
            : 'Only manually entered handicaps will be used'}
        </p>
      </div>

      {/* Update Cycle Mode */}
      {settings.calculationMode === 'auto' && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Update Cycle
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => isAdmin && onUpdateHandicap({ ...settings, updateMode: 'immediate' })}
              disabled={!isAdmin}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '6px',
                border: settings.updateMode === 'immediate' ? '2px solid #27ae60' : '2px solid #ddd',
                background: settings.updateMode === 'immediate' ? '#e8f5e9' : 'white',
                fontWeight: settings.updateMode === 'immediate' ? '600' : 'normal',
                cursor: isAdmin ? 'pointer' : 'not-allowed',
                opacity: isAdmin ? 1 : 0.7
              }}
            >
              Immediate
            </button>
            <button
              onClick={() => isAdmin && onUpdateHandicap({ ...settings, updateMode: 'monthly' })}
              disabled={!isAdmin}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '6px',
                border: settings.updateMode === 'monthly' ? '2px solid #27ae60' : '2px solid #ddd',
                background: settings.updateMode === 'monthly' ? '#e8f5e9' : 'white',
                fontWeight: settings.updateMode === 'monthly' ? '600' : 'normal',
                cursor: isAdmin ? 'pointer' : 'not-allowed',
                opacity: isAdmin ? 1 : 0.7
              }}
            >
              Monthly Lock
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
            {settings.updateMode === 'immediate'
              ? 'Handicaps update after every round'
              : 'Handicaps are locked at the start of each month. Use the button below to recalculate.'}
          </p>
          {settings.updateMode === 'monthly' && isAdmin && (
            <div style={{ marginTop: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={handleRecalculateAll}
              >
                Recalculate & Lock All Handicaps Now
              </button>
              {settings.lastUpdateDate && (
                <p style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>
                  Last updated: {new Date(settings.lastUpdateDate).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Freeze Period Settings */}
      {settings.calculationMode === 'auto' && (
        <div style={{ marginBottom: '20px', padding: '15px', background: settings.freezeEnabled ? '#fff3e0' : '#f8f9fa', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.freezeEnabled}
              onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, freezeEnabled: e.target.checked })}
              disabled={!isAdmin}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontWeight: '600' }}>Enable Seasonal Freeze Period</span>
          </label>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
            Rounds played during the freeze period will not count toward handicap calculation.
            Useful for excluding winter rounds when conditions cause inflated scores.
          </p>

          {settings.freezeEnabled && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                    Freeze Start
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={settings.freezeStartMonth}
                      onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, freezeStartMonth: parseInt(e.target.value) })}
                      disabled={!isAdmin}
                      style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                      {MONTHS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={settings.freezeStartDay}
                      onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, freezeStartDay: parseInt(e.target.value) || 1 })}
                      disabled={!isAdmin}
                      min="1"
                      max="31"
                      style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                    Freeze End
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={settings.freezeEndMonth}
                      onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, freezeEndMonth: parseInt(e.target.value) })}
                      disabled={!isAdmin}
                      style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    >
                      {MONTHS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={settings.freezeEndDay}
                      onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, freezeEndDay: parseInt(e.target.value) || 1 })}
                      disabled={!isAdmin}
                      min="1"
                      max="31"
                      style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                </div>
              </div>
              {todayInFreeze && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  background: '#ffebee',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#c62828'
                }}>
                  Currently in freeze period - rounds played now will not affect handicaps
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Min Rounds & Max Handicap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Min Rounds for Auto
          </label>
          <input
            type="number"
            value={settings.minRoundsForAuto}
            onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, minRoundsForAuto: parseInt(e.target.value) || 3 })}
            disabled={!isAdmin}
            min="1"
            max="20"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Maximum Handicap
          </label>
          <input
            type="number"
            value={settings.maxHandicap}
            onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, maxHandicap: parseInt(e.target.value) || 54 })}
            disabled={!isAdmin}
            min="18"
            max="54"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ddd'
            }}
          />
        </div>
      </div>

      {/* Course Tees Section */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h4 style={{ margin: 0 }}>Course Tees</h4>
          {isAdmin && (
            <button
              className="btn btn-small btn-secondary"
              onClick={() => setShowTeeEditor(!showTeeEditor)}
            >
              {showTeeEditor ? 'Hide Editor' : 'Edit Tees'}
            </button>
          )}
        </div>

        {/* Tee List */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
          {Object.entries(tees).map(([key, tee]) => (
            <div
              key={key}
              style={{
                background: '#f8f9fa',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            >
              <strong>{tee.name}</strong>: {tee.courseRating}/{tee.slopeRating}
            </div>
          ))}
        </div>

        {/* Tee Editor */}
        {showTeeEditor && isAdmin && (
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
            <h5 style={{ marginBottom: '15px' }}>Edit Tees</h5>

            {/* Existing Tees */}
            {Object.entries(tees).map(([key, tee]) => (
              <div
                key={key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 80px auto',
                  gap: '10px',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}
              >
                <input
                  type="text"
                  value={tee.name}
                  onChange={(e) => handleUpdateTee(key, 'name', e.target.value)}
                  placeholder="Name"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <input
                  type="number"
                  value={tee.courseRating}
                  onChange={(e) => handleUpdateTee(key, 'courseRating', e.target.value)}
                  placeholder="Rating"
                  step="0.1"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <input
                  type="number"
                  value={tee.slopeRating}
                  onChange={(e) => handleUpdateTee(key, 'slopeRating', e.target.value)}
                  placeholder="Slope"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <button
                  onClick={() => handleDeleteTee(key)}
                  style={{
                    background: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    cursor: 'pointer'
                  }}
                >
                  X
                </button>
              </div>
            ))}

            {/* Add New Tee */}
            <div style={{ borderTop: '1px solid #ddd', paddingTop: '15px', marginTop: '15px' }}>
              <h6 style={{ marginBottom: '10px' }}>Add New Tee</h6>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={newTeeKey}
                  onChange={(e) => setNewTeeKey(e.target.value)}
                  placeholder="Key (e.g. white)"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <input
                  type="text"
                  value={newTeeName}
                  onChange={(e) => setNewTeeName(e.target.value)}
                  placeholder="Display Name"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <input
                  type="number"
                  value={newTeeRating}
                  onChange={(e) => setNewTeeRating(e.target.value)}
                  placeholder="Rating"
                  step="0.1"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
                <input
                  type="number"
                  value={newTeeSlope}
                  onChange={(e) => setNewTeeSlope(e.target.value)}
                  placeholder="Slope"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <button className="btn btn-primary btn-small" onClick={handleAddTee}>
                Add Tee
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AccountSection({ user, profile, onSignOut, onUnlinkProfile }) {
  const [signingOut, setSigningOut] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false)

  if (!user) {
    return (
      <div style={{
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        border: '1px solid #e0e0e0'
      }}>
        <h3 style={{ marginBottom: '10px' }}>Account</h3>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Not signed in. Sign in to link your player profile and access your leagues across devices.
        </p>
      </div>
    )
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await onSignOut()
    } catch (err) {
      console.error('Sign out error:', err)
      setSigningOut(false)
    }
  }

  const handleUnlink = async () => {
    setUnlinking(true)
    try {
      await onUnlinkProfile()
    } catch (err) {
      console.error('Unlink profile error:', err)
      setUnlinking(false)
      setShowUnlinkConfirm(false)
    }
  }

  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      border: '1px solid #e0e0e0'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Account</h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: '600' }}>{profile?.display_name || 'No profile'}</div>
          <div style={{ color: '#666', fontSize: '13px' }}>{user.email}</div>
          {profile && (
            <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
              Profile ID: {profile.id.slice(0, 8)}...
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            opacity: signingOut ? 0.6 : 1
          }}
        >
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>

      {profile && (
        <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
          {!showUnlinkConfirm ? (
            <button
              onClick={() => setShowUnlinkConfirm(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#e67e22',
                cursor: 'pointer',
                fontSize: '13px',
                padding: 0,
                textDecoration: 'underline'
              }}
            >
              Wrong profile? Unlink and choose a different one
            </button>
          ) : (
            <div style={{
              background: '#fff3cd',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #ffc107'
            }}>
              <p style={{ fontSize: '13px', marginBottom: '10px', color: '#856404' }}>
                This will unlink <strong>{profile.display_name}</strong> from your account.
                You'll be taken back to the profile selection screen to choose or create a different one.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleUnlink}
                  disabled={unlinking}
                  style={{
                    background: '#e67e22',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px',
                    opacity: unlinking ? 0.6 : 1
                  }}
                >
                  {unlinking ? 'Unlinking...' : 'Yes, Unlink Profile'}
                </button>
                <button
                  onClick={() => setShowUnlinkConfirm(false)}
                  style={{
                    background: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MigrationSection({ leagueId, players, onPlayersUpdate }) {
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState([])
  const [results, setResults] = useState(null)
  const [pendingCount, setPendingCount] = useState(null)

  const checkPending = async () => {
    const pending = await getPendingMigrations()
    setPendingCount(pending.length)
  }

  const handleRunMigrations = async () => {
    setRunning(true)
    setLogs([])
    setResults(null)

    try {
      const result = await runAllPendingMigrations(
        (msg) => setLogs(prev => [...prev, msg]),
        { leagueId, players }
      )
      setResults(result)
      await checkPending()

      // If profiles migration returned updated players, save them
      const profileResult = result.results.find(r => r.id === 'migrate_profiles_v1')
      if (profileResult?.success && profileResult.result?.updatedPlayers) {
        onPlayersUpdate(profileResult.result.updatedPlayers)
      }
    } catch (err) {
      setLogs(prev => [...prev, `ERROR: ${err.message}`])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{
      background: '#fff3cd',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      border: '1px solid #ffc107'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Data Migrations</h3>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
        Run data migrations to set up profiles and league metadata for multi-league support.
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          className="btn btn-primary"
          onClick={handleRunMigrations}
          disabled={running}
        >
          {running ? 'Running...' : 'Run Migrations'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={checkPending}
        >
          Check Pending
        </button>
      </div>

      {pendingCount !== null && (
        <div style={{ marginBottom: '10px', fontSize: '14px' }}>
          {pendingCount === 0
            ? <span style={{ color: '#27ae60' }}>All migrations have been run.</span>
            : <span style={{ color: '#e67e22' }}>{pendingCount} pending migration(s)</span>
          }
        </div>
      )}

      {logs.length > 0 && (
        <div style={{
          background: '#1a1a2e',
          color: '#e0e0e0',
          padding: '12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: 'monospace',
          maxHeight: '200px',
          overflow: 'auto',
          marginBottom: '10px'
        }}>
          {logs.map((log, i) => (
            <div key={i} style={{ marginBottom: '2px' }}>{log}</div>
          ))}
        </div>
      )}

      {results && (
        <div style={{ fontSize: '14px' }}>
          <strong>Results:</strong> Ran {results.ran} migration(s).
          {results.results.map((r, i) => (
            <div key={i} style={{ marginLeft: '10px', marginTop: '4px' }}>
              {r.success ? '✓' : '✗'} {r.name}
              {r.error && <span style={{ color: '#e74c3c' }}> - {r.error}</span>}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

function ManageProfilesSection() {
  const [tab, setTab] = useState('claimed') // 'claimed' | 'ghost'
  const [claimedProfiles, setClaimedProfiles] = useState([])
  const [ghostProfiles, setGhostProfiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [unlinkingId, setUnlinkingId] = useState(null)
  const [assigningId, setAssigningId] = useState(null)
  const [assignEmail, setAssignEmail] = useState('')
  const [savingId, setSavingId] = useState(null)

  const loadAllProfiles = async () => {
    setLoading(true)
    const { getClaimedProfiles, getGhostProfiles } = await import('../lib/profileService')
    const [claimed, ghosts] = await Promise.all([
      getClaimedProfiles(),
      getGhostProfiles()
    ])
    setClaimedProfiles(claimed)
    setGhostProfiles(ghosts)
    setLoading(false)
    setLoaded(true)
  }

  const handleUnlink = async (profileToUnlink) => {
    if (!window.confirm(`Unlink "${profileToUnlink.display_name}" from their account? They will need to re-claim a profile on next login.`)) {
      return
    }
    setUnlinkingId(profileToUnlink.id)
    try {
      const { unlinkProfile } = await import('../lib/profileService')
      await unlinkProfile(profileToUnlink.id)
      setClaimedProfiles(prev => prev.filter(p => p.id !== profileToUnlink.id))
      // Move to ghost list
      setGhostProfiles(prev => [...prev, { ...profileToUnlink, user_id: null }].sort((a, b) => a.display_name.localeCompare(b.display_name)))
    } catch (err) {
      console.error('Error unlinking profile:', err)
      alert('Failed to unlink profile: ' + err.message)
    } finally {
      setUnlinkingId(null)
    }
  }

  const handleAssignEmail = async (ghostProfile) => {
    if (!assignEmail.trim() || !assignEmail.includes('@')) {
      alert('Please enter a valid email address')
      return
    }
    setSavingId(ghostProfile.id)
    try {
      const { assignEmailToProfile } = await import('../lib/profileService')
      const updated = await assignEmailToProfile(ghostProfile.id, assignEmail.trim())
      if (updated) {
        setGhostProfiles(prev => prev.map(p => p.id === ghostProfile.id ? { ...p, email: assignEmail.trim() } : p))
      }
      setAssigningId(null)
      setAssignEmail('')
    } catch (err) {
      console.error('Error assigning email:', err)
      alert('Failed to assign email: ' + err.message)
    } finally {
      setSavingId(null)
    }
  }

  const handleClearEmail = async (ghostProfile) => {
    setSavingId(ghostProfile.id)
    try {
      const { assignEmailToProfile } = await import('../lib/profileService')
      await assignEmailToProfile(ghostProfile.id, null)
      setGhostProfiles(prev => prev.map(p => p.id === ghostProfile.id ? { ...p, email: null } : p))
    } catch (err) {
      console.error('Error clearing email:', err)
    } finally {
      setSavingId(null)
    }
  }

  const tabStyle = (isActive) => ({
    padding: '8px 16px',
    border: 'none',
    borderBottom: isActive ? '3px solid #3498db' : '3px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontWeight: isActive ? '600' : '400',
    color: isActive ? '#3498db' : '#666',
    fontSize: '14px'
  })

  return (
    <div style={{
      background: '#f0f4ff',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      border: '1px solid #b8d4fe'
    }}>
      <h3 style={{ marginBottom: '10px' }}>Manage Profiles</h3>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
        Manage claimed profiles and pre-assign emails to ghost profiles for auto-linking on first login.
      </p>

      {!loaded ? (
        <button
          className="btn btn-primary"
          onClick={loadAllProfiles}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load Profiles'}
        </button>
      ) : (
        <div>
          {/* Tabs */}
          <div style={{ borderBottom: '1px solid #ddd', marginBottom: '15px' }}>
            <button style={tabStyle(tab === 'claimed')} onClick={() => setTab('claimed')}>
              Claimed ({claimedProfiles.length})
            </button>
            <button style={tabStyle(tab === 'ghost')} onClick={() => setTab('ghost')}>
              Ghost / Unclaimed ({ghostProfiles.length})
            </button>
          </div>

          {/* Claimed Tab */}
          {tab === 'claimed' && (
            claimedProfiles.length === 0 ? (
              <p style={{ color: '#666', fontSize: '14px' }}>No claimed profiles.</p>
            ) : (
              <div>
                {claimedProfiles.map(p => (
                  <div key={p.id} style={{
                    background: 'white',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.display_name}</div>
                      <div style={{ color: '#666', fontSize: '12px' }}>
                        {p.email || 'No email'} | ID: {p.id.slice(0, 8)}...
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnlink(p)}
                      disabled={unlinkingId === p.id}
                      style={{
                        background: '#e67e22',
                        color: 'white',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        opacity: unlinkingId === p.id ? 0.6 : 1
                      }}
                    >
                      {unlinkingId === p.id ? '...' : 'Unlink'}
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Ghost Tab */}
          {tab === 'ghost' && (
            ghostProfiles.length === 0 ? (
              <p style={{ color: '#666', fontSize: '14px' }}>No ghost profiles.</p>
            ) : (
              <div>
                <p style={{ color: '#666', fontSize: '12px', marginBottom: '10px' }}>
                  Assign an email to a ghost profile so it auto-links when that user signs up or logs in.
                </p>
                {ghostProfiles.map(p => (
                  <div key={p.id} style={{
                    background: 'white',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.display_name}</div>
                        <div style={{ color: '#666', fontSize: '12px' }}>
                          {p.email ? (
                            <span>
                              Pre-assigned: <strong>{p.email}</strong>
                              <button
                                onClick={() => handleClearEmail(p)}
                                disabled={savingId === p.id}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#e74c3c',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  marginLeft: '8px',
                                  padding: 0,
                                  textDecoration: 'underline'
                                }}
                              >
                                clear
                              </button>
                            </span>
                          ) : 'No email assigned'}
                        </div>
                      </div>
                      {!p.email && assigningId !== p.id && (
                        <button
                          onClick={() => { setAssigningId(p.id); setAssignEmail('') }}
                          style={{
                            background: '#27ae60',
                            color: 'white',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          Assign Email
                        </button>
                      )}
                    </div>
                    {assigningId === p.id && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="email"
                          value={assignEmail}
                          onChange={(e) => setAssignEmail(e.target.value)}
                          placeholder="user@example.com"
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '5px',
                            border: '1px solid #ccc',
                            fontSize: '13px'
                          }}
                        />
                        <button
                          onClick={() => handleAssignEmail(p)}
                          disabled={savingId === p.id}
                          style={{
                            background: '#27ae60',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            opacity: savingId === p.id ? 0.6 : 1
                          }}
                        >
                          {savingId === p.id ? '...' : 'Save'}
                        </button>
                        <button
                          onClick={() => { setAssigningId(null); setAssignEmail('') }}
                          style={{
                            background: '#f0f0f0',
                            color: '#333',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          <button
            onClick={loadAllProfiles}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              color: '#3498db',
              cursor: 'pointer',
              fontSize: '13px',
              padding: 0,
              marginTop: '10px',
              textDecoration: 'underline'
            }}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      )}
    </div>
  )
}

function SettingsPage({ onShowLeagueSelector }) {
  const navigate = useNavigate()
  const { user, profile, signOut, unlinkMyProfile } = useAuth()
  const {
    leagueId,
    isAdmin,
    adminLogin,
    adminLogout,
    leaveLeague,
    cloneLeagueToTest,
    payoutFormats,
    setPayoutFormats,
    holeInOnePot,
    setHoleInOnePot,
    players,
    setPlayers,
    liveRound,
    setLiveRound,
    setSkinsMatch,
    setQuickSkinsMode,
    defaultStartingHole,
    setDefaultStartingHole,
    handicapSettings,
    setHandicapSettings,
    courseTees,
    setCourseTees,
    leagueSettings,
    setLeagueSettings,
    isSiteOwner,
    actualSiteOwner,
    siteOwnerLogin,
    siteOwnerLogout,
    viewAsRole,
    setViewAsRole,
    courseMapping,
    setCourseMapping
  } = useLeague()

  const handleStartQuickSkins = ({ players: qsPlayers, teams, skinsSettings, greenieSettings }) => {
    // Create the quick skins round
    const quickRound = {
      date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD in local timezone
      teams: teams.map((team, idx) => ({
        id: idx + 1,
        name: `Team ${idx + 1}`,
        players: team.map(p => ({
          ...p,
          scores: {},
          isDNF: false,
          includeInTeamScore: true
        })),
        isFinished: false
      })),
      greenies: {},
      quickSkinsGreenieSettings: greenieSettings.enabled ? greenieSettings : null
    }

    const quickSkinsMatchData = {
      settings: {
        ...skinsSettings,
        playerHandicaps: {},
        // Include greenie settings so settlement calculations work
        greeniesEnabled: greenieSettings.enabled,
        greeniesCostPerHole: greenieSettings.enabled ? parseFloat(greenieSettings.costPerGreenie) || 1 : 0,
        greeniesCarryover: greenieSettings.carryovers,
        greeniesWrap: greenieSettings.wrapUnwonGreenies,
        greeniesWrapTo: greenieSettings.wrapTo
      },
      participants: qsPlayers.map(p => String(p.id)),
      results: {}
    }

    // Set the state to start the game
    setLiveRound(quickRound)
    setSkinsMatch(quickSkinsMatchData)
    setQuickSkinsMode(true)

    // Navigate to the live page with skins tab
    navigate('/live')
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Settings</h2>

      {/* Account Section */}
      <AccountSection user={user} profile={profile} onSignOut={signOut} onUnlinkProfile={unlinkMyProfile} />

      <AdminLoginSection
        isAdmin={isAdmin}
        onLogin={adminLogin}
        onLogout={adminLogout}
      />

      {/* Next Round Announcement - Admin Only */}
      {isAdmin && (
        <NextRoundAnnouncementSection
          leagueSettings={leagueSettings}
          onUpdate={setLeagueSettings}
          isAdmin={isAdmin}
        />
      )}

      {/* Quick Skins Section */}
      <QuickSkinsSection
        players={players}
        liveRound={liveRound}
        onStartQuickSkins={handleStartQuickSkins}
      />

      <LeagueInfoSection
        leagueId={leagueId}
        onLeave={() => {
          // Remove league_members row if authenticated
          if (profile?.id) {
            removeLeagueMember(leagueId, profile.id).catch(err => {
              console.warn('Could not remove league member row:', err)
            })
          }
          leaveLeague()
        }}
        onCloneToTest={cloneLeagueToTest}
        isAdmin={isAdmin}
        onSwitchLeague={onShowLeagueSelector}
        isAuthenticated={!!user}
      />

      <RoundSettingsSection
        defaultStartingHole={defaultStartingHole}
        onUpdate={setDefaultStartingHole}
        isAdmin={isAdmin}
      />

      <HandicapSettingsSection
        handicapSettings={handicapSettings}
        onUpdateHandicap={setHandicapSettings}
        courseTees={courseTees}
        onUpdateTees={setCourseTees}
        isAdmin={isAdmin}
        players={players}
        leagueId={leagueId}
      />

      <HoleInOnePotSection
        holeInOnePot={holeInOnePot}
        onUpdate={setHoleInOnePot}
        isAdmin={isAdmin}
      />

      <PayoutSettingsSection
        payoutFormats={payoutFormats}
        onUpdate={setPayoutFormats}
        isAdmin={isAdmin}
      />

      {/* Site Owner Tools - visible when actually site owner (even when "viewing as" lower role) */}
      {actualSiteOwner && (
        <>
          <ManageProfilesSection />
          <MigrationSection
            leagueId={leagueId}
            players={players}
            onPlayersUpdate={setPlayers}
          />
        </>
      )}

      {/* Site Owner Access - auto-shown for profile-based owners, triple-tap for PIN */}
      <SiteOwnerAccessSection
        isSiteOwner={isSiteOwner}
        actualSiteOwner={actualSiteOwner}
        onLogin={siteOwnerLogin}
        onLogout={siteOwnerLogout}
        courseMapping={courseMapping}
        onUpdateCourseMapping={setCourseMapping}
        viewAsRole={viewAsRole}
        onSetViewAsRole={setViewAsRole}
      />
    </div>
  )
}

export default SettingsPage
