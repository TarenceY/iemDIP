const express = require("express");
const router = express.Router();
const MealAdvisorController = require("../controllers/mealAdvisor");

/**
 * POST /api/meals/advice
 * 
 * Get personalized meal advice analyzing if meal exceeds daily targets
 * 
 * Query Params:
 *   - userId: User ID (required)
 *   - date: Date for daily totals (optional, default: today)
 * 
 * Body:
 * {
 *   "meal": {
 *     "food_name": "Grilled Chicken Salad",
 *     "calories": 350,
 *     "protein": 45,
 *     "carbs": 15,
 *     "fats": 12,
 *     "fiber": 8,
 *     "sodium": 800
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "meal_verdict": { verdict, reason, calorie_percentage },
 *   "nutritional_analysis": { 
 *     "daily_totals_before": {...},
 *     "totals_after_meal": {...},
 *     "remaining_after_meal": {...},
 *     "percentages_of_daily_target": {...},
 *     "will_exceed": { calories, protein, carbs, fats, sodium },
 *     "daily_targets": {...}
 *   },
 *   "gemini_advice": {
 *     "verdict": "GOOD|CAUTION|BAD",
 *     "justification": "...",
 *     "tips": ["tip1", "tip2", "tip3"],
 *     "analysis_notes": "Detailed analysis of target exceedance",
 *     "notes": "Suggestions and recommendations",
 *     "will_exceed_targets": {...}
 *   },
 *   "recommendation": ["...", "..."]
 * }
 */
router.post("/advice", MealAdvisorController.getMealAdvice);

module.exports = router;
