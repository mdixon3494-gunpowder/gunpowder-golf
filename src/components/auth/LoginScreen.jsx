import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

function LoginScreen({ onSwitchToSignup, onSkip }) {
  const { signInWithGoogle, signInWithEmail, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetStatus, setResetStatus] = useState(null)
  const [resetLoading, setResetLoading] = useState(false)

  const handleEmailSignIn = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Please enter email and password')
      return
    }

    setLoading(true)
    setError('')
    try {
      await signInWithEmail(email, password)
    } catch (err) {
      setError(err.message || 'Sign in failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) {
      setResetStatus({ type: 'error', message: 'Please enter your email address' })
      return
    }
    setResetLoading(true)
    setResetStatus(null)
    try {
      await resetPassword(resetEmail)
      setResetStatus({ type: 'success', message: 'Password reset email sent! Check your inbox.' })
    } catch (err) {
      setResetStatus({ type: 'error', message: err.message || 'Failed to send reset email' })
    } finally {
      setResetLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Google sign-in failed.')
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Gunpowder Big Boy's Golf</h1>
      </header>

      <div className="content">
        <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '30px' }}>Sign In</h2>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              border: '2px solid var(--color-border)',
              background: 'var(--color-surface)',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '20px',
              color: 'var(--color-text-primary)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '20px 0',
            gap: '15px'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            <span style={{ color: 'var(--color-text-tertiary)', fontSize: '14px' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          </div>

          {/* Email/Password Sign In */}
          <form onSubmit={handleEmailSignIn}>
            <div className="input-group" style={{ marginBottom: '15px', textAlign: 'left' }}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            <div className="input-group" style={{ marginBottom: '10px', textAlign: 'left' }}>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: '15px' }}>
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setResetEmail(email); setResetStatus(null) }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '13px',
                  padding: 0
                }}
              >
                Forgot Password?
              </button>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '15px', textAlign: 'left' }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '20px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Don't have an account?{' '}
            <button
              onClick={onSwitchToSignup}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-success)',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '14px',
                padding: 0
              }}
            >
              Sign Up
            </button>
          </div>

          {onSkip && (
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={onSkip}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '13px',
                  padding: 0
                }}
              >
                Continue with league code only
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setShowForgotPassword(false)}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '8px' }}>Reset Password</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
              Enter your email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleForgotPassword}>
              <div className="input-group" style={{ marginBottom: '15px', textAlign: 'left' }}>
                <label>Email</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => { setResetEmail(e.target.value); setResetStatus(null) }}
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>

              {resetStatus && (
                <div className={`alert alert-${resetStatus.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: '15px', textAlign: 'left' }}>
                  {resetStatus.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowForgotPassword(false)}
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resetLoading}
                  style={{ flex: 1, padding: '12px' }}
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginScreen
