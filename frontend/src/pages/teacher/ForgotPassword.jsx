import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../utils/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setMessage(data.message)
      setStatus('success')
    } catch (err) {
      setMessage(err.response?.data?.message || 'Something went wrong. Please try again.')
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
        {/* Icon */}
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
            🔑
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Forgot Password?</h2>
          <p style={{ fontSize: '0.92rem' }}>
            Enter your email and we'll send you a link to reset your password.
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
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📬</div>
            <p style={{ color: 'var(--accent-3)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Check your inbox!
            </p>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              {message}
            </p>
            <Link
              to="/teacher/login"
              className="btn btn-primary"
              style={{ display: 'inline-block', marginTop: '1.5rem', padding: '0.6rem 1.5rem' }}
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            {status === 'error' && (
              <div className="alert alert-error mb-2">{message}</div>
            )}

            <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@school.edu"
                  disabled={status === 'loading'}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full mt-2 btn-lg"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? <span className="spinner" /> : 'Send Reset Link'}
              </button>
            </form>

            <p className="text-center mt-3 text-muted">
              Remember your password?{' '}
              <Link to="/teacher/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
