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


@dataclass
class MealAdvice:
    """Personalized meal advice analyzing if meal exceeds targets."""
    verdict: str  # "GOOD", "CAUTION", "BAD"
    justification: str
    tips: List[str]
    analysis_notes: str  # Detailed analysis of whether meal exceeds targets
    notes: str  # Suggestions and recommendations
    calorie_percentage: float
    will_exceed_targets: Dict[str, bool]  # Which targets will be exceeded
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

    def get_meal_advice(
        self,
        user_profile: Dict[str, Any],
        meal_data: Dict[str, Any],
        daily_totals: Dict[str, Any],
        daily_targets: Dict[str, Any]
    ) -> MealAdvice:
        """
        Provide personalized meal advice analyzing if meal will exceed user's daily targets.
        
        Gemini analyzes:
        1. Whether meal will exceed calorie, protein, carbs, fats, sodium targets
        2. If meal is good or bad for user's profile and goals
        3. Returns verdict + suggestions as notes and analysis_notes
        
        Args:
            user_profile: {age, gender, goals, restrictions, dislikes}
            meal_data: {food_name, calories, protein, carbs, fats, fiber, sodium}
            daily_totals: Daily intake before this meal
            daily_targets: Daily nutrition targets
            
        Returns:
            MealAdvice with detailed analysis
        """
        # Calculate which targets will be exceeded
        will_exceed = {
            "calories": (daily_totals.get("total_calories", 0) + meal_data.get("calories", 0)) > daily_targets.get("calories", 2000),
            "protein": (daily_totals.get("total_protein_g", 0) + meal_data.get("protein", 0)) > daily_targets.get("protein_g", 50),
            "carbs": (daily_totals.get("total_carbs_g", 0) + meal_data.get("carbs", 0)) > daily_targets.get("carbs_g", 300),
            "fats": (daily_totals.get("total_fats_g", 0) + meal_data.get("fats", 0)) > daily_targets.get("fats_g", 65),
            "sodium": (daily_totals.get("total_sodium_mg", 0) + meal_data.get("sodium", 0)) > daily_targets.get("sodium_mg", 2300)
        }
        
        prompt = self._build_meal_advice_prompt(
            user_profile, meal_data, daily_totals, daily_targets, will_exceed
        )
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[types.Part.from_text(text=prompt)]
            )
            
            # Calculate calorie percentage
            total_cals = daily_totals.get("total_calories", 0) + meal_data.get("calories", 0)
            calorie_percent = (total_cals / daily_targets.get("calories", 2000)) * 100
            
            result = self._parse_meal_advice_response(response.text)
            result.calorie_percentage = calorie_percent
            result.will_exceed_targets = will_exceed
            
            logger.info(f"Meal advice generated: {result.verdict}")
            return result
            
        except Exception as e:
            logger.error(f"Meal advice generation failed: {e}")
            raise

    def _build_meal_advice_prompt(
        self,
        user_profile: Dict[str, Any],
        meal_data: Dict[str, Any],
        daily_totals: Dict[str, Any],
        daily_targets: Dict[str, Any],
        will_exceed: Dict[str, bool]
    ) -> str:
        """Build detailed prompt for Gemini to analyze if meal exceeds targets."""
        total_cals_after = daily_totals.get("total_calories", 0) + meal_data.get("calories", 0)
        total_protein_after = daily_totals.get("total_protein_g", 0) + meal_data.get("protein", 0)
        total_carbs_after = daily_totals.get("total_carbs_g", 0) + meal_data.get("carbs", 0)
        total_fats_after = daily_totals.get("total_fats_g", 0) + meal_data.get("fats", 0)
        total_sodium_after = daily_totals.get("total_sodium_mg", 0) + meal_data.get("sodium", 0)
        
        calorie_percent = (total_cals_after / daily_targets.get("calories", 2000)) * 100
        protein_percent = (total_protein_after / daily_targets.get("protein_g", 50)) * 100
        carbs_percent = (total_carbs_after / daily_targets.get("carbs_g", 300)) * 100
        fats_percent = (total_fats_after / daily_targets.get("fats_g", 65)) * 100
        
        exceed_summary = []
        if will_exceed["calories"]:
            exceed_summary.append(f"WILL EXCEED CALORIES: {calorie_percent:.0f}% of daily target")
        if will_exceed["protein"]:
            exceed_summary.append(f"WILL EXCEED PROTEIN: {protein_percent:.0f}% of daily target")
        if will_exceed["carbs"]:
            exceed_summary.append(f"WILL EXCEED CARBS: {carbs_percent:.0f}% of daily target")
        if will_exceed["fats"]:
            exceed_summary.append(f"WILL EXCEED FATS: {fats_percent:.0f}% of daily target")
        if will_exceed["sodium"]:
            exceed_summary.append(f"WILL EXCEED SODIUM: {total_sodium_after}/{daily_targets.get('sodium_mg')}mg")
        
        exceed_text = "\n".join(exceed_summary) if exceed_summary else "All nutritional targets will be within limits"
        
        return f"""You are a personalized nutrition advisor analyzing whether this meal is GOOD or BAD for a specific user based on their daily nutrition targets.

USER PROFILE:
- Age: {user_profile.get("age", "Unknown")}
- Gender: {user_profile.get("gender", "Unknown")}
- Goals: {", ".join(user_profile.get("goals", [])) or "General health"}
- Dietary Restrictions: {", ".join(user_profile.get("restrictions", [])) or "None"}
- Dislikes: {", ".join(user_profile.get("dislikes", [])) or "None"}

DAILY TARGETS (User's Goal):
- Calories: {daily_targets.get("calories", 2000)}
- Protein: {daily_targets.get("protein_g", 50)}g
- Carbs: {daily_targets.get("carbs_g", 300)}g
- Fats: {daily_targets.get("fats_g", 65)}g
- Sodium: {daily_targets.get("sodium_mg", 2300)}mg

TODAY'S INTAKE BEFORE THIS MEAL:
- Calories: {daily_totals.get("total_calories", 0)}/{daily_targets.get("calories", 2000)}
- Protein: {daily_totals.get("total_protein_g", 0)}/{daily_targets.get("protein_g", 50)}g
- Carbs: {daily_totals.get("total_carbs_g", 0)}/{daily_targets.get("carbs_g", 300)}g
- Fats: {daily_totals.get("total_fats_g", 0)}/{daily_targets.get("fats_g", 65)}g
- Sodium: {daily_totals.get("total_sodium_mg", 0)}/{daily_targets.get("sodium_mg", 2300)}mg
- Meals logged today: {daily_totals.get("meals_count", 0)}

NEW MEAL BEING ANALYZED:
- Food: {meal_data.get("food_name", "Food item")}
- Calories: {meal_data.get("calories", 0)}
- Protein: {meal_data.get("protein", 0)}g
- Carbs: {meal_data.get("carbs", 0)}g
- Fats: {meal_data.get("fats", 0)}g
- Fiber: {meal_data.get("fiber", 0)}g
- Sodium: {meal_data.get("sodium", 0)}mg

NUTRITIONAL IMPACT (AFTER THIS MEAL):
- Total Calories: {total_cals_after}/{daily_targets.get("calories", 2000)} ({calorie_percent:.0f}%)
- Total Protein: {total_protein_after}/{daily_targets.get("protein_g", 50)}g ({protein_percent:.0f}%)
- Total Carbs: {total_carbs_after}/{daily_targets.get("carbs_g", 300)}g ({carbs_percent:.0f}%)
- Total Fats: {total_fats_after}/{daily_targets.get("fats_g", 65)}g ({fats_percent:.0f}%)
- Total Sodium: {total_sodium_after}/{daily_targets.get("sodium_mg", 2300)}mg

TARGET EXCEEDANCE ANALYSIS:
{exceed_text}

CRITICAL TASK:
Analyze whether this meal is GOOD or BAD for this user. Consider:
1. Will the meal cause her to exceed nutritional targets?
2. Is the meal aligned with her goals (e.g., weight loss, muscle gain)?
3. Does it fit her dietary restrictions and preferences?
4. What are the pros and cons of eating this meal?

Respond with ONLY valid JSON (no markdown, no extra text):
{{
  "verdict": "GOOD|CAUTION|BAD",
  "justification": "2-3 sentence explanation of why this meal is good, caution, or bad",
  "tips": ["Specific actionable tip 1", "Specific actionable tip 2", "Specific actionable tip 3"],
  "analysis_notes": "Detailed analysis of which targets will be exceeded and the nutritional impact. Include specific numbers and percentages.",
  "notes": "Suggestions and recommendations for this user. What should they do? Should they eat this meal? What modifications could help?"
}}

IMPORTANT: Your analysis_notes must address TARGET EXCEEDANCE. Your notes must provide clear suggestions on whether to eat this meal and why."""

    def _parse_meal_advice_response(self, response_text: str) -> MealAdvice:
        """Parse Gemini meal advice response."""
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
            logger.error(f"Failed to parse meal advice response: {e}")
            return MealAdvice(
                verdict="NEUTRAL",
                justification="Unable to generate advice",
                tips=[],
                analysis_notes="Failed to parse response",
                notes="Please try again",
                calorie_percentage=0,
                will_exceed_targets={},
                raw_response=response_text
            )
        
        verdict = data.get("verdict", "NEUTRAL").upper()
        if verdict not in ["GOOD", "CAUTION", "BAD"]:
            verdict = "NEUTRAL"
        
        return MealAdvice(
            verdict=verdict,
            justification=data.get("justification", ""),
            tips=data.get("tips", []),
            analysis_notes=data.get("analysis_notes", ""),
            notes=data.get("notes", ""),
            calorie_percentage=0,  # Will be set by get_meal_advice
            will_exceed_targets={},  # Will be set by get_meal_advice
            raw_response=response_text
        )


