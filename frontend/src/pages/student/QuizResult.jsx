import { useLocation, Link, Navigate } from 'react-router-dom'
import Header from '../../components/Header'

export default function QuizResult() {
  const { state } = useLocation()
  
  // Protect route if no result state exists
  if (!state || !state.result) {
    return <Navigate to="/" replace />
  }

  const { result } = state

  return (
    <div className="page" style={{ padding: 0 }}>
      <Header />
      
      <div className="page-inner" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="text-center mb-3">
          {result.autoSubmitted && (
            <div className="badge badge-hard mb-2" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              ⚠️ Quiz auto-submitted due to tab-switch limit
            </div>
          )}
          <h1 className="mb-1">Assessment Received</h1>
          <p className="text-muted">Thank you for attempting the quiz.</p>
        </div>

        {result.visibility.showScore ? (
          <div className="card text-center mb-3" style={{ background: 'var(--gradient-hero)', border: 'none', padding: '3rem 2rem' }}>
            <h2 className="text-muted mb-2">Your Final Score</h2>
            <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--accent-3)', lineHeight: 1 }}>
              {result.percentage}%
            </div>
            <div className="mt-2" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              {result.score} out of {result.totalQuestions} questions correct
            </div>
          </div>
        ) : (
          <div className="card text-center mb-3" style={{ padding: '3rem 2rem' }}>
            <h2 className="mb-2">Score Hidden</h2>
            <p className="text-muted">The teacher has chosen to hide the final scores for this quiz.</p>
          </div>
        )}

        {result.visibility.showAnswers && result.answers ? (
          <div>
            <h3 className="mb-2">Detailed Results</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {result.answers.map((ans, i) => (
                <div key={i} className={`card ${ans.isCorrect ? '' : 'card-incorrect'}`} style={{ borderColor: ans.isCorrect ? 'var(--accent-3)' : 'var(--accent-danger)' }}>
                  <div className="flex-between mb-2">
                    <strong style={{ color: ans.isCorrect ? 'var(--accent-3)' : 'var(--accent-danger)' }}>
                      {ans.isCorrect ? '✅ Correct' : '❌ Incorrect'}
                    </strong>
                    <span className={`badge badge-${ans.type}`}>{ans.type}</span>
                  </div>
                  
                  <p className="mb-2" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{i+1}. {ans.question}</p>
                  
                  <div className="grid-2 mb-2" style={{ gap: '0.5rem' }}>
                    {ans.options.map((opt, idx) => {
                      const label = String.fromCharCode(65 + idx) // A, B, C, D
                      
                      let bg = 'var(--bg-card)'
                      let border = 'var(--border)'
                      
                      if (label === ans.correct) {
                        bg = 'rgba(52, 211, 153, 0.15)'
                        border = 'var(--accent-3)'
                      } else if (label === ans.selected && !ans.isCorrect) {
                        bg = 'rgba(248, 113, 113, 0.15)'
                        border = 'var(--accent-danger)'
                      }

                      return (
                        <div key={idx} style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: bg, border: `1px solid ${border}` }}>
                          {opt}
                        </div>
                      )
                    })}
                  </div>

                  {result.visibility.showExplanations && ans.explanation && (
                    <div className="mt-2" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                      <strong className="text-muted">Explanation:</strong>
                      <p className="mt-1" style={{ fontSize: '0.95rem' }}>{ans.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card text-center mt-3">
            <h3 className="mb-2">Answers Hidden</h3>
            <p className="text-muted">The teacher has chosen not to show the correct answers for this quiz.</p>
          </div>
        )}
      </div>
    </div>
  )
}
