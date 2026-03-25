"""
Ingredient Extractor - Extract ingredients with precise measurements using ArUco scale

Uses:
- Google Gemini's vision capabilities to identify raw ingredients
- ArUco marker scale reference to measure ingredient portions (e.g., 10g, 250ml)
- Computer Vision analysis for accurate quantity estimation
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
    """Represents a measured ingredient with quantity and unit."""
    name: str  # e.g., "lettuce", "chicken breast"
    quantity_value: Optional[float] = None  # e.g., 10.0, 250.0
    unit: Optional[str] = None  # e.g., "g", "ml", "cup", "oz", "piece"
    confidence: str = "medium"  # high, medium, low (confidence in quantity estimate)
    measurement_method: str = "aruco_scale"  # How was it measured
    notes: Optional[str] = None  # e.g., "fresh", "frozen", "diced"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "quantity_value": self.quantity_value,
            "unit": self.unit,
            "quantity_display": self.get_display_string(),
            "confidence": self.confidence,
            "measurement_method": self.measurement_method,
            "notes": self.notes,
        }
    
    def get_display_string(self) -> str:
        """Return formatted string like '10g' or '250ml' or '2 cups'."""
        if self.quantity_value is None or self.unit is None:
            return self.name
        # Format with appropriate decimal places
        if self.quantity_value == int(self.quantity_value):
            return f"{int(self.quantity_value)}{self.unit} {self.name}"
        else:
            return f"{self.quantity_value:.1f}{self.unit} {self.name}"
    
    def has_sufficient_amount(self, required_quantity: float, required_unit: str) -> bool:
        """
        Check if this ingredient has sufficient quantity for a recipe.
        
        Simplified comparison (assumes same unit for now).
        In production, would need proper unit conversion.
        """
        if self.quantity_value is None or self.unit is None:
            return False
        
        # Basic unit normalization for comparison
        if self.unit.lower() == required_unit.lower():
            return self.quantity_value >= required_quantity
        
        # Common conversions
        conversions = {
            ("ml", "l"): 1000,
            ("g", "kg"): 1000,
            ("mg", "g"): 1000,
        }
        
        key = (self.unit.lower(), required_unit.lower())
        if key in conversions:
            return (self.quantity_value / conversions[key]) >= required_quantity
        
        # If units don't match and no conversion, assume sufficient
        logger.warning(f"Cannot convert {self.unit} to {required_unit}")
        return True


@dataclass
class IngredientList:
    """List of measured ingredients from an ingredient image with ArUco scale."""
    ingredients: List[Ingredient]
    cv_metadata: Optional[str] = None  # CV pipeline metadata (scale info)
    aruco_scale_info: Optional[Dict[str, Any]] = None  # ArUco detection details
    analysis_confidence: str = "medium"
    analysis_summary: Optional[str] = None
    raw_response: str = ""
    total_items_found: int = field(default=0)
    total_weight_estimate: Optional[str] = None  # e.g., "1.2 kg total"
    
    
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

## Important: Use the ArUco Scale Information
If ArUco marker scale information is provided, use it to estimate PRECISE INGREDIENT QUANTITIES.
The scale allows you to measure actual weights and volumes!

## Your Task:
Analyze this image and identify ALL VISIBLE RAW INGREDIENTS with MEASURED QUANTITIES.
For each ingredient:
1. IDENTIFY the ingredient name
2. ESTIMATE the quantity using the ArUco scale (if provided)
3. Determine the appropriate unit (g, ml, oz, cup, piece, etc.)

This could include:
- Vegetables and fruits (measure weight in grams: "200g lettuce")
- Proteins (measure weight: "500g chicken breast", "3 eggs")
- Grains and pasta (measure weight: "250g rice")
- Dairy products (measure volume: "200ml milk", or weight: "100g cheese")
- Oils and sauces (measure volume: "30ml olive oil")
- Spices and seasonings (measure weight: "5g salt")

## Important Guidelines:
1. ONLY identify raw/uncooked ingredients, NOT prepared dishes
2. BE SPECIFIC with quantities - use actual numbers (grams, ml, cups, etc.)
3. If ArUco scale is provided, estimate weights/volumes based on the reference
4. If no scale, estimate based on visual comparison with common objects
5. Use metric units where possible (g, ml)
6. For countable items, use "piece" unit and number (e.g., "2 piece" for eggs)
7. Include estimation confidence (high/medium/low) based on clarity

## Response Format (JSON ONLY - no other text):
{{
    "ingredients": [
        {{
            "name": "ingredient name (e.g., 'lettuce', 'chicken breast')",
            "quantity_value": 10.0,
            "unit": "g/ml/oz/cup/piece/tbsp/tsp",
            "confidence": "high/medium/low",
            "measurement_method": "aruco_scale/visual_estimate",
            "notes": "any notes (e.g., 'fresh', 'diced') or null"
        }}
    ],
    "analysis_confidence": "high/medium/low (overall confidence in measurements)",
    "summary": "Brief description with total weight/volume estimate",
    "total_weight_estimate_g": 1200,
    "aruco_scale_reference": "Description of how ArUco was used"
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
    
    def extract_from_file(self, image_path: str, cv_metadata: Optional[dict] = None) -> IngredientList:
        """
        Extract ingredients from an image file with optional CV metadata.
        
        Args:
            image_path: Path to the image file
            cv_metadata: Optional dict with CV analysis results:
                - 'aruco_scale_cm_per_pixel': float (scale from ArUco detection)
                - 'detected_aruco_markers': list of marker IDs
                - 'image_metadata': dict with image dimensions/metadata
            
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
    
    def extract_from_numpy(self, image_array, image_format: str = "jpeg", cv_metadata: Optional[dict] = None) -> IngredientList:
        """
        Extract ingredients from a numpy array (in-memory image).
        
        Args:
            image_array: NumPy array of image data
            image_format: Image format (jpeg, png, etc)
            cv_metadata: Optional dict with CV analysis results:
                - 'aruco_scale_cm_per_pixel': float (scale from ArUco detection)
                - 'detected_aruco_markers': list of marker IDs
                - 'image_metadata': dict with image dimensions/metadata
            
        Returns:
            IngredientList with detected ingredients and measurements
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
                        quantity_value=ing_data.get("quantity_value"),  # float like 10.0
                        unit=ing_data.get("unit"),  # string like "g", "ml", "piece"
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
