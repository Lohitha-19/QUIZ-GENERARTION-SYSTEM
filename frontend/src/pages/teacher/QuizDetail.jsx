import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../../components/Header'
import api from '../../utils/api'

export default function QuizDetail() {
  const { id } = useParams()
  const [quiz, setQuiz] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchDetail = async () => {
    try {
      const { data } = await api.get(`/quiz/${id}`)
      setQuiz(data.quiz)
      setAttempts(data.attempts)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDetail() }, [id])

  const copyLink = () => {
    const url = `${window.location.origin}/quiz/${quiz.shareLink}`
    navigator.clipboard.writeText(url)
    alert('Share link copied!')
  }

  if (loading) return <div className="page"><Header /><div className="spinner-center"><span className="spinner spinner-lg"></span></div></div>
  if (!quiz) return <div className="page"><Header /><h2 className="text-center mt-3">Quiz Not Found</h2></div>

  const avgScore = attempts.length > 0 ? (attempts.reduce((a, b) => a + b.score, 0) / attempts.length).toFixed(1) : 0

  return (
    <div className="page" style={{ padding: 0 }}>
      <Header />
      <div className="page-inner">
        
        <div className="card mb-3" style={{ background: 'var(--gradient-hero)', border: 'none' }}>
          <div className="flex-between">
            <div>
              <h1 className="mb-1">{quiz.title}</h1>
              <p>Generated on {new Date(quiz.createdAt).toLocaleDateString()}</p>
            </div>
            <button onClick={copyLink} className="btn btn-success btn-lg">🔗 Copy Share Link</button>
          </div>
        </div>

        <div className="grid-2 mb-3">
          <div className="card">
            <h3 className="mb-2">Overview</h3>
            <div className="flex-between mb-1"><span>Total Questions:</span> <strong>{quiz.questions.length}</strong></div>
            <div className="flex-between mb-1"><span>Time Limit:</span> <strong>{quiz.settings.timeLimit} mins</strong></div>
            <div className="flex-between mb-1"><span>Difficulty:</span> <span className={`badge badge-${quiz.settings.difficulty}`}>{quiz.settings.difficulty}</span></div>
          </div>
          
          <div className="card">
            <h3 className="mb-2">Student Performance</h3>
            <div className="flex-between mb-1"><span>Total Attempts:</span> <strong>{attempts.length}</strong></div>
            <div className="flex-between mb-1"><span>Average Score:</span> <strong>{avgScore} / {quiz.questions.length}</strong></div>
          </div>
        </div>

        <h3 className="mb-2">Questions</h3>
        <div className="grid-2 mb-3">
          {quiz.questions.map((q, i) => (
            <div key={i} className="card">
              <div className="flex-between mb-2">
                <strong>Q{i+1}.</strong>
                <span className={`badge badge-${q.type}`}>{q.type}</span>
              </div>
              <p className="mb-2" style={{ color: 'var(--text-primary)' }}>{q.question}</p>
              
              <div className="grid-2 mb-2" style={{ gap: '0.5rem' }}>
                {q.options.map((opt, idx) => {
                  const label = String.fromCharCode(65 + idx) // A, B, C, D
                  const isCorrect = label === q.correct
                  return (
                    <div key={idx} style={{ 
                      padding: '0.5rem', 
                      borderRadius: 'var(--radius-sm)', 
                      background: isCorrect ? 'var(--gradient-success)' : 'var(--bg-card)',
                      border: `1px solid ${isCorrect ? 'transparent' : 'var(--border)'}`
                    }}>
                      {opt}
                    </div>
                  )
                })}
              </div>
              {q.explanation && <p className="text-sm text-muted"><strong>Exp:</strong> {q.explanation}</p>}
            </div>
          ))}
        </div>

        <h3 className="mb-2">Student Attempts</h3>
        <div className="card">
          {attempts.length === 0 ? <p className="text-muted">No attempts yet.</p> : (
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem' }}>Name</th>
                  <th style={{ padding: '1rem' }}>Email</th>
                  <th style={{ padding: '1rem' }}>Score</th>
                  <th style={{ padding: '1rem' }}>Tab Switches</th>
                  <th style={{ padding: '1rem' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map(a => (
                  <tr key={a._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>{a.studentName} {a.autoSubmitted && <span className="badge badge-hard">Auto</span>}</td>
                    <td style={{ padding: '1rem' }}>{a.studentEmail}</td>
                    <td style={{ padding: '1rem' }}><strong>{a.score}</strong> / {a.totalQuestions}</td>
                    <td style={{ padding: '1rem', color: a.tabSwitchCount >= 3 ? 'var(--accent-danger)' : 'inherit' }}>{a.tabSwitchCount}</td>
                    <td style={{ padding: '1rem' }} className="text-muted">{new Date(a.submittedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
