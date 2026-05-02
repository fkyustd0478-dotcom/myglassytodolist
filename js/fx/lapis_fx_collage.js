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
        vertical:   { label: '2V', count: 2 },
        horizontal: { label: '2H', count: 2 },
        curve2:     { label: 'Curve', count: 2 },
        grid3:      { label: '3 Grid', count: 3 },
        stack3:     { label: '3 Stack', count: 3 },
        grid4:      { label: '4 Grid', count: 4 },
        taiji:      { label: 'Taiji' },
        circles:    { label: 'Circle' },
        hearts:     { label: 'Heart' },
        overlapHearts: { label: 'Heart Stack' },
        inset:      { label: 'Inset' },
        diagonal:   { label: 'Diagonal' },
        circleOverlap: { label: 'Circle Stack' },
        triangles:  { label: 'Triangle' },
        film:       { label: 'Film' },
    };
    const FIXED_LAYOUTS = {
        vertical: DUO_LAYOUTS.vertical,
        horizontal: DUO_LAYOUTS.horizontal,
        curve2: DUO_LAYOUTS.curve2,
        grid3: DUO_LAYOUTS.grid3,
        stack3: DUO_LAYOUTS.stack3,
        grid4: DUO_LAYOUTS.grid4,
    };

    function layoutCount(layoutKey) {
        return Math.max(2, Math.min(4, Number((DUO_LAYOUTS[layoutKey] || {}).count) || 2));
    }

    const CollageManager = {
        createSlot(layoutKey = 'vertical', index = 0) {
            return {
                sourceImage: '',
                maskPath: `${layoutKey}:${index}`,
                viewport: { x: 0, y: 0, scale: 1 },
                bounds: { x: 0, y: 0, w: 0, h: 0 },
                fixed: false,
            };
        },
        createSlots(layoutKey = 'vertical', count = 2) {
            return Array.from({ length: count || layoutCount(layoutKey) }, (_, index) => this.createSlot(layoutKey, index));
        },
        applyLayout(slots, layoutKey = 'vertical') {
            return Array.from({ length: layoutCount(layoutKey) }, (_, index) => {
                const slot = slots?.[index] || this.createSlot(layoutKey, index);
                return {
                    ...slot,
                    maskPath: `${layoutKey}:${index}`,
                    bounds: { x: 0, y: 0, w: 0, h: 0 },
                };
            });
        },
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

    function _gap(gap) {
        return Math.max(0, Math.min(5, Number(gap) || 0));
    }

    function _hasBounds(slot) {
        const b = slot?.bounds;
        return b && b.w > 0 && b.h > 0;
    }

    function _shapeFor(layoutKey, index) {
        if (layoutKey === 'curve2') return index === 0 ? 'curve-a' : 'curve-b';
        if (layoutKey === 'hearts' || layoutKey === 'overlapHearts') return 'heart';
        if (layoutKey === 'circles' || layoutKey === 'circleOverlap') return 'circle';
        if (layoutKey === 'triangles') return index === 0 ? 'tri-a' : 'tri-b';
        if (layoutKey === 'diagonal') return index === 0 ? 'diag-a' : 'diag-b';
        if (layoutKey === 'taiji') return index === 0 ? 'taiji-a' : 'taiji-b';
        return 'rect';
    }

    function getSlotGeometry(layoutKey, index, gap = 0, slot = null) {
        const g = _gap(gap);
        if (_hasBounds(slot)) return { bounds: slot.bounds, shape: _shapeFor(layoutKey, index) };
        if (layoutKey === 'curve2') return { bounds: { x: 0, y: 0, w: 1, h: 1 }, shape: index === 0 ? 'curve-a' : 'curve-b' };
        if (layoutKey === 'grid3') {
            if (index === 0) return { bounds: { x: 0, y: 0, w: 0.5, h: 1 }, shape: 'rect' };
            return { bounds: { x: 0.5, y: index === 1 ? 0 : 0.5, w: 0.5, h: 0.5 }, shape: 'rect' };
        }
        if (layoutKey === 'stack3') return { bounds: { x: 0, y: index / 3, w: 1, h: 1 / 3 }, shape: 'rect' };
        if (layoutKey === 'grid4') return { bounds: { x: index % 2 ? 0.5 : 0, y: index > 1 ? 0.5 : 0, w: 0.5, h: 0.5 }, shape: 'rect' };
        if (layoutKey === 'horizontal') return { bounds: { x: 0, y: index === 0 ? 0 : 0.5 + g / 1800, w: 1, h: 0.5 - g / 1800 }, shape: 'rect' };
        if (layoutKey === 'circles') return { bounds: { x: index === 0 ? 0.03 : 0.37, y: 0.18, w: 0.60, h: 0.64 }, shape: 'circle' };
        if (layoutKey === 'hearts') return { bounds: { x: index === 0 ? 0.06 : 0.52, y: 0.16, w: 0.42, h: 0.58 }, shape: 'heart' };
        if (layoutKey === 'overlapHearts') {
            const push = g / 900;
            return { bounds: { x: index === 0 ? 0.13 - push : 0.35 + push, y: index === 0 ? 0.22 : 0.18, w: 0.52, h: 0.56 }, shape: 'heart' };
        }
        if (layoutKey === 'inset') {
            return index === 0
                ? { bounds: { x: 0, y: 0, w: 1, h: 1 }, shape: 'rect' }
                : { bounds: { x: 0.28 + g / 900, y: 0.28 + g / 900, w: 0.44, h: 0.44 }, shape: 'rect' };
        }
        if (layoutKey === 'diagonal') return { bounds: { x: 0, y: 0, w: 1, h: 1 }, shape: index === 0 ? 'diag-a' : 'diag-b' };
        if (layoutKey === 'circleOverlap') {
            const push = g / 900;
            return { bounds: { x: index === 0 ? 0.12 - push : 0.30 + push, y: index === 0 ? 0.20 : 0.26, w: 0.58, h: 0.58 }, shape: 'circle' };
        }
        if (layoutKey === 'triangles') return { bounds: { x: 0, y: 0, w: 1, h: 1 }, shape: index === 0 ? 'tri-a' : 'tri-b' };
        if (layoutKey === 'film') return { bounds: { x: 0.08, y: index === 0 ? 0.10 + g / 1800 : 0.54 + g / 1800, w: 0.84, h: 0.36 - g / 900 }, shape: 'rect' };
        if (layoutKey === 'taiji') return { bounds: { x: 0, y: 0, w: 1, h: 1 }, shape: index === 0 ? 'taiji-a' : 'taiji-b' };
        return { bounds: { x: index === 0 ? 0 : 0.5 + g / 1800, y: 0, w: 0.5 - g / 1800, h: 1 }, shape: 'rect' };
    }

    function _toPixels(bounds, w, h) {
        return { x: bounds.x * w, y: bounds.y * h, w: bounds.w * w, h: bounds.h * h };
    }

    function _slotPath(ctx, layoutKey, index, w, h, gap, slot) {
        const g = Math.max(0, Math.min(5, Number(gap) || 0));
        const halfG = g / 2;
        const geo = getSlotGeometry(layoutKey, index, g, slot);
        const b = _toPixels(geo.bounds, w, h);
        ctx.beginPath();
        if (geo.shape === 'taiji-a' || geo.shape === 'taiji-b') {
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
        } else if (geo.shape === 'circle') {
            ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, Math.max(1, b.w / 2 - halfG), Math.max(1, b.h / 2 - halfG), 0, 0, Math.PI * 2);
        } else if (geo.shape === 'heart') {
            _heartPath(ctx, b.x + halfG, b.y + halfG, b.w - g, b.h - g);
        } else if (geo.shape === 'curve-a') {
            ctx.moveTo(0, 0);
            ctx.lineTo(w * 0.54, 0);
            ctx.bezierCurveTo(w * 0.32, h * 0.28, w * 0.68, h * 0.72, w * 0.46, h);
            ctx.lineTo(0, h);
            ctx.closePath();
        } else if (geo.shape === 'curve-b') {
            ctx.moveTo(w * 0.54, 0);
            ctx.lineTo(w, 0);
            ctx.lineTo(w, h);
            ctx.lineTo(w * 0.46, h);
            ctx.bezierCurveTo(w * 0.68, h * 0.72, w * 0.32, h * 0.28, w * 0.54, 0);
            ctx.closePath();
        } else if (geo.shape === 'tri-a' || geo.shape === 'diag-a') {
            ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + b.w - halfG, b.y); ctx.lineTo(b.x, b.y + b.h - halfG); ctx.closePath();
        } else if (geo.shape === 'tri-b' || geo.shape === 'diag-b') {
            ctx.moveTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.lineTo(b.x, b.y + b.h); ctx.closePath();
        } else {
            ctx.rect(b.x + halfG, b.y + halfG, Math.max(1, b.w - g), Math.max(1, b.h - g));
        }
    }

    function _slotBounds(layoutKey, index, w, h, gap, slot) {
        return _toPixels(getSlotGeometry(layoutKey, index, gap, slot).bounds, w, h);
    }

    function slotCss(layoutKey, index, gap = 0, slot = null) {
        const geo = getSlotGeometry(layoutKey, index, gap, slot);
        const b = geo.bounds;
        const style = {
            left: `${b.x * 100}%`,
            top: `${b.y * 100}%`,
            width: `${b.w * 100}%`,
            height: `${b.h * 100}%`,
        };
        if (geo.shape === 'circle') style.borderRadius = '9999px';
        if (geo.shape === 'heart') style.clipPath = "path('M50 92 C50 92 8 62 8 31 C8 9 34 3 50 24 C66 3 92 9 92 31 C92 62 50 92 50 92 Z')";
        if (geo.shape === 'curve-a') style.clipPath = 'path("M0 0 L54 0 C32 28 68 72 46 100 L0 100 Z")';
        if (geo.shape === 'curve-b') style.clipPath = 'path("M54 0 L100 0 L100 100 L46 100 C68 72 32 28 54 0 Z")';
        if (geo.shape === 'tri-a' || geo.shape === 'diag-a') style.clipPath = 'polygon(0 0, 100% 0, 0 100%)';
        if (geo.shape === 'tri-b' || geo.shape === 'diag-b') style.clipPath = 'polygon(100% 0, 100% 100%, 0 100%)';
        if (geo.shape === 'taiji-a') style.clipPath = 'path("M50 0 C15 18 85 32 50 50 C15 68 85 82 50 100 L0 100 L0 0 Z")';
        if (geo.shape === 'taiji-b') style.clipPath = 'path("M50 0 C85 18 15 32 50 50 C85 68 15 82 50 100 L100 100 L100 0 Z")';
        return style;
    }

    function _drawSlot(ctx, slot, img, bounds) {
        const viewport = slot.viewport || {};
        const scale = Math.max(bounds.w / img.naturalWidth, bounds.h / img.naturalHeight) * Math.max(0.4, viewport.scale || slot.scale || 1);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        const vx = viewport.x ?? slot.offsetX ?? 0;
        const vy = viewport.y ?? slot.offsetY ?? 0;
        const x = bounds.x + bounds.w / 2 - dw / 2 + vx * bounds.w;
        const y = bounds.y + bounds.h / 2 - dh / 2 + vy * bounds.h;
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
        const count = layoutCount(layoutKey);
        const safeSlots = Array.from({ length: count }, (_, i) => slots?.[i] || {});
        const images = await Promise.all(
            safeSlots.map(slot => {
                const src = slot.sourceImage || slot.image;
                return src ? _loadImg(src).catch(() => null) : Promise.resolve(null);
            })
        );
        const w = Math.max(900, ...images.map(img => img ? img.naturalWidth : 0));
        const h = Math.max(900, ...images.map(img => img ? img.naturalHeight : 0));
        const gap = Math.max(0, Math.min(5, Number(options.gap) || 0));
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = options.background || '#141414';
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < count; i++) {
            ctx.save();
            _slotPath(ctx, layoutKey, i, w, h, gap, safeSlots[i]);
            ctx.clip();
            if (images[i]) _drawSlot(ctx, safeSlots[i], images[i], _slotBounds(layoutKey, i, w, h, gap, safeSlots[i]));
            else {
                ctx.fillStyle = '#222';
                ctx.fillRect(0, 0, w, h);
            }
            ctx.restore();
        }
        return cvs;
    }

    function _freeformMask(ctx, mask, w, h) {
        const sx = w / 2;
        const sy = h / 2;
        ctx.beginPath();
        if (mask === 'circle') {
            ctx.ellipse(0, 0, sx, sy, 0, 0, Math.PI * 2);
        } else if (mask === 'heart') {
            const p = (nx, ny) => [(nx - 50) * w / 100, (ny - 50) * h / 100];
            ctx.moveTo(...p(50, 92));
            ctx.bezierCurveTo(...p(50, 92), ...p(8, 62), ...p(8, 31));
            ctx.bezierCurveTo(...p(8, 9), ...p(34, 3), ...p(50, 24));
            ctx.bezierCurveTo(...p(66, 3), ...p(92, 9), ...p(92, 31));
            ctx.bezierCurveTo(...p(92, 62), ...p(50, 92), ...p(50, 92));
            ctx.closePath();
        } else if (mask === 'triangle') {
            ctx.moveTo(0, -sy);
            ctx.lineTo(sx, sy);
            ctx.lineTo(-sx, sy);
            ctx.closePath();
        } else if (mask === 'star') {
            for (let i = 0; i < 10; i++) {
                const r = i % 2 === 0 ? 1 : 0.45;
                const a = -Math.PI / 2 + i * Math.PI / 5;
                const x = Math.cos(a) * sx * r;
                const y = Math.sin(a) * sy * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
        } else {
            ctx.rect(-sx, -sy, w, h);
        }
    }

    async function createFreeform(items, options = {}) {
        const size = Math.max(600, Number(options.size) || 1080);
        const safeItems = (items || []).filter(item => item?.sourceImage || item?.image);
        const images = await Promise.all(safeItems.map(item => _loadImg(item.sourceImage || item.image).catch(() => null)));
        const cvs = document.createElement('canvas');
        cvs.width = size; cvs.height = size;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = options.background || '#141414';
        ctx.fillRect(0, 0, size, size);

        safeItems
            .map((item, index) => ({ item, img: images[index] }))
            .filter(entry => entry.img)
            .sort((a, b) => (a.item.zIndex || 0) - (b.item.zIndex || 0))
            .forEach(({ item, img }) => {
                const base = size * Math.max(0.12, Math.min(1.2, item.scale || 0.34));
                const boxW = base * Math.max(0.35, Math.min(2, item.scaleX || 1));
                const boxH = base * Math.max(0.35, Math.min(2, item.scaleY || 1));
                ctx.save();
                ctx.translate((item.x ?? 0.5) * size, (item.y ?? 0.5) * size);
                ctx.rotate(((item.rotation || 0) * Math.PI) / 180);
                ctx.shadowColor = item.shadow ? 'rgba(0,0,0,0.28)' : 'transparent';
                ctx.shadowBlur = item.shadow ? size * 0.018 : 0;
                ctx.shadowOffsetY = item.shadow ? size * 0.012 : 0;
                _freeformMask(ctx, item.mask || 'square', boxW, boxH);
                ctx.clip();
                _drawCover(ctx, img, -boxW / 2, -boxH / 2, boxW, boxH);
                ctx.restore();
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

    return { LAYOUTS, DUO_LAYOUTS, FIXED_LAYOUTS, CollageManager, layoutCount, getSlotGeometry, slotCss, createGrid, createFromLayout, createDuo, createFreeform };
})();
