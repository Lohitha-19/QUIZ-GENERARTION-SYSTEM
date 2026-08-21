import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import api from '../../utils/api'

export default function CreateQuiz() {
  const navigate = useNavigate()
  
  // Input state
  const [files, setFiles] = useState([])
  const [rawText, setRawText] = useState('')
  
  // Settings state
  const [title, setTitle] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [difficulty, setDifficulty] = useState('medium')
  const [timeLimit, setTimeLimit] = useState(10)
  
  // Type & Ratio
  const [questionType, setQuestionType] = useState('mixed')
  const [theoryPercent, setTheoryPercent] = useState(50)
  const [numericalPercent, setNumericalPercent] = useState(25)
  const [codingPercent, setCodingPercent] = useState(25)
  
  // Visibility
  const [showScore, setShowScore] = useState(true)
  const [showAnswers, setShowAnswers] = useState(true)
  const [showExplanations, setShowExplanations] = useState(true)

  // System
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e) => setFiles(Array.from(e.target.files))

  // Auto-balance sliders to 100%
  const handleRatioChange = (changed, value) => {
    let t = theoryPercent, n = numericalPercent, c = codingPercent
    if (changed === 't') { t = Number(value); const diff = 100 - t; n = Math.floor(diff/2); c = diff - n; }
    if (changed === 'n') { n = Number(value); const diff = 100 - n; t = Math.floor(diff/2); c = diff - t; }
    if (changed === 'c') { c = Number(value); const diff = 100 - c; t = Math.floor(diff/2); n = diff - t; }
    setTheoryPercent(t); setNumericalPercent(n); setCodingPercent(c)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (files.length === 0 && !rawText.trim()) return setError('Please upload files or paste text.')
    
    setError('')
    setLoading(true)

    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    formData.append('rawText', rawText)
    formData.append('title', title || `Quiz - ${new Date().toLocaleDateString()}`)
    formData.append('questionCount', questionCount)
    formData.append('difficulty', difficulty)
    formData.append('timeLimit', timeLimit)
    formData.append('questionType', questionType)
    formData.append('theoryPercent', theoryPercent)
    formData.append('numericalPercent', numericalPercent)
    formData.append('codingPercent', codingPercent)
    formData.append('showScore', showScore)
    formData.append('showAnswers', showAnswers)
    formData.append('showExplanations', showExplanations)

    try {
      const { data } = await api.post('/quiz/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      navigate(`/teacher/quiz/${data.quiz._id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ padding: 0 }}>
      <Header />
      <div className="page-inner">
        <h2 className="mb-3">Create New Quiz</h2>

        {error && <div className="alert alert-error mb-3">{error}</div>}

        <form onSubmit={handleSubmit} className="grid-2">
          {/* LEFT: CONTENT SOURCE */}
          <div className="card">
            <h3 className="mb-2">1. Provide Content</h3>
            
            <div className="form-group mb-3">
              <label className="form-label">Upload Documents (PDF, PPTX, DOCX)</label>
              <input type="file" multiple className="input" accept=".pdf,.ppt,.pptx,.doc,.docx" onChange={handleFileChange} />
              <span className="text-muted">Max 10 files, 50MB each.</span>
            </div>

            <div className="text-center text-muted mb-2">AND / OR</div>

            <div className="form-group">
              <label className="form-label">Paste Raw Text</label>
              <textarea className="textarea" placeholder="Paste your lesson, article, or code here..." value={rawText} onChange={e => setRawText(e.target.value)} style={{ height: '250px' }}></textarea>
            </div>
          </div>

          {/* RIGHT: SETTINGS */}
          <div className="card">
            <h3 className="mb-2">2. Configure Quiz</h3>

            <div className="form-group">
              <label className="form-label">Quiz Title</label>
              <input type="text" className="input" placeholder="e.g. Midterm Assessment" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Question Count</label>
                <input type="number" min="1" max="50" className="input" value={questionCount} onChange={e => setQuestionCount(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Timer (minutes)</label>
                <input type="number" min="0" className="input" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <select className="select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Question Type</label>
                <select className="select" value={questionType} onChange={e => setQuestionType(e.target.value)}>
                  <option value="mixed">Mixed</option>
                  <option value="theory">Theory Only</option>
                  <option value="numerical">Numerical Only</option>
                  <option value="coding">Coding Only</option>
                </select>
              </div>
            </div>

            {/* RATIO SLIDERS */}
            {questionType === 'mixed' && (
              <div className="card mb-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <h4 className="mb-2 text-sm">Question Distribution</h4>
                <div className="flex-between mb-1 text-sm"><span>Theory</span> <span>{theoryPercent}%</span></div>
                <input type="range" className="w-full mb-2" min="0" max="100" value={theoryPercent} onChange={e => handleRatioChange('t', e.target.value)} />
                
                <div className="flex-between mb-1 text-sm"><span>Numerical</span> <span>{numericalPercent}%</span></div>
                <input type="range" className="w-full mb-2" min="0" max="100" value={numericalPercent} onChange={e => handleRatioChange('n', e.target.value)} />
                
                <div className="flex-between mb-1 text-sm"><span>Coding</span> <span>{codingPercent}%</span></div>
                <input type="range" className="w-full mb-2" min="0" max="100" value={codingPercent} onChange={e => handleRatioChange('c', e.target.value)} />
              </div>
            )}

            <div className="divider"></div>

            <h4 className="mb-2 text-sm">Student Visibility Settings</h4>
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
              <input type="checkbox" checked={showScore} onChange={e => setShowScore(e.target.checked)} id="showScore" />
              <label htmlFor="showScore">Show Final Score</label>
            </div>
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
              <input type="checkbox" checked={showAnswers} onChange={e => setShowAnswers(e.target.checked)} id="showAnswers" />
              <label htmlFor="showAnswers">Show Correct Answers</label>
            </div>
            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
              <input type="checkbox" checked={showExplanations} onChange={e => setShowExplanations(e.target.checked)} id="showExp" />
              <label htmlFor="showExp">Show Explanations</label>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full mt-3" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Generate Magic Quiz ✨'}
            </button>
            {loading && <p className="text-center text-muted mt-2">Uploading and analyzing with AI. This may take a minute...</p>}
          </div>
        </form>
      </div>
    </div>
  )
}
