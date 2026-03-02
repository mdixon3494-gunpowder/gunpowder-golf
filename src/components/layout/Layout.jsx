import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useLeague } from '../../context/LeagueContext'
import { useAuth } from '../../context/AuthContext'
import { getLeaguesForProfile } from '../../lib/leagueService'

/* ================================
   INLINE SVG ICONS (no deps)
   ================================ */
const Icons = {
  play: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
  crosshair: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  arrowLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  ),
}

/* ================================
   SAVE INDICATOR (dot style)
   ================================ */
function SaveIndicator({ status }) {
  if (status === 'saving') {
    return <div className="save-dot saving" title="Saving..." />
  }
  if (status === 'error') {
    return <div className="save-dot error" title="Save failed" />
  }
  return null
}

/* ================================
   NEXT ROUND BANNER
   ================================ */
function NextRoundBanner({ leagueSettings }) {
  const nextRoundDate = leagueSettings?.nextRoundDate
  const nextRoundTime = leagueSettings?.nextRoundTime
  const nextRoundMessage = leagueSettings?.nextRoundMessage

  if (!nextRoundDate && !nextRoundTime && !nextRoundMessage) return null

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  }

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
    <div className="next-round-banner">
      {hasDateOrTime && (
        <div className="next-round-banner-title">
          Next Round: {formatDate(nextRoundDate)}
          {nextRoundTime && ` at ${formatTime(nextRoundTime)}`}
        </div>
      )}
      {nextRoundMessage && (
        <div className={hasDateOrTime ? 'next-round-banner-message' : 'next-round-banner-title'}>
          {nextRoundMessage}
        </div>
      )}
    </div>
  )
}

/* ================================
   LEAGUE SWITCHER
   ================================ */
function LeagueSwitcher({ leagueId, leagueSettings, onShowLeagueSelector, switchLeague, isAdmin }) {
  const { isAuthenticated, profile } = useAuth()
  const [leagues, setLeagues] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated || !profile?.id) return
    getLeaguesForProfile(profile.id).then(data => {
      setLeagues(data || [])
    }).catch(() => {})
  }, [isAuthenticated, profile?.id, leagueId])

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const visibleLeagues = leagues.filter(m => {
    if (!isAdmin && m.leagues?.is_test) return false
    if (m.leagues?.type === 'casual' || m.leagues?.type === 'individual') return false
    return true
  })
  const otherLeagues = visibleLeagues.filter(m => m.league_id !== leagueId)
  const currentMembership = leagues.find(m => m.league_id === leagueId)
  const currentLeagueName = currentMembership?.leagues?.name

  const displayName = currentLeagueName || leagueSettings?.leagueName || leagueId || 'League'

  const handleSwitch = async (newLeagueId) => {
    setSwitching(true)
    setIsOpen(false)
    await switchLeague(newLeagueId)
    setSwitching(false)
  }

  // Simple display — no dropdown needed
  if (!isAuthenticated || otherLeagues.length === 0) {
    return (
      <div className="header-left">
        <span className="league-switcher-name">{displayName}</span>
      </div>
    )
  }

  // Multi-league dropdown
  return (
    <div ref={dropdownRef} className="header-left" style={{ position: 'relative' }}>
      <button
        className="league-switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
      >
        <span className="league-switcher-name">
          {switching ? 'Switching...' : displayName}
        </span>
        {!switching && <span className="league-switcher-chevron">{Icons.chevronDown}</span>}
      </button>

      {isOpen && (
        <div className="league-switcher-dropdown">
          {otherLeagues.map((membership) => {
            const league = membership.leagues
            if (!league) return null

            const roleLabel = membership.role === 'owner' ? 'Owner'
              : membership.role === 'admin' ? 'Admin'
              : 'Player'
            const badgeClass = membership.role === 'owner' ? 'badge-primary'
              : membership.role === 'admin' ? 'badge-orange'
              : 'badge-blue'

            return (
              <button
                key={league.id}
                className="league-switcher-option"
                onClick={() => handleSwitch(league.id)}
              >
                <div className="league-switcher-option-name">
                  {league.name || league.id}
                </div>
                <div className="league-switcher-option-meta">
                  <span className={`badge ${badgeClass}`}>{roleLabel}</span>
                  <span className="text-xs text-tertiary">{league.id}</span>
                </div>
              </button>
            )
          })}
          <button
            className="league-switcher-all"
            onClick={() => { setIsOpen(false); onShowLeagueSelector() }}
          >
            All Leagues
          </button>
        </div>
      )}
    </div>
  )
}

/* ================================
   BOTTOM NAV (mobile)
   ================================ */
