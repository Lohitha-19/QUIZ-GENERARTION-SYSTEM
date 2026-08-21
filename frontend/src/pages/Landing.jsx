import { Link } from 'react-router-dom'
import Header from '../components/Header'

export default function Landing() {
  return (
    <div className="page" style={{ padding: 0 }}>
      <Header />
      
      <main className="container text-center animate-fade-up" style={{ paddingTop: '6rem', paddingBottom: '6rem' }}>
        <div style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(79, 158, 248, 0.1)', borderRadius: '100px', color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '2rem' }}>
          ✨ Powered by Google Gemini AI
        </div>
        
        <h1 style={{ marginBottom: '1.5rem', maxWidth: '800px', margin: '0 auto 1.5rem' }}>
          Transform any document into a <span className="gradient-text">smart assessment</span> instantly.
        </h1>
        
        <p style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
          Upload PDFs, Word docs, PowerPoints, or paste text. Our AI generates highly accurate MCQs with customizable difficulty and question types.
        </p>

        <div className="flex gap-2" style={{ justifyContent: 'center' }}>
          <Link to="/teacher/register" className="btn btn-primary btn-lg">Get Started for Free</Link>
          <Link to="/teacher/login" className="btn btn-secondary btn-lg">Teacher Login</Link>
        </div>

        <div className="grid-3 mt-3" style={{ marginTop: '5rem', textAlign: 'left' }}>
          <div className="card">
            <h3 className="mb-2" style={{ color: 'var(--accent)' }}>📚 Multi-Format Support</h3>
            <p>Upload PDFs, PPTs, Word docs, or paste raw text directly into the generator.</p>
          </div>
          <div className="card">
            <h3 className="mb-2" style={{ color: 'var(--accent-2)' }}>🧮 Smart Classification</h3>
            <p>Mix Theory, Numerical, and Coding questions with precise percentage controls.</p>
          </div>
          <div className="card">
            <h3 className="mb-2" style={{ color: 'var(--accent-3)' }}>🛡️ Secure Assessment</h3>
            <p>One attempt per student, tab-switch monitoring, and strict visibility controls.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
