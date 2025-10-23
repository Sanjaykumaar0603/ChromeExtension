// This script runs in the background and has access to Chrome APIs.

let mediaRecorder = null;
let audioStream = null;

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startMicMonitoring') {
    startMicMonitoring(request.config, sendResponse);
    return true; // Indicates that the response will be sent asynchronously
  } else if (request.action === 'stopMicMonitoring') {
    stopMicMonitoring();
    sendResponse({ success: true, message: 'Monitoring stopped.' });
  } else if (request.action === 'setMicMuted') {
    if (audioStream) {
        audioStream.getAudioTracks().forEach(track => {
            track.enabled = !request.muted;
        });
        sendResponse({ success: true, muted: request.muted });
    } else {
        sendResponse({ success: false, message: 'No active stream to mute.' });
    }
  }
});

function startMicMonitoring(config, sendResponse) {
  // Can't start if it's already running
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    sendResponse({ success: false, message: 'Already monitoring.' });
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      sendResponse({ success: false, message: 'No active tab found.' });
      return;
    }
    const targetTab = tabs[0];

    chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
      if (chrome.runtime.lastError || !stream) {
        sendResponse({ success: false, message: `Could not capture tab: ${chrome.runtime.lastError?.message}` });
        return;
      }

      audioStream = stream;
      
      // Ensure the track is enabled on start
      audioStream.getAudioTracks().forEach(track => track.enabled = true);

      // Inform the UI that we are listening
      chrome.runtime.sendMessage({ status: 'listening' });
      
      // When the stream ends (e.g., user closes the tab), stop everything.
      stream.getTracks().forEach(track => {
          track.onended = () => {
              stopMicMonitoring();
              chrome.runtime.sendMessage({ status: 'off' });
          };
      });

      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Send audio data to the popup/React app for analysis
           const reader = new FileReader();
           reader.readAsDataURL(event.data);
           reader.onloadend = () => {
             chrome.runtime.sendMessage({ 
                 action: 'processAudioChunk', 
                 audioDataUri: reader.result 
            });
           };
        }
      };

      mediaRecorder.start(config.muteDuration * 1000);
      sendResponse({ success: true, message: 'Mic monitoring started.' });
    });
  });
}

function stopMicMonitoring() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (audioStream) {
    audioStream.getTracks().forEach((track) => track.stop());
  }
  mediaRecorder = null;
  audioStream = null;
}
