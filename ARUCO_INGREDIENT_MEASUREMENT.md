# ArUco Ingredient Measurement Integration

## Overview

This document describes the implementation of precise ingredient measurement using ArUco markers for meal planning. The system now:

1. **Detects ingredient portions** from images using ArUco scale references
2. **Validates recipe feasibility** by comparing available ingredient amounts against recipe requirements
3. **Returns only feasible recipes** that can actually be made with the detected ingredients

## System Architecture

### Data Flow

```
Image with ArUco Marker
    ↓
[CV Pipeline] → Detects ArUco scale (cm/pixel)
    ↓
[Ingredient Extractor] → Uses scale to measure ingredients
    ↓
[IngredientList] → Returns {name, quantity_value, unit, measurement_method}
    ↓
[Recipe Analyzer] → Checks feasibility against recipe requirements
    ↓
[Recipe Recommendations] → Only recipes that can be made
```

## Key Components

### 1. ArUco Scale Integration

**File**: `src/recipe_layer/ingredient_extractor.py`

#### CV Metadata Format
```python
cv_metadata = {
    "aruco_scale_cm_per_pixel": 0.05,  # 1 pixel = 0.05 cm
    "detected_aruco_markers": [0, 1, 2],  # Marker IDs detected
    "image_metadata": {
        "width": 1920,
        "height": 1080,
        "timestamp": "2024-01-15T10:30:00"
    }
}
```

#### Modified Ingredient Dataclass
```python
@dataclass
class Ingredient:
    name: str
    quantity_value: Optional[float] = None  # e.g., 10.0
    unit: Optional[str] = None              # e.g., "g", "ml", "piece"
    confidence: str = "medium"
    measurement_method: str = "aruco_scale"  # "aruco_scale" or "visual_estimate"
    
    def has_sufficient_amount(self, required_qty: float, required_unit: str) -> bool:
        """Check if ingredient has enough for recipe"""
```

### 2. Ingredient Extraction with Quantities

**File**: `src/recipe_layer/ingredient_extractor.py`

#### Extract Methods
```python
# Updated signatures to accept cv_metadata
def extract_from_file(
    self, 
    image_path: str, 
    cv_metadata: Optional[dict] = None
) -> IngredientList

def extract_from_numpy(
    self, 
    image_array, 
    image_format: str = "jpeg",
    cv_metadata: Optional[dict] = None
) -> IngredientList
```

#### Gemini Prompt Enhancement
When cv_metadata is provided, the prompt is augmented with:
```
IMPORTANT: ArUco scale reference detected in this image.
- Scale: 1 pixel = 0.0500 cm (or 0.50 mm)
- Detected ArUco markers: 0, 1, 2

Use this scale to provide highly accurate measurements in grams or milliliters.
Convert visual estimates to precise quantities using this scale reference.
```

#### Expected Gemini Response Format
```json
{
  "ingredients": [
    {
      "name": "lettuce",
      "quantity_value": 10.0,
      "unit": "g",
      "confidence": "high",
      "measurement_method": "aruco_scale"
    },
    {
      "name": "tomato",
      "quantity_value": 150.0,
      "unit": "g",
      "confidence": "medium",
      "measurement_method": "aruco_scale"
    }
  ],
  "total_weight_estimate_g": 1200,
  "analysis_confidence": "high",
  "summary": "Fresh salad ingredients detected with ArUco-based measurements"
}
```

### 3. Recipe Database with Requirements

**File**: `src/recipe_layer/recipe_database.py`

#### Recipe Ingredient Requirements
```python
@dataclass
class Recipe:
    id: str
    name: str
    ingredients: List[str]
    ingredient_requirements: List[IngredientRequirement]  # ← NEW
    nutrition: Nutrition
    # ... other fields
    
    def matches_ingredients(
        self, 
        available_ingredients: Dict[str, float],
        available_units: Dict[str, str] = None
    ) -> bool:
        """Check if all required ingredients are available in sufficient quantities"""
```

#### Example Recipe Requirement
```json
{
  "id": "grilled_chicken_salad",
  "name": "Grilled Chicken Salad",
  "ingredient_requirements": [
    {"name": "chicken breast", "quantity": 200, "unit": "g"},
    {"name": "lettuce", "quantity": 100, "unit": "g"},
    {"name": "tomato", "quantity": 150, "unit": "g"},
    {"name": "cucumber", "quantity": 100, "unit": "g"}
  ],
  "nutrition": { ... }
}
```

