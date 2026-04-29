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

    function applyMask(src, shape, data) {
        const x = data ? (data.x      || 0) : 0;
        const y = data ? (data.y      || 0) : 0;
        const w = data ? (data.width  || src.width)  : src.width;
        const h = data ? (data.height || src.height) : src.height;
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
        // source-in keeps only pixels where mask is opaque.
        // translate(-x,-y) aligns the full-size source so the crop region
        // starts at (0,0) of this output canvas.
        ctx.globalCompositeOperation = 'source-in';
        ctx.save();
        ctx.translate(-x, -y);
        ctx.drawImage(src, 0, 0);
        ctx.restore();
        return cvs;
    }

    // ── Effect router (delegates to FX modules) ───────────────────────────────
    function applyEffect(src, effectKey, config = {}) {
        if (effectKey.startsWith('glass-'))  return LapisFXShatter.render(src, effectKey.slice(6), config);
        if (effectKey.startsWith('jigsaw-')) return LapisFXJigsaw.render(src, effectKey.slice(7), config);
        const filter = EFFECTS[effectKey];
        if (!filter) return src;
        const { intensity = 1.0 } = config;
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        if (intensity < 1.0) {
            // Blend original + filtered at intensity ratio
            ctx.drawImage(src, 0, 0);
            const tmp = document.createElement('canvas');
            tmp.width = w; tmp.height = h;
            const tc = tmp.getContext('2d');
            tc.filter = filter; tc.drawImage(src, 0, 0);
            ctx.globalAlpha = intensity;
            ctx.drawImage(tmp, 0, 0);
            ctx.globalAlpha = 1.0;
        } else {
            ctx.filter = filter;
            ctx.drawImage(src, 0, 0);
            ctx.filter = 'none';
        }
        return cvs;
    }

    // ── Download (mobile-optimized; 5 s revoke; DataURL fallback on mobile) ────
    function triggerRealDownload(canvas, customName) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const timestamp = Date.now();
                let inputName = customName ? customName.trim() : `glassystudio_${timestamp}`;
                let safeName  = inputName.replace(/[\\/:*?"<>|]/g, '_').substring(0, 255);
                if (!safeName.toLowerCase().endsWith('.png')) safeName += '.png';

                const _trigger = (href) => {
                    const link = document.createElement('a');
                    link.setAttribute('download', safeName);  // must precede href
                    link.href = href;
                    link.style.cssText = 'display:block;width:0;height:0;position:fixed;top:-100px;';
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => {
                        document.body.removeChild(link);
                        if (href.startsWith('blob:')) URL.revokeObjectURL(href);
                        resolve();
                    }, 5000);
                };

                const forcedBlob = new Blob([blob], { type: 'application/octet-stream' });
                const isMobile   = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                if (isMobile) {
                    // DataURL is more reliably recognized for custom filenames on mobile
                    const reader   = new FileReader();
                    reader.onload  = () => _trigger(reader.result);
                    reader.onerror = () => _trigger(URL.createObjectURL(forcedBlob));
                    reader.readAsDataURL(forcedBlob);
                } else {
                    _trigger(URL.createObjectURL(forcedBlob));
                }
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