class GeminiIngredientAnalyzer:
    """
    Ingredient Analyzer using Google Gemini API.

    Analyzes fridge or pantry photos to detect visible ingredients
    and suggest recipes that can be made with them.
    """

    INGREDIENT_PROMPT = """You are a kitchen assistant AI with expertise in food recognition.
Analyze this fridge or pantry photo carefully.

## Your Task:
1. Identify ALL visible food ingredients in the image.
2. Suggest exactly 3 practical recipes that can be made primarily with the detected ingredients.

## Response Format (JSON):
{
    "detected_ingredients": ["ingredient1", "ingredient2", "ingredient3"],
    "recipes": [
        {
            "title": "Recipe name",
            "description": "Brief, appetizing description of the dish",
            "missing_ingredients": ["any ingredient needed but not clearly visible"]
        },
        {
            "title": "Another recipe",
            "description": "Brief description",
            "missing_ingredients": []
        },
        {
            "title": "Third recipe",
            "description": "Brief description",
            "missing_ingredients": ["item1", "item2"]
        }
    ],
    "analysis_notes": "Any notes about detection confidence or image quality"
}

Respond ONLY with valid JSON, no additional text."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = os.getenv("GEMINI_MODEL", "gemini-3.0-flash")
    ):
        """Initialize the Gemini ingredient analyzer using the new genai.Client."""
        if not GEMINI_AVAILABLE:
            raise ImportError("google-genai package not installed")

        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("Gemini API key required. Set GEMINI_API_KEY environment variable.")

        self.model_name = model
        self.client = genai.Client(api_key=self.api_key)

        logger.info(f"Gemini ingredient analyzer initialized with model: {model}")

    def analyze_from_bytes(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg"
    ) -> dict:
        """Detect ingredients and suggest recipes from image bytes."""
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    types.Part.from_text(text=self.INGREDIENT_PROMPT),
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                ]
            )
            result = self._parse_response(response.text)
            logger.info(
                f"Ingredient analysis complete: {len(result.get('detected_ingredients', []))} ingredients detected"
            )
            return result
        except Exception as e:
            logger.error(f"Gemini ingredient analysis failed: {e}")
            raise

    def _parse_response(self, response_text: str) -> dict:
        """Parse Gemini response into a plain dict."""
        text = response_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini ingredient response as JSON: {e}")
            return {
                "detected_ingredients": [],
                "recipes": [],
                "analysis_notes": "Failed to parse response"
            }