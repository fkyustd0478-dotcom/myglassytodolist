// holidays.js — Taiwan Public Holidays + Lunar Calendar

// ── Taiwan Public Holidays 2025–2027 ─────────────────────────────────────────
const TAIWAN_HOLIDAYS = {
    // 2025
    '2025-01-01': '元旦',
    '2025-01-28': '除夕',
    '2025-01-29': '春節',
    '2025-01-30': '春節',
    '2025-01-31': '春節',
    '2025-02-28': '和平紀念日',
    '2025-04-04': '兒童節',
    '2025-04-05': '清明節',
    '2025-05-01': '勞動節',
    '2025-05-31': '端午節',
    '2025-10-06': '中秋節',
    '2025-10-10': '國慶日',
    // 2026
    '2026-01-01': '元旦',
    '2026-02-16': '除夕',
    '2026-02-17': '春節',
    '2026-02-18': '春節',
    '2026-02-19': '春節',
    '2026-02-28': '和平紀念日',
    '2026-04-04': '兒童節',
    '2026-04-05': '清明節',
    '2026-05-01': '勞動節',
    '2026-06-19': '端午節',
    '2026-09-25': '中秋節',
    '2026-10-10': '國慶日',
    // 2027
    '2027-01-01': '元旦',
    '2027-02-05': '除夕',
    '2027-02-06': '春節',
    '2027-02-07': '春節',
    '2027-02-08': '春節',
    '2027-02-28': '和平紀念日',
    '2027-04-04': '兒童節',
    '2027-04-05': '清明節',
    '2027-05-01': '勞動節',
    '2027-06-08': '端午節',
    '2027-09-14': '中秋節',
    '2027-10-10': '國慶日',
};

// ── Lunar Calendar (pre-computed month start dates, 2024–2028) ────────────────
// Each entry: { y: lunarYear, m: monthNumber (negative = leap month), d: 'YYYY-MM-DD' }
// Cross-checks verified:
//   2025 Dragon Boat May 31 = 五月初五 (五月 starts May 27) ✓
//   2025 Mid-Autumn Oct 6   = 八月十五 (八月 starts Sep 22) ✓
//   2026 Dragon Boat Jun 19 = 五月初五 (五月 starts Jun 15) ✓
//   2026 Mid-Autumn Sep 25  = 八月十五 (八月 starts Sep 11) ✓
//   2027 Dragon Boat Jun 8  = 五月初五 (五月 starts Jun 4)  ✓
//   2027 Mid-Autumn Sep 14  = 八月十五 (八月 starts Aug 31) ✓
const LunarCalendar = (() => {
    const MONTHS = [
        // 2024 — Year of Dragon (no leap month)
        { y: 2024, m:  1, d: '2024-02-10' },
        { y: 2024, m:  2, d: '2024-03-10' },
        { y: 2024, m:  3, d: '2024-04-09' },
        { y: 2024, m:  4, d: '2024-05-08' },
        { y: 2024, m:  5, d: '2024-06-06' },
        { y: 2024, m:  6, d: '2024-07-06' },
        { y: 2024, m:  7, d: '2024-08-04' },
        { y: 2024, m:  8, d: '2024-09-03' },
        { y: 2024, m:  9, d: '2024-10-03' },
        { y: 2024, m: 10, d: '2024-11-01' },
        { y: 2024, m: 11, d: '2024-12-01' },
        { y: 2024, m: 12, d: '2024-12-30' },
        // 2025 — Year of Snake (閏六月 leap month 6)
        { y: 2025, m:  1, d: '2025-01-29' },
        { y: 2025, m:  2, d: '2025-02-28' },
        { y: 2025, m:  3, d: '2025-03-29' },
        { y: 2025, m:  4, d: '2025-04-28' },
        { y: 2025, m:  5, d: '2025-05-27' },
        { y: 2025, m:  6, d: '2025-06-25' },
        { y: 2025, m: -6, d: '2025-07-25' },  // 閏六月
        { y: 2025, m:  7, d: '2025-08-23' },
        { y: 2025, m:  8, d: '2025-09-22' },
        { y: 2025, m:  9, d: '2025-10-21' },
        { y: 2025, m: 10, d: '2025-11-20' },
        { y: 2025, m: 11, d: '2025-12-19' },
        { y: 2025, m: 12, d: '2026-01-18' },
        // 2026 — Year of Horse (no leap month)
        { y: 2026, m:  1, d: '2026-02-17' },
        { y: 2026, m:  2, d: '2026-03-19' },
        { y: 2026, m:  3, d: '2026-04-17' },
        { y: 2026, m:  4, d: '2026-05-17' },
        { y: 2026, m:  5, d: '2026-06-15' },
        { y: 2026, m:  6, d: '2026-07-15' },
        { y: 2026, m:  7, d: '2026-08-13' },
        { y: 2026, m:  8, d: '2026-09-11' },
        { y: 2026, m:  9, d: '2026-10-11' },
        { y: 2026, m: 10, d: '2026-11-09' },
        { y: 2026, m: 11, d: '2026-12-09' },
        { y: 2026, m: 12, d: '2027-01-08' },
        // 2027 — Year of Goat (no leap month)
        { y: 2027, m:  1, d: '2027-02-06' },
        { y: 2027, m:  2, d: '2027-03-08' },
        { y: 2027, m:  3, d: '2027-04-06' },
        { y: 2027, m:  4, d: '2027-05-06' },
        { y: 2027, m:  5, d: '2027-06-04' },
        { y: 2027, m:  6, d: '2027-07-04' },
        { y: 2027, m:  7, d: '2027-08-02' },
        { y: 2027, m:  8, d: '2027-08-31' },
        { y: 2027, m:  9, d: '2027-09-30' },
        { y: 2027, m: 10, d: '2027-10-29' },
        { y: 2027, m: 11, d: '2027-11-28' },
        { y: 2027, m: 12, d: '2027-12-28' },
        // 2028 boundary
        { y: 2028, m:  1, d: '2028-01-26' },
    ];

    const CJK_DAYS = [
        '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
        '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
        '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'
    ];
    const CJK_MONTHS = [
        '正月','二月','三月','四月','五月','六月',
        '七月','八月','九月','十月','十一月','十二月'
    ];

    function getLunarDate(dateStr) {
        const target = new Date(dateStr + 'T00:00:00');
        let entry = null;
        for (let i = MONTHS.length - 1; i >= 0; i--) {
            if (new Date(MONTHS[i].d + 'T00:00:00') <= target) {
                entry = MONTHS[i];
                break;
            }
        }
        if (!entry) return null;
        const day = Math.round((target - new Date(entry.d + 'T00:00:00')) / 86400000) + 1;
        return { year: entry.y, month: Math.abs(entry.m), day, isLeap: entry.m < 0 };
    }

    // Short label for calendar grid: month name on 初一, day label otherwise
    function gridLabel(dateStr) {
        const r = getLunarDate(dateStr);
        if (!r) return '';
        if (r.day === 1) return (r.isLeap ? '閏' : '') + CJK_MONTHS[r.month - 1];
        return CJK_DAYS[r.day - 1];
    }

    // Full label for detail modal: 農曆 正月初一
    function fullLabel(dateStr) {
        const r = getLunarDate(dateStr);
        if (!r) return '';
        return '農曆 ' + (r.isLeap ? '閏' : '') + CJK_MONTHS[r.month - 1] + CJK_DAYS[r.day - 1];
    }

    return { getLunarDate, gridLabel, fullLabel };
})();
