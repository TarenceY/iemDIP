# Meal Planning Feature - Complete Guide

## Overview

The **Meal Planning Feature** allows users to upload an image of their ingredients and get personalized recipe recommendations based on:
- The ingredients they have available
- Their nutrition goals (calories, protein, carbs, fat)

This is perfect for:
- Planning weekly meals from grocery hauls
- Finding recipes from pantry items
- Meeting specific dietary requirements
- Reducing food waste by using available ingredients

## How It Works

### Step 1: Capture Ingredient Image
Take a photo showing:
- Ingredients on a table
- Items in containers or bowls
- Grocery bags/haul
- Fridge or pantry contents
- Kitchen ingredients laid out

**Tips:**
- Clear lighting and good contrast
- All ingredients visible in frame
- Avoid shadows and glare

### Step 2: Upload Image
Send the image to the meal planning endpoint.

### Step 3: System Extracts Ingredients
The AI uses Google Gemini to identify:
- All visible raw ingredients
- Quantities where identifiable
- Food categories (vegetables, proteins, grains, etc.)
- Confidence levels for each detection

### Step 4: Search Recipe Database
Searches for recipes that use those ingredients.

### Step 5: Filter by Nutrition
Optionally filter by:
- **Calories**: min/max per serving
- **Protein**: min/max grams
- **Carbohydrates**: min/max grams
- **Fat**: min/max grams

### Step 6: Get Ranked Recommendations
Receive recipes ranked by:
- How many of your ingredients they use
- How well they match your nutrition goals
- Overall relevance score

## API Usage

### Main Endpoint: `/api/analyze-and-recommend`

**Method:** POST  
**Content-Type:** multipart/form-data

**Parameters:**
- `image` (required): Image file containing ingredients
- `calories_min` (optional): Minimum calories per serving
- `calories_max` (optional): Maximum calories per serving
- `protein_g_min` (optional): Minimum protein in grams
- `protein_g_max` (optional): Maximum protein in grams
- `carbohydrates_g_min` (optional): Minimum carbohydrates
- `carbohydrates_g_max` (optional): Maximum carbohydrates
- `fat_g_min` (optional): Minimum fat in grams
- `fat_g_max` (optional): Maximum fat in grams
- `limit` (optional): Max recipes to return (default: 5)

### cURL Example

```bash
# Simple: Extract ingredients only
curl -X POST "http://localhost:8000/api/analyze-and-recommend" \
  -F "image=@ingredients.jpg"

# With nutrition filters
curl -X POST "http://localhost:8000/api/analyze-and-recommend" \
  -F "image=@ingredients.jpg" \
  -G \
  -d "calories_min=200" \
  -d "calories_max=400" \
  -d "protein_g_min=20" \
  -d "protein_g_max=40" \
  -d "limit=5"
```

### Python Example

```python
import requests

# Load and upload image
with open("ingredients.jpg", "rb") as f:
    files = {"image": f}
    params = {
        "calories_min": 250,
        "calories_max": 400,
        "protein_g_min": 20,
        "protein_g_max": 40,
        "limit": 5
    }
    
    response = requests.post(
        "http://localhost:8000/api/analyze-and-recommend",
        files=files,
        params=params
    )

if response.status_code == 200:
    result = response.json()
    
    print("✅ Meal Planning Results")
    print(f"Detected Ingredients: {result['extracted_ingredients']['total_items_found']}")
    
    print(f"\n🍽️  Found {result['total_found']} recipes matching your criteria:\n")
    
    for i, recipe_rec in enumerate(result['recipes'], 1):
        recipe = recipe_rec['recipe']
        print(f"{i}. {recipe['name']}")
        print(f"   Calories: {recipe['nutrition']['calories']}")
        print(f"   Protein: {recipe['nutrition']['protein_g']}g")
        print(f"   Carbs: {recipe['nutrition']['carbohydrates_g']}g")
        print(f"   Fat: {recipe['nutrition']['fat_g']}g")
        print(f"   Match Score: {recipe_rec['overall_score']:.2%}")
        print(f"   Using: {', '.join(recipe_rec['matching_ingredients'])}")
        print()
```

### Python SDK Example

