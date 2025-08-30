const API = {
  getGames: '/api/games',
  login: '/api/admin/login',
  add: '/api/admin/add',
  remove: '/api/admin/remove',
  reorder: '/api/admin/reorder'
};

let ADMIN_TOKEN = null;
let allGames = [];

async function fetchGames(){ return (await fetch(API.getGames)).json(); }

function el(tag, attrs={}, ...children){
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
    else if (k === 'class') e.className = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  children.flat().forEach(c => typeof c === 'string' ? e.appendChild(document.createTextNode(c)) : e.appendChild(c));
  return e;
}

function displayGames(games){
  const grid = document.getElementById('games-grid');
  grid.innerHTML = '';
  games.forEach(g => {
    const card = el('div',{class:'card'},
      g.cover ? el('img',{src:g.cover}) : el('div',{style:'height:120px;background:#333;border-radius:8px;'}),
      el('h4',{},g.name),
      el('button',{onclick:()=>openGameFullscreen(g)},'Play')
    );
    grid.appendChild(card);
  });
}

async function renderGrid(){ allGames = await fetchGames(); displayGames(allGames); }

// Fullscreen game
function openGameFullscreen(g){
  document.getElementById('play-page').classList.remove('hidden');
  document.getElementById('play-title').innerText = g.name;
  document.getElementById('play-iframe').srcdoc = g.html;
}
document.getElementById('back-button').onclick = ()=>{
  document.getElementById('play-page').classList.add('hidden');
  document.getElementById('play-iframe').srcdoc='';
};

// Search
document.getElementById('search').oninput = (e)=>{
  const term = e.target.value.toLowerCase();
  displayGames(allGames.filter(g=>g.name.toLowerCase().includes(term)));
};

// Admin login
document.getElementById('admin-login').onclick = async ()=>{
  const code=document.getElementById('admin-code').value;
  const res=await fetch(API.login,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
  const j=await res.json();
  if(j.ok){ ADMIN_TOKEN=j.token; document.getElementById('admin-status').textContent='Unlocked'; openAdminPanel(); }
  else alert('Bad code');
};

function openAdminPanel(){ document.getElementById('admin-panel').classList.remove('hidden'); refreshAdmin(); }
document.getElementById('close-admin').onclick=()=>document.getElementById('admin-panel').classList.add('hidden');

// Add game
document.getElementById('add-form').onsubmit=async ev=>{
  ev.preventDefault();
  const fd=new FormData(ev.target);
  const res=await fetch(API.add,{method:'POST',headers:{'x-admin-token':ADMIN_TOKEN},body:fd});
  const j=await res.json();
  if(j.ok){ alert('Added'); ev.target.reset(); refreshAdmin(); renderGrid(); }
  else alert('Error');
};

// Remove / reorder
async function refreshAdmin(){
  const area=document.getElementById('reorder-area');
  area.innerHTML='';
  const games=await fetchGames();
  games.forEach(g=>{
    const card=el('div',{class:'reorder-card',draggable:true,'data-id':g.id},
      el('div',{},g.name),
      el('button',{onclick:()=>removeGame(g.id)},'Remove')
    );
    card.dataset.name=g.name; card.dataset.html=g.html; card.dataset.cover=g.cover||'';
    area.appendChild(card);
  });
  enableDnD(area);
}
async function removeGame(id){
  await fetch(API.remove,{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':ADMIN_TOKEN},body:JSON.stringify({id})});
  refreshAdmin(); renderGrid();
}
document.getElementById('save-order').onclick=async ()=>{
  const cards=[...document.querySelectorAll('.reorder-card')];
  const newGames=cards.map(c=>({id:c.dataset.id,name:c.dataset.name,html:c.dataset.html,cover:c.dataset.cover}));
  await fetch(API.reorder,{method:'POST',headers:{'Content-Type':'application/json','x-admin-token':ADMIN_TOKEN},body:JSON.stringify({games:newGames})});
  refreshAdmin(); renderGrid();
};

// Drag & drop reorder
function enableDnD(container){
  let dragged=null;
  container.querySelectorAll('.reorder-card').forEach(c=>{
    c.ondragstart=()=>{dragged=c;};
    c.ondragover=e=>e.preventDefault();
    c.ondrop=e=>{e.preventDefault(); if(dragged&&dragged!==c){container.insertBefore(dragged,c.nextSibling);} };
  });
}

window.onload=renderGrid;
