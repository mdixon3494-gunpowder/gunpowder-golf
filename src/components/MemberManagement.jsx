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
  owner: '#9b59b6',
  co_owner: '#2980b9',
  admin: '#27ae60',
  player: '#666'
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
        background: 'white',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px',
        border: '1px solid #e0e0e0'
      }}>
        <h3>Members</h3>
        <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Loading members...</div>
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
      <h3 style={{ marginBottom: '4px' }}>Members</h3>
      <p style={{ color: '#666', fontSize: '12px', marginBottom: '15px' }}>
        {members.length} member{members.length !== 1 ? 's' : ''}
      </p>

      {error && (
        <div style={{
          background: '#ffebee',
          color: '#c62828',
          padding: '10px',
          borderRadius: '8px',
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
            background: isCurrentUser ? '#f0f8f0' : '#f8f9fa',
            marginBottom: '8px'
          }}>
            {/* Avatar */}
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: avatar ? 'none' : '#ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600',
              color: '#666',
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
                {isCurrentUser && <span style={{ fontSize: '11px', color: '#999', marginLeft: '6px' }}>(you)</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '1px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: `${ROLE_COLORS[member.role]}15`,
                  color: ROLE_COLORS[member.role],
                  border: `1px solid ${ROLE_COLORS[member.role]}30`
                }}>
                  {ROLE_LABELS[member.role]}
                </span>
                {member.joined_at && (
                  <span style={{ fontSize: '11px', color: '#999' }}>
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
                    border: '1px solid #ddd',
                    fontSize: '12px',
                    background: 'white',
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
                    border: '1px solid #ffcdd2',
                    background: '#fff5f5',
                    color: '#c62828',
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
          background: '#fff3e0',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '12px',
          border: '1px solid #ffcc80'
        }}>
          <p style={{ fontWeight: '600', marginBottom: '10px', fontSize: '14px' }}>
            Remove this member?
          </p>
          <p style={{ color: '#666', fontSize: '13px', marginBottom: '12px' }}>
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
                background: '#e74c3c',
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
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: 'white',
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
          borderTop: '1px solid #e0e0e0'
        }}>
          <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#666' }}>Transfer Ownership</h4>
          <p style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
            Transfer league ownership to a co-owner or admin. You will become a co-owner.
          </p>

          {showTransferConfirm ? (
            <div style={{
              background: '#fce4ec',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #ef9a9a'
            }}>
              <p style={{ fontWeight: '600', marginBottom: '10px', fontSize: '14px' }}>
                Transfer ownership to {
                  (members.find(m => m.profile_id === showTransferConfirm)?.profiles?.display_name) || 'this member'
                }?
              </p>
              <p style={{ color: '#666', fontSize: '13px', marginBottom: '12px' }}>
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
                    background: '#9b59b6',
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
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    background: 'white',
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
                    border: '1px solid #ce93d8',
                    background: '#f3e5f5',
                    color: '#6a1b9a',
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
