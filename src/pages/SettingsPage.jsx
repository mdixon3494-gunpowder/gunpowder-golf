import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeague } from '../context/LeagueContext'
import { useAuth } from '../context/AuthContext'
import { removeLeagueMember } from '../lib/leagueService'
import InviteSection from '../components/InviteSection'
import PendingApprovalList from '../components/PendingApprovalList'
import MemberManagement from '../components/MemberManagement'
import JoinSettingsSection from '../components/JoinSettingsSection'
import { softDeleteLeague } from '../lib/leagueService'
import CourseMappingTool from '../components/gps/CourseMappingTool'
import AuditLogViewer from '../components/AuditLogViewer'
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
        background: 'var(--color-success)',
        color: 'white',
        padding: '20px',
        borderRadius: 'var(--radius-md)',
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
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Admin Login</h3>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '15px', fontSize: '14px' }}>
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
            borderRadius: 'var(--radius-sm)',
            border: error ? '2px solid var(--color-danger)' : '1px solid var(--color-border)',
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
        <div style={{ color: 'var(--color-danger)', marginTop: '10px', fontSize: '14px' }}>
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
          background: 'var(--color-accent-purple)',
          color: 'white',
          padding: '20px',
          borderRadius: 'var(--radius-md)',
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
                    color: viewAsRole === opt.value ? 'var(--color-accent-purple)' : 'white'
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
              color: 'var(--color-accent-purple)',
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
          background: 'var(--color-surface-sunken)',
          padding: '15px',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
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
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '15px', fontSize: '14px' }}>
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
                  border: error ? '2px solid var(--color-danger)' : '1px solid var(--color-border)',
                  fontSize: '24px',
                  textAlign: 'center',
                  letterSpacing: '10px',
                  marginBottom: '15px'
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              {error && (
                <div style={{ color: 'var(--color-danger)', marginBottom: '15px', fontSize: '14px', textAlign: 'center' }}>
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

function LeagueInfoSection({ leagueId, onLeave, onDelete, onCloneToTest, isAdmin, isLeagueOwner, onSwitchLeague, isAuthenticated }) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
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
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '15px' }}>League Information</h3>

      <div style={{
        background: 'var(--color-surface-sunken)',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>League Code</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '3px' }}>{leagueId}</div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={copyLeagueCode}
        >
          Copy
        </button>
      </div>

      <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '15px' }}>
        Share this code with others so they can join your league and view live scores.
      </p>

      {/* Clone to Test League - Admin only */}
      {isAdmin && (
        <div style={{
          background: 'var(--color-info-light)',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '15px',
          border: '1px solid var(--color-info-light-border)'
        }}>
          <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Clone to Test League</h4>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '10px' }}>
            Create a copy of this league for testing. All players, history, and settings will be copied.
          </p>

          {showCloneForm ? (
            <div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
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
                  background: 'var(--color-danger-light)',
                  color: 'var(--color-danger-dark)',
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
                  background: 'var(--color-success-light)',
                  color: 'var(--color-success-dark)',
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
            background: 'var(--color-success)',
            color: 'white',
            fontWeight: '600',
            marginBottom: '10px',
            padding: '12px'
          }}
        >
          Switch League
        </button>
      )}

      {/* Delete League - Owner only */}
      {isLeagueOwner && onDelete && (
        showDeleteConfirm ? (
          <div style={{
            background: 'var(--color-danger-light)',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid var(--color-danger-border)',
            marginBottom: '10px'
          }}>
            <p style={{ marginBottom: '10px', fontWeight: '600', color: 'var(--color-danger-dark)' }}>
              Delete this league?
            </p>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '15px', fontSize: '13px' }}>
              The league will be hidden from all members. A site owner can restore it later.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={async () => {
                  setDeleteLoading(true)
                  await onDelete()
                  setDeleteLoading(false)
                }}
                disabled={deleteLoading}
                style={{ background: 'var(--color-danger-dark)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: '600' }}
              >
                {deleteLoading ? 'Deleting...' : 'Delete League'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: '100%',
              background: 'none',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger-dark)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '10px'
            }}
          >
            Delete League
          </button>
        )
      )}

      {/* Leave League - secondary danger action */}
      {showLeaveConfirm ? (
        <div style={{
          background: 'var(--color-warning-light)',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid var(--color-warning)'
        }}>
          <p style={{ marginBottom: '15px', fontWeight: '600' }}>
            Leave this league?
          </p>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '15px', fontSize: '13px' }}>
            Your membership will be removed. You can rejoin later using the league code.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn"
              onClick={onLeave}
              style={{ background: 'var(--color-danger)', color: 'white' }}
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
            color: 'var(--color-danger)',
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

