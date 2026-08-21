const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  selected: { type: String, default: null }, // "A", "B", "C", "D" or null if skipped
});

const quizAttemptSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  studentName: { type: String, required: true, trim: true },
  studentEmail: { type: String, required: true, lowercase: true, trim: true },
  answers: [answerSchema],
  score: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  tabSwitchCount: { type: Number, default: 0 },
  autoSubmitted: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Compound index: 1 attempt per email per quiz
quizAttemptSchema.index({ quizId: 1, studentEmail: 1 }, { unique: true });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
