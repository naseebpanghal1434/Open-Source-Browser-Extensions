// --- Utility Functions ---
function getRootDomain(url) {
  try {
    const u = new URL(url);
    const parts = u.hostname.split('.');
    if (parts.length > 2) {
      return parts.slice(-2).join('.');
    }
    return u.hostname;
  } catch (e) {
    return url;
  }
}

function formatDate(ts) {
  return new Date(ts).toLocaleString();
}

// --- State ---
let allNotes = {};
let filteredNotes = {};
let settings = {
  perDomain: true,
  overlaySize: 'normal',
  theme: 'system',
};

// --- DOM Elements ---
const notesList = document.getElementById('notesList');
const searchInput = document.getElementById('searchInput');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');
const clearAllBtn = document.getElementById('clearAllBtn');
const perDomainToggle = document.getElementById('perDomainToggle');
const overlaySizeSelect = document.getElementById('overlaySizeSelect');
const themeSelect = document.getElementById('themeSelect');
const reloadIcon = document.getElementById('reloadIcon');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadNotes();
  renderNotes();
  setupEventListeners();
  applyTheme();
});

async function loadSettings() {
  const result = await chrome.storage.sync.get(['perDomain', 'overlaySize', 'theme']);
  settings.perDomain = result.perDomain !== undefined ? result.perDomain : true;
  settings.overlaySize = result.overlaySize || 'normal';
  settings.theme = result.theme || 'system';
  perDomainToggle.checked = settings.perDomain;
  overlaySizeSelect.value = settings.overlaySize;
  themeSelect.value = settings.theme;
}

async function saveSettings() {
  await chrome.storage.sync.set({
    perDomain: perDomainToggle.checked,
    overlaySize: overlaySizeSelect.value,
    theme: themeSelect.value,
  });
}

async function loadNotes() {
  allNotes = {};
  const result = await chrome.storage.local.get(null);
  for (const key in result) {
    if (key.startsWith('quick_notes_')) {
      allNotes[key] = result[key];
    }
  }
  filteredNotes = { ...allNotes };
}

function renderNotes() {
  notesList.innerHTML = '';
  const keys = Object.keys(filteredNotes);
  if (keys.length === 0) {
    notesList.innerHTML = '<div>No notes found.</div>';
    return;
  }
  keys.forEach(key => {
    const note = filteredNotes[key];
    const domain = key.replace('quick_notes_', '');
    const item = document.createElement('div');
    item.className = 'note-item';
    item.innerHTML = `
      <div class="note-header">
        <span class="note-domain" title="Open ${domain}">${domain}</span>
        <span class="note-actions">
          <button class="editBtn" title="Edit">✏️</button>
          <button class="deleteBtn" title="Delete">🗑️</button>
        </span>
      </div>
      <div class="note-preview">${note.content ? note.content.substring(0, 120).replace(/</g, '&lt;') + (note.content.length > 120 ? '...' : '') : '<i>No content</i>'}</div>
      <div class="note-date">Last modified: ${formatDate(note.timestamp)}</div>
    `;
    // Make domain clickable
    item.querySelector('.note-domain').onclick = () => {
      window.open('https://' + domain, '_blank');
    };
    // Edit
    item.querySelector('.editBtn').onclick = () => editNote(key, note);
    // Delete
    item.querySelector('.deleteBtn').onclick = () => deleteNote(key);
    notesList.appendChild(item);
  });
}

function setupEventListeners() {
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      filteredNotes = { ...allNotes };
    } else {
      filteredNotes = {};
      for (const key in allNotes) {
        const note = allNotes[key];
        const domain = key.replace('quick_notes_', '');
        if (domain.toLowerCase().includes(q) || (note.content && note.content.toLowerCase().includes(q))) {
          filteredNotes[key] = note;
        }
      }
    }
    renderNotes();
  });
  exportBtn.onclick = exportNotes;
  importBtn.onclick = () => importFileInput.click();
  importFileInput.onchange = importNotes;
  clearAllBtn.onclick = clearAllNotes;
  reloadIcon.onclick = async () => {
    await loadSettings();
    await loadNotes();
    renderNotes();
    applyTheme();
  };
  perDomainToggle.onchange = () => { saveSettings(); };
  overlaySizeSelect.onchange = () => { saveSettings(); };
  themeSelect.onchange = () => { saveSettings(); applyTheme(); };
}

function editNote(key, note) {
  const newContent = prompt('Edit note:', note.content || '');
  if (newContent !== null) {
    chrome.storage.local.set({ [key]: { ...note, content: newContent, timestamp: Date.now() } }, () => {
      loadNotes().then(renderNotes);
    });
  }
}

function deleteNote(key) {
  if (confirm('Delete this note?')) {
    chrome.storage.local.remove(key, () => {
      loadNotes().then(renderNotes);
    });
  }
}

function exportNotes() {
  const data = JSON.stringify(allNotes, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'quick-notes-export.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importNotes(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      chrome.storage.local.set(imported, () => {
        loadNotes().then(renderNotes);
        alert('Notes imported!');
      });
    } catch (err) {
      alert('Invalid file format.');
    }
  };
  reader.readAsText(file);
}

function clearAllNotes() {
  if (confirm('Delete ALL notes? This cannot be undone.')) {
    const keys = Object.keys(allNotes);
    chrome.storage.local.remove(keys, () => {
      loadNotes().then(renderNotes);
    });
  }
}

function applyTheme() {
  const theme = themeSelect.value;
  if (theme === 'system') {
    document.body.removeAttribute('data-theme');
  } else {
    document.body.setAttribute('data-theme', theme);
  }
} 