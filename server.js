const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const GAMES_FILE = path.join(__dirname, "games.json");

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Load games from JSON
function loadGames() {
  if (!fs.existsSync(GAMES_FILE)) return [];
  return JSON.parse(fs.readFileSync(GAMES_FILE, "utf8"));
}

// Save games to JSON
function saveGames(games) {
  fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));
}

// Get all games
app.get("/api/games", (req, res) => {
  res.json(loadGames());
});

// Add a new game
app.post("/api/games", (req, res) => {
  const { name, cover, html } = req.body;
  if (!name || !cover || !html) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const games = loadGames();
  games.push({ id: Date.now(), name, cover, html });
  saveGames(games);
  res.json({ success: true });
});

// Remove a game
app.delete("/api/games/:id", (req, res) => {
  let games = loadGames();
  games = games.filter(g => g.id != req.params.id);
  saveGames(games);
  res.json({ success: true });
});

// Reorder games
app.post("/api/reorder", (req, res) => {
  const { order } = req.body; // should be array of IDs
  let games = loadGames();
  const newGames = order.map(id => games.find(g => g.id == id)).filter(Boolean);
  saveGames(newGames);
  res.json({ success: true });
});

// Game play page
app.get("/game/:id", (req, res) => {
  const games = loadGames();
  const game = games.find(g => g.id == req.params.id);
  if (!game) return res.status(404).send("Game not found");
  res.send(`
    <html>
      <head>
        <title>${game.name}</title>
        <style>body { margin:0; }</style>
      </head>
      <body>
        <button onclick="window.history.back()" style="position:absolute;top:10px;left:10px;z-index:999;">⬅ Back</button>
        <div style="width:100%;height:100vh;overflow:hidden;">
          ${game.html}
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
