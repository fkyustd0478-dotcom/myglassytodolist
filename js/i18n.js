'use strict';

(function (global) {
    const messages = {
        zh: {
            nav: {
                home: '首頁',
                todo: '琉璃待辦',
                shift: '琉璃輪班',
                workout: '琉璃健身',
                studio: 'Studio',
                language: '語言',
                setting: '設定',
                index: '琉璃待辦',
            },
            theme: {
                system: '系統',
                light: '明亮',
                dark: '深色',
                cherry: '櫻花',
                sky: '藍天',
                seaside: '海濱',
                sunset: '日落',
                forest: '森林',
                sea: '大海',
                night: '夜景',
                torii: '鳥居',
                waterfall: '瀑布',
                ferriswheel: '摩天輪',
                starrynight: '星夜',
                'plum-blossom': '梅花',
                orange: '暖橘',
                purple: '星雲',
                cherrrypink: '櫻花粉',
                skyblue: '天空藍',
                grassgreen: '草地綠',
                beige: '米色',
                lightgrey: '淺灰',
                lavender: '薰衣草',
            },
            settings: {
                dataIo: {
                    title: '匯入 / 匯出',
                    importCsvTxt: '匯入 CSV/TXT',
                    exportCurrent: '匯出目前資料',
                    importToolMissing: '匯入工具尚未載入，請重新整理頁面。',
                    exportToolMissing: '匯出工具尚未載入，請重新整理頁面。',
                    importDone: '匯入完成：新增 {count} 筆，格式 {format}。',
                    exportDone: '匯出完成：{label} {format}。',
                    importFailed: '匯入失敗，請檢查檔案格式。',
                    exportFailed: '匯出失敗。',
                    readFailed: '無法讀取檔案，請重新選擇。',
                    types: {
                        todo: {
                            label: 'Todo 事項',
                            short: '任務與日期',
                            csv: 'CSV: text,dueDate,dueTime,category,listName,completed',
                            txt: 'TXT: Task A,2026-04-29',
                        },
                        weight: {
                            label: '體重記錄',
                            short: '日期與體重',
                            csv: 'CSV: date,weight,unit',
                            txt: 'TXT: 2026-04-29,70.5,kg',
                        },
                        workoutLibrary: {
                            label: '運動庫',
                            short: '動作資料',
                            csv: 'CSV: name,nameZh,categories,type,preferredUnit,description,targetMuscles',
                            txt: 'TXT: Bench Press,Chest;Triceps,sets,kg',
                        },
                        shift: {
                            label: '輪班表',
                            short: '班別與標籤',
                            csv: 'CSV: date,shifts,pays,others,note',
                            txt: 'TXT: 2026-04-29 | shifts=Early | pays=Salary | others=Holiday | note=Morning',
                        },
                    },
                },
            },
        },
        en: {
            nav: {
                home: 'Home',
                todo: 'Glassy Todo',
                shift: 'Glassy Shift',
                workout: 'Glassy Workout',
                studio: 'Studio',
                language: 'Language',
                setting: 'Settings',
                index: 'Glassy Todo',
            },
            theme: {
                system: 'System',
                light: 'Light',
                dark: 'Dark',
                cherry: 'Cherry',
                sky: 'Sky',
                seaside: 'Seaside',
                sunset: 'Sunset',
                forest: 'Forest',
                sea: 'Sea',
                night: 'Night',
                torii: 'Torii',
                waterfall: 'Waterfall',
                ferriswheel: 'Ferris Wheel',
                starrynight: 'Starry Night',
                'plum-blossom': 'Plum Blossom',
                orange: 'Ember',
                purple: 'Cosmos',
                cherrrypink: 'Cherry Pink',
                skyblue: 'Sky Blue',
                grassgreen: 'Grass Green',
                beige: 'Beige',
                lightgrey: 'Light Grey',
                lavender: 'Lavender',
            },
            settings: {
                dataIo: {
                    title: 'Import / Export',
                    importCsvTxt: 'Import CSV/TXT',
                    exportCurrent: 'Export Current Data',
                    importToolMissing: 'Import tool is not loaded. Please refresh the page.',
                    exportToolMissing: 'Export tool is not loaded. Please refresh the page.',
                    importDone: 'Import complete: added {count} rows, format {format}.',
                    exportDone: 'Export complete: {label} {format}.',
                    importFailed: 'Import failed. Please check the file format.',
                    exportFailed: 'Export failed.',
                    readFailed: 'Unable to read the file. Please choose it again.',
                    types: {
                        todo: {
                            label: 'Todo Tasks',
                            short: 'Tasks and dates',
                            csv: 'CSV: text,dueDate,dueTime,category,listName,completed',
                            txt: 'TXT: Task A,2026-04-29',
                        },
                        weight: {
                            label: 'Body Weight',
                            short: 'Date and weight',
                            csv: 'CSV: date,weight,unit',
                            txt: 'TXT: 2026-04-29,70.5,kg',
                        },
                        workoutLibrary: {
                            label: 'Workout Library',
                            short: 'Exercise records',
                            csv: 'CSV: name,nameZh,categories,type,preferredUnit,description,targetMuscles',
                            txt: 'TXT: Bench Press,Chest;Triceps,sets,kg',
                        },
                        shift: {
                            label: 'Shift Schedule',
                            short: 'Shifts and tags',
                            csv: 'CSV: date,shifts,pays,others,note',
                            txt: 'TXT: 2026-04-29 | shifts=Early | pays=Salary | others=Holiday | note=Morning',
                        },
                    },
                },
            },
        },
    };

    function _readLang() {
        try {
            return JSON.parse(localStorage.getItem('todo_settings') || '{}').lang || 'zh';
        } catch (_) {
            return 'zh';
        }
    }

    function _get(obj, path) {
        return path.split('.').reduce((cur, key) => cur && cur[key], obj);
    }

    function _format(text, params) {
        if (typeof text !== 'string') return text;
        return String(text).replace(/\{(\w+)\}/g, (_, key) =>
            params && params[key] !== undefined ? params[key] : `{${key}}`
        );
    }

    let currentLang = _readLang();

    function t(key, params, lang) {
        const useLang = lang || currentLang || 'zh';
        const value = _get(messages[useLang], key) || _get(messages.zh, key) || key;
        return _format(value, params);
    }

    function setLang(lang) {
        currentLang = messages[lang] ? lang : 'zh';
        window.dispatchEvent(new CustomEvent('lapis:i18n-change', { detail: { lang: currentLang } }));
    }

    function getLang() {
        return currentLang;
    }

    function use(state) {
        return (key, params) => t(key, params, state && state.lang);
    }

    function register(lang, entries) {
        messages[lang] = { ...(messages[lang] || {}), ...entries };
    }

    global.LapisI18n = { t, setLang, getLang, use, register, messages };
})(window);
