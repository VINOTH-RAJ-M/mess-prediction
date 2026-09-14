const express = require("express");
const { db } = require("../config/firebase");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/surplus/check
// Called near the mess's closing time. Shows exactly how much
// cooked food is left unclaimed, so it can be sold off instead of
// thrown away.
router.get("/check", verifyToken, requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection("stats").doc("foodCount").get();
    const data = snap.exists ? snap.data() : { limit: 0, served: 0 };
    const remaining = Math.max((data.limit || 0) - (data.served || 0), 0);
    res.json({ limit: data.limit || 0, served: data.served || 0, surplus: remaining });
  } catch (err) {
    res.status(500).json({ error: "Failed to check surplus" });
  }
});

// POST /api/surplus/sell
// Body: { buyerType: "watchman" | "canteen", quantity, pricePerUnit }
// Logs a surplus sale — night surplus goes to watchmen/staff on
// campus at a reduced price, and anything still left can be passed
// to the college canteen the next day for regular workers to buy.
router.post("/sell", verifyToken, requireAdmin, async (req, res) => {
  const { buyerType, quantity, pricePerUnit } = req.body;
  if (!buyerType || !quantity || quantity <= 0) {
    return res.status(400).json({ error: "buyerType and a positive quantity are required" });
  }
  if (!["watchman", "canteen"].includes(buyerType)) {
    return res.status(400).json({ error: "buyerType must be 'watchman' or 'canteen'" });
  }

  try {
    const record = {
      buyerType,
      quantity: Number(quantity),
      pricePerUnit: Number(pricePerUnit) || 0,
      totalAmount: Number(quantity) * (Number(pricePerUnit) || 0),
      soldBy: req.user.uid,
      timestamp: Date.now(),
    };
    await db.collection("surplusSales").add(record);
    res.status(201).json({ success: true, record });
  } catch (err) {
    res.status(500).json({ error: "Failed to log surplus sale" });
  }
});

// GET /api/surplus/history
// Admin view of all surplus sales — how much waste was actually
// converted into recovered value, night and day combined.
router.get("/history", verifyToken, requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection("surplusSales").orderBy("timestamp", "desc").limit(50).get();
    const sales = snap.docs.map((d) => d.data());
    const totalRecovered = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalUnitsSaved = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
    res.json({ sales, totalRecovered, totalUnitsSaved });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch surplus history" });
  }
});

module.exports = router;
