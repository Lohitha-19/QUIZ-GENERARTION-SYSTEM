# AI Quiz Generator System

An intelligent full-stack assessment platform powered by **Google Gemini AI** that automates quiz creation, document processing, and student evaluations. Teachers can generate multi-format multiple-choice quizzes from raw topics or uploaded documents (**PDF**, **PPTX**, **DOCX**, **TXT**), customize rules and proctoring settings, while students complete quizzes in an interactive, timed environment with automated grading.

---

## What is AI Quiz Generator System?

AI Quiz Generator System is a comprehensive web application designed to simplify assessment creation for educators and streamline test-taking for students. It transforms static lecture slides, textbooks, and topic prompts into dynamic, balanced multiple-choice quizzes. Featuring multi-format file parsing, intelligent content classification (theory, numerical, coding), tab-switch anti-cheating proctoring, and instant score breakdowns, the platform delivers a seamless, end-to-end examination ecosystem.

---

## Key Features

👨‍🏫 **Intelligent Quiz Generation & Customization**
- Generate complete quizzes instantly from raw text prompts or document uploads.
- Customize total question count, difficulty levels (*Easy*, *Medium*, *Hard*), and time limits.
- Full teacher control to review, edit, or update quiz titles, settings, and expiration dates.

📄 **Multi-Format Document Parsing & Sentence Chunking**
- Native extraction from **PDF** (PyMuPDF), **PowerPoint** (`python-pptx`), **Word** (`python-docx`), and plain text files.
- Overlapping sentence-boundary text chunking engine ensuring zero loss of key lecture context.

🎯 **Balanced Question Classification & Mix Control**
- AI engine classifies extracted text into **Theory**, **Numerical**, and **Coding** categories.
- Configurable ratio distribution (e.g., 50% Theory, 25% Numerical, 25% Coding) with automatic percentage normalization.

🛡️ **Anti-Cheating & Proctoring Controls**
- Real-time tab switch tracking detects when students leave the exam window.
- Configurable tab switch limits (e.g., maximum 3 switches) triggering automatic quiz submission upon breach.

⏱️ **Interactive Student Exam Environment**
- Clean, distraction-free test-taking interface with an active countdown timer.
- Pre-attempt email verification prevents duplicate submissions from the same student.
- Secure student view automatically strips correct answers and explanations during the active test session.

📊 **Instant Evaluation & Detailed Score Breakdown**
- Automated grading upon quiz submission.
- Optional teacher-controlled visibility toggles for scores, correct answers, and AI-generated explanations.
- Comprehensive attempt logs for teachers to analyze class performance and tab-switch violations.

📧 **Secure Account Management & Email Verification**
- Role-based registration and authentication using **JWT** and **Bcrypt** password hashing.
- Password recovery flow powered by **Gmail SMTP (Nodemailer)** sending secure, single-use, 1-hour expiration reset links.

---

## Tech Stack

## Tech Stack

**Backend (Python):**
- **FastAPI** (High-performance Python web framework for REST API & AI integration)
- **Uvicorn** for asynchronous ASGI server execution
- **Motor** & **Beanie** for async MongoDB ODM
- **Google Generative AI SDK** (`google-generativeai` with `gemini-2.5-flash`)
- **PyMuPDF** (`fitz`), **python-docx**, and **python-pptx** for multi-format text extraction
- **python-jose** & **passlib[bcrypt]** for JWT authentication and password hashing
- **aiosmtplib** for asynchronous Gmail SMTP password reset emails
- **Pydantic** & **python-dotenv** for schema validation and environment management

**Frontend:**
- **React 18** (UI component framework)
- **React Router DOM v6** for SPA navigation
- **Axios** for API data fetching (proxied to port 8000)
- Custom **Glassmorphism CSS** design system with modern dark themes

---

## Quick Start Guide

### Prerequisites
- **Python** 3.10+
- **Node.js** 16+ & `npm`
- **MongoDB** (Local instance or MongoDB Atlas cluster)
- **Google Gemini API Key** ([Get your API key](https://aistudio.google.com/))

---

### Installation Steps

1. **Clone the repository**
```bash
git clone https://github.com/your-username/quiz-generator-system.git
cd quiz-generator-system
```

2. **Set up Backend (FastAPI Python)**
```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment configuration
cp .env.example .env
```
*Edit `backend/.env` and configure `MONGO_URI`, `JWT_SECRET`, and `GEMINI_API_KEY`.*

Start the Backend server:
```bash
uvicorn main:app --reload --port 8000
```
Interactive API docs are available at `http://localhost:8000/docs`.

3. **Set up Frontend App (React)**
Open another terminal:
```bash
cd frontend

# Install dependencies
npm install

# Start the React app
npm start
```
The application will launch in your browser at `http://localhost:3000`.

---

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register a new teacher account
- `POST /api/auth/login` - User login & JWT issuance
- `GET /api/auth/me` - Get current logged-in user profile
- `POST /api/auth/forgot-password` - Request a password reset email
- `POST /api/auth/reset-password/:token` - Reset password using secure token

### Quiz Management (`/api/quiz`)
- `POST /api/quiz/generate` - Upload documents/text & generate an AI quiz (Protected)
- `GET /api/quiz/my-quizzes` - View all quizzes created by the logged-in teacher (Protected)
- `GET /api/quiz/:id` - View full quiz details and student attempt history (Protected)
- `PUT /api/quiz/:id/settings` - Update quiz settings, title, status, or expiration (Protected)
- `DELETE /api/quiz/:id` - Delete a quiz and its associated attempts (Protected)

### Student Portal (`/api/student`)
- `GET /api/student/quiz/:shareLink` - Fetch quiz questions (Sanitized; no correct answers revealed)
- `POST /api/student/quiz/:shareLink/check` - Check if student email has already attempted the quiz
- `POST /api/student/quiz/:shareLink/submit` - Submit student answers and receive evaluated results

### AI Microservice (`http://localhost:8000`)
- `GET /health` - Health check status endpoint
- `POST /generate-quiz` - Extract document text, chunk content, classify, and invoke Gemini AI

---

## Configuration Details

**AI Service & Text Processing:**
- Document text is split into overlapping chunks (600 words per chunk with 80-word overlap) using sentence boundary detection to preserve mathematical formulas and context.
- Extracted chunks are classified into Theory, Numerical, and Coding buckets before prompt construction.
- If specified percentages for question types do not total 100%, the AI service automatically normalizes them proportionally.

**Anti-Cheating & Student Session Security:**
- The frontend registers `visibilitychange` and `blur` events to track window tab switching.
- If a student exceeds the `tabSwitchLimit` set by the teacher, the quiz automatically auto-submits.
- Pre-attempt checks verify `studentEmail` against MongoDB records to enforce single-attempt restrictions per student.

**Password Reset Email Configuration:**
- Uses Nodemailer configured with Gmail SMTP (`service: 'gmail'`).
- Generates a 32-byte cryptographic random token hashed with SHA-256 and sets a 1-hour expiration timestamp.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

## Acknowledgments

Special thanks to **Google Gemini AI** for providing high-quality generative AI models, **FastAPI** for powering the Python microservice, **PyMuPDF** for reliable PDF parsing, **Express.js & MongoDB** for robust backend persistence, and **React** for the user interface.
