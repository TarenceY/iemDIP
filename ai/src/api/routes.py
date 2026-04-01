"""
FastAPI Routes for Food Nutrition Analysis API.

Provides REST endpoints for image upload and nutrition analysis.
"""

import os
import tempfile
import base64
from typing import Optional
from pathlib import Path
from datetime import datetime

import numpy as np

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from loguru import logger

from ..pipeline import FoodNutritionPipeline
from ..gemini_layer.gemini_client import GeminiIngredientAnalyzer


# Response Models
class NutritionItem(BaseModel):
    food_name: str
    serving_size: str
    calories: float
    protein_g: float
    carbohydrates_g: float
    fat_g: float
    fiber_g: float
    sugar_g: float
    sodium_mg: float
    confidence: str
    notes: Optional[str] = None


class NutritionTotals(BaseModel):
    calories: float
    protein_g: float
    carbohydrates_g: float
    fat_g: float


class CVFoodItem(BaseModel):
    name: str
    confidence: float
    bbox: tuple
    width_cm: Optional[float]
    height_cm: Optional[float]
    diameter_cm: Optional[float]


class AnalysisResponse(BaseModel):
    success: bool
    timestamp: str
    cv_analysis: dict
    nutrition: dict
    annotated_image_base64: Optional[str] = None
    error: Optional[str] = None


def _to_json_safe(value):
    """Recursively convert NumPy types into JSON-serializable Python types."""
    if isinstance(value, np.generic):
        return value.item()
    if isinstance(value, np.ndarray):
        return value.tolist()
    if isinstance(value, dict):
        return {k: _to_json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_json_safe(v) for v in value]
    return value


