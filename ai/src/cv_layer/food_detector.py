"""
YOLOv8 Food Detection Module

Detects and localizes food items in images using YOLOv8.
"""

import cv2
import numpy as np
from typing import List, Optional, Tuple
from dataclasses import dataclass, field
from pathlib import Path
from loguru import logger


@dataclass
class FoodDetection:
    """Represents a detected food item."""
    class_id: int
    class_name: str
    confidence: float
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    center: Tuple[int, int]
    width_pixels: int
    height_pixels: int
    # Measurements in cm (calculated if scale factor available)
    width_cm: Optional[float] = None
    height_cm: Optional[float] = None
    estimated_diameter_cm: Optional[float] = None


class FoodDetector:
    """
    Food Detection using YOLOv8.
    
    Detects food items and calculates their dimensions using
    the scale factor from ArUco marker detection.
    """
    
    def __init__(
        self,
        model_path: str = "yolov8n.pt",
        confidence_threshold: float = 0.5,
        iou_threshold: float = 0.45,
        device: str = "auto"
    ):
        """
        Initialize the food detector.
        
        Args:
            model_path: Path to YOLOv8 model weights
            confidence_threshold: Minimum confidence for detections
            iou_threshold: IoU threshold for NMS
            device: Device for inference (auto, cpu, cuda)
        """
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.device = device
        self.model = None
        
    def load_model(self) -> None:
        """Load the YOLOv8 model."""
        try:
            from ultralytics import YOLO
            
            # Check if custom model exists
            if Path(self.model_path).exists():
                self.model = YOLO(self.model_path)
                logger.info(f"Loaded custom YOLO model from {self.model_path}")
            else:
                # Use pretrained model
                self.model = YOLO("yolov8n.pt")
                logger.info("Loaded pretrained YOLOv8n model")
            
            # Set device
            if self.device == "auto":
                import torch
                self.device = "cuda" if torch.cuda.is_available() else "cpu"
            
            logger.info(f"YOLO model ready on device: {self.device}")
            
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            raise
    
    def detect(
        self,
        image: np.ndarray,
        pixels_per_cm: Optional[float] = None
    ) -> List[FoodDetection]:
        """
        Detect food items in an image.
        
        Args:
            image: Input image (BGR format)
            pixels_per_cm: Scale factor for size measurement (from ArUco)
            
        Returns:
            List of FoodDetection objects (empty list on any failure)
        """
        if self.model is None:
            try:
                self.load_model()
            except Exception as e:
                logger.warning(f"YOLO model not available, skipping food detection: {e}")
                return []

        detections = []
        
        try:
            # Run YOLO inference
            results = self.model(
                image,
                conf=self.confidence_threshold,
                iou=self.iou_threshold,
                device=self.device,
                verbose=False
            )
            
            # Process results
            for result in results:
                boxes = result.boxes
                names = result.names
                
                for box in boxes:
                    # Get bounding box (convert numpy values to plain int for JSON safety)
                    x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].cpu().numpy()]
                    
                    # Get class info
                    class_id = int(box.cls[0].cpu().numpy())
                    class_name = names.get(class_id, f"class_{class_id}")
                    confidence = float(box.conf[0].cpu().numpy())
                    
                    # Calculate dimensions
                    width_pixels = x2 - x1
                    height_pixels = y2 - y1
                    center = ((x1 + x2) // 2, (y1 + y2) // 2)
                    
                    # Calculate real-world dimensions if scale factor available
                    width_cm = None
                    height_cm = None
                    diameter_cm = None
                    
                    if pixels_per_cm is not None and pixels_per_cm > 0:
                        width_cm = width_pixels / pixels_per_cm
                        height_cm = height_pixels / pixels_per_cm
                        # Estimate diameter as average of width and height
                        diameter_cm = (width_cm + height_cm) / 2
                    
                    detection = FoodDetection(
                        class_id=class_id,
                        class_name=class_name,
                        confidence=confidence,
                        bbox=(x1, y1, x2, y2),
                        center=center,
                        width_pixels=width_pixels,
                        height_pixels=height_pixels,
                        width_cm=width_cm,
                        height_cm=height_cm,
                        estimated_diameter_cm=diameter_cm
                    )
                    detections.append(detection)
            
            logger.info(f"Detected {len(detections)} objects")
            
        except Exception as e:
            logger.error(f"Detection failed: {e}")
            return detections
        
        return detections
    
    def detect_from_file(
        self,
        image_path: str,
        pixels_per_cm: Optional[float] = None
    ) -> List[FoodDetection]:
        """
        Detect food items from an image file.
        
        Args:
            image_path: Path to the image file
            pixels_per_cm: Scale factor for size measurement
            
        Returns:
            List of FoodDetection objects
        """
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")
        
        return self.detect(image, pixels_per_cm)
    
    def draw_detections(
        self,
        image: np.ndarray,
        detections: List[FoodDetection],
        show_measurements: bool = True
    ) -> np.ndarray:
        """
        Draw detection boxes and labels on image.
        
        Args:
            image: Input image
            detections: List of FoodDetection objects
            show_measurements: Whether to show size measurements
            
        Returns:
            Annotated image
        """
        output = image.copy()
        
        for det in detections:
            x1, y1, x2, y2 = det.bbox
            
            # Draw bounding box
            color = (0, 255, 0)
            cv2.rectangle(output, (x1, y1), (x2, y2), color, 2)
            
            # Prepare label text
            label = f"{det.class_name}: {det.confidence:.2f}"
            
            if show_measurements and det.estimated_diameter_cm is not None:
                label += f" | {det.estimated_diameter_cm:.1f}cm"
            
            # Draw label background
            (text_width, text_height), _ = cv2.getTextSize(
                label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
            )
            cv2.rectangle(
                output,
                (x1, y1 - text_height - 10),
                (x1 + text_width + 10, y1),
                color, -1
            )
            
            # Draw label text
            cv2.putText(
                output, label,
                (x1 + 5, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2
            )
        
        return output
    
    def format_detection_text(self, detections: List[FoodDetection]) -> str:
        """
        Format detections as descriptive text for Gemini.
        
        Args:
            detections: List of FoodDetection objects
            
        Returns:
            Formatted text description
        """
        if not detections:
            return "No food items detected in the image."
        
        lines = []
        for i, det in enumerate(detections, 1):
            text = f"{i}. {det.class_name} detected (confidence: {det.confidence:.0%})"
            
            if det.estimated_diameter_cm is not None:
                text += f", approximately {det.estimated_diameter_cm:.1f}cm diameter"
                if det.width_cm and det.height_cm:
                    text += f" ({det.width_cm:.1f}cm x {det.height_cm:.1f}cm)"
            else:
                text += f", size: {det.width_pixels}x{det.height_pixels} pixels"
            
            lines.append(text)
        
        return "\n".join(lines)
