-- =============================================================
-- Migration: 001_create_recipe_schema.sql
-- Description: Creates the normalised recipe database schema.
--
-- Tables created:
--   Recipe            - Core recipe information
--   Ingredient        - Unique ingredient catalogue
--   Recipe_Ingredients - Many-to-many: recipes <-> ingredients
--   Recipe_Steps      - Ordered cooking instructions per recipe
--   Categories        - Unique category catalogue
--   Recipe_Categories  - Many-to-many: recipes <-> categories
-- =============================================================

-- -------------------------------------------------------------
-- 1. Recipe Table
--    Stores the main information about each recipe.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Recipe (
    recipe_id   INT          NOT NULL AUTO_INCREMENT,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    prep_time   INT,          -- preparation time in minutes
    cook_time   INT,          -- cooking time in minutes
    servings    INT,
    difficulty  VARCHAR(50),  -- e.g. Easy / Medium / Hard
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (recipe_id)
);

-- -------------------------------------------------------------
-- 2. Ingredient Table
--    Stores unique ingredients so they can be reused across
--    many recipes.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Ingredient (
    ingredient_id INT          NOT NULL AUTO_INCREMENT,
    name          VARCHAR(255) NOT NULL UNIQUE,
    PRIMARY KEY (ingredient_id)
);

-- -------------------------------------------------------------
-- 3. Recipe_Ingredients Table  (Many-to-Many)
--    A recipe can have many ingredients, and an ingredient can
--    appear in many recipes.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Recipe_Ingredients (
    recipe_id     INT          NOT NULL,
    ingredient_id INT          NOT NULL,
    quantity      FLOAT,
    unit          VARCHAR(50), -- e.g. g, ml, tbsp, cloves
    PRIMARY KEY (recipe_id, ingredient_id),
    CONSTRAINT fk_ri_recipe
        FOREIGN KEY (recipe_id)     REFERENCES Recipe(recipe_id)     ON DELETE CASCADE,
    CONSTRAINT fk_ri_ingredient
        FOREIGN KEY (ingredient_id) REFERENCES Ingredient(ingredient_id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- 4. Recipe_Steps Table
--    Stores ordered cooking instructions for each recipe.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Recipe_Steps (
    step_id     INT  NOT NULL AUTO_INCREMENT,
    recipe_id   INT  NOT NULL,
    step_number INT  NOT NULL,
    instruction TEXT NOT NULL,
    PRIMARY KEY (step_id),
    CONSTRAINT fk_rs_recipe
        FOREIGN KEY (recipe_id) REFERENCES Recipe(recipe_id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- 5. Categories Table
--    Stores unique recipe categories (e.g. Dessert, Vegan).
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Categories (
    category_id INT          NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL UNIQUE,
    PRIMARY KEY (category_id)
);

-- -------------------------------------------------------------
-- 6. Recipe_Categories Table  (Many-to-Many)
--    A recipe can belong to many categories, and a category
--    can contain many recipes.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Recipe_Categories (
    recipe_id   INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (recipe_id, category_id),
    CONSTRAINT fk_rc_recipe
        FOREIGN KEY (recipe_id)   REFERENCES Recipe(recipe_id)       ON DELETE CASCADE,
    CONSTRAINT fk_rc_category
        FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE CASCADE
);
