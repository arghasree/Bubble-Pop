// ----- helpers -----
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const uid = () => Math.random().toString(16).slice(2, 8);
const pad2 = (n) => String(n).padStart(2, "0");

function lightenColor(hex, percent) {
  // Convert hex to RGB
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) + Math.round(2.55 * percent);
  const g = ((num >> 8) & 0x00FF) + Math.round(2.55 * percent);
  const b = (num & 0x0000FF) + Math.round(2.55 * percent);
  
  return `rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)})`;
}

function darkenColor(hex, percent) {
  // Convert hex to RGB
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) - Math.round(2.55 * percent);
  const g = ((num >> 8) & 0x00FF) - Math.round(2.55 * percent);
  const b = (num & 0x0000FF) - Math.round(2.55 * percent);
  
  return `rgb(${Math.max(0, r)}, ${Math.max(0, g)}, ${Math.max(0, b)})`;
}

function getRealisticBubbleColor() {
  // Generate light, vibrant pastel colors for bubbles
  const pastels = [
    'rgba(255, 180, 210, 0.4)',  // Vibrant light pink
    'rgba(180, 210, 255, 0.4)',  // Vibrant light blue
    'rgba(210, 180, 255, 0.4)',  // Vibrant light purple
    'rgba(180, 255, 210, 0.4)',  // Vibrant light green
    'rgba(255, 230, 180, 0.4)',  // Vibrant light peach
    'rgba(180, 245, 255, 0.4)',  // Vibrant light cyan
    'rgba(255, 210, 180, 0.4)',  // Vibrant light coral
    'rgba(230, 180, 255, 0.4)',  // Vibrant light lavender
  ];
  return pastels[Math.floor(Math.random() * pastels.length)];
}

