"""
Recipe Analyzer - Main orchestration for ingredient detection and recipe recommendations

Combines:
- Ingredient extraction from images
- Recipe database search
- Nutrition-based recipe recommendations
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from pathlib import Path
from loguru import logger

from .ingredient_extractor import IngredientExtractor, IngredientList
from .recipe_database import RecipeDatabase, RecipeFilter, NutritionRange, Recipe


@dataclass
class RecipeRecommendation:
    """A recommended recipe with matching score."""
    recipe: Recipe
    matching_ingredients: List[str]
    ingredient_match_score: float  # 0.0 to 1.0
    nutrition_match_score: Optional[float] = None  # 0.0 to 1.0 if filtered
    overall_score: float = 0.0
    
    def to_dict(self, include_instructions: bool = False) -> Dict[str, Any]:
        return {
            "recipe": self.recipe.to_dict(include_instructions=include_instructions),
            "matching_ingredients": self.matching_ingredients,
            "ingredient_match_score": round(self.ingredient_match_score, 2),
            "nutrition_match_score": round(self.nutrition_match_score, 2) if self.nutrition_match_score else None,
            "overall_score": round(self.overall_score, 2),
        }


class RecipeAnalyzer:
    """
    Complete recipe analysis and recommendation system.
    
    Flow:
    1. Extract ingredients from image (using IngredientExtractor)
    2. Search recipe database for matching recipes
    3. Filter by nutrition criteria
    4. Return ranked recommendations
    """
    
    def __init__(
        self,
        recipe_database: Optional[RecipeDatabase] = None,
        gemini_api_key: Optional[str] = None,
        gemini_model: str = "gemini-2.0-flash",
        default_ingredient_match: float = 0.5,
    ):
        """
        Initialize the Recipe Analyzer.
        
        Args:
            recipe_database: RecipeDatabase instance (creates new if None)
            gemini_api_key: API key for Gemini (uses env if None)
            gemini_model: Gemini model to use
            default_ingredient_match: Default ingredient match percentage (0.0-1.0)
        """
        self.db = recipe_database or RecipeDatabase()
        self.ingredient_extractor = IngredientExtractor(
            api_key=gemini_api_key,
            model=gemini_model
        )
        self.default_ingredient_match = default_ingredient_match
        logger.info("Recipe Analyzer initialized")
    
    def analyze_image(
        self,
        image_path: str,
    ) -> IngredientList:
        """
        Extract ingredients from an image.
        
        Args:
            image_path: Path to food image
            
        Returns:
            IngredientList with detected ingredients
        """
        logger.info(f"Analyzing image for ingredients: {image_path}")
        return self.ingredient_extractor.extract_from_file(image_path)
    
    def find_recipes_by_ingredients(
        self,
        ingredients: IngredientList,
        match_percentage: Optional[float] = None,
        include_full_instructions: bool = False,
    ) -> List[RecipeRecommendation]:
        """
        Find recipes that can be made with provided ingredients and their quantities.
        
        Args:
            ingredients: IngredientList with detected ingredients and quantities
            match_percentage: Override default match percentage (0.0-1.0)
            include_full_instructions: Include full recipe instructions in output
            
        Returns:
            Ranked list of recipe recommendations
        """
        # Build available ingredients dict with quantities
        available_ingredients = {}
        available_units = {}
        for ing in ingredients.ingredients:
            available_ingredients[ing.name] = ing.quantity_value or 0
            available_units[ing.name] = ing.unit or "g"
        
        # Find recipes that can be made with available ingredients
        matching_recipes = self.db.search_by_ingredients(
            available_ingredients,
            available_units,
        )
        
        recommendations = []
        ingredient_names = [ing.name for ing in ingredients.ingredients]
        
        for recipe in matching_recipes:
            # Calculate ingredient match score
            ingredient_set = set(ing.lower() for ing in ingredient_names)
            recipe_set = set(ing.lower() for ing in recipe.ingredients)
            matches = len(ingredient_set.intersection(recipe_set))
            score = matches / len(recipe_set) if recipe_set else 0.0
            
            recommendation = RecipeRecommendation(
                recipe=recipe,
                matching_ingredients=list(ingredient_set.intersection(recipe_set)),
                ingredient_match_score=score,
                overall_score=score,
            )
            recommendations.append(recommendation)
        
        # Sort by score
        recommendations.sort(key=lambda x: x.overall_score, reverse=True)
        
        logger.info(f"Found {len(recommendations)} feasible recipes from {len(ingredient_names)} ingredients")
        return recommendations
    
    def find_recipes_by_nutrition(
        self,
        calories: Optional[NutritionRange] = None,
        protein_g: Optional[NutritionRange] = None,
        carbohydrates_g: Optional[NutritionRange] = None,
        fat_g: Optional[NutritionRange] = None,
        include_full_instructions: bool = False,
    ) -> List[Recipe]:
        """
        Find recipes within specific nutrition ranges.
        
        Args:
            calories: Calorie range (per serving)
            protein_g: Protein range in grams
            carbohydrates_g: Carbohydrates range in grams
            fat_g: Fat range in grams
            include_full_instructions: Include full recipe instructions
            
        Returns:
            List of matching recipes
        """
        return self.db.search_by_nutrition(
            calories=calories,
            protein_g=protein_g,
            carbohydrates_g=carbohydrates_g,
            fat_g=fat_g,
        )
    
    def find_recipes_by_ingredients_and_nutrition(
        self,
        ingredients: IngredientList,
        calories: Optional[NutritionRange] = None,
        protein_g: Optional[NutritionRange] = None,
        carbohydrates_g: Optional[NutritionRange] = None,
        fat_g: Optional[NutritionRange] = None,
        match_percentage: Optional[float] = None,
        include_full_instructions: bool = False,
    ) -> List[RecipeRecommendation]:
        """
        Find recipes matching both available ingredients (with quantities) and nutrition criteria.
        
        Prioritizes recipes that can actually be made with available ingredient amounts.
        
        Args:
            ingredients: IngredientList with detected ingredients and quantities
            calories: Calorie range
            protein_g: Protein range
            carbohydrates_g: Carbohydrates range
            fat_g: Fat range
            match_percentage: Ingredient match percentage
            include_full_instructions: Include full instructions
            
        Returns:
            Ranked list of recipe recommendations
        """
        # Build available ingredients dict with quantities
        available_ingredients = {}
        available_units = {}
        for ing in ingredients.ingredients:
            available_ingredients[ing.name] = ing.quantity_value or 0
            available_units[ing.name] = ing.unit or "g"
        
        # Create nutrition filter
        nutrition_filter = RecipeFilter(
            calories=calories,
            protein_g=protein_g,
            carbohydrates_g=carbohydrates_g,
            fat_g=fat_g,
        )
        
        # Find compatible recipes (by ingredients AND nutrition)
        matching_recipes = self.db.search_compatible(
            available_ingredients,
            available_units,
            nutrition_filter,
        )
        
        recommendations = []
        ingredient_names = [ing.name for ing in ingredients.ingredients]
        
        for recipe in matching_recipes:
            # Calculate ingredient match score
            ingredient_set = set(ing.lower() for ing in ingredient_names)
            recipe_set = set(ing.lower() for ing in recipe.ingredients)
            matches = len(ingredient_set.intersection(recipe_set))
            ingredient_score = matches / len(recipe_set) if recipe_set else 0.0
            
            # Calculate nutrition match score (simple: 0.8 for matching all criteria)
            nutrition_score = 0.8
            
            # Combined score (60% ingredients, 40% nutrition)
            overall_score = (ingredient_score * 0.6) + (nutrition_score * 0.4)
            
            recommendation = RecipeRecommendation(
                recipe=recipe,
                matching_ingredients=list(ingredient_set.intersection(recipe_set)),
                ingredient_match_score=ingredient_score,
                nutrition_match_score=nutrition_score,
                overall_score=overall_score,
            )
            recommendations.append(recommendation)
        
        # Sort by overall score
        recommendations.sort(key=lambda x: x.overall_score, reverse=True)
        
        logger.info(f"Found {len(recommendations)} recipes matching both ingredients and nutrition")
        return recommendations
    
    def analyze_and_recommend(
        self,
        image_path: str,
        cv_metadata: Optional[dict] = None,
        calories: Optional[NutritionRange] = None,
        protein_g: Optional[NutritionRange] = None,
        carbohydrates_g: Optional[NutritionRange] = None,
        fat_g: Optional[NutritionRange] = None,
        match_percentage: Optional[float] = None,
        limit: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Complete workflow: Extract ingredients from image and find feasible recipes.
        
        Uses ArUco measurements for precise ingredient quantities to ensure
        returned recipes can actually be made with available ingredients.
        
        Args:
            image_path: Path to ingredient image
            cv_metadata: Optional CV analysis results with ArUco scale info
                - 'aruco_scale_cm_per_pixel': float
                - 'detected_aruco_markers': list of marker IDs
                - 'image_metadata': dict with image dimensions
            calories: Calorie range filter
            protein_g: Protein range filter
            carbohydrates_g: Carbs range filter
            fat_g: Fat range filter
            match_percentage: Ingredient match percentage
            limit: Maximum number of recommendations to return
            
        Returns:
            Dict with extracted ingredients and recipe recommendations
        """
        try:
            logger.info(f"Starting meal planning analysis for: {image_path}")
            
            # Step 1: Extract ingredients with measured quantities using CV metadata
            ingredient_list = self.ingredient_extractor.extract_from_file(
                image_path,
                cv_metadata=cv_metadata
            )
            
            # Step 2: Find feasible recipes (can actually be made with available amounts)
            recommendations = self.find_recipes_by_ingredients_and_nutrition(
                ingredients=ingredient_list,
                calories=calories,
                protein_g=protein_g,
                carbohydrates_g=carbohydrates_g,
                fat_g=fat_g,
                match_percentage=match_percentage,
            )
            
            # Limit results
            if limit:
                recommendations = recommendations[:limit]
            
            return {
                "success": True,
                "extracted_ingredients": ingredient_list.to_dict(),
                "recipe_recommendations": [rec.to_dict() for rec in recommendations],
                "total_recommendations": len(recommendations),
            }
            
        except Exception as e:
            logger.error(f"Meal planning analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    def load_recipes_from_json(self, json_path: str) -> None:
        """Load recipes from a JSON file into the database."""
        self.db.load_from_json(json_path)
    
    def add_recipe(self, recipe: Recipe) -> None:
        """Add a recipe to the database."""
        self.db.add_recipe(recipe)
    
    def get_recipe_count(self) -> int:
        """Get total number of recipes in database."""
        return self.db.count()
