const User = require("../models/User");
const NutritionLog = require("../models/NutritionLog");
const axios = require("axios");

/**
 * Call Python AI service to get Gemini meal advice
 * Analyzes if meal will exceed targets and provides suggestions
 */
async function callMealAdviceService(user, meal, dailyTotals, dailyTargets) {
  const aiApiUrl = process.env.AI_API_URL || "http://localhost:8000";
  
  const payload = {
    user_profile: {
      age: user.age,
      gender: user.gender,
      goals: user.goals || [],
      restrictions: user.restrictions || [],
      dislikes: user.dislikes || []
    },
    meal_data: {
      food_name: meal.food_name || "Food item",
      calories: meal.calories || 0,
      protein: meal.protein || 0,
      carbs: meal.carbs || 0,
      fats: meal.fats || 0,
      fiber: meal.fiber || 0,
      sodium: meal.sodium || 0
    },
    daily_totals: dailyTotals,
    daily_targets: dailyTargets
  };
  
  try {
    const response = await axios.post(`${aiApiUrl}/api/meal-advice`, payload, {
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error("Failed to call AI service for meal advice:", error.message);
    throw error;
  }
}

/**
 * Calculate daily nutrition targets based on user profile
 */
function calculateDailyTargets(user) {
  let dailyCalories = 2000;
  let dailyProtein = 50;
  let dailyCarbs = 300;
  let dailyFats = 65;
  let dailyFiber = 25;
  let dailySodium = 2300;

  // Adjust for age and gender
  if (user.age && user.gender) {
    if (user.gender.toLowerCase() === "male") {
      dailyCalories = user.age < 30 ? 2500 : user.age < 51 ? 2400 : 2000;
      dailyProtein = 56;
    } else if (user.gender.toLowerCase() === "female") {
      dailyCalories = user.age < 30 ? 2000 : user.age < 51 ? 1800 : 1600;
      dailyProtein = 46;
    }
  }

  // Adjust for goals
  if (user.goals && Array.isArray(user.goals)) {
    if (user.goals.includes("weight_loss")) {
      dailyCalories *= 0.85;  // 15% deficit
      dailyProtein *= 1.2;    // Increase protein
    } else if (user.goals.includes("muscle_gain")) {
      dailyCalories *= 1.1;   // 10% surplus
      dailyProtein *= 1.5;
    }
  }

  return {
    calories: Math.round(dailyCalories),
    protein_g: Math.round(dailyProtein),
    carbs_g: Math.round(dailyCarbs),
    fats_g: Math.round(dailyFats),
    fiber_g: Math.round(dailyFiber),
    sodium_mg: Math.round(dailySodium)
  };
}

/**
 * Aggregate daily nutrition totals for a user
 */
async function getDailyTotals(userId, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const logs = await NutritionLog.find({
    user_id: userId,
    log_date: { $gte: startOfDay, $lte: endOfDay }
  });

  return {
    total_calories: logs.reduce((sum, log) => sum + (log.calories || 0), 0),
    total_protein_g: logs.reduce((sum, log) => sum + (log.protein || 0), 0),
    total_carbs_g: logs.reduce((sum, log) => sum + (log.carbs || 0), 0),
    total_fats_g: logs.reduce((sum, log) => sum + (log.fats || 0), 0),
    total_fiber_g: logs.reduce((sum, log) => sum + (log.fiber || 0), 0),
    total_sodium_mg: logs.reduce((sum, log) => sum + (log.sodium || 0), 0),
    meals_count: logs.length,
    logs: logs
  };
}

/**
 * POST /api/meals/advice
 * 
 * Get personalized meal advice analyzing if meal exceeds daily targets
 * 
 * Returns:
 * - verdict: GOOD/CAUTION/BAD based on target exceedance
 * - analysis_notes: Detailed analysis of which targets will be exceeded
 * - notes: Suggestions and recommendations
 */
exports.getMealAdvice = async (req, res) => {
  try {
    const { userId, date } = req.query;
    const { meal } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    if (!meal) {
      return res.status(400).json({ error: "meal data is required" });
    }

    // Get user profile
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate daily targets for this user
    const dailyTargets = calculateDailyTargets(user);

    // Get today's nutrition totals
    const analysisDate = date ? new Date(date) : new Date();
    const dailyTotals = await getDailyTotals(userId, analysisDate);

    // Calculate what will happen after this meal
    const totalCaloriesAfter = dailyTotals.total_calories + (meal.calories || 0);
    const totalProteinAfter = dailyTotals.total_protein_g + (meal.protein || 0);
    const totalCarbsAfter = dailyTotals.total_carbs_g + (meal.carbs || 0);
    const totalFatsAfter = dailyTotals.total_fats_g + (meal.fats || 0);
    const totalSodiumAfter = dailyTotals.total_sodium_mg + (meal.sodium || 0);

    // Calculate remaining macros after this meal
    const remaining = {
      calories: dailyTargets.calories - totalCaloriesAfter,
      protein_g: dailyTargets.protein_g - totalProteinAfter,
      carbs_g: dailyTargets.carbs_g - totalCarbsAfter,
      fats_g: dailyTargets.fats_g - totalFatsAfter,
      fiber_g: dailyTargets.fiber_g - (dailyTotals.total_fiber_g + (meal.fiber || 0)),
      sodium_mg: dailyTargets.sodium_mg - totalSodiumAfter
    };

    // Calculate percentages of daily targets
    const percentages = {
      calories: Math.round((totalCaloriesAfter / dailyTargets.calories) * 100),
      protein: Math.round((totalProteinAfter / dailyTargets.protein_g) * 100),
      carbs: Math.round((totalCarbsAfter / dailyTargets.carbs_g) * 100),
      fats: Math.round((totalFatsAfter / dailyTargets.fats_g) * 100),
    };

    // Determine what will exceed
    const willExceed = {
      calories: totalCaloriesAfter > dailyTargets.calories,
      protein: totalProteinAfter > dailyTargets.protein_g,
      carbs: totalCarbsAfter > dailyTargets.carbs_g,
      fats: totalFatsAfter > dailyTargets.fats_g,
      sodium: totalSodiumAfter > dailyTargets.sodium_mg
    };

    // Call Python AI service to get Gemini analysis
    let geminiAdvice = null;
    try {
      geminiAdvice = await callMealAdviceService(
        user,
        meal,
        dailyTotals,
        dailyTargets
      );
    } catch (geminiError) {
      console.warn("Gemini advice generation failed", geminiError.message);
      // Continue with basic analysis if Gemini fails
    }

    // Return comprehensive analysis
    const response_data = {
      success: true,
      meal_verdict: analyzeMealFit(meal, dailyTargets, dailyTotals, user),
      nutritional_analysis: {
        meal: meal,
        daily_totals_before: dailyTotals,
        totals_after_meal: {
          calories: totalCaloriesAfter,
          protein_g: totalProteinAfter,
          carbs_g: totalCarbsAfter,
          fats_g: totalFatsAfter,
          sodium_mg: totalSodiumAfter
        },
        remaining_after_meal: remaining,
        percentages_of_daily_target: percentages,
        will_exceed: willExceed,
        daily_targets: dailyTargets
      },
      gemini_advice: geminiAdvice?.advice || null,
      recommendation: generateRecommendation(meal, dailyTargets, dailyTotals, user)
    };

    res.json(response_data);
  } catch (err) {
    console.error("Meal advice error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Local analysis of meal fit (before Gemini)
 */
function analyzeMealFit(meal, dailyTargets, dailyTotals, user) {
  const totalCalories = dailyTotals.total_calories + (meal.calories || 0);
  const caloriePercent = (totalCalories / dailyTargets.calories) * 100;

  let verdict = "NEUTRAL";
  let reason = "";

  if (totalCalories > dailyTargets.calories * 1.15) {
    verdict = "BAD";
    reason = `Meal will push daily calories to ${caloriePercent.toFixed(0)}% of target`;
  } else if (totalCalories > dailyTargets.calories) {
    verdict = "CAUTION";
    reason = `Meal will exceed calorie target by ${(totalCalories - dailyTargets.calories).toFixed(0)} calories`;
  } else {
    verdict = "GOOD";
    reason = "Meal fits within daily calorie goals";
  }

  return {
    verdict,
    reason,
    calorie_percentage: caloriePercent.toFixed(1)
  };
}

/**
 * Generate personalized recommendations
 */
function generateRecommendation(meal, dailyTargets, dailyTotals, user) {
  const recommendations = [];

  const totalCals = dailyTotals.total_calories + (meal.calories || 0);
  const totalProtein = dailyTotals.total_protein_g + (meal.protein || 0);

  if (totalCals > dailyTargets.calories * 1.1) {
    recommendations.push("Consider a lighter meal to stay within calorie goals");
  }

  if (totalProtein < dailyTargets.protein_g) {
    recommendations.push("Consider adding more protein to this meal");
  }

  if (user.goals && user.goals.includes("weight_loss")) {
    if (meal.calories > dailyTargets.calories * 0.5) {
      recommendations.push("For weight loss, consider reducing portion size");
    }
  }

  if (user.goals && user.goals.includes("muscle_gain")) {
    if (totalProtein < dailyTargets.protein_g) {
      recommendations.push("Increase protein intake to support muscle building");
    }
  }

  return recommendations.length > 0 ? recommendations : ["Meal looks appropriate for your profile"];
}

exports.calculateDailyTargets = calculateDailyTargets;
exports.getDailyTotals = getDailyTotals;
