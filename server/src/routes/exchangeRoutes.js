
const express = require("express");
const Exchange = require("../models/ExchangeModel");
const User = require("../models/UserModel");

const Review = require("../models/ReviewModel");

const router = express.Router();

// Send a new skill exchange request
router.post("/", async (req, res) => {
  try {
    const { receiver, skillOffered, skillWanted, message } = req.body;

    // Check login
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Please log in first",
      });
    }

    // Validate required fields
    // if (!receiver || !skillOffered || !skillWanted) {
    //   return res.status(400).json({
    //     message: "Receiver, skill offered, and skill wanted are required",
    //   });
    // }

if (message !== undefined && typeof message !== "string") {
  return res.status(400).json({
    message: "Message must be text",
  });
}
    if (
  !receiver ||
  !skillOffered?.trim() ||
  !skillWanted?.trim()
) {
  return res.status(400).json({
    message: "Receiver, skill offered, and skill wanted are required",
  });
}


    // Prevent sending a request to yourself
    if (receiver === req.session.userId) {
      return res.status(400).json({
        message: "You cannot send a request to yourself",
      });
    }
// Validate receiver ID
    if (!/^[0-9a-fA-F]{24}$/.test(receiver)) {
      return res.status(400).json({
        message: "Invalid receiver ID",
      });
    }
    // Check whether receiver exists
    const receiverUser = await User.findById(receiver);

    if (!receiverUser) {
      return res.status(404).json({
        message: "Receiver user not found",
      });
    }

    // Prevent duplicate pending exchange requests
    const existingRequest = await Exchange.findOne({
      requester: req.session.userId,
      receiver,
      skillOffered: skillOffered.trim(),
      skillWanted: skillWanted.trim(),
      status: "Pending",
    });

    if (existingRequest) {
      return res.status(409).json({
        message: "A pending request for this skill exchange already exists",
      });
    }
    // Create exchange request
    // const exchange = await Exchange.create({
    //   requester: req.session.userId,
    //   receiver,
    //   skillOffered,
    //   skillWanted,
    //   message: message || "",
    // });

const exchange = await Exchange.create({
  requester: req.session.userId,
  receiver,
  skillOffered: skillOffered.trim(),
  skillWanted: skillWanted.trim(),
  message: message?.trim() || "",
});
    res.status(201).json({
      message: "Exchange request sent successfully",
      exchange,
    });
  } catch (error) {
    console.error("Exchange request error:", error.message);

    res.status(500).json({
      message: "Failed to send exchange request",
    });
  }
});

// Get exchange requests sent or received by the logged-in user
router.get("/", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Please log in first",
      });
    }

    const userId = req.session.userId;

    const exchanges = await Exchange.find({
      $or: [
        { requester: userId },
        { receiver: userId },
      ],
    })
      .populate("requester", "name")
      .populate("receiver", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Exchange requests fetched successfully",
      count: exchanges.length,
      exchanges,
    });
  } catch (error) {
    console.error("Fetch exchanges error:", error.message);

    res.status(500).json({
      message: "Failed to fetch exchange requests",
    });
  }
});

// Accept an exchange request
router.patch("/:id/accept", async (req, res) => {


  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Please log in first",
      });
    }
    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
  return res.status(400).json({
    message: "Invalid exchange ID",
  });
}

    const exchange = await Exchange.findById(req.params.id);

    if (!exchange) {
      return res.status(404).json({
        message: "Exchange request not found",
      });
    }

    // Only the receiver can accept the request
    if (exchange.receiver.toString() !== req.session.userId) {
      return res.status(403).json({
        message: "Only the receiver can accept this request",
      });
    }

    if (exchange.status !== "Pending") {
      return res.status(400).json({
        message: "Only pending requests can be accepted",
      });
    }

    exchange.status = "Accepted";
    await exchange.save();

    res.status(200).json({
      message: "Exchange request accepted successfully",
      exchange,
    });
  } catch (error) {
    console.error("Accept exchange error:", error.message);

    res.status(500).json({
      message: "Failed to accept exchange request",
    });
  }
});



