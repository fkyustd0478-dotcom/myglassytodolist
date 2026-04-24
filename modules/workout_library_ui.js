// workout_library_ui.js — Glassy Workout exercise library & category management composable
// Depends on: workout_data.js (_wUid, _catColors, _catLabels)
// Usage: const lib = useWorkoutLibrary({ ref, reactive, computed, nextTick, libData, catTree, libPersist, catsPersist, navSettings, t, logExercises })
'use strict';

window.useWorkoutLibrary = function useWorkoutLibrary(ctx) {
    const { ref, reactive, computed, nextTick, libData, catTree, libPersist, catsPersist, navSettings, t, logExercises } = ctx;

    // ── Tree traversal helpers ────────────────────────────────────────────────
    const _findByName = (name) => {
        for (const l1 of catTree.value) {
            if (l1.name === name) return { node: l1, level: 1, parent: null };
            for (const l2 of (l1.children || [])) {
                if (l2.name === name) return { node: l2, level: 2, parent: l1 };
                for (const l3 of (l2.children || [])) {
                    if (l3.name === name) return { node: l3, level: 3, parent: l2 };
                }
            }
        }
        return null;
    };

    const _subtreeNames = (name) => {
        for (const l1 of catTree.value) {
            if (l1.name === name) {
                const ns = [l1.name];
                (l1.children || []).forEach(l2 => { ns.push(l2.name); (l2.children || []).forEach(l3 => ns.push(l3.name)); });
                return ns;
            }
            for (const l2 of (l1.children || [])) {
                if (l2.name === name) { const ns = [l2.name]; (l2.children || []).forEach(l3 => ns.push(l3.name)); return ns; }
                for (const l3 of (l2.children || [])) { if (l3.name === name) return [l3.name]; }
            }
        }
        return [name];
    };

    // ── Display helpers ───────────────────────────────────────────────────────
    const catLabel = (name) => {
        if (navSettings.lang !== 'zh') return name;
        const found = _findByName(name);
        return found ? (found.node.nameZh || name) : (_catLabels[name] || name);
    };

    const catPillStyle = (name) => {
        for (let i = 0; i < catTree.value.length; i++) {
            const l1 = catTree.value[i];
            const sub = [l1.name, ...(l1.children || []).flatMap(l2 => [l2.name, ...(l2.children || []).map(l3 => l3.name)])];
            if (sub.includes(name)) return _catColors[i % _catColors.length];
        }
        return _catColors[0];
    };

    const unitLabel = (ex) => ex.type === 'duration'
        ? t.value.min
        : `${ex.preferredUnit || 'kg'}/${t.value.sets_unit}`;

    // ── Library search + filter ───────────────────────────────────────────────
    const libSearch   = ref('');
    const libCategory = ref('');

    const filteredLib = computed(() => {
        let list = libData.exercises;
        const q = libSearch.value.toLowerCase();
        if (q) list = list.filter(e => e.name.toLowerCase().includes(q) || (e.nameZh && e.nameZh.includes(q)));
        if (libCategory.value) {
            const sub = _subtreeNames(libCategory.value);
            list = list.filter(e => (e.categories || []).some(c => sub.includes(c)));
        }
        return list;
    });

    // ── Add/Edit exercise modal ───────────────────────────────────────────────
    const showExModal = ref(false);
    const isEditEx    = ref(false);
    const editExId    = ref(null);
    const exForm = reactive({ name: '', nameZh: '', categories: [], type: 'sets', unit: 'kg', description: '', targetMuscles: '' });

    const openAddEx = () => {
        isEditEx.value = false; editExId.value = null;
        Object.assign(exForm, { name: '', nameZh: '', categories: [], type: 'sets', unit: 'kg', description: '', targetMuscles: '' });
        showExModal.value = true;
    };

    const openEditEx = (ex) => {
        isEditEx.value = true; editExId.value = ex.id;
        const normType = (ex.type === 'sets_reps') ? 'sets' : (ex.type || 'sets');
        Object.assign(exForm, {
            name: ex.name, nameZh: ex.nameZh || '', categories: [...ex.categories],
            type: normType, unit: ex.preferredUnit || 'kg',
            description: ex.description || '', targetMuscles: ex.targetMuscles || ''
        });
        showExModal.value = true;
    };

    const saveEx = () => {
        if (!exForm.name.trim()) return;
        const payload = {
            name: exForm.name.trim(), nameZh: exForm.nameZh.trim(),
            categories: [...exForm.categories], type: exForm.type,
            preferredUnit: exForm.type === 'sets' ? exForm.unit : undefined,
            description: exForm.description.trim(), targetMuscles: exForm.targetMuscles.trim()
        };
        if (isEditEx.value) {
            const idx = libData.exercises.findIndex(e => e.id === editExId.value);
            if (idx >= 0) libData.exercises.splice(idx, 1, { ...libData.exercises[idx], ...payload });
        } else {
            libData.exercises.push({ id: _wUid(), ...payload });
        }
        libPersist();
        showExModal.value = false;
    };

    const deleteEx = (id) => {
        if (!confirm(t.value.deleteConfirm)) return;
        const idx = libData.exercises.findIndex(e => e.id === id);
        if (idx >= 0) libData.exercises.splice(idx, 1);
        libPersist();
    };

    // ── Drag-and-drop reorder ─────────────────────────────────────────────────
    const dragSrcId = ref(null);

    const onDragStart = (ex, event) => { dragSrcId.value = ex.id; event.dataTransfer.effectAllowed = 'move'; };
    const onDragOver  = (event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; };
    const onDrop = (targetEx, event) => {
        event.preventDefault();
        if (!dragSrcId.value || dragSrcId.value === targetEx.id) { dragSrcId.value = null; return; }
        const exArr = libData.exercises;
        const srcIdx = exArr.findIndex(e => e.id === dragSrcId.value);
        const tgtIdx = exArr.findIndex(e => e.id === targetEx.id);
        if (srcIdx < 0 || tgtIdx < 0) { dragSrcId.value = null; return; }
        const [removed] = exArr.splice(srcIdx, 1);
        exArr.splice(tgtIdx, 0, removed);
        libPersist();
        dragSrcId.value = null;
        nextTick(() => lucide.createIcons());
    };

    // ── Exercise detail view ──────────────────────────────────────────────────
    const showExDetail = ref(false);
    const exDetailData = ref(null);

    const openExDetail = (ex) => {
        exDetailData.value = ex; showExDetail.value = true;
        nextTick(() => lucide.createIcons());
    };

    // ── Category management modal ─────────────────────────────────────────────
    const showCatMgr = ref(false);
    const catMgrMode = ref('view');
    const catMgrForm = reactive({ name: '', nameZh: '', parentName: null, level: 1, editOldName: null });

    const catMgrAdd = (parentName, level) => {
        catMgrForm.name = ''; catMgrForm.nameZh = '';
        catMgrForm.parentName = parentName; catMgrForm.level = level;
        catMgrForm.editOldName = null;
        catMgrMode.value = 'add';
    };

    const catMgrEdit = (node) => {
        catMgrForm.editOldName = node.name;
        catMgrForm.name        = node.name;
        catMgrForm.nameZh      = node.nameZh || '';
        catMgrMode.value       = 'edit';
    };

    const catMgrSave = () => {
        const name = catMgrForm.name.trim();
        if (!name) return;
        if (catMgrMode.value === 'edit') {
            const found = _findByName(catMgrForm.editOldName);
            if (found) {
                const old = found.node.name;
                found.node.name = name; found.node.nameZh = catMgrForm.nameZh.trim();
                libData.exercises.forEach(ex => {
                    const ci = (ex.categories || []).indexOf(old);
                    if (ci >= 0) ex.categories.splice(ci, 1, name);
                });
                libPersist();
            }
        } else {
            const newNode = { id: _wUid(), name, nameZh: catMgrForm.nameZh.trim(), children: [] };
            if (catMgrForm.level === 1) {
                catTree.value.push(newNode);
            } else {
                const found = _findByName(catMgrForm.parentName);
                if (found) found.node.children.push(newNode);
            }
        }
        catsPersist();
        catMgrMode.value = 'view';
        catMgrForm.name = ''; catMgrForm.nameZh = ''; catMgrForm.editOldName = null;
        nextTick(() => lucide.createIcons());
    };

    const catMgrDelete = (node, parentNode) => {
        if (!confirm(t.value.deleteConfirm)) return;
        const arr = parentNode ? (parentNode.children || []) : catTree.value;
        const idx = arr.findIndex(n => n.name === node.name);
        if (idx >= 0) arr.splice(idx, 1);
        catsPersist();
    };

    // ── Exercise form — cascading category selector ────────────────────────────
    const exCatSel = reactive({ l1: null, l2: null, l3: null });

    const exCatL2s = computed(() => {
        if (!exCatSel.l1) return [];
        const n = catTree.value.find(l => l.name === exCatSel.l1);
        return n ? (n.children || []) : [];
    });

    const exCatL3s = computed(() => {
        if (!exCatSel.l2) return [];
        for (const l1 of catTree.value) {
            const n = (l1.children || []).find(l => l.name === exCatSel.l2);
            if (n) return n.children || [];
        }
        return [];
    });

    const addCatToForm = () => {
        const name = exCatSel.l3 || exCatSel.l2 || exCatSel.l1;
        if (!name || exForm.categories.includes(name)) return;
        exForm.categories.push(name);
        exCatSel.l1 = null; exCatSel.l2 = null; exCatSel.l3 = null;
    };

    const removeCatFromForm = (name) => {
        const idx = exForm.categories.indexOf(name);
        if (idx >= 0) exForm.categories.splice(idx, 1);
    };

    // ── Grouped exercise rows (hierarchical display) ──────────────────────────
    const exGroupedRows = computed(() => {
        const rows = [], shown = new Set(), filtered = filteredLib.value;
        catTree.value.forEach((l1, ci) => {
            const sub = [l1.name, ...(l1.children || []).flatMap(l2 => [l2.name, ...(l2.children || []).map(l3 => l3.name)])];
            const exes = filtered.filter(ex => !shown.has(ex.id) && (ex.categories || []).some(c => sub.includes(c)));
            if (!exes.length) return;
            rows.push({ type: 'hdr', node: l1, ci });
            exes.forEach(ex => { shown.add(ex.id); rows.push({ type: 'ex', ex, ci }); });
        });
        const uncats = filtered.filter(ex => !shown.has(ex.id));
        if (uncats.length) {
            rows.push({ type: 'hdr', node: { name: 'Other', nameZh: '其他' }, ci: -1 });
            uncats.forEach(ex => rows.push({ type: 'ex', ex, ci: -1 }));
        }
        return rows;
    });

    // ── Pick-exercise modal (add exercise to log) ─────────────────────────────
    const showPickModal = ref(false);
    const pickSearch    = ref('');
    const pickCategory  = ref('');

    const filteredPick = computed(() => {
        let list = libData.exercises;
        const q = pickSearch.value.toLowerCase();
        if (q) list = list.filter(e => e.name.toLowerCase().includes(q) || (e.nameZh && e.nameZh.includes(q)));
        if (pickCategory.value) {
            const sub = _subtreeNames(pickCategory.value);
            list = list.filter(e => (e.categories || []).some(c => sub.includes(c)));
        }
        return list;
    });

    const pickExercise = (ex) => {
        const isSets = ex.type === 'sets' || ex.type === 'sets_reps';
        logExercises.value.push({
            exerciseId: ex.id, name: ex.name, nameZh: ex.nameZh || '',
            type: isSets ? 'sets' : 'duration',
            preferredUnit: isSets ? (ex.preferredUnit || 'kg') : undefined,
            categories: [...ex.categories],
            sets: isSets ? [{ reps: '', numSets: '1', weight: '', done: false }] : [],
            minutes: isSets ? undefined : '',
            isCompleted: false,
        });
        showPickModal.value = false;
        pickSearch.value    = '';
        pickCategory.value  = '';
        nextTick(() => {
            if (isSets) {
                const inputs = document.querySelectorAll('.log-body .compact-input');
                if (inputs.length >= 3) inputs[inputs.length - 3].focus();
            } else {
                const inputs = document.querySelectorAll('.log-body input[inputmode="numeric"]');
                if (inputs.length) inputs[inputs.length - 1].focus();
            }
        });
    };

    return {
        // display helpers
        catLabel, catPillStyle, unitLabel,
        // library search/filter
        libSearch, libCategory, filteredLib,
        // exercise modal
        showExModal, isEditEx, exForm, openAddEx, openEditEx, saveEx, deleteEx,
        // drag-and-drop
        dragSrcId, onDragStart, onDragOver, onDrop,
        // detail view
        showExDetail, exDetailData, openExDetail,
        // category management
        showCatMgr, catMgrMode, catMgrForm, catMgrAdd, catMgrEdit, catMgrSave, catMgrDelete,
        // cascading selector
        exCatSel, exCatL2s, exCatL3s, addCatToForm, removeCatFromForm,
        // grouped rows
        exGroupedRows,
        // pick modal
        showPickModal, pickSearch, pickCategory, filteredPick, pickExercise,
    };
};
