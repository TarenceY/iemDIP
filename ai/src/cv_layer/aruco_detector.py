"""
ArUco Marker Detection Module

Detects ArUco markers in images to establish a size reference
for accurate food volume/size estimation.
"""

import cv2
import numpy as np
from typing import Optional, Tuple, Dict, List
from dataclasses import dataclass
from loguru import logger


@dataclass
class ArUcoResult:
    """Result of ArUco marker detection."""
    marker_id: int
    corners: np.ndarray  # 4 corner points
    center: Tuple[int, int]
    pixel_size: float  # Size in pixels (side length)
    real_size_cm: float  # Known real-world size in cm
    pixels_per_cm: float  # Conversion factor


class ArUcoDetector:
    """
    ArUco Marker Detector for establishing size reference.
    
    Uses ArUco markers as reference objects with known physical size
    to calculate the pixel-to-centimeter ratio for accurate measurements.
    """
    
    # ArUco dictionary mapping
    ARUCO_DICTS = {
        "DICT_4X4_50": cv2.aruco.DICT_4X4_50,
        "DICT_4X4_100": cv2.aruco.DICT_4X4_100,
        "DICT_4X4_250": cv2.aruco.DICT_4X4_250,
        "DICT_5X5_50": cv2.aruco.DICT_5X5_50,
        "DICT_5X5_100": cv2.aruco.DICT_5X5_100,
        "DICT_6X6_50": cv2.aruco.DICT_6X6_50,
        "DICT_6X6_100": cv2.aruco.DICT_6X6_100,
    }
    
    def __init__(
        self,
        dictionary: str = "DICT_4X4_50",
        marker_size_cm: float = 5.0
    ):
        """
        Initialize the ArUco detector.
        
        Args:
            dictionary: ArUco dictionary type
            marker_size_cm: Physical size of the marker in centimeters
        """
        self.marker_size_cm = marker_size_cm
        
        # Get ArUco dictionary
        dict_id = self.ARUCO_DICTS.get(dictionary, cv2.aruco.DICT_4X4_50)
        self.aruco_dict = cv2.aruco.getPredefinedDictionary(dict_id)
        
        # Create detector parameters
        self.parameters = cv2.aruco.DetectorParameters()
        
        # Create detector
        self.detector = cv2.aruco.ArucoDetector(self.aruco_dict, self.parameters)
        
        logger.info(f"ArUco detector initialized with {dictionary}, marker size: {marker_size_cm}cm")
    
    def detect(self, image: np.ndarray) -> List[ArUcoResult]:
        """
        Detect ArUco markers in an image.
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            List of ArUcoResult objects
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect markers
        corners, ids, rejected = self.detector.detectMarkers(gray)
        
        results = []
        
        if ids is not None:
            for i, marker_id in enumerate(ids.flatten()):
                marker_corners = corners[i][0]
                
                # Calculate center
                center_x = int(np.mean(marker_corners[:, 0]))
                center_y = int(np.mean(marker_corners[:, 1]))
                
                # Calculate pixel size (average of side lengths)
                side_lengths = []
                for j in range(4):
                    p1 = marker_corners[j]
                    p2 = marker_corners[(j + 1) % 4]
                    side_lengths.append(np.linalg.norm(p2 - p1))
                pixel_size = np.mean(side_lengths)
                
                # Calculate pixels per cm
                pixels_per_cm = pixel_size / self.marker_size_cm
                
                result = ArUcoResult(
                    marker_id=int(marker_id),
                    corners=marker_corners,
                    center=(center_x, center_y),
                    pixel_size=float(pixel_size),
                    real_size_cm=self.marker_size_cm,
                    pixels_per_cm=float(pixels_per_cm)
                )
                results.append(result)
                
                logger.debug(f"Detected ArUco marker {marker_id}: {pixels_per_cm:.2f} px/cm")
        
        logger.info(f"Detected {len(results)} ArUco markers")
        return results
    
    def get_scale_factor(self, image: np.ndarray) -> Optional[float]:
        """
        Get the pixels-per-cm scale factor from detected markers.
        
        Args:
            image: Input image
            
        Returns:
            Pixels per centimeter, or None if no marker detected
        """
        results = self.detect(image)
        
        if not results:
            logger.warning("No ArUco marker detected - cannot determine scale")
            return None
        
        # Use average if multiple markers
        avg_pixels_per_cm = np.mean([r.pixels_per_cm for r in results])
        return float(avg_pixels_per_cm)
    
    def draw_markers(
        self,
        image: np.ndarray,
        results: List[ArUcoResult]
    ) -> np.ndarray:
        """
        Draw detected markers on the image.
        
        Args:
            image: Input image
            results: List of ArUcoResult objects
            
        Returns:
            Image with markers drawn
        """
        output = image.copy()
        
        for result in results:
            # Draw marker outline
            corners = result.corners.astype(int)
            cv2.polylines(output, [corners], True, (0, 255, 0), 2)
            
            # Draw center point
            cv2.circle(output, result.center, 5, (0, 0, 255), -1)
            
            # Draw marker ID and scale
            text = f"ID:{result.marker_id} ({result.pixels_per_cm:.1f}px/cm)"
            cv2.putText(
                output, text,
                (result.center[0] - 50, result.center[1] - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2
            )
        
        return output
    
    @staticmethod
    def generate_marker(
        marker_id: int = 0,
        size_pixels: int = 200,
        dictionary: str = "DICT_4X4_50"
    ) -> np.ndarray:
        """
        Generate an ArUco marker image for printing.
        
        Args:
            marker_id: ID of the marker to generate
            size_pixels: Size of the marker in pixels
            dictionary: ArUco dictionary type
            
        Returns:
            Marker image
        """
        dict_id = ArUcoDetector.ARUCO_DICTS.get(dictionary, cv2.aruco.DICT_4X4_50)
        aruco_dict = cv2.aruco.getPredefinedDictionary(dict_id)
        
        marker = cv2.aruco.generateImageMarker(aruco_dict, marker_id, size_pixels)
        
        # Add white border
        border_size = size_pixels // 4
        marker_with_border = cv2.copyMakeBorder(
            marker,
            border_size, border_size, border_size, border_size,
            cv2.BORDER_CONSTANT, value=255
        )
        
        return marker_with_border