/* Reject an exchange request */
router.patch("/:id/reject", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Please log in first",
      });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        message: "Invalid exchange ID",
      });
    }

    const exchange = await Exchange.findById(req.params.id);

    if (!exchange) {
      return res.status(404).json({
        message: "Exchange request not found",
      });
    }

    // Only the receiver can reject the request
    if (exchange.receiver.toString() !== req.session.userId) {
      return res.status(403).json({
        message: "Only the receiver can reject this request",
      });
    }

    if (exchange.status !== "Pending") {
      return res.status(400).json({
        message: "Only pending requests can be rejected",
      });
    }

    exchange.status = "Rejected";
    await exchange.save();

    res.status(200).json({
      message: "Exchange request rejected successfully",
      exchange,
    });
  } catch (error) {
    console.error("Reject exchange error:", error.message);

    res.status(500).json({
      message: "Failed to reject exchange request",
    });
  }
});

/* Mark an accepted exchange as completed */
router.patch("/:id/complete", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Please log in first",
      });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        message: "Invalid exchange ID",
      });
    }

    const exchange = await Exchange.findById(req.params.id);

    if (!exchange) {
      return res.status(404).json({
        message: "Exchange request not found",
      });
    }

    // Only participants can complete the exchange
    const userId = req.session.userId;
    const isRequester = exchange.requester.toString() === userId;
    const isReceiver = exchange.receiver.toString() === userId;

    if (!isRequester && !isReceiver) {
      return res.status(403).json({
        message: "You are not part of this exchange",
      });
    }

    if (exchange.status !== "Accepted") {
      return res.status(400).json({
        message: "Only accepted exchanges can be completed",
      });
    }

    exchange.status = "Completed";
    await exchange.save();

    res.status(200).json({
      message: "Exchange marked as completed",
      exchange,
    });
  } catch (error) {
    console.error("Complete exchange error:", error.message);

    res.status(500).json({
      message: "Failed to complete exchange",
    });
  }
});

/* Submit a review for a completed exchange */
router.post("/:id/reviews", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Please log in first",
      });
    }

    const { rating, comment } = req.body;
    const exchangeId = req.params.id;
    const userId = req.session.userId;

    if (!/^[0-9a-fA-F]{24}$/.test(exchangeId)) {
      return res.status(400).json({
        message: "Invalid exchange ID",
      });
    }

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    if (
      typeof comment !== "string" ||
      !comment.trim() ||
      comment.trim().length > 500
    ) {
      return res.status(400).json({
        message: "Comment is required and must be at most 500 characters",
      });
    }

    const exchange = await Exchange.findById(exchangeId);

    if (!exchange) {
      return res.status(404).json({
        message: "Exchange not found",
      });
    }

    if (exchange.status !== "Completed") {
      return res.status(400).json({
        message: "You can review only completed exchanges",
      });
    }

    const requesterId = exchange.requester.toString();
    const receiverId = exchange.receiver.toString();

    let reviewee;

    if (userId === requesterId) {
      reviewee = receiverId;
    } else if (userId === receiverId) {
      reviewee = requesterId;
    } else {
      return res.status(403).json({
        message: "You are not part of this exchange",
      });
    }

    const review = await Review.create({
      exchange: exchange._id,
      reviewer: userId,
      reviewee,
      rating,
      comment: comment.trim(),
    });

    res.status(201).json({
      message: "Review submitted successfully",
      review,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already reviewed this exchange",
      });
    }

    console.error("Submit review error:", error.message);

    res.status(500).json({
      message: "Failed to submit review",
    });
  }
});

/* Get reviews for a completed exchange */
router.get("/:id/reviews", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Please log in first",
      });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        message: "Invalid exchange ID",
      });
    }

    const exchange = await Exchange.findById(req.params.id);

    if (!exchange) {
      return res.status(404).json({
        message: "Exchange not found",
      });
    }

    const userId = req.session.userId;
    const isParticipant =
      exchange.requester.toString() === userId ||
      exchange.receiver.toString() === userId;

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not part of this exchange",
      });
    }

    const reviews = await Review.find({
      exchange: exchange._id,
    })
      .populate("reviewer", "name")
      .populate("reviewee", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("Fetch reviews error:", error.message);

    res.status(500).json({
      message: "Failed to fetch reviews",
    });
  }
});

module.exports = router;
