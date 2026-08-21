import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../utils/api'

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', { name, email, password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data))
      navigate('/teacher/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page flex-center" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div className="card card-lg" style={{ width: '100%', maxWidth: '420px' }}>
        <div className="text-center mb-2">
          <h2 style={{ marginBottom: '0.5rem' }}>Create Account</h2>
          <p>Join QuizGen AI as a Teacher</p>
        </div>

        {error && <div className="alert alert-error mb-2">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="input" required value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="input" required value={email} onChange={e => setEmail(e.target.value)} placeholder="teacher@school.edu" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="input" required value={password} onChange={e => setPassword(e.target.value)} minLength={6} placeholder="••••••••" />
          </div>
          
          <button type="submit" className="btn btn-primary w-full mt-2 btn-lg" disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Sign Up'}
          </button>
        </form>

        <p className="text-center mt-3 text-muted">
          Already have an account? <Link to="/teacher/login">Login</Link>
        </p>
      </div>
    </div>
  )
}
