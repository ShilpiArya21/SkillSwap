const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const exchangeRoutes = require("./src/routes/exchangeRoutes");
const helmet = require("helmet");

require("dotenv").config();
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.MONGO_URI || !process.env.SESSION_SECRET) {
  console.error("Missing required environment variables: MONGO_URI and SESSION_SECRET");
  process.exit(1);
}

if (process.env.SESSION_SECRET.length < 32) {
  console.error("SESSION_SECRET must be at least 32 characters long.");
  process.exit(1);
}

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
  }),
)

app.use(
  cors({
    origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",").map((value) => value.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: "20kb" }));
app.disable("x-powered-by");
if (isProduction) app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
    }),
    cookie: {
      httpOnly: true,
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: "lax",
    },
  }),
);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/exchanges", exchangeRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully ✅");
  })
  .catch((error) => {
    console.error("MongoDB connection failed ❌");
    console.error(error.message);
  });

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "SkillSwap API is running 🚀",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`SkillSwap server running on http://localhost:${PORT}`);
});
