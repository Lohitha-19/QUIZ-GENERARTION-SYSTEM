import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../utils/api'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data))
      navigate('/teacher/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page flex-center" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div className="card card-lg" style={{ width: '100%', maxWidth: '420px' }}>
        <div className="text-center mb-2">
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gradient-accent)', display: 'grid', placeItems: 'center', fontWeight: 'bold', margin: '0 auto 1rem', fontSize: '1.5rem' }}>Q</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Welcome Back</h2>
          <p>Login to manage your quizzes</p>
        </div>

        {error && <div className="alert alert-error mb-2">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="input" required value={email} onChange={e => setEmail(e.target.value)} placeholder="teacher@school.edu" />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Password</label>
              <Link to="/teacher/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--accent-2)', opacity: 0.85 }}>Forgot password?</Link>
            </div>
            <input type="password" className="input" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          
          <button type="submit" className="btn btn-primary w-full mt-2 btn-lg" disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Login'}
          </button>
        </form>

        <p className="text-center mt-3 text-muted">
          Don't have an account? <Link to="/teacher/register">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
