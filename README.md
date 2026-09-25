# Tally — daily habits

A habit tracker in the Apple Liquid Glass idiom: light ground, one white
panel per group with hairline rows, grayscale with a single blue accent,
line icons, a large title that collapses into a glass bar, a glass tab bar,
and an edge-anchored sheet with spring motion. Dark mode follows the phone.

Habits are checked, counted, or timed; grouped by Morning / Afternoon /
Evening / Anytime; each can carry a reminder time. Statistics: month
calendar with streak chains, 30-day records, this-week grid. Achievements:
streak and completion badges.

One HTML page, no dependencies, installable on a phone as a web app, works
offline (service worker). All data stays on the device (localStorage) with
JSON export/import in Settings.

Live: https://albertinathesis-lang.github.io/tally/
Design sheet (logo, notifications, widgets): https://albertinathesis-lang.github.io/tally/design.html

On iPhone: open the link in Safari, Share → Add to Home Screen. It then opens
full-screen like an app, and notifications can be allowed from Settings.

## Reminders while the app is closed (push server)

Settings → Notifications → Allow, then "While Tally is closed → Turn on". The
phone subscribes to Web Push and keeps its reminder list on a small Supabase
project (`tally`, ref lodogasuaggsibycwqyi, eu-central-1, free tier):

- `push_subscriptions` — one row per phone: endpoint + keys, timezone, the
  reminders (habit id, name, body, time, weekdays), what is done today, what
  was sent today. Nothing else leaves the phone. RLS on, no policies: only
  the edge functions (service role) touch it.
- `push_config` — VAPID keys, subject, and the cron secret.
- `server/push-sync` — the phone upserts / deletes its row; `{test:true}` asks
  for a test push right away.
- `server/push-tick` — pg_cron calls it every minute with the secret; it works
  out the local minute per timezone and sends what is due via `web-push`.
  Subscriptions that are gone (404/410) are deleted.

The VAPID key pair and the cron secret live in `~/.config/tally/vapid.json`
(not in the repo). The public key, project URL and publishable key are in
app.js (`PUSH`). Rotate: new keys in `push_config`, new public key in app.js,
phones re-subscribe from Settings.

Home Screen widgets still need a native shell; they are on the design sheet
as the target.

Files: index.html (shell), tokens.css (design tokens, from the
apple-design-skill), app.css, app.js (everything), icons.js (Lucide line
icons, ISC), sw.js (offline cache — bump CACHE when shipping), logo.svg,
manifest.webmanifest, icons/, design.html.

## Native app (iPhone)

`native/` wraps the same web app in a Capacitor shell (SPM, no CocoaPods).
`native/native.js` is loaded only there: reminders become local
notifications scheduled on the phone with Done / In 1 hour buttons (no push
server), haptics on checks. Bundle id `com.aiartlab.tally`, team 7U76K536SH.

    cd native && npm install
    npm run sync                      # copies ../ into www/ and syncs plugins
    xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
      -destination "id=<device udid>" -derivedDataPath build \
      -allowProvisioningUpdates build
    xcrun devicectl device install app --device <udid> build/Build/Products/Debug-iphoneos/App.app

With a free Apple ID the install is valid for 7 days and the phone can hold
three such apps at once. Widgets and the Live Activity (design.html) are the
next native pieces, in Swift.
