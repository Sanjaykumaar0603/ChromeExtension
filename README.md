# Smart Shield — Your Smart Privacy Chrome Extension

Smart Shield is an AI-powered Chrome Extension that protects your digital privacy during online interactions.  
It intelligently manages your mic and camera, blurs sensitive screen areas, and checks the availability of URLs — all from a unified, minimal dashboard.

---

## Current Features

1. **Auto Privacy Control**  
   - Automatically mutes your microphone when no voice is detected and automatically turns off your camera when the registered user's face is not detected during meetings (e.g., Google Meet, Zoom, Teams).  

2. **Smart Screen Blur**  
   - Blur your entire screen or selectively hide sensitive areas by drawing a bounding box or clicking an element — perfect for screen sharing and presentations.  

3. **URL Pinger**  
   - Instantly check if a website is active or down by pasting its URL. Visual pinger with status indicators and response latency tracking.  

---

## Inspiration

The idea for Smart Shield came from real-world frustrations with privacy lapses — forgetting to mute during online meetings, accidentally leaving the camera on, or sharing private tabs while presenting.  
Additionally, while testing websites collaboratively, manually checking uptime through terminal commands was inefficient.  
Smart Shield brings all these solutions into one lightweight, intelligent Chrome extension — a **guardian for your digital presence**.

---

## How We Built It

Smart Shield was developed using a **Next.js + TypeScript** foundation to ensure modular and scalable development.  
The **popup dashboard** and **settings panel** are built with **React**, **Tailwind CSS**, and **Radix UI** for clean design and accessibility.  

The privacy automation uses:
- **Chrome Extension APIs** for mic, camera, and DOM control.  
- **Google Genkit + Gemini 2.5 Flash** model for real-time activity detection and intelligent state toggling.  
- **Content scripts** to interact with meeting tabs and web pages for blur and pinger functionalities.  

---

## Project Structure

smart-shield/
├── public/ # Static assets (popup.html, icons, manifest.json)
├── src/
│ ├── components/ # React UI components
│ ├── hooks/ # Custom React hooks
│ ├── pages/ # Next.js pages (dashboard, settings)
│ ├── utils/ # Helper functions (pinger, AI models, blur tools)
│ ├── background/ # Background service worker
│ └── content/ # Content scripts for mic/camera/screen control
├── package.json
└── next.config.js

---

## Built With

- **Next.js** – React framework for building the dashboard  
- **TypeScript** – For reliable, type-safe development  
- **React** – Core UI library  
- **Tailwind CSS** – Modern utility-first CSS framework  
- **Radix UI** – Unstyled, accessible UI primitives  
- **Lucide React** – Beautiful icon set  
- **Chart.js** & **Recharts** – Data visualization for URL pinger  
- **Chrome Extension APIs** – Background and content script control  
- **Google Genkit** + **Gemini 2.5 Flash** – AI for presence and privacy detection  
- **Webpack**, **PostCSS**, **ESLint** – Build tools and linting  
- **dotenv**, **clsx**, **tailwind-merge** – Utilities and styling helpers  

---

## What We Learned

- How to integrate **AI-powered context detection** into browser extensions.  
- Best practices for **Next.js + Chrome Extension** builds.  
- Handling **media permissions**, async background messaging, and security boundaries between content and background scripts.  
- Designing **non-intrusive UI** that blends privacy features with utility.  

---

## Challenges We Faced

- Managing Chrome’s **Manifest V3** restrictions while keeping live updates fast.  
- Maintaining **mic/camera control** across multiple tabs without conflicts.  
- Integrating AI-driven detection while keeping CPU usage minimal.  
- Creating a **smooth blur overlay** that doesn’t interfere with user input.  

---

## Accomplishments

- Built a fully functional AI privacy layer inside Chrome.  
- Achieved seamless mic/camera toggling based on real-time user context.  
- Created an elegant and responsive dashboard with live status indicators.  
- Developed a reliable pinger tool with clean visual feedback.  

---

## What’s Next for Smart Shield

- Adding **AI-driven blur suggestion**, detecting which on-screen elements may contain sensitive data.  
- Integrating **browser tab grouping** for meeting mode automation.  
- Extending support for **Edge and Firefox**.  
- Building a **privacy analytics dashboard** that summarizes protection events and statistics.  

---

## Setup Instructions

### 1. Clone and Install
```bash
git clone https://github.com/yourusername/smart-shield.git
cd smart-shield
npm install
```

### 2. Run Locally (Recommended for Development)

```bash
npm run dev
```

Then:

1. Go to `chrome://extensions` in Chrome.
2. Enable **Developer Mode**.
3. Click **Load Unpacked** and select the `public` folder from your project directory.
4. The Smart Shield icon will appear in the Chrome toolbar — click it to open the popup.

### 3. Build for Production

```bash
npm run build
```

Then load the `out` folder as unpacked to test the static build.

---

## Publishing to Chrome Web Store

1. Run `npm run build` to generate the `out` folder.
2. Zip the **contents** of the `out` folder (not the folder itself).
3. Upload to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
4. Fill out the listing details, add screenshots and logo.
5. Submit for review!

---
## Tagline

> “Always on guard. Always aware.”
> — Your Smart Privacy Shield
