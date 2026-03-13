import { useState, useEffect, useMemo } from 'react'
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

const PAGE_SIZE = 10

function MemberManagement({ leagueId, currentProfileId, isLeagueOwner, rosterPlayers = [] }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null)
  const [showTransferConfirm, setShowTransferConfirm] = useState(null)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [filterTab, setFilterTab] = useState('all') // 'all', 'linked', 'unlinked'

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

  // Merge roster players with league_members data
  const mergedRoster = useMemo(() => {
    const memberByProfileId = new Map()
    members.forEach(m => memberByProfileId.set(m.profile_id, m))

    const activePlayers = rosterPlayers.filter(p => p.isActive !== false)

    return activePlayers.map(player => {
      const profileId = player.profileId || player.profile_id
      const member = profileId ? memberByProfileId.get(profileId) : null
      const isLinked = !!member

      return {
        // Roster data
        id: player.id,
        name: player.name,
        handicap: player.handicap,
        tee: player.tee,
        // Profile/member data
        profileId,
        member,
        isLinked,
        role: member?.role || null,
        avatar: member?.profiles?.avatar_url || null,
        email: member?.profiles?.email || null,
        isCurrentUser: profileId === currentProfileId
      }
    }).sort((a, b) => {
      // Linked first, then alphabetical
      if (a.isLinked !== b.isLinked) return a.isLinked ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [rosterPlayers, members, currentProfileId])

  const handleRoleChange = async (entry, newRole) => {
    if (!entry.member) return
    setActionLoading(entry.profileId)
    setError('')
    try {
      await updateMemberRole(leagueId, entry.profileId, newRole)
      setMembers(prev => prev.map(m =>
        m.profile_id === entry.profileId ? { ...m, role: newRole } : m
      ))
    } catch (err) {
      setError(`Failed to update role: ${err.message}`)
    }
    setActionLoading(null)
  }

  const handleRemove = async (entry) => {
    if (!entry.member) return
    setActionLoading(entry.profileId)
    setError('')
    try {
      await removeLeagueMember(leagueId, entry.profileId)
      setMembers(prev => prev.filter(m => m.profile_id !== entry.profileId))
      setShowRemoveConfirm(null)
    } catch (err) {
      setError(`Failed to remove member: ${err.message}`)
    }
    setActionLoading(null)
  }

  const handleTransferOwnership = async (entry) => {
    if (!entry.member) return
    setActionLoading(entry.profileId)
    setError('')
    try {
      await transferOwnership(leagueId, currentProfileId, entry.profileId)
      await loadMembers()
      setShowTransferConfirm(null)
    } catch (err) {
      setError(`Failed to transfer ownership: ${err.message}`)
    }
    setActionLoading(null)
  }

  const canChangeRole = (entry) => {
    if (!entry.isLinked) return false
    if (entry.isCurrentUser) return false
    if (entry.role === 'owner') return false
    return true
  }

  const getRoleOptions = (entry) => {
    const options = []
    if (entry.role !== 'player') options.push('player')
    if (entry.role !== 'admin') options.push('admin')
    if (isLeagueOwner && entry.role !== 'co_owner') options.push('co_owner')
    return options
  }

  const transferTargets = mergedRoster.filter(e =>
    e.isLinked &&
    e.profileId !== currentProfileId &&
    ['co_owner', 'admin'].includes(e.role)
  )

  const linkedCount = mergedRoster.filter(e => e.isLinked).length
  const unlinkedCount = mergedRoster.filter(e => !e.isLinked).length

  const filteredRoster = mergedRoster.filter(entry => {
    // Filter tab
    if (filterTab === 'linked' && !entry.isLinked) return false
    if (filterTab === 'unlinked' && entry.isLinked) return false
    // Search
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return entry.name.toLowerCase().includes(q) ||
      (entry.email || '').toLowerCase().includes(q)
  })

  const totalPages = Math.ceil(filteredRoster.length / PAGE_SIZE)
  const paginatedRoster = filteredRoster.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
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
        {mergedRoster.length} player{mergedRoster.length !== 1 ? 's' : ''} &middot; {linkedCount} linked &middot; {unlinkedCount} unlinked
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

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        {[
          { key: 'all', label: `All (${mergedRoster.length})` },
          { key: 'linked', label: `Linked (${linkedCount})` },
          { key: 'unlinked', label: `Unlinked (${unlinkedCount})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setFilterTab(tab.key); setCurrentPage(0) }}
            style={{
              padding: '5px 12px',
              borderRadius: '16px',
              border: '1px solid var(--color-border)',
              background: filterTab === tab.key ? 'var(--color-success)' : 'var(--color-surface-sunken)',
              color: filterTab === tab.key ? 'white' : 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search box */}
      <input
        type="text"
        placeholder="Search players..."
        value={searchQuery}
        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0) }}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface-sunken)',
          fontSize: '14px',
          marginBottom: '12px',
          boxSizing: 'border-box'
        }}
      />

      {/* Member grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '8px'
      }}>
        {paginatedRoster.map(entry => (
          <div key={entry.id} style={{
            padding: '10px',
            borderRadius: '8px',
            background: entry.isCurrentUser ? 'var(--color-success-light)'
              : entry.isLinked ? 'var(--color-surface-sunken)'
              : 'var(--color-surface-sunken)',
            opacity: entry.isLinked ? 1 : 0.7
          }}>
            {/* Top row: avatar + name + badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: entry.avatar ? 'none' : 'var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--color-text-secondary)',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {entry.avatar ? (
                  <img src={entry.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  entry.name.charAt(0).toUpperCase()
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: '600',
                  fontSize: '13px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {entry.name}
                  {entry.isCurrentUser && <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginLeft: '4px' }}>(you)</span>}
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {/* Linked/Unlinked badge */}
                  <span style={{
                    display: 'inline-block',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: '600',
                    background: entry.isLinked ? 'var(--color-success-light)' : 'var(--color-surface-sunken)',
                    color: entry.isLinked ? 'var(--color-success)' : 'var(--color-text-tertiary)',
                    border: `1px solid ${entry.isLinked ? 'var(--color-success)' : 'var(--color-border-light)'}`
                  }}>
                    {entry.isLinked ? 'Linked' : 'Unlinked'}
                  </span>
                  {/* Role badge for linked members */}
                  {entry.isLinked && entry.role && (
                    <span style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: '600',
                      background: 'var(--color-surface-sunken)',
                      color: ROLE_COLORS[entry.role],
                      border: '1px solid var(--color-border-light)'
                    }}>
                      {ROLE_LABELS[entry.role]}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom row: role dropdown + remove (linked members only) */}
            {canChangeRole(entry) && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  value={entry.role}
                  onChange={(e) => handleRoleChange(entry, e.target.value)}
                  disabled={actionLoading === entry.profileId}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '12px',
                    background: 'var(--color-surface)',
                    cursor: 'pointer'
                  }}
                >
                  <option value={entry.role}>{ROLE_LABELS[entry.role]}</option>
                  {getRoleOptions(entry).map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowRemoveConfirm(entry.profileId)}
                  disabled={actionLoading === entry.profileId}
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
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginTop: '12px'
        }}>
          <button
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={currentPage === 0}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              cursor: currentPage === 0 ? 'default' : 'pointer',
              fontSize: '13px',
              opacity: currentPage === 0 ? 0.4 : 1
            }}
          >
            Prev
          </button>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={currentPage >= totalPages - 1}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              cursor: currentPage >= totalPages - 1 ? 'default' : 'pointer',
              fontSize: '13px',
              opacity: currentPage >= totalPages - 1 ? 0.4 : 1
            }}
          >
            Next
          </button>
        </div>
      )}

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
                const entry = mergedRoster.find(e => e.profileId === showRemoveConfirm)
                if (entry) handleRemove(entry)
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
                  mergedRoster.find(e => e.profileId === showTransferConfirm)?.name || 'this member'
                }?
              </p>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                This action cannot be easily undone. You will become a co-owner.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    const entry = mergedRoster.find(e => e.profileId === showTransferConfirm)
                    if (entry) handleTransferOwnership(entry)
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
              {transferTargets.map(entry => (
                <button
                  key={entry.profileId}
                  onClick={() => setShowTransferConfirm(entry.profileId)}
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
                  {entry.name} ({ROLE_LABELS[entry.role]})
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
