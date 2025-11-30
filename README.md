# EDS Site Inspector

A Chrome extension to inspect and analyze Edge Delivery Services (EDS) pages. Visualize sections, blocks, and associated source assets directly on the page.

## Features

### 🎯 Visual Overlay Inspection

- **Sections Overlay**: Visualize page sections with highlighted boundaries
- **Blocks Overlay**: Identify and highlight individual blocks on the page
- **Default Content Overlay**: Show default content areas

All overlays can be toggled independently via the extension popup or DevTools panel.

### 📊 DevTools Panel

Open Chrome DevTools and navigate to the "EDS Site Inspector" tab for detailed analysis:

#### Control Tab
- Toggle overlays (Sections, Blocks, Default Content)
- Refresh page analysis
- View page statistics

#### Blocks Tab
- Browse all detected blocks organized by category:
  - Block (generic blocks)
  - Heading, Text, Image, List
  - Code, Table, Quote
  - Media, Button, Icon
- Click any block to view detailed information:
  - Block name and category
  - Source code (HTML)
  - Associated JavaScript files
  - Related media files
  - Block metadata

#### Scripts Tab
- View all JavaScript files loaded on the page
- Filter and search scripts
- Open scripts in new tabs

#### JSON Tab
- Browse all JSON files fetched by the page
- View JSON content with syntax highlighting
- Search and filter JSON files

#### Media Tab
- View all media files (images, videos, etc.) from Media Bus
- Preview media thumbnails
- Open media files in new tabs

#### Icons Tab
- Browse all icons used on the page
- View icon names and sources
- See icon usage locations

#### Docs (SSR) Tab
- View Server-Side Rendered (SSR) documents
- Inspect HTML structure before client-side hydration
- Compare SSR and live DOM

#### Explore Tab
- Browse curated list of EDS-powered sites
- Quick navigation to example sites
- Search sites by title or URL

### 🔄 Auto-Update

- Automatically re-analyzes pages on navigation
- Detects SPA (Single Page Application) route changes
- Maintains overlay state during navigation

### 🎨 User-Friendly Interface

- Clean popup interface for quick overlay control
- Comprehensive DevTools panel for detailed inspection
- Synchronized state between popup and DevTools panel

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd eds-site-inspector
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `dist/` directory from this project

## Usage

### Quick Start

1. Navigate to an Edge Delivery Services-powered website
2. Click the EDS Site Inspector extension icon in the Chrome toolbar
3. Use the checkboxes to toggle overlays (Sections, Blocks, Default Content)
4. Open Chrome DevTools (F12) and go to the "EDS Site Inspector" tab for detailed analysis

### Using the Popup

The extension popup provides quick access to overlay controls:
- **Sections**: Show/hide section boundaries
- **Blocks**: Show/hide block boundaries
- **Default Content**: Show/hide default content areas

### Using DevTools Panel

The DevTools panel provides comprehensive analysis tools:

1. **Control Tab**: Manage overlays and refresh analysis
2. **Blocks Tab**: Browse and inspect individual blocks
3. **Scripts Tab**: View all JavaScript files
4. **JSON Tab**: Inspect JSON data files
5. **Media Tab**: Browse media assets
6. **Icons Tab**: View icon usage
7. **Docs Tab**: Inspect SSR documents
8. **Explore Tab**: Discover EDS-powered sites

### Block Inspection

1. Open the DevTools panel
2. Navigate to the "Blocks" tab
3. Click on any block to view its details:
   - Source HTML code
   - Associated JavaScript files
   - Related media files
   - Block metadata

## Development

### Build

```bash
npm run build
```

### Watch Mode

Automatically rebuild on file changes:

```bash
npm run watch
```

### Testing

The project uses [Vitest](https://vitest.dev/) for testing.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

- HTML formatting and indentation (`code-processor.js`)
- Block detection logic (`blocks.js`)
- File type detection

## Project Structure

```
src/
├── background.js          # Service worker
├── content.js            # Content script entry point
├── popup.js              # Popup script
├── panel.js              # DevTools panel script
├── content/              # Content script modules
│   ├── analyzer.js       # Page analysis logic
│   ├── detectors/        # Detection modules (blocks, sections, icons)
│   ├── collectors/       # Data collection modules
│   ├── overlay/          # Overlay management
│   └── api/              # API integration
└── panel/                # DevTools panel modules
    ├── renderers/        # Tab renderers
    └── utils/            # Utility functions
```

## Requirements

- Chrome browser (Manifest V3 compatible)
- Node.js 14+ (for development)
- npm or yarn

## Permissions

This extension requires the following permissions:
- `scripting`: To inject content scripts
- `activeTab`: To interact with the current tab
- `storage`: To save overlay preferences
- `tabs`: To manage tabs
- `<all_urls>`: To analyze any website

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
