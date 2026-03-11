-- =============================================================
-- Seed: 002_seed_recipe_data.sql
-- Description: Sample data matching the problem-statement
--              examples for the normalised recipe schema.
-- =============================================================

-- -------------------------------------------------------------
-- Recipes
-- -------------------------------------------------------------
INSERT INTO Recipe (recipe_id, title, description, prep_time, cook_time, servings, difficulty)
VALUES (1, 'Chicken Curry', 'A flavourful chicken curry.', 15, 30, 4, 'Medium');

-- -------------------------------------------------------------
-- Ingredients
-- -------------------------------------------------------------
INSERT INTO Ingredient (ingredient_id, name) VALUES (1, 'Chicken');
INSERT INTO Ingredient (ingredient_id, name) VALUES (2, 'Garlic');
INSERT INTO Ingredient (ingredient_id, name) VALUES (3, 'Onion');

-- -------------------------------------------------------------
-- Recipe_Ingredients  (recipe 1 – Chicken Curry)
-- -------------------------------------------------------------
INSERT INTO Recipe_Ingredients (recipe_id, ingredient_id, quantity, unit)
VALUES (1, 1, 500,  'g');
INSERT INTO Recipe_Ingredients (recipe_id, ingredient_id, quantity, unit)
VALUES (1, 2, 3,    'cloves');
INSERT INTO Recipe_Ingredients (recipe_id, ingredient_id, quantity, unit)
VALUES (1, 3, 1,    'medium');

-- -------------------------------------------------------------
-- Recipe_Steps  (recipe 1 – Chicken Curry)
-- -------------------------------------------------------------
INSERT INTO Recipe_Steps (step_id, recipe_id, step_number, instruction)
VALUES (1, 1, 1, 'Chop garlic and onion.');
INSERT INTO Recipe_Steps (step_id, recipe_id, step_number, instruction)
VALUES (2, 1, 2, 'Heat oil in pan.');
INSERT INTO Recipe_Steps (step_id, recipe_id, step_number, instruction)
VALUES (3, 1, 3, 'Add chicken and cook until golden.');

-- -------------------------------------------------------------
-- Categories
-- -------------------------------------------------------------
INSERT INTO Categories (category_id, name) VALUES (1, 'Dessert');
INSERT INTO Categories (category_id, name) VALUES (2, 'Vegan');
INSERT INTO Categories (category_id, name) VALUES (3, 'Dinner');

-- -------------------------------------------------------------
-- Recipe_Categories  (recipe 1 belongs to "Dinner")
-- -------------------------------------------------------------
INSERT INTO Recipe_Categories (recipe_id, category_id) VALUES (1, 3);
