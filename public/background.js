// This script runs in the background and handles all microphone-related logic.

let capturedStream = null;
let audioProcessorInterval = null;
let mediaRecorder = null;
let lastAudioChunkTime = null;

// Listen for messages from the popup UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startMicMonitoring') {
    startMicMonitoring(sendResponse);
    return true; // Indicates that the response is sent asynchronously
  } else if (request.action === 'stopMicMonitoring') {
    stopMicMonitoring();
    sendResponse({ success: true });
  } else if (request.action === 'setMicMuted') {
    if (capturedStream) {
      capturedStream.getAudioTracks().forEach(track => {
        track.enabled = !request.muted;
      });
      sendResponse({ success: true, muted: !capturedStream.getAudioTracks()[0]?.enabled });
    }
  }
});

function startMicMonitoring(sendResponse) {
  // Find the currently active tab to capture its audio
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) {
      sendResponse({ success: false, message: 'Could not find active tab.' });
      return;
    }
    const targetTabId = tabs[0].id;

    chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
      if (chrome.runtime.lastError || !stream) {
        console.error("Error capturing tab:", chrome.runtime.lastError?.message);
        sendResponse({ success: false, message: 'Could not capture tab audio. Is the tab making any sound?' });
        return;
      }

      capturedStream = stream;

      // When the stream ends (e.g., tab closed), clean up.
      stream.oninactive = () => {
        stopMicMonitoring();
      };
      
      // We can start the MediaRecorder to process audio chunks
      // This is a placeholder for sending audio to your AI
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            // This is the audio chunk as a Base64 Data URI
            const base64Audio = reader.result;
            // Send this chunk to the popup for AI analysis
            chrome.runtime.sendMessage({
              action: 'processAudioChunk',
              audioDataUri: base64Audio,
            });
          };
          reader.readAsDataURL(event.data);
        }
      };
      
      // Start recording and capture a chunk every 2 seconds
      mediaRecorder.start(2000); 

      sendResponse({ success: true });
    });
  });
}

function stopMicMonitoring() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (capturedStream) {
    capturedStream.getTracks().forEach(track => track.stop());
  }
  if (audioProcessorInterval) {
    clearInterval(audioProcessorInterval);
  }

  capturedStream = null;
  mediaRecorder = null;
  audioProcessorInterval = null;
  
  // Notify the popup that monitoring has stopped
  chrome.runtime.sendMessage({ action: 'micMonitoringStopped' });
}
