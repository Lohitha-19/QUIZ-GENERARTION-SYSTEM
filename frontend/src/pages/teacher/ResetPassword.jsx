import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../utils/api'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) {
      setStatus('error')
      setMessage('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setStatus('error')
      setMessage('Password must be at least 6 characters')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, { password })
      setMessage(data.message)
      setStatus('success')
      setTimeout(() => navigate('/teacher/login'), 2500)
    } catch (err) {
      setMessage(err.response?.data?.message || 'Reset failed. The link may have expired.')
      setStatus('error')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--gradient-hero)',
        padding: '2rem',
      }}
    >
      <div className="card card-lg" style={{ width: '100%', maxWidth: '420px' }}>
        {/* Icon + heading */}
        <div className="text-center mb-2">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'var(--gradient-accent)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 1rem',
              fontSize: '1.6rem',
            }}
          >
            🔒
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Set New Password</h2>
          <p style={{ fontSize: '0.92rem' }}>
            Choose a strong password for your account.
          </p>
        </div>

        {status === 'success' ? (
          <div
            style={{
              textAlign: 'center',
              padding: '1.5rem',
              background: 'rgba(52, 211, 153, 0.08)',
              border: '1px solid rgba(52, 211, 153, 0.25)',
              borderRadius: 'var(--radius)',
              marginTop: '1rem',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
            <p style={{ color: 'var(--accent-3)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Password reset successfully!
            </p>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Redirecting you to login…
            </p>
          </div>
        ) : (
          <>
            {status === 'error' && (
              <div className="alert alert-error mb-2">{message}</div>
            )}

            <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    disabled={status === 'loading'}
                    style={{ paddingRight: '3rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: '1rem',
                      padding: 0,
                    }}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  disabled={status === 'loading'}
                />
              </div>

              {/* Password strength indicator */}
              {password.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 999,
                          background:
                            password.length >= level * 3
                              ? level <= 1
                                ? '#f87171'
                                : level === 2
                                ? '#fbbf24'
                                : level === 3
                                ? '#34d399'
                                : '#4f9ef8'
                              : 'var(--border)',
                          transition: 'background 0.3s ease',
                        }}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {password.length < 6
                      ? 'Too short'
                      : password.length < 9
                      ? 'Weak'
                      : password.length < 12
                      ? 'Good'
                      : 'Strong'}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full btn-lg"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? <span className="spinner" /> : 'Reset Password'}
              </button>
            </form>

            <p className="text-center mt-3 text-muted">
              Remembered it?{' '}
              <Link to="/teacher/login">Back to Login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
