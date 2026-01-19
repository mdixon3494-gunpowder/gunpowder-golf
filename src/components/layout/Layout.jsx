import { Outlet, NavLink } from 'react-router-dom'
import { useLeague } from '../../context/LeagueContext'

function SaveIndicator({ status }) {
  if (status === 'saving') {
    return (
      <div className="save-indicator">
        <div className="spinner-tiny" />
        <span>Saving...</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="save-indicator" style={{ color: '#e74c3c' }}>
        <span>Save failed</span>
      </div>
    )
  }

  return null
}

function NextRoundBanner({ leagueSettings }) {
  const nextRoundDate = leagueSettings?.nextRoundDate
  const nextRoundTime = leagueSettings?.nextRoundTime
  const nextRoundMessage = leagueSettings?.nextRoundMessage

  // Show banner if any field is set
  if (!nextRoundDate && !nextRoundTime && !nextRoundMessage) return null

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

  const hasDateOrTime = nextRoundDate || nextRoundTime

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
      color: 'white',
      padding: '12px 20px',
      textAlign: 'center'
    }}>
      {hasDateOrTime && (
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: nextRoundMessage ? '4px' : '0' }}>
          Next Round: {formatDate(nextRoundDate)}
          {nextRoundTime && ` at ${formatTime(nextRoundTime)}`}
        </div>
      )}
      {nextRoundMessage && (
        <div style={{ fontSize: hasDateOrTime ? '13px' : '16px', opacity: hasDateOrTime ? 0.9 : 1, fontWeight: hasDateOrTime ? 'normal' : 'bold' }}>
          {nextRoundMessage}
        </div>
      )}
    </div>
  )
}

function Layout() {
  const { leagueId, isAdmin, saveStatus, leagueSettings } = useLeague()

  const copyLeagueCode = () => {
    navigator.clipboard.writeText(leagueId)
    alert('League code copied to clipboard!')
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Gunpowder Big Boy's Golf</h1>
        {leagueId && (
          <div style={{
            marginTop: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '14px', opacity: 0.9 }}>League Code:</span>
            <button
              onClick={copyLeagueCode}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                padding: '5px 15px',
                borderRadius: '5px',
                color: 'white',
                fontWeight: 'bold',
                letterSpacing: '2px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              {leagueId}
            </button>
            {isAdmin && (
              <span style={{
                background: '#f39c12',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                ADMIN
              </span>
            )}
          </div>
        )}
        <SaveIndicator status={saveStatus} />
      </header>

      <nav className="tabs">
        <NavLink
          to="/players"
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          Players
        </NavLink>
        <NavLink
          to="/generate"
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          Check-In
        </NavLink>
        <NavLink
          to="/teams"
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          Teams
        </NavLink>
        <NavLink
          to="/live"
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          Live
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          History
        </NavLink>
        <NavLink
          to="/scorecard"
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          Scorecard
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          Settings
        </NavLink>
      </nav>

      <NextRoundBanner leagueSettings={leagueSettings} />

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
