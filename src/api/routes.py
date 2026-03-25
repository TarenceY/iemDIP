"""
FastAPI Routes for Food Nutrition Analysis API.

Provides REST endpoints for image upload and nutrition analysis.
"""

import os
import tempfile
import base64
from typing import Optional, List
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from loguru import logger

from ..pipeline import FoodNutritionPipeline
from ..recipe_layer import NutritionRange


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


class NutritionRangeRequest(BaseModel):
    """Request model for nutrition range."""
    min_value: Optional[float] = None
    max_value: Optional[float] = None


class RecipeSearchRequest(BaseModel):
    """Request model for recipe search."""
    ingredients: Optional[List[str]] = None
    calories_min: Optional[float] = None
    calories_max: Optional[float] = None
    protein_g_min: Optional[float] = None
    protein_g_max: Optional[float] = None
    carbohydrates_g_min: Optional[float] = None
    carbohydrates_g_max: Optional[float] = None
    fat_g_min: Optional[float] = None
    fat_g_max: Optional[float] = None
    ingredient_match_percentage: float = 0.5
    limit: int = 10


class RecipeRecommendationResponse(BaseModel):
    """Response for recipe recommendations."""
    success: bool
    timestamp: str
    extracted_ingredients: Optional[dict] = None
    recipes: List[dict] = []
    total_found: int = 0
    error: Optional[str] = None


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
                cv_analysis=result.cv_data,
                nutrition=result.nutrition_data,
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
                "cv_analysis": pipe.cv_pipeline.get_detection_summary(cv_result),
                "metadata_text": cv_result.metadata_text
            }
            
        except Exception as e:
            logger.error(f"CV analysis failed: {e}")
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
    
    @app.post("/api/extract-ingredients", response_model=dict)
    async def extract_ingredients(image: UploadFile = File(...)):
        """
        Extract raw ingredients from an ingredient image.
        
        Upload an image showing:
        - Ingredients on a table
        - Grocery items
        - Items in containers/bowls
        - Pantry or fridge contents
        
        - **image**: Image file (jpg, png, webp) containing ingredients
        
        Returns list of detected ingredients with confidence levels.
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
            
            pipe = get_pipeline()
            ingredient_list = pipe.extract_ingredients(tmp_path)
            
            # Clean up
            Path(tmp_path).unlink(missing_ok=True)
            
            return {
                "success": True,
                "timestamp": datetime.utcnow().isoformat(),
                "detected_ingredients": ingredient_list.to_dict(),
            }
            
        except Exception as e:
            logger.error(f"Ingredient extraction failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/recipe-search")
    async def search_recipes(request: RecipeSearchRequest):
        """
        Search recipes by ingredients and nutrition ranges.
        
        Allows filtering by:
        - Ingredients (with match percentage)
        - Calorie range
        - Protein, carbohydrate, fat ranges
        
        Returns ranked recipe recommendations.
        """
        try:
            pipe = get_pipeline()
            
            # Build nutrition ranges
            calories = None
            if request.calories_min is not None or request.calories_max is not None:
                calories = NutritionRange(
                    min_value=request.calories_min,
                    max_value=request.calories_max
                )
            
            protein_g = None
            if request.protein_g_min is not None or request.protein_g_max is not None:
                protein_g = NutritionRange(
                    min_value=request.protein_g_min,
                    max_value=request.protein_g_max
                )
            
            carbohydrates_g = None
            if request.carbohydrates_g_min is not None or request.carbohydrates_g_max is not None:
                carbohydrates_g = NutritionRange(
                    min_value=request.carbohydrates_g_min,
                    max_value=request.carbohydrates_g_max
                )
            
            fat_g = None
            if request.fat_g_min is not None or request.fat_g_max is not None:
                fat_g = NutritionRange(
                    min_value=request.fat_g_min,
                    max_value=request.fat_g_max
                )
            
            # Search recipes
            if request.ingredients:
                recommendations = pipe.recipe_analyzer.find_recipes_by_ingredients_and_nutrition(
                    ingredients=request.ingredients,
                    calories=calories,
                    protein_g=protein_g,
                    carbohydrates_g=carbohydrates_g,
                    fat_g=fat_g,
                    match_percentage=request.ingredient_match_percentage,
                )
                recipes = [rec.to_dict() for rec in recommendations[:request.limit]]
            else:
                # Only nutrition filter
                recipes_list = pipe.find_recipes_by_nutrition(
                    calories=calories,
                    protein_g=protein_g,
                    carbohydrates_g=carbohydrates_g,
                    fat_g=fat_g,
                )
                recipes = recipes_list[:request.limit]
            
            return {
                "success": True,
                "timestamp": datetime.utcnow().isoformat(),
                "recipes": recipes,
                "total_found": len(recipes),
            }
            
        except Exception as e:
            logger.error(f"Recipe search failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/analyze-and-recommend", response_model=RecipeRecommendationResponse)
    async def analyze_and_recommend(
        image: UploadFile = File(...),
        calories_min: Optional[float] = Query(None),
        calories_max: Optional[float] = Query(None),
        protein_g_min: Optional[float] = Query(None),
        protein_g_max: Optional[float] = Query(None),
        carbohydrates_g_min: Optional[float] = Query(None),
        carbohydrates_g_max: Optional[float] = Query(None),
        fat_g_min: Optional[float] = Query(None),
        fat_g_max: Optional[float] = Query(None),
        limit: int = Query(5),
    ):
        """
        Meal Planning Workflow: Extract ingredients and find matching recipes with nutrition filters.
        
        This is the main meal planning endpoint. Upload an image of ingredients and get recipe recommendations.
        
        **How it works:**
        1. Upload an image showing your available ingredients (grocery picture, table layout, etc.)
        2. System extracts all visible ingredients
        3. Searches recipe database for recipes that can be made with those ingredients
        4. Filters recipes by your nutrition requirements
        5. Returns ranked recipes for meal planning
        
        **Query parameters for nutrition filters (all optional):**
        - calories_min/max: Calorie range per serving
        - protein_g_min/max: Protein range in grams
        - carbohydrates_g_min/max: Carbohydrates range in grams
        - fat_g_min/max: Fat range in grams
        - limit: Maximum number of recipes to return (default: 5)
        
        **Response includes:**
        - Extracted ingredients from the image
        - Ranked recipe recommendations matching those ingredients
        - Nutrition information for each recipe
        - Ingredient match scores
        
        **Example use case:**
        - Take a photo of your groceries
        - Specify you want recipes under 400 calories with 20-40g protein
        - Get personalized meal suggestions for the week
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
            
            pipe = get_pipeline()
            
            # Build nutrition ranges
            calories = None
            if calories_min is not None or calories_max is not None:
                calories = NutritionRange(
                    min_value=calories_min,
                    max_value=calories_max
                )
            
            protein_g = None
            if protein_g_min is not None or protein_g_max is not None:
                protein_g = NutritionRange(
                    min_value=protein_g_min,
                    max_value=protein_g_max
                )
            
            carbohydrates_g = None
            if carbohydrates_g_min is not None or carbohydrates_g_max is not None:
                carbohydrates_g = NutritionRange(
                    min_value=carbohydrates_g_min,
                    max_value=carbohydrates_g_max
                )
            
            fat_g = None
            if fat_g_min is not None or fat_g_max is not None:
                fat_g = NutritionRange(
                    min_value=fat_g_min,
                    max_value=fat_g_max
                )
            
            # Run complete analysis
            result = pipe.analyze_and_recommend_recipes(
                image_path=tmp_path,
                calories=calories,
                protein_g=protein_g,
                carbohydrates_g=carbohydrates_g,
                fat_g=fat_g,
                limit=limit,
            )
            
            # Clean up
            Path(tmp_path).unlink(missing_ok=True)
            
            return RecipeRecommendationResponse(
                success=result.get("success", False),
                timestamp=datetime.utcnow().isoformat(),
                extracted_ingredients=result.get("extracted_ingredients"),
                recipes=result.get("recipe_recommendations", []),
                total_found=result.get("total_recommendations", 0),
                error=result.get("error"),
            )
            
        except Exception as e:
            logger.error(f"Analysis and recommendation failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.get("/api/recipes/count")
    async def get_recipe_count():
        """Get total number of recipes in the database."""
        try:
            pipe = get_pipeline()
            count = pipe.get_recipe_count()
            return {
                "total_recipes": count,
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Failed to get recipe count: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @app.post("/api/recipes/load")
    async def load_recipes(file: UploadFile = File(...)):
        """
        Load recipes from a JSON file.
        
        Expected JSON format:
        [
            {
                "id": "recipe_id",
                "name": "Recipe Name",
                "ingredients": ["ingredient1", "ingredient2"],
                "nutrition": {
                    "calories": 300,
                    "protein_g": 20,
                    "carbohydrates_g": 40,
                    "fat_g": 10
                },
                ...
            }
        ]
        """
        try:
            if not file.filename.endswith(".json"):
                raise HTTPException(
                    status_code=400,
                    detail="File must be JSON format"
                )
            
            # Save uploaded file temporarily
            with tempfile.NamedTemporaryFile(
                suffix=".json",
                delete=False
            ) as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_path = tmp.name
            
            pipe = get_pipeline()
            pipe.load_recipe_database(tmp_path)
            count = pipe.get_recipe_count()
            
            # Clean up
            Path(tmp_path).unlink(missing_ok=True)
            
            return {
                "success": True,
                "timestamp": datetime.utcnow().isoformat(),
                "total_recipes_loaded": count,
            }
            
        except Exception as e:
            logger.error(f"Failed to load recipes: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return app


# Create default app instance
app = create_app()
