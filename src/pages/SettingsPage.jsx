import { useState } from 'react'
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

function SettingsPage() {
  const {
    leagueId,
    isAdmin,
    adminLogin,
    adminLogout,
    leaveLeague,
    payoutFormats,
    setPayoutFormats,
    holeInOnePot,
    setHoleInOnePot
  } = useLeague()

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Settings</h2>

      <AdminLoginSection
        isAdmin={isAdmin}
        onLogin={adminLogin}
        onLogout={adminLogout}
      />

      <LeagueInfoSection
        leagueId={leagueId}
        onLeave={leaveLeague}
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
