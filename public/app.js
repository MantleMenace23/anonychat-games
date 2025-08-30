let games = JSON.parse(localStorage.getItem("games")) || [
  { name: "Sample Game", url: "https://example.com", image: "https://via.placeholder.com/200" }
];

const searchBar = document.getElementById("searchBar");
const gamesGrid = document.getElementById("gamesGrid");
const gameOverlay = document.getElementById("gameOverlay");
const gameFrame = document.getElementById("gameFrame");
const backBtn = document.getElementById("backBtn");

const adminBtn = document.getElementById("adminBtn");
const adminPanel = document.getElementById("adminPanel");
const adminCodeInput = document.getElementById("adminCode");
const submitCode = document.getElementById("submitCode");
const adminControls = document.getElementById("adminControls");

const gameNameInput = document.getElementById("gameName");
const gameUrlInput = document.getElementById("gameUrl");
const gameImageInput = document.getElementById("gameImage");
const addGameBtn = document.getElementById("addGameBtn");

const removeNameInput = document.getElementById("removeName");
const removeGameBtn = document.getElementById("removeGameBtn");

const reorgBtn = document.getElementById("reorgBtn");
const saveReorgBtn = document.getElementById("saveReorgBtn");

let adminUnlocked = false;
let dragMode = false;

// Render game tiles
function renderGames(filter = "") {
  gamesGrid.innerHTML = "";
  games
    .filter(g => g.name.toLowerCase().includes(filter.toLowerCase()))
    .forEach((g, index) => {
      const tile = document.createElement("div");
      tile.className = "gameTile";
      tile.innerHTML = `<img src="${g.image}" alt="${g.name}"><p>${g.name}</p>`;
      tile.onclick = () => {
        gameFrame.src = g.url;
        gameOverlay.classList.remove("hidden");
      };

      if (dragMode) {
        tile.draggable = true;
        tile.ondragstart = e => {
          e.dataTransfer.setData("index", index);
        };
        tile.ondragover = e => e.preventDefault();
        tile.ondrop = e => {
          const from = e.dataTransfer.getData("index");
          const to = index;
          [games[from], games[to]] = [games[to], games[from]];
          renderGames(searchBar.value);
        };
      }

      gamesGrid.appendChild(tile);
    });
}

// Back button
backBtn.onclick = () => {
  gameOverlay.classList.add("hidden");
  gameFrame.src = "";
};

// Search
searchBar.oninput = e => renderGames(e.target.value);

// Admin open
adminBtn.onclick = () => {
  adminPanel.classList.toggle("hidden");
};

// Code submit
submitCode.onclick = () => {
  if (adminCodeInput.value === "letmein") {
    adminUnlocked = true;
    adminControls.classList.remove("hidden");
  } else {
    alert("Wrong code!");
  }
};

// Add game
addGameBtn.onclick = () => {
  games.push({
    name: gameNameInput.value,
    url: gameUrlInput.value,
    image: gameImageInput.value
  });
  localStorage.setItem("games", JSON.stringify(games));
  renderGames();
};

// Remove game
removeGameBtn.onclick = () => {
  games = games.filter(g => g.name !== removeNameInput.value);
  localStorage.setItem("games", JSON.stringify(games));
  renderGames();
};

// Reorganize
reorgBtn.onclick = () => {
  dragMode = true;
  renderGames(searchBar.value);
};

saveReorgBtn.onclick = () => {
  dragMode = false;
  localStorage.setItem("games", JSON.stringify(games));
  renderGames(searchBar.value);
};

// Init
renderGames();
