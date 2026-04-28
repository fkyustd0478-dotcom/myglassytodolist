'use strict';
(function waitForDeps() {
    if (typeof Vue              === 'undefined' ||
        typeof useNav           === 'undefined' ||
        typeof LapisStudioEngine === 'undefined' ||
        typeof Cropper          === 'undefined') {
        return setTimeout(waitForDeps, 20);
    }

    const { createApp, ref, computed, onMounted, onUnmounted, onUpdated, nextTick } = Vue;

    createApp({
        setup() {
            const { navSettings, isDarkTheme, glassStyle, themeClasses,
                    customBgStyle, systemDark, resolvedTheme } = useNav();

            // ── Core state ───────────────────────────────────────────────────
            const imageUrl          = ref('');        // blob URL (original upload)
            const resultUrl         = ref('');        // data URL (after crop/effect)
            const activeNav         = ref('main');    // 'main' | 'crop'
            const currentTab        = ref('preview'); // 'preview' | 'effects'
            const dragOver          = ref(false);
            const cropShape         = ref('free');
            const showFilenameModal = ref(false);
            const downloadFilename  = ref('');
            const activeEffect      = ref('');        // key of last applied effect

            // Crop overlay
            const cropBoxData   = ref(null);          // {left,top,width,height}
            const containerSize = ref({ w: 0, h: 0 });

            // History
            const canUndoCt   = ref(0);
            let _undoStack    = [];
            let _cropper      = null;
            let _resultCanvas = null;
            // Snapshot of resultUrl taken when the user enters the effects tab;
            // every filter is applied to this base (replace, not stack).
            let _effectsBase  = null;

            // ── Content panel visibility ──────────────────────────────────────
            const contentView = computed(() => {
                if (activeNav.value === 'crop') return 'crop';
                if (!imageUrl.value)            return 'upload';
                return currentTab.value;         // 'preview' | 'effects'
            });

            const isSpecialShape = computed(() =>
                ['circle', 'ellipse', 'heart', 'star'].includes(cropShape.value)
            );

            // Floating tool panel is visible during crop (shape row) or effects (filter row)
            const showFloatingPanel = computed(() =>
                activeNav.value === 'crop' ||
                (currentTab.value === 'effects' && !!imageUrl.value)
            );

            // Extra 54 px for the floating panel when present
            const mainPaddingBottom = computed(() =>
                showFloatingPanel.value
                    ? 'calc(134px + env(safe-area-inset-bottom, 0px))'
                    : 'calc(80px + env(safe-area-inset-bottom, 0px))'
            );

            // ── Shape-aware crop overlay SVG ──────────────────────────────────
            // SVG mask: white rect punched with black shape → dark rect shows through
            // OUTSIDE the shape, giving the correct "dim everything but the crop" effect.
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
                    noImage: '請先上傳一張圖片。',
                    confirmDelete: '確定要刪除此圖片嗎？',
                    grayscale: '黑白', sepia: '復古', vivid: '鮮豔',
                    dim: '暗調', warm: '暖色', cool: '冷色',
                    glass: '碎玻璃', jigsaw: '拼圖',
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
                    noImage: 'Please upload an image first.',
                    confirmDelete: 'Delete this image?',
                    grayscale: 'B&W', sepia: 'Sepia', vivid: 'Vivid',
                    dim: 'Dim', warm: 'Warm', cool: 'Cool',
                    glass: 'Glass', jigsaw: 'Jigsaw',
                },
            };
            const t = computed(() => translations[navSettings.lang] || translations.zh);

            // ── Crop config ───────────────────────────────────────────────────
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
                { key: 'grayscale' }, { key: 'sepia' }, { key: 'vivid' },
                { key: 'dim' },       { key: 'warm' },  { key: 'cool' },
                { key: 'glass' },     { key: 'jigsaw' },
            ];

            // ── File upload ───────────────────────────────────────────────────
            async function _loadFile(file) {
                if (!file || !file.type.startsWith('image/')) return;
                try {
                    const url = await LapisStudioEngine.load(file);
                    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
                    imageUrl.value     = url;
                    resultUrl.value    = '';
                    _resultCanvas      = null;
                    _undoStack         = [];
                    canUndoCt.value    = 0;
                    activeEffect.value = '';
                    _effectsBase       = null;
                    currentTab.value   = 'preview';
                    activeNav.value    = 'main';
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
                if (_cropper)       { _cropper.destroy(); _cropper = null; }
                if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
                imageUrl.value     = '';
                resultUrl.value    = '';
                _resultCanvas      = null;
                _undoStack         = [];
                canUndoCt.value    = 0;
                activeEffect.value = '';
                _effectsBase       = null;
                activeNav.value    = 'main';
                currentTab.value   = 'preview';
                cropBoxData.value  = null;
            }

            // ── Effects (replace-mode: each filter applied to session base) ───
            function toggleEffects() {
                if (!imageUrl.value) return;
                if (currentTab.value === 'effects') {
                    currentTab.value = 'preview';
                } else {
                    _effectsBase       = resultUrl.value; // snapshot pre-effects state
                    activeEffect.value = '';              // fresh session
                    currentTab.value   = 'effects';
                }
            }

            function applyEffectFilter(effectKey) {
                if (!imageUrl.value) return;
                // Always apply from the pre-effects snapshot → filters replace, not stack
                const src = (_effectsBase !== null ? _effectsBase : resultUrl.value) || imageUrl.value;
                const img = new Image();
                img.onload = () => {
                    const sc = document.createElement('canvas');
                    sc.width  = img.naturalWidth;
                    sc.height = img.naturalHeight;
                    sc.getContext('2d').drawImage(img, 0, 0);
                    // Push ONE undo entry per effects session (on first filter apply)
                    if (activeEffect.value === '') _pushHistory();
                    const output = LapisStudioEngine.applyEffect(sc, effectKey);
                    _resultCanvas      = output;
                    resultUrl.value    = output.toDataURL('image/png');
                    activeEffect.value = effectKey;
                };
                img.src = src;
            }

            // ── History ───────────────────────────────────────────────────────
            function _pushHistory() {
                _undoStack.push(resultUrl.value);
                if (_undoStack.length > 10) _undoStack.shift();
                canUndoCt.value = _undoStack.length;
            }

            function undo() {
                if (_undoStack.length === 0) return;
                resultUrl.value    = _undoStack.pop();
                _resultCanvas      = null;
                activeEffect.value = '';
                _effectsBase       = null;
                canUndoCt.value    = _undoStack.length;
                if (activeNav.value === 'crop') {
                    // Stay in crop — re-init cropper with the restored image
                    if (_cropper) { _cropper.destroy(); _cropper = null; }
                    cropBoxData.value = null;
                    cropShape.value   = 'free';
                    nextTick(() => _initCropper(NaN));
                } else {
                    currentTab.value = 'preview';
                }
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
                    viewMode:     1,
                    autoCropArea: 0.85,
                    background:   false,
                    movable:      true,
                    zoomable:     true,
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

            // stayInCrop=true  → Apply button: apply crop, STAY in crop nav, re-init cropper
            // stayInCrop=false → Save button:  apply crop, EXIT to main nav
            function confirmCrop(stayInCrop = false) {
                if (!_cropper) return;
                _pushHistory();
                const raw      = _cropper.getCroppedCanvas({ imageSmoothingQuality: 'high' });
                const specials = ['circle', 'ellipse', 'heart', 'star'];
                const output   = specials.includes(cropShape.value)
                    ? LapisStudioEngine.applyMask(raw, cropShape.value) : raw;
                _resultCanvas   = output;
                resultUrl.value = output.toDataURL('image/png');
                _cropper.destroy(); _cropper = null;
                cropBoxData.value = null;

                if (stayInCrop) {
                    cropShape.value = 'free';
                    nextTick(() => _initCropper(NaN));
                } else {
                    activeNav.value  = 'main';
                    currentTab.value = 'preview';
                }
            }

            function exitCrop() {
                if (_cropper) { _cropper.destroy(); _cropper = null; }
                cropBoxData.value = null;
                activeNav.value   = 'main';
            }

            async function saveFromCrop() {
                if (_cropper) confirmCrop(false);
                else { activeNav.value = 'main'; currentTab.value = 'preview'; }
                await nextTick();
                promptDownload();
            }

            // ── Download ─────────────────────────────────────────────────────
            function promptDownload() {
                if (!imageUrl.value) { alert(t.value.noImage); return; }
                downloadFilename.value  = `glassystudio_${Date.now()}`;
                showFilenameModal.value = true;
            }

            function doDownload() {
                showFilenameModal.value = false;
                if (_resultCanvas) {
                    LapisStudioEngine.download(_resultCanvas, downloadFilename.value);
                    return;
                }
                const src = resultUrl.value || imageUrl.value;
                const img = new Image();
                img.onload = () => {
                    const c = document.createElement('canvas');
                    c.width = img.naturalWidth; c.height = img.naturalHeight;
                    c.getContext('2d').drawImage(img, 0, 0);
                    LapisStudioEngine.download(c, downloadFilename.value);
                };
                img.src = src;
            }

            // ── Icon refresh ──────────────────────────────────────────────────
            // Called on drawer-swap transition completion so icons inside the
            // newly mounted nav element are not left as empty placeholder spans.
            function refreshIcons() {
                nextTick(() => { if (window.lucide) lucide.createIcons(); });
            }

            // ── Lifecycle ─────────────────────────────────────────────────────
            onMounted(() => {
                if (typeof LapisNav !== 'undefined') LapisNav.inject({ bottom: false });
                if (window.lucide) lucide.createIcons();
            });
            onUpdated(() => {
                // Backup: re-render any icons added by Vue template updates
                if (window.lucide) lucide.createIcons();
            });
            onUnmounted(() => {
                if (_cropper)       _cropper.destroy();
                if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
            });

            return {
                navSettings, isDarkTheme, glassStyle, themeClasses,
                customBgStyle, systemDark, resolvedTheme,
                imageUrl, resultUrl, activeNav, currentTab, contentView,
                dragOver, cropShape, cropBoxData, containerSize,
                isSpecialShape, shapeOverlaySvg,
                canUndoCt, showFilenameModal, downloadFilename,
                showFloatingPanel, mainPaddingBottom,
                activeEffect, effectsList,
                t, cropRatios, specialShapes,
                handleFileInput, triggerUpload, onDrop,
                toggleEffects, applyEffectFilter,
                enterCrop, exitCrop, confirmCrop, saveFromCrop,
                setRatio, setSpecialShape, undo,
                promptDownload, doDownload, promptDeleteImage,
                refreshIcons,
            };
        },
    }).mount('#app');
})();
