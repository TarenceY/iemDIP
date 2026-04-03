"""
Food Nutrition Analysis System - Main Entry Point

Run the API server:
    python main.py

Or use uvicorn directly:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import os
import argparse
import json
import numpy as np
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


def convert_to_serializable(obj):
    """Convert numpy types to Python native types for JSON serialization."""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_to_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(i) for i in obj]
    return obj


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
        print(json.dumps(convert_to_serializable(result.nutrition_data), indent=2))
        print("\n" + "="*50)
        print("CV DETECTION DATA")
        print("="*50)
        print(json.dumps(convert_to_serializable(result.cv_data), indent=2))
        
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


def analyze_and_recommend_recipes(
    image_path: str,
    calorie_min: float = None,
    calorie_max: float = None,
    protein_min_g: float = None,
    protein_max_g: float = None,
    carbs_min_g: float = None,
    carbs_max_g: float = None,
    fat_min_g: float = None,
    fat_max_g: float = None,
    recipe_db_path: str = None
):
    """
    Analyze ingredients and recommend recipes from command line.
    
    Args:
        image_path: Path to ingredient image
        calorie_min/max: Calorie range
        protein_min/max_g: Protein range in grams
        carbs_min/max_g: Carbohydrate range in grams
        fat_min/max_g: Fat range in grams
        recipe_db_path: Path to recipe database JSON file
    """
    from src.pipeline import FoodNutritionPipeline
    
    logger.info(f"Analyzing ingredients for meal planning: {image_path}")
    
    # Determine recipe database path
    if recipe_db_path is None:
        # Look for recipes_sample.json in current directory or parent directories
        search_paths = [
            Path("recipes_sample.json"),
            Path("..") / "recipes_sample.json",
            Path(".") / ".." / "recipes_sample.json"
        ]
        for p in search_paths:
            if p.exists():
                recipe_db_path = str(p)
                break
    
    # Initialize pipeline with recipe database
    pipeline = FoodNutritionPipeline(recipe_database_path=recipe_db_path)
    
    # Run analysis and recommendations
    result = pipeline.analyze_and_recommend_recipes(
        image_path=image_path,
        calorie_min=calorie_min,
        calorie_max=calorie_max,
        protein_min_g=protein_min_g,
        protein_max_g=protein_max_g,
        carbs_min_g=carbs_min_g,
        carbs_max_g=carbs_max_g,
        fat_min_g=fat_min_g,
        fat_max_g=fat_max_g
    )
    
    if result["success"]:
        print("\n" + "="*60)
        print("MEAL PLANNING ANALYSIS RESULTS")
        print("="*60)
        
        # Print extracted ingredients
        print("\nEXTRACTED INGREDIENTS:")
        print("-" * 60)
        for ing in result.get("extracted_ingredients", []):
            print(f"  • {ing['quantity_value']}{ing['unit']} {ing['name']} (confidence: {ing['confidence']})")
        
        if result.get("ingredient_analysis_summary"):
            print(f"\nAnalysis Summary: {result['ingredient_analysis_summary']}")
        if result.get("total_weight_estimate_g"):
            print(f"Total Weight Estimate: {result['total_weight_estimate_g']}g")
        
        # Print recipe recommendations
        print("\n" + "="*60)
        print("RECIPE RECOMMENDATIONS:")
        print("="*60)
        
        recommendations = result.get("recipe_recommendations", [])
        if recommendations:
            for idx, recipe in enumerate(recommendations, 1):
                print(f"\n{idx}. {recipe['recipe_name']}")
                print(f"   Difficulty: {recipe['difficulty']} | Cuisine: {recipe['cuisine']}")
                print(f"   Prep: {recipe['prep_time_min']}min | Cook: {recipe['cook_time_min']}min | Servings: {recipe['servings']}")
                print(f"   Nutrition: {recipe['nutrition']['calories']:.0f} cal | P: {recipe['nutrition']['protein_g']:.1f}g | C: {recipe['nutrition']['carbohydrates_g']:.1f}g | F: {recipe['nutrition']['fat_g']:.1f}g")
                print(f"   Match Scores: Ingredients {recipe['ingredient_match_score']:.2f} | Nutrition {recipe['nutrition_match_score']:.2f} | Overall {recipe['overall_score']:.2f}")
                print(f"   Tags: {', '.join(recipe['dietary_tags'])}")
                print(f"   Matching Ingredients: {', '.join(recipe['matching_ingredients'])}")
        else:
            print("\nNo recipes found matching your ingredients and nutrition requirements.")
    else:
        print(f"\nAnalysis failed: {result.get('error')}")


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
    
    # Meal Planning command
    meal_plan_parser = subparsers.add_parser("meal-plan", help="Analyze ingredients and recommend recipes")
    meal_plan_parser.add_argument("image", help="Path to the ingredient image")
    meal_plan_parser.add_argument("--calorie-min", type=float, help="Minimum calories")
    meal_plan_parser.add_argument("--calorie-max", type=float, help="Maximum calories")
    meal_plan_parser.add_argument("--protein-min", type=float, help="Minimum protein (g)")
    meal_plan_parser.add_argument("--protein-max", type=float, help="Maximum protein (g)")
    meal_plan_parser.add_argument("--carbs-min", type=float, help="Minimum carbs (g)")
    meal_plan_parser.add_argument("--carbs-max", type=float, help="Maximum carbs (g)")
    meal_plan_parser.add_argument("--fat-min", type=float, help="Minimum fat (g)")
    meal_plan_parser.add_argument("--fat-max", type=float, help="Maximum fat (g)")
    meal_plan_parser.add_argument("--recipes", "-r", help="Path to recipe database JSON")
    
    # Generate ArUco command
    aruco_parser = subparsers.add_parser("aruco", help="Generate ArUco marker")
    aruco_parser.add_argument("--id", type=int, default=0, help="Marker ID (0-49)")
    aruco_parser.add_argument("--output", "-o", default="aruco_marker.png", help="Output file path")
    
    args = parser.parse_args()
    
    if args.command == "server":
        run_server(args.host, args.port, args.reload)
    elif args.command == "analyze":
        analyze_image(args.image, args.output)
    elif args.command == "meal-plan":
        analyze_and_recommend_recipes(
            image_path=args.image,
            calorie_min=args.calorie_min,
            calorie_max=args.calorie_max,
            protein_min_g=args.protein_min,
            protein_max_g=args.protein_max,
            carbs_min_g=args.carbs_min,
            carbs_max_g=args.carbs_max,
            fat_min_g=args.fat_min,
            fat_max_g=args.fat_max,
            recipe_db_path=args.recipes
        )
    elif args.command == "aruco":
        generate_aruco(args.id, args.output)
    else:
        # Default: run server
        run_server()
