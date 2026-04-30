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
    function _jigsawStatic(src) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(src, 0, 0);
        const cols = 4, rows = 4;
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

    // ── Explode: pieces pushed outward, distance scales with intensity ────────
    function _jigsawExplode(src, intensity) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        const cols = 4, rows = 4;
        const pw = w / cols, ph = h / rows;
        const cx = w / 2, cy = h / 2;
        const maxOut = Math.min(pw, ph) * 0.18 * intensity;
        const gap = 2.5;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px  = c * pw, py = r * ph;
                const pcx = px + pw / 2, pcy = py + ph / 2;
                const dx  = pcx - cx, dy = pcy - cy;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const ox  = (dx / len) * maxOut;
                const oy  = (dy / len) * maxOut;
                ctx.save();
                _drawPieceShadow(ctx, px + ox + gap / 2, py + oy + gap / 2, pw - gap, ph - gap, intensity);
                ctx.beginPath();
                ctx.rect(px + ox + gap / 2, py + oy + gap / 2, pw - gap, ph - gap);
                ctx.clip();
                ctx.drawImage(src, ox, oy);
                ctx.restore();
                ctx.beginPath();
                _drawPieceDepth(ctx, px + ox + gap / 2, py + oy + gap / 2, pw - gap, ph - gap, intensity);
                ctx.rect(px + ox + gap / 2, py + oy + gap / 2, pw - gap, ph - gap);
                ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.8; ctx.stroke();
                ctx.strokeStyle = 'rgba(0,0,0,0.35)';       ctx.lineWidth = 0.8; ctx.stroke();
            }
        }
        return cvs;
    }

    // ── Drift: slight random translation + rotation, magnitude scales ─────────
    function _jigsawDrift(src, intensity) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        const cols = 4, rows = 4;
        const pw = w / cols, ph = h / rows;
        const maxDrift = Math.min(pw, ph) * 0.13 * intensity;
        const maxRot   = 0.09 * intensity;
        const gap = 2.5;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px  = c * pw, py = r * ph;
                const pcx = px + pw / 2, pcy = py + ph / 2;
                const ox    = (Math.random() - 0.5) * 2 * maxDrift;
                const oy    = (Math.random() - 0.5) * 2 * maxDrift;
                const angle = (Math.random() - 0.5) * 2 * maxRot;
                ctx.save();
                ctx.translate(pcx + ox, pcy + oy);
                ctx.rotate(angle);
                _drawPieceShadow(ctx, -pw / 2 + gap / 2, -ph / 2 + gap / 2, pw - gap, ph - gap, intensity);
                ctx.save();
                ctx.beginPath();
                ctx.rect(-pw / 2 + gap / 2, -ph / 2 + gap / 2, pw - gap, ph - gap);
                ctx.clip();
                ctx.drawImage(src, -pcx, -pcy);
                ctx.restore();
                ctx.beginPath();
                ctx.rect(-pw / 2 + gap / 2, -ph / 2 + gap / 2, pw - gap, ph - gap);
                _drawPieceDepth(ctx, -pw / 2 + gap / 2, -ph / 2 + gap / 2, pw - gap, ph - gap, intensity);
                ctx.strokeStyle = 'rgba(255,255,255,0.72)'; ctx.lineWidth = 1.8; ctx.stroke();
                ctx.strokeStyle = 'rgba(0,0,0,0.32)';       ctx.lineWidth = 0.8; ctx.stroke();
                ctx.restore();
            }
        }
        return cvs;
    }

    // ── Gravity: rows fall progressively, fall distance scales with intensity ─
    function _jigsawGravity(src, intensity) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        const cols = 4, rows = 4;
        const pw = w / cols, ph = h / rows;
        const maxFall = ph * 0.4 * intensity;
        const gap = 2.5;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px   = c * pw, py = r * ph;
                const fall = r * (maxFall / rows) * (0.75 + Math.random() * 0.5);
                ctx.save();
                _drawPieceShadow(ctx, px + gap / 2, py + fall + gap / 2, pw - gap, ph - gap, intensity);
                ctx.beginPath();
                ctx.rect(px + gap / 2, py + fall + gap / 2, pw - gap, ph - gap);
                ctx.clip();
                ctx.drawImage(src, 0, fall);
                ctx.restore();
                ctx.beginPath();
                _drawPieceDepth(ctx, px + gap / 2, py + fall + gap / 2, pw - gap, ph - gap, intensity);
                ctx.rect(px + gap / 2, py + fall + gap / 2, pw - gap, ph - gap);
                ctx.strokeStyle = 'rgba(255,255,255,0.72)'; ctx.lineWidth = 1.8; ctx.stroke();
                ctx.strokeStyle = 'rgba(0,0,0,0.32)';       ctx.lineWidth = 0.8; ctx.stroke();
            }
        }
        return cvs;
    }

    // ── Scattered: physical photo-on-table, scatter range scales with intensity
    function _jigsawScattered(src, intensity) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = 'rgba(18,18,18,0.90)';
        ctx.fillRect(0, 0, w, h);
        const cols = 4, rows = 4;
        const pw   = w / cols, ph = h / rows;
        const maxDrift = Math.min(pw, ph) * 0.55 * intensity;
        const maxRot   = 0.32 * intensity;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px  = c * pw,  py  = r * ph;
                const pcx = px + pw / 2, pcy = py + ph / 2;
                const ox    = (Math.random() - 0.5) * 2 * maxDrift;
                const oy    = (Math.random() - 0.5) * 2 * maxDrift;
                const angle = (Math.random() - 0.5) * 2 * maxRot;
                ctx.save();
                ctx.translate(pcx + ox, pcy + oy);
                ctx.rotate(angle);
                ctx.save();
                ctx.shadowBlur    = 12;
                ctx.shadowColor   = 'rgba(0,0,0,0.40)';
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 4;
                ctx.fillStyle     = '#ffffff';
                ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
                ctx.restore();
                ctx.save();
                ctx.beginPath();
                ctx.rect(-pw / 2, -ph / 2, pw, ph);
                ctx.clip();
                ctx.drawImage(src, -pcx, -pcy);
                ctx.restore();
                _drawPieceDepth(ctx, -pw / 2, -ph / 2, pw, ph, intensity);
                ctx.beginPath();
                ctx.rect(-pw / 2 + 0.5, -ph / 2 + 0.5, pw - 1, ph - 1);
                ctx.strokeStyle = 'rgba(255,255,255,0.70)';
                ctx.lineWidth   = 1;
                ctx.stroke();
                ctx.restore();
            }
        }
        return cvs;
    }

    // ── Public dispatcher — config.intensity (0‥1) scales dispersal amount ───
    function render(src, variant, config = {}) {
        const intensity = config.intensity !== undefined ? config.intensity : 1.0;
        switch (variant) {
            case 'explode':   return _jigsawExplode(src, intensity);
            case 'drift':     return _jigsawDrift(src, intensity);
            case 'gravity':   return _jigsawGravity(src, intensity);
            case 'scattered': return _jigsawScattered(src, intensity);
            default:          return _jigsawStatic(src);
        }
    }

    return { render };
})();
