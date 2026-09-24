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
