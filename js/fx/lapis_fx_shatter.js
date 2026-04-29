'use strict';
window.LapisFXShatter = (() => {

    // ── Impact: radial cracks + secondary burst zone ──────────────────────────
    function _drawImpact(ctx, w, h) {
        const ix    = w * (0.35 + Math.random() * 0.3);
        const iy    = h * (0.30 + Math.random() * 0.3);
        const base  = Math.min(w, h);
        ctx.lineCap = 'round';

        // Primary radial cracks
        const count = 14 + Math.floor(Math.random() * 10);
        for (let i = 0; i < count; i++) {
            const angle  = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
            const len    = base * (0.4 + Math.random() * 0.55);
            const steps  = 3 + Math.floor(Math.random() * 4);
            const jitter = base * 0.03;
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
            ctx.strokeStyle = 'rgba(255,255,255,0.90)'; ctx.lineWidth = 2.5; ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(pts[0][0] + 1, pts[0][1] + 1);
            for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0] + 1, pts[p][1] + 1);
            ctx.strokeStyle = 'rgba(0,0,0,0.60)'; ctx.lineWidth = 1.2; ctx.stroke();
        }

        // Secondary burst zone — dense short cracks near impact point
        const burst = 20 + Math.floor(Math.random() * 12);
        for (let i = 0; i < burst; i++) {
            const ang = Math.random() * Math.PI * 2;
            const r0  = base * 0.012;
            const r1  = base * (0.04 + Math.random() * 0.09);
            const sx  = ix + Math.cos(ang) * r0;
            const sy  = iy + Math.sin(ang) * r0;
            const ex  = ix + Math.cos(ang) * r1 + (Math.random() - 0.5) * r1 * 0.5;
            const ey  = iy + Math.sin(ang) * r1 + (Math.random() - 0.5) * r1 * 0.5;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
            ctx.strokeStyle = 'rgba(255,255,255,0.80)'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + 1, sy + 1); ctx.lineTo(ex + 1, ey + 1);
            ctx.strokeStyle = 'rgba(0,0,0,0.50)'; ctx.lineWidth = 0.8; ctx.stroke();
        }

        // Glare at impact centre
        const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, base * 0.025);
        g.addColorStop(0,   'rgba(255,255,255,1.0)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.6)');
        g.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(ix, iy, base * 0.025, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
    }

    // ── Spiderweb: concentric jittered rings + radial spokes ──────────────────
    function _drawSpiderweb(ctx, w, h) {
        const ix   = w * (0.35 + Math.random() * 0.3);
        const iy   = h * (0.30 + Math.random() * 0.3);
        const maxR = Math.sqrt(w * w + h * h);
        ctx.lineCap = 'round';
        for (let i = 1; i <= 6; i++) {
            const r   = (i / 6) * maxR * 0.52;
            const pts = 36;
            ctx.beginPath();
            for (let j = 0; j <= pts; j++) {
                const a      = (j / pts) * Math.PI * 2;
                const jitter = r * 0.03 * (Math.random() - 0.5);
                const x      = ix + (r + jitter) * Math.cos(a);
                const y      = iy + (r + jitter) * Math.sin(a);
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

    // ── Fractured: random short double-layered crack segments ─────────────────
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

    // ── Public dispatcher ─────────────────────────────────────────────────────
    function render(src, variant) {
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

    return { render };
})();
