const User = require("../models/User");
const bcrypt = require("bcrypt");

exports.register = async (req, res) => {
  try {
    const { 
      first_name, 
      last_name, 
      email, 
      password, 
      confirmPassword, // Added from frontend
      age, 
      gender, 
      height, 
      weight, 
      workout_frequency, 
      activeness_level 
    } = req.body;

    // 1. Validate password match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 2. Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // 3. Hash Password
    const password_hash = await bcrypt.hash(password, 10);

    // 4. Create User based on new Schema
    const user = new User({
      first_name,
      last_name,
      email: email.toLowerCase(),
      password_hash,
      age,
      gender,
      height,
      weight,
      workout_frequency,
      activeness_level
    });

    await user.save();

    res.status(201).json({
      message: "User registered successfully",
      userId: user._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { 
      first_name, 
      last_name, 
      age, 
      gender, 
      height, 
      weight, 
      workout_frequency, 
      activeness_level,
      restrictions,
      dislikes,
      goals 
    } = req.body;
    
    const userId = req.params.id;

    const updates = { 
      first_name, 
      last_name, 
      age, 
      gender, 
      height, 
      weight, 
      workout_frequency, 
      activeness_level,
      restrictions,
      dislikes,
      goals 
    };

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// login and getUserInfo remain mostly the same, 
// though they will now return the new fields automatically.
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ message: "Invalid password" });

    res.json({ 
      message: "Login successful", 
      userId: user._id,
      name: `${user.first_name} ${user.last_name}` // Optional: return full name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserInfo = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password_hash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};