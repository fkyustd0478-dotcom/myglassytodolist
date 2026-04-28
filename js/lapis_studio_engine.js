'use strict';
window.LapisStudioEngine = (() => {
    const MAX_BYTES          = 10 * 1024 * 1024;
    const COMPRESS_THRESHOLD =  2 * 1024 * 1024;
    const MAX_DIM            = 2500;

    const EFFECTS = {
        grayscale: 'grayscale(100%)',
        sepia:     'sepia(80%)',
        vivid:     'saturate(160%) contrast(108%)',
        dim:       'brightness(65%)',
        warm:      'sepia(25%) saturate(130%) brightness(102%)',
        cool:      'hue-rotate(190deg) saturate(80%)',
    };

    // ── Compression ──────────────────────────────────────────────────────────
    function _compress(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                let w = img.naturalWidth, h = img.naturalHeight;
                if (w > MAX_DIM || h > MAX_DIM) {
                    const s = MAX_DIM / Math.max(w, h);
                    w = Math.round(w * s); h = Math.round(h * s);
                }
                const cvs = document.createElement('canvas');
                cvs.width = w; cvs.height = h;
                cvs.getContext('2d').drawImage(img, 0, 0, w, h);
                cvs.toBlob(b => b ? resolve(b) : reject(new Error('COMPRESS_FAIL')), 'image/jpeg', 0.82);
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('LOAD_FAIL')); };
            img.src = url;
        });
    }

    async function load(file) {
        if (!(file instanceof File)) throw new Error('NOT_A_FILE');
        if (file.size > MAX_BYTES)   throw new Error('SIZE_EXCEEDED');
        const blob = file.size > COMPRESS_THRESHOLD ? await _compress(file) : file;
        return URL.createObjectURL(blob);
    }

    function loadImageToCanvas(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload  = () => resolve(img);
            img.onerror = () => reject(new Error('LOAD_FAIL'));
            img.src = url;
        });
    }

    // ── Shape mask painters ───────────────────────────────────────────────────
    function _heart(ctx, w, h) {
        // anticlockwise=false → clockwise in canvas (y-down) → draws TOP arc (∩∩)
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(w * 0.42, h * 0.44);
        ctx.beginPath();
        ctx.moveTo(0, 0.55);
        ctx.bezierCurveTo(0, 0.22, -1, -0.22, -1, -0.52);
        ctx.arc(-0.5, -0.52, 0.5, Math.PI, 0, false);
        ctx.arc( 0.5, -0.52, 0.5, Math.PI, 0, false);
        ctx.bezierCurveTo(1, -0.22, 0, 0.22, 0, 0.55);
        ctx.fill();
        ctx.restore();
    }

    function _star(ctx, w, h) {
        const cx = w / 2, cy = h / 2;
        const R  = Math.min(w, h) * 0.46;
        const r  = R * 0.42;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a   = (i * Math.PI) / 5 - Math.PI / 2;
            const rad = i % 2 === 0 ? R : r;
            i === 0 ? ctx.moveTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a))
                    : ctx.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
        }
        ctx.closePath();
        ctx.fill();
    }

    function applyMask(src, shape) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#000';
        switch (shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
                ctx.fill(); break;
            case 'ellipse':
                ctx.beginPath();
                ctx.ellipse(w / 2, h / 2, w / 2, h * 0.38, 0, 0, Math.PI * 2);
                ctx.fill(); break;
            case 'heart': _heart(ctx, w, h); break;
            case 'star':  _star(ctx, w, h);  break;
            default: return src;
        }
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(src, 0, 0);
        return cvs;
    }

    // ── Glass shatter — three variants ───────────────────────────────────────
    function _drawImpact(ctx, w, h) {
        const ix = w * (0.35 + Math.random() * 0.3);
        const iy = h * (0.30 + Math.random() * 0.3);
        const count = 10 + Math.floor(Math.random() * 8);
        const base  = Math.min(w, h);
        ctx.lineCap = 'round';
        for (let i = 0; i < count; i++) {
            const angle  = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const len    = base * (0.4 + Math.random() * 0.55);
            const steps  = 2 + Math.floor(Math.random() * 3);
            const jitter = base * 0.035;
            const pts    = [[ix, iy]];
            for (let s = 1; s <= steps; s++) {
                const t = s / steps;
                pts.push([
                    ix + Math.cos(angle) * len * t + (Math.random() - 0.5) * jitter * 2,
                    iy + Math.sin(angle) * len * t + (Math.random() - 0.5) * jitter * 2,
                ]);
            }
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]);
            ctx.strokeStyle = 'rgba(255,255,255,0.88)'; ctx.lineWidth = 2.5; ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(pts[0][0] + 1, pts[0][1] + 1);
            for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0] + 1, pts[p][1] + 1);
            ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.2; ctx.stroke();
        }
        const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, base * 0.02);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(ix, iy, base * 0.02, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
    }

    function _drawSpiderweb(ctx, w, h) {
        const ix = w * (0.35 + Math.random() * 0.3);
        const iy = h * (0.30 + Math.random() * 0.3);
        const maxR = Math.sqrt(w * w + h * h);
        ctx.lineCap = 'round';
        // Concentric jittered rings
        for (let i = 1; i <= 6; i++) {
            const r   = (i / 6) * maxR * 0.52;
            const pts = 36;
            ctx.beginPath();
            for (let j = 0; j <= pts; j++) {
                const a = (j / pts) * Math.PI * 2;
                const jitter = r * 0.03 * (Math.random() - 0.5);
                const x = ix + (r + jitter) * Math.cos(a);
                const y = iy + (r + jitter) * Math.sin(a);
                j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(255,255,255,0.72)'; ctx.lineWidth = 1.8; ctx.stroke();

            ctx.beginPath();
            for (let j = 0; j <= pts; j++) {
                const a = (j / pts) * Math.PI * 2;
                const x = ix + r * Math.cos(a) + 1;
                const y = iy + r * Math.sin(a) + 1;
                j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(0,0,0,0.38)'; ctx.lineWidth = 0.8; ctx.stroke();
        }
        // Radial spokes
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
            const ex    = ix + Math.cos(angle) * maxR * 0.65;
            const ey    = iy + Math.sin(angle) * maxR * 0.65;
            const mx    = ix + Math.cos(angle) * maxR * 0.32 + (Math.random() - 0.5) * 10;
            const my    = iy + Math.sin(angle) * maxR * 0.32 + (Math.random() - 0.5) * 10;
            ctx.beginPath();
            ctx.moveTo(ix, iy); ctx.lineTo(mx, my); ctx.lineTo(ex, ey);
            ctx.strokeStyle = 'rgba(255,255,255,0.62)'; ctx.lineWidth = 1.4; ctx.stroke();
        }
        const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, Math.min(w, h) * 0.025);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(ix, iy, Math.min(w, h) * 0.025, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
    }

    function _drawFractured(ctx, w, h) {
        const count = 38 + Math.floor(Math.random() * 14);
        ctx.lineCap = 'round';
        for (let i = 0; i < count; i++) {
            let cx = Math.random() * w;
            let cy = Math.random() * h;
            let ca = Math.random() * Math.PI * 2;
            const len   = Math.min(w, h) * (0.04 + Math.random() * 0.14);
            const steps = 2 + Math.floor(Math.random() * 3);
            const pts   = [[cx, cy]];
            for (let s = 0; s < steps; s++) {
                ca += (Math.random() - 0.5) * 0.9;
                cx += Math.cos(ca) * len / steps;
                cy += Math.sin(ca) * len / steps;
                pts.push([cx, cy]);
            }
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]);
            ctx.strokeStyle = 'rgba(255,255,255,0.82)'; ctx.lineWidth = 2.2; ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(pts[0][0] + 1, pts[0][1] + 1);
            for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0] + 1, pts[p][1] + 1);
            ctx.strokeStyle = 'rgba(0,0,0,0.48)'; ctx.lineWidth = 0.9; ctx.stroke();
        }
    }

    function _glassShatter(src, variant) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(src, 0, 0);
        switch (variant) {
            case 'spiderweb': _drawSpiderweb(ctx, w, h); break;
            case 'fractured': _drawFractured(ctx, w, h); break;
            default:          _drawImpact(ctx, w, h);
        }
        return cvs;
    }

    // ── Jigsaw — four variants ────────────────────────────────────────────────
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
                const px = c * pw, py = r * ph;
                const pcx = px + pw / 2, pcy = py + ph / 2;
                const dx = pcx - cx, dy = pcy - cy;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const ox = (dx / len) * maxOut;
                const oy = (dy / len) * maxOut;
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
                const px = c * pw, py = r * ph;
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
                const px = c * pw, py = r * ph;
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

    function _jigsaw(src, variant) {
        switch (variant) {
            case 'explode': return _jigsawExplode(src);
            case 'drift':   return _jigsawDrift(src);
            case 'gravity': return _jigsawGravity(src);
            default:        return _jigsawStatic(src);
        }
    }

    // ── Apply colour/special effect ───────────────────────────────────────────
    function applyEffect(src, effectKey) {
        if (effectKey.startsWith('glass-'))  return _glassShatter(src, effectKey.slice(6));
        if (effectKey.startsWith('jigsaw-')) return _jigsaw(src, effectKey.slice(7));
        const filter = EFFECTS[effectKey];
        if (!filter) return src;
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.filter = filter;
        ctx.drawImage(src, 0, 0);
        ctx.filter = 'none';
        return cvs;
    }

    // ── Download (mobile-optimized; octet-stream forces save dialog on mobile) ──
    function triggerRealDownload(canvas, customName) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const timestamp = Date.now();
                let inputName = customName ? customName.trim() : `glassystudio_${timestamp}`;
                let safeName  = inputName.replace(/[\\/:*?"<>|]/g, '_').substring(0, 255);
                if (!safeName.toLowerCase().endsWith('.png')) safeName += '.png';

                // Force octet-stream so mobile browsers trigger a save dialog
                // instead of opening the image inline in a new tab
                const forcedBlob = new Blob([blob], { type: 'application/octet-stream' });
                const url  = URL.createObjectURL(forcedBlob);
                const link = document.createElement('a');
                link.href     = url;
                link.download = safeName;
                // Off-screen but still in the layout so mobile click registers
                link.style.cssText = 'display:block;width:0;height:0;position:fixed;top:-100px;';
                document.body.appendChild(link);
                link.click();
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    resolve();
                }, 3000);
            }, 'image/png');
        });
    }

    // ── SVG shape inner for crop overlay ─────────────────────────────────────
    function svgShapeInner(shape, bx, by, bw, bh) {
        const bcx = bx + bw / 2, bcy = by + bh / 2;
        const bR  = Math.min(bw, bh) / 2;
        const f   = v => v.toFixed(1);
        if (shape === 'circle')
            return `<circle cx="${f(bcx)}" cy="${f(bcy)}" r="${f(bR)}" fill="black"/>`;
        if (shape === 'ellipse')
            return `<ellipse cx="${f(bcx)}" cy="${f(bcy)}" rx="${f(bw/2)}" ry="${f(bh*0.38)}" fill="black"/>`;
        if (shape === 'heart') {
            const p = (nx, ny) => `${f(bx + nx * bw / 100)},${f(by + ny * bh / 100)}`;
            const d = `M${p(50,74)}`
                    + ` C${p(50,60)} ${p(8,40)} ${p(8,27)}`
                    + ` C${p(8,15)} ${p(17,5)} ${p(29,5)}`
                    + ` C${p(41,5)} ${p(50,15)} ${p(50,27)}`
                    + ` C${p(50,15)} ${p(59,5)} ${p(71,5)}`
                    + ` C${p(83,5)} ${p(92,15)} ${p(92,27)}`
                    + ` C${p(92,40)} ${p(50,60)} ${p(50,74)}Z`;
            return `<path d="${d}" fill="black"/>`;
        }
        if (shape === 'star') {
            const R = bR * 0.92, r = R * 0.42;
            const pts = [];
            for (let i = 0; i < 10; i++) {
                const a = (i * Math.PI) / 5 - Math.PI / 2;
                const rad = i % 2 === 0 ? R : r;
                pts.push(`${f(bcx + rad * Math.cos(a))},${f(bcy + rad * Math.sin(a))}`);
            }
            return `<polygon points="${pts.join(' ')}" fill="black"/>`;
        }
        return '';
    }

    return { load, loadImageToCanvas, applyMask, applyEffect, triggerRealDownload, svgShapeInner };
})();
