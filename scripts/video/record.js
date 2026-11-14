// يسجّل جولة في التطبيق (بحجم شاشة هاتف وبدقة 1080×2340) حسب scenes.json ومدد التعليق الصوتي في durations.json
// الاستخدام: node record.js <siteUrl> <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const W = 1080; const H = 2340; const ZOOM = 3; // 360×780 بكسل منطقي = تخطيط هاتف، مكبَّر ×3 للدقة
(async () => {
  const [, , SITE, OUT] = process.argv;
  const scenes = JSON.parse(fs.readFileSync(path.join(__dirname, 'scenes.json'), 'utf8'));
  const dur = JSON.parse(fs.readFileSync(path.join(OUT, 'durations.json'), 'utf8'));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true,
    locale: 'ar-EG', timezoneId: 'Africa/Cairo', geolocation: { latitude: 30.0444, longitude: 31.2357 }, permissions: ['geolocation'],
    recordVideo: { dir: OUT, size: { width: W, height: H } },
  });
  await ctx.addInitScript((z) => {
    // مظهر «أسمر» من البداية
    try { const k = 'noor:settings'; const s = JSON.parse(localStorage.getItem(k) || '{}'); if (s.theme !== 'brown') { s.theme = 'brown'; localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem('noor:themeChosen', 'true'); } } catch (e) { /* */ }
    const f = () => { document.documentElement.style.zoom = String(z); };
    if (document.documentElement) f(); document.addEventListener('DOMContentLoaded', f);
  }, ZOOM);
  const page = await ctx.newPage();
  const t0 = Date.now();
  const brown = () => page.evaluate(() => { const N = window.Noor; if (N && N.settings.theme !== 'brown') { N.settings.theme = 'brown'; N.saveSettings(); N.applyTheme(); } }).catch(() => {});
  // تحميل أولي وتسخين المحتوى (يُقصّ من الفيديو النهائي)
  await page.goto(`${SITE}#/home`, { waitUntil: 'networkidle' }).catch(() => {});
  await brown();
  for (const s of scenes) { await page.evaluate((r) => { location.hash = '#/' + r; }, s.route).catch(() => {}); await page.waitForTimeout(2200); }
  await page.evaluate(() => { localStorage.removeItem('noor:calc:hist'); }).catch(() => {});
  await page.evaluate(() => { location.hash = '#/home'; }); await page.waitForTimeout(2000);
  await brown();
  const timeline = [];
  for (const s of scenes) {
    await page.evaluate(() => {
      const el = document.getElementById('vcap'); if (el) el.style.opacity = '0';
      document.querySelectorAll('.sheet-backdrop').forEach((b) => b.remove());
    });
    await page.waitForTimeout(300);
    await page.evaluate((r) => { if (location.hash === '#/' + r) { window.dispatchEvent(new HashChangeEvent('hashchange')); } else location.hash = '#/' + r; }, s.route);
    await page.waitForTimeout(1000);
    await page.evaluate(([cap, top]) => {
      window.scrollTo(0, 0);
      let el = document.getElementById('vcap');
      if (!el) {
        el = document.createElement('div'); el.id = 'vcap';
        el.style.cssText = 'position:fixed;left:12px;right:12px;bottom:92px;z-index:99999;padding:12px 14px;border-radius:16px;background:rgba(6,14,10,.9);color:#e8f5e0;font:700 19px Tajawal,sans-serif;text-align:center;line-height:1.6;box-shadow:0 8px 24px rgba(0,0,0,.5);border:1px solid rgba(143,220,118,.55);transition:opacity .35s';
        document.body.appendChild(el);
      }
      el.style.top = top ? '64px' : 'auto'; el.style.bottom = top ? 'auto' : '92px';
      el.style.opacity = '0'; el.textContent = cap; requestAnimationFrame(() => { el.style.opacity = '1'; });
    }, [s.cap, s.capTop || false]);
    const start = (Date.now() - t0) / 1000;
    const total = Math.round((dur[s.id] + 0.9) * 1000);
    const a0 = Date.now();
    for (const a of s.actions || []) {
      try {
        if (a.fill) await page.fill(a.fill[0], a.fill[1], { timeout: 3000 });
        if (a.click) { for (let i = 0; i < (a.times || 1); i++) { await page.click(a.click, { timeout: 3000 }); if (a.gap) await page.waitForTimeout(a.gap); } }
      } catch (e) { console.log('action failed', s.id, JSON.stringify(a), String(e).slice(0, 120)); }
      if (a.wait) await page.waitForTimeout(a.wait);
    }
    const left = Math.max(1500, total - (Date.now() - a0));
    // التمرير إلى عنصر بعينه (مثل نتائج الحاسبة) ثم الثبات عليه
    if (s.scrollEl) {
      await page.waitForTimeout(700);
      await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, s.scrollEl);
      await page.waitForTimeout(Math.max(800, left - 700));
      timeline.push({ id: s.id, start, dur: (Date.now() - t0) / 1000 - start });
      continue;
    }
    // تمرير هادئ خلال باقي مدة المشهد
    await page.evaluate(([px, t]) => new Promise((res) => {
      const y0 = window.scrollY;
      if (!px) { setTimeout(res, t); return; }
      const st = performance.now(); const wait = 900; const len = Math.max(900, t - wait - 700);
      const step = (now) => { const k = Math.min(1, Math.max(0, (now - st - wait) / len)); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; window.scrollTo(0, y0 + (px - y0) * e); if (now - st < t) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    }), [s.scroll, left]);
    timeline.push({ id: s.id, start, dur: (Date.now() - t0) / 1000 - start });
  }
  await page.waitForTimeout(700);
  const vpath = await page.video().path();
  await ctx.close(); await browser.close();
  fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify({ video: vpath, scenes: timeline }, null, 1));
  console.log('recorded', vpath);
})();
