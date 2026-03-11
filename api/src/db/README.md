# Recipe Database Schema

This directory contains the SQL migration files for the normalised recipe database.

## Structure

```
db/
└── migrations/
    ├── 001_create_recipe_schema.sql   – DDL: creates all tables
    └── 002_seed_recipe_data.sql       – DML: sample / seed data
```

## Entity-Relationship Overview

```
Recipe
  │
  ├── Recipe_Ingredients ── Ingredient
  │
  ├── Recipe_Steps
  │
  └── Recipe_Categories ── Categories
```

## Tables

### 1. Recipe
Stores core information about each recipe.

| Column      | Type         | Description                        |
|-------------|--------------|------------------------------------|
| recipe_id   | INT (PK)     | Unique recipe identifier           |
| title       | VARCHAR(255) | Name of the recipe                 |
| description | TEXT         | Short description                  |
| prep_time   | INT          | Preparation time (minutes)         |
| cook_time   | INT          | Cooking time (minutes)             |
| servings    | INT          | Number of servings                 |
| difficulty  | VARCHAR(50)  | Easy / Medium / Hard               |
| created_at  | DATETIME     | When the recipe was added          |

### 2. Ingredient
Stores unique ingredients so they can be reused across recipes.

| Column        | Type         | Description           |
|---------------|--------------|-----------------------|
| ingredient_id | INT (PK)     | Ingredient identifier |
| name          | VARCHAR(255) | Ingredient name       |

### 3. Recipe_Ingredients _(Many-to-Many)_
Links recipes to ingredients with quantity details.

| Column        | Type        | Description               |
|---------------|-------------|---------------------------|
| recipe_id     | INT (FK)    | References Recipe         |
| ingredient_id | INT (FK)    | References Ingredient     |
| quantity      | FLOAT       | Amount                    |
| unit          | VARCHAR(50) | g, ml, tbsp, cloves, etc. |

### 4. Recipe_Steps
Stores ordered cooking instructions for each recipe.

| Column      | Type     | Description              |
|-------------|----------|--------------------------|
| step_id     | INT (PK) | Step identifier          |
| recipe_id   | INT (FK) | References Recipe        |
| step_number | INT      | Order of the step        |
| instruction | TEXT     | Instruction text         |

### 5. Categories
Stores unique recipe categories.

| Column      | Type         | Description         |
|-------------|--------------|---------------------|
| category_id | INT (PK)     | Category identifier |
| name        | VARCHAR(100) | Category name       |

### 6. Recipe_Categories _(Many-to-Many)_
Links recipes to one or more categories.

| Column      | Type     | Description           |
|-------------|----------|-----------------------|
| recipe_id   | INT (FK) | References Recipe     |
| category_id | INT (FK) | References Categories |

## Advantages of This Structure

- **Avoids duplicated ingredients** – each ingredient is stored once.
- **Easy ingredient search** – find all recipes containing a specific ingredient.
- **Supports unlimited steps** – steps are stored in a separate ordered table.
- **Supports many categories per recipe** – via the junction table.

## Running the Migrations

```bash
# MySQL / MariaDB
mysql -u <user> -p <database> < api/src/db/migrations/001_create_recipe_schema.sql
mysql -u <user> -p <database> < api/src/db/migrations/002_seed_recipe_data.sql
```
