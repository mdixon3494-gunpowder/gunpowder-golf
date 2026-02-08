import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LeagueProvider, useLeague } from './context/LeagueContext'

// Components
import Layout from './components/layout/Layout'
import LeagueSetup from './components/LeagueSetup'
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

function AppContent() {
  const { loading: authLoading, isAuthenticated, needsProfileClaim } = useAuth()
  const { loading: leagueLoading, isSetup } = useLeague()
  const [authScreen, setAuthScreen] = useState('login') // 'login' | 'signup'
  const [skippedAuth, setSkippedAuth] = useState(() => {
    // Allow skipping auth if user already has a league code saved
    return !!localStorage.getItem('leagueId')
  })

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

  // No league set up yet
  if (!isSetup) {
    return <LeagueSetup />
  }

  // Main app
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<PlayersPage />} />
        <Route path="players" element={<PlayersPage />} />
        <Route path="generate" element={<GeneratePage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="live" element={<LivePage />} />
        <Route path="gps" element={<GPSPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="scorecard" element={<ScorecardPage />} />
        <Route path="settings" element={<SettingsPage />} />
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
