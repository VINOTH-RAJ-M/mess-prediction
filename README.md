# Smart Night Mess Management System

Built for **SIAM VIT Hackulus 2026** (24-hour hackathon) — VIT-Centric track.

Software-only solution: digital meal tokens, QR verification (via phone
camera, no extra hardware), real-time crowd tracking, and an admin
analytics dashboard.

## Architecture

```
Student App (React) --> Backend API (Node/Express) --> Firestore (DB)
                                   |
                          QR generation (token purchase)
                                   |
Staff Scanner (React, phone camera) --> Backend /verify --> Firestore
                                   |
                     Admin Dashboard (React, live charts)
```

## Tech Stack
- **Frontend:** React (Vite), react-router-dom, recharts (charts), html5-qrcode (camera scanning)
- **Backend:** Node.js + Express, firebase-admin SDK
- **Database & Auth:** Firebase Firestore + Firebase Authentication
- **QR:** `qrcode` npm package (generation), `html5-qrcode` (scanning via browser camera — no dedicated scanner hardware needed)

## Project Structure
```
mess-system/
  backend/
    config/firebase.js        # Firebase Admin init
    middleware/authMiddleware.js
    routes/tokens.js          # purchase / list meal tokens
    routes/verify.js          # staff scans & validates QR, logs transaction
    routes/dashboard.js       # admin live stats
    routes/users.js           # profile/role registration
    utils/qrUtil.js
    server.js
    .env.example
    firestore.rules
  frontend/
    src/
      pages/Login.jsx
      pages/StudentDashboard.jsx
      pages/ScannerPage.jsx
      pages/AdminDashboard.jsx
      firebase.js
      api.js
      App.jsx
```

## Setup

### 1. Firebase project
1. Create a project at https://console.firebase.google.com
2. Enable **Authentication > Email/Password**
3. Enable **Firestore Database** (start in test mode for the hackathon, then apply `backend/firestore.rules` before any public demo)
4. Get your **web app config** (Project settings > General > Your apps) and paste it into `frontend/src/firebase.js`
5. Generate a **service account key** (Project settings > Service accounts > Generate new private key), save as `backend/config/serviceAccountKey.json`

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
Runs on `http://localhost:5000`

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:3000`

## Roles & Demo Flow
- Sign up as a **student** to buy a token and get a QR code.
- Sign up as **staff** (use invite code `hackulus2026`, set your own in `.env` as `STAFF_INVITE_CODE`) to access `/scan` and verify tokens via camera.
- Sign up as **admin** (same invite code) to view `/admin` — live crowd count, today's revenue, meals served, and recent transactions (auto-refreshes every 5s).

## Fraud/Duplicate Prevention
Token verification runs inside a Firestore transaction (`routes/verify.js`)
so a QR can only ever be marked "used" once — simultaneous scans of the
same token are rejected atomically.

## Final-Round Features (this build)

- **Unique hostel ID**: every student gets a permanent, sequential ID (`HST0001`, `HST0002`, ...) assigned at signup — every token they ever generate is tied to it.
- **One token per day, auto-expiry**: a student can only get one token per calendar day. Once scanned, it's marked `used` and can never be reused.
- **Fraud lock**: if an already-used token is scanned again, the owning student's account is immediately blocked (`users/{uid}.blocked = true`) — they can no longer log in until an admin clears it manually in Firestore.
- **Live food count**: admin starts each night by setting how many meals were prepared (`POST /api/food/set-limit`). The count decrements with every verified scan, and students see the live remaining count (or a low-stock warning) in their app.
- **Crowd strength prediction**: each time a new session starts, the previous session's final numbers are archived to `foodHistory`. The predictor (`GET /api/crowd/prediction`) averages the last few sessions on the same weekday to estimate tonight's expected crowd (Low / Medium / High).
- **Closing-time surplus & sale**: admin checks remaining unclaimed meals (`GET /api/surplus/check`) and logs a discounted sale to on-campus night watchmen/staff, or passes leftovers to the college canteen the next day for regular workers (`POST /api/surplus/sell`). All recovered value is tracked in `GET /api/surplus/history`.

## API Reference (new in this round)

| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| POST | `/api/food/set-limit` | admin | Start tonight's session with a meal quantity |
| GET | `/api/food/status` | any signed-in user | Live remaining meal count |
| GET | `/api/crowd/prediction` | any signed-in user | Predicted crowd strength for tonight |
| GET | `/api/surplus/check` | admin | Current unclaimed meal count |
| POST | `/api/surplus/sell` | admin | Log a surplus sale (watchman/canteen) |
| GET | `/api/surplus/history` | admin | All surplus sales + total value recovered |


- No physical hardware: QR scanning uses the staff member's own phone/laptop camera via the browser.
- Real-time dashboard uses polling (5s) for simplicity; can be upgraded to Firestore's live `onSnapshot` listeners for true push updates if time allows.
- `MEAL_TOKEN_PRICE` and `CROWD_ALERT_THRESHOLD` are configurable in `.env`.