```python
from src.pipeline import FoodNutritionPipeline
from src.recipe_layer import NutritionRange

# Initialize
pipeline = FoodNutritionPipeline(gemini_api_key="your-key")
pipeline.load_recipe_database("recipes_sample.json")

# Meal planning with nutrition filter
result = pipeline.analyze_and_recommend_recipes(
    image_path="ingredients.jpg",
    calories=NutritionRange(min_value=250, max_value=400),
    protein_g=NutritionRange(min_value=20, max_value=40),
    carbohydrates_g=NutritionRange(min_value=20, max_value=50),
    fat_g=NutritionRange(min_value=10, max_value=20),
    limit=10
)

# Display results
if result['success']:
    print("Detected Ingredients:")
    for ing in result['extracted_ingredients']['ingredients']:
        print(f"  • {ing['name']} ({ing['confidence']} confidence)")
    
    print("\nRecipe Recommendations:")
    for rec in result['recipe_recommendations']:
        print(f"  • {rec['recipe']['name']}")
        print(f"    Match Score: {rec['overall_score']:.2%}")
```

## Separate Endpoints

### Extract Ingredients Only

```bash
curl -X POST "http://localhost:8000/api/extract-ingredients" \
  -F "image=@ingredients.jpg"
```

Response:
```json
{
  "success": true,
  "timestamp": "2024-03-25T10:30:00",
  "detected_ingredients": {
    "ingredients": [
      {
        "name": "chicken breast",
        "quantity": "2 pounds",
        "unit": "lbs",
        "confidence": "high",
        "notes": "fresh"
      },
      {
        "name": "broccoli",
        "quantity": null,
        "unit": null,
        "confidence": "high",
        "notes": null
      }
    ],
    "total_items_found": 10,
    "analysis_confidence": "high",
    "summary": "Protein-rich ingredients with fresh vegetables"
  }
}
```

### Search Recipes by Ingredients & Nutrition

```bash
curl -X POST "http://localhost:8000/api/recipe-search" \
  -H "Content-Type: application/json" \
  -d '{
    "ingredients": ["chicken", "broccoli", "rice"],
    "calories_min": 300,
    "calories_max": 500,
    "protein_g_min": 25,
    "protein_g_max": 40,
    "ingredient_match_percentage": 0.6,
    "limit": 5
  }'
```

## Response Format

### Full Meal Planning Response

```json
{
  "success": true,
  "timestamp": "2024-03-25T10:30:00",
  "total_found": 3,
  "extracted_ingredients": {
    "ingredients": [
      {
        "name": "chicken breast",
        "quantity": "2",
        "unit": "pieces",
        "confidence": "high",
        "notes": "fresh"
      },
      {
        "name": "broccoli",
        "quantity": null,
        "unit": null,
        "confidence": "high",
        "notes": null
      }
    ],
    "total_items_found": 8,
    "summary": "Mix of proteins and fresh vegetables"
  },
  "recipes": [
    {
      "recipe": {
        "id": "grilled_chicken_broccoli",
        "name": "Grilled Chicken & Broccoli",
        "ingredients": ["chicken breast", "broccoli", "garlic", "olive oil"],
        "nutrition": {
          "calories": 350,
          "protein_g": 35,
          "carbohydrates_g": 20,
          "fat_g": 12,
          "fiber_g": 3,
          "sugar_g": 2,
          "sodium_mg": 250
        },
        "servings": 1,
        "prep_time_min": 5,
        "cook_time_min": 15,
        "difficulty": "easy",
        "cuisine": "Mediterranean",
        "dietary_tags": ["high-protein", "low-carb", "gluten-free"],
        "source": "healthy-recipes"
      },
      "matching_ingredients": ["chicken breast", "broccoli"],
      "ingredient_match_score": 0.75,
      "nutrition_match_score": 0.85,
      "overall_score": 0.79
    }
  ]
}
```

## Use Cases

### Scenario 1: High-Protein Meal Prep
"I have chicken, eggs, and vegetables. I want meals with 30-40g protein under 400 calories."

```python
result = pipeline.analyze_and_recommend_recipes(
    image_path="meal_prep_ingredients.jpg",
    calories=NutritionRange(200, 400),
    protein_g=NutritionRange(30, 40),
    limit=5
)
```

