"""
Advanced CV Detection Diagnostic - Tests both ArUco detection and YOLO detections
"""

import cv2
import numpy as np
from pathlib import Path
import sys

def diagnose_image(image_path: str):
    """Deep diagnostic of what's happening in the image."""
    print("\n" + "="*70)
    print("ADVANCED CV DIAGNOSTICS")
    print("="*70)
    
    image = cv2.imread(image_path)
    if image is None:
        print(f"✗ Could not load image: {image_path}")
        return
    
    print(f"✓ Image loaded: {image.shape}")
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # --- 1. TEST ARUCO WITH DIFFERENT DICTIONARIES ---
    print("\n" + "="*70)
    print("1. TESTING ARUCO MARKERS (Testing all dictionary types)")
    print("="*70)
    
    dictionaries = [
        ("DICT_4X4_50", cv2.aruco.DICT_4X4_50),
        ("DICT_5X5_50", cv2.aruco.DICT_5X5_50),
        ("DICT_6X6_50", cv2.aruco.DICT_6X6_50),
        ("DICT_4X4_100", cv2.aruco.DICT_4X4_100),
        ("DICT_5X5_100", cv2.aruco.DICT_5X5_100),
    ]
    
    best_dict = None
    best_markers = 0
    
    for dict_name, dict_id in dictionaries:
        try:
            aruco_dict = cv2.aruco.getPredefinedDictionary(dict_id)
            parameters = cv2.aruco.DetectorParameters()
            detector = cv2.aruco.ArucoDetector(aruco_dict, parameters)
            corners, ids, rejected = detector.detectMarkers(gray)
            
            marker_count = len(ids) if ids is not None else 0
            print(f"\n  {dict_name}: {marker_count} markers found")
            
            if marker_count > 0:
                print(f"    ✓ FOUND! Marker IDs: {ids.flatten().tolist()}")
                if marker_count > best_markers:
                    best_markers = marker_count
                    best_dict = dict_name
        except Exception as e:
            print(f"  {dict_name}: ERROR - {e}")
    
    if best_dict:
        print(f"\n✓ BEST MATCH: {best_dict} ({best_markers} markers)")
    else:
        print(f"\n✗ NO ArUco markers detected with any dictionary")
    
    # --- 2. TEST YOLO OBJECT DETECTION ---
    print("\n" + "="*70)
    print("2. TESTING YOLO OBJECT DETECTION")
    print("="*70)
    
    try:
        from ultralytics import YOLO
        
        model = YOLO("yolov8n.pt")
        results = model(image, conf=0.2, verbose=False)  # Very low threshold
        
        if results:
            detections = results[0].boxes
            print(f"\n  ✓ YOLO ran successfully")
            print(f"  Detected {len(detections)} objects at 0.2 confidence:")
            
            # Get class names
            names = model.names
            
            if len(detections) > 0:
                for box in detections:
                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    class_name = names.get(class_id, f"class_{class_id}")
                    print(f"    - {class_name}: {confidence:.1%} confidence")
            else:
                print(f"    ⚠ No objects detected")
        
    except Exception as e:
        print(f"  ✗ YOLO error: {e}")
    
    # --- 3. IMAGE QUALITY ANALYSIS ---
    print("\n" + "="*70)
    print("3. IMAGE QUALITY ANALYSIS")
    print("="*70)
    
    brightness = np.mean(gray)
    contrast = np.std(gray)
    
    print(f"\n  Brightness: {brightness:.0f}/255", end="")
    if brightness < 50:
        print(" ✗ TOO DARK - Need better lighting")
    elif brightness > 200:
        print(" ✗ TOO BRIGHT - Reduce glare")
    else:
        print(" ✓ GOOD")
    
    print(f"  Contrast: {contrast:.0f}", end="")
    if contrast < 20:
        print(" ✗ TOO LOW - Increase background contrast")
    elif contrast > 100:
        print(" ✓ EXCELLENT")
    else:
        print(" ✓ GOOD")
    
    # Edge detection
    edges = cv2.Canny(gray, 100, 150)
    edge_count = np.count_nonzero(edges)
    print(f"  Edge pixels: {edge_count}", end="")
    if edge_count < 1000:
        print(" ⚠ Low - image may be blurry")
    else:
        print(" ✓ Good sharpness")
    
    # --- 4. RECOMMENDATIONS ---
    print("\n" + "="*70)
    print("4. RECOMMENDATIONS")
    print("="*70)
    
    recommendations = []
    
    if best_dict:
        recommendations.append(f"✓ Update cv_pipeline.py to use: aruco_dict=\"{best_dict}\"")
    else:
        recommendations.append("✗ ArUco marker NOT found - check marker quality and lighting")
        recommendations.append("  → Ensure marker is 5x5 50mm")
        recommendations.append("  → Check that marker is in frame and clearly visible")
        recommendations.append("  → Try better lighting (no shadows on marker)")
    
    if brightness < 50 or brightness > 200:
        recommendations.append("⚠ Improve image lighting")
    
    if contrast < 20:
        recommendations.append("⚠ Use contrasting background (white food on dark plate)")
    
    print()
    for rec in recommendations:
        print(f"  {rec}")
    
    # --- 5. DETAILED TROUBLESHOOTING ---
    print("\n" + "="*70)
    print("5. QUICK FIXES TO TRY")
    print("="*70)
    print("""
  If ArUco NOT detected:
    1. Verify marker size is exactly 5cm x 5cm when printed
    2. Print at 5x5 50mm (use a ruler to verify)
    3. Try different market positions in the frame
    4. Ensure marker has white border around it
    5. Try: python generate_aruco_marker.py (generate new test marker)

  If YOLO not detecting food:
    1. YOLO detects general objects, not specifically "food"
    2. It should detect: apple, banana, cup, plate, bowl, etc.
    3. If no objects detected:
       - Image too dark/blurry
       - Objects too small
       - Try larger/clearer food items
    4. To use food-specific model:
       - Download: yolov8n-foods.pt 
       - Or use: yolov8m.pt (more accurate)
    """)

if __name__ == "__main__":
    # Find test image
    test_image = None
    if Path("test_image.jpg").exists():
        test_image = "test_image.jpg"
    elif Path("results").exists():
        for img_file in Path("results").glob("*.jpg"):
            test_image = str(img_file)
            break
    
    if test_image:
        print(f"\n📷 Using image: {test_image}")
        diagnose_image(test_image)
    else:
        print("✗ No test image found")
        print(f"  Place your meal photo as: {Path('test_image.jpg').absolute()}")
        sys.exit(1)
