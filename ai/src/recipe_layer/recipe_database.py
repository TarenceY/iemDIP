"""
Recipe Database - Storage and filtering for meal recipes with ingredient requirements

Provides:
- Recipe storage and lookup
- Nutrition-based filtering
- Ingredient matching with quantity validation
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field, asdict
from pathlib import Path
import json
from loguru import logger
from enum import Enum


class IngredientUnit(str, Enum):
    """Standard units for ingredient measurements."""
    GRAM = "g"
    MILLILITER = "ml"
    PIECE = "piece"
    CUP = "cup"
    TABLESPOON = "tbsp"
    TEASPOON = "tsp"
    OUNCE = "oz"


@dataclass
class IngredientRequirement:
    """Required ingredient with quantity for a recipe."""
    name: str
    quantity: float
    unit: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "quantity": self.quantity,
            "unit": self.unit
        }


@dataclass
class Nutrition:
    """Nutrition information for a recipe per serving."""
    calories: float
    protein_g: float
    carbohydrates_g: float
    fat_g: float
    fiber_g: Optional[float] = 0
    sugar_g: Optional[float] = 0
    sodium_mg: Optional[float] = 0
    
    def to_dict(self) -> Dict[str, float]:
        return {
            "calories": self.calories,
            "protein_g": self.protein_g,
            "carbohydrates_g": self.carbohydrates_g,
            "fat_g": self.fat_g,
            "fiber_g": self.fiber_g or 0,
            "sugar_g": self.sugar_g or 0,
            "sodium_mg": self.sodium_mg or 0,
        }
    
    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "Nutrition":
        return Nutrition(
            calories=data.get("calories", 0),
            protein_g=data.get("protein_g", 0),
            carbohydrates_g=data.get("carbohydrates_g", 0),
            fat_g=data.get("fat_g", 0),
            fiber_g=data.get("fiber_g", 0),
            sugar_g=data.get("sugar_g", 0),
            sodium_mg=data.get("sodium_mg", 0),
        )


@dataclass
class Recipe:
    """A complete recipe with ingredients and nutrition info."""
    id: str
    name: str
    ingredients: List[str]
    ingredient_requirements: List[IngredientRequirement]
    nutrition: Nutrition
    servings: int = 1
    prep_time_min: int = 0
    cook_time_min: int = 0
    difficulty: str = "medium"
    cuisine: str = ""
    dietary_tags: List[str] = field(default_factory=list)
    instructions: Optional[str] = None
    source: Optional[str] = None
    
    def get_total_time(self) -> int:
        """Get total preparation + cooking time in minutes."""
        return self.prep_time_min + self.cook_time_min
    
    def has_dietary_tag(self, tag: str) -> bool:
        """Check if recipe has a specific dietary tag."""
        return tag.lower() in [t.lower() for t in self.dietary_tags]
    
    def matches_ingredients(self, available_ingredients: Dict[str, float], available_units: Dict[str, str] = None) -> bool:
        """
        Check if all required ingredients are available in sufficient quantities.
        
        Args:
            available_ingredients: Dict of {ingredient_name: quantity}
            available_units: Dict of {ingredient_name: unit}
            
        Returns:
            True if all ingredients are available in sufficient quantities
        """
        available_units = available_units or {}
        
        for req in self.ingredient_requirements:
            ing_name = req.name.lower()
            
            # Check if ingredient exists in available ingredients
            matching_available = None
            for avail_name, avail_qty in available_ingredients.items():
                if avail_name.lower() == ing_name:
                    matching_available = (avail_name, avail_qty)
                    break
            
            if not matching_available:
                # Required ingredient not available
                return False
            
            avail_name, avail_qty = matching_available
            required_qty = req.quantity
            
            # Simple quantity comparison (same units)
            if avail_qty < required_qty:
                return False
        
        return True
    
    def to_dict(self, include_instructions: bool = True) -> Dict[str, Any]:
        """Convert recipe to dictionary."""
        data = {
            "id": self.id,
            "name": self.name,
            "ingredients": self.ingredients,
            "ingredient_requirements": [ir.to_dict() for ir in self.ingredient_requirements],
            "nutrition": self.nutrition.to_dict(),
            "servings": self.servings,
            "prep_time_min": self.prep_time_min,
            "cook_time_min": self.cook_time_min,
            "total_time_min": self.get_total_time(),
            "difficulty": self.difficulty,
            "cuisine": self.cuisine,
            "dietary_tags": self.dietary_tags,
            "source": self.source,
        }
        if include_instructions and self.instructions:
            data["instructions"] = self.instructions
        return data
    
    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "Recipe":
        """Create Recipe from dictionary."""
        ingredient_requirements = []
        for ir_data in data.get("ingredient_requirements", []):
            ingredient_requirements.append(IngredientRequirement(
                name=ir_data.get("name", ""),
                quantity=ir_data.get("quantity", 0),
                unit=ir_data.get("unit", "g")
            ))
        
        return Recipe(
            id=data.get("id", ""),
            name=data.get("name", ""),
            ingredients=data.get("ingredients", []),
            ingredient_requirements=ingredient_requirements,
            nutrition=Nutrition.from_dict(data.get("nutrition", {})),
            servings=data.get("servings", 1),
            prep_time_min=data.get("prep_time_min", 0),
            cook_time_min=data.get("cook_time_min", 0),
            difficulty=data.get("difficulty", "medium"),
            cuisine=data.get("cuisine", ""),
            dietary_tags=data.get("dietary_tags", []),
            instructions=data.get("instructions"),
            source=data.get("source"),
        )


@dataclass
class NutritionRange:
    """Range for nutrition filtering."""
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    
    def matches(self, value: float) -> bool:
        """Check if value is within range."""
        if self.min_value is not None and value < self.min_value:
            return False
        if self.max_value is not None and value > self.max_value:
            return False
        return True


@dataclass
class RecipeFilter:
    """Filter criteria for recipe search."""
    # Nutrition ranges
    calories: Optional[NutritionRange] = None
    protein_g: Optional[NutritionRange] = None
    carbohydrates_g: Optional[NutritionRange] = None
    fat_g: Optional[NutritionRange] = None
    fiber_g: Optional[NutritionRange] = None
    
    # Preferences
    max_difficulty: Optional[str] = None  # "easy", "medium", "hard"
    max_total_time: Optional[int] = None  # minutes
    dietary_tags: List[str] = field(default_factory=list)  # must have all these tags
    cuisines: List[str] = field(default_factory=list)  # can have any of these
    
    def matches(self, recipe: Recipe) -> bool:
        """Check if recipe matches all filter criteria."""
        # Check nutrition ranges
        if self.calories and not self.calories.matches(recipe.nutrition.calories):
            return False
        if self.protein_g and not self.protein_g.matches(recipe.nutrition.protein_g):
            return False
        if self.carbohydrates_g and not self.carbohydrates_g.matches(recipe.nutrition.carbohydrates_g):
            return False
        if self.fat_g and not self.fat_g.matches(recipe.nutrition.fat_g):
            return False
        if self.fiber_g and not self.fiber_g.matches(recipe.nutrition.fiber_g or 0):
            return False
        
        # Check time
        if self.max_total_time and recipe.get_total_time() > self.max_total_time:
            return False
        
        # Check difficulty
        difficulty_order = ["easy", "medium", "hard"]
        if self.max_difficulty:
            if recipe.difficulty.lower() not in difficulty_order:
                return False
            if difficulty_order.index(recipe.difficulty.lower()) > difficulty_order.index(self.max_difficulty.lower()):
                return False
        
        # Check dietary tags (all required tags must be present)
        if self.dietary_tags:
            for tag in self.dietary_tags:
                if not recipe.has_dietary_tag(tag):
                    return False
        
        # Check cuisines (at least one must match)
        if self.cuisines:
            if recipe.cuisine.lower() not in [c.lower() for c in self.cuisines]:
                return False
        
        return True


class RecipeDatabase:
    """Database for storing and searching recipes."""
    
    def __init__(self, json_path: Optional[str] = None):
        """
        Initialize recipe database.
        
        Args:
            json_path: Path to JSON file with recipes (uses default sample if None)
        """
        self.recipes: Dict[str, Recipe] = {}
        
        # Use provided path or default to sample recipes
        if json_path is None:
            # Try multiple possible paths
            possible_paths = [
                Path(__file__).parent.parent.parent.parent / "recipes_sample.json",
                Path(__file__).parent.parent.parent / "recipes_sample.json",
                Path("recipes_sample.json"),
            ]
            
            json_path = None
            for path in possible_paths:
                if path.exists():
                    json_path = str(path)
                    break
        else:
            json_path = Path(json_path)
        
        if json_path and Path(json_path).exists():
            self.load_from_json(str(json_path))
            logger.info(f"Loaded {len(self.recipes)} recipes from {json_path}")
        else:
            logger.warning(f"Recipe file not found at: {json_path}")
    
    def load_from_json(self, json_path: str) -> None:
        """Load recipes from JSON file."""
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.recipes = {}
            for recipe_data in data:
                recipe = Recipe.from_dict(recipe_data)
                self.recipes[recipe.id] = recipe
            
            logger.info(f"Successfully loaded {len(self.recipes)} recipes")
        except Exception as e:
            logger.error(f"Failed to load recipes: {e}")
            raise
    
    def add_recipe(self, recipe: Recipe) -> None:
        """Add or update a recipe in the database."""
        self.recipes[recipe.id] = recipe
        logger.info(f"Added/updated recipe: {recipe.name}")
    
    def get_recipe(self, recipe_id: str) -> Optional[Recipe]:
        """Get a specific recipe by ID."""
        return self.recipes.get(recipe_id)
    
    def search_by_ingredients(
        self,
        available_ingredients: Dict[str, float],
        available_units: Dict[str, str] = None,
        min_match_percentage: float = 0.5
    ) -> List[Recipe]:
        """
        Find recipes that can be made with available ingredients.
        
        Args:
            available_ingredients: Dict of {ingredient_name: quantity}
            available_units: Dict of {ingredient_name: unit}
            min_match_percentage: Minimum percentage of ingredients needed (0.0-1.0)
            
        Returns:
            List of recipes sorted by ingredient match score
        """
        available_units = available_units or {}
        matching_recipes = []
        
        for recipe in self.recipes.values():
            # Check ingredient availability
            if recipe.matches_ingredients(available_ingredients, available_units):
                matching_recipes.append(recipe)
        
        return matching_recipes
    
    def filter_recipes(self, filter_criteria: RecipeFilter) -> List[Recipe]:
        """
        Filter recipes by nutrition and preferences.
        
        Args:
            filter_criteria: RecipeFilter instance with desired criteria
            
        Returns:
            List of recipes matching all criteria
        """
        return [r for r in self.recipes.values() if filter_criteria.matches(r)]
    
    def search_by_nutrition(
        self,
        calories: Optional[NutritionRange] = None,
        protein_g: Optional[NutritionRange] = None,
        carbohydrates_g: Optional[NutritionRange] = None,
        fat_g: Optional[NutritionRange] = None,
        fiber_g: Optional[NutritionRange] = None,
    ) -> List[Recipe]:
        """Find recipes within nutrition ranges."""
        filter_criteria = RecipeFilter(
            calories=calories,
            protein_g=protein_g,
            carbohydrates_g=carbohydrates_g,
            fat_g=fat_g,
            fiber_g=fiber_g,
        )
        return self.filter_recipes(filter_criteria)
    
    def get_all_recipes(self) -> List[Recipe]:
        """Get all recipes."""
        return list(self.recipes.values())
    
    def get_recipes_by_cuisine(self, cuisine: str) -> List[Recipe]:
        """Get all recipes from a specific cuisine."""
        cuisine_lower = cuisine.lower()
        return [r for r in self.recipes.values() if r.cuisine.lower() == cuisine_lower]
    
    def get_recipes_by_dietary_tag(self, tag: str) -> List[Recipe]:
        """Get all recipes with a specific dietary tag."""
        return [r for r in self.recipes.values() if r.has_dietary_tag(tag)]
    
    def get_recipe_count(self) -> int:
        """Get total number of recipes in database."""
        return len(self.recipes)
    
    def search_compatible(
        self,
        available_ingredients: Dict[str, float],
        available_units: Dict[str, str] = None,
        nutrition_filter: Optional[RecipeFilter] = None,
    ) -> List[Recipe]:
        """
        Find recipes that can be made with available ingredients and match nutrition criteria.
        
        Args:
            available_ingredients: Dict of {ingredient_name: quantity}
            available_units: Dict of {ingredient_name: unit}
            nutrition_filter: Optional nutrition and preference filters
            
        Returns:
            List of compatible recipes
        """
        # First filter by available ingredients
        recipes = self.search_by_ingredients(available_ingredients, available_units)
        
        # Then apply nutrition/preference filters if provided
        if nutrition_filter:
            recipes = [r for r in recipes if nutrition_filter.matches(r)]
        
        return recipes
