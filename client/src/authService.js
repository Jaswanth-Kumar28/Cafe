import {
  auth,
  googleProvider,
  isFirebaseConfigured
} from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";

// Unified Auth Service Wrapper
class AuthService {
  constructor() {
    this.isRealFirebase = isFirebaseConfigured;
    this.mockListeners = new Set();
    this.currentMockUser = null;

    if (!this.isRealFirebase) {
      console.log("⚡ Firebase configuration not detected. Mock Authentication Fallback activated.");
      // Retrieve any persisted session
      const savedSession = localStorage.getItem("mock_auth_session");
      if (savedSession) {
        this.currentMockUser = JSON.parse(savedSession);
      }
    }
  }

  // 1. SIGN UP
  async signUp(email, password, displayName) {
    if (this.isRealFirebase) {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Update profile display name in Firebase
      await updateProfile(userCredential.user, { displayName });
      return userCredential.user;
    } else {
      // Mock SignUp Flow
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const mockUsers = JSON.parse(localStorage.getItem("mock_users") || "[]");
          
          if (mockUsers.some(u => u.email === email)) {
            reject(new Error("Email already registered."));
            return;
          }

          const newUser = {
            uid: "mock-uid-" + Math.random().toString(36).substr(2, 9),
            email,
            displayName: displayName || email.split("@")[0],
            photoURL: null
          };

          mockUsers.push({ email, password, ...newUser });
          localStorage.setItem("mock_users", JSON.stringify(mockUsers));

          // Set active session
          this.currentMockUser = newUser;
          localStorage.setItem("mock_auth_session", JSON.stringify(newUser));
          
          this.triggerMockListeners();
          resolve(newUser);
        }, 800);
      });
    }
  }

  // 2. SIGN IN
  async signIn(email, password) {
    if (this.isRealFirebase) {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } else {
      // Mock SignIn Flow
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const mockUsers = JSON.parse(localStorage.getItem("mock_users") || "[]");
          const matchedUser = mockUsers.find(u => u.email === email && u.password === password);

          if (!matchedUser) {
            reject(new Error("Invalid email or password."));
            return;
          }

          const activeSession = {
            uid: matchedUser.uid,
            email: matchedUser.email,
            displayName: matchedUser.displayName,
            photoURL: matchedUser.photoURL
          };

          this.currentMockUser = activeSession;
          localStorage.setItem("mock_auth_session", JSON.stringify(activeSession));

          this.triggerMockListeners();
          resolve(activeSession);
        }, 800);
      });
    }
  }

  // 3. GOOGLE SIGN IN
  async signInWithGoogle() {
    if (this.isRealFirebase) {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } else {
      // Mock Google Popin/Instant login
      return new Promise((resolve) => {
        setTimeout(() => {
          const googleMockUser = {
            uid: "mock-google-uid-882",
            email: "hyderabad.coffee.lover@gmail.com",
            displayName: "Hyderabad Coffee Lover",
            photoURL: "https://lh3.googleusercontent.com/a/default-user"
          };

          this.currentMockUser = googleMockUser;
          localStorage.setItem("mock_auth_session", JSON.stringify(googleMockUser));

          this.triggerMockListeners();
          resolve(googleMockUser);
        }, 800);
      });
    }
  }

  // 4. LOG OUT
  async logOut() {
    if (this.isRealFirebase) {
      await signOut(auth);
    } else {
      this.currentMockUser = null;
      localStorage.removeItem("mock_auth_session");
      this.triggerMockListeners();
    }
  }

  // 5. OBSERVE AUTH STATE CHANGES
  onAuthStateChanged(callback) {
    if (this.isRealFirebase) {
      return onAuthStateChanged(auth, callback);
    } else {
      this.mockListeners.add(callback);
      // Trigger initially with current user state
      callback(this.currentMockUser);

      // Return cleanup function
      return () => {
        this.mockListeners.delete(callback);
      };
    }
  }

  // Private Helper to fire mock state triggers
  triggerMockListeners() {
    this.mockListeners.forEach(callback => callback(this.currentMockUser));
  }
}

export const authService = new AuthService();
