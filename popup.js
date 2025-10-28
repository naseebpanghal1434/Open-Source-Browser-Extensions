// Constants
const DEBOUNCE_DELAY = 500; // ms
const STORAGE_KEY_PREFIX = 'quick_notes_';
const TASKS_KEY = 'quick_notes_tasks';
const SETTINGS_KEY = 'quick_notes_settings';

// Utility: Extract root domain from a URL
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

// DOM Elements
const noteEditor = document.getElementById('noteEditor');
const charCount = document.getElementById('charCount');
const wordCount = document.getElementById('wordCount');
const lastModified = document.getElementById('lastModified');
const saveStatus = document.getElementById('saveStatus');
const clearBtn = document.getElementById('clearBtn');
const floatBtn = document.getElementById('floatBtn');
const expandBtn = document.getElementById('expandBtn');
const manageBtn = document.getElementById('manageBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.querySelector('.close-modal');
const saveSettingsBtn = document.getElementById('saveSettings');
const defaultTabSelect = document.getElementById('defaultTab');
const perDomainSelect = document.getElementById('perDomainSetting');
const eodEditor = document.getElementById('eodEditor');

// Tab elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Task containers
const mitsContainer = document.getElementById('mitsContainer');
const todayContainer = document.getElementById('todayContainer');
const addTaskBtns = document.querySelectorAll('.add-task-btn');

// State
let currentUrl = '';
let currentDomain = '';
let saveTimeout = null;
let isSaving = false;
let perDomain = true;
let tasks = {
  mits: [],
  today: []
};
let settings = {
  defaultTab: 'tasks',
  perDomain: true
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get current tab URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl = tab?.url || '';
    currentDomain = getRootDomain(currentUrl);

    // Load settings
    await loadSettings();

    // Load tasks
    await loadTasks();

    // Load note
    await loadNote();

    // Load EOD notes
    await loadEODNotes();

    // Set default tab
    switchTab(settings.defaultTab);

    // Focus editor
    noteEditor.focus();

    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Initialization error:', error);
  }
});

// Event Listeners
function setupEventListeners() {
  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Notes tab listeners
  noteEditor.addEventListener('input', handleInput);
  noteEditor.addEventListener('keydown', handleKeyDown);
  clearBtn.addEventListener('click', handleClear);

  // EOD notes
  eodEditor.addEventListener('input', () => {
    debounceSave(() => saveEODNotes());
  });

  // Task buttons
  addTaskBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const section = e.target.getAttribute('data-section');
      addTask(section);
    });
  });

  // Floating note buttons
  floatBtn.addEventListener('click', () => handleFloatingNote('normal'));
  expandBtn.addEventListener('click', () => handleFloatingNote('expanded'));

  // Settings modal
  settingsBtn.addEventListener('click', openSettings);
  closeModalBtn.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', saveSettings);

  // Close modal when clicking outside
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettings();
    }
  });

  // Manage button
  manageBtn.addEventListener('click', () => {
    window.open('manage.html');
  });

  // Window close
  window.addEventListener('unload', () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveNote();
      saveTasks();
      saveEODNotes();
    }
  });
}

