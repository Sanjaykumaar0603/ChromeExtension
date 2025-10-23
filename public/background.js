// This script runs in the background and handles all the heavy lifting.

let port = null;
let mediaStream = null;
let audioProcessor = null;
let isMuted = false;

// Listen for connections from our popup
chrome.runtime.onConnect.addListener((p) => {
  port = p;

  // When the popup connects, send the current status
  port.postMessage({ action: 'updateStatus', status: isMuted ? 'muted' : (mediaStream ? 'listening' : 'off') });

  port.onMessage.addListener((message) => {
    if (message.action === 'startMicMonitoring') {
      startMonitoring();
    } else if (message.action === 'stopMicMonitoring') {
      stopMonitoring();
    }
  });

  port.onDisconnect.addListener(() => {
    port = null;
    // Don't stop monitoring on disconnect, allow it to run in the background
  });
});


function startMonitoring() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) {
      if (port) port.postMessage({ action: 'captureError', message: 'Could not find active tab.' });
      return;
    }
    const targetTab = tabs[0];
    if (targetTab.id === undefined) {
      if (port) port.postMessage({ action: 'captureError', message: 'Target tab has no ID.' });
      return;
    }

    chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
      if (chrome.runtime.lastError || !stream) {
        if (port) port.postMessage({ action: 'captureError', message: chrome.runtime.lastError?.message || 'Unknown capture error' });
        return;
      }
      
      mediaStream = stream;
      isMuted = false;
      if (port) {
         port.postMessage({ action: 'captureSuccess' });
         port.postMessage({ action: 'updateStatus', status: 'listening' });
      }

      // The audio stream is muted by default, we need to unmute it.
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = true; 
      }
      
      // We don't need to do any AI processing for this version.
      // The goal is just to mute/unmute the tab's stream.
      // We'll add the AI part back in later.

      mediaStream.oninactive = () => {
        stopMonitoring();
      };
    });
  });
}

function stopMonitoring() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  isMuted = false;
  if (port) port.postMessage({ action: 'updateStatus', status: 'off' });
}

// This is a placeholder for the AI logic to decide when to mute.
// For now, we are not using it.
function setMicMuted(shouldMute) {
  if (mediaStream && mediaStream.getAudioTracks().length > 0) {
    const wasMuted = isMuted;
    isMuted = shouldMute;
    mediaStream.getAudioTracks()[0].enabled = !shouldMute;
    if (wasMuted !== isMuted) {
      if(port) port.postMessage({ action: 'updateStatus', status: isMuted ? 'muted' : 'listening' });
    }
  }
}
