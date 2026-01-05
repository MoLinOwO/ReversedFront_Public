// mod/js/notificationBox.js
import { getFactionColor, getAllFactions } from '../map/factionColorMap.js';

const HIGHLIGHTER_ID = 'rf-custom-highlighter';
let fadeOutTimer = null; // Timer for the fade-out effect
let lastTextContent = null; // Cache the last text to avoid redundant updates
let isInitialized = false; // Guard against re-initialization

let currentFactionFilter = '全部';

// 獲取當前選中的帳號（用於多實例隔離）
function getCurrentSelectedAccount() {
    const accountSelect = document.getElementById('account-select');
    if (!accountSelect || accountSelect.selectedIndex < 0) {
        return null;
    }
    return {
        accountIdx: accountSelect.selectedIndex,
        account: accountSelect.options[accountSelect.selectedIndex].text
    };
}

// 獲取完整的帳號資訊（包含密碼）
async function getCurrentAccountData() {
    const selected = getCurrentSelectedAccount();
    if (!selected) return null;
    
    try {
        const accounts = await window.pywebview.api.get_accounts();
        if (accounts && selected.accountIdx < accounts.length) {
            return accounts[selected.accountIdx];
        }
    } catch (e) {
        console.error('獲取帳號列表失敗:', e);
    }
    return null;
}

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
    if (!passesFactionFilter(text)) return;

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

window.updateFactionFilter = function(val) {
    currentFactionFilter = val;
};

function getFactionFromText(text) {
    const factions = getAllFactions();
    for (const faction of factions) {
        if (text.includes(faction.name)) return faction.name;
    }
    return null;
}

function passesFactionFilter(text) {
    if (currentFactionFilter === '全部') return true;
    const faction = getFactionFromText(text);
    return faction === currentFactionFilter;
}

export async function initializeMessageObserver() {
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

    // 初始化過濾條件
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_report_faction_filter) {
        try {
            // 獲取當前帳號資訊用於多實例隔離
            const targetAccount = await getCurrentAccountData();
            const val = await window.pywebview.api.get_report_faction_filter(targetAccount);
            currentFactionFilter = val || '全部';
        } catch (e) {
            console.error('獲取戰報篩選設定失敗:', e);
            currentFactionFilter = '全部';
        }
    }
}