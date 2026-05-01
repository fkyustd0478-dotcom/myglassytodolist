'use strict';
window.LapisFXShatter = (() => {

    function _drawGlassDepth(ctx, w, h, intensity) {
        const scale = Math.max(0.2, Math.min(1, intensity));
        ctx.save();
        const glow = ctx.createLinearGradient(0, 0, w, h);
        glow.addColorStop(0, 'rgba(255,255,255,0.10)');
        glow.addColorStop(0.45, `rgba(180,220,255,${0.08 * scale})`);
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        const shade = ctx.createLinearGradient(0, 0, w, h);
        shade.addColorStop(0, 'rgba(255,255,255,0)');
        shade.addColorStop(1, `rgba(0,0,0,${0.12 * scale})`);
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    function _drawGlassReflection(ctx, w, h, intensity) {
        const scale = Math.max(0.2, Math.min(1, intensity));
        const base = Math.min(w, h);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.lineCap = 'round';
        const band = ctx.createLinearGradient(w * 0.1, h * 0.1, w * 0.7, h * 0.45);
        band.addColorStop(0, 'rgba(255,255,255,0)');
        band.addColorStop(0.5, `rgba(255,255,255,${0.20 * scale})`);
        band.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.moveTo(w * 0.08, h * 0.18);
        ctx.quadraticCurveTo(w * 0.36, h * 0.06, w * 0.72, h * 0.26);
        ctx.strokeStyle = band;
        ctx.lineWidth = Math.max(3, base * 0.018);
        ctx.stroke();
        for (let i = 0; i < 3; i++) {
            const y = h * (0.22 + i * 0.13);
            ctx.beginPath();
            ctx.moveTo(w * (0.12 + i * 0.08), y);
            ctx.lineTo(w * (0.34 + i * 0.10), y - base * 0.05);
            ctx.strokeStyle = `rgba(255,255,255,${0.08 * scale})`;
            ctx.lineWidth = Math.max(1, base * 0.004);
            ctx.stroke();
        }
        ctx.restore();
    }

    // ── Impact: radial cracks + dense burst zone near impact ──────────────────
    function _drawImpact(ctx, w, h, intensity) {
        const ix    = w * (0.35 + Math.random() * 0.3);
        const iy    = h * (0.30 + Math.random() * 0.3);
        const base  = Math.min(w, h);
        const scale = Math.max(0.15, intensity);
        const holeRadius = base * (0.018 + 0.035 * Math.min(1, scale));
        ctx.lineCap = 'round';

        // Primary radial cracks — count scales with intensity
        const count = Math.max(3, Math.round(24 * scale));
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
            ctx.strokeStyle = 'rgba(255,255,255,0.96)'; ctx.lineWidth = 2.8; ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(pts[0][0] + 1, pts[0][1] + 1);
            for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0] + 1, pts[p][1] + 1);
            ctx.strokeStyle = 'rgba(0,0,0,0.68)'; ctx.lineWidth = 1.35; ctx.stroke();
        }

        // Secondary burst zone — dense short cracks near impact
        const burst = Math.max(4, Math.round(32 * scale));
        for (let i = 0; i < burst; i++) {
            const ang = Math.random() * Math.PI * 2;
            const r0  = base * 0.012;
            const r1  = base * (0.04 + Math.random() * 0.09);
            const sx  = ix + Math.cos(ang) * r0;
            const sy  = iy + Math.sin(ang) * r0;
            const ex  = ix + Math.cos(ang) * r1 + (Math.random() - 0.5) * r1 * 0.5;
            const ey  = iy + Math.sin(ang) * r1 + (Math.random() - 0.5) * r1 * 0.5;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
            ctx.strokeStyle = 'rgba(255,255,255,0.88)'; ctx.lineWidth = 1.7; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx + 1, sy + 1); ctx.lineTo(ex + 1, ey + 1);
            ctx.strokeStyle = 'rgba(0,0,0,0.58)'; ctx.lineWidth = 0.9; ctx.stroke();
        }

        const refractions = Math.max(3, Math.round(9 * scale));
        for (let i = 0; i < refractions; i++) {
            const a = (i / refractions) * Math.PI * 2 + 0.25;
            const r = holeRadius * (1.8 + Math.random() * 2.4);
            ctx.beginPath();
            ctx.moveTo(ix + Math.cos(a) * holeRadius * 1.1, iy + Math.sin(a) * holeRadius * 1.1);
            ctx.lineTo(ix + Math.cos(a + 0.12) * r, iy + Math.sin(a + 0.12) * r);
            ctx.strokeStyle = `rgba(190,230,255,${0.18 + 0.18 * scale})`;
            ctx.lineWidth = Math.max(1, base * 0.004);
            ctx.stroke();
        }

        const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, holeRadius);
        g.addColorStop(0,   'rgba(255,255,255,1.0)');
        g.addColorStop(0.35, 'rgba(255,255,255,0.72)');
        g.addColorStop(0.7, 'rgba(40,55,70,0.42)');
        g.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(ix, iy, holeRadius, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
    }

    // ── Spiderweb: rings + spokes, count scales with intensity ────────────────
    function _drawSpiderweb(ctx, w, h, intensity) {
        const ix    = w * (0.35 + Math.random() * 0.3);
        const iy    = h * (0.30 + Math.random() * 0.3);
        const maxR  = Math.sqrt(w * w + h * h);
        const scale = Math.max(0.15, intensity);
        ctx.lineCap = 'round';
        const rings  = Math.max(2, Math.round(6  * scale));
        const spokes = Math.max(4, Math.round(20 * scale));
        for (let i = 1; i <= rings; i++) {
            const r   = (i / rings) * maxR * 0.52;
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
        for (let i = 0; i < spokes; i++) {
            const angle = (i / spokes) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
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

    // ── Fractured: short random crack segments, count scales with intensity ───
    function _drawFractured(ctx, w, h, intensity) {
        const scale = Math.max(0.15, intensity);
        const count = Math.max(6, Math.round(52 * scale));
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

    // ── Public dispatcher — config.intensity (0‥1) scales crack density ───────
    function render(src, variant, config = {}) {
        const intensity = config.intensity !== undefined ? config.intensity : 1.0;
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(src, 0, 0);
        _drawGlassDepth(ctx, w, h, intensity);
        switch (variant) {
            case 'spiderweb': _drawSpiderweb(ctx, w, h, intensity); break;
            case 'fractured': _drawFractured(ctx, w, h, intensity); break;
            default:          _drawImpact(ctx, w, h, intensity);
        }
        _drawGlassReflection(ctx, w, h, intensity);
        return cvs;
    }

    return { render };
})();
