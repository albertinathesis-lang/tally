// push-sync — the phone registers (or updates) its push subscription and
// the reminders it wants. One row per subscription endpoint. No accounts:
// the endpoint URL is unguessable, and the row holds nothing but the
// reminders themselves (habit names, times, weekdays) and the timezone.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const endpoint = String(body?.endpoint || "");
  if (!/^https:\/\/[^\s]{10,1000}$/.test(endpoint)) return json({ error: "bad endpoint" }, 400);

  if (req.method === "DELETE") {
    await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
    return json({ ok: true });
  }
  // partial updates from the service worker: a notification action
  if (body.doneAdd || body.snooze) {
    const { data: row } = await db.from("push_subscriptions").select("done,snoozes,tz").eq("endpoint", endpoint).single();
    if (!row) return json({ error: "unknown" }, 404);
    const patch: any = { updated_at: new Date().toISOString() };
    if (body.doneAdd && typeof body.doneAdd.id === "string") {
      const date = String(body.doneAdd.date || "").slice(0, 10);
      const done = row.done && row.done.date === date ? row.done : { date, ids: [] };
      if (!done.ids.includes(body.doneAdd.id)) done.ids.push(body.doneAdd.id);
      patch.done = done;
      patch.snoozes = (row.snoozes || []).filter((z: any) => z.id !== body.doneAdd.id);
    }
    if (body.snooze && typeof body.snooze.id === "string") {
      const minutes = Math.min(720, Math.max(1, Number(body.snooze.minutes) || 60));
      const at = localAfter(row.tz, minutes);                       // { date, hm } in the phone's timezone
      const snoozes = (patch.snoozes || row.snoozes || []).filter((z: any) => z.id !== body.snooze.id);
      snoozes.push({ id: body.snooze.id, date: at.date, at: at.hm });
      patch.snoozes = snoozes;
    }
    const { error } = await db.from("push_subscriptions").update(patch).eq("endpoint", endpoint);
    return error ? json({ error: error.message }, 500) : json({ ok: true });
  }
  const keys = body.keys || {};
  if (typeof keys.p256dh !== "string" || typeof keys.auth !== "string") return json({ error: "bad keys" }, 400);
  const tz = typeof body.tz === "string" && body.tz.length < 64 ? body.tz : "UTC";
  const reminders = Array.isArray(body.reminders) ? body.reminders.slice(0, 50).map((r: any) => ({
    id: String(r.id || "").slice(0, 32),
    name: String(r.name || "").slice(0, 80),
    body: String(r.body || "").slice(0, 120),
    time: /^\d\d:\d\d$/.test(r.time) ? r.time : null,
    days: Array.isArray(r.days) ? r.days.slice(0, 7).map((d: any) => d ? 1 : 0) : [1, 1, 1, 1, 1, 1, 1],
  })).filter((r: any) => r.id && r.time) : [];
  const done = body.done && typeof body.done.date === "string" ? { date: body.done.date.slice(0, 10), ids: (body.done.ids || []).slice(0, 100).map(String) } : { date: "", ids: [] };
  const { error } = await db.from("push_subscriptions").upsert({ endpoint, keys, tz, reminders, done, updated_at: new Date().toISOString() }, { onConflict: "endpoint" });
  if (error) return json({ error: error.message }, 500);
  if (body.snooze && typeof body.snooze.id === "string") {
    const { data: row } = await db.from("push_subscriptions").select("snoozes").eq("endpoint", endpoint).single();
    const at = localAfter(tz, Math.min(720, Math.max(1, Number(body.snooze.minutes) || 60)));
    const snoozes = ((row && row.snoozes) || []).filter((z: any) => z.id !== body.snooze.id);
    snoozes.push({ id: body.snooze.id, date: at.date, at: at.hm });
    await db.from("push_subscriptions").update({ snoozes }).eq("endpoint", endpoint);
  }

  if (body.test) {   // the phone asked for a test push: send one now, through the same path as the cron
    const r = await fetch(new URL("/functions/v1/push-tick", Deno.env.get("SUPABASE_URL")!), {
      method: "POST", headers: { "Content-Type": "application/json", "x-cron-secret": (await secret(db)) },
      body: JSON.stringify({ test: endpoint }),
    });
    return json({ ok: true, test: await r.json().catch(() => null) });
  }
  return json({ ok: true });
});

async function secret(db: any) {
  const { data } = await db.from("push_config").select("value").eq("key", "cron_secret").single();
  return data?.value || "";
}

function localAfter(tz: string, minutes: number) {
  const when = new Date(Date.now() + minutes * 60000);
  let parts: Intl.DateTimeFormatPart[];
  try { parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(when); }
  catch { parts = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(when); }
  const g = (t: string) => parts.find(p => p.type === t)?.value || "";
  const hour = g("hour") === "24" ? "00" : g("hour");
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hm: `${hour}:${g("minute")}` };
}
