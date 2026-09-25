/* Tally — a daily habit tracker. One file, no dependencies, data on the
   device (localStorage) with JSON export/import. UI follows the Apple
   Liquid Glass system (tokens.css): unified panels, one accent, line icons. */
(function () {
  'use strict';

  // ---------- icons ----------
  const I = window.ICONS || {};
  const ic = (name, size = 22, extra = '') => `<svg class="ic ${extra}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || I['circle-check'] || ''}</svg>`;
  const HABIT_ICONS = ['brain', 'footprints', 'droplet', 'book-open', 'pen-line', 'salad', 'dumbbell', 'bed', 'sparkles', 'palette', 'music', 'languages', 'cigarette-off', 'candy-off', 'smartphone', 'pill', 'shower-head', 'leaf', 'sun', 'moon', 'heart', 'piggy-bank', 'phone', 'dog', 'scale', 'bike', 'coffee', 'apple', 'mic', 'timer', 'flame'];
  const EMOJI_MAP = { '🧘': 'brain', '🏃': 'footprints', '💧': 'droplet', '📚': 'book-open', '✍️': 'pen-line', '🥗': 'salad', '💪': 'dumbbell', '🛌': 'bed', '🧹': 'sparkles', '🎨': 'palette', '🎸': 'music', '🧠': 'brain', '🚭': 'cigarette-off', '🍬': 'candy-off', '📵': 'smartphone', '💊': 'pill', '🚿': 'shower-head', '🌿': 'leaf', '🧴': 'sun', '🦷': 'sparkles', '💸': 'piggy-bank', '📞': 'phone', '🙏': 'heart', '🐕': 'dog', '⚖️': 'scale', '🔥': 'flame', '🚴': 'bike', '🏊': 'droplet', '☕': 'coffee', '🍎': 'apple', '🗣️': 'mic', '🧩': 'brain' };
  // progress ring (SVG): r radius, w stroke, p 0..1
  function ring(size, w, p, cls = '') {
    const r = (size - w) / 2, c = 2 * Math.PI * r;
    return `<svg class="${cls}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><circle class="t" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${w}"/><circle class="p" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${w}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - Math.min(1, p))).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
  }

  // ---------- data ----------
  const KEY = 'tally.v1';
  const GROUPS = ['Morning', 'Afternoon', 'Evening', 'Anytime'];
  const KINDS = [['good', 'Good'], ['health', 'Health'], ['bad', 'Bad'], ['todo', 'To-do']];
  const KIND_ICON = { good: 'circle-check', health: 'heart-pulse', bad: 'ban', todo: 'list-todo' };
  const COLORS = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#007aff', '#5856d6', '#af52de', '#ff2d55'];
  const T = window.TEMPLATES || {};
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const STREAKS = [2, 5, 7, 14, 30, 60, 90, 180, 365];
  const GOALS = [10, 50, 100, 250, 500, 1000];

  let state = load();
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!s || !s.habits) return { habits: [], log: {}, timers: {} };
    s.timers = s.timers || {};
    s.habits.forEach(h => { if (!I[h.icon]) h.icon = EMOJI_MAP[h.icon] || 'circle-check'; if (!h.kind) h.kind = 'good'; if (h.color == null) h.color = ''; });   // v1 emoji -> line icon
    return s;
  }
  let schedTimer = null;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} if (typeof syncPush === 'function') syncPush(); if (window.TALLY_NATIVE && typeof reminderList === 'function') { clearTimeout(schedTimer); schedTimer = setTimeout(() => { if (notifState() === 'granted') window.TALLY_NATIVE.schedule(reminderList()); }, 800); } }
  const uid = () => Math.random().toString(36).slice(2, 10);

  // ---------- dates ----------
  const pad = n => String(n).padStart(2, '0');
  const key = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => key(new Date());
  const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return key(d); };
  const dow = k => (parse(k).getDay() + 6) % 7;
  const firstDone = h => { const ks = Object.keys(state.log).filter(k => (state.log[k][h.id] || 0) >= (h.type === 'check' ? 1 : (h.target || 1))).sort(); return ks[0] || null; };
  const scheduled = (h, k) => h.kind === 'todo' ? (k >= h.createdAt && (!firstDone(h) || k <= firstDone(h))) : (h.days[dow(k)] && k >= h.createdAt);

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

  // ---------- rendering ----------
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app'), sheet = $('#sheet'), scrim = $('#scrim'), navc = $('#navc'), navcT = $('#navc-t');
  let view = 'today', selected = today(), statsMonth = today().slice(0, 7), statsHabit = 'all';
  const TITLES = { today: 'Today', stats: 'Statistics', awards: 'Achievements', settings: 'Settings' };

  function render() {
    app.innerHTML = ({ today: renderToday, stats: renderStats, awards: renderAwards, settings: renderSettings })[view]();
    navcT.textContent = view === 'today' ? todayTitle() : TITLES[view];
    renderTabs(); renderNowBar();
    if (Object.keys(state.timers).length) ensureTick();
    window.scrollTo(0, 0); onScroll();
  }
  let tabSuppress = 0;
  const TABS = [['today', 'list-checks', 'Habits'], ['stats', 'chart-no-axes-column', 'Statistics'], ['awards', 'award', 'Awards'], ['settings', 'settings', 'Settings']];
  function renderTabs() {
    const bar = $('#tabbar');
    if (!bar.querySelector('.tabbar__glass')) {
      bar.innerHTML = `<div class="tabbar__glass"></div>` + TABS.map(([v, i, l]) => `<button class="tab" data-view="${v}">${ic(i, 26)}${l}</button>`).join('');
      dragTabs(bar);
    }
    bar.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.view === view));
    placeGlass(bar, TABS.findIndex(t => t[0] === view));
  }
  function placeGlass(bar, i, instant) {
    const g = bar.querySelector('.tabbar__glass');
    g.style.transition = instant ? 'none' : '';
    g.style.transform = `translateX(${i * 100}%)`;
  }
  // the glass bubble can be dragged along the bar (1:1 under the finger,
  // release snaps to the nearest tab, a flick carries it on)
  function dragTabs(bar) {
    let drag = null;
    const slot = () => (bar.clientWidth - 10) / TABS.length;
    bar.addEventListener('pointerdown', e => {
      if (!e.isPrimary) return;
      const i = TABS.findIndex(t => t[0] === view);
      drag = { x0: e.clientX, i0: i, moved: false, t0: performance.now(), last: [[e.clientX, performance.now()]] };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x0;
      if (!drag.moved && Math.abs(dx) < 8) return;
      drag.moved = true;
      drag.last.push([e.clientX, performance.now()]); if (drag.last.length > 6) drag.last.shift();
      const pos = Math.max(0, Math.min(TABS.length - 1, drag.i0 + dx / slot()));
      const g = bar.querySelector('.tabbar__glass'); g.style.transition = 'none'; g.style.transform = `translateX(${pos * 100}%)`;
    });
    const end = e => {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved) return;                                     // a tap: the click handler switches tabs
      e.preventDefault();
      const [x1, t1] = d.last[0], [x2, t2] = d.last[d.last.length - 1];
      const vel = t2 > t1 ? (x2 - x1) / (t2 - t1) : 0;          // px/ms
      const carry = Math.max(-0.5, Math.min(0.5, vel * 120 / slot()));   // a flick carries at most half a slot
      const pos = d.i0 + (e.clientX - d.x0) / slot() + carry;
      const i = Math.max(0, Math.min(TABS.length - 1, Math.round(pos)));
      tabSuppress = performance.now() + 350;                     // the click that follows a drag is not a tap
      view = TABS[i][0]; render();
    };
    bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
  }
  function onScroll() { navc.classList.toggle('show', window.scrollY > 44); }
  window.addEventListener('scroll', onScroll, { passive: true });

  const todayTitle = () => { const t = today(); return selected === t ? 'Today' : selected === addDays(t, -1) ? 'Yesterday' : parse(selected).toLocaleDateString(undefined, { weekday: 'long' }); };

  // ---------- Today ----------
  function renderToday() {
    const live = state.habits.filter(h => !h.archived), t = today(), d = parse(selected);
    const sub = d.toLocaleDateString(undefined, { weekday: selected === t ? undefined : 'long', day: 'numeric', month: 'long' });
    let html = `<div class="lt-row"><div><h1 class="lt">${todayTitle()}</h1><div class="lt-sub">${sub}</div></div><button class="navbtn" data-act="add" aria-label="New habit">${ic('plus', 24)}</button></div>`;
    // week strip
    const monday = addDays(selected, -dow(selected));
    html += '<div class="week">';
    for (let i = 0; i < 7; i++) {
      const k = addDays(monday, i), p = dayProgress(k, live), fut = k > t;
      html += `<button class="day${k === selected ? ' is-sel' : ''}${fut ? ' is-future' : ''}" data-act="pick" data-k="${k}"><span class="day__n">${DAYS[i]}</span><span class="day__r">${ring(36, 3, p == null ? 0 : p)}<span>${parse(k).getDate()}</span></span></button>`;
    }
    html += '</div>';
    if (!live.length) return html + `<div class="empty"><b>No habits yet</b>Tap + to add your first one.</div>`;
    const dayHabits = live.filter(h => scheduled(h, selected));
    // the coloured moment: the day's progress
    const p = dayProgress(selected, live), nDone = dayHabits.filter(h => done(h, selected)).length;
    const best = Math.max(0, ...live.map(h => streak(h, selected)));
    if (dayHabits.length) html += activityRing(nDone, dayHabits.length, p || 0, best);
    else return html + `<div class="empty"><b>Nothing scheduled</b>No habits on this day.</div>`;
    GROUPS.forEach(g => {
      const hs = dayHabits.filter(h => h.group === g && h.kind !== 'todo');
      if (!hs.length) return;
      html += `<div class="eyebrow"><span>${g}</span><span>${hs.filter(h => done(h, selected)).length}/${hs.length}</span></div><div class="bars">`;
      hs.forEach(h => { html += habitBar(h); });
      html += '</div>';
    });
    const todos = dayHabits.filter(h => h.kind === 'todo');
    if (todos.length) {
      html += `<div class="eyebrow"><span>To-do</span><span>${todos.filter(h => done(h, selected)).length}/${todos.length}</span></div><div class="bars">`;
      todos.forEach(h => { html += habitBar(h); });
      html += '</div>';
    }
    return html;
  }
  // the day's progress as an activity ring: thick, round-capped, a gradient
  // stroke that closes when everything is done
  function activityRing(nDone, n, p, best) {
    const size = 164, w = 17, r = (size - w) / 2, c = 2 * Math.PI * r;
    return `<div class="aring"><div class="aring__ring"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
      <defs><linearGradient id="aring-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a84ff"/><stop offset="1" stop-color="#5e5ce6"/></linearGradient></defs>
      <circle class="t" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${w}"/>
      <circle class="p" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#aring-g)" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - Math.min(1, p))).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>
      <div class="aring__c"><b>${nDone}<span>/${n}</span></b><small>${p >= 0.999 ? 'all done' : 'done'}</small></div></div>
      <div class="aring__s">${best ? `${best}-day streak` : 'Start a streak'}</div></div>`;
  }
  // a habit as a vertical bar: a tall pill that fills from the bottom with
  // the day's progress, the icon at its foot, the name under it. Tapping the
  // bar does the habit's main thing: check, +1, or start/stop the timer.
  function habitBar(h) {
    const k = selected, v = value(h, k), tg = target(h), isDone = done(h, k), s = streak(h, k);
    const run = running(h), p = h.type === 'timer' && run ? Math.min(1, elapsedSec(h) / (tg * 60)) : ratio(h, k);
    let label = '';
    if (h.type === 'count') label = `${v}<span>/${tg}</span>`;
    else if (h.type === 'timer') label = `<span id="el-${h.id}">${run ? fmt(elapsedSec(h)) : fmt(v * 60)}</span>`;
    else label = isDone ? ic('check', 16) : '';
    const glyph = h.type === 'timer' ? ic(run ? 'pause' : isDone ? 'check' : 'play', 14) : h.type === 'count' ? ic('plus', 14) : '';
    const act = h.type === 'check' ? 'toggle' : h.type === 'count' ? 'inc' : 'timer';
    return `<div class="vbar${isDone ? ' is-done' : ''}${run ? ' is-running' : ''}${h.color ? ' is-tinted' : ''}"${h.color ? ` style="--hc:${h.color}"` : ''}>
      <div class="vbar__val">${label}</div>
      <button class="vbar__pill" data-act="${act}" data-id="${h.id}" aria-label="${esc(h.name)}"><i class="vbar__fill" id="bar-${h.id}" style="--p:${Math.round(p * 100)}"></i>${glyph ? `<span class="vbar__glyph">${glyph}</span>` : ''}<span class="vbar__icon">${ic(h.icon, 20)}</span></button>
      <button class="vbar__name" data-act="edit" data-id="${h.id}">${esc(h.name)}</button>
      <div class="vbar__meta">${h.type === 'count' && v > 0 ? `<button class="vbar__minus" data-act="dec" data-id="${h.id}" aria-label="Less">${ic('minus', 12)}</button>` : ''}${s ? `<span class="streak">${ic('flame', 11)}${s}</span>` : ''}</div>
    </div>`;
  }
  // a habit as a tall tile: icon and control on top, name and progress below
  function habitTile(h) {
    const k = selected, v = value(h, k), tg = target(h), isDone = done(h, k), s = streak(h, k);
    let meta = h.kind === 'todo' ? 'To-do' : h.days.every(Boolean) ? 'Every day' : h.days.filter(Boolean).length + ' days';
    if (h.kind === 'bad' && h.type === 'check') meta = 'Avoid';
    let prog = '';
    if (h.type === 'count') prog = `${v} <span>/ ${tg}${h.unit ? ' ' + esc(h.unit) : ''}</span>`;
    if (h.type === 'timer') prog = `<span id="el-${h.id}">${running(h) ? fmt(elapsedSec(h)) : fmt(v * 60)}</span> <span>/ ${tg} min</span>`;
    let act;
    if (h.type === 'check') act = `<button class="chk" data-act="toggle" data-id="${h.id}" aria-label="${isDone ? 'Undo' : 'Done'}"><i>${ic('check', 16)}</i></button>`;
    else if (h.type === 'count') act = `<div class="stepper stepper--s"><button data-act="dec" data-id="${h.id}" aria-label="Less">${ic('minus', 14)}</button><button data-act="inc" data-id="${h.id}" aria-label="More">${ic('plus', 14)}</button></div>`;
    else if (running(h)) act = `<button class="chk run" id="chk-${h.id}" data-act="timer" data-id="${h.id}" aria-label="Stop">${ring(44, 3, elapsedSec(h) / (tg * 60))}<i>${ic('pause', 14)}</i></button>`;
    else act = `<button class="chk${isDone ? '' : ' play'}" data-act="timer" data-id="${h.id}" aria-label="Start"><i>${ic(isDone ? 'check' : 'play', 14)}</i></button>`;
    return `<div class="tile${isDone ? ' is-done' : ''}${h.color ? ' is-tinted' : ''}${running(h) ? ' is-running' : ''}"${h.color ? ` style="--hc:${h.color}"` : ''}>
      <div class="tile__top"><button class="row__lead" data-act="edit" data-id="${h.id}" aria-label="Edit">${ic(h.icon, 20)}</button>${act}</div>
      <button class="tile__body" data-act="edit" data-id="${h.id}"><div class="tile__t">${esc(h.name)}</div><div class="tile__m">${meta}${s ? ` <span class="streak">${ic('flame', 12)}${s}</span>` : ''}</div>${prog ? `<div class="tile__p">${prog}</div>` : ''}</button>
      ${h.type !== 'check' ? `<div class="row__bar" id="bar-${h.id}" style="--p:${Math.round((h.type === 'timer' && running(h) ? elapsedSec(h) / (tg * 60) : ratio(h, k)) * 100)}"><i></i></div>` : ''}</div>`;
  }
  function habitRow(h) {
    const k = selected, v = value(h, k), tg = target(h), isDone = done(h, k), s = streak(h, k);
    let meta = h.kind === 'todo' ? 'To-do' : h.days.every(Boolean) ? 'Every day' : h.days.filter(Boolean).length + ' days a week';
    if (h.kind === 'bad' && h.type === 'check') meta = 'Avoid · ' + meta;
    if (h.type === 'count') meta += ` · ${v} of ${tg}${h.unit ? ' ' + esc(h.unit) : ''}`;
    if (h.type === 'timer') meta += ` · <span id="el-${h.id}">${running(h) ? fmt(elapsedSec(h)) : fmt(v * 60)} of ${tg} min</span>`;
    if (h.reminder) meta += ` · ${h.reminder}`;
    let act;
    if (h.type === 'check') act = `<button class="chk" data-act="toggle" data-id="${h.id}" aria-label="${isDone ? 'Undo' : 'Done'}"><i>${ic('check', 16)}</i></button>`;
    else if (h.type === 'count') act = `<div class="stepper"><button data-act="dec" data-id="${h.id}" aria-label="Less">${ic('minus', 16)}</button><span>${v}</span><button data-act="inc" data-id="${h.id}" aria-label="More">${ic('plus', 16)}</button></div>`;
    else if (running(h)) act = `<button class="chk run" id="chk-${h.id}" data-act="timer" data-id="${h.id}" aria-label="Stop">${ring(44, 3, elapsedSec(h) / (tg * 60))}<i>${ic('pause', 14)}</i></button>`;
    else act = `<button class="chk${isDone ? '' : ' play'}" data-act="timer" data-id="${h.id}" aria-label="Start"><i>${ic(isDone ? 'check' : 'play', 14)}</i></button>`;
    return `<div class="row${isDone ? ' is-done' : ''}${h.color ? ' is-tinted' : ''}${running(h) ? ' is-running' : ''}"${h.color ? ` style="--hc:${h.color}"` : ''}><button class="row__lead" data-act="edit" data-id="${h.id}" aria-label="Edit">${ic(h.icon, 20)}</button>
      <button class="row__body" data-act="edit" data-id="${h.id}"><div class="row__t">${esc(h.name)}</div><div class="row__m"><span>${meta}</span>${s ? `<span class="streak">${ic('flame', 13)}${s}</span>` : ''}</div>${h.type !== 'check' ? `<div class="row__bar" id="bar-${h.id}" style="--p:${Math.round((h.type === 'timer' && running(h) ? elapsedSec(h) / (tg * 60) : ratio(h, k)) * 100)}"><i></i></div>` : ''}</button>
      <div class="row__act">${act}</div></div>`;
  }

  // ---------- Stats ----------
  function renderStats() {
    const live = state.habits.filter(h => !h.archived);
    const hs = statsHabit === 'all' ? live : live.filter(h => h.id === statsHabit), t = today();
    let html = `<div class="lt-row"><h1 class="lt">Statistics</h1></div>
      <div class="selwrap"><select class="select" id="statsHabit"><option value="all">All habits</option>${live.map(h => `<option value="${h.id}"${h.id === statsHabit ? ' selected' : ''}>${esc(h.name)}</option>`).join('')}</select>${ic('chevron-down', 16)}</div>`;
    const [y, m] = statsMonth.split('-').map(Number);
    const first = new Date(y, m - 1, 1), label = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const start = addDays(key(first), -((first.getDay() + 6) % 7));
    html += `<div class="eyebrow"><span>Calendar</span></div><div class="panel card"><div class="card__t"><span>${label}</span><div class="nav"><button data-act="month" data-n="-1" aria-label="Previous month">${ic('chevron-left', 20)}</button><button data-act="month" data-n="1" aria-label="Next month">${ic('chevron-right', 20)}</button></div></div><div class="cal">`;
    DAYS.forEach(d => { html += `<div class="cal__h">${d[0]}</div>`; });
    const full = k => { const p = k <= t ? dayProgress(k, hs) : null; return p != null && p >= 0.999; };
    for (let i = 0; i < 42; i++) {
      const k = addDays(start, i), inMonth = k.slice(0, 7) === statsMonth, p = k <= t ? dayProgress(k, hs) : null, f = full(k);
      html += `<div class="cal__d${inMonth ? '' : ' is-out'}${f ? ' is-full' : ''}${f && i % 7 !== 0 && full(addDays(k, -1)) ? ' is-chain' : ''}"><span>${!f && p ? ring(30, 2.5, p) : ''}${parse(k).getDate()}</span></div>`;
    }
    html += '</div></div>';
    const from = addDays(t, -29), tot = totals(hs, from, t);
    const cur = hs.length ? Math.max(...hs.map(h => streak(h))) : 0, best = hs.length ? Math.max(...hs.map(bestStreak)) : 0;
    html += `<div class="eyebrow"><span>Records</span><span>Last 30 days</span></div><div class="panel recs">
      <div class="rec"><b>${cur}</b><span>Current streak</span></div><div class="rec"><b>${best}</b><span>Best streak</span></div>
      <div class="rec"><b>${tot.comp}</b><span>Completed</span></div><div class="rec"><b>${tot.sched ? Math.round(tot.comp / tot.sched * 100) : 0}%</b><span>Success rate</span></div></div>`;
    const monday = addDays(t, -dow(t));
    html += `<div class="eyebrow"><span>This week</span></div><div class="panel card"><div class="wk"><div></div>${DAYS.map(d => `<div class="h">${d[0]}</div>`).join('')}`;
    if (!live.length) html += `<div class="n" style="grid-column:1/-1;color:var(--text-2)">No habits yet.</div>`;
    live.forEach(h => {
      html += `<div class="n">${ic(h.icon, 16)}${esc(h.name)}</div>`;
      for (let i = 0; i < 7; i++) {
        const k = addDays(monday, i);
        if (!scheduled(h, k) || k > t) { html += '<div class="dot off"></div>'; continue; }
        const r = ratio(h, k);
        html += `<div class="dot${r >= 1 ? ' on' : ''}">${r >= 1 ? ic('check', 12) : r > 0 ? ring(22, 2.5, r) : ''}</div>`;
      }
    });
    return html + '</div></div>';
  }

  // ---------- Awards ----------
  function renderAwards() {
    const live = state.habits.filter(h => !h.archived);
    const best = live.length ? Math.max(...live.map(bestStreak)) : 0;
    const total = live.reduce((a, h) => a + completions(h), 0);
    let html = `<div class="lt-row"><h1 class="lt">Achievements</h1></div><div class="eyebrow"><span>Longest streak</span><span>${best} day${best === 1 ? '' : 's'}</span></div><div class="panel badges">`;
    STREAKS.forEach(n => { html += `<div class="badge${best >= n ? ' on' : ''}"><i>${ic('flame', 26)}</i>${n} days</div>`; });
    html += `</div><div class="eyebrow"><span>Completions</span><span>${total}</span></div><div class="panel badges">`;
    GOALS.forEach(n => { html += `<div class="badge${total >= n ? ' on' : ''}"><i>${ic('flag', 24)}</i>${n}</div>`; });
    return html + '</div>';
  }

  // ---------- Settings ----------
  function renderSettings() {
    const n = state.habits.filter(h => !h.archived).length, a = state.habits.length - n;
    const row = (act, label, small, cls = '') => `<button class="row ${cls}" data-act="${act}"><span>${label}</span><small>${small || ''}</small>${ic('chevron-right', 18, 'chev')}</button>`;
    return `<div class="lt-row"><h1 class="lt">Settings</h1></div>
      <div class="eyebrow"><span>Data</span></div><div class="panel list">${row('export', 'Export', 'JSON file')}${row('import', 'Import', 'Replaces everything')}</div>
      <div class="eyebrow"><span>Reminders</span></div><div class="panel list">${notifRow()}${notifState() === 'granted' ? row('notif-test', 'Send a test reminder', state.push ? 'via server' : '') : ''}${state.push ? row('push-off', 'Turn off reminders while closed', '') : ''}</div>
      <p class="note">${notifNote()}</p>
      <div class="eyebrow"><span>Habits</span></div><div class="panel list">${row('archived', 'Archived', a)}</div>
      <div class="panel list" style="margin-top:22px">${row('wipe', 'Delete all data', '', 'danger')}</div>
      <p class="note">${n} habit${n === 1 ? '' : 's'}. Everything is stored on this device only; export now and then if you care about it.</p>`;
  }

  // ---------- sheets ----------
  let closeTimer = null;
  function openSheet(html) {
    clearTimeout(closeTimer);
    sheet.innerHTML = `<div class="grab"></div>${html}`;
    sheet.classList.remove('closing'); scrim.classList.add('open');
    requestAnimationFrame(() => sheet.classList.add('open'));
  }
  function closeSheet() {
    scrim.classList.remove('open');
    sheet.classList.add('closing'); sheet.classList.remove('open');
    closeTimer = setTimeout(() => { sheet.innerHTML = ''; sheet.classList.remove('closing'); }, 320);
  }
  scrim.addEventListener('click', closeSheet);

  let draft;
  function editSheet(h) {
    draft = h ? JSON.parse(JSON.stringify(h)) : { id: uid(), name: '', icon: 'brain', kind: 'good', color: '', group: 'Morning', type: 'check', target: 1, unit: '', days: [1, 1, 1, 1, 1, 1, 1], createdAt: today() };
    draft._new = !h;
    renderEditSheet(true);
  }
  function fromTemplate(kind, t) {   // t = [name, icon, type, target, unit, group]
    const k = T[kind] || {};
    editSheet(null);
    Object.assign(draft, { name: t[0], icon: t[1], kind, color: k.color || '', type: t[2] || 'check', target: t[3] || (t[2] === 'timer' ? 10 : 1), unit: t[4] || '', group: kind === 'todo' ? 'Anytime' : (t[5] || 'Morning') });
    renderEditSheet(true);
  }
  function renderEditSheet(first) {
    const isNew = draft._new;
    const seg = (name, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${v === draft[name] ? 'on' : ''}" data-set="${name}" data-v="${v}">${l}</button>`).join('')}</div>`;
    openSheet(`<h2 class="sheet__t"><span>${isNew ? 'New habit' : 'Edit habit'}</span><button class="navbtn" data-act="close" aria-label="Close">${ic('x', 22)}</button></h2>
      <div class="panel form">
        <div class="frow"><label for="f-name">Name</label><input type="text" id="f-name" placeholder="Meditate" value="${esc(draft.name)}" autocomplete="off" autocapitalize="sentences"></div>
        <div class="frow frow--col"><label>Icon</label><div class="igrid">${HABIT_ICONS.map(n => `<button class="${n === draft.icon ? 'on' : ''}" data-set="icon" data-v="${n}" aria-label="${n}">${ic(n, 20)}</button>`).join('')}</div></div>
        <div class="frow frow--col"><label>Kind</label>${seg('kind', KINDS)}</div>
        <div class="frow frow--col"><label>Colour</label><div class="swatches"><button class="swatch none${draft.color ? '' : ' on'}" data-set="color" data-v="" aria-label="No colour">${ic('circle-slash', 16)}</button>${COLORS.map(c => `<button class="swatch${c === draft.color ? ' on' : ''}" style="--c:${c}" data-set="color" data-v="${c}" aria-label="${c}"></button>`).join('')}</div></div>
        ${draft.kind === 'todo' ? '' : `<div class="frow frow--col"><label>When</label>${seg('group', GROUPS.map(g => [g, g]))}</div>`}
        <div class="frow frow--col"><label>Type</label>${seg('type', [['check', draft.kind === 'bad' ? 'Avoided' : draft.kind === 'todo' ? 'Done' : 'Check off'], ['count', 'Count'], ['timer', 'Timer']])}</div>
        <div id="f-target"></div>
        <div class="frow"><label for="f-r">Reminder</label><input type="time" id="f-r" value="${draft.reminder || ''}"><button class="navbtn small" data-act="clear-r" aria-label="No reminder" ${draft.reminder ? '' : 'hidden'}>${ic('x', 16)}</button></div>
        ${draft.kind === 'todo' ? '' : `<div class="frow frow--col"><label>Days</label><div class="days">${DAYS.map((d, i) => `<button class="dayb${draft.days[i] ? ' on' : ''}" data-day="${i}" aria-label="${d}">${d[0]}</button>`).join('')}</div></div>`}
      </div>
      <button class="btn" data-act="save">${isNew ? (draft.kind === 'todo' ? 'Add to-do' : 'Add habit') : 'Save'}</button>
      ${isNew ? '' : `<button class="btn btn--2" data-act="archive">${draft.archived ? 'Restore' : 'Archive'}</button><button class="btn btn--danger" data-act="delete">Delete habit and history</button>`}`);
    renderTarget();
    if (first && isNew) setTimeout(() => $('#f-name').focus(), 420);
  }
  let tplKind = 'good', tplQuery = '';
  function templatesSheet() {
    const q = tplQuery.trim().toLowerCase();
    const kinds = q ? KINDS.map(k => k[0]) : [tplKind];
    let list = '';
    kinds.forEach(kind => {
      const k = T[kind]; if (!k) return;
      k.sections.forEach(([title, items]) => {
        const rows = items.filter(t => !q || t[0].toLowerCase().includes(q));
        if (!rows.length) return;
        list += `<div class="eyebrow"><span>${q ? k.label + ' · ' : ''}${title}</span></div><div class="panel">${rows.map((t, i) => `<button class="row tpl" data-act="tpl" data-kind="${kind}" data-i="${k.sections.indexOf(k.sections.find(sec => sec[1] === items))}:${items.indexOf(t)}"${k.color ? ` style="--hc:${k.color}"` : ''}><span class="row__lead">${ic(t[1], 20)}</span><span class="row__body"><span class="row__t">${esc(t[0])}</span></span>${ic('chevron-right', 18, 'chev')}</button>`).join('')}</div>`;
      });
    });
    if (!list) list = `<p class="note">Nothing matches.</p>`;
    openSheet(`<h2 class="sheet__t"><span>Templates</span><button class="navbtn" data-act="close" aria-label="Close">${ic('x', 22)}</button></h2>
      <div class="seg tplseg">${KINDS.map(([v, l]) => `<button class="${v === tplKind && !q ? 'on' : ''}" data-act="tpl-kind" data-v="${v}">${l}</button>`).join('')}</div>
      <div class="search">${ic('search', 18)}<input type="search" id="tpl-q" placeholder="Search templates" value="${esc(tplQuery)}" autocomplete="off"></div>
      <div class="panel" style="margin-top:14px"><button class="row" data-act="tpl-custom" data-kind="${tplKind}"${(T[tplKind] || {}).color ? ` style="--hc:${T[tplKind].color}"` : ''}><span class="row__lead">${ic(KIND_ICON[tplKind], 20)}</span><span class="row__body"><span class="row__t">${tplKind === 'todo' ? 'Create a custom to-do' : 'Create a custom habit'}</span></span>${ic('chevron-right', 18, 'chev')}</button></div>
      ${list}`);
    const inp = $('#tpl-q'); if (q) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }
  function renderTarget() {
    const el = $('#f-target'); if (!el) return;
    if (draft.type === 'count') el.innerHTML = `<div class="frow"><label for="f-t">Target</label><input type="number" id="f-t" min="1" inputmode="numeric" value="${draft.target || 1}"></div><div class="frow"><label for="f-u">Unit</label><input type="text" id="f-u" placeholder="glasses" value="${esc(draft.unit || '')}"></div>`;
    else if (draft.type === 'timer') el.innerHTML = `<div class="frow"><label for="f-t">Minutes</label><input type="number" id="f-t" min="1" inputmode="numeric" value="${draft.target || 10}"></div>`;
    else el.innerHTML = '';
  }
  function readDraft() {
    const n = $('#f-name'); if (n) draft.name = n.value.trim();
    const t = $('#f-t'); if (t) draft.target = Math.max(1, parseInt(t.value, 10) || 1);
    const u = $('#f-u'); if (u) draft.unit = u.value.trim();
    const r = $('#f-r'); if (r) draft.reminder = r.value || '';
  }

  // ---------- inline timers ----------
  // A timed habit runs on its own row; several can run at once. What is
  // running is kept in state.timers as {startedAt, base seconds}, so it
  // survives a reload and keeps counting in the background. The bar above
  // the tabs shows every running timer.
  const fmt = sec => { sec = Math.max(0, Math.round(sec)); const m = Math.floor(sec / 60), s2 = sec % 60; return m + ':' + pad(s2); };
  const running = h => !!state.timers[h.id];
  const elapsedSec = h => { const t = state.timers[h.id]; return t ? t.base + (Date.now() - t.startedAt) / 1000 : value(h, selected) * 60; };
  function startTimer(h) {
    if (running(h)) return;
    state.timers[h.id] = { startedAt: Date.now(), base: value(h, today()) * 60, day: today() };
    save(); render(); ensureTick();
  }
  function stopTimer(h, complete) {
    const t = state.timers[h.id]; if (!t) return;
    const sec = complete ? target(h) * 60 : t.base + (Date.now() - t.startedAt) / 1000;
    delete state.timers[h.id];
    setValue(h, t.day, Math.round(sec / 6) / 10);          // minutes, one decimal
    render();
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
      const el = document.getElementById('el-' + id); if (el) el.textContent = el.closest('.vbar') ? fmt(sec) : fmt(sec) + ' of ' + target(h) + ' min';
      const bar = document.getElementById('bar-' + id); if (bar) bar.style.setProperty('--p', Math.round(sec / tg * 100));
      const nb = document.getElementById('nb-' + id); if (nb) nb.textContent = fmt(sec);
      const ring = document.querySelector('#chk-' + id + ' .p'); if (ring) { const len = parseFloat(ring.getAttribute('stroke-dasharray')); ring.setAttribute('stroke-dashoffset', (len * (1 - sec / tg)).toFixed(2)); }
    });
  }
  function renderNowBar() {
    const ids = Object.keys(state.timers);
    const bar = $('#nowbar');
    bar.hidden = !ids.length;
    if (!ids.length) return;
    bar.innerHTML = ids.map(id => { const h = state.habits.find(x => x.id === id); if (!h) return ''; return `<div class="now"${h.color ? ` style="--hc:${h.color}"` : ''}><span class="row__lead">${ic(h.icon, 18)}</span><span class="now__b"><span class="row__t">${esc(h.name)}</span><span class="row__m">${target(h)} min</span></span><b class="now__t" id="nb-${id}">${fmt(elapsedSec(h))}</b><button class="now__stop" data-act="timer" data-id="${id}" aria-label="Stop">${ic('pause', 16)}</button></div>`; }).join('');
  }
  // reaching the target: the habit is done, and it earns a moment
  function celebrate(h) {
    const best = bestStreak(h), hit = STREAKS.filter(n => best === n)[0];
    openSheet(`<div class="cheer"><div class="cheer__badge">${ic(hit ? 'flame' : 'flag', 40)}</div>
      <div class="cheer__n">${hit ? hit + '-day streak' : '100%'}</div>
      <div class="cheer__t">${esc(h.name)} done${hit ? ' · a new badge' : ''}. Keep it up.</div>
      <button class="btn" data-act="close">Nice</button><button class="btn btn--2" data-act="go-awards">View achievements</button></div>`);
  }

  // ---------- push (reminders while the app is closed) ----------
  // The phone subscribes to Web Push and keeps its reminder list on the
  // server (a Supabase project: one row per subscription, holding only
  // the reminders, the timezone and what is done today). A job there runs
  // every minute and pushes whatever is due. Nothing else leaves the phone.
  const PUSH = { url: 'https://lodogasuaggsibycwqyi.supabase.co', key: 'sb_publishable_PyPIDVs6quS3Qlv-hXqrHQ_hx53bZgN', vapid: 'BFThnWY2_-TOy3R00UIPO2Tk9X6GhmWp-G05YSaEjktanUIpA0KHWWapbf-Kva0xvDNmlo1oF0pMgxBvpIO1IL8' };
  const NATIVE = window.TALLY_NATIVE || null;
  const pushReady = () => !NATIVE && PUSH.url.startsWith('https://') && 'PushManager' in window && 'serviceWorker' in navigator;
  function b64ToU8(b) { const s = atob((b + '='.repeat((4 - b.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); }
  function reminderList() {
    return state.habits.filter(h => !h.archived && h.reminder).map(h => ({ id: h.id, name: h.name, time: h.reminder, days: h.days,
      body: h.type === 'count' ? `${target(h)}${h.unit ? ' ' + h.unit : ''} today` : h.type === 'timer' ? `${target(h)} minutes today` : 'Time for it.' }));
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
    syncTimer = setTimeout(() => {
      pushCall('POST', Object.assign({ endpoint: state.push.endpoint, keys: state.push.keys, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, reminders: reminderList(), done: doneToday() }, extra || {})).catch(() => {});
    }, extra ? 0 : 800);
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
  // "Done" on a notification (where the platform shows buttons) is recorded
  // by the service worker; the app applies it here. Tapping the notification
  // body opens the app on that habit with the same two choices, which is
  // what iPhone gets, since it shows no buttons on web notifications.
  async function applyPending() {
    try {
      const c = await caches.open('tally-pending'); const r = await c.match('pending'); if (!r) return;
      const list = await r.json(); await c.delete('pending');
      list.forEach(it => { const h = state.habits.find(x => x.id === it.id); if (h && it.type === 'done' && !done(h, it.date)) setValue(h, it.date, target(h)); });
      render();
    } catch (e) {}
  }
  function actionSheet(id) {
    const h = state.habits.find(x => x.id === id); if (!h) return;
    const t = today();
    openSheet(`<h2 class="sheet__t"><span>${esc(h.name)}</span><button class="navbtn" data-act="close" aria-label="Close">${ic('x', 22)}</button></h2>
      <p class="note" style="margin:0 4px 16px">${done(h, t) ? 'Done for today.' : (h.type === 'count' ? `${target(h)}${h.unit ? ' ' + esc(h.unit) : ''} today.` : h.type === 'timer' ? `${target(h)} minutes today.` : 'Time for it.')}</p>
      ${done(h, t) ? '' : `<button class="btn" data-act="a-done" data-id="${h.id}">Done</button><button class="btn btn--2" data-act="a-snooze" data-id="${h.id}">In 1 hour</button>`}
      ${h.type === 'timer' && !done(h, t) ? `<button class="btn btn--2" data-act="a-timer" data-id="${h.id}">Start the timer</button>` : ''}`);
  }
  function snooze(h) {
    if (NATIVE) { NATIVE.snooze({ id: h.id, name: h.name, body: reminderList().find(r => r.id === h.id)?.body }, 60); return; }
    if (state.push) syncPush({ snooze: { id: h.id, minutes: 60 } });
    else setTimeout(() => { if (!done(h, today())) notify(h, 'Time for it.'); }, 60 * 60 * 1000);
  }
  navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', e => {
    const m = e.data || {};
    if (m.type === 'open-habit') { selected = today(); view = 'today'; render(); actionSheet(m.id); }
    if (m.type === 'done') applyPending();
  });
  if (NATIVE) NATIVE.handlers.action = (actionId, id) => {
    const h = state.habits.find(x => x.id === id); if (!h) return;
    if (actionId === 'done') { setValue(h, today(), target(h)); render(); }
    else if (actionId === 'snooze') snooze(h);
    else { selected = today(); view = 'today'; render(); actionSheet(h.id); }
  };
  const fromNotif = new URLSearchParams(location.search).get('habit');
  if (fromNotif) history.replaceState(null, '', location.pathname);

  // ---------- reminders ----------
  // A habit can carry a time. While Tally is open (or in the background on
  // platforms that keep web apps alive), the minute comes round and a
  // notification is shown through the service worker. Nothing leaves the
  // device: there is no push server.
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let nativePerm = 'default';
  if (NATIVE) NATIVE.permission().then(p => { nativePerm = p; render(); });
  function notifState() { if (NATIVE) return nativePerm; return !('Notification' in window) ? 'unsupported' : Notification.permission; }
  function notifRow() {
    const st = notifState();
    const label = { granted: 'Allowed', denied: 'Blocked in Settings', default: 'Off', unsupported: 'Not available here' }[st];
    if (st === 'default') return `<button class="row" data-act="notif"><span>Notifications</span><small style="color:var(--accent)">Allow</small></button>`;
    let rows = `<div class="row"><span>Notifications</span><small>${label}</small></div>`;
    if (NATIVE && st === 'granted') return rows + `<div class="row"><span>While Tally is closed</span><small>On</small></div>`;
    if (st === 'granted' && pushReady()) rows += state.push
      ? `<div class="row"><span>While Tally is closed</span><small>On</small></div>`
      : `<button class="row" data-act="push-on"><span>While Tally is closed</span><small style="color:var(--accent)">Turn on</small></button>`;
    return rows;
  }
  function notifNote() {
    const st = notifState();
    if (st === 'unsupported' && isIOS() && !standalone()) return 'On iPhone, notifications work once Tally is on the Home Screen: open this page in Safari, tap Share, then Add to Home Screen.';
    if (st === 'denied') return 'Notifications are blocked for Tally. Turn them on in the phone\'s Settings, under Notifications.';
    if (NATIVE) return st === 'granted' ? 'Set a time on any habit and the reminder arrives at that minute, whether Tally is open or not. Everything is scheduled on this phone.' : 'Allow notifications and a reminder arrives at the time you set on a habit, whether Tally is open or not.';
    if (state.push) return 'Set a time on any habit and the reminder arrives at that minute, whether Tally is open or not. The server holds only your reminder times, your timezone and what is done today.';
    return 'Set a time on any habit and a reminder arrives at that minute while Tally is open. Turn on "While Tally is closed" to have them delivered any time.';
  }
  function askNotifications() {
    if (NATIVE) { NATIVE.ask().then(p => { nativePerm = p; if (p === 'granted') NATIVE.schedule(reminderList()); render(); }); return; }
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(async p => {
      if (p === 'granted' && pushReady()) { try { await subscribePush(); } catch (e) { console.warn('push subscribe failed', e); } }
      render();
    });
  }
  function notify(h, body) {
    if (NATIVE) { NATIVE.test(); return; }
    if (notifState() !== 'granted') return;
    const opts = { body, tag: 'tally-' + h.id, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { id: h.id } };
    navigator.serviceWorker.ready.then(r => r.showNotification(h.name, opts)).catch(() => { try { new Notification(h.name, opts); } catch (e) {} });
  }
  function checkReminders() {
    if (state.push || NATIVE) return;             // the server, or the phone itself, delivers
    const t = today(), now = new Date(), hm = pad(now.getHours()) + ':' + pad(now.getMinutes());
    state.notified = state.notified && state.notified.date === t ? state.notified : { date: t, ids: [] };
    let changed = false;
    state.habits.forEach(h => {
      if (h.archived || !h.reminder || h.reminder !== hm || !scheduled(h, t) || done(h, t) || state.notified.ids.includes(h.id)) return;
      const what = h.type === 'count' ? `${target(h)}${h.unit ? ' ' + h.unit : ''} today` : h.type === 'timer' ? `${target(h)} minutes today` : 'Time for it.';
      notify(h, what); state.notified.ids.push(h.id); changed = true;
    });
    if (changed) save();
  }
  setInterval(checkReminders, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkReminders(); applyPending(); } });

  // ---------- events ----------
  document.addEventListener('click', e => {
    const tab = e.target.closest('.tab'); if (tab) { if (performance.now() < tabSuppress) return; view = tab.dataset.view; render(); return; }
    const el = e.target.closest('[data-act],[data-set],[data-day]'); if (!el) return;
    const act = el.dataset.act, id = el.dataset.id, h = id && state.habits.find(x => x.id === id);
    if (el.dataset.set) { readDraft(); draft[el.dataset.set] = el.dataset.v; if (el.dataset.set === 'type') draft.target = draft.type === 'timer' ? 10 : 1; if (el.dataset.set === 'kind') { if (!draft.name && draft._new) draft.color = (T[draft.kind] || {}).color || ''; if (draft.kind === 'todo') { draft.days = [1, 1, 1, 1, 1, 1, 1]; draft.group = 'Anytime'; } } renderEditSheet(false); return; }
    if (el.dataset.day != null) { readDraft(); draft.days[el.dataset.day] = draft.days[el.dataset.day] ? 0 : 1; el.classList.toggle('on'); return; }
    switch (act) {
      case 'add': tplKind = 'good'; tplQuery = ''; templatesSheet(); break;
      case 'tpl-kind': tplKind = el.dataset.v; tplQuery = ''; templatesSheet(); break;
      case 'tpl-custom': editSheet(null); draft.kind = el.dataset.kind; draft.color = (T[el.dataset.kind] || {}).color || ''; if (draft.kind === 'todo') draft.group = 'Anytime'; renderEditSheet(true); break;
      case 'tpl': { const [si, ti] = el.dataset.i.split(':').map(Number); fromTemplate(el.dataset.kind, T[el.dataset.kind].sections[si][1][ti]); break; }
      case 'edit': editSheet(h); break;
      case 'close': closeSheet(); break;
      case 'clear-r': readDraft(); draft.reminder = ''; renderEditSheet(false); break;
      case 'notif': askNotifications(); break;
      case 'notif-test': if (state.push) syncPush({ test: true }); else notify({ name: 'Tally', id: 'test' }, 'This is what a reminder looks like.'); break;
      case 'push-on': subscribePush().then(render).catch(e => { console.warn(e); alert('Could not turn on reminders. Is Tally on the Home Screen?'); }); break;
      case 'push-off': unsubscribePush(); break;
      case 'a-done': setValue(h, today(), target(h)); closeSheet(); render(); break;
      case 'a-snooze': snooze(h); closeSheet(); break;
      case 'a-timer': closeSheet(); selected = today(); startTimer(h); break;
      case 'pick': selected = el.dataset.k; render(); break;
      case 'toggle': setValue(h, selected, done(h, selected) ? 0 : 1); if (NATIVE) (done(h, selected) ? NATIVE.success : NATIVE.tap)(); render(); break;
      case 'inc': setValue(h, selected, value(h, selected) + 1); render(); break;
      case 'dec': setValue(h, selected, value(h, selected) - 1); render(); break;
      case 'timer': if (running(h)) stopTimer(h); else if (!done(h, today())) { selected = today(); startTimer(h); } break;
      case 'go-awards': closeSheet(); view = 'awards'; render(); break;
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
      case 'month': { const [y, m] = statsMonth.split('-').map(Number); statsMonth = key(new Date(y, m - 1 + Number(el.dataset.n), 1)).slice(0, 7); render(); break; }
      case 'export': { const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tally-' + today() + '.json'; a.click(); break; }
      case 'import': { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json'; inp.onchange = () => { const f = inp.files[0]; if (!f) return; f.text().then(txt => { try { const s = JSON.parse(txt); if (!s.habits || !s.log) throw 0; if (confirm('Replace all current data with this file?')) { localStorage.setItem(KEY, JSON.stringify(s)); state = load(); render(); } } catch (x) { alert('That is not a Tally export.'); } }); }; inp.click(); break; }
      case 'archived': { const a = state.habits.filter(x => x.archived); openSheet(`<h2 class="sheet__t"><span>Archived</span><button class="navbtn" data-act="close" aria-label="Close">${ic('x', 22)}</button></h2>${a.length ? `<div class="panel">${a.map(x => `<button class="row" data-act="edit" data-id="${x.id}"><span class="row__lead">${ic(x.icon, 20)}</span><span class="row__body"><div class="row__t">${esc(x.name)}</div><div class="row__m">${completions(x)} completions</div></span>${ic('chevron-right', 18, 'chev')}</button>`).join('')}</div>` : '<p class="note">Nothing archived.</p>'}`); break; }
      case 'wipe': if (confirm('Delete every habit and all history on this device?')) { state = { habits: [], log: {}, timers: {} }; save(); render(); } break;
    }
  });
  document.addEventListener('change', e => { if (e.target.id === 'statsHabit') { statsHabit = e.target.value; render(); } });
  let qTimer = null;
  document.addEventListener('input', e => { if (e.target.id === 'tpl-q') { clearTimeout(qTimer); const v = e.target.value; qTimer = setTimeout(() => { tplQuery = v; templatesSheet(); }, 250); } });

  // ---------- boot ----------
  render();
  applyPending().then(() => { if (fromNotif) actionSheet(fromNotif); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
