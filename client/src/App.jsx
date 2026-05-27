import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Coffee,
  Minus,
  Plus,
  ShoppingBag,
  Users,
  Utensils,
  CheckCircle2,
  Loader2,
  Sparkles,
  MapPin,
  ChevronDown,
  Phone,
  User,
  ArrowRight,
  LogIn,
  LogOut,
  X,
  Mail,
  Lock,
  Shield
} from "lucide-react";
import { authService } from "./authService";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "./firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Golden Cup Brand Logo SVG Component
function GoldenCupLogo() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="logo-svg">
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="2" x2="6" y2="4" />
      <line x1="10" y1="2" x2="10" y2="4" />
      <line x1="14" y1="2" x2="14" y2="4" />
    </svg>
  );
}

export default function App() {
  const [menu, setMenu] = useState([]);
  const [tables, setTables] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);

  const [booking, setBooking] = useState({
    name: "",
    phone: "",
    date: new Date().toISOString().split("T")[0],
    time: "19:00",
    people: "2",
    tableType: "Traditional Café Table",
    notes: "",
    paymentMode: "Pay at Café"
  });

  const [status, setStatus] = useState("");

  // ==========================================
  // AUTH & BOOKING STATE VARIABLES
  // ==========================================
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState("signin"); // signin or signup
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Form inputs for Auth
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");

  // Dropdown menu state
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Drawer for "My Bookings"
  const [isBookingsOpen, setIsBookingsOpen] = useState(false);
  const [userBookings, setUserBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Full Menu Modal State
  const [isFullMenuOpen, setIsFullMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // UPI Payment Modal States
  const [isUPIModalOpen, setIsUPIModalOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [upiTimer, setUpiTimer] = useState(300); // 5 minutes countdown
  const [transactionId, setTransactionId] = useState("");
  const [screenshotName, setScreenshotName] = useState("");

  // ==========================================
  // AUTH OBSERVATION & DYNAMIC SYNC
  // ==========================================
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((currUser) => {
      setUser(currUser);
      // Auto-fill booking name if logged in
      if (currUser) {
        setBooking((prev) => ({
          ...prev,
          name: currUser.displayName || prev.name
        }));
        setIsAuthModalOpen(false);
      } else {
        // Automatically pop up sign-in modal on landing if not logged in
        setIsAuthModalOpen(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // UPI Payment Countdown Timer Effect
  useEffect(() => {
    let interval = null;
    if (isUPIModalOpen && upiTimer > 0) {
      interval = setInterval(() => {
        setUpiTimer((prev) => prev - 1);
      }, 1000);
    } else if (upiTimer === 0) {
      setIsUPIModalOpen(false);
      setPendingPayload(null);
      setTransactionId("");
      setScreenshotName("");
      setStatus("UPI Payment session expired. Please try booking again.");
    }
    return () => clearInterval(interval);
  }, [isUPIModalOpen, upiTimer]);

  // 3D Mouse Tilt Effect on Cards
  useEffect(() => {
    const cards = document.querySelectorAll('.gourmet-card, .dining-card-redesign');
    const handleMouseMove = (e) => {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
    };
    const handleMouseLeave = (e) => {
      e.currentTarget.style.transform = '';
    };
    cards.forEach(card => {
      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);
    });
    return () => {
      cards.forEach(card => {
        card.removeEventListener('mousemove', handleMouseMove);
        card.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, [menu, tables]);

  const formattedUpiTimer = useMemo(() => {
    const minutes = Math.floor(upiTimer / 60);
    const seconds = upiTimer % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [upiTimer]);

  // Fetch reservations associated with user email
  const loadUserBookings = async () => {
    if (!user?.email) return;
    setBookingsLoading(true);
    try {
      // 1. Try Firestore first
      const q = query(
        collection(db, "bookings"),
        where("userEmail", "==", user.email)
      );
      const querySnapshot = await getDocs(q);
      const bookingsList = [];
      querySnapshot.forEach((doc) => {
        bookingsList.push({ id: doc.id, ...doc.data() });
      });

      // If Firestore successfully returned documents, use them (sorted by date/time desc)
      if (bookingsList.length > 0) {
        bookingsList.sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
        setUserBookings(bookingsList);
      } else {
        // Try Express backend fallback if no bookings in Firestore
        const res = await fetch(`${API_URL}/api/reservations?userEmail=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setUserBookings(data);
        }
      }
    } catch (firestoreError) {
      console.warn("Firestore read failed or not initialized, trying fallback local Express API...", firestoreError);
      try {
        const res = await fetch(`${API_URL}/api/reservations?userEmail=${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setUserBookings(data);
        }
      } catch (error) {
        console.error("Failed to load bookings from local API", error);
      }
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (isBookingsOpen && user) {
      loadUserBookings();
    }
  }, [isBookingsOpen, user]);

  // ==========================================
  // AUTHENTICATION BUTTON HANDLERS
  // ==========================================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      if (authTab === "signin") {
        await authService.signIn(authEmail, authPassword);
        setAuthSuccess("Successfully logged in!");
        setTimeout(() => {
          setIsAuthModalOpen(false);
          resetAuthForm();
        }, 1000);
      } else {
        if (!authName) throw new Error("Please enter your name");
        await authService.signUp(authEmail, authPassword, authName);
        setAuthSuccess("Account successfully created!");
        setTimeout(() => {
          setIsAuthModalOpen(false);
          resetAuthForm();
        }, 1000);
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);
    try {
      await authService.signInWithGoogle();
      setAuthSuccess("Successfully logged in with Google!");
      setTimeout(() => {
        setIsAuthModalOpen(false);
        resetAuthForm();
      }, 1000);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await authService.logOut();
    setUser(null);
    setIsProfileDropdownOpen(false);
    // Clear booking name
    setBooking((prev) => ({ ...prev, name: "" }));
  };

  const resetAuthForm = () => {
    setAuthEmail("");
    setAuthPassword("");
    setAuthName("");
    setAuthError("");
    setAuthSuccess("");
  };

  // ==========================================
  // INITIAL DATA LOADER
  // ==========================================
  useEffect(() => {
    async function loadData() {
      try {
        const [menuRes, tablesRes] = await Promise.all([
          fetch(`${API_URL}/api/menu`),
          fetch(`${API_URL}/api/tables`)
        ]);

        setMenu(await menuRes.json());
        setTables(await tablesRes.json());
      } catch (error) {
        setStatus("Could not connect to database. Starting local fallback server.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const item = menu.find((m) => m.id === Number(id));
        return item ? { ...item, qty } : null;
      })
      .filter(Boolean)
      .filter((item) => item.qty > 0);
  }, [cart, menu]);

  const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  const selectedTable = tables.find(
    (table) => table.type === booking.tableType
  );

  const bookingCharge = selectedTable?.price || 250;
  const approxTotal = total + bookingCharge;

  // Filter items that have an actual image (the Popular Picks row)
  const popularPicks = useMemo(() => {
    return menu.filter(item => item.image);
  }, [menu]);

  // Extract unique categories for full menu filtering
  const categories = useMemo(() => {
    return ["All", ...new Set(menu.map(item => item.category))];
  }, [menu]);

  // Filter full menu items based on category and search query
  const filteredMenuItems = useMemo(() => {
    return menu.filter(item => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menu, activeCategory, searchQuery]);

  // Calculate kitchen prep time (10 minutes before arrival time)
  const prepTime = useMemo(() => {
    if (!booking.time) return "";
    try {
      const [hours, minutes] = booking.time.split(":").map(Number);
      let totalMinutes = hours * 60 + minutes - 10;
      if (totalMinutes < 0) totalMinutes += 24 * 60;
      const prepHours = Math.floor(totalMinutes / 60);
      const prepMinutes = totalMinutes % 60;
      const pad = (num) => String(num).padStart(2, "0");
      
      const displayHours = prepHours % 12 || 12;
      const ampm = prepHours >= 12 ? "PM" : "AM";
      return `${pad(displayHours)}:${pad(prepMinutes)} ${ampm}`;
    } catch (e) {
      return "";
    }
  }, [booking.time]);

  function addItem(id) {
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  }

  function removeItem(id) {
    setCart((prev) => ({
      ...prev,
      [id]: Math.max((prev[id] || 0) - 1, 0)
    }));
  }

  function triggerOwnerWhatsAppNotification(payload) {
    const { name, phone, date, time, tableType, items, approxTotal, kitchenPrepTime, paymentMode, transactionId, paymentProofScreenshot } = payload;
    
    const foodDetails = items && items.length > 0
      ? items.map(it => `• ${it.name} (x${it.qty})`).join("\n")
      : "None";
      
    let paymentInfoText = `• Mode: *${paymentMode || "Pay at Café"}*\n• Status: *Pay on Arrival*`;
    
    if (paymentMode === "UPI Instant Payment") {
      paymentInfoText = `• Mode: *${paymentMode}*\n• Status: *Paid Online*\n• 🔍 *UPI UTR/Txn ID:* \`${transactionId || "N/A"}\`\n• 📸 *Receipt Proof:* ${paymentProofScreenshot ? `Uploaded (${paymentProofScreenshot})` : "None"}`;
    }
      
    const messageText = `*🌟 New Booking at The Golden Bean!*

*👤 Customer Details:*
• Name: ${name}
• Phone: ${phone}

*📅 Schedule:*
• Date: ${date}
• Arrival Time: ${time}
• 🍳 *Kitchen Prep:* *${kitchenPrepTime || time}* (10m before)

*🍽️ Ambience:*
• Table: ${tableType}

*🍔 Pre-ordered Food:*
${foodDetails}

*💳 Payment Details:*
${paymentInfoText}

*💰 Estimated Bill:* *₹${approxTotal}*`;

    const encodedText = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/919347003615?text=${encodedText}`;
    
    window.open(waUrl, "_blank");
  }

  async function finalizeBooking(finalPayload) {
    try {
      setStatus("Processing booking...");

      // 1. Instantly save using standard local backend Express API
      const res = await fetch(`${API_URL}/api/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(finalPayload)
      });

      if (!res.ok) {
        throw new Error("Failed to save booking via API");
      }

      const apiResult = await res.json();
      const referenceId = apiResult.reservation?.id;

      // 2. Confirm instantly to the user so they are never kept waiting
      setStatus(
        `Booking and Pre-Order saved! Kitchen preparation scheduled at ${finalPayload.kitchenPrepTime || finalPayload.time} (10 mins before arrival). ${referenceId ? `(Ref: ${referenceId.substring(0, 8)})` : ""}`
      );

      // Trigger automatic WhatsApp redirect to owner (9347003615)
      triggerOwnerWhatsAppNotification(finalPayload);

      // Clear cart and reset form
      setCart({});
      setBooking({
        name: user ? user.displayName || "" : "",
        phone: "",
        date: new Date().toISOString().split("T")[0],
        time: "19:00",
        people: "2",
        tableType: "Traditional Café Table",
        notes: "",
        paymentMode: "Pay at Café"
      });

      if (user) {
        // Trigger background bookings list reload
        setTimeout(() => {
          loadUserBookings();
        }, 500);
      }

      // 3. Perform background sync to Firestore (async, non-blocking)
      (async () => {
        try {
          console.log("Syncing booking to Firestore in background...");
          const bookingDocRef = await addDoc(collection(db, "bookings"), {
            ...finalPayload,
            id: referenceId, // Sync with local ID
            status: "confirmed",
            createdAt: serverTimestamp()
          });
          console.log("Successfully synced booking to Firestore: ", bookingDocRef.id);

          if (cartItems.length > 0) {
            const orderDocRef = await addDoc(collection(db, "orders"), {
              userId: user ? user.uid : null,
              customerName: finalPayload.name,
              phone: finalPayload.phone,
              items: finalPayload.items,
              total: finalPayload.foodTotal,
              status: "received",
              createdAt: serverTimestamp()
            });
            console.log("Successfully synced associated order to Firestore: ", orderDocRef.id);
          }
        } catch (firestoreErr) {
          console.warn("Background Firestore sync failed or not initialized: ", firestoreErr);
        }
      })();

    } catch (error) {
      console.error(error);
      setStatus("Error saving booking. Please check if the local backend server is running.");
    }
  }

  async function submitBooking(e) {
    e.preventDefault();

    if (!booking.name || !booking.phone || !booking.date || !booking.time) {
      setStatus("Please fill name, phone, date, and time.");
      return;
    }

    const payload = {
      ...booking,
      items: cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty
      })),
      foodTotal: total,
      bookingCharge,
      approxTotal,
      userId: user ? user.uid : null,
      userEmail: user ? user.email : null,
      kitchenPrepTime: prepTime || null,
      ownerAlert: prepTime ? `Prepare food 10 mins before arrival (start at ${prepTime})` : null
    };

    const upiApps = ["PhonePe", "Paytm", "Google Pay", "Navi", "BHIM", "UPI Instant Payment"];
    if (upiApps.includes(booking.paymentMode)) {
      setPendingPayload(payload);
      setIsUPIModalOpen(true);
      setUpiTimer(300);
      setStatus(`Awaiting ${booking.paymentMode} payment...`);
      return;
    }

    await finalizeBooking(payload);
  }

  // Quick booking button that scrolls down and focuses form
  function handleFindTable(e) {
    e.preventDefault();
    const element = document.getElementById("booking");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      // Focus name field if it exists
      setTimeout(() => {
        const nameField = document.getElementById("customer-name-field");
        if (nameField) nameField.focus();
      }, 800);
    }
  }

  // ==========================================
  // LUXURY LOGIN GATE (BEFORE ENTERING THE SITE)
  // ==========================================
  if (!user) {
    return (
      <div className="app login-gate-active">
        <div className="mesh-bg"></div>
        <div className="grain"></div>
        
        <div className="login-gate-container">
          {/* Brand Intro Side */}
          <div className="login-gate-brand-side">
            <div className="login-gate-logo-wrap">
              <GoldenCupLogo />
            </div>
            <h2>The Golden Bean</h2>
            <p className="subtitle">Café & Patisserie</p>
            <p className="description">
              Welcome to our dining reservation and menu pre-order portal. Please sign in or register your account to explore our premium tables, custom cuisines, and live dashboard.
            </p>
            <div className="login-gate-decor">☕ 🍽️ ✨</div>
          </div>
          
          {/* Interactive Form Side */}
          <div className="login-gate-form-side">
            <div className="auth-modal-card gate-card">
              <div className="auth-modal-header">
                <h3>{authTab === "signin" ? "Welcome Back" : "Begin Journey"}</h3>
                <p>{authTab === "signin" ? "Access your gourmet dashboard & bookings" : "Create an account to track bookings and pre-orders"}</p>
              </div>

              <div className="auth-tabs-nav">
                <button 
                  className={`auth-tab-nav-btn ${authTab === "signin" ? "active" : ""}`}
                  onClick={() => { setAuthTab("signin"); setAuthError(""); setAuthSuccess(""); }}
                >
                  Sign In
                </button>
                <button 
                  className={`auth-tab-nav-btn ${authTab === "signup" ? "active" : ""}`}
                  onClick={() => { setAuthTab("signup"); setAuthError(""); setAuthSuccess(""); }}
                >
                  Register
                </button>
              </div>

              <div className="auth-modal-body">
                <form className="auth-form" onSubmit={handleAuthSubmit}>
                  {authTab === "signup" && (
                    <div className="auth-input-group">
                      <label>Display Name</label>
                      <div className="auth-input-wrapper">
                        <User className="auth-input-icon" size={16} />
                        <input 
                          type="text" 
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          placeholder="Your full name"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="auth-input-group">
                    <label>Email Address</label>
                    <div className="auth-input-wrapper">
                      <Mail className="auth-input-icon" size={16} />
                      <input 
                        type="email" 
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="name@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label>Password</label>
                    <div className="auth-input-wrapper">
                      <Lock className="auth-input-icon" size={16} />
                      <input 
                        type="password" 
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  {authError && (
                    <div className="auth-alert error">
                      <Shield size={16} />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authSuccess && (
                    <div className="auth-alert success">
                      <CheckCircle2 size={16} />
                      <span>{authSuccess}</span>
                    </div>
                  )}

                  <button className="auth-btn-gold" type="submit" disabled={authLoading}>
                    {authLoading ? (
                      <Loader2 className="spin" size={16} />
                    ) : authTab === "signin" ? (
                      "Sign In to Account"
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </form>

                <div className="auth-divider">Or continue with</div>

                <button className="auth-btn-google" onClick={handleGoogleSignIn} disabled={authLoading}>
                  <svg className="google-g-logo" width="18" height="18" viewBox="0 0 18 18">
                    <path
                      fill="#4285F4"
                      d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.8 2.7l2.76 2.13c1.62-1.49 2.58-3.69 2.58-6.26z"
                    />
                    <path
                      fill="#34A853"
                      d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.76-2.13c-.76.51-1.74.82-3.2.82-2.46 0-4.54-1.66-5.28-3.9L.94 12.75C2.43 15.89 5.62 18 9 18z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M3.72 10.59c-.19-.58-.3-1.2-.3-1.84s.11-1.26.3-1.84L.94 5.09C.34 6.27 0 7.6 0 9s.34 2.73.94 3.91l2.78-2.32z"
                    />
                    <path
                      fill="#EA4335"
                      d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.62 0 2.43 2.11.94 5.25L3.72 7.57C4.46 5.33 6.54 3.58 9 3.58z"
                    />
                  </svg>
                  Google Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="mesh-bg"></div>
      <div className="grain"></div>

      {/* Navigation Bar */}
      <header className="navbar">
        <a className="brand" href="#home">
          <GoldenCupLogo />
          <div>
            <h1>The Golden Bean</h1>
            <p>Café & Patisserie</p>
          </div>
        </a>

        <nav>
          <a href="#home">Home</a>
          <a href="#menu">Menu</a>
          <a href="#dining">Dining</a>
          <a href="#booking">Reservation</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>

        <div className="navbar-user-controls">
          {user ? (
            <div className="profile-nav-wrap">
              <button 
                className="profile-trigger" 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              >
                <div className="profile-avatar-ring">
                  <span className="profile-avatar-initials">
                    {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="profile-trigger-name">{user.displayName || user.email.split('@')[0]}</span>
              </button>

              {isProfileDropdownOpen && (
                <div className="profile-dropdown-menu">
                  <div className="profile-dropdown-header">
                    <span className="user-name">{user.displayName || "Gourmet Diner"}</span>
                    <span className="user-email">{user.email}</span>
                  </div>
                  <button 
                    className="profile-dropdown-item" 
                    onClick={() => {
                      setIsBookingsOpen(true);
                      setIsProfileDropdownOpen(false);
                    }}
                  >
                    <Calendar className="gold-accent-icon" size={14} /> My Bookings
                  </button>
                  <button 
                    className="profile-dropdown-item logout-action" 
                    onClick={handleSignOut}
                  >
                    <LogOut size={14} /> Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              className="nav-signin-btn" 
              onClick={() => {
                setIsAuthModalOpen(true);
                setAuthTab("signin");
                setAuthError("");
                setAuthSuccess("");
              }}
            >
              <LogIn size={14} /> Sign In
            </button>
          )}

          <a href="#booking" className="nav-btn-gold">
            Book a Table
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main id="home">
        <section className="hero-redesign">
          <div className="hero-overlay"></div>
          
          <div className="hero-content">
            <div className="hero-left">
              <div className="hero-eyebrow">
                <span className="eyebrow-dot"></span>
                Now Open · Hyderabad
              </div>
              <h2>
                Good Food,<br />
                <span className="serif-highlight shimmer-gold">Great Moments</span>
              </h2>
              
              <p className="hero-slogan">
                Experience the perfect blend of taste, ambience and hospitality at <strong>The Golden Bean</strong>.
              </p>

              <div className="hero-actions-redesign">
                <a href="#booking" className="gold-solid-btn">
                  Book a Table <ArrowRight size={16} />
                </a>
                <a href="#menu" className="gold-outline-btn">
                  Explore Menu
                </a>
              </div>

              {/* Price & Location Card */}
              <div className="premium-glass-card">
                <div className="glass-item">
                  <span className="label">Minimum Price</span>
                  <span className="value">₹149</span>
                </div>
                <div className="divider-line"></div>
                <div className="glass-item">
                  <span className="label">Location</span>
                  <span className="value">
                    <MapPin size={14} className="gold-accent-icon" /> Hyderabad, India
                  </span>
                </div>
              </div>
            </div>

            <div className="hero-right">
              {/* 3D Today's Special Chalkboard */}
              <div className="chalkboard-card chalkboard-3d">
                <div className="chalkboard-inner">
                  <div className="chalkboard-badge">✨ Chef's Pick</div>
                  <div className="chalkboard-title">Today's Special</div>
                  <div className="chalkboard-item">Pasta + Drink</div>
                  <div className="chalkboard-price">₹249</div>
                  <div className="chalkboard-desc">Fresh handmade pasta with your choice of refreshing drink</div>
                  <div className="chalkboard-decor">☕ &nbsp; 🍽️ &nbsp; ✨</div>
                </div>
                <div className="chalkboard-glow"></div>
              </div>
            </div>
          </div>

          {/* Quick interactive booking bar at the bottom of hero */}
          <div className="quick-booking-container">
            <div className="quick-booking-bar">
              <div className="quick-title">Book Your Table</div>
              
              <div className="quick-fields">
                <div className="quick-field">
                  <span className="field-label">
                    <Calendar size={14} /> Date
                  </span>
                  <input
                    type="date"
                    value={booking.date}
                    onChange={(e) => setBooking({ ...booking, date: e.target.value })}
                  />
                </div>

                <div className="field-separator"></div>

                <div className="quick-field">
                  <span className="field-label">
                    <Clock size={14} /> Time
                  </span>
                  <input
                    type="time"
                    value={booking.time}
                    onChange={(e) => setBooking({ ...booking, time: e.target.value })}
                  />
                </div>

                <div className="field-separator"></div>

                <div className="quick-field">
                  <span className="field-label">
                    <Users size={14} /> People
                  </span>
                  <div className="select-wrap">
                    <select
                      value={booking.people}
                      onChange={(e) => setBooking({ ...booking, people: e.target.value })}
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                        <option key={n} value={n}>{n} People</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="select-arrow" />
                  </div>
                </div>
              </div>

              <button className="quick-submit-btn" onClick={handleFindTable}>
                Find a Table
              </button>
            </div>
          </div>
        </section>

        {/* Popular Picks Menu Section */}
        <section id="menu" className="section-redesign">
          <div className="section-header-redesign">
            <div>
              <span className="eyebrow-redesign">Our Menu</span>
              <h2>Popular Picks</h2>
            </div>
            
            <div className="header-actions-redesign">
              <button 
                type="button" 
                onClick={() => setIsFullMenuOpen(true)} 
                className="view-full-menu-btn"
                style={{ cursor: "pointer" }}
              >
                View Full Menu
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <Loader2 className="spin-gold" /> Loading gourmet menu...
            </div>
          ) : (
            <div className="popular-picks-grid">
              {popularPicks.map((item) => (
                <article className="gourmet-card" key={item.id}>
                  <div className="card-image-wrap">
                    <img src={item.image} alt={item.name} className="gourmet-img" />
                    <div className="card-image-gradient"></div>
                    <span className="category-tag">{item.category}</span>
                  </div>

                  <div className="gourmet-info">
                    <div className="gourmet-top">
                      <h3>{item.name}</h3>
                      <span className="gourmet-price">₹{item.price}</span>
                    </div>
                    
                    <p className="gourmet-desc">{item.desc}</p>

                    <div className="gourmet-action-row">
                      <div className="gourmet-qty">
                        {cart[item.id] > 0 && (
                          <>
                            <button type="button" onClick={() => removeItem(item.id)}>
                              <Minus size={14} />
                            </button>
                            <span className="qty-val">{cart[item.id]}</span>
                          </>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        className="add-to-cart-gold"
                        onClick={() => addItem(item.id)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Dining Dining Types */}
        <section id="dining" className="section-redesign">
          <div className="section-header-center">
            <span className="eyebrow-redesign">Dining Experience</span>
            <h2>Select Your Ambience</h2>
            <p className="section-subtext">Choose the perfect table setting matching your taste and celebration.</p>
          </div>

          <div className="dining-grid-redesign">
            {tables.map((table, index) => (
              <motion.article
                className="dining-card-redesign"
                key={table.id}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <div className="dining-card-glow"></div>
                <div className="dining-header">
                  <span className="dining-emoji">
                    {["🪑", "☕", "🍽️", "✨", "🎉"][index % 5]}
                  </span>
                  <span className="dining-status-tag">{table.status}</span>
                </div>
                <h3>{table.type}</h3>
                <p className="dining-desc">{table.range}</p>
                <div className="dining-footer">
                  <small>Capacity: Up to {table.seats} Seats</small>
                  <strong>Starts at ₹{table.price}</strong>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Full Table Reservation Terminal and Pre-Order Bill */}
        <section id="booking" className="reservation-layout-redesign">
          {/* Reservation Card */}
          <form className="luxury-booking-card" onSubmit={submitBooking}>
            <span className="form-eyebrow">Reservation Terminal</span>
            <h2>Reserve Your Table</h2>
            <p className="form-subtext">Complete your booking details. Pre-ordered dishes will be freshly served upon arrival.</p>

            <div className="luxury-form-grid">
              <label className="luxury-label">
                <span><User size={14} className="gold-accent-icon" /> Customer Name</span>
                <input
                  id="customer-name-field"
                  value={booking.name}
                  onChange={(e) => setBooking({ ...booking, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
                {user && (
                  <span className="form-logged-in-badge">
                    <Sparkles size={10} /> Syncing: {user.displayName || user.email}
                  </span>
                )}
              </label>

              <label className="luxury-label">
                <span><Phone size={14} className="gold-accent-icon" /> Phone Number</span>
                <input
                  value={booking.phone}
                  onChange={(e) => setBooking({ ...booking, phone: e.target.value })}
                  placeholder="Enter contact number"
                  required
                />
              </label>

              <label className="luxury-label">
                <span><Calendar size={14} className="gold-accent-icon" /> Booking Date</span>
                <input
                  type="date"
                  value={booking.date}
                  onChange={(e) => setBooking({ ...booking, date: e.target.value })}
                  required
                />
              </label>

              <label className="luxury-label">
                <span><Clock size={14} className="gold-accent-icon" /> Arrival Time</span>
                <input
                  type="time"
                  value={booking.time}
                  onChange={(e) => setBooking({ ...booking, time: e.target.value })}
                  required
                />
              </label>

              <label className="luxury-label">
                <span><Users size={14} className="gold-accent-icon" /> Party Size</span>
                <div className="select-wrap">
                  <select
                    value={booking.people}
                    onChange={(e) => setBooking({ ...booking, people: e.target.value })}
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <option key={n} value={n}>{n} Guests</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </label>

              <label className="luxury-label">
                <span><Utensils size={14} className="gold-accent-icon" /> Dining Table Option</span>
                <div className="select-wrap">
                  <select
                    value={booking.tableType}
                    onChange={(e) => setBooking({ ...booking, tableType: e.target.value })}
                  >
                    {tables.map((table) => (
                      <option key={table.id} value={table.type}>{table.type}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </label>

              <label className="luxury-label">
                <span>💳 Payment Mode</span>
                <div className="select-wrap">
                  <select
                    value={booking.paymentMode}
                    onChange={(e) => setBooking({ ...booking, paymentMode: e.target.value })}
                  >
                    <optgroup label="Pay Later">
                      <option value="Pay at Café">☕ Pay at Café (Cash / Card)</option>
                      <option value="Card Online">💳 Credit / Debit Card Online</option>
                    </optgroup>
                    <optgroup label="UPI Apps — Instant Pay">
                      <option value="PhonePe">🟣 PhonePe</option>
                      <option value="Paytm">🔵 Paytm</option>
                      <option value="Google Pay">🟢 Google Pay</option>
                      <option value="Navi">🟢 Navi</option>
                      <option value="BHIM">🍊 BHIM</option>
                      <option value="UPI Instant Payment">📲 Other UPI App (QR Scan)</option>
                    </optgroup>
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </label>

              <label className="luxury-label full-width">
                <span>Special Instructions</span>
                <textarea
                  value={booking.notes}
                  onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
                  placeholder="Window-side seating, dietary restrictions, celebration arrangements, etc."
                  rows="3"
                />
              </label>
            </div>

            {cartItems.length > 0 && prepTime && (
              <div className="kitchen-prep-alert">
                <div className="prep-alert-icon">👨‍🍳</div>
                <div className="prep-alert-content">
                  <strong>Smart Kitchen Prep</strong>
                  <p>Our chefs will automatically begin preparing your fresh pre-orders at <span>{prepTime}</span> (10 minutes before your scheduled arrival at {booking.time}) so your food is served hot immediately!</p>
                </div>
              </div>
            )}

{["PhonePe", "Paytm", "Google Pay", "Navi", "BHIM", "UPI Instant Payment"].includes(booking.paymentMode) && (
              <div className="kitchen-prep-alert" style={{ background: "rgba(212, 175, 55, 0.03)", borderColor: "rgba(212, 175, 55, 0.25)" }}>
                <div className="prep-alert-icon">
                  {{ PhonePe: "🟣", Paytm: "🔵", "Google Pay": "🟢", Navi: "🟢", BHIM: "🍊", "UPI Instant Payment": "📲" }[booking.paymentMode] || "⚡"}
                </div>
                <div className="prep-alert-content">
                  <strong>{booking.paymentMode === "UPI Instant Payment" ? "UPI QR Code Payment" : `Pay via ${booking.paymentMode}`}</strong>
                  <p>
                    {booking.paymentMode === "UPI Instant Payment"
                      ? <>A QR Code for <span>₹{approxTotal}</span> linked to <b>cicetty@ptsbi</b> will appear. Scan and pay!
                        </>
                      : <>You'll be redirected directly to <b>{booking.paymentMode}</b> to pay <span>₹{approxTotal}</span> to <b>cicetty@ptsbi</b>. Enter your UTR ID after payment.</>
                    }
                  </p>
                </div>
              </div>
            )}

            <button className="luxury-submit-btn" type="submit">
              Confirm Reservation & Pre-Order
            </button>

            {status && (
              <div className="booking-status-box">
                <CheckCircle2 size={16} className="gold-accent-icon" />
                <span>{status}</span>
              </div>
            )}
          </form>

          {/* Pre-Order Bill Cart */}
          <aside className="luxury-cart-card">
            <div className="cart-header-luxury">
              <div>
                <span className="cart-eyebrow">Pre-Order Cart</span>
                <h2>Gourmet Selection</h2>
              </div>
              <ShoppingBag size={24} className="gold-accent-icon" />
            </div>

            {cartItems.length === 0 ? (
              <div className="empty-cart-container">
                <Coffee size={36} className="empty-cart-icon" />
                <p>No pre-order selections. Explore the Popular Picks above to customize your dining menu.</p>
              </div>
            ) : (
              <div className="cart-items-list-luxury">
                {cartItems.map((item) => (
                  <div className="cart-item-row" key={item.id}>
                    <div className="item-main">
                      <h4>{item.name}</h4>
                      <p>₹{item.price} × {item.qty}</p>
                    </div>
                    <span className="item-price-sum">₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="bill-summary-luxury">
              <div className="bill-row">
                <span>Menu Pre-Order</span>
                <span>₹{total}</span>
              </div>

              <div className="bill-row">
                <span>Dining Booking Charge</span>
                <span>₹{bookingCharge}</span>
              </div>

              <div className="summary-separator"></div>

              <div className="bill-row total-row">
                <span>Estimated Total</span>
                <span className="gold-highlight">₹{approxTotal}</span>
              </div>

              {/* Dynamic Payment Selector Down Estimated Total */}
              <div 
                className="bill-row payment-summary-row" 
                style={{ 
                  marginTop: "12px", 
                  paddingTop: "12px", 
                  borderTop: "1px dashed rgba(255, 255, 255, 0.08)", 
                  display: "flex", 
                  flexDirection: "column",
                  gap: "6px",
                  alignItems: "stretch"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                  <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                    💳 Choose Payment Mode:
                  </span>
                  
                  <div className="select-wrap" style={{ minWidth: "160px", position: "relative", display: "flex", alignItems: "center" }}>
                    <select
                      value={booking.paymentMode}
                      onChange={(e) => setBooking({ ...booking, paymentMode: e.target.value })}
                      style={{ 
                        color: "var(--gold-accent)", 
                        fontWeight: "700",
                        fontSize: "12px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid var(--border-glass)",
                        borderRadius: "8px",
                        padding: "6px 28px 6px 12px",
                        width: "100%",
                        cursor: "pointer",
                        appearance: "none",
                        outline: "none",
                        textAlign: "right",
                        fontFamily: "var(--font-sans)"
                      }}
                    >
                      <option value="Pay at Café" style={{ background: "#0e0d11", color: "#fff", fontFamily: "var(--font-sans)" }}>Pay at Café</option>
                      <option value="UPI Instant Payment" style={{ background: "#0e0d11", color: "#fff", fontFamily: "var(--font-sans)" }}>⚡ UPI Payment</option>
                      <option value="Card Online" style={{ background: "#0e0d11", color: "#fff", fontFamily: "var(--font-sans)" }}>💳 Card Online</option>
                    </select>
                    <ChevronDown size={12} className="select-arrow" style={{ right: "10px", color: "var(--gold-accent)", pointerEvents: "none", position: "absolute" }} />
                  </div>
                </div>

                {booking.paymentMode === "UPI Instant Payment" ? (
                  <div 
                    style={{ 
                      fontSize: "11px", 
                      color: "var(--text-secondary)", 
                      background: "rgba(212, 175, 55, 0.03)", 
                      border: "1px solid rgba(212, 175, 55, 0.15)", 
                      borderRadius: "8px", 
                      padding: "8px 12px", 
                      marginTop: "4px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px"
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: "600", color: "var(--gold-accent)" }}>
                      ⚡ QR Scan Verification
                    </span>
                    <span style={{ opacity: 0.85 }}>UPI ID: <b>cicetty@ptsbi</b></span>
                    <span style={{ opacity: 0.85 }}>Requires 12-digit UTR/Txn ID confirmation</span>
                  </div>
                ) : booking.paymentMode === "Card Online" ? (
                  <div 
                    style={{ 
                      fontSize: "11px", 
                      color: "var(--text-secondary)", 
                      background: "rgba(255, 255, 255, 0.02)", 
                      border: "1px solid var(--border-glass)", 
                      borderRadius: "8px", 
                      padding: "8px 12px", 
                      marginTop: "4px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px"
                    }}
                  >
                    <span style={{ fontWeight: "600", color: "rgba(255,255,255,0.7)" }}>
                      💳 Credit / Debit Card
                    </span>
                    <span style={{ opacity: 0.85 }}>Complete card authentication on checkout</span>
                  </div>
                ) : (
                  <div 
                    style={{ 
                      fontSize: "11px", 
                      color: "var(--text-secondary)", 
                      background: "rgba(255, 255, 255, 0.02)", 
                      border: "1px solid var(--border-glass)", 
                      borderRadius: "8px", 
                      padding: "8px 12px", 
                      marginTop: "4px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px"
                    }}
                  >
                    <span style={{ fontWeight: "600", color: "rgba(255,255,255,0.7)" }}>
                      ☕ Pay at Café Counter
                    </span>
                    <span style={{ opacity: 0.85 }}>Cash, Card, or UPI accepted on arrival</span>
                  </div>
                )}
              </div>
            </div>

            <p className="cart-bottom-info">
              * Tables are reserved strictly. Estimated totals are payable upon dining. Pre-orders are non-refundable after table check-in.
            </p>
          </aside>
        </section>
      </main>

      {/* Footer */}
      <footer className="luxury-footer" id="about">
        <div className="footer-content">
          <div className="footer-brand">
            <GoldenCupLogo />
            <div>
              <h3>The Golden Bean</h3>
              <p>Ambience, Taste & Memories</p>
            </div>
          </div>
          
          <div className="footer-links" id="contact">
            <div className="link-col">
              <h4>Hours</h4>
              <p>Daily: 08:00 AM – 11:30 PM</p>
              <p>Weekends: 08:00 AM – 01:00 AM</p>
            </div>
            
            <div className="link-col">
              <h4>Contact</h4>
              <p>hello@thegoldenbean.com</p>
              <p>+91 40 5582 9901</p>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} The Golden Bean Café & Patisserie. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal Overlay */}
      {isAuthModalOpen && (
        <div className="auth-modal-overlay" onClick={() => setIsAuthModalOpen(false)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={() => setIsAuthModalOpen(false)}>
              <X size={16} />
            </button>
            
            <div className="auth-modal-header">
              <h3>{authTab === "signin" ? "Welcome Back" : "Begin Journey"}</h3>
              <p>{authTab === "signin" ? "Access your gourmet dashboard & bookings" : "Create an account to track bookings and pre-orders"}</p>
            </div>

            <div className="auth-tabs-nav">
              <button 
                className={`auth-tab-nav-btn ${authTab === "signin" ? "active" : ""}`}
                onClick={() => { setAuthTab("signin"); setAuthError(""); setAuthSuccess(""); }}
              >
                Sign In
              </button>
              <button 
                className={`auth-tab-nav-btn ${authTab === "signup" ? "active" : ""}`}
                onClick={() => { setAuthTab("signup"); setAuthError(""); setAuthSuccess(""); }}
              >
                Register
              </button>
            </div>

            <div className="auth-modal-body">
              <form className="auth-form" onSubmit={handleAuthSubmit}>
                {authTab === "signup" && (
                  <div className="auth-input-group">
                    <label>Display Name</label>
                    <div className="auth-input-wrapper">
                      <User className="auth-input-icon" size={16} />
                      <input 
                        type="text" 
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Your full name"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="auth-input-group">
                  <label>Email Address</label>
                  <div className="auth-input-wrapper">
                    <Mail className="auth-input-icon" size={16} />
                    <input 
                      type="email" 
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Password</label>
                  <div className="auth-input-wrapper">
                    <Lock className="auth-input-icon" size={16} />
                    <input 
                      type="password" 
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                {authError && (
                  <div className="auth-alert error">
                    <Shield size={16} />
                    <span>{authError}</span>
                  </div>
                )}

                {authSuccess && (
                  <div className="auth-alert success">
                    <CheckCircle2 size={16} />
                    <span>{authSuccess}</span>
                  </div>
                )}

                <button className="auth-btn-gold" type="submit" disabled={authLoading}>
                  {authLoading ? (
                    <Loader2 className="spin" size={16} />
                  ) : authTab === "signin" ? (
                    "Sign In to Account"
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              <div className="auth-divider">Or continue with</div>

              <button className="auth-btn-google" onClick={handleGoogleSignIn} disabled={authLoading}>
                <svg className="google-g-logo" width="18" height="18" viewBox="0 0 18 18">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.8 2.7l2.76 2.13c1.62-1.49 2.58-3.69 2.58-6.26z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.76-2.13c-.76.51-1.74.82-3.2.82-2.46 0-4.54-1.66-5.28-3.9L.94 12.75C2.43 15.89 5.62 18 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.72 10.59c-.19-.58-.3-1.2-.3-1.84s.11-1.26.3-1.84L.94 5.09C.34 6.27 0 7.6 0 9s.34 2.73.94 3.91l2.78-2.32z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.62 0 2.43 2.11.94 5.25L3.72 7.57C4.46 5.33 6.54 3.58 9 3.58z"
                  />
                </svg>
                Google Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bookings Side Drawer */}
      {isBookingsOpen && (
        <>
          <div className="bookings-drawer-backdrop" onClick={() => setIsBookingsOpen(false)} />
          <div className="bookings-drawer">
            <div className="bookings-drawer-header">
              <h2>My Reservations</h2>
              <button className="drawer-close-btn" onClick={() => setIsBookingsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="bookings-drawer-content">
              {bookingsLoading ? (
                <div className="bookings-drawer-empty">
                  <Loader2 className="spin-gold" size={32} />
                  <p>Loading your reservations...</p>
                </div>
              ) : userBookings.length === 0 ? (
                <div className="bookings-drawer-empty">
                  <Coffee className="bookings-drawer-empty-icon" size={48} />
                  <h3>No Bookings Found</h3>
                  <p>You haven't reserved any dining tables under this email address yet. Book a table below to start!</p>
                </div>
              ) : (
                userBookings.map((bk) => (
                  <div className="booking-history-card" key={bk.id}>
                    <div className="booking-card-top">
                      <h4>{bk.tableType}</h4>
                      <span className="booking-id">#{bk.id}</span>
                    </div>

                    <div className="booking-card-details">
                      <div className="booking-card-detail-item">
                        <Calendar className="icon" size={12} />
                        <span>{bk.date}</span>
                      </div>
                      <div className="booking-card-detail-item">
                        <Clock className="icon" size={12} />
                        <span>{bk.time}</span>
                      </div>
                      <div className="booking-card-detail-item">
                        <Users className="icon" size={12} />
                        <span>{bk.people} Guests</span>
                      </div>
                      <div className="booking-card-detail-item">
                        <Phone className="icon" size={12} />
                        <span>{bk.phone}</span>
                      </div>
                    </div>

                    {bk.items && bk.items.length > 0 && (
                      <div className="booking-card-food-preview">
                        <h5>Pre-Ordered Food</h5>
                        <div className="food-preview-list">
                          {bk.items.map((it) => (
                            <span className="food-preview-tag" key={it.id}>
                              {it.name} (x{it.qty})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {bk.kitchenPrepTime && (
                      <div className="booking-card-prep-note" style={{ marginTop: "12px", fontSize: "11px", color: "var(--gold-accent)", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>🍳 Prep scheduled: <b>{bk.kitchenPrepTime}</b> (10m before arrival)</span>
                      </div>
                    )}

                    <div className="booking-card-bottom">
                      <span className="status-confirmed-tag">
                        <CheckCircle2 size={10} /> Active Confirmed
                      </span>
                      <div className="total-price-box">
                        <span>Estimated Total</span>
                        <strong>₹{bk.approxTotal}</strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Interactive Full Menu Modal */}
      {isFullMenuOpen && (
        <div className="full-menu-modal-overlay" onClick={() => { setIsFullMenuOpen(false); setSearchQuery(""); }}>
          <div className="full-menu-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={() => { setIsFullMenuOpen(false); setSearchQuery(""); }}>
              <X size={18} />
            </button>

            <div className="full-menu-modal-header">
              <span className="eyebrow-redesign">The Golden Bean</span>
              <h2>Gourmet Menu</h2>
              <p>Explore all our fresh delicacies, custom-crafted by culinary experts.</p>
              
              {/* Search bar inside header */}
              <div className="menu-search-bar-wrap">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for dishes, desserts, teas..."
                  className="menu-search-input"
                />
              </div>

              {/* Dynamic Category Tabs */}
              <div className="menu-category-tabs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`category-tab-btn ${activeCategory === cat ? "active" : ""}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="full-menu-modal-body">
              {filteredMenuItems.length === 0 ? (
                <div className="no-menu-results">
                  <Coffee size={40} className="gold-accent-icon" style={{ opacity: 0.5 }} />
                  <p>No culinary items match your search or filter.</p>
                </div>
              ) : (
                <div className="full-menu-grid">
                  {filteredMenuItems.map((item) => (
                    <div className="full-menu-item-card" key={item.id}>
                      <div className="item-details-left">
                        <div className="item-emoji-title-row">
                          <span className="item-emoji-badge">{item.emoji}</span>
                          <div>
                            <h3>{item.name}</h3>
                            <span className="item-cat-badge">{item.category}</span>
                          </div>
                        </div>
                        <p className="item-description-text">{item.desc}</p>
                      </div>

                      <div className="item-actions-right">
                        <span className="item-price-gold">₹{item.price}</span>
                        <div className="item-quantity-controller">
                          <button type="button" className="qty-ctrl-btn" onClick={() => removeItem(item.id)}>
                            <Minus size={12} />
                          </button>
                          <span className="qty-value-display">{cart[item.id] || 0}</span>
                          <button type="button" className="qty-ctrl-btn ctrl-plus" onClick={() => addItem(item.id)}>
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="full-menu-modal-footer">
              <div className="footer-cart-summary">
                <span>Selected: {cartItems.length} items</span>
                <strong>Pre-order Total: ₹{total}</strong>
              </div>
              <button 
                type="button" 
                className="close-menu-action-btn" 
                onClick={() => { setIsFullMenuOpen(false); setSearchQuery(""); }}
              >
                Done Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive UPI QR Code Modal */}
      {isUPIModalOpen && pendingPayload && (
        <div className="full-menu-modal-overlay" onClick={() => { setIsUPIModalOpen(false); setPendingPayload(null); setTransactionId(""); setScreenshotName(""); setStatus("Booking cancelled."); }}>
          <div className="upi-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={() => { setIsUPIModalOpen(false); setPendingPayload(null); setTransactionId(""); setScreenshotName(""); setStatus("Booking cancelled."); }}>
              <X size={18} />
            </button>

            <div className="upi-modal-header">
              {(() => {
                const appEmoji = { PhonePe: "🟣", Paytm: "🔵", "Google Pay": "🟢", Navi: "🟢", BHIM: "🍊", "UPI Instant Payment": "📲" };
                const isSpecificApp = pendingPayload.paymentMode !== "UPI Instant Payment";
                return (
                  <>
                    <span className="upi-badge">
                      {appEmoji[pendingPayload.paymentMode] || "⚡"} {isSpecificApp ? pendingPayload.paymentMode : "Instant UPI"}
                    </span>
                    <h2>{isSpecificApp ? `Pay via ${pendingPayload.paymentMode}` : "Scan to Pay"}</h2>
                    <p>
                      {isSpecificApp
                        ? `Tap the button below to open ${pendingPayload.paymentMode} directly. Complete the payment of ₹${pendingPayload.approxTotal}, then enter your UTR/Transaction ID here.`
                        : "Scan the QR Code using any UPI app — PhonePe, Paytm, Google Pay, BHIM, Navi, or any UPI app to pay and confirm your reservation."}
                    </p>
                  </>
                );
              })()}
            </div>

            <div className="upi-modal-body">
              {/* Smart: If a specific app is selected, show a big launch button. Otherwise QR code */}
              {pendingPayload.paymentMode !== "UPI Instant Payment" ? (
                /* SPECIFIC APP SELECTED — Big Direct Launch Button */
                (() => {
                  const appLinks = {
                    PhonePe: `phonepe://pay?pa=cicetty@ptsbi&pn=Cicetty%20Jaswanth%20Kumar&am=${pendingPayload.approxTotal}&cu=INR`,
                    Paytm: `paytmmp://pay?pa=cicetty@ptsbi&pn=Cicetty%20Jaswanth%20Kumar&am=${pendingPayload.approxTotal}&cu=INR`,
                    "Google Pay": `tez://upi/pay?pa=cicetty@ptsbi&pn=Cicetty%20Jaswanth%20Kumar&am=${pendingPayload.approxTotal}&cu=INR`,
                    Navi: `upi://pay?pa=cicetty@ptsbi&pn=Cicetty%20Jaswanth%20Kumar&am=${pendingPayload.approxTotal}&cu=INR`,
                    BHIM: `bhim://pay?pa=cicetty@ptsbi&pn=Cicetty%20Jaswanth%20Kumar&am=${pendingPayload.approxTotal}&cu=INR`,
                  };
                  const appColors = {
                    PhonePe: { bg: "rgba(95,37,159,0.15)", border: "rgba(95,37,159,0.6)", glow: "rgba(95,37,159,0.3)" },
                    Paytm: { bg: "rgba(0,185,245,0.12)", border: "rgba(0,185,245,0.5)", glow: "rgba(0,185,245,0.25)" },
                    "Google Pay": { bg: "rgba(52,168,83,0.12)", border: "rgba(52,168,83,0.5)", glow: "rgba(52,168,83,0.25)" },
                    Navi: { bg: "rgba(52,168,83,0.12)", border: "rgba(52,168,83,0.5)", glow: "rgba(52,168,83,0.25)" },
                    BHIM: { bg: "rgba(226,106,32,0.12)", border: "rgba(226,106,32,0.5)", glow: "rgba(226,106,32,0.25)" },
                  };
                  const appEmoji = { PhonePe: "🟣", Paytm: "🔵", "Google Pay": "🟢", Navi: "🟢", BHIM: "🍊" };
                  const col = appColors[pendingPayload.paymentMode] || { bg: "rgba(212,175,55,0.1)", border: "rgba(212,175,55,0.4)", glow: "rgba(212,175,55,0.2)" };
                  const link = appLinks[pendingPayload.paymentMode] || `upi://pay?pa=cicetty@ptsbi&pn=Cicetty%20Jaswanth%20Kumar&am=${pendingPayload.approxTotal}&cu=INR`;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", margin: "10px 0 24px" }}>
                      {/* Pulsing App Logo Card */}
                      <div style={{ 
                        background: col.bg, 
                        border: `2px solid ${col.border}`, 
                        borderRadius: "20px", 
                        padding: "30px 40px", 
                        textAlign: "center",
                        boxShadow: `0 0 40px ${col.glow}`,
                        animation: "pulse-glow 2s ease-in-out infinite"
                      }}>
                        <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                          {appEmoji[pendingPayload.paymentMode]}
                        </div>
                        <div style={{ fontWeight: "800", fontSize: "18px", color: "#fff", marginBottom: "4px" }}>
                          {pendingPayload.paymentMode}
                        </div>
                        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                          UPI Payment Selected
                        </div>
                      </div>

                      {/* Big Launch Button */}
                      <a 
                        href={link}
                        style={{
                          background: "linear-gradient(135deg, #d4af37 0%, #e6c256 100%)",
                          color: "#000",
                          fontWeight: "800",
                          fontSize: "15px",
                          padding: "16px 36px",
                          borderRadius: "12px",
                          boxShadow: `0 10px 30px var(--gold-glow)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "12px",
                          width: "100%",
                          maxWidth: "320px",
                          transition: "all 0.3s ease",
                          letterSpacing: "0.02em"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 16px 40px var(--gold-glow)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 10px 30px var(--gold-glow)"; }}
                      >
                        📲 Open {pendingPayload.paymentMode} Now
                      </a>

                      {/* Divider with QR fallback */}
                      <div style={{ width: "100%", maxWidth: "320px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ flex: 1, height: "1px", background: "var(--border-glass)" }} />
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>or scan QR</span>
                        <div style={{ flex: 1, height: "1px", background: "var(--border-glass)" }} />
                      </div>

                      {/* QR Code fallback */}
                      <div className="upi-qr-frame" style={{ width: "160px", height: "160px" }}>
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=d4af37&bgcolor=0e0d11&data=${encodeURIComponent(`upi://pay?pa=cicetty@ptsbi&pn=Cicetty%20Jaswanth%20Kumar&am=${pendingPayload.approxTotal}&cu=INR`)}`} 
                          alt="UPI QR Code" 
                          className="upi-qr-image"
                        />
                        <div className="qr-scanner-laser"></div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* GENERIC UPI — Show QR + All App Buttons */
                <>
                  <div className="upi-qr-frame">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=d4af37&bgcolor=0e0d11&data=${encodeURIComponent(`upi://pay?pa=cicetty@ptsbi&pn=Cicetty%20Jaswanth%20Kumar&am=${pendingPayload.approxTotal}&cu=INR`)}`} 
                      alt="UPI QR Code" 
                      className="upi-qr-image"
                    />
                    <div className="qr-scanner-laser"></div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", margin: "16px auto", maxWidth: "380px", width: "100%" }}>
                    {[
                      { name: "PhonePe", emoji: "🟣", href: `phonepe://pay?pa=cicetty@ptsbi&pn=Cicetty%20Jaswanth%20Kumar&am=${pendingPayload.approxTotal}&cu=INR`, bg: "rgba(95,37,159,0.12)", border: "rgba(95,37,159,0.4)" },
                      { name: "Paytm", emoji: "🔵", href: `paytmmp://pay?pa=cicetty@ptsbi&pn=Cicetty%20Jaswanth%20Kumar&am=${pendingPayload.approxTotal}&cu=INR`, bg: "rgba(0,185,245,0.12)", border: "rgba(0,185,245,0.4)" },
                      { name: "Google Pay", emoji: "🟢", href: `tez://upi/pay?pa=cicetty@ptsbi&pn=Cicetty%20Jaswanth%20Kumar&am=${pendingPayload.approxTotal}&cu=INR`, bg: "rgba(52,168,83,0.12)", border: "rgba(52,168,83,0.4)" },
                      { name: "Navi", emoji: "🟢", href: `upi://pay?pa=cicetty@ptsbi&pn=Cicetty%20Jaswanth%20Kumar&am=${pendingPayload.approxTotal}&cu=INR`, bg: "rgba(52,168,83,0.12)", border: "rgba(52,168,83,0.4)" },
                      { name: "BHIM", emoji: "🍊", href: `bhim://pay?pa=cicetty@ptsbi&pn=Cicetty%20Jaswanth%20Kumar&am=${pendingPayload.approxTotal}&cu=INR`, bg: "rgba(226,106,32,0.12)", border: "rgba(226,106,32,0.4)" },
                      { name: "Other App", emoji: "📲", href: `upi://pay?pa=cicetty@ptsbi&pn=Cicetty%20Jaswanth%20Kumar&am=${pendingPayload.approxTotal}&cu=INR`, bg: "rgba(212,175,55,0.06)", border: "rgba(212,175,55,0.25)" },
                    ].map(app => (
                      <a key={app.name} href={app.href} style={{ background: app.bg, border: `1px solid ${app.border}`, color: "#fff", fontWeight: "700", fontSize: "12px", padding: "12px 14px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.25s ease", cursor: "pointer" }}>
                        {app.emoji} {app.name}
                      </a>
                    ))}
                  </div>
                </>
              )}

              <div className="upi-payment-details">
                <div className="upi-detail-row">
                  <span>Merchant Account:</span>
                  <strong>cicetty@ptsbi</strong>
                </div>
                <div className="upi-detail-row">
                  <span>Amount to Pay:</span>
                  <strong className="gold-highlight">₹{pendingPayload.approxTotal}</strong>
                </div>
              </div>

              {/* Dynamic Transaction ID & Photo Upload verification */}
              <div className="upi-verification-inputs" style={{ marginTop: "16px", background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-glass)", borderRadius: "12px", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" }}>
                <label className="luxury-label" style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "var(--text-muted)", width: "100%" }}>
                  <span style={{ color: "var(--gold-accent)", fontWeight: "600" }}>🔒 Transaction ID / UTR Number (Required)</span>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter 12-digit UTR/Txn number"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-glass)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#fff", outline: "none", width: "100%" }}
                    required
                  />
                </label>

                <label className="luxury-label" style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "var(--text-muted)", width: "100%" }}>
                  <span style={{ color: "var(--gold-accent)", fontWeight: "600" }}>📸 Upload Receipt Screenshot (Optional)</span>
                  <div className="custom-file-upload-wrap" style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                    <input
                      type="file"
                      accept="image/*"
                      id="upi-screenshot-input"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setScreenshotName(file.name);
                        }
                      }}
                      style={{ display: "none" }}
                    />
                    <label htmlFor="upi-screenshot-input" className="upi-upload-btn" style={{ padding: "8px 16px", border: "1px dashed var(--gold-accent)", borderRadius: "8px", fontSize: "12px", color: "var(--gold-accent)", cursor: "pointer", display: "inline-block", background: "rgba(212,175,55,0.03)", whiteSpace: "nowrap" }}>
                      Choose File
                    </label>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                      {screenshotName || "No file chosen"}
                    </span>
                  </div>
                </label>
              </div>

              {/* Ticking countdown */}
              <div className="upi-timer-box" style={{ marginTop: "18px" }}>
                <span>Transaction expires in:</span>
                <strong className="timer-val">{formattedUpiTimer}</strong>
              </div>
            </div>

            <div className="upi-modal-footer">
              <button 
                type="button" 
                className="upi-cancel-btn" 
                onClick={() => { setIsUPIModalOpen(false); setPendingPayload(null); setTransactionId(""); setScreenshotName(""); setStatus("Booking cancelled."); }}
              >
                Cancel
              </button>
              
              <button 
                type="button" 
                className="upi-confirm-btn" 
                disabled={!transactionId.trim()}
                style={{ opacity: !transactionId.trim() ? 0.5 : 1, cursor: !transactionId.trim() ? "not-allowed" : "pointer" }}
                onClick={() => {
                  const finalPayload = {
                    ...pendingPayload,
                    transactionId: transactionId,
                    paymentProofScreenshot: screenshotName || "None"
                  };
                  setIsUPIModalOpen(false);
                  setPendingPayload(null);
                  setTransactionId("");
                  setScreenshotName("");
                  finalizeBooking(finalPayload);
                }}
              >
                I have paid ₹{pendingPayload.approxTotal}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
