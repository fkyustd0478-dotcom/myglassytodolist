'use strict';
window.LapisFXSticker = (() => {

    const CATEGORIES = {
        emojis: ['😀','😂','😍','😎','🥳','😭','😡','😴','🤍','🔥','✨','⭐','🌙','☀️','🌈','🍀','🎂','🎁','💎','💫'],
        deco:   ['♡','♥','★','☆','✦','✧','✿','❀','❁','☁','☂','♪','♫','✓','✕','‼','⁂','※','∞','+'],
        shapes: ['●','○','■','□','◆','◇','▲','△','▼','▽','⬟','⬢','⬡','⬤','⬥','⬧','⬨','⬩','⬪','⬫'],
    };
    const BUILT_IN = CATEGORIES.emojis;

    function render(src, config = {}) {
        const { sticker = '', x = 0.5, y = 0.5, scale = 0.18, rotation = 0 } = config;
        if (!sticker) return src;

        const { width: w, height: h } = src;
        const cvs = document.createElement('canvas');
        cvs.width = w; cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(src, 0, 0);

        const fs = Math.round(Math.min(w, h) * scale);
        ctx.font         = `${fs}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.save();
        ctx.translate(x * w, y * h);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.fillText(sticker, 0, 0);
        ctx.restore();
        return cvs;
    }

    return { CATEGORIES, BUILT_IN, render };
})();
