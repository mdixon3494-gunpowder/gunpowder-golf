import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../context/LeagueContext'
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

function LeagueInfoSection({ leagueId, onLeave, onCloneToTest, isAdmin }) {
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
            You can rejoin later using the league code. Your data will remain in the league.
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
          className="btn btn-secondary"
          onClick={() => setShowLeaveConfirm(true)}
          style={{ width: '100%' }}
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
    wrapUnwonGreenies: true,
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
      wrapUnwonGreenies: true,
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

function SettingsPage() {
  const navigate = useNavigate()
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
    liveRound,
    setLiveRound,
    setSkinsMatch,
    setQuickSkinsMode,
    defaultStartingHole,
    setDefaultStartingHole,
    handicapSettings,
    setHandicapSettings,
    courseTees,
    setCourseTees
  } = useLeague()

  const handleStartQuickSkins = ({ players: qsPlayers, teams, skinsSettings, greenieSettings }) => {
    // Create the quick skins round
    const quickRound = {
      date: new Date().toISOString().split('T')[0],
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
        greeniesCarryover: greenieSettings.carryovers
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

      <AdminLoginSection
        isAdmin={isAdmin}
        onLogin={adminLogin}
        onLogout={adminLogout}
      />

      {/* Quick Skins Section */}
      <QuickSkinsSection
        players={players}
        liveRound={liveRound}
        onStartQuickSkins={handleStartQuickSkins}
      />

      <LeagueInfoSection
        leagueId={leagueId}
        onLeave={leaveLeague}
        onCloneToTest={cloneLeagueToTest}
        isAdmin={isAdmin}
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

      {/* App info */}
      <div style={{
        background: '#f8f9fa',
        padding: '15px',
        borderRadius: '10px',
        textAlign: 'center',
        fontSize: '13px',
        color: '#666'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '5px' }}>Gunpowder Big Boy's Golf</div>
        <div>League Management App</div>
        <div style={{ marginTop: '10px', fontSize: '11px' }}>
          Migrated from v5.18
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
