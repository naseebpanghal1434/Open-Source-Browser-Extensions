# Quick Notes Chrome Extension

A clean, distraction-free note-taking extension for Chrome that allows you to take notes on any webpage.

## Features

- Clean, minimalistic interface
- Auto-save functionality
- Tab-specific notes
- Dark/Light theme support
- Keyboard shortcuts
- Character and word count
- Last modified timestamp
- Context menu integration
- Local storage with automatic cleanup

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

### Basic Usage

1. Click the extension icon in your browser toolbar to open the note-taking interface
2. Start typing your note - it will be automatically saved
3. Notes are associated with the current tab's URL

### Keyboard Shortcuts

- `Tab`: Indent text
- `Ctrl+Enter`: Save and close popup
- `Escape`: Close popup

### Context Menu

- Select text on any webpage
- Right-click and choose "Add to Quick Notes"
- The selected text will be appended to the note for that page

## Storage

- Notes are stored locally in your browser
- Maximum storage limit: 10MB
- Oldest notes are automatically removed when storage limit is reached

## Development

The extension is built using vanilla JavaScript and follows Chrome's Manifest V3 specifications.

### Project Structure

- `manifest.json`: Extension configuration
- `popup.html`: Main popup interface
- `popup.js`: Popup functionality
- `styles.css`: Styling
- `background.js`: Background tasks and storage management

## License

MIT License 