// Verifies the Firebase ID token sent from the frontend in the
// Authorization: Bearer <token> header, and attaches the decoded
// user info (uid, email) to req.user for downstream routes.

const { auth, db } = require("../config/firebase");

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.split("Bearer ")[1]
    : null;

  if (!idToken) {
    return res.status(401).json({ error: "Missing auth token" });
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.user = { uid: decoded.uid, email: decoded.email };

    // Fraud lock: a student blocked for reusing an expired token
    // is denied access everywhere, immediately — no grace period.
    const userDoc = await db.collection("users").doc(decoded.uid).get();
    if (userDoc.exists && userDoc.data().blocked) {
      return res.status(403).json({
        error: "Account blocked: " + (userDoc.data().blockedReason || "policy violation"),
        blocked: true,
      });
    }

    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Restricts a route to users whose Firestore user doc has role: "admin"
async function requireAdmin(req, res, next) {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Failed to verify admin role" });
  }
}

// Restricts a route to mess staff or admin (staff scan/verify tokens)
async function requireStaff(req, res, next) {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    const role = userDoc.exists ? userDoc.data().role : null;
    if (role !== "staff" && role !== "admin") {
      return res.status(403).json({ error: "Staff access required" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Failed to verify staff role" });
  }
}

module.exports = { verifyToken, requireAdmin, requireStaff };
