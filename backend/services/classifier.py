import re

# Coding detection patterns
CODING_PATTERNS = [
    r'\bdef\s+\w+\s*\(',
    r'\bfunction\s+\w+\s*\(',
    r'\bclass\s+\w+[\s:(]',
    r'\bimport\s+\w+',
    r'\bfrom\s+\w+\s+import\b',
    r'#include\s*[<"]',
    r'\bfor\s*\(.*;.*;.*\)',
    r'\bwhile\s*\(',
    r'\bif\s*\(.*\)\s*{',
    r'print\s*\(',
    r'console\.log\s*\(',
    r'System\.out\.print',
    r'\breturn\s+.+;',
    r'=>\s*{',
    r'int\s+\w+\s*=',
    r'string\s+\w+\s*=',
    r'var\s+\w+\s*=',
    r'let\s+\w+\s*=',
    r'const\s+\w+\s*=',
    r'public\s+static\s+void',
    r'#\s*define\s+\w+',
    r'lambda\s+\w+',
    r'try\s*{',
    r'catch\s*\(',
    r'\bprintf\s*\(',
    r'<\?php',
    r'SELECT\s+\w+\s+FROM\s+\w+',
]

# Numerical detection patterns
NUMERICAL_PATTERNS = [
    r'\d+\.\d+',
    r'=\s*\d+',
    r'\d+\s*[+\-*/^]\s*\d+',
    r'\b\d{3,}\b',
    r'[αβγδεζηθλμνπρστφχψω]',
    r'∑|∫|∂|√|∞|≤|≥|≠|≈',
    r'\bsin\b|\bcos\b|\btan\b|\blog\b|\bln\b|\bexp\b',
    r'\d+%',
    r'\$\d+',
    r'\d+\s*(kg|km|m|s|mol|J|N|Pa|Hz|V|A|W|K|°C)',
    r'[Ff]ormula|[Ee]quation|[Cc]alculat|[Ss]olve',
]


def classify_chunk(text: str) -> str:
    """
    Classify a text chunk as 'coding', 'numerical', or 'theory'.
    Priority: coding > numerical > theory
    """
    # Check for coding patterns
    coding_score = sum(1 for p in CODING_PATTERNS if re.search(p, text, re.MULTILINE))
    if coding_score >= 2:
        return 'coding'

    # Check for numerical patterns
    numerical_score = sum(1 for p in NUMERICAL_PATTERNS if re.search(p, text))
    if numerical_score >= 2:
        return 'numerical'

    return 'theory'


def classify_chunks(chunks: list[str]) -> dict[str, list[str]]:
    """Classify a list of chunks into buckets."""
    buckets: dict[str, list[str]] = {'theory': [], 'numerical': [], 'coding': []}
    for chunk in chunks:
        label = classify_chunk(chunk)
        buckets[label].append(chunk)
    return buckets
