// workout_data.js — Glassy Workout shared constants & defaults
'use strict';

const _wUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const LIBRARY_KEY    = 'lapis_workout_library';
const METRICS_KEY    = 'lapis_workout_metrics';
const CATEGORIES_KEY = 'lapis_workout_categories';

const _MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const _MONTHS_ZH = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

const _catColors = [
    { background:'rgba(239,68,68,0.18)',  color:'#ef4444', border:'1px solid rgba(239,68,68,0.35)'   },
    { background:'rgba(59,130,246,0.18)', color:'#3b82f6', border:'1px solid rgba(59,130,246,0.35)'  },
    { background:'rgba(168,85,247,0.18)', color:'#a855f7', border:'1px solid rgba(168,85,247,0.35)'  },
    { background:'rgba(245,158,11,0.18)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.35)'  },
    { background:'rgba(34,197,94,0.18)',  color:'#22c55e', border:'1px solid rgba(34,197,94,0.35)'   },
    { background:'rgba(20,184,166,0.18)', color:'#14b8a6', border:'1px solid rgba(20,184,166,0.35)'  },
    { background:'rgba(249,115,22,0.18)', color:'#f97316', border:'1px solid rgba(249,115,22,0.35)'  },
    { background:'rgba(236,72,153,0.18)', color:'#ec4899', border:'1px solid rgba(236,72,153,0.35)'  },
];

const _catLabels = {
    Bodybuilding: '健美',
    Push: '推', Pull: '拉', Legs: '腿部', Core: '核心',
    Cardio: '有氧', Back: '背部', Chest: '胸部', Shoulders: '肩部', Arms: '手臂'
};

