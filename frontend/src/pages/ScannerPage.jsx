import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function ScannerPage() {
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success | error
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line
  }, []);

  async function startScanning() {
    setMessage("");
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
          await scanner.pause();
          await handleDecoded(decodedText);
          setTimeout(() => scanner.resume(), 2000);
        },
        () => {} // ignore per-frame scan failures
      );
      setScanning(true);
    } catch (err) {
      setMessage("Camera access failed: " + err);
      setMessageType("error");
    }
  }

  async function stopScanning() {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      setScanning(false);
    }
  }

  async function handleDecoded(decodedText) {
    try {
      const { tokenId } = JSON.parse(decodedText);
      const { data } = await api.post("/verify", { tokenId });
      setMessage(`✓ Verified — ${data.student}`);
      setMessageType("success");
    } catch (err) {
      setMessage(err.response?.data?.error || "Invalid QR / verification failed");
      setMessageType("error");
    }
  }

  return (
    <div className="container">
      <div className="top-bar">
        <h1>Staff Scanner</h1>
        <div style={{ display: "flex", gap: "16px" }}>
          <span className="nav-link" onClick={() => navigate("/student")}>
            Student View
          </span>
          <span className="nav-link" onClick={() => navigate("/admin")}>
            Admin Panel
          </span>
        </div>
      </div>

      <div className="card">
        <div id="qr-reader" style={{ width: "100%", borderRadius: 8, overflow: "hidden" }} />
        {!scanning ? (
          <button onClick={startScanning} style={{ marginTop: 12 }}>
            Start Scanning
          </button>
        ) : (
          <button onClick={stopScanning} className="secondary" style={{ marginTop: 12 }}>
            Stop
          </button>
        )}
        {message && (
          <p className={messageType === "success" ? "success" : "error"} style={{ marginTop: 12 }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
