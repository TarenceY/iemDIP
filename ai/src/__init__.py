"""
Food Detection & Nutrition Estimation System

Architecture:
1. Computer Vision Layer (Local/Fast)
   - OpenCV ArUco Detection → Size reference
   - YOLOv8 Food Detection → Food location
   
2. Language/Reasoning Layer (Cloud/Smart)
   - Google Gemini API → Nutrition analysis
"""

__version__ = "1.0.0"
