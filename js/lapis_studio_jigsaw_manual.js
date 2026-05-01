'use strict';
window.LapisStudioJigsawManual = (() => {
    function create(options) {
        const {
            Vue,
            activeNav,
            effectCategory,
            activeEffect,
            jigsawManual,
            jigsawGrid,
            jigsawLayout,
            fxIntensity,
            applyEffectFilter,
        } = options;
        const { computed, ref } = Vue;
        let drag = null;
        let frame = 0;
        let point = null;
        const dragging = ref(false);

        const jigsawManualActive = computed(() =>
            activeNav.value === 'effects' &&
            effectCategory.value === 'jigsaw' &&
            jigsawManual.value &&
            activeEffect.value.startsWith('jigsaw-') &&
            jigsawLayout.value.length > 0
        );

        function resetLayout() {
            jigsawLayout.value = [];
        }

        function ensureLayout(width, height) {
            const current = jigsawLayout.value;
            const valid = current.meta &&
                current.meta.width === width &&
                current.meta.height === height &&
                current.meta.gridSize === jigsawGrid.value;
            if (!valid) {
                const layout = LapisFXJigsaw.createLayout(width, height, jigsawGrid.value, fxIntensity.value);
                jigsawLayout.value = layout.pieces;
                jigsawLayout.value.meta = {
                    width: layout.width,
                    height: layout.height,
                    gridSize: layout.gridSize,
                };
            }
            return { pieces: jigsawLayout.value };
        }

        function toggleJigsawManual() {
            jigsawManual.value = !jigsawManual.value;
            resetLayout();
            const key = activeEffect.value.startsWith('jigsaw-')
                ? activeEffect.value
                : 'jigsaw-scattered';
            applyEffectFilter(key);
        }

        function pieceStyle(piece) {
            const meta = jigsawLayout.value.meta || { width: 1, height: 1, gridSize: jigsawGrid.value };
            const pw = meta.width / meta.gridSize;
            const ph = meta.height / meta.gridSize;
            const x = (piece.c * pw + pw / 2 + piece.ox) / meta.width * 100;
            const y = (piece.r * ph + ph / 2 + piece.oy) / meta.height * 100;
            return {
                left: `${x}%`,
                top: `${y}%`,
                width: `${100 / meta.gridSize}%`,
                height: `${100 / meta.gridSize}%`,
                transform: `translate(-50%, -50%) rotate(${piece.angle}rad)`,
            };
        }

        function beginDrag(piece, event) {
            const rect = document.getElementById('jigsaw-manual-layer')?.getBoundingClientRect();
            const meta = jigsawLayout.value.meta;
            if (!rect || !meta) return;
            drag = { piece, rect, meta, sx: event.clientX, sy: event.clientY, ox: piece.ox, oy: piece.oy };
            dragging.value = true;
            event.currentTarget.setPointerCapture?.(event.pointerId);
        }

        function _raf(fn) {
            return (window.requestAnimationFrame || ((cb) => setTimeout(cb, 16)))(fn);
        }

        function _caf(id) {
            (window.cancelAnimationFrame || clearTimeout)(id);
        }

        function _applyDrag(clientX, clientY) {
            if (!drag) return;
            const { piece, rect, meta, sx, sy, ox, oy } = drag;
            piece.ox = ox + (clientX - sx) / rect.width * meta.width;
            piece.oy = oy + (clientY - sy) / rect.height * meta.height;
        }

        function _flushDrag() {
            frame = 0;
            if (!point) return;
            _applyDrag(point.clientX, point.clientY);
            point = null;
        }

        function moveDrag(event) {
            if (!drag) return;
            point = { clientX: event.clientX, clientY: event.clientY };
            if (!frame) frame = _raf(_flushDrag);
        }

        function endDrag() {
            if (!drag) return;
            if (frame) {
                _caf(frame);
                frame = 0;
            }
            if (point) {
                _applyDrag(point.clientX, point.clientY);
                point = null;
            }
            drag = null;
            dragging.value = false;
            if (activeEffect.value.startsWith('jigsaw-')) applyEffectFilter(activeEffect.value);
        }

        return {
            jigsawManualActive,
            dragging,
            resetLayout,
            ensureLayout,
            toggleJigsawManual,
            pieceStyle,
            beginDrag,
            moveDrag,
            endDrag,
        };
    }

    return { create };
})();
