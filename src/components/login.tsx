{
  "manifest_version": 3,
  "name": "Smart Privacy",
  "version": "1.0",
  "description": "A smart privacy assistant for your browser.",
  "permissions": ["storage", "alarms", "notifications"],
  "action": {
    "default_popup": "index.html",
    "default_icon": {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    }
  },
  "icons": {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  },
  "background": {
    "service_worker": "background.js"
  }
}