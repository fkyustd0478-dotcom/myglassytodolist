// index.js — Glassy Home Dashboard Vue app
// Depends on: storage.js, nav.js
'use strict';

window.addEventListener('DOMContentLoaded', () => {
    const { createApp, computed, onMounted } = Vue;

    const _DAYS_ZH = ['週日','週一','週二','週三','週四','週五','週六'];
    const _DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const _MON_ZH  = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const _MON_EN  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const _strings = {
        zh: {
            greetMorn: '早安', greetAftn: '午安', greetEvng: '晚安',
            nameTodo: '琉璃待辦', descTodo: '管理你的日常任務與提醒',
            nameWorkout: '琉璃健身', descWorkout: '訓練紀錄、個人最佳成績',
            nameShift: '琉璃輪班', descShift: '輪班行程、假日與備忘',
            settings: '系統設定',
        },
        en: {
            greetMorn: 'Good morning', greetAftn: 'Good afternoon', greetEvng: 'Good evening',
            nameTodo: 'Glassy Todo', descTodo: 'Manage your daily tasks & reminders',
            nameWorkout: 'Glassy Workout', descWorkout: 'Training logs & personal bests',
            nameShift: 'Glassy Shift', descShift: 'Shift schedule, holidays & notes',
            settings: 'Settings',
        },
    };

    createApp({
        setup() {
            const { navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle } = useNav();

            const themeStyle = computed(() => ({
                color: 'var(--text-primary)',
                textShadow: 'var(--text-shadow)',
            }));

            const t = computed(() => _strings[navSettings.lang] || _strings.zh);

            const todayLabel = computed(() => {
                const d    = new Date();
                const lang = navSettings.lang;
                const day  = lang === 'zh' ? _DAYS_ZH[d.getDay()] : _DAYS_EN[d.getDay()];
                const mon  = lang === 'zh' ? _MON_ZH[d.getMonth()]  : _MON_EN[d.getMonth()];
                return lang === 'zh'
                    ? `${d.getFullYear()}年${mon}${d.getDate()}日 ${day}`
                    : `${day}, ${mon} ${d.getDate()}, ${d.getFullYear()}`;
            });

            const greeting = computed(() => {
                const h   = new Date().getHours();
                const str = t.value;
                if (h < 12) return str.greetMorn;
                if (h < 18) return str.greetAftn;
                return str.greetEvng;
            });

            onMounted(() => {
                if (typeof LapisNav !== 'undefined') LapisNav.inject({ bottom: false });
                if (typeof ParticleEngine !== 'undefined' && navSettings.effect && navSettings.effect !== 'none') {
                    ParticleEngine.setEffect(navSettings.effect);
                }
            });

            return { navSettings, isDarkTheme, glassStyle, themeClasses, customBgStyle, themeStyle, t, todayLabel, greeting };
        }
    }).mount('#app');
});
