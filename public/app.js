// app.js (ES module)
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const API = {
  list: '/api/games',
  add: '/api/admin/add',
  remove: '/api/admin/remove',
  reorder: '/api/admin/reorder',
  login: '/api/admin/login'
};

let GAMES = [];
let ADMIN_TOKEN = null;
let removeMode = false;
let dragEnabled = false;
let draggedEl = null;

// Elements
const grid = $('#grid');
const empty = $('#empty');
const search = $('#search');

const playOverlay = $('#playOverlay');
const playFrame = $('#playFrame');
const playTitle = $('#playTitle');
const backBtn = $('#backBtn');
const openNewTab = $('#openNewTab');

const adminModal = $('#adminModal');
const openAdmin = $('#open-admin');
const closeAdmin = $('#closeAdmin');
const adminLoginBtn = $('#adminLoginBtn');
const adminCode = $('#adminCode');
const adminView = $('#adminView');
const adminLoginView = $('#adminLoginView');
const loginMsg = $('#loginMsg');

const coverFile = $('#coverFile');
const coverUrl = $('#coverUrl');
const gameName = $('#gameName');
const gameHtml = $('#gameHtml');
const addGameBtn = $('#addGameBtn');
const clearFormBtn = $('#clearForm');

const reorderArea = $('#reorderArea');
const enableDragBtn = $('#enableDrag');
const saveOrderBtn = $('#saveOrder');
const enterRemoveBtn = $('#enterRemove');

// fetch list
async function loadGames(){
  const res = await fetch(API.list);
  GAMES = await res.json();
  renderGrid();
  renderAdminList();
}

