import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import api from "../api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [foodStatus, setFoodStatus] = useState(null);
  const [crowd, setCrowd] = useState(null);
  const [surplusHistory, setSurplusHistory] = useState(null);
  const [error, setError] = useState("");

  const [newLimit, setNewLimit] = useState("");
  const [saleBuyer, setSaleBuyer] = useState("watchman");
  const [saleQty, setSaleQty] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [saleMsg, setSaleMsg] = useState("");

  const navigate = useNavigate();

  async function loadAll() {
    try {
      const [s, f, c, sh] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/food/status"),
        api.get("/crowd/prediction"),
        api.get("/surplus/history"),
      ]);
      setStats(s.data);
      setFoodStatus(f.data);
      setCrowd(c.data);
      setSurplusHistory(sh.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load dashboard (admin access required)");
    }
  }

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 6000);
    return () => clearInterval(interval);
  }, []);

  async function resetSession() {
    await api.post("/dashboard/reset-session");
    loadAll();
  }

  async function setFoodLimit(e) {
    e.preventDefault();
    if (!newLimit) return;
    await api.post("/food/set-limit", { limit: Number(newLimit) });
    setNewLimit("");
    loadAll();
  }

  async function recordSurplusSale(e) {
    e.preventDefault();
    setSaleMsg("");
    try {
      await api.post("/surplus/sell", {
        buyerType: saleBuyer,
        quantity: Number(saleQty),
        pricePerUnit: Number(salePrice) || 0,
      });
      setSaleMsg("Surplus sale recorded.");
      setSaleQty("");
      setSalePrice("");
      loadAll();
    } catch (err) {
      setSaleMsg(err.response?.data?.error || "Failed to record sale");
    }
  }

  const chartData = stats
    ? [
        { name: "Meals served", value: stats.todayMealsServed },
        { name: "Live crowd", value: stats.liveCrowd },
      ]
    : [];

  return (
    <div className="container wide">
      <div className="top-bar">
        <h1>Admin Dashboard</h1>
        <span className="nav-link" onClick={() => navigate("/student")}>
          Back
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="value">{stats.liveCrowd}</div>
              <div className="label">Live crowd count</div>
            </div>
            <div className="stat-box">
              <div className="value">₹{stats.todayRevenue}</div>
              <div className="label">Today's revenue</div>
            </div>
            <div className="stat-box">
              <div className="value">{stats.todayMealsServed}</div>
              <div className="label">Meals served today</div>
            </div>
          </div>

          <div className="card">
            <h2>Overview</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis dataKey="name" stroke="#9a9ba5" />
                <YAxis stroke="#9a9ba5" />
                <Tooltip />
                <Bar dataKey="value" fill="#4f6df5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="card">
        <h2>Food count for tonight</h2>
        {foodStatus && foodStatus.limit > 0 ? (
          <p style={{ marginBottom: 12 }}>
            <strong>{foodStatus.served}</strong> served / <strong>{foodStatus.limit}</strong> prepared —{" "}
            <span style={{ color: foodStatus.remaining <= 5 ? "#f66" : "#4ade80" }}>
              {foodStatus.remaining} remaining
            </span>
          </p>
        ) : (
          <p style={{ color: "#9a9ba5", marginBottom: 12 }}>No session set up yet tonight.</p>
        )}
        <form onSubmit={setFoodLimit} style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            placeholder="Meals prepared tonight"
            value={newLimit}
            onChange={(e) => setNewLimit(e.target.value)}
            style={{ marginBottom: 0 }}
          />
          <button type="submit" style={{ width: "auto", padding: "12px 20px" }}>
            Start Session
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Crowd strength prediction</h2>
        {crowd && crowd.basedOnSessions > 0 ? (
          <p>
            Expected tonight: <strong>{crowd.prediction}</strong> (~{crowd.estimatedHeadcount} students),
            based on the last {crowd.basedOnSessions} sessions on this weekday.
          </p>
        ) : (
          <p style={{ color: "#9a9ba5" }}>Not enough history yet — predictions improve after a few sessions.</p>
        )}
      </div>

      <div className="card">
        <h2>Closing-time surplus & sale</h2>
        <p style={{ color: "#9a9ba5", marginBottom: 12 }}>
          {foodStatus ? `${foodStatus.remaining} meals unclaimed right now.` : "—"} Sell surplus instead of wasting it.
        </p>
        <form onSubmit={recordSurplusSale}>
          <select value={saleBuyer} onChange={(e) => setSaleBuyer(e.target.value)}>
            <option value="watchman">Night watchman / staff (on-campus)</option>
            <option value="canteen">College canteen (next day)</option>
          </select>
          <input
            type="number"
            placeholder="Quantity"
            value={saleQty}
            onChange={(e) => setSaleQty(e.target.value)}
          />
          <input
            type="number"
            placeholder="Price per meal (₹)"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
          />
          {saleMsg && <p className="success">{saleMsg}</p>}
          <button type="submit">Record Surplus Sale</button>
        </form>

        {surplusHistory && (
          <p style={{ marginTop: 12, color: "#9a9ba5" }}>
            Total recovered so far: <strong style={{ color: "#4ade80" }}>₹{surplusHistory.totalRecovered}</strong> from{" "}
            {surplusHistory.totalUnitsSaved} meals saved from waste.
          </p>
        )}
      </div>

      <button className="secondary" onClick={resetSession}>
        Reset live crowd counter
      </button>
    </div>
  );
}
