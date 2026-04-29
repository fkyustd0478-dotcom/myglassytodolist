'use strict';
window.LapisFXSticker = (() => {

    const BUILT_IN = ['❤️','⭐','🔥','✨','🌈','🎉','💎','🌸','🦋','🎵','😍','🏆'];

    function render(src, config = {}) {
        const { sticker = '', x = 0.5, y = 0.5, scale = 0.18 } = config;
        if (!sticker) return src;

        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(src, 0, 0);

        const fs = Math.round(Math.min(w, h) * scale);
        ctx.font         = `${fs}px serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sticker, x * w, y * h);
        return cvs;
    }

    return { BUILT_IN, render };
})();
