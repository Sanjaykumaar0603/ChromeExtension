chrome.runtime.onInstalled.addListener((): void => {
  console.log('Extension installed');
  // Initialize storage with default values
  chrome.storage.local.set({
    blurMode: 'none',
    hoverUnblur: false
  });
});