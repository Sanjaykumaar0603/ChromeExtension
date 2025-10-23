// This script runs in the background and has access to Chrome extension APIs.

let audioStream = null;
let mediaRecorder = null;
let audioChunks = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startMicMonitoring') {
    // We need to be on an active tab to capture audio.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const targetTab = tabs[0];
        // Request to capture the tab's audio.
        chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
          if (chrome.runtime.lastError || !stream) {
            console.error('Could not capture tab:', chrome.runtime.lastError?.message);
            sendResponse({ success: false, message: 'Could not capture tab audio. Is there audio playing?' });
            return;
          }

          audioStream = stream;
          mediaRecorder = new MediaRecorder(stream);

          mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
          };

          mediaRecorder.onstop = () => {
            if (audioChunks.length > 0) {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
              const reader = new FileReader();
              reader.onload = () => {
                // This will be a data URI
                const base64Audio = reader.result;
                 // Send the audio data to the popup/UI for analysis
                chrome.runtime.sendMessage({ action: 'processAudioChunk', audioDataUri: base64Audio });
              };
              reader.readAsDataURL(audioBlob);
              audioChunks = [];
            }
          };
          
          // Start recording in chunks of 5 seconds
          mediaRecorder.start(5000); 

          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, message: 'No active tab found.' });
      }
    });
    // Return true to indicate that the response will be sent asynchronously.
    return true; 
  } else if (request.action === 'stopMicMonitoring') {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
    }
    audioStream = null;
    mediaRecorder = null;
    chrome.runtime.sendMessage({ action: 'micMonitoringStopped' });
    sendResponse({ success: true });
  } else if (request.action === 'setMicMuted') {
    if (audioStream) {
        audioStream.getAudioTracks().forEach(track => {
            track.enabled = !request.muted;
        });
        sendResponse({ success: true });
    } else {
        sendResponse({ success: false, message: "No active audio stream to mute." });
    }
  }
});
