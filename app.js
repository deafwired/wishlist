import express from "express";
import dotenv from "dotenv";
dotenv.config();
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import cookieParser from "cookie-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3456;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

const uploadDir = path.join(__dirname, "public", "uploads");
try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch (e) {
  console.error("Could not create upload dir:", e);
}

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    cb(null, safeName);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // allow only images
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image uploads allowed'));
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Database setup
const dbPromise = open({
  filename: path.join(__dirname, "db.sqlite"),
  driver: sqlite3.Database
});

(async () => {
  const db = await dbPromise;
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      link TEXT,
      image TEXT,
      price TEXT,
      status TEXT DEFAULT 'available',
      claimer TEXT
    );
  `);
  // Ensure existing databases get the 'claimer' column if missing
  try {
    await db.exec("ALTER TABLE wishlist ADD COLUMN claimer TEXT;");
  } catch (e) {
    // ignore if column already exists or other errors
  }
})();

// Routes
app.get("/api/items", async (req, res) => {
  const db = await dbPromise;
  const items = await db.all("SELECT * FROM wishlist");
  res.json(items);
});

app.post("/api/claim/:id", async (req, res) => {
  const db = await dbPromise;
  const { id } = req.params;

  // read claimer token from cookie
  const token = req.cookies && req.cookies.claimer;
  if (!token) return res.status(400).json({ error: 'No claimer cookie present' });

  const item = await db.get("SELECT * FROM wishlist WHERE id = ?", id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  if (item.status === 'available' || !item.status) {
    await db.run("UPDATE wishlist SET status = 'claimed', claimer = ? WHERE id = ?", [token, id]);
    return res.json({ success: true, claimed: true });
  }

  if (item.status === 'claimed') {
    if (item.claimer === token) {
      // allow unclaim by same claimer
      await db.run("UPDATE wishlist SET status = 'available', claimer = NULL WHERE id = ?", id);
      return res.json({ success: true, claimed: false });
    }
    return res.status(403).json({ error: 'Item already claimed by someone else' });
  }

  // default fallback
  res.status(400).json({ error: 'Cannot claim this item' });
});

/* purchase feature removed; users can only claim/unclaim items via cookies */

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.post("/api/admin/add", async (req, res) => {
  const { password, title, description, link, image, price } = req.body || {};

  if (!process.env.OWNER_PASSWORD) {
    return res.status(500).json({ error: "Server not configured: OWNER_PASSWORD not set" });
  }

  if (password !== process.env.OWNER_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  try {
    const db = await dbPromise;
    await db.run(
      "INSERT INTO wishlist (title, description, link, image, price) VALUES (?, ?, ?, ?, ?)",
      [title, description, link, image, price]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error adding item:", err);
    res.status(500).json({ error: "Failed to add item" });
  }
});

app.post("/api/admin/auth", (req, res) => {
  const { password } = req.body || {};
  if (!process.env.OWNER_PASSWORD) {
    return res.status(500).json({ error: "Server not configured: OWNER_PASSWORD not set" });
  }
  if (password !== process.env.OWNER_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ ok: true });
});

app.post('/api/admin/upload', upload.single('image'), (req, res) => {
  const { password } = req.body || {};
  if (!process.env.OWNER_PASSWORD) {
    return res.status(500).json({ error: 'Server not configured: OWNER_PASSWORD not set' });
  }
  if (password !== process.env.OWNER_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Return the public URL for the uploaded file
  const publicUrl = `/uploads/${req.file.filename}`;
  res.json({ url: publicUrl });
});

app.listen(port, () => {
  console.log(`Wishlist app running on http://localhost:${port}`);
});
