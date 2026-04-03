"""
Food Nutrition Analysis Pipeline

Main pipeline that orchestrates:
1. Computer Vision Layer (ArUco + YOLOv8)
2. Gemini AI Layer (Nutrition Analysis)
"""

import os
from dotenv import load_dotenv
load_dotenv(override=True)
import cv2
import numpy as np
from typing import Dict, Any, Optional, Union
from dataclasses import dataclass, asdict
from pathlib import Path
import json
from loguru import logger

from .cv_layer import CVPipeline, CVResult
from .gemini_layer import GeminiNutritionAnalyzer, NutritionResult
from .recipe_layer import RecipeAnalyzer, IngredientExtractor, IngredientList


@dataclass
class AnalysisResult:
    """Complete analysis result combining CV and Gemini outputs."""
    success: bool
    cv_data: Dict[str, Any]
    nutrition_data: Dict[str, Any]
    annotated_image_path: Optional[str]
    error: Optional[str] = None


class FoodNutritionPipeline:
    """
    Complete Food Nutrition Analysis Pipeline.
    
    Flow:
    1. Image Input
    2. CV Layer: ArUco detection (scale) + YOLOv8 (food detection)
    3. Gemini Layer: Nutrition analysis with CV metadata
    4. Output: Structured nutrition data
    """
    
    def __init__(
        self,
        gemini_api_key: Optional[str] = None,
        gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        aruco_marker_size_cm: float = 5.0,
        yolo_model_path: str = "yolov8n.pt",
        confidence_threshold: float = 0.5,
        device: str = "auto",
        recipe_database_path: Optional[str] = None
    ):
        """
        Initialize the complete pipeline.
        
        Args:
            gemini_api_key: Google Gemini API key
            gemini_model: Gemini model to use
            aruco_marker_size_cm: Physical size of ArUco marker
            yolo_model_path: Path to YOLO model
            confidence_threshold: Detection confidence threshold
            device: Device for CV inference
            recipe_database_path: Path to recipe database JSON file
        """
        # Initialize CV Pipeline
        self.cv_pipeline = CVPipeline(
            aruco_marker_size_cm=aruco_marker_size_cm,
            yolo_model_path=yolo_model_path,
            confidence_threshold=confidence_threshold,
            device=device
        )
        
        # Initialize Gemini Analyzer
        self.gemini_analyzer = GeminiNutritionAnalyzer(
            api_key=gemini_api_key,
            model=gemini_model
        )
        
        # Initialize Recipe Analyzer
        self.recipe_analyzer = RecipeAnalyzer(gemini_api_key=gemini_api_key)
        if recipe_database_path:
            try:
                self.recipe_analyzer.load_recipes_from_json(recipe_database_path)
                logger.info(f"Loaded recipes from: {recipe_database_path}")
            except Exception as e:
                logger.warning(f"Failed to load recipes: {e}")
        
        logger.info("Food Nutrition Pipeline initialized with Recipe Layer")
    
    def analyze(
        self,
        image_path: str,
        save_annotated: bool = True,
        output_dir: Optional[str] = None
    ) -> AnalysisResult:
        """
        Analyze a food image and return nutrition data.
        
        Args:
            image_path: Path to the food image
            save_annotated: Whether to save annotated image
            output_dir: Directory for output files
            
        Returns:
            AnalysisResult with complete analysis data
        """
        try:
            logger.info(f"Processing image: {image_path}")
            
            # Step 1: CV Pipeline
            logger.info("Running CV pipeline...")
            cv_result = self.cv_pipeline.process_file(image_path)
            
            # Step 2: Gemini Analysis
            logger.info("Running Gemini analysis...")
            nutrition_result = self.gemini_analyzer.analyze(
                image_path=image_path,
                cv_metadata=cv_result.metadata_text
            )
            
            # Save annotated image if requested
            annotated_path = None
            if save_annotated:
                if output_dir:
                    out_dir = Path(output_dir)
                    out_dir.mkdir(parents=True, exist_ok=True)
                else:
                    out_dir = Path(image_path).parent
                
                annotated_path = str(out_dir / f"annotated_{Path(image_path).name}")
                cv2.imwrite(annotated_path, cv_result.annotated_image)
                logger.info(f"Saved annotated image: {annotated_path}")
            
            # Compile results
            result = AnalysisResult(
                success=True,
                cv_data=self.cv_pipeline.get_detection_summary(cv_result),
                nutrition_data=self._nutrition_to_dict(nutrition_result),
                annotated_image_path=annotated_path
            )
            
            logger.info(f"Analysis complete: {nutrition_result.total_calories:.0f} calories")
            return result
            
        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            return AnalysisResult(
                success=False,
                cv_data={},
                nutrition_data={},
                annotated_image_path=None,
                error=str(e)
            )
    
    def analyze_image(
        self,
        image: np.ndarray,
        save_annotated: bool = False,
        output_path: Optional[str] = None
    ) -> AnalysisResult:
        """
        Analyze a food image from numpy array.
        
        Args:
            image: Image as numpy array (BGR format)
            save_annotated: Whether to save annotated image
            output_path: Path for annotated image
            
        Returns:
            AnalysisResult with complete analysis data
        """
        try:
            # CV Pipeline
            cv_result = self.cv_pipeline.process(image)
            
            # For Gemini, we need to save temp image or use bytes
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
                temp_path = f.name
                cv2.imwrite(temp_path, image)
            
            # Gemini Analysis
            nutrition_result = self.gemini_analyzer.analyze(
                image_path=temp_path,
                cv_metadata=cv_result.metadata_text
            )
            
            # Clean up temp file
            Path(temp_path).unlink()
            
            # Save annotated image if requested
            annotated_path = None
            if save_annotated and output_path:
                cv2.imwrite(output_path, cv_result.annotated_image)
                annotated_path = output_path
            
            return AnalysisResult(
                success=True,
                cv_data=self.cv_pipeline.get_detection_summary(cv_result),
                nutrition_data=self._nutrition_to_dict(nutrition_result),
                annotated_image_path=annotated_path
            )
            
        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            return AnalysisResult(
                success=False,
                cv_data={},
                nutrition_data={},
                annotated_image_path=None,
                error=str(e)
            )
    
    def _nutrition_to_dict(self, result: NutritionResult) -> Dict[str, Any]:
        """Convert NutritionResult to dictionary."""
        return {
            "food_items": [
                {
                    "food_name": item.food_name,
                    "serving_size": item.serving_size,
                    "calories": item.calories,
                    "protein_g": item.protein_g,
                    "carbohydrates_g": item.carbohydrates_g,
                    "fat_g": item.fat_g,
                    "fiber_g": item.fiber_g,
                    "sugar_g": item.sugar_g,
                    "sodium_mg": item.sodium_mg,
                    "confidence": item.confidence,
                    "notes": item.notes
                }
                for item in result.food_items
            ],
            "totals": {
                "calories": result.total_calories,
                "protein_g": result.total_protein_g,
                "carbohydrates_g": result.total_carbs_g,
                "fat_g": result.total_fat_g
            },
            "analysis_notes": result.analysis_notes,
            "backend_data": result.to_backend_data()
        }
    
    def get_cv_only(self, image_path: str) -> CVResult:
        """
        Run only the CV pipeline (no Gemini).
        
        Args:
            image_path: Path to the image
            
        Returns:
            CVResult from the CV pipeline
        """
        return self.cv_pipeline.process_file(image_path)
    
    def extract_ingredients(
        self,
        image_path: str,
        cv_metadata: Optional[Dict[str, Any]] = None
    ) -> IngredientList:
        """
        Extract ingredients from image with ArUco-based measurements.
        
        Args:
            image_path: Path to ingredient image
            cv_metadata: Optional CV metadata with ArUco scale information
            
        Returns:
            IngredientList with measured ingredients
        """
        try:
            logger.info(f"Extracting ingredients from: {image_path}")
            
            # Use existing CV pipeline to get ArUco scale if metadata not provided
            if not cv_metadata:
                cv_result = self.cv_pipeline.process_file(image_path)
                cv_metadata = cv_result.metadata_text if cv_result else None
            
            # Extract ingredients using recipe layer
            ingredients = self.recipe_analyzer.ingredient_extractor.extract_from_file(
                image_path=image_path,
                cv_metadata=cv_metadata
            )
            
            logger.info(f"Extracted {len(ingredients.ingredients)} ingredients")
            return ingredients
            
        except Exception as e:
            logger.error(f"Ingredient extraction failed: {e}")
            raise
    
    def analyze_and_recommend_recipes(
        self,
        image_path: str,
        calorie_min: Optional[float] = None,
        calorie_max: Optional[float] = None,
        protein_min_g: Optional[float] = None,
        protein_max_g: Optional[float] = None,
        carbs_min_g: Optional[float] = None,
        carbs_max_g: Optional[float] = None,
        fat_min_g: Optional[float] = None,
        fat_max_g: Optional[float] = None,
        cv_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze ingredient image and recommend recipes based on available ingredients + nutrition needs.
        
        Args:
            image_path: Path to ingredient image
            calorie_min/max: Calorie range
            protein_min/max_g: Protein range in grams
            carbs_min/max_g: Carbohydrate range in grams
            fat_min/max_g: Fat range in grams
            cv_metadata: Optional CV metadata with ArUco scale information
            
        Returns:
            Dict with extracted_ingredients and ranked recipe recommendations
        """
        try:
            logger.info(f"Starting meal planning analysis: {image_path}")
            
            # Extract ingredients
            ingredients = self.extract_ingredients(image_path, cv_metadata)
            
            # Create nutrition filter from parameters
            nutrition_filters = {}
            if calorie_min is not None or calorie_max is not None:
                nutrition_filters['calories'] = {
                    'min': calorie_min,
                    'max': calorie_max
                }
            if protein_min_g is not None or protein_max_g is not None:
                nutrition_filters['protein_g'] = {
                    'min': protein_min_g,
                    'max': protein_max_g
                }
            if carbs_min_g is not None or carbs_max_g is not None:
                nutrition_filters['carbohydrates_g'] = {
                    'min': carbs_min_g,
                    'max': carbs_max_g
                }
            if fat_min_g is not None or fat_max_g is not None:
                nutrition_filters['fat_g'] = {
                    'min': fat_min_g,
                    'max': fat_max_g
                }
            
            # Find matching recipes
            recommendations = self.recipe_analyzer.find_recipes_by_ingredients_and_nutrition(
                ingredients=ingredients.ingredients,
                nutrition_filters=nutrition_filters if nutrition_filters else None
            )
            
            # Sort by overall score (highest first)
            recommendations.sort(key=lambda r: r.overall_score, reverse=True)
            
            logger.info(f"Found {len(recommendations)} matching recipes")
            
            # Compile response
            result = {
                "success": True,
                "extracted_ingredients": [
                    {
                        "name": ing.name,
                        "quantity_value": ing.quantity_value,
                        "unit": ing.unit,
                        "confidence": ing.confidence,
                        "measurement_method": ing.measurement_method
                    }
                    for ing in ingredients.ingredients
                ],
                "ingredient_analysis_summary": ingredients.analysis_summary,
                "total_weight_estimate_g": ingredients.total_weight_estimate_g,
                "recipe_recommendations": [
                    {
                        "recipe_id": rec.recipe.id,
                        "recipe_name": rec.recipe.name,
                        "difficulty": rec.recipe.difficulty,
                        "cuisine": rec.recipe.cuisine,
                        "prep_time_min": rec.recipe.prep_time_min,
                        "cook_time_min": rec.recipe.cook_time_min,
                        "servings": rec.recipe.servings,
                        "nutrition": rec.recipe.nutrition,
                        "matching_ingredients": rec.matching_ingredients,
                        "ingredient_match_score": round(rec.ingredient_match_score, 2),
                        "nutrition_match_score": round(rec.nutrition_match_score, 2),
                        "overall_score": round(rec.overall_score, 2),
                        "ingredient_requirements": [
                            {
                                "name": req.name,
                                "quantity_value": req.quantity_value,
                                "unit": req.unit
                            }
                            for req in rec.recipe.ingredient_requirements
                        ],
                        "dietary_tags": rec.recipe.dietary_tags,
                        "instructions": rec.recipe.instructions
                    }
                    for rec in recommendations
                ]
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Meal planning analysis failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
