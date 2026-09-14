import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import api from "../api";

export default function StudentDashboard() {
  const [activeToken, setActiveToken] = useState(null);
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(null);
  const [foodStatus, setFoodStatus] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function loadHistory() {
    try {
      const { data } = await api.get("/tokens/mine");
      setHistory(data.tokens);
      const unused = data.tokens.find((t) => t.status === "unused");
      if (unused) setActiveToken(unused);
    } catch (err) {
      setError("Could not load token history");
    }
  }

  async function loadProfile() {
    try {
      const { data } = await api.get("/users/me");
      setProfile(data);
    } catch (err) {
      // profile may not exist yet — ignore
    }
  }

  async function loadFoodStatus() {
    try {
      const { data } = await api.get("/food/status");
      setFoodStatus(data);
    } catch (err) {
      // food session may not be set up yet — ignore
    }
  }

  useEffect(() => {
    loadHistory();
    loadProfile();
    loadFoodStatus();
    const interval = setInterval(loadFoodStatus, 10000); // live refresh
    return () => clearInterval(interval);
  }, []);

  async function buyToken() {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/tokens/purchase");
      setActiveToken(data);
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to purchase token");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="top-bar">
        <h1>Night Mess</h1>
        <span className="nav-link" onClick={() => signOut(auth)}>
          Log out
        </span>
      </div>

      {profile && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: -12, marginBottom: 16 }}>
          <p style={{ color: "#9a9ba5", margin: 0 }}>
            {profile.role === "student" ? (
              <>Hostel ID: <strong style={{ color: "#f1f1f4" }}>{profile.hostelId || "—"}</strong></>
            ) : (
              <>Role: <strong style={{ color: "#4f6df5", textTransform: "capitalize" }}>{profile.role}</strong></>
            )}
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            {(profile.role === "staff" || profile.role === "admin") && (
              <span className="nav-link" onClick={() => navigate("/scan")}>
                📷 Open Scanner
              </span>
            )}
            {profile.role === "admin" && (
              <span className="nav-link" onClick={() => navigate("/admin")}>
                📊 Admin Panel
              </span>
            )}
          </div>
        </div>
      )}

      {foodStatus && foodStatus.limit > 0 && (
        <div className="card" style={{ borderColor: foodStatus.lowStock ? "#f5a623" : undefined }}>
          <h2>Tonight's food availability</h2>
          <p style={{ fontSize: "1.4rem", fontWeight: 700, color: foodStatus.lowStock ? "#f5a623" : "#4f6df5" }}>
            {foodStatus.remaining} meals remaining
          </p>
          {foodStatus.lowStock && (
            <p className="error" style={{ marginTop: 4 }}>
              Running low — grab your token soon before it runs out!
            </p>
          )}
        </div>
      )}

      {activeToken && activeToken.status === "unused" ? (
        <div className="card">
          <h2>Your active meal token</h2>
          <div className="qr-box">
            <img src={activeToken.qrDataUrl} alt="Meal token QR" />
          </div>
          <p style={{ textAlign: "center", color: "#9a9ba5" }}>
            Show this at the mess counter to be scanned
          </p>
        </div>
      ) : (
        <div className="card">
          <h2>Buy tonight's meal token</h2>
          {error && <p className="error">{error}</p>}
          <button onClick={buyToken} disabled={loading}>
            {loading ? "Generating..." : "Get Digital Token (₹40)"}
          </button>
        </div>
      )}

      <div className="card">
        <h2>Token history</h2>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {history.map((t) => (
              <tr key={t.tokenId}>
                <td>{t.status}</td>
                <td>₹{t.amount}</td>
                <td>{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "#9a9ba5" }}>
                  No tokens yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ textAlign: "center" }}>
        <span className="nav-link" onClick={() => navigate("/scan")}>
          Staff scanner
        </span>
        {"  ·  "}
        <span className="nav-link" onClick={() => navigate("/admin")}>
          Admin dashboard
        </span>
      </p>
    </div>
  );
}
