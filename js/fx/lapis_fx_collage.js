'use strict';
window.LapisFXCollage = (() => {

    // Build a grid collage from an array of blob/data URLs.
    // Cell size is determined by the first image; all others are scaled to match.
    async function createGrid(urls, cols = 2, gap = 12) {
        if (!urls || !urls.length) return null;
        const imgs = await Promise.all(urls.map(url => new Promise((res, rej) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload  = () => res(img);
            img.onerror = () => rej(new Error('IMG_FAIL'));
            img.src = url;
        })));
        const rows   = Math.ceil(imgs.length / cols);
        const cellW  = imgs[0].naturalWidth;
        const cellH  = imgs[0].naturalHeight;
        const totalW = cols * cellW + (cols + 1) * gap;
        const totalH = rows * cellH + (rows + 1) * gap;
        const cvs = document.createElement('canvas');
        cvs.width = totalW; cvs.height = totalH;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, totalW, totalH);
        imgs.forEach((img, i) => {
            const c = i % cols;
            const r = Math.floor(i / cols);
            const x = gap + c * (cellW + gap);
            const y = gap + r * (cellH + gap);
            ctx.drawImage(img, x, y, cellW, cellH);
        });
        return cvs;
    }

    return { createGrid };
})();
