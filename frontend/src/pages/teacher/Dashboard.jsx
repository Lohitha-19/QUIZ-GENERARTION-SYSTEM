import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import api from '../../utils/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchQuizzes = async () => {
    try {
      const { data } = await api.get('/quiz/my-quizzes')
      setQuizzes(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuizzes()
  }, [])

  const copyLink = (shareLink, e) => {
    e.stopPropagation()
    const url = `${window.location.origin}/quiz/${shareLink}`
    navigator.clipboard.writeText(url)
    alert('Link copied to clipboard')
  }

  return (
    <div className="page" style={{ padding: 0 }}>
      <Header />
      <div className="page-inner">
        <div className="flex-between mb-3">
          <h2>My Quizzes</h2>
          <Link to="/teacher/create" className="btn btn-primary">+ New Quiz</Link>
        </div>

        {loading ? (
          <div className="spinner-center"><span className="spinner spinner-lg"></span></div>
        ) : quizzes.length === 0 ? (
          <div className="card text-center" style={{ padding: '4rem 2rem' }}>
            <h3 className="mb-2">No quizzes yet</h3>
            <p className="mb-3">Create your first AI-powered quiz in minutes.</p>
            <Link to="/teacher/create" className="btn btn-secondary">Create Quiz</Link>
          </div>
        ) : (
          <div className="grid-2">
            {quizzes.map((q) => (
              <div key={q._id} className="card" onClick={() => navigate(`/teacher/quiz/${q._id}`)} style={{ cursor: 'pointer' }}>
                <div className="flex-between mb-2">
                  <span className={`badge ${q.status === 'active' ? 'badge-theory' : 'badge-hard'}`}>
                    {q.status.toUpperCase()}
                  </span>
                  <span className="text-muted text-sm">{new Date(q.createdAt).toLocaleDateString()}</span>
                </div>
                
                <h3 style={{ marginBottom: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.title}</h3>
                
                <div className="grid-2" style={{ gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <div className="text-muted"><strong style={{ color: 'var(--text-primary)' }}>{q.settings.questionCount}</strong> Qs</div>
                  <div className="text-muted"><strong style={{ color: 'var(--text-primary)' }}>{q.settings.timeLimit}</strong> mins</div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span className={`badge badge-${q.settings.difficulty}`}>
                      {q.settings.difficulty}
                    </span>
                  </div>
                </div>

                <div className="divider" style={{ margin: '1rem 0' }}></div>

                <div className="flex-between">
                  <button className="btn btn-secondary btn-sm" onClick={(e) => copyLink(q.shareLink, e)}>
                    Copy Link
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>View Results →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
