import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);

// フロントエンド（app.js）と統一するAPIキー
const API_KEY = "SQCDjYLDCvxxATBUt4226pzzFiaWIJkLl2ouUrLwKSOVFHFBlCBAPSfh97Oq";

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "pastes.json");
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "{}\n", "utf8");

app.disable("x-powered-by");
app.use(express.json({ limit: "5mb" }));

// publicディレクトリ内の静的ファイル (index.html, style.css, app.js, bg.mp4 等) を配信
app.use(express.static(path.join(__dirname, "public")));

function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return {}; }
}

function writeDB(db) {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DB_FILE);
}

function makeId(length = 6) {
  const bytes = crypto.randomBytes(length);
  let id = "";
  for (const b of bytes) id += ALPHABET[b % ALPHABET.length];
  return id;
}

function auth(req) {
  const key = req.get("x-api-key") || (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return key === API_KEY;
}

function cleanFilename(name) {
  return String(name || "untitled.txt")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .slice(0, 160) || "untitled.txt";
}

function escapeHTML(v) {
  return String(v).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function baseURL(req) {
  return `${req.protocol}://${req.get("host")}`;
}

// 作成API
app.post("/api/create", (req, res) => {
  if (!auth(req)) {
    return res.status(401).json({ success: false, error: "Invalid API key." });
  }

  const content = typeof req.body?.content === "string" ? req.body.content : "";
  if (!content) {
    return res.status(400).json({ success: false, error: "content is required." });
  }

  const size = Buffer.byteLength(content, "utf8");
  if (size > 5 * 1024 * 1024) {
    return res.status(413).json({ success: false, error: "Content is larger than 5 MB." });
  }

  const filename = cleanFilename(req.body?.filename);
  const db = readDB();

  let id = makeId();
  while (db[id]) id = makeId();

  db[id] = {
    id,
    filename,
    content,
    createdAt: new Date().toISOString()
  };

  writeDB(db);

  const base = baseURL(req);
  res.status(201).json({
    success: true,
    id,
    filename,
    url: `${base}/${id}`,
    raw_url: `${base}/raw/${id}`,
    view_url: `${base}/view/${id}`
  });
});

// Roblox game:HttpGet 用 (純粋なテキストのみ出力)
app.get("/raw/:id", (req, res) => {
  const paste = readDB()[req.params.id];
  if (!paste) return res.status(404).type("text").send("Paste not found.");

  res.set({
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=60"
  });
  res.send(paste.content);
});

// 人間確認用ビュー画面
app.get("/view/:id", (req, res) => {
  const paste = readDB()[req.params.id];
  if (!paste) return res.status(404).send("Paste not found.");

  res.type("html").send(`<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHTML(paste.filename)} — ShortPaste</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#050607;color:#e1e6e2;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
header{height:52px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;padding:0 20px;gap:10px;background:#0c0e10}
.dot{width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:0 0 8px #fff}.brand{font-weight:700;font-size:13px;letter-spacing:1px}.file{margin-left:auto;color:#606862;font-size:11px}
main{max-width:1000px;margin:20px auto;padding:0 16px}pre{white-space:pre-wrap;overflow:auto;margin:0;padding:20px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;background:rgba(12,14,16,0.85);line-height:1.6;font-size:12.5px}
</style></head><body><header><span class="dot"></span><span class="brand">NULL / VIEW</span><span class="file">${escapeHTML(paste.filename)}</span></header>
<main><pre>${escapeHTML(paste.content)}</pre></main></body></html>`);
});

// 短縮URLルート (/ID)
app.get("/:id", (req, res, next) => {
  if (!/^[A-Za-z0-9]{6,12}$/.test(req.params.id)) {
    return next();
  }

  const paste = readDB()[req.params.id];
  if (!paste) return res.status(404).type("text").send("Paste not found.");

  res.set({
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=60"
  });
  res.send(paste.content);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on: http://localhost:${PORT}`);
});