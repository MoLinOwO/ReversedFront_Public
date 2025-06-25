// mod/js/notificationBox.js
import { getFactionColor, getAllFactions } from '../map/factionColorMap.js';

const HIGHLIGHTER_ID = 'rf-custom-highlighter';
let fadeOutTimer = null; // Timer for the fade-out effect
let lastTextContent = null; // Cache the last text to avoid redundant updates
let isInitialized = false; // Guard against re-initialization

/**
 * Creates and injects the dedicated highlighter element and a style tag.
 * This runs only once and sets up all static styles for performance.
 */
function setupHighlighter() {
    if (document.getElementById(HIGHLIGHTER_ID)) {
        return;
    }

    // 1. Create the highlighter element
    const highlighterElement = document.createElement('div');
    highlighterElement.id = HIGHLIGHTER_ID;
    
    // 2. Apply all static styles at creation time
    Object.assign(highlighterElement.style, {
        display: 'inline-block',
        position: 'fixed',
        top: '82px',
        left: '50%',
        zIndex: '10001',
        padding: '4px 10px',
        borderRadius: '8px',
        fontWeight: 'bold',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        opacity: '0', // Start invisible
        transform: 'translateX(-50%)', // Use pure CSS for centering
        transition: 'opacity 0.4s ease-in-out',
        // --- GPU Acceleration Hint ---
        willChange: 'opacity', 
    });
    
    document.body.appendChild(highlighterElement);

    // 3. Create and inject a style tag to hide the original element
    const style = document.createElement('style');
    style.id = `${HIGHLIGHTER_ID}-style`;
    style.innerHTML = `
        .ShortMessage_messageText__uLw0A {
            display: none !important;
            visibility: hidden !important;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Determines if an RGB color is light or dark based on its luminance.
 * @param {string} rgbString - The color in "rgb(r, g, b)" format.
 * @returns {boolean} - True if the color is considered light, false otherwise.
 */
function isColorLight(rgbString) {
    if (!rgbString || !rgbString.startsWith('rgb')) {
        return false; 
    }
    const rgbValues = rgbString.match(/\d+/g);
    if (!rgbValues || rgbValues.length < 3) {
        return false;
    }
    const [r, g, b] = rgbValues.map(Number);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 186;
}

/**
 * Updates only the dynamic styles of the highlighter element.
 * This is called for new messages and window resizing.
 * @param {string} text - The message text to display.
 */
function updateDynamicStyles(text) {
    const highlighterElement = document.getElementById(HIGHLIGHTER_ID);
    if (!highlighterElement) return;

    const trimmedText = text.trim();
    
    // --- Determine Faction Color ---
    const factions = getAllFactions();
    let firstFactionFound = null;
    let earliestIndex = -1;

    for (const faction of factions) {
        const index = trimmedText.indexOf(faction.name);
        if (index !== -1 && (earliestIndex === -1 || index < earliestIndex)) {
            earliestIndex = index;
            firstFactionFound = faction;
        }
    }

    let backgroundColor, boxShadowColor, textColor;

    if (firstFactionFound) {
        const rgbColor = getFactionColor(firstFactionFound.name);
        textColor = isColorLight(rgbColor) ? '#222' : 'white';
        const colorWithAlpha = (alpha) => rgbColor.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        backgroundColor = colorWithAlpha(0.3);
        boxShadowColor = colorWithAlpha(0.25);
    } else {
        textColor = '#222';
        backgroundColor = 'rgba(255, 255, 0, 0.2)';
        boxShadowColor = 'rgba(255, 255, 0, 0.25)';
    }

    // --- Dynamic Font Size ---
    const minFontSize = 16;
    const maxFontSize = 24;
    const preferredFontSize = window.innerWidth / 80; 
    const dynamicFontSizePx = Math.max(minFontSize, Math.min(preferredFontSize, maxFontSize));

    // --- Apply only the dynamic styles ---
    highlighterElement.textContent = trimmedText;
    highlighterElement.style.color = textColor;
    highlighterElement.style.backgroundColor = backgroundColor;
    highlighterElement.style.boxShadow = `0 0 12px 4px ${boxShadowColor}`;
    highlighterElement.style.fontSize = `${dynamicFontSizePx}px`;
}


/**
 * Manages the visibility and content of the highlighter.
 * @param {string} text - The message text to display.
 */
function showHighlighter(text) {
    const highlighterElement = document.getElementById(HIGHLIGHTER_ID);
    if (!highlighterElement) return;

    // Always clear any existing fade-out timer to prevent premature hiding.
    if (fadeOutTimer) {
        clearTimeout(fadeOutTimer);
    }

    const trimmedText = text.trim();

    // Update content and fade in if the message is new, or if the box was hidden.
    // This avoids re-rendering the same content if it's already visible.
    if (trimmedText !== lastTextContent || highlighterElement.style.opacity !== '1') {
        lastTextContent = trimmedText;
        updateDynamicStyles(trimmedText);
        highlighterElement.style.opacity = '1';
    }

    // Schedule a new fade-out for the current message.
    const FADE_OUT_DELAY = 4000;
    fadeOutTimer = setTimeout(() => {
        highlighterElement.style.opacity = '0';
        lastTextContent = null; // Clear cache when faded out
    }, FADE_OUT_DELAY);
}

export function initializeMessageObserver() {
    // Prevent multiple initializations, which would lead to memory leaks
    // by attaching multiple observers and event listeners.
    if (isInitialized) {
        return;
    }
    isInitialized = true;

    setupHighlighter();

    const handleMutation = (targetNode) => {
        if (targetNode && targetNode.textContent) {
            const newText = targetNode.textContent.trim();
            if (newText) {
                showHighlighter(newText);
            }
        }
    };
    
    const existingMessage = document.querySelector('.ShortMessage_messageText__uLw0A');
    if (existingMessage) {
        handleMutation(existingMessage);
    }

    window.addEventListener('resize', () => {
        // Only update styles if the highlighter has content
        if (lastTextContent) {
            updateDynamicStyles(lastTextContent);
        }
        // 新增：自動調整高亮提示視窗最大寬度，行動裝置自適應
        const highlighterElement = document.getElementById(HIGHLIGHTER_ID);
        if (highlighterElement) {
            const padding = 16;
            const maxWidth = Math.min(window.innerWidth - padding * 2, 420);
            highlighterElement.style.maxWidth = maxWidth + 'px';
            highlighterElement.style.overflow = 'auto';
        }
    });

    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            let targetElement = null;
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;
                    if (node.matches('.ShortMessage_messageText__uLw0A')) {
                        targetElement = node;
                    } else {
                        targetElement = node.querySelector('.ShortMessage_messageText__uLw0A');
                    }
                });
            } else if (mutation.type === 'characterData') {
                targetElement = mutation.target.parentElement?.closest('.ShortMessage_messageText__uLw0A');
            }

            if (targetElement) {
                handleMutation(targetElement);
                return; 
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
    });
}