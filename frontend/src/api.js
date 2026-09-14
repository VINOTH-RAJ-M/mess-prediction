import axios from "axios";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Attaches the current user's Firebase ID token to every request.
// If the backend reports the account as blocked (fraud lock), the
// user is signed out immediately and sent back to the login screen.
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.data?.blocked) {
      alert(err.response.data.error || "Your account has been blocked.");
      await signOut(auth);
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export default api;
