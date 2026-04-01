"""
Ingredient Extractor - Extract ingredients from images with ArUco measurements

Uses Google Gemini vision API to detect ingredients with measured quantities.
Integrates with ArUco markers for precise scale reference.
"""

import base64
import json
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from pathlib import Path
from loguru import logger

import google.generativeai as genai


@dataclass
class Ingredient:
    """An ingredient with measured quantity."""
    name: str
    quantity_value: Optional[float] = None  # e.g., 10.0
    unit: Optional[str] = None              # e.g., "g", "ml", "piece"
    confidence: str = "medium"
    measurement_method: str = "aruco_scale"
    
    def has_sufficient_amount(self, required_quantity: float, required_unit: str) -> bool:
        """Check if this ingredient has sufficient amount for a recipe."""
        if self.quantity_value is None:
            return False
        # Simple comparison (same units)
        return self.quantity_value >= required_quantity
    
    def get_display_string(self) -> str:
        """Get formatted display string for ingredient."""
        if self.quantity_value and self.unit:
            return f"{self.quantity_value}{self.unit} {self.name}"
        return self.name
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "quantity_value": self.quantity_value,
            "unit": self.unit,
            "confidence": self.confidence,
            "measurement_method": self.measurement_method,
        }


@dataclass
class IngredientList:
    """List of detected ingredients with analysis metadata."""
    ingredients: List[Ingredient]
    analysis_confidence: str = "medium"
    analysis_summary: Optional[str] = None
    raw_response: Optional[str] = None
    total_items_found: int = 0
    total_weight_estimate_g: Optional[float] = None
    aruco_scale_info: Optional[Dict[str, Any]] = None
    cv_metadata: Dict[str, Any] = field(default_factory=dict)
    
    def get_ingredient_names(self) -> List[str]:
        """Get list of ingredient names only."""
        return [ing.name for ing in self.ingredients]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "ingredients": [ing.to_dict() for ing in self.ingredients],
            "analysis_confidence": self.analysis_confidence,
            "analysis_summary": self.analysis_summary,
            "total_items_found": self.total_items_found,
            "total_weight_estimate_g": self.total_weight_estimate_g,
            "aruco_scale_info": self.aruco_scale_info,
        }


