"""
Ingredient Extractor - Extract ingredients from ingredient images using Gemini

Uses Google Gemini's vision capabilities to identify raw ingredients from images
(e.g., grocery items on a table, ingredients in containers, etc.)
"""

import base64
import json
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from pathlib import Path
from loguru import logger

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-generativeai not installed")


@dataclass
class Ingredient:
    """Represents a single ingredient."""
    name: str
    quantity: Optional[str] = None
    unit: Optional[str] = None
    confidence: str = "medium"  # high, medium, low
    notes: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "quantity": self.quantity,
            "unit": self.unit,
            "confidence": self.confidence,
            "notes": self.notes,
        }


@dataclass
class IngredientList:
    """List of detected ingredients from an ingredient image."""
    ingredients: List[Ingredient]
    analysis_confidence: str = "medium"
    analysis_summary: Optional[str] = None
    raw_response: str = ""
    total_items_found: int = field(default=0)
    
    def __post_init__(self):
        if not self.total_items_found:
            self.total_items_found = len(self.ingredients)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "ingredients": [ing.to_dict() for ing in self.ingredients],
            "analysis_confidence": self.analysis_confidence,
            "summary": self.analysis_summary,
            "total_items_found": self.total_items_found,
        }
    
    def get_ingredient_names(self) -> List[str]:
        """Get list of ingredient names only (lowercase)."""
        return [ing.name.lower() for ing in self.ingredients]


class IngredientExtractor:
    """
    Extract raw ingredients from ingredient images using Google Gemini API.
    
    Works with images of:
    - Grocery items on a table
    - Ingredients in containers/bowls
    - Fridge/pantry contents
    - Market hauls
    """
    
    INGREDIENT_PROMPT = """You are a professional chef and nutritionist analyzing raw ingredients.
    
## Your Task:
Analyze this image and identify ALL VISIBLE RAW INGREDIENTS. This could be:
- Vegetables and fruits
- Proteins (chicken, beef, fish, tofu, eggs, etc.)
- Grains and pasta
- Dairy products
- Spices and seasonings
- Oils and sauces
- Any other food items

## Important Guidelines:
1. ONLY identify raw/uncooked ingredients, NOT prepared dishes
2. Be comprehensive - list every item you can see
3. Estimate quantities only if clearly visible (e.g., "2 lbs", "1 bunch")
4. Include both obvious and subtle ingredients
5. If uncertain about an item, include it with lower confidence
6. Focus on identifying what CAN BE USED in recipes

## Response Format (JSON ONLY - no other text):
{{
    "ingredients": [
        {{
            "name": "ingredient name (e.g., 'chicken breast', 'broccoli', 'olive oil')",
            "quantity": "estimated quantity or null if unclear",
            "unit": "kg/lbs/piece/bunch/cup/tbsp or null",
            "confidence": "high/medium/low",
            "notes": "any notes (e.g., 'fresh', 'frozen', 'organic') or null"
        }}
    ],
    "analysis_confidence": "high/medium/low (overall confidence in the analysis)",
    "summary": "Brief description of what ingredients are visible"
}}

RESPOND WITH VALID JSON ONLY."""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.0-flash"):
        """
        Initialize the Ingredient Extractor.
        
        Args:
            api_key: Google Gemini API key (from env if None)
            model: Gemini model to use
        """
        if not GEMINI_AVAILABLE:
            raise ImportError("google-generativeai required. Install with: pip install google-generativeai")
        
        import os
        api_key = api_key or os.getenv("GEMINI_API_KEY")
        
        if not api_key:
            raise ValueError("GEMINI_API_KEY not provided and not in environment")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)
        self.model_name = model
        logger.info(f"Ingredient Extractor initialized with model: {model}")
    
    def extract_from_file(self, image_path: str) -> IngredientList:
        """
        Extract ingredients from an image file.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            IngredientList with detected ingredients
        """
        try:
            image_path = Path(image_path)
            if not image_path.exists():
                raise FileNotFoundError(f"Image not found: {image_path}")
            
            logger.info(f"Extracting ingredients from: {image_path}")
            
            # Read and encode image
            with open(image_path, "rb") as f:
                image_data = base64.standard_b64encode(f.read()).decode("utf-8")
            
            suffix = image_path.suffix.lower()
            mime_type = self._get_mime_type(suffix)
            
            # Call Gemini
            response = self.model.generate_content([
                {
                    "role": "user",
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": image_data,
                            }
                        },
                        self.INGREDIENT_PROMPT
                    ]
                }
            ])
            
            return self._parse_response(response.text)
            
        except Exception as e:
            logger.error(f"Ingredient extraction failed: {e}")
            raise
    
    def extract_from_numpy(self, image_array, image_format: str = "jpeg") -> IngredientList:
        """
        Extract ingredients from a numpy array (in-memory image).
        
        Args:
            image_array: NumPy array of image data
            image_format: Image format (jpeg, png, etc)
            
        Returns:
            IngredientList with detected ingredients
        """
        try:
            import cv2
            import io
            
            # Encode numpy array to bytes
            success, buffer = cv2.imencode(f'.{image_format}', image_array)
            if not success:
                raise ValueError("Failed to encode image array")
            
            image_data = base64.standard_b64encode(buffer).decode("utf-8")
            mime_type = f"image/{image_format}"
            
            logger.info(f"Extracting ingredients from numpy array (format: {image_format})")
            
            # Call Gemini
            response = self.model.generate_content([
                {
                    "role": "user",
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": image_data,
                            }
                        },
                        self.INGREDIENT_PROMPT
                    ]
                }
            ])
            
            return self._parse_response(response.text)
            
        except Exception as e:
            logger.error(f"Ingredient extraction from array failed: {e}")
            raise
    
    def _parse_response(self, response_text: str) -> IngredientList:
        """Parse Gemini response into IngredientList."""
        try:
            # Clean response - remove markdown code blocks if present
            cleaned = response_text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned[cleaned.find("{"):cleaned.rfind("}")+1]
            
            data = json.loads(cleaned)
            
            # Parse ingredients
            ingredients = []
            for ing_data in data.get("ingredients", []):
                name = ing_data.get("name", "").strip().lower()
                if name:  # Only add non-empty ingredients
                    ingredients.append(Ingredient(
                        name=name,
                        quantity=ing_data.get("quantity"),
                        unit=ing_data.get("unit"),
                        confidence=ing_data.get("confidence", "medium"),
                        notes=ing_data.get("notes"),
                    ))
            
            result = IngredientList(
                ingredients=ingredients,
                analysis_confidence=data.get("analysis_confidence", "medium"),
                analysis_summary=data.get("summary"),
                raw_response=response_text,
                total_items_found=len(ingredients),
            )
            
            logger.info(f"Extracted {len(ingredients)} ingredients")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            raise ValueError(f"Invalid response format from Gemini: {e}")
    
    @staticmethod
    def _get_mime_type(file_suffix: str) -> str:
        """Get MIME type from file suffix."""
        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        return mime_types.get(file_suffix.lower(), "image/jpeg")
