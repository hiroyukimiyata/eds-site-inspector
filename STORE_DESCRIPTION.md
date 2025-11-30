# Chrome Web Store Description

## Short Description (132 characters or less)

Chrome extension to inspect and analyze Edge Delivery Services pages. Visualize sections, blocks, and source code.

---

## Detailed Description

### EDS Site Inspector

A Chrome extension to inspect and analyze pages built with Edge Delivery Services (EDS). Visualize sections, blocks, and associated source assets directly on the page, helping developers and designers work more efficiently.

### Key Features

**🎯 Visual Overlay Inspection**
- Sections Overlay: Visualize page sections with highlighted boundaries
- Blocks Overlay: Identify and highlight individual blocks on the page
- Default Content Overlay: Show default content areas

**📊 DevTools Panel**
Open Chrome DevTools and navigate to the "EDS Site Inspector" tab for detailed analysis:

- **Control Tab**: Toggle overlays, refresh page analysis, view statistics
- **Blocks Tab**: Browse all detected blocks organized by category and view detailed information
- **Scripts Tab**: View all JavaScript files loaded on the page
- **JSON Tab**: Browse all JSON files fetched by the page
- **Media Tab**: View all media files from Media Bus
- **Icons Tab**: Browse all icons used on the page
- **Docs (SSR) Tab**: View Server-Side Rendered documents
- **Explore Tab**: Browse curated list of EDS-powered sites

**🔄 Auto-Update**
- Automatically re-analyzes pages on navigation
- Detects SPA (Single Page Application) route changes
- Maintains overlay state during navigation

### How to Use

1. Navigate to an Edge Delivery Services-powered website
2. Click the EDS Site Inspector extension icon in the Chrome toolbar
3. Use the checkboxes to toggle overlays
4. Open Chrome DevTools (F12) and go to the "EDS Site Inspector" tab for detailed analysis

### Privacy

This extension does not collect, store, or transmit any personal information or data from users. All processing is performed locally within the user's browser.

### Permissions

- `scripting`: To inject content scripts
- `activeTab`: To interact with the current tab
- `storage`: To save overlay preferences
- `tabs`: To manage tabs
- `<all_urls>`: To analyze any website
