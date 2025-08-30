// Backend server for AnonyChat Games
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const shortid = require('shortid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_CODE = process.env.ADMIN_CODE || 'changeme123'; // set in env for production
const DATA_DIR = path.join(__dirname, 'data');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

// Ensure dirs exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, Date.now() + '-' + shortid.generate() + ext);
  }
});
const upload = multer({ storage });

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helpers
function readGames() {
  try { return JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8')); }
  catch { return []; }
}
function writeGames(games) {
  fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));
}

// API
app.get('/api/games', (_, res) => res.json(readGames()));

// Session tokens
const sessions = {};
function createToken() { return shortid.generate() + shortid.generate(); }
function checkToken(req) {
  const token = req.headers['x-admin-token'];
  if (!token) return false;
  const exp = sessions[token];
  if (!exp) return false;
  if (Date.now() > exp) { delete sessions[token]; return false; }
  return true;
}

// Login
app.post('/api/admin/login', (req, res) => {
  const { code } = req.body;
  if (code === ADMIN_CODE) {
    const token = createToken();
    sessions[token] = Date.now() + 1000 * 60 * 60; // 1h
    return res.json({ ok: true, token });
  }
  return res.status(403).json({ ok: false });
});

// Add game
app.post('/api/admin/add', upload.single('cover'), (req, res) => {
  if (!checkToken(req)) return res.status(403).json({ ok: false });
  const { name, html } = req.body;
  if (!name || !html) return res.status(400).json({ ok: false, error: 'Missing fields' });

  const games = readGames();
  const id = shortid.generate();
  const cover = req.file ? `/uploads/${path.basename(req.file.path)}` : null;
  games.push({ id, name, html, cover });
  writeGames(games);
  res.json({ ok: true });
});

// Remove game
app.post('/api/admin/remove', (req, res) => {
  if (!checkToken(req)) return res.status(403).json({ ok: false });
  const { id } = req.body;
  let games = readGames();
  games = games.filter(g => g.id !== id);
  writeGames(games);
  res.json({ ok: true });
});

// Reorder
app.post('/api/admin/reorder', (req, res) => {
  if (!checkToken(req)) return res.status(403).json({ ok: false });
  const { games } = req.body;
  if (!Array.isArray(games)) return res.status(400).json({ ok: false });
  writeGames(games);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
