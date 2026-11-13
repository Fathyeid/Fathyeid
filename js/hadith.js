/* مكتبة الحديث الشريف: الكتب، الأبواب، القراءة، الدرجات، البحث، المفضلة، التحميل دون اتصال */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, arG, esc, routes } = N;
  const BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';
  const CACHE = 'noor-data-v1';
  const book = (k) => HADITH_BOOKS.find((b) => b.key === k);
  const secName = (k, i) => { const n = (HADITH_SECTIONS[k] || [])[i]; return n ? (n === 'المقدمة' ? n : `كتاب ${n}`) : `القسم ${ar(i)}`; };
  const strip = (t) => t.replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

  // ---------- جلب البيانات مع التخزين ----------
  async function getJSON(url, keep) {
    try {
      const c = await caches.open(CACHE);
      const hit = await c.match(url);
      if (hit) return hit.json();
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      if (keep) await c.put(url, res.clone());
      return res.json();
    } catch (e) {
      const res = await fetch(url);
      if (!res.ok) throw e;
      return res.json();
    }
  }
  const dlBooks = () => store.get('hadith:dl', {});
  const fullUrl = (b) => `${BASE}/${b.ed}.json`;
  const mem = {};
  async function loadFull(k) {
    if (mem[k]) return mem[k];
    const b = book(k);
    const d = await getJSON(fullUrl(b), true);
    const idx = dlBooks(); idx[k] = { t: Date.now(), n: d.hadiths.length }; store.set('hadith:dl', idx);
    mem[k] = d;
    return d;
  }
  async function loadSection(k, s) {
    if (dlBooks()[k] || book(k).small) {
      const d = await loadFull(k);
      return d.hadiths.filter((h) => (book(k).small ? true : h.reference && h.reference.book === s));
    }
    const d = await getJSON(`${BASE}/${book(k).ed}/sections/${s}.json`, true);
    return d.hadiths;
  }
  async function removeBook(k) {
    try { const c = await caches.open(CACHE); await c.delete(fullUrl(book(k))); } catch { /* تجاهل */ }
    const idx = dlBooks(); delete idx[k]; store.set('hadith:dl', idx); delete mem[k];
  }

  // ---------- المفضلة ----------
  const favs = () => store.get('hadith:fav', []);
  const isFav = (k, n) => favs().some((f) => f.k === k && f.n === n);
  function toggleFav(k, h) {
    const f = favs(); const i = f.findIndex((x) => x.k === k && x.n === h.hadithnumber);
    if (i >= 0) f.splice(i, 1); else f.unshift({ k, n: h.hadithnumber, s: h.reference ? h.reference.book : 1, text: h.text.slice(0, 260) });
    store.set('hadith:fav', f);
    return i < 0;
  }

  // ---------- عرض حديث ----------
  function gradesHtml(k, h) {
    const b = book(k);
    if (b.sahih) return `<span class="hd-grade ok">من أحاديث ${b.name}</span>`;
    const g = (h.grades || []).map((x) => ({ who: HADITH_GRADERS[x.name] || x.name, g: translateGrade(x.grade) })).filter((x) => x.g);
    if (!g.length) return '<span class="hd-grade">لم تُذكر درجة الحديث في المصدر</span>';
    return g.map((x) => `<span class="hd-grade ${/ضعيف|موضوع|منكر|باطل|معلول|شاذ/.test(x.g) ? 'weak' : /صحيح|حسن|متفق/.test(x.g) ? 'ok' : ''}">${esc(x.who)}: ${esc(x.g)}</span>`).join('');
  }
  function hadithCard(k, h, opts = {}) {
    const b = book(k);
    const text = opts.mark ? esc(h.text).replace(opts.mark, '<mark>$&</mark>') : esc(h.text);
    return `<article class="card hd" data-n="${h.hadithnumber}">
      <div class="hd-head"><b>${b.name} — حديث رقم ${ar(h.hadithnumber)}</b>${opts.sec && h.reference && !b.small ? `<small class="muted">${secName(k, h.reference.book)}</small>` : ''}</div>
      <p class="hd-text">${text}</p>
      <div class="hd-grades">${gradesHtml(k, h)}</div>
      <div class="hd-actions">
        <button class="aud-ic" data-fav="${h.hadithnumber}" aria-label="المفضلة">${isFav(k, h.hadithnumber) ? '★' : '☆'}</button>
        <button class="aud-ic" data-share="${h.hadithnumber}" aria-label="مشاركة">📤</button>
      </div>
    </article>`;
  }
  function bindCards(root, k, list) {
    $$('[data-fav]', root).forEach((b) => b.addEventListener('click', () => {
      const h = list.find((x) => x.hadithnumber === +b.dataset.fav);
      const on = toggleFav(k, h); b.textContent = on ? '★' : '☆'; toast(on ? 'أُضيف إلى المفضلة' : 'أُزيل من المفضلة');
    }));
    $$('[data-share]', root).forEach((b) => b.addEventListener('click', () => {
      const h = list.find((x) => x.hadithnumber === +b.dataset.share);
      N.shareText(`${h.text}\n\n[${book(k).name}، رقم ${h.hadithnumber}]\n\nمن تطبيق أثر - صدقة جارية على روح المرحوم عيد فتحي أبو طالب\n${location.origin}${location.pathname}`);
    }));
  }

  // ---------- الصفحات ----------
  function renderHadith() {
    const dl = dlBooks();
    N.view.innerHTML = `
      <form id="hsF" style="display:flex;gap:8px"><input class="search" id="hsQ" type="search" placeholder="ابحث في الأحاديث بكلمة..." style="margin:0"><button class="btn" type="submit">بحث</button></form>
      <p class="muted" style="font-size:.8rem;margin:6px 2px 12px">يتم البحث في الكتب المحمّلة على جهازك، وفي الأربعين النووية والقدسية.</p>
      <div class="seg" id="htabs" style="margin-bottom:12px"><button data-t="books" class="active">الكتب</button><button data-t="fav">المفضلة (${ar(favs().length)})</button></div>
      <div id="hbody"></div>
      <div class="card acad-note"><b>📌 عن المصدر</b><p>نصوص الأحاديث من مشروع hadith-api المفتوح (ملكية عامة)، وأحكام الحديث منقولة عن أصحابها من أهل العلم كما وردت في المصدر. أحاديث الصحيحين متلقاة بالقبول عند أهل العلم.</p></div>`;
    const body = $('#hbody');
    const books = () => {
      body.innerHTML = `<div class="card" style="padding:4px">${HADITH_BOOKS.map((b) => `
        <button class="aud-rec" data-b="${b.key}"><span class="aud-av">📜</span><span class="aud-info"><b>${b.name}</b><small>${b.author}${dl[b.key] ? ` • ✔ محمّل (${arG(dl[b.key].n)} حديث)` : ''}</small></span></button>`).join('')}</div>`;
      $$('[data-b]', body).forEach((x) => x.addEventListener('click', () => go(`hbook/${x.dataset.b}`)));
    };
    const fav = () => {
      const f = favs();
      body.innerHTML = f.map((x, i) => `<div class="card hd"><div class="hd-head"><b>${book(x.k).name} — حديث رقم ${ar(x.n)}</b></div><p class="hd-text">${esc(x.text)}${x.text.length >= 260 ? '…' : ''}</p><div class="hd-actions"><button class="btn ghost" data-open="${i}">قراءة كاملاً</button><button class="aud-ic" data-rm="${i}" aria-label="إزالة">★</button></div></div>`).join('') || '<div class="card center muted">اضغط ☆ على أي حديث لإضافته هنا</div>';
      $$('[data-open]', body).forEach((b) => b.addEventListener('click', () => { const x = f[+b.dataset.open]; go(`hsec/${x.k}/${x.s}/${x.n}`); }));
      $$('[data-rm]', body).forEach((b) => b.addEventListener('click', () => { f.splice(+b.dataset.rm, 1); store.set('hadith:fav', f); fav(); }));
    };
    $$('#htabs button').forEach((b) => b.addEventListener('click', () => { $$('#htabs button').forEach((x) => x.classList.toggle('active', x === b)); (b.dataset.t === 'fav' ? fav : books)(); }));
    books();
    $('#hsF').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#hsQ').value.trim(); if (q.length < 2) { toast('اكتب كلمة من حرفين على الأقل'); return; } go(`hsearch/all/${encodeURIComponent(q)}`); });
  }

  function renderBook(k) {
    const b = book(k);
    if (!b) { go('hadith'); return; }
    N.setTitle(b.name);
    if (b.small) { renderSection(k, '1'); return; }
    const draw = () => {
      const d = dlBooks()[k];
      const names = HADITH_SECTIONS[k];
      N.view.innerHTML = `
        <div class="card"><b>${b.name}</b><p class="muted" style="margin:4px 0 10px">${b.author}</p>
          ${d ? `<p style="margin:0 0 8px">✔ الكتاب محمّل على جهازك (${arG(d.n)} حديث) ويعمل دون إنترنت.</p><button class="btn ghost block" id="bRm">🗑 حذف التحميل</button>`
            : `<button class="btn block" id="bDl">⬇ تحميل الكتاب كاملاً (نحو ${ar(b.size)} ميجا) للقراءة والبحث دون إنترنت</button>`}
        </div>
        <form id="bsF" style="display:flex;gap:8px;margin-bottom:12px"><input class="search" id="bsQ" type="search" placeholder="ابحث في ${b.name}..." style="margin:0"><button class="btn" type="submit">بحث</button></form>
        <div class="section-title">الكتب والأبواب</div>
        <div class="card" style="padding:4px">${names.map((n, i) => (n ? `<button class="aud-rec" data-s="${i}"><span class="surah-num">${ar(i)}</span><span class="aud-info"><b>${secName(k, i)}</b></span></button>` : '')).join('')}</div>`;
      $$('[data-s]').forEach((x) => x.addEventListener('click', () => go(`hsec/${k}/${x.dataset.s}`)));
      if ($('#bDl')) $('#bDl').onclick = async (e) => {
        e.currentTarget.disabled = true; e.currentTarget.textContent = 'جارٍ التحميل...';
        try { await loadFull(k); toast('تم تحميل الكتاب'); } catch { toast('تعذّر التحميل، تأكد من الاتصال بالإنترنت'); }
        draw();
      };
      if ($('#bRm')) $('#bRm').onclick = async () => { await removeBook(k); toast('تم حذف التحميل'); draw(); };
      $('#bsF').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#bsQ').value.trim(); if (q.length < 2) { toast('اكتب كلمة من حرفين على الأقل'); return; } go(`hsearch/${k}/${encodeURIComponent(q)}`); });
    };
    draw();
  }

  function renderSection(k, sStr, nStr) {
    const b = book(k); const s = +sStr;
    if (!b) { go('hadith'); return; }
    N.setTitle(b.small ? b.name : secName(k, s));
    N.view.innerHTML = '<div class="loader"></div>';
    let alive = true;
    loadSection(k, s).then((list) => {
      if (!alive) return;
      let shown = b.small ? list.length : 40;
      const draw = () => {
        N.view.innerHTML = `<p class="muted" style="margin:0 0 10px">${b.name}${b.small ? '' : ` • ${secName(k, s)}`}، عدد الأحاديث: ${arG(list.length)}</p>
          ${list.slice(0, shown).map((h) => hadithCard(k, h)).join('')}
          ${list.length > shown ? `<button class="btn ghost block" id="more">عرض المزيد (${arG(list.length - shown)})</button>` : ''}`;
        bindCards(N.view, k, list);
        if ($('#more')) $('#more').onclick = () => { shown += 40; const y = window.scrollY; draw(); window.scrollTo(0, y); };
      };
      if (nStr) { const i = list.findIndex((h) => h.hadithnumber === +nStr); if (i >= shown) shown = i + 10; }
      draw();
      if (nStr) setTimeout(() => { const el = $(`.hd[data-n="${nStr}"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); } }, 100);
    }).catch(() => {
      if (!alive) return;
      N.view.innerHTML = '<div class="card center"><p>تعذّر تحميل الأحاديث. تأكد من الاتصال بالإنترنت، أو حمّل الكتاب ليعمل دون إنترنت.</p><button class="btn" id="retry">إعادة المحاولة</button></div>';
      $('#retry').onclick = () => renderSection(k, sStr, nStr);
    });
    return () => { alive = false; };
  }

  function renderSearch(scope, qEnc) {
    const q = decodeURIComponent(qEnc || '');
    N.setTitle(`بحث: ${q}`);
    const keys = scope === 'all' ? HADITH_BOOKS.filter((b) => dlBooks()[b.key] || b.small).map((b) => b.key) : [scope];
    N.view.innerHTML = '<div class="loader"></div>';
    let alive = true;
    (async () => {
      const nq = strip(q);
      const out = [];
      for (const k of keys) {
        try {
          const d = await loadFull(k);
          for (const h of d.hadiths) {
            if (!h.text) continue;
            if (!h._n) h._n = strip(h.text);
            if (h._n.includes(nq)) out.push({ k, h });
          }
        } catch { /* كتاب غير متاح */ }
        if (!alive) return;
      }
      const notDl = scope === 'all' ? HADITH_BOOKS.filter((b) => !dlBooks()[b.key] && !b.small) : [];
      const limit = 100;
      N.view.innerHTML = `<p class="muted" style="margin:0 0 10px">${arG(out.length)} نتيجة لكلمة «${esc(q)}»${out.length > limit ? ` • يُعرض أول ${ar(limit)}` : ''}</p>
        ${notDl.length ? `<div class="card" style="font-size:.88rem">ℹ️ لم يشمل البحث: ${notDl.map((b) => b.name).join('، ')}. حمّلها من صفحة كل كتاب ليشملها البحث.</div>` : ''}
        ${out.slice(0, limit).map(({ k, h }) => hadithCard(k, h, { sec: true })).join('') || '<div class="card center muted">لا توجد نتائج</div>'}`;
      // ربط الأزرار لكل كتاب
      const byBook = {};
      out.slice(0, limit).forEach(({ k, h }) => { (byBook[k] = byBook[k] || []).push(h); });
      $$('.hd', N.view).forEach((card, i) => { const { k } = out[i]; bindCards(card, k, byBook[k]); });
    })().catch(() => alive && (N.view.innerHTML = '<div class="card center">تعذّر البحث، تأكد من الاتصال بالإنترنت.</div>'));
    return () => { alive = false; };
  }

  Object.assign(routes, {
    hadith: { title: 'مكتبة الحديث الشريف', render: renderHadith, back: 'home' },
    hbook: { title: 'كتاب', render: renderBook, back: 'hadith' },
    hsec: { title: 'الأحاديث', render: renderSection, back: 'hadith' },
    hsearch: { title: 'بحث', render: renderSearch, back: 'hadith' },
  });
});
