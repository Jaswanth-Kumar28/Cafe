import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "data", "db.json");

app.use(cors());
app.use(express.json());

async function readDB() {
  const data = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(data);
}

async function writeDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

app.get("/api/health", (req, res) => {
  res.json({
    message: "Cafe backend is running"
  });
});

app.get("/api/menu", async (req, res) => {
  try {
    const db = await readDB();
    res.json(db.menu);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load menu"
    });
  }
});

app.get("/api/tables", async (req, res) => {
  try {
    const db = await readDB();
    res.json(db.tables);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load tables"
    });
  }
});

function sendOwnerSMSNotification(reservation) {
  const { name, phone, date, time, tableType, items, approxTotal, kitchenPrepTime, paymentMode, transactionId, paymentProofScreenshot } = reservation;
  
  const foodDetails = items && items.length > 0 
    ? items.map(it => `- ${it.name} (x${it.qty})`).join("\n") 
    : "No food items pre-ordered.";
    
  let paymentText = `💳 Payment Mode: ${paymentMode || "Pay at Café"}\n💳 Payment Status: ${paymentMode === "UPI Instant Payment" ? "Paid Online (UPI)" : "Pay on Arrival"}`;
  
  if (paymentMode === "UPI Instant Payment") {
    paymentText += `\n🔍 UPI Merchant: cicetty@ptsbi\n🔍 UPI UTR/Txn ID: ${transactionId || "N/A"}\n📸 Receipt Screen: ${paymentProofScreenshot || "None"}`;
  }
    
  const smsText = `
============================================================
📱 [SMS DISPATCHER] SENT TO OWNER (9347003615)
------------------------------------------------------------
🌟 NEW CAFE BOOKING CONFIRMED!
👤 Customer: ${name} (${phone})
📅 Date: ${date} | 🕒 Time: ${time}
🍽️ Ambience Table: ${tableType}
🍳 Prep Kitchen Time: ${kitchenPrepTime || time} (10m before arrival)
${paymentText}
------------------------------------------------------------
🍔 PRE-ORDERED MENU:
${foodDetails}
------------------------------------------------------------
💰 ESTIMATED TOTAL BILL: ₹${approxTotal}
============================================================
`;
  console.log(smsText);
}

app.post("/api/reservations", async (req, res) => {
  try {
    const {
      name,
      phone,
      date,
      time,
      people,
      tableType,
      notes,
      items,
      foodTotal,
      bookingCharge,
      approxTotal,
      userId,
      userEmail,
      kitchenPrepTime,
      ownerAlert,
      paymentMode
    } = req.body;

    if (!name || !phone || !date || !time) {
      return res.status(400).json({
        message: "Name, phone, date, and time are required"
      });
    }

    const db = await readDB();

    const reservation = {
      id: nanoid(8),
      name,
      phone,
      date,
      time,
      people,
      tableType,
      notes: notes || "",
      items: items || [],
      foodTotal: Number(foodTotal || 0),
      bookingCharge: Number(bookingCharge || 0),
      approxTotal: Number(approxTotal || 0),
      userId: userId || null,
      userEmail: userEmail || null,
      kitchenPrepTime: kitchenPrepTime || null,
      ownerAlert: ownerAlert || null,
      paymentMode: paymentMode || "Pay at Café",
      status: "confirmed",
      createdAt: new Date().toISOString()
    };

    db.reservations.push(reservation);
    await writeDB(db);

    // Dispatch simulated SMS notification to owner at 9347003615
    sendOwnerSMSNotification(reservation);

    res.status(201).json({
      message: "Reservation saved successfully",
      reservation
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to save reservation"
    });
  }
});

app.get("/api/reservations", async (req, res) => {
  try {
    const db = await readDB();
    const { userEmail } = req.query;
    if (userEmail) {
      const filtered = db.reservations.filter(
        (r) => r.userEmail && r.userEmail.toLowerCase() === userEmail.toLowerCase()
      );
      return res.json(filtered);
    }
    res.json(db.reservations);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load reservations"
    });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const { customerName, phone, items, total } = req.body;

    if (!customerName || !phone || !items?.length) {
      return res.status(400).json({
        message: "Customer name, phone, and items are required"
      });
    }

    const db = await readDB();

    const order = {
      id: nanoid(8),
      customerName,
      phone,
      items,
      total: Number(total || 0),
      status: "received",
      createdAt: new Date().toISOString()
    };

    db.orders.push(order);
    await writeDB(db);

    res.status(201).json({
      message: "Order saved successfully",
      order
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to save order"
    });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const db = await readDB();
    res.json(db.orders);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load orders"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Cafe backend running on http://localhost:${PORT}`);
});
