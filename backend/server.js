require("dotenv").config();
const express = require("express");
const cors = require("cors");

const tokenRoutes = require("./routes/tokens");
const verifyRoutes = require("./routes/verify");
const dashboardRoutes = require("./routes/dashboard");
const userRoutes = require("./routes/users");
const foodCountRoutes = require("./routes/foodCount");
const crowdRoutes = require("./routes/crowd");
const surplusRoutes = require("./routes/surplus");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Smart Night Mess Management API" });
});

app.use("/api/tokens", tokenRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/food", foodCountRoutes);
app.use("/api/crowd", crowdRoutes);
app.use("/api/surplus", surplusRoutes);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Mess Management API running on http://localhost:${PORT}`);
});
