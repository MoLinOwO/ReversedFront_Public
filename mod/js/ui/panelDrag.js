// 自訂控制面板與拖拉模組
export function setupPanelDrag(controlsPanel, controlsToggle) {
    // ...existing code...
    // 展開/收合功能選單
    controlsToggle.onclick = function() {
        if(controlsPanel.style.display === 'none') {
            controlsPanel.style.display = 'block';
            controlsToggle.style.display = 'none';
        }
    };
    document.addEventListener('mousedown', function(e) {
        if(controlsPanel.style.display !== 'none' && !controlsPanel.contains(e.target) && !controlsToggle.contains(e.target)) {
            controlsPanel.style.display = 'none';
            controlsToggle.style.display = 'flex';
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
        // 新增觸控支援
        panel.addEventListener('touchstart', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'FORM' || e.target.isContentEditable) return;
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
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
        // 新增觸控移動支援
        window.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            const touch = e.touches[0];
            let dx = touch.clientX - startX;
            let dy = touch.clientY - startY;
            panel.style.left = (origX + dx) + 'px';
            panel.style.top = (origY + dy) + 'px';
            panel.style.right = 'auto';
        }, { passive: false });
        window.addEventListener('mouseup', function() {
            if (isDragging) {
                // 拖拉結束時修正位置
                const rect = panel.getBoundingClientRect();
                const minX = 0, minY = 0;
                const maxX = window.innerWidth - rect.width;
                const maxY = window.innerHeight - rect.height;
                let newLeft = rect.left, newTop = rect.top;
                if (rect.left < minX) newLeft = minX;
                if (rect.top < minY) newTop = minY;
                if (rect.left > maxX) newLeft = maxX;
                if (rect.top > maxY) newTop = maxY;
                panel.style.left = newLeft + 'px';
                panel.style.top = newTop + 'px';
            }
            isDragging = false;
            document.body.style.userSelect = '';
        });
        // 新增觸控結束支援
        window.addEventListener('touchend', function() {
            if (isDragging) {
                const rect = panel.getBoundingClientRect();
                const minX = 0, minY = 0;
                const maxX = window.innerWidth - rect.width;
                const maxY = window.innerHeight - rect.height;
                let newLeft = rect.left, newTop = rect.top;
                if (rect.left < minX) newLeft = minX;
                if (rect.top < minY) newTop = minY;
                if (rect.left > maxX) newLeft = maxX;
                if (rect.top > maxY) newTop = maxY;
                panel.style.left = newLeft + 'px';
                panel.style.top = newTop + 'px';
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
        // 新增觸控支援
        toggleBtn.addEventListener('touchstart', function(e) {
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
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
        // 新增觸控移動支援
        window.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            const touch = e.touches[0];
            let dx = touch.clientX - startX;
            let dy = touch.clientY - startY;
            toggleBtn.style.left = (origX + dx) + 'px';
            toggleBtn.style.top = (origY + dy) + 'px';
            toggleBtn.style.right = 'auto';
            panel.style.left = toggleBtn.style.left;
            panel.style.top = toggleBtn.style.top;
            panel.style.right = 'auto';
        }, { passive: false });
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
            }
            isDragging = false;
            document.body.style.userSelect = '';
        });
        // 新增觸控結束支援
        window.addEventListener('touchend', function() {
            if (isDragging) {
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
                panel.style.left = newLeft + 'px';
                panel.style.top = newTop + 'px';
            }
            isDragging = false;
            document.body.style.userSelect = '';
        });
        toggleBtn.style.position = 'fixed';
        toggleBtn.style.top = toggleBtn.style.top || '20px';
        toggleBtn.style.right = toggleBtn.style.right || '20px';
    })();
}