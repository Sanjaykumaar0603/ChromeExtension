// This is the background script for the extension.
// It is responsible for handling the microphone monitoring and communication with the AI.

// Global state for the background script
let micStream;
let audioProcessor;
let mediaRecorder;
let silenceTimer;
let isMuted = false;
let isMonitoring = false;
let uiPort;

const MUTE_DELAY = 5000; // 5 seconds of silence before muting

// Function to send status updates to the UI
function updateUiStatus(status) {
  if (uiPort) {
    uiPort.postMessage({ action: 'updateMicStatus', status });
  }
}

// Function to start monitoring the microphone
async function startMicMonitoring() {
  if (isMonitoring) return;
  console.log('Starting microphone monitoring...');

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) {
      console.error('No active tab found.');
      updateUiStatus('off');
      return;
    }

    micStream = await chrome.tabCapture.capture({
      audio: true,
      video: false,
    });

    isMonitoring = true;
    updateUiStatus('listening');

    // Mute the tab immediately to prevent feedback loop
    chrome.tabs.update(activeTab.id, { muted: true });

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(micStream);
    
    // We don't need a processor node if we use MediaRecorder
    // audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    // source.connect(audioProcessor);
    // audioProcessor.onaudioprocess = handleAudioProcess;

    mediaRecorder = new MediaRecorder(micStream);
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(1000); // Collect 1-second chunks of audio

    isMuted = false;
    resetSilenceTimer();

  } catch (error) {
    console.error('Error starting mic monitoring:', error);
    stopMicMonitoring(); // Clean up on error
  }
}

// Function to stop monitoring the microphone
function stopMicMonitoring() {
  console.log('Stopping microphone monitoring...');
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if(silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
  micStream?.getTracks().forEach((track) => track.stop());
  // audioProcessor?.disconnect();

  micStream = null;
  // audioProcessor = null;
  mediaRecorder = null;
  isMonitoring = false;
  isMuted = false;
  updateUiStatus('off');
}

// Handles incoming audio data from MediaRecorder
async function handleDataAvailable(event) {
  if (event.data.size > 0) {
    updateUiStatus('analyzing');
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        const response = await fetch('http://localhost:9002/api/genkit/flows/analyzeAudioAndMute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioDataUri: base64String,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI flow failed with status: ${response.status}`);
        }

        const result = await response.json();
        handleAiResult(result.voiceDetected);
      } catch (error) {
        console.error('Error sending audio to AI:', error);
        // If AI fails, assume voice is present to be safe
        handleAiResult(true);
      }
    };
    reader.readAsDataURL(event.data);
  }
}


// Handles the result from the AI analysis
function handleAiResult(voiceDetected) {
  if (voiceDetected) {
    console.log('Voice detected.');
    // If voice is detected, unmute and reset the silence timer
    if (isMuted) {
      setMuteState(false);
    }
    resetSilenceTimer();
    updateUiStatus('listening');
  } else {
    console.log('Silence detected.');
    // If silence is detected, the timer is already running.
    // We just update the status to show it's listening.
    if(!isMuted) {
       updateUiStatus('listening');
    }
  }
}

// Resets the timer that triggers muting after a period of silence
function resetSilenceTimer() {
  if (silenceTimer) {
    clearTimeout(silenceTimer);
  }
  silenceTimer = setTimeout(() => {
    console.log('Silence timer expired. Muting.');
    setMuteState(true);
  }, MUTE_DELAY);
}

// Sets the mute state of the captured audio stream
function setMuteState(shouldMute) {
  if (micStream && isMonitoring) {
    micStream.getAudioTracks().forEach((track) => {
      track.enabled = !shouldMute;
    });
    isMuted = shouldMute;
    if(shouldMute) {
        updateUiStatus('muted');
    } else {
        updateUiStatus('listening');
    }
  }
}


// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startMicMonitoring') {
    startMicMonitoring();
  } else if (message.action === 'stopMicMonitoring') {
    stopMicMonitoring();
  }
  return true; // Indicates an async response
});

// Listen for connections from the UI
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'privacyControls') {
        uiPort = port;
        // Send initial status when UI connects
        updateUiStatus(isMonitoring ? (isMuted ? 'muted' : 'listening') : 'off');
        port.onDisconnect.addListener(() => {
            uiPort = null;
        });
    }
});
