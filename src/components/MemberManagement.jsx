import { useState, useEffect } from 'react'
import {
  getLeagueMembers,
  updateMemberRole,
  removeLeagueMember,
  transferOwnership
} from '../lib/leagueService'

const ROLE_LABELS = {
  owner: 'Owner',
  co_owner: 'Co-Owner',
  admin: 'Admin',
  player: 'Player'
}

const ROLE_COLORS = {
  owner: 'var(--color-accent-purple)',
  co_owner: 'var(--color-info)',
  admin: 'var(--color-success)',
  player: 'var(--color-text-secondary)'
}

function MemberManagement({ leagueId, currentProfileId, isLeagueOwner }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null)
  const [showTransferConfirm, setShowTransferConfirm] = useState(null)
  const [error, setError] = useState('')

  const loadMembers = async () => {
    setLoading(true)
    try {
      const data = await getLeagueMembers(leagueId)
      setMembers(data)
    } catch (err) {
      console.warn('Failed to load members:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (leagueId) loadMembers()
  }, [leagueId])

  const handleRoleChange = async (member, newRole) => {
    setActionLoading(member.profile_id)
    setError('')
    try {
      await updateMemberRole(leagueId, member.profile_id, newRole)
      setMembers(prev => prev.map(m =>
        m.profile_id === member.profile_id ? { ...m, role: newRole } : m
      ))
    } catch (err) {
      setError(`Failed to update role: ${err.message}`)
    }
    setActionLoading(null)
  }

  const handleRemove = async (member) => {
    setActionLoading(member.profile_id)
    setError('')
    try {
      await removeLeagueMember(leagueId, member.profile_id)
      setMembers(prev => prev.filter(m => m.profile_id !== member.profile_id))
      setShowRemoveConfirm(null)
    } catch (err) {
      setError(`Failed to remove member: ${err.message}`)
    }
    setActionLoading(null)
  }

  const handleTransferOwnership = async (targetMember) => {
    setActionLoading(targetMember.profile_id)
    setError('')
    try {
      await transferOwnership(leagueId, currentProfileId, targetMember.profile_id)
      // Refresh member list to reflect changes
      await loadMembers()
      setShowTransferConfirm(null)
    } catch (err) {
      setError(`Failed to transfer ownership: ${err.message}`)
    }
    setActionLoading(null)
  }

  const canChangeRole = (member) => {
    if (member.profile_id === currentProfileId) return false
    if (member.role === 'owner') return false
    return true
  }

  const getRoleOptions = (member) => {
    const options = []
    if (member.role !== 'player') options.push('player')
    if (member.role !== 'admin') options.push('admin')
    if (isLeagueOwner && member.role !== 'co_owner') options.push('co_owner')
    return options
  }

  const transferTargets = members.filter(m =>
    m.profile_id !== currentProfileId &&
    ['co_owner', 'admin'].includes(m.role)
  )

  if (loading) {
    return (
      <div style={{
        background: 'var(--color-surface)',
        padding: '20px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '20px',
        border: '1px solid var(--color-border)'
      }}>
        <h3>Members</h3>
        <div style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '20px' }}>Loading members...</div>
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
      <h3 style={{ marginBottom: '4px' }}>Members</h3>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginBottom: '15px' }}>
        {members.length} member{members.length !== 1 ? 's' : ''}
      </p>

      {error && (
        <div style={{
          background: 'var(--color-danger-light)',
          color: 'var(--color-danger-dark)',
          padding: '10px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '12px',
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}

      {members.map(member => {
        const profileData = member.profiles || {}
        const name = profileData.display_name || profileData.email || 'Unknown'
        const avatar = profileData.avatar_url
        const isCurrentUser = member.profile_id === currentProfileId

        return (
          <div key={member.profile_id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            borderRadius: '8px',
            background: isCurrentUser ? 'var(--color-success-light)' : 'var(--color-surface-sunken)',
            marginBottom: '8px'
          }}>
            {/* Avatar */}
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: avatar ? 'none' : 'var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--color-text-secondary)',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              {avatar ? (
                <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Name & Role */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: '600',
                fontSize: '14px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {name}
                {isCurrentUser && <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginLeft: '6px' }}>(you)</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '1px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: 'var(--color-surface-sunken)',
                  color: ROLE_COLORS[member.role],
                  border: `1px solid var(--color-border-light)`
                }}>
                  {ROLE_LABELS[member.role]}
                </span>
                {member.joined_at && (
                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            {canChangeRole(member) && (
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {/* Role dropdown */}
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member, e.target.value)}
                  disabled={actionLoading === member.profile_id}
                  style={{
                    padding: '4px 6px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '12px',
                    background: 'var(--color-surface)',
                    cursor: 'pointer'
                  }}
                >
                  <option value={member.role}>{ROLE_LABELS[member.role]}</option>
                  {getRoleOptions(member).map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>

                {/* Remove button */}
                <button
                  onClick={() => setShowRemoveConfirm(member.profile_id)}
                  disabled={actionLoading === member.profile_id}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-danger-border)',
                    background: 'var(--color-danger-light)',
                    color: 'var(--color-danger-dark)',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Remove Confirmation Modal */}
      {showRemoveConfirm && (
        <div style={{
          background: 'var(--color-skins-light)',
          padding: '15px',
          borderRadius: 'var(--radius-sm)',
          marginTop: '12px',
          border: '1px solid var(--color-skins)'
        }}>
          <p style={{ fontWeight: '600', marginBottom: '10px', fontSize: '14px' }}>
            Remove this member?
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
            They will lose access and need to rejoin the league.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                const member = members.find(m => m.profile_id === showRemoveConfirm)
                if (member) handleRemove(member)
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--color-danger)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              Remove
            </button>
            <button
              onClick={() => setShowRemoveConfirm(null)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Transfer Ownership - Owner only */}
      {isLeagueOwner && transferTargets.length > 0 && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid var(--color-border)'
        }}>
          <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Transfer Ownership</h4>
          <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '10px' }}>
            Transfer league ownership to a co-owner or admin. You will become a co-owner.
          </p>

          {showTransferConfirm ? (
            <div style={{
              background: 'var(--color-danger-light)',
              padding: '15px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-danger-border)'
            }}>
              <p style={{ fontWeight: '600', marginBottom: '10px', fontSize: '14px' }}>
                Transfer ownership to {
                  (members.find(m => m.profile_id === showTransferConfirm)?.profiles?.display_name) || 'this member'
                }?
              </p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                This action cannot be easily undone. You will become a co-owner.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    const member = members.find(m => m.profile_id === showTransferConfirm)
                    if (member) handleTransferOwnership(member)
                  }}
                  disabled={!!actionLoading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--color-accent-purple)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  {actionLoading ? 'Transferring...' : 'Confirm Transfer'}
                </button>
                <button
                  onClick={() => setShowTransferConfirm(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {transferTargets.map(member => (
                <button
                  key={member.profile_id}
                  onClick={() => setShowTransferConfirm(member.profile_id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-accent-purple)',
                    background: 'var(--color-surface-sunken)',
                    color: 'var(--color-accent-purple)',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {member.profiles?.display_name || 'Unknown'} ({ROLE_LABELS[member.role]})
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MemberManagement
