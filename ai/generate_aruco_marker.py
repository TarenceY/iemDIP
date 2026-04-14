"""
Generate an ArUco marker for testing CV detection.
Print this at the specified size (5cm x 5cm by default).
"""

import cv2
import sys
from pathlib import Path

def generate_marker(marker_id=0, size_pixels=500, output_file="aruco_marker.png"):
    """
    Generate an ArUco marker image.
    
    Args:
        marker_id: ID of the marker (0-49 for DICT_4X4_50)
        size_pixels: Size in pixels (output will be this x this)
        output_file: Where to save the image
    """
    try:
        # Use OpenCV's ArUco module
        aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
        
        # Generate the marker
        marker_image = cv2.aruco.generateImageMarker(aruco_dict, marker_id, size_pixels)
        
        # Add border (white space around)
        border_size = 50
        marker_with_border = cv2.copyMakeBorder(
            marker_image,
            border_size, border_size, border_size, border_size,
            cv2.BORDER_CONSTANT,
            value=[255, 255, 255]
        )
        
        # Save
        cv2.imwrite(output_file, marker_with_border)
        
        print("✓ ArUco marker generated successfully!")
        print(f"✓ Saved to: {Path(output_file).absolute()}")
        print(f"\n📏 PRINTING INSTRUCTIONS:")
        print(f"  1. Open '{output_file}' in an image viewer")
        print(f"  2. Print at 100% scale (5cm x 5cm = ~2in x 2in)")
        print(f"  3. Use HIGH QUALITY printing (best/photo quality)")
        print(f"  4. Print on WHITE paper")
        print(f"  5. Laminate if possible for durability")
        print(f"\n📸 USAGE INSTRUCTIONS:")
        print(f"  1. Place the printed marker beside your food")
        print(f"  2. Make sure the marker is flat and in the frame")
        print(f"  3. Ensure good lighting (no shadows on the marker)")
        print(f"  4. Take a photo with the food and marker in frame")
        print(f"  5. Save as 'test_image.jpg' in the ai/ folder")
        print(f"  6. Run: python test_cv_detection.py")
        
    except Exception as e:
        print(f"✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    # Generate marker
    print("\n" + "="*60)
    print("ArUco Marker Generator")
    print("="*60 + "\n")
    
    generate_marker(marker_id=0, size_pixels=500, output_file="aruco_marker.png")
    
    print("\n" + "="*60)
    print("✓ Ready to test!")
    print("="*60)
