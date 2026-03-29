"""
Recipe Layer - Ingredient Detection and Recipe Recommendation

Modules:
- ingredient_extractor: Extract ingredients from images using Gemini
- recipe_database: Manage recipe database and filtering
- recipe_analyzer: Main orchestration for recipe analysis and recommendations
"""

from .ingredient_extractor import IngredientExtractor
from .recipe_database import RecipeDatabase, RecipeFilter, NutritionRange
from .recipe_analyzer import RecipeAnalyzer, RecipeRecommendation

__all__ = [
    "IngredientExtractor",
    "RecipeDatabase",
    "RecipeFilter",
    "NutritionRange",
    "RecipeAnalyzer",
    "RecipeRecommendation",
]
