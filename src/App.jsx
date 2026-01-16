import { Routes, Route } from 'react-router-dom'
import { LeagueProvider, useLeague } from './context/LeagueContext'

// Components
import Layout from './components/layout/Layout'
import LeagueSetup from './components/LeagueSetup'
import ErrorBoundary from './components/common/ErrorBoundary'
import { ToastProvider } from './components/common/Toast'

// Pages
import PlayersPage from './pages/PlayersPage'
import GeneratePage from './pages/GeneratePage'
import TeamsPage from './pages/TeamsPage'
import LivePage from './pages/LivePage'
import HistoryPage from './pages/HistoryPage'
import ScorecardPage from './pages/ScorecardPage'
import SettingsPage from './pages/SettingsPage'

function AppContent() {
  const { loading, isSetup } = useLeague()

  if (loading) {
    return (
      <div className="app-container">
        <div className="content" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>Loading...</div>
          <div style={{ color: '#666' }}>Connecting to league data</div>
        </div>
      </div>
    )
  }

  if (!isSetup) {
    return <LeagueSetup />
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<PlayersPage />} />
        <Route path="players" element={<PlayersPage />} />
        <Route path="generate" element={<GeneratePage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="live" element={<LivePage />} />
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
        <LeagueProvider>
          <AppContent />
        </LeagueProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
