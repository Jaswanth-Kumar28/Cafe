# ☕ The Golden Bean — Luxury Café Website

A stunning **full-stack 3D luxury café website** built with React (Vite) + Node.js/Express + Firebase, featuring premium 3D animations, UPI payment integration, table reservations, and real-time owner notifications.

## ✨ Features

- 🏆 **Ultra Premium 3D UI** — Mouse-tracking tilt on cards, floating chalkboard, shimmer gold animations, ambient orb particles
- 📅 **Table Reservation System** — Full booking form with smart kitchen prep time calculation
- 🍽️ **Pre-Order Menu** — Browse & add food items to cart before arrival
- 💳 **Multi-Mode Payments**:
  - ☕ Pay at Café
  - 🟣 PhonePe (direct app redirect)
  - 🔵 Paytm (direct app redirect)
  - 🟢 Google Pay (direct app redirect)
  - 🟢 Navi
  - 🍊 BHIM
  - 📲 Other UPI (QR Code)
  - 💳 Credit/Debit Card
- 🔐 **Firebase Authentication** — Sign In / Sign Up with Google/Email
- 📦 **Firestore Database** — Bookings & orders synced to cloud
- 📱 **WhatsApp Owner Alerts** — Automatic notification to owner after payment
- 🎨 **Cinematic Design** — Scanline overlays, gold shimmer, glassmorphism

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, CSS3 |
| Backend | Node.js, Express |
| Database | Firebase Firestore + local JSON |
| Auth | Firebase Authentication |
| Animations | CSS Keyframes, JS Mouse Tracking |
| Icons | Lucide React |

## 📁 Project Structure

```
cafe-3d-fullstack/
├── client/              # React Vite frontend
│   ├── src/
│   │   ├── App.jsx      # Main application component
│   │   ├── style.css    # 3D premium stylesheet
│   │   ├── firebase.js  # Firebase config
│   │   └── authService.js
│   └── index.html
├── server/              # Express backend
│   ├── index.js         # API routes
│   └── data/            # Local fallback storage
└── package.json
```

## 🔧 Setup & Run

### 1. Install Dependencies
```bash
# In cafe-3d-fullstack folder
npm run install-all
```

### 2. Start Development Servers
```bash
npm run dev
```
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

### 3. Firebase Setup
Create `client/src/firebase.js` with your Firebase config:
```js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  // ...
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

## 📸 Highlights

- 🎭 3D perspective tilt on all menu and ambience cards (mouse-tracking)
- 🌟 Animated floating gold orbs in background
- ☕ Floating 3D chalkboard with Today's Special
- ⚡ Smart UPI payment — select PhonePe/Paytm/GPay → auto-opens that exact app
- 🧾 Real-time bill summary with payment mode details

## 👨‍💻 Developer

**Jaswanth Kumar** — [GitHub](https://github.com/Jaswanth-Kumar28)

---
> *The Golden Bean — Where Every Sip Tells a Story* ☕
