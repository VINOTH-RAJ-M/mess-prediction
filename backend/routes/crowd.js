const express = require("express");
const { db } = require("../config/firebase");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/crowd/prediction
// Looks at past sessions on the same weekday (archived automatically
// each time the admin starts a new session) and predicts tonight's
// expected crowd strength — Low / Medium / High — plus an estimated
// headcount, so students can plan their visit and staff can plan
// serving pace.
router.get("/prediction", verifyToken, async (req, res) => {
  try {
    const weekday = new Date().getDay();

    const snap = await db
      .collection("foodHistory")
      .where("weekday", "==", weekday)
      .get();

    if (snap.empty) {
      return res.json({
        prediction: "Not enough data yet",
        estimatedHeadcount: null,
        basedOnSessions: 0,
      });
    }

    let records = snap.docs.map((d) => d.data());
    records.sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
    records = records.slice(0, 6);
    const avgServed =
      records.reduce((sum, r) => sum + (r.served || 0), 0) / records.length;
    const avgLimit =
      records.reduce((sum, r) => sum + (r.limit || 0), 0) / records.length;

    const utilization = avgLimit > 0 ? avgServed / avgLimit : 0;
    let prediction = "Medium";
    if (utilization >= 0.8) prediction = "High";
    else if (utilization <= 0.4) prediction = "Low";

    res.json({
      prediction,
      estimatedHeadcount: Math.round(avgServed),
      basedOnSessions: records.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute crowd prediction" });
  }
});

module.exports = router;
