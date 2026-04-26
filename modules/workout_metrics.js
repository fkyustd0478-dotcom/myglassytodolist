// workout_metrics.js — Glassy Workout metrics & session-grouping composable
// Depends on: workout_data.js (_MONTHS_EN, _MONTHS_ZH)
// Usage: const metrics = useWorkoutMetrics({ ref, computed, reactive, wData, metricsData, metricsPersist, navSettings, t, _todayStr, _toast })
'use strict';

window.useWorkoutMetrics = function useWorkoutMetrics(ctx) {
    const { ref, computed, reactive, wData, metricsData, metricsPersist, navSettings, t, _todayStr, _toast } = ctx;

    // ── Body weight ───────────────────────────────────────────────────────────
    const weightForm = reactive({ weight: '', unit: 'kg', date: _todayStr(), ts: Date.now() });

    const saveWeight = () => {
        const w = parseFloat(weightForm.weight);
        if (isNaN(w) || w <= 0) return;
        metricsData.weights.push({ date: weightForm.date, weight: w, unit: weightForm.unit, ts: weightForm.ts || Date.now() });
        metricsPersist();
        weightForm.weight = '';
        weightForm.date   = _todayStr();
        weightForm.ts     = Date.now();
        _toast(t.value.logSaved);
    };

    const deleteWeightRecord = (idx) => {
        metricsData.weights.splice(idx, 1);
        metricsPersist();
    };

    // ── Weight History Modal ──────────────────────────────────────────────────
    const weightHistoryModal = ref(false);
    const weightHistoryMonth = ref('');
    const weightSortBy       = ref('date-desc');

    const latestWeight = computed(() => {
        if (!metricsData.weights.length) return null;
        return [...metricsData.weights].sort((a, b) => b.date.localeCompare(a.date))[0];
    });

    const _weightMonths = computed(() => {
        const months = new Set(metricsData.weights.map(e => e.date.slice(0, 7)));
        return [...months].sort();
    });

    const filteredWeightHistory = computed(() => {
        const month = weightHistoryMonth.value;
        let list = metricsData.weights
            .map((e, i) => ({ ...e, _idx: i }))
            .filter(e => !month || e.date.startsWith(month));
        const [by, dir] = weightSortBy.value.split('-');
        list.sort((a, b) => {
            const cmp = by === 'date' ? a.date.localeCompare(b.date) : a.weight - b.weight;
            return dir === 'desc' ? -cmp : cmp;
        });
        return list;
    });

    const weightHistoryMonthLabel = computed(() => {
        const month = weightHistoryMonth.value;
        if (!month) return navSettings.lang === 'zh' ? '全部' : 'All';
        const [y, m] = month.split('-');
        return navSettings.lang === 'zh'
            ? `${y}年${_MONTHS_ZH[parseInt(m) - 1]}`
            : `${_MONTHS_EN[parseInt(m) - 1]} ${y}`;
    });

    const weightHistoryHasPrev = computed(() => {
        const months = _weightMonths.value;
        return months.indexOf(weightHistoryMonth.value) > 0;
    });

    const weightHistoryHasNext = computed(() => {
        const months = _weightMonths.value;
        const idx = months.indexOf(weightHistoryMonth.value);
        return idx >= 0 && idx < months.length - 1;
    });

    const openWeightHistory = () => {
        if (latestWeight.value) weightHistoryMonth.value = latestWeight.value.date.slice(0, 7);
        weightHistoryModal.value = true;
    };

    const closeWeightHistory = () => { weightHistoryModal.value = false; };

    const prevWeightMonth = () => {
        const months = _weightMonths.value;
        const idx = months.indexOf(weightHistoryMonth.value);
        if (idx > 0) weightHistoryMonth.value = months[idx - 1];
    };

    const nextWeightMonth = () => {
        const months = _weightMonths.value;
        const idx = months.indexOf(weightHistoryMonth.value);
        if (idx >= 0 && idx < months.length - 1) weightHistoryMonth.value = months[idx + 1];
    };

    const deleteWeightWithConfirm = (origIdx) => {
        if (!confirm(t.value.weightDeleteConfirm)) return;
        deleteWeightRecord(origIdx);
    };

    // ── Personal bests ────────────────────────────────────────────────────────
    const personalBests = computed(() => {
        const bests = {};
        wData.logs.filter(l => !l.isDeleted).forEach(log => {
            log.exercises.forEach(ex => {
                if (ex.type !== 'sets') return;
                (ex.sets || []).forEach(set => {
                    const w = parseFloat(set.weight), r = parseInt(set.reps);
                    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;
                    const key = ex.exerciseId || ex.name;
                    if (!bests[key] || w > bests[key].weight ||
                        (w === bests[key].weight && r > bests[key].reps)) {
                        bests[key] = { key, name: ex.name, nameZh: ex.nameZh || '', weight: w, reps: r, date: log.date };
                    }
                });
            });
        });
        return Object.values(bests).sort((a, b) => (a.nameZh || a.name).localeCompare(b.nameZh || b.name));
    });

    // ── PR history modal ──────────────────────────────────────────────────────
    const showPRModal    = ref(false);
    const selectedPRKey  = ref(null);
    const selectedPRName = ref('');

    const getPRProgression = (exerciseKey) => {
        const entries = [];
        wData.logs.filter(l => !l.isDeleted).forEach(log => {
            log.exercises.forEach(ex => {
                if ((ex.exerciseId || ex.name) !== exerciseKey) return;
                (ex.sets || []).forEach(set => {
                    const w = parseFloat(set.weight), r = parseInt(set.reps);
                    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;
                    entries.push({ date: log.date, time: log.time, weight: w, reps: r, numSets: parseInt(set.numSets) || 1 });
                });
            });
        });
        entries.sort((a, b) => {
            const dc = a.date.localeCompare(b.date);
            if (dc !== 0) return dc;
            return (a.time.hour * 60 + a.time.minute) - (b.time.hour * 60 + b.time.minute);
        });
        let peakWeight = 0, peakReps = 0;
        const breakthroughs = [];
        entries.forEach(entry => {
            const isPR = entry.weight > peakWeight || (entry.weight === peakWeight && entry.reps > peakReps);
            if (isPR) { peakWeight = entry.weight; peakReps = entry.reps; breakthroughs.push({ ...entry }); }
        });
        return breakthroughs.slice(-5).reverse();
    };

    const prProgression = computed(() => selectedPRKey.value ? getPRProgression(selectedPRKey.value) : []);

    const openPRModal = (pb) => {
        selectedPRKey.value  = pb.key;
        selectedPRName.value = (navSettings.lang === 'zh' && pb.nameZh) ? pb.nameZh : pb.name;
        showPRModal.value    = true;
    };

    // ── Stats ─────────────────────────────────────────────────────────────────
    const _isSets = (type) => type === 'sets' || type === 'sets_reps';

    const stats = computed(() => {
        const logs = wData.logs;
        const now  = new Date();
        const mon  = new Date(now);
        mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        const monStr = mon.toISOString().split('T')[0];
        let totalVol = 0, exCount = {};
        logs.forEach(log => {
            log.exercises.forEach(e => {
                exCount[e.name] = (exCount[e.name] || 0) + 1;
                if (_isSets(e.type)) {
                    (e.sets || []).forEach(s => {
                        const w = parseFloat(s.weight), r = parseInt(s.reps), n = parseInt(s.numSets) || 1;
                        if (!isNaN(w) && !isNaN(r)) totalVol += w * r * n;
                    });
                }
            });
        });
        const fav = Object.entries(exCount).sort((a, b) => b[1] - a[1])[0];
        return {
            total:    logs.length,
            thisWeek: logs.filter(l => l.date >= monStr).length,
            totalVol: Math.round(totalVol),
            fav:      fav ? fav[0] : '—'
        };
    });

    // ── Log display helpers ───────────────────────────────────────────────────
    const logSummary = (log) => {
        const exCount = log.exercises.length;
        let totalSets = 0;
        log.exercises.forEach(e => { if (_isSets(e.type)) totalSets += (e.sets || []).length; });
        return { exCount, totalSets };
    };

    const logVolume = (log) => {
        let vol = 0;
        log.exercises.forEach(e => {
            if (_isSets(e.type)) {
                (e.sets || []).forEach(s => {
                    const w = parseFloat(s.weight), r = parseInt(s.reps), n = parseInt(s.numSets) || 1;
                    if (!isNaN(w) && !isNaN(r)) vol += w * r * n;
                });
            }
        });
        return vol > 0 ? `${Math.round(vol)} kg` : null;
    };

    const exDisplayName = (entry) =>
        (navSettings.lang === 'zh' && entry.nameZh) ? entry.nameZh : entry.name;

    // ── Session groupings ─────────────────────────────────────────────────────
    const todaySessions = computed(() => {
        const today = _todayStr();
        return [...wData.logs]
            .filter(l => !l.isDeleted && l.date === today)
            .sort((a, b) => (a.time.hour * 60 + a.time.minute) - (b.time.hour * 60 + b.time.minute));
    });

    const historySessions = computed(() => {
        const today = _todayStr();
        const filtered = [...wData.logs]
            .filter(l => !l.isDeleted && l.date !== today)
            .sort((a, b) => b.date.localeCompare(a.date));
        const groups = [];
        let lastKey = null;
        filtered.forEach(l => {
            const [y, m] = l.date.split('-');
            const key = `${y}-${m}`;
            if (key !== lastKey) { lastKey = key; groups.push({ key, year: y, month: m, sessions: [] }); }
            groups[groups.length - 1].sessions.push(l);
        });
        return groups;
    });

    const binSessions = computed(() =>
        [...wData.logs].filter(l => l.isDeleted).sort((a, b) => b.date.localeCompare(a.date))
    );

    const groupedHistory = computed(() =>
        historySessions.value.map(g => ({
            ...g,
            monthLabel: navSettings.lang === 'zh'
                ? `${g.year}年${_MONTHS_ZH[parseInt(g.month) - 1]}`
                : `${_MONTHS_EN[parseInt(g.month) - 1]} ${g.year}`
        }))
    );

    return {
        weightForm, saveWeight, deleteWeightRecord,
        latestWeight, weightHistoryModal, weightHistoryMonth, weightSortBy,
        filteredWeightHistory, weightHistoryMonthLabel,
        weightHistoryHasPrev, weightHistoryHasNext,
        openWeightHistory, closeWeightHistory,
        prevWeightMonth, nextWeightMonth, deleteWeightWithConfirm,
        personalBests,
        showPRModal, selectedPRName, prProgression, openPRModal,
        stats, logSummary, logVolume, exDisplayName,
        todaySessions, historySessions, binSessions, groupedHistory,
    };
};
