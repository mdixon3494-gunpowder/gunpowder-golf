import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LeagueProvider, useLeague } from './context/LeagueContext'

// Components
import Layout from './components/layout/Layout'
import LeagueSetup from './components/LeagueSetup'
import MyLeaguesScreen from './components/MyLeaguesScreen'
import CasualGameSetup from './components/CasualGameSetup'
import IndividualRoundSetup from './components/IndividualRoundSetup'
import ErrorBoundary from './components/common/ErrorBoundary'
import { ToastProvider } from './components/common/Toast'
import LoginScreen from './components/auth/LoginScreen'
import SignupScreen from './components/auth/SignupScreen'
import ClaimProfileScreen from './components/auth/ClaimProfileScreen'

// Pages
import PlayersPage from './pages/PlayersPage'
import GeneratePage from './pages/GeneratePage'
import TeamsPage from './pages/TeamsPage'
import LivePage from './pages/LivePage'
import HistoryPage from './pages/HistoryPage'
import ScorecardPage from './pages/ScorecardPage'
import SettingsPage from './pages/SettingsPage'
import GPSPage from './pages/GPSPage'
import RoundHistoryPage from './pages/RoundHistoryPage'

function AppContent() {
  const { loading: authLoading, isAuthenticated, needsProfileClaim, profile } = useAuth()
  const { loading: leagueLoading, isSetup, switchLeague, leagueId, syncSiteOwnerFromProfile } = useLeague()
  const [authScreen, setAuthScreen] = useState('login') // 'login' | 'signup'
  const [skippedAuth, setSkippedAuth] = useState(() => {
    // Allow skipping auth if user already has a league code saved
    return !!localStorage.getItem('leagueId')
  })
  const [showLeagueSelector, setShowLeagueSelector] = useState(false)
  const [showLeagueSetup, setShowLeagueSetup] = useState(false)
  const [showCasualSetup, setShowCasualSetup] = useState(false)
  const [showIndividualSetup, setShowIndividualSetup] = useState(false)
  const [showRoundHistory, setShowRoundHistory] = useState(false)
  const [leagueSetupMode, setLeagueSetupMode] = useState('create') // 'create' | 'join'

  // When a league is loaded/joined/created, clear setup screens and show main app
  useEffect(() => {
    if (leagueId && isSetup) {
      setShowLeagueSetup(false)
      setShowLeagueSelector(false)
      setShowCasualSetup(false)
      setShowIndividualSetup(false)
      setShowRoundHistory(false)
    }
  }, [leagueId])

  // Sync site owner flag from profile when profile loads
  useEffect(() => {
    if (profile) {
      syncSiteOwnerFromProfile(profile)
    }
  }, [profile])

  // Auth is still loading
  if (authLoading) {
    return (
      <div className="app-container">
        <div className="content" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>Loading...</div>
          <div style={{ color: '#666' }}>Initializing</div>
        </div>
      </div>
    )
  }

  // Not authenticated and hasn't skipped - show auth screens
  if (!isAuthenticated && !skippedAuth) {
    if (authScreen === 'signup') {
      return <SignupScreen onSwitchToLogin={() => setAuthScreen('login')} />
    }
    return (
      <LoginScreen
        onSwitchToSignup={() => setAuthScreen('signup')}
        onSkip={() => setSkippedAuth(true)}
      />
    )
  }

  // Authenticated but needs to claim/create profile
  if (isAuthenticated && needsProfileClaim) {
    return <ClaimProfileScreen />
  }

  // League data is loading
  if (leagueLoading) {
    return (
      <div className="app-container">
        <div className="content" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>Loading...</div>
          <div style={{ color: '#666' }}>Connecting to league data</div>
        </div>
      </div>
    )
  }

  // Authenticated user wants to set up a casual game
  if (showCasualSetup && isAuthenticated) {
    return (
      <CasualGameSetup
        onBack={() => {
          setShowCasualSetup(false)
          setShowLeagueSelector(true)
        }}
      />
    )
  }

  // Authenticated user wants to start an individual round
  if (showIndividualSetup && isAuthenticated) {
    return (
      <IndividualRoundSetup
        onBack={() => {
          setShowIndividualSetup(false)
          setShowLeagueSelector(true)
        }}
      />
    )
  }

  // Authenticated user wants to view round history
  if (showRoundHistory && isAuthenticated) {
    return (
      <RoundHistoryPage
        profile={profile}
        onBack={() => {
          setShowRoundHistory(false)
          setShowLeagueSelector(true)
        }}
      />
    )
  }

  // Authenticated user wants to see league selector
  if (showLeagueSelector && isAuthenticated) {
    return (
      <MyLeaguesScreen
        profile={profile}
        onSelectLeague={async (leagueId) => {
          await switchLeague(leagueId)
          setShowLeagueSelector(false)
          setShowLeagueSetup(false)
        }}
        onCreateNew={() => {
          setLeagueSetupMode('create')
          setShowLeagueSetup(true)
          setShowLeagueSelector(false)
        }}
        onJoinExisting={() => {
          setLeagueSetupMode('join')
          setShowLeagueSetup(true)
          setShowLeagueSelector(false)
        }}
        onStartCasualGame={() => {
          setShowCasualSetup(true)
          setShowLeagueSelector(false)
        }}
        onStartIndividualRound={() => {
          setShowIndividualSetup(true)
          setShowLeagueSelector(false)
        }}
        onViewRoundHistory={() => {
          setShowRoundHistory(true)
          setShowLeagueSelector(false)
        }}
      />
    )
  }

  // Show LeagueSetup (from MyLeaguesScreen or for unauthenticated users)
  if (showLeagueSetup && isAuthenticated) {
    return (
      <LeagueSetup
        initialMode={leagueSetupMode}
        onBack={() => {
          setShowLeagueSetup(false)
          setShowLeagueSelector(true)
        }}
      />
    )
  }

  // No league set up yet
  if (!isSetup) {
    // Authenticated users see MyLeaguesScreen
    if (isAuthenticated) {
      return (
        <MyLeaguesScreen
          profile={profile}
          onSelectLeague={async (leagueId) => {
            await switchLeague(leagueId)
          }}
          onCreateNew={() => {
            setLeagueSetupMode('create')
            setShowLeagueSetup(true)
          }}
          onJoinExisting={() => {
            setLeagueSetupMode('join')
            setShowLeagueSetup(true)
          }}
          onStartCasualGame={() => {
            setShowCasualSetup(true)
          }}
          onStartIndividualRound={() => {
            setShowIndividualSetup(true)
          }}
          onViewRoundHistory={() => {
            setShowRoundHistory(true)
          }}
        />
      )
    }
    // Unauthenticated users go straight to LeagueSetup
    return <LeagueSetup />
  }

  // Main app
  return (
    <Routes>
      <Route path="/" element={
        <Layout onShowLeagueSelector={() => setShowLeagueSelector(true)} />
      }>
        <Route index element={<PlayersPage />} />
        <Route path="players" element={<PlayersPage />} />
        <Route path="generate" element={<GeneratePage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="live" element={<LivePage />} />
        <Route path="gps" element={<GPSPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="scorecard" element={<ScorecardPage />} />
        <Route path="settings" element={
          <SettingsPage onShowLeagueSelector={() => setShowLeagueSelector(true)} />
        } />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <ToastProvider>
        <AuthProvider>
          <LeagueProvider>
            <AppContent />
          </LeagueProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
