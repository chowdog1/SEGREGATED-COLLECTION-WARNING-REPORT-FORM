require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/warning_reports";

// Middleware
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Serve built Vue app from /public
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/", require("./routes/reports"));

// SPA fallback — send index.html for any non-API route
// This allows Vue Router's history mode to work correctly
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  }
});

// Connect to MongoDB and start server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    console.error("Make sure MongoDB is running: sudo systemctl start mongod");
    process.exit(1);
  });
