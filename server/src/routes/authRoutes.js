const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/UserModel");

const router = express.Router();

// Basic per-process throttling for authentication endpoints. For multi-instance production,
// replace with a shared store-backed limiter at the reverse proxy/application layer.
const authAttempts = new Map();
function limitAuthAttempts(req, res, next) {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const entry = authAttempts.get(key);
  if (!entry || now - entry.startedAt > 15 * 60 * 1000) {
    authAttempts.set(key, { startedAt: now, count: 1 });
    return next();
  }
  if (entry.count >= 20) {
    return res.status(429).json({ message: "Too many attempts. Please try again in 15 minutes." });
  }
  entry.count += 1;
  return next();
}
router.use(["/login", "/register"], limitAuthAttempts);

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Name, email and password must be text" });
    }
    if (name.trim().length < 2 || name.trim().length > 50 || password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: "Name must be 2–50 characters and password 8–128 characters" });
    }

    // Check required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    // Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string" || email.length > 254 || password.length > 128) {
      return res.status(400).json({ message: "Please provide a valid email and password" });
    }

    // Check required fields
    if (!email.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Rotate the session identifier after authentication to reduce session-fixation risk.
    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        return res.status(500).json({ message: "Session creation failed" });
      }
      req.session.userId = user._id.toString();

      req.session.save((err) => {
      if (err) {
        return res.status(500).json({
          message: "Session creation failed",
        });
      }

      return res.status(200).json({
        message: "Login successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
      });
    });
  } catch (error) {
    console.error("Login failed:", error.message);

    res.status(500).json({
      message: "Login failed",
    });
  }
});
// Get current logged-in user
router.get("/me", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Please login first",
      });
    }

    const user = await User.findById(req.session.userId).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "User fetched successfully",
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch user",
    });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        message: "Logout failed",
      });
    }

    res.clearCookie("connect.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({
      message: "Logout successful",
    });
  });
});

 // Update logged-in user's profile
router.put("/me", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Please login first",
      });
    }


    const updates = {};
    const { body } = req;

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 50) {
        return res.status(400).json({ message: "Name must be 2–50 characters" });
      }
      updates.name = body.name.trim();
    }
    if (body.bio !== undefined) {
      if (typeof body.bio !== "string" || body.bio.length > 500) return res.status(400).json({ message: "Bio must be at most 500 characters" });
      updates.bio = body.bio.trim();
    }
    if (body.location !== undefined) {
      if (typeof body.location !== "string" || body.location.length > 100) return res.status(400).json({ message: "Location must be at most 100 characters" });
      updates.location = body.location.trim();
    }
    if (body.experienceLevel !== undefined) {
      if (!["Beginner", "Intermediate", "Advanced"].includes(body.experienceLevel)) return res.status(400).json({ message: "Invalid experience level" });
      updates.experienceLevel = body.experienceLevel;
    }
    for (const field of ["skillsToTeach", "skillsToLearn"]) {
      if (body[field] !== undefined) {
        if (!Array.isArray(body[field]) || body[field].length > 20 || body[field].some((skill) => typeof skill !== "string" || !skill.trim() || skill.trim().length > 50)) {
          return res.status(400).json({ message: `${field} must contain up to 20 skills, each 1–50 characters` });
        }
        updates[field] = [...new Set(body[field].map((skill) => skill.trim()))];
      }
    }
    if (body.profileImage !== undefined) {
      if (typeof body.profileImage !== "string" || body.profileImage.length > 500) return res.status(400).json({ message: "Profile image URL is too long" });
      updates.profileImage = body.profileImage.trim();
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: "No valid profile fields provided" });

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Profile update failed:", error.message);

    return res.status(400).json({
      message: "Profile update failed. Please check your details.",
    });
  }
});

module.exports = router;
