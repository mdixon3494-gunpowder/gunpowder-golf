/**
 * ManualMatchPlaySelector — lets admin manually declare front 9 / back 9 / overall
 * winners for 2-team match play rounds. Used in both LivePage and HistoryPage.
 */
function ManualMatchPlaySelector({ teams, manualResults, onChange, isAdmin }) {
  if (!isAdmin || !teams || teams.length !== 2) return null

  const results = manualResults || {}
  const team0Name = teams[0].name || 'Team 1'
  const team1Name = teams[1].name || 'Team 2'

  const segments = [
    { key: 'front9', label: 'Front 9' },
    { key: 'back9', label: 'Back 9' },
    { key: 'overall', label: 'Overall' }
  ]

  const handleSelect = (segment, value) => {
    const current = results[segment]
    // Tap same selection to deselect (revert to calculated)
    const newValue = current === value ? null : value
    const updated = { ...results, [segment]: newValue }
    // If all segments are null, clear the entire object
    const allNull = segments.every(s => updated[s.key] == null)
    onChange(allNull ? null : updated)
  }

  const handleClear = () => onChange(null)

  const hasOverrides = segments.some(s => results[s.key] != null)

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-md)',
      border: hasOverrides ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--color-text-primary)' }}>
            Match Play Results
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            {hasOverrides ? 'Manual overrides active' : 'Tap to manually declare winners'}
          </div>
        </div>
        {hasOverrides && (
          <button
            onClick={handleClear}
            style={{
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer'
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {segments.map(({ key, label }) => {
        const selected = results[key]
        return (
          <div key={key} style={{ marginBottom: key === 'overall' ? 0 : '8px' }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--color-text-secondary)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {label}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => handleSelect(key, 0)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: 'var(--radius-sm)',
                  border: selected === 0 ? '2px solid var(--color-success)' : '1px solid var(--color-border)',
                  background: selected === 0 ? 'var(--color-success-light)' : 'var(--color-surface-sunken)',
                  color: selected === 0 ? 'var(--color-success)' : 'var(--color-text-primary)',
                  fontWeight: selected === 0 ? '700' : '500',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {team0Name}
              </button>
              <button
                onClick={() => handleSelect(key, 'push')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: selected === 'push' ? '2px solid var(--color-info)' : '1px solid var(--color-border)',
                  background: selected === 'push' ? 'var(--color-info-light, rgba(33,150,243,0.1))' : 'var(--color-surface-sunken)',
                  color: selected === 'push' ? 'var(--color-info)' : 'var(--color-text-secondary)',
                  fontWeight: selected === 'push' ? '700' : '500',
                  fontSize: '13px',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                Push
              </button>
              <button
                onClick={() => handleSelect(key, 1)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: 'var(--radius-sm)',
                  border: selected === 1 ? '2px solid var(--color-success)' : '1px solid var(--color-border)',
                  background: selected === 1 ? 'var(--color-success-light)' : 'var(--color-surface-sunken)',
                  color: selected === 1 ? 'var(--color-success)' : 'var(--color-text-primary)',
                  fontWeight: selected === 1 ? '700' : '500',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {team1Name}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ManualMatchPlaySelector
