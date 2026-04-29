'use strict';
window.LapisFXCollage = (() => {

    const LAYOUTS = {
        '1x2': { cols: 1, rows: 2, label: '1×2' },
        '2x1': { cols: 2, rows: 1, label: '2×1' },
        '2x2': { cols: 2, rows: 2, label: '2×2' },
        '2x3': { cols: 2, rows: 3, label: '2×3' },
        '3x2': { cols: 3, rows: 2, label: '3×2' },
        '3x3': { cols: 3, rows: 3, label: '3×3' },
    };

    function _loadImg(url) {
        return new Promise((res, rej) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload  = () => res(img);
            img.onerror = () => rej(new Error('IMG_FAIL'));
            img.src = url;
        });
    }

    function _drawCover(ctx, img, dx, dy, cellW, cellH) {
        const scale = Math.max(cellW / img.naturalWidth, cellH / img.naturalHeight);
        const sw    = img.naturalWidth  * scale;
        const sh    = img.naturalHeight * scale;
        const ox    = (cellW - sw) / 2;
        const oy    = (cellH - sh) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(dx, dy, cellW, cellH);
        ctx.clip();
        ctx.drawImage(img, dx + ox, dy + oy, sw, sh);
        ctx.restore();
    }

    // Build canvas from flat array of URLs (null = empty placeholder cell).
    async function createGrid(urls, cols = 2, gap = 10) {
        const results = await Promise.all(
            (urls || []).map(u => (u ? _loadImg(u).catch(() => null) : Promise.resolve(null)))
        );
        const rows = Math.ceil(results.length / cols);
        let cellW = 0, cellH = 0;
        results.forEach(img => {
            if (img) {
                cellW = Math.max(cellW, img.naturalWidth);
                cellH = Math.max(cellH, img.naturalHeight);
            }
        });
        if (cellW < 1) cellW = 600;
        if (cellH < 1) cellH = 600;

        const totalW = cols * cellW + (cols + 1) * gap;
        const totalH = rows * cellH + (rows + 1) * gap;
        const cvs = document.createElement('canvas');
        cvs.width = totalW; cvs.height = totalH;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#141414';
        ctx.fillRect(0, 0, totalW, totalH);

        results.forEach((img, i) => {
            const c  = i % cols;
            const r  = Math.floor(i / cols);
            const dx = gap + c * (cellW + gap);
            const dy = gap + r * (cellH + gap);
            if (img) {
                _drawCover(ctx, img, dx, dy, cellW, cellH);
            } else {
                ctx.fillStyle = '#222';
                ctx.fillRect(dx, dy, cellW, cellH);
                ctx.strokeStyle = 'rgba(255,255,255,0.10)';
                ctx.lineWidth = 1;
                ctx.strokeRect(dx + 0.5, dy + 0.5, cellW - 1, cellH - 1);
            }
        });
        return cvs;
    }

    // Build from named layout + per-cell URL array.
    async function createFromLayout(layoutKey, cellUrls, gap = 10) {
        const layout       = LAYOUTS[layoutKey] || LAYOUTS['2x2'];
        const { cols, rows } = layout;
        const count        = cols * rows;
        const urls         = Array.from({ length: count }, (_, i) => cellUrls[i] || null);
        return createGrid(urls, cols, gap);
    }

    return { LAYOUTS, createGrid, createFromLayout };
})();
