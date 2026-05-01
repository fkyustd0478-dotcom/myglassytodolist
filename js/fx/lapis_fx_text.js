'use strict';
window.LapisFXText = (() => {

    function render(src, config = {}) {
        const {
            text        = '',
            fontFamily  = 'Arial, sans-serif',
            fontSize    = 80,
            color       = '#ffffff',
            strokeColor = 'rgba(0,0,0,0.65)',
            strokeWidth = 2,
            bold = true,
            italic = false,
            strike = false,
            rotation = 0,
            x = 0.5, y = 0.5,
        } = config;
        if (!text.trim()) return src;

        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(src, 0, 0);

        const fs = Math.round(Math.min(w, h) * (fontSize / 600));
        const weight = bold ? '900' : '500';
        const style = italic ? 'italic' : 'normal';
        ctx.font         = `${style} ${weight} ${fs}px ${fontFamily}`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        const px = x * w, py = y * h;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rotation * Math.PI / 180);

        if (strokeColor && strokeWidth > 0) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth   = strokeWidth * (fs / 24);
            ctx.lineJoin    = 'round';
            ctx.strokeText(text, 0, 0);
        }
        ctx.fillStyle = color;
        ctx.fillText(text, 0, 0);
        if (strike) {
            const metrics = ctx.measureText(text);
            const half = metrics.width / 2;
            ctx.beginPath();
            ctx.moveTo(-half, 0);
            ctx.lineTo(half, 0);
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(2, fs * 0.06);
            ctx.stroke();
        }
        ctx.restore();
        return cvs;
    }

    return { render };
})();
