
const express = require("express");
const User = require("../models/UserModel");

const router = express.Router();

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Users fetched successfully",
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch users",
    });
  }
});

// Search users by name or skills
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        message: "Please enter a search term",
      });
    }

    const searchTerm = q.trim();

    const users = await User.find({
      $or: [
        { name: { $regex: searchTerm, $options: "i" } },
        { skillsToTeach: { $regex: searchTerm, $options: "i" } },
        { skillsToLearn: { $regex: searchTerm, $options: "i" } },
      ],
    })
      .select("-password -email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Search completed successfully",
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("User search failed:", error.message);

    res.status(500).json({
      message: "Failed to search users",
    });
  }
});

// Filter users by skills they teach or want to learn
router.get("/filter", async (req, res) => {
  try {
    const { teach, learn } = req.query;

    if (!teach && !learn) {
      return res.status(400).json({
        message: "Please provide a teach or learn skill",
      });
    }

    const filters = [];

    if (teach && teach.trim()) {
      filters.push({
        skillsToTeach: {
          $regex: teach.trim(),
          $options: "i",
        },
      });
    }

    if (learn && learn.trim()) {
      filters.push({
        skillsToLearn: {
          $regex: learn.trim(),
          $options: "i",
        },
      });
    }

    if (filters.length === 0) {
      return res.status(400).json({
        message: "Please provide a valid skill",
      });
    }

    const users = await User.find({
      $and: filters,
    })
      .select("-password -email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Users filtered successfully",
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("User filter failed:", error.message);

    res.status(500).json({
      message: "Failed to filter users",
    });
  }
});




module.exports = router;