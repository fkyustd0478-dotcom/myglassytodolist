'use strict';
window.LapisStudioEngine = (() => {
    const MAX_BYTES          = 10 * 1024 * 1024;
    const COMPRESS_THRESHOLD =  2 * 1024 * 1024;
    const MAX_DIM            = 2500;

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

    // ── Download ──────────────────────────────────────────────────────────────
    function download(canvas, filename) {
        const name = (filename || '').trim() || `glassystudio_${Date.now()}`;
        const a = document.createElement('a');
        a.download = name.endsWith('.png') ? name : `${name}.png`;
        a.href = canvas.toDataURL('image/png');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    return { load, applyMask, download };
})();
