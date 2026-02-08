import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useLeague } from '../../context/LeagueContext'
import { useAuth } from '../../context/AuthContext'
import { getLeaguesForProfile } from '../../lib/leagueService'

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

function LeagueSwitcher({ leagueId, onShowLeagueSelector, switchLeague, isAdmin }) {
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

  // Close dropdown on outside click
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

  // Hide test leagues unless user is an admin
  const visibleLeagues = isAdmin
    ? leagues
    : leagues.filter(m => !m.leagues?.is_test)
  const otherLeagues = visibleLeagues.filter(m => m.league_id !== leagueId)
  const currentMembership = leagues.find(m => m.league_id === leagueId)
  const currentLeagueName = currentMembership?.leagues?.name

  const copyLeagueCode = () => {
    navigator.clipboard.writeText(leagueId)
    alert('League code copied to clipboard!')
  }

  // If not authenticated or has 1 or fewer leagues, show simple code display
  if (!isAuthenticated || otherLeagues.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
        {currentLeagueName && (
          <span style={{ fontSize: '14px', opacity: 0.9 }}>{currentLeagueName}</span>
        )}
        {!currentLeagueName && (
          <span style={{ fontSize: '14px', opacity: 0.9 }}>League Code:</span>
        )}
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
      </div>
    )
  }

  // Multi-league dropdown
  const handleSwitch = async (newLeagueId) => {
    setSwitching(true)
    setIsOpen(false)
    await switchLeague(newLeagueId)
    setSwitching(false)
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          padding: '6px 14px',
          borderRadius: '6px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        {switching ? (
          <span>Switching...</span>
        ) : (
          <>
            <span style={{ fontWeight: '600' }}>
              {currentLeagueName || leagueId}
            </span>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>{leagueId}</span>
            <span style={{ fontSize: '10px' }}>{isOpen ? '\u25B2' : '\u25BC'}</span>
          </>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '6px',
          background: 'white',
          borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: '220px',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {otherLeagues.map((membership) => {
            const league = membership.leagues
            if (!league) return null

            const roleColor = membership.role === 'owner'
              ? '#27ae60'
              : membership.role === 'admin'
                ? '#f39c12'
                : '#3498db'

            return (
              <button
                key={league.id}
                onClick={() => handleSwitch(league.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderBottom: '1px solid #f0f0f0'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
              >
                <div style={{ fontWeight: '600', color: '#333', fontSize: '14px' }}>
                  {league.name || league.id}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  <span style={{
                    background: roleColor,
                    color: 'white',
                    padding: '1px 6px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}>
                    {membership.role === 'owner' ? 'Owner' : membership.role === 'admin' ? 'Admin' : 'Player'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#999' }}>{league.id}</span>
                </div>
              </button>
            )
          })}

          <button
            onClick={() => {
              setIsOpen(false)
              onShowLeagueSelector()
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              textAlign: 'center',
              color: '#27ae60',
              fontWeight: '600',
              fontSize: '14px'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#f0fff4'}
            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
          >
            All Leagues
          </button>
        </div>
      )}
    </div>
  )
}

function Layout({ onShowLeagueSelector }) {
  const { leagueId, isAdmin, saveStatus, leagueSettings, switchLeague } = useLeague()

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
            <LeagueSwitcher
              leagueId={leagueId}
              onShowLeagueSelector={onShowLeagueSelector}
              switchLeague={switchLeague}
              isAdmin={isAdmin}
            />
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
          to="/gps"
          className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
        >
          GPS
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
