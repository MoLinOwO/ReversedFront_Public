// 自訂控制面板與拖拉模組
export function setupPanelDrag(controlsPanel, controlsToggle) {
    // 保存控制面板當前狀態，防止切換全屏時丟失
    let panelState = {
        isOpen: false,
        position: { x: 0, y: 0 }
    };
    
    // 檢查是否有窗口管理器的面板位置
    let defaultPosition = { x: 20, y: 20 };
    
    // 優先使用窗口管理器的面板位置
    if (window.windowState && window.windowState.panelPosition) {
        defaultPosition = window.windowState.panelPosition;
    }
    
    // 初始化時從 localStorage 載入面板狀態
    try {
        const savedState = localStorage.getItem('rf_panel_state');
        if (savedState) {
            const loadedState = JSON.parse(savedState);
            
            // 應用開關狀態
            if (loadedState.isOpen) {
                controlsPanel.style.display = 'block';
                controlsToggle.style.display = 'none';
                panelState.isOpen = true;
            } else {
                controlsPanel.style.display = 'none';
                controlsToggle.style.display = 'flex';
                panelState.isOpen = false;
            }
            
            // 應用位置，但確保位置有效
            if (loadedState.position && 
                loadedState.position.x !== undefined && 
                loadedState.position.y !== undefined) {
                
                // 確保位置在可見區域內
                let x = loadedState.position.x;
                let y = loadedState.position.y;
                
                // 限制位置在視窗範圍內
                const maxX = window.innerWidth - 100; 
                const maxY = window.innerHeight - 100;
                
                if (x < 0) x = 0;
                if (y < 0) y = 0;
                if (x > maxX) x = maxX;
                if (y > maxY) y = maxY;
                
                // 應用有效位置
                controlsPanel.style.left = x + 'px';
                controlsPanel.style.top = y + 'px';
                controlsToggle.style.left = x + 'px';
                controlsToggle.style.top = y + 'px';
                
                // 更新狀態
                panelState.position = { x, y };
                
                // 更新窗口管理器的面板位置
                if (window.windowState) {
                    window.windowState.panelPosition = { x, y };
                }
            } else {
                // 如果沒有有效位置，使用默認位置
                controlsPanel.style.left = defaultPosition.x + 'px';
                controlsPanel.style.top = defaultPosition.y + 'px';
                controlsToggle.style.left = defaultPosition.x + 'px';
                controlsToggle.style.top = defaultPosition.y + 'px';
                
                panelState.position = defaultPosition;
            }
        } else {
            // 沒有保存的狀態，使用默認值
            controlsPanel.style.left = defaultPosition.x + 'px';
            controlsPanel.style.top = defaultPosition.y + 'px';
            controlsToggle.style.left = defaultPosition.x + 'px';
            controlsToggle.style.top = defaultPosition.y + 'px';
            
            panelState.position = defaultPosition;
        }
    } catch (e) {
        console.error('載入面板狀態失敗:', e);
        
        // 出錯時使用默認位置
        controlsPanel.style.left = defaultPosition.x + 'px';
        controlsPanel.style.top = defaultPosition.y + 'px';
        controlsToggle.style.left = defaultPosition.x + 'px';
        controlsToggle.style.top = defaultPosition.y + 'px';
        
        panelState.position = defaultPosition;
    }

    // 展開/收合功能選單
    controlsToggle.onclick = function() {
        if(controlsPanel.style.display === 'none') {
            controlsPanel.style.display = 'block';
            controlsToggle.style.display = 'none';
            // 更新狀態並保存
            panelState.isOpen = true;
            localStorage.setItem('rf_panel_state', JSON.stringify(panelState));
        }
    };
    
    // 暴露全局切換函數供 ESC 鍵調用
    window.toggleControlPanel = function() {
        if (controlsPanel.style.display === 'none' || !controlsPanel.style.display) {
            // 展開選單
            controlsPanel.style.display = 'block';
            controlsToggle.style.display = 'none';
            panelState.isOpen = true;
        } else {
            // 收合選單
            controlsPanel.style.display = 'none';
            controlsToggle.style.display = 'flex';
            panelState.isOpen = false;
        }
        localStorage.setItem('rf_panel_state', JSON.stringify(panelState));
    };
    
    // 點擊外部區域關閉面板
    document.addEventListener('mousedown', function(e) {
        if(controlsPanel.style.display !== 'none' && !controlsPanel.contains(e.target) && !controlsToggle.contains(e.target)) {
            // 檢查是否點擊了其他對話框或特殊元素
            const clickedOnDialog = e.target.closest('.dialog') || e.target.closest('#ranking-modal') || e.target.closest('#faction-map-canvas-container');
            if (!clickedOnDialog) {
                // 直接切換面板
                controlsPanel.style.display = 'none';
                controlsToggle.style.display = 'flex';
                panelState.isOpen = false;
                localStorage.setItem('rf_panel_state', JSON.stringify(panelState));
            }
        }
    });
    // 讓功能選單可滑鼠拖拉移動
    (function() {
        const panel = controlsPanel;
        let isDragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
        panel.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'FORM' || e.target.isContentEditable) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            origX = rect.left;
            origY = rect.top;
            document.body.style.userSelect = 'none';
        });
        window.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            let dx = e.clientX - startX;
            let dy = e.clientY - startY;
            panel.style.left = (origX + dx) + 'px';
            panel.style.top = (origY + dy) + 'px';
            panel.style.right = 'auto';
        });
        window.addEventListener('mouseup', function() {
            if (isDragging) {
                // 拖拉結束時修正位置
                const rect = panel.getBoundingClientRect();
                const minX = 0, minY = 0;
                const maxX = window.innerWidth - Math.min(rect.width, 300); // 確保至少部分可見
                const maxY = window.innerHeight - Math.min(rect.height, 100);
                let newLeft = rect.left, newTop = rect.top;
                if (rect.left < minX) newLeft = minX;
                if (rect.top < minY) newTop = minY;
                if (rect.left > maxX) newLeft = maxX;
                if (rect.top > maxY) newTop = maxY;
                panel.style.left = newLeft + 'px';
                panel.style.top = newTop + 'px';
                
                // 更新全局窗口管理器的面板位置
                if (window.windowState) {
                    window.windowState.panelPosition = { x: newLeft, y: newTop };
                }
                
                // 保存面板位置到 localStorage
                try {
                    const savedState = localStorage.getItem('rf_panel_state') || '{}';
                    const panelState = JSON.parse(savedState);
                    panelState.position = { x: newLeft, y: newTop };
                    panelState.timestamp = Date.now(); // 添加時間戳
                    localStorage.setItem('rf_panel_state', JSON.stringify(panelState));
                } catch (e) {
                    console.error('保存面板位置失敗:', e);
                }
            }
            isDragging = false;
            document.body.style.userSelect = '';
        });
        panel.style.position = 'fixed';
        panel.style.top = panel.style.top || '20px';
        panel.style.right = panel.style.right || '20px';
    })();
    // 小按鈕也能拖拉移動，並同步展開選單位置
    (function() {
        const toggleBtn = controlsToggle;
        const panel = controlsPanel;
        let isDragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
        toggleBtn.addEventListener('mousedown', function(e) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = toggleBtn.getBoundingClientRect();
            origX = rect.left;
            origY = rect.top;
            document.body.style.userSelect = 'none';
        });
        window.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            let dx = e.clientX - startX;
            let dy = e.clientY - startY;
            toggleBtn.style.left = (origX + dx) + 'px';
            toggleBtn.style.top = (origY + dy) + 'px';
            toggleBtn.style.right = 'auto';
            panel.style.left = toggleBtn.style.left;
            panel.style.top = toggleBtn.style.top;
            panel.style.right = 'auto';
        });
        window.addEventListener('mouseup', function() {
            if (isDragging) {
                // 拖拉結束時修正位置
                const rect = toggleBtn.getBoundingClientRect();
                const minX = 0, minY = 0;
                const maxX = window.innerWidth - rect.width;
                const maxY = window.innerHeight - rect.height;
                let newLeft = rect.left, newTop = rect.top;
                if (rect.left < minX) newLeft = minX;
                if (rect.top < minY) newTop = minY;
                if (rect.left > maxX) newLeft = maxX;
                if (rect.top > maxY) newTop = maxY;
                toggleBtn.style.left = newLeft + 'px';
                toggleBtn.style.top = newTop + 'px';
                // 同步 panel 位置
                panel.style.left = newLeft + 'px';
                panel.style.top = newTop + 'px';
                
                // 保存面板位置
                try {
                    const savedState = localStorage.getItem('rf_panel_state') || '{}';
                    const panelState = JSON.parse(savedState);
                    panelState.position = { x: newLeft, y: newTop };
                    localStorage.setItem('rf_panel_state', JSON.stringify(panelState));
                } catch (e) {
                    console.error('保存面板位置失敗:', e);
                }
            }
            isDragging = false;
            document.body.style.userSelect = '';
        });
        toggleBtn.style.position = 'fixed';
        toggleBtn.style.top = toggleBtn.style.top || '20px';
        toggleBtn.style.right = toggleBtn.style.right || '20px';
    })();
}