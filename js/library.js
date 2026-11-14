/* المكتبة الموحّدة: كتب وصوتيات ومرئيات من IslamHouse (دار الإسلام — مواد مجانية النشر مع ذكر المصدر)،
 * مصنّفة حسب أقسام الموسوعات والأكاديمية. فهرس محلي للبحث (data/lib-index.json) وتفاصيل المادة تُجلب عند فتحها.
 * - قارئ PDF داخل التطبيق (pdf.js مضمّن) مع حفظ آخر صفحة والعلامات والملاحظات والبحث في النص والحفظ دون إنترنت.
 * - الصوتيات عبر مشغّل المكتبة الصوتية (الخلفية، السرعة، مؤقت النوم، الاستكمال، التحميل).
 * - المرئيات بمشغّل فيديو مدمج مع السرعة والاستكمال من آخر نقطة. */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, arG, esc, routes } = N;
  const API = 'https://api3.islamhouse.com/v3/paV29H2gm56kvLPy';
  const BOOKS = 'noor-books-v1';
  const SECS = [
    ['masajid', 'المساجد', '🕌'], ['ulama', 'العلماء والتراجم', '📚'], ['tarikh', 'التاريخ والسيرة', '🏛️'], ['akhirah', 'اليوم الآخر', '⏳'],
    ['aqeedah', 'العقيدة', '🕋'], ['fiqh', 'الفقه', '⚖️'], ['tafsir', 'التفسير', '📖'], ['hadith', 'علوم الحديث', '📜'],
    ['tajweed', 'التجويد والقراءات', '🎙️'], ['usul', 'أصول الفقه', '🧭'], ['lugha', 'اللغة العربية', '✍️'], ['mutoon', 'المتون العلمية', '📘'],
  ];
  const TYPES = [['', 'الكل'], ['b', '📕 كتب'], ['a', '🎧 صوتيات'], ['v', '🎬 مرئيات']];
  const TNAME = { b: 'كتاب', a: 'صوتي', v: 'مرئي' };
  const TIC = { b: '📕', a: '🎧', v: '🎬' };
  const normAr = (t) => String(t || '').replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  const loader = () => { N.view.innerHTML = '<div class="loader"></div>'; };

  let IDX = null;
  async function index() {
    if (IDX) return IDX;
    const r = await fetch('data/lib-index.json');
    IDX = await r.json();
    IDX.byId = Object.fromEntries(IDX.items.map((x) => [x.id, x]));
    IDX.items.forEach((x) => { x._s = normAr(`${x.t} ${x.au.join(' ')} ${x.d}`); });
    return IDX;
  }
  async function item(id) {
    const k = `lib:item:${id}`;
    const c = store.get(k);
    if (c && Date.now() - c.t < 7 * 864e5) return c.d;
    try {
      const r = await fetch(`${API}/main/get-item/${id}/ar/json`);
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      const slim = { id: d.id, t: d.title, d: d.full_description || d.description || '', img: d.image, au: (d.prepared_by || []).map((p) => ({ n: p.title, k: p.kind || p.type })), at: (d.attachments || []).map((a) => ({ u: a.url, x: (a.extension_type || '').toUpperCase(), s: a.size, n: a.description })) };
      store.set(k, { t: Date.now(), d: slim });
      return slim;
    } catch (e) { if (c) return c.d; throw e; }
  }
  const recent = () => store.get('lib:recent', []);
  function touch(it) { const R = recent().filter((x) => x.id !== it.id); R.unshift({ id: it.id, t: it.t, y: it.y, at: Date.now() }); store.set('lib:recent', R.slice(0, 30)); }
  const favs = () => store.get('lib:fav', []);

  function card(x) {
    return `<button class="lib-card" data-i="${x.id}">
      <span class="lib-ic">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" onerror="this.replaceWith('${TIC[x.y]}')">` : TIC[x.y]}</span>
      <span class="lib-info"><b>${esc(x.t)}</b><small>${TIC[x.y]} ${TNAME[x.y]}${x.au.length ? ' • ' + esc(x.au.join('، ')) : ''}</small>${x.d ? `<span>${esc(x.d)}</span>` : ''}</span>
    </button>`;
  }
  const bindCards = (root) => $$('[data-i]', root).forEach((b) => { b.onclick = () => go(`libi/${b.dataset.i}`); });

  // ---------- الواجهة الرئيسية للمكتبة ----------
  function renderLib(sec, typ) {
    loader();
    index().then((I) => {
      if (!location.hash.startsWith('#/lib')) return;
      sec = SECS.some((s) => s[0] === sec) ? sec : '';
      typ = TYPES.some((t) => t[0] === typ) ? typ : '';
      const counts = (s) => I.items.filter((x) => x.s.includes(s)).length;
      let list = I.items.filter((x) => (!sec || x.s.includes(sec)) && (!typ || x.y === typ));
      const R = recent().filter((x) => I.byId[x.id]).slice(0, 6);
      let shown = 30;
      const draw = () => {
        $('#libList').innerHTML = list.slice(0, shown).map(card).join('') + (list.length > shown ? `<button class="btn ghost block" id="libMore">عرض المزيد (${arG(list.length - shown)})</button>` : '') || '<div class="card center muted">لا توجد مواد في هذا القسم</div>';
        bindCards($('#libList'));
        const m = $('#libMore'); if (m) m.onclick = () => { shown += 30; draw(); };
      };
      N.view.innerHTML = `
        <form class="az-search" id="libS"><input id="libQ" type="search" placeholder="ابحث باسم الكتاب أو المؤلف أو الموضوع…" autocomplete="off"><button class="btn">بحث</button></form>
        ${!sec && R.length ? `<h3 class="dash-sec">▶ أكمل من حيث توقفت</h3><div class="chips" style="justify-content:flex-start">${R.map((x) => `<button class="chip" data-i="${x.id}">${TIC[x.y] || ''} ${esc(x.t.slice(0, 40))}</button>`).join('')}</div>` : ''}
        <div class="chips enc-tabs"><button class="chip ${!sec ? 'active' : ''}" data-s="">📚 الكل (${arG(I.items.length)})</button>${SECS.map(([k, t, ic]) => `<button class="chip ${k === sec ? 'active' : ''}" data-s="${k}">${ic} ${t} (${arG(counts(k))})</button>`).join('')}</div>
        <div class="seg" style="margin-bottom:12px">${TYPES.map(([k, t]) => `<button data-y="${k}" class="${k === typ ? 'active' : ''}">${t}</button>`).join('')}</div>
        <div id="libList"></div>
        <div class="enc-src">المصدر: <b>دار الإسلام (IslamHouse.com)</b> — مواد علمية مجانية النشر، ويُذكر مع كل مادة مؤلفها ومصدرها. آخر تحديث للفهرس: ${N.toAr(I.fetched)}.</div>
        <button class="btn ghost block" data-go="libme">⭐ مكتبتي: المحفوظات والتحميلات</button>`;
      draw();
      bindCards(N.view);
      $$('[data-s]').forEach((b) => { b.onclick = () => go(`lib/${b.dataset.s || 'all'}/${typ}`); });
      $$('[data-y]').forEach((b) => { b.onclick = () => go(`lib/${sec || 'all'}/${b.dataset.y}`); });
      $('[data-go="libme"]').onclick = () => go('libme');
      $('#libS').onsubmit = (e) => { e.preventDefault(); const q = $('#libQ').value.trim(); if (q.length < 2) return; const w = normAr(q).split(/\s+/).filter((x) => x.length > 1); list = I.items.filter((x) => (!sec || x.s.includes(sec)) && (!typ || x.y === typ) && w.every((ww) => x._s.includes(ww))); shown = 30; draw(); toast(`${arG(list.length)} نتيجة`); };
    }).catch(() => { N.view.innerHTML = '<div class="card center">تعذّر تحميل فهرس المكتبة</div>'; });
  }

  // ---------- صفحة المادة ----------
  function renderItem(id) {
    loader();
    Promise.all([item(id), index().catch(() => null)]).then(([d, I]) => {
      if (!location.hash.startsWith('#/libi/')) return;
      const x = (I && I.byId[+id]) || { id: +id, t: d.t, y: d.at.some((a) => a.x === 'MP4') ? 'v' : d.at.some((a) => a.x === 'MP3') ? 'a' : 'b', au: d.au.map((a) => a.n) };
      touch(x);
      N.setTitle(TNAME[x.y] || 'المادة');
      const isFav = () => favs().some((f) => f.id === x.id);
      const lib = N.audioLib;
      const mp3 = d.at.filter((a) => a.x === 'MP3');
      const atRow = (a, i) => {
        const dl = a.x === 'MP3' && lib && lib.dlState ? lib.dlState(a.u) : {};
        if (a.x === 'PDF') return `<div class="lib-at"><b>📕 ${esc(a.n || 'الكتاب')}</b><small>PDF • ${esc(a.s || '')}</small><div class="lib-at-b"><button class="btn" data-pdf="${i}">📖 قراءة</button><button class="btn ghost" data-save="${i}">⬇️ حفظ دون إنترنت</button></div></div>`;
        if (a.x === 'MP3') return `<div class="lib-at"><b>🎧 ${esc(a.n || 'تسجيل')}</b><small>MP3 • ${esc(a.s || '')}${dl.done ? ' • ✓ محمّل' : ''}</small><div class="lib-at-b"><button class="btn" data-play="${mp3.indexOf(a)}">▶ استماع</button><button class="btn ghost" data-dl="${i}">${dl.done ? '🗑 حذف التحميل' : '⬇️ تحميل'}</button></div></div>`;
        if (a.x === 'MP4') return `<div class="lib-at"><b>🎬 ${esc(a.n || 'مقطع مرئي')}</b><small>MP4 • ${esc(a.s || '')}</small><div class="lib-at-b"><button class="btn" data-vid="${i}">▶ مشاهدة</button><a class="btn ghost" href="${esc(a.u)}" target="_blank" rel="noopener" download>⬇️ تنزيل</a></div></div>`;
        return `<div class="lib-at"><b>📎 ${esc(a.n || a.x)}</b><small>${esc(a.x)} • ${esc(a.s || '')}</small><div class="lib-at-b"><a class="btn ghost" href="${esc(a.u)}" target="_blank" rel="noopener">فتح</a></div></div>`;
      };
      N.view.innerHTML = `
        ${d.img ? `<div class="enc-hero"><img src="${esc(d.img)}" alt="" onerror="this.parentNode.remove()"></div>` : ''}
        <h2 class="enc-title">${esc(d.t)}</h2>
        <div class="enc-meta">${d.au.map((a) => `${a.k === 'author' ? '✍️' : '👤'} ${esc(a.n)}`).join(' • ')}</div>
        <div class="enc-tools"><button class="chip" id="lFav">${isFav() ? '★ محفوظ' : '☆ حفظ'}</button><button class="chip" id="lShare">↗ مشاركة</button></div>
        ${d.d ? `<p class="lib-desc">${esc(d.d)}</p>` : ''}
        <div id="lAt">${d.at.map(atRow).join('') || '<div class="card center muted">لا توجد ملفات لهذه المادة</div>'}</div>
        <div class="enc-src">المصدر: دار الإسلام (IslamHouse.com) — <a href="https://islamhouse.com/ar/${x.y === 'b' ? 'books' : x.y === 'a' ? 'audios' : 'videos'}/${d.id}/" target="_blank" rel="noopener">صفحة المادة الأصلية</a>.</div>`;
      $('#lFav').onclick = () => { const F = favs(); const i = F.findIndex((f) => f.id === x.id); if (i < 0) F.unshift({ id: x.id, t: x.t, y: x.y }); else F.splice(i, 1); store.set('lib:fav', F); $('#lFav').textContent = i < 0 ? '★ محفوظ' : '☆ حفظ'; };
      $('#lShare').onclick = () => N.shareText(`${d.t}\n${d.au.map((a) => a.n).join('، ')}\nhttps://islamhouse.com/ar/${x.y === 'b' ? 'books' : x.y === 'a' ? 'audios' : 'videos'}/${d.id}/\n\nمن تطبيق أثر - رفيق المسلم`);
      $$('[data-pdf]').forEach((b) => { b.onclick = () => go(`libr/${d.id}/${b.dataset.pdf}`); });
      $$('[data-vid]').forEach((b) => { b.onclick = () => go(`libv/${d.id}/${b.dataset.vid}`); });
      $$('[data-save]').forEach((b) => { b.onclick = () => saveBook(d, d.at[+b.dataset.save], b); });
      $$('[data-play]').forEach((b) => { b.onclick = () => { if (!lib) return; lib.playQueue(mp3.map((a) => ({ url: a.u, title: a.n || d.t, sub: d.au.map((q) => q.n).join('، ') || 'دار الإسلام' })), +b.dataset.play); toast('بدأ التشغيل — يمكنك التنقل في التطبيق'); }; });
      $$('[data-dl]').forEach((b) => { b.onclick = async () => { const a = d.at[+b.dataset.dl]; if (lib.dlState(a.u).done) { await lib.removeDl(a.u); toast('تم حذف التحميل'); renderItem(id); return; } lib.enqueue([{ url: a.u, title: a.n || d.t, sub: d.au.map((q) => q.n).join('، ') }]); toast('بدأ التحميل — تابع التقدّم من «مكتبتي»'); }; });
      $$('.lib-at small', N.view).forEach(() => {});
      const books = store.get('lib:books', {});
      $$('[data-save]').forEach((b) => { if (books[d.at[+b.dataset.save].u]) b.textContent = '✓ محفوظ — حذف'; });
    }).catch(() => { N.view.innerHTML = '<div class="card center">تعذّر تحميل المادة — تأكد من الاتصال بالإنترنت</div>'; });
  }

  async function saveBook(d, a, btn) {
    const books = store.get('lib:books', {});
    const c = await caches.open(BOOKS);
    if (books[a.u]) { await c.delete(a.u); delete books[a.u]; store.set('lib:books', books); btn.textContent = '⬇️ حفظ دون إنترنت'; toast('تم حذف النسخة المحفوظة'); return; }
    btn.disabled = true; btn.textContent = 'جارٍ الحفظ…';
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
      const r = await fetch(a.u);
      if (!r.ok) throw new Error(r.status);
      const blob = await r.blob();
      await c.put(a.u, new Response(blob, { headers: { 'Content-Type': 'application/pdf' } }));
      books[a.u] = { id: d.id, t: a.n || d.t, size: blob.size, at: Date.now() };
      store.set('lib:books', books);
      btn.textContent = '✓ محفوظ — حذف'; toast('حُفظ الكتاب للقراءة دون إنترنت');
    } catch { btn.textContent = '⬇️ حفظ دون إنترنت'; toast('تعذّر الحفظ — تأكد من الاتصال'); }
    btn.disabled = false;
  }

  // ---------- قارئ PDF ----------
  let pdfjsP = null;
  function pdfjs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfjsP) pdfjsP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/vendor/pdfjs/pdf.min.js'; s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdfjs/pdf.worker.min.js'; res(window.pdfjsLib); }; s.onerror = rej; document.head.appendChild(s); });
    return pdfjsP;
  }
  function renderReader(id, iStr) {
    loader();
    let alive = true; let doc = null; let renderTask = null;
    (async () => {
      const d = await item(id);
      const a = d.at[+iStr];
      if (!a) { go(`libi/${id}`); return; }
      N.setTitle(a.n || d.t);
      routes.libr.back = `libi/${id}`;
      const lib = await pdfjs();
      let data = null;
      try { const c = await caches.open(BOOKS); const hit = await c.match(a.u); if (hit) data = await hit.arrayBuffer(); } catch { /* */ }
      doc = await lib.getDocument(data ? { data } : { url: a.u, rangeChunkSize: 262144 }).promise;
      if (!alive) return;
      const key = `lib:pg:${a.u}`;
      let page = Math.min(doc.numPages, store.get(key, 1));
      let zoom = store.get('lib:zoom', 1);
      const marks = () => store.get(`lib:bm:${a.u}`, []);
      const notes = () => store.get(`lib:note:${a.u}`, {});
      N.view.innerHTML = `
        <div class="pdf-bar">
          <button class="chip" id="pPrev">▶</button>
          <span><input id="pNum" type="number" min="1" max="${doc.numPages}" value="${page}"> / ${ar(doc.numPages)}</span>
          <button class="chip" id="pNext">◀</button>
          <button class="chip" id="pZo">−</button><button class="chip" id="pZi">+</button>
          <button class="chip" id="pMark">🔖</button><button class="chip" id="pMore">⋯</button>
        </div>
        <div class="pdf-wrap" id="pWrap"><canvas id="pCv"></canvas></div>
        <div class="pdf-note" id="pNote"></div>`;
      const cv = $('#pCv'); const wrap = $('#pWrap');
      const draw = async () => {
        if (!alive) return;
        store.set(key, page); $('#pNum').value = page;
        const p = await doc.getPage(page);
        const base = p.getViewport({ scale: 1 });
        const scale = (wrap.clientWidth / base.width) * zoom * (window.devicePixelRatio || 1);
        const vp = p.getViewport({ scale });
        cv.width = vp.width; cv.height = vp.height; cv.style.width = `${(vp.width / (window.devicePixelRatio || 1))}px`;
        if (renderTask) try { renderTask.cancel(); } catch { /* */ }
        renderTask = p.render({ canvasContext: cv.getContext('2d'), viewport: vp });
        try { await renderTask.promise; } catch { /* أُلغي */ }
        $('#pMark').textContent = marks().includes(page) ? '🔖✓' : '🔖';
        const n = notes()[page]; $('#pNote').innerHTML = n ? `📝 ${esc(n)}` : '';
        const R = recent(); const r = R.find((x) => x.id === +id); if (r) { r.page = page; r.pages = doc.numPages; store.set('lib:recent', R); }
      };
      const goPage = (n) => { page = Math.max(1, Math.min(doc.numPages, n)); draw(); wrap.scrollTop = 0; window.scrollTo(0, 0); };
      $('#pPrev').onclick = () => goPage(page - 1); $('#pNext').onclick = () => goPage(page + 1);
      $('#pNum').onchange = (e) => goPage(+e.target.value || 1);
      $('#pZi').onclick = () => { zoom = Math.min(3, zoom + 0.25); store.set('lib:zoom', zoom); draw(); };
      $('#pZo').onclick = () => { zoom = Math.max(0.75, zoom - 0.25); store.set('lib:zoom', zoom); draw(); };
      $('#pMark').onclick = () => { const M = marks(); const i = M.indexOf(page); if (i < 0) M.push(page); else M.splice(i, 1); store.set(`lib:bm:${a.u}`, M.sort((x, y) => x - y)); draw(); toast(i < 0 ? 'أضيفت علامة' : 'أزيلت العلامة'); };
      let sx = 0; wrap.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
      wrap.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; if (zoom <= 1 && Math.abs(dx) > 70) goPage(page + (dx > 0 ? 1 : -1)); }, { passive: true });
      $('#pMore').onclick = async () => {
        let outline = [];
        try { outline = (await doc.getOutline()) || []; } catch { /* */ }
        const sh = N.sheet(`<h3 style="margin-top:0">📖 ${esc(a.n || d.t)}</h3>
          <div class="field"><label>📝 ملاحظة على الصفحة ${ar(page)}</label><textarea id="pNt" rows="3" style="width:100%">${esc(notes()[page] || '')}</textarea><button class="btn block" id="pNtS" style="margin-top:6px">حفظ الملاحظة</button></div>
          <div class="field"><label>🔍 بحث في نص الكتاب</label><div style="display:flex;gap:6px"><input id="pQ" type="search" style="flex:1"><button class="btn" id="pQb">بحث</button></div><div id="pQr" class="chips" style="justify-content:flex-start;margin-top:8px"></div></div>
          ${marks().length ? `<div class="field"><label>🔖 العلامات</label><div class="chips" style="justify-content:flex-start">${marks().map((m) => `<button class="chip" data-p="${m}">ص ${ar(m)}</button>`).join('')}</div></div>` : ''}
          ${Object.keys(notes()).length ? `<div class="field"><label>📝 الملاحظات</label>${Object.entries(notes()).map(([pg, t]) => `<button class="btn ghost block" style="margin-bottom:4px;text-align:start" data-p="${pg}">ص ${ar(pg)}: ${esc(t.slice(0, 60))}</button>`).join('')}</div>` : ''}
          ${outline.length ? `<div class="field"><label>📑 الفهرس</label>${outline.slice(0, 80).map((o, i) => `<button class="btn ghost block" style="margin-bottom:4px;text-align:start" data-o="${i}">${esc(o.title)}</button>`).join('')}</div>` : ''}`);
        const jump = (n) => { sh.close(); goPage(n); };
        $$('[data-p]', sh.el).forEach((b) => { b.onclick = () => jump(+b.dataset.p); });
        $$('[data-o]', sh.el).forEach((b) => { b.onclick = async () => { try { const o = outline[+b.dataset.o]; const dest = typeof o.dest === 'string' ? await doc.getDestination(o.dest) : o.dest; const ix = await doc.getPageIndex(dest[0]); jump(ix + 1); } catch { toast('تعذّر الانتقال'); } }; });
        $('#pNtS', sh.el).onclick = () => { const N2 = notes(); const v = $('#pNt', sh.el).value.trim(); if (v) N2[page] = v; else delete N2[page]; store.set(`lib:note:${a.u}`, N2); sh.close(); draw(); toast('حُفظت الملاحظة'); };
        $('#pQb', sh.el).onclick = async () => {
          const q = normAr($('#pQ', sh.el).value.trim()); if (q.length < 2) return;
          const out = $('#pQr', sh.el); out.textContent = 'جارٍ البحث…'; const hits = [];
          for (let i = 1; i <= doc.numPages && hits.length < 40; i++) { try { const tc = await (await doc.getPage(i)).getTextContent(); if (normAr(tc.items.map((t) => t.str).join(' ')).includes(q)) hits.push(i); } catch { /* */ } if (i % 20 === 0) out.textContent = `جارٍ البحث… ص ${ar(i)}`; }
          out.innerHTML = hits.length ? hits.map((h) => `<button class="chip" data-p="${h}">ص ${ar(h)}</button>`).join('') : 'لا نتائج (بعض الكتب صور ممسوحة لا يمكن البحث فيها)';
          $$('[data-p]', out).forEach((b) => { b.onclick = () => jump(+b.dataset.p); });
        };
      };
      draw();
    })().catch((e) => { console.warn(e); if (alive) N.view.innerHTML = '<div class="card center">تعذّر فتح الكتاب — تأكد من الاتصال، أو احفظه أولاً للقراءة دون إنترنت</div>'; });
    return () => { alive = false; if (doc) try { doc.destroy(); } catch { /* */ } };
  }

  // ---------- مشغّل الفيديو ----------
  function renderVideo(id, iStr) {
    loader();
    let v = null; let saveT = 0;
    item(id).then((d) => {
      const a = d.at[+iStr];
      if (!a) { go(`libi/${id}`); return; }
      routes.libv.back = `libi/${id}`;
      N.setTitle(a.n || d.t);
      const key = `lib:vpos:${a.u}`;
      const rate = store.get('lib:vrate', 1);
      window.dispatchEvent(new CustomEvent('noor:audio', { detail: 'libvideo' }));
      N.view.innerHTML = `<div class="dw-player"><video id="lv" src="${esc(a.u)}" controls playsinline preload="metadata"></video></div>
        <h2 class="dw-title">${esc(a.n || d.t)}</h2><p class="muted">${esc(d.au.map((q) => q.n).join('، '))} • ${esc(a.s || '')}</p>
        <div class="field"><label>سرعة التشغيل</label><div class="seg" id="lvR">${[0.75, 1, 1.25, 1.5, 2].map((x) => `<button data-r="${x}" class="${x === rate ? 'active' : ''}">${ar(x)}×</button>`).join('')}</div></div>
        <p class="muted" style="font-size:.82rem">يُستكمل المقطع تلقائياً من آخر نقطة. المصدر: دار الإسلام (IslamHouse.com).</p>`;
      v = $('#lv');
      v.playbackRate = rate;
      v.addEventListener('loadedmetadata', () => { const p = store.get(key, 0); if (p > 5 && p < v.duration - 10) v.currentTime = p; v.playbackRate = rate; }, { once: true });
      v.addEventListener('timeupdate', () => { if (Date.now() - saveT > 4000) { saveT = Date.now(); store.set(key, v.currentTime); } });
      $$('#lvR button').forEach((b) => { b.onclick = () => { const r = +b.dataset.r; v.playbackRate = r; store.set('lib:vrate', r); $$('#lvR button').forEach((x) => x.classList.toggle('active', x === b)); }; });
    }).catch(() => { N.view.innerHTML = '<div class="card center">تعذّر التحميل</div>'; });
    return () => { if (v) { store.set(`lib:vpos:${v.currentSrc}`, v.currentTime); v.pause(); v.removeAttribute('src'); v.load(); } };
  }

  // ---------- مكتبتي ----------
  function renderMine() {
    const F = favs(); const R = recent(); const B = store.get('lib:books', {}); const lib = N.audioLib;
    const audios = lib ? Object.entries(lib.dlIndex()) : [];
    const sz = (b) => (b > 1048576 ? `${ar((b / 1048576).toFixed(1))} م.ب` : `${ar(Math.round(b / 1024))} ك.ب`);
    const total = Object.values(B).reduce((s, x) => s + (x.size || 0), 0) + audios.reduce((s, [, x]) => s + (x.size || 0), 0);
    N.view.innerHTML = `
      <div class="az-stats card"><div><b>${ar(R.length)}</b><small>مادة فتحتها</small></div><div><b>${ar(Object.keys(B).length + audios.length)}</b><small>ملف محمّل</small></div><div><b>${sz(total)}</b><small>المساحة المستخدمة</small></div></div>
      ${R.length ? `<h3 class="dash-sec">🕘 أكمل من حيث توقفت</h3>${R.slice(0, 12).map((x) => `<button class="btn ghost block" style="margin-bottom:6px;text-align:start" data-i="${x.id}">${TIC[x.y] || ''} ${esc(x.t)}${x.page ? ` <small class="muted">— ص ${ar(x.page)} من ${ar(x.pages)}</small>` : ''}</button>`).join('')}` : ''}
      ${F.length ? `<h3 class="dash-sec">⭐ المحفوظات</h3>${F.map((x) => `<button class="btn ghost block" style="margin-bottom:6px;text-align:start" data-i="${x.id}">${TIC[x.y] || ''} ${esc(x.t)}</button>`).join('')}` : ''}
      <h3 class="dash-sec">⬇️ الملفات المحمّلة</h3>
      ${Object.entries(B).map(([u, x]) => `<div class="lib-at"><b>📕 ${esc(x.t)}</b><small>${sz(x.size)}</small><div class="lib-at-b"><button class="btn" data-i="${x.id}">فتح</button><button class="btn ghost" data-rmb="${esc(u)}">🗑 حذف</button></div></div>`).join('')}
      ${audios.map(([u, x]) => `<div class="lib-at"><b>🎧 ${esc(x.title || '')}</b><small>${sz(x.size || 0)} • ${esc(x.sub || '')}</small><div class="lib-at-b"><button class="btn ghost" data-rma="${esc(u)}">🗑 حذف</button></div></div>`).join('')}
      ${!Object.keys(B).length && !audios.length ? '<div class="card center muted">لا توجد ملفات محمّلة بعد</div>' : ''}
      <div id="dlNow"></div>`;
    bindCards(N.view);
    $$('[data-rmb]').forEach((b) => { b.onclick = async () => { const c = await caches.open(BOOKS); await c.delete(b.dataset.rmb); const B2 = store.get('lib:books', {}); delete B2[b.dataset.rmb]; store.set('lib:books', B2); renderMine(); }; });
    $$('[data-rma]').forEach((b) => { b.onclick = async () => { await lib.removeDl(b.dataset.rma); renderMine(); }; });
  }

  Object.assign(routes, {
    lib: { title: 'المكتبة العلمية', render: (s, y) => renderLib(s === 'all' ? '' : s, y || ''), back: 'enc' },
    libi: { title: 'المادة', render: renderItem, back: 'lib' },
    libr: { title: 'قارئ الكتب', render: renderReader, back: 'lib' },
    libv: { title: 'المشاهدة', render: renderVideo, back: 'lib' },
    libme: { title: 'مكتبتي', render: renderMine, back: 'lib' },
  });
  N.lib = { index, SECS };
});
