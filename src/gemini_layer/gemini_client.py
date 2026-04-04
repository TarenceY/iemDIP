"""
Google Gemini Nutrition Analyzer

Uses Gemini's vision capabilities combined with CV metadata
to provide accurate nutrition information.
"""

import os
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from pathlib import Path
from loguru import logger

# New 2026 SDK Imports
try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-genai not installed. Install with: pip install google-genai")


@dataclass
class NutritionInfo:
    """Nutritional information for a food item."""
    food_name: str
    serving_size: str
    calories: float
    protein_g: float
    carbohydrates_g: float
    fat_g: float
    fiber_g: float
    sugar_g: float
    sodium_mg: float
    confidence: str  # "high", "medium", "low"
    notes: Optional[str] = None


@dataclass 
class NutritionResult:
    """Complete nutrition analysis result."""
    food_items: List[NutritionInfo]
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    analysis_notes: str
    raw_response: str


class GeminiNutritionAnalyzer:
    """
    Nutrition Analyzer using Google Gemini API.
    
    Combines image analysis with CV metadata to provide
    accurate nutrition estimations.
    """
    
    NUTRITION_PROMPT = """You are a nutrition analysis expert. Analyze the food in this image and provide detailed nutrition information.

## Computer Vision Analysis Data:
{cv_metadata}

## Your Task:
Based on the image and the CV analysis data (especially the measured dimensions), estimate the nutritional content of each food item.

## Important Guidelines:
1. Use the size measurements from CV data to estimate portion sizes accurately
2. If dimensions are provided in cm, use them to calculate volume/weight
3. Provide nutrition values per the actual detected portion, not per 100g
4. Be specific about the food items you identify
5. If uncertain, indicate your confidence level

## Response Format (JSON):
{{
    "food_items": [
        {{
            "food_name": "Food name",
            "serving_size": "e.g., 1 medium apple (182g)",
            "estimated_weight_g": 182,
            "calories": 95,
            "protein_g": 0.5,
            "carbohydrates_g": 25,
            "fat_g": 0.3,
            "fiber_g": 4.4,
            "sugar_g": 19,
            "sodium_mg": 2,
            "confidence": "high/medium/low",
            "notes": "Any relevant notes about the estimation"
        }}
    ],
    "total_nutrition": {{
        "calories": 95,
        "protein_g": 0.5,
        "carbohydrates_g": 25,
        "fat_g": 0.3
    }},
    "analysis_notes": "Overall notes about the analysis"
}}

Respond ONLY with valid JSON, no additional text."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = os.getenv("GEMINI_MODEL", "gemini-3.0-flash")
    ):
        """Initialize the Gemini analyzer using the new genai.Client."""
        if not GEMINI_AVAILABLE:
            raise ImportError("google-genai package not installed")
        
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("Gemini API key required. Set GEMINI_API_KEY environment variable.")
        
        self.model_name = model
        
        # New SDK Client initialization
        self.client = genai.Client(api_key=self.api_key)
        
        logger.info(f"Gemini analyzer initialized with model: {model}")
    
    def analyze(
        self,
        image_path: str,
        cv_metadata: str
    ) -> NutritionResult:
        """Analyze food nutrition from image file."""
        # Load image bytes and detect mime type
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")
            
        mime_type = self._get_mime_type(path.suffix)
        with open(path, "rb") as f:
            image_bytes = f.read()
            
        return self.analyze_from_bytes(image_bytes, cv_metadata, mime_type)
    
    def analyze_from_bytes(
        self,
        image_bytes: bytes,
        cv_metadata: str,
        mime_type: str = "image/jpeg"
    ) -> NutritionResult:
        """Analyze nutrition from image bytes using the new SDK syntax."""
        prompt = self.NUTRITION_PROMPT.format(cv_metadata=cv_metadata)
        
        try:
            # The new SDK handles content parts using types.Part
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    types.Part.from_text(text=prompt), # Explicit text part
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                ]
            )
            
            # Parse response
            result = self._parse_response(response.text)
            
            logger.info(f"Nutrition analysis complete: {result.total_calories:.0f} total calories")
            return result
            
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            raise

    def _get_mime_type(self, suffix: str) -> str:
        """Helper to map file extensions to MIME types."""
        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }
        return mime_types.get(suffix.lower(), "image/jpeg")
    
    def _parse_response(self, response_text: str) -> NutritionResult:
        """Parse Gemini response into NutritionResult."""
        # Clean response (remove markdown code blocks)
        text = response_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            return NutritionResult(
                food_items=[], total_calories=0, total_protein_g=0,
                total_carbs_g=0, total_fat_g=0,
                analysis_notes="Failed to parse response", raw_response=response_text
            )
        
        # Parse food items
        food_items = [
            NutritionInfo(
                food_name=item.get("food_name", "Unknown"),
                serving_size=item.get("serving_size", "1 serving"),
                calories=float(item.get("calories", 0)),
                protein_g=float(item.get("protein_g", 0)),
                carbohydrates_g=float(item.get("carbohydrates_g", 0)),
                fat_g=float(item.get("fat_g", 0)),
                fiber_g=float(item.get("fiber_g", 0)),
                sugar_g=float(item.get("sugar_g", 0)),
                sodium_mg=float(item.get("sodium_mg", 0)),
                confidence=item.get("confidence", "medium"),
                notes=item.get("notes")
            ) for item in data.get("food_items", [])
        ]
        
        totals = data.get("total_nutrition", {})
        
        return NutritionResult(
            food_items=food_items,
            total_calories=float(totals.get("calories", sum(f.calories for f in food_items))),
            total_protein_g=float(totals.get("protein_g", sum(f.protein_g for f in food_items))),
            total_carbs_g=float(totals.get("carbohydrates_g", sum(f.carbohydrates_g for f in food_items))),
            total_fat_g=float(totals.get("fat_g", sum(f.fat_g for f in food_items))),
            analysis_notes=data.get("analysis_notes", ""),
            raw_response=response_text
        )