function GreenieCarryoverSection({ leagueSettings, onUpdate, isAdmin }) {
  const settings = leagueSettings?.greenieCarryover || {}
  const carryoverMode = settings.carryoverMode || 'last_winner'
  const noWinnersMode = settings.noWinnersMode || 'hio_pot'

  const updateSetting = (key, value) => {
    onUpdate({
      ...leagueSettings,
      greenieCarryover: { ...settings, [key]: value }
    })
  }

  const carryoverOptions = [
    { value: 'last_winner', label: 'Last Greenie Winner', desc: 'Player who won the last greenie gets the leftover' },
    { value: 'first_winner', label: 'First Greenie Winner', desc: 'Player who won the first greenie gets the leftover' },
    { value: 'hio_pot', label: 'Hole-in-One Pot', desc: 'Leftover rolls into the hole-in-one pot' },
    { value: 'split', label: 'Split Evenly', desc: 'Leftover is split equally among all players' }
  ]

  const noWinnersOptions = [
    { value: 'hio_pot', label: 'Hole-in-One Pot', desc: 'All greenie money goes to the hole-in-one pot' },
    { value: 'split', label: 'Split Evenly', desc: 'All greenie money is refunded equally to all players' },
    { value: 'carry_next', label: 'Carry to Next Week', desc: 'All greenie money carries over to next round' }
  ]

  return (
    <div style={{
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '4px' }}>Unwon Greenie Payouts</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginBottom: '15px' }}>
        What happens to greenie money when the last par 3 has no winner (carryover leftover).
      </p>

      {/* Carryover mode — some greenies won but leftover remains */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '8px' }}>
          Leftover carryover goes to:
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {carryoverOptions.map(opt => (
            <label
              key={opt.value}
              onClick={() => isAdmin && updateSetting('carryoverMode', opt.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: carryoverMode === opt.value ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: carryoverMode === opt.value ? 'var(--color-success-light)' : 'var(--color-surface-sunken)',
                cursor: isAdmin ? 'pointer' : 'default',
                fontSize: '13px'
              }}
            >
              <input
                type="radio"
                checked={carryoverMode === opt.value}
                onChange={() => updateSetting('carryoverMode', opt.value)}
                disabled={!isAdmin}
                style={{ margin: 0 }}
              />
              <div>
                <div style={{ fontWeight: '600' }}>{opt.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* No winners mode — zero greenies won all round */}
      <div>
        <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', marginBottom: '8px' }}>
          If no greenies are won all round:
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {noWinnersOptions.map(opt => (
            <label
              key={opt.value}
              onClick={() => isAdmin && updateSetting('noWinnersMode', opt.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: noWinnersMode === opt.value ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: noWinnersMode === opt.value ? 'var(--color-success-light)' : 'var(--color-surface-sunken)',
                cursor: isAdmin ? 'pointer' : 'default',
                fontSize: '13px'
              }}
            >
              <input
                type="radio"
                checked={noWinnersMode === opt.value}
                onChange={() => updateSetting('noWinnersMode', opt.value)}
                disabled={!isAdmin}
                style={{ margin: 0 }}
              />
              <div>
                <div style={{ fontWeight: '600' }}>{opt.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
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
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Payout Formats</h3>

      {Object.entries(payoutFormats).map(([key, format]) => (
        <div key={key} style={{
          background: 'var(--color-surface-sunken)',
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
              <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
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
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '2px solid var(--color-warning)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3>Hole-in-One Pot</h3>
        <div style={{
          background: 'var(--color-warning)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: 'var(--radius-full)',
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
              background: 'var(--color-surface-sunken)',
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
                  style={{ flex: 1, background: 'var(--color-danger)', color: 'white' }}
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
                background: tx.amount > 0 ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                borderRadius: '4px',
                marginBottom: '4px',
                fontSize: '13px'
              }}>
                <div>
                  <span>{tx.description}</span>
                  <span style={{ color: 'var(--color-text-tertiary)', marginLeft: '8px', fontSize: '11px' }}>
                    {new Date(tx.date).toLocaleDateString()}
                  </span>
                </div>
                <span style={{
                  fontWeight: '600',
                  color: tx.amount > 0 ? 'var(--color-success)' : 'var(--color-danger)'
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

function NextRoundAnnouncementSection({ leagueSettings, onUpdate, isAdmin, leagueId }) {
  const nextRoundDate = leagueSettings?.nextRoundDate || ''
  const nextRoundTime = leagueSettings?.nextRoundTime || ''
  const nextRoundMessage = leagueSettings?.nextRoundMessage || ''
  const [notifySent, setNotifySent] = useState(false)
  const [notifying, setNotifying] = useState(false)

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

  const handleNotify = async () => {
    setNotifying(true)
    try {
      const { sendPushNotification } = await import('../lib/notificationService')
      let body = ''
      if (nextRoundDate || nextRoundTime) {
        body = formatDate(nextRoundDate)
        if (nextRoundTime) body += ` at ${formatTime(nextRoundTime)}`
      }
      if (nextRoundMessage) {
        body += body ? ` — ${nextRoundMessage}` : nextRoundMessage
      }
      await sendPushNotification(leagueId, leagueName || 'Next Round', body, { tag: 'round-announcement', category: 'admin_messages' })
      setNotifySent(true)
      setTimeout(() => setNotifySent(false), 3000)
    } catch (err) {
      console.error('Failed to send announcement notification:', err)
    }
    setNotifying(false)
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
        background: 'var(--color-skins)',
        color: 'white',
        padding: '20px',
        borderRadius: 'var(--radius-md)',
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
      background: 'var(--color-warning-light)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '2px solid var(--color-warning)'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Next Round Announcement</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '15px' }}>
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
              border: '1px solid var(--color-border)',
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
              border: '1px solid var(--color-border)',
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
            border: '1px solid var(--color-border)',
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Preview */}
      {hasAnnouncement && (
        <div style={{
          background: 'var(--color-skins)',
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {leagueId && (
            <button
              onClick={handleNotify}
              disabled={notifying}
              style={{
                background: 'var(--color-primary)',
                border: 'none',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: notifying ? 'default' : 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                opacity: notifying ? 0.6 : 1
              }}
            >
              {notifySent ? 'Sent!' : notifying ? 'Sending...' : 'Notify Members'}
            </button>
          )}
          <button
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Clear Announcement
          </button>
        </div>
      )}
    </div>
  )
}

function SideGamesSettingsSection({ leagueSettings, onUpdate, isAdmin }) {
  const sideGames = leagueSettings.sideGames || { enabled: false, allowSkins: true, allowNassau: true }

  const updateSideGames = (updates) => {
    onUpdate({ ...leagueSettings, sideGames: { ...sideGames, ...updates } })
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Side Games</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '15px' }}>
        Enable side games (Skins, Nassau) that run alongside league rounds. Wolf is available in casual games only.
      </p>

      {isAdmin ? (
        <>
          {/* Master toggle */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            marginBottom: sideGames.enabled ? '15px' : '0',
            padding: '12px',
            background: sideGames.enabled ? 'var(--color-success-light)' : 'var(--color-surface-sunken)',
            borderRadius: '8px',
            border: sideGames.enabled ? '2px solid var(--color-success)' : '2px solid var(--color-border)'
          }}>
            <input
              type="checkbox"
              checked={sideGames.enabled}
              onChange={(e) => updateSideGames({ enabled: e.target.checked })}
              style={{ width: '20px', height: '20px' }}
            />
            <span style={{ fontWeight: '600', color: sideGames.enabled ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
              Enable Side Games
            </span>
          </label>

          {/* Per-game checkboxes */}
          {sideGames.enabled && (
            <div style={{ padding: '0 12px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                marginBottom: '10px'
              }}>
                <input
                  type="checkbox"
                  checked={sideGames.allowSkins !== false}
                  onChange={(e) => updateSideGames({ allowSkins: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>Side Skins</span>
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                marginBottom: '10px'
              }}>
                <input
                  type="checkbox"
                  checked={sideGames.allowNassau !== false}
                  onChange={(e) => updateSideGames({ allowNassau: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>Side Nassau</span>
              </label>
              <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '5px' }}>
                Wolf is only available in casual games.
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{
          background: 'var(--color-surface-sunken)',
          padding: '12px 15px',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          Side Games: <strong>{sideGames.enabled ? 'Enabled' : 'Disabled'}</strong>
          {sideGames.enabled && (
            <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              ({[sideGames.allowSkins !== false && 'Skins', sideGames.allowNassau !== false && 'Nassau'].filter(Boolean).join(', ') || 'None selected'})
            </span>
          )}
          <span style={{ color: 'var(--color-text-tertiary)', marginLeft: '10px', fontSize: '12px' }}>(Admin only)</span>
        </div>
      )}
    </div>
  )
}

function TeamScoringRulesSection({ leagueSettings, onUpdate, isAdmin }) {
  const rules = leagueSettings.teamScoringRules || {
    maxScoreMode: 'none',
    maxScoreFixed: 10,
    allowXForTeamScore: false,
    dqOnMissingScores: false
  }

  const updateRules = (updates) => {
    onUpdate({ ...leagueSettings, teamScoringRules: { ...rules, ...updates } })
  }

  const maxScoreOptions = [
    { value: 'none', label: 'No Max', desc: 'Raw scores count toward team total' },
    { value: 'ndb', label: 'Net Double Bogey', desc: 'Par + 2 + handicap strokes (WHS)' },
    { value: 'double_bogey', label: 'Double Bogey', desc: 'Par + 2 for all players' },
    { value: 'triple_bogey', label: 'Triple Bogey', desc: 'Par + 3 for all players' },
    { value: 'fixed', label: 'Custom Fixed', desc: 'Same max for every hole' }
  ]

  const hasMax = rules.maxScoreMode && rules.maxScoreMode !== 'none'

  return (
    <div style={{
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '5px' }}>Team Scoring Rules</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '15px' }}>
        Control how individual scores contribute to team totals. Separate from handicap calculation settings.
      </p>

      {isAdmin ? (
        <>
          {/* Setting 1: Max Score Mode */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
              Max Score Per Player Per Hole
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {maxScoreOptions.map(opt => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: rules.maxScoreMode === opt.value ? '2px solid var(--color-success)' : '2px solid var(--color-border)',
                    background: rules.maxScoreMode === opt.value ? 'var(--color-success-light)' : 'var(--color-surface)',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="maxScoreMode"
                    value={opt.value}
                    checked={rules.maxScoreMode === opt.value}
                    onChange={() => updateRules({ maxScoreMode: opt.value })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: rules.maxScoreMode === opt.value ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Fixed value input */}
            {rules.maxScoreMode === 'fixed' && (
              <div style={{ marginTop: '10px', paddingLeft: '28px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Fixed Max Score: </label>
                <input
                  type="number"
                  min="4"
                  max="20"
                  value={rules.maxScoreFixed || 10}
                  onChange={(e) => updateRules({ maxScoreFixed: parseInt(e.target.value) || 10 })}
                  style={{
                    width: '60px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '14px',
                    marginLeft: '8px'
                  }}
                />
              </div>
            )}
          </div>

          {/* Setting 2: Allow X for Team Score (only when max is active) */}
          {hasMax && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                padding: '12px',
                background: rules.allowXForTeamScore ? 'var(--color-success-light)' : 'var(--color-surface-sunken)',
                borderRadius: '8px',
                border: rules.allowXForTeamScore ? '2px solid var(--color-success)' : '2px solid var(--color-border)'
              }}>
                <input
                  type="checkbox"
                  checked={rules.allowXForTeamScore || false}
                  onChange={(e) => updateRules({ allowXForTeamScore: e.target.checked })}
                  style={{ width: '20px', height: '20px' }}
                />
                <div>
                  <div style={{ fontWeight: '600', color: rules.allowXForTeamScore ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                    Convert X Scores to Team Max
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    When enabled, X scores count as the max score instead of being excluded
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Setting 3: DQ on Missing Scores (only when X is NOT allowed) */}
          {!rules.allowXForTeamScore && (
            <div style={{ marginBottom: '0' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                padding: '12px',
                background: rules.dqOnMissingScores ? 'var(--color-danger-light, rgba(220,53,69,0.1))' : 'var(--color-surface-sunken)',
                borderRadius: '8px',
                border: rules.dqOnMissingScores ? '2px solid var(--color-danger)' : '2px solid var(--color-border)'
              }}>
                <input
                  type="checkbox"
                  checked={rules.dqOnMissingScores || false}
                  onChange={(e) => updateRules({ dqOnMissingScores: e.target.checked })}
                  style={{ width: '20px', height: '20px' }}
                />
                <div>
                  <div style={{ fontWeight: '600', color: rules.dqOnMissingScores ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                    DQ Team on Missing Scores
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    If any hole has no valid score from a team, the team is DQ for that 9
                  </div>
                </div>
              </label>
            </div>
          )}
        </>
      ) : (
        <div style={{
          background: 'var(--color-surface-sunken)',
          padding: '12px 15px',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          Max Score: <strong>{maxScoreOptions.find(o => o.value === rules.maxScoreMode)?.label || 'No Max'}</strong>
          {hasMax && rules.maxScoreMode === 'fixed' && <span> ({rules.maxScoreFixed || 10})</span>}
          {hasMax && <span> | X as Max: <strong>{rules.allowXForTeamScore ? 'Yes' : 'No'}</strong></span>}
          {!rules.allowXForTeamScore && <span> | DQ on Missing: <strong>{rules.dqOnMissingScores ? 'Yes' : 'No'}</strong></span>}
          <span style={{ color: 'var(--color-text-tertiary)', marginLeft: '10px', fontSize: '12px' }}>(Admin only)</span>
        </div>
      )}
    </div>
  )
}

function CourseSection({ leagueSettings, onUpdate, isAdmin }) {
  const courseId = leagueSettings?.course || 'gunpowder'

  const options = [
    { id: 'gunpowder', label: 'Gunpowder', subtitle: 'Single 18 — current default' },
    { id: 'shenvalee', label: 'Shenvalee Resort', subtitle: '27 holes (Olde / Creek / Miller) — pick nines per round' }
  ]

  return (
    <div style={{
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '4px' }}>Course</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginBottom: '15px' }}>
        Which course this league plays. Drives the scorecard used for scoring and skins.
      </p>

      {isAdmin ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => onUpdate({ ...leagueSettings, course: opt.id })}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: '8px',
                border: courseId === opt.id ? '2px solid var(--color-info)' : '1px solid var(--color-border)',
                background: courseId === opt.id ? 'var(--color-info-light)' : 'var(--color-surface)',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{opt.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{opt.subtitle}</div>
            </button>
          ))}
          {courseId === 'shenvalee' && (
            <div style={{ marginTop: '8px', padding: '10px', background: 'var(--color-surface-sunken)', borderRadius: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              You'll pick which nine plays as the front and which as the back on the Teams page before starting each round.
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--color-surface-sunken)', padding: '12px 15px', borderRadius: '8px', fontSize: '14px' }}>
          Course: <strong>{options.find(o => o.id === courseId)?.label || courseId}</strong>
        </div>
      )}
    </div>
  )
}

function TripModeSection({ leagueSettings, onUpdate, isAdmin }) {
  const trip = leagueSettings?.tripMode || { enabled: false, totalRounds: 4, maxTimesTogether: 2, noConsecutive: true }

  const update = (changes) => {
    onUpdate({
      ...leagueSettings,
      tripMode: { ...trip, ...changes }
    })
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '4px' }}>Trip Mode</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginBottom: '15px' }}>
        For multi-round golf trips with no preset handicaps. Flighting uses average trip scores; recency rules keep teammates fresh.
      </p>

      {isAdmin ? (
        <>
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '14px',
            borderRadius: '8px',
            border: trip.enabled ? '2px solid var(--color-success)' : '1px solid var(--color-border)',
            background: trip.enabled ? 'var(--color-success-light)' : 'var(--color-surface)',
            cursor: 'pointer',
            marginBottom: '12px'
          }}>
            <input
              type="checkbox"
              checked={!!trip.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
              style={{ marginTop: '2px' }}
            />
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>Enable Trip Mode</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                Round 1: build teams manually. Rounds 2+: flighting uses average gross score across trip rounds.
              </div>
            </div>
          </label>

          {trip.enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    Total Trip Rounds
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    value={trip.totalRounds ?? 4}
                    onChange={(e) => update({ totalRounds: Math.max(2, parseInt(e.target.value) || 4) })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                    Max Times Together
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={trip.maxTimesTogether ?? 2}
                    onChange={(e) => update({ maxTimesTogether: Math.max(1, parseInt(e.target.value) || 2) })}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '14px' }}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={trip.noConsecutive !== false}
                  onChange={(e) => update({ noConsecutive: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>No back-to-back teammates</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Players cannot be on the same team two rounds in a row (admin can still override manually).
                  </div>
                </div>
              </label>

              <div style={{
                background: 'var(--color-surface-sunken)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                lineHeight: '1.5'
              }}>
                <strong>Active rules:</strong><br />
                &#x2022; No two players on the same team in consecutive rounds {trip.noConsecutive !== false ? '✓' : '— off'}<br />
                &#x2022; No two players together more than <strong>{trip.maxTimesTogether ?? 2}</strong> times across <strong>{trip.totalRounds ?? 4}</strong> rounds<br />
                &#x2022; Manual teams and pairing requests bypass these rules
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ background: 'var(--color-surface-sunken)', padding: '12px 15px', borderRadius: '8px', fontSize: '14px' }}>
          Trip Mode: <strong>{trip.enabled ? `On (${trip.totalRounds}r, max ${trip.maxTimesTogether} together)` : 'Off'}</strong>
        </div>
      )}
    </div>
  )
}

function ScoringPermissionsSection({ leagueSettings, onUpdate, isAdmin }) {
  const permissions = leagueSettings?.scoringPermissions || { enabled: false }

  const updatePermissions = (updates) => {
    onUpdate({
      ...leagueSettings,
      scoringPermissions: { ...permissions, ...updates }
    })
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '4px' }}>Scoring Permissions</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginBottom: '15px' }}>
        Control who can enter scores during a live round.
      </p>

      {isAdmin ? (
        <>
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '14px',
            borderRadius: '8px',
            border: permissions.enabled ? '2px solid var(--color-info)' : '1px solid var(--color-border)',
            background: permissions.enabled ? 'var(--color-info-light)' : 'var(--color-surface)',
            cursor: 'pointer',
            marginBottom: '12px'
          }}>
            <input
              type="checkbox"
              checked={!!permissions.enabled}
              onChange={(e) => updatePermissions({ enabled: e.target.checked })}
              style={{ marginTop: '2px' }}
            />
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>Restrict Score Entry</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                When enabled, players can only enter scores for themselves and their teammates. Admins can always score for anyone.
              </div>
            </div>
          </label>

          {permissions.enabled && (
            <div style={{
              background: 'var(--color-surface-sunken)',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '13px',
              color: 'var(--color-text-secondary)'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--color-text-primary)' }}>Who can score:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>&#x2022; Players can score for <strong>themselves</strong></div>
                <div>&#x2022; Teammates can score for <strong>each other</strong></div>
                <div>&#x2022; Admins can score for <strong>anyone</strong></div>
                <div>&#x2022; Non-teammates are <strong>blocked</strong></div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{
          background: 'var(--color-surface-sunken)',
          padding: '12px 15px',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          Scoring restrictions: <strong>{permissions.enabled ? 'Enabled' : 'Off (anyone can score)'}</strong>
          <span style={{ color: 'var(--color-text-tertiary)', marginLeft: '10px', fontSize: '12px' }}>(Admin only)</span>
        </div>
      )}
    </div>
  )
}

function RoundSettingsSection({ defaultStartingHole, onUpdate, isAdmin }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Round Settings</h3>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
          Default Starting Hole
        </label>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '10px' }}>
          Set which hole the round typically starts on. This affects the default leaderboard view.
        </p>
        {isAdmin ? (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onUpdate(1)}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                border: defaultStartingHole === 1 || defaultStartingHole <= 9 ? '2px solid var(--color-success)' : '2px solid var(--color-border)',
                background: defaultStartingHole === 1 || (defaultStartingHole >= 1 && defaultStartingHole <= 9) ? 'var(--color-success-light)' : 'var(--color-surface)',
                fontWeight: defaultStartingHole >= 1 && defaultStartingHole <= 9 ? '600' : 'normal',
                color: defaultStartingHole >= 1 && defaultStartingHole <= 9 ? 'var(--color-success)' : 'var(--color-text-secondary)',
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
                border: defaultStartingHole >= 10 ? '2px solid var(--color-skins-dark)' : '2px solid var(--color-border)',
                background: defaultStartingHole >= 10 ? 'var(--color-skins-light)' : 'var(--color-surface)',
                fontWeight: defaultStartingHole >= 10 ? '600' : 'normal',
                color: defaultStartingHole >= 10 ? 'var(--color-skins-dark)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Back 9 (Hole 10)
            </button>
          </div>
        ) : (
          <div style={{
            background: 'var(--color-surface-sunken)',
            padding: '12px 15px',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            Starting on: <strong>{defaultStartingHole >= 10 ? 'Back 9 (Hole 10)' : 'Front 9 (Hole 1)'}</strong>
            <span style={{ color: 'var(--color-text-tertiary)', marginLeft: '10px', fontSize: '12px' }}>(Admin only)</span>
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
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '15px', color: 'var(--color-success)' }}>Handicap Settings</h3>

      {/* Handicap Scope */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          Handicap Scope for Team Generation
        </label>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
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
            border: '1px solid var(--color-border)',
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
              border: settings.calculationMode === 'auto' ? '2px solid var(--color-success)' : '2px solid var(--color-border)',
              background: settings.calculationMode === 'auto' ? 'var(--color-success-light)' : 'var(--color-surface)',
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
              border: settings.calculationMode === 'manual' ? '2px solid var(--color-success)' : '2px solid var(--color-border)',
              background: settings.calculationMode === 'manual' ? 'var(--color-success-light)' : 'var(--color-surface)',
              fontWeight: settings.calculationMode === 'manual' ? '600' : 'normal',
              cursor: isAdmin ? 'pointer' : 'not-allowed',
              opacity: isAdmin ? 1 : 0.7
            }}
          >
            Manual Only
          </button>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
          {settings.calculationMode === 'auto'
            ? 'Handicaps auto-calculate after each round (falls back to manual if not enough rounds)'
            : 'Only manually entered handicaps will be used'}
        </p>
      </div>

      {/* GHIN Override Toggle */}
      {settings.calculationMode === 'auto' && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.allowGhinOverride || false}
              onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, allowGhinOverride: e.target.checked })}
              disabled={!isAdmin}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontWeight: '600' }}>Allow GHIN Index Override</span>
          </label>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '6px', marginLeft: '28px' }}>
            When enabled, players with an official GHIN index will use that instead of the app-calculated handicap (True scope only).
          </p>
        </div>
      )}

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
                border: settings.updateMode === 'immediate' ? '2px solid var(--color-success)' : '2px solid var(--color-border)',
                background: settings.updateMode === 'immediate' ? 'var(--color-success-light)' : 'var(--color-surface)',
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
                border: settings.updateMode === 'monthly' ? '2px solid var(--color-success)' : '2px solid var(--color-border)',
                background: settings.updateMode === 'monthly' ? 'var(--color-success-light)' : 'var(--color-surface)',
                fontWeight: settings.updateMode === 'monthly' ? '600' : 'normal',
                cursor: isAdmin ? 'pointer' : 'not-allowed',
                opacity: isAdmin ? 1 : 0.7
              }}
            >
              Monthly Lock
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
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
                <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '5px' }}>
                  Last updated: {new Date(settings.lastUpdateDate).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Max Hole Score for Handicap */}
      {settings.calculationMode === 'auto' && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Max Hole Score (for Handicap)
          </label>
          {settings.handicapScope === 'true' ? (
            <div style={{
              padding: '12px',
              background: 'var(--color-surface-sunken)',
              borderRadius: '6px',
              fontSize: '13px',
              color: 'var(--color-text-secondary)'
            }}>
              True handicap always uses <strong>Net Double Bogey (WHS)</strong>: max score per hole = par + 2 + handicap strokes received on that hole.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => isAdmin && onUpdateHandicap({ ...settings, maxHoleScoreMode: 'net_double_bogey' })}
                  disabled={!isAdmin}
                  style={{
                    flex: 1,
                    minWidth: '90px',
                    padding: '10px 8px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    border: (settings.maxHoleScoreMode || 'net_double_bogey') === 'net_double_bogey' ? '2px solid var(--color-success)' : '2px solid var(--color-border)',
                    background: (settings.maxHoleScoreMode || 'net_double_bogey') === 'net_double_bogey' ? 'var(--color-success-light)' : 'var(--color-surface)',
                    fontWeight: (settings.maxHoleScoreMode || 'net_double_bogey') === 'net_double_bogey' ? '600' : 'normal',
                    cursor: isAdmin ? 'pointer' : 'not-allowed',
                    opacity: isAdmin ? 1 : 0.7
                  }}
                >
                  Net Dbl Bogey
                </button>
                <button
                  onClick={() => isAdmin && onUpdateHandicap({ ...settings, maxHoleScoreMode: 'fixed' })}
                  disabled={!isAdmin}
                  style={{
                    flex: 1,
                    minWidth: '90px',
                    padding: '10px 8px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    border: settings.maxHoleScoreMode === 'fixed' ? '2px solid var(--color-success)' : '2px solid var(--color-border)',
                    background: settings.maxHoleScoreMode === 'fixed' ? 'var(--color-success-light)' : 'var(--color-surface)',
                    fontWeight: settings.maxHoleScoreMode === 'fixed' ? '600' : 'normal',
                    cursor: isAdmin ? 'pointer' : 'not-allowed',
                    opacity: isAdmin ? 1 : 0.7
                  }}
                >
                  Fixed Max
                </button>
                <button
                  onClick={() => isAdmin && onUpdateHandicap({ ...settings, maxHoleScoreMode: 'none' })}
                  disabled={!isAdmin}
                  style={{
                    flex: 1,
                    minWidth: '90px',
                    padding: '10px 8px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    border: settings.maxHoleScoreMode === 'none' ? '2px solid var(--color-success)' : '2px solid var(--color-border)',
                    background: settings.maxHoleScoreMode === 'none' ? 'var(--color-success-light)' : 'var(--color-surface)',
                    fontWeight: settings.maxHoleScoreMode === 'none' ? '600' : 'normal',
                    cursor: isAdmin ? 'pointer' : 'not-allowed',
                    opacity: isAdmin ? 1 : 0.7
                  }}
                >
                  No Max
                </button>
              </div>
              {settings.maxHoleScoreMode === 'fixed' && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                    Max Score Per Hole
                  </label>
                  <input
                    type="number"
                    value={settings.maxHoleScoreFixed ?? 10}
                    onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, maxHoleScoreFixed: parseInt(e.target.value) || 10 })}
                    disabled={!isAdmin}
                    min="5"
                    max="15"
                    style={{ width: '120px', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  />
                </div>
              )}
              <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
                {(settings.maxHoleScoreMode || 'net_double_bogey') === 'net_double_bogey'
                  ? 'WHS standard: max score per hole = par + 2 + handicap strokes received.'
                  : settings.maxHoleScoreMode === 'fixed'
                    ? `Hole scores above ${settings.maxHoleScoreFixed ?? 10} are capped for handicap calculation. Actual scores are preserved.`
                    : 'No cap on individual hole scores for handicap calculation.'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Freeze Period Settings */}
      {settings.calculationMode === 'auto' && (
        <div style={{ marginBottom: '20px', padding: '15px', background: settings.freezeEnabled ? 'var(--color-skins-light)' : 'var(--color-surface-sunken)', borderRadius: '8px' }}>
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
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
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
                      style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
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
                      style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
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
                      style={{ flex: 2, padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
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
                      style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                </div>
              </div>
              {/* Freeze Mode Toggle */}
              <div style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                  Freeze Behavior
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => isAdmin && onUpdateHandicap({ ...settings, freezeMode: 'exclude' })}
                    disabled={!isAdmin}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '6px',
                      border: (settings.freezeMode || 'exclude') === 'exclude' ? '2px solid var(--color-skins-dark)' : '2px solid var(--color-border)',
                      background: (settings.freezeMode || 'exclude') === 'exclude' ? 'var(--color-skins-light)' : 'var(--color-surface)',
                      fontWeight: (settings.freezeMode || 'exclude') === 'exclude' ? '600' : 'normal',
                      cursor: isAdmin ? 'pointer' : 'not-allowed',
                      fontSize: '13px'
                    }}
                  >
                    Exclude Rounds
                  </button>
                  <button
                    onClick={() => isAdmin && onUpdateHandicap({ ...settings, freezeMode: 'batch' })}
                    disabled={!isAdmin}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '6px',
                      border: settings.freezeMode === 'batch' ? '2px solid var(--color-skins-dark)' : '2px solid var(--color-border)',
                      background: settings.freezeMode === 'batch' ? 'var(--color-skins-light)' : 'var(--color-surface)',
                      fontWeight: settings.freezeMode === 'batch' ? '600' : 'normal',
                      cursor: isAdmin ? 'pointer' : 'not-allowed',
                      fontSize: '13px'
                    }}
                  >
                    Batch Update
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '6px' }}>
                  {(settings.freezeMode || 'exclude') === 'exclude'
                    ? "Rounds during the freeze period don't count toward handicap."
                    : 'Rounds during freeze count toward handicap, but recalculation is deferred until freeze ends.'}
                </p>
                {settings.freezeMode === 'batch' && (
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500' }}>
                      Grace Period (rounds after freeze before recalculation)
                    </label>
                    <input
                      type="number"
                      value={settings.freezeGracePeriod ?? 0}
                      onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, freezeGracePeriod: parseInt(e.target.value) || 0 })}
                      disabled={!isAdmin}
                      min="0"
                      max="10"
                      style={{ width: '80px', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                )}
              </div>
              {todayInFreeze && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px',
                  background: 'var(--color-danger-light)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: 'var(--color-danger-dark)'
                }}>
                  {(settings.freezeMode || 'exclude') === 'exclude'
                    ? 'Currently in freeze period - rounds played now will not affect handicaps'
                    : 'Currently in freeze period - rounds are recorded but handicap recalculation is deferred'}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Soft/Hard Caps (Sandbagger Protection) */}
      {settings.calculationMode === 'auto' && (
        <div style={{ marginBottom: '20px', padding: '15px', background: settings.capsEnabled ? 'var(--color-info-light)' : 'var(--color-surface-sunken)', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.capsEnabled || false}
              onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, capsEnabled: e.target.checked })}
              disabled={!isAdmin}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontWeight: '600' }}>Enable Soft/Hard Caps (Sandbagger Protection)</span>
          </label>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
            Limits how much a player's handicap can rise above their lowest recorded index (rolling 12 months).
            Protects against sandbagging while allowing gradual handicap increases.
          </p>

          {settings.capsEnabled && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                    Soft Cap Threshold
                  </label>
                  <input
                    type="number"
                    value={settings.softCapThreshold ?? 3.0}
                    onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, softCapThreshold: parseFloat(e.target.value) || 3.0 })}
                    disabled={!isAdmin}
                    min="0.5"
                    max="10"
                    step="0.5"
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    Soft cap triggers when handicap exceeds low index + this value
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                    Soft Cap Reduction
                  </label>
                  <select
                    value={settings.softCapReduction ?? 0.5}
                    onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, softCapReduction: parseFloat(e.target.value) })}
                    disabled={!isAdmin}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  >
                    <option value={0.25}>25% of excess</option>
                    <option value={0.5}>50% of excess</option>
                    <option value={0.75}>75% of excess</option>
                  </select>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    How much of the increase above the soft cap is kept
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                    Hard Cap Threshold
                  </label>
                  <input
                    type="number"
                    value={settings.hardCapThreshold ?? 5.0}
                    onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, hardCapThreshold: parseFloat(e.target.value) || 5.0 })}
                    disabled={!isAdmin}
                    min="1"
                    max="15"
                    step="0.5"
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    Maximum allowed increase above low index (absolute ceiling)
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                    Min Rounds Before Caps Apply
                  </label>
                  <input
                    type="number"
                    value={settings.capMinRounds ?? 10}
                    onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, capMinRounds: parseInt(e.target.value) || 10 })}
                    disabled={!isAdmin}
                    min="1"
                    max="20"
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    Players with fewer rounds are exempt from caps
                  </p>
                </div>
              </div>
              <div style={{
                padding: '10px',
                background: 'var(--color-surface-sunken)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--color-text-secondary)'
              }}>
                <strong>How it works:</strong> Each player's lowest handicap index over the past 12 months (their "Low Index") is tracked.
                If their current handicap rises more than {settings.softCapThreshold ?? 3.0} above their Low Index,
                the increase is reduced to {((settings.softCapReduction ?? 0.5) * 100)}%.
                Their handicap can never exceed their Low Index + {settings.hardCapThreshold ?? 5.0} (hard cap).
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9-Hole Round Support */}
      {settings.calculationMode === 'auto' && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.allow9HoleRounds || false}
              onChange={(e) => isAdmin && onUpdateHandicap({ ...settings, allow9HoleRounds: e.target.checked })}
              disabled={!isAdmin}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontWeight: '600' }}>Enable 9-Hole Round Handicap</span>
          </label>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '6px', marginLeft: '28px' }}>
            Pairs of 9-hole rounds are combined into 18-hole equivalents for handicap calculation.
          </p>
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
              border: '1px solid var(--color-border)'
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
              border: '1px solid var(--color-border)'
            }}
          />
        </div>
      </div>

      {/* Course Tees Section */}
      <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '20px' }}>
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
                background: 'var(--color-surface-sunken)',
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
          <div style={{ background: 'var(--color-surface-sunken)', padding: '15px', borderRadius: '8px' }}>
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
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
                <input
                  type="number"
                  value={tee.courseRating}
                  onChange={(e) => handleUpdateTee(key, 'courseRating', e.target.value)}
                  placeholder="Rating"
                  step="0.1"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
                <input
                  type="number"
                  value={tee.slopeRating}
                  onChange={(e) => handleUpdateTee(key, 'slopeRating', e.target.value)}
                  placeholder="Slope"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
                <button
                  onClick={() => handleDeleteTee(key)}
                  style={{
                    background: 'var(--color-danger)',
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
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '15px', marginTop: '15px' }}>
              <h6 style={{ marginBottom: '10px' }}>Add New Tee</h6>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={newTeeKey}
                  onChange={(e) => setNewTeeKey(e.target.value)}
                  placeholder="Key (e.g. white)"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
                <input
                  type="text"
                  value={newTeeName}
                  onChange={(e) => setNewTeeName(e.target.value)}
                  placeholder="Display Name"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
                <input
                  type="number"
                  value={newTeeRating}
                  onChange={(e) => setNewTeeRating(e.target.value)}
                  placeholder="Rating"
                  step="0.1"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                />
                <input
                  type="number"
                  value={newTeeSlope}
                  onChange={(e) => setNewTeeSlope(e.target.value)}
                  placeholder="Slope"
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
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

