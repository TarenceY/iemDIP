"""
CV Pipeline

Orchestrates ArUco marker detection and YOLOv8 food detection into a single
analysis step that produces the ``cv_data`` dict consumed by the Gemini layer.
"""

import cv2
import numpy as np
from typing import Optional
from loguru import logger

from .aruco_detector import ArUcoDetector
from .food_detector import FoodDetector


class CVPipeline:
    """Run ArUco + YOLO on an image and return a combined CV analysis dict."""

    def __init__(self):
        self.aruco_detector = ArUcoDetector()
        self.food_detector = FoodDetector()

    def analyze(self, image_path: str) -> dict:
        """
        Analyse *image_path* with the CV stack.

        Returns
        -------
        dict with keys:
            has_scale_reference (bool)
            pixels_per_cm       (float | None)
            food_items          (list[dict])
        """
        image = self._load_image(image_path)
        if image is None:
            logger.error(f"Could not read image: {image_path}")
            return {"has_scale_reference": False, "pixels_per_cm": None, "food_items": []}

        # 1. ArUco detection
        aruco_result = self.aruco_detector.detect(image)
        pixels_per_cm = aruco_result.get("pixels_per_cm")

        # 2. YOLO food detection
        food_items = self.food_detector.detect(image, pixels_per_cm=pixels_per_cm)

        return {
            "has_scale_reference": aruco_result["has_scale_reference"],
            "pixels_per_cm": pixels_per_cm,
            "food_items": food_items,
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _load_image(image_path: str) -> Optional[np.ndarray]:
        """Read an image from disk and return a BGR numpy array."""
        img = cv2.imread(image_path)
        if img is None:
            logger.warning(f"cv2.imread returned None for: {image_path}")
        return img