class IngredientExtractor:
    """Extract ingredients from images using Google Gemini vision API."""
    
    # Updated prompt that requests measured quantities
    INGREDIENT_PROMPT = """Analyze this image to identify all visible raw ingredients.

For each ingredient, provide:
1. Ingredient name (be specific, e.g., "butter" not "dairy")
2. Estimated quantity value (as a number, e.g., 10.0)
3. Unit of measurement (g, ml, piece, cup, tbsp, tsp, oz, or other)
4. Measurement method (aruco_scale if using ArUco reference, visual_estimate otherwise)
5. Confidence level (high, medium, low)

IMPORTANT: Provide measurement quantities whenever possible!
If you see an ArUco marker in the image, use it as a scale reference to measure ingredient amounts.

Return response as JSON in this format (ONLY JSON, no other text):
{
  "ingredients": [
    {
      "name": "lettuce",
      "quantity_value": 10.0,
      "unit": "g",
      "confidence": "high",
      "measurement_method": "aruco_scale"
    },
    {
      "name": "tomato",
      "quantity_value": 150.0,
      "unit": "g",
      "confidence": "medium",
      "measurement_method": "aruco_scale"
    }
  ],
  "total_weight_estimate_g": 1200,
  "analysis_confidence": "high",
  "summary": "Multiple fresh salad ingredients detected with ArUco-based measurements"
}"""

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.0-flash"):
        """
        Initialize the ingredient extractor.
        
        Args:
            api_key: Google Gemini API key (uses GEMINI_API_KEY env var if None)
            model: Model to use for vision tasks
        """
        import os
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model_name = model
        
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(model)
            logger.info(f"Ingredient extractor initialized with {model}")
        else:
            logger.warning("GEMINI_API_KEY not configured")
    
    def extract_from_file(
        self,
        image_path: str,
        cv_metadata: Optional[dict] = None
    ) -> IngredientList:
        """
        Extract ingredients from an image file with optional CV metadata.
        
        Args:
            image_path: Path to the image file
            cv_metadata: Optional dict with CV analysis results (ArUco scale info)
            
        Returns:
            IngredientList with detected ingredients and measurements
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
            
            # Prepare prompt with CV metadata if available
            prompt = self._prepare_prompt(cv_metadata)
            
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
                        prompt
                    ]
                }
            ])
            
            return self._parse_response(response.text, cv_metadata)
            
        except Exception as e:
            logger.error(f"Ingredient extraction failed: {e}")
            raise
    
    def extract_from_numpy(
        self,
        image_array,
        image_format: str = "jpeg",
        cv_metadata: Optional[dict] = None
    ) -> IngredientList:
        """
        Extract ingredients from a numpy array (in-memory image).
        
        Args:
            image_array: NumPy array of image data
            image_format: Image format (jpeg, png, etc)
            cv_metadata: Optional dict with CV analysis results (ArUco scale info)
            
        Returns:
            IngredientList with detected ingredients and measurements
        """
        try:
            import cv2
            
            # Encode numpy array to bytes
            success, buffer = cv2.imencode(f'.{image_format}', image_array)
            if not success:
                raise ValueError("Failed to encode image array")
            
            image_data = base64.standard_b64encode(buffer).decode("utf-8")
            mime_type = f"image/{image_format}"
            
            logger.info(f"Extracting ingredients from numpy array (format: {image_format})")
            
            # Prepare prompt with CV metadata if available
            prompt = self._prepare_prompt(cv_metadata)
            
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
                        prompt
                    ]
                }
            ])
            
            return self._parse_response(response.text, cv_metadata)
            
        except Exception as e:
            logger.error(f"Ingredient extraction from array failed: {e}")
            raise
    
    def _parse_response(self, response_text: str, cv_metadata: Optional[dict] = None) -> IngredientList:
        """Parse Gemini response into IngredientList with measured quantities."""
        try:
            # Clean response - remove markdown code blocks if present
            cleaned = response_text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned[cleaned.find("{"):cleaned.rfind("}")+1]
            
            data = json.loads(cleaned)
            
            # Parse ingredients with measured quantities
            ingredients = []
            for ing_data in data.get("ingredients", []):
                name = ing_data.get("name", "").strip().lower()
                if name:  # Only add non-empty ingredients
                    ingredients.append(Ingredient(
                        name=name,
                        quantity_value=ing_data.get("quantity_value"),
                        unit=ing_data.get("unit"),
                        confidence=ing_data.get("confidence", "medium"),
                        measurement_method=ing_data.get("measurement_method", "visual_estimate"),
                    ))
            
            # Extract ArUco scale info if available
            aruco_scale_info = None
            if cv_metadata and "aruco_scale_cm_per_pixel" in cv_metadata:
                aruco_scale_info = {
                    "scale_cm_per_pixel": cv_metadata["aruco_scale_cm_per_pixel"],
                    "markers_detected": cv_metadata.get("detected_aruco_markers", []),
                }
            
            result = IngredientList(
                ingredients=ingredients,
                analysis_confidence=data.get("analysis_confidence", "medium"),
                analysis_summary=data.get("summary"),
                raw_response=response_text,
                total_items_found=len(ingredients),
                total_weight_estimate_g=data.get("total_weight_estimate_g"),
                aruco_scale_info=aruco_scale_info,
                cv_metadata=cv_metadata or {},
            )
            
            logger.info(f"Extracted {len(ingredients)} ingredients with measurements")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            raise ValueError(f"Invalid response format from Gemini: {e}")
    
    def _prepare_prompt(self, cv_metadata: Optional[dict] = None) -> str:
        """
        Prepare the ingredient extraction prompt with optional CV metadata context.
        
        Args:
            cv_metadata: Optional dict with CV analysis results
            
        Returns:
            Complete prompt string for Gemini
        """
        prompt = self.INGREDIENT_PROMPT
        
        if cv_metadata and "aruco_scale_cm_per_pixel" in cv_metadata:
            scale = cv_metadata["aruco_scale_cm_per_pixel"]
            markers = cv_metadata.get("detected_aruco_markers", [])
            
            cv_context = f"""
IMPORTANT: ArUco scale reference detected in this image.
- Scale: 1 pixel = {scale:.4f} cm (or {scale*10:.2f} mm)
- Detected ArUco markers: {', '.join(map(str, markers)) if markers else 'Multiple markers'}

Use this scale to provide highly accurate measurements in grams or milliliters.
Convert visual estimates to precise quantities using this scale reference."""
            
            prompt = prompt + "\n" + cv_context
        
        return prompt
    
    @staticmethod
    def _get_mime_type(suffix: str) -> str:
        """Get MIME type from file suffix."""
        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
        }
        return mime_types.get(suffix.lower(), "image/jpeg")