function CrossLeagueSourcesSection({ handicapSettings, onUpdateHandicap, isAdmin, leagueId, onRefresh }) {
  const settings = { ...DEFAULT_HANDICAP_SETTINGS, ...handicapSettings }
  const sources = settings.crossLeagueSources || { mode: 'all', includedSourceIds: [], includeIndividualRounds: true, includeCasualRounds: true }
  const [leagues, setLeagues] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { profile } = useAuth()

  // Fetch user's leagues on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!profile?.id) return
    setLoading(true)
    import('../lib/leagueService').then(({ getLeaguesForProfile }) => {
      getLeaguesForProfile(profile.id).then(memberships => {
        const otherLeagues = (memberships || [])
          .filter(m => m.league_id !== leagueId && !m.leagues?.deleted_at && m.leagues?.type !== 'casual')
          .map(m => ({
            id: m.league_id,
            name: m.leagues?.name || m.league_id,
            type: m.leagues?.type || 'league'
          }))
        setLeagues(otherLeagues)
        setLoading(false)
      }).catch(() => setLoading(false))
    })
  }, [])

  const updateSources = (key, value) => {
    const updated = { ...sources, [key]: value }
    onUpdateHandicap({ ...handicapSettings, crossLeagueSources: updated })
  }

  const toggleLeague = (lid) => {
    const current = sources.includedSourceIds || []
    const updated = current.includes(lid) ? current.filter(id => id !== lid) : [...current, lid]
    updateSources('includedSourceIds', updated)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } catch {}
    setRefreshing(false)
  }

  if (!isAdmin) return null

  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <div className="card-header">
        <h3 className="card-title">Cross-League Handicap Sources</h3>
      </div>
      <div className="card-body">
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
          Choose which leagues' rounds to include when calculating handicaps. Current league is always included.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {[
            { value: 'all', label: 'All Rounds', desc: 'Include rounds from all leagues and sources (default)' },
            { value: 'selected', label: 'Selected Sources Only', desc: 'Only include rounds from leagues you choose below' }
          ].map(opt => (
            <label key={opt.value} style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px',
              border: `2px solid ${sources.mode === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: '8px', cursor: 'pointer',
              background: sources.mode === opt.value ? 'var(--color-primary-light, rgba(76,175,80,0.08))' : 'transparent'
            }}>
              <input type="radio" name="crossLeagueMode" value={opt.value} checked={sources.mode === opt.value}
                onChange={() => updateSources('mode', opt.value)} style={{ marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        {sources.mode === 'selected' && (
          <>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>Included Leagues</div>

              <div style={{
                padding: '8px 12px', background: 'var(--color-bg-secondary, #f5f5f5)',
                borderRadius: '6px', marginBottom: '8px', fontSize: '0.85rem'
              }}>
                <span style={{ fontWeight: 600 }}>{leagueId}</span>
                <span style={{ color: 'var(--color-text-secondary)', marginLeft: '8px' }}>(current league — always included)</span>
              </div>

              {loading ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading leagues...</div>
              ) : leagues.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                  No other leagues found. Join additional leagues to see them here.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {leagues.map(league => (
                    <label key={league.id} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                      border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer'
                    }}>
                      <input type="checkbox"
                        checked={(sources.includedSourceIds || []).includes(league.id)}
                        onChange={() => toggleLeague(league.id)} />
                      <span>{league.name}</span>
                      {league.type === 'individual' && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>Individual</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={sources.includeIndividualRounds !== false}
                  onChange={(e) => updateSources('includeIndividualRounds', e.target.checked)} />
                Include individual (non-league) rounds
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={sources.includeCasualRounds !== false}
                  onChange={(e) => updateSources('includeCasualRounds', e.target.checked)} />
                Include casual game rounds
              </label>
            </div>

            <button className="btn btn-primary btn-small" onClick={handleRefresh} disabled={refreshing}
              style={{ width: '100%' }}>
              {refreshing ? 'Recalculating...' : 'Recalculate Handicaps from Selected Sources'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const SCORE_TRIGGERS = [
  { key: 'ace', label: 'Hole-in-One' },
  { key: 'eagle', label: 'Eagle' },
  { key: 'birdie', label: 'Birdie' },
  { key: 'bogey', label: 'Bogey' },
  { key: 'double_bogey', label: 'Double Bogey' },
  { key: 'worse', label: 'Triple Bogey+' }
]

function CustomPlayerNotificationsSection({ players, leagueSettings, onUpdate }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [activeTrigger, setActiveTrigger] = useState('birdie')

  const custom = leagueSettings?.customPlayerNotifications || {}
  const configuredPlayerIds = Object.keys(custom).filter(id => {
    const triggers = custom[id]
    return triggers && Object.values(triggers).some(msgs => msgs && msgs.length > 0)
  })

  const addMessage = () => {
    if (!selectedPlayerId || !newMessage.trim()) return
    const updated = { ...custom }
    if (!updated[selectedPlayerId]) updated[selectedPlayerId] = {}
    if (!updated[selectedPlayerId][activeTrigger]) updated[selectedPlayerId][activeTrigger] = []
    updated[selectedPlayerId][activeTrigger] = [...updated[selectedPlayerId][activeTrigger], newMessage.trim()]
    onUpdate({ ...leagueSettings, customPlayerNotifications: updated })
    setNewMessage('')
  }

  const removeMessage = (playerId, trigger, index) => {
    const updated = { ...custom }
    updated[playerId][trigger] = updated[playerId][trigger].filter((_, i) => i !== index)
    if (updated[playerId][trigger].length === 0) delete updated[playerId][trigger]
    if (Object.keys(updated[playerId]).length === 0) delete updated[playerId]
    onUpdate({ ...leagueSettings, customPlayerNotifications: updated })
  }

  const getPlayerName = (id) => players.find(p => p.id === id)?.name || id

  return (
    <div style={{
      background: 'var(--color-surface-sunken)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '6px' }}>Custom Player Notifications</h3>
      <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '15px' }}>
        Set custom trash talk messages for when players score birdies, eagles, or aces.
        Use <strong>{'{player}'}</strong> and <strong>{'{hole}'}</strong> as placeholders.
      </p>

      {/* Configured players */}
      {configuredPlayerIds.map(pid => (
        <div key={pid} style={{
          background: 'var(--color-surface)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '10px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>
            {getPlayerName(pid)}
          </div>
          {SCORE_TRIGGERS.map(trigger => {
            const msgs = custom[pid]?.[trigger.key] || []
            if (msgs.length === 0) return null
            return (
              <div key={trigger.key} style={{ marginBottom: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '3px' }}>
                  {trigger.label}
                </div>
                {msgs.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '13px', padding: '3px 0'
                  }}>
                    <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>{msg}</span>
                    <button
                      onClick={() => removeMessage(pid, trigger.key, i)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--color-danger)',
                        cursor: 'pointer', fontSize: '16px', padding: '0 4px', lineHeight: 1
                      }}
                    >x</button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ))}

      {/* Add new message */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <select
          value={selectedPlayerId}
          onChange={e => setSelectedPlayerId(e.target.value)}
          style={{
            flex: 1, padding: '8px', borderRadius: '6px',
            border: '1px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text)', fontSize: '13px'
          }}
        >
          <option value="">Select player...</option>
          {players.filter(p => p.active !== false).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={activeTrigger}
          onChange={e => setActiveTrigger(e.target.value)}
          style={{
            padding: '8px', borderRadius: '6px',
            border: '1px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text)', fontSize: '13px'
          }}
        >
          {SCORE_TRIGGERS.map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="e.g. Even a blind squirrel finds a nut, {player}!"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addMessage()}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: '6px',
            border: '1px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text)', fontSize: '13px', boxSizing: 'border-box'
          }}
        />
        <button
          onClick={addMessage}
          disabled={!selectedPlayerId || !newMessage.trim()}
          style={{
            padding: '8px 14px', borderRadius: '6px', border: 'none',
            background: 'var(--color-primary)', color: 'white',
            fontWeight: '600', fontSize: '13px',
            cursor: !selectedPlayerId || !newMessage.trim() ? 'default' : 'pointer',
            opacity: !selectedPlayerId || !newMessage.trim() ? 0.5 : 1
          }}
        >Add</button>
      </div>
    </div>
  )
}

function QuietHoursSection({ leagueSettings, onUpdate }) {
  const start = leagueSettings?.quietHoursStart
  const end = leagueSettings?.quietHoursEnd
  const enabled = start != null && end != null

  const toggle = () => {
    if (enabled) {
      const { quietHoursStart, quietHoursEnd, ...rest } = leagueSettings
      onUpdate(rest)
    } else {
      onUpdate({ ...leagueSettings, quietHoursStart: 22, quietHoursEnd: 7 })
    }
  }

  const formatHour = (h) => {
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12} ${ampm}`
  }

  return (
    <div style={{
      background: 'var(--color-surface-sunken)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: enabled ? '12px' : '0' }}>
        <div>
          <h3 style={{ margin: 0 }}>Quiet Hours</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', margin: '4px 0 0' }}>
            Suppress auto notifications during these hours. Admin messages still go through.
          </p>
        </div>
        <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
          <input type="checkbox" checked={enabled} onChange={toggle}
            style={{ opacity: 0, width: 0, height: 0 }} />
          <span style={{
            position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: '24px',
            background: enabled ? 'var(--color-primary)' : 'var(--color-border)',
            transition: 'background 0.2s'
          }}>
            <span style={{
              position: 'absolute', height: '18px', width: '18px', left: enabled ? '23px' : '3px',
              bottom: '3px', background: 'white', borderRadius: '50%', transition: 'left 0.2s'
            }} />
          </span>
        </label>
      </div>

      {enabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={start}
            onChange={e => onUpdate({ ...leagueSettings, quietHoursStart: parseInt(e.target.value) })}
            style={{
              flex: 1, padding: '8px', borderRadius: '6px',
              border: '1px solid var(--color-border)', background: 'var(--color-surface)',
              color: 'var(--color-text)', fontSize: '13px'
            }}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{formatHour(i)}</option>
            ))}
          </select>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>to</span>
          <select
            value={end}
            onChange={e => onUpdate({ ...leagueSettings, quietHoursEnd: parseInt(e.target.value) })}
            style={{
              flex: 1, padding: '8px', borderRadius: '6px',
              border: '1px solid var(--color-border)', background: 'var(--color-surface)',
              color: 'var(--color-text)', fontSize: '13px'
            }}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{formatHour(i)}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

function SendNotificationSection({ leagueId, leagueName }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(null)

  const handleSend = async () => {
    if (!body.trim()) return
    setSending(true)
    setStatus(null)
    try {
      const { sendPushNotification } = await import('../lib/notificationService')
      const result = await sendPushNotification(leagueId,
        title.trim() || leagueName || 'Gunpowder Golf', body.trim(),
        { tag: 'custom-' + Date.now(), category: 'admin_messages' }
      )
      const data = result?.data
      setStatus(`Sent to ${data?.sent || 0} subscriber${data?.sent === 1 ? '' : 's'}`)
      setTitle('')
      setBody('')
      setTimeout(() => setStatus(null), 4000)
    } catch (err) {
      console.error('Failed to send notification:', err)
      setStatus('Failed to send')
    }
    setSending(false)
  }

  return (
    <div style={{
      background: 'var(--color-surface-sunken)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '10px' }}>Send Notification</h3>
      <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '12px' }}>
        Send a custom push notification to all subscribed league members.
      </p>
      <input
        type="text"
        placeholder="Title (optional)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: '6px',
          border: '1px solid var(--color-border)', background: 'var(--color-surface)',
          color: 'var(--color-text)', fontSize: '14px', marginBottom: '8px',
          boxSizing: 'border-box'
        }}
      />
      <textarea
        placeholder="Message"
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={2}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: '6px',
          border: '1px solid var(--color-border)', background: 'var(--color-surface)',
          color: 'var(--color-text)', fontSize: '14px', marginBottom: '10px',
          boxSizing: 'border-box', resize: 'vertical'
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          style={{
            padding: '8px 20px', borderRadius: '8px', border: 'none',
            background: 'var(--color-primary)', color: 'white',
            fontWeight: '600', fontSize: '13px',
            cursor: sending || !body.trim() ? 'default' : 'pointer',
            opacity: sending || !body.trim() ? 0.6 : 1
          }}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
        {status && (
          <span style={{ fontSize: '13px', color: status.includes('Failed') ? 'var(--color-danger)' : 'var(--color-primary)' }}>
            {status}
          </span>
        )}
      </div>
    </div>
  )
}

