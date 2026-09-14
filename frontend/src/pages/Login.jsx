import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase";
import api from "../api";

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
        // Create the Firestore profile doc (role) right after signup
        await api.post("/users/register-profile", { name, role, inviteCode });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // App.jsx's auth listener will redirect once signed in
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>Smart Night Mess</h1>
      <p className="subtitle">SIAM VIT Hackulus 2026</p>

      <div className="card">
        <h2>{isSignup ? "Create account" : "Log in"}</h2>
        <form onSubmit={handleSubmit}>
          {isSignup && (
            <input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {isSignup && (
            <>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="student">Student</option>
                <option value="staff">Mess Staff</option>
                <option value="admin">Admin</option>
              </select>
              {role !== "student" && (
                <input
                  placeholder="Staff/Admin invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              )}
            </>
          )}
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: "center" }}>
          <span className="nav-link" onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? "Already have an account? Log in" : "New here? Create an account"}
          </span>
        </p>
      </div>
    </div>
  );
}
