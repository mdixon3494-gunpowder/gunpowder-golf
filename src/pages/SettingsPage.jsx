import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../context/LeagueContext'

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

function LeagueInfoSection({ leagueId, onLeave }) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const copyLeagueCode = () => {
    navigator.clipboard.writeText(leagueId)
    alert('League code copied to clipboard!')
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

function SettingsPage() {
  const navigate = useNavigate()
  const {
    leagueId,
    isAdmin,
    adminLogin,
    adminLogout,
    leaveLeague,
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
    setDefaultStartingHole
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
      />

      <RoundSettingsSection
        defaultStartingHole={defaultStartingHole}
        onUpdate={setDefaultStartingHole}
        isAdmin={isAdmin}
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
