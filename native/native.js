/* native.js — what the native shell adds. Loaded before app.js, only in
   the Capacitor build. Reminders become local notifications scheduled on
   the phone (with Done / In 1 hour buttons), so no push server is needed;
   haptics on taps; status bar style. app.js calls into window.TALLY_NATIVE. */
(function () {
  'use strict';
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  const LN = C.Plugins.LocalNotifications, H = C.Plugins.Haptics, SB = C.Plugins.StatusBar;
  const KB = C.Plugins.Keyboard;
  try { if (KB) KB.setAccessoryBarVisible({ isVisible: false }); } catch (e) {}
  const N = window.TALLY_NATIVE = { isNative: true, handlers: {} };

  N.tap = () => { try { H.impact({ style: 'LIGHT' }); } catch (e) {} };
  N.success = () => { try { H.notification({ type: 'SUCCESS' }); } catch (e) {} };
  N.tick = () => { try { H.selectionStart(); H.selectionChanged(); H.selectionEnd(); } catch (e) {} };
  try { SB.setStyle({ style: 'DEFAULT' }); } catch (e) {}

  // permission: 'granted' | 'denied' | 'prompt'
  N.permission = async () => { try { const r = await LN.checkPermissions(); return r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'default'; } catch (e) { return 'unsupported'; } };
  N.ask = async () => { try { const r = await LN.requestPermissions(); return r.display === 'granted' ? 'granted' : 'denied'; } catch (e) { return 'denied'; } };

  // a stable numeric id per habit reminder (weekday encoded in the low digit)
  const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) % 100000000; };
  const idFor = (habitId, weekday) => hash(habitId) * 10 + weekday;   // weekday 1..7 (Sunday = 1)

  // reminders: [{id, name, body, time:'HH:MM', days:[Mon..Sun 0/1]}] -> daily repeating notifications
  N.schedule = async reminders => {
    try {
      const pending = await LN.getPending();
      if (pending.notifications.length) await LN.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
      await LN.registerActionTypes({ types: [{ id: 'TALLY', actions: [{ id: 'done', title: 'Done' }, { id: 'snooze', title: 'In 1 hour' }] }] });
      const list = [];
      reminders.forEach(r => {
        const [hh, mm] = r.time.split(':').map(Number);
        r.days.forEach((on, i) => {
          if (!on) return;
          const weekday = ((i + 1) % 7) + 1;                            // Mon(0)->2 … Sun(6)->1
          list.push({ id: idFor(r.id, weekday), title: r.name, body: r.body, actionTypeId: 'TALLY', extra: { habit: r.id },
            schedule: { on: { weekday, hour: hh, minute: mm }, allowWhileIdle: true } });
        });
      });
      if (list.length) await LN.schedule({ notifications: list });
      return list.length;
    } catch (e) { console.warn('schedule failed', e); return 0; }
  };
  N.snooze = async (habit, minutes) => {
    try { await LN.schedule({ notifications: [{ id: hash(habit.id) * 10 + 9, title: habit.name, body: habit.body || 'Time for it.', actionTypeId: 'TALLY', extra: { habit: habit.id },
      schedule: { at: new Date(Date.now() + minutes * 60000), allowWhileIdle: true } }] }); } catch (e) {}
  };
  N.test = async () => { try { await LN.schedule({ notifications: [{ id: 1, title: 'Tally', body: 'Reminders are on.', actionTypeId: 'TALLY', extra: { habit: 'test' }, schedule: { at: new Date(Date.now() + 3000) } }] }); } catch (e) {} };

  // taps and buttons on a notification
  LN.addListener('localNotificationActionPerformed', ev => {
    const habit = ev.notification && ev.notification.extra && ev.notification.extra.habit;
    const fn = N.handlers.action; if (fn) fn(ev.actionId, habit);
  });
})();
