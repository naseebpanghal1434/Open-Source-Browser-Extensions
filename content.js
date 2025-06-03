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

// Create and inject the draggable note overlay using Shadow DOM
function createNoteOverlay(tabUrl, sizeMode = 'normal', showExpandControls = false) {
    // Sizing
    const normalSize = { width: 320, height: 220 };
    const expandedSize = { width: 500, height: 350 };
    let currentSize = sizeMode === 'expanded' ? expandedSize : normalSize;

    // Create overlay host
    const overlayHost = document.createElement('div');
    overlayHost.id = 'quick-notes-overlay-host';
    overlayHost.style.position = 'fixed';
    overlayHost.style.top = '20px';
    overlayHost.style.right = '20px';
    overlayHost.style.zIndex = '10000';
    overlayHost.style.width = currentSize.width + 'px';
    overlayHost.style.height = 'auto';
    overlayHost.style.display = 'none';
    overlayHost.style.boxSizing = 'border-box';

    // Attach shadow root
    const shadow = overlayHost.attachShadow({ mode: 'open' });

    // Overlay HTML
    shadow.innerHTML = `
      <style>
        :host {
          width: ${currentSize.width}px;
          display: block;
        }
        .overlay {
          width: ${currentSize.width}px;
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.18);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          color: #222;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .header {
          padding: 10px;
          background: #f5f5f5;
          border-radius: 10px 10px 0 0;
          cursor: move;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
        }
        .title {
          font-weight: bold;
          font-size: 16px;
        }
        .header-buttons {
          display: flex;
          gap: 4px;
        }
        .header button {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #888;
          padding: 0 6px;
          border-radius: 4px;
          transition: background 0.2s, color 0.2s;
        }
        .header button:hover {
          background: #ececec;
          color: #222;
        }
        textarea {
          width: 100%;
          min-width: 0;
          height: ${currentSize.height - 40}px;
          padding: 12px;
          border: none;
          border-radius: 0 0 10px 10px;
          resize: none;
          font-size: 15px;
          background: #f8f8f8;
          color: #222;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
        }
      </style>
      <div class="overlay">
        <div class="header" id="dragHandle">
          <span class="title">Quick Note</span>
          <div class="header-buttons">
            <button id="resetBtn" title="Reset position">⟳</button>
            ${showExpandControls ? '<button id="expandBtn" title="Expand">⬜</button><button id="shrinkBtn" title="Shrink">🗕</button>' : ''}
            <button id="closeBtn" title="Close">×</button>
          </div>
        </div>
        <textarea id="noteArea" placeholder="Type your note..."></textarea>
      </div>
    `;

    document.body.appendChild(overlayHost);

    // Drag logic
    let isDragging = false;
    let startX, startY, initialX, initialY;
    let xOffset = 0, yOffset = 0;
    const dragHandle = shadow.getElementById('dragHandle');
    const closeBtn = shadow.getElementById('closeBtn');
    const resetBtn = shadow.getElementById('resetBtn');
    const noteArea = shadow.getElementById('noteArea');
    const overlay = overlayHost;
    const expandBtn = shadow.getElementById('expandBtn');
    const shrinkBtn = shadow.getElementById('shrinkBtn');

    dragHandle.addEventListener('mousedown', dragStart);
    window.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = overlay.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        e.preventDefault();
    }
    function drag(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        overlay.style.transform = `translate(${xOffset + dx}px, ${yOffset + dy}px)`;
    }
    function dragEnd(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        xOffset += dx;
        yOffset += dy;
        overlay.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
        isDragging = false;
    }
    // Reset position
    resetBtn.addEventListener('click', () => {
        xOffset = 0;
        yOffset = 0;
        overlay.style.transform = 'none';
        overlay.style.top = '20px';
        overlay.style.right = '20px';
    });
    // Close button
    closeBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
    });
    // Expand/Shrink logic
    if (showExpandControls && expandBtn && shrinkBtn) {
        expandBtn.addEventListener('click', () => {
            overlayHost.style.width = expandedSize.width + 'px';
            shadow.querySelector('.overlay').style.width = expandedSize.width + 'px';
            shadow.querySelector('textarea').style.height = (expandedSize.height - 40) + 'px';
            shadow.querySelector(':host').style.width = expandedSize.width + 'px';
        });
        shrinkBtn.addEventListener('click', () => {
            overlayHost.style.width = normalSize.width + 'px';
            shadow.querySelector('.overlay').style.width = normalSize.width + 'px';
            shadow.querySelector('textarea').style.height = (normalSize.height - 40) + 'px';
            shadow.querySelector(':host').style.width = normalSize.width + 'px';
        });
    }

    // --- Note Sync Logic ---
    const STORAGE_KEY_PREFIX = 'quick_notes_';
    // Get perDomain setting and then load/save notes accordingly
    chrome.storage.sync.get(['perDomain'], (settings) => {
        const perDomain = settings.perDomain !== undefined ? settings.perDomain : true;
        const rootDomain = getRootDomain(tabUrl);
        const noteKey = STORAGE_KEY_PREFIX + (perDomain ? rootDomain : tabUrl);
        // Load note from storage
        chrome.storage.local.get(noteKey, (result) => {
            if (result[noteKey] && result[noteKey].content) {
                noteArea.value = result[noteKey].content;
            } else {
                noteArea.value = '';
            }
        });
        // Save note to storage on input
        noteArea.addEventListener('input', () => {
            const note = {
                content: noteArea.value,
                timestamp: Date.now()
            };
            chrome.storage.local.set({ [noteKey]: note });
        });
        // Listen for storage changes and update textarea if needed
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes[noteKey]) {
                const newValue = changes[noteKey].newValue;
                if (newValue && typeof newValue.content === 'string' && newValue.content !== noteArea.value) {
                    noteArea.value = newValue.content;
                }
            }
        });
    });

    return overlayHost;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showNoteOverlay') {
        try {
            console.log('Received showNoteOverlay message:', request);
            let overlay = document.getElementById('quick-notes-overlay-host');
            if (!overlay) {
                console.log('Creating new overlay');
                // Get the current tab URL from the sender (content script runs in the tab)
                const tabUrl = window.location.href;
                const showExpandControls = request.showExpandControls || request.size === 'expanded';
                overlay = createNoteOverlay(tabUrl, request.size, showExpandControls);
            } else {
                // If overlay exists, update its size if needed
                const shadow = overlay.shadowRoot;
                if (shadow) {
                    const expandBtn = shadow.getElementById('expandBtn');
                    const shrinkBtn = shadow.getElementById('shrinkBtn');
                    if (expandBtn && shrinkBtn) {
                        if (request.size === 'expanded') {
                            expandBtn.click();
                        } else {
                            shrinkBtn.click();
                        }
                    }
                }
            }
            if (overlay) {
                console.log('Showing overlay');
                overlay.style.display = 'block';
                sendResponse({ success: true });
            } else {
                console.error('Failed to create overlay');
                sendResponse({ success: false, error: 'Failed to create overlay' });
            }
        } catch (error) {
            console.error('Error in showNoteOverlay:', error);
            sendResponse({ success: false, error: error.message });
        }
        return true; // Keep the message channel open for async response
    }
}); 