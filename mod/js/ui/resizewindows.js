// resizewindows.js
// 全域自動管理所有彈窗/對話框的自動調整視窗大小與行動裝置自適應

const DEFAULT_OPTIONS = { maxWidth: 340, maxHeight: 520, padding: 10 };

function adjustDialog(dialog, options = {}) {
    if (!dialog) return;
    const opt = { ...DEFAULT_OPTIONS, ...options };
    const padding = opt.padding;
    // 先移除 scale，避免重複疊加
    dialog.style.transform = '';
    // 統一設定 padding，讓內容不會太靠邊
    dialog.style.padding = padding + 'px';
    // 取得彈窗原始尺寸
    dialog.style.width = 'auto';
    dialog.style.height = 'auto';
    dialog.style.maxWidth = opt.maxWidth + 'px';
    dialog.style.maxHeight = opt.maxHeight + 'px';
    dialog.style.overflow = 'visible';
    dialog.style.boxSizing = 'border-box';
    dialog.style.position = 'fixed';
    dialog.style.left = '50%';
    dialog.style.top = '50%';
    // 取得實際尺寸
    const rect = dialog.getBoundingClientRect();
    const availW = window.innerWidth - padding * 2;
    const availH = window.innerHeight - padding * 2;
    let scale = 1;
    if (rect.width > availW || rect.height > availH) {
        scale = Math.min(availW / rect.width, availH / rect.height, 1);
    }
    dialog.style.transform = `translate(-50%, -50%) scale(${scale})`;
    // 讓所有直接子元素（如按鈕區塊）寬度 100%，不會超出彈窗
    Array.from(dialog.children).forEach(child => {
        if (child.nodeType === 1) {
            child.style.maxWidth = '100%';
            child.style.boxSizing = 'border-box';
        }
    });
}

export function makeDialogResponsive(dialogSelector, options = {}) {
    const dialog = typeof dialogSelector === 'string' ? document.querySelector(dialogSelector) : dialogSelector;
    if (!dialog) return;
    adjustDialog(dialog, options);
    window.addEventListener('resize', () => adjustDialog(dialog, options));
}

// 全域自動偵測所有 class="rf-dialog" 或 [data-dialog] 彈窗
function autoResponsiveAllDialogs() {
    function adjustAll() {
        const dialogs = document.querySelectorAll('.rf-dialog, [data-dialog]');
        dialogs.forEach(dialog => adjustDialog(dialog));
    }
    // 初始調整
    adjustAll();
    // resize 時全部調整
    window.addEventListener('resize', adjustAll);
    // 監控 DOM 變化，自動調整新出現的彈窗
    const observer = new MutationObserver(() => {
        adjustAll();
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// 自動啟動全域監控
if (typeof window !== 'undefined') {
    window.makeDialogResponsive = makeDialogResponsive;
    autoResponsiveAllDialogs();
}
