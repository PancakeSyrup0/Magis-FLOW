const express = require("express");
const router = express.Router();
const pool = require("../db");

/* 1. GET ACTIVE ORDERS (With Time Slot and Phone) */
router.get("/orders/active", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT o.order_id, o.items, o.amount, o.status, o.room, o.created_at,
                    t.start_time, t.end_time, u.phone
             FROM orders o
             LEFT JOIN timeslots t ON o.time_slot_id = t.id
             LEFT JOIN users u ON o.user_id = u.id
             WHERE o.status NOT IN ('Delivered', 'Cancelled') 
             ORDER BY t.start_time ASC, o.created_at ASC` 
        );
        res.json(rows);
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json([]);
    }
});

/* 2. GET PAST ORDERS (With Time Slot and Phone) */
router.get("/orders/past", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT o.order_id, o.items, o.amount, o.status, o.room, o.created_at,
                    t.start_time, t.end_time, u.phone
             FROM orders o
             LEFT JOIN timeslots t ON o.time_slot_id = t.id
             LEFT JOIN users u ON o.user_id = u.id
             WHERE o.status IN ('Delivered', 'Cancelled') 
             ORDER BY o.created_at DESC 
             LIMIT 50`
        );
        res.json(rows);
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json([]);
    }
});

/* 3. UPDATE STATUS */
router.post("/update-status", async (req, res) => {
    const { orderId, status } = req.body;
    try {
        await pool.query("UPDATE orders SET status = ? WHERE order_id = ?", [status, orderId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;