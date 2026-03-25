# Meal Planning Feature - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Load Recipe Database
```python
from src.pipeline import FoodNutritionPipeline

pipeline = FoodNutritionPipeline(gemini_api_key="your-key")
pipeline.load_recipe_database("recipes_sample.json")
print(f"✓ Loaded {pipeline.get_recipe_count()} recipes")
```

### 2. Upload Ingredient Image & Get Recommendations
```python
from src.recipe_layer import NutritionRange

result = pipeline.analyze_and_recommend_recipes(
    image_path="grocery.jpg",
    calories=NutritionRange(250, 400),      # 250-400 calories
    protein_g=NutritionRange(20, 40),       # 20-40g protein
    limit=5                                  # Top 5 recipes
)

# Display results
for rec in result['recipe_recommendations']:
    print(f"✓ {rec['recipe']['name']}")
    print(f"  Match: {rec['overall_score']:.0%} | "
          f"{rec['recipe']['nutrition']['calories']} cal | "
          f"{rec['recipe']['nutrition']['protein_g']}g protein")
```

---

## 🥬 How It Works

```
Take Photo of Ingredients → Gemini Extracts Items → Search Recipes → Filter by Nutrition → Get Recommendations
```

**Example:**
- Photo shows: chicken, broccoli, rice, olive oil
- Nutrition goal: 300-400 cal, 25-35g protein
- Result: "Grilled Chicken & Broccoli" (98% match!)

---

## 📱 REST API Usage

### Main Endpoint
```bash
curl -X POST "http://localhost:8000/api/analyze-and-recommend" \
  -F "image=@ingredients.jpg" \
  -d "calories_min=250" \
  -d "calories_max=400" \
  -d "protein_g_min=20" \
  -d "protein_g_max=40"
```

Response:
```json
{
  "success": true,
  "extracted_ingredients": {
    "ingredients": [...detected items...],
    "total_items_found": 8
  },
  "recipes": [
    {
      "recipe": {...recipe details...},
      "overall_score": 0.82,
      "matching_ingredients": ["chicken", "broccoli"]
    }
  ],
  "total_found": 3
}
```

---

## 🎯 Common Use Cases

### High-Protein Meal Prep
```python
result = pipeline.analyze_and_recommend_recipes(
    "grocery.jpg",
    protein_g=NutritionRange(30, 45),  # High protein
    calories=NutritionRange(300, 500),
    limit=10
)
```

### Keto/Low-Carb Meals
```python
result = pipeline.analyze_and_recommend_recipes(
    "grocery.jpg",
    carbohydrates_g=NutritionRange(0, 20),  # <20g carbs
    fat_g=NutritionRange(25, 60),
    limit=10
)
```

### Balanced Nutrition (40-40-20)
```python
result = pipeline.analyze_and_recommend_recipes(
    "grocery.jpg",
    calories=NutritionRange(350, 450),
    carbohydrates_g=NutritionRange(35, 45),  # ~40%
    protein_g=NutritionRange(30, 40),        # ~40%
    fat_g=NutritionRange(8, 12),             # ~20%
    limit=10
)
```

---

## 📊 Understanding Match Scores

**`overall_score`** (0.0 to 1.0):
- **0.90+** = Excellent match (uses most ingredients)
- **0.70-0.89** = Good match (uses many ingredients)
- **0.50-0.69** = Fair match (uses some ingredients)
- **<0.50** = Poor match (uses few ingredients)

Formula:
```
overall_score = (ingredient_match × 0.6) + (nutrition_match × 0.4)
```

---

## 🔧 Customizing Recipes

### Add Your Own Recipes
Edit `recipes_sample.json`:
```json
[
  {
    "id": "my_recipe",
    "name": "My Favorite Dish",
    "ingredients": ["chicken", "onion", "garlic"],
    "nutrition": {
      "calories": 350,
      "protein_g": 35,
      "carbohydrates_g": 20,
      "fat_g": 12,
      "fiber_g": 4,
      "sugar_g": 2,
      "sodium_mg": 400
    },
    "servings": 1,
    "prep_time_min": 15,
    "cook_time_min": 20,
    "difficulty": "easy",
    "cuisine": "Your Cuisine",
    "dietary_tags": ["high-protein"],
    "instructions": "Step by step instructions...",
    "source": "your-source"
  }
]
```

