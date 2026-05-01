'use strict';
window.LapisFXShatter = (() => {

    function _clamp01(v) {
        return Math.max(0.1, Math.min(1, v ?? 1));
    }

    function _drawGlassDepth(ctx, w, h, intensity) {
        const scale = _clamp01(intensity);
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
        const scale = _clamp01(intensity);
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

    function _drawHairlineCracks(ctx, w, h, intensity) {
        const scale = _clamp01(intensity);
        const count = Math.max(4, Math.round(18 * scale));
        ctx.lineCap = 'round';
        for (let i = 0; i < count; i++) {
            let cx = Math.random() * w;
            let cy = Math.random() * h;
            let ca = Math.random() * Math.PI * 2;
            const len = Math.min(w, h) * (0.03 + Math.random() * 0.12);
            const steps = 2 + Math.floor(Math.random() * 3);
            const pts = [[cx, cy]];
            for (let s = 0; s < steps; s++) {
                ca += (Math.random() - 0.5) * 0.9;
                cx += Math.cos(ca) * len / steps;
                cy += Math.sin(ca) * len / steps;
                pts.push([cx, cy]);
            }
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0], pts[p][1]);
            ctx.strokeStyle = 'rgba(255,255,255,0.58)';
            ctx.lineWidth = 1.4;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pts[0][0] + 1, pts[0][1] + 1);
            for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p][0] + 1, pts[p][1] + 1);
            ctx.strokeStyle = 'rgba(0,0,0,0.28)';
            ctx.lineWidth = 0.6;
            ctx.stroke();
        }
    }

    function _drawSpiderweb(ctx, w, h, intensity) {
        const ix = w * (0.35 + Math.random() * 0.3);
        const iy = h * (0.30 + Math.random() * 0.3);
        const maxR = Math.sqrt(w * w + h * h);
        const scale = _clamp01(intensity);
        ctx.lineCap = 'round';
        const rings = Math.max(2, Math.round(6 * scale));
        const spokes = Math.max(4, Math.round(20 * scale));
        for (let i = 1; i <= rings; i++) {
            const r = (i / rings) * maxR * 0.52;
            const pts = 36;
            ctx.beginPath();
            for (let j = 0; j <= pts; j++) {
                const a = (j / pts) * Math.PI * 2;
                const jitter = r * 0.03 * (Math.random() - 0.5);
                const x = ix + (r + jitter) * Math.cos(a);
                const y = iy + (r + jitter) * Math.sin(a);
                j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(255,255,255,0.72)';
            ctx.lineWidth = 1.8;
            ctx.stroke();
            ctx.beginPath();
            for (let j = 0; j <= pts; j++) {
                const a = (j / pts) * Math.PI * 2;
                const x = ix + r * Math.cos(a) + 1;
                const y = iy + r * Math.sin(a) + 1;
                j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.strokeStyle = 'rgba(0,0,0,0.38)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }
        for (let i = 0; i < spokes; i++) {
            const angle = (i / spokes) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
            const ex = ix + Math.cos(angle) * maxR * 0.65;
            const ey = iy + Math.sin(angle) * maxR * 0.65;
            const mx = ix + Math.cos(angle) * maxR * 0.32 + (Math.random() - 0.5) * 10;
            const my = iy + Math.sin(angle) * maxR * 0.32 + (Math.random() - 0.5) * 10;
            ctx.beginPath();
            ctx.moveTo(ix, iy);
            ctx.lineTo(mx, my);
            ctx.lineTo(ex, ey);
            ctx.strokeStyle = 'rgba(255,255,255,0.62)';
            ctx.lineWidth = 1.4;
            ctx.stroke();
        }
        const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, Math.min(w, h) * 0.025);
        g.addColorStop(0, 'rgba(255,255,255,0.95)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(ix, iy, Math.min(w, h) * 0.025, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
    }

    function _shardPath(ctx, cx, cy, radius, sides, angle) {
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const a = angle + (i / sides) * Math.PI * 2;
            const r = radius * (0.65 + Math.random() * 0.48);
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
    }

    function _renderFragments(src, intensity) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w;
        cvs.height = h;
        const ctx = cvs.getContext('2d');
        const base = Math.min(w, h);
        const scale = _clamp01(intensity);

        if (scale > 0.72) {
            ctx.drawImage(src, 0, 0);
            _drawGlassDepth(ctx, w, h, scale);
            _drawHairlineCracks(ctx, w, h, scale * 0.55);
            _drawGlassReflection(ctx, w, h, scale);
            return cvs;
        }

        ctx.save();
        ctx.filter = `blur(${Math.round(8 - scale * 4)}px) brightness(${0.24 + scale * 0.24})`;
        ctx.drawImage(src, 0, 0);
        ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,0.58)';
        ctx.fillRect(0, 0, w, h);

        const shardCount = Math.max(3, Math.round(4 + scale * 28));
        for (let i = 0; i < shardCount; i++) {
            const cx = Math.random() * w;
            const cy = Math.random() * h;
            const radius = base * (0.06 + Math.random() * (0.16 + scale * 0.08));
            const sides = 3 + Math.floor(Math.random() * 4);
            const angle = Math.random() * Math.PI * 2;
            const refractX = (Math.random() - 0.5) * base * 0.018;
            const refractY = (Math.random() - 0.5) * base * 0.018;

            ctx.save();
            _shardPath(ctx, cx, cy, radius, sides, angle);
            ctx.clip();
            ctx.drawImage(src, refractX, refractY);
            ctx.restore();

            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(160,220,255,0.28)';
            _shardPath(ctx, cx, cy, radius, sides, angle);
            ctx.strokeStyle = 'rgba(225,245,255,0.78)';
            ctx.lineWidth = Math.max(1, base * 0.004);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = Math.max(0.6, base * 0.002);
            ctx.stroke();
            ctx.restore();
        }
        return cvs;
    }

    function _strokeMaskPath(ctx, w, h, thickness) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.moveTo(-w * 0.34, h * 0.08);
        ctx.bezierCurveTo(-w * 0.12, -h * 0.28, w * 0.16, h * 0.20, w * 0.36, -h * 0.10);
        ctx.stroke();
        ctx.lineWidth = thickness * 0.42;
        ctx.beginPath();
        ctx.moveTo(w * 0.04, -h * 0.02);
        ctx.quadraticCurveTo(w * 0.18, h * 0.08, w * 0.30, h * 0.20);
        ctx.stroke();
    }

    function _renderSmudge(src, config) {
        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w;
        cvs.height = h;
        const ctx = cvs.getContext('2d');
        const intensity = _clamp01(config.intensity);
        const smudge = config.smudge || {};
        const x = (smudge.x ?? 0.5) * w;
        const y = (smudge.y ?? 0.5) * h;
        const rotation = ((smudge.rotation ?? -12) * Math.PI) / 180;
        const thickness = Math.min(w, h) * (0.04 + intensity * 0.18);

        const mask = document.createElement('canvas');
        mask.width = w;
        mask.height = h;
        const mctx = mask.getContext('2d');
        mctx.save();
        mctx.translate(x, y);
        mctx.rotate(rotation);
        mctx.strokeStyle = '#fff';
        _strokeMaskPath(mctx, w, h, thickness);
        mctx.restore();

        if (smudge.invert) {
            ctx.drawImage(src, 0, 0);
            ctx.globalCompositeOperation = 'destination-out';
            ctx.drawImage(mask, 0, 0);
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(mask, 0, 0);
            ctx.globalCompositeOperation = 'source-in';
            ctx.drawImage(src, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
        }
        return cvs;
    }

    function render(src, variant, config = {}) {
        const intensity = config.intensity !== undefined ? config.intensity : 1.0;
        if (variant === 'fragments' || variant === 'fractured') return _renderFragments(src, intensity);
        if (variant === 'smudge') return _renderSmudge(src, { ...config, intensity });

        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w;
        cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(src, 0, 0);
        _drawGlassDepth(ctx, w, h, intensity);
        _drawSpiderweb(ctx, w, h, intensity);
        _drawGlassReflection(ctx, w, h, intensity);
        return cvs;
    }

    return { render };
})();
