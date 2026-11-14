/* الموسوعة الفقهية الإسلامية — المرحلة الأولى: الواجهة الرئيسية والمكتبة وفهرس الكتب.
 * البيانات من جداول fiqh_* في Supabase (قراءة عامة فقط عبر المفتاح العام)، مع نسخة محلية للعمل دون اتصال.
 * لا تُعرض ميزة على أنها جاهزة قبل بنائها: الأقسام القادمة موسومة بمرحلتها. */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, esc, routes } = N;
  const SB = 'https://movodjdwghharkfrgqtv.supabase.co';
  const SB_KEY = 'sb_publishable_41NxOHPNTwzGP5nvZOt2UQ_m7FMSyY4';
  const MAD = { hanafi: 'الحنفي', maliki: 'المالكي', shafii: 'الشافعي', hanbali: 'الحنبلي', muqaran: 'الفقه المقارن', hadith: 'الحديث وأدلة الأحكام', other: 'أخرى' };
  const FIELD = { fiqh: 'فقه', usul: 'أصول الفقه', qawaid: 'القواعد الفقهية', muamalat: 'المعاملات', tafsir: 'التفسير', hadith: 'الحديث', aqida: 'العقيدة', sira: 'السيرة', fatawa: 'الفتاوى', mawsuat: 'موسوعات معاصرة' };
  const IDX = { pending: ['⏳', 'النص متاح — بانتظار الفهرسة'], indexing: ['🔄', 'جارٍ الفهرسة'], indexed: ['✅', 'مفهرس وقابل للبحث'], failed: ['⚠️', 'فشلت الفهرسة'], metadata_only: ['🔒', 'بيانات فقط — حقوق النص محفوظة'] };

  async function sb(path) {
    const r = await fetch(`${SB}/rest/v1/${path}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
  // فهرس الكتب مع نسخة محلية (يتحدث كل ٦ ساعات)
  async function catalog(force) {
    const c = store.get('fiqh:cat');
    if (!force && c && Date.now() - c.t < 6 * 36e5) return c.d;
    try {
      const d = await sb('fiqh_books?select=id,title,madhhab,field,edition,editor,publisher,pub_year,volumes,words,has_page_numbers,rights_status,license,source_url,text_url,index_status,indexed_chunks,notes,fiqh_authors(name,short_name,died_ah),fiqh_sources(name,url,license)&order=madhhab,id');
      store.set('fiqh:cat', { t: Date.now(), d });
      return d;
    } catch (e) { if (c) return c.d; throw e; }
  }
  const hist = () => store.get('fiqh:hist', []);
  const addHist = (q) => { const H = hist().filter((x) => x.q !== q); H.unshift({ q, t: Date.now() }); store.set('fiqh:hist', H.slice(0, 50)); };

  // ---------- الرئيسية ----------
  const TILES = [
    ['ask', '💬', 'اسأل الموسوعة', 'سؤال بلغتك يُبحث له في المصادر', 4],
    ['lib', '📚', 'مكتبة الكتب والمراجع', 'الكتب المعتمدة وحالة كل كتاب', 0],
    ['madhahib', '🕌', 'المذاهب الأربعة', 'كتب كل مذهب ومقارنة الأقوال', 5],
    ['contract', '🔍', 'تحليل العقود والمعاملات', 'فحص المعاملة الآن، وتحليل العقد كاملاً لاحقاً', 0],
    ['quran', '📖', 'القرآن الكريم والأدلة', 'النص والتفاسير', 0],
    ['hadith', '📜', 'موسوعة الحديث الشريف', 'الكتب الستة وغيرها', 0],
    ['fatawa', '🗂️', 'فتاوى العلماء', 'كتب الفتاوى والمواقع الرسمية', 0],
    ['saved', '🔖', 'الأسئلة المحفوظة', 'ما حفظته من بحث', 0],
    ['review', '👨‍⚖️', 'تنتظر مراجعة متخصص', 'نظام مراجعة بشرية حقيقي', 7],
    ['hist', '🕘', 'سجل البحث', 'عمليات بحثك على هذا الجهاز', 0],
  ];
  function renderHome() {
    const H = hist();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    N.view.innerHTML = `
      <section class="fq-hero"><h2>الموسوعة الفقهية الإسلامية</h2><p>ابحث في كتب المذاهب الأربعة وأصول الفقه والفتاوى، مع التوثيق بالكتاب والجزء والصفحة.</p>
        <form class="fq-search" id="fqF"><input id="fqQ" type="search" placeholder="ابحث عن مسألة أو كتاب أو مؤلف…" autocomplete="off">${SR ? '<button type="button" class="fq-mic" id="fqMic" aria-label="بحث صوتي">🎙️</button>' : ''}<button class="btn" type="submit">بحث</button></form>
        <small class="fq-note">البحث الآن في أسماء الكتب والمؤلفين والأبواب؛ والبحث داخل نصوص الكتب يُفعَّل بعد فهرستها.</small></section>
      <div class="fq-grid">${TILES.map(([k, ic, t, d, ph]) => `<button class="fq-tile ${ph ? 'soon' : ''}" data-k="${k}" data-ph="${ph}"><span class="fq-ic">${ic}</span><b>${t}</b><small>${ph ? `قيد الإنشاء — المرحلة ${ar(ph)}` : d}</small></button>`).join('')}</div>
      ${H.length ? `<h3 class="dash-sec">🔎 عمليات بحثك الأخيرة</h3><div class="chips" style="justify-content:flex-start">${H.slice(0, 8).map((x) => `<button class="chip" data-q="${esc(x.q)}">${esc(x.q)}</button>`).join('')}</div>` : ''}
      <div class="card" id="fqStats"><div class="loader" style="margin:10px auto"></div></div>
      <div class="card calc-disc"><b>⚖️ منهج الموسوعة</b><p>تُعرض النصوص من مصادرها الأصلية منسوبة إلى الكتاب والطبعة والجزء والصفحة، ولا يُنسب قول إلى مذهب دون مرجع. ما تعرضه الموسوعة مادة علمية للبحث وليس فتوى؛ والمسائل الخاصة يُرجع فيها إلى المفتين ودور الإفتاء.</p></div>`;
    $$('.fq-tile').forEach((b) => { b.onclick = () => {
      const k = b.dataset.k; const ph = +b.dataset.ph;
      if (ph) { toast(`هذا القسم يُبنى في المرحلة ${ar(ph)} بإذن الله`); return; }
      const R = { lib: 'fqlib', contract: 'c/contract', quran: 'quran', hadith: 'hadith', fatawa: 'fqlib/fatawa', saved: 'fqsaved', hist: 'fqhist' };
      go(R[k]);
    }; });
    $$('[data-q]').forEach((b) => { b.onclick = () => go(`fqs/${encodeURIComponent(b.dataset.q)}`); });
    $('#fqF').onsubmit = (e) => { e.preventDefault(); const q = $('#fqQ').value.trim(); if (q.length < 2) { toast('اكتب كلمتين على الأقل'); return; } go(`fqs/${encodeURIComponent(q)}`); };
    const mic = $('#fqMic');
    if (mic) mic.onclick = () => {
      try {
        const r = new SR(); r.lang = 'ar-EG'; r.interimResults = false;
        mic.classList.add('on'); toast('تحدّث الآن…');
        r.onresult = (e) => { $('#fqQ').value = e.results[0][0].transcript; };
        r.onend = () => mic.classList.remove('on');
        r.onerror = () => { mic.classList.remove('on'); toast('تعذّر التعرف على الصوت'); };
        r.start();
      } catch { toast('البحث الصوتي غير مدعوم على هذا الجهاز'); }
    };
    catalog().then((d) => {
      const el = $('#fqStats'); if (!el) return;
      const open = d.filter((b) => b.rights_status === 'open'); const idx = d.filter((b) => b.index_status === 'indexed');
      const words = open.reduce((s, b) => s + (b.words || 0), 0);
      el.innerHTML = `<h3>📊 الموسوعة الآن</h3><div class="fq-stats"><div><b>${ar(d.length)}</b><small>كتاباً في الفهرس</small></div><div><b>${ar(open.length)}</b><small>نصها متاح بترخيص مفتوح</small></div><div><b>${ar(Math.round(words / 1e5) / 10)}</b><small>مليون كلمة</small></div><div><b>${ar(idx.length)}</b><small>مفهرس للبحث</small></div></div>`;
    }).catch(() => { const el = $('#fqStats'); if (el) el.innerHTML = '<p class="muted center">تعذّر تحميل بيانات المكتبة؛ تحقق من الاتصال.</p>'; });
  }

  // ---------- المكتبة ----------
  async function renderLib(filter) {
    N.view.innerHTML = '<div class="loader" style="margin:30px auto"></div>';
    let d; try { d = await catalog(); } catch { N.view.innerHTML = '<div class="card center">تعذّر تحميل المكتبة؛ تحقق من الاتصال بالإنترنت.<br><button class="btn" id="rt" style="margin-top:10px">إعادة المحاولة</button></div>'; $('#rt').onclick = () => renderLib(filter); return; }
    let f = filter || store.get('fiqh:lf', 'all');
    const draw = () => {
      const L = d.filter((b) => f === 'all' || b.madhhab === f || b.field === f);
      const keys = ['all', 'hanafi', 'maliki', 'shafii', 'hanbali', 'muqaran', 'usul', 'qawaid', 'fatawa', 'hadith', 'mawsuat'];
      N.view.innerHTML = `
        <div class="chips fq-chips">${keys.map((k) => `<button class="chip ${f === k ? 'active' : ''}" data-f="${k}">${k === 'all' ? 'الكل' : MAD[k] || FIELD[k]}</button>`).join('')}</div>
        <p class="muted" style="margin:6px 0 10px">${ar(L.length)} كتاباً</p>
        ${L.map((b) => { const a = b.fiqh_authors; const [ic, st] = IDX[b.index_status] || ['', b.index_status]; return `<button class="fq-book" data-id="${b.id}"><b>${esc(b.title)}</b><small>${a ? `${esc(a.short_name)}${a.died_ah ? ` (ت ${ar(a.died_ah)}هـ)` : ''} • ` : ''}${MAD[b.madhhab] || ''} • ${FIELD[b.field] || ''}${b.volumes ? ` • ${ar(b.volumes)} مجلدات` : ''}</small><span class="fq-st ${b.index_status}">${ic} ${st}</span></button>`; }).join('')}
        <div class="card calc-src"><b>ℹ️ عن المكتبة</b><ul><li>نصوص الكتب التراثية من مشروع OpenITI (مبادرة النصوص الإسلامية المفتوحة) بترخيص CC BY-NC-SA 4.0، ومعظمها مأخوذ من المكتبة الشاملة مع علامات الأجزاء والصفحات وبيانات الطبعة.</li><li>الكتب المعاصرة محفوظة الحقوق؛ تُعرض بياناتها وروابط مواقعها الرسمية فقط، ولا تُنسخ نصوصها إلا بإذن أصحابها.</li><li>يُضاف كل كتاب إلى البحث بعد تنزيل نصه وفهرسته ومراجعة جودته.</li></ul></div>`;
      $$('[data-f]').forEach((b) => { b.onclick = () => { f = b.dataset.f; store.set('fiqh:lf', f); draw(); }; });
      $$('[data-id]').forEach((b) => { b.onclick = () => go(`fqbook/${b.dataset.id}`); });
    };
    draw();
  }

  async function renderBook(id) {
    let d; try { d = await catalog(); } catch { N.view.innerHTML = '<div class="card center">تعذّر التحميل</div>'; return; }
    const b = d.find((x) => String(x.id) === String(id)); if (!b) { go('fqlib'); return; }
    N.setTitle(b.title.length > 28 ? b.title.slice(0, 28) + '…' : b.title);
    const a = b.fiqh_authors; const s = b.fiqh_sources; const [ic, st] = IDX[b.index_status] || ['', ''];
    const kv = (k, v) => (v ? `<div class="pr-extra"><span>${k}</span><b>${esc(String(v))}</b></div>` : '');
    const sham = (b.notes || '').match(/https?:\/\/shamela\.ws\S+/);
    N.view.innerHTML = `
      <div class="card"><h3 style="line-height:1.6">${esc(b.title)}</h3>
        ${a ? `<p class="muted" style="margin-top:0">${esc(a.name)}</p>` : ''}
        <span class="fq-st ${b.index_status}">${ic} ${st}</span></div>
      <div class="card"><h3>📇 بيانات الكتاب</h3>
        ${kv('المذهب', MAD[b.madhhab])}${kv('المجال', FIELD[b.field])}${kv('الناشر', b.publisher)}${kv('الطبعة', b.edition)}${kv('سنة النشر', b.pub_year)}${kv('المحقق', b.editor)}${kv('عدد المجلدات', b.volumes && ar(b.volumes))}${kv('عدد الكلمات', b.words && Number(b.words).toLocaleString('ar-EG'))}${kv('ترقيم الأجزاء والصفحات', b.text_url ? (b.has_page_numbers ? 'موجود في النص (للتوثيق)' : 'غير موجود') : '')}</div>
      <div class="card"><h3>⚖️ المصدر والحقوق</h3>${kv('المصدر الرقمي', s && s.name)}${kv('الترخيص', b.license || (b.rights_status === 'restricted' ? 'محفوظ لأصحابه' : 'غير محدد'))}
        ${b.notes ? `<p class="calc-why">${esc(b.notes.replace(/؟?\s*رقمه في المكتبة الشاملة:\s*\S+/, '').replace(/؛\s*$/, ''))}</p>` : ''}
        <div class="fq-links">${b.source_url ? `<a class="btn ghost" href="${esc(b.source_url)}" target="_blank" rel="noopener">${b.text_url ? '🗂️ ملف النص في OpenITI' : '🌐 الموقع الرسمي'}</a>` : ''}${sham ? `<a class="btn ghost" href="${esc(sham[0])}" target="_blank" rel="noopener">📚 صفحة الكتاب في الشاملة</a>` : ''}</div></div>
      <div class="card calc-disc"><p>${b.index_status === 'metadata_only' ? 'هذا الكتاب لا يُنسخ نصه داخل التطبيق احتراماً لحقوق ناشره؛ ويمكنك قراءته من مصدره الرسمي.' : 'النص متاح بترخيص مفتوح وسيُضاف إلى البحث داخل الموسوعة بعد فهرسته ومراجعة جودته.'}</p></div>`;
  }

  // ---------- البحث (المرحلة الأولى: في الفهرس) ----------
  async function renderSearch(qEnc) {
    const q = decodeURIComponent(qEnc || ''); addHist(q);
    N.view.innerHTML = '<div class="loader" style="margin:30px auto"></div>';
    let d; try { d = await catalog(); } catch { N.view.innerHTML = '<div class="card center">تعذّر الاتصال</div>'; return; }
    const nq = N.normAr(q); const words = nq.split(/\s+/).filter((w) => w.length > 1);
    const hit = (s) => { const t = N.normAr(s || ''); return words.every((w) => t.includes(w)); };
    const books = d.filter((b) => hit(`${b.title} ${b.fiqh_authors ? b.fiqh_authors.name + ' ' + b.fiqh_authors.short_name : ''} ${MAD[b.madhhab]} ${FIELD[b.field]}`));
    let topics = [];
    try { topics = store.get('fiqh:topics') || await sb('fiqh_topics?select=slug,name,keywords&order=sort'); store.set('fiqh:topics', topics); } catch { /* */ }
    const tp = topics.filter((t) => words.some((w) => N.normAr(t.name).includes(w) || t.keywords.some((k) => N.normAr(k).includes(w) || w.includes(N.normAr(k)))));
    N.view.innerHTML = `
      <div class="card"><b>نتائج: «${esc(q)}»</b><p class="muted" style="margin:4px 0 0">البحث حالياً في الفهرس؛ البحث داخل نصوص الكتب يُفعَّل بعد فهرستها.</p></div>
      ${tp.length ? `<h3 class="dash-sec">🗂️ الأبواب الفقهية المتعلقة</h3><div class="chips" style="justify-content:flex-start">${tp.map((t) => `<span class="chip">${esc(t.name)}</span>`).join('')}</div>` : ''}
      <h3 class="dash-sec">📚 الكتب (${ar(books.length)})</h3>
      ${books.length ? books.map((b) => `<button class="fq-book" data-id="${b.id}"><b>${esc(b.title)}</b><small>${b.fiqh_authors ? esc(b.fiqh_authors.short_name) + ' • ' : ''}${MAD[b.madhhab] || ''}</small></button>`).join('') : '<div class="card muted center">لا توجد كتب مطابقة في الفهرس</div>'}
      <button class="btn ghost block" id="fqSave">🔖 حفظ هذا البحث</button>`;
    $$('[data-id]').forEach((b) => { b.onclick = () => go(`fqbook/${b.dataset.id}`); });
    $('#fqSave').onclick = () => { const S = store.get('fiqh:saved', []).filter((x) => x.q !== q); S.unshift({ q, t: Date.now() }); store.set('fiqh:saved', S); toast('حُفظ البحث'); };
  }
  function listView(key, empty, title) {
    const L = store.get(key, []);
    N.view.innerHTML = L.length ? `${L.map((x, i) => `<div class="pr-extra"><button class="fq-link" data-q="${esc(x.q)}">${esc(x.q)}</button><b><small class="muted">${new Date(x.t).toLocaleDateString('ar-EG')}</small> <button class="chip" data-x="${i}">✕</button></b></div>`).join('')}<button class="btn ghost block" id="clr" style="margin-top:10px">مسح ${title}</button>` : `<div class="card center muted">${empty}</div>`;
    $$('[data-q]').forEach((b) => { b.onclick = () => go(`fqs/${encodeURIComponent(b.dataset.q)}`); });
    $$('[data-x]').forEach((b) => { b.onclick = () => { const A = store.get(key, []); A.splice(+b.dataset.x, 1); store.set(key, A); listView(key, empty, title); }; });
    const c = $('#clr'); if (c) c.onclick = () => { if (confirm(`مسح ${title}؟`)) { store.set(key, []); listView(key, empty, title); } };
  }

  Object.assign(routes, {
    fiqh: { title: 'الموسوعة الفقهية', render: renderHome, back: 'home' },
    fqlib: { title: 'مكتبة الموسوعة', render: renderLib, back: 'fiqh' },
    fqbook: { title: 'كتاب', render: renderBook, back: 'fqlib' },
    fqs: { title: 'نتائج البحث', render: renderSearch, back: 'fiqh' },
    fqsaved: { title: 'الأسئلة المحفوظة', render: () => listView('fiqh:saved', 'لم تحفظ أي بحث بعد', 'المحفوظات'), back: 'fiqh' },
    fqhist: { title: 'سجل البحث', render: () => listView('fiqh:hist', 'لا يوجد سجل بحث', 'السجل'), back: 'fiqh' },
  });
  N.fiqh = { sb, catalog, MAD, FIELD };
});
