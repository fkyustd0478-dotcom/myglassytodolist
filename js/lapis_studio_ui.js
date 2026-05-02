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
            const collageFlow     = ref('free');     // 'free' | 'fixed'
            const collageLayout   = ref('vertical'); // active duo mask key
            const collageSlots    = ref([]);         // { sourceImage, maskPath, viewport, bounds, fixed }
            const collageItems    = ref([]);         // PicCollage-like freeform objects
            const collageMask     = ref('square');
            const collageBg       = ref('#141414');
            const collageGap      = ref(0);
            const activeCollageSlot = ref(0);
            const collageDragging = ref(false);
            const collageApplied  = ref(false);
            const fxIntensity     = ref(1.0);        // 0‥1 slider for effects
            const jigsawGrid      = ref(4);
            const jigsawRoi       = ref({ x: 0.2, y: 0.2, w: 0.6, h: 0.6 });
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
            const jigsawRoiDragging = ref(false);
            let _sandboxDrag       = null;
            let _sandboxFrame      = 0;
            let _sandboxPoint      = null;
            let _jigsawRoiDrag     = null;
            let _jigsawRoiFrame    = 0;
            let _jigsawRoiPoint    = null;

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
            let _collageDrag       = null;
            let _collageFrame      = 0;
            let _collagePoint      = null;
            let _collagePointers   = new Map();

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
            const showFloatingPanel = computed(() => false);
            const activeCollageItem = computed(() =>
                collageFlow.value === 'free' ? (collageItems.value[activeCollageSlot.value] || null) : null
            );
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
                jigsawRoi,
                jigsawLayout,
                fxIntensity,
                applyEffectFilter,
            });
            const jigsawManualActive = jigsawManualTools.jigsawManualActive;
            const jigsawRoiActive = computed(() =>
                activeNav.value === 'effects' &&
                effectCategory.value === 'jigsaw' &&
                !!imageUrl.value
            );
            const jigsawRoiStyle = computed(() => ({
                left: `${jigsawRoi.value.x * 100}%`,
                top: `${jigsawRoi.value.y * 100}%`,
                width: `${jigsawRoi.value.w * 100}%`,
                height: `${jigsawRoi.value.h * 100}%`,
            }));
            const jigsawRoiLayerStyle = computed(() => {
                imageUrl.value;
                resultUrl.value;
                activeNav.value;
                const rect = _jigsawImageCssRect();
                return rect
                    ? { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` }
                    : {};
            });

            const mainPaddingBottom = computed(() => {
                if (activeNav.value === 'effects')
                    return 'calc(246px + env(safe-area-inset-bottom, 0px))';
                if (activeNav.value === 'crop')
                    return 'calc(190px + env(safe-area-inset-bottom, 0px))';
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
                    intensity: '強度',
                    enterText: '輸入文字…', buildGrid: '建立',
                    freeCollage: '自由排版', fixedCollage: '固定排版',
                    addPhoto: '新增圖片', background: '背景',
                    square: '方形', triangle: '三角形',
                    bringForward: '上移圖層', sendBackward: '下移圖層',
                    layout2v: '雙直欄', layout2h: '雙橫列', layoutCurve: '曲線分割',
                    layout3grid: '三格排版', layout3stack: '三列排版', layout4grid: '四格排版',
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
                    intensity: 'Intensity',
                    enterText: 'Enter text…', buildGrid: 'Build',
                    freeCollage: 'Free', fixedCollage: 'Fixed',
                    addPhoto: 'Add Photo', background: 'Background',
                    square: 'Square', triangle: 'Triangle',
                    bringForward: 'Forward', sendBackward: 'Backward',
                    layout2v: '2V', layout2h: '2H', layoutCurve: 'Curve',
                    layout3grid: '3 Grid', layout3stack: '3 Stack', layout4grid: '4 Grid',
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
                { key: '4:3',  label: t.value['4:3'],  ratio: 4/3  },
                { key: '16:9', label: '16:9',          ratio: 16/9 },
            ]);

            const specialShapes = [
                { key: 'circle',  svg: '<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><circle cx="10" cy="10" r="9"/></svg>' },
                { key: 'ellipse', svg: '<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><ellipse cx="10" cy="10" rx="9" ry="5.5"/></svg>' },
                { key: 'heart',   svg: '<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><path d="M10 17C10 17 3 12 3 7.5a4.5 4.5 0 0 1 7-3.73A4.5 4.5 0 0 1 17 7.5C17 12 10 17 10 17z"/></svg>' },
                { key: 'star',    svg: '<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor"><polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7"/></svg>' },
            ];
            const cropSetupOptions = computed(() => [
                { key: 'free', label: t.value.free, ratio: NaN },
                { key: '4:3', label: '4:3', ratio: 4/3 },
                { key: '16:9', label: '16:9', ratio: 16/9 },
                ...specialShapes
                    .filter(shape => ['circle', 'heart', 'star'].includes(shape.key))
                    .map(shape => ({ ...shape, label: t.value[shape.key], ratio: NaN })),
            ]);
            const fixedCollageLayouts = computed(() =>
                Object.entries(LapisFXCollage.FIXED_LAYOUTS || LapisFXCollage.DUO_LAYOUTS || {})
                    .map(([key, layout]) => ({ key, ...layout, label: t.value[layout.tKey] || layout.label }))
            );
            const activeFixedSlot = computed(() => collageSlots.value[activeCollageSlot.value] || null);

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
            const collageLayouts = LapisFXCollage.DUO_LAYOUTS || LapisFXCollage.LAYOUTS;  // static, for template iteration

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
                jigsawRoi.value        = { x: 0.2, y: 0.2, w: 0.6, h: 0.6 };
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
                collageApplied.value   = false;
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
                    };
                    if (effectKey.startsWith('jigsaw-')) {
                        config.roi = _jigsawRoiPixels(sc.width, sc.height);
                    }
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

            function onJigsawRoiChange() {
                jigsawManualTools.resetLayout();
                if (activeEffect.value && activeEffect.value.startsWith('jigsaw-')) {
                    applyEffectFilter(activeEffect.value);
                }
            }

            function _jigsawRoiPixels(width, height) {
                const layerRect = _jigsawRoiRect();
                const boxRect = document.querySelector('.jigsaw-roi-box')?.getBoundingClientRect();
                if (layerRect && boxRect) return _domRectToCanvasRoi(boxRect, layerRect, width, height);
                const r = jigsawRoi.value;
                return _normalizedRoiToPixels(r, width, height);
            }

            function _jigsawRoiRect() {
                return document.getElementById('jigsaw-roi-layer')?.getBoundingClientRect();
            }

            function _jigsawImageCssRect() {
                const img = document.getElementById('studio-preview-image');
                if (!img || !img.naturalWidth || !img.naturalHeight) return null;
                const parent = img.parentElement?.getBoundingClientRect();
                if (!parent) return null;
                const availableW = Math.max(1, parent.width - 32);
                const availableH = Math.max(1, parent.height - 32);
                const scale = Math.min(availableW / img.naturalWidth, availableH / img.naturalHeight);
                const w = img.naturalWidth * scale;
                const h = img.naturalHeight * scale;
                return {
                    x: (parent.width - w) / 2,
                    y: (parent.height - h) / 2,
                    w,
                    h,
                };
            }

            function _normalizedRoiToPixels(r, width, height) {
                return { x: r.x * width, y: r.y * height, w: r.w * width, h: r.h * height };
            }

            function _domRectToCanvasRoi(boxRect, imageRect, canvasWidth, canvasHeight) {
                const dpr = window.devicePixelRatio || 1;
                const cssToCanvasX = canvasWidth / (imageRect.width || (canvasWidth / dpr));
                const cssToCanvasY = canvasHeight / (imageRect.height || (canvasHeight / dpr));
                const x = Math.max(0, (boxRect.left - imageRect.left) * cssToCanvasX);
                const y = Math.max(0, (boxRect.top - imageRect.top) * cssToCanvasY);
                const maxW = canvasWidth - x;
                const maxH = canvasHeight - y;
                return {
                    x,
                    y,
                    w: Math.max(1, Math.min(maxW, boxRect.width * cssToCanvasX)),
                    h: Math.max(1, Math.min(maxH, boxRect.height * cssToCanvasY)),
                };
            }

            function _clampJigsawRoi(r) {
                const min = 0.16;
                const w = Math.max(min, Math.min(1, r.w));
                const h = Math.max(min, Math.min(1, r.h));
                return {
                    x: Math.max(0, Math.min(1 - w, r.x)),
                    y: Math.max(0, Math.min(1 - h, r.y)),
                    w,
                    h,
                };
            }

            function beginJigsawRoiMove(e) {
                const rect = _jigsawRoiRect();
                if (!rect) return;
                _jigsawRoiDrag = { mode: 'move', rect, sx: e.clientX, sy: e.clientY, start: { ...jigsawRoi.value } };
                jigsawRoiDragging.value = true;
                e.currentTarget.setPointerCapture?.(e.pointerId);
            }

            function beginJigsawRoiResize(handle, e) {
                const rect = _jigsawRoiRect();
                if (!rect) return;
                _jigsawRoiDrag = { mode: 'resize', handle, rect, sx: e.clientX, sy: e.clientY, start: { ...jigsawRoi.value } };
                jigsawRoiDragging.value = true;
                e.currentTarget.setPointerCapture?.(e.pointerId);
            }

            function _applyJigsawRoiDrag(clientX, clientY) {
                if (!_jigsawRoiDrag) return;
                const { mode, handle, rect, sx, sy, start } = _jigsawRoiDrag;
                const dx = (clientX - sx) / rect.width;
                const dy = (clientY - sy) / rect.height;
                let next = { ...start };
                if (mode === 'move') {
                    next.x = start.x + dx;
                    next.y = start.y + dy;
                } else {
                    if (handle.includes('e')) next.w = start.w + dx;
                    if (handle.includes('s')) next.h = start.h + dy;
                    if (handle.includes('w')) { next.x = start.x + dx; next.w = start.w - dx; }
                    if (handle.includes('n')) { next.y = start.y + dy; next.h = start.h - dy; }
                }
                jigsawRoi.value = _clampJigsawRoi(next);
            }

            function _flushJigsawRoiDrag() {
                _jigsawRoiFrame = 0;
                if (!_jigsawRoiPoint) return;
                _applyJigsawRoiDrag(_jigsawRoiPoint.clientX, _jigsawRoiPoint.clientY);
                _jigsawRoiPoint = null;
            }

            function moveJigsawRoi(e) {
                if (!_jigsawRoiDrag) return;
                _jigsawRoiPoint = { clientX: e.clientX, clientY: e.clientY };
                if (!_jigsawRoiFrame) _jigsawRoiFrame = _raf(_flushJigsawRoiDrag);
            }

            function endJigsawRoi() {
                if (!_jigsawRoiDrag) return;
                if (_jigsawRoiFrame) {
                    _caf(_jigsawRoiFrame);
                    _jigsawRoiFrame = 0;
                }
                if (_jigsawRoiPoint) {
                    _applyJigsawRoiDrag(_jigsawRoiPoint.clientX, _jigsawRoiPoint.clientY);
                    _jigsawRoiPoint = null;
                }
                _jigsawRoiDrag = null;
                jigsawRoiDragging.value = false;
                onJigsawRoiChange();
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
                const count = LapisFXCollage.layoutCount ? LapisFXCollage.layoutCount(collageLayout.value) : 2;
                collageSlots.value = LapisFXCollage.CollageManager
                    ? LapisFXCollage.CollageManager.createSlots(collageLayout.value, count)
                    : Array.from({ length: count }, (_, index) => _collageSlot('', index));
                collageItems.value = [];
                activeCollageSlot.value = 0;
                fxIntensity.value = 0.25;
            }

            function _collageSlot(sourceImage = '', index = 0) {
                return {
                    sourceImage,
                    maskPath: `${collageLayout.value}:${index}`,
                    viewport: { x: 0, y: 0, scale: 1, rotation: 0 },
                    bounds: { x: 0, y: 0, w: 0, h: 0 },
                    imageAspect: 1,
                    fixed: false,
                };
            }

            function _imageMeta(url) {
                return new Promise(resolve => {
                    const img = new Image();
                    img.onload = () => resolve({
                        sourceImage: url,
                        imageAspect: Math.max(0.01, img.naturalWidth / Math.max(1, img.naturalHeight)),
                    });
                    img.onerror = () => resolve({ sourceImage: url, imageAspect: 1 });
                    img.src = url;
                });
            }

            function promptCropSetup() {
                if (!(imageUrl.value || resultUrl.value)) { alert(t.value.noImage); return; }
                enterCrop({ key: 'free', ratio: NaN });
            }

            function chooseCropSetup(option) {
                cropShape.value = option.key || 'free';
                if (_cropper) _cropper.setAspectRatio(Number.isFinite(option.ratio) ? option.ratio : NaN);
            }

            async function enterCrop(option = { key: 'free', ratio: NaN }) {
                if (!(imageUrl.value || resultUrl.value)) { alert(t.value.noImage); return; }
                _effectsBase       = null;
                activeEffect.value = '';
                cropShape.value    = option.key || 'free';
                cropMode.value     = 'manual';
                cropBoxData.value  = null;
                activeNav.value    = 'crop';
                await nextTick();
                _initCropper(Number.isFinite(option.ratio) ? option.ratio : NaN);
            }

            function enterCollage() {
                _effectsBase       = null;
                activeEffect.value = '';
                cropMode.value     = 'collage';
                collageFlow.value  = 'free';
                cropBoxData.value  = null;
                if (_cropper) { _cropper.destroy(); _cropper = null; }
                _initCollageCells();
                collageApplied.value = false;
                activeNav.value    = 'crop';
            }

            function setCropMode(mode) {
                if (cropMode.value === mode) return;
                cropMode.value = mode;
                if (mode === 'collage') {
                    if (_cropper) { _cropper.destroy(); _cropper = null; }
                    cropBoxData.value = null;
                    _initCollageCells();
                } else {
                    if (!imageUrl.value) return;
                    nextTick(() => _initCropper(NaN));
                }
            }

            function setCollageLayout(key) {
                if (!collageLayouts[key]) return;
                collageLayout.value = key;
                const count = LapisFXCollage.layoutCount ? LapisFXCollage.layoutCount(key) : 2;
                collageSlots.value = LapisFXCollage.CollageManager
                    ? LapisFXCollage.CollageManager.applyLayout(collageSlots.value, key)
                    : Array.from({ length: count }, (_, index) => ({
                        ...(collageSlots.value[index] || _collageSlot('', index)),
                        maskPath: `${key}:${index}`,
                        bounds: { x: 0, y: 0, w: 0, h: 0 },
                    }));
                activeCollageSlot.value = Math.min(activeCollageSlot.value, collageSlots.value.length - 1);
                collageApplied.value = false;
            }

            function setCollageFlow(flow) {
                collageFlow.value = flow;
                if (flow === 'fixed' && !collageSlots.value.length) _initCollageCells();
                activeCollageSlot.value = 0;
                collageApplied.value = false;
            }

            function triggerCellInput(ci) {
                _collageActiveCell = ci;
                document.getElementById('collage-cell-input').click();
            }

            async function onCellFileInput(e) {
                const files = Array.from(e.target.files || []);
                e.target.value = '';
                if (collageFlow.value === 'fixed') {
                    const next = [...collageSlots.value];
                    const metas = await Promise.all(files
                        .filter(file => file.type.startsWith('image/'))
                        .map(file => _imageMeta(URL.createObjectURL(file))));
                    metas.forEach((meta, offset) => {
                        const index = _collageActiveCell + offset;
                        if (!next[index]) return;
                        if (next[index].sourceImage) URL.revokeObjectURL(next[index].sourceImage);
                        next[index] = {
                            ...next[index],
                            ...meta,
                            viewport: { x: 0, y: 0, scale: 1, rotation: 0 },
                        };
                    });
                    collageSlots.value = next;
                    activeCollageSlot.value = Math.min(_collageActiveCell, next.length - 1);
                    collageApplied.value = false;
                    return;
                }
                files.filter(file => file.type.startsWith('image/')).forEach(file => _addCollageItem(URL.createObjectURL(file)));
            }

            function _addCollageItem(url) {
                const index = collageItems.value.length;
                collageItems.value = [
                    ...collageItems.value,
                    {
                        sourceImage: url,
                        x: 0.5 + Math.min(0.12, index * 0.04),
                        y: 0.5 + Math.min(0.12, index * 0.04),
                        scale: 0.34,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0,
                        mask: collageMask.value,
                        zIndex: index,
                        shadow: true,
                    },
                ];
                activeCollageSlot.value = collageItems.value.length - 1;
                fxIntensity.value = Math.max(0, Math.min(1, (0.34 - 0.12) / 0.88));
                collageApplied.value = false;
            }

            function collageItemStyle(item) {
                const base = Math.max(12, Math.min(120, (item.scale || 0.34) * 100));
                const w = `${base * Math.max(0.35, Math.min(2, item.scaleX || 1))}%`;
                const h = `${base * Math.max(0.35, Math.min(2, item.scaleY || 1))}%`;
                const mask = item.mask || 'square';
                return {
                    left: `${(item.x ?? 0.5) * 100}%`,
                    top: `${(item.y ?? 0.5) * 100}%`,
                    width: w,
                    height: h,
                    transform: `translate(-50%, -50%) rotate(${item.rotation || 0}deg)`,
                    zIndex: item.zIndex || 0,
                    borderRadius: mask === 'circle' ? '9999px' : '8px',
                    clipPath: mask === 'heart'
                        ? 'polygon(50% 92%, 36% 80%, 20% 64%, 8% 45%, 8% 28%, 16% 10%, 32% 6%, 50% 24%, 68% 6%, 84% 10%, 92% 28%, 92% 45%, 80% 64%, 64% 80%)'
                        : mask === 'triangle'
                            ? 'polygon(50% 0, 100% 100%, 0 100%)'
                            : mask === 'star'
                                ? 'polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 92%, 50% 70%, 21% 92%, 32% 57%, 2% 35%, 39% 35%)'
                        : 'none',
                    boxShadow: item.shadow ? '0 16px 32px rgba(0,0,0,0.22)' : 'none',
                };
            }

            function selectCollageItem(index) {
                activeCollageSlot.value = index;
                const scale = collageItems.value[index]?.scale || 0.34;
                fxIntensity.value = Math.max(0, Math.min(1, (scale - 0.12) / 0.88));
                collageMask.value = collageItems.value[index]?.mask || 'square';
            }

            function setCollageItemMask(mask) {
                collageMask.value = mask;
                const item = collageItems.value[activeCollageSlot.value];
                if (!item) return;
                const next = [...collageItems.value];
                next[activeCollageSlot.value] = { ...item, mask };
                collageItems.value = next;
                collageApplied.value = false;
            }

            function markCollageDirty() {
                collageApplied.value = false;
            }

            function nudgeCollageLayer(delta) {
                const item = collageItems.value[activeCollageSlot.value];
                if (!item) return;
                const next = [...collageItems.value];
                const levels = collageItems.value.map(i => i.zIndex || 0);
                const zIndex = delta > 0
                    ? Math.max(...levels, 0) + 10
                    : Math.min(...levels, 0) - 10;
                next[activeCollageSlot.value] = { ...item, zIndex };
                collageItems.value = next;
                collageApplied.value = false;
            }

            function syncCollageRotation(value) {
                const item = collageItems.value[activeCollageSlot.value];
                if (!item) return;
                const next = [...collageItems.value];
                next[activeCollageSlot.value] = { ...item, rotation: Number(value) || 0 };
                collageItems.value = next;
                collageApplied.value = false;
            }

            function deleteCollageItem() {
                const item = collageItems.value[activeCollageSlot.value];
                if (!item) return;
                URL.revokeObjectURL(item.sourceImage);
                collageItems.value = collageItems.value.filter((_, i) => i !== activeCollageSlot.value);
                activeCollageSlot.value = Math.max(0, Math.min(activeCollageSlot.value, collageItems.value.length - 1));
                collageApplied.value = false;
            }

            function beginCollageItemDrag(index, mode, event) {
                const item = collageItems.value[index];
                if (!item) return;
                const frame = event.currentTarget.closest('.pic-collage-canvas')?.getBoundingClientRect();
                if (!frame) return;
                selectCollageItem(index);
                _collagePointers.set(event.pointerId, { index, x: event.clientX, y: event.clientY });
                const paired = [..._collagePointers.values()].filter(p => p.index === index);
                if (paired.length >= 2) {
                    const a = paired[0], b = paired[1];
                    _collageDrag = {
                        mode: 'item-pinch',
                        index,
                        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
                        scale: item.scale || 0.34,
                    };
                } else {
                    _collageDrag = {
                        mode,
                        index,
                        frame,
                        sx: event.clientX,
                        sy: event.clientY,
                        x: item.x,
                        y: item.y,
                        scale: item.scale || 0.34,
                        scaleX: item.scaleX || 1,
                        scaleY: item.scaleY || 1,
                        rotation: item.rotation || 0,
                    };
                }
                collageDragging.value = true;
                event.currentTarget.setPointerCapture?.(event.pointerId);
            }

            function _applyCollageItemDrag(clientX, clientY) {
                if (!_collageDrag) return false;
                const { mode, index, frame, sx, sy, x, y, scale, scaleX, scaleY, rotation } = _collageDrag;
                const item = collageItems.value[index];
                if (!item || !mode?.startsWith('item-')) return false;
                const next = [...collageItems.value];
                if (mode === 'item-pinch') {
                    const paired = [..._collagePointers.values()].filter(p => p.index === index);
                    if (paired.length < 2) return true;
                    const distance = Math.max(1, Math.hypot(paired[0].x - paired[1].x, paired[0].y - paired[1].y));
                    const nextScale = Math.max(0.12, Math.min(1.2, _collageDrag.scale * distance / _collageDrag.distance));
                    next[index] = { ...item, scale: nextScale };
                    fxIntensity.value = Math.max(0, Math.min(1, (nextScale - 0.12) / 0.88));
                } else if (mode === 'item-scale') {
                    const nextScaleX = Math.max(0.35, Math.min(2, scaleX + ((clientX - sx) / Math.max(1, frame.width)) * 2));
                    const nextScaleY = Math.max(0.35, Math.min(2, scaleY + ((clientY - sy) / Math.max(1, frame.height)) * 2));
                    next[index] = { ...item, scaleX: nextScaleX, scaleY: nextScaleY };
                } else if (mode === 'item-rotate') {
                    next[index] = { ...item, rotation: rotation + (clientX - sx) * 0.6 };
                } else {
                    next[index] = {
                        ...item,
                        x: Math.max(0, Math.min(1, x + (clientX - sx) / frame.width)),
                        y: Math.max(0, Math.min(1, y + (clientY - sy) / frame.height)),
                    };
                }
                collageItems.value = next;
                collageApplied.value = false;
                return true;
            }

            function collageSlotStyle(slot) {
                const viewport = slot.viewport || { x: 0, y: 0, scale: 1 };
                return {
                    transform: `translate(${viewport.x * 100}%, ${viewport.y * 100}%) scale(${viewport.scale || 1})`,
                };
            }

            function collageSlotImageStyle(slot, index) {
                const viewport = slot.viewport || { x: 0, y: 0, scale: 1, rotation: 0 };
                const bounds = _collageGeometry(index, slot);
                const slotAspect = Math.max(0.01, bounds.w / Math.max(0.01, bounds.h));
                const imageAspect = Math.max(0.01, slot.imageAspect || 1);
                const width = imageAspect >= slotAspect ? `${(imageAspect / slotAspect) * 100}%` : '100%';
                const height = imageAspect >= slotAspect ? '100%' : `${(slotAspect / imageAspect) * 100}%`;
                return {
                    width,
                    height,
                    transform: `translate(-50%, -50%) translate(${(viewport.x || 0) * 100}%, ${(viewport.y || 0) * 100}%) scale(${viewport.scale || 1}) rotate(${viewport.rotation || 0}deg)`,
                };
            }

            function collageSlotFrameStyle(slot, index) {
                const css = LapisFXCollage.slotCss
                    ? LapisFXCollage.slotCss(collageLayout.value, index, collageGap.value, slot)
                    : {};
                return { ...css, zIndex: index + 1 };
            }

            function selectCollageSlot(index) {
                activeCollageSlot.value = index;
                const scale = collageSlots.value[index]?.viewport?.scale || 1;
                fxIntensity.value = Math.max(0, Math.min(1, (scale - 0.5) / 2));
            }

            function syncCollageScale() {
                const item = collageItems.value[activeCollageSlot.value];
                if (item) {
                    const next = [...collageItems.value];
                    next[activeCollageSlot.value] = { ...item, scale: 0.12 + fxIntensity.value * 0.88 };
                    collageItems.value = next;
                    return;
                }
                const slot = collageSlots.value[activeCollageSlot.value];
                if (!slot || slot.fixed) return;
                const next = [...collageSlots.value];
                next[activeCollageSlot.value] = {
                    ...slot,
                    viewport: { ...(slot.viewport || {}), scale: 0.5 + fxIntensity.value * 2 },
                };
                collageSlots.value = next;
            }

            function _collageGeometry(index, slot) {
                return LapisFXCollage.getSlotGeometry
                    ? LapisFXCollage.getSlotGeometry(collageLayout.value, index, collageGap.value, slot).bounds
                    : (slot.bounds || { x: index * 0.5, y: 0, w: 0.5, h: 1 });
            }

            function _setCollageBounds(index, bounds) {
                const slot = collageSlots.value[index];
                if (!slot || slot.fixed) return;
                const x = Math.max(0, Math.min(0.92, bounds.x));
                const y = Math.max(0, Math.min(0.92, bounds.y));
                const next = [...collageSlots.value];
                next[index] = {
                    ...slot,
                    bounds: {
                        x,
                        y,
                        w: Math.max(0.08, Math.min(1 - x, bounds.w)),
                        h: Math.max(0.08, Math.min(1 - y, bounds.h)),
                    },
                };
                collageSlots.value = next;
            }

            function toggleCollageFixed(index) {
                const slot = collageSlots.value[index];
                if (!slot) return;
                const next = [...collageSlots.value];
                next[index] = { ...slot, fixed: !slot.fixed };
                collageSlots.value = next;
            }

            function beginCollageSlotDrag(index, event) {
                const slot = collageSlots.value[index];
                if (!slot || slot.fixed) return;
                const rect = event.currentTarget.getBoundingClientRect();
                selectCollageSlot(index);
                _collagePointers.set(event.pointerId, { index, x: event.clientX, y: event.clientY });
                const paired = [..._collagePointers.values()].filter(p => p.index === index);
                if (paired.length >= 2) {
                    const a = paired[0], b = paired[1];
                    const viewport = slot.viewport || { x: 0, y: 0, scale: 1 };
                    _collageDrag = {
                        mode: 'pinch',
                        index,
                        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
                        scale: viewport.scale || 1,
                    };
                    collageDragging.value = true;
                    return;
                }
                const viewport = slot.viewport || { x: 0, y: 0, scale: 1 };
                _collageDrag = { mode: 'pan', index, rect, sx: event.clientX, sy: event.clientY, x: viewport.x || 0, y: viewport.y || 0 };
                collageDragging.value = true;
                event.currentTarget.setPointerCapture?.(event.pointerId);
            }

            function beginCollageSlotMove(index, event) {
                const slot = collageSlots.value[index];
                if (!slot || slot.fixed) return;
                selectCollageSlot(index);
                const b = _collageGeometry(index, slot);
                const frame = event.currentTarget.closest('.duo-collage-preview')?.getBoundingClientRect();
                _collageDrag = { mode: 'move-slot', index, sx: event.clientX, sy: event.clientY, bounds: b, frame };
                collageDragging.value = true;
                event.currentTarget.setPointerCapture?.(event.pointerId);
            }

            function beginCollageSlotResize(index, event) {
                const slot = collageSlots.value[index];
                if (!slot || slot.fixed) return;
                selectCollageSlot(index);
                const b = _collageGeometry(index, slot);
                const frame = event.currentTarget.closest('.duo-collage-preview')?.getBoundingClientRect();
                _collageDrag = { mode: 'resize-slot', index, sx: event.clientX, sy: event.clientY, bounds: b, frame };
                collageDragging.value = true;
                event.currentTarget.setPointerCapture?.(event.pointerId);
            }

            function _applyCollageDrag(clientX, clientY) {
                if (!_collageDrag) return;
                const { mode, index, rect, sx, sy, x, y, bounds, frame } = _collageDrag;
                const slot = collageSlots.value[index];
                if (!slot || slot.fixed) return;
                if (mode === 'pinch') {
                    const paired = [..._collagePointers.values()].filter(p => p.index === index);
                    if (paired.length < 2) return;
                    const distance = Math.max(1, Math.hypot(paired[0].x - paired[1].x, paired[0].y - paired[1].y));
                    const scale = Math.max(0.5, Math.min(2.5, _collageDrag.scale * distance / _collageDrag.distance));
                    const next = [...collageSlots.value];
                    next[index] = { ...slot, viewport: { ...(slot.viewport || {}), scale } };
                    collageSlots.value = next;
                    fxIntensity.value = Math.max(0, Math.min(1, (scale - 0.5) / 2));
                    collageApplied.value = false;
                    return;
                }
                if (mode === 'move-slot') {
                    _setCollageBounds(index, {
                        ...bounds,
                        x: bounds.x + (clientX - sx) / Math.max(1, frame?.width || 360),
                        y: bounds.y + (clientY - sy) / Math.max(1, frame?.height || 360),
                    });
                    return;
                }
                if (mode === 'resize-slot') {
                    _setCollageBounds(index, {
                        ...bounds,
                        w: bounds.w + (clientX - sx) / Math.max(1, frame?.width || 360),
                        h: bounds.h + (clientY - sy) / Math.max(1, frame?.height || 360),
                    });
                    return;
                }
                const viewport = slot.viewport || { x: 0, y: 0, scale: 1 };
                const next = [...collageSlots.value];
                next[index] = {
                    ...slot,
                    viewport: {
                        ...viewport,
                        x: Math.max(-0.6, Math.min(0.6, x + (clientX - sx) / rect.width)),
                        y: Math.max(-0.6, Math.min(0.6, y + (clientY - sy) / rect.height)),
                    },
                };
                collageSlots.value = next;
                collageApplied.value = false;
            }

            function syncFixedCollageRotation(value) {
                const slot = collageSlots.value[activeCollageSlot.value];
                if (!slot) return;
                const next = [...collageSlots.value];
                next[activeCollageSlot.value] = {
                    ...slot,
                    viewport: { ...(slot.viewport || {}), rotation: Number(value) || 0 },
                };
                collageSlots.value = next;
                collageApplied.value = false;
            }

            function _flushCollageDrag() {
                _collageFrame = 0;
                if (!_collagePoint) return;
                _applyCollageDrag(_collagePoint.clientX, _collagePoint.clientY);
                _collagePoint = null;
            }

            function moveCollageSlot(event) {
                if (!_collageDrag) return;
                if (_collagePointers.has(event.pointerId)) {
                    _collagePointers.set(event.pointerId, {
                        ..._collagePointers.get(event.pointerId),
                        x: event.clientX,
                        y: event.clientY,
                    });
                }
                if (_applyCollageItemDrag(event.clientX, event.clientY)) return;
                _collagePoint = { clientX: event.clientX, clientY: event.clientY };
                if (!_collageFrame) _collageFrame = _raf(_flushCollageDrag);
            }

            function endCollageSlot(event) {
                if (event?.pointerId !== undefined) _collagePointers.delete(event.pointerId);
                if (!_collageDrag) return;
                if (_collageFrame) {
                    _caf(_collageFrame);
                    _collageFrame = 0;
                }
                if (_collagePoint) {
                    _applyCollageDrag(_collagePoint.clientX, _collagePoint.clientY);
                    _collagePoint = null;
                }
                _collageDrag = null;
                collageDragging.value = false;
            }

            async function buildCollage(exitAfterBuild = true) {
                try {
                    const canvas = collageFlow.value === 'fixed'
                        ? await LapisFXCollage.createDuo(collageSlots.value, collageLayout.value, { gap: 0, background: collageBg.value })
                        : await LapisFXCollage.createFreeform(collageItems.value, { background: collageBg.value, size: 1080 });
                    if (!canvas) return;
                    _pushHistory();
                    _resultCanvas   = canvas;
                    resultUrl.value = canvas.toDataURL('image/png');
                    collageApplied.value = true;
                    if (exitAfterBuild) {
                        _revokeCollageCells();
                        cropMode.value = 'manual';
                        activeNav.value = 'main';
                    }
                    return true;
                } catch (_) {
                    alert(t.value.errLoad);
                    return false;
                }
            }

            // Apply in crop nav commits manual crop or current collage.
            async function cropApply() {
                if (cropMode.value === 'collage') {
                    await buildCollage(false);
                    return;
                }
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
                collageSlots.value.forEach(slot => {
                    const u = slot.sourceImage;
                    if (u && u !== base && u !== imageUrl.value) URL.revokeObjectURL(u);
                });
                collageItems.value.forEach(item => {
                    const u = item.sourceImage;
                    if (u && u !== base && u !== imageUrl.value) URL.revokeObjectURL(u);
                });
                collageSlots.value = [];
                collageItems.value = [];
            }

            function exitCrop() {
                _revokeCollageCells();
                if (_cropper) { _cropper.destroy(); _cropper = null; }
                cropBoxData.value = null;
                activeNav.value   = 'main';
            }

            async function saveFromCrop() {
                if (cropMode.value === 'collage') {
                    const hasContent = collageFlow.value === 'fixed'
                        ? collageSlots.value.some(slot => slot.sourceImage)
                        : collageItems.value.length;
                    if (hasContent && !collageApplied.value) {
                        showStudioMessage('Apply before Save.', t.value.save);
                        return;
                    }
                    _revokeCollageCells();
                    cropMode.value = 'manual';
                    activeNav.value = 'main';
                    return;
                }
                if (_cropper) confirmCrop(false);
                else activeNav.value = 'main';
                _revokeCollageCells();
            }

            // ── Download (main nav only) ──────────────────────────────────────
            async function promptDownload() {
                if (!(imageUrl.value || resultUrl.value)) {
                    showStudioMessage(t.value.noImage, t.value.saveAs);
                    return;
                }
                downloadName.value = 'lapis-image';
                openStudioModal('studio-download-modal');
                nextTick(() => document.getElementById('studio-download-name')?.focus());
            }

            async function confirmDownloadImage() {
                if (!(imageUrl.value || resultUrl.value)) return;
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
                if (_jigsawRoiFrame) _caf(_jigsawRoiFrame);
                if (_collageFrame)   _caf(_collageFrame);
                if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
                _revokeCollageCells();
            });

            return {
                navSettings, isDarkTheme, glassStyle, themeClasses,
                customBgStyle, systemDark, resolvedTheme,
                imageUrl, resultUrl, activeNav, contentView,
                dragOver, cropShape, cropMode,
                collageFlow, collageLayout, collageSlots, collageItems, collageMask, collageBg,
                collageGap, activeCollageSlot, activeCollageItem, activeFixedSlot, collageDragging,
                fxIntensity, jigsawGrid, jigsawRoi, jigsawManual, jigsawLayout, cropBoxData, containerSize,
                isSpecialShape, shapeOverlaySvg, sandboxActive, sandboxBoxStyle, sandboxDragging,
                jigsawManualActive, jigsawRoiActive, jigsawRoiStyle, jigsawRoiLayerStyle, jigsawRoiDragging,
                canUndoCt, showFloatingPanel, mainPaddingBottom,
                activeEffect, effectCategory,
                effectsList, jigsawVariants, stickerList, collageLayouts, fixedCollageLayouts,
                textConfig, stickerCategory, stickerCategoryList, stickerConfig, stickerActive,
                downloadName, modalMessageTitle, modalMessage,
                t, cropRatios, specialShapes, cropSetupOptions,
                handleFileInput, triggerUpload, onDrop,
                enterEffects, exitEffects, applyEffectFilter,
                applyCurrentEffect, saveFromEffects, onSliderInput, onJigsawGridChange,
                beginJigsawRoiMove, beginJigsawRoiResize, moveJigsawRoi, endJigsawRoi,
                toggleJigsawManual: jigsawManualTools.toggleJigsawManual,
                applyText, applySticker,
                beginSandboxMove, beginSandboxScale, beginSandboxRotate, moveSandbox, endSandbox,
                jigsawPieceStyle: jigsawManualTools.pieceStyle,
                jigsawDragging: jigsawManualTools.dragging,
                beginJigsawPieceDrag: jigsawManualTools.beginDrag,
                moveJigsawPiece: jigsawManualTools.moveDrag,
                endJigsawPieceDrag: jigsawManualTools.endDrag,
                promptCropSetup, chooseCropSetup, enterCrop, enterCollage, exitCrop, confirmCrop, saveFromCrop,
                setCropMode, setCollageLayout, setCollageFlow,
                triggerCellInput, onCellFileInput,
                collageSlotStyle, collageSlotImageStyle, collageItemStyle, selectCollageSlot, selectCollageItem,
                setCollageItemMask, nudgeCollageLayer, deleteCollageItem,
                markCollageDirty, syncCollageRotation, syncFixedCollageRotation,
                syncCollageScale, toggleCollageFixed,
                collageSlotFrameStyle, beginCollageSlotDrag, beginCollageSlotMove,
                beginCollageSlotResize, beginCollageItemDrag, moveCollageSlot, endCollageSlot,
                buildCollage, cropApply,
                setRatio, setSpecialShape, undo,
                promptDownload, confirmDownloadImage, promptDeleteImage, confirmDeleteImage,
                closeStudioModal,
                refreshIcons,
            };
        },
    }).mount('#app');
})();
