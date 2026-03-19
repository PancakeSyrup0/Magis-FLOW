const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../db");

/* FACULTY REGISTER */
router.post("/faculty-register", async (req, res) => {
  const { name, email, phone, password, department } = req.body; 
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, phone, password, role, department) VALUES (?,?,?,?,?,?)",
      [name, email, phone, hashedPassword, "faculty", department]
    );
    res.json({ success: true, message: "Registration successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Registration failed" });
  }
});

/* FACULTY LOGIN */
router.post("/faculty-login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email=? AND role='faculty'", [email]);
    if (rows.length && await bcrypt.compare(password, rows[0].password)) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Login error" });
  }
});

/* STAFF LOGIN (FIXED) */
router.post("/staff-login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email=? AND role='staff'", [email]);
    // Changed to bcrypt.compare
    if (rows.length && await bcrypt.compare(password, rows[0].password)) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Login error" });
  }
});

/* ADMIN LOGIN (FIXED) */
router.post("/admin-login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email=? AND role='admin'", [email]);
    // Changed to bcrypt.compare
    if (rows.length && await bcrypt.compare(password, rows[0].password)) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;