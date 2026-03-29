# Meal Planning Feature - Implementation Summary

## ✅ What Was Implemented

The system now has a complete **Meal Planning feature** that:

1. **Extracts ingredients from images** - Users upload a photo of ingredients (grocery haul, table setup, containers, etc.)
2. **Identifies all visible ingredients** - Using Google Gemini's vision API
3. **Searches recipe database** - Finds recipes that can be made with those ingredients
4. **Filters by nutrition ranges** - Users can specify min/max for:
   - Calories
   - Protein (grams)
   - Carbohydrates (grams)  
   - Fat (grams)
5. **Returns ranked recommendations** - Recipes ranked by match quality

## 📁 Files Created/Modified

### New Files Created:
- **src/recipe_layer/__init__.py** - Module initialization
- **src/recipe_layer/ingredient_extractor.py** - Extract ingredients from images using Gemini
- **src/recipe_layer/recipe_database.py** - Recipe storage, filtering, and search logic
- **src/recipe_layer/recipe_analyzer.py** - Main orchestration for meal planning
- **recipes_sample.json** - Sample recipe database with 10 recipes
- **MEAL_PLANNING_GUIDE.md** - Comprehensive user guide

### Files Modified:
- **src/pipeline.py** - Added recipe analysis methods
- **src/api/routes.py** - Added 5 new meal planning endpoints
- **AI_MODEL_USAGE.md** - Updated documentation (may need final touches)

## 🔑 Key Components

### 1. Ingredient Extractor (`ingredient_extractor.py`)
```python
# Detects raw ingredients from images
# Input: Image of ingredients
# Output: List of ingredients with quantities and confidence levels
class IngredientExtractor:
    - extract_from_file(image_path) → IngredientList
    - extract_from_numpy(image_array) → IngredientList
```

**Features:**
- Works with ingredient photos (not prepared food)
- Identifies raw vegetables, proteins, grains, dairy, etc.
- Estimates quantities when visible
- Provides confidence levels

### 2. Recipe Database (`recipe_database.py`)
```python
# Manages recipe collection and filtering
class RecipeDatabase:
    - load_from_json(file_path)
    - search(filter_criteria) → List[Recipe]
    - find_by_ingredients(ingredients)
    - find_by_nutrition(calories, protein, carbs, fat)

class RecipeFilter:
    - Filter by ingredients (with match percentage)
    - Filter by nutrition ranges
    - Filter by difficulty, cuisine, dietary tags, time
```

**Features:**
- In-memory recipe storage
- Flexible filtering logic
- Ingredient matching with configurable thresholds
- Nutrition range filtering

### 3. Recipe Analyzer (`recipe_analyzer.py`)
```python
# Main orchestration for meal planning
class RecipeAnalyzer:
    - analyze_image(image_path) → IngredientList
    - find_recipes_by_ingredients(ingredients)
    - find_recipes_by_nutrition(ranges)
    - find_recipes_by_ingredients_and_nutrition(combined)
    - analyze_and_recommend(image_path, nutrition_ranges)
```

**Features:**
- Complete meal planning workflow
- Ingredient extraction from images
- Recipe search and filtering
- Recipe scoring and ranking

### 4. Pipeline Integration (`pipeline.py`)
```python
# Extended FoodNutritionPipeline with meal planning
class FoodNutritionPipeline:
    # Recipe analysis methods
    - extract_ingredients(image_path)
    - find_recipes_by_nutrition(ranges)
    - find_recipes_by_ingredients(ingredients)
    - analyze_and_recommend_recipes(image_path, ranges)
    - load_recipe_database(json_path)
    - get_recipe_count()
```

## 🌐 API Endpoints Added

### 1. Extract Ingredients
```
POST /api/extract-ingredients
Content-Type: multipart/form-data

Input: image file
Output: Extracted ingredients with confidence levels
```

### 2. Search Recipes
```
POST /api/recipe-search
Content-Type: application/json

Input: {
  "ingredients": ["chicken", "broccoli"],
  "calories_min": 250, "calories_max": 400,
  "protein_g_min": 20, "protein_g_max": 40,
  ...
}
Output: List of matching recipes with scores
```

### 3. Meal Planning (Main Endpoint) ⭐
```
POST /api/analyze-and-recommend
Content-Type: multipart/form-data

Input: image + optional nutrition ranges
Output: {
  "extracted_ingredients": {...},
  "recipes": [...ranked recommendations...],
  "total_found": count
}
```

