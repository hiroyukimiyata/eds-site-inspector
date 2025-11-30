# EDS Site Inspector

Chrome extension to inspect Edge Delivery Services pages for sections, blocks, and source assets.

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Testing

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

## Testing

The project uses [Vitest](https://vitest.dev/) for testing. Test files are located alongside source files with the `.test.js` extension.

### Test Coverage

- HTML formatting and indentation (`code-processor.js`)
- Block detection logic (`blocks.js`)
- File type detection

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npm test -- --watch

# Run tests with coverage report
npm run test:coverage
```

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Load the `dist/` directory as an unpacked extension in Chrome
