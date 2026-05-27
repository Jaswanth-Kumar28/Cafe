import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBh6Q_Nea3HxZE3jzD_MxC-U3tjls__ops",
  authDomain: "cafe-project-412d9.firebaseapp.com",
  projectId: "cafe-project-412d9",
  storageBucket: "cafe-project-412d9.firebasestorage.app",
  messagingSenderId: "612946535262",
  appId: "1:612946535262:web:8d3dc3004706a51d2ca5cf",
  measurementId: "G-52875B99R3",
};

const app = initializeApp(firebaseConfig);

isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const isFirebaseConfigured = true;
export default app;
