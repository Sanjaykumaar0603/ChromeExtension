import { BlurMode, BlurState, BlurRegion } from '../types';

// State management
let currentBlurMode: BlurMode = 'none';
let hoverUnblurEnabled: boolean = false;
let isDrawing: boolean = false;
let drawStartX: number = 0;
let drawStartY: number = 0;
let currentBlurRegion: HTMLDivElement | null = null;
let blurRegions: BlurRegion[] = [];

// Initialize state from storage
chrome.storage.local.get(['blurMode', 'hoverUnblur'], (result: BlurState) => {
    currentBlurMode = result.blurMode || 'none';
    hoverUnblurEnabled = result.hoverUnblur || false;

    // Handle initial screen blur state
    const blurClass = 'screen-blur-extension';
    const existingDiv = document.getElementById(blurClass);

    if (currentBlurMode === 'screen' && !existingDiv) {
        toggleBlurEffect();
    }
});

// Listen for state changes
chrome.storage.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (changes.blurMode) {
        const newMode = changes.blurMode.newValue as BlurMode;
        const oldMode = changes.blurMode.oldValue as BlurMode;
        currentBlurMode = newMode;

        // Clean up old mode
        if (oldMode === 'screen') {
            const blurClass = 'screen-blur-extension';
            document.body.classList.remove(blurClass);
            const style = document.getElementById('screen-blur-style');
            if (style) {
                style.remove();
            }
        }

        // Set up new mode
        if (newMode === 'screen') {
            toggleBlurEffect();
        }
    }

    if (changes.hoverUnblur) {
        hoverUnblurEnabled = changes.hoverUnblur.newValue as boolean;
        setupHoverUnblur();
    }
});

// Click-to-blur functionality
document.addEventListener('click', (e: MouseEvent) => {
    if (currentBlurMode !== 'click') return;
    
    const target = e.target as HTMLElement;
    
    // Don't process clicks on blur regions themselves
    if (target.classList.contains('blur-region')) {
        target.remove();
        return;
    }

    // Don't create blur regions on the extension UI elements
    if (target.closest('.screen-blur-extension')) return;

    // Create blur region based on clicked element
    const rect = target.getBoundingClientRect();
    createBlurRegion(
        rect.left + window.scrollX,
        rect.top + window.scrollY,
        rect.width,
        rect.height
    );

    // Prevent creating blur regions on top of each other
    e.stopPropagation();
});

// Draw-to-blur functionality
document.addEventListener('mousedown', (e: MouseEvent) => {
    if (currentBlurMode !== 'draw') return;
    
    const target = e.target as HTMLElement;
    
    // Don't start drawing on existing blur regions
    if (target.classList.contains('blur-region') || target.closest('.screen-blur-extension')) {
        return;
    }
    
    isDrawing = true;
    drawStartX = e.clientX + window.scrollX;
    drawStartY = e.clientY + window.scrollY;
    
    // Create the initial blur region
    currentBlurRegion = document.createElement('div');
    currentBlurRegion.className = 'blur-region drawing';
    document.body.appendChild(currentBlurRegion);
    
    // Set initial position
    currentBlurRegion.style.left = drawStartX + 'px';
    currentBlurRegion.style.top = drawStartY + 'px';
    currentBlurRegion.style.width = '0';
    currentBlurRegion.style.height = '0';
});

document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDrawing || !currentBlurRegion) return;
    
    const currentX = e.clientX + window.scrollX;
    const currentY = e.clientY + window.scrollY;
    
    const width = Math.abs(currentX - drawStartX);
    const height = Math.abs(currentY - drawStartY);
    
    const left = Math.min(currentX, drawStartX);
    const top = Math.min(currentY, drawStartY);
    
    currentBlurRegion.style.width = width + 'px';
    currentBlurRegion.style.height = height + 'px';
    currentBlurRegion.style.left = left + 'px';
    currentBlurRegion.style.top = top + 'px';
});

document.addEventListener('mouseup', () => {
    if (!isDrawing || !currentBlurRegion) return;
    
    isDrawing = false;
    currentBlurRegion.classList.remove('drawing');
    
    // Add click handler to remove on click
    currentBlurRegion.addEventListener('click', function(this: HTMLDivElement) {
        this.remove();
    });
    
    currentBlurRegion = null;
});

// Helper functions
function setupHoverUnblur(): void {
    const regions = document.querySelectorAll('.blur-region') as NodeListOf<HTMLElement>;
    
    regions.forEach(region => {
        if (hoverUnblurEnabled) {
            region.addEventListener('mouseenter', () => {
                region.style.backdropFilter = 'none';
                region.style.webkitBackdropFilter = 'none';
            });
            
            region.addEventListener('mouseleave', () => {
                region.style.backdropFilter = 'blur(5px)';
                region.style.webkitBackdropFilter = 'blur(5px)';
            });
        } else {
            region.style.backdropFilter = 'blur(5px)';
            region.style.webkitBackdropFilter = 'blur(5px)';
        }
    });
}

function createBlurRegion(left: number, top: number, width: number, height: number): void {
    const region = document.createElement('div');
    region.className = 'blur-region';
    region.style.left = left + 'px';
    region.style.top = top + 'px';
    region.style.width = width + 'px';
    region.style.height = height + 'px';
    
    document.body.appendChild(region);
    setupHoverUnblur();
}

function toggleBlurEffect(): void {
    const blurClass = 'screen-blur-extension';
    const styleId = 'screen-blur-style';
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .${blurClass} * {
            filter: blur(5px) !important;
        }
        .${blurClass} style, .${blurClass} script {
            filter: none !important;
        }
    `;
    document.head.appendChild(style);
    document.body.classList.add(blurClass);
}