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

    const DUO_LAYOUTS = {
        vertical:   { label: 'Vertical' },
        horizontal: { label: 'Horizontal' },
        taiji:      { label: 'Taiji' },
        circles:    { label: 'Circle' },
        hearts:     { label: 'Heart' },
        triangles:  { label: 'Triangle' },
        film:       { label: 'Film' },
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

    function _heartPath(ctx, x, y, w, h) {
        ctx.save();
        ctx.translate(x + w / 2, y + h * 0.56);
        ctx.scale(w * 0.045, h * 0.045);
        ctx.moveTo(0, 6);
        ctx.bezierCurveTo(-20, -12, -30, 8, -15, 22);
        ctx.bezierCurveTo(-5, 31, 0, 36, 0, 36);
        ctx.bezierCurveTo(0, 36, 5, 31, 15, 22);
        ctx.bezierCurveTo(30, 8, 20, -12, 0, 6);
        ctx.restore();
    }

    function _slotPath(ctx, layoutKey, index, w, h, gap) {
        const g = Math.max(0, Math.min(5, Number(gap) || 0));
        const halfG = g / 2;
        ctx.beginPath();
        if (layoutKey === 'horizontal') {
            ctx.rect(0, index === 0 ? 0 : h / 2 + halfG, w, h / 2 - halfG);
        } else if (layoutKey === 'taiji') {
            if (index === 0) {
                ctx.moveTo(w / 2 - halfG, 0);
                ctx.bezierCurveTo(w * 0.15, h * 0.18, w * 0.85, h * 0.32, w / 2 - halfG, h / 2);
                ctx.bezierCurveTo(w * 0.15, h * 0.68, w * 0.85, h * 0.82, w / 2 - halfG, h);
                ctx.lineTo(0, h); ctx.lineTo(0, 0); ctx.closePath();
            } else {
                ctx.moveTo(w / 2 + halfG, 0);
                ctx.bezierCurveTo(w * 0.85, h * 0.18, w * 0.15, h * 0.32, w / 2 + halfG, h / 2);
                ctx.bezierCurveTo(w * 0.85, h * 0.68, w * 0.15, h * 0.82, w / 2 + halfG, h);
                ctx.lineTo(w, h); ctx.lineTo(w, 0); ctx.closePath();
            }
        } else if (layoutKey === 'circles') {
            ctx.arc(index === 0 ? w * 0.32 : w * 0.68, h / 2, Math.max(1, Math.min(w, h) * 0.30 - halfG), 0, Math.PI * 2);
        } else if (layoutKey === 'hearts') {
            _heartPath(ctx, index === 0 ? w * 0.06 + halfG : w * 0.50 + halfG, h * 0.16, w * 0.42 - g, h * 0.58);
        } else if (layoutKey === 'triangles') {
            if (index === 0) { ctx.moveTo(0, 0); ctx.lineTo(w - halfG, 0); ctx.lineTo(0, h - halfG); }
            else { ctx.moveTo(w, h); ctx.lineTo(w, halfG); ctx.lineTo(halfG, h); }
            ctx.closePath();
        } else if (layoutKey === 'film') {
            ctx.rect(w * 0.08, index === 0 ? h * 0.10 + halfG : h * 0.54 + halfG, w * 0.84, h * 0.36 - g);
        } else {
            ctx.rect(index === 0 ? 0 : w / 2 + halfG, 0, w / 2 - halfG, h);
        }
    }

    function _slotBounds(layoutKey, index, w, h, gap) {
        const g = Math.max(0, Math.min(5, Number(gap) || 0));
        if (layoutKey === 'horizontal') return { x: 0, y: index === 0 ? 0 : h / 2 + g / 2, w, h: h / 2 - g / 2 };
        if (layoutKey === 'circles') return { x: (index === 0 ? 0.02 : 0.38) * w, y: h * 0.18, w: w * 0.60, h: h * 0.64 };
        if (layoutKey === 'film') return { x: w * 0.08, y: index === 0 ? h * 0.10 + g / 2 : h * 0.54 + g / 2, w: w * 0.84, h: h * 0.36 - g };
        return { x: index === 0 ? 0 : w / 2 + g / 2, y: 0, w: w / 2 - g / 2, h };
    }

    function _drawSlot(ctx, slot, img, bounds) {
        const scale = Math.max(bounds.w / img.naturalWidth, bounds.h / img.naturalHeight) * Math.max(0.4, slot.scale || 1);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        const x = bounds.x + bounds.w / 2 - dw / 2 + (slot.offsetX || 0) * bounds.w;
        const y = bounds.y + bounds.h / 2 - dh / 2 + (slot.offsetY || 0) * bounds.h;
        ctx.drawImage(img, x, y, dw, dh);
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

    async function createDuo(slots, layoutKey = 'vertical', options = {}) {
        const safeSlots = Array.from({ length: 2 }, (_, i) => slots?.[i] || {});
        const images = await Promise.all(
            safeSlots.map(slot => (slot.image ? _loadImg(slot.image).catch(() => null) : Promise.resolve(null)))
        );
        const w = Math.max(900, ...images.map(img => img ? img.naturalWidth : 0));
        const h = Math.max(900, ...images.map(img => img ? img.naturalHeight : 0));
        const gap = Math.max(0, Math.min(5, Number(options.gap) || 0));
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = options.background || '#141414';
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 2; i++) {
            ctx.save();
            _slotPath(ctx, layoutKey, i, w, h, gap);
            ctx.clip();
            if (images[i]) _drawSlot(ctx, safeSlots[i], images[i], _slotBounds(layoutKey, i, w, h, gap));
            else {
                ctx.fillStyle = '#222';
                ctx.fillRect(0, 0, w, h);
            }
            ctx.restore();
        }
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

    return { LAYOUTS, DUO_LAYOUTS, createGrid, createFromLayout, createDuo };
})();
