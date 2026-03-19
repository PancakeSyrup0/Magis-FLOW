require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Route Imports
const authRoutes = require("./routes/authRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const staffRoutes = require("./routes/staffRoutes");
const adminRoutes = require("./routes/adminRoutes");

// API Routes
app.use("/", authRoutes); // Login/Register routes
app.use("/api/faculty", facultyRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin", adminRoutes);

// Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);