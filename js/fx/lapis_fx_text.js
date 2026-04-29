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
            x = 0.5, y = 0.5,
        } = config;
        if (!text.trim()) return src;

        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(src, 0, 0);

        const fs = Math.round(Math.min(w, h) * (fontSize / 600));
        ctx.font         = `bold ${fs}px ${fontFamily}`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        const px = x * w, py = y * h;

        if (strokeColor && strokeWidth > 0) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth   = strokeWidth * (fs / 24);
            ctx.lineJoin    = 'round';
            ctx.strokeText(text, px, py);
        }
        ctx.fillStyle = color;
        ctx.fillText(text, px, py);
        return cvs;
    }

    return { render };
})();
