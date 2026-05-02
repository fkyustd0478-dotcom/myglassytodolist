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
            const collageLayout   = ref('vertical'); // active duo mask key
            const collageSlots    = ref([]);         // { image, maskType, scale, offsetX, offsetY, fixed }
            const collageGap      = ref(2);
            const activeCollageSlot = ref(0);
            const collageDragging = ref(false);
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
                    intensity: '強度',
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
                    intensity: 'Intensity',
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
                const r = jigsawRoi.value;
                return { x: r.x * width, y: r.y * height, w: r.w * width, h: r.h * height };
            }

            function _jigsawRoiRect() {
                return document.getElementById('jigsaw-roi-layer')?.getBoundingClientRect();
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
                const base = resultUrl.value || imageUrl.value;
                collageSlots.value = [
                    _collageSlot(base),
                    _collageSlot(''),
                ];
                activeCollageSlot.value = 0;
                fxIntensity.value = 0.25;
            }

            function _collageSlot(image = '') {
                return { image, maskType: collageLayout.value, scale: 1, offsetX: 0, offsetY: 0, fixed: false };
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
                if (!collageLayouts[key]) return;
                collageLayout.value = key;
                collageSlots.value = collageSlots.value.map(slot => ({ ...slot, maskType: key }));
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
                const old = collageSlots.value[_collageActiveCell]?.image;
                const base = resultUrl.value || imageUrl.value;
                if (old && old !== base && old !== imageUrl.value) URL.revokeObjectURL(old);
                const next = [...collageSlots.value];
                next[_collageActiveCell] = { ...(next[_collageActiveCell] || _collageSlot()), image: url };
                collageSlots.value = next;
            }

            function collageSlotStyle(slot) {
                return {
                    transform: `translate(${slot.offsetX * 100}%, ${slot.offsetY * 100}%) scale(${slot.scale || 1})`,
                };
            }

            function selectCollageSlot(index) {
                activeCollageSlot.value = index;
                const scale = collageSlots.value[index]?.scale || 1;
                fxIntensity.value = Math.max(0, Math.min(1, (scale - 0.5) / 2));
            }

            function syncCollageScale() {
                const slot = collageSlots.value[activeCollageSlot.value];
                if (!slot || slot.fixed) return;
                const next = [...collageSlots.value];
                next[activeCollageSlot.value] = { ...slot, scale: 0.5 + fxIntensity.value * 2 };
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
                _collageDrag = { index, rect, sx: event.clientX, sy: event.clientY, x: slot.offsetX || 0, y: slot.offsetY || 0 };
                collageDragging.value = true;
                event.currentTarget.setPointerCapture?.(event.pointerId);
            }

            function _applyCollageDrag(clientX, clientY) {
                if (!_collageDrag) return;
                const { index, rect, sx, sy, x, y } = _collageDrag;
                const slot = collageSlots.value[index];
                if (!slot || slot.fixed) return;
                const next = [...collageSlots.value];
                next[index] = {
                    ...slot,
                    offsetX: Math.max(-0.6, Math.min(0.6, x + (clientX - sx) / rect.width)),
                    offsetY: Math.max(-0.6, Math.min(0.6, y + (clientY - sy) / rect.height)),
                };
                collageSlots.value = next;
            }

            function _flushCollageDrag() {
                _collageFrame = 0;
                if (!_collagePoint) return;
                _applyCollageDrag(_collagePoint.clientX, _collagePoint.clientY);
                _collagePoint = null;
            }

            function moveCollageSlot(event) {
                if (!_collageDrag) return;
                _collagePoint = { clientX: event.clientX, clientY: event.clientY };
                if (!_collageFrame) _collageFrame = _raf(_flushCollageDrag);
            }

            function endCollageSlot() {
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

            async function buildCollage() {
                try {
                    const canvas = await LapisFXCollage.createDuo(collageSlots.value, collageLayout.value, { gap: collageGap.value });
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
                collageSlots.value.forEach(slot => {
                    const u = slot.image;
                    if (u && u !== base && u !== imageUrl.value) URL.revokeObjectURL(u);
                });
                collageSlots.value = [];
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
                collageLayout, collageSlots, collageGap, activeCollageSlot, collageDragging,
                fxIntensity, jigsawGrid, jigsawRoi, jigsawManual, jigsawLayout, cropBoxData, containerSize,
                isSpecialShape, shapeOverlaySvg, sandboxActive, sandboxBoxStyle, sandboxDragging,
                jigsawManualActive, jigsawRoiActive, jigsawRoiStyle, jigsawRoiDragging,
                canUndoCt, showFloatingPanel, mainPaddingBottom,
                activeEffect, effectCategory,
                effectsList, jigsawVariants, stickerList, collageLayouts,
                textConfig, stickerCategory, stickerCategoryList, stickerConfig, stickerActive,
                downloadName, modalMessageTitle, modalMessage,
                t, cropRatios, specialShapes,
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
                enterCrop, exitCrop, confirmCrop, saveFromCrop,
                setCropMode, setCollageLayout,
                triggerCellInput, onCellFileInput,
                collageSlotStyle, selectCollageSlot, syncCollageScale, toggleCollageFixed,
                beginCollageSlotDrag, moveCollageSlot, endCollageSlot,
                buildCollage, cropApply,
                setRatio, setSpecialShape, undo,
                promptDownload, confirmDownloadImage, promptDeleteImage, confirmDeleteImage,
                closeStudioModal,
                refreshIcons,
            };
        },
    }).mount('#app');
})();
