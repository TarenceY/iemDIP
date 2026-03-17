"""
ArUco Marker Detector

Detects ArUco markers in an image and calculates the pixels-per-centimetre
ratio, which is later used to estimate real-world food dimensions.

Place a printed ArUco marker (exactly 5 cm × 5 cm) next to your food when
taking photos for accurate size measurements.
"""

import cv2
import numpy as np
from loguru import logger


# Physical size of the printed marker in centimetres (must match the printout)
DEFAULT_MARKER_SIZE_CM = 5.0

# ArUco dictionary – DICT_4X4_50 is compact and easy to print/detect
ARUCO_DICT_NAME = "DICT_4X4_50"


def _get_aruco_dict():
    """Return the cv2.aruco dictionary object (handles both old and new API)."""
    dict_id = cv2.aruco.DICT_4X4_50
    try:
        # OpenCV 4.7+ new API
        return cv2.aruco.getPredefinedDictionary(dict_id)
    except AttributeError:
        # Older API
        return cv2.aruco.Dictionary_get(dict_id)  # type: ignore[attr-defined]


def _get_aruco_params():
    """Return default ArUco detection parameters."""
    try:
        params = cv2.aruco.DetectorParameters()
    except AttributeError:
        params = cv2.aruco.DetectorParameters_create()  # type: ignore[attr-defined]
    return params


class ArUcoDetector:
    """Detects ArUco markers and computes a pixel-to-cm scale factor."""

    def __init__(self, marker_size_cm: float = DEFAULT_MARKER_SIZE_CM):
        self.marker_size_cm = marker_size_cm
        self._aruco_dict = _get_aruco_dict()
        self._aruco_params = _get_aruco_params()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def detect(self, image: np.ndarray) -> dict:
        """
        Detect ArUco markers in *image* (BGR numpy array).

        Returns
        -------
        dict with keys:
            has_scale_reference (bool)
            pixels_per_cm       (float | None)
            marker_ids          (list[int])
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        try:
            # New OpenCV 4.7+ API
            detector = cv2.aruco.ArucoDetector(self._aruco_dict, self._aruco_params)
            corners, ids, _ = detector.detectMarkers(gray)
        except AttributeError:
            # Fallback to old API
            corners, ids, _ = cv2.aruco.detectMarkers(  # type: ignore[attr-defined]
                gray, self._aruco_dict, parameters=self._aruco_params
            )

        if ids is None or len(ids) == 0:
            logger.debug("No ArUco markers detected.")
            return {"has_scale_reference": False, "pixels_per_cm": None, "marker_ids": []}

        pixels_per_cm = self._compute_pixels_per_cm(corners[0])
        detected_ids = ids.flatten().tolist()

        logger.info(
            f"ArUco detected: ids={detected_ids}, pixels_per_cm={pixels_per_cm:.2f}"
        )
        return {
            "has_scale_reference": True,
            "pixels_per_cm": pixels_per_cm,
            "marker_ids": detected_ids,
        }

    # ------------------------------------------------------------------
    # Static helpers
    # ------------------------------------------------------------------

    @staticmethod
    def generate_marker(marker_id: int = 0, size_pixels: int = 400) -> np.ndarray:
        """Generate an ArUco marker image for printing."""
        aruco_dict = _get_aruco_dict()
        try:
            marker = cv2.aruco.generateImageMarker(aruco_dict, marker_id, size_pixels)
        except AttributeError:
            marker = np.zeros((size_pixels, size_pixels), dtype=np.uint8)
            cv2.aruco.drawMarker(aruco_dict, marker_id, size_pixels, marker, 1)  # type: ignore[attr-defined]
        return marker

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _compute_pixels_per_cm(self, corners: np.ndarray) -> float:
        """Estimate pixels-per-cm from the four corners of a detected marker."""
        pts = corners.reshape((4, 2))
        side_lengths = [
            np.linalg.norm(pts[i] - pts[(i + 1) % 4]) for i in range(4)
        ]
        avg_side_px = float(np.mean(side_lengths))
        return avg_side_px / self.marker_size_cm
