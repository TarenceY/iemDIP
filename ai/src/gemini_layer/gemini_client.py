"""
Gemini Client

Sends the meal image plus computer-vision metadata to Google Gemini and
parses the structured nutrition response expected by the Node.js backend.

Response shape (mirrors transformAIResponse() in api/src/app.js):
{
    "food_items": [...],
    "totals": { "calories": N, "protein_g": N, "carbohydrates_g": N, "fat_g": N },
    "analysis_notes": "..."
}
"""

import json
import os
import re
from typing import Optional

from loguru import logger


# Prompt sent to Gemini alongside the meal image
_NUTRITION_PROMPT = """You are an expert nutritionist and food analyst.

Analyse the meal in this image and return ONLY a valid JSON object – no markdown fences, no extra text.

Use this exact structure:
{
  "food_items": [
    {
      "food_name": "<name of food item>",
      "serving_size": "<estimated portion, e.g. '1 medium apple (182 g)'>",
      "calories": <integer>,
      "protein_g": <number>,
      "carbohydrates_g": <number>,
      "fat_g": <number>,
      "fiber_g": <number>,
      "sugar_g": <number>,
      "confidence": "<high|medium|low>"
    }
  ],
  "totals": {
    "calories": <integer>,
    "protein_g": <number>,
    "carbohydrates_g": <number>,
    "fat_g": <number>
  },
  "analysis_notes": "<2-3 sentences of nutritional advice and observations about this meal>"
}

{cv_context}

Be concise and accurate. If you cannot identify a food item clearly, use "low" confidence.
Return ONLY the JSON – nothing else."""

_CV_CONTEXT_TEMPLATE = """
Additional context from computer-vision analysis:
- Scale reference available: {has_scale}
- Food items detected by YOLO: {yolo_items}
"""


class GeminiClient:
    """Wraps the Google Gemini API for food nutrition analysis."""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        # Default to a stable, fast model; allow override via env var
        default_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        self.model_name = model_name or default_model
        self._model = None

        if not self.api_key:
            logger.warning(
                "GEMINI_API_KEY is not set. Gemini analysis will use a fallback response."
            )
        else:
            self._init_model()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyze(self, image_path: str, cv_data: dict) -> dict:
        """
        Analyse *image_path* with Gemini and return a nutrition dict.

        Falls back to a structured estimate when the API is unavailable.
        """
        if self._model is None:
            logger.warning("Gemini model unavailable – returning fallback nutrition data.")
            return self._fallback_response(cv_data)

        prompt = self._build_prompt(cv_data)

        try:
            import PIL.Image as PILImage  # type: ignore
            img = PILImage.open(image_path)
            response = self._model.generate_content([prompt, img])
            raw = response.text.strip()
            logger.debug(f"Gemini raw response length: {len(raw)} chars")
            return self._parse_response(raw)
        except Exception as exc:
            logger.error(f"Gemini API call failed: {exc}")
            return self._fallback_response(cv_data)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _init_model(self):
        try:
            import google.generativeai as genai  # type: ignore
            genai.configure(api_key=self.api_key)
            self._model = genai.GenerativeModel(self.model_name)
            logger.info(f"Gemini model initialised: {self.model_name}")
        except ImportError:
            logger.error("google-generativeai is not installed. Run: pip install google-generativeai")
        except Exception as exc:
            logger.error(f"Failed to initialise Gemini: {exc}")

    def _build_prompt(self, cv_data: dict) -> str:
        has_scale = cv_data.get("has_scale_reference", False)
        yolo_items = cv_data.get("food_items", [])
        if yolo_items:
            yolo_str = ", ".join(
                f"{item['name']} (conf {item['confidence']:.0%})" for item in yolo_items
            )
        else:
            yolo_str = "none detected"

        cv_context = _CV_CONTEXT_TEMPLATE.format(
            has_scale="yes" if has_scale else "no",
            yolo_items=yolo_str,
        )
        return _NUTRITION_PROMPT.format(cv_context=cv_context)

    @staticmethod
    def _parse_response(raw: str) -> dict:
        """Extract JSON from the Gemini response, handling minor formatting issues."""
        # Strip markdown code fences if present
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE).strip()

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to extract the first JSON object from the string
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                data = json.loads(match.group())
            else:
                raise ValueError(f"Could not parse Gemini response as JSON: {cleaned[:200]}")

        # Ensure required keys exist with sensible defaults
        data.setdefault("food_items", [])
        data.setdefault("totals", {"calories": 0, "protein_g": 0, "carbohydrates_g": 0, "fat_g": 0})
        data.setdefault("analysis_notes", "")
        return data

    @staticmethod
    def _fallback_response(cv_data: dict) -> dict:
        """Return a minimal valid nutrition response when Gemini is unavailable."""
        yolo_items = cv_data.get("food_items", [])
        food_names = [item["name"] for item in yolo_items] if yolo_items else ["meal"]
        return {
            "food_items": [
                {
                    "food_name": name,
                    "serving_size": "1 serving",
                    "calories": 0,
                    "protein_g": 0,
                    "carbohydrates_g": 0,
                    "fat_g": 0,
                    "fiber_g": 0,
                    "sugar_g": 0,
                    "confidence": "low",
                }
                for name in food_names
            ],
            "totals": {"calories": 0, "protein_g": 0, "carbohydrates_g": 0, "fat_g": 0},
            "analysis_notes": (
                "AI analysis is currently unavailable. "
                "Please ensure GEMINI_API_KEY is set and the google-generativeai package is installed."
            ),
        }
