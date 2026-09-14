// Client-side Firebase config. Get these values from:
// Firebase Console > Project Settings > General > Your apps > SDK setup and config
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCRjMC4-YTiRF5QAOIPWDL9xmakiAml1bI",
  authDomain: "mess-prediction.firebaseapp.com",
  projectId: "mess-prediction",
  storageBucket: "mess-prediction.firebasestorage.app",
  messagingSenderId: "634086973219",
  appId: "1:634086973219:web:f8672cf6301731410e3696",
  measurementId: "G-WPP2P5LVEC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