const _defaultExercises = () => [
    { id: _wUid(), name: 'Bench Press',    nameZh: '槓鈴臥推',   categories: ['Chest'],        type: 'sets',     preferredUnit: 'kg', description: '', targetMuscles: 'Pectoralis Major, Triceps, Anterior Deltoid' },
    { id: _wUid(), name: 'Squat',          nameZh: '深蹲',       categories: ['Quads','Legs'], type: 'sets',     preferredUnit: 'kg', description: '', targetMuscles: 'Quadriceps, Glutes, Hamstrings' },
    { id: _wUid(), name: 'Deadlift',       nameZh: '硬舉',       categories: ['Back','Legs'],  type: 'sets',     preferredUnit: 'kg', description: '', targetMuscles: 'Erector Spinae, Glutes, Hamstrings' },
    { id: _wUid(), name: 'Pull-up',        nameZh: '引體向上',   categories: ['Back'],         type: 'sets',     preferredUnit: 'kg', description: '', targetMuscles: 'Latissimus Dorsi, Biceps' },
    { id: _wUid(), name: 'Overhead Press', nameZh: '肩推',       categories: ['Shoulders'],    type: 'sets',     preferredUnit: 'kg', description: '', targetMuscles: 'Deltoids, Triceps' },
    { id: _wUid(), name: 'Barbell Row',    nameZh: '槓鈴划船',   categories: ['Back'],         type: 'sets',     preferredUnit: 'kg', description: '', targetMuscles: 'Latissimus Dorsi, Rhomboids, Biceps' },
    { id: _wUid(), name: 'Bicep Curl',     nameZh: '二頭彎舉',   categories: ['Biceps'],       type: 'sets',     preferredUnit: 'kg', description: '', targetMuscles: 'Biceps Brachii' },
    { id: _wUid(), name: 'Tricep Dip',     nameZh: '三頭撐',     categories: ['Triceps'],      type: 'sets',     preferredUnit: 'kg', description: '', targetMuscles: 'Triceps Brachii' },
    { id: _wUid(), name: 'Lateral Raise',  nameZh: '啞鈴側平舉', categories: ['Side Delt'],    type: 'sets',     preferredUnit: 'g',  description: '', targetMuscles: 'Lateral Deltoid' },
    { id: _wUid(), name: 'Leg Press',      nameZh: '腿推',       categories: ['Quads'],        type: 'sets',     preferredUnit: 'kg', description: '', targetMuscles: 'Quadriceps, Glutes' },
    { id: _wUid(), name: 'Plank',          nameZh: '棒式',       categories: ['Abs'],          type: 'duration',                      description: '', targetMuscles: 'Core, Abdominals' },
    { id: _wUid(), name: 'Running',        nameZh: '跑步機',     categories: ['Running'],      type: 'duration',                      description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Cycling',        nameZh: '騎單車',     categories: ['Cycling'],      type: 'duration',                      description: '', targetMuscles: '' },
    // Snatch
    { id: _wUid(), name: 'Hang Power Snatch',          nameZh: '膝位高抓',       categories: ['Hang','Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Hang Snatch',                nameZh: '膝位抓',           categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Panda Pull',                 nameZh: '寬速拉',           categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Hang Snatch High Pull',      nameZh: '膝位高拉',         categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Low Hang Power Snatch',      nameZh: '膝下高抓',       categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Low Hang Snatch',            nameZh: '膝下抓',           categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Low Panda Pull',             nameZh: '膝下寬速拉',       categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Low Hang Snatch High Pull',  nameZh: '膝下高拉',         categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Dip Power Snatch',           nameZh: '拋高抓',       categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Dip Snatch',                 nameZh: '拋抓',           categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Tall Snatch',                nameZh: '直接抓',           categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Dip Snatch High Pull',       nameZh: '寬拋高拉',         categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Power Snatch',               nameZh: '高抓',           categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Snatch',                     nameZh: '抓舉',               categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Muscle Snatch',              nameZh: '發力直抓',           categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'No Contact Muscle Snatch',   nameZh: '直抓',     categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Snatch Deadlift',            nameZh: '寬硬舉',         categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Snatch Deadlift and Pull',   nameZh: '寬硬舉聳肩拉',     categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'No Feet Power Snatch',       nameZh: '不分腿高抓',       categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'No Feet Snatch',             nameZh: '不分腿抓舉',           categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'No Contact Power Snatch',    nameZh: '不發力高抓',     categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Box Power Snatch',           nameZh: '箱上高抓',       categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Box Snatch',                 nameZh: '箱上抓',           categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Box Panda Pull',             nameZh: '箱上寬速拉',       categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Box Snatch High Pull',       nameZh: '箱上寬高拉',         categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Box Snatch Deadlift',        nameZh: '箱上寬硬舉',     categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Block Power Snatch',         nameZh: '墊上高抓',       categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Block Snatch',               nameZh: '墊上抓舉',           categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Block Snatch Deadlift',      nameZh: '墊上寬硬舉',     categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Snatch Balance',             nameZh: '寬支撐蹲',           categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Snatch Push Press',          nameZh: '寬借力推',         categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Drop Snatch',                nameZh: '下蹲抓',           categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Snatch Press',               nameZh: '寬頸後推',         categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Snatch Press in Middle Grip',nameZh: '中握頸後推',       categories: ['Snatch'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    // Clean&Jerk
    { id: _wUid(), name: 'Hang Power Clean',           nameZh: '膝位高上搏',     categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Hang Clean',                 nameZh: '膝位上搏',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Hang Clean High Pull',       nameZh: '膝位高拉',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Hang Clean Panda Pull',      nameZh: '膝位窄速拉',       categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Low Hang Power Clean',       nameZh: '膝下高上搏',     categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Low Hang Clean',             nameZh: '膝下上搏',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Low Hang Clean High Pull',   nameZh: '膝下高拉',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Low Hang Clean Panda Pull',  nameZh: '膝下窄速拉',       categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Dip Power Clean',            nameZh: '拋高上搏',     categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Dip Clean',                  nameZh: '拋上搏',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Tall Clean',                 nameZh: '直接翻',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Dip Clean High Pull',        nameZh: '窄拋拉',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Power Clean',                nameZh: '高上搏',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Clean',                      nameZh: '上搏',             categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Deadlift',                   nameZh: '硬舉',             categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Deadlift and Pull',          nameZh: '硬舉聳肩拉',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'No Feet Power Clean',        nameZh: '不分腿高上搏',     categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'No Feet Clean',              nameZh: '不分腿上搏',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Muscle Clean',               nameZh: '發力直接上搏',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'No Contact Muscle Clean',    nameZh: '直接上搏',   categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Box Power Clean',            nameZh: '箱上高上搏',     categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Box Clean',                  nameZh: '箱上上搏',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Box Clean High Pull',        nameZh: '箱上高拉',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Box Clean Panda Pull',       nameZh: '箱上窄速拉',       categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Box Deadlift',               nameZh: '箱上硬舉',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Block Power Clean',          nameZh: '墊上高上搏',     categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Block Clean',                nameZh: '墊上上搏',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Block Deadlift',             nameZh: '墊上硬舉',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Clean & Jerk',               nameZh: '挺舉',             categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Rack Jerk',                  nameZh: '架上挺',           categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Behind the Neck Jerk',       nameZh: '架後挺',           categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Push Jerk',                  nameZh: '半挺',           categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Power Jerk',                 nameZh: '力量半挺',           categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Squat Jerk',                 nameZh: '全蹲挺',             categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Push Press',                 nameZh: '借力推',             categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Military Press',             nameZh: '肩推',         categories: ['Clean&Jerk'], type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    // Squat
    { id: _wUid(), name: 'Front Squat',                nameZh: '前蹲',             categories: ['Squat'],      type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Back Squat',                 nameZh: '後蹲',             categories: ['Squat'],      type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Narrow-Stance Back Squat',   nameZh: '窄站後蹲',         categories: ['Squat'],      type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Overhead Squat',             nameZh: '過頭深蹲',           categories: ['Squat'],      type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Barbell Split Squat',        nameZh: '弓箭步單腿蹲',       categories: ['Squat'],      type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    // WL Back
    { id: _wUid(), name: 'Good Morning',               nameZh: '早安式',           categories: ['WL Back'],    type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Chin-up',                    nameZh: '反握引體向上',     categories: ['WL Back'],    type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Weighted Pull-up',           nameZh: '負重引體向上',     categories: ['WL Back'],    type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Bent-over Row',              nameZh: '屈體划船',         categories: ['WL Back'],    type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Dumbbell Row',               nameZh: '啞鈴划船',         categories: ['WL Back'],    type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    // WL Legs
    { id: _wUid(), name: 'Romanian Deadlift',          nameZh: '羅馬尼亞硬舉',     categories: ['WL Legs'],    type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    // Bodybuilding Back (new)
    { id: _wUid(), name: 'Face Pull',                  nameZh: '臉拉',         categories: ['Back'],       type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Lat Pulldown',               nameZh: '滑輪下拉',         categories: ['Back'],       type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Wide Grip Lat Pulldown',     nameZh: '寬握滑輪下拉',     categories: ['Back'],       type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Close Grip Lat Pulldown',    nameZh: '窄握滑輪下拉',     categories: ['Back'],       type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Reverse Grip Lat Pulldown',  nameZh: '反握滑輪下拉',     categories: ['Back'],       type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
    { id: _wUid(), name: 'Cable Pull-over',            nameZh: '直臂下壓',     categories: ['Back'],       type: 'sets', preferredUnit: 'kg', description: '', targetMuscles: '' },
];

const _defaultWorkoutData = () => ({
    version: 1,
    categories: ['Bodybuilding', 'Cardio', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'],
    logs: []
});

const _defaultCategoryTree = () => [
    { id: _wUid(), name: 'Bodybuilding', nameZh: '健美', children: [
        { id: _wUid(), name: 'Chest', nameZh: '胸部', children: [
            { id: _wUid(), name: 'Upper Chest', nameZh: '上胸', children: [] },
            { id: _wUid(), name: 'Lower Chest', nameZh: '下胸', children: [] },
        ]},
        { id: _wUid(), name: 'Back', nameZh: '背部', children: [
            { id: _wUid(), name: 'Upper Back', nameZh: '上背', children: [] },
            { id: _wUid(), name: 'Lower Back', nameZh: '下背', children: [] },
        ]},
        { id: _wUid(), name: 'Shoulders', nameZh: '肩部', children: [
            { id: _wUid(), name: 'Front Delt', nameZh: '前三角', children: [] },
            { id: _wUid(), name: 'Side Delt',  nameZh: '側三角', children: [] },
        ]},
        { id: _wUid(), name: 'Arms', nameZh: '手臂', children: [
            { id: _wUid(), name: 'Biceps',  nameZh: '二頭肌', children: [] },
            { id: _wUid(), name: 'Triceps', nameZh: '三頭肌', children: [] },
        ]},
        { id: _wUid(), name: 'Legs', nameZh: '腿部', children: [
            { id: _wUid(), name: 'Quads',      nameZh: '股四頭肌', children: [] },
            { id: _wUid(), name: 'Hamstrings', nameZh: '大腿後側', children: [] },
            { id: _wUid(), name: 'Glutes',     nameZh: '臀部',     children: [] },
            { id: _wUid(), name: 'Calves',     nameZh: '小腿',     children: [] },
        ]},
        { id: _wUid(), name: 'Core', nameZh: '核心', children: [
            { id: _wUid(), name: 'Abs', nameZh: '腹部', children: [] },
        ]},
    ]},
    { id: _wUid(), name: 'Cardio', nameZh: '有氧', children: [
        { id: _wUid(), name: 'Running', nameZh: '跑步', children: [] },
        { id: _wUid(), name: 'Cycling', nameZh: '騎車', children: [] },
    ]},
    { id: _wUid(), name: 'Weightlifting', nameZh: '舉重', children: [
        { id: _wUid(), name: 'Snatch', nameZh: '抓舉', children: [
            { id: _wUid(), name: 'Hang',     nameZh: '膝位', children: [] },
            { id: _wUid(), name: 'Low Hang', nameZh: '膝下', children: [] },
            { id: _wUid(), name: 'Dip',      nameZh: '拋位', children: [] },
            { id: _wUid(), name: 'Floor',    nameZh: '地板', children: [] },
            { id: _wUid(), name: 'Box',      nameZh: '箱上', children: [] },
            { id: _wUid(), name: 'Block',    nameZh: '墊上', children: [] },
            { id: _wUid(), name: 'Rack',     nameZh: '架上', children: [] },
        ]},
        { id: _wUid(), name: 'Clean&Jerk', nameZh: '挺舉', children: [
            { id: _wUid(), name: 'Hang',     nameZh: '膝位', children: [] },
            { id: _wUid(), name: 'Low Hang', nameZh: '膝下', children: [] },
            { id: _wUid(), name: 'Dip',      nameZh: '拋位', children: [] },
            { id: _wUid(), name: 'Floor',    nameZh: '地板', children: [] },
            { id: _wUid(), name: 'Box',      nameZh: '箱上', children: [] },
            { id: _wUid(), name: 'Block',    nameZh: '墊上', children: [] },
            { id: _wUid(), name: 'Jerk',     nameZh: '挺',   children: [] },
        ]},
        { id: _wUid(), name: 'Squat',    nameZh: '深蹲', children: [] },
        { id: _wUid(), name: 'WL Other', nameZh: '其他', children: [
            { id: _wUid(), name: 'WL Back', nameZh: '背部', children: [] },
            { id: _wUid(), name: 'WL Legs', nameZh: '腿部', children: [] },
        ]},
    ]},
];

const _wT = {
    zh: {
        navIndex: '琉璃待辦', navShift: '琉璃輪班', navSetting: '系統設定', navWorkout: '琉璃健身',
        tabAdd: '新增', tabExercises: '動作庫', tabRecords: '紀錄', tabSettings: '設定',
        date: '日期', time: '時間', today: '今天',
        setsReps: '組數 / 次數', duration: '時間',
        weight: '重量', reps: '次數', sets: '組', minutes: '分鐘', min: 'min', kg: 'kg',
        startWorkout: '開始訓練', workoutLog: '訓練紀錄',
        addExercise: '新增訓練動作', saveLog: '儲存訓練紀錄',
        noExercises: '尚未記錄任何動作', noLogs: '尚無訓練紀錄', noLibrary: '動作庫為空',
        search: '搜尋動作…', all: '全部',
        edit: '編輯', delete: '刪除', save: '儲存', cancel: '取消', confirm: '確認',
        addToLibrary: '新增至動作庫', editExercise: '編輯訓練動作',
        exerciseNameEn: '動作名稱（英文）', exerciseNameZh: '動作名稱（中文，選填）',
        description: '動作描述', targetMuscles: '目標肌群',
        selectCategories: '選擇類別（可複選）', trackingType: '紀錄方式',
        addSet: '新增組數', selectExercise: '選擇動作',
        existingLog: '此日期已有訓練紀錄，儲存將會覆蓋。', pickExercise: '選擇訓練動作',
        deleteConfirm: '確定要刪除嗎？此操作無法復原。',
        clearData: '清除所有訓練資料', clearConfirm: '確定要清除所有訓練資料嗎？此操作無法復原。',
        lang: '語言', langZh: '繁體中文', langEn: 'English',
        statsTitle: '訓練統計', totalWorkouts: '累計訓練次數', thisWeek: '本週訓練',
        totalVolume: '累計訓練量', favExercise: '最常訓練', times: '次', kg_unit: 'kg',
        logSaved: '訓練紀錄已儲存！', logDeleted: '紀錄已刪除',
        exerciseCount: '動作', sets_unit: '組',
        unit: '單位', about: '關於', version: '版本 1.0',
        manageCategories: '管理類別',
        addL1: '新增主分支', addL2: '新增子分支', addL3: '新增末端',
        catName: '類別名稱（英文）', catNameZh: '類別名稱（中文）',
        tabToday: '今天', tabHistory: '歷史', tabBin: '回收桶',
        completed: '已完成', pending: '進行中',
        restore: '還原', permanentDelete: '永久刪除',
        noTodaySessions: '今天沒有訓練紀錄', noHistorySessions: '沒有歷史紀錄',
        noBinSessions: '回收桶是空的', newSession: '新增訓練',
        editSession: '編輯訓練', discardConfirm: '確定要放棄未儲存的變更嗎？',
        moreEx: '項', restoreMsg: '已還原', tabWorkout: '訓練',
        weightLog: '體重', personalBests: '個人最佳',
        noWeightLog: '尚無體重紀錄', noPBs: '尚無個人最佳',
        progressHistory: '進展歷史',
        charts: '訓練圖表', snapToday: '回今天', noChartData: '尚無資料',
        chartWeight: '體重趨勢 (kg)',
        weightHistory: '體重記錄', weightDeleteConfirm: '確定要刪除此體重紀錄嗎？',
        sortNewest: '最新', sortOldest: '最舊', sortHeaviest: '最重', sortLightest: '最輕',
        noWeightInMonth: '本月無紀錄',
        superset: '組合訓練',
        supersetAdd: '+ 新增動作至組合',
        supersetRounds: '總輪數',
        supersetPickTitle: '選擇組合動作',
        supersetCommit: '加入訓練',
        supersetPlaceholder: '選擇動作...',
        supersetSearchPlaceholder: '搜尋動作...',
        supersetBtn: '組合訓練',
        rounds: '輪',
    },
    en: {
        navIndex: 'Glassy Todo', navShift: 'Glassy Shift', navSetting: 'Settings', navWorkout: 'Glassy Workout',
        tabAdd: 'Add', tabExercises: 'Exercises', tabRecords: 'Records', tabSettings: 'Settings',
        date: 'Date', time: 'Time', today: 'Today',
        setsReps: 'Sets / Reps', duration: 'Duration',
        weight: 'Weight', reps: 'Reps', sets: 'Set', minutes: 'Minutes', min: 'min', kg: 'kg',
        startWorkout: 'Start Workout', workoutLog: 'Workout Log',
        addExercise: 'Add Exercise', saveLog: 'Save Workout Log',
        noExercises: 'No exercises logged yet', noLogs: 'No workout records yet', noLibrary: 'Library is empty',
        search: 'Search exercises…', all: 'All',
        edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel', confirm: 'Confirm',
        addToLibrary: 'Add to Library', editExercise: 'Edit Exercise',
        exerciseNameEn: 'Exercise Name (English)', exerciseNameZh: 'Exercise Name (Chinese, optional)',
        description: 'Description', targetMuscles: 'Target Muscles',
        selectCategories: 'Select Categories (multi-select)', trackingType: 'Tracking Type',
        addSet: 'Add Set', selectExercise: 'Select Exercise',
        existingLog: 'A log exists for this date. Saving will overwrite it.', pickExercise: 'Pick Exercise',
        deleteConfirm: 'Confirm delete? This cannot be undone.',
        clearData: 'Clear All Workout Data', clearConfirm: 'Clear all workout data? This cannot be undone.',
        lang: 'Language', langZh: '繁體中文', langEn: 'English',
        statsTitle: 'Workout Stats', totalWorkouts: 'Total Workouts', thisWeek: 'This Week',
        totalVolume: 'Total Volume', favExercise: 'Favorite Exercise', times: 'times', kg_unit: 'kg',
        logSaved: 'Workout saved!', logDeleted: 'Record deleted',
        exerciseCount: 'exercises', sets_unit: 'sets',
        unit: 'Unit', about: 'About', version: 'Version 1.0',
        manageCategories: 'Manage Categories',
        addL1: 'Add Branch', addL2: 'Add Sub-branch', addL3: 'Add Leaf',
        catName: 'Category Name (EN)', catNameZh: 'Category Name (ZH)',
        tabToday: 'Today', tabHistory: 'History', tabBin: 'Bin',
        completed: 'Completed', pending: 'Pending',
        restore: 'Restore', permanentDelete: 'Permanently Delete',
        noTodaySessions: 'No sessions today', noHistorySessions: 'No history yet',
        noBinSessions: 'Recycle bin is empty', newSession: 'New Session',
        editSession: 'Edit Session', discardConfirm: 'Discard unsaved changes?',
        moreEx: 'more', restoreMsg: 'Session restored', tabWorkout: 'Workout',
        weightLog: 'Weight', personalBests: 'Personal Bests',
        noWeightLog: 'No weight entries yet', noPBs: 'No personal bests yet',
        charts: 'Charts', snapToday: 'Today', noChartData: 'No data yet',
        chartWeight: 'Body Weight (kg)',
        progressHistory: 'Progress History',
        weightHistory: 'Weight History', weightDeleteConfirm: 'Delete this weight entry?',
        sortNewest: 'Newest', sortOldest: 'Oldest', sortHeaviest: 'Heaviest', sortLightest: 'Lightest',
        noWeightInMonth: 'No entries this month',
        superset: 'Superset',
        supersetAdd: '+ Add Exercise',
        supersetRounds: 'Total Rounds',
        supersetPickTitle: 'Pick Superset Exercise',
        supersetCommit: 'Add to Log',
        supersetPlaceholder: 'Select exercise...',
        supersetSearchPlaceholder: 'Search exercises...',
        supersetBtn: 'Superset',
        rounds: 'rounds',
    }
};

if (typeof LapisI18n !== 'undefined') {
    LapisI18n.register('zh', { workout: _wT.zh });
    LapisI18n.register('en', { workout: _wT.en });
}

const WORKOUT_TRANSLATION_KEYS = Object.keys(_wT.zh);

function getWorkoutTranslations(lang) {
    const fallback = _wT[lang] || _wT.zh;
    if (typeof LapisI18n === 'undefined') return fallback;

    return WORKOUT_TRANSLATION_KEYS.reduce((dict, key) => {
        const i18nKey = `workout.${key}`;
        const value = LapisI18n.t(i18nKey, null, lang);
        dict[key] = value === i18nKey ? fallback[key] : value;
        return dict;
    }, {});
}

// ── Static SVG icon constants (no Lucide runtime dependency) ─────────────────
const ICON_CHECK       = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_EDIT        = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`;
const ICON_TRASH       = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
const ICON_RESTORE     = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
const ICON_X           = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_CALENDAR    = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
const ICON_CLOCK       = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const ICON_DUMBBELL    = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v16"/><path d="M18 4v16"/><path d="M6 8h12"/><path d="M6 16h12"/><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h.5"/><path d="M3 17.5A1.5 1.5 0 0 0 4.5 19h.5"/><path d="M21 6.5A1.5 1.5 0 0 0 19.5 5h-.5"/><path d="M21 17.5A1.5 1.5 0 0 1 19.5 19h-.5"/></svg>`;
const ICON_TIMER       = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const ICON_CIRCLE      = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
const ICON_MINUS       = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_SEARCH      = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
const ICON_PLUS        = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const ICON_PLUS_CIRCLE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
