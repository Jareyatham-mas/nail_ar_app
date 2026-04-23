const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(cors({
  origin: "*", // 🔥 ตอน deploy เปลี่ยนเป็น domain จริง
}));
app.use(express.json());

/* =========================
   TEST API
========================= */
app.get("/", (req, res) => {
  res.send("API Running...");
});

/* =========================
   GET NAILS
========================= */
app.get("/api/nails", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM nails");
    res.status(200).json(rows);
  } catch (err) {
    console.error("GET /api/nails error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   CREATE BOOKING
========================= */
app.post("/api/bookings", async (req, res) => {
  try {
    const { name, phone, nail_id, booking_time } = req.body;

    // 🔥 validation (สำคัญมาก)
    if (!name || !phone || !nail_id || !booking_time) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    // 🔥 insert
    const [result] = await pool.query(
      `INSERT INTO bookings 
      (customer_name, phone, nail_id, booking_time) 
      VALUES (?, ?, ?, ?)`,
      [name, phone, nail_id, booking_time]
    );

    res.status(201).json({
      success: true,
      booking_id: result.insertId
    });

  } catch (err) {
    console.error("POST /api/bookings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   GET BOOKINGS (ADMIN)
========================= */
app.get("/api/bookings", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, n.name AS nail_name
       FROM bookings b
       JOIN nails n ON b.nail_id = n.id
       ORDER BY b.booking_time DESC`
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error("GET bookings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   START SERVER
========================= */
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});