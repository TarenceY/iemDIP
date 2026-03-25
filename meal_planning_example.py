#!/usr/bin/env python3
"""
Meal Planning Feature - Complete Code Example

This example demonstrates how to use the meal planning system to:
1. Extract ingredients from an image
2. Find matching recipes
3. Filter by nutrition requirements
4. Get ranked recommendations
"""

from src.pipeline import FoodNutritionPipeline
from src.recipe_layer import NutritionRange
import json


def main():
    print("=" * 60)
    print("MEAL PLANNING SYSTEM - EXAMPLE USAGE")
    print("=" * 60)
    
    # Initialize pipeline
    print("\n1️⃣  Initializing pipeline...")
    pipeline = FoodNutritionPipeline(
        gemini_api_key="your-api-key"  # Set GEMINI_API_KEY env var
    )
    
    # Load recipe database
    print("2️⃣  Loading recipe database...")
    pipeline.load_recipe_database("recipes_sample.json")
    print(f"   ✓ Loaded {pipeline.get_recipe_count()} recipes")
    
    # ========================================================================
    # EXAMPLE 1: Simple ingredient extraction
    # ========================================================================
    print("\n" + "=" * 60)
    print("EXAMPLE 1: Extract Ingredients from Image")
    print("=" * 60)
    
    try:
        ingredients = pipeline.extract_ingredients("path/to/ingredients.jpg")
        
        print(f"\n📸 Image Analysis:")
        print(f"   Total items detected: {ingredients.total_items_found}")
        print(f"   Confidence level: {ingredients.analysis_confidence}")
        if ingredients.analysis_summary:
            print(f"   Summary: {ingredients.analysis_summary}")
        
        print(f"\n🥬 Detected Ingredients:")
        for ing in ingredients.ingredients:
            print(f"   • {ing.name.title()}")
            if ing.quantity:
                print(f"     Quantity: {ing.quantity} {ing.unit or ''}")
            print(f"     Confidence: {ing.confidence}")
            if ing.notes:
                print(f"     Notes: {ing.notes}")
    
    except FileNotFoundError:
        print("   ⚠️  Image file not found. Skipping to next example...")
        # For demo, create sample ingredient list
        sample_ingredients = [
            "chicken breast", "broccoli", "rice", "olive oil", 
            "garlic", "onion", "carrots", "bell pepper"
        ]
    
    # ========================================================================
    # EXAMPLE 2: Find recipes by ingredients only
    # ========================================================================
    print("\n" + "=" * 60)
    print("EXAMPLE 2: Find Recipes Using Specific Ingredients")
    print("=" * 60)
    
    search_ingredients = ["chicken", "lettuce", "tomato", "olive oil"]
    print(f"\n🔍 Searching for recipes with: {', '.join(search_ingredients)}")
    
    recommendations = pipeline.find_recipes_by_ingredients(
        ingredients=search_ingredients,
        match_percentage=0.5  # Must have 50% of ingredients
    )
    
    print(f"\n✅ Found {len(recommendations)} matching recipes:\n")
    for i, rec in enumerate(recommendations[:5], 1):
        recipe = rec.recipe
        print(f"{i}. {recipe.name}")
        print(f"   Ingredients: {', '.join(recipe.ingredients[:3])}...")
        print(f"   Nutrition: {recipe.nutrition.calories:.0f} cal, "
              f"{recipe.nutrition.protein_g:.0f}g protein")
        print(f"   Match Score: {rec.overall_score:.1%}\n")
    
    # ========================================================================
    # EXAMPLE 3: Find recipes by nutrition ranges
    # ========================================================================
    print("\n" + "=" * 60)
    print("EXAMPLE 3: Find Recipes by Nutrition Requirements")
    print("=" * 60)
    print("\n📊 Searching for LOW-CARB recipes (<30g carbs):")
    
    low_carb_recipes = pipeline.find_recipes_by_nutrition(
        calories=NutritionRange(200, 400),
        protein_g=NutritionRange(20, 40),
        carbohydrates_g=NutritionRange(0, 30),
        fat_g=NutritionRange(5, 25)
    )
    
    print(f"✅ Found {len(low_carb_recipes)} recipes matching criteria:\n")
    for i, recipe in enumerate(low_carb_recipes[:5], 1):
        print(f"{i}. {recipe.name}")
        nutrition = recipe.nutrition
        print(f"   Calories: {nutrition.calories}")
        print(f"   Protein: {nutrition.protein_g}g | "
              f"Carbs: {nutrition.carbohydrates_g}g | "
              f"Fat: {nutrition.fat_g}g")
        print(f"   Difficulty: {recipe.difficulty} | Cuisine: {recipe.cuisine}\n")
    
    # ========================================================================
    # EXAMPLE 4: Complete meal planning workflow
    # ========================================================================
    print("\n" + "=" * 60)
    print("EXAMPLE 4: Complete Meal Planning Workflow")
    print("=" * 60)
    print("\nScenario: High-protein meal plan (<400 cal, 25-40g protein)")
    print("Uploading image of ingredients...\n")
    
    try:
        # This is the main meal planning endpoint
        result = pipeline.analyze_and_recommend_recipes(
            image_path="path/to/ingredients.jpg",
            calories=NutritionRange(200, 400),
            protein_g=NutritionRange(25, 40),
            carbohydrates_g=NutritionRange(15, 45),
            fat_g=NutritionRange(5, 20),
            limit=10
        )
        
        if result['success']:
            print("✅ Meal Planning Results:\n")
            
            # Show extracted ingredients
            ingredients = result['extracted_ingredients']
            print(f"📸 Extracted {ingredients['total_items_found']} ingredients:")
            for ing in ingredients['ingredients'][:5]:
                print(f"   • {ing['name']}")
            if ingredients['total_items_found'] > 5:
                print(f"   ... and {ingredients['total_items_found'] - 5} more")
            
            # Show recipe recommendations
            recipes = result['recipe_recommendations']
            print(f"\n🍽️  Found {result['total_recommendations']} matching recipes:\n")
            
            for i, rec in enumerate(recipes[:5], 1):
                recipe = rec['recipe']
                nutrition = recipe['nutrition']
                print(f"{i}. {recipe['name']}")
                print(f"   📊 Nutrition: {nutrition['calories']}cal | "
                      f"{nutrition['protein_g']}g protein | "
                      f"{nutrition['carbohydrates_g']}g carbs | "
                      f"{nutrition['fat_g']}g fat")
                print(f"   🎯 Match Score: {rec['overall_score']:.1%}")
                print(f"   ✓ Using: {', '.join(rec['matching_ingredients'])}\n")
        else:
            print(f"❌ Error: {result.get('error')}")
    
    except FileNotFoundError:
        print("   ⚠️  Image not found. Using example workflow...\n")
    
    # ========================================================================
    # EXAMPLE 5: Advanced - Custom nutrition requirements
    # ========================================================================
    print("\n" + "=" * 60)
    print("EXAMPLE 5: Advanced - Custom Nutrition Requirements")
    print("=" * 60)
    
    # Scenario: Balanced macros for muscle gain
    print("\nScenario: MUSCLE BUILDING - High protein, moderate carbs")
    print("Target: 400-500 cal, 35-45g protein, 40-50g carbs, 10-15g fat\n")
    
    muscle_building_recipes = pipeline.find_recipes_by_nutrition(
        calories=NutritionRange(400, 500),
        protein_g=NutritionRange(35, 45),
        carbohydrates_g=NutritionRange(40, 50),
        fat_g=NutritionRange(10, 15)
    )
    
    print(f"✅ Found {len(muscle_building_recipes)} recipes:\n")
    for i, recipe in enumerate(muscle_building_recipes[:5], 1):
        n = recipe.nutrition
        print(f"{i}. {recipe.name}")
        print(f"   Macros: {n.protein_g}/{n.carbohydrates_g}/{n.fat_g} (P/C/F)")
        print(f"   Calories: {n.calories} | Prep: {recipe.prep_time_min}min | "
              f"Difficulty: {recipe.difficulty}\n")
    
    # ========================================================================
    # EXAMPLE 6: Export results to JSON
    # ========================================================================
    print("\n" + "=" * 60)
    print("EXAMPLE 6: Export Results to JSON")
    print("=" * 60)
    
    # Get some results to export
    export_results = {
        "meal_plan_query": {
            "nutrition_goals": {
                "calories": {"min": 250, "max": 400},
                "protein_g": {"min": 20, "max": 40}
            }
        },
        "recommendations": []
    }
    
    recommendations = pipeline.find_recipes_by_nutrition(
        calories=NutritionRange(250, 400),
        protein_g=NutritionRange(20, 40)
    )
    
    for rec in recommendations[:3]:
        export_results["recommendations"].append({
            "recipe": rec.to_dict(include_instructions=False),
            "cuisine": rec.cuisine,
            "difficulty": rec.difficulty
        })
    
    # Save to file
    with open("meal_plan_results.json", "w") as f:
        json.dump(export_results, f, indent=2)
    
    print("✅ Results exported to 'meal_plan_results.json'")
    print(json.dumps(export_results, indent=2)[:500] + "...\n")
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print("""
✅ The meal planning system can:

1. ✓ Extract ingredients from images
2. ✓ Find recipes using those ingredients
3. ✓ Filter by nutrition requirements (calories, protein, carbs, fat)
4. ✓ Return ranked recommendations
5. ✓ Export results to JSON

🎯 Key Features:
   • High-protein meal plans
   • Low-carb/keto recipes
   • Balanced nutrition plans
   • Custom ingredient matching
   • Flexible nutrition ranges

📚 API Endpoints:
   POST /api/extract-ingredients
   POST /api/recipe-search
   POST /api/analyze-and-recommend  (Main endpoint)
   POST /api/recipes/load
   GET /api/recipes/count

🚀 Ready for production use!
    """)


if __name__ == "__main__":
    # Note: Replace image paths with actual ingredient images
    # The system works best with clear photos of:
    # - Ingredients on a table
    # - Grocery hauls
    # - Items in containers
    # - Pantry contents
    
    try:
        main()
    except ImportError as e:
        print(f"⚠️  Import Error: {e}")
        print("Make sure to: pip install -r requirements.txt")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
