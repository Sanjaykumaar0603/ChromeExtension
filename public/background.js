
let port = null;
let mediaStream = null;
let audioProcessor = null;

// Function to send status updates to the UI
function updateUI(status) {
  if (port) {
    port.postMessage({ action: 'updateStatus', status });
  }
}

// Function to handle muting
function setMuted(muted) {
  if (mediaStream) {
    mediaStream.getAudioTracks().forEach(track => {
      track.enabled = !muted;
    });
    updateUI(muted ? 'muted' : 'listening');
  }
}

// The AI processing function is now inside the background script
async function processAudioChunk(audioDataUri) {
  if (!audioDataUri) return;
  updateUI('analyzing');
  
  // This needs to be defined here since we can't import from the UI
  const analyzeAudioAndMuteFlow = async (input) => {
    // A simplified, self-contained version of calling the flow.
    // In a real app, you might fetch from a server endpoint that runs the flow.
    // For now, this just simulates the logic.
    // The actual AI call is complex to replicate here without the genkit setup.
    // This part is tricky because the background service worker cannot easily use the AI flows from the Next.js server.
    // For this to *truly* work, the React app would need to expose an API endpoint that the background script can call.
    // Let's assume for now that we will just check for silence. A real implementation is more complex.
    
    // We will just toggle for demonstration as we cannot call the AI flow from here directly.
    // In a real scenario, this would be a fetch() call to a Next.js API route.
    return { shouldMute: Math.random() > 0.5 }; 
  };

  try {
    const result = await analyzeAudioAndMuteFlow({
      audioDataUri: audioDataUri,
      voiceDetectionThreshold: 0.5, // These would come from UI via message
      muteDuration: 5,
    });
    setMuted(result.shouldMute);
  } catch (error) {
    console.error('AI analysis failed in background:', error);
    updateUI('listening'); // Revert status on error
  }
}

function startMicMonitoring(tabId) {
  if (mediaStream) {
    console.log("Monitoring is already active.");
    return;
  }

  chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
    if (chrome.runtime.lastError || !stream) {
      console.error("Could not capture tab audio:", chrome.runtime.lastError?.message);
      if (port) port.postMessage({ action: 'captureError', message: 'Could not capture tab audio. Is the tab making any sound?' });
      return;
    }

    mediaStream = stream;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(mediaStream);
    
    // Using a script processor for simplicity in the background.
    audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    audioProcessor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      // A very simple silence detection
      const isSilent = inputData.every(sample => Math.abs(sample) < 0.01);
      
      setMuted(isSilent);
    };

    source.connect(audioProcessor);
    audioProcessor.connect(audioContext.destination);

    updateUI('listening');
    if (port) port.postMessage({ action: 'captureSuccess' });

    // When the stream ends (e.g., tab closed), stop monitoring
    stream.getAudioTracks()[0].onended = () => {
      stopMicMonitoring();
    };
  });
}

function stopMicMonitoring() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  if (audioProcessor) {
    audioProcessor.disconnect();
    audioProcessor = null;
  }
  updateUI('off');
  console.log("Microphone monitoring stopped.");
}

chrome.runtime.onConnect.addListener((p) => {
  port = p;
  console.log("UI connected to background script.");

  port.onMessage.addListener((message) => {
    if (message.action === 'startMicMonitoring') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          startMicMonitoring(tabs[0].id);
        }
      });
    } else if (message.action === 'stopMicMonitoring') {
      stopMicMonitoring();
    } else if (message.action === 'setMicMuted') {
      setMuted(message.muted);
    }
  });

  port.onDisconnect.addListener(() => {
    console.log("UI disconnected.");
    stopMicMonitoring();
    port = null;
  });
});
