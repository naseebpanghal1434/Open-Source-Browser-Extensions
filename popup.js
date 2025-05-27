// Constants
const DEBOUNCE_DELAY = 500; // ms
const STORAGE_KEY_PREFIX = 'quick_notes_';

// Utility: Extract root domain from a URL
function getRootDomain(url) {
  try {
    const u = new URL(url);
    // Remove subdomains, keep only the root domain
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

// State
let currentUrl = '';
let currentDomain = '';
let saveTimeout = null;
let isSaving = false;
let perDomain = true;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentUrl = tab.url;
  currentDomain = getRootDomain(currentUrl);
  // Get perDomain setting
  const settings = await chrome.storage.sync.get(['perDomain']);
  perDomain = settings.perDomain !== undefined ? settings.perDomain : true;
  
  // Load existing note
  await loadNote();
  
  // Focus editor
  noteEditor.focus();
  
  // Set up event listeners
  setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
  // Auto-save on input
  noteEditor.addEventListener('input', handleInput);
  
  // Keyboard shortcuts
  noteEditor.addEventListener('keydown', handleKeyDown);
  
  // Clear button
  clearBtn.addEventListener('click', handleClear);
  
  // Floating note button
  floatBtn.addEventListener('click', () => handleFloatingNote('normal'));
  expandBtn.addEventListener('click', () => handleFloatingNote('expanded'));
  
  // Manage button
  manageBtn.addEventListener('click', () => {
    window.open('manage.html');
  });
  
  // Window close
  window.addEventListener('unload', () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveNote();
    }
  });
}

// Input Handler
function handleInput() {
  updateCounts();
  debounceSave();
}

// Keyboard Shortcuts
function handleKeyDown(e) {
  // Tab key for indentation
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = noteEditor.selectionStart;
    const end = noteEditor.selectionEnd;
    noteEditor.value = noteEditor.value.substring(0, start) + '  ' + noteEditor.value.substring(end);
    noteEditor.selectionStart = noteEditor.selectionEnd = start + 2;
  }
  
  // Ctrl+Enter to save and close
  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault();
    saveNote().then(() => window.close());
  }
  
  // Escape to close
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
    await chrome.tabs.sendMessage(tab.id, { action: 'showNoteOverlay', size });
    window.close(); // Close the popup after opening the floating note
  } catch (error) {
    console.error('Error opening floating note:', error);
    showError('Failed to open floating note');
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
function debounceSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    saveNote();
  }, DEBOUNCE_DELAY);
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

function showError(message) {
  saveStatus.textContent = message;
  saveStatus.style.color = '#ff3b30';
  setTimeout(() => {
    saveStatus.textContent = 'Saved';
    saveStatus.style.color = '';
  }, 3000);
} 