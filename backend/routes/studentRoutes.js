const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

// Helper: check if quiz is accessible
const getActiveQuiz = async (shareLink) => {
  const quiz = await Quiz.findOne({ shareLink });
  if (!quiz) return { error: 'Quiz not found', status: 404 };
  if (quiz.status === 'expired') return { error: 'This quiz has expired', status: 410 };
  if (quiz.settings.expiresAt && new Date() > quiz.settings.expiresAt) {
    quiz.status = 'expired';
    await quiz.save();
    return { error: 'This quiz has expired', status: 410 };
  }
  return { quiz };
};

// GET /api/student/quiz/:shareLink — Fetch quiz (no correct answers)
router.get('/quiz/:shareLink', async (req, res) => {
  const { quiz, error, status } = await getActiveQuiz(req.params.shareLink);
  if (error) return res.status(status).json({ message: error });

  // Strip correct answers and explanations from response
  const safeQuestions = quiz.questions.map((q, i) => ({
    index: i,
    question: q.question,
    options: q.options,
    type: q.type,
  }));

  res.json({
    _id: quiz._id,
    title: quiz.title,
    settings: {
      timeLimit: quiz.settings.timeLimit,
      questionCount: safeQuestions.length,
      tabSwitchLimit: quiz.settings.tabSwitchLimit,
    },
    questions: safeQuestions,
  });
});

// POST /api/student/quiz/:shareLink/check — Pre-attempt gate (check if email already attempted)
router.post('/quiz/:shareLink/check', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const { quiz, error, status } = await getActiveQuiz(req.params.shareLink);
  if (error) return res.status(status).json({ message: error });

  const existing = await QuizAttempt.findOne({
    quizId: quiz._id,
    studentEmail: email.toLowerCase().trim(),
  });

  res.json({ attempted: !!existing });
});

// POST /api/student/quiz/:shareLink/submit — Submit quiz answers
router.post('/quiz/:shareLink/submit', async (req, res) => {
  const { studentName, studentEmail, answers, tabSwitchCount = 0, autoSubmitted = false } = req.body;

  if (!studentName || !studentEmail) {
    return res.status(400).json({ message: 'Name and email are required' });
  }
  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ message: 'Answers array is required' });
  }

  const { quiz, error, status } = await getActiveQuiz(req.params.shareLink);
  if (error) return res.status(status).json({ message: error });

  // Double-guard: check if already attempted
  const existing = await QuizAttempt.findOne({
    quizId: quiz._id,
    studentEmail: studentEmail.toLowerCase().trim(),
  });
  if (existing) {
    return res.status(403).json({ message: 'You have already attempted this quiz' });
  }

  // Evaluate answers
  let score = 0;
  const evaluated = quiz.questions.map((q, i) => {
    const submitted = answers[i]?.selected || null;
    const isCorrect = submitted === q.correct;
    if (isCorrect) score++;
    return {
      questionIndex: i,
      selected: submitted,
      correct: q.correct,
      isCorrect,
      question: q.question,
      options: q.options,
      explanation: q.explanation,
      type: q.type,
    };
  });

  // Store attempt
  const attempt = await QuizAttempt.create({
    quizId: quiz._id,
    studentName: studentName.trim(),
    studentEmail: studentEmail.toLowerCase().trim(),
    answers: answers.map((a, i) => ({ questionIndex: i, selected: a?.selected || null })),
    score,
    totalQuestions: quiz.questions.length,
    tabSwitchCount: Number(tabSwitchCount),
    autoSubmitted,
  });

  // Build result based on visibility settings
  const result = {
    attemptId: attempt._id,
    totalQuestions: quiz.questions.length,
    tabSwitchCount: attempt.tabSwitchCount,
    autoSubmitted: attempt.autoSubmitted,
  };

  if (quiz.settings.showScore) {
    result.score = score;
    result.percentage = Math.round((score / quiz.questions.length) * 100);
  }

  if (quiz.settings.showAnswers) {
    result.answers = evaluated.map((e) => ({
      questionIndex: e.questionIndex,
      question: e.question,
      options: e.options,
      selected: e.selected,
      correct: e.correct,
      isCorrect: e.isCorrect,
      type: e.type,
      explanation: quiz.settings.showExplanations ? e.explanation : undefined,
    }));
  }

  result.visibility = {
    showScore: quiz.settings.showScore,
    showAnswers: quiz.settings.showAnswers,
    showExplanations: quiz.settings.showExplanations,
  };

  res.status(201).json({ message: 'Quiz submitted successfully', result });
});

module.exports = router;
