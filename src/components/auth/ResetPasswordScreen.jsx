import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

function ResetPasswordScreen() {
  const { updatePassword, setNeedsPasswordUpdate } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')
    try {
      await updatePassword(password)
      setSuccess(true)
      setTimeout(() => {
        setNeedsPasswordUpdate(false)
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Gunpowder Big Boy's Golf</h1>
      </header>

      <div className="content">
        <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px' }}>Set New Password</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            Enter your new password below.
          </p>

          {success ? (
            <div className="alert alert-success">
              Password updated successfully! Redirecting...
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="input-group" style={{ marginBottom: '15px', textAlign: 'left' }}>
                <label>New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </div>

              <div className="input-group" style={{ marginBottom: '15px', textAlign: 'left' }}>
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                  placeholder="Re-enter password"
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
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordScreen
