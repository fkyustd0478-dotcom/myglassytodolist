'use strict';

window.LapisDataPortability = (() => {
    const KEYS = {
        todo: 'todo_data',
        workoutLibrary: 'lapis_workout_library',
        weight: 'lapis_workout_metrics',
        shiftData: 'glassy_shift_data',
        shiftSettings: 'glassy_shift_settings',
    };

    const TYPES = {
        todo: {
            label: 'Todo',
            csvHeader: ['text', 'dueDate', 'dueTime', 'category', 'listName', 'completed'],
            txtHint: 'Task A,2026-04-29',
        },
        weight: {
            label: 'Weight',
            csvHeader: ['date', 'weight', 'unit'],
            txtHint: '2026-04-29,70.5,kg',
        },
        workoutLibrary: {
            label: 'Workout Library',
            csvHeader: ['name', 'nameZh', 'categories', 'type', 'preferredUnit', 'description', 'targetMuscles'],
            txtHint: 'Bench Press,槓鈴臥推,sets,kg,Chest:Triceps',
        },
        shift: {
            label: 'Shift',
            csvHeader: ['date', 'shifts', 'pays', 'others', 'note'],
            txtHint: '2026-05-01,早班',
        },
    };

    const SHIFT_TAG_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#14b8a6', '#ec4899'];

    function _uid(prefix) {
        return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    }

    function _readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (_) {
            return fallback;
        }
    }

    function _writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function _isDate(value) {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
    }

    function _dateMs(date) {
        return new Date(`${date}T00:00:00`).getTime();
    }

    function _bool(value) {
        const v = String(value || '').trim().toLowerCase();
        return ['true', '1', 'yes', 'y', 'done', 'completed'].includes(v);
    }

    function _splitList(value) {
        return String(value || '')
            .split(';')
            .map(v => v.trim())
            .filter(Boolean);
    }

    function _splitCategoryPath(value) {
        return String(value || '')
            .split(':')
            .map(v => v.trim())
            .filter(Boolean);
    }

    function _normalizeExerciseType(value) {
        const v = String(value || '').trim().toLowerCase();
        return v === 'time' || v === 'duration' ? 'duration' : 'sets';
    }

    function _nextShiftColor(index) {
        return SHIFT_TAG_COLORS[index % SHIFT_TAG_COLORS.length];
    }

    function _escapeCsv(value) {
        const s = String(value ?? '');
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }

    function _csvLine(values) {
        return values.map(_escapeCsv).join(',');
    }

    function _parseCsvLine(line) {
        const out = [];
        let cur = '';
        let quoted = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            const next = line[i + 1];
            if (ch === '"' && quoted && next === '"') {
                cur += '"';
                i++;
            } else if (ch === '"') {
                quoted = !quoted;
            } else if (ch === ',' && !quoted) {
                out.push(cur.trim());
                cur = '';
            } else {
                cur += ch;
            }
        }
        out.push(cur.trim());
        return out;
    }

    function _detectFormat(type, text) {
        const trimmed = String(text || '').trim();
        if (!trimmed) throw new Error('Import file is empty.');
        if (trimmed[0] === '{' || trimmed[0] === '[') return 'json';
        const first = trimmed.split(/\r?\n/).find(Boolean) || '';
        if (first.includes(',')) {
            const cells = _parseCsvLine(first).map(v => v.trim());
            const header = TYPES[type]?.csvHeader || [];
            if (cells.some(cell => header.includes(cell))) return 'csv';
        }
        return 'txt';
    }

    function _rowsFromCsv(text) {
        const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (!lines.length) throw new Error('CSV has no rows.');
        const header = _parseCsvLine(lines[0]).map(h => h.trim());
        return lines.slice(1).map(line => {
            const cells = _parseCsvLine(line);
            return header.reduce((row, key, i) => {
                row[key] = cells[i] || '';
                return row;
            }, {});
        });
    }

    function _rowsFromTxt(type, text, options = {}) {
        const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (!lines.length) throw new Error('TXT has no rows.');
        if (type === 'shift') {
            return lines.map(line => {
                if (!line.includes('|')) {
                    const cells = _parseCsvLine(line);
                    const row = { date: cells[0] };
                    if (options.shiftImportKind === 'misc') row.others = cells[1];
                    else row.shifts = cells[1];
                    return row;
                }
                const row = {};
                line.split('|').map(p => p.trim()).forEach((part, i) => {
                    if (i === 0 && _isDate(part)) row.date = part;
                    const eq = part.indexOf('=');
                    if (eq > -1) row[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
                });
                return row;
            });
        }
        return lines.map(line => {
            const cells = _parseCsvLine(line);
            if (type === 'todo') {
                return { text: cells[0], dueDate: cells[1], dueTime: cells[2], category: cells[3] };
            }
            if (type === 'weight') {
                return { date: cells[0], weight: cells[1], unit: cells[2] };
            }
            return {
                name: cells[0],
                nameZh: cells[1],
                type: _normalizeExerciseType(cells[2]),
                preferredUnit: cells[3],
                categories: _splitCategoryPath(cells[4]),
            };
        });
    }

    function _rows(type, format, text, options = {}) {
        if (format === 'json') return JSON.parse(text);
        return format === 'csv' ? _rowsFromCsv(text) : _rowsFromTxt(type, text, options);
    }

    function _validateRows(type, rows) {
        if (!Array.isArray(rows)) throw new Error('Import content must contain rows.');
        if (!rows.length) throw new Error('Import content has no data rows.');
        rows.forEach((row, idx) => {
            const n = idx + 1;
            if (type === 'todo') {
                if (!row.text || !String(row.text).trim()) throw new Error(`Row ${n}: task text is required.`);
                if (row.dueDate && !_isDate(row.dueDate)) throw new Error(`Row ${n}: dueDate must be YYYY-MM-DD.`);
            }
            if (type === 'weight') {
                if (!_isDate(row.date)) throw new Error(`Row ${n}: date must be YYYY-MM-DD.`);
                if (!(parseFloat(row.weight) > 0)) throw new Error(`Row ${n}: weight must be greater than 0.`);
            }
            if (type === 'workoutLibrary') {
                if (!row.name || !String(row.name).trim()) throw new Error(`Row ${n}: exercise name is required.`);
            }
            if (type === 'shift') {
                if (!_isDate(row.date)) throw new Error(`Row ${n}: date must be YYYY-MM-DD.`);
            }
        });
    }

    function _todoFromRows(rows) {
        const data = _readJson(KEYS.todo, { todos: [], lists: [{ id: 'default', name: 'Default' }] });
        const todos = Array.isArray(data.todos) ? data.todos : [];
        const lists = Array.isArray(data.lists) && data.lists.length ? data.lists : [{ id: 'default', name: 'Default' }];
        let added = 0;

        rows.forEach(row => {
            const listName = String(row.listName || 'Default').trim();
            let list = lists.find(l => String(l.name).toLowerCase() === listName.toLowerCase());
            if (!list) {
                list = { id: _uid('list'), name: listName };
                lists.push(list);
            }
            const date = row.dueDate || '';
            const time = row.dueTime || '';
            const dueDate = date ? `${date}T${time || '00:00'}:00` : '';
            const exists = todos.some(t =>
                t.text === row.text &&
                String(t.dueDate || '').slice(0, 16) === dueDate.slice(0, 16)
            );
            if (exists) return;
            todos.push({
                id: _uid('todo'),
                listId: list.id,
                text: String(row.text).trim(),
                category: row.category || 'normal',
                recurring: row.recurring || 'none',
                dueDate,
                completed: _bool(row.completed),
                isDeleted: false,
                notified: false,
                alertMinutes: Number(row.alertMinutes) || 15,
                updatedAt: new Date().toISOString(),
            });
            added++;
        });

        _writeJson(KEYS.todo, { todos, lists });
        return { added };
    }

    function _weightFromRows(rows) {
        const data = _readJson(KEYS.weight, { weights: [], personalBests: [] });
        const weights = Array.isArray(data.weights) ? data.weights : [];
        let added = 0;
        rows.forEach(row => {
            const weight = parseFloat(row.weight);
            const unit = row.unit || 'kg';
            const exists = weights.some(w => w.date === row.date && Number(w.weight) === weight && (w.unit || 'kg') === unit);
            if (exists) return;
            weights.push({ date: row.date, weight, unit, ts: Number(row.ts) || _dateMs(row.date) });
            added++;
        });
        _writeJson(KEYS.weight, { ...data, weights });
        return { added };
    }

    function _libraryFromRows(rows) {
        const lib = _readJson(KEYS.workoutLibrary, []);
        const exercises = Array.isArray(lib) ? lib : [];
        let added = 0;
        rows.forEach(row => {
            const name = String(row.name).trim();
            const idx = exercises.findIndex(e => String(e.name).toLowerCase() === name.toLowerCase());
            const type = _normalizeExerciseType(row.type);
            const payload = {
                name,
                nameZh: row.nameZh || '',
                categories: Array.isArray(row.categories) ? row.categories : _splitList(row.categories),
                type,
                preferredUnit: type === 'duration' ? undefined : (row.preferredUnit || 'kg'),
                description: row.description || '',
                targetMuscles: row.targetMuscles || '',
            };
            if (idx >= 0) exercises.splice(idx, 1, { ...exercises[idx], ...payload });
            else {
                exercises.push({ id: _uid('ex'), ...payload });
                added++;
            }
        });
        _writeJson(KEYS.workoutLibrary, exercises);
        return { added };
    }

    function _findOrCreateByName(list, name, factory) {
        const trimmed = String(name || '').trim();
        if (!trimmed) return null;
        let item = list.find(x => String(x.name).toLowerCase() === trimmed.toLowerCase());
        if (!item) {
            item = factory(trimmed);
            list.push(item);
        }
        return item;
    }

    function _shiftFromRows(rows) {
        const data = _readJson(KEYS.shiftData, {});
        const settings = _readJson(KEYS.shiftSettings, {});
        settings.shiftTags = Array.isArray(settings.shiftTags) ? settings.shiftTags : [];
        settings.jobs = Array.isArray(settings.jobs) ? settings.jobs : [];
        settings.otherTags = Array.isArray(settings.otherTags) ? settings.otherTags : [];
        let added = 0;

        rows.forEach(row => {
            const date = row.date;
            const day = parseInt(date.slice(8, 10), 10) || 1;
            if (!data[date]) data[date] = { shiftIds: [], payIds: [], otherIds: [] };
            if (!Array.isArray(data[date].shiftIds)) data[date].shiftIds = [];
            if (!Array.isArray(data[date].payIds)) data[date].payIds = [];
            if (!Array.isArray(data[date].otherIds)) data[date].otherIds = [];

            _splitList(row.shifts).forEach(name => {
                const tag = _findOrCreateByName(settings.shiftTags, name, n => ({
                    id: _uid('shift'), name: n, startTime: '08:00', endTime: '17:00',
                    color: _nextShiftColor(settings.shiftTags.length),
                }));
                if (tag && !data[date].shiftIds.includes(tag.id)) data[date].shiftIds.push(tag.id);
            });
            _splitList(row.pays).forEach(name => {
                const job = _findOrCreateByName(settings.jobs, name, n => ({
                    id: _uid('job'), name: n, color: '#6366f1',
                    method: 'monthly', rate: 30000, units: null, payDay: day, holidayLogic: 'early',
                }));
                if (job && !data[date].payIds.includes(job.id)) data[date].payIds.push(job.id);
            });
            _splitList(row.others).forEach(name => {
                const tag = _findOrCreateByName(settings.otherTags, name, n => ({
                    id: _uid('other'), name: n, color: '#a855f7', icon: 'none', startDate: date, endDate: date,
                }));
                if (tag && !data[date].otherIds.includes(tag.id)) data[date].otherIds.push(tag.id);
            });
            if (row.note) data[date].note = row.note;
            added++;
        });

        _writeJson(KEYS.shiftSettings, settings);
        _writeJson(KEYS.shiftData, data);
        return { added };
    }

    function importText(type, text, options = {}) {
        if (!TYPES[type]) throw new Error('Unknown import type.');
        const format = _detectFormat(type, text);
        const parsed = _rows(type, format, text, options);
        const rows = format === 'json'
            ? (type === 'todo' ? (parsed.todos || parsed) : type === 'weight' ? (parsed.weights || parsed) : parsed)
            : parsed;
        _validateRows(type, rows);
        const result = type === 'todo' ? _todoFromRows(rows)
            : type === 'weight' ? _weightFromRows(rows)
            : type === 'workoutLibrary' ? _libraryFromRows(rows)
            : _shiftFromRows(rows);
        return { ...result, format };
    }

    function _exportRows(type) {
        if (type === 'todo') {
            const data = _readJson(KEYS.todo, { todos: [], lists: [] });
            const lists = data.lists || [];
            return (data.todos || []).map(t => ({
                text: t.text,
                dueDate: String(t.dueDate || '').slice(0, 10),
                dueTime: String(t.dueDate || '').slice(11, 16),
                category: t.category || 'normal',
                listName: lists.find(l => l.id === t.listId)?.name || 'Default',
                completed: t.completed ? 'true' : 'false',
            }));
        }
        if (type === 'weight') {
            return (_readJson(KEYS.weight, { weights: [] }).weights || []).map(w => ({
                date: w.date, weight: w.weight, unit: w.unit || 'kg',
            }));
        }
        if (type === 'workoutLibrary') {
            return (_readJson(KEYS.workoutLibrary, []) || []).map(e => ({
                name: e.name, nameZh: e.nameZh || '', categories: (e.categories || []).join(';'),
                type: e.type || 'sets', preferredUnit: e.preferredUnit || '',
                description: e.description || '', targetMuscles: e.targetMuscles || '',
            }));
        }
        const data = _readJson(KEYS.shiftData, {});
        const settings = _readJson(KEYS.shiftSettings, {});
        const nameById = (arr, id) => (arr || []).find(x => x.id === id)?.name || id;
        return Object.keys(data).sort().map(date => ({
            date,
            shifts: (data[date].shiftIds || []).map(id => nameById(settings.shiftTags, id)).join(';'),
            pays: (data[date].payIds || []).map(id => nameById(settings.jobs, id)).join(';'),
            others: (data[date].otherIds || []).map(id => nameById(settings.otherTags, id)).join(';'),
            note: data[date].note || '',
        }));
    }

    function exportText(type, format) {
        if (!TYPES[type]) throw new Error('Unknown export type.');
        if (!['csv', 'txt', 'json'].includes(format)) throw new Error('Unsupported export format.');
        if (format === 'json') {
            const value = type === 'todo' ? _readJson(KEYS.todo, { todos: [], lists: [] })
                : type === 'weight' ? _readJson(KEYS.weight, { weights: [] })
                : type === 'workoutLibrary' ? _readJson(KEYS.workoutLibrary, [])
                : { data: _readJson(KEYS.shiftData, {}), settings: _readJson(KEYS.shiftSettings, {}) };
            return JSON.stringify(value, null, 2);
        }
        const header = TYPES[type].csvHeader;
        const rows = _exportRows(type);
        if (format === 'csv') return [header.join(','), ...rows.map(r => _csvLine(header.map(h => r[h] || '')))].join('\n');
        if (type === 'workoutLibrary') {
            return rows.map(r => _csvLine([
                r.name,
                r.nameZh,
                r.type === 'duration' ? 'time' : 'sets',
                r.preferredUnit || '',
                String(r.categories || '').replace(/;/g, ':')
            ])).join('\n');
        }
        if (type === 'shift') {
            return rows.map(r => _csvLine([r.date, r.shifts, r.others])).join('\n');
        }
        return rows.map(r => header.map(h => r[h] || '').join(',')).join('\n');
    }

    return { TYPES, importText, exportText };
})();
