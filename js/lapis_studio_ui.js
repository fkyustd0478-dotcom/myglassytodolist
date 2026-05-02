'use strict';
(function waitForDeps() {
    if (typeof Vue               === 'undefined' ||
        typeof useNav            === 'undefined' ||
        typeof LapisFXShatter    === 'undefined' ||
        typeof LapisFXJigsaw     === 'undefined' ||
        typeof LapisFXCollage    === 'undefined' ||
        typeof LapisFXText       === 'undefined' ||
        typeof LapisFXSticker    === 'undefined' ||
        typeof LapisStudioEngine === 'undefined' ||
        typeof LapisStudioJigsawManual === 'undefined' ||
        typeof Cropper           === 'undefined') {
        return setTimeout(waitForDeps, 20);
    }

    const { createApp, ref, computed, onMounted, onUnmounted, onUpdated, nextTick } = Vue;

    createApp({
        setup() {
            const { navSettings, isDarkTheme, glassStyle, themeClasses,
                    customBgStyle, systemDark, resolvedTheme } = useNav();

            // ── Core state ───────────────────────────────────────────────────
            const imageUrl       = ref('');       // blob URL (original upload)
            const resultUrl      = ref('');       // data URL (after crop/effect)
            const activeNav      = ref('main');   // 'main' | 'crop' | 'effects'
            const dragOver        = ref(false);
            const cropShape       = ref('free');
            const cropMode        = ref('manual');   // 'manual' | 'collage'
            const collageLayout   = ref('2x2');      // active layout key
            const collageCells    = ref([]);         // per-cell URLs (blob/data), null = empty
            const fxIntensity     = ref(1.0);        // 0‥1 slider for effects
            const jigsawGrid      = ref(4);
            const jigsawRange     = ref(100);
            const jigsawManual    = ref(false);
            const jigsawLayout    = ref([]);
            const activeEffect    = ref('');         // pending (previewed) effect key
            const effectCategory  = ref('filters'); // 'filters'|'jigsaw'|'text'|'stickers'
            const textConfig      = ref({
                text: '', fontFamily: 'Arial, sans-serif', fontSize: 80,
                color: '#ffffff', strokeColor: 'rgba(0,0,0,0.65)', strokeWidth: 2,
                bold: true, italic: false, strike: false,
                rotation: 0,
                x: 0.5, y: 0.5,
            });
            const stickerCategory = ref('emojis');
            const stickerConfig   = ref({ x: 0.5, y: 0.5, scale: 0.18, rotation: 0 });
            const stickerActive   = ref(''); // last-applied sticker emoji
            const downloadName    = ref('lapis-image');
            const modalMessageTitle = ref('');
            const modalMessage    = ref('');
            const sandboxDragging = ref(false);
            let _sandboxDrag       = null;
            let _sandboxFrame      = 0;
            let _sandboxPoint      = null;

            // Crop overlay
            const cropBoxData   = ref(null);
            const containerSize = ref({ w: 0, h: 0 });

            // History
            const canUndoCt   = ref(0);
            let _undoStack         = [];
            let _cropper           = null;
            let _resultCanvas      = null;
            let _effectsBase       = null;  // snapshot at effects-session start
            let _sliderTimer       = null;  // debounce handle for intensity slider
            let _collageActiveCell = 0;     // which cell is receiving a new file

            // ── Content panel ─────────────────────────────────────────────────
            const contentView = computed(() => {
                if (activeNav.value === 'crop') {
                    return cropMode.value === 'collage' ? 'collage' : 'crop';
                }
                if (!imageUrl.value) return 'upload';
                return 'preview';  // 'main' and 'effects' both show the image
            });

            const isSpecialShape = computed(() =>
                ['circle', 'ellipse', 'heart', 'star'].includes(cropShape.value)
            );

            // Crop controls use the floating panel; effects has its own FX drawer.
            const showFloatingPanel = computed(() => activeNav.value === 'crop');
            const sandboxActive = computed(() => {
                if (activeNav.value !== 'effects') return false;
                if (effectCategory.value === 'text') return !!textConfig.value.text.trim();
                if (effectCategory.value === 'stickers') return !!stickerActive.value;
                return false;
            });
            const sandboxBoxStyle = computed(() => {
                const cfg = effectCategory.value === 'stickers'
                    ? stickerConfig.value
                    : textConfig.value;
                const scale = effectCategory.value === 'stickers'
                    ? Math.max(0.6, cfg.scale * 4)
                    : Math.max(0.7, cfg.fontSize / 80);
                return {
                    left: `${cfg.x * 100}%`,
                    top: `${cfg.y * 100}%`,
                    transform: `translate(-50%, -50%) rotate(${cfg.rotation || 0}deg) scale(${scale})`,
                };
            });
            const jigsawManualTools = LapisStudioJigsawManual.create({
                Vue,
                activeNav,
                effectCategory,
                activeEffect,
                jigsawManual,
                jigsawGrid,
                jigsawRange,
                jigsawLayout,
                fxIntensity,
                applyEffectFilter,
            });
            const jigsawManualActive = jigsawManualTools.jigsawManualActive;

            const mainPaddingBottom = computed(() => {
                if (activeNav.value === 'effects')
                    return 'calc(246px + env(safe-area-inset-bottom, 0px))';
                if (activeNav.value === 'crop')
                    return 'calc(134px + env(safe-area-inset-bottom, 0px))';
                return 'calc(80px + env(safe-area-inset-bottom, 0px))';
            });

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
                    upload: '上傳', cropCollage: '剪貼', effects: '特效', save: '保存',
                    back: '返回', undo: '復原', apply: '套用',
                    tapToUpload: '點擊或拖曳圖片至此',
                    uploadHint: '支援 JPG、PNG、WebP，最大 10 MB',
                    choosePhoto: '選擇照片',
                    saveAs: '另存為', cancel: '取消', confirm: '確認', deleteImage: '刪除圖片',
                    free: '自由', '1:1': '1:1', '4:3': '4:3', '9:16': '9:16',
                    circle: '圓形', ellipse: '橢圓', heart: '愛心', star: '星形',
                    errSize: '圖片超過 10 MB，請選擇較小的檔案。',
                    errLoad: '圖片載入失敗，請重試。',
                    errExport: '匯出失敗，請重試。',
                    noImage: '請先上傳一張圖片。',
                    confirmDelete: '確定要刪除此圖片嗎？',
                    // Crop/Collage mode
                    manualCrop: '手動剪裁', autoCollage: '自動拼貼',
                    addImage: '加入圖片', addImagesHint: '選擇多張圖片後按格式鈕建立拼貼',
                    // Effects
                    filtersCat: '濾鏡', jigsawCat: '拼圖',
                    textCat: '文字', stickerCat: '貼圖',
                    intensity: '強度', range: '範圍',
                    enterText: '輸入文字…', buildGrid: '建立',
                    // Colour filters
                    grayscale: '黑白', sepia: '復古', vivid: '鮮豔',
                    dim: '暗調', warm: '暖色', cool: '冷色',
                    // Jigsaw variants
                    jigsawStatic: '靜止', jigsawExplode: '爆炸',
                    jigsawDrift: '漂移', jigsawGravity: '重力', jigsawScattered: '散落',
                },
                en: {
                    upload: 'Upload', cropCollage: 'Collage', effects: 'Effects', save: 'Save',
                    back: 'Back', undo: 'Undo', apply: 'Apply',
                    tapToUpload: 'Tap or drag an image here',
                    uploadHint: 'JPG, PNG, WebP — max 10 MB',
                    choosePhoto: 'Choose Photo',
                    saveAs: 'Save As', cancel: 'Cancel', confirm: 'Confirm', deleteImage: 'Delete Image',
                    free: 'Free', '1:1': '1:1', '4:3': '4:3', '9:16': '9:16',
                    circle: 'Circle', ellipse: 'Ellipse', heart: 'Heart', star: 'Star',
                    errSize: 'Image exceeds 10 MB.',
                    errLoad: 'Failed to load image.',
                    errExport: 'Export failed. Please try again.',
                    noImage: 'Please upload an image first.',
                    confirmDelete: 'Delete this image?',
                    manualCrop: 'Manual Crop', autoCollage: 'Auto Collage',
                    addImage: 'Add Image', addImagesHint: 'Add images then pick a grid layout',
                    filtersCat: 'Filters', jigsawCat: 'Jigsaw',
                    textCat: 'Text', stickerCat: 'Stickers',
                    intensity: 'Intensity', range: 'Range',
                    enterText: 'Enter text…', buildGrid: 'Build',
                    grayscale: 'B&W', sepia: 'Sepia', vivid: 'Vivid',
                    dim: 'Dim', warm: 'Warm', cool: 'Cool',
                    jigsawStatic: 'Static', jigsawExplode: 'Explode',
                    jigsawDrift: 'Drift', jigsawGravity: 'Gravity', jigsawScattered: 'Scattered',
                },
            };
            if (typeof LapisI18n !== 'undefined') {
                LapisI18n.register('zh', { studio: translations.zh });
                LapisI18n.register('en', { studio: translations.en });
            }
            const studioTranslationKeys = Object.keys(translations.zh);
            const getStudioTranslations = (lang) => {
                const fallback = translations[lang] || translations.zh;
                if (typeof LapisI18n === 'undefined') return fallback;

                return studioTranslationKeys.reduce((dict, key) => {
                    const i18nKey = `studio.${key}`;
                    const value = LapisI18n.t(i18nKey, null, lang);
                    dict[key] = value === i18nKey ? fallback[key] : value;
                    return dict;
                }, {});
            };
            const t = computed(() => getStudioTranslations(navSettings.lang));

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

            const stickerCategoryList = [
                { key: 'emojis', label: 'Emojis' },
                { key: 'deco',   label: 'Deco' },
                { key: 'shapes', label: 'Shapes' },
            ];
            const stickerList = computed(() => {
                const categories = LapisFXSticker.CATEGORIES || {};
                return categories[stickerCategory.value] || LapisFXSticker.BUILT_IN;
            });
            const collageLayouts = LapisFXCollage.LAYOUTS;  // static, for template iteration

            const jigsawVariants = [
                { key: 'jigsaw-static',    tKey: 'jigsawStatic'    },
                { key: 'jigsaw-explode',   tKey: 'jigsawExplode'   },
                { key: 'jigsaw-drift',     tKey: 'jigsawDrift'     },
                { key: 'jigsaw-gravity',   tKey: 'jigsawGravity'   },
                { key: 'jigsaw-scattered', tKey: 'jigsawScattered' },
            ];

            // ── File upload ───────────────────────────────────────────────────
            function _resetState() {
                _resultCanvas          = null;
                _undoStack             = [];
                canUndoCt.value        = 0;
                activeEffect.value     = '';
                _effectsBase           = null;
                effectCategory.value   = 'filters';
                fxIntensity.value      = 1.0;
                jigsawGrid.value       = 4;
                jigsawRange.value      = 100;
                jigsawManual.value     = false;
                jigsawLayout.value     = [];
                textConfig.value       = {
                    text: '', fontFamily: 'Arial, sans-serif', fontSize: 80,
                    color: '#ffffff', strokeColor: 'rgba(0,0,0,0.65)', strokeWidth: 2,
                    bold: true, italic: false, strike: false,
                    rotation: 0,
                    x: 0.5, y: 0.5,
                };
                stickerCategory.value  = 'emojis';
                stickerConfig.value    = { x: 0.5, y: 0.5, scale: 0.18, rotation: 0 };
                stickerActive.value    = '';
            }

            async function _loadFile(file) {
                if (!file || !file.type.startsWith('image/')) return;
                try {
                    const url = await LapisStudioEngine.load(file);
                    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
                    imageUrl.value  = url;
                    resultUrl.value = '';
                    activeNav.value = 'main';
                    _resetState();
                } catch (e) {
                    alert(e.message === 'SIZE_EXCEEDED' ? t.value.errSize : t.value.errLoad);
                }
            }

            function handleFileInput(e) { _loadFile(e.target.files[0]); e.target.value = ''; }
            function triggerUpload()     { document.getElementById('studio-file-input').click(); }
            function onDrop(e)           { dragOver.value = false; _loadFile(e.dataTransfer.files[0]); }

            function openStudioModal(id) {
                if (typeof LapisModal !== 'undefined') LapisModal.open(id);
            }

            function closeStudioModal(id) {
                if (typeof LapisModal !== 'undefined') LapisModal.close(id);
            }

            function showStudioMessage(message, title = t.value.save) {
                modalMessageTitle.value = title;
                modalMessage.value = message;
                openStudioModal('studio-message-modal');
            }

            // ── Image delete ──────────────────────────────────────────────────
            function promptDeleteImage() {
                if (!imageUrl.value) return;
                openStudioModal('studio-delete-modal');
            }

            function confirmDeleteImage() {
                closeStudioModal('studio-delete-modal');
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
                activeEffect.value = '';
                const prev = _undoStack.pop();
                resultUrl.value = prev;
                _resultCanvas   = null;
                canUndoCt.value = _undoStack.length;
                if (activeNav.value === 'crop') {
                    if (_cropper) { _cropper.destroy(); _cropper = null; }
                    cropBoxData.value = null;
                    cropShape.value   = 'free';
                    nextTick(() => _initCropper(NaN));
                } else if (activeNav.value === 'effects') {
                    _effectsBase = prev;
                } else {
                    _effectsBase = null;
                }
            }

            // ── Effects nav ───────────────────────────────────────────────────
            function enterEffects() {
                if (!imageUrl.value) return;
                _effectsBase         = resultUrl.value;
                activeEffect.value   = '';
                effectCategory.value = 'filters';
                activeNav.value      = 'effects';
            }

            function applyEffectFilter(effectKey) {
                if (!imageUrl.value) return;
                const src = (_effectsBase !== null ? _effectsBase : resultUrl.value) || imageUrl.value;
                const img = new Image();
                img.onload = () => {
                    const sc = document.createElement('canvas');
                    sc.width  = img.naturalWidth;
                    sc.height = img.naturalHeight;
                    sc.getContext('2d').drawImage(img, 0, 0);
                    const config = {
                        intensity: fxIntensity.value,
                        gridSize: jigsawGrid.value,
                        roiRange: jigsawRange.value / 100,
                    };
                    if (effectKey.startsWith('jigsaw-') && jigsawManual.value) {
                        config.layout = jigsawManualTools.ensureLayout(sc.width, sc.height);
                    }
                    const output = LapisStudioEngine.applyEffect(sc, effectKey, config);
                    _resultCanvas      = output;
                    resultUrl.value    = output.toDataURL('image/png');
                    activeEffect.value = effectKey;
                };
                img.src = src;
            }

            function onJigsawGridChange() {
                jigsawManualTools.resetLayout();
                if (activeEffect.value && activeEffect.value.startsWith('jigsaw-')) {
                    applyEffectFilter(activeEffect.value);
                }
            }

            function onJigsawRangeChange() {
                jigsawManualTools.resetLayout();
                if (activeEffect.value && activeEffect.value.startsWith('jigsaw-')) {
                    applyEffectFilter(activeEffect.value);
                }
            }

            // 100 ms debounce: re-preview current effect when slider moves
            function onSliderInput() {
                if (_sliderTimer) clearTimeout(_sliderTimer);
                _sliderTimer = setTimeout(() => {
                    if (activeEffect.value) applyEffectFilter(activeEffect.value);
                }, 100);
            }

            function previewSandbox() {
                if (effectCategory.value === 'text') return applyText();
                if (effectCategory.value === 'stickers' && stickerActive.value) return applySticker(stickerActive.value);
                return Promise.resolve();
            }

            async function applyCurrentEffect() {
                if (activeEffect.value === '') return;
                if (activeEffect.value === '__text__' || activeEffect.value === '__sticker__') await previewSandbox();
                _pushHistory(_effectsBase !== null ? _effectsBase : '');
                _effectsBase       = resultUrl.value;
                activeEffect.value = '';
            }

            async function saveFromEffects() {
                if (activeEffect.value !== '') {
                    if (activeEffect.value === '__text__' || activeEffect.value === '__sticker__') await previewSandbox();
                    _pushHistory(_effectsBase !== null ? _effectsBase : '');
                    activeEffect.value = '';
                }
                _effectsBase    = null;
                activeNav.value = 'main';
            }

            function exitEffects() {
                if (activeEffect.value !== '' && _effectsBase !== null) {
                    resultUrl.value = _effectsBase;
                    _resultCanvas   = null;
                }
                activeEffect.value = '';
                _effectsBase       = null;
                activeNav.value    = 'main';
            }

            // ── Text overlay ─────────────────────────────────────────────────
            function applyText() {
                if (!imageUrl.value || !textConfig.value.text.trim()) return Promise.resolve();
                const src = (_effectsBase !== null ? _effectsBase : resultUrl.value) || imageUrl.value;
                const img = new Image();
                return new Promise((resolve) => {
                    img.onload = () => {
                    const sc = document.createElement('canvas');
                    sc.width = img.naturalWidth; sc.height = img.naturalHeight;
                    sc.getContext('2d').drawImage(img, 0, 0);
                    const out   = LapisFXText.render(sc, textConfig.value);
                    _resultCanvas      = out;
                    resultUrl.value    = out.toDataURL('image/png');
                    activeEffect.value = '__text__';
                    resolve();
                    };
                    img.onerror = () => resolve();
                    img.src = src;
                });
            }

            // ── Sticker overlay ───────────────────────────────────────────────
            function applySticker(emoji) {
                if (!imageUrl.value) return Promise.resolve();
                stickerActive.value = emoji;
                const src = (_effectsBase !== null ? _effectsBase : resultUrl.value) || imageUrl.value;
                const img = new Image();
                return new Promise((resolve) => {
                    img.onload = () => {
                    const sc = document.createElement('canvas');
                    sc.width = img.naturalWidth; sc.height = img.naturalHeight;
                    sc.getContext('2d').drawImage(img, 0, 0);
                    const out   = LapisFXSticker.render(sc, { sticker: emoji, ...stickerConfig.value });
                    _resultCanvas      = out;
                    resultUrl.value    = out.toDataURL('image/png');
                    activeEffect.value = '__sticker__';
                    resolve();
                    };
                    img.onerror = () => resolve();
                    img.src = src;
                });
            }

            // ── Crop ─────────────────────────────────────────────────────────
            function _sandboxConfig() {
                if (effectCategory.value === 'stickers') return stickerConfig.value;
                return textConfig.value;
            }
            function _sandboxRect() {
                return document.getElementById('fx-sandbox-layer')?.getBoundingClientRect();
            }
            function _clamp01(v) {
                return Math.max(0.03, Math.min(0.97, v));
            }
            function _angle(cx, cy, e) {
                return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
            }
            function _raf(fn) {
                return (window.requestAnimationFrame || ((cb) => setTimeout(cb, 16)))(fn);
            }
            function _caf(id) {
                (window.cancelAnimationFrame || clearTimeout)(id);
            }
            function beginSandboxMove(e) {
                const rect = _sandboxRect();
                if (!rect) return;
                const cfg = _sandboxConfig();
                _sandboxDrag = { mode: 'move', rect, sx: e.clientX, sy: e.clientY, x: cfg.x, y: cfg.y };
                sandboxDragging.value = true;
                e.currentTarget.setPointerCapture?.(e.pointerId);
            }
            function beginSandboxScale(e) {
                const rect = _sandboxRect();
                if (!rect) return;
                const cfg = _sandboxConfig();
                _sandboxDrag = { mode: 'scale', rect, sx: e.clientX, size: cfg.scale || cfg.fontSize, fontSize: cfg.fontSize };
                sandboxDragging.value = true;
                e.currentTarget.setPointerCapture?.(e.pointerId);
            }
            function beginSandboxRotate(e) {
                const rect = _sandboxRect();
                if (!rect) return;
                const cfg = _sandboxConfig();
                const cx = rect.left + cfg.x * rect.width;
                const cy = rect.top + cfg.y * rect.height;
                _sandboxDrag = { mode: 'rotate', cx, cy, angle: _angle(cx, cy, e), rotation: cfg.rotation || 0 };
                sandboxDragging.value = true;
                e.currentTarget.setPointerCapture?.(e.pointerId);
            }
            function _applySandboxMove(clientX, clientY) {
                if (!_sandboxDrag) return;
                const cfg = _sandboxConfig();
                if (_sandboxDrag.mode === 'move') {
                    cfg.x = _clamp01(_sandboxDrag.x + (clientX - _sandboxDrag.sx) / _sandboxDrag.rect.width);
                    cfg.y = _clamp01(_sandboxDrag.y + (clientY - _sandboxDrag.sy) / _sandboxDrag.rect.height);
                } else if (_sandboxDrag.mode === 'scale') {
                    const delta = (clientX - _sandboxDrag.sx) / _sandboxDrag.rect.width;
                    if (effectCategory.value === 'stickers') cfg.scale = Math.max(0.08, Math.min(0.55, _sandboxDrag.size + delta));
                    else if (effectCategory.value === 'text') cfg.fontSize = Math.max(36, Math.min(220, _sandboxDrag.fontSize * (1 + delta * 2)));
                } else {
                    const angle = Math.atan2(clientY - _sandboxDrag.cy, clientX - _sandboxDrag.cx) * 180 / Math.PI;
                    cfg.rotation = _sandboxDrag.rotation + angle - _sandboxDrag.angle;
                }
            }
            function _flushSandboxMove() {
                _sandboxFrame = 0;
                if (!_sandboxPoint) return;
                _applySandboxMove(_sandboxPoint.clientX, _sandboxPoint.clientY);
                _sandboxPoint = null;
            }
            function moveSandbox(e) {
                if (!_sandboxDrag) return;
                _sandboxPoint = { clientX: e.clientX, clientY: e.clientY };
                if (!_sandboxFrame) _sandboxFrame = _raf(_flushSandboxMove);
            }
            function endSandbox() {
                if (!_sandboxDrag) return;
                if (_sandboxFrame) {
                    _caf(_sandboxFrame);
                    _sandboxFrame = 0;
                }
                if (_sandboxPoint) {
                    _applySandboxMove(_sandboxPoint.clientX, _sandboxPoint.clientY);
                    _sandboxPoint = null;
                }
                _sandboxDrag = null;
                sandboxDragging.value = false;
                previewSandbox();
            }

            function _initCollageCells() {
                const layout = LapisFXCollage.LAYOUTS[collageLayout.value] || { cols: 2, rows: 2 };
                const count  = layout.cols * layout.rows;
                const base   = resultUrl.value || imageUrl.value;
                collageCells.value = Array.from({ length: count }, (_, i) => (i === 0 ? base : null));
            }

            async function enterCrop() {
                if (!imageUrl.value) { alert(t.value.noImage); return; }
                _effectsBase       = null;
                activeEffect.value = '';
                cropShape.value    = 'free';
                cropMode.value     = 'manual';
                cropBoxData.value  = null;
                _initCollageCells();
                activeNav.value    = 'crop';
                await nextTick();
                _initCropper(NaN);
            }

            function setCropMode(mode) {
                if (cropMode.value === mode) return;
                cropMode.value = mode;
                if (mode === 'collage') {
                    if (_cropper) { _cropper.destroy(); _cropper = null; }
                    cropBoxData.value = null;
                    _initCollageCells();
                } else {
                    nextTick(() => _initCropper(NaN));
                }
            }

            function setCollageLayout(key) {
                if (!LapisFXCollage.LAYOUTS[key]) return;
                collageLayout.value = key;
                const layout = LapisFXCollage.LAYOUTS[key];
                const count  = layout.cols * layout.rows;
                const base   = resultUrl.value || imageUrl.value;
                const prev   = collageCells.value;
                collageCells.value = Array.from({ length: count }, (_, i) => {
                    if (i === 0) return base || null;
                    return prev[i] || null;
                });
            }

            function triggerCellInput(ci) {
                _collageActiveCell = ci;
                document.getElementById('collage-cell-input').click();
            }

            function onCellFileInput(e) {
                const file = e.target.files[0];
                e.target.value = '';
                if (!file || !file.type.startsWith('image/')) return;
                const url = URL.createObjectURL(file);
                const old = collageCells.value[_collageActiveCell];
                const base = resultUrl.value || imageUrl.value;
                if (old && old !== base && old !== imageUrl.value) URL.revokeObjectURL(old);
                const next = [...collageCells.value];
                next[_collageActiveCell] = url;
                collageCells.value = next;
            }

            async function buildCollage() {
                try {
                    const canvas = await LapisFXCollage.createFromLayout(
                        collageLayout.value, collageCells.value
                    );
                    if (!canvas) return;
                    _pushHistory();
                    _resultCanvas   = canvas;
                    resultUrl.value = canvas.toDataURL('image/png');
                } catch (_) {
                    alert(t.value.errLoad);
                }
            }

            // Apply in crop nav — manual mode commits crop; collage mode is no-op
            // (collage is committed immediately by buildCollage panel buttons)
            function cropApply() {
                if (cropMode.value === 'collage') return;
                confirmCrop(true);
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
                if (_cropper) _cropper.setAspectRatio(NaN);
            }

            function confirmCrop(stayInCrop = false) {
                if (!_cropper) return;
                _pushHistory();
                const data     = _cropper.getData(true);
                const specials = ['circle', 'ellipse', 'heart', 'star'];
                let output;
                if (specials.includes(cropShape.value)) {
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

            function _revokeCollageCells() {
                const base = resultUrl.value || imageUrl.value;
                collageCells.value.forEach(u => {
                    if (u && u !== base && u !== imageUrl.value) URL.revokeObjectURL(u);
                });
                collageCells.value = [];
            }

            function exitCrop() {
                _revokeCollageCells();
                if (_cropper) { _cropper.destroy(); _cropper = null; }
                cropBoxData.value = null;
                activeNav.value   = 'main';
            }

            function saveFromCrop() {
                if (cropMode.value === 'collage') {
                    _revokeCollageCells();
                    activeNav.value = 'main';
                    return;
                }
                if (_cropper) confirmCrop(false);
                else activeNav.value = 'main';
                _revokeCollageCells();
            }

            // ── Download (main nav only) ──────────────────────────────────────
            async function promptDownload() {
                if (!imageUrl.value) {
                    showStudioMessage(t.value.noImage, t.value.saveAs);
                    return;
                }
                downloadName.value = 'lapis-image';
                openStudioModal('studio-download-modal');
                nextTick(() => document.getElementById('studio-download-name')?.focus());
            }

            async function confirmDownloadImage() {
                if (!imageUrl.value) return;
                const name = (downloadName.value || 'lapis-image').trim() || 'lapis-image';
                closeStudioModal('studio-download-modal');

                let fileHandle = null;
                if (window.showSaveFilePicker && LapisStudioEngine.sanitizeDownloadName) {
                    try {
                        fileHandle = await window.showSaveFilePicker({
                            suggestedName: LapisStudioEngine.sanitizeDownloadName(name),
                            types: [{
                                description: 'PNG image',
                                accept: { 'image/png': ['.png'] }
                            }]
                        });
                    } catch (e) {
                        if (e && e.name === 'AbortError') return;
                    }
                }

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
                    await LapisStudioEngine.triggerRealDownload(canvas, name, fileHandle);
                } catch (e) {
                    showStudioMessage(t.value.errExport, t.value.saveAs);
                }
            }

            // ── Icon refresh ──────────────────────────────────────────────────
            function refreshIcons() {
                nextTick(() => { if (window.lucide) lucide.createIcons(); });
            }

            // ── Lifecycle ─────────────────────────────────────────────────────
            onMounted(() => {
                if (typeof LapisNav !== 'undefined') LapisNav.inject({ bottom: false });
                if (typeof LapisModal !== 'undefined') LapisModal.init();
                if (window.lucide) lucide.createIcons();
            });
            onUpdated(() => {
                if (window.lucide) lucide.createIcons();
            });
            onUnmounted(() => {
                if (_cropper)       _cropper.destroy();
                if (_sandboxFrame)   _caf(_sandboxFrame);
                if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
                _revokeCollageCells();
            });

            return {
                navSettings, isDarkTheme, glassStyle, themeClasses,
                customBgStyle, systemDark, resolvedTheme,
                imageUrl, resultUrl, activeNav, contentView,
                dragOver, cropShape, cropMode,
                collageLayout, collageCells,
                fxIntensity, jigsawGrid, jigsawRange, jigsawManual, jigsawLayout, cropBoxData, containerSize,
                isSpecialShape, shapeOverlaySvg, sandboxActive, sandboxBoxStyle, sandboxDragging, jigsawManualActive,
                canUndoCt, showFloatingPanel, mainPaddingBottom,
                activeEffect, effectCategory,
                effectsList, jigsawVariants, stickerList, collageLayouts,
                textConfig, stickerCategory, stickerCategoryList, stickerConfig, stickerActive,
                downloadName, modalMessageTitle, modalMessage,
                t, cropRatios, specialShapes,
                handleFileInput, triggerUpload, onDrop,
                enterEffects, exitEffects, applyEffectFilter,
                applyCurrentEffect, saveFromEffects, onSliderInput, onJigsawGridChange, onJigsawRangeChange,
                toggleJigsawManual: jigsawManualTools.toggleJigsawManual,
                applyText, applySticker,
                beginSandboxMove, beginSandboxScale, beginSandboxRotate, moveSandbox, endSandbox,
                jigsawPieceStyle: jigsawManualTools.pieceStyle,
                jigsawDragging: jigsawManualTools.dragging,
                beginJigsawPieceDrag: jigsawManualTools.beginDrag,
                moveJigsawPiece: jigsawManualTools.moveDrag,
                endJigsawPieceDrag: jigsawManualTools.endDrag,
                enterCrop, exitCrop, confirmCrop, saveFromCrop,
                setCropMode, setCollageLayout,
                triggerCellInput, onCellFileInput,
                buildCollage, cropApply,
                setRatio, setSpecialShape, undo,
                promptDownload, confirmDownloadImage, promptDeleteImage, confirmDeleteImage,
                closeStudioModal,
                refreshIcons,
            };
        },
    }).mount('#app');
})();