### 4. Recipe Feasibility Matching

**File**: `src/recipe_layer/recipe_analyzer.py`

#### Updated Recommendation Flow
```python
def find_recipes_by_ingredients_and_nutrition(
    self,
    ingredients: IngredientList,  # With quantities!
    calories: Optional[NutritionRange] = None,
    protein_g: Optional[NutritionRange] = None,
    carbohydrates_g: Optional[NutritionRange] = None,
    fat_g: Optional[NutritionRange] = None,
) -> List[RecipeRecommendation]:
    """
    Returns ONLY recipes that:
    1. Can be made with available ingredient QUANTITIES
    2. Match nutrition criteria
    """
```

#### Complete Analysis Workflow
```python
def analyze_and_recommend(
    self,
    image_path: str,
    cv_metadata: Optional[dict] = None,  # ArUco measurements!
    calories: Optional[NutritionRange] = None,
    protein_g: Optional[NutritionRange] = None,
    ...
) -> Dict[str, Any]:
    """
    1. Extract ingredients with measured portions
    2. Filter recipes by:
       - Available ingredient quantities
       - Nutrition criteria
    3. Return feasible recipe recommendations
    """
```

## Supported Units

The system supports the following measurement units:

- **Weight**: `g` (grams)
- **Volume**: `ml` (milliliters)
- **Count**: `piece` (individual items)
- **Volume (US)**: `cup`, `tbsp`, `tsp`
- **Weight (US)**: `oz` (ounces)

**Note**: Unit conversion is currently basic (same-unit comparison). Enhanced conversion utilities planned for future.

## Usage Example

### Step 1: Prepare CV Metadata (from ArUco detection)
```python
from src.cv_layer.aruco_detector import ArucoDetector

detector = ArucoDetector()
result = detector.detect_and_measure("image.jpg")

cv_metadata = {
    "aruco_scale_cm_per_pixel": result.scale,
    "detected_aruco_markers": result.marker_ids,
}
```

### Step 2: Analyze Ingredients and Get Recipe Recommendations
```python
from src.recipe_layer.recipe_analyzer import RecipeAnalyzer

analyzer = RecipeAnalyzer()

result = analyzer.analyze_and_recommend(
    image_path="image.jpg",
    cv_metadata=cv_metadata,
    calories=NutritionRange(200, 400),
    protein_g=NutritionRange(20, 40),
)

for rec in result["recipe_recommendations"]:
    print(f"{rec['recipe']['name']}: {rec['ingredient_match_score']:.0%}")
```

### Step 3: Check Extracted Ingredients
```python
extracted = result["extracted_ingredients"]
for ing in extracted["ingredients"]:
    print(f"{ing['name']}: {ing['quantity_value']}{ing['unit']}")
```

## API Integration

### Updated Endpoint
The `/api/analyze-and-recommend` endpoint now:
1. Accepts `cv_metadata` in request body
2. Returns only feasible recipes
3. Includes ingredient quantities in responses

**Request Example**:
```json
{
  "image_path": "uploads/ingredients.jpg",
  "cv_metadata": {
    "aruco_scale_cm_per_pixel": 0.05,
    "detected_aruco_markers": [0, 1, 2]
  },
  "calories": {"min": 200, "max": 400},
  "protein_g": {"min": 20, "max": 40}
}
```

**Response Example**:
```json
{
  "success": true,
  "extracted_ingredients": {
    "ingredients": [
      {
        "name": "chicken breast",
        "quantity_value": 200.0,
        "unit": "g",
        "measurement_method": "aruco_scale"
      }
    ]
  },
  "recipe_recommendations": [
    {
      "recipe": {
        "id": "grilled_chicken_salad",
        "name": "Grilled Chicken Salad",
        "ingredient_requirements": [
          {"name": "chicken breast", "quantity": 200, "unit": "g"}
        ]
      },
      "ingredient_match_score": 0.85,
      "overall_score": 0.82
    }
  ]
}
```

## Files Modified/Created

### New Files
- `src/recipe_layer/recipe_database.py` - Recipe storage with ingredient requirements
- `ARUCO_INGREDIENT_MEASUREMENT.md` - This documentation

