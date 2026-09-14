const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { db } = require("../config/firebase");
const { verifyToken } = require("../middleware/authMiddleware");
const { generateQRDataURL } = require("../utils/qrUtil");

const router = express.Router();
const TOKEN_PRICE = Number(process.env.MEAL_TOKEN_PRICE || 40);

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// POST /api/tokens/purchase
// Creates ONE digital meal token per student per day. If today's
// token already exists and is still unused, the same one is
// returned instead of creating a duplicate. If today's token was
// already used, purchase is denied — one meal per day.
router.post("/purchase", verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    const hostelId = userDoc.exists ? userDoc.data().hostelId : null;

    const dateKey = todayKey();
    const existingSnap = await db
      .collection("mealTokens")
      .where("studentUid", "==", req.user.uid)
      .where("dateKey", "==", dateKey)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0].data();
      if (existing.status === "used") {
        return res.status(409).json({ error: "Today's meal token has already been used" });
      }
      const qrDataUrl = await generateQRDataURL(existing.tokenId);
      return res.status(200).json({ ...existing, qrDataUrl });
    }

    const tokenId = uuidv4();
    const qrDataUrl = await generateQRDataURL(tokenId);

    const tokenDoc = {
      tokenId,
      studentUid: req.user.uid,
      studentEmail: req.user.email,
      hostelId: hostelId || null,
      amount: TOKEN_PRICE,
      status: "unused", // unused -> used
      dateKey,
      createdAt: Date.now(),
      usedAt: null,
    };

    await db.collection("mealTokens").doc(tokenId).set(tokenDoc);

    res.status(201).json({ ...tokenDoc, qrDataUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create meal token" });
  }
});

// GET /api/tokens/mine
// Returns the logged-in student's token history.
router.get("/mine", verifyToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection("mealTokens")
      .where("studentUid", "==", req.user.uid)
      .get();

    let tokens = snapshot.docs.map((d) => d.data());
    tokens.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    tokens = tokens.slice(0, 50);

    const tokensWithQr = await Promise.all(
      tokens.map(async (t) => {
        if (t.status === "unused") {
          const qrDataUrl = await generateQRDataURL(t.tokenId);
          return { ...t, qrDataUrl };
        }
        return t;
      })
    );

    res.json({ tokens: tokensWithQr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch token history" });
  }
});

module.exports = router;
