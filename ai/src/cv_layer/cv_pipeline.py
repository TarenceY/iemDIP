"""
Computer Vision Pipeline

Combines ArUco detection and YOLOv8 food detection into a unified pipeline.
"""

import cv2
import numpy as np
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from loguru import logger

from .aruco_detector import ArUcoDetector, ArUcoResult
from .food_detector import FoodDetector, FoodDetection


@dataclass
class CVResult:
    """Complete result from the CV pipeline."""
    image: np.ndarray
    aruco_results: List[ArUcoResult]
    food_detections: List[FoodDetection]
    pixels_per_cm: Optional[float]
    annotated_image: np.ndarray
    metadata_text: str


class CVPipeline:
    """
    Computer Vision Pipeline for food detection and measurement.
    
    Combines:
    - ArUco marker detection for size reference
    - YOLOv8 food detection and localization
    """
    
    def __init__(
        self,
        aruco_dict: str = "DICT_4X4_50",
        aruco_marker_size_cm: float = 5.0,
        yolo_model_path: str = "yolov8n.pt",
        confidence_threshold: float = 0.5,
        device: str = "auto"
    ):
        """
        Initialize the CV pipeline.
        
        Args:
            aruco_dict: ArUco dictionary type
            aruco_marker_size_cm: Physical size of ArUco marker in cm
            yolo_model_path: Path to YOLO model
            confidence_threshold: Detection confidence threshold
            device: Device for inference
        """
        self.aruco_detector = ArUcoDetector(
            dictionary=aruco_dict,
            marker_size_cm=aruco_marker_size_cm
        )
        
        self.food_detector = FoodDetector(
            model_path=yolo_model_path,
            confidence_threshold=confidence_threshold,
            device=device
        )
        
        logger.info("CV Pipeline initialized")
    
    def process(self, image: np.ndarray) -> CVResult:
        """
        Process an image through the complete CV pipeline.
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            CVResult with all detection data
        """
        # Step 1: Detect ArUco markers for scale reference
        aruco_results = self.aruco_detector.detect(image)
        
        # Calculate scale factor
        pixels_per_cm = None
        if aruco_results:
            pixels_per_cm = float(np.mean([r.pixels_per_cm for r in aruco_results]))
            logger.info(f"Scale factor: {pixels_per_cm:.2f} pixels/cm")
        else:
            logger.warning("No ArUco marker detected - measurements will be approximate")
        
        # Step 2: Detect food items
        food_detections = self.food_detector.detect(image, pixels_per_cm)
        
        # Step 3: Create annotated image
        annotated = image.copy()
        
        # Draw ArUco markers
        if aruco_results:
            annotated = self.aruco_detector.draw_markers(annotated, aruco_results)
        
        # Draw food detections
        if food_detections:
            annotated = self.food_detector.draw_detections(
                annotated, food_detections, show_measurements=True
            )
        
        # Step 4: Generate metadata text for Gemini
        metadata_text = self._generate_metadata_text(
            aruco_results, food_detections, pixels_per_cm
        )
        
        return CVResult(
            image=image,
            aruco_results=aruco_results,
            food_detections=food_detections,
            pixels_per_cm=pixels_per_cm,
            annotated_image=annotated,
            metadata_text=metadata_text
        )
    
    def process_file(self, image_path: str) -> CVResult:
        """
        Process an image file through the CV pipeline.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            CVResult with all detection data
        """
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        return self.process(image)
    
    def _generate_metadata_text(
        self,
        aruco_results: List[ArUcoResult],
        food_detections: List[FoodDetection],
        pixels_per_cm: Optional[float]
    ) -> str:
        """
        Generate metadata text for Gemini API.
        
        Args:
            aruco_results: ArUco detection results
            food_detections: Food detection results
            pixels_per_cm: Scale factor
            
        Returns:
            Formatted metadata text
        """
        lines = ["=== Computer Vision Analysis Results ===\n"]
        
        # Scale reference info
        if pixels_per_cm:
            lines.append(f"📏 Scale Reference: {pixels_per_cm:.2f} pixels/cm")
            lines.append(f"   (Reference marker detected, measurements are calibrated)\n")
        else:
            lines.append("⚠️ No scale reference detected")
            lines.append("   (Measurements are estimates based on image analysis)\n")
        
        # Food detections
        if food_detections:
            lines.append("🍽️ Detected Food Items:")
            for i, det in enumerate(food_detections, 1):
                lines.append(f"\n   {i}. {det.class_name.upper()}")
                lines.append(f"      • Confidence: {det.confidence:.0%}")
                
                if det.estimated_diameter_cm is not None:
                    lines.append(f"      • Estimated diameter: {det.estimated_diameter_cm:.1f} cm")
                    lines.append(f"      • Dimensions: {det.width_cm:.1f} cm × {det.height_cm:.1f} cm")
                else:
                    lines.append(f"      • Pixel dimensions: {det.width_pixels} × {det.height_pixels} px")
        else:
            lines.append("❌ No food items detected in the image")
        
        return "\n".join(lines)
    
    def get_detection_summary(self, cv_result: CVResult) -> Dict[str, Any]:
        """
        Get a summary dict of CV results for API response.
        All values are converted to JSON-safe Python native types.
        
        Args:
            cv_result: CVResult from process()
            
        Returns:
            Dictionary summary
        """
        return {
            "has_scale_reference": cv_result.pixels_per_cm is not None,
            "pixels_per_cm": float(cv_result.pixels_per_cm) if cv_result.pixels_per_cm is not None else None,
            "food_items": [
                {
                    "name": det.class_name,
                    "confidence": float(det.confidence),
                    "bbox": [int(det.bbox[0]), int(det.bbox[1]), int(det.bbox[2]), int(det.bbox[3])],
                    "width_cm": float(det.width_cm) if det.width_cm is not None else None,
                    "height_cm": float(det.height_cm) if det.height_cm is not None else None,
                    "diameter_cm": float(det.estimated_diameter_cm) if det.estimated_diameter_cm is not None else None
                }
                for det in cv_result.food_detections
            ],
            "aruco_markers": [
                {
                    "id": int(ar.marker_id),
                    "center": [int(ar.center[0]), int(ar.center[1])],
                    "pixels_per_cm": float(ar.pixels_per_cm)
                }
                for ar in cv_result.aruco_results
            ]
        }
