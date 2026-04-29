'use strict';
window.LapisFXJigsaw = (() => {

    // ── Static: full image + bezier puzzle-line grid ──────────────────────────
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
        grid(0, 0, 'rgba(255,255,255,0.88)', 2.5);
        grid(1, 1, 'rgba(0,0,0,0.42)', 1.2);
        return cvs;
    }

    // ── Explode: pieces pushed outward from centre ────────────────────────────
    function _jigsawExplode(src) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        const cols = 4, rows = 4;
        const pw = w / cols, ph = h / rows;
        const cx = w / 2, cy = h / 2;
        const maxOut = Math.min(pw, ph) * 0.18;
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
                ctx.beginPath();
                ctx.rect(px + ox + gap / 2, py + oy + gap / 2, pw - gap, ph - gap);
                ctx.clip();
                ctx.drawImage(src, ox, oy);
                ctx.restore();
                ctx.beginPath();
                ctx.rect(px + ox + gap / 2, py + oy + gap / 2, pw - gap, ph - gap);
                ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.8; ctx.stroke();
                ctx.strokeStyle = 'rgba(0,0,0,0.35)';       ctx.lineWidth = 0.8; ctx.stroke();
            }
        }
        return cvs;
    }

    // ── Drift: slight random translation + rotation per piece ─────────────────
    function _jigsawDrift(src) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        const cols = 4, rows = 4;
        const pw = w / cols, ph = h / rows;
        const maxDrift = Math.min(pw, ph) * 0.13;
        const maxRot   = 0.09;
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
                ctx.save();
                ctx.beginPath();
                ctx.rect(-pw / 2 + gap / 2, -ph / 2 + gap / 2, pw - gap, ph - gap);
                ctx.clip();
                ctx.drawImage(src, -pcx, -pcy);
                ctx.restore();
                ctx.beginPath();
                ctx.rect(-pw / 2 + gap / 2, -ph / 2 + gap / 2, pw - gap, ph - gap);
                ctx.strokeStyle = 'rgba(255,255,255,0.72)'; ctx.lineWidth = 1.8; ctx.stroke();
                ctx.strokeStyle = 'rgba(0,0,0,0.32)';       ctx.lineWidth = 0.8; ctx.stroke();
                ctx.restore();
            }
        }
        return cvs;
    }

    // ── Gravity: each row falls progressively further ─────────────────────────
    function _jigsawGravity(src) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        const cols = 4, rows = 4;
        const pw = w / cols, ph = h / rows;
        const maxFall = ph * 0.4;
        const gap = 2.5;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px   = c * pw, py = r * ph;
                const fall = r * (maxFall / rows) * (0.75 + Math.random() * 0.5);
                ctx.save();
                ctx.beginPath();
                ctx.rect(px + gap / 2, py + fall + gap / 2, pw - gap, ph - gap);
                ctx.clip();
                ctx.drawImage(src, 0, fall);
                ctx.restore();
                ctx.beginPath();
                ctx.rect(px + gap / 2, py + fall + gap / 2, pw - gap, ph - gap);
                ctx.strokeStyle = 'rgba(255,255,255,0.72)'; ctx.lineWidth = 1.8; ctx.stroke();
                ctx.strokeStyle = 'rgba(0,0,0,0.32)';       ctx.lineWidth = 0.8; ctx.stroke();
            }
        }
        return cvs;
    }

    // ── Scattered: physical photo-on-table effect with drop shadows ───────────
    function _jigsawScattered(src) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        // Dark table surface
        ctx.fillStyle = 'rgba(18,18,18,0.90)';
        ctx.fillRect(0, 0, w, h);
        const cols = 4, rows = 4;
        const pw   = w / cols, ph = h / rows;
        const maxDrift = Math.min(pw, ph) * 0.55;
        const maxRot   = 0.32; // ~18 degrees
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
                // Step 1: draw opaque white rect with shadow → only shadow is visible
                // once the image paints over the white fill
                ctx.save();
                ctx.shadowBlur    = 12;
                ctx.shadowColor   = 'rgba(0,0,0,0.40)';
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 4;
                ctx.fillStyle     = '#ffffff';
                ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
                ctx.restore();
                // Step 2: clip & draw image (covers the white fill)
                ctx.save();
                ctx.beginPath();
                ctx.rect(-pw / 2, -ph / 2, pw, ph);
                ctx.clip();
                ctx.drawImage(src, -pcx, -pcy);
                ctx.restore();
                // Step 3: 1 px white inner stroke simulating paper core edge
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

    // ── Public dispatcher ─────────────────────────────────────────────────────
    function render(src, variant) {
        switch (variant) {
            case 'explode':   return _jigsawExplode(src);
            case 'drift':     return _jigsawDrift(src);
            case 'gravity':   return _jigsawGravity(src);
            case 'scattered': return _jigsawScattered(src);
            default:          return _jigsawStatic(src);
        }
    }

    return { render };
})();
