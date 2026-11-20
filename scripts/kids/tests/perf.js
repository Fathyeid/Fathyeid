const { chromium } = require('playwright');
const B = 'http://localhost:8099/';
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 360, height: 780 } }); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 }); // شبكة 3G سريعة
  await p.route(/supabase\.co|fonts\.g/, (r) => r.fulfill({ status: 204, body: '' }));
  await p.addInitScript(() => { localStorage.setItem('noor:kd:profiles', JSON.stringify([{ id: 'k1', name: 'آدم', age: 9, avatar: '🦊' }])); localStorage.setItem('noor:kd:active', '"k1"'); });
  await p.goto(B); await p.waitForTimeout(1500);
  const time = async (r, sel) => { const t = Date.now(); await p.evaluate((r) => { location.hash = '#/' + r; }, r); await p.waitForSelector(sel, { timeout: 30000 }); return Date.now() - t; };
  const res = {};
  res['home (first)'] = await time('kids', '.kd-cats');
  await p.goto(B + '#/home'); await p.waitForTimeout(500);
  res['home (again)'] = await time('kids', '.kd-cats');
  res['category'] = await time('kidscat/science', '.kd-item');
  res['lesson'] = await time('kidsitem/science/sc-planets', '.kd-body');
  res['map lesson'] = await time('kidsitem/geo/ge-map', '#mSvg path');
  res['teacher'] = await time('kidsteacher', '#tD');
  res['games hub'] = await time('kidsgames', '.kd-list .kd-item');
  console.log('ms (CPU×4, 3G):', JSON.stringify(res));
  const fs = require('fs'); const sz = (f) => fs.statSync(require('path').join(__dirname, '..', '..', '..') + '/' + '' + f).size;
  const data = fs.readdirSync(require('path').join(__dirname, '..', '..', '..') + '/' + 'data/kids').reduce((s, f) => s + sz('data/kids/' + f), 0);
  console.log('sizes KB: kids.js', Math.round(sz('js/kids.js') / 1024), '| index.json', Math.round(sz('data/kids/index.json') / 1024), '| all kids data', Math.round(data / 1024), '| world.json', Math.round(sz('data/kids/world.json') / 1024));
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
