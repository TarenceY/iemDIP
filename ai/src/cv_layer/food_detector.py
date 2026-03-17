"""
YOLOv8 Food Detector

Uses Ultralytics YOLOv8 to locate food items in an image.  When a
pixels-per-cm ratio is available (from the ArUco detector) the bounding-box
dimensions are also converted to real-world centimetres.
"""

import os
from pathlib import Path
from typing import Optional

import numpy as np
from loguru import logger


# Default confidence threshold for detections
DEFAULT_CONFIDENCE = 0.40

# Candidate locations for the YOLO model weights (checked in order)
_MODEL_SEARCH_PATHS = [
    Path(__file__).parent.parent.parent / "yolov8n.pt",   # ai/yolov8n.pt
    Path(__file__).parent.parent.parent / "models" / "yolov8n.pt",
    Path("yolov8n.pt"),
    Path("models/yolov8n.pt"),
]


def _find_model_path() -> Optional[Path]:
    """Return the first existing model weight file, or None."""
    for p in _MODEL_SEARCH_PATHS:
        if p.exists():
            return p
    return None


class FoodDetector:
    """Detects food items using YOLOv8."""

    def __init__(self, model_path: Optional[str] = None, confidence: float = DEFAULT_CONFIDENCE):
        self.confidence = confidence
        self._model = None
        self._model_path = Path(model_path) if model_path else _find_model_path()

        if self._model_path is None:
            logger.warning(
                "YOLOv8 model not found. Food detection will be skipped. "
                "Place yolov8n.pt in the ai/ directory or specify model_path."
            )
        else:
            self._load_model()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def detect(self, image: np.ndarray, pixels_per_cm: Optional[float] = None) -> list:
        """
        Run YOLOv8 on *image* (BGR numpy array).

        Parameters
        ----------
        image         : BGR numpy array
        pixels_per_cm : Optional scale factor from ArUco detection

        Returns
        -------
        List of dicts:
            name          (str)
            confidence    (float)
            bbox          (dict: x1, y1, x2, y2 in pixels)
            width_cm      (float | None)
            height_cm     (float | None)
        """
        if self._model is None:
            logger.debug("YOLO model unavailable – skipping food detection.")
            return []

        try:
            results = self._model(image, conf=self.confidence, verbose=False)
        except Exception as exc:
            logger.error(f"YOLO inference failed: {exc}")
            return []

        detections = []
        for result in results:
            for box in result.boxes:
                label_id = int(box.cls[0])
                name = result.names.get(label_id, f"class_{label_id}")
                conf = float(box.conf[0])
                x1, y1, x2, y2 = (float(v) for v in box.xyxy[0])

                width_px = x2 - x1
                height_px = y2 - y1

                detection = {
                    "name": name,
                    "confidence": round(conf, 3),
                    "bbox": {
                        "x1": round(x1),
                        "y1": round(y1),
                        "x2": round(x2),
                        "y2": round(y2),
                    },
                    "width_cm": None,
                    "height_cm": None,
                }

                if pixels_per_cm and pixels_per_cm > 0:
                    detection["width_cm"] = round(width_px / pixels_per_cm, 2)
                    detection["height_cm"] = round(height_px / pixels_per_cm, 2)

                detections.append(detection)

        logger.info(f"YOLO detected {len(detections)} items.")
        return detections

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load_model(self):
        try:
            from ultralytics import YOLO  # type: ignore
            self._model = YOLO(str(self._model_path))
            logger.info(f"YOLOv8 model loaded from {self._model_path}")
        except ImportError:
            logger.warning("ultralytics not installed – food detection disabled.")
        except Exception as exc:
            logger.error(f"Failed to load YOLO model: {exc}")
