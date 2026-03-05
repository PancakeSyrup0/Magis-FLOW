const express = require("express");
const router = express.Router();
const pool = require("../db");

/* GET DASHBOARD STATS */
router.get("/dashboard", async (req, res) => {
    const { email } = req.query;
    try {
        const [userRows] = await pool.query("SELECT id FROM users WHERE email=?", [email]);
        if (!userRows.length) return res.json({ activeOrders: 0, ordersToday: 0, totalOrders: 0 });
        
        const userId = userRows[0].id;
        
        // Count active orders
        const [[active]] = await pool.query("SELECT COUNT(*) AS c FROM orders WHERE user_id=? AND status NOT IN ('Delivered', 'Cancelled')", [userId]);
        const [[today]] = await pool.query("SELECT COUNT(*) AS c FROM orders WHERE user_id=? AND DATE(created_at)=CURDATE()", [userId]);
        const [[total]] = await pool.query("SELECT COUNT(*) AS c FROM orders WHERE user_id=?", [userId]);

        res.json({ activeOrders: active.c, ordersToday: today.c, totalOrders: total.c });
    } catch (err) { res.status(500).json({ message: "Error" }); }
});

/* GET MENU */
router.get("/menu", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT name, price FROM menu WHERE available=1");
        res.json(rows);
    } catch (err) { res.status(500).json([]); }
});

/* GET ROOMS */
router.get("/rooms", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT name FROM rooms ORDER BY name ASC");
        res.json(rows);
    } catch (err) { res.status(500).json([]); }
});

/* ===========================
   ⏳ TIME SLOTS (New Logic)
=========================== */
router.get("/timeslots", async (req, res) => {
    try {
        // Fetch slots + Count of active orders for TODAY
        const [rows] = await pool.query(`
            SELECT t.id, t.start_time, t.end_time, t.max_orders, 
            (SELECT COUNT(*) FROM orders o 
             WHERE o.time_slot_id = t.id 
             AND DATE(o.created_at) = CURDATE() 
             AND o.status != 'Cancelled') as current_count
            FROM timeslots t
            ORDER BY t.start_time ASC
        `);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
});

/* PLACE ORDER */
router.post("/orders", async (req, res) => {
    const { email, items, totalAmount, room, timeSlotId } = req.body;

    try {
        // 1. Get User ID
        const [userRows] = await pool.query("SELECT id FROM users WHERE email=?", [email]);
        if (!userRows.length) return res.status(400).json({ message: "User not found" });
        const userId = userRows[0].id;

        // 2. CHECK CAPACITY (Race Condition Check)
        const [slotRows] = await pool.query(`
            SELECT t.max_orders, 
            (SELECT COUNT(*) FROM orders o WHERE o.time_slot_id = t.id AND DATE(o.created_at) = CURDATE() AND o.status != 'Cancelled') as current_count
            FROM timeslots t WHERE t.id = ?`, [timeSlotId]);

        if (slotRows.length === 0) return res.status(400).json({ message: "Invalid time slot" });

        const slot = slotRows[0];
        if (slot.current_count >= slot.max_orders) {
            return res.status(400).json({ message: "⚠️ This time slot is full! Please choose another." });
        }

        // 3. Insert Order
        const orderId = "ORD-" + Date.now();
        await pool.query(
            `INSERT INTO orders (order_id, user_id, faculty_email, items, amount, status, room, time_slot_id) 
             VALUES (?, ?, ?, ?, ?, 'Preparing', ?, ?)`,
            [orderId, userId, email, JSON.stringify(items), totalAmount, room, timeSlotId]
        );

        res.json({ success: true, message: "Order placed successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Order failed" });
    }
});

/* CURRENT ORDERS (FIXED: Now selects 'amount') */
router.get("/orders/current", async (req, res) => {
    const { email } = req.query;
    try {
        const [userRows] = await pool.query("SELECT id FROM users WHERE email=?", [email]);
        if (!userRows.length) return res.json([]);
        
        const userId = userRows[0].id;

        // Added 'amount' to the SELECT list
        const [rows] = await pool.query(
            `SELECT order_id AS id, items, amount, status, created_at 
             FROM orders 
             WHERE user_id=? AND created_at >= NOW() - INTERVAL 1 DAY 
             ORDER BY created_at DESC`, 
            [userId]
        );
        res.json(rows);
    } catch (err) { res.status(500).json([]); }
});

module.exports = router;