const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],  // always 4 options
  correct: { type: String, required: true },     // e.g. "A", "B", "C", "D"
  explanation: { type: String, default: '' },
  type: { type: String, enum: ['theory', 'numerical', 'coding'], default: 'theory' },
});

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [questionSchema],
  settings: {
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    questionCount: { type: Number, default: 10 },
    timeLimit: { type: Number, default: 10 }, // minutes, 0 = no limit
    questionType: { type: String, enum: ['theory', 'numerical', 'coding', 'mixed'], default: 'mixed' },
    theoryPercent: { type: Number, default: 50 },
    numericalPercent: { type: Number, default: 25 },
    codingPercent: { type: Number, default: 25 },
    // Result visibility
    showScore: { type: Boolean, default: true },
    showAnswers: { type: Boolean, default: true },
    showExplanations: { type: Boolean, default: true },
    // Security
    tabSwitchLimit: { type: Number, default: 3 }, // auto-submit after N violations
    expiresAt: { type: Date, default: null },
  },
  shareLink: { type: String, unique: true, required: true },
  status: { type: String, enum: ['active', 'expired', 'draft'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
