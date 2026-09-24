/* Tally — a daily habit tracker. One file, no dependencies, data on the
   device (localStorage) with JSON export/import. */
(function () {
  'use strict';

  // ---------- data ----------
  const KEY = 'tally.v1';
  const GROUPS = ['Morning', 'Afternoon', 'Evening', 'Anytime'];
  const GROUP_ICON = { Morning: '🌅', Afternoon: '☀️', Evening: '🌙', Anytime: '✦' };
  const COLORS = ['#b14cf2', '#2fbfe6', '#2e6bff', '#35c759', '#ff4d4d', '#ff8a3d', '#f5c542', '#ff5fa2', '#7c6cff', '#20c9a6'];
  const EMOJIS = ['🧘', '🏃', '💧', '📚', '✍️', '🥗', '💪', '🛌', '🧹', '🎨', '🎸', '🧠', '🚭', '🍬', '📵', '💊', '🚿', '🌿', '🧴', '🦷', '💸', '📞', '🙏', '🐕', '⚖️', '🔥', '🚴', '🏊', '☕', '🍎', '🗣️', '🧩'];
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const STREAKS = [2, 5, 7, 14, 30, 60, 90, 180, 365];
  const GOALS = [10, 50, 100, 250, 500, 1000];

  let state = load();
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.habits) return s; } catch (e) {}
    return { habits: [], log: {}, order: [] };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  const uid = () => Math.random().toString(36).slice(2, 10);

  // ---------- dates ----------
  const pad = n => String(n).padStart(2, '0');
  const key = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => key(new Date());
  const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return key(d); };
  const dow = k => (parse(k).getDay() + 6) % 7;             // Monday = 0
  const scheduled = (h, k) => h.days[dow(k)] && k >= h.createdAt;

  // ---------- progress ----------
  const value = (h, k) => (state.log[k] && state.log[k][h.id]) || 0;
  const target = h => h.type === 'check' ? 1 : (h.target || 1);
  const done = (h, k) => value(h, k) >= target(h);
  const ratio = (h, k) => Math.min(1, value(h, k) / target(h));
  function setValue(h, k, v) {
    state.log[k] = state.log[k] || {};
    if (v <= 0) delete state.log[k][h.id]; else state.log[k][h.id] = v;
    if (!Object.keys(state.log[k]).length) delete state.log[k];
    save();
  }
  function dayProgress(k, habits) {
    const hs = habits.filter(h => scheduled(h, k) && !h.archived);
    if (!hs.length) return null;
    return hs.reduce((a, h) => a + ratio(h, k), 0) / hs.length;
  }
  function streak(h, upto) {
    // consecutive scheduled days completed, ending today (or yesterday if today is still open)
    let k = upto || today(), n = 0;
    if (scheduled(h, k) && !done(h, k)) k = addDays(k, -1);
    for (let i = 0; i < 4000; i++) {
      if (k < h.createdAt) break;
      if (scheduled(h, k)) { if (done(h, k)) n++; else break; }
      k = addDays(k, -1);
    }
    return n;
  }
  function bestStreak(h) {
    let best = 0, run = 0, k = h.createdAt, t = today();
    while (k <= t) { if (scheduled(h, k)) { run = done(h, k) ? run + 1 : 0; best = Math.max(best, run); } k = addDays(k, 1); }
    return best;
  }
  function totals(habits, from, to) {
    let sched = 0, comp = 0;
    for (let k = from; k <= to; k = addDays(k, 1)) habits.forEach(h => { if (scheduled(h, k)) { sched++; if (done(h, k)) comp++; } });
    return { sched, comp };
  }
  const completions = h => Object.keys(state.log).filter(k => done(h, k)).length;

  // ---------- rendering helpers ----------
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app'), sheet = $('#sheet');
  let view = 'today', selected = today(), statsMonth = today().slice(0, 7), statsHabit = 'all', weekOffset = 0;

  function render() {
    app.innerHTML = ({ today: renderToday, stats: renderStats, awards: renderAwards, settings: renderSettings })[view]();
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-on', t.dataset.view === view));
    window.scrollTo(0, 0);
  }

  // ---------- Today ----------
  function renderToday() {
    const live = state.habits.filter(h => !h.archived);
    const t = today();
    const d = parse(selected);
    const title = selected === t ? 'Today' : selected === addDays(t, -1) ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'long' });
    const sub = d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    let html = `<div class="top"><div><div class="top__title">${title}</div><div class="top__sub">${sub}</div></div>
      <button class="iconbtn iconbtn--accent" data-act="add" aria-label="Add habit">+</button></div>`;
    // week strip: Monday..Sunday of the selected week
    const monday = addDays(selected, -dow(selected) + weekOffset * 7);
    html += '<div class="week">';
    for (let i = 0; i < 7; i++) {
      const k = addDays(monday, i), p = dayProgress(k, live), fut = k > t;
      html += `<button class="day${k === selected ? ' is-today' : ''}${fut ? ' is-future' : ''}" data-act="pick" data-k="${k}">
        <span class="day__name">${DAYS[i]}</span><span class="day__ring" style="--p:${p == null ? 0 : Math.round(p * 100)}"><span>${parse(k).getDate()}</span></span></button>`;
    }
    html += '</div>';
    if (!live.length) return html + `<div class="empty"><b>No habits yet</b>Tap + to add your first one.<br>Meditate, drink water, no snacks…</div>`;
    const dayHabits = live.filter(h => scheduled(h, selected));
    if (!dayHabits.length) return html + `<div class="empty"><b>Nothing scheduled</b>No habits on this day.</div>`;
    GROUPS.forEach(g => {
      const hs = dayHabits.filter(h => h.group === g);
      if (!hs.length) return;
      const p = hs.reduce((a, h) => a + ratio(h, selected), 0) / hs.length;
      html += `<section class="group"><div class="group__head"><div class="group__title">${GROUP_ICON[g]} ${g}</div>
        <div class="group__ring" style="--p:${Math.round(p * 100)};--c:${hs[0].color}"><span>${hs.filter(h => done(h, selected)).length}/${hs.length}</span></div></div>`;
      hs.forEach(h => { html += habitCard(h); });
      html += '</section>';
    });
    return html;
  }
  function habitCard(h) {
    const k = selected, v = value(h, k), tg = target(h), isDone = done(h, k), s = streak(h, k);
    let meta = h.days.every(Boolean) ? 'Every day' : h.days.filter(Boolean).length + ' days a week';
    if (h.type === 'count') meta += `, ${v}/${tg} ${h.unit || ''}`.trimEnd();
    if (h.type === 'timer') meta += `, ${v}/${tg} min`;
    let act;
    if (h.type === 'check') act = `<button class="check" data-act="toggle" data-id="${h.id}" aria-label="Done">${isDone ? '✓' : ''}</button>`;
    else if (h.type === 'count') act = `<div class="stepper"><button data-act="dec" data-id="${h.id}">−</button><span>${v}</span><button data-act="inc" data-id="${h.id}">+</button></div>`;
    else act = `<button class="check" data-act="timer" data-id="${h.id}" aria-label="Timer">${isDone ? '✓' : '▶'}</button>`;
    return `<div class="habit${isDone ? ' is-done' : ''}" style="--c:${h.color}" data-act="edit" data-id="${h.id}">
      <div class="habit__icon">${h.icon}</div>
      <div class="habit__body"><div class="habit__name">${esc(h.name)}</div>
      <div class="habit__meta"><span>${meta}</span>${s ? `<span class="habit__streak">🔥 ${s}</span>` : ''}</div></div>
      <div class="habit__act">${act}</div>
      ${h.type !== 'check' ? `<div class="habit__bar" style="--p:${Math.round(ratio(h, k) * 100)}"></div>` : ''}</div>`;
  }

  // ---------- Stats ----------
  function renderStats() {
    const live = state.habits.filter(h => !h.archived);
    const hs = statsHabit === 'all' ? live : live.filter(h => h.id === statsHabit);
    const t = today();
    let html = `<div class="top"><div class="top__title">Statistics</div></div>`;
    html += `<div class="field"><select id="statsHabit"><option value="all">All habits</option>${live.map(h => `<option value="${h.id}"${h.id === statsHabit ? ' selected' : ''}>${h.icon} ${esc(h.name)}</option>`).join('')}</select></div>`;
    // month calendar
    const [y, m] = statsMonth.split('-').map(Number);
    const first = new Date(y, m - 1, 1), label = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const start = addDays(key(first), -((first.getDay() + 6) % 7));
    html += `<div class="card"><div class="card__title"><span>${label}</span><div class="nav"><button data-act="month" data-n="-1">‹</button><button data-act="month" data-n="1">›</button></div></div><div class="cal">`;
    DAYS.forEach(d => { html += `<div class="cal__h">${d.toUpperCase()}</div>`; });
    for (let i = 0; i < 42; i++) {
      const k = addDays(start, i), inMonth = k.slice(0, 7) === statsMonth, p = k <= t ? dayProgress(k, hs) : null;
      const full = p != null && p >= 0.999, prevFull = i % 7 !== 0 && (() => { const pk = addDays(k, -1); const pp = pk <= t ? dayProgress(pk, hs) : null; return pp != null && pp >= 0.999; })();
      html += `<div class="cal__d${inMonth ? '' : ' is-out'}${full ? ' is-full' : ''}${full && prevFull ? ' is-chain' : ''}"><span style="--p:${p == null ? 0 : Math.round(p * 100)}">${parse(k).getDate()}</span></div>`;
    }
    html += '</div></div>';
    // records, last 30 days
    const from = addDays(t, -29), tot = totals(hs, from, t);
    const cur = hs.length ? Math.max(...hs.map(h => streak(h))) : 0, best = hs.length ? Math.max(...hs.map(bestStreak)) : 0;
    html += `<div class="card"><div class="card__title"><span>Records</span><span style="color:var(--muted);font-weight:400">Last 30 days</span></div><div class="records">
      <div class="rec"><b>${cur} 🔥</b><span>Current streak</span></div><div class="rec"><b>${best} 🏅</b><span>Best streak</span></div>
      <div class="rec"><b>${tot.comp}</b><span>Completed</span></div><div class="rec"><b>${tot.sched ? Math.round(tot.comp / tot.sched * 100) : 0}%</b><span>Success rate</span></div></div></div>`;
    // this week per habit
    const monday = addDays(t, -dow(t));
    html += `<div class="card"><div class="card__title"><span>This week</span></div><div class="wgrid"><div></div>${DAYS.map(d => `<div class="h">${d[0]}</div>`).join('')}`;
    live.forEach(h => {
      html += `<div class="n">${h.icon} ${esc(h.name)}</div>`;
      for (let i = 0; i < 7; i++) {
        const k = addDays(monday, i);
        if (!scheduled(h, k) || k > t) { html += '<div class="dot" style="opacity:.35"></div>'; continue; }
        const r = ratio(h, k);
        html += `<div class="dot${r >= 1 ? ' is-on' : r > 0 ? ' is-part' : ''}" style="--c:${h.color};--p:${Math.round(r * 100)}">${r >= 1 ? '✓' : ''}</div>`;
      }
    });
    return html + '</div></div>';
  }

  // ---------- Awards ----------
  function renderAwards() {
    const live = state.habits.filter(h => !h.archived);
    const best = live.length ? Math.max(...live.map(bestStreak)) : 0;
    const total = live.reduce((a, h) => a + completions(h), 0);
    let html = `<div class="top"><div class="top__title">Achievements</div></div><div class="section">Longest streak · ${best} days</div><div class="badges">`;
    STREAKS.forEach(n => { html += `<div class="badge${best >= n ? ' is-on' : ''}"><div class="hex">🔥</div>${n} days</div>`; });
    html += `</div><div class="section" style="margin-top:22px">Completions · ${total}</div><div class="badges">`;
    GOALS.forEach(n => { html += `<div class="badge flag${total >= n ? ' is-on' : ''}"><div class="hex">🏁</div>${n}</div>`; });
    return html + '</div>';
  }

  // ---------- Settings ----------
  function renderSettings() {
    const n = state.habits.filter(h => !h.archived).length, a = state.habits.length - n;
    return `<div class="top"><div class="top__title">Settings</div></div>
      <div class="list"><button data-act="export">Export data <small>JSON</small></button><button data-act="import">Import data <small>replaces everything</small></button></div>
      <div class="list"><button data-act="archived">Archived habits <small>${a}</small></button></div>
      <div class="list"><button data-act="wipe" style="color:#ff5c5c">Delete all data</button></div>
      <p style="color:var(--muted);font-size:13px;line-height:1.5">${n} habit${n === 1 ? '' : 's'}. Everything is stored on this device only. Export now and then if you care about it.</p>
      <p style="color:var(--muted);font-size:12px">Tally · ${new Date().getFullYear()}</p>`;
  }

  // ---------- sheets ----------
  function openSheet(html) { sheet.innerHTML = `<div class="sheet__panel"><div class="sheet__grab"></div>${html}</div>`; sheet.hidden = false; }
  function closeSheet() { sheet.hidden = true; sheet.innerHTML = ''; stopTimer(); }
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });

  let draft;
  function editSheet(h) {
    draft = h ? JSON.parse(JSON.stringify(h)) : { id: uid(), name: '', icon: '🧘', color: COLORS[0], group: 'Morning', type: 'check', target: 1, unit: '', days: [1, 1, 1, 1, 1, 1, 1], createdAt: today() };
    draft._new = !h;
    renderEditSheet(true);
  }
  function renderEditSheet(first) {
    const isNew = draft._new;
    openSheet(`<div class="sheet__title"><span>${isNew ? 'New habit' : 'Edit habit'}</span><button class="iconbtn" data-act="close">✕</button></div>
      <div class="field"><label>Name</label><input type="text" id="f-name" placeholder="Meditate" value="${esc(draft.name)}" autocomplete="off"></div>
      <div class="field"><label>Icon</label><div class="emojis">${EMOJIS.map(e => `<button class="emoji${e === draft.icon ? ' is-on' : ''}" data-set="icon" data-v="${e}">${e}</button>`).join('')}</div></div>
      <div class="field"><label>Colour</label><div class="swatches">${COLORS.map(c => `<button class="swatch${c === draft.color ? ' is-on' : ''}" style="background:${c}" data-set="color" data-v="${c}" aria-label="${c}"></button>`).join('')}</div></div>
      <div class="field"><label>When</label><div class="chips">${GROUPS.map(g => `<button class="chip${g === draft.group ? ' is-on' : ''}" data-set="group" data-v="${g}">${GROUP_ICON[g]} ${g}</button>`).join('')}</div></div>
      <div class="field"><label>Type</label><div class="chips">${[['check', 'Check off'], ['count', 'Count'], ['timer', 'Timer']].map(([v, l]) => `<button class="chip${v === draft.type ? ' is-on' : ''}" data-set="type" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div id="f-target"></div>
      <div class="field"><label>Days</label><div class="days">${DAYS.map((d, i) => `<button class="dayb${draft.days[i] ? ' is-on' : ''}" data-day="${i}">${d[0]}</button>`).join('')}</div></div>
      <button class="btn" data-act="save">${isNew ? 'Add habit' : 'Save'}</button>
      ${isNew ? '' : `<button class="btn btn--ghost" data-act="archive">${draft.archived ? 'Restore' : 'Archive'}</button><button class="btn btn--danger" data-act="delete">Delete habit and its history</button>`}`);
    renderTarget();
    if (first && isNew) setTimeout(() => $('#f-name').focus(), 50);
  }
  function renderTarget() {
    const el = $('#f-target'); if (!el) return;
    if (draft.type === 'count') el.innerHTML = `<div class="field row"><div><label>Target per day</label><input type="number" id="f-t" min="1" value="${draft.target || 1}"></div><div><label>Unit</label><input type="text" id="f-u" placeholder="glasses" value="${esc(draft.unit || '')}"></div></div>`;
    else if (draft.type === 'timer') el.innerHTML = `<div class="field"><label>Minutes per day</label><input type="number" id="f-t" min="1" value="${draft.target || 10}"></div>`;
    else el.innerHTML = '';
  }
  function readDraft() {
    draft.name = $('#f-name').value.trim();
    const t = $('#f-t'); if (t) draft.target = Math.max(1, parseInt(t.value, 10) || 1);
    const u = $('#f-u'); if (u) draft.unit = u.value.trim();
  }

  // ---------- timer ----------
  let tick = null, timer = null;
  function timerSheet(h) {
    const k = selected, base = value(h, k);
    timer = { h, k, base, secs: 0, running: false };
    openSheet(`<div class="sheet__title"><span>${h.icon} ${esc(h.name)}</span><button class="iconbtn" data-act="close">✕</button></div>
      <div class="timer"><div class="timer__ring" id="t-ring" style="--c:${h.color};--p:0"><div class="timer__time" id="t-time">00:00</div></div>
      <div style="color:var(--muted);margin-bottom:14px">${base}/${target(h)} minutes today</div>
      <div class="row"><button class="btn btn--ghost" data-act="t-plus">+5 min</button><button class="btn" id="t-start" data-act="t-start">Start</button></div>
      <button class="btn btn--ghost" data-act="t-save">Save and close</button></div>`);
  }
  function paintTimer() {
    const m = Math.floor(timer.secs / 60), s = timer.secs % 60;
    $('#t-time').textContent = pad(m) + ':' + pad(s);
    $('#t-ring').style.setProperty('--p', Math.min(100, Math.round((timer.base + timer.secs / 60) / target(timer.h) * 100)));
  }
  function stopTimer() { if (tick) clearInterval(tick); tick = null; if (timer) timer.running = false; }
  function commitTimer() { if (!timer) return; setValue(timer.h, timer.k, Math.round(timer.base + timer.secs / 60)); }

  // ---------- events ----------
  document.addEventListener('click', e => {
    const tab = e.target.closest('.tab'); if (tab) { view = tab.dataset.view; render(); return; }
    const el = e.target.closest('[data-act],[data-set],[data-day]'); if (!el) return;
    const act = el.dataset.act, id = el.dataset.id, h = id && state.habits.find(x => x.id === id);
    if (el.dataset.set) { e.stopPropagation(); readDraft(); draft[el.dataset.set] = el.dataset.v; if (el.dataset.set === 'type') draft.target = draft.type === 'timer' ? 10 : 1; renderEditSheet(false); return; }
    if (el.dataset.day != null) { readDraft(); draft.days[el.dataset.day] = draft.days[el.dataset.day] ? 0 : 1; el.classList.toggle('is-on'); return; }
    switch (act) {
      case 'add': editSheet(null); break;
      case 'edit': editSheet(h); break;
      case 'close': closeSheet(); break;
      case 'pick': selected = el.dataset.k; render(); break;
      case 'toggle': e.stopPropagation(); setValue(h, selected, done(h, selected) ? 0 : 1); render(); break;
      case 'inc': e.stopPropagation(); setValue(h, selected, value(h, selected) + 1); render(); break;
      case 'dec': e.stopPropagation(); setValue(h, selected, value(h, selected) - 1); render(); break;
      case 'timer': e.stopPropagation(); timerSheet(h); break;
      case 't-start': if (timer.running) { stopTimer(); el.textContent = 'Start'; } else { timer.running = true; el.textContent = 'Pause'; tick = setInterval(() => { timer.secs++; paintTimer(); }, 1000); } break;
      case 't-plus': timer.secs += 300; paintTimer(); break;
      case 't-save': commitTimer(); closeSheet(); render(); break;
      case 'save': {
        readDraft(); if (!draft.name) { $('#f-name').focus(); return; }
        if (!draft.days.some(Boolean)) draft.days = [1, 1, 1, 1, 1, 1, 1];
        const i = state.habits.findIndex(x => x.id === draft.id);
        delete draft._new;
        if (i < 0) state.habits.push(draft); else state.habits[i] = draft;
        save(); closeSheet(); render(); break;
      }
      case 'archive': { const x = state.habits.find(y => y.id === draft.id); x.archived = !x.archived; save(); closeSheet(); render(); break; }
      case 'delete': if (confirm('Delete this habit and all its history?')) { state.habits = state.habits.filter(y => y.id !== draft.id); Object.keys(state.log).forEach(k => { delete state.log[k][draft.id]; }); save(); closeSheet(); render(); } break;
      case 'month': { const [y, m] = statsMonth.split('-').map(Number); const d = new Date(y, m - 1 + Number(el.dataset.n), 1); statsMonth = key(d).slice(0, 7); render(); break; }
      case 'export': { const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tally-' + today() + '.json'; a.click(); break; }
      case 'import': { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json'; inp.onchange = () => { const f = inp.files[0]; if (!f) return; f.text().then(txt => { try { const s = JSON.parse(txt); if (!s.habits || !s.log) throw 0; if (confirm('Replace all current data with this file?')) { state = s; save(); render(); } } catch (x) { alert('That is not a Tally export.'); } }); }; inp.click(); break; }
      case 'archived': { const a = state.habits.filter(x => x.archived); openSheet(`<div class="sheet__title"><span>Archived</span><button class="iconbtn" data-act="close">✕</button></div>${a.length ? a.map(x => `<div class="habit" style="--c:${x.color};margin-bottom:8px" data-act="edit" data-id="${x.id}"><div class="habit__icon">${x.icon}</div><div class="habit__body"><div class="habit__name">${esc(x.name)}</div><div class="habit__meta">${completions(x)} completions</div></div><div></div></div>`).join('') : '<p style="color:var(--muted)">Nothing archived.</p>'}`); break; }
      case 'wipe': if (confirm('Delete every habit and all history on this device?')) { state = { habits: [], log: {}, order: [] }; save(); render(); } break;
    }
  });
  document.addEventListener('change', e => { if (e.target.id === 'statsHabit') { statsHabit = e.target.value; render(); } });

  // ---------- boot ----------
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
