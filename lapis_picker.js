// lapis_picker.js — Lapis System Drum-roll Pickers v1.0
// Provides: LapisDatePicker(containerEl, options), LapisTimePicker(containerEl, options)
// CSS dependency: lapis_shared_style.css (.lapis-picker-* classes)
//
// Usage:
//   const picker = new LapisDatePicker(document.getElementById('date-picker'), {
//       year: 2026, month: 4, day: 18,
//       onConfirm(val) { console.log(val.iso, val.year, val.month, val.day); }
//   });
//   picker.confirm(); // triggers onConfirm with current wheel values

(function (global) {
    'use strict';

    const ITEM_H = 44;  // px — must match .lapis-picker-item height in CSS

    // ── Core wheel renderer ───────────────────────────────────────────────────
    // Renders a single scrollable column of items into `container`.
    // `items`        : array of display values (number | string)
    // `initialIndex` : 0-based index to start at
    // `onChange(idx)`: called (debounced) each time the wheel settles
    // Returns { scrollTo(idx), getIndex() }
    function _renderWheel(container, items, initialIndex, onChange) {
        container.innerHTML = '';
        container.className = 'lapis-picker-slot';

        // Dead-zone spacers so first/last items can center in the viewport
        const spacerTop = document.createElement('div');
        spacerTop.className = 'lapis-picker-spacer';
        container.appendChild(spacerTop);

        items.forEach((value, idx) => {
            const el = document.createElement('div');
            el.className = 'lapis-picker-item' + (idx === initialIndex ? ' lapis-picker-active' : '');
            el.textContent = String(value).padStart(2, '0');
            el.dataset.idx = idx;
            el.addEventListener('click', () => {
                container.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
            });
            container.appendChild(el);
        });

        const spacerBot = document.createElement('div');
        spacerBot.className = 'lapis-picker-spacer';
        container.appendChild(spacerBot);

        // Snap to initial position immediately (no animation on first render)
        container.scrollTop = initialIndex * ITEM_H;

        let _snapTimer;

        const _highlight = (rawScrollTop) => {
            const idx = Math.max(0, Math.min(items.length - 1, Math.round(rawScrollTop / ITEM_H)));
            container.querySelectorAll('.lapis-picker-item').forEach((el, i) => {
                el.classList.toggle('lapis-picker-active', i === idx);
            });
            return idx;
        };

        container.addEventListener('scroll', () => {
            const idx = _highlight(container.scrollTop);
            clearTimeout(_snapTimer);
            _snapTimer = setTimeout(() => {
                // Snap to exact position then fire callback
                container.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
                onChange(idx);
            }, 100);
        });

        return {
            scrollTo(idx) {
                idx = Math.max(0, Math.min(items.length - 1, idx));
                container.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
                _highlight(idx * ITEM_H);
            },
            getIndex() {
                return Math.max(0, Math.min(items.length - 1, Math.round(container.scrollTop / ITEM_H)));
            },
        };
    }

    // ── Shared internal template ──────────────────────────────────────────────
    function _buildPickerShell(containerEl, slotKeys, dividers) {
        containerEl.classList.add('lapis-picker-wrap');
        containerEl.innerHTML = '';

        const inner = document.createElement('div');
        inner.className = 'lapis-picker-inner';

        const slots = {};
        slotKeys.forEach((key, i) => {
            const slot = document.createElement('div');
            slot.className = 'lapis-picker-slot';
            slot.dataset.slot = key;
            inner.appendChild(slot);
            slots[key] = slot;

            if (i < slotKeys.length - 1 && dividers[i] !== undefined) {
                const div = document.createElement('div');
                div.className = 'lapis-picker-divider';
                div.textContent = dividers[i];
                inner.appendChild(div);
            }
        });

        containerEl.appendChild(inner);

        // Overlay layers (rendered on top of the inner scroll area)
        ['lapis-picker-mask-top', 'lapis-picker-mask-bot', 'lapis-picker-line'].forEach(cls => {
            const el = document.createElement('div');
            el.className = cls;
            containerEl.appendChild(el);
        });

        return slots;
    }

    // ── LapisDatePicker ───────────────────────────────────────────────────────
    function LapisDatePicker(containerEl, options) {
        options = options || {};

        const minYear = options.minYear || 1970;
        const maxYear = options.maxYear || 2099;

        const _now  = new Date();
        let _year   = options.year  !== undefined ? options.year  : _now.getFullYear();
        let _month  = options.month !== undefined ? options.month : (_now.getMonth() + 1);
        let _day    = options.day   !== undefined ? options.day   : _now.getDate();

        this.onConfirm = options.onConfirm || null;

        // ── Helpers ───────────────────────────────────────────────────────────
        const _isLeap = y => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
        const _maxDay = (m, y) => {
            if ([4, 6, 9, 11].includes(m)) return 30;
            if (m === 2) return _isLeap(y) ? 29 : 28;
            return 31;
        };

        const years  = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
        const months = Array.from({ length: 12 }, (_, i) => i + 1);

        const slots = _buildPickerShell(containerEl, ['year', 'month', 'day'], ['/', '/']);

        let _dayWheel;

        const _rebuildDayWheel = () => {
            const maxD = _maxDay(_month, _year);
            if (_day > maxD) _day = maxD;
            const days = Array.from({ length: maxD }, (_, i) => i + 1);
            _dayWheel = _renderWheel(slots.day, days, _day - 1, idx => { _day = idx + 1; });
        };

        _renderWheel(slots.year, years, _year - minYear, idx => {
            _year = years[idx];
            _rebuildDayWheel();
        });

        _renderWheel(slots.month, months, _month - 1, idx => {
            _month = idx + 1;
            _rebuildDayWheel();
        });

        _rebuildDayWheel();

        // ── Public API ────────────────────────────────────────────────────────
        this.getValue = () => ({
            year: _year, month: _month, day: _day,
            iso: `${_year}-${String(_month).padStart(2, '0')}-${String(_day).padStart(2, '0')}`,
        });

        this.setValue = (y, m, d) => {
            _year = y; _month = m; _day = d;
            slots.year.scrollTo({ top: (y - minYear) * ITEM_H, behavior: 'smooth' });
            slots.month.scrollTo({ top: (m - 1) * ITEM_H, behavior: 'smooth' });
            _rebuildDayWheel();
        };

        // Reads current wheel positions and fires onConfirm
        this.confirm = () => {
            const val = this.getValue();
            if (typeof this.onConfirm === 'function') this.onConfirm(val);
            return val;
        };
    }

    // ── LapisTimePicker ───────────────────────────────────────────────────────
    function LapisTimePicker(containerEl, options) {
        options = options || {};

        const _now  = new Date();
        let _hour   = options.hour   !== undefined ? options.hour   : _now.getHours();
        let _minute = options.minute !== undefined ? options.minute : _now.getMinutes();

        this.onConfirm = options.onConfirm || null;

        const hours   = Array.from({ length: 24 }, (_, i) => i);
        const minutes = Array.from({ length: 60 }, (_, i) => i);

        const slots = _buildPickerShell(containerEl, ['hour', 'minute'], [':']);

        _renderWheel(slots.hour,   hours,   _hour,   idx => { _hour   = idx; });
        _renderWheel(slots.minute, minutes, _minute, idx => { _minute = idx; });

        // ── Public API ────────────────────────────────────────────────────────
        this.getValue = () => ({
            hour: _hour, minute: _minute,
            str: `${String(_hour).padStart(2, '0')}:${String(_minute).padStart(2, '0')}`,
        });

        this.setValue = (h, m) => {
            _hour = h; _minute = m;
            slots.hour.scrollTo({ top: h * ITEM_H, behavior: 'smooth' });
            slots.minute.scrollTo({ top: m * ITEM_H, behavior: 'smooth' });
        };

        this.confirm = () => {
            const val = this.getValue();
            if (typeof this.onConfirm === 'function') this.onConfirm(val);
            return val;
        };
    }

    // ── Expose ────────────────────────────────────────────────────────────────
    global.LapisDatePicker = LapisDatePicker;
    global.LapisTimePicker = LapisTimePicker;

})(window);