// Tab Switching
function switchTab(tabName) {
  tabBtns.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  tabContents.forEach(content => {
    if (content.id === tabName + 'Tab') {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
}

// Settings Functions
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(SETTINGS_KEY);
    if (result[SETTINGS_KEY]) {
      settings = { ...settings, ...result[SETTINGS_KEY] };
    }
    perDomain = settings.perDomain;
    defaultTabSelect.value = settings.defaultTab;
    perDomainSelect.value = String(settings.perDomain);
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

function openSettings() {
  settingsModal.style.display = 'flex';
}

function closeSettings() {
  settingsModal.style.display = 'none';
}

async function saveSettings() {
  settings.defaultTab = defaultTabSelect.value;
  settings.perDomain = perDomainSelect.value === 'true';
  perDomain = settings.perDomain;

  try {
    await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
    closeSettings();
    showStatus('Settings saved!');
  } catch (error) {
    console.error('Error saving settings:', error);
    showError('Failed to save settings');
  }
}

// Task Management
async function loadTasks() {
  try {
    const key = TASKS_KEY + '_' + (perDomain ? currentDomain : currentUrl);
    const result = await chrome.storage.local.get(key);
    if (result[key]) {
      tasks = result[key];
    }
    renderTasks();
  } catch (error) {
    console.error('Error loading tasks:', error);
  }
}

async function saveTasks() {
  try {
    const key = TASKS_KEY + '_' + (perDomain ? currentDomain : currentUrl);
    await chrome.storage.local.set({ [key]: tasks });
  } catch (error) {
    console.error('Error saving tasks:', error);
  }
}

function addTask(section) {
  const taskText = prompt('Enter task:');
  if (taskText && taskText.trim()) {
    tasks[section].push({
      id: Date.now(),
      text: taskText.trim(),
      completed: false
    });
    renderTasks();
    saveTasks();
  }
}

function toggleTask(section, id) {
  const task = tasks[section].find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    renderTasks();
    saveTasks();
  }
}

function deleteTask(section, id) {
  tasks[section] = tasks[section].filter(t => t.id !== id);
  renderTasks();
  saveTasks();
}

function renderTasks() {
  // Render MITs
  mitsContainer.innerHTML = '';
  tasks.mits.forEach(task => {
    const taskEl = createTaskElement(task, 'mits');
    mitsContainer.appendChild(taskEl);
  });

  // Render Today's tasks
  todayContainer.innerHTML = '';
  tasks.today.forEach(task => {
    const taskEl = createTaskElement(task, 'today');
    todayContainer.appendChild(taskEl);
  });
}

function createTaskElement(task, section) {
  const div = document.createElement('div');
  div.className = 'task-item' + (task.completed ? ' completed' : '');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.completed;
  checkbox.addEventListener('change', () => toggleTask(section, task.id));

  const text = document.createElement('span');
  text.className = 'task-text';
  text.textContent = task.text;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-task-btn';
  deleteBtn.textContent = '×';
  deleteBtn.addEventListener('click', () => deleteTask(section, task.id));

  div.appendChild(checkbox);
  div.appendChild(text);
  div.appendChild(deleteBtn);

  return div;
}

// EOD Notes Functions
async function loadEODNotes() {
  try {
    const key = 'quick_notes_eod_' + (perDomain ? currentDomain : currentUrl);
    const result = await chrome.storage.local.get(key);
    if (result[key]) {
      eodEditor.value = result[key].content || '';
    }
  } catch (error) {
    console.error('Error loading EOD notes:', error);
  }
}

async function saveEODNotes() {
  try {
    const key = 'quick_notes_eod_' + (perDomain ? currentDomain : currentUrl);
    await chrome.storage.local.set({
      [key]: {
        content: eodEditor.value,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Error saving EOD notes:', error);
  }
}

// Input Handler
function handleInput() {
  updateCounts();
  debounceSave(() => saveNote());
}

// Keyboard Shortcuts
function handleKeyDown(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = noteEditor.selectionStart;
    const end = noteEditor.selectionEnd;
    noteEditor.value = noteEditor.value.substring(0, start) + '  ' + noteEditor.value.substring(end);
    noteEditor.selectionStart = noteEditor.selectionEnd = start + 2;
  }

  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault();
    saveNote().then(() => window.close());
  }

  if (e.key === 'Escape') {
    window.close();
  }
}

// Clear Handler
async function handleClear() {
  if (confirm('Are you sure you want to clear this note?')) {
    noteEditor.value = '';
    updateCounts();
    await saveNote();
  }
}

// Floating Note Handler
async function handleFloatingNote(size) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    if (!tab.url.startsWith('http')) {
      throw new Error('Cannot open floating note on this page type');
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (error) {
      console.log('Content script may already be present:', error);
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'showNoteOverlay',
      size,
      showExpandControls: true
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to show floating note');
    }

    window.close();
  } catch (error) {
    console.error('Error opening floating note:', error);
    showError(`Failed to open floating note: ${error.message}`);
  }
}

// Storage Functions
async function loadNote() {
  try {
    const key = 'quick_notes_' + (perDomain ? currentDomain : currentUrl);
    const result = await chrome.storage.local.get(key);
    const note = result[key];

    if (note) {
      noteEditor.value = note.content;
      lastModified.textContent = `Last modified: ${formatDate(note.timestamp)}`;
    }

    updateCounts();
  } catch (error) {
    console.error('Error loading note:', error);
    showError('Failed to load note');
  }
}

async function saveNote() {
  if (isSaving) return;

  isSaving = true;
  saveStatus.textContent = 'Saving...';

  try {
    const key = 'quick_notes_' + (perDomain ? currentDomain : currentUrl);
    const note = {
      content: noteEditor.value,
      timestamp: Date.now()
    };

    await chrome.storage.local.set({ [key]: note });
    lastModified.textContent = `Last modified: ${formatDate(note.timestamp)}`;
    saveStatus.textContent = 'Saved';
  } catch (error) {
    console.error('Error saving note:', error);
    showError('Failed to save note');
  } finally {
    isSaving = false;
  }
}

// Utility Functions
function debounceSave(callback) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(callback, DEBOUNCE_DELAY);
}

function updateCounts() {
  const text = noteEditor.value;
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  charCount.textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
  wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function showStatus(message) {
  saveStatus.textContent = message;
  saveStatus.style.color = '#34c759';
  setTimeout(() => {
    saveStatus.textContent = 'Saved';
    saveStatus.style.color = '';
  }, 2000);
}

function showError(message) {
  saveStatus.textContent = message;
  saveStatus.style.color = '#ff3b30';
  setTimeout(() => {
    saveStatus.textContent = 'Saved';
    saveStatus.style.color = '';
  }, 3000);
}