function msToHMS(ms) {
  ms = Math.max(0, Math.floor(ms));
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${hh}:${pad2(mm)}:${pad2(ss)}`;
}

function hmsToMs(h, m, s) {
  h = Number(h) || 0;
  m = Number(m) || 0;
  s = Number(s) || 0;
  if (h < 0 || m < 0 || s < 0) return 0;
  if (m > 59) m = 59;
  if (s > 59) s = 59;
  return (h * 3600 + m * 60 + s) * 1000;
}

// Duration -> radius mapping.
// Adjust these to taste.
const MIN_RADIUS = 22;           // px
const MAX_RADIUS = 70;           // px
const MIN_REF_MINUTES = 5;       // <= 5 min => near MIN_RADIUS
const MAX_REF_MINUTES = 240;     // >= 4 hrs => near MAX_RADIUS

function durationMsToRadius(ms) {
  const minutes = ms / 60000;
  // log-ish curve gives better spread
  const a = Math.log(1 + MIN_REF_MINUTES);
  const b = Math.log(1 + MAX_REF_MINUTES);
  const t = clamp((Math.log(1 + minutes) - a) / (b - a), 0, 1);
  return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
}

const COLORS = [
  { name: "Red",       value: "#ffb3c1" },
  { name: "Orange",    value: "#ffd4b3" },
  { name: "Yellow",    value: "#ffe9b3" },
  { name: "Green",     value: "#b3e6c9" },
  { name: "Teal",      value: "#b3e8f0" },
  { name: "Blue",      value: "#b3d4ff" },
  { name: "Indigo",    value: "#cfc4ff" },
  { name: "Purple",    value: "#e6c4ff" },
  { name: "Gray",      value: "#d6dae0" },
  { name: "White",     value: "#f5f6f8" },
];

// ----- sound effects -----
function playPopSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Create a pop sound: quick high-to-low frequency sweep
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
    
    // Quick volume envelope
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.type = 'sine';
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // Silent fail if audio context not supported
    console.warn('Audio not supported:', e);
  }
}

// ----- DOM -----
const bucket = document.getElementById("bucket");

const newProjectBtn = document.getElementById("newProjectBtn");
const addBallBtn = document.getElementById("addBallBtn");
const clearProjectBtn = document.getElementById("clearProjectBtn");

const tabsRow = document.getElementById("tabsRow");
const projectTitle = document.getElementById("projectTitle");
const projectSubtitle = document.getElementById("projectSubtitle");
const projectMeta = document.getElementById("projectMeta");

// Selection panel
const noSelection = document.getElementById("noSelection");
const selectionUI = document.getElementById("selectionUI");
const ballNameEl = document.getElementById("ballName");
const ballIdEl = document.getElementById("ballId");
const ballTotalEl = document.getElementById("ballTotal");
const ballRemainingEl = document.getElementById("ballRemaining");
const ballStateEl = document.getElementById("ballState");
const ballColorDotEl = document.getElementById("ballColorDot");

const toggleBtn = document.getElementById("toggleBtn");
const resetBtn = document.getElementById("resetBtn");
const renameBtn = document.getElementById("renameBtn");
const recolorBtn = document.getElementById("recolorBtn");
const popBtn = document.getElementById("popBtn");
const deleteBtn = document.getElementById("deleteBtn");

// Selected panel
const selectedPanel = document.getElementById("selectedPanel");
const selectedToggle = document.getElementById("selectedToggle");

// History panel
const historyPanel = document.getElementById("historyPanel");
const historyToggle = document.getElementById("historyToggle");
const historyList = document.getElementById("historyList");

// Add-ball modal
const modalBackdrop = document.getElementById("modalBackdrop");
const addBallModal = document.getElementById("addBallModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const createBallBtn = document.getElementById("createBallBtn");

const newBallNameIn = document.getElementById("newBallName");
const colorPalette = document.getElementById("colorPalette");
const hIn = document.getElementById("hIn");
const mIn = document.getElementById("mIn");
const sIn = document.getElementById("sIn");

// Project modal
const projectModal = document.getElementById("projectModal");
const closeProjectModalBtn = document.getElementById("closeProjectModalBtn");
const createProjectBtn = document.getElementById("createProjectBtn");
const newProjectNameIn = document.getElementById("newProjectName");

// ----- app state -----
/**
projects = [
  { id, name, balls: Map(ballId -> ballState) }
]
ballState = {
  id, name, color,
  totalMs, remainingMs,
  radiusPx,
  size01 (remaining/total),
  state: "idle"|"running"|"popped",
  el
}
**/
let projects = [];
let activeProjectId = null;
let selectedBallId = null;
let selectedColor = COLORS[5].value; // default blue
let poppedHistory = []; // Track recently popped bubbles

const STORAGE_KEY = "bucket_balls_v2";

// ----- persistence -----
function save() {
  const data = {
    activeProjectId,
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      balls: Array.from(p.balls.values()).map(b => ({
        id: b.id,
        name: b.name,
        color: b.color,
        totalMs: b.totalMs,
        remainingMs: b.remainingMs,
        radiusPx: b.radiusPx,
        state: b.state,
        // positions
        left: b.el ? b.el.style.left : "0px",
        top: b.el ? b.el.style.top : "0px",
      }))
    }))
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);

    projects = data.projects.map(p => ({
      id: p.id,
      name: p.name,
      balls: new Map()
    }));
    activeProjectId = data.activeProjectId || (projects[0]?.id ?? null);

    // rebuild balls into maps
    for (const p of data.projects) {
      const proj = projects.find(x => x.id === p.id);
      for (const b of p.balls) {
        proj.balls.set(b.id, { ...b, el: null, size01: b.totalMs > 0 ? clamp(b.remainingMs / b.totalMs, 0, 1) : 0 });
      }
    }
    return true;
  } catch {
    return false;
  }
}

// ----- UI: tabs/projects -----
function getActiveProject() {
  return projects.find(p => p.id === activeProjectId) || null;
}

function renderTabs() {
  tabsRow.innerHTML = "";
  for (const p of projects) {
    const btn = document.createElement("button");
    btn.className = "tab" + (p.id === activeProjectId ? " active" : "");
    btn.textContent = p.name;
    btn.addEventListener("click", () => {
      setActiveProject(p.id);
    });
    tabsRow.appendChild(btn);
  }
}

function setActiveProject(projectId) {
  activeProjectId = projectId;
  selectedBallId = null;
  renderTabs();
  renderActiveProject();
  save();
}

function createProject(name) {
  const p = { id: uid(), name, balls: new Map() };
  projects.push(p);
  setActiveProject(p.id);
}

function deleteActiveProject() {
  const p = getActiveProject();
  if (!p) return;

  const confirmDelete = confirm(`Delete project "${p.name}"? This cannot be undone.`);
  if (!confirmDelete) return;

  // Remove DOM balls
  for (const b of p.balls.values()) {
    b.el?.remove();
  }

  // Remove project from array
  projects = projects.filter(pr => pr.id !== p.id);

  // If no projects remain, leave empty state
  if (projects.length === 0) {
    activeProjectId = null;
  } else {
    setActiveProject(projects[0].id);
  }

  selectedBallId = null;
  renderTabs();
  renderActiveProject();
  save();
}


// ----- balls DOM -----
function placeBallElement(el, radiusPx) {
  const rect = bucket.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const x = (Math.random() * (w - 2 * radiusPx)) + radiusPx;
  const y = (Math.random() * (h - 2 * radiusPx)) + radiusPx;
  el.style.left = `${x - radiusPx}px`;
  el.style.top = `${y - radiusPx}px`;
}

function applyBallVisual(ball) {
  const d = ball.radiusPx * 2;
  ball.el.style.width = `${d}px`;
  ball.el.style.height = `${d}px`;
  
  // Create a very light bubble with vibrant colorful iridescent edges
  ball.el.style.background = `
    radial-gradient(circle at 20% 20%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.4) 8%, transparent 15%),
    radial-gradient(circle at 50% 50%, transparent 65%, rgba(255,150,200,0.5) 80%, rgba(150,200,255,0.6) 88%, rgba(200,255,180,0.5) 95%, transparent 100%),
    radial-gradient(circle at 50% 50%, ${ball.color}, rgba(255,255,255,0.02))
  `;

  // scale by remaining fraction; keep small minimum visible size
  const minScale = 0.14;
  const frac = ball.totalMs > 0 ? clamp(ball.remainingMs / ball.totalMs, 0, 1) : 0;
  ball.size01 = frac;
  const scale = frac * (1 - minScale) + minScale;
  ball.el.style.transform = `scale(${scale})`;

  const label = ball.el.querySelector(".ballLabel");
  label.textContent = ball.name;
}

function makeBallElement(ball) {
  const el = document.createElement("div");
  el.className = "ball";
  el.dataset.id = ball.id;

  const label = document.createElement("div");
  label.className = "ballLabel";
  el.appendChild(label);

  // Drag and drop functionality
  let isDragging = false;
  let dragStartX, dragStartY, elementStartX, elementStartY;

  el.addEventListener("mousedown", (e) => {
    // Prevent dragging if clicking on certain small areas
    if (e.target !== el && e.target !== label) return;
    
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    const rect = el.getBoundingClientRect();
    elementStartX = rect.left - bucket.getBoundingClientRect().left;
    elementStartY = rect.top - bucket.getBoundingClientRect().top;
    
    el.style.cursor = "grabbing";
    e.preventDefault(); // Prevent text selection
  });

  const onMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    const newX = elementStartX + deltaX;
    const newY = elementStartY + deltaY;
    
    // Get bucket dimensions
    const bucketRect = bucket.getBoundingClientRect();
    const ballRadius = ball.radiusPx;
    
    // Clamp position to keep ball within bucket
    const clampedX = clamp(newX, 0, bucketRect.width - ballRadius * 2);
    const clampedY = clamp(newY, 0, bucketRect.height - ballRadius * 2);
    
    el.style.left = `${clampedX}px`;
    el.style.top = `${clampedY}px`;
  };

  const onMouseUp = (e) => {
    if (isDragging) {
      isDragging = false;
      el.style.cursor = "pointer";
      save(); // Save new position
      
      // Only trigger selection if we didn't move much (it was a click, not a drag)
      const deltaX = Math.abs(e.clientX - dragStartX);
      const deltaY = Math.abs(e.clientY - dragStartY);
      if (deltaX < 5 && deltaY < 5) {
        setSelectedBall(ball.id);
      }
    }
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);

  return el;
}

function popBall(ball) {
  if (ball.state === "popped") return;
  ball.state = "popped";
  ball.el.classList.add("pop");
  
  // Play pop sound
  playPopSound();
  
  // Add to history
  addToHistory(ball.name, ball.totalMs);
  
  setTimeout(() => {
    const p = getActiveProject();
    if (p) p.balls.delete(ball.id);
    if (selectedBallId === ball.id) setSelectedBall(null);
    ball.el.remove();
    save();
    renderActiveProjectMeta();
  }, 220);
}

function deleteBall(ball) {
  const p = getActiveProject();
  if (!p) return;
  p.balls.delete(ball.id);
  ball.el.remove();
  if (selectedBallId === ball.id) setSelectedBall(null);
  save();
  renderActiveProjectMeta();
}

function resetBall(ball) {
  ball.remainingMs = ball.totalMs;
  ball.state = "idle";
  applyBallVisual(ball);
  updateSelectionPanel();
  save();
}

function toggleBall(ball) {
  if (ball.state === "popped") return;
  ball.state = (ball.state === "running") ? "idle" : "running";
  updateSelectionPanel();
  save();
}

// ----- selection panel -----
function getSelectedBall() {
  const p = getActiveProject();
  if (!p || !selectedBallId) return null;
  return p.balls.get(selectedBallId) || null;
}

function setSelectedBall(ballId) {
  const p = getActiveProject();
  // clear old highlight
  if (p && selectedBallId && p.balls.has(selectedBallId)) {
    p.balls.get(selectedBallId).el.classList.remove("selected");
  }
  selectedBallId = ballId;

  if (!p || !ballId || !p.balls.has(ballId)) {
    selectedBallId = null;
    noSelection.classList.remove("hidden");
    selectionUI.classList.add("hidden");
    // Hide selected panel and show history when no ball selected
    selectedPanel.classList.remove("expanded");
    historyPanel.classList.add("expanded");
    return;
  }

  p.balls.get(ballId).el.classList.add("selected");

  noSelection.classList.add("hidden");
  selectionUI.classList.remove("hidden");
  // Show selected panel and hide history when ball is selected
  selectedPanel.classList.add("expanded");
  historyPanel.classList.remove("expanded");
  updateSelectionPanel();
}

function updateSelectionPanel() {
  const ball = getSelectedBall();
  if (!ball) return;

  ballNameEl.textContent = ball.name;
  ballIdEl.textContent = ball.id;
  ballTotalEl.textContent = msToHMS(ball.totalMs);
  ballRemainingEl.textContent = msToHMS(ball.remainingMs);
  ballStateEl.textContent = ball.state;
  ballColorDotEl.style.background = ball.color;

  toggleBtn.textContent = (ball.state === "running") ? "Pause" : "Start";
}

// ----- render active project -----
function renderActiveProjectMeta() {
  const p = getActiveProject();
  if (!p) return;
  const n = p.balls.size;

  let running = 0;
  let totalRemaining = 0;
  for (const b of p.balls.values()) {
    if (b.state === "running") running++;
    totalRemaining += Math.max(0, b.remainingMs);
  }

  projectMeta.textContent = `${n} balls • ${running} running`;
  projectSubtitle.textContent = `Total remaining across balls: ${msToHMS(totalRemaining)}`;
}

function renderActiveProject() {
  const p = getActiveProject();
  bucket.innerHTML = "";
  if (!p) {
    projectTitle.textContent = "No project selected";
    projectSubtitle.textContent = "Create a project to begin.";
    projectMeta.textContent = "";
    setSelectedBall(null);
    return;
  }

  projectTitle.textContent = p.name;
  renderActiveProjectMeta();

  // rebuild DOM balls
  for (const ball of p.balls.values()) {
    const el = makeBallElement(ball);
    ball.el = el;
    bucket.appendChild(el);

    // restore position if exists else place random
    if (ball.left && ball.top) {
      el.style.left = ball.left;
      el.style.top = ball.top;
    } else {
      placeBallElement(el, ball.radiusPx);
    }

    applyBallVisual(ball);
  }

  setSelectedBall(null);
}

// ----- add ball modal (required fields) -----
function openModal(which) {
  modalBackdrop.classList.remove("hidden");
  if (which === "ball") addBallModal.classList.remove("hidden");
  if (which === "project") projectModal.classList.remove("hidden");
}
function closeModals() {
  modalBackdrop.classList.add("hidden");
  addBallModal.classList.add("hidden");
  projectModal.classList.add("hidden");
}

function renderPalette() {
  colorPalette.innerHTML = "";
  for (const c of COLORS) {
    const sw = document.createElement("div");
    sw.className = "swatch" + (c.value === selectedColor ? " selected" : "");
    sw.title = c.name;
    sw.style.background = c.value;
    sw.addEventListener("click", () => {
      selectedColor = c.value;
      renderPalette();
    });
    colorPalette.appendChild(sw);
  }
}

function addBallFromModal() {
  const p = getActiveProject();
  if (!p) return;

  const name = (newBallNameIn.value || "").trim();
  const totalMs = hmsToMs(hIn.value, mIn.value, sIn.value);

  // Required: name and duration > 0
  if (!name) return;
  if (totalMs <= 0) return;

  const radiusPx = durationMsToRadius(totalMs);

  const ball = {
    id: uid(),
    name,
    color: getRealisticBubbleColor(),
    totalMs,
    remainingMs: totalMs,
    radiusPx,
    size01: 1,
    state: "idle",
    el: null,
    left: null,
    top: null,
  };

  const el = makeBallElement(ball);
  ball.el = el;
  bucket.appendChild(el);

  placeBallElement(el, radiusPx);
  ball.left = el.style.left;
  ball.top = el.style.top;

  applyBallVisual(ball);
  p.balls.set(ball.id, ball);

  setSelectedBall(ball.id);
  renderActiveProjectMeta();
  save();
  closeModals();
}

// ----- rename/recolor -----
function renameSelected() {
  const b = getSelectedBall();
  if (!b) return;
  const n = prompt("New name:", b.name);
  if (!n) return;
  b.name = n.trim().slice(0, 40) || b.name;
  applyBallVisual(b);
  updateSelectionPanel();
  save();
}

function recolorSelected() {
  const b = getSelectedBall();
  if (!b) return;

  // minimal recolor: cycle palette via prompt
  const choices = COLORS.map((c, i) => `${i+1}) ${c.name}`).join("\n");
  const ans = prompt(`Pick color number:\n${choices}`, "6");
  const idx = Number(ans) - 1;
  if (!Number.isFinite(idx) || idx < 0 || idx >= COLORS.length) return;
  b.color = COLORS[idx].value;
  applyBallVisual(b);
  updateSelectionPanel();
  save();
}

// ----- animation loop -----
let lastT = performance.now();
function tick(now) {
  const dt = now - lastT;
  lastT = now;

  const p = getActiveProject();
  if (p) {
    let anyChange = false;
    for (const ball of p.balls.values()) {
      if (ball.state !== "running") continue;
      ball.remainingMs -= dt;
      anyChange = true;

      if (ball.remainingMs <= 0) {
        ball.remainingMs = 0;
        applyBallVisual(ball);
        popBall(ball);
        continue;
      }
      applyBallVisual(ball);
    }

    if (anyChange) {
      // live update selected panel and project meta
      if (getSelectedBall()) updateSelectionPanel();
      renderActiveProjectMeta();
      save();
    }
  }

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// ----- wire events -----
addBallBtn.addEventListener("click", () => {
  renderPalette();
  newBallNameIn.value = "";
  hIn.value = ""; mIn.value = ""; sIn.value = "";
  openModal("ball");
  newBallNameIn.focus();
});

createBallBtn.addEventListener("click", addBallFromModal);
closeModalBtn.addEventListener("click", closeModals);
modalBackdrop.addEventListener("click", closeModals);

newProjectBtn.addEventListener("click", () => {
  newProjectNameIn.value = "";
  openModal("project");
  newProjectNameIn.focus();
});

createProjectBtn.addEventListener("click", () => {
  const name = (newProjectNameIn.value || "").trim();
  if (!name) return;
  createProject(name.slice(0, 30));
  closeModals();
  save();
});

closeProjectModalBtn.addEventListener("click", closeModals);

const deleteProjectBtn = document.getElementById("deleteProjectBtn");
deleteProjectBtn.addEventListener("click", deleteActiveProject);

// Selected controls
toggleBtn.addEventListener("click", () => {
  const b = getSelectedBall();
  if (!b) return;
  toggleBall(b);
});
resetBtn.addEventListener("click", () => {
  const b = getSelectedBall();
  if (!b) return;
  resetBall(b);
});
renameBtn.addEventListener("click", renameSelected);
recolorBtn.addEventListener("click", recolorSelected);

popBtn.addEventListener("click", () => {
  const b = getSelectedBall();
  if (!b) return;
  popBall(b);
});
deleteBtn.addEventListener("click", () => {
  const b = getSelectedBall();
  if (!b) return;
  deleteBall(b);
});

// Keyboard shortcut: Space toggles selected
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    const b = getSelectedBall();
    if (!b) return;
    e.preventDefault();
    toggleBall(b);
  }
});

// History panel toggle
historyToggle.addEventListener("click", () => {
  historyPanel.classList.toggle("expanded");
});

// Selected panel toggle
selectedToggle.addEventListener("click", () => {
  selectedPanel.classList.toggle("expanded");
});

// ----- History Management -----
function addToHistory(name, totalMs) {
  const timestamp = new Date();
  poppedHistory.unshift({
    name,
    duration: msToHMS(totalMs),
    time: timestamp.toLocaleTimeString(),
    date: timestamp.toLocaleDateString()
  });
  
  // Keep only last 20 entries
  if (poppedHistory.length > 20) {
    poppedHistory = poppedHistory.slice(0, 20);
  }
  
  renderHistory();
}

function renderHistory() {
  if (poppedHistory.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No bubbles popped yet!</div>';
    return;
  }
  
  historyList.innerHTML = poppedHistory.map(item => `
    <div class="history-item">
      <div class="history-item-name">${item.name}</div>
      <div class="history-item-time">Duration: ${item.duration} • ${item.time}</div>
    </div>
  `).join('');
}

// ----- init -----
(function init() {
  const ok = load();
  if (!ok) {
    // First load: start with no projects by default
    projects = [];
    activeProjectId = null;
  } else {
    // Cleanup legacy auto-created defaults (only if both are empty)
    const legacyDefaults =
      projects.length === 2 &&
      projects.some(p => p.name === "Work") &&
      projects.some(p => p.name === "Food") &&
      projects.every(p => p.balls.size === 0);

    if (legacyDefaults) {
      projects = [];
      activeProjectId = null;
    }

    renderTabs();
    renderActiveProject();
  }
  renderTabs();
  renderActiveProject();
  renderHistory();
  save();
})();