function NotificationSettingsSection({ profileId, leagueId }) {
  const [supported] = useState(() => {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  })
  const [permStatus, setPermStatus] = useState('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [preferences, setPreferences] = useState({})
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  useEffect(() => {
    if (!supported || !profileId || !leagueId) {
      setLoading(false)
      return
    }
    let cancelled = false
    const init = async () => {
      try {
        const { getPermissionStatus, isSubscribed, getPreferences } = await import('../lib/notificationService')
        if (cancelled) return
        setPermStatus(getPermissionStatus())
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(false), 5000))
        const sub = await Promise.race([isSubscribed(profileId, leagueId), timeoutPromise])
        if (!cancelled) {
          setSubscribed(!!sub)
          if (sub) {
            const prefs = await Promise.race([getPreferences(profileId, leagueId), new Promise(resolve => setTimeout(() => resolve({}), 5000))])
            if (!cancelled) { setPreferences(prefs || {}); setPrefsLoaded(true) }
          }
        }
      } catch (err) {
        console.warn('Notification check failed:', err)
      }
      if (!cancelled) setLoading(false)
    }
    init()
    return () => { cancelled = true }
  }, [supported, profileId, leagueId])

  const [error, setError] = useState(null)

  const handleToggle = async () => {
    setToggling(true)
    setError(null)
    try {
      if (subscribed) {
        const { unsubscribeFromPush } = await import('../lib/notificationService')
        await unsubscribeFromPush(profileId, leagueId)
        setSubscribed(false)
        setPreferences({})
        setPrefsLoaded(false)
      } else {
        const { subscribeToPush, getPermissionStatus } = await import('../lib/notificationService')
        const sub = await subscribeToPush(profileId, leagueId)
        setPermStatus(getPermissionStatus())
        if (sub) {
          setSubscribed(true)
          setPreferences({})
          setPrefsLoaded(true)
        } else if (getPermissionStatus() === 'granted') {
          setError('Failed to save subscription. Try again.')
        }
      }
    } catch (err) {
      console.error('Notification toggle failed:', err)
      setError('Something went wrong. Try again.')
    }
    setToggling(false)
  }

  const handlePrefToggle = async (category) => {
    const newPrefs = { ...preferences, [category]: preferences[category] === false ? true : false }
    // Remove keys that are true (default) to keep preferences clean
    if (newPrefs[category] === true) delete newPrefs[category]
    setPreferences(newPrefs)
    const { updatePreferences } = await import('../lib/notificationService')
    updatePreferences(profileId, leagueId, newPrefs)
  }

  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  )
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

  const categoryList = [
    { key: 'round_alerts', label: 'Round Alerts', desc: 'Round start, finish, check-in closing' },
    { key: 'score_alerts', label: 'Score Alerts', desc: 'Birdies, eagles, hole-in-ones' },
    { key: 'greenie_alerts', label: 'Greenie Alerts', desc: 'Greenie winners' },
    { key: 'admin_messages', label: 'Admin Messages', desc: 'Announcements, custom messages' }
  ]

  return (
    <div style={{
      background: 'var(--color-surface-sunken)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '10px' }}>Push Notifications</h3>

      {error && (
        <p style={{ color: 'var(--color-danger)', fontSize: '13px', marginBottom: '10px' }}>{error}</p>
      )}

      {!supported ? (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Push notifications are not supported in this browser.
        </p>
      ) : !profileId ? (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Sign in to enable push notifications.
        </p>
      ) : isIOS && !isStandalone ? (
        <div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '10px' }}>
            To receive notifications on iOS, you need to add this app to your Home Screen:
          </p>
          <ol style={{ color: 'var(--color-text-secondary)', fontSize: '13px', paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>Tap the <strong>Share</strong> button in Safari</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
            <li>Open the app from your Home Screen</li>
          </ol>
        </div>
      ) : permStatus === 'denied' ? (
        <p style={{ color: 'var(--color-danger)', fontSize: '14px' }}>
          Notifications are blocked. Please enable them in your browser/device settings for this site.
        </p>
      ) : loading ? (
        <p style={{ color: 'var(--color-text-tertiary)', fontSize: '14px' }}>Checking...</p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>
                {subscribed ? 'Notifications enabled' : 'Notifications disabled'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                {subscribed ? 'You\'ll be notified about round updates' : 'Enable to get round alerts and score updates'}
              </div>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: subscribed ? 'var(--color-danger)' : 'var(--color-primary)',
                color: 'white',
                fontWeight: '600',
                fontSize: '13px',
                cursor: toggling ? 'default' : 'pointer',
                opacity: toggling ? 0.7 : 1
              }}
            >
              {toggling ? '...' : subscribed ? 'Disable' : 'Enable'}
            </button>
          </div>

          {subscribed && prefsLoaded && (
            <div style={{ marginTop: '15px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: 'var(--color-text-secondary)' }}>
                Notification Preferences
              </div>
              {categoryList.map(cat => (
                <label
                  key={cat.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 0', cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={preferences[cat.key] !== false}
                    onChange={() => handlePrefToggle(cat.key)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                  />
                  <div>
                    <div style={{ fontSize: '14px' }}>{cat.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{cat.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AccountSection({ user, profile, onSignOut, onUnlinkProfile, onLeaveLeague, onSignIn }) {
  const [signingOut, setSigningOut] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false)

  if (!user) {
    return (
      <div style={{
        background: 'var(--color-surface-sunken)',
        padding: '20px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '20px',
        border: '1px solid var(--color-border)'
      }}>
        <h3 style={{ marginBottom: '10px' }}>Account</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '15px' }}>
          Not signed in. Sign in to link your player profile and access your leagues across devices.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          {onSignIn && (
            <button
              onClick={onSignIn}
              style={{
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Sign In
            </button>
          )}
          {onLeaveLeague && (
            <button
              onClick={() => {
                if (confirm('Leave this league? You can rejoin later with the league code.')) {
                  onLeaveLeague()
                }
              }}
              style={{
                background: 'var(--color-danger)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Leave League
            </button>
          )}
        </div>
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
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Account</h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: '600' }}>{profile?.display_name || 'No profile'}</div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{user.email}</div>
          {profile && (
            <div style={{ color: 'var(--color-text-tertiary)', fontSize: '12px', marginTop: '4px' }}>
              Profile ID: {profile.id.slice(0, 8)}...
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            background: 'var(--color-danger)',
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
        <div style={{ marginTop: '15px', borderTop: '1px solid var(--color-border-light)', paddingTop: '15px' }}>
          {!showUnlinkConfirm ? (
            <button
              onClick={() => setShowUnlinkConfirm(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-skins-dark)',
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
              background: 'var(--color-warning-light)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--color-warning)'
            }}>
              <p style={{ fontSize: '13px', marginBottom: '10px', color: 'var(--color-warning-dark)' }}>
                This will unlink <strong>{profile.display_name}</strong> from your account.
                You'll be taken back to the profile selection screen to choose or create a different one.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleUnlink}
                  disabled={unlinking}
                  style={{
                    background: 'var(--color-skins-dark)',
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
                    background: 'var(--color-border-light)',
                    color: 'var(--color-text-primary)',
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
      background: 'var(--color-warning-light)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-warning)'
    }}>
      <h3 style={{ marginBottom: '15px' }}>Data Migrations</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '15px' }}>
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
            ? <span style={{ color: 'var(--color-success)' }}>All migrations have been run.</span>
            : <span style={{ color: 'var(--color-skins-dark)' }}>{pendingCount} pending migration(s)</span>
          }
        </div>
      )}

      {logs.length > 0 && (
        <div style={{
          background: 'var(--color-text-primary)',
          color: 'var(--color-border)',
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
              {r.error && <span style={{ color: 'var(--color-danger)' }}> - {r.error}</span>}
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
  const [linkingId, setLinkingId] = useState(null)

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
        setAssigningId(null)
        setAssignEmail('')
      } else {
        alert('Could not update profile. Make sure you are logged in as a site owner.')
      }
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

  const handleMerge = async (ghostProfile, claimedProfile) => {
    if (!window.confirm(
      `Link "${ghostProfile.display_name}" to ${claimedProfile.display_name}'s account (${claimedProfile.email || 'no email'})?\n\n` +
      `This will transfer their login to this ghost profile and delete the duplicate "${claimedProfile.display_name}" profile.`
    )) return

    setSavingId(ghostProfile.id)
    try {
      const { mergeProfiles } = await import('../lib/profileService')
      await mergeProfiles(ghostProfile.id, claimedProfile.id)
      // Ghost becomes claimed — move it to claimed list
      setGhostProfiles(prev => prev.filter(p => p.id !== ghostProfile.id))
      setClaimedProfiles(prev => [
        ...prev.filter(p => p.id !== claimedProfile.id),
        { ...ghostProfile, user_id: claimedProfile.user_id, email: claimedProfile.email || ghostProfile.email, avatar_url: claimedProfile.avatar_url || ghostProfile.avatar_url }
      ].sort((a, b) => a.display_name.localeCompare(b.display_name)))
      setLinkingId(null)
    } catch (err) {
      console.error('Error merging profiles:', err)
      alert('Failed to merge profiles: ' + err.message)
    } finally {
      setSavingId(null)
    }
  }

  const tabStyle = (isActive) => ({
    padding: '8px 16px',
    border: 'none',
    borderBottom: isActive ? '3px solid var(--color-info)' : '3px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontWeight: isActive ? '600' : '400',
    color: isActive ? 'var(--color-info)' : 'var(--color-text-secondary)',
    fontSize: '14px'
  })

  return (
    <div style={{
      background: 'var(--color-info-light)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-info-light-border)'
    }}>
      <h3 style={{ marginBottom: '10px' }}>Manage Profiles</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '15px' }}>
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
          <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: '15px' }}>
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
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>No claimed profiles.</p>
            ) : (
              <div>
                {claimedProfiles.map(p => (
                  <div key={p.id} style={{
                    background: 'var(--color-surface)',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.display_name}</div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        {p.email || 'No email'} | ID: {p.id.slice(0, 8)}...
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnlink(p)}
                      disabled={unlinkingId === p.id}
                      style={{
                        background: 'var(--color-skins-dark)',
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
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>No ghost profiles.</p>
            ) : (
              <div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginBottom: '10px' }}>
                  Assign an email to a ghost profile so it auto-links when that user signs up or logs in.
                </p>
                {ghostProfiles.map(p => (
                  <div key={p.id} style={{
                    background: 'var(--color-surface)',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.display_name}</div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                          {p.email ? (
                            <span>
                              Pre-assigned: <strong>{p.email}</strong>
                              <button
                                onClick={() => handleClearEmail(p)}
                                disabled={savingId === p.id}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--color-danger)',
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
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {!p.email && assigningId !== p.id && linkingId !== p.id && (
                          <button
                            onClick={() => { setAssigningId(p.id); setLinkingId(null); setAssignEmail('') }}
                            style={{
                              background: 'var(--color-success)',
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
                        {linkingId !== p.id && assigningId !== p.id && claimedProfiles.length > 0 && (
                          <button
                            onClick={() => { setLinkingId(p.id); setAssigningId(null) }}
                            style={{
                              background: 'var(--color-info)',
                              color: 'white',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            Link to Account
                          </button>
                        )}
                      </div>
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
                            border: '1px solid var(--color-disabled)',
                            fontSize: '13px'
                          }}
                        />
                        <button
                          onClick={() => handleAssignEmail(p)}
                          disabled={savingId === p.id}
                          style={{
                            background: 'var(--color-success)',
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
                            background: 'var(--color-border-light)',
                            color: 'var(--color-text-primary)',
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
                    {linkingId === p.id && (
                      <div style={{ marginTop: '10px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                          Select the account to link this ghost profile to. The duplicate profile will be deleted.
                        </p>
                        <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                          {claimedProfiles.map(cp => (
                            <div
                              key={cp.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                background: 'var(--color-surface-sunken)',
                                marginBottom: '4px',
                                border: '1px solid var(--color-border)'
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: '600', fontSize: '13px' }}>{cp.display_name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{cp.email || 'No email'}</div>
                              </div>
                              <button
                                onClick={() => handleMerge(p, cp)}
                                disabled={savingId === p.id}
                                style={{
                                  background: 'var(--color-info)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '5px 12px',
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  opacity: savingId === p.id ? 0.6 : 1
                                }}
                              >
                                {savingId === p.id ? '...' : 'Link'}
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setLinkingId(null)}
                          style={{
                            marginTop: '8px',
                            background: 'var(--color-border-light)',
                            color: 'var(--color-text-primary)',
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
              color: 'var(--color-info)',
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
    setCourseMapping,
    pendingPlayerRequests,
    setPendingPlayerRequests,
    isLeagueOwner,
    userRole,
    refreshCrossLeagueHandicaps,
    auditLog,
    addAuditEntry,
    pendingOwnershipTransfer,
    setPendingOwnershipTransfer,
    leagueName
  } = useLeague()

  const [activeCategory, setActiveCategory] = useState(null)

  const categories = [
    { key: 'account', label: 'Account', subtitle: 'Sign in/out, admin login' },
    { key: 'gameSetup', label: 'Game Setup', subtitle: 'Announcements, round settings, notifications' },
    { key: 'league', label: 'League', subtitle: 'Info, invites, members, join settings' },
    { key: 'handicaps', label: 'Handicaps', subtitle: 'Scope, mode, tees, caps, freeze' },
    { key: 'payouts', label: 'Payouts & Pots', subtitle: 'Payout formats, hole-in-one pot' },
    ...(actualSiteOwner ? [{ key: 'adminTools', label: 'Admin Tools', subtitle: 'Profiles, migrations, course mapping' }] : [])
  ]

  const activeCategoryLabel = categories.find(c => c.key === activeCategory)?.label || ''

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'account':
        return (
          <>
            <AccountSection
              user={user}
              profile={profile}
              onSignOut={signOut}
              onUnlinkProfile={unlinkMyProfile}
              onLeaveLeague={() => {
                leaveLeague()
                onShowLeagueSelector()
              }}
              onSignIn={() => {
                leaveLeague()
                window.location.reload()
              }}
            />
            <NotificationSettingsSection profileId={profile?.id} leagueId={leagueId} />
            <AdminLoginSection isAdmin={isAdmin} onLogin={adminLogin} onLogout={adminLogout} />
          </>
        )
      case 'gameSetup':
        return (
          <>
            {isAdmin && (
              <NextRoundAnnouncementSection
                leagueSettings={leagueSettings}
                onUpdate={setLeagueSettings}
                isAdmin={isAdmin}
                leagueId={leagueId}
              />
            )}
            <RoundSettingsSection
              defaultStartingHole={defaultStartingHole}
              onUpdate={setDefaultStartingHole}
              isAdmin={isAdmin}
            />
            <TeamScoringRulesSection
              leagueSettings={leagueSettings}
              onUpdate={setLeagueSettings}
              isAdmin={isAdmin}
            />
            <SideGamesSettingsSection
              leagueSettings={leagueSettings}
              onUpdate={setLeagueSettings}
              isAdmin={isAdmin}
            />
            <ScoringPermissionsSection
              leagueSettings={leagueSettings}
              onUpdate={setLeagueSettings}
              isAdmin={isAdmin}
            />
            <CourseSection
              leagueSettings={leagueSettings}
              onUpdate={setLeagueSettings}
              isAdmin={isAdmin}
            />
            <TripModeSection
              leagueSettings={leagueSettings}
              onUpdate={setLeagueSettings}
              isAdmin={isAdmin}
            />
            {isAdmin && <CustomPlayerNotificationsSection players={players} leagueSettings={leagueSettings} onUpdate={setLeagueSettings} />}
            {isAdmin && <QuietHoursSection leagueSettings={leagueSettings} onUpdate={setLeagueSettings} />}
            {isAdmin && <SendNotificationSection leagueId={leagueId} leagueName={leagueName} />}
          </>
        )
      case 'league':
        return (
          <>
            <LeagueInfoSection
              leagueId={leagueId}
              onLeave={() => {
                if (profile?.id) {
                  removeLeagueMember(leagueId, profile.id).catch(err => {
                    console.warn('Could not remove league member row:', err)
                  })
                }
                leaveLeague()
              }}
              onDelete={async () => {
                try {
                  await softDeleteLeague(leagueId)
                  leaveLeague()
                } catch (err) {
                  console.error('Failed to delete league:', err)
                }
              }}
              onCloneToTest={cloneLeagueToTest}
              isAdmin={isAdmin}
              isLeagueOwner={isLeagueOwner}
              onSwitchLeague={onShowLeagueSelector}
              isAuthenticated={!!user}
            />
            {isAdmin && <InviteSection leagueId={leagueId} />}
            {isAdmin && (
              <PendingApprovalList
                leagueId={leagueId}
                pendingRequests={pendingPlayerRequests}
                onUpdate={setPendingPlayerRequests}
              />
            )}
            {isAdmin && profile?.id && (
              <MemberManagement
                leagueId={leagueId}
                currentProfileId={profile.id}
                isLeagueOwner={isLeagueOwner}
                rosterPlayers={players}
                pendingTransfer={pendingOwnershipTransfer}
                onTransferUpdate={setPendingOwnershipTransfer}
              />
            )}
            {isAdmin && <JoinSettingsSection leagueId={leagueId} />}
          </>
        )
      case 'handicaps':
        return (
          <>
            <HandicapSettingsSection
              handicapSettings={handicapSettings}
              onUpdateHandicap={setHandicapSettings}
              courseTees={courseTees}
              onUpdateTees={setCourseTees}
              isAdmin={isAdmin}
              players={players}
              leagueId={leagueId}
            />
            <CrossLeagueSourcesSection
              handicapSettings={handicapSettings}
              onUpdateHandicap={setHandicapSettings}
              isAdmin={isAdmin}
              leagueId={leagueId}
              onRefresh={refreshCrossLeagueHandicaps}
            />
          </>
        )
      case 'payouts':
        return (
          <>
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
            <GreenieCarryoverSection
              leagueSettings={leagueSettings}
              onUpdate={setLeagueSettings}
              isAdmin={isAdmin}
            />
          </>
        )
      case 'adminTools':
        return (
          <>
            <div style={{
              background: 'var(--color-surface)',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              border: '1px solid var(--color-border)'
            }}>
              <h3 style={{ marginBottom: '15px' }}>GPS Yardage</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '15px' }}>
                Show the GPS tab for all users. When disabled, the GPS page and navigation link are hidden.
              </p>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                padding: '12px',
                background: leagueSettings.gpsEnabled ? 'var(--color-success-light)' : 'var(--color-surface-sunken)',
                borderRadius: '8px',
                border: leagueSettings.gpsEnabled ? '2px solid var(--color-success)' : '2px solid var(--color-border)'
              }}>
                <input
                  type="checkbox"
                  checked={!!leagueSettings.gpsEnabled}
                  onChange={(e) => setLeagueSettings({ ...leagueSettings, gpsEnabled: e.target.checked })}
                  style={{ width: '20px', height: '20px' }}
                />
                <span style={{ fontWeight: '600', color: leagueSettings.gpsEnabled ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                  {leagueSettings.gpsEnabled ? 'GPS Enabled' : 'GPS Disabled'}
                </span>
              </label>
            </div>
            <AuditLogViewer auditLog={auditLog} />
            <ManageProfilesSection />
            <MigrationSection
              leagueId={leagueId}
              players={players}
              onPlayersUpdate={setPlayers}
            />
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
          </>
        )
      default:
        return null
    }
  }

  return (
    <div>
      {activeCategory ? (
        <>
          <button
            onClick={() => setActiveCategory(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--color-text-primary)',
              padding: '8px 0',
              marginBottom: '16px'
            }}
          >
            <span style={{ fontSize: '20px' }}>&larr;</span>
            {activeCategoryLabel}
          </button>
          {renderCategoryContent()}
        </>
      ) : (
        <>
          <h2 style={{ marginBottom: '20px' }}>Settings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  padding: '16px 20px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minHeight: '60px'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--color-text-primary)' }}>
                    {cat.label}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {cat.subtitle}
                  </div>
                </div>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: '20px', marginLeft: '12px' }}>&rsaquo;</span>
              </button>
            ))}
          </div>
          {!actualSiteOwner && (
            <div style={{ marginTop: '20px' }}>
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
          )}
        </>
      )}
    </div>
  )
}

export default SettingsPage
