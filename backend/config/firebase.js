// Initializes Firebase Admin SDK for server-side use.
// Requires a service account key JSON downloaded from Firebase Console
// (Project Settings > Service Accounts > Generate new private key).
// Place it at backend/config/serviceAccountKey.json (this exact filename
// is gitignored) OR set FIREBASE_SERVICE_ACCOUNT_PATH in your .env file.

const admin = require("firebase-admin");
const path = require("path");
require("dotenv").config();

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, "serviceAccountKey.json");

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (err) {
  console.error(
    "\n[Firebase] Could not load service account key at:",
    serviceAccountPath,
    "\nDownload it from Firebase Console > Project Settings > Service Accounts",
    "and place it there, or update FIREBASE_SERVICE_ACCOUNT_PATH in .env\n"
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
