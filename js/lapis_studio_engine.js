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
        // Uses separate x/y scale so heart fills canvas proportionally.
        // Normalized coords: x ∈ [-1,1], y ∈ [-0.52-0.5, 0.55] ≈ [-1.02, 0.55].
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(w * 0.42, h * 0.44);
        ctx.beginPath();
        ctx.moveTo(0, 0.55);                                          // bottom tip
        ctx.bezierCurveTo(0, 0.22, -1, -0.22, -1, -0.52);            // left side
        ctx.arc(-0.5, -0.52, 0.5, Math.PI, 0, true);                 // left lobe (anticlockwise = top arc)
        ctx.arc( 0.5, -0.52, 0.5, Math.PI, 0, true);                 // right lobe
        ctx.bezierCurveTo(1, -0.22, 0, 0.22, 0, 0.55);               // right side
        ctx.fill();
        ctx.restore();
    }

    function _star(ctx, w, h) {
        const cx = w / 2, cy = h / 2;
        const R  = Math.min(w, h) * 0.46;   // outer radius
        const r  = R * 0.42;                 // inner radius
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a   = (i * Math.PI) / 5 - Math.PI / 2;   // start at top
            const rad = i % 2 === 0 ? R : r;
            const x   = cx + rad * Math.cos(a);
            const y   = cy + rad * Math.sin(a);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    // ── Apply shape mask (source-in composite) ────────────────────────────────
    // Returns a new canvas with the mask applied; returns src unchanged for
    // standard crops (no shape key passed).
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

        // Clip image to the mask shape using source-in compositing.
        ctx.globalCompositeOperation = 'source-in';
        ctx.drawImage(src, 0, 0);
        return cvs;
    }

    // ── Apply colour effect filter ────────────────────────────────────────────
    function applyEffect(src, effectKey) {
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

    // ── Download (blob-based to avoid data-URL navigation security errors) ────
    function download(canvas, filename) {
        const name = (filename || '').trim() || `glassystudio_${Date.now()}`;
        const dlName = name.endsWith('.png') ? name : `${name}.png`;
        canvas.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.download = dlName;
            a.href = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    }

    // ── SVG shape inner content for the interactive crop overlay ─────────────
    // Returns an SVG element string (black fill) to be placed inside a <mask>.
    // The mask is applied to a dark rect so areas OUTSIDE the shape are dimmed.
    // Parameters: shape key, crop-box rect (bx,by,bw,bh) in container px coords.
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
            // Normalized heart path [0,100]×[0,100] → scaled to crop box.
            // 4 control-point cubic bezier segments; left/right lobes meet at center.
            const p = (nx, ny) => `${f(bx + nx * bw / 100)},${f(by + ny * bh / 100)}`;
            const d = `M${p(50,30)} C${p(50,20)} ${p(40,10)} ${p(30,10)}`
                    + ` C${p(10,10)} ${p(10,30)} ${p(10,30)}`
                    + ` C${p(10,55)} ${p(30,75)} ${p(50,90)}`
                    + ` C${p(70,75)} ${p(90,55)} ${p(90,30)}`
                    + ` C${p(90,30)} ${p(90,10)} ${p(70,10)}`
                    + ` C${p(60,10)} ${p(50,20)} ${p(50,30)}Z`;
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
