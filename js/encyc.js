/* الموسوعات الإسلامية: المساجد، العلماء، التاريخ الإسلامي (مع خط زمني)، اليوم الآخر، وبوابة الأكاديمية.
 * - مقدمات المقالات محفوظة داخل التطبيق (data/enc-wiki.json من ويكيبيديا العربية — CC BY-SA 4.0) وتعمل بلا إنترنت.
 * - المقال الكامل يُجلب من ويكيبيديا عند الطلب ويُحفظ على الجهاز بعد أول قراءة.
 * - اليوم الآخر وآداب المساجد: آيات من المصحف وأحاديث صحيحة بتخريجها وروابط لأبواب الصحيحين داخل التطبيق. */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const E = window.ENC;
  if (!E) return;
  const { $, $$, store, toast, go, ar, esc, routes } = N;
  const CACHE = 'noor-data-v1';
  const WIKI_API = 'https://ar.wikipedia.org/w/api.php';
  let WIKI = null;
  async function wiki() {
    if (WIKI) return WIKI;
    const r = await fetch('data/enc-wiki.json');
    WIKI = await r.json();
    return WIKI;
  }
  const loader = () => { N.view.innerHTML = '<div class="loader"></div>'; };
  const normAr = (t) => String(t || '').replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  const yearLbl = (h) => { const hj = h[2] ? (h[2] < 0 ? `${ar(-h[2])} قبل الهجرة` : `${ar(h[2])} هـ`) : ''; const g = h[4] ? `${ar(h[3])}–${ar(h[4])} م` : `${ar(h[3])} م`; return `${hj ? hj + ' / ' : ''}${g}${h[5] ? ' (تقريباً)' : ''}`; };
  const HTYPE = Object.fromEntries(E.history.map((h) => [h[0], h]));
  const SCAT = {}; Object.entries(E.scholars).forEach(([c, l]) => l.forEach((n) => { SCAT[n] = c; }));
  const MPLACE = Object.fromEntries(E.mosques.map(([n, p]) => [n, p]));
  const kindOf = (k) => (MPLACE[k] ? 'm' : SCAT[k] ? 's' : 'h');
  const readList = () => store.get('enc:read', []);
  const favs = () => store.get('enc:fav', []);

  // ---------- بطاقة مقال ----------
  function artCard(k, W, sub) {
    const p = W.pages[k];
    if (!p) return '';
    return `<button class="enc-card" data-a="${esc(k)}">
      <span class="enc-img">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith('🏛️')">` : '<span>🕌</span>'}</span>
      <span class="enc-info"><b>${esc(k)}</b><small>${esc(sub || '')}</small><span>${esc(p.intro.slice(0, 110))}…</span></span>
    </button>`;
  }
  const bindCards = (root) => $$('[data-a]', root).forEach((b) => { b.onclick = () => go(`encw/${encodeURIComponent(b.dataset.a)}`); });

  // ---------- الصفحة الرئيسية للموسوعات ----------
  function renderHub() {
    const last = readList().slice(0, 4);
    N.view.innerHTML = `
      <form class="az-search" id="encS"><input id="encQ" type="search" placeholder="ابحث: مسجد، عالم، معركة، دولة، موضوع…" autocomplete="off"><button class="btn">بحث</button></form>
      <div class="enc-hub">
        <button data-go="encm"><span>🕌</span><b>موسوعة المساجد</b><small>${ar(E.mosques.length)} مسجداً تاريخياً وآداب المساجد</small></button>
        <button data-go="academy"><span>🎓</span><b>أكاديمية العلوم الشرعية</b><small>مسارات بمستويات واختبارات وشهادات</small></button>
        <button data-go="encs"><span>📚</span><b>موسوعة العلماء</b><small>${ar(Object.values(E.scholars).flat().length)} عالماً في ${ar(E.scholarCats.length)} تخصصات</small></button>
        <button data-go="ench"><span>🏛️</span><b>التاريخ الإسلامي</b><small>خط زمني و${ar(E.history.length)} حدثاً ودولة ومعركة</small></button>
        <button data-go="enca"><span>⏳</span><b>موسوعة اليوم الآخر</b><small>من القرآن والأحاديث الصحيحة</small></button>
        <button data-go="encme"><span>⭐</span><b>متابعتي</b><small>آخر ما قرأت والمحفوظات والتقدّم</small></button>
      </div>
      ${last.length ? `<h3 class="dash-sec">📌 آخر ما قرأت</h3><div class="chips" style="justify-content:flex-start">${last.map((k) => `<button class="chip" data-a="${esc(k)}">${esc(k)}</button>`).join('')}</div>` : ''}
      <p class="muted enc-note">مقالات المساجد والعلماء والتاريخ من <b>ويكيبيديا العربية</b> (ترخيص CC BY-SA)، ويُذكر المصدر وتاريخ آخر تحديث في كل مقال. وهي مقالات يحررها متطوعون، فالمسائل الشرعية تؤخذ من القرآن والسنة وأهل العلم.</p>`;
    $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); });
    bindCards(N.view);
    $('#encS').onsubmit = (e) => { e.preventDefault(); const q = $('#encQ').value.trim(); if (q.length < 2) { toast('اكتب كلمتين على الأقل'); return; } go(`encq/${encodeURIComponent(q)}`); };
  }

  // ---------- المساجد ----------
  function renderMosques() {
    loader();
    wiki().then((W) => {
      if (!location.hash.startsWith('#/encm')) return;
      N.view.innerHTML = `
        <button class="card continue enc-adab" data-go="encma" style="width:100%"><div><small class="muted">🧎 آداب وأحكام المساجد</small><br><b>أحاديث صحيحة بتخريجها</b></div><span class="btn">فتح</span></button>
        ${E.mosques.map(([k, place]) => artCard(k, W, '📍 ' + place)).join('')}
        <button class="btn ghost block" data-go="dtopic/seerah">🎬 محاضرات السيرة والتاريخ في المكتبة الدعوية</button>`;
      bindCards(N.view);
      $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); });
    }).catch(() => { N.view.innerHTML = '<div class="card center">تعذّر تحميل البيانات</div>'; });
  }
  function renderAdab() {
    N.view.innerHTML = `
      <div class="card"><h3>🕌 دعاء دخول المسجد والخروج منه</h3><p class="muted" style="margin:0 0 8px">من «حصن المسلم» بتخريجه، مع العدّاد والصوت.</p><button class="btn block" data-go="azcat/azkar/masjid">فتح أذكار المسجد والأذان</button></div>
      ${E.masjidAdab.map(([t, txt, src, hukm]) => `<div class="card"><h3>${esc(t)}</h3><p class="hadith-text" style="font-size:1.15rem">${esc(txt)}</p><div class="ref">${esc(src)}</div><p class="enc-hukm">⚖️ ${esc(hukm)}</p></div>`).join('')}
      <div class="card"><h3>📜 أبواب الأحاديث كاملة</h3>${E.masjidBooks.map(([b, n, t]) => `<button class="btn ghost block" style="margin-bottom:6px" data-go="hsec/${b}/${n}">${esc(t)}</button>`).join('')}</div>
      <p class="muted enc-note">«الحكم» المذكور تلخيص لما عليه جمهور العلماء أو بيان لوجود خلاف، وتفاصيل الأحكام في مسار الفقه بالأكاديمية.</p>`;
    $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); });
  }

  // ---------- العلماء ----------
  function renderScholars(cat) {
    loader();
    wiki().then((W) => {
      if (!location.hash.startsWith('#/encs')) return;
      const c = cat && E.scholars[cat] ? cat : E.scholarCats[0][0];
      N.view.innerHTML = `
        <div class="chips enc-tabs">${E.scholarCats.map(([k, t, ic]) => `<button class="chip ${k === c ? 'active' : ''}" data-c="${k}">${ic} ${t}</button>`).join('')}</div>
        ${E.scholars[c].map((k) => artCard(k, W, (E.scholarCats.find((x) => x[0] === c) || [])[1])).join('')}`;
      bindCards(N.view);
      $$('[data-c]', N.view).forEach((b) => { b.onclick = () => go(`encs/${b.dataset.c}`); });
    });
  }

  // ---------- التاريخ ----------
  function renderHistory(type) {
    loader();
    wiki().then((W) => {
      if (!location.hash.startsWith('#/ench')) return;
      const t = type || 'timeline';
      const tabs = [['timeline', 'الخط الزمني', '🗓️'], ...Object.entries(E.historyTypes).map(([k, [n, ic]]) => [k, n, ic])];
      const list = t === 'timeline' ? E.history.slice().sort((a, b) => a[3] - b[3]) : E.history.filter((h) => h[1] === t);
      N.view.innerHTML = `
        <div class="chips enc-tabs">${tabs.map(([k, n, ic]) => `<button class="chip ${k === t ? 'active' : ''}" data-t="${k}">${ic} ${n}</button>`).join('')}</div>
        ${t === 'timeline' ? `<div class="enc-tl">${list.filter((h) => W.pages[h[0]]).map((h) => `<button class="enc-tl-i" data-a="${esc(h[0])}"><span class="enc-tl-y">${yearLbl(h)}</span><b>${E.historyTypes[h[1]][1]} ${esc(h[0])}</b></button>`).join('')}</div>`
          : list.map((h) => artCard(h[0], W, '🗓️ ' + yearLbl(h))).join('')}
        <p class="muted enc-note">التواريخ المعلَّمة «تقريباً» يختلف فيها المؤرخون أو تمتد على فترة؛ وتفاصيل الروايات ومواضع الخلاف في كل مقال ومراجعه.</p>
        <button class="btn ghost block" data-go="dtopic/seerah">🎬 محاضرات السيرة في المكتبة الدعوية</button>`;
      bindCards(N.view);
      $$('[data-t]', N.view).forEach((b) => { b.onclick = () => go(`ench/${b.dataset.t}`); });
      $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); });
    });
  }

  // ---------- اليوم الآخر ----------
  function renderAkhirah() {
    N.view.innerHTML = `
      <div class="card"><p class="ayah-text" style="font-size:1.35rem">﴿${esc(E.ayat['3:185-185'].t)}﴾</p><div class="ref">آل عمران: ١٨٥</div></div>
      <div class="enc-hub">${E.akhirah.map((x) => `<button data-k="${x.k}"><span>${x.ic}</span><b>${x.t}</b><small>${ar(x.q.length)} آية/مقطع • ${ar(x.h.length)} باب حديث</small></button>`).join('')}</div>
      <button class="btn ghost block" data-go="dtopic/akhirah">🎬 محاضرات عن الآخرة في المكتبة الدعوية</button>
      <p class="muted enc-note">هذه الموسوعة تعتمد على نص القرآن الكريم وأبواب الصحيحين فقط، دون قصص غير ثابتة أو تفاصيل غيبية لم ترد بها النصوص.</p>`;
    $$('[data-k]', N.view).forEach((b) => { b.onclick = () => go(`encak/${b.dataset.k}`); });
    $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); });
  }
  function renderAkhTopic(k) {
    const x = E.akhirah.find((a) => a.k === k);
    if (!x) { go('enca'); return; }
    N.setTitle(x.t);
    N.view.innerHTML = `
      ${x.q.length ? `<h3 class="dash-sec">📖 من القرآن الكريم</h3>${x.q.map(([s, a, b]) => { const y = E.ayat[`${s}:${a}-${b}`]; return y ? `<div class="card"><p class="ayah-text" style="font-size:1.3rem">﴿${esc(y.t)}﴾</p><div class="ref">${esc(y.n)} • ${a === b ? `الآية ${ar(a)}` : `الآيات ${ar(a)}–${ar(b)}`}</div><button class="btn ghost block" style="margin-top:8px" data-go="surah/${s}/${a}">فتح في المصحف مع التفسير</button></div>` : ''; }).join('')}` : ''}
      <h3 class="dash-sec">📜 من الأحاديث الصحيحة</h3>
      <div class="card">${x.h.map(([b, n, t]) => `<button class="btn ghost block" style="margin-bottom:6px" data-go="hsec/${b}/${n}">${esc(t)}</button>`).join('')}<p class="muted" style="font-size:.82rem;margin:6px 0 0">تُفتح الأبواب كاملة من مكتبة الحديث داخل التطبيق، مع رقم كل حديث.</p></div>
      ${x.az.length ? `<h3 class="dash-sec">🤲 ذو صلة</h3><div class="card">${x.az.map(([r, t]) => `<button class="btn ghost block" style="margin-bottom:6px" data-go="${r}">${esc(t)}</button>`).join('')}</div>` : ''}`;
    $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); });
  }

  // ---------- قارئ المقال ----------
  async function fullArticle(title) {
    const url = `${WIKI_API}?action=query&format=json&formatversion=2&origin=*&prop=extracts|info&explaintext=1&exsectionformat=wiki&titles=${encodeURIComponent(title)}`;
    let c = null;
    try { c = await caches.open(CACHE); const hit = await c.match(url); if (hit && !navigator.onLine) return (await hit.json()); } catch { /* */ }
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      if (c) try { await c.put(url, r.clone()); } catch { /* */ }
      return await r.json();
    } catch (e) {
      if (c) { const hit = await c.match(url); if (hit) return hit.json(); }
      throw e;
    }
  }
  const SKIP = /^(المراجع|مراجع|الهوامش|هوامش|انظر أيضا|انظر أيضًا|وصلات خارجية|روابط خارجية|المصادر|مصادر|ملاحظات|قراءات إضافية|معرض صور|معرض الصور|ببليوغرافيا)$/;
  function renderText(txt) {
    const out = []; let skip = false;
    txt.split('\n').forEach((line) => {
      const l = line.trim(); if (!l) return;
      const m = /^(=+)\s*(.*?)\s*=+$/.exec(l);
      if (m) { skip = SKIP.test(m[2]); if (!skip) out.push(`<h${m[1].length <= 2 ? 3 : 4} class="enc-h">${esc(m[2])}</h${m[1].length <= 2 ? 3 : 4}>`); return; }
      if (!skip) out.push(`<p>${esc(l)}</p>`);
    });
    return out.join('');
  }
  function renderArticle(kEnc) {
    const k = decodeURIComponent(kEnc || '');
    loader();
    wiki().then((W) => {
      const p = W.pages[k];
      if (!p) { N.view.innerHTML = '<div class="card center">المقال غير متوفر</div>'; return; }
      N.setTitle(k);
      const R = readList().filter((x) => x !== k); R.unshift(k); store.set('enc:read', R.slice(0, 40));
      const kind = kindOf(k);
      routes.encw.back = kind === 'm' ? 'encm' : kind === 's' ? `encs/${SCAT[k]}` : 'ench';
      const h = HTYPE[k];
      const isFav = () => favs().includes(k);
      const fs = store.get('enc:fs', 1);
      const wikiUrl = `https://ar.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`;
      N.view.innerHTML = `
        ${p.img ? `<div class="enc-hero"><img src="${esc(p.img)}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></div>` : ''}
        <h2 class="enc-title">${esc(k)}</h2>
        <div class="enc-meta">${MPLACE[k] ? `📍 ${esc(MPLACE[k])}` : ''}${h ? `🗓️ ${yearLbl(h)}` : ''}${SCAT[k] ? `📚 ${esc((E.scholarCats.find((c) => c[0] === SCAT[k]) || [])[1])}` : ''}</div>
        <div class="enc-tools"><button class="chip" id="eFav">${isFav() ? '★ محفوظ' : '☆ حفظ'}</button><button class="chip" id="eFsM">أ−</button><button class="chip" id="eFsP">أ+</button>${p.geo ? `<a class="chip" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${p.geo[0]}&mlon=${p.geo[1]}#map=17/${p.geo[0]}/${p.geo[1]}">🗺️ الخريطة</a>` : ''}<button class="chip" id="eShare">↗ مشاركة</button></div>
        <article class="enc-body" id="eBody" style="--encfs:${fs}">${renderText(p.intro)}</article>
        <button class="btn block" id="eFull">📖 قراءة المقال كاملاً</button>
        <div class="enc-src">المصدر: ويكيبيديا العربية — مقال «<a href="${wikiUrl}" target="_blank" rel="noopener">${esc(p.title)}</a>»${p.touched ? ` — آخر تحديث للمقال: ${N.toAr(p.touched.slice(0, 10))}` : ''} — النص متاح بترخيص <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ar" target="_blank" rel="noopener">CC BY-SA 4.0</a>. المراجع والروايات المختلفة مذكورة في المقال الأصلي.</div>`;
      const body = $('#eBody');
      $('#eFav').onclick = () => { const F = favs(); const i = F.indexOf(k); if (i < 0) F.unshift(k); else F.splice(i, 1); store.set('enc:fav', F); $('#eFav').textContent = i < 0 ? '★ محفوظ' : '☆ حفظ'; };
      const setFs = (d) => { const v = Math.max(0.8, Math.min(1.8, +(store.get('enc:fs', 1) + d).toFixed(2))); store.set('enc:fs', v); body.style.setProperty('--encfs', v); };
      $('#eFsM').onclick = () => setFs(-0.1); $('#eFsP').onclick = () => setFs(0.1);
      $('#eShare').onclick = () => N.shareText(`${k}\n${p.intro.slice(0, 300)}…\n\nالمصدر: ويكيبيديا — ${wikiUrl}\nمن تطبيق أثر - رفيق المسلم`);
      $('#eFull').onclick = async () => {
        const b = $('#eFull'); b.disabled = true; b.textContent = 'جارٍ التحميل…';
        try {
          const d = await fullArticle(p.title);
          const pg = d.query && d.query.pages && d.query.pages[0];
          if (!pg || !pg.extract) throw new Error('empty');
          body.innerHTML = renderText(pg.extract);
          b.remove();
          const done = store.get('enc:full', []); if (!done.includes(k)) { done.unshift(k); store.set('enc:full', done.slice(0, 200)); }
        } catch { b.disabled = false; b.textContent = '📖 قراءة المقال كاملاً'; toast('تعذّر التحميل — المقال الكامل يحتاج إنترنت أول مرة، ثم يُحفظ على جهازك'); }
      };
      if (store.get('enc:full', []).includes(k)) $('#eFull').click();
    });
  }

  // ---------- البحث الموحّد ----------
  function renderSearch(qEnc) {
    const q = decodeURIComponent(qEnc || '');
    loader();
    wiki().then((W) => {
      const words = normAr(q).split(/\s+/).filter((w) => w.length > 1);
      const hit = (s) => words.every((w) => normAr(s).includes(w));
      const arts = Object.entries(W.pages).filter(([k, p]) => (MPLACE[k] || SCAT[k] || HTYPE[k]) && hit(k + ' ' + p.title + ' ' + p.intro)).map(([k]) => k);
      const groups = [['🕌 المساجد', arts.filter((k) => kindOf(k) === 'm')], ['📚 العلماء', arts.filter((k) => kindOf(k) === 's')], ['🏛️ التاريخ', arts.filter((k) => kindOf(k) === 'h')]];
      const akh = E.akhirah.filter((x) => hit(x.t + ' ' + x.h.map((h) => h[2]).join(' ')));
      const acad = (typeof ACADEMY !== 'undefined' ? ACADEMY : []).flatMap((t) => (t.levels || []).flatMap((l, li) => (l.lessons || []).filter((s) => hit(s + ' ' + t.title)).map((s) => [t.id, li, s, t.title])));
      const total = arts.length + akh.length + acad.length;
      N.view.innerHTML = `
        <form class="az-search" id="encS2"><input id="encQ2" type="search" value="${esc(q)}"><button class="btn">بحث</button></form>
        <p class="muted">${ar(total)} نتيجة لـ «${esc(q)}»</p>
        ${groups.filter((g) => g[1].length).map(([t, l]) => `<h3 class="dash-sec">${t}</h3>${l.map((k) => artCard(k, W, '')).join('')}`).join('')}
        ${akh.length ? `<h3 class="dash-sec">⏳ اليوم الآخر</h3>${akh.map((x) => `<button class="btn ghost block" style="margin-bottom:6px" data-go="encak/${x.k}">${x.ic} ${x.t}</button>`).join('')}` : ''}
        ${acad.length ? `<h3 class="dash-sec">🎓 دروس الأكاديمية</h3>${acad.slice(0, 30).map(([id, li, s, tt]) => `<button class="btn ghost block" style="margin-bottom:6px" data-go="track/${id}">${esc(s)} <small class="muted">— ${esc(tt)}</small></button>`).join('')}` : ''}
        ${total ? '' : '<div class="card center muted">لا توجد نتائج. جرّب: الأزهر، البخاري، حطين، العباسية، الميزان…</div>'}
        <button class="btn ghost block" data-go="dsearch/${encodeURIComponent(q)}">🎬 ابحث عن «${esc(q)}» في المحاضرات المرئية</button>`;
      bindCards(N.view);
      $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); });
      $('#encS2').onsubmit = (e) => { e.preventDefault(); const v = $('#encQ2').value.trim(); if (v.length >= 2) go(`encq/${encodeURIComponent(v)}`); };
    });
  }

  // ---------- متابعتي ----------
  function renderMine() {
    loader();
    wiki().then((W) => {
      const prog = store.get('academy:progress', null);
      const F = favs().filter((k) => W.pages[k]); const R = readList().filter((k) => W.pages[k]); const full = store.get('enc:full', []);
      N.view.innerHTML = `
        <div class="az-stats card"><div><b>${ar(R.length)}</b><small>مقالاً قرأته</small></div><div><b>${ar(full.length)}</b><small>محفوظ للقراءة بلا إنترنت</small></div><div><b>${ar(F.length)}</b><small>في المحفوظات</small></div></div>
        <button class="btn block" data-go="academy" style="margin-bottom:14px">🎓 تقدّمي في الأكاديمية والشهادات</button>
        ${F.length ? `<h3 class="dash-sec">⭐ المحفوظات</h3>${F.map((k) => artCard(k, W, '')).join('')}` : ''}
        ${R.length ? `<h3 class="dash-sec">🕘 سجل القراءة</h3>${R.slice(0, 15).map((k) => artCard(k, W, '')).join('')}` : '<div class="card center muted">لم تقرأ أي مقال بعد</div>'}
        ${prog ? '' : ''}`;
      bindCards(N.view);
      $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); });
    });
  }

  Object.assign(routes, {
    enc: { title: 'الموسوعات الإسلامية', render: renderHub, back: 'home' },
    encm: { title: 'موسوعة المساجد', render: renderMosques, back: 'enc' },
    encma: { title: 'آداب وأحكام المساجد', render: renderAdab, back: 'encm' },
    encs: { title: 'موسوعة العلماء', render: renderScholars, back: 'enc' },
    ench: { title: 'التاريخ الإسلامي', render: renderHistory, back: 'enc' },
    enca: { title: 'موسوعة اليوم الآخر', render: renderAkhirah, back: 'enc' },
    encak: { title: 'اليوم الآخر', render: renderAkhTopic, back: 'enca' },
    encw: { title: 'المقال', render: renderArticle, back: 'enc' },
    encq: { title: 'البحث في الموسوعات', render: renderSearch, back: 'enc' },
    encme: { title: 'متابعتي', render: renderMine, back: 'enc' },
  });
});
