// server.js — root
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bodyParser = require('body-parser');
const shortid = require('shortid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_CODE = process.env.ADMIN_CODE || 'changeme'; // set this in Render env
const DATA_DIR = path.join(__dirname, 'data');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

// ensure write dirs
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(GAMES_FILE)) fs.writeFileSync(GAMES_FILE, '[]', 'utf8');

app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// multer for cover uploads
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, Date.now() + '-' + shortid.generate() + ext);
  }
});
const upload = multer({ storage });

// helpers
function readGames() {
  try {
    return JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}
function writeGames(list) {
  fs.writeFileSync(GAMES_FILE, JSON.stringify(list, null, 2), 'utf8');
}

// admin session tokens (in-memory)
const sessions = {};
function makeToken() { return shortid.generate() + shortid.generate(); }
function checkToken(req) {
  const token = req.headers['x-admin-token'] || req.body.token || req.query.token;
  if (!token) return false;
  const exp = sessions[token];
  if (!exp) return false;
  if (Date.now() > exp) { delete sessions[token]; return false; }
  return true;
}

// API: public
app.get('/api/games', (req, res) => {
  res.json(readGames());
});

// API: admin login -> returns token
app.post('/api/admin/login', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ ok: false, error: 'missing code' });
  if (code === ADMIN_CODE) {
    const token = makeToken();
    sessions[token] = Date.now() + 1000 * 60 * 60; // 1 hour
    return res.json({ ok: true, token });
  }
  return res.status(403).json({ ok: false, error: 'invalid code' });
});

// API: add (multipart form for cover)
app.post('/api/admin/add', upload.single('cover'), (req, res) => {
  if (!checkToken(req)) return res.status(403).json({ ok: false, error: 'not authorized' });
  const { name, html } = req.body;
  if (!name || !html) return res.status(400).json({ ok: false, error: 'missing fields' });
  const games = readGames();
  const id = shortid.generate();
  const cover = req.file ? `/uploads/${path.basename(req.file.path)}` : (req.body.coverUrl || null);
  // slug optional for future subdomains
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const item = { id, name, html, cover, slug, createdAt: Date.now() };
  games.push(item);
  writeGames(games);
  res.json({ ok: true, game: item });
});

// API: remove
app.post('/api/admin/remove', (req, res) => {
  if (!checkToken(req)) return res.status(403).json({ ok: false, error: 'not authorized' });
  const { id } = req.body;
  if (!id) return res.status(400).json({ ok: false, error: 'missing id' });
  let games = readGames();
  const found = games.find(g => g.id === id);
  if (found && found.cover && found.cover.startsWith('/uploads/')) {
    const p = path.join(__dirname, 'public', found.cover);
    if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch(e){}
  }
  games = games.filter(g => g.id !== id);
  writeGames(games);
  res.json({ ok: true });
});

// API: reorder (send full array of games)
app.post('/api/admin/reorder', (req, res) => {
  if (!checkToken(req)) return res.status(403).json({ ok: false, error: 'not authorized' });
  const { games } = req.body;
  if (!Array.isArray(games)) return res.status(400).json({ ok: false, error: 'invalid payload' });
  // sanitize: keep only known fields
  const newGames = games.map(g => ({
    id: g.id,
    name: g.name,
    html: g.html,
    cover: g.cover,
    slug: g.slug || (g.name ? g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : shortid.generate())
  }));
  writeGames(newGames);
  res.json({ ok: true });
});

// serve per-game play page (optional fallback)
app.get('/play/:id', (req, res) => {
  const games = readGames();
  const game = games.find(g => g.id === req.params.id);
  if (!game) return res.status(404).send('Not found');
  res.send(`
    <!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Play ${escapeHtml(game.name)}</title>
      <style>body,html{height:100%;margin:0}iframe{width:100%;height:100%;border:0}</style>
    </head><body>
      <button onclick="history.back()" style="position:fixed;z-index:999;padding:10px;margin:10px;border-radius:6px;">⬅ Back</button>
      <iframe srcdoc="${escapeDouble(game.html)}"></iframe>
    </body></html>
  `);
});

// helper to safely put HTML inside srcdoc attributes
function escapeDouble(s='') {
  return String(s).replace(/<\/script>/gi, '<\\/script>').replace(/"/g, '&quot;').replace(/\r/g,'').replace(/\n/g,'\\n');
}
function escapeHtml(s='') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
