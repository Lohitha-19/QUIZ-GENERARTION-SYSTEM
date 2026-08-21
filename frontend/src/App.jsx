import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/teacher/Login'
import Register from './pages/teacher/Register'
import Dashboard from './pages/teacher/Dashboard'
import CreateQuiz from './pages/teacher/CreateQuiz'
import QuizDetail from './pages/teacher/QuizDetail'
import QuizAttempt from './pages/student/QuizAttempt'
import QuizResult from './pages/student/QuizResult'
import ForgotPassword from './pages/teacher/ForgotPassword'
import ResetPassword from './pages/teacher/ResetPassword'

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/teacher/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/teacher/login" element={<Login />} />
        <Route path="/teacher/register" element={<Register />} />
        <Route path="/teacher/forgot-password" element={<ForgotPassword />} />
        <Route path="/teacher/reset-password/:token" element={<ResetPassword />} />

        {/* Teacher (protected) */}
        <Route path="/teacher/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/teacher/create" element={<PrivateRoute><CreateQuiz /></PrivateRoute>} />
        <Route path="/teacher/quiz/:id" element={<PrivateRoute><QuizDetail /></PrivateRoute>} />

        {/* Student (public via share link) */}
        <Route path="/quiz/:shareLink" element={<QuizAttempt />} />
        <Route path="/quiz/:shareLink/result" element={<QuizResult />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
