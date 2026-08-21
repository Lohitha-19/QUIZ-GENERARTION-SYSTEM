import { Link, useNavigate } from 'react-router-dom'

export default function Header() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  return (
    <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <div className="container flex-between" style={{ height: '70px' }}>
        <Link to={token ? "/teacher/dashboard" : "/"} className="flex gap-1">
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gradient-accent)', display: 'grid', placeItems: 'center', fontWeight: 'bold' }}>Q</div>
          <h2 style={{ fontSize: '1.25rem' }}>QuizGen <span className="gradient-text">AI</span></h2>
        </Link>

        <nav className="flex gap-2">
          {token ? (
            <>
              <span className="text-muted">Hello, {user?.name}</span>
              <Link to="/teacher/create" className="btn btn-primary btn-sm">Create Quiz</Link>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">Logout</button>
            </>
          ) : (
            <>
              <Link to="/teacher/login" className="btn btn-secondary btn-sm">Teacher Login</Link>
              <Link to="/teacher/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
