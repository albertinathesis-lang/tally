// push-tick — runs every minute (pg_cron -> pg_net -> here). For every
// subscription, works out the local time in its timezone and sends a Web
// Push for each reminder whose minute this is, on a scheduled weekday, not
// done today, not already sent today. Gone subscriptions (404/410) are
// removed. With {test: endpoint} it sends one test push instead.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: cfg } = await db.from("push_config").select("key,value");
  const conf: Record<string, string> = {}; (cfg || []).forEach((r: any) => conf[r.key] = r.value);
  if (req.headers.get("x-cron-secret") !== conf.cron_secret || !conf.cron_secret) return json({ error: "forbidden" }, 403);
  webpush.setVapidDetails(conf.vapid_subject, conf.vapid_public, conf.vapid_private);

  let body: any = {}; try { body = await req.json(); } catch {}
  const q = db.from("push_subscriptions").select("endpoint,keys,tz,reminders,done,sent,snoozes");
  const { data: subs, error } = body.test ? await q.eq("endpoint", body.test) : await q;
  if (error) return json({ error: error.message }, 500);

  let sent = 0, gone = 0, checked = 0;
  for (const s of subs || []) {
    const local = localParts(s.tz);                                   // { date, hm, dow }
    const sentToday = s.sent && s.sent.date === local.date ? s.sent.ids as string[] : [];
    const doneToday = s.done && s.done.date === local.date ? s.done.ids as string[] : [];
    let due: any[];
    if (body.test) due = [{ id: "test", name: "Tally", body: "Reminders are on. This one came from the server." }];
    else {
      due = (s.reminders || []).filter((r: any) => r.time === local.hm && r.days[local.dow] && !doneToday.includes(r.id) && !sentToday.includes(r.id));
      // snoozed ones come back at their minute (or the first tick after it), once
      const ripe = (s.snoozes || []).filter((z: any) => z.date === local.date && z.at <= local.hm && !doneToday.includes(z.id));
      const byId: Record<string, any> = {}; (s.reminders || []).forEach((r: any) => byId[r.id] = r);
      ripe.forEach((z: any) => { if (byId[z.id] && !due.some((d: any) => d.id === z.id)) due.push(byId[z.id]); });
      if (ripe.length) await db.from("push_subscriptions").update({ snoozes: (s.snoozes || []).filter((z: any) => !ripe.includes(z)) }).eq("endpoint", s.endpoint);
    }
    checked += (s.reminders || []).length;
    for (const r of due) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title: r.name, body: r.body, tag: "tally-" + r.id, id: r.id }), { TTL: 600, urgency: "high" });
        sent++;
        if (!body.test) sentToday.push(r.id);
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) { await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint); gone++; break; }
        console.error("push failed", e?.statusCode, e?.body || e?.message);
      }
    }
    if (!body.test && due.length) await db.from("push_subscriptions").update({ sent: { date: local.date, ids: sentToday } }).eq("endpoint", s.endpoint);
  }
  return json({ ok: true, subs: (subs || []).length, checked, sent, gone });
});

function localParts(tz: string) {
  let parts: Intl.DateTimeFormatPart[];
  try { parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short" }).formatToParts(new Date()); }
  catch { parts = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short" }).formatToParts(new Date()); }
  const g = (t: string) => parts.find(p => p.type === t)?.value || "";
  const hour = g("hour") === "24" ? "00" : g("hour");
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hm: `${hour}:${g("minute")}`, dow: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(g("weekday")) };
}
