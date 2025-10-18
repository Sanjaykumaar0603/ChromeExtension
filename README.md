# Smart Privacy Chrome Extension

This project is a Chrome extension that provides a personal dashboard for web privacy and utility.

## Current Features

1.  **Pinger**: A utility to periodically ping URLs and monitor their status.
2.  **Privacy Controls**: AI-powered controls to automatically mute your microphone or turn off your camera.

## How to Test the Extension

You can test the extension in two ways:

### 1. With the Local Development Server (Recommended for Development)

This method allows you to see your code changes live without rebuilding the extension.

1.  **Run the App**: Start the development server with `npm run dev`.
2.  **Open Chrome Extensions**: In your Chrome browser, navigate to `chrome://extensions`.
3.  **Enable Developer Mode**: Turn on the "Developer mode" toggle in the top-right corner.
4.  **Load Unpacked**: Click the "Load unpacked" button and select the `public` folder from your project directory.
5.  **Test**: The extension icon will appear in your Chrome toolbar. Click it to open the popup.

### 2. As a Static Build (Without a Local Server)

This method is for testing the final, production-ready version of your extension.

1.  **Build the Project**: Run the command `npm run build`. This will create a static version of your app in a new folder called `out`.
2.  **Open Chrome Extensions**: In Chrome, go to `chrome://extensions`.
3.  **Enable Developer Mode**: Make sure "Developer mode" is on.
4.  **Load Unpacked**: Click "Load unpacked" and this time, select the `out` folder.
5.  **Test**: The extension will now run from the static files, no local server needed!

## How to Publish to the Chrome Web Store

When you are ready to publish:

1.  **Create a ZIP file**: Compress the **contents** of the `out` folder into a single ZIP file.
2.  **Go to the Developer Dashboard**: Visit the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
3.  **Upload**: Click "Add new item" and upload your ZIP file.
4.  **Complete Listing**: Fill out the required store listing information, including a description, icons, and screenshots.
5.  **Submit for Review**: Submit your extension for review by Google.
