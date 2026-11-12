// ينسخ ملفات التطبيق إلى مجلد www لبناء تطبيق أندرويد
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
for (const f of ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons']) {
  fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
}
// هل يوجد ملف أذان مخصص؟
const hasAdhan = fs.existsSync(path.join(root, 'adhan', 'adhan.mp3'));
fs.writeFileSync(path.join(out, 'js', 'native-flags.js'), `window.NOOR_NATIVE_ADHAN = ${hasAdhan};\n`);
console.log('www جاهز', hasAdhan ? '(مع صوت أذان مخصص)' : '');
