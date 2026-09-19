import json
import re
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure API key once
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    print("[quiz_generator] WARNING: GEMINI_API_KEY not found in environment")

# Type-specific prompts
PROMPTS = {
    "theory": """Generate {count} multiple-choice questions based on the following educational content.
Each question should test conceptual understanding (theory-based, no calculations needed).

Content:
{content}

Return ONLY a valid JSON array. Each item must have:
- "question": clear question string
- "options": array of exactly 4 strings labelled ["A. ...", "B. ...", "C. ...", "D. ..."]
- "correct": one of "A", "B", "C", "D"
- "explanation": brief explanation of why the answer is correct
- "type": "theory"

Difficulty: {difficulty}

STRICT RULES:
- Do NOT include any text before or after JSON
- Do NOT include markdown (no ```json)
- Output must start with [ and end with ]
""",

    "numerical": """Generate {count} multiple-choice questions based on the following educational content.
Each question should involve numerical calculations, formulas, or quantitative reasoning.

Content:
{content}

Return ONLY a valid JSON array. Each item must have:
- "question": question with numbers/formulas
- "options": array of exactly 4 strings labelled ["A. ...", "B. ...", "C. ...", "D. ..."] with numerical answers
- "correct": one of "A", "B", "C", "D"
- "explanation": step-by-step solution
- "type": "numerical"

Difficulty: {difficulty}

STRICT RULES:
- Do NOT include any text before or after JSON
- Do NOT include markdown (no ```json)
- Output must start with [ and end with ]
""",

    "coding": """Generate {count} multiple-choice questions based on the following code/programming content.
Each question should test code reading, output prediction, debugging, or programming concepts.

Content:
{content}

Return ONLY a valid JSON array. Each item must have:
- "question": question about code (can include a code snippet)
- "options": array of exactly 4 strings labelled ["A. ...", "B. ...", "C. ...", "D. ..."]
- "correct": one of "A", "B", "C", "D"
- "explanation": explanation referencing the code logic
- "type": "coding"

Difficulty: {difficulty}

STRICT RULES:
- Do NOT include any text before or after JSON
- Do NOT include markdown (no ```json)
- Output must start with [ and end with ]
""",
}


def _clean_json(raw: str) -> str:
    """Remove markdown code fences if present."""
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def _extract_text_from_response(response) -> str:
    """Safely extract text from Gemini response."""
    try:
        if hasattr(response, "text") and response.text:
            return response.text
        return response.candidates[0].content.parts[0].text
    except Exception as e:
        print("[quiz_generator] ERROR extracting text:", e)
        return ""


def _call_gemini(prompt: str) -> list[dict]:
    """Call Gemini API and parse JSON safely."""
    print(f"[quiz_generator] Calling Gemini | Prompt length: {len(prompt)}")

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")

        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.3}
        )

        print("[quiz_generator] FULL RESPONSE:", response)

        raw = _extract_text_from_response(response)
        print("[quiz_generator] RAW OUTPUT:", raw)

        if not raw:
            raise ValueError("Empty response from Gemini")

        cleaned = _clean_json(raw)

        try:
            questions = json.loads(cleaned)
        except Exception as e:
            print("[quiz_generator] JSON PARSE ERROR:", e)
            print("[quiz_generator] CLEANED OUTPUT:", cleaned)
            return []

        if not isinstance(questions, list):
            raise ValueError("Gemini returned non-list response")

        return questions

    except Exception as e:
        print("[quiz_generator] GEMINI ERROR:", e)
        import traceback
        traceback.print_exc()
        return []


def _select_chunks(chunks: list[str], count: int) -> list[str]:
    """Select chunks evenly."""
    if not chunks:
        return []
    if len(chunks) <= count:
        return chunks
    step = len(chunks) / count
    return [chunks[int(i * step)] for i in range(count)]


def generate_questions(
    classified_chunks: dict[str, list[str]],
    question_type: str,
    total_count: int,
    theory_pct: int,
    numerical_pct: int,
    coding_pct: int,
    difficulty: str,
) -> list[dict]:

    questions = []

    # Decide counts
    if question_type == "theory":
        counts = {"theory": total_count, "numerical": 0, "coding": 0}
    elif question_type == "numerical":
        counts = {"theory": 0, "numerical": total_count, "coding": 0}
    elif question_type == "coding":
        counts = {"theory": 0, "numerical": 0, "coding": total_count}
    else:
        counts = {
            "theory": round(total_count * theory_pct / 100),
            "numerical": round(total_count * numerical_pct / 100),
            "coding": round(total_count * coding_pct / 100),
        }
        diff = total_count - sum(counts.values())
        counts["theory"] += diff

    for qtype, needed in counts.items():
        if needed == 0:
            continue

        chunks = classified_chunks.get(qtype, [])

        if not chunks:
            chunks = classified_chunks.get("theory", [])
            if not chunks:
                continue

        selected = _select_chunks(chunks, min(3, len(chunks)))
        content = "\n\n".join(selected)[:8000]

        prompt = PROMPTS[qtype].format(
            count=needed,
            content=content,
            difficulty=difficulty,
        )

        try:
            qs = _call_gemini(prompt)

            # Retry with simpler prompt if failed
            if not qs:
                print("[quiz_generator] Retrying with simpler prompt...")
                simple_prompt = f"""
Generate {needed} MCQs from this content.

Return ONLY JSON array with:
question, options (4), correct (A/B/C/D), explanation, type.

STRICT: Output only JSON.

Content:
{content[:3000]}
"""
                qs = _call_gemini(simple_prompt)

            for q in qs:
                q["type"] = qtype

            questions.extend(qs[:needed])

        except Exception as e:
            print(f"[quiz_generator] Error generating {qtype}:", e)

    return questions[:total_count]
