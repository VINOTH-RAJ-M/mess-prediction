const express = require("express");
const { db } = require("../config/firebase");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Assigns the next sequential hostel ID (HST0001, HST0002, ...) using
// an atomic counter doc, so every student gets one unique, permanent
// ID that every token they generate is tied back to.
async function assignHostelId() {
  const counterRef = db.collection("counters").doc("hostelId");
  return db.runTransaction(async (t) => {
    const snap = await t.get(counterRef);
    const next = snap.exists ? (snap.data().value || 0) + 1 : 1;
    t.set(counterRef, { value: next }, { merge: true });
    return "HST" + String(next).padStart(4, "0");
  });
}

// POST /api/users/register-profile
// Called once right after a student/staff/admin signs up on the
// frontend via Firebase Auth. Creates their Firestore profile doc
// with a role. In a real deployment, staff/admin roles should be
// assigned manually by a super-admin, not self-selected — this
// endpoint defaults new signups to "student" and only allows
// staff/admin if a valid invite code is supplied.
router.post("/register-profile", verifyToken, async (req, res) => {
  const { name, role, inviteCode } = req.body;

  let finalRole = "student";
  if (
    (role === "staff" || role === "admin") &&
    inviteCode === (process.env.STAFF_INVITE_CODE || "hackulus2026")
  ) {
    finalRole = role;
  }

  try {
    const profile = {
      uid: req.user.uid,
      email: req.user.email,
      name: name || "",
      role: finalRole,
      createdAt: Date.now(),
      blocked: false,
    };

    // Every hosteler gets one unique, permanent ID — this is what
    // every meal token they ever generate is linked back to.
    if (finalRole === "student") {
      profile.hostelId = await assignHostelId();
    }

    await db.collection("users").doc(req.user.uid).set(profile, { merge: true });
    res.status(201).json({ success: true, role: finalRole, hostelId: profile.hostelId || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

// GET /api/users/me
router.get("/me", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection("users").doc(req.user.uid).get();
    if (!doc.exists) return res.status(404).json({ error: "Profile not found" });
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

module.exports = router;
