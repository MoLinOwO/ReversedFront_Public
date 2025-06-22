// 退出遊戲確認
export async function loadExitPromptsAndShow() {
    let prompts = [
        { message: '確認要離開 逆統戰：烽火 嗎？', confirm: '確定', cancel: '取消' }
    ];
    if (window.pywebview && window.pywebview.api && window.pywebview.api.load_yaml) {
        try {
            const yamlStr = await window.pywebview.api.load_yaml('mod/data/exit_prompts.yaml');
            if (yamlStr) {
                let loaded = null;
                if (window.YAML && window.YAML.load) {
                    loaded = window.YAML.load(yamlStr);
                } else {
                    try {
                        const mod = await import('https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm');
                        loaded = mod.load(yamlStr);
                    } catch {}
                }
                if (Array.isArray(loaded) && loaded.length > 0) prompts = loaded;
            }
        } catch {}
    }
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    showExitConfirm(prompt);
}

export function showExitConfirm(prompt) {
    if (document.getElementById('custom-exit-confirm')) return;
    const overlay = document.createElement('div');
    overlay.id = 'custom-exit-confirm';
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.32)';
    overlay.style.zIndex = '20000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = `
      <div style="background:rgba(34,34,34,0.98);backdrop-filter:blur(6px);border-radius:14px;box-shadow:0 4px 32px #000a;padding:32px 36px 24px 36px;min-width:260px;max-width:90vw;display:flex;flex-direction:column;align-items:center;">
        <div style="font-size:1.18em;font-weight:bold;margin-bottom:18px;letter-spacing:1px;color:#fff;text-align:center;">${prompt.message}</div>
        <div style="display:flex;gap:18px;">
          <button id="exit-confirm-yes" style="min-width:90px;min-height:38px;font-size:1em;background:#d9534f;color:#fff;border:none;border-radius:8px;box-shadow:0 2px 8px #0003;cursor:pointer;transition:background 0.18s;">${prompt.confirm}</button>
          <button id="exit-confirm-no" style="min-width:90px;min-height:38px;font-size:1em;background:#444;color:#fff;border:none;border-radius:8px;box-shadow:0 2px 8px #0002;cursor:pointer;transition:background 0.18s;">${prompt.cancel}</button>
        </div>
      </div>
      <style>
        #exit-confirm-yes:hover { background: #b52b27 !important; }
        #exit-confirm-no:hover { background: #222 !important; }
      </style>
    `;
    document.body.appendChild(overlay);
    document.getElementById('exit-confirm-yes').onclick = function() {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.exit_app) {
            window.pywebview.api.exit_app();
        } else {
            window.close();
        }
    };
    document.getElementById('exit-confirm-no').onclick = function() {
        document.body.removeChild(overlay);
    };
}
