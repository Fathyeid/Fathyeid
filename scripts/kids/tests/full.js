// الاختبار الشامل لموسوعة الطفل: كل الصفحات وكل المواد × ٣ مقاسات × ٣ مظاهر، مع فحص الأخطاء والتمدد الأفقي والروابط الداخلية
const { chromium } = require('playwright');
const B = 'http://localhost:8099/'; const OUT = (process.argv[2] || require('os').tmpdir());
const SIZES = { phone: { width: 360, height: 780 }, tablet: { width: 820, height: 1180 }, desktop: { width: 1366, height: 900 } };
const THEMES = ['light', 'dark', 'brown'];
(async () => {
  const b = await chromium.launch();
  const I = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..') + '/' + 'data/kids/index.json', 'utf8'));
  const routes = ['kids', 'kidssearch', 'kidsbadges', 'kidsgames', 'kidsgames/ayat', 'kidsgames/ayat/1', 'kidsweek', 'kidsjourney', 'kidsteacher', 'kidsparent',
    ...I.cats.map((c) => 'kidscat/' + c.id)];
  const items = I.items.map((x) => `kidsitem/${x.c}/${x.id}`);
  const problems = []; let pages = 0; const t0 = Date.now();
  for (const [sz, vp] of Object.entries(SIZES)) for (const th of THEMES) {
    const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/Failed to load|ERR_|404/.test(m.text()) && errs.push(m.text()));
    await p.route(/supabase\.co|fonts\.g/, (r) => r.fulfill({ status: 204, body: '' }));
    await p.addInitScript((th) => { localStorage.setItem('noor:settings', JSON.stringify({ theme: th })); localStorage.setItem('noor:kd:profiles', JSON.stringify([{ id: 'k1', name: 'آدم', age: 9, avatar: '🦊' }])); localStorage.setItem('noor:kd:active', '"k1"'); }, th);
    // كل المواد على الهاتف بكل مظهر؛ وعيّنة على المقاسات الأكبر لتوفير الوقت
    const list = [...routes, ...(sz === 'phone' ? items : items.filter((_, i) => i % 6 === 0))];
    for (const r of list) {
      errs.length = 0;
      await p.goto(B + '#/' + r); 
      try { await p.waitForFunction(() => document.querySelector('#view .kd') && !document.querySelector('#view .loader'), null, { timeout: 8000 }); } catch { problems.push(`${sz}/${th} ${r}: لم تُعرض`); continue; }
      await p.waitForTimeout(r.startsWith('kidsitem') ? 250 : 120);
      pages++;
      const info = await p.evaluate(() => {
        const sw = document.documentElement.scrollWidth, w = window.innerWidth;
        const wide = [...document.querySelectorAll('#view .kd *')].filter((e) => { const rc = e.getBoundingClientRect(); return rc.width && (rc.right > w + 2 || rc.left < -2) && !e.closest('.kd-map-wrap, .kd-row'); }).slice(0, 2).map((e) => e.className || e.tagName);
        const bg = getComputedStyle(document.body).backgroundColor; const fg = getComputedStyle(document.querySelector('#view .kd')).color;
        const bad = [...document.querySelectorAll('#view [data-go]')].map((e) => e.dataset.go).filter((g) => !/^(kids\w*)(\/|$)/.test(g));
        const empty = [...document.querySelectorAll('#view button')].filter((e) => !e.textContent.trim() && !e.querySelector('svg,img') && e.offsetParent).length;
        return { over: sw > w + 1, wide, bg, fg, bad, empty, theme: document.documentElement.dataset.theme };
      });
      if (info.over) problems.push(`${sz}/${th} ${r}: تمدد أفقي ${JSON.stringify(info.wide)}`);
      if (info.bad.length) problems.push(`${sz}/${th} ${r}: روابط غير معروفة ${info.bad}`);
      if (info.empty) problems.push(`${sz}/${th} ${r}: أزرار فارغة ${info.empty}`);
      if (info.bg === info.fg) problems.push(`${sz}/${th} ${r}: لون النص = الخلفية`);
      if (errs.length) problems.push(`${sz}/${th} ${r}: أخطاء ${errs.slice(0, 2)}`);
    }
    for (const r of ['kids', 'kidsitem/seerah/sr-timeline', 'kidsteacher', 'kidsgames']) { await p.goto(B + '#/' + r); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/${sz}-${th}-${r.replace(/\//g, '_')}.png` }); }
    await ctx.close();
  }
  console.log('pages checked:', pages, '| seconds:', Math.round((Date.now() - t0) / 1000));
  console.log('problems:', problems.length); problems.slice(0, 40).forEach((x) => console.log(' -', x));
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