function BottomNav({ moreOpen, setMoreOpen, gpsEnabled }) {
  const location = useLocation()

  // Pages shown in the More sheet
  const morePages = [
    { to: '/players', label: 'Players', icon: Icons.users },
    { to: '/history', label: 'History', icon: Icons.clock },
    { to: '/scorecard', label: 'Scorecard', icon: Icons.grid },
    { to: '/settings', label: 'Settings', icon: Icons.settings },
  ]

  const isMoreActive = morePages.some(p => location.pathname.startsWith(p.to))

  return (
    <>
      <nav className="bottom-nav">
        <NavLink to="/live" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          {Icons.play}
          <span>Live</span>
        </NavLink>
        <NavLink to="/teams" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          {Icons.people}
          <span>Teams</span>
        </NavLink>
        <NavLink to="/generate" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          {Icons.clipboard}
          <span>Check-In</span>
        </NavLink>
        {gpsEnabled && (
          <NavLink to="/gps" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            {Icons.crosshair}
            <span>GPS</span>
          </NavLink>
        )}
        <button
          className={`bottom-nav-item ${isMoreActive || moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen(true)}
        >
          {Icons.more}
          <span>More</span>
        </button>
      </nav>

      {/* More bottom sheet */}
      {moreOpen && (
        <>
          <div className="bottom-sheet-overlay" onClick={() => setMoreOpen(false)} />
          <div className="bottom-sheet">
            <div className="bottom-sheet-handle" />
            <div className="bottom-sheet-grid">
              {morePages.map(page => (
                <NavLink
                  key={page.to}
                  to={page.to}
                  className={({ isActive }) => `bottom-sheet-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMoreOpen(false)}
                >
                  {page.icon}
                  {page.label}
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}

/* ================================
   DESKTOP TABS
   ================================ */
function DesktopTabs({ gpsEnabled }) {
  return (
    <nav className="tabs">
      <NavLink to="/players" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        Players
      </NavLink>
      <NavLink to="/generate" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        Check-In
      </NavLink>
      <NavLink to="/teams" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        Teams
      </NavLink>
      <NavLink to="/live" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        Live
      </NavLink>
      {gpsEnabled && (
        <NavLink to="/gps" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
          GPS
        </NavLink>
      )}
      <NavLink to="/history" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        History
      </NavLink>
      <NavLink to="/scorecard" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        Scorecard
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        Settings
      </NavLink>
    </nav>
  )
}

/* ================================
   INDIVIDUAL ROUND LAYOUT
   ================================ */
function IndividualRoundTabs({ gpsEnabled }) {
  return (
    <nav className="tabs">
      <NavLink to="/live" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        Scoring
      </NavLink>
      <NavLink to="/scorecard" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        Scorecard
      </NavLink>
      {gpsEnabled && (
        <NavLink to="/gps" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
          GPS
        </NavLink>
      )}
      <NavLink to="/history" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        History
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
        Settings
      </NavLink>
    </nav>
  )
}

function IndividualRoundBottomNav({ gpsEnabled }) {
  return (
    <nav className="bottom-nav">
      <NavLink to="/live" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        {Icons.play}
        <span>Scoring</span>
      </NavLink>
      <NavLink to="/scorecard" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        {Icons.grid}
        <span>Scorecard</span>
      </NavLink>
      {gpsEnabled && (
        <NavLink to="/gps" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          {Icons.crosshair}
          <span>GPS</span>
        </NavLink>
      )}
      <NavLink to="/history" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        {Icons.clock}
        <span>History</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        {Icons.settings}
        <span>Settings</span>
      </NavLink>
    </nav>
  )
}

/* ================================
   MAIN LAYOUT
   ================================ */
function Layout({ onShowLeagueSelector }) {
  const { leagueId, isAdmin, saveStatus, leagueSettings, switchLeague, isIndividualRound, leaveLeague } = useLeague()
  const [moreOpen, setMoreOpen] = useState(false)
  const gpsEnabled = !!leagueSettings?.gpsEnabled

  const handleExitRound = () => {
    leaveLeague()
    onShowLeagueSelector()
  }

  // ---- Individual Round layout ----
  if (isIndividualRound) {
    return (
      <div className="app-container">
        <header className="header">
          <div className="header-left">
            <button className="btn-ghost" onClick={handleExitRound} style={{ padding: '8px' }}>
              {Icons.arrowLeft}
            </button>
            <h1>Individual Round</h1>
          </div>
          <div className="header-right">
            <SaveIndicator status={saveStatus} />
          </div>
        </header>

        <IndividualRoundTabs gpsEnabled={gpsEnabled} />

        <main className="content">
          <Outlet />
        </main>

        <IndividualRoundBottomNav gpsEnabled={gpsEnabled} />
      </div>
    )
  }

  // ---- Main league layout ----
  return (
    <div className="app-container">
      <header className="header">
        <LeagueSwitcher
          leagueId={leagueId}
          leagueSettings={leagueSettings}
          onShowLeagueSelector={onShowLeagueSelector}
          switchLeague={switchLeague}
          isAdmin={isAdmin}
        />
        <div className="header-right">
          {isAdmin && <span className="badge badge-admin">Admin</span>}
          <SaveIndicator status={saveStatus} />
        </div>
      </header>

      <DesktopTabs gpsEnabled={gpsEnabled} />
      <NextRoundBanner leagueSettings={leagueSettings} />

      <main className="content">
        <Outlet />
      </main>

      <BottomNav moreOpen={moreOpen} setMoreOpen={setMoreOpen} gpsEnabled={gpsEnabled} />
    </div>
  )
}

export default Layout
