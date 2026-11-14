// يسجّل جولة في التطبيق (بحجم شاشة هاتف) حسب scenes.json ومدد التعليق الصوتي في durations.json
// الاستخدام: node record.js <siteUrl> <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [, , SITE, OUT] = process.argv;
  const scenes = JSON.parse(fs.readFileSync(path.join(__dirname, 'scenes.json'), 'utf8'));
  const dur = JSON.parse(fs.readFileSync(path.join(OUT, 'durations.json'), 'utf8'));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    // نافذة 720×1560 مع تكبير الصفحة ×2: نفس تخطيط الهاتف (360 بكسل منطقي) لكن بدقة عالية في التسجيل
    viewport: { width: 720, height: 1560 }, deviceScaleFactor: 1, hasTouch: true,
    locale: 'ar-EG', timezoneId: 'Africa/Cairo', geolocation: { latitude: 30.0444, longitude: 31.2357 }, permissions: ['geolocation'],
    recordVideo: { dir: OUT, size: { width: 720, height: 1560 } },
  });
  await ctx.addInitScript(() => { const z = () => { document.documentElement.style.zoom = '2'; }; if (document.documentElement) z(); document.addEventListener('DOMContentLoaded', z); });
  const page = await ctx.newPage();
  const t0 = Date.now();
  // تحميل أولي وتسخين المحتوى (لا يدخل في الفيديو النهائي)
  await page.goto(`${SITE}#/home`, { waitUntil: 'networkidle' }).catch(() => {});
  for (const s of scenes) { await page.goto(`${SITE}#/${s.route}`).catch(() => {}); await page.waitForTimeout(1800); }
  await page.goto(`${SITE}#/home`); await page.waitForTimeout(1500);
  const timeline = [];
  for (const s of scenes) {
    if (s.theme) await page.evaluate((t) => { const N = window.Noor; N.settings.theme = t; N.saveSettings(); N.applyTheme(); }, s.theme);
    await page.evaluate(() => { const el = document.getElementById('vcap'); if (el) el.style.opacity = '0'; });
    await page.waitForTimeout(300);
    await page.evaluate((r) => { location.hash = '#/' + r; }, s.route);
    await page.waitForTimeout(900);
    await page.evaluate((cap) => {
      window.scrollTo(0, 0);
      let el = document.getElementById('vcap');
      if (!el) {
        el = document.createElement('div'); el.id = 'vcap';
        el.style.cssText = 'position:fixed;left:14px;right:14px;bottom:96px;z-index:99999;padding:14px 16px;border-radius:16px;background:rgba(10,30,22,.88);color:#fff;font:700 21px Tajawal,sans-serif;text-align:center;line-height:1.6;box-shadow:0 8px 24px rgba(0,0,0,.35);border:1px solid rgba(200,170,90,.6);transition:opacity .35s';
        document.body.appendChild(el);
      }
      el.style.opacity = '0'; el.textContent = cap; requestAnimationFrame(() => { el.style.opacity = '1'; });
    }, s.cap);
    const start = (Date.now() - t0) / 1000;
    const ms = Math.round((dur[s.id] + 0.8) * 1000);
    // تمرير هادئ خلال مدة المشهد
    await page.evaluate(([px, t]) => new Promise((res) => {
      if (!px) { setTimeout(res, t); return; }
      const st = performance.now(); const wait = 1200; const len = Math.max(800, t - wait - 600);
      const step = (now) => { const k = Math.min(1, Math.max(0, (now - st - wait) / len)); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; window.scrollTo(0, px * e); if (now - st < t) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    }), [s.scroll, ms]);
    timeline.push({ id: s.id, start, dur: ms / 1000 });
  }
  await page.waitForTimeout(600);
  const vpath = await page.video().path();
  await ctx.close(); await browser.close();
  fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify({ video: vpath, scenes: timeline }, null, 1));
  console.log('recorded', vpath);
})();
