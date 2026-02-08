import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

function SignupScreen({ onSwitchToLogin }) {
  const { signUp, signInWithGoogle } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')

    if (!displayName.trim()) {
      setError('Please enter your name')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const data = await signUp(email, password, displayName.trim())
      // If email confirmation is required
      if (data.user && !data.session) {
        setSuccess(true)
      }
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
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

  if (success) {
    return (
      <div className="app-container">
        <header className="header">
          <h1>Gunpowder Big Boy's Golf</h1>
        </header>
        <div className="content">
          <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
              color: 'white',
              padding: '30px',
              borderRadius: '15px',
              marginTop: '30px'
            }}>
              <h2 style={{ marginBottom: '15px' }}>Check Your Email</h2>
              <p style={{ opacity: 0.9 }}>
                We sent a confirmation link to <strong>{email}</strong>.
                Click the link to verify your account, then sign in.
              </p>
            </div>
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={onSwitchToLogin}
                className="btn btn-primary"
                style={{ padding: '14px 30px' }}
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Gunpowder Big Boy's Golf</h1>
      </header>

      <div className="content">
        <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '30px' }}>Create Account</h2>

          {/* Google Sign Up */}
          <button
            onClick={handleGoogleSignIn}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              border: '2px solid #e0e0e0',
              background: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '20px',
              color: '#333'
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
            <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
            <span style={{ color: '#999', fontSize: '14px' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
          </div>

          {/* Email/Password Sign Up */}
          <form onSubmit={handleSignup}>
            <div className="input-group" style={{ marginBottom: '15px', textAlign: 'left' }}>
              <label>Display Name *</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setError('') }}
                placeholder="Your name (shown to other players)"
                autoComplete="name"
              />
            </div>

            <div className="input-group" style={{ marginBottom: '15px', textAlign: 'left' }}>
              <label>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            <div className="input-group" style={{ marginBottom: '15px', textAlign: 'left' }}>
              <label>Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>

            <div className="input-group" style={{ marginBottom: '15px', textAlign: 'left' }}>
              <label>Confirm Password *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                placeholder="Confirm password"
                autoComplete="new-password"
              />
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
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: '20px', color: '#666', fontSize: '14px' }}>
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              style={{
                background: 'none',
                border: 'none',
                color: '#27ae60',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '14px',
                padding: 0
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignupScreen
