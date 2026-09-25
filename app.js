/* Tally — a daily habit tracker. One file, no dependencies, data on the
   device (localStorage). This is the Grit-replica UI layer (see
   grit/FEATURES.md): gradient ground, week strip, colour cards with a
   year heat grid, ring-counter detail sheet, grouped-list forms. The data,
   timer, push and native code underneath is unchanged. */
(function () {
  'use strict';

  // ---------- icons ----------
  const I = window.ICONS || {};
  const ic = (name, size = 22, extra = '') => `<svg class="ic ${extra}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || I['circle-check'] || ''}</svg>`;
  // Lucide name -> emoji, for the replica (Grit draws emoji). Own icon art comes later.
  const EMOJI = { brain: '🧘', footprints: '🚶', droplet: '💧', 'book-open': '📖', 'pen-line': '✍️', salad: '🥗', dumbbell: '💪', bed: '🛏️', sparkles: '✨', palette: '🎨', music: '🎸', languages: '🗣️', 'cigarette-off': '🚭', 'candy-off': '🍬', smartphone: '📵', pill: '💊', 'shower-head': '🚿', leaf: '🌿', sun: '☀️', moon: '🌙', heart: '❤️', 'piggy-bank': '🐷', phone: '📞', dog: '🐕', scale: '⚖️', bike: '🚴', coffee: '☕', apple: '🍎', mic: '🎤', timer: '⏱️', flame: '🔥', activity: '🏃', 'alarm-clock': '⏰', ban: '🚫', bath: '🛁', briefcase: '💼', calendar: '📅', camera: '📷', car: '🚗', check: '✅', 'dollar-sign': '💵', 'file-text': '📄', gift: '🎁', 'glass-water': '🥤', glasses: '👓', 'graduation-cap': '🎓', hand: '✋', 'heart-pulse': '💓', key: '🔑', 'list-checks': '📋', 'map-pin': '📍', 'message-square': '💬', 'mountain-snow': '🏔️', plane: '✈️', printer: '🖨️', shirt: '👕', 'shopping-cart': '🛒', snowflake: '❄️', target: '🎯', tv: '📺', users: '👥', utensils: '🍽️', wallet: '👛', 'wine-off': '🍷', 'circle-check': '✅' };
  const EMOJIS = ['🧘', '🏃', '🚶', '💧', '📖', '✍️', '🥗', '💪', '🛏️', '✨', '🎨', '🎸', '🗣️', '🚭', '🍬', '📵', '💊', '🚿', '🌿', '☀️', '🌙', '❤️', '🐷', '📞', '🐕', '⚖️', '🚴', '☕', '🍎', '🎤', '⏱️', '🔥', '⏰', '🚫', '🛁', '💼', '📅', '📷', '🚗', '✅', '💵', '📄', '🎁', '🥤', '👓', '🎓', '✋', '💓', '🔑', '📋', '📍', '💬', '🏔️', '✈️', '🖨️', '👕', '🛒', '❄️', '🎯', '📺', '👥', '🍽️', '👛', '🍷', '🧖', '🧼', '🦷', '🧠', '🎧', '🎮', '🏋️', '🧗', '🏊', '⚽', '🎾', '🥦', '🍳', '🍵', '🧹', '🧺', '🪴', '🐟', '💤', '🙏', '😊', '📝', '💻', '🏆', '🌅', '🌳'];
  function ring(size, w, p, cls = '') {
    const r = (size - w) / 2, c = 2 * Math.PI * r;
    return `<svg class="${cls}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><circle class="t" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${w}"/><circle class="p" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${w}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - Math.min(1, Math.max(0, p)))).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
  }

  // ---------- data ----------
  const KEY = 'tally.v1';
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const STREAKS = [2, 5, 7, 14, 30, 60, 90, 180, 365];
  const GOALS = [100, 200, 300, 400, 500, 600];
  const MINUTES = [10, 30, 60];
  // Grit's habit colours, measured from the screenshots where possible
  const COLORS = ['#ff3b30', '#ec9142', '#ffcc00', '#5dc461', '#59c2b1', '#4fb8c7', '#32ade6', '#3478f6', '#5e5ce6', '#af52de', '#ff2d55', '#a2845e', '#8e8e93'];
  const ACCENTS = ['#ef4a5e', '#3478f6', '#5e5ce6', '#af52de', '#ff9500', '#34c759', '#59c2b1', '#ff2d55', '#000000'];
  const BG_SWATCHES = ['#a2cbf8', '#f8b4c8', '#f6c8a2', '#c9f0c9', '#f9e9a2', '#c8c2f9', '#f9c2e8', '#a2e8f0', '#d6d6dc', '#f0a2a2', '#b8f0d2', '#f2d2b0', '#a8bdf0', '#e9f0a2', '#efcdae'];
  const SETTINGS = { appearance: 'auto', accent: '#ef4a5e', customBg: true, bgStart: '#a2cbf8', bgEnd: '#efcdae', sort: 'completedLast', progressView: 'grid', hideDone: false, hideFailed: false, hideSkipped: false, confetti: true, streaks: true, negStreaks: true, dayStart: 4, weekStart: 0, sounds: true, completionSound: 'default', badges: true, futureDates: false };
  const nearest = hex => { const v = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)); if (!/^#[0-9a-f]{6}$/i.test(hex)) return COLORS[3]; const a = v(hex); return COLORS.reduce((b, c) => { const q = v(c), d = (a[0] - q[0]) ** 2 + (a[1] - q[1]) ** 2 + (a[2] - q[2]) ** 2; return d < b[0] ? [d, c] : b; }, [Infinity, COLORS[3]])[1]; };
  let state = load();
  function load() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    s.habits = s.habits || []; s.log = s.log || {}; s.timers = s.timers || {}; s.status = s.status || {}; s.times = s.times || {}; s.notes = s.notes || {};
    s.groups = s.groups || []; s.vacations = s.vacations || [];
    s.settings = Object.assign({}, SETTINGS, s.settings || {});
    s.habits.forEach(h => {
      if (!h.emoji) h.emoji = EMOJI[h.icon] || '✅';
      if (!h.kind) h.kind = 'good'; if (!h.color) h.color = COLORS[3]; if (!COLORS.includes(h.color)) h.color = nearest(h.color);
      if (!h.days) h.days = [1, 1, 1, 1, 1, 1, 1]; if (!h.type) h.type = 'check'; if (h.step == null) h.step = 1; if (!h.pv) h.pv = 'default';
      if (!h.group) h.group = ''; if (h.group && !s.groups.find(g => g.name === h.group)) h.group = '';
      if (!h.startsOn) h.startsOn = h.createdAt;
    });
    return s;
  }
  let schedTimer = null;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} if (typeof syncPush === 'function') syncPush(); if (window.TALLY_NATIVE && typeof reminderList === 'function') { clearTimeout(schedTimer); schedTimer = setTimeout(() => { if (notifState() === 'granted') window.TALLY_NATIVE.schedule(reminderList()); }, 800); } }
  const uid = () => Math.random().toString(36).slice(2, 10);
  const S = () => state.settings;

  // ---------- dates ----------
  const pad = n => String(n).padStart(2, '0');
  const key = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  // the day rolls over at "Day Starts At" (4 AM by default), like Grit
  const today = () => { const d = new Date(); d.setHours(d.getHours() - (S().dayStart || 0)); return key(d); };
  const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return key(d); };
  const dow = k => (parse(k).getDay() + 6) % 7;                    // 0 = Monday
  const weekStartOf = k => addDays(k, -((dow(k) - (S().weekStart === 1 ? 6 : 0) + 7) % 7));
  const fmtDate = (k, o) => parse(k).toLocaleDateString(undefined, o || { day: 'numeric', month: 'short', year: 'numeric' });
  const firstDone = h => { const ks = Object.keys(state.log).filter(k => (state.log[k][h.id] || 0) >= target(h)).sort(); return ks[0] || null; };
  const onVacation = k => state.vacations.some(v => k >= v.from && k <= v.to);
  const status = (h, k) => (state.status[k] && state.status[k][h.id]) || '';
  const scheduled = (h, k) => {
    if (k < (h.startsOn || h.createdAt) || (h.endsOn && k > h.endsOn) || onVacation(k)) return false;
    if (h.kind === 'todo') return !firstDone(h) || k <= firstDone(h);
    if (h.everyN) { const d = Math.round((parse(k) - parse(h.startsOn || h.createdAt)) / 864e5); return d % h.everyN === 0; }
    return !!h.days[dow(k)];
  };

  // ---------- progress ----------
  const value = (h, k) => (state.log[k] && state.log[k][h.id]) || 0;
  const target = h => h.type === 'check' ? 1 : (h.target || 1);
  const done = (h, k) => h.kind === 'bad' ? (status(h, k) === 'done' || (k < today() && value(h, k) <= target(h) && status(h, k) !== 'fail')) : value(h, k) >= target(h);
  const failed = (h, k) => status(h, k) === 'fail' || (h.kind === 'bad' && value(h, k) > target(h));
  const skipped = (h, k) => status(h, k) === 'skip';
  const ratio = (h, k) => Math.min(1, value(h, k) / target(h));
  function setValue(h, k, v) {
    state.log[k] = state.log[k] || {};
    const was = done(h, k);
    if (v <= 0) delete state.log[k][h.id]; else state.log[k][h.id] = v;
    if (!Object.keys(state.log[k]).length) delete state.log[k];
    if (!was && done(h, k)) { state.times[k] = state.times[k] || {}; state.times[k][h.id] = new Date().getHours(); }
    save();
  }
  function setStatus(h, k, st) { state.status[k] = state.status[k] || {}; if (st) state.status[k][h.id] = st; else delete state.status[k][h.id]; if (!Object.keys(state.status[k]).length) delete state.status[k]; save(); }
  function dayProgress(k, habits) {
    const hs = habits.filter(h => scheduled(h, k) && !h.archived && !h.excluded && !skipped(h, k));
    if (!hs.length) return null;
    return hs.reduce((a, h) => a + (done(h, k) ? 1 : ratio(h, k)), 0) / hs.length;
  }
  function streak(h, upto) {
    let k = upto || today(), n = 0;
    if (scheduled(h, k) && !done(h, k)) k = addDays(k, -1);
    for (let i = 0; i < 4000; i++) {
      if (k < (h.startsOn || h.createdAt)) break;
      if (scheduled(h, k) && !skipped(h, k)) { if (done(h, k)) n++; else break; }
      k = addDays(k, -1);
    }
    return n;
  }
  // missed days in a row up to yesterday (today too when failed)
  function negStreak(h) {
    let k = today(), n = 0;
    if (!(scheduled(h, k) && failed(h, k))) k = addDays(k, -1);
    for (let i = 0; i < 4000; i++) {
      if (k < (h.startsOn || h.createdAt)) break;
      if (scheduled(h, k) && !skipped(h, k)) { if (!done(h, k)) n++; else break; }
      k = addDays(k, -1);
    }
    return n;
  }
  function bestStreak(h) {
    let best = 0, run = 0, k = h.startsOn || h.createdAt, t = today();
    while (k <= t) { if (scheduled(h, k) && !skipped(h, k)) { run = done(h, k) ? run + 1 : 0; best = Math.max(best, run); } k = addDays(k, 1); }
    return best;
  }
  function totals(habits, from, to) {
    let sched = 0, comp = 0;
    for (let k = from; k <= to; k = addDays(k, 1)) habits.forEach(h => { if (scheduled(h, k) && !skipped(h, k)) { sched++; if (done(h, k)) comp++; } });
    return { sched, comp };
  }
  const completions = h => Object.keys(state.log).filter(k => done(h, k)).length;
  const live = () => state.habits.filter(h => !h.archived);

  // ---------- rendering ----------
  let cur = null;                                          // the layer on screen
  const $ = s => (cur && cur.querySelector(s)) || document.querySelector(s);
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app'), sheet = $('#sheet'), scrim = $('#scrim');
  let view = 'today', selected = today(), stack = [];         // stack: pushed pages over the tab
  let statsMonth = today().slice(0, 7), statsWeek = weekStartOf(today()), statsYear = today().slice(0, 4), statsRange = 28, statsSel = [];
  const emojiOf = h => `<span class="emoji">${h.emoji || EMOJI[h.icon] || '✅'}</span>`;
  const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

  function applyTheme() {
    const s = S(), dark = s.appearance === 'dark' || (s.appearance === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const r = document.documentElement.style;
    r.setProperty('--accent', s.accent);
    if (dark) { r.setProperty('--bg-start', mix(s.bgStart, '#000000', .55)); r.setProperty('--bg-end', mix(s.bgEnd, '#000000', .55)); r.setProperty('--bg-mid', mix(mix(s.bgStart, s.bgEnd, .5), '#000000', .6)); }
    else { r.setProperty('--bg-start', mix(s.bgStart, '#ffffff', .15)); r.setProperty('--bg-end', mix(s.bgEnd, '#ffffff', .15)); r.setProperty('--bg-mid', mix(mix(s.bgStart, s.bgEnd, .5), '#ffffff', .35)); }
    document.body.classList.toggle('custom-bg', !!s.customBg); document.documentElement.classList.toggle('custom-bg', !!s.customBg);
    const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = s.customBg ? getComputedStyle(document.documentElement).getPropertyValue('--bg-start').trim() : (dark ? '#000000' : '#f2f2f7');
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { applyTheme(); });

  const VIEWS = { today: () => renderToday(), stats: () => renderStats(), sharing: () => renderSharing(), settings: () => renderSettings() };
  // render(nav): nav is 'push' | 'pop' (a page slides over / off, iOS style),
  // 'fade' (tab switch, a short crossfade) or nothing (in place). Each screen
  // is a .layer that scrolls on its own; the old layer leaves once the
  // transition ends.
  function render(nav) {
    applyTheme(); closeMenu();
    const top = stack[stack.length - 1], isToday = !top && view === 'today';
    const layer = document.createElement('div'); layer.className = 'layer' + (isToday ? ' today' : '');
    const prev = cur;
    cur = layer;
    layer.innerHTML = top ? renderPage(top) : VIEWS[view]();
    const rm = reduceMotion();
    if (prev && prev.isConnected && nav && !rm) {
      prev.classList.add('out'); prev.style.pointerEvents = 'none';
      if (nav === 'push') {
        layer.classList.add('from-right'); app.appendChild(layer);
        requestAnimationFrame(() => requestAnimationFrame(() => { layer.classList.remove('from-right'); prev.classList.add('to-left'); }));
        setTimeout(() => prev.remove(), 420);
      } else if (nav === 'pop') {
        layer.classList.add('to-left'); app.insertBefore(layer, prev); prev.classList.add('top');
        requestAnimationFrame(() => requestAnimationFrame(() => { layer.classList.remove('to-left'); prev.classList.add('from-right'); }));
        setTimeout(() => prev.remove(), 420);
      } else {
        layer.classList.add('fade-in'); app.appendChild(layer);
        requestAnimationFrame(() => requestAnimationFrame(() => { layer.classList.remove('fade-in'); prev.classList.add('fade-out'); }));
        setTimeout(() => prev.remove(), 200);
      }
    } else { app.innerHTML = ''; app.appendChild(layer); if (prev && prev.isConnected) prev.remove(); }
    if (isToday && (!prev || !prev.classList.contains('today') || nav)) { const l = layer.querySelector('.list'); if (l) { l.classList.add('enter'); [...l.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 8))); } }
    $('#tabbar').hidden = !!top; $('#navc').hidden = true;
    renderTabs(); renderNowBar();
    if (Object.keys(state.timers).length) ensureTick();
    if (isToday) setupWeekSwipe(layer);
    if (top && top.p === 'reorder') setupReorder();
  }
  const TABS = [['today', 'list-checks', 'Habits'], ['stats', 'chart-no-axes-column', 'Statistics'], ['sharing', 'users', 'Sharing'], ['settings', 'settings', 'Settings']];
  function renderTabs() {
    const bar = $('#tabbar');
    if (!bar.querySelector('.tab')) { bar.innerHTML = `<i class="tabbar__glass"></i>${TABS.map(([v, i, l]) => `<button class="tab" data-view="${v}">${ic(i, 26)}<span>${l}</span></button>`).join('')}`; tabLens(bar); }
    bar.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.view === view));
    if (!bar.classList.contains('dragging')) bar.querySelector('.tabbar__glass').style.transform = `translateX(${TABS.findIndex(t => t[0] === view) * 100}%)`;
  }
  // the Liquid Glass lens: on touch the pill inflates into a raised glass
  // blob, follows the finger along the bar, then slides to the nearest tab
  // and settles back into the flat tinted pill (gesture: spring-like curves)
  let tabSuppress = 0;
  function tabLens(bar) {
    const g = bar.querySelector('.tabbar__glass');
    const slot = () => (bar.clientWidth - 8) / TABS.length;
    let d = null, settle = null;
    const lift = () => { clearTimeout(settle); g.classList.add('lift'); bar.classList.add('lifted'); };
    const drop = (ms) => { clearTimeout(settle); settle = setTimeout(() => { g.classList.remove('lift'); bar.classList.remove('lifted'); }, ms); };
    bar.addEventListener('pointerdown', e => {
      if (!e.isPrimary) return;
      const i = TABS.findIndex(t => t[0] === view);
      d = { x0: e.clientX, i0: i, moved: false, pid: e.pointerId, last: [[e.clientX, performance.now()]] };
      lift(); tap();
    });
    bar.addEventListener('pointermove', e => {
      if (!d) return;
      const dx = e.clientX - d.x0;
      if (!d.moved && Math.abs(dx) < 6) return;
      if (!d.moved) { try { bar.setPointerCapture(d.pid); } catch (x) {} bar.classList.add('dragging'); }
      d.moved = true; d.last.push([e.clientX, performance.now()]); if (d.last.length > 6) d.last.shift();
      let pos = d.i0 + dx / slot();
      if (pos < 0) pos = pos / 3; if (pos > TABS.length - 1) pos = TABS.length - 1 + (pos - TABS.length + 1) / 3;   // friction past the ends
      g.style.transition = 'none'; g.style.transform = `translateX(${pos * 100}%)`;
      const near = Math.max(0, Math.min(TABS.length - 1, Math.round(pos)));
      bar.querySelectorAll('.tab').forEach((t, j) => t.classList.toggle('near', j === near));
    });
    const end = e => {
      if (!d) return; const cur = d; d = null;
      bar.classList.remove('dragging'); bar.querySelectorAll('.tab').forEach(t => t.classList.remove('near'));
      g.style.transition = '';
      if (!cur.moved) { drop(260); return; }                     // a tap: the click handler switches
      e.preventDefault(); tabSuppress = performance.now() + 350;
      const [x1, t1] = cur.last[0], [x2, t2] = cur.last[cur.last.length - 1];
      const vel = t2 > t1 ? (x2 - x1) / (t2 - t1) : 0;
      const carry = Math.abs(vel) > 0.6 ? Math.max(-0.35, Math.min(0.35, vel * 60 / slot())) : 0;
      const i = Math.max(0, Math.min(TABS.length - 1, Math.round(cur.i0 + (e.clientX - cur.x0) / slot() + carry)));
      g.style.transform = `translateX(${i * 100}%)`;
      if (TABS[i][0] !== view || stack.length) { view = TABS[i][0]; stack = []; render('fade'); }
      drop(320);
    };
    bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
  }
  const push = p => { stack.push(p); render('push'); };
  const pageT = (title, left, right) => `<div class="page-t glass">${left || `<button class="l circ" data-act="pop" aria-label="Back">${ic('chevron-left', 24)}</button>`}<span>${title}</span>${right || ''}</div>`;
  const todayTitle = () => { const t = today(); return selected === t ? 'Today' : selected === addDays(t, -1) ? 'Yesterday' : selected === addDays(t, 1) ? 'Tomorrow' : parse(selected).toLocaleDateString(undefined, { weekday: 'long' }); };

  // ---------- Habits screen ----------
  function weekStrip(start) {
    let html = '<div class="week">';
    const t = today();
    for (let i = 0; i < 7; i++) {
      const k = addDays(start, i), p = k <= t ? dayProgress(k, live()) : null, fut = k > t;
      html += `<button class="day${k === selected ? ' is-sel' : ''}${k === t ? ' is-today' : ''}${fut ? ' is-future' : ''}${p ? ' has-p' : ''}" data-act="pick" data-k="${k}" style="--p:${(p || 0).toFixed(2)}"><span class="day__n">${parse(k).toLocaleDateString(undefined, { weekday: 'short' })}</span><span class="day__r"><i></i>${k === selected && p ? ring(52, 3.5, p) : ''}<span>${parse(k).getDate()}</span></span></button>`;
    }
    return html + '</div>';
  }
  function renderToday() {
    const s = S(), ws = weekStartOf(selected);
    let html = `<div class="topblock"><div class="hdr"><div class="hdr__pill glass"><button data-act="menu-list" aria-label="Sort and filter">${ic('list', 24)}</button><button data-act="reorder" aria-label="Reorder">${ic('align-justify', 24)}</button></div><div class="hdr__t">${todayTitle()}</div><div class="hdr__r"><button class="circ tint glass" data-act="add" aria-label="New habit">${ic('plus', 26)}</button><button class="circ glass" data-act="search" aria-label="Search">${ic('search', 22)}</button></div></div>`;
    html += `<div class="week-wrap" id="weeks">${weekStrip(addDays(ws, -7))}${weekStrip(ws)}${weekStrip(addDays(ws, 7))}</div></div>`;
    return html + listHtml();
  }
  function dayList() {
    const s = S();
    let hs = live().filter(h => scheduled(h, selected));
    if (s.hideDone) hs = hs.filter(h => !done(h, selected));
    if (s.hideFailed) hs = hs.filter(h => !failed(h, selected));
    if (s.hideSkipped) hs = hs.filter(h => !skipped(h, selected));
    if (s.sort === 'completedLast') hs = [...hs.filter(h => !done(h, selected)), ...hs.filter(h => done(h, selected))];
    else if (s.sort === 'progress') hs = hs.slice().sort((a, b) => ratio(b, selected) - ratio(a, selected));
    return hs;
  }
  function listHtml() {
    const hs = dayList(); let html = '';
    if (!live().length) return html + `<div class="empty"><span class="ico">${ic('cloud-rain', 64)}</span><b>No Habits Yet</b>Create a habit to start tracking your progress.<button class="pillbtn" data-act="add">${ic('plus', 22)}Create New Habit</button></div>`;
    if (!hs.length) return html + `<div class="empty"><span class="ico">${ic('cloud-rain', 64)}</span><b>Nothing Here</b>No habits scheduled for this day.</div>`;
    html += '<div class="list">';
    const groups = state.groups.length ? [...state.groups.map(g => [g.name, hs.filter(h => h.group === g.name)]), ['', hs.filter(h => !state.groups.find(g => g.name === h.group))]] : [['', hs]];
    groups.forEach(([g, list]) => { if (!list.length) return; if (g) html += `<h3 style="margin:8px 4px 0;font-size:15px;color:var(--ink-3)">${esc(g)}</h3>`; list.forEach(h => { html += habitCard(h); }); });
    return html + '</div>';
  }
  const subtitle = (h, k) => {
    const rep = h.kind === 'todo' ? 'To-do' : h.everyN ? `Every ${h.everyN} days` : h.days.every(Boolean) ? 'Every day' : h.days.filter(Boolean).length + ' days a week';
    if (skipped(h, k)) return rep + ', skipped';
    if (h.type === 'check') return rep;
    const v = value(h, k), tg = target(h);
    if (h.type === 'timer') { const sec = running(h) ? elapsedSec(h) : v * 60; return `${rep}, ${durShort(sec)}/${durShort(tg * 60)}`; }
    return `${rep}, ${fmtNum(v)}/${fmtNum(tg)}${h.unit && h.unit !== 'Count' ? ' ' + esc(h.unit) : ''}`;
  };
  const fmtNum = n => (Math.round(n * 100) / 100).toString().replace('.', ',');
  const dur = sec => { sec = Math.round(sec); const m = Math.floor(sec / 60), s2 = sec % 60; if (!m) return `${s2} seconds`; if (!s2) return `${m} minutes`; return `${m} minutes, ${s2} seconds`; };
  const durShort = sec => { sec = Math.round(sec); const m = Math.floor(sec / 60); return m ? `${m} minute${m === 1 ? '' : 's'}` : `${sec} seconds`; };
  const pvOf = h => h.pv && h.pv !== 'default' ? h.pv : S().progressView;
  function habitCard(h) {
    const k = selected, isDone = done(h, k), run = running(h), pv = pvOf(h), s = S();
    const st = streak(h, k), neg = negStreak(h);
    let badge = '';
    if (st && s.streaks) badge = `<span class="card__badge">${ic('flame', 12, 'fill')}${st}</span>`;
    else if (!isDone && neg && s.negStreaks) badge = `<span class="card__badge neg">${ic('minus', 12)}${neg}</span>`;
    let act;
    if (isDone) act = `<button class="card__act" data-act="undo" data-id="${h.id}" aria-label="Undo">${ic('check', 26)}</button>`;
    else if (h.type === 'timer') act = run ? `<button class="card__act" data-act="timer" data-id="${h.id}" aria-label="Stop">${ring(48, 3, Math.min(1, elapsedSec(h) / (target(h) * 60)), 'ring')}${ic('square', 18)}</button>` : `<button class="card__act" data-act="timer" data-id="${h.id}" aria-label="Start">${ic('play', 22)}</button>`;
    else act = `<button class="card__act" data-act="inc" data-id="${h.id}" aria-label="Add">${ic('plus', 26)}</button>`;
    let chart = '';
    if (pv === 'grid') chart = heat(h);
    else if (pv === 'bars') chart = bars(h);
    else if (pv === 'line') chart = lineChart(h);
    return `<section class="card${isDone ? ' is-done' : ''}${run ? ' is-run' : ''}${pv === 'off' ? ' pv-off' : ''}" style="--c:${h.color}" id="card-${h.id}">${badge}
      <div class="card__head"><button class="card__body" data-act="open" data-id="${h.id}" style="display:flex;align-items:center;gap:12px;flex:1;min-width:0"><span class="card__ico">${emojiOf(h)}</span><span class="card__txt"><div class="card__name">${esc(h.name)}</div><div class="card__sub" id="sub-${h.id}">${subtitle(h, k)}</div></span></button>${act}</div>
      ${chart ? `<button class="card__body" data-act="open" data-id="${h.id}">${chart}</button>` : ''}</section>`;
  }
  // 40 weeks ending with the current week, seven rows Monday..Sunday
  function heat(h) {
    const end = weekStartOf(today()), start = addDays(end, -39 * 7), t = today();
    let cells = '', lastM = -1; const labels = [];
    for (let c = 0; c < 40; c++) for (let r = 0; r < 7; r++) {
      const k = addDays(start, c * 7 + r);
      const m = parse(k).getMonth();
      if (r === 0 && m !== lastM) { labels.push([c, parse(k).toLocaleDateString(undefined, { month: 'short' })]); lastM = m; }
      cells += k > t ? '<i class="n"></i>' : done(h, k) ? '<i class="d"></i>' : '<i></i>';
    }
    // a label needs three columns of room; a cramped first or last one is dropped
    const months = labels.filter(([c], i) => (i === labels.length - 1 || labels[i + 1][0] - c >= 3) && c <= 37).map(([c, l]) => `<span class="heat__m" style="left:${(c * 9.2 + 2).toFixed(1)}px">${l}</span>`).join('');
    return `<div class="heat"><div class="heat__g">${cells}</div>${months}</div>`;
  }
  function bars(h) {
    const t = today(); let html = '<div class="bars">';
    for (let i = 7; i >= 0; i--) { const k = addDays(t, -i), p = ratio(h, k); html += `<div><b><i style="--p:${Math.round((done(h, k) ? 1 : p) * 100)}"></i></b><span>${parse(k).getDate()}</span></div>`; }
    return html + '</div>';
  }
  function lineChart(h) {
    const t = today(), pts = [];
    for (let i = 7; i >= 0; i--) { const k = addDays(t, -i); pts.push([(7 - i) / 7, done(h, k) ? 1 : ratio(h, k)]); }
    const W = 360, H = 60;
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x * W).toFixed(1)},${((1 - y) * (H - 8) + 4).toFixed(1)}`).join(' ');
    return `<div class="line"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d} L${W},${H} L0,${H} Z" fill="rgba(255,255,255,.18)"/><path d="${d}" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>${pts.map(([x, y]) => `<circle cx="${(x * W).toFixed(1)}" cy="${((1 - y) * (H - 8) + 4).toFixed(1)}" r="4" fill="#fff"/>`).join('')}</svg><div class="lbl">${pts.map((_, i) => `<span>${parse(addDays(t, i - 7)).getDate()}</span>`).join('')}</div></div>`;
  }
  // the week strip pages by week: three weeks are laid out, the middle one
  // is the current; landing on a neighbour moves the selection by a week
  function setupWeekSwipe(layer) {
    const w = layer.querySelector('#weeks'); if (!w) return;
    // scroll-linked collapse: the strip lifts with the first 43px of scroll (transform only)
    let raf = null;
    const collapse = () => { raf = null; const k = Math.min(43, Math.max(0, layer.scrollTop)); w.style.transform = k ? `translateY(${-k}px)` : ''; };
    layer.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(collapse); }, { passive: true });
    w.scrollLeft = w.clientWidth; let timer = null, armed = false;
    setTimeout(() => { armed = true; }, 150);                 // the programmatic centring above also fires scroll
    w.addEventListener('scroll', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!armed || !w.isConnected || !w.clientWidth) return;
        const i = Math.round(w.scrollLeft / w.clientWidth); if (i === 1 || !isFinite(i)) return;
        selected = addDays(selected, (i - 1) * 7); render();
      }, 80);
    }, { passive: true });
  }

  // ---------- habit detail sheet ----------
  let detailId = null;
  function detailSheet(id) {
    const h = state.habits.find(x => x.id === id); if (!h) return; detailId = id;
    const k = selected, v = value(h, k), p = done(h, k) ? 1 : ratio(h, k), neg = negStreak(h), st = streak(h, k);
    const isTimer = h.type === 'timer', run = running(h);
    const val = isTimer ? fmtClock(run ? elapsedSec(h) : v * 60) : fmtNum(v);
    openSheet(`<div class="sheet__hdr"><button class="circ glass" data-act="close" aria-label="Close">${ic('x', 24)}</button><div class="r"><button class="circ glass" data-act="note" data-id="${h.id}" aria-label="Note">${ic('notebook-pen', 22)}</button><button class="circ glass" data-act="more" data-id="${h.id}" aria-label="More">${ic('ellipsis', 22)}</button></div></div>
      <div class="det"><div class="det__name">${emojiOf(h)}<span>${esc(h.name)}</span></div><div class="det__sub">${subtitle(h, k).split(',')[0]}</div>
        <div class="det__ringrow"><span id="det-streak">${detStreak(h, k)}</span>
          <button class="det__pm minus" data-act="dec" data-id="${h.id}" aria-label="Less">${ic('minus', 26)}</button>
          <div class="det__ring">${ring(200, 10, p)}<i class="knob" style="transform:rotate(${(p * 360).toFixed(1)}deg)"></i><div class="det__val${isTimer || String(val).length > 2 ? ' small' : ''}" id="dv-${h.id}">${val}</div></div>
          <button class="det__pm plus" data-act="${isTimer ? 'timer' : 'inc'}" data-id="${h.id}" aria-label="More">${isTimer ? ic(run ? 'square' : 'play', 24) : ic('plus', 26)}</button></div>
        ${state.notes[k] && state.notes[k][h.id] ? `<p class="note" style="text-align:center">${esc(state.notes[k][h.id])}</p>` : ''}</div>
      <div class="det__foot"><button class="ghost" data-act="skip" data-id="${h.id}" aria-label="Skip">${ic('fast-forward', 26)}</button><button class="ghost" data-act="fail" data-id="${h.id}" aria-label="Fail">${ic('x', 26)}</button><button class="btn" data-act="complete" data-id="${h.id}">${done(h, k) ? 'Undo' : 'Complete'}</button></div>`, h.color);
  }
  const detStreak = (h, k) => { const st = streak(h, k), neg = negStreak(h); return done(h, k) && st && S().streaks ? `<div class="det__streak" style="color:var(--c)">${ic('flame', 22)}${st}</div>` : neg && S().negStreaks ? `<div class="det__streak">${ic('minus', 22)}${neg}</div>` : ''; };
  const fmtClock = sec => { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60), s2 = sec % 60; return m + ':' + pad(s2); };
  // the open sheet follows the data without being rebuilt, so the ring and
  // the knob glide to the new value
  function refreshDetail() {
    if (!detailId || !sheet.classList.contains('open')) return;
    const h = state.habits.find(x => x.id === detailId), dv = sheet.querySelector('#dv-' + detailId); if (!h || !dv) return;
    const k = selected, v = value(h, k), p = done(h, k) ? 1 : ratio(h, k), isTimer = h.type === 'timer', run = running(h);
    const val = isTimer ? fmtClock(run ? elapsedSec(h) : v * 60) : fmtNum(v);
    dv.textContent = val; dv.classList.toggle('small', isTimer || String(val).length > 2);
    const ring = sheet.querySelector('.det__ring .p'); if (ring) { const len = parseFloat(ring.getAttribute('stroke-dasharray')); ring.setAttribute('stroke-dashoffset', (len * (1 - p)).toFixed(2)); }
    const knob = sheet.querySelector('.det__ring .knob'); if (knob) knob.style.transform = `rotate(${(p * 360).toFixed(1)}deg)`;
    const st = sheet.querySelector('#det-streak'); if (st) st.innerHTML = detStreak(h, k);
    const btn = sheet.querySelector('.det__foot .btn'); if (btn) btn.textContent = done(h, k) ? 'Undo' : 'Complete';
    const plus = sheet.querySelector('.det__pm.plus'); if (plus && isTimer) plus.innerHTML = ic(run ? 'square' : 'play', 24);
  }

  // ---------- menus ----------
  let menuEl = null;
  function openMenu(html, anchor) {
    closeMenu();
    const r = anchor.getBoundingClientRect();
    menuEl = document.createElement('div'); menuEl.className = 'menu glass'; menuEl.innerHTML = html;
    menuEl.style.top = (r.bottom + 6) + 'px'; menuEl.style.left = Math.max(10, Math.min(r.left, window.innerWidth - 270)) + 'px';
    document.body.appendChild(menuEl);
    setTimeout(() => document.addEventListener('click', onMenuOutside, { once: true }), 0);
  }
  function onMenuOutside(e) { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
  const SORTS = [['default', 'Default', 'Sort habits in your custom order.'], ['progress', 'By Progress', 'Sort habits by current progress.'], ['completedLast', 'Completed Last', 'Keep unfinished habits above completed ones.']];
  const PVS = [['default', 'Default', 'layout-list'], ['off', 'Off', ''], ['grid', 'Grid', 'grid-3x3'], ['bars', 'Bars', 'chart-no-axes-column'], ['line', 'Line', 'chart-line']];
  function listMenu(anchor) {
    const s = S();
    openMenu(`<button data-act="menu-sort">${ic('arrow-down-narrow-wide', 22)}<span class="mt">Sort<small>${SORTS.find(x => x[0] === s.sort)[1]}</small></span>${ic('chevron-right', 18)}</button>
      <button data-act="menu-pv">${ic('layout-list', 22)}<span class="mt">Progress View<small>${PVS.find(x => x[0] === s.progressView)[1]}</small></span>${ic('chevron-right', 18)}</button><hr>
      <button data-act="toggle-s" data-k="hideDone">${ic('circle-check', 22)}<span class="mt">Hide Completed</span><span class="chk">${s.hideDone ? ic('check', 18) : ''}</span></button>
      <button data-act="toggle-s" data-k="hideFailed">${ic('circle-x', 22)}<span class="mt">Hide Failed</span><span class="chk">${s.hideFailed ? ic('check', 18) : ''}</span></button>
      <button data-act="toggle-s" data-k="hideSkipped">${ic('circle-play', 22)}<span class="mt">Hide Skipped</span><span class="chk">${s.hideSkipped ? ic('check', 18) : ''}</span></button>
      ${s.hideDone || s.hideFailed || s.hideSkipped ? `<hr><button class="danger" data-act="clear-filters">Clear Filters</button>` : ''}`, anchor);
  }
  function sortMenu(anchor) { openMenu(SORTS.map(([v, l, d]) => `<button data-act="set-s" data-k="sort" data-v="${v}">${ic('list', 22)}<span class="mt">${l}<small>${d}</small></span><span class="chk">${S().sort === v ? ic('check', 18) : ''}</span></button>`).join(''), anchor); }
  function pvMenu(anchor) { openMenu(PVS.filter(x => x[0] !== 'default').map(([v, l, i]) => `<button data-act="set-s" data-k="progressView" data-v="${v}">${i ? ic(i, 22) : '<span style="width:22px"></span>'}<span class="mt">${l}</span><span class="chk">${S().progressView === v ? ic('check', 18) : ''}</span></button>`).join(''), anchor); }
  function moreMenu(anchor, h) {
    openMenu(`<button data-act="edit" data-id="${h.id}">${ic('pen-line', 22)}<span class="mt">Edit</span></button><button data-act="archive" data-id="${h.id}">${ic('archive', 22)}<span class="mt">${h.archived ? 'Restore' : 'Archive'}</span></button><hr><button class="danger" data-act="delete" data-id="${h.id}">${ic('trash-2', 22)}<span class="mt">Delete</span></button>`, anchor);
  }

  // ---------- sheets ----------
  let closeTimer = null;
  function openSheet(html, tint) {
    clearTimeout(closeTimer);
    sheet.innerHTML = html; sheet.classList.toggle('tint', !!tint); sheet.style.setProperty('--c', tint || S().accent);
    sheet.style.transform = ''; scrim.style.opacity = ''; sheet.scrollTop = 0;
    sheet.classList.remove('closing'); scrim.classList.add('open');
    requestAnimationFrame(() => sheet.classList.add('open'));
  }
  function closeSheet() {
    detailId = null; scrim.classList.remove('open'); scrim.style.opacity = '';
    sheet.classList.add('closing'); sheet.classList.remove('open', 'dragging'); sheet.style.transform = '';
    closeTimer = setTimeout(() => { sheet.innerHTML = ''; sheet.classList.remove('closing'); }, 320);
  }
  scrim.addEventListener('click', closeSheet);
  // drag the sheet down to dismiss: 1:1 under the finger, friction upwards,
  // a flick or 120px lets go, otherwise it springs back
  (function sheetDrag() {
    let y0 = 0, t0 = 0, dy = 0, on = false;
    sheet.addEventListener('touchstart', e => { if (on || e.touches.length > 1) return; if (sheet.scrollTop > 0) return; y0 = e.touches[0].clientY; t0 = Date.now(); dy = 0; on = true; }, { passive: true });
    sheet.addEventListener('touchmove', e => {
      if (!on) return; dy = e.touches[0].clientY - y0;
      if (dy < 0) { dy = dy / 4; } else if (sheet.scrollTop > 0) { on = false; sheet.classList.remove('dragging'); sheet.style.transform = ''; return; }
      if (dy > 0 && e.cancelable) e.preventDefault();
      sheet.classList.add('dragging'); sheet.style.transform = `translateY(${dy}px)`;
      scrim.style.opacity = String(Math.max(0, 1 - dy / 500));
    }, { passive: false });
    const end = () => {
      if (!on) return; on = false; sheet.classList.remove('dragging');
      const v = dy / Math.max(1, Date.now() - t0);
      if (dy > 120 || v > 0.11) closeSheet(); else { sheet.style.transform = ''; scrim.style.opacity = ''; }
    };
    sheet.addEventListener('touchend', end); sheet.addEventListener('touchcancel', end);
  })();

  // ---------- templates ----------
  const T = window.TEMPLATES || {};
  const KINDS = [['good', 'Good'], ['health', 'Health'], ['bad', 'Bad'], ['todo', 'To-do']];
  let tplKind = 'good', tplQuery = '';
  function templatesSheet() {
    const q = tplQuery.trim().toLowerCase();
    const kinds = q ? KINDS.map(k => k[0]) : [tplKind];
    let list = '';
    kinds.forEach(kind => {
      const k = T[kind]; if (!k) return;
      k.sections.forEach(([title, items], si) => {
        const rows = items.filter(t => !q || t[0].toLowerCase().includes(q));
        if (!rows.length) return;
        const badge = kind === 'health' || kind === 'bad' ? `<span class="badge" style="background:var(--red)"></span>` : kind === 'todo' ? `<span class="badge" style="background:var(--blue)"></span>` : '';
        list += `<h3>${q ? k.label + ' · ' : ''}${title}</h3><div class="grp grp--glass">${rows.map(t => `<button class="row" data-act="tpl" data-kind="${kind}" data-i="${si}:${items.indexOf(t)}"><span class="card__ico"><span class="emoji">${EMOJI[t[1]] || '✅'}</span></span><span class="row__t">${esc(t[0])}</span>${badge}${ic('chevron-right', 18, 'chev')}</button>`).join('')}</div>`;
      });
    });
    if (!list) list = `<p class="note" style="text-align:center;padding:20px">Nothing matches.</p>`;
    openSheet(`<div class="sheet__hdr"><button class="circ glass" data-act="close" aria-label="Close">${ic('x', 24)}</button><span class="sheet__title">Templates</span><span style="width:44px"></span></div>
      <div class="tpl"><div class="seg">${KINDS.map(([v, l]) => `<button class="${v === tplKind && !q ? 'on' : ''}" data-act="tpl-kind" data-v="${v}">${l}</button>`).join('')}</div>
      <div class="grp grp--glass"><button class="row" data-act="tpl-custom" data-kind="${tplKind}"><span class="row__ico" style="background:var(--green)">${ic('badge-check', 18)}</span><span class="row__t">${tplKind === 'todo' ? 'Create a Custom Task' : 'Create a Custom Habit'}</span>${ic('chevron-right', 18, 'chev')}</button></div>
      ${list}<div class="search"><div>${ic('search', 18)}<input type="search" id="tpl-q" placeholder="Search templates" value="${esc(tplQuery)}" autocomplete="off" enterkeyhint="search"></div></div></div>`);
    const inp = $('#tpl-q'); if (q) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }
  const KIND_COLOR = { good: COLORS[3], health: COLORS[0], bad: COLORS[0], todo: COLORS[7] };
  function newDraft(kind) {
    return { id: uid(), name: '', icon: 'circle-check', emoji: '✅', kind: kind || 'good', color: KIND_COLOR[kind || 'good'], group: '', type: 'check', target: 1, unit: 'Count', step: 1, days: [1, 1, 1, 1, 1, 1, 1], createdAt: today(), startsOn: today(), endsOn: '', reminder: '', pv: 'default', description: '', _new: true };
  }
  function fromTemplate(kind, t) {          // t = [name, icon, type, target, unit, group]
    draft = newDraft(kind === 'health' ? 'good' : kind);
    Object.assign(draft, { name: t[0], icon: t[1], emoji: EMOJI[t[1]] || '✅', type: t[2] || 'check', target: t[3] || (t[2] === 'timer' ? 10 : 1), unit: t[2] === 'timer' ? 'Minutes' : (t[4] || 'Count') });
    closeSheet(); stack = [{ p: 'edit' }]; render('push');
  }

  // ---------- Add / Edit habit (grouped-list pages) ----------
  let draft = null;
  const row = (act, ico, bg, label, val, extra = '') => `<button class="row" data-act="${act}" ${extra}><span class="row__ico" style="background:${bg}">${ico}</span><span class="row__t">${label}</span><span class="row__v">${val || ''}</span>${ic('chevron-right', 18, 'chev')}</button>`;
  const unitLabel = d => d.type === 'timer' ? 'minutes' : (d.unit && d.unit !== 'Count' ? d.unit : '');
  const repText = d => d.everyN ? `Every ${d.everyN} days` : d.days.every(Boolean) ? 'Every day' : d.days.filter(Boolean).length + ' days a week';
  const previewCard = d => `<section class="card pv-off" style="--c:${d.color};margin-top:10px"><div class="card__head"><span class="card__ico">${emojiOf(d)}</span><span class="card__txt"><div class="card__name">${d.name ? esc(d.name) : '<span style="opacity:.45">Habit name</span>'}</div><div class="card__sub">${repText(d)}${d.type !== 'check' ? `, ${d.target} ${unitLabel(d)}` : ''}</div></span><span class="card__act">${ic('plus', 26)}</span></div></section>`;
  const TYPES = [['good', 'Good', 'circle-check', 'var(--green)', 'Starts as not completed. Each mark increases the habit value.'], ['bad', 'Bad', 'circle-minus', 'var(--red)', 'A bad habit has two statuses: completed or missed. Completed: total logged value is 0 or within the goal. Missed: total logged value exceeds the goal. At the end of each period, if the total is 0 or within the goal, the habit is automatically marked as completed.'], ['track', 'Track', 'smile', 'var(--orange)', 'A habit without a goal, reminders, or missed badge.'], ['todo', 'To-Do', 'circle-dot', 'var(--blue)', 'One-time habit that disappears after completion.']];
  const emptyState = (title, text, btn) => `<div class="empty"><span class="ico">${ic('cloud-rain', 56)}</span><b>${title}</b>${text}${btn ? `<div style="margin-top:18px">${btn}</div>` : ''}</div>`;
  const minusBtn = attrs => `<button class="minus" ${attrs} style="width:22px;height:22px;border-radius:50%;background:var(--red);color:#fff;display:grid;place-items:center">${ic('minus', 14)}</button>`;
  function renderPage(p) {
    const d = draft, s = S();
    switch (p.p) {
      case 'edit': {
        const isNew = d._new;
        return pageT(isNew ? 'Add Habit' : 'Edit Habit', undefined, `<button class="r circ" style="background:${d.name ? 'var(--green)' : 'rgba(120,120,128,.25)'};color:#fff" data-act="save" aria-label="Save">${ic('check', 24)}</button>`) + `<div class="pg">
          <div style="position:relative" class="namewrap">${previewCard(d)}<input class="field" id="f-name" value="${esc(d.name)}" placeholder="Habit name" autocomplete="off" enterkeyhint="done" style="position:absolute;left:64px;top:22px;width:calc(100% - 140px);padding:0;font-size:20px;font-weight:600;background:transparent"><span style="position:absolute;right:72px;top:30px;color:var(--ink-3)">${ic('pencil', 16)}</span></div>
          <p class="note" style="text-align:right;margin-top:6px" id="f-count">${d.name.length}/100</p>
          <h3>Appearance</h3><div class="grp">
            ${row('go', ic('palette', 16), '#af52de', 'Color', `<span class="dot" style="background:${d.color}"></span>${ic('chevrons-up-down', 16)}`, 'data-p="edit-color"')}
            ${row('go', ic('circle-help', 16), '#ff3b30', 'Icon', `<span class="emoji">${esc(d.emoji)}</span>`, 'data-p="edit-icon"')}
            ${row('go', ic('text', 16), '#ff9500', 'Description', d.description ? 'Set' : 'Empty', 'data-p="edit-desc"')}
            ${row('go', ic('layout-list', 16), '#007aff', 'Progress View', PVS.find(x => x[0] === (d.pv || 'default'))[1], 'data-p="edit-pv"')}</div>
          <h3>General</h3><div class="grp">
            ${row('go', ic('circle-check', 16), '#32ade6', 'Type', `${ic(TYPES.find(x => x[0] === d.kind)[2], 16)} ${TYPES.find(x => x[0] === d.kind)[1]}`, 'data-p="edit-type"')}
            ${row('go', ic('folder', 16), '#5e5ce6', 'Groups', d.group || 'No group', 'data-p="edit-group"')}
            ${d.kind === 'track' ? '' : row('go', ic('flag', 16), '#34c759', 'Goal', `${d.target}${d.type === 'timer' ? ' min' : d.unit && d.unit !== 'Count' ? ' ' + esc(d.unit) : ''}`, 'data-p="edit-goal"')}
            ${row('go', ic('sigma', 16), '#a2845e', 'Average', 'None', 'data-p="edit-none"')}
            ${d.kind === 'todo' ? '' : row('go', ic('repeat', 16), '#5e5ce6', 'Repeat', repText(d), 'data-p="edit-repeat"')}
            ${row('go', ic('bell', 16), '#ff9500', 'Notifications', d.reminder || 'Off', 'data-p="edit-notif"')}
            ${row('go', ic('hand', 16), '#ff3b30', 'Block selected apps', 'Off', 'data-p="edit-none"')}
            ${row('go', ic('link', 16), '#007aff', 'URL', d.url ? 'Set' : 'None', 'data-p="edit-url"')}
            <div class="row"><span class="row__ico" style="background:#34c759">${ic('calendar', 16)}</span><span class="row__t">Starts on</span><input type="date" class="field num" id="f-start" value="${d.startsOn}" style="width:auto;font-weight:500"></div>
            <div class="row"><span class="row__ico" style="background:#8e8e93">${ic('calendar-x', 16)}</span><span class="row__t">Set end date</span><label class="switch"><input type="checkbox" id="f-endon" ${d.endsOn ? 'checked' : ''}><i></i></label></div>
            ${d.endsOn ? `<div class="row"><span class="row__ico" style="background:#ff9500">${ic('calendar', 16)}</span><span class="row__t">Ends on</span><input type="date" class="field num" id="f-end" value="${d.endsOn}" style="width:auto;font-weight:500"></div>` : ''}</div>
          ${isNew ? '' : `<div class="grp" style="margin-top:22px"><button class="row" data-act="archive" data-id="${d.id}"><span class="row__t">${d.archived ? 'Restore' : 'Archive Habit'}</span></button><button class="row danger" data-act="delete" data-id="${d.id}"><span class="row__t">Delete Habit</span></button></div>`}
          <div style="height:40px"></div></div>`;
      }
      case 'edit-color': return pageT('Color') + `<div class="pg"><div class="grp"><div class="cgrid">${COLORS.map(c => `<button style="--v:${c}" class="${c === d.color ? 'on' : ''}" data-act="set-d" data-k="color" data-v="${c}" aria-label="${c}"></button>`).join('')}</div></div>${previewCard(d)}</div>`;
      case 'edit-icon': return pageT('Icon') + `<div class="pg"><div class="grp"><div class="egrid">${EMOJIS.map(e => `<button class="${e === d.emoji ? 'on' : ''}" data-act="set-d" data-k="emoji" data-v="${e}"><span class="emoji">${e}</span></button>`).join('')}</div></div>${previewCard(d)}</div>`;
      case 'edit-desc': return pageT('Description') + `<div class="pg"><div class="grp"><textarea class="field" id="f-desc" placeholder="Description">${esc(d.description)}</textarea></div><p class="note">Leave the field blank to remove the description.</p></div>`;
      case 'edit-pv': return pageT('Progress View') + `<div class="pg"><div class="grp">${PVS.map(([v, l, i]) => `<button class="opt" data-act="set-d" data-k="pv" data-v="${v}">${i ? ic(i, 20) : '<span style="width:20px"></span>'}<span>${l}</span>${(d.pv || 'default') === v ? `<span class="chk">${ic('check', 20)}</span>` : ''}</button>`).join('')}</div><p class="note">Default follows your choice in Settings.</p><div class="preview">${pvPreview(d)}</div></div>`;
      case 'edit-type': return pageT('Type') + `<div class="pg" style="display:flex;flex-direction:column;gap:12px">${TYPES.map(([v, l, i, c, desc]) => `<div><div class="grp"><button class="opt" data-act="set-d" data-k="kind" data-v="${v}"><span style="color:${c}">${ic(i, 22)}</span><span>${l}</span>${d.kind === v ? `<span class="chk">${ic('check', 20)}</span>` : ''}</button></div><p class="note">${desc}</p></div>`).join('')}</div>`;
      case 'edit-goal': return pageT('Goal') + `<div class="pg"><div class="grp"><div class="row"><span class="row__ico" style="background:var(--card-2);color:var(--ink-3)">${ic('heart', 16)}</span><span class="row__t">Apple Health</span><label class="switch"><input type="checkbox" disabled><i></i></label></div></div><p class="note">Sync the habit data with the Health app.</p>
        <div class="grp" style="margin-top:14px"><div class="row"><span class="row__ico" style="background:#34c759">${ic('flag', 16)}</span><span class="row__t">Goal</span><input class="field num" id="f-goal" type="number" inputmode="decimal" min="1" value="${d.target}"></div>
        ${row('unit-menu', ic('ruler', 16), '#32ade6', 'Unit', d.type === 'timer' ? 'Minutes' : esc(d.unit || 'Count'))}
        <div class="row"><span class="row__ico" style="background:#ff9500">${ic('plus-square', 16)}</span><span class="row__t">Step</span><input class="field num" id="f-step" type="number" inputmode="decimal" min="0.1" step="any" value="${d.step || 1}"></div></div><p class="note">When you tap the habit, this amount is added.</p>
        <div class="grp" style="margin-top:14px"><div class="row"><span class="row__ico" style="background:#8e8e93">${ic('pie-chart', 16)}</span><span class="row__t">Exclude from daily progress</span><label class="switch"><input type="checkbox" id="f-excl" ${d.excluded ? 'checked' : ''}><i></i></label></div></div><p class="note">When on, this habit won't count toward daily progress.</p>
        <h3>Goal Plan</h3><div class="grp"><button class="row" data-act="none"><span class="row__ico" style="background:var(--green)">${ic('plus', 16)}</span><span class="row__t">Add Goal Plan</span></button></div><p class="note">Goal plans let you change a habit's goal over time without affecting previous history. For example, you can start with 30 minutes of reading, change the goal to 40 minutes in two weeks, then to 1 hour in one month. Your past history stays intact.</p></div>`;
      case 'edit-repeat': return pageT('Repeat') + `<div class="pg"><div class="grp"><div class="row"><span class="row__ico" style="background:#5e5ce6">${ic('repeat', 16)}</span><span class="row__t">Goal Period</span><span class="row__v">Daily ${ic('chevrons-up-down', 16)}</span></div></div><p class="note">The time window in which the goal is measured.</p>
        <h3>Frequency</h3><div class="grp"><button class="opt" data-act="set-d" data-k="everyN" data-v="0"><span>Specific days of the week</span>${!d.everyN ? `<span class="chk">${ic('check', 20)}</span>` : ''}</button>${!d.everyN ? `<div class="chips">${DAYS.map((n, i) => `<button class="chip${d.days[i] ? ' on' : ''}" data-act="day" data-i="${i}">${n.slice(0, 2)}</button>`).join('')}</div>` : ''}
        <button class="opt" data-act="none"><span>Specific days of the month</span></button><button class="opt" data-act="none"><span>Flexible Days per Week</span></button><button class="opt" data-act="none"><span>Flexible Days per Month</span></button>
        <button class="opt" data-act="set-d" data-k="everyN" data-v="${d.everyN || 2}"><span>Every N days</span>${d.everyN ? `<span class="chk">${ic('check', 20)}</span>` : ''}</button>${d.everyN ? `<div class="row"><span class="row__t">Every</span><input class="field num" id="f-everyn" type="number" min="1" value="${d.everyN}"><span>days</span></div>` : ''}</div><p class="note">How often the goal needs to be completed within the period.</p>
        <h3>Repeat Plan</h3><div class="grp"><button class="row" data-act="none"><span class="row__ico" style="background:var(--green)">${ic('plus', 16)}</span><span class="row__t">Add Repeat Plan</span></button></div><p class="note">Repeat plans let you change a habit's schedule over time without affecting previous history.</p></div>`;
      case 'edit-notif': return pageT('Notifications') + `<div class="pg"><div class="grp"><div class="row"><span class="row__ico" style="background:#ff9500">${ic('bell', 16)}</span><span class="row__t">Reminder</span><label class="switch"><input type="checkbox" id="f-ron" ${d.reminder ? 'checked' : ''}><i></i></label></div>${d.reminder ? `<div class="row"><span class="row__ico" style="background:#007aff">${ic('clock', 16)}</span><span class="row__t">Time</span><input type="time" class="field num" id="f-r" value="${d.reminder}" style="width:auto"></div>` : ''}</div><p class="note">${notifNote()}</p>${notifState() === 'default' ? `<div class="grp" style="margin-top:14px"><button class="row" data-act="notif"><span class="row__t" style="color:var(--accent)">Enable notifications</span></button></div>` : ''}</div>`;
      case 'edit-url': return pageT('URL') + `<div class="pg"><div class="grp"><input class="field" id="f-url" placeholder="URL" value="${esc(d.url || '')}" inputmode="url" autocapitalize="none"></div><p class="note">Leave the field blank to remove the URL. The URL opens when you tap the habit's link button. Example: a Shortcuts link, shortcuts://run-shortcut?name=…</p></div>`;
      case 'edit-group': return pageT('Groups', undefined, `<button class="r circ" data-act="group-new" aria-label="New group">${ic('plus', 24)}</button>`) + `<div class="pg">${state.groups.length ? `<div class="grp"><button class="opt" data-act="set-d" data-k="group" data-v=""><span>No group</span>${!d.group ? `<span class="chk">${ic('check', 20)}</span>` : ''}</button>${state.groups.map(g => `<button class="opt" data-act="set-d" data-k="group" data-v="${esc(g.name)}"><span>${esc(g.name)}</span>${d.group === g.name ? `<span class="chk">${ic('check', 20)}</span>` : ''}</button>`).join('')}</div>` : emptyState('No Groups Yet', 'Create a group to organize related habits.', `<button class="pillbtn" data-act="group-new">${ic('plus', 18)}Create New Group</button>`)}</div>`;
      case 'edit-none': return pageT('Coming later') + `<div class="pg"><p class="note" style="text-align:center;padding-top:40px">Not part of this version.</p></div>`;
      case 'reorder': return pageT('Reorder Habits', `<button class="l circ" data-act="pop" aria-label="Close">${ic('x', 24)}</button>`, `<button class="r circ" style="background:var(--accent);color:#fff" data-act="pop" aria-label="Done">${ic('check', 24)}</button>`) + `<div class="ro"><div class="grp" id="ro-list"><div class="row" style="background:var(--card-2);min-height:40px;font-weight:600;color:var(--ink-3)">Ungrouped</div>${live().map(h => `<div class="row" data-id="${h.id}"><span class="minus">${ic('minus', 14)}</span><span class="card__ico" style="width:26px;height:26px;font-size:20px">${emojiOf(h)}</span><span class="row__t" style="color:${h.color};font-weight:600">${esc(h.name)}<small>${subtitle(h, selected)}</small></span><span class="handle" style="color:var(--ink-4)">${ic('align-justify', 20)}</span></div>`).join('')}</div></div>`;
      case 'set-appearance': return pageT('Appearance') + `<div class="pg"><div class="grp">${[['auto', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button class="opt" data-act="set-s" data-k="appearance" data-v="${v}"><span>${l}</span>${s.appearance === v ? `<span class="chk">${ic('check', 20)}</span>` : ''}</button>`).join('')}</div></div>`;
      case 'set-theme': return pageT('Theme') + `<div class="pg"><div class="grp"><div class="row"><span class="row__ico" style="background:#af52de">${ic('palette', 16)}</span><span class="row__t">Color</span><span class="row__v"><span class="dot" style="background:${s.accent}"></span></span></div><div class="swatches" style="padding-top:0">${ACCENTS.map(c => `<button style="--v:${c};width:30px;border-radius:50%" class="${s.accent === c ? 'on' : ''}" data-act="set-s" data-k="accent" data-v="${c}" aria-label="${c}"></button>`).join('')}</div>
        <div class="row"><span class="row__ico" style="background:#ff9500">${ic('smartphone', 16)}</span><span class="row__t">Custom Background</span><label class="switch"><input type="checkbox" data-set-s="customBg" ${s.customBg ? 'checked' : ''}><i></i></label></div></div>
        ${s.customBg ? `<h3 style="display:flex;justify-content:space-between">Custom Background<button data-act="bg-random" style="color:var(--accent);font-size:13px">Randomize</button></h3><div class="grp"><div class="swatches">${BG_SWATCHES.map(c => `<button style="--v:${c}" data-act="set-s" data-k="bgStart" data-v="${c}" aria-label="${c}"></button>`).join('')}</div>
        <div class="row"><span class="row__ico" style="background:#32ade6">${ic('arrow-up-to-line', 16)}</span><span class="row__t">Start Color</span><input type="color" data-set-s="bgStart" value="${s.bgStart}" style="width:34px;height:34px;border:0;background:none"></div>
        <div class="row"><span class="row__ico" style="background:#ff9500">${ic('arrow-down-to-line', 16)}</span><span class="row__t">End Color</span><input type="color" data-set-s="bgEnd" value="${s.bgEnd}" style="width:34px;height:34px;border:0;background:none"></div></div><div class="phone"></div>` : ''}</div>`;
      case 'set-sort': return pageT('Sort Habits') + `<div class="pg" style="display:flex;flex-direction:column;gap:12px">${SORTS.map(([v, l, desc]) => `<div><div class="grp"><button class="opt" data-act="set-s" data-k="sort" data-v="${v}">${ic('list', 20)}<span>${l}</span>${s.sort === v ? `<span class="chk">${ic('check', 20)}</span>` : ''}</button></div><p class="note">${desc}</p></div>`).join('')}
        ${[['hideDone', 'Hide Completed', 'circle-check', 'Hide completed habits from the day list.'], ['hideFailed', 'Hide Failed', 'circle-x', 'Hide failed habits from the day list.'], ['hideSkipped', 'Hide Skipped', 'circle-play', 'Hide skipped habits from the day list.']].map(([k, l, i, desc]) => `<div><div class="grp"><div class="opt">${ic(i, 20)}<span>${l}</span><label class="switch" style="margin-left:auto"><input type="checkbox" data-set-s="${k}" ${s[k] ? 'checked' : ''}><i></i></label></div></div><p class="note">${desc}</p></div>`).join('')}</div>`;
      case 'set-pv': return pageT('Progress View') + `<div class="pg"><div class="grp">${PVS.filter(x => x[0] !== 'default').map(([v, l, i]) => `<button class="opt" data-act="set-s" data-k="progressView" data-v="${v}">${i ? ic(i, 20) : '<span style="width:20px"></span>'}<span>${l}</span>${s.progressView === v ? `<span class="chk">${ic('check', 20)}</span>` : ''}</button>`).join('')}</div><p class="note" style="color:var(--orange)">Using this feature for every habit can affect performance. If the app slows down, turn it off here and use it only for specific habits.</p><div class="preview">${pvPreview({ name: 'Drink Water', emoji: '💧', color: COLORS[7], type: 'count', target: 2, unit: 'litres', pv: 'default' })}</div></div>`;
      case 'set-more': return pageT('Appearance') + `<div class="pg"><div class="grp">${[['confetti', 'Confetti Animation', 'party-popper', '#af52de'], ['streaks', 'Streaks', 'flame', '#ff9500'], ['negStreaks', 'Negative Streaks', 'x', '#ff3b30'], ['badges', 'Show Recap Popups', 'trophy', '#ffcc00']].map(([k, l, i, c]) => `<div class="row"><span class="row__ico" style="background:${c}">${ic(i, 16)}</span><span class="row__t">${l}</span><label class="switch"><input type="checkbox" data-set-s="${k}" ${s[k] ? 'checked' : ''}><i></i></label></div>`).join('')}</div></div>`;
      case 'set-sounds': return pageT('Sounds') + `<div class="pg"><div class="grp"><div class="row"><span class="row__ico" style="background:#32ade6">${ic('volume-2', 16)}</span><span class="row__t">Sounds</span><label class="switch"><input type="checkbox" data-set-s="sounds" ${s.sounds ? 'checked' : ''}><i></i></label></div><div class="row"><span class="row__ico" style="background:#34c759">${ic('circle-check', 16)}</span><span class="row__t">Completion Sound</span><select class="field num" data-set-s="completionSound" style="width:auto">${['default', 'chime', 'pop', 'bell'].map(v => `<option value="${v}" ${s.completionSound === v ? 'selected' : ''}>${v[0].toUpperCase() + v.slice(1)}</option>`).join('')}</select></div></div></div>`;
      case 'groups': return pageT('Groups', undefined, `<button class="r circ" data-act="group-new" aria-label="New group">${ic('plus', 24)}</button>`) + `<div class="pg">${state.groups.length ? `<div class="grp">${state.groups.map(g => `<div class="row"><span class="card__ico" style="width:26px;height:26px;font-size:20px"><span class="emoji">${g.emoji || '📁'}</span></span><span class="row__t">${esc(g.name)}<small>${live().filter(h => h.group === g.name).length} habits</small></span>${minusBtn(`data-act="group-del" data-name="${esc(g.name)}"`)}</div>`).join('')}</div>` : emptyState('No Groups Yet', 'Create a group to organize related habits.', `<button class="pillbtn" data-act="group-new">${ic('plus', 18)}Create New Group</button>`)}</div>`;
      case 'vacations': return pageT('Vacations', undefined, `<button class="r circ" data-act="vac-new" aria-label="New vacation">${ic('plus', 24)}</button>`) + `<div class="pg">${state.vacations.length ? `<div class="grp">${state.vacations.map((v, i) => `<div class="row"><span class="row__ico" style="background:#34c759">${ic('palmtree', 16)}</span><span class="row__t">${fmtDate(v.from)} – ${fmtDate(v.to)}</span>${minusBtn(`data-act="vac-del" data-i="${i}"`)}</div>`).join('')}</div>` : emptyState('No Vacations Yet', 'Plan a vacation to pause habits for selected dates.', `<button class="pillbtn" data-act="vac-new">${ic('plus', 18)}Create New Vacation</button>`)}</div>`;
      case 'achievements': return pageT('Achievements') + renderAchievements();
      case 'archived': { const a = state.habits.filter(x => x.archived); return pageT('Archived Habits') + `<div class="pg">${a.length ? `<div class="grp">${a.map(x => `<button class="row" data-act="edit" data-id="${x.id}"><span class="card__ico" style="width:26px;height:26px;font-size:20px">${emojiOf(x)}</span><span class="row__t">${esc(x.name)}<small>${completions(x)} completions</small></span>${ic('chevron-right', 18, 'chev')}</button>`).join('')}</div>` : emptyState('No Archived Habits Yet', '')}</div>`; }
      case 'search': return pageT('Search', `<button class="l circ" data-act="pop" aria-label="Close">${ic('x', 24)}</button>`) + `<div class="pg"><div class="search" style="position:static;margin:0;padding:0;background:none"><div>${ic('search', 18)}<input type="search" id="hsearch" placeholder="Search habits" autocomplete="off" enterkeyhint="search"></div></div><div class="grp" id="hsearch-out" style="margin-top:14px">${live().map(h => `<button class="row" data-act="open-day" data-id="${h.id}"><span class="card__ico" style="width:26px;height:26px;font-size:20px">${emojiOf(h)}</span><span class="row__t">${esc(h.name)}</span>${ic('chevron-right', 18, 'chev')}</button>`).join('')}</div></div>`;
    }
    return pageT('');
  }
  const pvPreview = d => { const h = Object.assign({ id: 'demo', kind: 'good', days: [1, 1, 1, 1, 1, 1, 1] }, d); const pv = pvOf(h); return `<section class="card${pv === 'off' ? ' pv-off' : ''}" style="--c:${h.color}"><div class="card__head"><span class="card__ico">${emojiOf(h)}</span><span class="card__txt"><div class="card__name">${esc(h.name || 'Habit name')}</div><div class="card__sub">Every day${h.type !== 'check' ? `, ${h.target} ${unitLabel(h)}` : ''}</div></span><span class="card__act">${ic('plus', 26)}</span></div>${pv === 'grid' ? heat(h) : pv === 'bars' ? bars(h) : pv === 'line' ? lineChart(h) : ''}</section>`; };
  function readDraft() {
    const d = draft; if (!d) return;
    const g = (id, f) => { const el = $(id); if (el) f(el); };
    g('#f-name', el => { d.name = el.value.trim().slice(0, 100); });
    g('#f-desc', el => { d.description = el.value.trim(); });
    g('#f-url', el => { d.url = el.value.trim(); });
    g('#f-goal', el => { d.target = Math.max(0.1, parseFloat(el.value) || 1); });
    g('#f-step', el => { d.step = Math.max(0.1, parseFloat(el.value) || 1); });
    g('#f-excl', el => { d.excluded = el.checked; });
    g('#f-everyn', el => { d.everyN = Math.max(1, parseInt(el.value, 10) || 1); });
    g('#f-start', el => { if (el.value) d.startsOn = el.value; });
    g('#f-end', el => { if (el.value) d.endsOn = el.value; });
    g('#f-r', el => { if (el.value) d.reminder = el.value; });
    g('#f-endon', el => { d.endsOn = el.checked ? (d.endsOn || today()) : ''; });
    g('#f-ron', el => { d.reminder = el.checked ? (d.reminder || '09:00') : ''; });
  }
  function saveDraft() {
    readDraft(); const d = draft;
    if (!d.name) { const n = $('#f-name'); if (n) n.focus(); return; }
    if (!d.everyN && !d.days.some(Boolean)) d.days = [1, 1, 1, 1, 1, 1, 1];
    if (d.type !== 'check' && d.target <= 0) d.target = 1;
    if (d.kind === 'track') { d.type = 'count'; d.target = 1; }
    const i = state.habits.findIndex(x => x.id === d.id);
    delete d._new;
    if (i < 0) state.habits.push(d); else state.habits[i] = d;
    save(); stack = []; draft = null; render();
  }

  // ---------- Statistics ----------
  function renderStats() {
    const t = today(), all = live();
    const hs = statsSel.length ? all.filter(h => statsSel.includes(h.id)) : all;
    const from = statsRange === 0 ? t : statsRange > 0 ? addDays(t, -(statsRange - 1)) : (all.map(h => h.startsOn || h.createdAt).sort()[0] || t);
    const rangeLabel = { 0: 'Today', 7: 'Last 7 Days', 28: 'Last 28 Days', 90: 'Last 3 Months', 180: 'Last 6 Months', 365: 'Last Year', '-1': 'All Time' }[statsRange];
    let html = `<div class="page-t glass"><span>Statistics</span><button class="range r glass" data-act="range-menu">${rangeLabel}</button></div><div class="stats">`;
    html += `<h3>Habits <a data-act="none">Choose Habits</a></h3><div class="hchips">${all.map(h => `<button class="hchip${statsSel.includes(h.id) ? ' on' : ''}" style="--c:${h.color}" data-act="stat-sel" data-id="${h.id}"><span class="card__ico">${emojiOf(h)}</span><span>${esc(h.name)}</span></button>`).join('')}</div>`;
    const tot = totals(hs, from, t), pct = tot.sched ? Math.round(tot.comp / tot.sched * 100) : 0;
    html += `<h3>Completion</h3><div class="sblk"><span class="row__ico">${ic('chart-no-axes-column', 18)}</span><div style="flex:1"><b>${pct}%</b><small>${tot.comp} of ${tot.sched}</small><div class="sbar"><i style="width:${pct}%;background:var(--green)"></i><i style="flex:1;background:var(--orange)"></i></div><div class="legend"><span><i style="background:var(--green)"></i>${tot.comp} completed</span><span><i style="background:var(--orange)"></i>${tot.sched - tot.comp} not completed</span></div></div></div>`;
    const cur = hs.length ? Math.max(...hs.map(h => streak(h))) : 0, best = hs.length ? Math.max(...hs.map(bestStreak)) : 0;
    html += `<h3>Streak</h3><div class="sblk"><span class="row__ico">${ic('flame', 18)}</span><div style="flex:1"><b>${cur} day${cur === 1 ? '' : 's'}</b><small>${cur ? (cur >= best ? 'New best · every day extends it' : `Best ${best} · keep going`) : 'Broken · start again today'}</small><div class="sbar"><i style="width:${best ? Math.round(cur / best * 100) : 0}%;background:var(--orange)"></i></div></div></div>`;
    const timers = hs.filter(h => h.type === 'timer' || h.type === 'count');
    if (timers.length) {
      let sum = 0, n = 0; for (let k = from; k <= t; k = addDays(k, 1)) timers.forEach(h => { const v = value(h, k); if (v) { sum += h.type === 'timer' ? v * 60 : v; n++; } });
      const one = timers.every(h => h.type === 'timer');
      html += `<h3>Amount</h3><div class="sblk"><span class="row__ico">${ic('hash', 18)}</span><div><b>${one ? dur(sum) : fmtNum(sum)}</b><small>average ${one ? dur(n ? sum / n : 0) : fmtNum(n ? sum / n : 0)}</small></div></div>`;
    }
    const hours = new Array(24).fill(0); let m = 0, a = 0, e = 0, ni = 0;
    for (let k = from; k <= t; k = addDays(k, 1)) hs.forEach(h => { const hr = state.times[k] && state.times[k][h.id]; if (hr != null) { hours[hr]++; if (hr < 12) m++; else if (hr < 17) a++; else if (hr < 21) e++; else ni++; } });
    const mx = Math.max(1, ...hours);
    html += `<h3>When you complete</h3><div class="sblk" style="display:block"><div class="hist">${hours.map(v => `<i style="height:${Math.round(v / mx * 100)}%"></i>`).join('')}</div><div class="axis"><span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span></div><div class="legend"><span><i style="background:var(--orange)"></i>Morning · ${m}</span><span><i style="background:var(--blue)"></i>Afternoon · ${a}</span><span><i style="background:var(--purple)"></i>Evening · ${e}</span><span><i style="background:#5856d6"></i>Night · ${ni}</span></div></div>`;
    const gaps = []; let gs = null;
    for (let k = from; k <= t; k = addDays(k, 1)) { const sched = hs.some(h => scheduled(h, k)), anyDone = hs.some(h => done(h, k)); if (sched && !anyDone) { if (!gs) gs = k; } else if (gs) { gaps.push([gs, addDays(k, -1)]); gs = null; } }
    if (gs) gaps.push([gs, t]);
    if (gaps.length) html += `<h3>Gaps this period</h3><div class="sblk" style="display:block">${gaps.slice(-5).map(([a1, b1]) => { const n = Math.round((parse(b1) - parse(a1)) / 864e5) + 1; return `<div class="gap"><span>${parse(a1).getDate()}–${parse(b1).getDate()} ${fmtDate(b1, { month: 'short' })}</span><i></i><span>${n} day${n === 1 ? '' : 's'}</span></div>`; }).join('')}</div>`;
    // month calendar
    const [y, mo] = statsMonth.split('-').map(Number), first = new Date(y, mo - 1, 1), start = weekStartOf(key(first));
    html += `<div class="sblk" style="display:block;padding:0;margin-top:18px"><div class="cal__t"><span>${first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span><span class="nav"><button data-act="month" data-n="-1">${ic('chevron-left', 22)}</button><button data-act="month" data-n="1">${ic('chevron-right', 22)}</button></span></div><div class="cal">${[0, 1, 2, 3, 4, 5, 6].map(i => `<div class="cal__h">${DAYS[(i + (S().weekStart === 1 ? 6 : 0)) % 7].toUpperCase()}</div>`).join('')}`;
    for (let i = 0; i < 42; i++) { const k = addDays(start, i), inM = k.slice(0, 7) === statsMonth, p = k <= t ? dayProgress(k, hs) : null; html += `<div class="cal__d${inM ? '' : ' out'}${p != null && p >= .999 ? ' on' : p ? ' p' : ''}" style="--p:${(p || 0).toFixed(2)}"><span>${parse(k).getDate()}</span></div>`; }
    html += '</div></div>';
    // week table
    const wk = statsWeek, wtot = totals(hs, wk, addDays(wk, 6));
    html += `<div class="sblk" style="display:block;padding:0 16px 10px;margin-top:18px"><div class="cal__t" style="padding:12px 0 2px"><span>${parse(wk).getDate()}–${parse(addDays(wk, 6)).getDate()} ${fmtDate(addDays(wk, 6), { month: 'short' })}</span><span class="nav"><button data-act="week" data-n="-1">${ic('chevron-left', 22)}</button><button data-act="week" data-n="1">${ic('chevron-right', 22)}</button></span></div><small style="font-size:12px;color:var(--ink-3)">${wtot.comp} of ${wtot.sched} · ${wtot.sched ? Math.round(wtot.comp / wtot.sched * 100) : 0}%</small><div class="wk"><div></div>${[0, 1, 2, 3, 4, 5, 6].map(i => { const k = addDays(wk, i); return `<div class="h${k === t ? ' today' : ''}">${DAYS[dow(k)][0]}</div>`; }).join('')}`;
    hs.forEach(h => { html += `<div class="n"><span class="card__ico" style="width:22px;height:22px;font-size:16px">${emojiOf(h)}</span>${esc(h.name)}</div>`; for (let i = 0; i < 7; i++) { const k = addDays(wk, i); const sch = scheduled(h, k) && k <= t; const d = sch && done(h, k), r = sch ? ratio(h, k) : 0; html += `<div class="wk-cell${d ? ' d' : r ? ' p' : ''}" style="--c:${h.color};--p:${r.toFixed(2)}">${d ? ic('check', 14) : ''}</div>`; } });
    html += '</div></div>';
    // year grid
    const yStart = weekStartOf(statsYear + '-01-01'); let cells = '';
    for (let c = 0; c < 53; c++) for (let r = 0; r < 7; r++) { const k = addDays(yStart, c * 7 + r); cells += k.slice(0, 4) !== statsYear || k > t ? '<i class="n"></i>' : hs.some(h => done(h, k)) ? '<i class="d"></i>' : '<i></i>'; }
    html += `<div class="sblk" style="display:block;margin-top:18px"><div class="cal__t" style="padding:0 0 6px"><span>${statsYear}</span><span class="nav"><button data-act="year" data-n="-1">${ic('chevron-left', 22)}</button><button data-act="year" data-n="1">${ic('chevron-right', 22)}</button></span></div><div style="display:flex;gap:6px"><div style="display:flex;flex-direction:column;justify-content:space-between;font-size:9px;color:var(--ink-3);padding:6px 0"><span>M</span><span>T</span><span>S</span></div><div style="overflow:hidden"><div class="year">${cells}</div></div></div><div class="axis">${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'].map(x => `<span>${x}</span>`).join('')}</div></div>`;
    html += `<h3>Progress</h3><div class="sblk" style="display:block">${progressChart(hs, from, t)}</div>`;
    if (hs.length > 1) html += `<h3>Comparison</h3><div class="sblk" style="display:block">${comparisonChart(hs, from, t)}<div class="legend">${hs.map(h => `<span><i style="background:${h.color}"></i>${h.emoji} ${esc(h.name)}</span>`).join('')}</div></div>`;
    html += `<h3>Performance</h3><div class="sblk" style="display:block">${hs.map(h => { const tt = totals([h], from, t), p = tt.sched ? Math.round(tt.comp / tt.sched * 100) : 0; return `<div class="perf"><span class="card__ico" style="width:24px;height:24px;font-size:18px">${emojiOf(h)}</span><span>${esc(h.name)}<small style="display:block;font-size:12px;color:var(--ink-3)">${tt.comp} of ${tt.sched}</small></span><span class="pill${p < 50 ? ' bad' : ''}">${p}%</span></div>`; }).join('') || '<p class="note">No habits yet.</p>'}</div>`;
    html += `<div style="height:40px"></div></div><button class="fab" data-act="none" aria-label="Statistics">${ic('chart-no-axes-column', 22)}</button>`;
    return html;
  }
  function series(hs, from, to) { const pts = []; let sched = 0, comp = 0; for (let k = from; k <= to; k = addDays(k, 1)) { hs.forEach(h => { if (scheduled(h, k)) { sched++; if (done(h, k)) comp++; } }); pts.push([k, sched ? comp / sched : 0]); } return pts; }
  function polyline(pts, W, H, color, fill) {
    const n = Math.max(1, pts.length - 1);
    const d = pts.map(([, v], i) => `${i ? 'L' : 'M'}${(30 + i / n * (W - 60)).toFixed(1)},${(14 + (1 - Math.min(1, v)) * (H - 44)).toFixed(1)}`).join(' ');
    return `${fill ? `<path d="${d} L${W - 30},${H - 30} L30,${H - 30} Z" fill="${color}" opacity=".18"/>` : ''}<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>`;
  }
  function progressChart(hs, from, to) {
    const W = 360, H = 190, pts = series(hs, from, to);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}"><line x1="30" y1="14" x2="${W - 30}" y2="14" stroke="#5e5ce6" stroke-dasharray="4 4" stroke-width="1"/><rect x="2" y="6" width="34" height="16" rx="8" fill="#5e5ce6"/><text x="19" y="17" text-anchor="middle" style="fill:#fff">100%</text><text x="${W - 26}" y="18">100%</text><text x="${W - 26}" y="${H / 2 + 4}">50%</text><text x="${W - 26}" y="${H - 28}">0%</text>${polyline(pts, W, H, '#5e5ce6', true)}<text x="30" y="${H - 8}">${fmtDate(from, { day: 'numeric', month: 'short' })}</text><text x="${W - 30}" y="${H - 8}" text-anchor="end">${fmtDate(to, { day: 'numeric', month: 'short' })}</text></svg><div class="legend"><span><i style="background:#5e5ce6"></i>${fmtDate(from, { day: 'numeric', month: 'short' })} – ${fmtDate(to, { day: 'numeric', month: 'short' })}</span></div>`;
  }
  function comparisonChart(hs, from, to) {
    const W = 360, H = 190;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}">${[0, .5, 1].map(v => `<line x1="30" y1="${14 + (1 - v) * (H - 44)}" x2="${W - 30}" y2="${14 + (1 - v) * (H - 44)}" stroke="var(--sep)" stroke-width=".5"/>`).join('')}${hs.map(h => polyline(series([h], from, to), W, H, h.color, false)).join('')}<text x="${W - 26}" y="18">100%</text><text x="${W - 26}" y="${H / 2 + 4}">50%</text><text x="${W - 26}" y="${H - 28}">0%</text></svg>`;
  }

  // ---------- Sharing ----------
  function renderSharing() {
    return `<div class="page-t glass"><span>Sharing</span></div><div class="empty" style="padding-top:calc(var(--sat) + 200px)"><span style="color:var(--ink-3)">${ic('users', 64)}</span><b>Share Habits</b>Share your habits with others and see theirs.<p style="font-size:13px;margin:16px 0 22px">How sharing works:<br>1. You create a share and send the link to a friend. Once they join, they can see your habits.<br>2. Your friend creates a share and sends you a link. Once you join, you can see their habits.</p><div style="display:flex;flex-direction:column;gap:12px;align-items:center"><button class="pillbtn" data-act="none">Share with Someone</button><button class="pillbtn soft" data-act="none">Ask Someone to Share</button></div></div>`;
  }

  // ---------- Settings ----------
  function renderSettings() {
    const s = S(), n = live().length, a = state.habits.length - n;
    const R = (p, ico, bg, label, val) => row('go', ic(ico, 16), bg, label, val, `data-p="${p}"`);
    return `<div class="page-t glass"><span>Settings</span></div><div class="pg">
      <h3>Appearance</h3><div class="grp">
        ${R('set-appearance', 'contrast', '#007aff', 'Appearance', { auto: 'Automatic', light: 'Light', dark: 'Dark' }[s.appearance])}
        ${R('set-theme', 'smartphone', '#af52de', 'Theme', `<span class="dot" style="background:${s.accent}"></span>`)}
        ${R('set-sort', 'list', '#34c759', 'Sort', SORTS.find(x => x[0] === s.sort)[1])}
        ${R('set-pv', 'layout-list', '#007aff', 'Progress View', PVS.find(x => x[0] === s.progressView)[1])}
        ${R('set-more', 'ellipsis', '#8e8e93', 'More', '')}</div>
      <h3>General</h3><div class="grp">
        <div class="row"><span class="row__ico" style="background:#ffcc00">${ic('badge', 16)}</span><span class="row__t">Badges${notifState() !== 'granted' ? '<span class="warn">Enable notifications to use this feature.</span>' : ''}</span><label class="switch"><input type="checkbox" data-set-s="badges" ${s.badges ? 'checked' : ''}><i></i></label></div>
        <div class="row"><span class="row__ico" style="background:#007aff">${ic('clock', 16)}</span><span class="row__t">Day Starts At</span><select class="field num" data-set-s="dayStart" style="width:auto">${[0, 1, 2, 3, 4, 5, 6].map(h => `<option value="${h}" ${s.dayStart === h ? 'selected' : ''}>${h === 0 ? '12:00 AM' : h + ':00 AM'}</option>`).join('')}</select></div>
        <div class="row"><span class="row__ico" style="background:#34c759">${ic('globe', 16)}</span><span class="row__t">Language</span><span class="row__v">English ${ic('arrow-up-right', 14)}</span></div>
        <div class="row"><span class="row__ico" style="background:#5e5ce6">${ic('calendar', 16)}</span><span class="row__t">Week Starts On</span><select class="field num" data-set-s="weekStart" style="width:auto"><option value="0" ${s.weekStart === 0 ? 'selected' : ''}>Monday</option><option value="1" ${s.weekStart === 1 ? 'selected' : ''}>Sunday</option></select></div>
        ${R('edit-none', 'calendar-plus', '#ff9500', 'Calendar Integration', 'None')}
        ${R('edit-none', 'hand', '#ff3b30', 'Block selected apps', 'Off')}
        <div class="row"><span class="row__ico" style="background:#34c759">${ic('calendar-check', 16)}</span><span class="row__t">Allow Future Dates</span><label class="switch"><input type="checkbox" data-set-s="futureDates" ${s.futureDates ? 'checked' : ''}><i></i></label></div></div>
      <p class="note">Allow habit logging on future dates.</p>
      <h3>Notifications</h3><div class="grp">${notifRow()}${notifState() === 'granted' ? `<button class="row" data-act="notif-test"><span class="row__ico" style="background:#32ade6">${ic('bell', 16)}</span><span class="row__t">Send a test reminder</span></button>` : ''}</div><p class="note">${notifNote()}</p>
      <h3>Sounds</h3><div class="grp">${R('set-sounds', 'volume-2', '#32ade6', 'Sounds', s.sounds ? 'On' : 'Off')}</div>
      <h3>Data</h3><div class="grp">
        ${R('groups', 'folder', '#5e5ce6', 'Groups', state.groups.length || '')}
        ${R('vacations', 'palmtree', '#34c759', 'Vacations', state.vacations.length || '')}
        ${R('achievements', 'trophy', '#ffcc00', 'Achievements', '')}
        ${R('archived', 'archive', '#af52de', 'Archived Habits', a || '')}</div>
      <h3>Sync & Export</h3><div class="grp">
        <button class="row" data-act="export"><span class="row__ico" style="background:#34c759">${ic('clipboard-list', 16)}</span><span class="row__t">Export for Analysis</span>${ic('chevron-right', 18, 'chev')}</button>
        <button class="row" data-act="import"><span class="row__ico" style="background:#007aff">${ic('download', 16)}</span><span class="row__t">Import</span>${ic('chevron-right', 18, 'chev')}</button>
        <button class="row" data-act="fresh" style="color:var(--orange)"><span class="row__ico" style="background:#ff9500">${ic('refresh-ccw', 16)}</span><span class="row__t">Fresh Start</span></button>
        <button class="row danger" data-act="wipe"><span class="row__ico" style="background:#ff3b30">${ic('trash-2', 16)}</span><span class="row__t">Delete All Data</span></button></div>
      <h3>Help & Support</h3><div class="grp">
        <a class="row" href="mailto:hello@aiartlab.org?subject=Tally" style="text-decoration:none"><span class="row__ico" style="background:#007aff">${ic('circle-help', 16)}</span><span class="row__t">Get Support</span>${ic('chevron-right', 18, 'chev')}</a>
        <button class="row" data-act="share-app" style="color:var(--green)"><span class="row__ico" style="background:#34c759">${ic('share', 16)}</span><span class="row__t">Share App</span></button></div>
      <p class="note">Current version: 0.9 · ${n} habit${n === 1 ? '' : 's'}, stored on this device only.</p><div style="height:40px"></div></div><button class="fab" data-act="none" aria-label="Settings">${ic('settings', 22)}</button>`;
  }
  function renderAchievements() {
    const all = live(), best = all.length ? Math.max(...all.map(bestStreak)) : 0;
    const totalPct = all.length ? Math.round(all.reduce((a, h) => a + completions(h), 0) / Math.max(1, all.length) * 100) : 0;
    const minutes = all.filter(h => h.type === 'timer').reduce((a, h) => a + Object.keys(state.log).reduce((b, k) => b + value(h, k), 0), 0);
    const has = k => all.some(h => h.kind === k);
    return `<div class="ach"><h4>Longest Streak</h4>${STREAKS.map(n => `<div><span class="hex${best >= n ? ' on' : ''}" style="--v:#ff9500">${ic('flame', 34)}</span>${n} days</div>`).join('')}
      <h4>Goals</h4>${GOALS.map(n => `<div><span class="hex${totalPct >= n ? ' on' : ''}" style="--v:#32ade6">${ic('flag', 34)}</span>${n}%</div>`).join('')}${MINUTES.map(n => `<div><span class="hex${minutes >= n ? ' on' : ''}" style="--v:#ffcc00">${ic('timer', 34)}</span>${n} minutes</div>`).join('')}
      <h4>Habits</h4>${[['good', 'Good habit', 'thumbs-up', '#34c759'], ['bad', 'Bad habit', 'hand', '#8e8e93'], ['track', 'Track habit', 'chart-line', '#8e8e93'], ['todo', 'To-do habit', 'list', '#8e8e93'], ['health', 'Health habit', 'heart', '#8e8e93']].map(([k, l, i, c]) => `<div><span class="hex${has(k) ? ' on' : ''}" style="--v:${c}">${ic(i, 34)}</span>${l}</div>`).join('')}</div>`;
  }

  // ---------- reorder (drag rows) ----------
  function setupReorder() {
    const list = $('#ro-list'); if (!list) return;
    let dragging = null;
    list.addEventListener('pointerdown', e => { const h = e.target.closest('.handle'); if (!h) return; dragging = h.closest('.row'); dragging.classList.add('drag'); list.setPointerCapture(e.pointerId); });
    list.addEventListener('pointermove', e => {
      if (!dragging) return;
      const rows = [...list.querySelectorAll('.row[data-id]')], over = rows.find(r => { const b = r.getBoundingClientRect(); return e.clientY > b.top && e.clientY < b.bottom; });
      if (over && over !== dragging) { const b = over.getBoundingClientRect(); if (e.clientY < b.top + b.height / 2) over.before(dragging); else over.after(dragging); }
    });
    const end = () => { if (!dragging) return; dragging.classList.remove('drag'); dragging = null; const ids = [...list.querySelectorAll('.row[data-id]')].map(r => r.dataset.id); state.habits.sort((a, b) => { const ia = ids.indexOf(a.id), ib = ids.indexOf(b.id); return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib); }); save(); };
    list.addEventListener('pointerup', end); list.addEventListener('pointercancel', end);
  }

  // ---------- inline timers ----------
  const running = h => !!state.timers[h.id];
  const elapsedSec = h => { const t = state.timers[h.id]; return t ? t.base + (Date.now() - t.startedAt) / 1000 : value(h, selected) * 60; };
  function startTimer(h) {
    if (running(h)) return;
    state.timers[h.id] = { startedAt: Date.now(), base: value(h, today()) * 60, day: today() };
    save(); afterChange(h); renderNowBar(); ensureTick();
  }
  function stopTimer(h, complete) {
    const t = state.timers[h.id]; if (!t) return;
    const sec = complete ? target(h) * 60 : t.base + (Date.now() - t.startedAt) / 1000;
    delete state.timers[h.id];
    setValue(h, t.day, Math.round(sec / 6) / 10);          // minutes, one decimal
    afterChange(h); renderNowBar();
  }
  let tick = null;
  function ensureTick() { if (!tick) tick = setInterval(tickTimers, 1000); }
  function tickTimers() {
    const ids = Object.keys(state.timers);
    if (!ids.length) { clearInterval(tick); tick = null; return; }
    ids.forEach(id => {
      const h = state.habits.find(x => x.id === id); if (!h) { delete state.timers[id]; save(); return; }
      const sec = elapsedSec(h), tg = target(h) * 60;
      if (sec >= tg) { stopTimer(h, true); celebrate(h); return; }
      const sub = document.getElementById('sub-' + id); if (sub) sub.textContent = subtitle(h, selected);
      const nb = document.getElementById('nb-' + id); if (nb) nb.textContent = fmtClock(sec);
      const dv = document.getElementById('dv-' + id); if (dv) dv.textContent = fmtClock(sec);
      const rg = document.querySelector('#card-' + id + ' .ring .p'); if (rg) { const len = parseFloat(rg.getAttribute('stroke-dasharray')); rg.setAttribute('stroke-dashoffset', (len * (1 - sec / tg)).toFixed(2)); }
    });
  }
  function renderNowBar() {
    const ids = Object.keys(state.timers), bar = $('#nowbar');
    bar.hidden = !ids.length; if (!ids.length) return;
    bar.innerHTML = ids.map(id => { const h = state.habits.find(x => x.id === id); if (!h) return ''; return `<div class="now"><span class="card__ico">${emojiOf(h)}</span><span class="now__b"><span class="now__t">${esc(h.name)}</span><span class="now__m">Every day, ${target(h)} minutes</span></span><b class="now__time" id="nb-${id}">${fmtClock(elapsedSec(h))}</b><button class="now__stop" data-act="timer" data-id="${id}" aria-label="Stop">${ic('square', 14)}</button></div>`; }).join('');
  }
  function celebrate(h) {
    if (NATIVE && NATIVE.success) NATIVE.success();
    completionSound();
    if (S().confetti) confetti(h.color);
    const best = bestStreak(h), hit = STREAKS.includes(best) && streak(h) === best ? best : 0;
    if (hit && S().badges) setTimeout(() => openSheet(`<div class="sheet__hdr"><button class="circ glass" data-act="close" aria-label="Close">${ic('x', 24)}</button><span class="sheet__title">New Achievement!</span><span style="width:44px"></span></div><div class="det" style="padding-bottom:20px"><span class="hex on" style="--v:#32ade6;display:inline-grid;width:110px;height:122px">${ic('flame', 50)}</span><div style="font-size:24px;font-weight:700;margin-top:12px">${hit} days</div><p class="note" style="text-align:center">Congratulations! Keep up the amazing work!</p><button class="btn accent" style="width:100%;margin-top:14px" data-act="go-ach">View all achievements</button></div>`), 500);
  }
  function confetti(color) {
    const c = document.createElement('div'); c.className = 'confetti';
    const cols = [color, '#ffcc00', '#ff2d55', '#5e5ce6', '#34c759', '#32ade6'];
    for (let i = 0; i < 60; i++) { const p = document.createElement('i'); p.style.left = Math.random() * 100 + '%'; p.style.background = cols[i % cols.length]; p.style.animationDelay = (Math.random() * .4) + 's'; p.style.animationDuration = (1.2 + Math.random() * .8) + 's'; p.style.transform = `rotate(${Math.random() * 360}deg)`; c.appendChild(p); }
    document.body.appendChild(c); setTimeout(() => c.remove(), 2400);
  }
  // sounds: a chime on completion (a few variants)
  let actx = null;
  function ensureAudio() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {} }
  function tone(f0, f1, t0, len, vol, type = 'sine') { const t = actx.currentTime + t0, o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + len); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + len + .02); }
  function completionSound() {
    if (!S().sounds) return; ensureAudio(); if (!actx) return;
    try {
      const v = S().completionSound;
      if (v === 'pop') tone(600, 300, 0, .12, .2, 'square');
      else if (v === 'bell') { tone(1320, 0, 0, .6, .18); tone(1980, 0, 0, .5, .08); }
      else if (v === 'chime') { tone(659, 0, 0, .25, .18); tone(988, 0, .12, .35, .18); }
      else { tone(880, 0, 0, .18, .16); tone(1175, 0, .1, .3, .16); }
    } catch (e) {}
  }
  const tap = () => { if (NATIVE && NATIVE.tap) NATIVE.tap(); };

  // ---------- push (reminders while the app is closed) ----------
  const PUSH = { url: 'https://lodogasuaggsibycwqyi.supabase.co', key: 'sb_publishable_PyPIDVs6quS3Qlv-hXqrHQ_hx53bZgN', vapid: 'BFThnWY2_-TOy3R00UIPO2Tk9X6GhmWp-G05YSaEjktanUIpA0KHWWapbf-Kva0xvDNmlo1oF0pMgxBvpIO1IL8' };
  const NATIVE = window.TALLY_NATIVE || null;
  const pushReady = () => !NATIVE && PUSH.url.startsWith('https://') && 'PushManager' in window && 'serviceWorker' in navigator;
  function b64ToU8(b) { const s = atob((b + '='.repeat((4 - b.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); }
  function reminderList() {
    return state.habits.filter(h => !h.archived && h.reminder).map(h => ({ id: h.id, name: h.name, time: h.reminder, days: h.days,
      body: h.type === 'count' ? `${target(h)}${h.unit && h.unit !== 'Count' ? ' ' + h.unit : ''} today` : h.type === 'timer' ? `${target(h)} minutes today` : 'Time for it.' }));
  }
  function doneToday() { const t = today(); return { date: t, ids: state.habits.filter(h => done(h, t)).map(h => h.id) }; }
  async function pushCall(method, body) {
    const r = await fetch(PUSH.url + '/functions/v1/push-sync', { method, headers: { 'Content-Type': 'application/json', 'apikey': PUSH.key, 'Authorization': 'Bearer ' + PUSH.key }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('push-sync ' + r.status);
    return r.json();
  }
  let syncTimer = null;
  function syncPush(extra) {
    if (!state.push || !pushReady()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { pushCall('POST', Object.assign({ endpoint: state.push.endpoint, keys: state.push.keys, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, reminders: reminderList(), done: doneToday() }, extra || {})).catch(() => {}); }, extra ? 0 : 800);
  }
  async function subscribePush() {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(PUSH.vapid) });
    const j = sub.toJSON();
    state.push = { endpoint: j.endpoint, keys: j.keys }; save();
    await pushCall('POST', { endpoint: j.endpoint, keys: j.keys, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, reminders: reminderList(), done: doneToday() });
  }
  async function unsubscribePush() {
    try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) { await pushCall('DELETE', { endpoint: sub.endpoint }); await sub.unsubscribe(); } } catch (e) {}
    delete state.push; save(); render();
  }

  // ---------- notification actions ----------
  async function applyPending() {
    try {
      const c = await caches.open('tally-pending'); const r = await c.match('pending'); if (!r) return;
      const list = await r.json(); await c.delete('pending');
      list.forEach(it => { const h = state.habits.find(x => x.id === it.id); if (h && it.type === 'done' && !done(h, it.date)) setValue(h, it.date, target(h)); });
      render();
    } catch (e) {}
  }
  function snooze(h) {
    if (NATIVE) { NATIVE.snooze({ id: h.id, name: h.name, body: reminderList().find(r => r.id === h.id)?.body }, 60); return; }
    if (state.push) syncPush({ snooze: { id: h.id, minutes: 60 } });
    else setTimeout(() => { if (!done(h, today())) notify(h, 'Time for it.'); }, 60 * 60 * 1000);
  }
  navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', e => {
    const m = e.data || {};
    if (m.type === 'open-habit') { selected = today(); view = 'today'; stack = []; render(); detailSheet(m.id); }
    if (m.type === 'done') applyPending();
  });
  if (NATIVE) NATIVE.handlers.action = (actionId, id) => {
    const h = state.habits.find(x => x.id === id); if (!h) return;
    if (actionId === 'done') { setValue(h, today(), target(h)); render(); }
    else if (actionId === 'snooze') snooze(h);
    else { selected = today(); view = 'today'; stack = []; render(); detailSheet(h.id); }
  };
  const fromNotif = new URLSearchParams(location.search).get('habit');
  if (fromNotif) history.replaceState(null, '', location.pathname);

  // ---------- reminders ----------
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let nativePerm = 'default';
  if (NATIVE) NATIVE.permission().then(p => { nativePerm = p; render(); });
  function notifState() { if (NATIVE) return nativePerm; return !('Notification' in window) ? 'unsupported' : Notification.permission; }
  function notifRow() {
    const st = notifState();
    const label = { granted: 'Allowed', denied: 'Blocked in Settings', default: 'Off', unsupported: 'Not available here' }[st];
    const ico = `<span class="row__ico" style="background:#ff9500">${ic('bell', 16)}</span>`;
    if (st === 'default') return `<button class="row" data-act="notif">${ico}<span class="row__t">Notifications</span><span class="row__v" style="color:var(--accent)">Allow</span></button>`;
    let rows = `<div class="row">${ico}<span class="row__t">Notifications</span><span class="row__v">${label}</span></div>`;
    if (NATIVE && st === 'granted') return rows;
    if (st === 'granted' && pushReady()) rows += state.push
      ? `<button class="row" data-act="push-off"><span class="row__ico" style="background:#34c759">${ic('cloud', 16)}</span><span class="row__t">While Tally is closed</span><span class="row__v">On</span></button>`
      : `<button class="row" data-act="push-on"><span class="row__ico" style="background:#34c759">${ic('cloud', 16)}</span><span class="row__t">While Tally is closed</span><span class="row__v" style="color:var(--accent)">Turn on</span></button>`;
    return rows;
  }
  function notifNote() {
    const st = notifState();
    if (st === 'unsupported' && isIOS() && !standalone()) return 'On iPhone, notifications work once Tally is on the Home Screen: open this page in Safari, tap Share, then Add to Home Screen.';
    if (st === 'denied') return 'Notifications are blocked for Tally. Turn them on in the phone\'s Settings, under Notifications.';
    if (NATIVE) return st === 'granted' ? 'Reminders arrive at the time you set on a habit, whether Tally is open or not.' : 'Enable notifications to use this feature.';
    if (state.push) return 'Reminders arrive at the time you set, whether Tally is open or not.';
    return 'Reminders arrive while Tally is open. Turn on "While Tally is closed" to have them delivered any time.';
  }
  function askNotifications() {
    if (NATIVE) { NATIVE.ask().then(p => { nativePerm = p; if (p === 'granted') NATIVE.schedule(reminderList()); render(); }); return; }
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(async p => { if (p === 'granted' && pushReady()) { try { await subscribePush(); } catch (e) { console.warn('push subscribe failed', e); } } render(); });
  }
  function notify(h, body) {
    if (NATIVE) { NATIVE.test(); return; }
    if (notifState() !== 'granted') return;
    const opts = { body, tag: 'tally-' + h.id, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { id: h.id } };
    navigator.serviceWorker.ready.then(r => r.showNotification(h.name, opts)).catch(() => { try { new Notification(h.name, opts); } catch (e) {} });
  }
  function checkReminders() {
    if (state.push || NATIVE) return;
    const t = today(), now = new Date(), hm = pad(now.getHours()) + ':' + pad(now.getMinutes());
    state.notified = state.notified && state.notified.date === t ? state.notified : { date: t, ids: [] };
    let changed = false;
    state.habits.forEach(h => {
      if (h.archived || !h.reminder || h.reminder !== hm || !scheduled(h, t) || done(h, t) || state.notified.ids.includes(h.id)) return;
      notify(h, reminderList().find(r => r.id === h.id).body); state.notified.ids.push(h.id); changed = true;
    });
    if (changed) save();
  }
  setInterval(checkReminders, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkReminders(); applyPending(); } });

  // ---------- in-place updates (the Today screen animates instead of re-rendering) ----------
  const onToday = () => cur && cur.classList.contains('today') && cur.isConnected;
  // one card: classes flip (colour transitions), the action button pops,
  // the subtitle, badge and today's grid cell follow
  function patchCard(h) {
    const el = cur.querySelector('#card-' + h.id); if (!el) return false;
    const tmp = document.createElement('div'); tmp.innerHTML = habitCard(h); const fresh = tmp.firstElementChild;
    ['is-done', 'is-run', 'pv-off'].forEach(c => el.classList.toggle(c, fresh.classList.contains(c)));
    const oldAct = el.querySelector('.card__act'), newAct = fresh.querySelector('.card__act');
    if (oldAct && newAct && oldAct.innerHTML !== newAct.innerHTML) { oldAct.replaceWith(newAct); newAct.classList.add('pop'); }
    const sub = el.querySelector('#sub-' + h.id); if (sub) sub.textContent = subtitle(h, selected);
    const oldB = el.querySelector('.card__badge'), newB = fresh.querySelector('.card__badge');
    if ((oldB ? oldB.outerHTML : '') !== (newB ? newB.outerHTML : '')) { if (oldB) oldB.remove(); if (newB) el.prepend(newB); }
    const grid = el.querySelector('.heat__g');
    if (grid) { const start = addDays(weekStartOf(today()), -39 * 7), idx = Math.round((parse(selected) - parse(start)) / 864e5); const cell = grid.children[idx]; if (cell) cell.className = done(h, selected) ? 'd' : ''; }
    else { const g = fresh.querySelector('.bars, .line'), o = el.querySelector('.bars, .line'); if (g && o) o.replaceWith(g); }
    return true;
  }
  // the strip: progress circles and the ring on the selected day
  function patchWeek() {
    const t = today();
    cur.querySelectorAll('.day').forEach(d => {
      const k = d.dataset.k, p = k <= t ? dayProgress(k, live()) : null;
      d.style.setProperty('--p', (p || 0).toFixed(2)); d.classList.toggle('has-p', !!p);
      const sel = k === selected; d.classList.toggle('is-sel', sel);
      const r = d.querySelector('.day__r'); let svg = r.querySelector('svg');
      if (sel && !svg && p) { r.insertAdjacentHTML('afterbegin', ring(52, 3.5, 0)); svg = r.querySelector('svg'); requestAnimationFrame(() => { const pp = svg.querySelector('.p'), len = parseFloat(pp.getAttribute('stroke-dasharray')); pp.setAttribute('stroke-dashoffset', (len * (1 - (p || 0))).toFixed(2)); }); }
      else if (sel && svg) { const pp = svg.querySelector('.p'), len = parseFloat(pp.getAttribute('stroke-dasharray')); pp.setAttribute('stroke-dashoffset', (len * (1 - (p || 0))).toFixed(2)); }
      else if ((!sel || !p) && svg) svg.remove();
    });
    const title = cur.querySelector('.hdr__t'); if (title && title.textContent !== todayTitle()) { title.classList.add('swap'); setTimeout(() => { title.textContent = todayTitle(); title.classList.remove('swap'); }, 120); }
  }
  // the list: cards that changed place glide there (FLIP), new ones fade in
  function flipList() {
    const list = cur.querySelector('.list'); const empty = cur.querySelector('.empty');
    const before = {}; if (list) [...list.querySelectorAll('.card')].forEach(c => { before[c.id] = c.getBoundingClientRect().top; });
    const tmp = document.createElement('div'); tmp.innerHTML = listHtml(); const fresh = tmp.firstElementChild;
    if (!fresh) return;
    if (list) list.replaceWith(fresh); else if (empty) empty.replaceWith(fresh); else cur.appendChild(fresh);
    if (reduceMotion() || !fresh.classList.contains('list')) return;
    [...fresh.querySelectorAll('.card')].forEach(c => {
      const now = c.getBoundingClientRect().top;
      if (before[c.id] == null) { c.classList.add('appear'); return; }
      const dy = before[c.id] - now; if (!dy) return;
      c.style.transform = `translateY(${dy}px)`; c.style.transition = 'none';
      requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transition = ''; c.classList.add('flip'); c.style.transform = ''; setTimeout(() => c.classList.remove('flip'), 360); }));
    });
  }
  // after a habit changed on the Today screen: patch its card and the strip,
  // then, once the colour has settled, let the list re-sort
  let flipTimer = null;
  function afterChange(h) {
    if (!onToday()) { render(); return; }
    const ok = patchCard(h); patchWeek();
    const order = [...cur.querySelectorAll('.card')].map(c => c.id.slice(5)), want = dayList().map(x => x.id);
    if (!ok || order.join() !== want.join()) { clearTimeout(flipTimer); flipTimer = setTimeout(flipList, ok ? 320 : 0); }
  }

  // ---------- long press on a card: Grit's context menu ----------
  let pressTimer = null, pressEl = null, pressSuppress = 0, ctxEl = null;
  function closeCtx() { if (!ctxEl) return; const c = ctxEl; ctxEl = null; c.classList.add('out'); setTimeout(() => c.remove(), 180); document.querySelectorAll('.card.pressed').forEach(x => x.classList.remove('pressed')); }
  function contextMenu(card, h) {
    closeCtx(); if (NATIVE && NATIVE.success) NATIVE.tap();
    card.classList.add('pressed');
    const r = card.getBoundingClientRect(), W = 230;
    const item = (act, icon, label, cls = '') => `<button class="ci ${cls}" data-act="${act}" data-id="${h.id}">${ic(icon, 22)}<span>${label}</span></button>`;
    const el = document.createElement('div'); el.className = 'ctx'; ctxEl = el;
    el.innerHTML = `<div class="ctx__scrim" data-act="ctx-close"></div><div class="ctx__panel glass" style="--c:${h.color}"><div class="ctx__cap">${todayTitle()}</div><div class="ctx__grid">
      ${item('skip', 'fast-forward', skipped(h, selected) ? 'Unskip' : 'Skip')}${item('fail', 'x', failed(h, selected) ? 'Unfail' : 'Fail')}${item(done(h, selected) ? 'undo' : 'complete', 'check', done(h, selected) ? 'Undo' : 'Complete')}
      ${item('duplicate', 'copy', 'Duplicate')}${item('note', 'notebook-pen', 'Add Note')}${item('reset', 'eraser', 'Reset History')}
      ${item('edit', 'pen-line', 'Edit')}${item('archive', 'archive', h.archived ? 'Restore' : 'Archive')}${item('delete', 'trash-2', 'Delete', 'danger')}</div>
      <button class="ctx__row" data-act="stats-of" data-id="${h.id}">${ic('chart-line', 20)}<span>Statistics</span></button>
      <button class="ctx__row" data-act="open" data-id="${h.id}">${ic('ellipsis', 20)}<span>More</span>${ic('chevron-right', 16)}</button></div>`;
    document.body.appendChild(el);
    const p = el.querySelector('.ctx__panel');
    let top = r.bottom + 10; if (top + 330 > window.innerHeight - 90) { top = Math.max(60, r.top - 340); p.style.transformOrigin = 'bottom center'; }
    p.style.left = Math.max(12, Math.min(window.innerWidth - W - 12, r.left + r.width / 2 - W / 2)) + 'px'; p.style.top = top + 'px'; p.style.width = W + 'px';
  }
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const card = e.target.closest('.card'); if (!card || !card.id.startsWith('card-') || !onToday()) return;
    const x0 = e.clientX, y0 = e.clientY;
    clearTimeout(pressTimer); pressEl = card;
    pressTimer = setTimeout(() => { const h = state.habits.find(x => x.id === card.id.slice(5)); if (!h) return; pressSuppress = performance.now() + 600; contextMenu(card, h); }, 480);
    const cancel = ev => { if (ev && ev.type === 'pointermove' && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 8) return; clearTimeout(pressTimer); document.removeEventListener('pointermove', cancel); document.removeEventListener('pointerup', cancel); document.removeEventListener('pointercancel', cancel); };
    document.addEventListener('pointermove', cancel); document.addEventListener('pointerup', cancel); document.addEventListener('pointercancel', cancel);
  });
  document.addEventListener('contextmenu', e => { if (e.target.closest('.card')) e.preventDefault(); });

  // ---------- events ----------
  const canLog = k => k <= today() || S().futureDates;
  function mark(h, k, delta) {
    if (!canLog(k)) return;
    if (h.type === 'check') setValue(h, k, delta > 0 ? 1 : 0);
    else setValue(h, k, Math.max(0, Math.round((value(h, k) + delta * (h.step || 1)) * 100) / 100));
    if (done(h, k) && delta > 0) celebrate(h); else tap();
    afterChange(h); refreshDetail();
  }
  document.addEventListener('click', e => {
    if (performance.now() < pressSuppress && !e.target.closest('.ctx')) { e.preventDefault(); return; }
    if (ctxEl && !e.target.closest('.ctx__panel')) { closeCtx(); if (!e.target.closest('[data-act]')) return; }
    else if (ctxEl && e.target.closest('.ctx__panel')) closeCtx();
    const tab = e.target.closest('.tab'); if (tab) { if (performance.now() < tabSuppress) return; if (view === tab.dataset.view && !stack.length) return; view = tab.dataset.view; stack = []; render('fade'); return; }
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act, id = el.dataset.id, h = id && state.habits.find(x => x.id === id);
    switch (act) {
      case 'none': break;
      case 'ctx-close': break;
      case 'duplicate': { const c = JSON.parse(JSON.stringify(h)); c.id = uid(); c.name = h.name + ' copy'; c.createdAt = today(); c.startsOn = today(); state.habits.splice(state.habits.indexOf(h) + 1, 0, c); save(); if (onToday()) flipList(); else render(); break; }
      case 'reset': if (confirm('Reset all history for ' + h.name + '?')) { Object.keys(state.log).forEach(k => { delete state.log[k][id]; if (!Object.keys(state.log[k]).length) delete state.log[k]; }); Object.keys(state.status).forEach(k => { delete state.status[k][id]; }); save(); afterChange(h); } break;
      case 'stats-of': statsSel = [id]; view = 'stats'; stack = []; render('fade'); break;
      case 'pop': readDraft(); stack.pop(); if (!stack.length) draft = null; render('pop'); break;
      case 'go': readDraft(); push({ p: el.dataset.p }); break;
      case 'add': tplKind = 'good'; tplQuery = ''; templatesSheet(); break;
      case 'search': push({ p: 'search' }); break;
      case 'reorder': push({ p: 'reorder' }); break;
      case 'menu-list': listMenu(el); e.stopPropagation(); break;
      case 'menu-sort': sortMenu(el); e.stopPropagation(); break;
      case 'menu-pv': pvMenu(el); e.stopPropagation(); break;
      case 'range-menu': openMenu([[0, 'Today'], [7, 'Last 7 Days'], [28, 'Last 28 Days'], [90, 'Last 3 Months'], [180, 'Last 6 Months'], [365, 'Last Year'], [-1, 'All Time']].map(([v, l]) => `<button data-act="set-range" data-v="${v}"><span class="chk">${statsRange === v ? ic('check', 18) : ''}</span><span class="mt">${l}</span></button>`).join(''), el); e.stopPropagation(); break;
      case 'set-range': statsRange = Number(el.dataset.v); render(); break;
      case 'stat-sel': statsSel = statsSel.includes(id) ? statsSel.filter(x => x !== id) : [...statsSel, id]; render(); break;
      case 'toggle-s': S()[el.dataset.k] = !S()[el.dataset.k]; save(); render(); break;
      case 'clear-filters': Object.assign(S(), { hideDone: false, hideFailed: false, hideSkipped: false }); save(); render(); break;
      case 'set-s': { const k = el.dataset.k; let v = el.dataset.v; if (k === 'dayStart' || k === 'weekStart') v = Number(v); S()[k] = v; save(); tap(); render(); break; }
      case 'bg-random': S().bgStart = BG_SWATCHES[Math.floor(Math.random() * BG_SWATCHES.length)]; S().bgEnd = BG_SWATCHES[Math.floor(Math.random() * BG_SWATCHES.length)]; save(); render(); break;
      case 'tpl-kind': tplKind = el.dataset.v; tplQuery = ''; templatesSheet(); break;
      case 'tpl-custom': closeSheet(); draft = newDraft(el.dataset.kind === 'health' ? 'good' : el.dataset.kind); stack = [{ p: 'edit' }]; render('push'); setTimeout(() => { const n = $('#f-name'); if (n) n.focus(); }, 450); break;
      case 'tpl': { const [si, ti] = el.dataset.i.split(':').map(Number); fromTemplate(el.dataset.kind, T[el.dataset.kind].sections[si][1][ti]); break; }
      case 'open': detailSheet(id); break;
      case 'open-day': stack = []; view = 'today'; render(); detailSheet(id); break;
      case 'edit': closeMenu(); closeSheet(); draft = JSON.parse(JSON.stringify(h)); stack = [{ p: 'edit' }]; render('push'); break;
      case 'note': { const cur = (state.notes[selected] || {})[id] || ''; const v = prompt('Note for ' + h.name, cur); if (v != null) { state.notes[selected] = state.notes[selected] || {}; if (v.trim()) state.notes[selected][id] = v.trim(); else delete state.notes[selected][id]; save(); detailSheet(id); } break; }
      case 'more': moreMenu(el, h); e.stopPropagation(); break;
      case 'close': closeSheet(); break;
      case 'set-d': { readDraft(); const k = el.dataset.k; let v = el.dataset.v; if (k === 'everyN') v = Number(v); draft[k] = v; if (k === 'kind' && v === 'todo') draft.days = [1, 1, 1, 1, 1, 1, 1]; tap(); render(); break; }
      case 'day': readDraft(); draft.days[el.dataset.i] = draft.days[el.dataset.i] ? 0 : 1; el.classList.toggle('on'); tap(); break;
      case 'unit-menu': openMenu(['Count', 'Minutes', 'Custom…'].map(u => `<button data-act="set-unit" data-v="${u}"><span class="chk">${(draft.type === 'timer' ? 'Minutes' : (draft.unit || 'Count')) === u ? ic('check', 18) : ''}</span><span class="mt">${u}</span></button>`).join(''), el); e.stopPropagation(); break;
      case 'set-unit': { readDraft(); const u = el.dataset.v; if (u === 'Minutes') { draft.type = 'timer'; draft.unit = 'Minutes'; if (draft.target < 1) draft.target = 10; } else if (u === 'Count') { draft.type = 'count'; draft.unit = 'Count'; } else { const c = prompt('Unit (e.g. glasses, pages, km)', draft.unit && draft.unit !== 'Count' && draft.unit !== 'Minutes' ? draft.unit : ''); if (c && c.trim()) { draft.type = 'count'; draft.unit = c.trim(); } } if (draft.type === 'count' && draft.kind !== 'track' && draft.target === 1 && draft.unit === 'Count') draft.type = 'check'; render(); break; }
      case 'save': saveDraft(); break;
      case 'group-new': { const n = prompt('Group name'); if (n && n.trim() && !state.groups.find(g => g.name === n.trim())) { state.groups.push({ name: n.trim(), emoji: '📁' }); if (draft) draft.group = n.trim(); save(); render(); } break; }
      case 'group-del': state.groups = state.groups.filter(g => g.name !== el.dataset.name); state.habits.forEach(x => { if (x.group === el.dataset.name) x.group = ''; }); save(); render(); break;
      case 'vac-new': { const f = prompt('Vacation start (YYYY-MM-DD)', today()); if (!f) break; const t2 = prompt('Vacation end (YYYY-MM-DD)', addDays(f, 6)); if (!t2) break; state.vacations.push({ from: f, to: t2 }); save(); render(); break; }
      case 'vac-del': state.vacations.splice(Number(el.dataset.i), 1); save(); render(); break;
      case 'notif': askNotifications(); break;
      case 'notif-test': if (state.push) syncPush({ test: true }); else notify({ name: 'Tally', id: 'test' }, 'This is what a reminder looks like.'); break;
      case 'push-on': subscribePush().then(render).catch(err => { console.warn(err); alert('Could not turn on reminders. Is Tally on the Home Screen?'); }); break;
      case 'push-off': unsubscribePush(); break;
      case 'pick': if (/^\d{4}-\d\d-\d\d$/.test(el.dataset.k) && el.dataset.k !== selected) { selected = el.dataset.k; tap(); if (onToday()) { patchWeek(); flipList(); } else render(); } break;
      case 'inc': mark(h, selected, 1); break;
      case 'dec': mark(h, selected, -1); break;
      case 'undo': setValue(h, selected, 0); setStatus(h, selected, ''); tap(); afterChange(h); refreshDetail(); break;
      case 'complete': if (done(h, selected)) { setValue(h, selected, 0); afterChange(h); refreshDetail(); } else { if (running(h)) { delete state.timers[h.id]; setValue(h, selected, target(h)); } else setValue(h, selected, target(h)); setStatus(h, selected, h.kind === 'bad' ? 'done' : ''); celebrate(h); closeSheet(); afterChange(h); } break;
      case 'skip': setStatus(h, selected, skipped(h, selected) ? '' : 'skip'); tap(); closeSheet(); afterChange(h); break;
      case 'fail': setStatus(h, selected, failed(h, selected) ? '' : 'fail'); tap(); closeSheet(); afterChange(h); break;
      case 'timer': if (running(h)) stopTimer(h); else if (!done(h, today())) { if (selected !== today()) { selected = today(); render(); } startTimer(h); } refreshDetail(); break;
      case 'archive': closeMenu(); closeSheet(); h.archived = !h.archived; save(); stack = []; draft = null; render(); break;
      case 'delete': closeMenu(); if (confirm('Delete this habit and all its history?')) { state.habits = state.habits.filter(y => y.id !== id); Object.keys(state.log).forEach(k => { delete state.log[k][id]; }); save(); closeSheet(); stack = []; draft = null; render(); } break;
      case 'go-ach': closeSheet(); view = 'settings'; stack = [{ p: 'achievements' }]; render(); break;
      case 'month': { const [y, m] = statsMonth.split('-').map(Number); statsMonth = key(new Date(y, m - 1 + Number(el.dataset.n), 1)).slice(0, 7); render(); break; }
      case 'week': statsWeek = addDays(statsWeek, 7 * Number(el.dataset.n)); render(); break;
      case 'year': statsYear = String(Number(statsYear) + Number(el.dataset.n)); render(); break;
      case 'export': { const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tally-' + today() + '.json'; a.click(); break; }
      case 'import': { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json'; inp.onchange = () => { const f = inp.files[0]; if (!f) return; f.text().then(txt => { try { const s = JSON.parse(txt); if (!s.habits || !s.log) throw 0; if (confirm('Replace all current data with this file?')) { localStorage.setItem(KEY, JSON.stringify(s)); state = load(); render(); } } catch (x) { alert('That is not a Tally export.'); } }); }; inp.click(); break; }
      case 'fresh': if (confirm('Fresh start: keep your habits, clear all history?')) { state.log = {}; state.status = {}; state.times = {}; state.notes = {}; state.timers = {}; save(); render(); } break;
      case 'wipe': if (confirm('Delete every habit and all history on this device?')) { const s = state.settings; localStorage.setItem(KEY, JSON.stringify({ habits: [], log: {}, timers: {}, settings: s })); state = load(); render(); } break;
      case 'share-app': if (navigator.share) navigator.share({ title: 'Tally', url: location.href }).catch(() => {}); break;
    }
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.setS) { const k = el.dataset.setS; S()[k] = el.type === 'checkbox' ? el.checked : (k === 'dayStart' || k === 'weekStart' ? Number(el.value) : el.value); save(); render(); return; }
    if (el.id === 'f-endon' || el.id === 'f-ron') { readDraft(); render(); return; }
    if (['f-start', 'f-end', 'f-r', 'f-goal', 'f-step', 'f-excl', 'f-everyn'].includes(el.id)) readDraft();
  });
  let qTimer = null;
  document.addEventListener('input', e => {
    if (e.target.id === 'tpl-q') { clearTimeout(qTimer); const v = e.target.value; qTimer = setTimeout(() => { tplQuery = v; templatesSheet(); }, 250); }
    if (e.target.id === 'f-name' && draft) { draft.name = e.target.value.slice(0, 100); const c = document.querySelector('.pg .card__name'); if (c) c.innerHTML = draft.name ? esc(draft.name) : '<span style="opacity:.45">Habit name</span>'; const b = document.querySelector('.page-t .r'); if (b) b.style.background = draft.name ? 'var(--green)' : 'rgba(120,120,128,.25)'; const n = $('#f-count'); if (n) n.textContent = draft.name.length + '/100'; }
    if (e.target.id === 'hsearch') { const q = e.target.value.toLowerCase(); document.querySelectorAll('#hsearch-out .row').forEach(r => { r.hidden = q && !r.textContent.toLowerCase().includes(q); }); }
  });

  // ---------- boot ----------
  render();
  applyPending().then(() => { if (fromNotif) detailSheet(fromNotif); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
