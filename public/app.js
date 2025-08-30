let games = [];
let isAdmin = false;
let removeMode = false;
let reorderMode = false;
let draggedId = null;

async function fetchGames() {
  const res = await fetch("/api/games");
  games = await res.json();
  renderGames();
}

function renderGames() {
  const search = document.getElementById("search").value.toLowerCase();
  const container = document.getElementById("games");
  container.innerHTML = "";

  games.filter(g => g.name.toLowerCase().includes(search)).forEach(g => {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.draggable = reorderMode;
    tile.dataset.id = g.id;

    tile.innerHTML = `
      <img src="${g.cover}" alt="${g.name}">
      <p>${g.name}</p>
    `;

    tile.onclick = () => {
      if (removeMode) {
        deleteGame(g.id);
      } else if (!reorderMode) {
        window.location = "/game/" + g.id;
      }
    };

    tile.ondragstart = e => {
      draggedId = g.id;
    };

    tile.ondragover = e => e.preventDefault();

    tile.ondrop = e => {
      e.preventDefault();
      const from = games.findIndex(x => x.id == draggedId);
      const to = games.findIndex(x => x.id == g.id);
      const moved = games.splice(from, 1)[0];
      games.splice(to, 0, moved);
      renderGames();
    };

    container.appendChild(tile);
  });
}

async function addGame() {
  const name = document.getElementById("gameName").value;
  const cover = document.getElementById("gameCover").value;
  const html = document.getElementById("gameHTML").value;

  await fetch("/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, cover, html })
  });

  fetchGames();
}

async function deleteGame(id) {
  await fetch("/api/games/" + id, { method: "DELETE" });
  fetchGames();
}

function enableRemove() {
  removeMode = !removeMode;
  reorderMode = false;
  renderGames();
}

function enableReorder() {
  reorderMode = !reorderMode;
  removeMode = false;
  renderGames();
}

async function saveReorder() {
  await fetch("/api/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order: games.map(g => g.id) })
  });
  alert("Order saved!");
}

function loginAdmin() {
  const code = document.getElementById("adminCode").value;
  if (code === "letmein123") {
    isAdmin = true;
    document.getElementById("adminPanel").style.display = "block";
  } else {
    alert("Wrong code");
  }
}

document.getElementById("search").oninput = renderGames;

fetchGames();
