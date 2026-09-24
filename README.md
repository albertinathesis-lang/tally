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

Reminders fire while Tally is open (or in the background where the platform
allows). Delivery while the app is closed needs a push server, which Tally
does not have; Home Screen widgets need a native shell. Both are drawn on the
design sheet as the target.

Files: index.html (shell), tokens.css (design tokens, from the
apple-design-skill), app.css, app.js (everything), icons.js (Lucide line
icons, ISC), sw.js (offline cache — bump CACHE when shipping), logo.svg,
manifest.webmanifest, icons/, design.html.
