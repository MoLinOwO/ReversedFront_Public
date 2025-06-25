// 排行榜浮層可拖拉
export function setupRankingPanelDrag() {
    (function() {
        const panel = document.getElementById('ranking-panel');
        let isDragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
        panel.addEventListener('mousedown', function(e) {
            if (e.button !== 0 || e.target.id === 'close-ranking-modal') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            origX = rect.left;
            origY = rect.top;
            panel.style.transition = 'none';
            document.body.style.userSelect = 'none';
        });
        window.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            let dx = e.clientX - startX;
            let dy = e.clientY - startY;
            panel.style.left = (origX + dx) + 'px';
            panel.style.top = (origY + dy) + 'px';
            panel.style.transform = 'none';
        });
        window.addEventListener('mouseup', function() {
            isDragging = false;
            document.body.style.userSelect = '';
        });
        panel.style.position = 'fixed';
        panel.style.top = panel.style.top || '50%';
        panel.style.left = panel.style.left || '50%';
        panel.style.transform = panel.style.transform || 'translate(-50%,-50%)';
    })();
}