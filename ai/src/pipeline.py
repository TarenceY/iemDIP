"""
Food Nutrition Pipeline

Orchestrates the full analysis: CV layer → Gemini layer → result.
"""

import os
from dataclasses import dataclass, field
from typing import Optional, Dict, Any

from dotenv import load_dotenv
from loguru import logger

load_dotenv()


@dataclass
class PipelineResult:
    """Holds the outcome of a single pipeline run."""
    success: bool
    nutrition_data: Optional[Dict[str, Any]] = None
    cv_data: Optional[Dict[str, Any]] = None
    annotated_image_path: Optional[str] = None
    error: Optional[str] = None


class FoodNutritionPipeline:
    """
    End-to-end food nutrition analysis pipeline.

    Usage::

        pipeline = FoodNutritionPipeline()
        result = pipeline.analyze("path/to/meal.jpg")
        if result.success:
            print(result.nutrition_data["totals"]["calories"])
    """

    def __init__(self, gemini_api_key: Optional[str] = None):
        from .cv_layer.cv_pipeline import CVPipeline
        from .gemini_layer.gemini_client import GeminiClient

        self.cv_pipeline = CVPipeline()
        self.gemini = GeminiClient(api_key=gemini_api_key or os.getenv("GEMINI_API_KEY"))

    def analyze(
        self,
        image_path: str,
        save_annotated: bool = False,
        output_dir: Optional[str] = None,
    ) -> PipelineResult:
        """
        Analyze a meal image and return nutrition data.

        Parameters
        ----------
        image_path    : Path to the image file
        save_annotated: (unused – reserved for future annotated-image output)
        output_dir    : (unused – reserved for future annotated-image output)
        """
        try:
            logger.info(f"Pipeline: starting analysis for '{image_path}'")

            # Step 1 – Computer Vision (ArUco + YOLO)
            cv_data = self.cv_pipeline.analyze(image_path)
            logger.info(
                f"CV complete – scale reference: {cv_data['has_scale_reference']}, "
                f"YOLO items: {len(cv_data['food_items'])}"
            )

            # Step 2 – Gemini nutrition analysis
            nutrition_data = self.gemini.analyze(image_path, cv_data)
            logger.info(
                f"Gemini complete – "
                f"calories: {nutrition_data.get('totals', {}).get('calories', '?')}"
            )

            return PipelineResult(
                success=True,
                nutrition_data=nutrition_data,
                cv_data=cv_data,
            )

        except Exception as exc:
            logger.error(f"Pipeline error: {exc}")
            return PipelineResult(success=False, error=str(exc))