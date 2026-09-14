const express = require("express");
const { db } = require("../config/firebase");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/dashboard/stats
// Returns live crowd count, today's collections, and recent transactions
// for the admin dashboard.
router.get("/stats", verifyToken, requireAdmin, async (req, res) => {
  try {
    const crowdSnap = await db.collection("stats").doc("liveCrowd").get();
    const liveCrowd = crowdSnap.exists ? crowdSnap.data().count || 0 : 0;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const txnSnap = await db
      .collection("transactions")
      .where("timestamp", ">=", startOfDay.getTime())
      .get();

    let transactions = txnSnap.docs.map((d) => d.data());
    transactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const todayRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const todayMealsServed = transactions.length;

    res.json({
      liveCrowd,
      todayRevenue,
      todayMealsServed,
      recentTransactions: transactions.slice(0, 20),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// POST /api/dashboard/reset-session
// Resets the live crowd counter at the start of a new mess window.
router.post("/reset-session", verifyToken, requireAdmin, async (req, res) => {
  try {
    await db.collection("stats").doc("liveCrowd").set({ count: 0, updatedAt: Date.now() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset session" });
  }
});

module.exports = router;
