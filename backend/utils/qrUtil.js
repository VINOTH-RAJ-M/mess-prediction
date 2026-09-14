const QRCode = require("qrcode");

// Encodes the token ID into a QR code as a base64 data URL.
// The QR payload is just the token's unique ID; the scanner looks
// this ID up in Firestore rather than trusting anything embedded
// in the QR image itself (prevents forged/tampered QR content).
async function generateQRDataURL(tokenId) {
  const payload = JSON.stringify({ tokenId });
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
  });
}

module.exports = { generateQRDataURL };
