// lapis_global_nav.js — Global bottom navigation + Quick-Action Modal
// Load with <script src="lapis_global_nav.js" defer></script> on every app page.
// Injects a 3-item nav bar (Home | [+] | Stats) and a Quick-Action Modal sheet.
'use strict';
(function () {

    const PAGE     = location.pathname.split('/').pop().replace(/[?#].*$/, '') || 'index.html';
    const IS_HOME  = PAGE === 'index.html' || PAGE === '';
    const IS_STATS = PAGE === 'stats.html';

    // ── Theme helpers ─────────────────────────────────────────────────────────
    const DARK_THEMES = ['dark', 'forest', 'night', 'torii', 'starrysky', 'ferriswheel'];
    function _isDark() {
        try {
            const d = JSON.parse(localStorage.getItem('todo_settings') || '{}');
            const t = d.theme || 'light';
            if (t === 'system') return window.matchMedia('(prefers-color-scheme:dark)').matches;
            return DARK_THEMES.includes(t);
        } catch (e) { return false; }
    }
    function _surf() {
        return _isDark()
            ? { bg: 'rgba(10,15,30,0.84)', border: '1px solid rgba(255,255,255,0.10)', color: '#ffffff' }
            : { bg: 'rgba(255,255,255,0.80)', border: '1px solid rgba(0,0,0,0.07)',    color: '#1a1a1a' };
    }

    // ── CSS injection ─────────────────────────────────────────────────────────
    function _injectStyles() {
        if (document.getElementById('lapis-gnav-css')) return;
        const s = document.createElement('style');
        s.id = 'lapis-gnav-css';
        s.textContent = `
/* ─── Global Nav Bar ──────────────────────────────────────────────────────── */
.lapis-gnav {
    position: fixed; bottom: 0; left: 0; right: 0; height: 58px;
    display: flex; align-items: center;
    z-index: var(--z-nav, 7000);
    padding: 0 8px;
    backdrop-filter: blur(20px) saturate(1.4);
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
}
.lapis-gnav-btn {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 3px; flex: 1; height: 100%;
    background: none; border: none; cursor: pointer;
    font-family: inherit; font-size: 9px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.06em;
    opacity: 0.45; transition: opacity 0.15s, transform 0.15s;
    text-decoration: none; color: inherit;
}
.lapis-gnav-btn.active   { opacity: 1; }
.lapis-gnav-btn:active   { transform: scale(0.88); }
.lapis-gnav-center-wrap  { flex: 1; display: flex; justify-content: center; }
.lapis-gnav-center {
    width: 50px; height: 50px; border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
    box-shadow: 0 4px 20px rgba(99,102,241,0.50);
    display: flex; align-items: center; justify-content: center;
    border: none; cursor: pointer; margin-top: -10px;
    transition: transform 0.15s, box-shadow 0.15s;
}
.lapis-gnav-center:active { transform: scale(0.90); box-shadow: 0 2px 8px rgba(99,102,241,0.30); }

/* Push existing page bottom-navs above global nav */
.bottom-nav          { bottom: 58px !important; }

/* Workout content area needs extra padding to clear both nav bars */
.workout-main        { padding-bottom: 140px !important; }

/* ─── Quick-Action Modal ──────────────────────────────────────────────────── */
.lapis-qam-overlay {
    position: fixed; inset: 0;
    z-index: var(--z-modal-lv3-backdrop, 9000);
    display: flex; align-items: flex-end; justify-content: center;
    background: rgba(0,0,0,0.52);
    backdrop-filter: blur(7px); -webkit-backdrop-filter: blur(7px);
    animation: _qamFade 0.20s ease;
}
@keyframes _qamFade { from { opacity:0; } to { opacity:1; } }
.lapis-qam-sheet {
    width: 100%; max-width: 520px;
    padding: 20px 16px 32px;
    border-radius: 2.5rem 2.5rem 0 0;
    z-index: var(--z-modal-lv3-content, 9001);
    backdrop-filter: blur(28px) saturate(1.5);
    -webkit-backdrop-filter: blur(28px) saturate(1.5);
    animation: _qamUp 0.28s cubic-bezier(0.22,1,0.36,1);
}
@keyframes _qamUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
.lapis-qam-handle {
    width: 36px; height: 4px; border-radius: 2px;
    background: rgba(128,128,128,0.30); margin: 0 auto 18px;
}
.lapis-qam-label {
    font-size: 10px; font-weight: 800; letter-spacing: 0.12em;
    text-transform: uppercase; opacity: 0.35; margin-bottom: 12px;
}
.lapis-qam-card {
    border-radius: 18px; padding: 15px 16px;
    display: flex; align-items: center; gap: 14px;
    cursor: pointer; text-decoration: none; color: inherit;
    transition: transform 0.14s, opacity 0.14s; margin-bottom: 10px;
}
.lapis-qam-card:last-child { margin-bottom: 0; }
.lapis-qam-card:active { transform: scale(0.97); opacity: 0.80; }
.lapis-qam-icon {
    width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
}
.lapis-qam-card-title { font-size: 15px; font-weight: 800; margin: 0 0 2px; line-height: 1.2; }
.lapis-qam-card-sub   { font-size: 12px; opacity: 0.40; margin: 0; }
/* Weight form */
.lapis-wf-row { display: flex; gap: 8px; align-items: center; margin-top: 10px; }
.lapis-wf-input {
    flex: 1; min-width: 0;
    background: rgba(255,255,255,0.09); border: 1.5px solid rgba(255,255,255,0.18);
    border-radius: 12px; padding: 9px 13px;
    font-size: 16px; font-weight: 800; outline: none;
    color: inherit; font-family: inherit;
}
.lapis-wf-input::placeholder { opacity: 0.30; }
.lapis-wf-toggle { display: flex; border-radius: 10px; overflow: hidden; border: 1.5px solid rgba(255,255,255,0.18); }
.lapis-wf-unit {
    padding: 7px 11px; font-size: 12px; font-weight: 800;
    background: rgba(255,255,255,0.07); border: none;
    cursor: pointer; color: inherit; font-family: inherit;
    transition: background 0.12s, color 0.12s;
}
.lapis-wf-unit.active { background: rgba(59,130,246,0.38); color: #60a5fa; }
.lapis-wf-save {
    padding: 9px 16px; border-radius: 12px;
    background: #3b82f6; color: #fff; font-weight: 800;
    font-size: 13px; border: none; cursor: pointer;
    font-family: inherit; white-space: nowrap;
    transition: transform 0.12s;
}
.lapis-wf-save:active { transform: scale(0.94); }
/* Toast */
.lapis-gnav-toast {
    position: fixed; bottom: 72px; left: 50%;
    transform: translateX(-50%);
    background: rgba(15,20,35,0.92); color: #fff;
    padding: 9px 22px; border-radius: 999px;
    font-size: 13px; font-weight: 700;
    z-index: var(--z-top-overlay, 10000); pointer-events: none;
    animation: _toastIn 2.5s ease forwards;
}
@keyframes _toastIn {
    0%   { opacity:0; transform:translateX(-50%) translateY(6px); }
    12%  { opacity:1; transform:translateX(-50%) translateY(0);   }
    80%  { opacity:1; }
    100% { opacity:0; }
}`;
        document.head.appendChild(s);
    }

    // ── SVG icons ─────────────────────────────────────────────────────────────
    const _SVG = {
        home:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        plus:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
        stats: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
        chevr: `<svg style="opacity:.28;flex-shrink:0;margin-left:auto" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`,
        list:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
        scale: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M12 11v6"/></svg>`,
    };

    // ── Nav bar ───────────────────────────────────────────────────────────────
    function _buildNav() {
        if (document.querySelector('.lapis-gnav')) return;
        const surf = _surf();

        const nav = document.createElement('nav');
        nav.className = 'lapis-gnav';
        nav.setAttribute('aria-label', 'Global navigation');
        nav.style.cssText = `background:${surf.bg};border-top:${surf.border};color:${surf.color};`;

        const homeA = document.createElement('a');
        homeA.href      = 'index.html';
        homeA.className = 'lapis-gnav-btn' + (IS_HOME  ? ' active' : '');
        homeA.innerHTML = `${_SVG.home}<span>Home</span>`;

        const wrap = document.createElement('div');
        wrap.className = 'lapis-gnav-center-wrap';
        const centerBtn = document.createElement('button');
        centerBtn.className = 'lapis-gnav-center';
        centerBtn.setAttribute('aria-label', 'Quick Actions');
        centerBtn.innerHTML = _SVG.plus;
        centerBtn.addEventListener('click', _toggleQAM);
        wrap.appendChild(centerBtn);

        const statsA = document.createElement('a');
        statsA.href      = 'stats.html';
        statsA.className = 'lapis-gnav-btn' + (IS_STATS ? ' active' : '');
        statsA.innerHTML = `${_SVG.stats}<span>Stats</span>`;

        nav.appendChild(homeA);
        nav.appendChild(wrap);
        nav.appendChild(statsA);
        document.body.appendChild(nav);
    }

    // ── Quick-Action Modal ────────────────────────────────────────────────────
    let _qam   = null;
    let _wUnit = 'kg';

    function _toggleQAM() { _qam ? _closeQAM() : _openQAM(); }

    function _openQAM() {
        const surf = _surf();
        const dark = _isDark();
        const cardBg = dark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.04)';

        _qam = document.createElement('div');
        _qam.className = 'lapis-qam-overlay';
        _qam.addEventListener('click', (e) => { if (e.target === _qam) _closeQAM(); });

        _qam.innerHTML = `
<div class="lapis-qam-sheet" style="background:${surf.bg};color:${surf.color};">
  <div class="lapis-qam-handle"></div>
  <p class="lapis-qam-label">Quick Actions</p>

  <!-- Card A: Quick Task — navigates to todo.html -->
  <a href="todo.html" class="lapis-qam-card"
     style="background:${cardBg};border:1px solid rgba(59,130,246,0.28);">
    <div class="lapis-qam-icon" style="background:rgba(59,130,246,0.14);color:#3b82f6;">
      ${_SVG.list}
    </div>
    <div>
      <p class="lapis-qam-card-title">Quick Task</p>
      <p class="lapis-qam-card-sub">Open your Todo list</p>
    </div>
    ${_SVG.chevr}
  </a>

  <!-- Card B: Log Weight — inline form, writes to lapis_workout_metrics -->
  <div class="lapis-qam-card"
       style="background:${cardBg};border:1px solid rgba(34,197,94,0.28);flex-direction:column;align-items:stretch;cursor:default;">
    <div style="display:flex;align-items:center;gap:14px;">
      <div class="lapis-qam-icon" style="background:rgba(34,197,94,0.14);color:#22c55e;">
        ${_SVG.scale}
      </div>
      <div>
        <p class="lapis-qam-card-title">Log Weight</p>
        <p class="lapis-qam-card-sub">Save today's body weight</p>
      </div>
    </div>
    <div class="lapis-wf-row">
      <input id="_lapis-w-inp" type="number" inputmode="decimal" placeholder="70.0"
             class="lapis-wf-input" style="color:${surf.color};" />
      <div class="lapis-wf-toggle">
        <button class="lapis-wf-unit active" data-u="kg">kg</button>
        <button class="lapis-wf-unit"        data-u="lb">lb</button>
      </div>
      <button class="lapis-wf-save" id="_lapis-w-save">Save</button>
    </div>
  </div>
</div>`;

        // Unit toggle via event delegation (no global onclick pollution)
        _qam.addEventListener('click', (e) => {
            const unitBtn = e.target.closest('.lapis-wf-unit');
            if (unitBtn) {
                _wUnit = unitBtn.dataset.u;
                _qam.querySelectorAll('.lapis-wf-unit').forEach(b => b.classList.toggle('active', b.dataset.u === _wUnit));
                return;
            }
            if (e.target.id === '_lapis-w-save' || e.target.closest('#_lapis-w-save')) {
                _saveWeight();
            }
        });

        document.body.appendChild(_qam);
        // Focus weight input after animation settles
        setTimeout(() => {
            const inp = document.getElementById('_lapis-w-inp');
            if (inp) inp.focus({ preventScroll: true });
        }, 320);
    }

    function _closeQAM() {
        if (_qam) { _qam.remove(); _qam = null; }
    }

    function _saveWeight() {
        const inp = document.getElementById('_lapis-w-inp');
        const w   = parseFloat(inp ? inp.value : '');
        if (isNaN(w) || w <= 0) { if (inp) inp.focus(); return; }

        const today = new Date().toISOString().split('T')[0];
        try {
            const raw = JSON.parse(localStorage.getItem('lapis_workout_metrics') || '{"weights":[]}');
            if (!Array.isArray(raw.weights)) raw.weights = [];
            raw.weights.push({ date: today, weight: w, unit: _wUnit });
            localStorage.setItem('lapis_workout_metrics', JSON.stringify(raw));
        } catch (e) { /* storage unavailable */ }

        _closeQAM();
        _toast(`Saved ${w}\u202f${_wUnit}`);
    }

    function _toast(msg) {
        const el = document.createElement('div');
        el.className   = 'lapis-gnav-toast';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2600);
    }

    // ── Bootstrap (runs after DOM is ready — script is defer) ─────────────────
    _injectStyles();
    _buildNav();

}());