function renderGrid(){
  const q = search.value.trim().toLowerCase();
  const filtered = GAMES.filter(g => g.name.toLowerCase().includes(q));
  grid.innerHTML = '';
  if (filtered.length === 0) empty.classList.remove('hidden'); else empty.classList.add('hidden');

  filtered.forEach(g => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = g.id;

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    if (g.cover) {
      const img = document.createElement('img');
      img.src = g.cover;
      img.alt = g.name;
      img.loading = 'lazy';
      img.className = 'thumb';
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = '';
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<div><div class="title">${escapeHtml(g.name)}</div></div>
                      <div><button class="px-3 py-1 rounded bg-slate-800">Play</button></div>`;

    card.appendChild(thumb);
    card.appendChild(meta);

    // click handling
    card.addEventListener('click', (e) => {
      if (removeMode) {
        if (confirm('Remove "' + g.name + '"?')) removeGame(g.id);
        return;
      }
      if (dragEnabled) return;
      openPlay(g);
    });

    // drag & drop support
    card.draggable = dragEnabled;
    card.addEventListener('dragstart', (e) => {
      draggedEl = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      if (draggedEl) draggedEl.classList.remove('dragging');
      draggedEl = null;
    });
    card.addEventListener('dragover', (e) => { if (dragEnabled) e.preventDefault(); });
    card.addEventListener('drop', (e) => {
      if (!dragEnabled || !draggedEl) return;
      e.preventDefault();
      const fromId = draggedEl.dataset.id;
      const toId = card.dataset.id;
      reorderLocal(fromId, toId);
      renderGrid();
    });

    grid.appendChild(card);
  });
}

function reorderLocal(fromId, toId){
  const fromIdx = GAMES.findIndex(x => x.id === fromId);
  const toIdx = GAMES.findIndex(x => x.id === toId);
  if (fromIdx < 0 || toIdx < 0) return;
  const sp = GAMES.splice(fromIdx,1)[0];
  GAMES.splice(toIdx, 0, sp);
}

// play
function openPlay(g){
  playTitle.textContent = g.name;
  // Use srcdoc so pasted HTML runs inside
  playFrame.srcdoc = g.html;
  playOverlay.classList.remove('hidden');
  openNewTab.onclick = () => {
    // fallback page
    window.open('/play/' + g.id, '_blank');
  };
}
backBtn.onclick = () => {
  playFrame.srcdoc = '';
  playOverlay.classList.add('hidden');
};

// admin modal
openAdmin.onclick = () => adminModal.classList.remove('hidden');
closeAdmin.onclick = () => adminModal.classList.add('hidden');

// login
adminLoginBtn.onclick = async () => {
  const code = adminCode.value.trim();
  if (!code) return;
  const res = await fetch(API.login, {method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({code})});
  const j = await res.json();
  if (j.ok) {
    ADMIN_TOKEN = j.token;
    adminLoginView.classList.add('hidden');
    adminView.classList.remove('hidden');
    loginMsg.classList.add('hidden');
    await loadGames();
  } else {
    loginMsg.textContent = 'Invalid code';
    loginMsg.classList.remove('hidden');
  }
};

// add game
addGameBtn.onclick = async () => {
  const name = gameName.value.trim();
  const html = gameHtml.value.trim();
  if (!name || !html) return alert('Name and HTML required');

  // if user uploaded file use multipart, else use coverUrl
  const file = coverFile.files[0];
  const form = new FormData();
  form.append('name', name);
  form.append('html', html);
  if (file) form.append('cover', file);
  else if (coverUrl.value.trim()) form.append('coverUrl', coverUrl.value.trim());

  const res = await fetch(API.add, { method: 'POST', headers: { 'x-admin-token': ADMIN_TOKEN }, body: form });
  const j = await res.json();
  if (j.ok) {
    // clear and reload
    gameName.value = '';
    gameHtml.value = '';
    coverFile.value = '';
    coverUrl.value = '';
    await loadGames();
    alert('Game added');
  } else {
    alert('Error: ' + (j.error || 'unknown'));
  }
};

// remove
async function removeGame(id){
  const res = await fetch(API.remove, { method:'POST', headers: {'Content-Type':'application/json','x-admin-token': ADMIN_TOKEN}, body: JSON.stringify({ id })});
  const j = await res.json();
  if (j.ok) { await loadGames(); }
  else alert('Error removing');
}

// admin list (reorder area)
function renderAdminList(){
  reorderArea.innerHTML = '';
  GAMES.forEach(g => {
    const r = document.createElement('div');
    r.className = 'reorder-card flex items-center justify-between';
    r.dataset.id = g.id;
    r.innerHTML = `<div class="text-sm">${escapeHtml(g.name)}</div><div class="flex gap-2">
      <button data-id="${g.id}" class="remove-btn px-2 py-1 bg-red-600 rounded text-sm">Remove</button>
    </div>`;
    r.draggable = dragEnabled;
    r.addEventListener('dragstart', (e) => { draggedEl = r; r.classList.add('dragging') });
    r.addEventListener('dragend', () => { if (draggedEl) draggedEl.classList.remove('dragging'); draggedEl = null; });
    r.addEventListener('dragover', (e) => { if (dragEnabled) e.preventDefault(); });
    r.addEventListener('drop', (e) => {
      if (!dragEnabled || !draggedEl) return;
      e.preventDefault();
      const fromId = draggedEl.dataset.id;
      const toId = r.dataset.id;
      reorderLocal(fromId, toId);
      renderAdminList();
    });
    reorderArea.appendChild(r);
  });

  // wire remove buttons
  $$('.remove-btn').forEach(btn => {
    btn.onclick = async (e) => {
      const id = btn.dataset.id;
      if (!confirm('Remove this game?')) return;
      await removeGame(id);
    };
  });
}

// enable drag
enableDragBtn.onclick = () => {
  dragEnabled = !dragEnabled;
  enableDragBtn.textContent = dragEnabled ? 'Disable Drag' : 'Enable Drag';
  document.querySelectorAll('.reorder-card').forEach(el => el.draggable = dragEnabled);
};

// save order (POST current GAMES)
saveOrderBtn.onclick = async () => {
  const payload = { games: GAMES.map(g => ({ id: g.id, name: g.name, html: g.html, cover: g.cover, slug: g.slug })) };
  const res = await fetch(API.reorder, { method:'POST', headers: {'Content-Type':'application/json','x-admin-token': ADMIN_TOKEN }, body: JSON.stringify(payload) });
  const j = await res.json();
  if (j.ok) alert('Order saved for everyone');
  else alert('Error saving order');
};

// enter remove mode
enterRemoveBtn.onclick = () => {
  removeMode = !removeMode;
  enterRemoveBtn.textContent = removeMode ? 'Exit Remove' : 'Remove Mode';
};

// utility escape
function escapeHtml(s='') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// search
search.addEventListener('input', () => renderGrid());

// init
loadGames();
