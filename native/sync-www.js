// Copy the web app from the parent folder into www/ for the native shell.
// The service worker is left out: Capacitor serves the files itself.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..'), dst = path.join(__dirname, 'www');
const files = ['index.html', 'tokens.css', 'app.css', 'app.js', 'icons.js', 'templates.js', 'logo.svg', 'manifest.webmanifest'];
fs.rmSync(dst, { recursive: true, force: true }); fs.mkdirSync(path.join(dst, 'icons'), { recursive: true });
files.forEach(f => fs.copyFileSync(path.join(src, f), path.join(dst, f)));
fs.readdirSync(path.join(src, 'icons')).forEach(f => fs.copyFileSync(path.join(src, 'icons', f), path.join(dst, 'icons', f)));
fs.copyFileSync(path.join(__dirname, 'native.js'), path.join(dst, 'native.js'));
let html = fs.readFileSync(path.join(dst, 'index.html'), 'utf8');
html = html.replace('<script src="app.js"></script>', '<script src="native.js"></script>\n<script src="app.js"></script>');
fs.writeFileSync(path.join(dst, 'index.html'), html);
console.log('www/ synced');
