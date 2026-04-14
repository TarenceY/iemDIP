"""
Generate a 5x5 ArUco marker specifically for your setup.
"""

import cv2
from src.cv_layer.aruco_detector import ArUcoDetector

print("\nGenerating 5x5 ArUco Marker...")
print("="*60)

# Generate 5x5 marker (5x5 grid, 50mm ID range)
marker = ArUcoDetector.generate_marker(
    marker_id=0,
    size_pixels=800,  # Large for high-quality printing
    dictionary="DICT_5X5_50"
)

output_file = "aruco_5x5_marker.png"
cv2.imwrite(output_file, marker)

print(f"✓ Generated: {output_file}")
print(f"\n📋 PRINTING INSTRUCTIONS:")
print(f"  1. Open '{output_file}' in an image viewer")
print(f"  2. Print at 100% scale (should be ~5cm x 5cm = ~2in x 2in)")
print(f"  3. Use HIGH QUALITY printing (photo/best quality)")
print(f"  4. Print on WHITE paper")
print(f"  5. Use a ruler to verify it's exactly 5cm x 5cm")
print(f"  6. Optional: Laminate for durability")
print(f"\n📸 TESTING:")
print(f"  1. Place marker beside food")
print(f"  2. Take clear photo (good lighting, top-down angle)")
print(f"  3. Save as: test_image.jpg")
print(f"  4. Run: python test_cv_detection.py")
print(f"\n💡 OR run advanced diagnostic:")
print(f"  python diagnose_cv.py")
