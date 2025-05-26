// Constants
const STORAGE_KEY_PREFIX = 'quick_notes_';
const MAX_STORAGE_SIZE = 10 * 1024 * 1024; // 10MB

// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'quickNotes',
    title: 'Add to Quick Notes',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'quickNotes') {
    const key = STORAGE_KEY_PREFIX + tab.url;
    const result = await chrome.storage.local.get(key);
    const existingNote = result[key] || { content: '', timestamp: Date.now() };
    
    // Append selected text to existing note
    const newContent = existingNote.content
      ? `${existingNote.content}\n\n${info.selectionText}`
      : info.selectionText;
    
    await chrome.storage.local.set({
      [key]: {
        content: newContent,
        timestamp: Date.now()
      }
    });
  }
});

// Storage management
chrome.storage.local.onChanged.addListener(async (changes) => {
  // Check storage usage
  const usage = await chrome.storage.local.getBytesInUse();
  
  if (usage > MAX_STORAGE_SIZE) {
    // Get all notes
    const allNotes = await chrome.storage.local.get(null);
    const noteEntries = Object.entries(allNotes)
      .filter(([key]) => key.startsWith(STORAGE_KEY_PREFIX))
      .map(([key, value]) => ({
        key,
        timestamp: value.timestamp
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest notes until under limit
    while (usage > MAX_STORAGE_SIZE && noteEntries.length > 0) {
      const oldestNote = noteEntries.shift();
      await chrome.storage.local.remove(oldestNote.key);
    }
  }
}); 