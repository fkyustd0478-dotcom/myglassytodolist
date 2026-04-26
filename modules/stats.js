// stats.js — Glassy Stats page Vue app v2.0
// Depends on: storage.js, nav.js, lapis_core_ui.js, ApexCharts (CDN)
'use strict';

window.addEventListener('DOMContentLoaded', () => {
    const { createApp, computed, ref, onMounted, watch } = Vue;

    // ── Translations ──────────────────────────────────────────────────────────
    const _strings = {
        zh: {
            title:               '訓練統計',
            sectionWorkout:      '健身',
            totalSessions:       '累計訓練',
            thisWeek:            '本週訓練',
            latestWeight:        '最新體重',
            exercises:           '動作庫',
            sectionCharts:       '圖表分析',
            chartWeight:         '體重趨勢 (kg)',
            chartVolume:         '訓練量趨勢 (kg)',
            snapToday:           '回今天',
            noWeightData:        '尚無體重紀錄',
            noVolumeData:        '尚無訓練紀錄',
            quickAdd:            '快速新增',
            quickTask:           '任務',
            logWeight:           '體重',
            taskNamePlaceholder: '輸入任務名稱…',
            weightPlaceholder:   '體重（公斤）',
            save:                '儲存',
            cancel:              '取消',
            savedTask:           '✓ 任務已新增',
            savedWeight:         '✓ 體重已記錄',
        },
        en: {
            title:               'Stats',
            sectionWorkout:      'Workout',
            totalSessions:       'Total Sessions',
            thisWeek:            'This Week',
            latestWeight:        'Latest Weight',
            exercises:           'Exercises',
            sectionCharts:       'Charts',
            chartWeight:         'Body Weight (kg)',
            chartVolume:         'Volume (kg)',
            snapToday:           'Today',
            noWeightData:        'No weight data yet',
            noVolumeData:        'No workout data yet',
            quickAdd:            'Quick Add',
            quickTask:           'Task',
            logWeight:           'Weight',
            taskNamePlaceholder: 'Task name…',
            weightPlaceholder:   'Weight (kg)',
            save:                'Save',
            cancel:              'Cancel',
            savedTask:           '✓ Task added',
            savedWeight:         '✓ Weight logged',
        },
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const _uid     = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
    const _dateStr = (d = 0) => { const dt = new Date(); dt.setDate(dt.getDate() + d); return toLocalISO(dt); };
    const _DAY_MS  = 86400000;

    // ── Data loading ──────────────────────────────────────────────────────────
    function _readData() {
        const wRaw = JSON.parse(localStorage.getItem('lapis_workout')         || '{"logs":[]}');
        const mRaw = JSON.parse(localStorage.getItem('lapis_workout_metrics') || '{"weights":[]}');
        const lRaw = JSON.parse(localStorage.getItem('lapis_workout_library') || '[]');
        const logs    = Array.isArray(wRaw.logs)    ? wRaw.logs    : [];
        const weights = Array.isArray(mRaw.weights) ? mRaw.weights : [];
        const library = Array.isArray(lRaw)         ? lRaw         : [];

        const now = new Date();
        const mon = new Date(now);
        mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        const monStr  = toLocalISO(mon);
        const total   = logs.filter(l => !l.isDeleted).length;
        const thisWk  = logs.filter(l => !l.isDeleted && l.date >= monStr).length;
        const latest  = weights.length > 0 ? weights[weights.length - 1] : null;

        return { total, thisWk, latest, exerciseCount: library.length, logs, weights };
    }

    // ── Chart series builders ─────────────────────────────────────────────────
    // Only include dates that have data — gaps draw direct lines between points
    function _weightSeries(weights) {
        return weights
            .filter(w => w.weight > 0)
            .map(w => ({ x: new Date(w.date + 'T00:00:00').getTime(), y: w.weight }));
    }

    function _volumeSeries(logs) {
        const byDate = {};
        logs.filter(l => !l.isDeleted).forEach(log => {
            let vol = 0;
            log.exercises.forEach(e => {
                if (e.type === 'sets') {
                    (e.sets || []).forEach(s => {
                        const w = parseFloat(s.weight), r = parseInt(s.reps), n = parseInt(s.numSets) || 1;
                        if (!isNaN(w) && !isNaN(r)) vol += w * r * n;
                    });
                }
            });
            if (vol > 0) byDate[log.date] = (byDate[log.date] || 0) + vol;
        });
        return Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, vol]) => ({ x: new Date(date + 'T00:00:00').getTime(), y: Math.round(vol) }));
    }

    // ── Chart instances (module-level for snap access) ────────────────────────
    let _wChart = null;
    let _vChart = null;

    // ── ApexCharts options factory ────────────────────────────────────────────
    function _chartOpts(series, seriesName, isDark, noDataText) {
        const textColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)';
        const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
        const now       = Date.now();
        return {
            chart: {
                type: 'area',
                height: 200,
                background: 'transparent',
                toolbar: { show: false, autoSelected: 'pan' },
                zoom: { type: 'x', enabled: true },
                animations: { enabled: false },
                fontFamily: '"Inter", system-ui, sans-serif',
                sparkline: { enabled: false },
            },
            series: [{ name: seriesName, data: series }],
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2, colors: ['#3b82f6'] },
            fill: {
                type: 'gradient',
                gradient: {
                    type: 'vertical',
                    shadeIntensity: 1,
                    colorStops: [
                        { offset: 0,   color: '#3b82f6', opacity: 0.28 },
                        { offset: 100, color: '#3b82f6', opacity: 0    },
                    ],
                },
            },
            markers: {
                size: 4,
                colors: ['#3b82f6'],
                strokeColors: isDark ? '#ffffff' : '#1a1a1a',
                strokeWidth: 2,
                hover: { size: 7 },
            },
            xaxis: {
                type: 'datetime',
                min: now - 14 * _DAY_MS,
                max: now,
                labels: {
                    datetimeUTC: false,
                    format: 'MM/dd',
                    style: { colors: textColor, fontSize: '10px', fontWeight: '700' },
                },
                axisBorder: { show: false },
                axisTicks:  { show: false },
            },
            yaxis: {
                labels: {
                    style: { colors: textColor, fontSize: '10px', fontWeight: '700' },
                },
            },
            grid: {
                borderColor: gridColor,
                strokeDashArray: 4,
                padding: { left: 4, right: 8, top: 0, bottom: 0 },
            },
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                x: { format: 'yyyy/MM/dd' },
                style: { fontSize: '11px', fontFamily: '"Inter", sans-serif' },
            },
            noData: {
                text: noDataText,
                align: 'center',
                verticalAlign: 'middle',
                style: { fontSize: '12px', fontWeight: '700', color: textColor },
            },
            theme: { mode: isDark ? 'dark' : 'light' },
        };
    }

    // ── Color-only update (theme switch without full redraw) ──────────────────
    function _themeOpts(isDark) {
        const textColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)';
        const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
        return {
            markers:  { strokeColors: isDark ? '#ffffff' : '#1a1a1a' },
            xaxis:    { labels: { style: { colors: textColor } } },
            yaxis:    { labels: { style: { colors: textColor } } },
            grid:     { borderColor: gridColor },
            tooltip:  { theme: isDark ? 'dark' : 'light' },
            theme:    { mode: isDark ? 'dark' : 'light' },
            noData:   { style: { color: textColor } },
        };
    }

    // ── Vue App ───────────────────────────────────────────────────────────────
    createApp({
        setup() {
            const { navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle } = useNav();

            const themeStyle = computed(() => ({
                color:      'var(--text-primary)',
                textShadow: 'var(--text-shadow)',
            }));

            const t = computed(() => _strings[navSettings.lang] || _strings.zh);

            // ── Stats snapshot ────────────────────────────────────────────────
            const { total, thisWk, latest, exerciseCount, logs, weights } = _readData();
            const weightSeries = _weightSeries(weights);
            const volumeSeries = _volumeSeries(logs);

            // ── Snap to today ─────────────────────────────────────────────────
            const snapToToday = () => {
                const now   = Date.now();
                const range = { xaxis: { min: now - 14 * _DAY_MS, max: now } };
                if (_wChart) _wChart.updateOptions(range, false, true);
                if (_vChart) _vChart.updateOptions(range, false, true);
            };

            // ── Quick Add state ───────────────────────────────────────────────
            const quickMode   = ref('task');
            const quickText   = ref('');
            const quickWeight = ref('');
            const toastMsg    = ref('');
            const toastShow   = ref(false);

            const _showToast = (msg) => {
                toastMsg.value  = msg;
                toastShow.value = true;
                setTimeout(() => { toastShow.value = false; }, 2200);
            };

            const openQuickAdd = () => {
                quickText.value   = '';
                quickWeight.value = '';
                quickMode.value   = 'task';
                if (typeof LapisModal !== 'undefined') LapisModal.open('stats-quick-add-modal');
            };

            const closeQuickAdd = () => {
                if (typeof LapisModal !== 'undefined') LapisModal.close('stats-quick-add-modal');
            };

            const saveQuick = () => {
                if (quickMode.value === 'task') {
                    const text = (quickText.value || '').trim();
                    if (!text) return;
                    const data = StorageProvider.getTodoData();
                    data.todos.push({
                        id: _uid(), text, category: 'normal', recurring: 'none',
                        dueDate: _dateStr(0), alertMinutes: 0, completed: false,
                        isDeleted: false, listId: 'default', createdAt: Date.now(),
                    });
                    StorageProvider.saveData(data);
                    closeQuickAdd();
                    _showToast(t.value.savedTask);
                } else {
                    const w = parseFloat(quickWeight.value);
                    if (!w || w <= 0) return;
                    try {
                        const raw = JSON.parse(localStorage.getItem('lapis_workout_metrics') || '{"weights":[],"personalBests":[]}');
                        if (!Array.isArray(raw.weights)) raw.weights = [];
                        raw.weights.push({ date: _dateStr(0), weight: w, unit: 'kg' });
                        localStorage.setItem('lapis_workout_metrics', JSON.stringify(raw));
                    } catch (_) {}
                    closeQuickAdd();
                    _showToast(t.value.savedWeight);
                }
            };

            // ── Sync chart colors when theme changes ──────────────────────────
            watch(isDarkTheme, (dark) => {
                const opts = _themeOpts(dark);
                if (_wChart) _wChart.updateOptions(opts, false, false);
                if (_vChart) _vChart.updateOptions(opts, false, false);
            });

            // ── Init ──────────────────────────────────────────────────────────
            onMounted(() => {
                if (typeof LapisNav   !== 'undefined') LapisNav.inject({ bottom: false });
                if (typeof LapisModal !== 'undefined') LapisModal.init();
                if (typeof ParticleEngine !== 'undefined' && navSettings.effect && navSettings.effect !== 'none') {
                    ParticleEngine.setEffect(navSettings.effect);
                }

                if (typeof ApexCharts !== 'undefined') {
                    const dark = isDarkTheme.value;

                    const wEl = document.getElementById('weight-chart');
                    if (wEl && weightSeries.length > 0) {
                        _wChart = new ApexCharts(wEl, _chartOpts(weightSeries, t.value.chartWeight, dark, t.value.noWeightData));
                        _wChart.render();
                    }

                    const vEl = document.getElementById('volume-chart');
                    if (vEl && volumeSeries.length > 0) {
                        _vChart = new ApexCharts(vEl, _chartOpts(volumeSeries, t.value.chartVolume, dark, t.value.noVolumeData));
                        _vChart.render();
                    }
                }

                document.body.classList.add('lapis-ready');
            });

            return {
                navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle, themeStyle, t,
                workoutCount:  total,
                thisWeek:      thisWk,
                latestWeight:  latest,
                exerciseCount,
                weightSeries,
                volumeSeries,
                snapToToday,
                quickMode, quickText, quickWeight, toastMsg, toastShow,
                openQuickAdd, closeQuickAdd, saveQuick,
            };
        },
    }).mount('#app');
});
