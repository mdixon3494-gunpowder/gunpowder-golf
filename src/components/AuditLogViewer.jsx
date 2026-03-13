import { useState, useMemo } from 'react'
import { AUDIT_LABELS } from '../utils/auditLog'

function formatRelativeTime(timestamp) {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  const diffWeek = Math.floor(diffDay / 7)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  if (diffWeek < 4) return `${diffWeek}w ago`
  return then.toLocaleDateString()
}

function formatDetails(details) {
  if (!details || Object.keys(details).length === 0) return null
  return Object.entries(details)
    .map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
      const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1)
      return `${capitalizedLabel}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
    })
    .join(', ')
}

export default function AuditLogViewer({ auditLog = [] }) {
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [displayCount, setDisplayCount] = useState(50)

  const actionTypes = useMemo(() => {
    const types = new Set(auditLog.map(e => e.action))
    return Array.from(types).sort()
  }, [auditLog])

  const filtered = useMemo(() => {
    let entries = auditLog
    if (filterAction !== 'all') {
      entries = entries.filter(e => e.action === filterAction)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      entries = entries.filter(e =>
        (AUDIT_LABELS[e.action] || e.action).toLowerCase().includes(q) ||
        (e.performedBy || '').toLowerCase().includes(q) ||
        formatDetails(e.details)?.toLowerCase().includes(q)
      )
    }
    return entries
  }, [auditLog, filterAction, search])

  const visible = filtered.slice(0, displayCount)
  const hasMore = filtered.length > displayCount

  if (auditLog.length === 0) {
    return (
      <div style={{
        background: 'var(--color-surface)',
        padding: '20px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '20px',
        border: '1px solid var(--color-border)'
      }}>
        <h3 style={{ marginBottom: '10px' }}>Audit Log</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          No audit log entries yet. Admin actions will be recorded here.
        </p>
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
      <h3 style={{ marginBottom: '15px' }}>Audit Log</h3>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '15px',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={e => { setSearch(e.target.value); setDisplayCount(50) }}
          style={{
            flex: '1',
            minWidth: '150px',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-sunken)',
            color: 'var(--color-text)',
            fontSize: '14px'
          }}
        />
        <select
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setDisplayCount(50) }}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-sunken)',
            color: 'var(--color-text)',
            fontSize: '14px'
          }}
        >
          <option value="all">All Actions</option>
          {actionTypes.map(type => (
            <option key={type} value={type}>{AUDIT_LABELS[type] || type}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p style={{
        color: 'var(--color-text-secondary)',
        fontSize: '12px',
        marginBottom: '10px'
      }}>
        Showing {visible.length} of {filtered.length} entries
      </p>

      {/* Entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visible.map(entry => (
          <div
            key={entry.id}
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'var(--color-surface-sunken)',
              border: '1px solid var(--color-border)'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '4px'
            }}>
              <span style={{
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--color-text)',
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'var(--color-primary-light, rgba(59, 130, 246, 0.1))',
                border: '1px solid var(--color-primary, #3b82f6)',
                whiteSpace: 'nowrap'
              }}>
                {AUDIT_LABELS[entry.action] || entry.action}
              </span>
              <span style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>
                {formatRelativeTime(entry.timestamp)}
              </span>
            </div>
            <div style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              marginTop: '4px'
            }}>
              by <span style={{ fontWeight: '500', color: 'var(--color-text)' }}>{entry.performedBy}</span>
            </div>
            {formatDetails(entry.details) && (
              <div style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                marginTop: '6px',
                padding: '6px 8px',
                background: 'var(--color-surface)',
                borderRadius: '4px',
                wordBreak: 'break-word'
              }}>
                {formatDetails(entry.details)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <button
          onClick={() => setDisplayCount(prev => prev + 50)}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface-sunken)',
            color: 'var(--color-text)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Load More ({filtered.length - displayCount} remaining)
        </button>
      )}
    </div>
  )
}
