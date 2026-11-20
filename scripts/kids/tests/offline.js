const { chromium } = require('playwright');
const B = 'http://localhost:8099/';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('noor:kd:profiles', JSON.stringify([{ id: 'k1', name: 'آدم', age: 9, avatar: '🦊' }])); localStorage.setItem('noor:kd:active', '"k1"'); });
  await p.goto(B); await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 30000 }).catch(() => {});
  if (!(await p.evaluate(() => !!navigator.serviceWorker.controller))) { await p.reload(); await p.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000 }); }
  await p.waitForTimeout(3000);
  const cached = await p.evaluate(async () => { const k = (await caches.keys()).find((x) => /^noor-v/.test(x)); const c = await caches.open(k); return { k, kids: (await c.keys()).map((r) => r.url).filter((u) => /kids/.test(u)).length }; });
  console.log('1 SW cache', cached.k, '| kids files cached:', cached.kids);
  await ctx.setOffline(true);
  const I = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', '..', '..') + '/' + 'data/kids/index.json', 'utf8'));
  const pick = I.cats.map((c) => I.items.find((x) => x.c === c.id)).filter(Boolean);
  const routes = ['kids', 'kidsgames', 'kidsgames/ayat/112', 'kidsteacher', 'kidsjourney', 'kidsweek', 'kidssearch', 'kidsitem/geo/ge-map', ...pick.map((x) => `kidsitem/${x.c}/${x.id}`)];
  let ok = 0; const bad = [];
  for (const r of routes) { await p.goto(B + '#/' + r); try { await p.waitForFunction(() => document.querySelector('#view .kd') && !document.querySelector('#view .loader') && !document.querySelector('#view').textContent.includes('تعذّر'), null, { timeout: 6000 }); ok++; } catch { bad.push(r); } }
  const mapOk = await (async () => { await p.goto(B + '#/kidsitem/geo/ge-map'); try { await p.waitForSelector('#mSvg path', { timeout: 6000 }); return true; } catch { return false; } })();
  const wordOk = await (async () => { await p.goto(B + '#/kidsitem/ibadat/ib-wudu'); try { await p.waitForSelector('.kd-w', { timeout: 6000 }); return true; } catch { return false; } })();
  console.log('2 offline pages ok:', ok, '/', routes.length, bad.length ? bad : '', '| map offline:', mapOk, '| dictionary offline:', wordOk);
  console.log('3 errors:', errs.length ? errs : 'none');
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