def create_app(
    gemini_api_key: Optional[str] = None,
    cors_origins: list = ["*"]
) -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Args:
        gemini_api_key: Google Gemini API key
        cors_origins: Allowed CORS origins
        
    Returns:
        Configured FastAPI application
    """
    app = FastAPI(
        title="Food Nutrition Analysis API",
        description="Analyze food images for nutrition information using CV + Gemini AI",
        version="1.0.0"
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Initialize pipeline (lazy loading)
    pipeline: Optional[FoodNutritionPipeline] = None
    
    def get_pipeline() -> FoodNutritionPipeline:
        nonlocal pipeline
        if pipeline is None:
            api_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
            pipeline = FoodNutritionPipeline(gemini_api_key=api_key)
        return pipeline
    
    @app.get("/")
    async def root():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "service": "Food Nutrition Analysis API",
            "version": "1.0.0"
        }
    
    @app.get("/health")
    async def health_check():
        """Detailed health check."""
        return {
            "status": "healthy",
            "gemini_configured": bool(os.getenv("GEMINI_API_KEY") or gemini_api_key),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @app.post("/api/analyze", response_model=AnalysisResponse)
    async def analyze_food(
        image: UploadFile = File(...),
        include_annotated: bool = Form(default=True)
    ):
        """
        Analyze a food image for nutrition information.
        
        - **image**: Food image file (jpg, png, webp)
        - **include_annotated**: Include base64 annotated image in response
        
        Returns nutrition analysis with CV detection data.
        """
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {allowed_types}"
            )
        
        try:
            # Save uploaded image temporarily
            with tempfile.NamedTemporaryFile(
                suffix=Path(image.filename).suffix,
                delete=False
            ) as tmp:
                content = await image.read()
                tmp.write(content)
                tmp_path = tmp.name
            
            # Run analysis
            pipe = get_pipeline()
            result = pipe.analyze(
                image_path=tmp_path,
                save_annotated=include_annotated
            )
            
            # Encode annotated image if available
            annotated_base64 = None
            if include_annotated and result.annotated_image_path:
                with open(result.annotated_image_path, "rb") as f:
                    annotated_base64 = base64.b64encode(f.read()).decode()
                # Clean up annotated image
                Path(result.annotated_image_path).unlink(missing_ok=True)
            
            # Clean up temp file
            Path(tmp_path).unlink(missing_ok=True)
            
            return AnalysisResponse(
                success=result.success,
                timestamp=datetime.utcnow().isoformat(),
                cv_analysis=_to_json_safe(result.cv_data),
                nutrition=_to_json_safe(result.nutrition_data),
                annotated_image_base64=annotated_base64,
                error=result.error
            )
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/cv-only")
    async def cv_analysis_only(image: UploadFile = File(...)):
        """
        Run only Computer Vision analysis (no Gemini).
        
        Useful for testing CV pipeline or when Gemini API is not available.
        """
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {allowed_types}"
            )
        
        try:
            with tempfile.NamedTemporaryFile(
                suffix=Path(image.filename).suffix,
                delete=False
            ) as tmp:
                content = await image.read()
                tmp.write(content)
                tmp_path = tmp.name
            
            pipe = get_pipeline()
            cv_result = pipe.get_cv_only(tmp_path)
            
            # Clean up
            Path(tmp_path).unlink(missing_ok=True)
            
            return {
                "success": True,
                "timestamp": datetime.utcnow().isoformat(),
                "cv_analysis": _to_json_safe(pipe.cv_pipeline.get_detection_summary(cv_result)),
                "metadata_text": cv_result.metadata_text
            }
            
        except Exception as e:
            logger.error(f"CV analysis failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/analyze-ingredients")
    async def analyze_ingredients(image: UploadFile = File(...)):
        """
        Analyze a fridge or pantry image for visible ingredients and recipe suggestions.

        - **image**: Fridge/pantry image file (jpg, png, webp)

        Returns a list of detected ingredients and 3 recipe ideas.
        """
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {allowed_types}"
            )

        try:
            content = await image.read()
            api_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
            analyzer = GeminiIngredientAnalyzer(api_key=api_key)
            result = analyzer.analyze_from_bytes(content, image.content_type)

            return {
                "success": True,
                "timestamp": datetime.utcnow().isoformat(),
                "detected_ingredients": result.get("detected_ingredients", []),
                "recipes": result.get("recipes", []),
                "analysis_notes": result.get("analysis_notes", ""),
            }
        except Exception as e:
            logger.error(f"Ingredient analysis failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/extract-ingredients")
    async def extract_ingredients(image: UploadFile = File(...)):
        """
        Extract ingredients from an ingredient image with ArUco-based measurements.
        
        - **image**: Image of ingredients file (jpg, png, webp)
        
        Returns detected ingredients with measured quantities (e.g., "10g lettuce").
        """
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {allowed_types}"
            )
        
        try:
            # Save uploaded image temporarily
            with tempfile.NamedTemporaryFile(
                suffix=Path(image.filename).suffix,
                delete=False
            ) as tmp:
                content = await image.read()
                tmp.write(content)
                tmp_path = tmp.name
            
            # Get CV metadata with ArUco scale
            pipe = get_pipeline()
            cv_result = pipe.get_cv_only(tmp_path)
            cv_metadata = cv_result.metadata_text if cv_result else None
            
            # Extract ingredients with CV metadata
            ingredients = pipe.extract_ingredients(tmp_path, cv_metadata)
            
            # Clean up temp file
            Path(tmp_path).unlink(missing_ok=True)
            
            return {
                "success": True,
                "timestamp": datetime.utcnow().isoformat(),
                "ingredients": [
                    {
                        "name": ing.name,
                        "quantity_value": ing.quantity_value,
                        "unit": ing.unit,
                        "confidence": ing.confidence,
                        "measurement_method": ing.measurement_method
                    }
                    for ing in ingredients.ingredients
                ],
                "analysis_summary": ingredients.analysis_summary,
                "total_weight_estimate_g": ingredients.total_weight_estimate_g,
                "aruco_scale_info": ingredients.aruco_scale_info
            }
            
        except Exception as e:
            logger.error(f"Ingredient extraction failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/analyze-and-recommend")
    async def analyze_and_recommend(
        image: UploadFile = File(...),
        calorie_min: Optional[float] = Form(None),
        calorie_max: Optional[float] = Form(None),
        protein_min_g: Optional[float] = Form(None),
        protein_max_g: Optional[float] = Form(None),
        carbs_min_g: Optional[float] = Form(None),
        carbs_max_g: Optional[float] = Form(None),
        fat_min_g: Optional[float] = Form(None),
        fat_max_g: Optional[float] = Form(None)
    ):
        """
        Analyze ingredient image and recommend recipes based on available ingredients + nutrition needs.
        
        This is the main meal planning endpoint that:
        1. Extracts ingredients from image with ArUco-based measurements
        2. Checks ingredient sufficiency for recipes
        3. Filters recipes by nutrition requirements
        4. Returns ranked recipe recommendations
        
        - **image**: Image of ingredients file (jpg, png, webp)
        - **calorie_min/max**: Target calorie range
        - **protein_min/max_g**: Target protein range in grams
        - **carbs_min/max_g**: Target carbohydrate range in grams
        - **fat_min/max_g**: Target fat range in grams
        
        Returns:
        - extracted_ingredients: List of detected ingredients with quantities
        - recipe_recommendations: Ranked recipes matching ingredients and nutrition targets
        """
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {allowed_types}"
            )
        
        try:
            # Save uploaded image temporarily
            with tempfile.NamedTemporaryFile(
                suffix=Path(image.filename).suffix,
                delete=False
            ) as tmp:
                content = await image.read()
                tmp.write(content)
                tmp_path = tmp.name
            
            # Run complete meal planning analysis
            pipe = get_pipeline()
            result = pipe.analyze_and_recommend_recipes(
                image_path=tmp_path,
                calorie_min=calorie_min,
                calorie_max=calorie_max,
                protein_min_g=protein_min_g,
                protein_max_g=protein_max_g,
                carbs_min_g=carbs_min_g,
                carbs_max_g=carbs_max_g,
                fat_min_g=fat_min_g,
                fat_max_g=fat_max_g
            )
            
            # Clean up temp file
            Path(tmp_path).unlink(missing_ok=True)
            
            if result["success"]:
                return {
                    "success": True,
                    "timestamp": datetime.utcnow().isoformat(),
                    "extracted_ingredients": result.get("extracted_ingredients", []),
                    "ingredient_analysis_summary": result.get("ingredient_analysis_summary", ""),
                    "total_weight_estimate_g": result.get("total_weight_estimate_g", 0),
                    "recipe_recommendations": result.get("recipe_recommendations", [])
                }
            else:
                raise HTTPException(
                    status_code=500,
                    detail=result.get("error", "Analysis failed")
                )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Meal planning analysis failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/generate-aruco/{marker_id}")
    async def generate_aruco_marker(
        marker_id: int = 0,
        size: int = 200
    ):
        """
        Generate an ArUco marker image for printing.
        
        - **marker_id**: Marker ID (0-49 for DICT_4X4_50)
        - **size**: Image size in pixels
        
        Returns PNG image of the marker.
        """
        from ..cv_layer.aruco_detector import ArUcoDetector
        import cv2
        
        if marker_id < 0 or marker_id > 49:
            raise HTTPException(
                status_code=400,
                detail="Marker ID must be between 0 and 49"
            )
        
        marker = ArUcoDetector.generate_marker(marker_id, size)
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            cv2.imwrite(tmp.name, marker)
            return FileResponse(
                tmp.name,
                media_type="image/png",
                filename=f"aruco_marker_{marker_id}.png"
            )
    
    return app


# Create default app instance
app = create_app()
