// يبني بيانات الخريطة التفاعلية لموسوعة الطفل: data/kids/world.json
// المدخلات: حدود الدول من world-atlas (Natural Earth، ملكية عامة) + scripts/kids/countries.json (الأسماء العربية والمعلومات).
// الاستخدام: node scripts/kids/build-map.mjs <مجلد node_modules فيه world-atlas وd3-geo وd3-array وtopojson-client>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const NM = path.resolve(process.argv[2] || '');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const req = createRequire(path.join(NM, 'x.js'));
const topo = req('topojson-client');
const { geoNaturalEarth1, geoPath } = await import(pathToFileURL(path.join(NM, 'd3-geo', 'src', 'index.js')).href);

const world = JSON.parse(fs.readFileSync(path.join(NM, 'world-atlas', 'countries-110m.json'), 'utf8'));
const info = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'kids', 'countries.json'), 'utf8'));
delete info._note;
const W = 1000, H = 520;
const fc = topo.feature(world, world.objects.countries);
const proj = geoNaturalEarth1().fitSize([W, H], fc);
const gp = geoPath(proj);
const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => (+n).toFixed(1));
const countries = fc.features.map((f) => [String(f.id || ''), f.properties.name, round(gp(f) || '')]).filter((c) => c[2]);
const ids = new Set(countries.map((c) => c[0]));
const missing = Object.keys(info).filter((k) => !ids.has(k));
if (missing.length) console.warn('دول في countries.json غير موجودة في الخريطة (صغيرة جداً على مقياس 110m):', missing.join(', '));
fs.writeFileSync(path.join(ROOT, 'data', 'kids', 'world.json'), JSON.stringify({ w: W, h: H, c: countries, info }));
console.log('✓ الخريطة:', countries.length, 'دولة،', Object.keys(info).length - missing.length, 'منها ببطاقة معلومات');
