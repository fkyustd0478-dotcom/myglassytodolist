'use strict';
window.LapisFXJigsaw = (() => {

    function _depth(intensity) {
        return Math.max(0.2, Math.min(1.2, intensity || 1));
    }

    function _drawPieceShadow(ctx, x, y, w, h, intensity) {
        const d = _depth(intensity);
        ctx.save();
        ctx.shadowBlur = 8 * d;
        ctx.shadowColor = 'rgba(0,0,0,0.34)';
        ctx.shadowOffsetX = 2 * d;
        ctx.shadowOffsetY = 3 * d;
        ctx.fillStyle = 'rgba(0,0,0,0.10)';
        ctx.fillRect(x, y, w, h);
        ctx.restore();
    }

    function _drawPieceDepth(ctx, x, y, w, h, intensity) {
        const d = _depth(intensity);
        const lw = Math.max(1, Math.min(w, h) * 0.012);
        ctx.save();
        ctx.lineCap = 'square';
        ctx.lineWidth = lw;
        ctx.strokeStyle = `rgba(255,255,255,${0.26 * d})`;
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.stroke();
        ctx.strokeStyle = `rgba(0,0,0,${0.22 * d})`;
        ctx.beginPath();
        ctx.moveTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.stroke();
        ctx.restore();
    }

    // ── Static: puzzle-line grid overlay ─────────────────────────────────────
    function _gridSize(config) {
        const n = Number(config.gridSize || 4);
        return Math.max(3, Math.min(6, Math.round(n)));
    }

    function _centerRoi(width, height, range = 1) {
        const pct = Math.max(0.25, Math.min(1, Number(range) || 1));
        const rw = width * pct;
        const rh = height * pct;
        return {
            x: (width - rw) / 2,
            y: (height - rh) / 2,
            w: rw,
            h: rh,
        };
    }

    function _isFullRoi(src, roi) {
        return !roi ||
            (roi.x <= 0.5 && roi.y <= 0.5 &&
             Math.abs(roi.w - src.width) <= 1 &&
             Math.abs(roi.h - src.height) <= 1);
    }

    function _cropRegion(src, roi) {
        const crop = document.createElement('canvas');
        crop.width = Math.max(1, Math.round(roi.w));
        crop.height = Math.max(1, Math.round(roi.h));
        crop.getContext('2d').drawImage(
            src,
            roi.x, roi.y, roi.w, roi.h,
            0, 0, crop.width, crop.height
        );
        return crop;
    }

    function createLayout(width, height, gridSize = 4, intensity = 1, options = {}) {
        const cols = Math.max(3, Math.min(6, Math.round(gridSize)));
        const rows = cols;
        const roi = options.roi || _centerRoi(width, height, options.range || 1);
        const pw = roi.w / cols, ph = roi.h / rows;
        const maxDrift = Math.min(pw, ph) * 0.55 * intensity;
        const maxRot = 0.32 * intensity;
        const pure = !!options.pure;
        const pieces = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                pieces.push({
                    id: `${r}-${c}`, r, c,
                    ox: pure ? 0 : (Math.random() - 0.5) * 2 * maxDrift,
                    oy: pure ? 0 : (Math.random() - 0.5) * 2 * maxDrift,
                    angle: pure ? 0 : (Math.random() - 0.5) * 2 * maxRot,
                });
            }
        }
        return { width, height, gridSize: cols, roi, pure, pieces };
    }

    function _layoutPiece(layout, r, c) {
        return layout?.pieces?.find(p => p.r === r && p.c === c);
    }

    function _hEdge(ctx, x0, y, x1, dir, tab) {
        const mid = (x0 + x1) / 2;
        const sign = x1 >= x0 ? 1 : -1;
        ctx.lineTo(mid - sign * tab, y);
        ctx.bezierCurveTo(
            mid - sign * tab, y + dir * tab,
            mid + sign * tab, y + dir * tab,
            mid + sign * tab, y
        );
        ctx.lineTo(x1, y);
    }

    function _vEdge(ctx, x, y0, y1, dir, tab) {
        const mid = (y0 + y1) / 2;
        const sign = y1 >= y0 ? 1 : -1;
        ctx.lineTo(x, mid - sign * tab);
        ctx.bezierCurveTo(
            x + dir * tab, mid - sign * tab,
            x + dir * tab, mid + sign * tab,
            x, mid + sign * tab
        );
        ctx.lineTo(x, y1);
    }

    function _piecePath(ctx, x, y, w, h, c, r, cols, rows) {
        const tab = Math.min(w, h) * 0.18;
        const topDir = (r + c) % 2 === 0 ? -1 : 1;
        const rightDir = (r + c) % 2 === 0 ? 1 : -1;
        const bottomDir = (r + c) % 2 === 0 ? 1 : -1;
        const leftDir = (r + c) % 2 === 0 ? -1 : 1;

        ctx.moveTo(x, y);
        r === 0 ? ctx.lineTo(x + w, y) : _hEdge(ctx, x, y, x + w, topDir, tab);
        c === cols - 1 ? ctx.lineTo(x + w, y + h) : _vEdge(ctx, x + w, y, y + h, rightDir, tab);
        r === rows - 1 ? ctx.lineTo(x, y + h) : _hEdge(ctx, x + w, y + h, x, bottomDir, tab);
        c === 0 ? ctx.lineTo(x, y) : _vEdge(ctx, x, y + h, y, leftDir, tab);
        ctx.closePath();
    }

    function _drawPuzzleCutout(ctx, src, pcx, pcy, pw, ph, c, r, cols, rows, intensity) {
        const gap = 2.5;
        const x = -pw / 2 + gap / 2;
        const y = -ph / 2 + gap / 2;
        const sw = pw - gap;
        const sh = ph - gap;
        const d = _depth(intensity);

        ctx.save();
        ctx.shadowBlur = 10 * d;
        ctx.shadowColor = 'rgba(0,0,0,0.38)';
        ctx.shadowOffsetX = 3 * d;
        ctx.shadowOffsetY = 4 * d;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        _piecePath(ctx, x, y, sw, sh, c, r, cols, rows);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        _piecePath(ctx, x, y, sw, sh, c, r, cols, rows);
        ctx.clip();
        ctx.drawImage(src, -pcx, -pcy);
        ctx.restore();

        ctx.beginPath();
        _piecePath(ctx, x, y, sw, sh, c, r, cols, rows);
        ctx.strokeStyle = 'rgba(255,255,255,0.70)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.beginPath();
        _piecePath(ctx, x + 1, y + 1, sw, sh, c, r, cols, rows);
        ctx.strokeStyle = 'rgba(0,0,0,0.34)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
    }

    function _jigsawStatic(src, gridSize, layout, intensity) {
        if (layout?.pieces?.length) return _jigsawScattered(src, intensity, gridSize, layout);

        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(src, 0, 0);
        const cols = gridSize, rows = gridSize;
        const pw = w / cols, ph = h / rows;
        const tab = Math.min(pw, ph) * 0.22;

        function hSeg(y, x0, x1, dir) {
            const mx = (x0 + x1) / 2;
            ctx.moveTo(x0, y);
            ctx.lineTo(mx - tab, y);
            ctx.bezierCurveTo(mx - tab, y + dir * tab * 1.9, mx + tab, y + dir * tab * 1.9, mx + tab, y);
            ctx.lineTo(x1, y);
        }
        function vSeg(x, y0, y1, dir) {
            const my = (y0 + y1) / 2;
            ctx.moveTo(x, y0);
            ctx.lineTo(x, my - tab);
            ctx.bezierCurveTo(x + dir * tab * 1.9, my - tab, x + dir * tab * 1.9, my + tab, x, my + tab);
            ctx.lineTo(x, y1);
        }
        function grid(ox, oy, style, lw) {
            ctx.strokeStyle = style; ctx.lineWidth = lw; ctx.lineCap = 'butt';
            for (let r = 1; r < rows; r++)
                for (let c = 0; c < cols; c++) {
                    ctx.beginPath();
                    hSeg(r * ph + oy, c * pw, (c + 1) * pw, (r + c) % 2 === 0 ? 1 : -1);
                    ctx.stroke();
                }
            for (let c = 1; c < cols; c++)
                for (let r = 0; r < rows; r++) {
                    ctx.beginPath();
                    vSeg(c * pw + ox, r * ph, (r + 1) * ph, (r + c) % 2 === 0 ? 1 : -1);
                    ctx.stroke();
                }
        }
        ctx.save();
        ctx.shadowBlur = Math.max(3, Math.min(w, h) * 0.006);
        ctx.shadowColor = 'rgba(0,0,0,0.26)';
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        grid(1, 1, 'rgba(0,0,0,0.24)', 2.2);
        ctx.restore();
        grid(0, 0, 'rgba(255,255,255,0.88)', 2.5);
        grid(1, 1, 'rgba(0,0,0,0.42)', 1.2);
        return cvs;
    }

    function _renderVariant(src, variant, intensity, gridSize, layout) {
        switch (variant) {
            case 'explode':   return _jigsawExplode(src, intensity, gridSize, layout);
            case 'drift':     return _jigsawDrift(src, intensity, gridSize, layout);
            case 'gravity':   return _jigsawGravity(src, intensity, gridSize, layout);
            case 'scattered': return _jigsawScattered(src, intensity, gridSize, layout);
            default:          return _jigsawStatic(src, gridSize, layout, intensity);
        }
    }

    function _renderRoi(src, variant, intensity, gridSize, roi, layout) {
        const cvs = document.createElement('canvas');
        cvs.width = src.width;
        cvs.height = src.height;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(src, 0, 0);
        const crop = _cropRegion(src, roi);
        const localLayout = layout?.pieces?.length
            ? { ...layout, width: crop.width, height: crop.height, roi: { x: 0, y: 0, w: crop.width, h: crop.height } }
            : null;
        const rendered = _renderVariant(crop, variant, intensity, gridSize, localLayout);
        ctx.save();
        ctx.beginPath();
        ctx.rect(roi.x, roi.y, roi.w, roi.h);
        ctx.clip();
        ctx.drawImage(rendered, roi.x, roi.y, roi.w, roi.h);
        ctx.restore();
        return cvs;
    }

    // ── Explode: pieces pushed outward, distance scales with intensity ────────
    function _jigsawExplode(src, intensity, gridSize, layout) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        const cols = gridSize, rows = gridSize;
        const pw = w / cols, ph = h / rows;
        const cx = w / 2, cy = h / 2;
        const maxOut = Math.min(pw, ph) * 0.18 * intensity;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px  = c * pw, py = r * ph;
                const pcx = px + pw / 2, pcy = py + ph / 2;
                const dx  = pcx - cx, dy = pcy - cy;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const piece = _layoutPiece(layout, r, c);
                const ox  = piece ? piece.ox : (dx / len) * maxOut;
                const oy  = piece ? piece.oy : (dy / len) * maxOut;
                const angle = piece ? piece.angle : 0;
                ctx.save();
                ctx.translate(pcx + ox, pcy + oy);
                ctx.rotate(angle);
                _drawPuzzleCutout(ctx, src, pcx, pcy, pw, ph, c, r, cols, rows, intensity);
                ctx.restore();
            }
        }
        return cvs;
    }

    // ── Drift: slight random translation + rotation, magnitude scales ─────────
    function _jigsawDrift(src, intensity, gridSize, layout) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        const cols = gridSize, rows = gridSize;
        const pw = w / cols, ph = h / rows;
        const maxDrift = Math.min(pw, ph) * 0.13 * intensity;
        const maxRot   = 0.09 * intensity;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px  = c * pw, py = r * ph;
                const pcx = px + pw / 2, pcy = py + ph / 2;
                const piece = _layoutPiece(layout, r, c);
                const ox    = piece ? piece.ox : (Math.random() - 0.5) * 2 * maxDrift;
                const oy    = piece ? piece.oy : (Math.random() - 0.5) * 2 * maxDrift;
                const angle = piece ? piece.angle : (Math.random() - 0.5) * 2 * maxRot;
                ctx.save();
                ctx.translate(pcx + ox, pcy + oy);
                ctx.rotate(angle);
                _drawPuzzleCutout(ctx, src, pcx, pcy, pw, ph, c, r, cols, rows, intensity);
                ctx.restore();
            }
        }
        return cvs;
    }

    // ── Gravity: rows fall progressively, fall distance scales with intensity ─
    function _jigsawGravity(src, intensity, gridSize, layout) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        const cols = gridSize, rows = gridSize;
        const pw = w / cols, ph = h / rows;
        const maxFall = ph * 0.4 * intensity;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px   = c * pw, py = r * ph;
                const pcx = px + pw / 2, pcy = py + ph / 2;
                const piece = _layoutPiece(layout, r, c);
                const fall = piece ? piece.oy : r * (maxFall / rows) * (0.75 + Math.random() * 0.5);
                const ox = piece ? piece.ox : 0;
                const angle = piece ? piece.angle : 0;
                ctx.save();
                ctx.translate(pcx + ox, pcy + fall);
                ctx.rotate(angle);
                _drawPuzzleCutout(ctx, src, pcx, pcy, pw, ph, c, r, cols, rows, intensity);
                ctx.restore();
            }
        }
        return cvs;
    }

    // ── Scattered: physical photo-on-table, scatter range scales with intensity
    function _jigsawScattered(src, intensity, gridSize, layout) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = 'rgba(18,18,18,0.90)';
        ctx.fillRect(0, 0, w, h);
        const cols = gridSize, rows = gridSize;
        const pw   = w / cols, ph = h / rows;
        const maxDrift = Math.min(pw, ph) * 0.55 * intensity;
        const maxRot   = 0.32 * intensity;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px  = c * pw,  py  = r * ph;
                const pcx = px + pw / 2, pcy = py + ph / 2;
                const piece = layout?.pieces?.find(p => p.r === r && p.c === c);
                const ox    = piece ? piece.ox : (Math.random() - 0.5) * 2 * maxDrift;
                const oy    = piece ? piece.oy : (Math.random() - 0.5) * 2 * maxDrift;
                const angle = piece ? piece.angle : (Math.random() - 0.5) * 2 * maxRot;
                ctx.save();
                ctx.translate(pcx + ox, pcy + oy);
                ctx.rotate(angle);
                ctx.save();
                ctx.shadowBlur    = 12;
                ctx.shadowColor   = 'rgba(0,0,0,0.40)';
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 4;
                ctx.fillStyle     = '#ffffff';
                ctx.beginPath();
                _piecePath(ctx, -pw / 2, -ph / 2, pw, ph, c, r, cols, rows);
                ctx.fill();
                ctx.restore();
                ctx.save();
                ctx.beginPath();
                _piecePath(ctx, -pw / 2, -ph / 2, pw, ph, c, r, cols, rows);
                ctx.clip();
                ctx.drawImage(src, -pcx, -pcy);
                ctx.restore();
                ctx.beginPath();
                _piecePath(ctx, -pw / 2, -ph / 2, pw, ph, c, r, cols, rows);
                ctx.strokeStyle = 'rgba(255,255,255,0.70)';
                ctx.lineWidth   = 1.2;
                ctx.stroke();
                ctx.beginPath();
                _piecePath(ctx, -pw / 2 + 1, -ph / 2 + 1, pw, ph, c, r, cols, rows);
                ctx.strokeStyle = 'rgba(0,0,0,0.34)';
                ctx.lineWidth   = 0.8;
                ctx.stroke();
                ctx.restore();
            }
        }
        return cvs;
    }

    // ── Public dispatcher — config.intensity (0‥1) scales dispersal amount ───
    function render(src, variant, config = {}) {
        const intensity = config.intensity !== undefined ? config.intensity : 1.0;
        const gridSize = _gridSize(config);
        const layout = config.layout;
        const roi = layout?.roi || config.roi || _centerRoi(src.width, src.height, config.roiRange || 1);
        if (!_isFullRoi(src, roi)) {
            return _renderRoi(src, variant, intensity, gridSize, roi, layout);
        }
        return _renderVariant(src, variant, intensity, gridSize, layout);
    }

    return { render, createLayout };
})();
