const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

// POST /api/quiz/generate — Upload files and/or raw text, generate quiz
router.post('/generate', protect, upload.array('files', 10), async (req, res) => {
  const files = req.files || [];
  const {
    rawText = '',
    title,
    difficulty = 'medium',
    questionCount = 10,
    timeLimit = 10,
    questionType = 'mixed',
    theoryPercent = 50,
    numericalPercent = 25,
    codingPercent = 25,
    showScore = true,
    showAnswers = true,
    showExplanations = true,
    tabSwitchLimit = 3,
    expiresAt = null,
  } = req.body;

  if (files.length === 0 && !rawText.trim()) {
    return res.status(400).json({ message: 'Please upload at least one file or provide text content' });
  }

  try {
    // Build multipart form for AI service
    const form = new FormData();
    for (const file of files) {
      form.append('files', fs.createReadStream(file.path), {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    }
    form.append('rawText', rawText);
    form.append('difficulty', difficulty);
    form.append('questionCount', String(questionCount));
    form.append('questionType', questionType);
    form.append('theoryPercent', String(theoryPercent));
    form.append('numericalPercent', String(numericalPercent));
    form.append('codingPercent', String(codingPercent));

    const aiResponse = await axios.post(
      `${process.env.AI_SERVICE_URL}/generate-quiz`,
      form,
      { headers: form.getHeaders(), timeout: 120000 }
    );

    const questions = aiResponse.data.questions;

    if (!questions || questions.length === 0) {
      return res.status(500).json({ message: 'AI service returned no questions. Try different content.' });
    }

    // Clean up uploaded files
    for (const file of files) {
      fs.unlink(file.path, () => {});
    }

    // Create quiz in DB
    const shareLink = uuidv4();
    const quiz = await Quiz.create({
      title: title || `Quiz - ${new Date().toLocaleDateString()}`,
      creatorId: req.user._id,
      questions,
      settings: {
        difficulty,
        questionCount: questions.length,
        timeLimit: Number(timeLimit),
        questionType,
        theoryPercent: Number(theoryPercent),
        numericalPercent: Number(numericalPercent),
        codingPercent: Number(codingPercent),
        showScore: showScore === 'true' || showScore === true,
        showAnswers: showAnswers === 'true' || showAnswers === true,
        showExplanations: showExplanations === 'true' || showExplanations === true,
        tabSwitchLimit: Number(tabSwitchLimit),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      shareLink,
    });

    res.status(201).json({
      message: 'Quiz generated successfully',
      quiz,
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/quiz/${shareLink}`,
    });
  } catch (error) {
    // Clean up files on error
    if (req.files) req.files.forEach(f => fs.unlink(f.path, () => {}));
    const msg = error.response?.data?.detail || error.message || 'Failed to generate quiz';
    res.status(500).json({ message: msg });
  }
});

// GET /api/quiz/my-quizzes — List teacher's quizzes
router.get('/my-quizzes', protect, async (req, res) => {
  const quizzes = await Quiz.find({ creatorId: req.user._id })
    .sort({ createdAt: -1 })
    .select('-questions');
  res.json(quizzes);
});

// GET /api/quiz/:id — Get full quiz detail (teacher)
router.get('/:id', protect, async (req, res) => {
  const quiz = await Quiz.findOne({ _id: req.params.id, creatorId: req.user._id });
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

  const attempts = await QuizAttempt.find({ quizId: quiz._id }).sort({ submittedAt: -1 });
  res.json({ quiz, attempts });
});

// PUT /api/quiz/:id/settings — Update quiz settings
router.put('/:id/settings', protect, async (req, res) => {
  const quiz = await Quiz.findOne({ _id: req.params.id, creatorId: req.user._id });
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

  const allowedFields = [
    'showScore', 'showAnswers', 'showExplanations',
    'tabSwitchLimit', 'expiresAt', 'timeLimit', 'title', 'status',
  ];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (['showScore', 'showAnswers', 'showExplanations'].includes(field)) {
        quiz.settings[field] = req.body[field] === true || req.body[field] === 'true';
      } else if (field === 'expiresAt') {
        quiz.settings.expiresAt = req.body[field] ? new Date(req.body[field]) : null;
      } else if (field === 'title') {
        quiz.title = req.body[field];
      } else if (field === 'status') {
        quiz.status = req.body[field];
      } else {
        quiz.settings[field] = req.body[field];
      }
    }
  });

  await quiz.save();
  res.json({ message: 'Settings updated', quiz });
});

// DELETE /api/quiz/:id
router.delete('/:id', protect, async (req, res) => {
  const quiz = await Quiz.findOneAndDelete({ _id: req.params.id, creatorId: req.user._id });
  if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
  await QuizAttempt.deleteMany({ quizId: quiz._id });
  res.json({ message: 'Quiz deleted successfully' });
});

module.exports = router;
