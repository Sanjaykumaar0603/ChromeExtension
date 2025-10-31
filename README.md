# Screen Blur Extension (TypeScript Version)

A Chrome extension that helps protect your privacy by providing screen blurring features, rewritten in TypeScript for better type safety and maintainability.

## Features

### 🔒 Screen Blur
- Multiple blur modes for flexible privacy:
  - Full Screen Blur: Instantly blur the entire webpage
  - Click-to-Blur: Blur specific elements with a click
  - Draw-to-Blur: Create custom blur regions
- Toggle blur on/off with a single click
- Affects all content except extension UI
- Perfect for privacy in public spaces

## Technology Stack

- TypeScript
- Chrome Extension APIs
- Webpack for bundling
- CSS for styling and animations

## Development Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
   For development with watch mode:
   ```bash
   npm run watch
   ```

## Loading the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `dist` folder in the project directory

## Project Structure

```
├── src/
│   ├── background/
│   │   └── background.ts
│   ├── content/
│   │   └── content.ts
│   ├── popup/
│   │   ├── popup.html
│   │   └── popup.ts
│   ├── types.ts
│   └── styles.css
├── public/
│   ├── manifest.json
│   └── icons/
├── dist/
├── package.json
├── tsconfig.json
└── webpack.config.js
```

## Building for Production

To create a production build:

```bash
npm run prod
```

This will create optimized files in the `dist` directory.

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

MIT License