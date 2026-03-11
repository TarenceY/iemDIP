const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, unique: true, required: true, lowercase: true },
  password_hash: { type: String, required: true },
  
 // Personal Metrics
  age: { type: Number },
  gender: { 
    type: String, 
    enum: ["Male", "Female", "Prefer not to say"] 
  },
  height: { type: Number }, // in cm
  weight: { type: Number }, // in kg

  // Lifestyle & Activity
  workoutFrequency: {
    type: String,
    enum: [
      "Never",
      "1-2 times per week",
      "3-4 times per week",
      "5-6 times per week",
      "Daily"
    ]
  },
  activityLevel: {
    type: String,
    enum: ["Sedentary", "light", "moderate", "high"]
  },

  // Metadata & Future proofing
  // (Keeping your previous arrays in case they appear in later steps)
  restrictions: [String], 
  dislikes: [String],     
  goals: [String],        
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);