"""
Food Nutrition Analysis System - Main Entry Point

Run the API server:
    python main.py

Or use uvicorn directly:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import os
import argparse
from pathlib import Path
from dotenv import load_dotenv
from loguru import logger

# Load environment variables
load_dotenv()

# Configure logging
logger.add(
    "logs/app_{time:YYYY-MM-DD}.log",
    rotation="1 day",
    retention="7 days",
    level="INFO"
)


def run_server(host: str = "0.0.0.0", port: int = 8000, reload: bool = False):
    """Run the FastAPI server."""
    import uvicorn
    
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run(
        "src.api.routes:app",
        host=host,
        port=port,
        reload=reload
    )


def analyze_image(image_path: str, output_dir: str = None):
    """Run analysis on a single image from command line."""
    from src.pipeline import FoodNutritionPipeline
    import json
    
    logger.info(f"Analyzing image: {image_path}")
    
    pipeline = FoodNutritionPipeline()
    result = pipeline.analyze(
        image_path=image_path,
        save_annotated=True,
        output_dir=output_dir
    )
    
    if result.success:
        print("\n" + "="*50)
        print("NUTRITION ANALYSIS RESULTS")
        print("="*50)
        print(json.dumps(result.nutrition_data, indent=2))
        print("\n" + "="*50)
        print("CV DETECTION DATA")
        print("="*50)
        print(json.dumps(result.cv_data, indent=2))
        
        if result.annotated_image_path:
            print(f"\nAnnotated image saved to: {result.annotated_image_path}")
    else:
        print(f"\nAnalysis failed: {result.error}")


def generate_aruco(marker_id: int = 0, output_path: str = "aruco_marker.png"):
    """Generate an ArUco marker for printing."""
    from src.cv_layer.aruco_detector import ArUcoDetector
    import cv2
    
    marker = ArUcoDetector.generate_marker(marker_id, size_pixels=400)
    cv2.imwrite(output_path, marker)
    
    print(f"ArUco marker (ID: {marker_id}) saved to: {output_path}")
    print(f"Print this marker at 5cm x 5cm for accurate measurements.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Food Nutrition Analysis System"
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Server command
    server_parser = subparsers.add_parser("server", help="Run the API server")
    server_parser.add_argument("--host", default="0.0.0.0", help="Host address")
    server_parser.add_argument("--port", type=int, default=8000, help="Port number")
    server_parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    
    # Analyze command
    analyze_parser = subparsers.add_parser("analyze", help="Analyze a food image")
    analyze_parser.add_argument("image", help="Path to the food image")
    analyze_parser.add_argument("--output", "-o", help="Output directory for annotated image")
    
    # Generate ArUco command
    aruco_parser = subparsers.add_parser("aruco", help="Generate ArUco marker")
    aruco_parser.add_argument("--id", type=int, default=0, help="Marker ID (0-49)")
    aruco_parser.add_argument("--output", "-o", default="aruco_marker.png", help="Output file path")
    
    args = parser.parse_args()
    
    if args.command == "server":
        run_server(args.host, args.port, args.reload)
    elif args.command == "analyze":
        analyze_image(args.image, args.output)
    elif args.command == "aruco":
        generate_aruco(args.id, args.output)
    else:
        # Default: run server
        run_server()
