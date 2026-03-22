"""
Google Gemini Nutrition Analyzer

Uses Gemini's vision capabilities combined with CV metadata
to provide accurate nutrition information.
"""

import os
import re
import base64
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from pathlib import Path
from loguru import logger

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-generativeai not installed. Install with: pip install google-generativeai")


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
    backend_data: Dict[str, Any] = field(default_factory=dict)

    def to_backend_data(self) -> Dict[str, Any]:
        """Return a backend-friendly payload for persistence."""
        return self.backend_data


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
        model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    ):
        """
        Initialize the Gemini analyzer.
        
        Args:
            api_key: Google Gemini API key (or set GEMINI_API_KEY env var)
            model: Gemini model to use
        """
        if not GEMINI_AVAILABLE:
            raise ImportError("google-generativeai package not installed")
        
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("Gemini API key required. Set GEMINI_API_KEY environment variable.")
        
        self.model_name = model
        
        # Configure Gemini
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.model_name)
        
        logger.info(f"Gemini analyzer initialized with model: {model}")
    
    def analyze(
        self,
        image_path: str,
        cv_metadata: str
    ) -> NutritionResult:
        """
        Analyze food nutrition from image with CV metadata.
        
        Args:
            image_path: Path to the food image
            cv_metadata: Metadata text from CV pipeline
            
        Returns:
            NutritionResult with detailed nutrition info
        """
        # Load and encode image
        image_data = self._load_image(image_path)
        
        # Create prompt with CV metadata
        prompt = self.NUTRITION_PROMPT.format(cv_metadata=cv_metadata)
        
        try:
            # Call Gemini API
            response = self.model.generate_content([
                prompt,
                image_data
            ])
            
            # Parse response
            result = self._parse_response(response.text)
            
            logger.info(f"Nutrition analysis complete: {result.total_calories:.0f} total calories")
            return result
            
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            raise
    
    def analyze_from_bytes(
        self,
        image_bytes: bytes,
        cv_metadata: str,
        mime_type: str = "image/jpeg"
    ) -> NutritionResult:
        """
        Analyze nutrition from image bytes.
        
        Args:
            image_bytes: Image data as bytes
            cv_metadata: Metadata text from CV pipeline
            mime_type: Image MIME type
            
        Returns:
            NutritionResult with detailed nutrition info
        """
        # Create image part
        image_data = {
            "inline_data": {
                "mime_type": mime_type,
                "data": base64.b64encode(image_bytes).decode("utf-8")
            }
        }
        
        prompt = self.NUTRITION_PROMPT.format(cv_metadata=cv_metadata)
        
        try:
            response = self.model.generate_content([
                prompt,
                image_data
            ])
            
            return self._parse_response(response.text)
            
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}")
            raise
    
    def _load_image(self, image_path: str) -> Dict[str, Any]:
        """Load image and prepare for Gemini API."""
        path = Path(image_path)
        
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")
        
        # Determine MIME type
        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif"
        }
        mime_type = mime_types.get(path.suffix.lower(), "image/jpeg")
        
        # Read and encode
        with open(path, "rb") as f:
            image_bytes = f.read()
        
        # Use the 'inline_data' wrapper required by the Gemini SDK
        return {
            "inline_data": {
                "mime_type": mime_type,
                "data": base64.b64encode(image_bytes).decode("utf-8")
            }
        }
    
    def _parse_response(self, response_text: str) -> NutritionResult:
        """Parse Gemini response into NutritionResult."""
        data = None

        # Try multiple extraction strategies in order of reliability.
        # 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
        stripped = response_text.strip()
        if stripped.startswith("```"):
            fence_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', stripped, re.DOTALL)
            if fence_match:
                try:
                    data = json.loads(fence_match.group(1))
                except json.JSONDecodeError:
                    pass

        # 2. The whole (stripped) text is JSON
        if data is None:
            try:
                data = json.loads(stripped)
            except json.JSONDecodeError:
                pass

        # 3. Find the outermost JSON object in the text (greedy – first '{' to last '}')
        #    This handles Gemini prepending introductory sentences before the JSON.
        if data is None:
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass

        if data is None:
            logger.error("Failed to parse Gemini response as JSON")
            logger.debug(f"Raw response (first 500 chars): {response_text[:500]}")
            return NutritionResult(
                food_items=[],
                total_calories=0,
                total_protein_g=0,
                total_carbs_g=0,
                total_fat_g=0,
                analysis_notes="Failed to parse response",
                raw_response=response_text,
                backend_data={
                    "items": [],
                    "summary": {
                        "food_name": "Unknown meal",
                        "calories": 0,
                        "carbs": 0,
                        "protein": 0,
                        "fats": 0,
                        "fiber": 0,
                        "sodium": 0,
                        "notes": "Failed to parse response"
                    }
                }
            )
        
        # Parse food items
        food_items = []
        for item in data.get("food_items", []):
            nutrition = NutritionInfo(
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
            )
            food_items.append(nutrition)
        
        # Get totals
        totals = data.get("total_nutrition", {})
        
        backend_items = [
            {
                "food_name": item.food_name,
                "calories": item.calories,
                "carbs": item.carbohydrates_g,
                "protein": item.protein_g,
                "fats": item.fat_g,
                "fiber": item.fiber_g,
                "sodium": item.sodium_mg,
                "notes": item.notes
            }
            for item in food_items
        ]

        return NutritionResult(
            food_items=food_items,
            total_calories=float(totals.get("calories", sum(f.calories for f in food_items))),
            total_protein_g=float(totals.get("protein_g", sum(f.protein_g for f in food_items))),
            total_carbs_g=float(totals.get("carbohydrates_g", sum(f.carbohydrates_g for f in food_items))),
            total_fat_g=float(totals.get("fat_g", sum(f.fat_g for f in food_items))),
            analysis_notes=data.get("analysis_notes", ""),
            raw_response=response_text,
            backend_data={
                "items": backend_items,
                "summary": {
                    "food_name": ", ".join([item.food_name for item in food_items]) or "Detected meal",
                    "calories": float(totals.get("calories", sum(f.calories for f in food_items))),
                    "carbs": float(totals.get("carbohydrates_g", sum(f.carbohydrates_g for f in food_items))),
                    "protein": float(totals.get("protein_g", sum(f.protein_g for f in food_items))),
                    "fats": float(totals.get("fat_g", sum(f.fat_g for f in food_items))),
                    "fiber": float(sum(f.fiber_g for f in food_items)),
                    "sodium": float(sum(f.sodium_mg for f in food_items)),
                    "notes": data.get("analysis_notes", "")
                }
            }
        )
