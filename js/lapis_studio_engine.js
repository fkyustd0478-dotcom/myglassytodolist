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

    // ── Load & validate ───────────────────────────────────────────────────────
    async function load(file) {
        if (!(file instanceof File)) throw new Error('NOT_A_FILE');
        if (file.size > MAX_BYTES)   throw new Error('SIZE_EXCEEDED');
        const blob = file.size > COMPRESS_THRESHOLD ? await _compress(file) : file;
        return URL.createObjectURL(blob);
    }

    // ── Shape mask painters ───────────────────────────────────────────────────
    function _heart(ctx, w, h) {
        // Separate x/y scale so heart fills canvas proportionally.
        // Arcs use anticlockwise=false (clockwise in canvas) to draw the TOP
        // half of each lobe circle, giving the correct ∩∩ shape.
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(w * 0.42, h * 0.44);
        ctx.beginPath();
        ctx.moveTo(0, 0.55);                                          // bottom tip
        ctx.bezierCurveTo(0, 0.22, -1, -0.22, -1, -0.52);            // left side up
        ctx.arc(-0.5, -0.52, 0.5, Math.PI, 0, false);                // left lobe top arch ∩
        ctx.arc( 0.5, -0.52, 0.5, Math.PI, 0, false);                // right lobe top arch ∩
        ctx.bezierCurveTo(1, -0.22, 0, 0.22, 0, 0.55);               // right side down
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
            const x   = cx + rad * Math.cos(a);
            const y   = cy + rad * Math.sin(a);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    // ── Apply shape mask (source-in composite) ────────────────────────────────
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
                ctx.fill();
                break;
            case 'ellipse':
                ctx.beginPath();
                ctx.ellipse(w / 2, h / 2, w / 2, h * 0.38, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'heart': _heart(ctx, w, h); break;
            case 'star':  _star(ctx, w, h);  break;
            default: return src;
        }

        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(src, 0, 0);
        return cvs;
    }

    // ── Glass shatter effect ──────────────────────────────────────────────────
    function _glassShatter(src) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(src, 0, 0);

        const ix = w * (0.35 + Math.random() * 0.3);
        const iy = h * (0.30 + Math.random() * 0.3);
        const count = 8 + Math.floor(Math.random() * 7);
        const base  = Math.min(w, h);

        ctx.lineCap = 'round';

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const len   = base * (0.4 + Math.random() * 0.55);
            const steps = 2 + Math.floor(Math.random() * 3);
            const jitter = base * 0.035;

            const pts = [[ix, iy]];
            for (let s = 1; s <= steps; s++) {
                const t = s / steps;
                pts.push([
                    ix + Math.cos(angle) * len * t + (Math.random() - 0.5) * jitter * 2,
                    iy + Math.sin(angle) * len * t + (Math.random() - 0.5) * jitter * 2,
                ]);
            }

            // White highlight
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]);
            ctx.strokeStyle = 'rgba(255,255,255,0.65)';
            ctx.lineWidth = 1.8;
            ctx.stroke();

            // Dark shadow (1px offset)
            ctx.beginPath();
            ctx.moveTo(pts[0][0] + 1, pts[0][1] + 1);
            for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0] + 1, pts[p][1] + 1);
            ctx.strokeStyle = 'rgba(0,0,0,0.45)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }

        // Impact glow
        const r = base * 0.018;
        const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, r * 2.5);
        g.addColorStop(0, 'rgba(255,255,255,0.92)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(ix, iy, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        return cvs;
    }

    // ── Jigsaw puzzle effect ──────────────────────────────────────────────────
    function _jigsaw(src) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(src, 0, 0);

        const cols = 4, rows = 4;
        const pw = w / cols, ph = h / rows;
        const tab = Math.min(pw, ph) * 0.22;

        function hSegment(y, x0, x1, dir) {
            const mx = (x0 + x1) / 2;
            ctx.moveTo(x0, y);
            ctx.lineTo(mx - tab, y);
            ctx.bezierCurveTo(mx - tab, y + dir * tab * 1.9, mx + tab, y + dir * tab * 1.9, mx + tab, y);
            ctx.lineTo(x1, y);
        }

        function vSegment(x, y0, y1, dir) {
            const my = (y0 + y1) / 2;
            ctx.moveTo(x, y0);
            ctx.lineTo(x, my - tab);
            ctx.bezierCurveTo(x + dir * tab * 1.9, my - tab, x + dir * tab * 1.9, my + tab, x, my + tab);
            ctx.lineTo(x, y1);
        }

        function drawGrid(offsetX, offsetY, style, lw) {
            ctx.strokeStyle = style;
            ctx.lineWidth   = lw;
            ctx.lineCap     = 'butt';
            for (let r = 1; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    ctx.beginPath();
                    hSegment(r * ph + offsetY, c * pw, (c + 1) * pw, (r + c) % 2 === 0 ? 1 : -1);
                    ctx.stroke();
                }
            }
            for (let c = 1; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    ctx.beginPath();
                    vSegment(c * pw + offsetX, r * ph, (r + 1) * ph, (r + c) % 2 === 0 ? 1 : -1);
                    ctx.stroke();
                }
            }
        }

        drawGrid(0, 0, 'rgba(255,255,255,0.82)', 2.2);
        drawGrid(1, 1, 'rgba(0,0,0,0.38)', 1);

        return cvs;
    }

    // ── Apply colour/special effect ───────────────────────────────────────────
    function applyEffect(src, effectKey) {
        if (effectKey === 'glass')  return _glassShatter(src);
        if (effectKey === 'jigsaw') return _jigsaw(src);
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

    // ── Download (blob-based; setTimeout avoids premature revoke) ─────────────
    function download(canvas, filename) {
        const name   = (filename || '').trim() || `glassystudio_${Date.now()}`;
        const dlName = name.endsWith('.png') ? name : `${name}.png`;
        canvas.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a   = document.createElement('a');
            a.download = dlName;
            a.href     = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'image/png');
    }

    // ── SVG shape inner content for the interactive crop overlay ─────────────
    // Returns an SVG element string (black fill) to be placed inside a <mask>.
    // The mask is applied to a dark rect so areas OUTSIDE the shape are dimmed.
    function svgShapeInner(shape, bx, by, bw, bh) {
        const bcx = bx + bw / 2, bcy = by + bh / 2;
        const bR  = Math.min(bw, bh) / 2;
        const f   = v => v.toFixed(1);

        if (shape === 'circle') {
            return `<circle cx="${f(bcx)}" cy="${f(bcy)}" r="${f(bR)}" fill="black"/>`;
        }
        if (shape === 'ellipse') {
            return `<ellipse cx="${f(bcx)}" cy="${f(bcy)}" rx="${f(bw/2)}" ry="${f(bh*0.38)}" fill="black"/>`;
        }
        if (shape === 'heart') {
            // 6-segment cubic bezier heart, control points derived from the canvas
            // _heart() arc geometry (scale 0.42x / 0.44y) so overlay matches crop output.
            // Path goes: bottom-tip → left-side → left-lobe(∩) → right-lobe(∩) → right-side → tip
            const p  = (nx, ny) => `${f(bx + nx * bw / 100)},${f(by + ny * bh / 100)}`;
            const d  = `M${p(50,74)}`                                // bottom tip
                     + ` C${p(50,60)} ${p(8,40)} ${p(8,27)}`        // left side
                     + ` C${p(8,15)} ${p(17,5)} ${p(29,5)}`         // left lobe Q1 ∩
                     + ` C${p(41,5)} ${p(50,15)} ${p(50,27)}`       // left lobe Q2 → center
                     + ` C${p(50,15)} ${p(59,5)} ${p(71,5)}`        // right lobe Q1 ∩
                     + ` C${p(83,5)} ${p(92,15)} ${p(92,27)}`       // right lobe Q2
                     + ` C${p(92,40)} ${p(50,60)} ${p(50,74)}Z`;    // right side
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

    return { load, applyMask, applyEffect, download, svgShapeInner };
})();