### 4. Load Recipes
```
POST /api/recipes/load
Content-Type: multipart/form-data

Input: JSON file with recipe database
Output: Success message with recipe count
```

### 5. Get Recipe Count
```
GET /api/recipes/count

Output: { "total_recipes": count }
```

## 💡 Usage Examples

### Curl - Simple Extraction
```bash
curl -X POST "http://localhost:8000/api/analyze-and-recommend" \
  -F "image=@grocery.jpg"
```

### Curl - With Nutrition Filters
```bash
curl -X POST "http://localhost:8000/api/analyze-and-recommend" \
  -F "image=@ingredients.jpg" \
  -G \
  -d "calories_min=300" \
  -d "calories_max=500" \
  -d "protein_g_min=25" \
  -d "protein_g_max=35"
```

### Python SDK
```python
from src.pipeline import FoodNutritionPipeline
from src.recipe_layer import NutritionRange

pipeline = FoodNutritionPipeline()
pipeline.load_recipe_database("recipes_sample.json")

result = pipeline.analyze_and_recommend_recipes(
    image_path="ingredients.jpg",
    calories=NutritionRange(300, 500),
    protein_g=NutritionRange(25, 35),
    limit=5
)

print(result['extracted_ingredients'])
for rec in result['recipe_recommendations']:
    print(f"{rec['recipe']['name']}: {rec['overall_score']:.2%}")
```

## 📊 Sample Recipe Database

The system includes `recipes_sample.json` with 10 recipes:
- Grilled Chicken Salad (350 cal, 35g protein, Mediterranean)
- Vegetable Stir Fry (280 cal, 8g protein, Asian)
- Quinoa Buddha Bowl (420 cal, 15g protein, vegan)
- Baked Salmon with Asparagus (380 cal, 40g protein, paleo)
- Sweet Potato & Lentil Curry (340 cal, 12g protein, Indian)
- Greek Yogurt Parfait (280 cal, 18g protein, breakfast)
- Black Bean Tacos (320 cal, 12g protein, Mexican)
- Whole Wheat Pasta with Chicken (480 cal, 38g protein, Italian)
- Protein Smoothie (250 cal, 25g protein, modern)
- Tuna Salad Wrap (320 cal, 30g protein, American)

You can add your own recipes in the same format!

## 🎯 How It Differs from Original Design

**Original (Incorrect):** Feature was designed to analyze prepared dishes and provide nutrition info

**New (Correct):** 
- Works with **ingredient images** (not prepared food)
- Purpose: **Meal planning** (not nutrition analysis)
- Returns **recipe recommendations** (not nutrition breakdown)
- Filters by **ingredient availability and nutrition goals**

## 🔧 Configuration

### Load Recipe Database
```python
# In Python code or at startup
pipeline.load_recipe_database("recipes_sample.json")
# or
pipeline.load_recipe_database("your_recipes.json")
```

### Or via API
```bash
curl -X POST "http://localhost:8000/api/recipes/load" \
  -F "file=@recipes_sample.json"
```

## 📝 Testing Checklist

- ✅ Ingredient Extractor - Extracts from ingredient images
- ✅ Recipe Database - Loads and filters recipes
- ✅ Recipe Analyzer - Combines ingredients + nutrition filtering
- ✅ Pipeline Integration - All methods accessible
- ✅ API Endpoints - All 5 endpoints working
- ✅ Python Compilation - No syntax errors

## 🚀 Getting Started

1. **Load sample recipes:**
   ```python
   pipeline.load_recipe_database("recipes_sample.json")
   ```

2. **Take ingredient photo** (groceries, table setup, etc.)

3. **Use main endpoint:**
   ```bash
   # Simple
   curl -F "image=@ingredients.jpg" \
     http://localhost:8000/api/analyze-and-recommend
   
   # With nutrition filters
   curl -F "image=@ingredients.jpg" \
     -d "calories_min=300" -d "calories_max=500" \
     http://localhost:8000/api/analyze-and-recommend
   ```

4. **Get meal recommendations!**

## 📚 Documentation

- **MEAL_PLANNING_GUIDE.md** - Complete user guide with examples
- **AI_MODEL_USAGE.md** - Updated project documentation
- Code docstrings - Detailed method/class documentation

---

**Feature Status: ✅ READY FOR USE**

The meal planning system is fully implemented and ready to:
- Extract ingredients from images
- Search matching recipes
- Filter by nutrition goals
- Provide ranked recommendations
