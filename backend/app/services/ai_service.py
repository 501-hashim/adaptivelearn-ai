"""
Optional AI Provider Integration for Question Generation.
Supports Gemini API through google-genai or direct httpx requests.
Operates strictly as an optional candidate question generator:
- Output is validated using Pydantic
- Generated questions are flagged as unverified by default
- Fallback to verified question bank if API key is not present or calls fail
"""

import json
import logging
from typing import List, Optional
import httpx

from app.core.config import settings
from app.schemas.schemas import AICandidateQuestion, QuestionOption

logger = logging.getLogger(__name__)


class AIProvider:
    def is_available(self) -> bool:
        return bool(settings.GEMINI_API_KEY and settings.AI_PROVIDER == "gemini")

    async def generate_questions(
        self,
        concept_name: str,
        concept_description: str,
        learning_objective: str,
        count: int = 2
    ) -> List[AICandidateQuestion]:
        """
        Generates candidate questions for educational review.
        Returns empty list if provider is unavailable or fails.
        """
        if not self.is_available():
            logger.info("AI provider is not configured or enabled. Using standard verified bank.")
            return []

        prompt = f"""
You are an expert school curriculum educator. Generate {count} multiple choice questions (MCQ) for students on the topic:
Concept: {concept_name}
Description: {concept_description}
Learning Objective: {learning_objective}

Rules:
1. Exactly 4 distinct options per question labeled A, B, C, D.
2. Exactly one unequivocally correct answer.
3. A clear, pedagogical explanation explaining why the correct answer is right and why others are misconceptions.
4. Difficulty between 1 (easy), 2 (medium), 3 (hard).
5. Output MUST be a valid JSON array of objects conforming to:
[
  {{
    "question_text": "Question string",
    "options": [
      {{"id": "A", "text": "Option A"}},
      {{"id": "B", "text": "Option B"}},
      {{"id": "C", "text": "Option C"}},
      {{"id": "D", "text": "Option D"}}
    ],
    "correct_option": "A",
    "explanation": "Clear explanation",
    "difficulty": 2
  }}
]
Do not include any Markdown ticks or explanations outside the JSON array.
"""

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "response_mime_type": "application/json",
                    "temperature": 0.4
                }
            }

            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code != 200:
                    logger.error(f"Gemini API returned error: {res.status_code} - {res.text}")
                    return []

                data = res.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                # Clean up if markdown fences were included
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]

                parsed_items = json.loads(raw_text.strip())
                validated_questions = []

                for item in parsed_items:
                    # Validate options count and keys
                    opts = [QuestionOption(id=opt["id"], text=opt["text"]) for opt in item["options"]]
                    candidate = AICandidateQuestion(
                        question_text=item["question_text"],
                        options=opts,
                        correct_option=item["correct_option"],
                        explanation=item["explanation"],
                        difficulty=int(item.get("difficulty", 2)),
                        concept_id="",  # Bound by caller
                        source_reference=f"Gemini AI ({settings.GEMINI_MODEL})"
                    )
                    validated_questions.append(candidate)

                return validated_questions

        except Exception as e:
            logger.error(f"Failed to generate AI questions: {e}")
            return []


ai_provider = AIProvider()
