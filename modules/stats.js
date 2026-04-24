// stats.js — Glassy Stats page Vue app
// Depends on: storage.js, nav.js
'use strict';

window.addEventListener('DOMContentLoaded', () => {
    const { createApp, computed, onMounted } = Vue;

    const _strings = {
        zh: {
            title:          '訓練統計',
            sectionWorkout: '健身',
            totalSessions:  '累計訓練',
            thisWeek:       '本週訓練',
            latestWeight:   '最新體重',
            exercises:      '動作庫',
            sectionCharts:  '圖表分析',
            comingSoon:     '圖表功能即將推出',
        },
        en: {
            title:          'Stats',
            sectionWorkout: 'Workout',
            totalSessions:  'Total Sessions',
            thisWeek:       'This Week',
            latestWeight:   'Latest Weight',
            exercises:      'Exercises',
            sectionCharts:  'Charts',
            comingSoon:     'Charts coming soon',
        },
    };

    // ── Read stats from localStorage (static snapshot on page load) ──────────
    function _readStats() {
        const wRaw = JSON.parse(localStorage.getItem('lapis_workout')          || '{"logs":[]}');
        const mRaw = JSON.parse(localStorage.getItem('lapis_workout_metrics')  || '{"weights":[]}');
        const lRaw = JSON.parse(localStorage.getItem('lapis_workout_library')  || '[]');

        const logs    = Array.isArray(wRaw.logs)    ? wRaw.logs    : [];
        const weights = Array.isArray(mRaw.weights) ? mRaw.weights : [];
        const library = Array.isArray(lRaw)         ? lRaw         : [];

        const total = logs.filter(l => !l.isDeleted).length;

        const now = new Date();
        const mon = new Date(now);
        mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        const monStr   = mon.toISOString().split('T')[0];
        const thisWeek = logs.filter(l => !l.isDeleted && l.date >= monStr).length;

        const latest = weights.length > 0 ? weights[weights.length - 1] : null;

        return { total, thisWeek, latest, exerciseCount: library.length };
    }

    createApp({
        setup() {
            const { navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle } = useNav();

            const themeStyle = computed(() => ({
                color: 'var(--text-primary)',
                textShadow: 'var(--text-shadow)',
            }));

            const t = computed(() => _strings[navSettings.lang] || _strings.zh);

            const { total, thisWeek, latest, exerciseCount } = _readStats();

            onMounted(() => {
                LapisNav.inject({ bottom: false });
                if (typeof ParticleEngine !== 'undefined' && navSettings.effect && navSettings.effect !== 'none') {
                    ParticleEngine.setEffect(navSettings.effect);
                }
            });

            return {
                navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle, themeStyle, t,
                workoutCount:   total,
                thisWeek,
                latestWeight:   latest,
                exerciseCount,
            };
        }
    }).mount('#app');
});