### Scenario 2: Low-Carb Dinner
"I'm on keto. Show me recipes under 20g carbs from my grocery haul."

```python
result = pipeline.analyze_and_recommend_recipes(
    image_path="keto_groceries.jpg",
    carbohydrates_g=NutritionRange(0, 20),
    fat_g=NutritionRange(25, 60),
    limit=10
)
```

### Scenario 3: Balanced Nutrition
"I want balanced 40-50-10 macros (carbs-protein-fat) for all meals."

```python
result = pipeline.analyze_and_recommend_recipes(
    image_path="ingredients.jpg",
    calories=NutritionRange(350, 450),
    protein_g=NutritionRange(25, 35),
    carbohydrates_g=NutritionRange(40, 50),
    fat_g=NutritionRange(10, 15),
    limit=10
)
```

### Scenario 4: Vegetarian/Vegan Cooking
"Show me vegan recipes I can make from these ingredients."
(Filter by dietary_tags in custom searches)

## Recipe Database

### Adding Your Own Recipes

Create or edit `recipes_sample.json`:

```json
[
  {
    "id": "my_recipe_1",
    "name": "My Custom Recipe",
    "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
    "nutrition": {
      "calories": 350,
      "protein_g": 30,
      "carbohydrates_g": 35,
      "fat_g": 12,
      "fiber_g": 5,
      "sugar_g": 3,
      "sodium_mg": 400
    },
    "servings": 2,
    "prep_time_min": 10,
    "cook_time_min": 20,
    "difficulty": "easy",
    "cuisine": "Your Cuisine",
    "dietary_tags": ["tag1", "tag2"],
    "instructions": "Recipe instructions here...",
    "source": "your-source"
  }
]
```

### Load Into System

```bash
# Via API
curl -X POST "http://localhost:8000/api/recipes/load" \
  -F "file=@your_recipes.json"

# Via Python
pipeline.load_recipe_database("your_recipes.json")
```

## Best Practices

1. **Clear Photos**: Take well-lit photos with clear visibility of all ingredients
2. **Minimal Clutter**: Remove packaging or unnecessary items from the frame
3. **Reasonable Limits**: Start small (5-10 recipes) to see quality matches
4. **Realistic Nutrition Goals**: Set achievable ranges (e.g., not 0-1g carbs)
5. **Ingredient Variety**: Photos with diverse ingredients yield better recipe matches
6. **Database Size**: Start with sample recipes, add your favorites

## Troubleshooting

### No Recipes Found
- **Issue**: Ingredients too specific or rare
- **Solution**: Lower `ingredient_match_percentage` (try 0.3-0.4)
- **Solution**: Relax nutrition requirements

### Wrong Ingredients Detected
- **Issue**: Poor lighting or unclear ingredients
- **Solution**: Take clearer photo with better lighting
- **Solution**: Manually specify ingredients using `/api/recipe-search`

### Nutrition Info Seems Wrong
- **Issue**: Recipe database entries incorrect
- **Solution**: Update recipes in `recipes_sample.json`
- **Solution**: Add trusted recipe sources

## API Endpoints Reference

| Endpoint | Purpose |
|----------|---------|
| `POST /api/extract-ingredients` | Extract ingredients from image only |
| `POST /api/recipe-search` | Search recipes by ingredients + nutrition (manual input) |
| `POST /api/analyze-and-recommend` | Full workflow: extract + search + filter |
| `GET /api/recipes/count` | Total recipes in database |
| `POST /api/recipes/load` | Load recipes from JSON file |

## Error Handling

```python
try:
    result = pipeline.analyze_and_recommend_recipes(...)
    if not result['success']:
        print(f"Error: {result['error']}")
except Exception as e:
    print(f"Failed: {e}")
```

## Next Steps

1. **Load recipes**: Add your favorite recipes to the database
2. **Set nutrition goals**: Define your dietary requirements
3. **Upload ingredients**: Take photos of your groceries
4. **Get recommendations**: Find recipes that match your goals
5. **Iterate**: Adjust filters based on results

Happy meal planning! 🍽️
