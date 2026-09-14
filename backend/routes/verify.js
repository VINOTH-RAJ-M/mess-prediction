const express = require("express");
const { db } = require("../config/firebase");
const { verifyToken, requireStaff } = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/verify
// Body: { tokenId }
// Called by mess staff after scanning a student's QR code.
// Validates the token exists and hasn't already been used, then
// marks it used, logs a transaction, decrements the live food count,
// and updates the crowd counter.
//
// If the SAME token is scanned again (expired/reused), that student's
// account is immediately blocked from logging in — this is the
// fraud lock described in the final round.
router.post("/", verifyToken, requireStaff, async (req, res) => {
  const { tokenId } = req.body;
  if (!tokenId) {
    return res.status(400).json({ error: "tokenId is required" });
  }

  const tokenRef = db.collection("mealTokens").doc(tokenId);

  try {
    const result = await db.runTransaction(async (t) => {
      const tokenSnap = await t.get(tokenRef);

      if (!tokenSnap.exists) {
        throw { code: 404, message: "Token not found" };
      }
      const tokenData = tokenSnap.data();

      if (tokenData.status === "used") {
        // Reuse of an already-expired token = fraud attempt.
        // Block the owning student's account immediately.
        const userRef = db.collection("users").doc(tokenData.studentUid);
        t.set(
          userRef,
          {
            blocked: true,
            blockedAt: Date.now(),
            blockedReason: "Attempted reuse of an already-used meal token",
          },
          { merge: true }
        );
        throw {
          code: 409,
          message: `Token already used at ${new Date(
            tokenData.usedAt
          ).toLocaleString()} — reuse detected, student account has been blocked`,
        };
      }

      t.update(tokenRef, { status: "used", usedAt: Date.now() });

      const txnRef = db.collection("transactions").doc();
      t.set(txnRef, {
        tokenId,
        studentUid: tokenData.studentUid,
        studentEmail: tokenData.studentEmail,
        amount: tokenData.amount,
        verifiedBy: req.user.uid,
        timestamp: Date.now(),
      });

      return tokenData;
    });

    // Atomic counter updates (safe outside the main transaction since
    // FieldValue.increment is itself atomic).
    const { admin } = require("../config/firebase");
    await db
      .collection("stats")
      .doc("liveCrowd")
      .set(
        { count: admin.firestore.FieldValue.increment(1), updatedAt: Date.now() },
        { merge: true }
      );
    await db
      .collection("stats")
      .doc("foodCount")
      .set(
        { served: admin.firestore.FieldValue.increment(1), updatedAt: Date.now() },
        { merge: true }
      );

    res.json({ success: true, message: "Token verified successfully", student: result.studentEmail });
  } catch (err) {
    const code = err.code && Number.isInteger(err.code) ? err.code : 500;
    console.error("Verify error:", err.message || err);
    res.status(code).json({ error: err.message || "Verification failed" });
  }
});

module.exports = router;
