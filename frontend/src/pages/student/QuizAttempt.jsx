import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import api from '../../utils/api'

export default function QuizAttempt() {
  const { shareLink } = useParams()
  const navigate = useNavigate()

  // Pre-attempt state
  const [hasStarted, setHasStarted] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [gateError, setGateError] = useState('')

  // Quiz state
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [tabSwitches, setTabSwitches] = useState(0)
  const [showWarning, setShowWarning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Synchronous lock refs to guarantee single submission
  const isSubmittingRef = useRef(false)
  const lastSwitchTimeRef = useRef(0)

  // Fetch quiz detail without answers
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const { data } = await api.get(`/student/quiz/${shareLink}`)
        setQuiz(data)
        setAnswers(data.questions.map(() => ({ selected: null })))
        if (data.settings.timeLimit > 0) setTimeLeft(data.settings.timeLimit * 60)
      } catch (err) {
        setGateError(err.response?.data?.message || 'Quiz not found')
      } finally {
        setLoading(false)
      }
    }
    loadQuiz()
  }, [shareLink])

  // Timer countdown
  useEffect(() => {
    if (!hasStarted || timeLeft <= 0 || !quiz) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, quiz])

  // Auto-submit once when timer reaches 0
  useEffect(() => {
    if (!hasStarted || !quiz || quiz.settings.timeLimit <= 0) return
    if (timeLeft === 0 && !isSubmittingRef.current) {
      handleSubmit(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, hasStarted, quiz])

  // Tab switch detection
  useEffect(() => {
    if (!hasStarted || !quiz) return

    const recordViolation = () => {
      const now = Date.now()
      // Ignore duplicate events within 1 second (e.g. visibilitychange + blur firing together)
      if (now - lastSwitchTimeRef.current < 1000) return
      lastSwitchTimeRef.current = now

      setTabSwitches(prev => {
        const newCount = prev + 1
        if (newCount >= quiz.settings.tabSwitchLimit) {
          if (!isSubmittingRef.current) {
            handleSubmit(true)
          }
        } else {
          setShowWarning(true)
          setTimeout(() => setShowWarning(false), 5000)
        }
        return newCount
      })
    }

    const handleVisibilityChange = () => {
      if (document.hidden) recordViolation()
    }

    const handleBlur = () => {
      recordViolation()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, quiz])

  const handleStart = async (e) => {
    e.preventDefault()
    setGateError('')
    try {
      // PRE-ATTEMPT GATE: Check if email already exists
      const { data } = await api.post(`/student/quiz/${shareLink}/check`, { email: studentEmail })
      if (data.attempted) {
        setGateError('You have already attempted this quiz. Only one attempt is allowed.')
        return
      }
      setHasStarted(true)
      // Request full screen for better focus
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {})
      }
    } catch (err) {
      setGateError(err.response?.data?.message || 'Failed to verify email')
    }
  }

  const handleSelect = (qIndex, label) => {
    const newAnswers = [...answers]
    newAnswers[qIndex].selected = label
    setAnswers(newAnswers)
  }

  const handleSubmit = async (auto = false) => {
    // Synchronous check-and-set lock prevents parallel/duplicate calls
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setSubmitting(true)

    try {
      const { data } = await api.post(`/student/quiz/${shareLink}/submit`, {
        studentName,
        studentEmail,
        answers,
        tabSwitchCount: tabSwitches,
        autoSubmitted: auto
      })
      // Exit full screen safely
      if (document.fullscreenElement && document.exitFullscreen) {
        try {
          await document.exitFullscreen()
        } catch (e) {
          // Ignore exitFullscreen error if document is inactive or unmounted
        }
      }
      
      // Navigate to result replacing current history
      navigate(`/quiz/${shareLink}/result`, { state: { result: data.result }, replace: true })
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit quiz')
      isSubmittingRef.current = false
      setSubmitting(false)
    }
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) return <div className="page"><Header /><div className="spinner-center"><span className="spinner spinner-lg"></span></div></div>
  if (!quiz && gateError && !hasStarted) return <div className="page"><Header /><h2 className="text-center mt-3 text-muted">{gateError}</h2></div>

  // PRE-ATTEMPT SCREEN
  if (!hasStarted) {
    return (
      <div className="page" style={{ padding: 0 }}>
        <Header />
        <div className="page-inner flex-center" style={{ display: 'grid', placeItems: 'center' }}>
          <div className="card card-lg text-center" style={{ maxWidth: 500, width: '100%' }}>
            <h2 className="mb-2">{quiz.title}</h2>
            
            <div className="grid-2 mb-3 text-left">
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                <div className="text-muted text-sm">Questions</div>
                <strong style={{ fontSize: '1.2rem' }}>{quiz.settings.questionCount}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                <div className="text-muted text-sm">Time Limit</div>
                <strong style={{ fontSize: '1.2rem' }}>{quiz.settings.timeLimit ? `${quiz.settings.timeLimit} mins` : 'None'}</strong>
              </div>
            </div>

            {gateError && <div className="alert alert-error mb-3">{gateError}</div>}

            <form onSubmit={handleStart} className="text-left">
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input type="text" className="input" required value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Email Address</label>
                <input type="email" className="input" required value={studentEmail} onChange={e => setStudentEmail(e.target.value)} placeholder="john@school.edu" />
                <span className="text-muted text-sm mt-1">IMPORTANT: Only 1 attempt allowed per email.</span>
              </div>

              <div className="alert alert-warn mb-3">
                <strong>Attention:</strong> Tab switching and window losing focus are monitored. {quiz.settings.tabSwitchLimit} violations will result in automatic submission.
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-full">Start Quiz</button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ACTIVE QUIZ INTERFACE
  const answeredCount = answers.filter(a => a.selected !== null).length
  const progressPercent = (answeredCount / quiz.questions.length) * 100

  return (
    <div className="page" style={{ padding: 0, paddingBottom: '100px' }}>
      {/* Fixed Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8, 12, 20, 0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <div className="container flex-between" style={{ height: '60px' }}>
          <h2 style={{ fontSize: '1.1rem' }}>{quiz.title}</h2>
          <div className="flex gap-2 text-sm">
            <span className="text-muted">Total: {answeredCount}/{quiz.questions.length}</span>
            {quiz.settings.timeLimit > 0 && (
              <span style={{ color: timeLeft < 60 ? 'var(--accent-danger)' : 'var(--accent-3)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                ⏱ {formatTime(timeLeft)}
              </span>
            )}
          </div>
        </div>
        <div className="progress-bar" style={{ borderRadius: 0, height: 4 }}><div className="progress-bar-fill" style={{ width: `${progressPercent}%`, borderRadius: 0 }}></div></div>
      </div>

      {showWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(248, 113, 113, 0.9)', zIndex: 100, display: 'grid', placeItems: 'center', color: '#fff', textAlign: 'center', padding: '2rem' }}>
          <div>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
            <h1>Warning: Tab Switch Detected</h1>
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Violation {tabSwitches} of {quiz.settings.tabSwitchLimit}. The quiz will auto-submit upon reaching the limit.</p>
            <button onClick={() => setShowWarning(false)} className="btn btn-secondary btn-lg" style={{ color: '#000' }}>I Understand & Return</button>
          </div>
        </div>
      )}

      <div className="page-inner" style={{ maxWidth: '800px' }}>
        {quiz.questions.map((q, i) => (
          <div key={i} className="card mb-3" id={`q-${i}`}>
            <div className="flex-between mb-2">
              <span className="text-muted">Question {i + 1} of {quiz.questions.length}</span>
              <span className={`badge badge-${q.type}`}>{q.type}</span>
            </div>
            
            <h3 className="mb-3">{q.question}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {q.options.map((opt, idx) => {
                const label = String.fromCharCode(65 + idx) // A, B, C, D
                const isSelected = answers[i].selected === label
                return (
                  <label key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem', borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'rgba(79, 158, 248, 0.15)' : 'var(--bg-card)',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                    <input type="radio" name={`q-${i}`} value={label} checked={isSelected} onChange={() => handleSelect(i, label)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)', minWidth: '20px' }}>{label}.</span>
                    <span style={{ flex: 1, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{opt}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}

        <div className="card text-center" style={{ background: 'var(--bg-card)', border: 'none', marginTop: '3rem' }}>
          <h3 className="mb-2">Ready to submit?</h3>
          {answeredCount < quiz.questions.length && (
            <p className="text-muted mb-2">You still have {quiz.questions.length - answeredCount} unanswered questions.</p>
          )}
          <button onClick={() => handleSubmit(false)} className="btn btn-success btn-lg" disabled={submitting}>
            {submitting ? <span className="spinner"></span> : 'Submit Quiz'}
          </button>
        </div>
      </div>
    </div>
  )
}
