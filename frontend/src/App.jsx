import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

import Login from "./pages/Login.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import ScannerPage from "./pages/ScannerPage.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u || null));
  }, []);

  if (user === undefined) {
    return <div className="container">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/student" /> : <Login />} />
        <Route
          path="/student"
          element={user ? <StudentDashboard /> : <Navigate to="/" />}
        />
        <Route
          path="/scan"
          element={user ? <ScannerPage /> : <Navigate to="/" />}
        />
        <Route
          path="/admin"
          element={user ? <AdminDashboard /> : <Navigate to="/" />}
        />
      </Routes>
    </BrowserRouter>
  );
}
