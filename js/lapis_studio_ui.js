'use strict';
(function waitForDeps() {
    if (typeof Vue               === 'undefined' ||
        typeof useNav            === 'undefined' ||
        typeof LapisFXShatter    === 'undefined' ||
        typeof LapisFXJigsaw     === 'undefined' ||
        typeof LapisStudioEngine === 'undefined' ||
        typeof Cropper           === 'undefined') {
        return setTimeout(waitForDeps, 20);
    }

    const { createApp, ref, computed, onMounted, onUnmounted, onUpdated, nextTick } = Vue;

    createApp({
        setup() {
            const { navSettings, isDarkTheme, glassStyle, themeClasses,
                    customBgStyle, systemDark, resolvedTheme } = useNav();

            // ── Core state ───────────────────────────────────────────────────
            const imageUrl          = ref('');       // blob URL (original upload)
            const resultUrl         = ref('');       // data URL (after crop/effect)
            // 'main' | 'crop' | 'effects'
            const activeNav         = ref('main');
            const dragOver          = ref(false);
            const cropShape         = ref('free');
            // Key of the PENDING (previewed but not yet committed) effect
            const activeEffect      = ref('');
            // Which effects sub-category is shown in the floating panel
            const effectCategory    = ref('filters'); // 'filters' | 'glass' | 'jigsaw'

            // Crop overlay
            const cropBoxData   = ref(null);
            const containerSize = ref({ w: 0, h: 0 });

            // History
            const canUndoCt   = ref(0);
            let _undoStack    = [];
            let _cropper      = null;
            let _resultCanvas = null;
            // Snapshot of resultUrl at the START of the current effects session.
            // Every filter is previewed by applying to this base (replace, not stack).
            // Cleared on commit (Apply / Save) or discard (Back).
            let _effectsBase  = null;

            // ── Content panel ─────────────────────────────────────────────────
            const contentView = computed(() => {
                if (activeNav.value === 'crop') return 'crop';
                if (!imageUrl.value)            return 'upload';
                return 'preview';  // both 'main' and 'effects' show the image
            });

            const isSpecialShape = computed(() =>
                ['circle', 'ellipse', 'heart', 'star'].includes(cropShape.value)
            );

            // Floating panel appears for crop (shape row) and effects (filter categories)
            const showFloatingPanel = computed(() =>
                activeNav.value === 'crop' || activeNav.value === 'effects'
            );

            // Extra ~54 px for floating panel when visible
            const mainPaddingBottom = computed(() =>
                showFloatingPanel.value
                    ? 'calc(134px + env(safe-area-inset-bottom, 0px))'
                    : 'calc(80px + env(safe-area-inset-bottom, 0px))'
            );

            // ── Shape-aware SVG crop overlay ──────────────────────────────────
            const shapeOverlaySvg = computed(() => {
                if (!isSpecialShape.value || !cropBoxData.value || !containerSize.value.w) return '';
                const { left: bx, top: by, width: bw, height: bh } = cropBoxData.value;
                const { w: cw, h: ch } = containerSize.value;
                const inner = LapisStudioEngine.svgShapeInner(cropShape.value, bx, by, bw, bh);
                if (!inner) return '';
                return `<svg xmlns="http://www.w3.org/2000/svg" `
                     + `style="width:100%;height:100%;display:block;" `
                     + `viewBox="0 0 ${cw} ${ch}">`
                     + `<defs><mask id="csm-${cropShape.value}">`
                     + `<rect width="${cw}" height="${ch}" fill="white"/>`
                     + inner
                     + `</mask></defs>`
                     + `<rect width="${cw}" height="${ch}" fill="rgba(0,0,0,0.52)" `
                     + `mask="url(#csm-${cropShape.value})"/>`
                     + `</svg>`;
            });

            // ── i18n ─────────────────────────────────────────────────────────
            const translations = {
                zh: {
                    upload: '上傳', crop: '剪裁', effects: '特效', save: '保存',
                    back: '返回', undo: '復原', apply: '套用',
                    tapToUpload: '點擊或拖曳圖片至此',
                    uploadHint: '支援 JPG、PNG、WebP，最大 10 MB',
                    choosePhoto: '選擇照片',
                    saveAs: '另存為', cancel: '取消',
                    free: '自由', '1:1': '1:1', '4:3': '4:3', '9:16': '9:16',
                    circle: '圓形', ellipse: '橢圓', heart: '愛心', star: '星形',
                    errSize: '圖片超過 10 MB，請選擇較小的檔案。',
                    errLoad: '圖片載入失敗，請重試。',
                    errExport: '匯出失敗，請重試。',
                    noImage: '請先上傳一張圖片。',
                    confirmDelete: '確定要刪除此圖片嗎？',
                    // Effects categories
                    filtersCat: '濾鏡', glassCat: '碎玻璃', jigsawCat: '拼圖',
                    // Colour filters
                    grayscale: '黑白', sepia: '復古', vivid: '鮮豔',
                    dim: '暗調', warm: '暖色', cool: '冷色',
                    // Glass variants
                    glassImpact: '衝擊', glassSpiderweb: '蜘蛛網', glassFractured: '碎裂',
                    // Jigsaw variants
                    jigsawStatic: '靜止', jigsawExplode: '爆炸',
                    jigsawDrift: '漂移', jigsawGravity: '重力', jigsawScattered: '散落',
                },
                en: {
                    upload: 'Upload', crop: 'Crop', effects: 'Effects', save: 'Save',
                    back: 'Back', undo: 'Undo', apply: 'Apply',
                    tapToUpload: 'Tap or drag an image here',
                    uploadHint: 'JPG, PNG, WebP — max 10 MB',
                    choosePhoto: 'Choose Photo',
                    saveAs: 'Save As', cancel: 'Cancel',
                    free: 'Free', '1:1': '1:1', '4:3': '4:3', '9:16': '9:16',
                    circle: 'Circle', ellipse: 'Ellipse', heart: 'Heart', star: 'Star',
                    errSize: 'Image exceeds 10 MB.',
                    errLoad: 'Failed to load image.',
                    errExport: 'Export failed. Please try again.',
                    noImage: 'Please upload an image first.',
                    confirmDelete: 'Delete this image?',
                    filtersCat: 'Filters', glassCat: 'Glass', jigsawCat: 'Jigsaw',
                    grayscale: 'B&W', sepia: 'Sepia', vivid: 'Vivid',
                    dim: 'Dim', warm: 'Warm', cool: 'Cool',
                    glassImpact: 'Impact', glassSpiderweb: 'Spiderweb', glassFractured: 'Fractured',
                    jigsawStatic: 'Static', jigsawExplode: 'Explode',
                    jigsawDrift: 'Drift', jigsawGravity: 'Gravity', jigsawScattered: 'Scattered',
                },
            };
            const t = computed(() => translations[navSettings.lang] || translations.zh);

            // ── Data lists ────────────────────────────────────────────────────
            const cropRatios = computed(() => [
                { key: 'free', label: t.value.free,    ratio: NaN  },
                { key: '1:1',  label: t.value['1:1'],  ratio: 1    },
                { key: '4:3',  label: t.value['4:3'],  ratio: 4/3  },
                { key: '9:16', label: t.value['9:16'], ratio: 9/16 },
            ]);

            const specialShapes = [
                { key: 'circle',  svg: '<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><circle cx="10" cy="10" r="9"/></svg>' },
                { key: 'ellipse', svg: '<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><ellipse cx="10" cy="10" rx="9" ry="5.5"/></svg>' },
                { key: 'heart',   svg: '<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M10 17C10 17 3 12 3 7.5a4.5 4.5 0 0 1 7-3.73A4.5 4.5 0 0 1 17 7.5C17 12 10 17 10 17z"/></svg>' },
                { key: 'star',    svg: '<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7"/></svg>' },
            ];

            const effectsList = [
                { key: 'grayscale', tKey: 'grayscale' },
                { key: 'sepia',     tKey: 'sepia'     },
                { key: 'vivid',     tKey: 'vivid'     },
                { key: 'dim',       tKey: 'dim'       },
                { key: 'warm',      tKey: 'warm'      },
                { key: 'cool',      tKey: 'cool'      },
            ];

            const glassVariants = [
                { key: 'glass-impact',    tKey: 'glassImpact'    },
                { key: 'glass-spiderweb', tKey: 'glassSpiderweb' },
                { key: 'glass-fractured', tKey: 'glassFractured' },
            ];

            const jigsawVariants = [
                { key: 'jigsaw-static',    tKey: 'jigsawStatic'    },
                { key: 'jigsaw-explode',   tKey: 'jigsawExplode'   },
                { key: 'jigsaw-drift',     tKey: 'jigsawDrift'     },
                { key: 'jigsaw-gravity',   tKey: 'jigsawGravity'   },
                { key: 'jigsaw-scattered', tKey: 'jigsawScattered' },
            ];

            // ── File upload ───────────────────────────────────────────────────
            function _resetState() {
                _resultCanvas      = null;
                _undoStack         = [];
                canUndoCt.value    = 0;
                activeEffect.value = '';
                _effectsBase       = null;
                effectCategory.value = 'filters';
            }

            async function _loadFile(file) {
                if (!file || !file.type.startsWith('image/')) return;
                try {
                    const url = await LapisStudioEngine.load(file);
                    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
                    imageUrl.value   = url;
                    resultUrl.value  = '';
                    activeNav.value  = 'main';
                    _resetState();
                } catch (e) {
                    alert(e.message === 'SIZE_EXCEEDED' ? t.value.errSize : t.value.errLoad);
                }
            }

            function handleFileInput(e) { _loadFile(e.target.files[0]); e.target.value = ''; }
            function triggerUpload()     { document.getElementById('studio-file-input').click(); }
            function onDrop(e)           { dragOver.value = false; _loadFile(e.dataTransfer.files[0]); }

            // ── Image delete ──────────────────────────────────────────────────
            function promptDeleteImage() {
                if (!confirm(t.value.confirmDelete)) return;
                if (_cropper) { _cropper.destroy(); _cropper = null; }
                if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
                imageUrl.value    = '';
                resultUrl.value   = '';
                cropBoxData.value = null;
                activeNav.value   = 'main';
                _resetState();
            }

            // ── History ───────────────────────────────────────────────────────
            function _pushHistory(stateUrl) {
                _undoStack.push(stateUrl !== undefined ? stateUrl : resultUrl.value);
                if (_undoStack.length > 10) _undoStack.shift();
                canUndoCt.value = _undoStack.length;
            }

            function undo() {
                if (_undoStack.length === 0) return;
                // Discard any uncommitted (pending) preview first
                activeEffect.value = '';
                const prev = _undoStack.pop();
                resultUrl.value  = prev;
                _resultCanvas    = null;
                canUndoCt.value  = _undoStack.length;
                if (activeNav.value === 'crop') {
                    // Stay in crop — re-init cropper with the restored image
                    if (_cropper) { _cropper.destroy(); _cropper = null; }
                    cropBoxData.value = null;
                    cropShape.value   = 'free';
                    nextTick(() => _initCropper(NaN));
                } else if (activeNav.value === 'effects') {
                    // Update base to match restored state (next preview applies from here)
                    _effectsBase = prev;
                } else {
                    _effectsBase = null;
                }
            }

            // ── Effects nav ───────────────────────────────────────────────────
            function enterEffects() {
                if (!imageUrl.value) return;
                _effectsBase       = resultUrl.value; // snapshot pre-effects state
                activeEffect.value = '';
                effectCategory.value = 'filters';
                activeNav.value    = 'effects';
            }

            // Preview a filter (live, no history push — replace mode)
            function applyEffectFilter(effectKey) {
                if (!imageUrl.value) return;
                const src = (_effectsBase !== null ? _effectsBase : resultUrl.value) || imageUrl.value;
                const img = new Image();
                img.onload = () => {
                    const sc = document.createElement('canvas');
                    sc.width  = img.naturalWidth;
                    sc.height = img.naturalHeight;
                    sc.getContext('2d').drawImage(img, 0, 0);
                    const output = LapisStudioEngine.applyEffect(sc, effectKey);
                    _resultCanvas      = output;
                    resultUrl.value    = output.toDataURL('image/png');
                    activeEffect.value = effectKey;
                };
                img.src = src;
            }

            // Commit the pending preview → push _effectsBase to history, advance base
            function applyCurrentEffect() {
                if (activeEffect.value === '') return;
                _pushHistory(_effectsBase !== null ? _effectsBase : '');
                _effectsBase       = resultUrl.value; // committed result is new base
                activeEffect.value = '';
            }

            // Commit (if pending) + exit to main nav — NO download
            function saveFromEffects() {
                if (activeEffect.value !== '') {
                    _pushHistory(_effectsBase !== null ? _effectsBase : '');
                    activeEffect.value = '';
                }
                _effectsBase    = null;
                activeNav.value = 'main';
            }

            // Discard uncommitted preview + exit to main nav
            function exitEffects() {
                if (activeEffect.value !== '' && _effectsBase !== null) {
                    resultUrl.value = _effectsBase;
                    _resultCanvas   = null;
                }
                activeEffect.value = '';
                _effectsBase       = null;
                activeNav.value    = 'main';
            }

            // ── Crop ─────────────────────────────────────────────────────────
            async function enterCrop() {
                if (!imageUrl.value) { alert(t.value.noImage); return; }
                _effectsBase       = null;
                activeEffect.value = '';
                cropShape.value    = 'free';
                cropBoxData.value  = null;
                activeNav.value    = 'crop';
                await nextTick();
                _initCropper(NaN);
            }

            function _syncContainerSize() {
                const wrap = document.getElementById('crop-wrap');
                if (wrap) containerSize.value = { w: wrap.offsetWidth, h: wrap.offsetHeight };
            }

            function _initCropper(aspectRatio) {
                if (_cropper) { _cropper.destroy(); _cropper = null; }
                const img = document.getElementById('crop-image');
                img.src = resultUrl.value || imageUrl.value;
                _cropper = new Cropper(img, {
                    aspectRatio,
                    viewMode: 1, autoCropArea: 0.85, dragMode: 'move',
                    background: false, movable: true, zoomable: true,
                    ready() {
                        _syncContainerSize();
                        if (_cropper) cropBoxData.value = _cropper.getCropBoxData();
                    },
                    crop() {
                        _syncContainerSize();
                        if (_cropper) cropBoxData.value = _cropper.getCropBoxData();
                    },
                });
            }

            function setRatio(r) {
                cropShape.value = r.key;
                if (_cropper) _cropper.setAspectRatio(r.ratio);
            }

            function setSpecialShape(s) {
                cropShape.value = s.key;
                if (_cropper) _cropper.setAspectRatio(1);
            }

            // stayInCrop=true  → Apply button: commit crop, STAY in crop, re-init cropper
            // stayInCrop=false → Save button:  commit crop, EXIT to main nav (no download)
            function confirmCrop(stayInCrop = false) {
                if (!_cropper) return;
                _pushHistory();
                const data     = _cropper.getData(true); // pixel-accurate selection coords
                const specials = ['circle', 'ellipse', 'heart', 'star'];
                let output;
                if (specials.includes(cropShape.value)) {
                    // Build full-size source canvas so applyMask can translate(-x,-y)
                    // and align the crop region to (0,0) without getCroppedCanvas rounding
                    const srcImg = document.getElementById('crop-image');
                    const srcCvs = document.createElement('canvas');
                    srcCvs.width  = srcImg.naturalWidth;
                    srcCvs.height = srcImg.naturalHeight;
                    srcCvs.getContext('2d').drawImage(srcImg, 0, 0);
                    output = LapisStudioEngine.applyMask(srcCvs, cropShape.value, data);
                } else {
                    output = _cropper.getCroppedCanvas({ imageSmoothingQuality: 'high' });
                }
                _resultCanvas   = output;
                resultUrl.value = output.toDataURL('image/png');
                _cropper.destroy(); _cropper = null;
                cropBoxData.value = null;
                if (stayInCrop) {
                    cropShape.value = 'free';
                    nextTick(() => _initCropper(NaN));
                } else {
                    activeNav.value = 'main';
                }
            }

            function exitCrop() {
                if (_cropper) { _cropper.destroy(); _cropper = null; }
                cropBoxData.value = null;
                activeNav.value   = 'main';
            }

            // Save from crop = apply + exit to main nav (no download)
            function saveFromCrop() {
                if (_cropper) confirmCrop(false);
                else activeNav.value = 'main';
            }

            // ── Download (main nav only) ───────────────────────────────────────
            async function promptDownload() {
                if (!imageUrl.value) { alert(t.value.noImage); return; }
                const name = window.prompt(t.value.saveAs, `glassystudio_${Date.now()}`);
                if (name === null) return;
                try {
                    let canvas = _resultCanvas;
                    if (!canvas) {
                        const src = resultUrl.value || imageUrl.value;
                        const img = await LapisStudioEngine.loadImageToCanvas(src);
                        canvas = document.createElement('canvas');
                        canvas.width  = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        canvas.getContext('2d').drawImage(img, 0, 0);
                    }
                    await LapisStudioEngine.triggerRealDownload(canvas, name);
                } catch (e) {
                    alert(t.value.errExport);
                }
            }

            // ── Icon refresh ──────────────────────────────────────────────────
            function refreshIcons() {
                nextTick(() => { if (window.lucide) lucide.createIcons(); });
            }

            // ── Lifecycle ─────────────────────────────────────────────────────
            onMounted(() => {
                if (typeof LapisNav !== 'undefined') LapisNav.inject({ bottom: false });
                if (window.lucide) lucide.createIcons();
            });
            onUpdated(() => {
                if (window.lucide) lucide.createIcons();
            });
            onUnmounted(() => {
                if (_cropper)       _cropper.destroy();
                if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
            });

            return {
                navSettings, isDarkTheme, glassStyle, themeClasses,
                customBgStyle, systemDark, resolvedTheme,
                imageUrl, resultUrl, activeNav, contentView,
                dragOver, cropShape, cropBoxData, containerSize,
                isSpecialShape, shapeOverlaySvg,
                canUndoCt,
                showFloatingPanel, mainPaddingBottom,
                activeEffect, effectCategory,
                effectsList, glassVariants, jigsawVariants,
                t, cropRatios, specialShapes,
                handleFileInput, triggerUpload, onDrop,
                enterEffects, exitEffects, applyEffectFilter,
                applyCurrentEffect, saveFromEffects,
                enterCrop, exitCrop, confirmCrop, saveFromCrop,
                setRatio, setSpecialShape, undo,
                promptDownload, promptDeleteImage,
                refreshIcons,
            };
        },
    }).mount('#app');
})();
