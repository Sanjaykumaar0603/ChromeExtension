import { BlurMode } from '../types';

// Helper function to check if a tab is accessible
async function isTabAccessible(tab: chrome.tabs.Tab): Promise<boolean> {
  if (!tab || !tab.url) return false;
  
  // List of restricted URL schemes
  const restrictedSchemes = ['chrome:', 'edge:', 'about:', 'chrome-extension:'];
  return !restrictedSchemes.some(scheme => tab.url!.startsWith(scheme));
}

// Helper function to execute script safely
async function executeScriptSafely(
  tab: chrome.tabs.Tab, 
  config: chrome.scripting.ScriptInjection<any, any>
): Promise<void> {
  if (!await isTabAccessible(tab)) {
    console.warn('Cannot access this tab');
    return;
  }

  try {
    await chrome.scripting.executeScript(config);
  } catch (error) {
    console.error('Failed to execute script:', error);
  }
}

// Helper function to update button states
function updateButtonStates(activeMode: BlurMode): void {
  const buttons = ['toggleBlur', 'clickBlur', 'drawBlur'];
  buttons.forEach(id => {
    const button = document.getElementById(id) as HTMLButtonElement;
    if (button) {
      button.classList.remove('active');
    }
  });
  
  if (activeMode === 'screen' && document.getElementById('toggleBlur')) {
    document.getElementById('toggleBlur')!.classList.add('active');
  } else if (activeMode === 'click' && document.getElementById('clickBlur')) {
    document.getElementById('clickBlur')!.classList.add('active');
  } else if (activeMode === 'draw' && document.getElementById('drawBlur')) {
    document.getElementById('drawBlur')!.classList.add('active');
  }
}

// Initialize popup state
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const result = await chrome.storage.local.get(['blurMode', 'hoverUnblur']);
    const currentMode = result.blurMode as BlurMode || 'none';
    const hoverUnblur = result.hoverUnblur as boolean || false;
    
    updateButtonStates(currentMode);
    
    const hoverUnblurCheckbox = document.getElementById('hoverUnblur') as HTMLInputElement;
    if (hoverUnblurCheckbox) {
      hoverUnblurCheckbox.checked = hoverUnblur;
    }
  } catch (error) {
    console.error('Failed to initialize popup:', error);
  }
});

// Handle screen blur toggle
document.getElementById('toggleBlur')?.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.storage.local.get('blurMode');
    const currentMode = result.blurMode as BlurMode || 'none';
    const newMode: BlurMode = currentMode === 'screen' ? 'none' : 'screen';
    
    await chrome.storage.local.set({ blurMode: newMode });
    updateButtonStates(newMode);
  } catch (error) {
    console.error('Failed to toggle blur:', error);
  }
});

// Handle click-to-blur toggle
document.getElementById('clickBlur')?.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.storage.local.get('blurMode');
    const currentMode = result.blurMode as BlurMode || 'none';
    const newMode: BlurMode = currentMode === 'click' ? 'none' : 'click';
    
    await chrome.storage.local.set({ blurMode: newMode });
    updateButtonStates(newMode);
  } catch (error) {
    console.error('Failed to toggle click blur:', error);
  }
});

// Handle draw-to-blur toggle
document.getElementById('drawBlur')?.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.storage.local.get('blurMode');
    const currentMode = result.blurMode as BlurMode || 'none';
    const newMode: BlurMode = currentMode === 'draw' ? 'none' : 'draw';
    
    await chrome.storage.local.set({ blurMode: newMode });
    updateButtonStates(newMode);
  } catch (error) {
    console.error('Failed to toggle draw blur:', error);
  }
});

// Handle hover unblur toggle
document.getElementById('hoverUnblur')?.addEventListener('change', async (event) => {
  try {
    const target = event.target as HTMLInputElement;
    await chrome.storage.local.set({ hoverUnblur: target.checked });
  } catch (error) {
    console.error('Failed to toggle hover unblur:', error);
  }
});