const express = require("express");
const { db, admin } = require("../config/firebase");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/food/set-limit
// Admin sets tonight's prepared food quantity (meal count) and
// resets the "served" counter to zero for a fresh session.
// Before resetting, the previous session's final numbers are
// archived — this history is what powers crowd prediction.
router.post("/set-limit", verifyToken, requireAdmin, async (req, res) => {
  const { limit } = req.body;
  if (!limit || limit <= 0) {
    return res.status(400).json({ error: "A positive food limit is required" });
  }
  try {
    const prevSnap = await db.collection("stats").doc("foodCount").get();
    if (prevSnap.exists && prevSnap.data().limit) {
      const prev = prevSnap.data();
      const archiveDate = new Date(prev.updatedAt || Date.now());
      await db.collection("foodHistory").add({
        dateKey: archiveDate.toISOString().slice(0, 10),
        weekday: archiveDate.getDay(), // 0=Sun..6=Sat
        limit: prev.limit || 0,
        served: prev.served || 0,
        archivedAt: Date.now(),
      });
    }

    await db.collection("stats").doc("foodCount").set({
      limit: Number(limit),
      served: 0,
      updatedAt: Date.now(),
    });
    // fresh session also resets live crowd count
    await db.collection("stats").doc("liveCrowd").set({ count: 0, updatedAt: Date.now() });
    res.json({ success: true, limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: "Failed to set food limit" });
  }
});

// GET /api/food/status
// Any logged-in student/staff can check how many meals remain
// tonight — shown in the app or pushed as a low-stock notification.
router.get("/status", verifyToken, async (req, res) => {
  try {
    const snap = await db.collection("stats").doc("foodCount").get();
    const data = snap.exists ? snap.data() : { limit: 0, served: 0 };
    const remaining = Math.max((data.limit || 0) - (data.served || 0), 0);
    res.json({
      limit: data.limit || 0,
      served: data.served || 0,
      remaining,
      lowStock: remaining > 0 && remaining <= Math.max(Math.round((data.limit || 0) * 0.1), 5),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch food status" });
  }
});

module.exports = router;
