const express = require("express");
const router = express.Router();
const pool = require("../db");

/* --- USERS --- */
router.get("/users", async (req, res) => {
    try {
        // ADDED 'phone' TO THE SELECT QUERY
        const [rows] = await pool.query("SELECT id, name, email, phone, role FROM users ORDER BY name ASC");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/users/:id/role", async (req, res) => {
    try {
        await pool.query("UPDATE users SET role = ? WHERE id = ?", [req.body.role, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/users/:id", async (req, res) => {
    try {
        await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/* --- ROOMS --- */
router.get("/rooms", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM rooms ORDER BY name ASC");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/rooms", async (req, res) => {
    try {
        await pool.query("INSERT INTO rooms (name) VALUES (?)", [req.body.name]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/rooms/:id", async (req, res) => {
    try {
        await pool.query("DELETE FROM rooms WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/* --- MENU --- */
router.get("/menu", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM menu");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/menu", async (req, res) => {
    const { name, price, category } = req.body;
    try {
        await pool.query("INSERT INTO menu (name, price, category, available) VALUES (?, ?, ?, 1)", [name, price, category]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/menu/:id/toggle", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT available FROM menu WHERE id=?", [req.params.id]);
        const newStatus = rows[0].available ? 0 : 1;
        await pool.query("UPDATE menu SET available=? WHERE id=?", [newStatus, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/menu/:id", async (req, res) => {
    try {
        await pool.query("DELETE FROM menu WHERE id=?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


/* ===========================
   ⏳ TIME SLOTS MANAGEMENT
=========================== */
// 1. GET ALL SLOTS
router.get("/timeslots", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM timeslots ORDER BY start_time ASC");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. ADD NEW SLOT
router.post("/timeslots", async (req, res) => {
    const { start_time, end_time, max_orders } = req.body;
    try {
        await pool.query(
            "INSERT INTO timeslots (start_time, end_time, max_orders) VALUES (?, ?, ?)", 
            [start_time, end_time, max_orders]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. DELETE SLOT
router.delete("/timeslots/:id", async (req, res) => {
    try {
        await pool.query("DELETE FROM timeslots WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. UPDATE CAPACITY (Optional: To change max orders for an existing slot)
router.put("/timeslots/:id", async (req, res) => {
    const { max_orders } = req.body;
    try {
        await pool.query("UPDATE timeslots SET max_orders = ? WHERE id = ?", [max_orders, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;