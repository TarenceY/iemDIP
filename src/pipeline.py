"""
Food Nutrition Analysis Pipeline

Main pipeline that orchestrates:
1. Computer Vision Layer (ArUco + YOLOv8)
2. Gemini AI Layer (Nutrition Analysis)
"""

import os
import cv2
import numpy as np
from typing import Dict, Any, Optional, Union
from dataclasses import dataclass, asdict
from pathlib import Path
import json
from loguru import logger

from .cv_layer import CVPipeline, CVResult
from .gemini_layer import GeminiNutritionAnalyzer, NutritionResult


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
        gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.0-flash"),
        aruco_marker_size_cm: float = 5.0,
        yolo_model_path: str = "yolov8n.pt",
        confidence_threshold: float = 0.5,
        device: str = "auto"
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
        
        logger.info("Food Nutrition Pipeline initialized")
    
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
            "analysis_notes": result.analysis_notes
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