### Modified Files
- `src/recipe_layer/ingredient_extractor.py`
  - Added `cv_metadata` parameter to extract methods
  - Updated `Ingredient` dataclass with quantity/unit fields
  - Enhanced `INGREDIENT_PROMPT` for ArUco-based measurements
  - Updated `_parse_response()` to handle new response format
  - Added `_prepare_prompt()` helper for CV metadata context

- `src/recipe_layer/recipe_analyzer.py`
  - Updated method signatures to accept `IngredientList` instead of `List[str]`
  - Modified `find_recipes_by_ingredients()` to use quantity validation
  - Added `cv_metadata` parameter to `analyze_and_recommend()`
  - Updated recipe matching to check ingredient feasibility

- `recipes_sample.json`
  - Added `ingredient_requirements` array to all 10 recipes
  - Specified realistic quantities for each recipe

## Testing the Integration

### 1. Unit Test Example
```python
def test_aruco_measurement():
    extractor = IngredientExtractor()
    
    cv_metadata = {
        "aruco_scale_cm_per_pixel": 0.05,
        "detected_aruco_markers": [0, 1, 2],
    }
    
    result = extractor.extract_from_file(
        "test_image.jpg",
        cv_metadata=cv_metadata
    )
    
    assert result.ingredients[0].quantity_value is not None
    assert result.ingredients[0].unit == "g"
    assert result.ingredients[0].measurement_method == "aruco_scale"
```

### 2. Integration Test Example
```python
def test_feasible_recipes():
    analyzer = RecipeAnalyzer()
    
    # Simulate detected ingredients
    ingredient_list = IngredientList(
        ingredients=[
            Ingredient(name="chicken breast", quantity_value=200, unit="g"),
            Ingredient(name="lettuce", quantity_value=100, unit="g"),
        ]
    )
    
    # Get feasible recipes
    recommendations = analyzer.find_recipes_by_ingredients(ingredient_list)
    
    # Only recipes that can be made should be returned
    for rec in recommendations:
        assert rec.recipe.matches_ingredients({
            "chicken breast": 200,
            "lettuce": 100,
        })
```

## Integration with CV Pipeline

### ArUco Detector Output
The CV layer's ArUco detection should return:
```python
class ArucoResult:
    scale_cm_per_pixel: float
    marker_ids: List[int]
    # ... other CV results
```

**Expected CV → Ingredient Extraction Flow**:
```python
# In API handler or pipeline
cv_result = cv_pipeline.detect_aruco(image_path)

cv_metadata = {
    "aruco_scale_cm_per_pixel": cv_result.scale_cm_per_pixel,
    "detected_aruco_markers": cv_result.marker_ids,
    "image_metadata": {...}
}

# Pass to ingredient extraction
ingredient_list = extractor.extract_from_file(image_path, cv_metadata)
```

## Future Enhancements

1. **Unit Conversion**: Convert between grams/ml/oz/cups/tbsp automatically
2. **Confidence Scoring**: Rank recipes by measurement confidence
3. **Portion Scaling**: Scale recipes up/down based on available quantities
4. **Ingredient Substitution**: Suggest alternative ingredients and recipes
5. **Macro Tracking**: Monitor protein/carbs/fat across multiple meals
6. **Shopping Lists**: Generate shopping lists for recipe combinations

## Troubleshooting

### Issue: Ingredients not getting quantities
**Cause**: cv_metadata not passed to extract method
**Solution**: Ensure `cv_metadata` parameter is provided with ArUco scale data

### Issue: Recipe matches but says "insufficient ingredients"
**Cause**: Unit mismatch (e.g., recipe wants grams, detected unit is ml)
**Solution**: Verify unit conversion in `has_sufficient_amount()` method

### Issue: Gemini not using ArUco measurements
**Cause**: Scale reference not in prompt
**Solution**: Check `_prepare_prompt()` is being called and cv_metadata is

 not None

## Summary

The ArUco ingredient measurement system enables:
- ✅ Precise portion detection from images
- ✅ Validation that recipes can actually be made
- ✅ Quantity-aware recipe recommendations
- ✅ Nutritional planning based on available ingredients

This makes meal planning practical and ensures users get recipes they can actually prepare with their available ingredients.