### Reload Database
```python
pipeline.load_recipe_database("recipes_sample.json")
# OR via API:
# curl -X POST "http://localhost:8000/api/recipes/load" -F "file=@recipes_sample.json"
```

---

## ✅ What Works Well

✓ **Ingredient Detection** - Identifies vegetables, proteins, grains, dairy, pantry items  
✓ **Ingredient Quantities** - Estimates amounts when visible  
✓ **Recipe Matching** - Finds recipes using available ingredients  
✓ **Nutrition Filtering** - Precise calorie and macro filtering  
✓ **Ranking** - Scores recipes by relevance  
✓ **Easy Integration** - Works with Python SDK or REST API  

---

## ⚠️ Tips for Best Results

1. **Clear Photos**
   - Good lighting (avoid shadows)
   - Clear view of items
   - Ingredients visible/readable

2. **Reasonable Filters**
   - Don't set impossible ranges (e.g., 0-1g carbs)
   - Allow some flexibility
   - Start with wider ranges, narrow down

3. **Ingredient Variety**
   - More diverse ingredients = better matches
   - Generic photos work best
   - Avoid blurry/obscured items

4. **Recipe Database**
   - Start with sample recipes
   - Add your favorite recipes
   - Update nutrition info as needed

---

## 🚀 Advanced Features

### Ingredient-Only Search
```python
ingredients = pipeline.extract_ingredients("grocery.jpg")
print(f"Found: {ingredients.get_ingredient_names()}")
```

### Manual Recipe Search
```python
recipes = pipeline.find_recipes_by_ingredients(
    ingredients=["chicken", "rice", "broccoli"],
    match_percentage=0.5  # 50% ingredient match
)
```

### Nutrition-Only Filter
```python
recipes = pipeline.find_recipes_by_nutrition(
    calories=NutritionRange(250, 400),
    protein_g=NutritionRange(20, 40)
)
```

---

## 📚 Documentation Files

- **MEAL_PLANNING_GUIDE.md** - Full user guide with examples
- **IMPLEMENTATION_SUMMARY.md** - Technical implementation details
- **meal_planning_example.py** - Complete code examples
- **AI_MODEL_USAGE.md** - Full project documentation
- **recipes_sample.json** - Sample recipe database

---

## 🐛 Troubleshooting

**No recipes found?**
- Lower `ingredient_match_percentage` (try 0.3-0.4)
- Relax nutrition filters
- Add more recipes to database

**Wrong ingredients detected?**
- Take clearer photo with better lighting
- Ensure ingredients are visible
- Try manually specifying via `/api/recipe-search`

**API not working?**
- Check GEMINI_API_KEY is set
- Ensure recipes are loaded
- Check server is running

---

## 🎓 Full Examples

See **meal_planning_example.py** for:
- Example 1: Ingredient extraction
- Example 2: Recipe search
- Example 3: Nutrition filtering
- Example 4: Complete workflow
- Example 5: Advanced scenarios
- Example 6: JSON export

Run it:
```bash
python meal_planning_example.py
```

---

## 📞 Support

1. Check MEAL_PLANNING_GUIDE.md
2. Review meal_planning_example.py
3. Check code docstrings
4. Enable logging: `logger.enable("src")`

---

## ✨ Feature Highlights

🎯 **Smart Meal Planning** - From ingredients to recipes in seconds  
🧠 **AI-Powered** - Uses Google Gemini for ingredient detection  
📊 **Nutrition Focused** - Filter by exact macros and calories  
🔄 **Flexible** - Works with any recipe database  
⚡ **Fast** - Local ingredient matching + cloud AI  
🌐 **API & SDK** - Use REST or Python  

---

**Ready to start meal planning!** 🍽️

Quick commands:
```bash
# Start API server
python main.py server --port 8000

# Run examples
python meal_planning_example.py

# Load recipes
curl -X POST http://localhost:8000/api/recipes/load -F "file=@recipes_sample.json"

# Get recommendations
curl -X POST http://localhost:8000/api/analyze-and-recommend \
  -F "image=@grocery.jpg" \
  -d "calories_min=250" -d "calories_max=400" \
  -d "protein_g_min=20" -d "protein_g_max=40"
```

Happy meal planning! 🥗🍗🍚
