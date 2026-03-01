import { useState, useEffect } from 'react'
import { getLeagueMetadata, updateLeagueMetadata } from '../lib/leagueService'

function JoinSettingsSection({ leagueId }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [visibility, setVisibility] = useState('private')
  const [approvalRequired, setApprovalRequired] = useState(false)

  useEffect(() => {
    if (!leagueId) return
    let cancelled = false
    getLeagueMetadata(leagueId).then(meta => {
      if (cancelled || !meta) return
      setVisibility(meta.visibility || 'private')
      setApprovalRequired(meta.join_approval_required || false)
      setLoading(false)
    }).catch(() => setLoading(false))
    return () => { cancelled = true }
  }, [leagueId])

  const handleUpdate = async (field, value) => {
    setSaving(true)
    try {
      const updates = {}
      if (field === 'visibility') {
        setVisibility(value)
        updates.visibility = value
      } else if (field === 'approval') {
        setApprovalRequired(value)
        updates.join_approval_required = value
      }
      await updateLeagueMetadata(leagueId, updates)
    } catch (err) {
      console.warn('Failed to update join settings:', err)
    }
    setSaving(false)
  }

  if (loading) return null

  return (
    <div style={{
      background: 'var(--color-surface)',
      padding: '20px',
      borderRadius: 'var(--radius-md)',
      marginBottom: '20px',
      border: '1px solid var(--color-border)'
    }}>
      <h3 style={{ marginBottom: '4px' }}>Join Settings</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginBottom: '15px' }}>
        Control how new members can join this league.
      </p>

      {/* Visibility */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
          League Visibility
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { value: 'private', label: 'Private', desc: 'Invite only' },
            { value: 'public', label: 'Public', desc: 'Discoverable' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => handleUpdate('visibility', opt.value)}
              disabled={saving}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: visibility === opt.value ? '2px solid var(--color-success)' : '2px solid var(--color-border)',
                background: visibility === opt.value ? 'var(--color-success-light)' : 'var(--color-surface)',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{opt.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Approval Required */}
      <label style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '14px',
        borderRadius: '8px',
        border: approvalRequired ? '2px solid var(--color-warning)' : '1px solid var(--color-border)',
        background: approvalRequired ? 'var(--color-warning-light)' : 'var(--color-surface)',
        cursor: 'pointer'
      }}>
        <input
          type="checkbox"
          checked={approvalRequired}
          onChange={(e) => handleUpdate('approval', e.target.checked)}
          disabled={saving}
          style={{ marginTop: '2px' }}
        />
        <div>
          <div style={{ fontWeight: '600', fontSize: '14px' }}>Require Admin Approval</div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '2px' }}>
            New members who join via code or link must be approved by an admin before they get access.
          </div>
        </div>
      </label>
    </div>
  )
}

export default JoinSettingsSection
