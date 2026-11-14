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
    ['ask', '💬', 'اسأل الموسوعة', 'سؤال بلغتك وإجابة من نصوص الكتب بتوثيقها', 0],
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
        <small class="fq-note">يبحث داخل نصوص الكتب المفهرسة وفي أسماء الكتب والمؤلفين. ضع العبارة بين علامتي تنصيص "…" للبحث عنها كما هي.</small></section>
      <div class="fq-grid">${TILES.map(([k, ic, t, d, ph]) => `<button class="fq-tile ${ph ? 'soon' : ''}" data-k="${k}" data-ph="${ph}"><span class="fq-ic">${ic}</span><b>${t}</b><small>${ph ? `قيد الإنشاء — المرحلة ${ar(ph)}` : d}</small></button>`).join('')}</div>
      ${H.length ? `<h3 class="dash-sec">🔎 عمليات بحثك الأخيرة</h3><div class="chips" style="justify-content:flex-start">${H.slice(0, 8).map((x) => `<button class="chip" data-q="${esc(x.q)}">${esc(x.q)}</button>`).join('')}</div>` : ''}
      <div id="fqTop"></div>
      <div class="card" id="fqStats"><div class="loader" style="margin:10px auto"></div></div>
      <div class="card calc-disc"><b>⚖️ منهج الموسوعة</b><p>تُعرض النصوص من مصادرها الأصلية منسوبة إلى الكتاب والطبعة والجزء والصفحة، ولا يُنسب قول إلى مذهب دون مرجع. ما تعرضه الموسوعة مادة علمية للبحث وليس فتوى؛ والمسائل الخاصة يُرجع فيها إلى المفتين ودور الإفتاء.</p></div>`;
    $$('.fq-tile').forEach((b) => { b.onclick = () => {
      const k = b.dataset.k; const ph = +b.dataset.ph;
      if (ph) { toast(`هذا القسم يُبنى في المرحلة ${ar(ph)} بإذن الله`); return; }
      const R = { ask: 'fqask', lib: 'fqlib', contract: 'c/contract', quran: 'quran', hadith: 'hadith', fatawa: 'fqlib/fatawa', saved: 'fqsaved', hist: 'fqhist' };
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
    rpc('fiqh_top_searches', { days: 30, lim: 10 }).then((T) => {
      const el = $('#fqTop'); if (!el || !T || !T.length) return;
      el.innerHTML = `<h3 class="dash-sec">🔥 الأكثر بحثاً</h3><div class="chips" style="justify-content:flex-start">${T.map((x) => `<button class="chip" data-q="${esc(x.q)}">${esc(x.q)}</button>`).join('')}</div>`;
      $$('[data-q]', el).forEach((b) => { b.onclick = () => go(`fqs/${encodeURIComponent(b.dataset.q)}`); });
    }).catch(() => {});
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
      ${b.index_status === 'indexed' ? `<button class="btn block" id="fqRead" style="margin-bottom:12px">📖 تصفّح الكتاب (${ar(b.indexed_chunks)} صفحة مفهرسة)</button>` : ''}
      <div class="card calc-disc"><p>${b.index_status === 'metadata_only' ? 'هذا الكتاب لا يُنسخ نصه داخل التطبيق احتراماً لحقوق ناشره؛ ويمكنك قراءته من مصدره الرسمي.' : b.index_status === 'indexed' ? 'النص مفهرس ويظهر في البحث؛ وكل صفحة موثقة بالجزء والصفحة من الطبعة المذكورة.' : 'النص متاح بترخيص مفتوح وسيُضاف إلى البحث داخل الموسوعة بعد فهرسته ومراجعة جودته.'}</p></div>`;
    const rd = $('#fqRead'); if (rd) rd.onclick = () => go(`fqread/${b.id}/${store.get(`fiqh:pos:${b.id}`, 1)}`);
  }

  // ---------- قارئ الكتاب (صفحة بصفحة) ----------
  const cite = (b, c) => {
    const a = b.fiqh_authors;
    const hadith = !c.page && (c.body.match(/【(\d+)\s*-\s*】/) || [])[1];
    const loc = c.page ? `${c.vol ? `ج${ar(c.vol)} ` : ''}ص${ar(c.page)}` : hadith ? `الحديث رقم ${ar(hadith)}` : '';
    return `${b.title}${a ? ` — ${a.short_name}` : ''}، ${loc}${b.publisher ? ` (ط. ${b.publisher}${b.pub_year ? `، ${b.pub_year}` : ''})` : ''}`;
  };
  async function renderRead(id, seqA, qA) {
    let d; try { d = await catalog(); } catch { N.view.innerHTML = '<div class="card center">تعذّر التحميل</div>'; return; }
    const b = d.find((x) => String(x.id) === String(id)); if (!b) { go('fqlib'); return; }
    N.setTitle(b.title.length > 24 ? b.title.slice(0, 24) + '…' : b.title);
    const seq = Math.max(1, parseInt(seqA, 10) || 1);
    N.view.innerHTML = '<div class="loader" style="margin:30px auto"></div>';
    let c;
    try { const r = await sb(`fiqh_chunks?select=seq,vol,page,heading,body&book_id=eq.${b.id}&seq=eq.${seq}`); c = r[0]; } catch { N.view.innerHTML = '<div class="card center">تعذّر تحميل الصفحة؛ تحقق من الاتصال.</div>'; return; }
    if (!c) { N.view.innerHTML = '<div class="card center">لا توجد صفحة بهذا الرقم</div>'; return; }
    store.set(`fiqh:pos:${b.id}`, seq);
    const total = b.indexed_chunks || seq;
    const hq = qA ? decodeURIComponent(qA) : ''; const hrx = hq ? termRx(hq) : null;
    let body = esc(c.body.replace(/<[^>]+>/g, ''));
    if (hrx) body = body.replace(hrx, '<mark>$1</mark>');
    body = body.replace(/【([^】]*)】/g, '<b class="fq-h">$1</b>');
    N.view.innerHTML = `
      ${hq ? `<div class="fq-from"><button class="fq-link" id="fqBackS">↩ العودة لنتائج «${esc(hq)}»</button></div>` : ''}
      <div class="fq-read-top">${c.heading ? `<span>${esc(c.heading)}</span>` : ''}<span>${c.page ? `${c.vol ? `الجزء ${ar(c.vol)} • ` : ''}الصفحة ${ar(c.page)}` : `مقطع ${ar(seq)}`}</span></div>
      <article class="card fq-page">${body}</article>
      <div class="card fq-cite"><small class="muted">التوثيق:</small><p>${esc(cite(b, c))}</p><div class="fq-links"><button class="btn ghost" id="fqCp">📋 نسخ التوثيق</button><button class="btn ghost" id="fqSh">📤 مشاركة النص</button></div></div>
      <div class="fq-nav"><button class="btn ghost" id="fqPrev" ${seq <= 1 ? 'disabled' : ''}>→ السابقة</button><span class="muted">${ar(seq)} / ${ar(total)}</span><button class="btn ghost" id="fqNext" ${seq >= total ? 'disabled' : ''}>التالية ←</button></div>
      ${b.has_page_numbers ? `<form class="fq-jump" id="fqJ"><input class="calc-in" id="fqJv" inputmode="numeric" placeholder="الجزء" value="${c.vol || ''}"><input class="calc-in" id="fqJp" inputmode="numeric" placeholder="الصفحة"><button class="btn">انتقال</button></form>` : ''}`;
    $('#fqPrev').onclick = () => go(`fqread/${b.id}/${seq - 1}${qA ? `/${qA}` : ''}`);
    $('#fqNext').onclick = () => go(`fqread/${b.id}/${seq + 1}${qA ? `/${qA}` : ''}`);
    const bs = $('#fqBackS'); if (bs) bs.onclick = () => go(`fqs/${qA}`);
    const mk = $('.fq-page mark'); if (mk) setTimeout(() => mk.scrollIntoView({ block: 'center' }), 50);
    $('#fqCp').onclick = async () => { try { await navigator.clipboard.writeText(cite(b, c)); toast('نُسخ التوثيق'); } catch { toast(cite(b, c)); } };
    $('#fqSh').onclick = () => N.shareText(`${c.body.replace(/<[^>]+>/g, '').replace(/【|】/g, '')}\n\n— ${cite(b, c)}`);
    const J = $('#fqJ');
    if (J) J.onsubmit = async (e) => {
      e.preventDefault(); const v = parseInt($('#fqJv').value, 10); const pg = parseInt($('#fqJp').value, 10);
      if (!pg) { toast('أدخل رقم الصفحة'); return; }
      try { const r = await sb(`fiqh_chunks?select=seq&book_id=eq.${b.id}${v ? `&vol=eq.${v}` : ''}&page=gte.${pg}&order=seq&limit=1`); if (r[0]) go(`fqread/${b.id}/${r[0].seq}`); else toast('الصفحة غير موجودة'); } catch { toast('تعذّر الاتصال'); }
    };
  }

  // ---------- محرك البحث داخل النصوص (المرحلة الثالثة) ----------
  async function rpc(fn, args) {
    const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.status === 204 ? null : r.json();
  }
  // نمط تظليل مرن: يقبل السوابق (و، ف، ب، ال…) وصور الألف والتاء المربوطة والتشكيل
  const PFX = '(?:وال|فال|بال|كال|لل|ال|و|ف|ب|ك|ل)?';
  const MARK = '[ً-ْٰـ]*';
  const CLS = { 'ا': '[اأإآٱ]', 'ه': '[هة]', 'ي': '[يى]', 'و': '[وؤ]' };
  function termRx(q) {
    const words = N.normAr(q.replace(/["()|\-]/g, ' ')).split(/\s+/).filter((w) => w.length > 1 && !['او', 'أو', 'or', 'و'].includes(w))
      .map((w) => w.replace(/^(وال|فال|بال|كال|لل|ال)(?=..)/, ''))
      .map((w) => (w.length > 4 ? w.slice(0, -1) : w));
    if (!words.length) return null;
    const pat = words.map((w) => PFX + [...w].map((ch) => (CLS[ch] || ch) + MARK).join('') + '[ء-يً-ْ]*');
    return new RegExp(`(${pat.join('|')})`, 'g');
  }
  function snippet(body, rx, len = 260) {
    const clean = String(body).replace(/<[^>]+>/g, '').replace(/【([^】]*)】/g, '«$1» ');
    let i = 0;
    if (rx) { rx.lastIndex = 0; const m = rx.exec(clean); if (m) i = Math.max(0, m.index - 90); }
    let t = clean.slice(i, i + len);
    if (i > 0) t = '…' + t.replace(/^\S*\s/, '');
    if (i + len < clean.length) t = t.replace(/\s\S*$/, '') + '…';
    t = esc(t);
    return rx ? t.replace(rx, '<mark>$1</mark>') : t;
  }
  const MODES = [['all', 'كل الكلمات'], ['phrase', 'عبارة مطابقة'], ['any', 'أي كلمة']];
  async function renderSearch(qEnc) {
    const q = decodeURIComponent(qEnc || '');
    addHist(q);
    const st = { mode: store.get('fiqh:mode', 'all'), mad: null, book: null, off: 0, rows: [], total: 0 };
    let d = []; try { d = await catalog(); } catch { /* */ }
    const BK = Object.fromEntries(d.map((b) => [b.id, b]));
    const rx = termRx(q);
    rpc('fiqh_log_search', { q }).catch(() => {});
    // الكتب المطابقة بالاسم/المؤلف + الأبواب
    const nq = N.normAr(q); const ws = nq.split(/\s+/).filter((w) => w.length > 1);
    const bookHits = d.filter((b) => ws.every((w) => N.normAr(`${b.title} ${b.fiqh_authors ? b.fiqh_authors.name : ''}`).includes(w)));
    let topics = [];
    try { topics = store.get('fiqh:topics') || await sb('fiqh_topics?select=slug,name,keywords&order=sort'); store.set('fiqh:topics', topics); } catch { /* */ }
    const tp = topics.filter((t) => ws.some((w) => N.normAr(t.name).includes(w) || t.keywords.some((k) => { const nk = N.normAr(k); return nk.includes(w) || w.includes(nk); })));
    N.view.innerHTML = `
      <form class="fq-search fq-search2" id="fqF"><input id="fqQ" type="search" value="${esc(q)}"><button class="btn">بحث</button></form>
      <div class="seg fq-modes" id="fqM">${MODES.map(([k, t]) => `<button data-m="${k}" class="${st.mode === k ? 'active' : ''}">${t}</button>`).join('')}</div>
      ${bookHits.length ? `<h3 class="dash-sec">📚 كتب بهذا الاسم</h3>${bookHits.slice(0, 4).map((b) => `<button class="fq-book" data-id="${b.id}"><b>${esc(b.title)}</b><small>${b.fiqh_authors ? esc(b.fiqh_authors.short_name) + ' • ' : ''}${MAD[b.madhhab] || ''}</small></button>`).join('')}` : ''}
      ${tp.length ? `<div class="chips" style="justify-content:flex-start;margin:6px 0">${tp.map((t) => `<span class="chip">🗂️ ${esc(t.name)}</span>`).join('')}</div>` : ''}
      <div id="fqFac"></div>
      <div id="fqRes"><div class="loader" style="margin:24px auto"></div></div>
      <button class="btn ghost block" id="fqSave">🔖 حفظ هذا البحث</button>`;
    $('#fqF').onsubmit = (e) => { e.preventDefault(); const v = $('#fqQ').value.trim(); if (v.length > 1) go(`fqs/${encodeURIComponent(v)}`); };
    $$('[data-id]').forEach((b) => { b.onclick = () => go(`fqbook/${b.dataset.id}`); });
    $('#fqSave').onclick = () => { const S = store.get('fiqh:saved', []).filter((x) => x.q !== q); S.unshift({ q, t: Date.now() }); store.set('fiqh:saved', S); toast('حُفظ البحث'); };
    $$('#fqM button').forEach((b) => { b.onclick = () => { st.mode = b.dataset.m; store.set('fiqh:mode', st.mode); $$('#fqM button').forEach((x) => x.classList.toggle('active', x === b)); st.mad = null; st.book = null; load(true); }; });
    async function facets() {
      const el = $('#fqFac'); if (!el) return;
      try {
        const F = await rpc('fiqh_search_facets', { q, p_mode: st.mode });
        const byMad = {}; F.forEach((f) => { const m = (BK[f.book_id] || {}).madhhab || 'other'; byMad[m] = (byMad[m] || 0) + f.n; });
        el.innerHTML = F.length ? `<div class="chips fq-chips"><button class="chip ${!st.mad && !st.book ? 'active' : ''}" data-fm="">الكل</button>${Object.entries(byMad).map(([m, n]) => `<button class="chip ${st.mad === m ? 'active' : ''}" data-fm="${m}">${MAD[m] || m} (${ar(n)})</button>`).join('')}</div>
          <div class="chips fq-chips">${F.sort((a2, b2) => b2.n - a2.n).map((f) => `<button class="chip ${st.book === f.book_id ? 'active' : ''}" data-fb="${f.book_id}">${esc(((BK[f.book_id] || {}).title || '').split(' ').slice(0, 3).join(' '))} (${ar(f.n)})</button>`).join('')}</div>` : '';
        $$('[data-fm]', el).forEach((b) => { b.onclick = () => { st.mad = b.dataset.fm || null; st.book = null; load(true); }; });
        $$('[data-fb]', el).forEach((b) => { b.onclick = () => { st.book = +b.dataset.fb; st.mad = null; load(true); }; });
      } catch { el.innerHTML = ''; }
    }
    async function load(reset) {
      if (reset) { st.off = 0; st.rows = []; facets(); }
      const el = $('#fqRes'); if (!el) return;
      if (reset) el.innerHTML = '<div class="loader" style="margin:24px auto"></div>';
      let R;
      try { R = await rpc('fiqh_search', { q, p_madhhab: st.mad, p_book: st.book, p_mode: st.mode, p_limit: 20, p_offset: st.off }); }
      catch { el.innerHTML = '<div class="card center">تعذّر البحث؛ تحقق من الاتصال بالإنترنت.</div>'; return; }
      st.rows = st.rows.concat(R); st.total = R.length ? R[0].total : (reset ? 0 : st.total); st.off += R.length;
      if (!st.rows.length) {
        el.innerHTML = `<div class="card"><b>لا توجد نتائج في النصوص المفهرسة.</b><p class="muted" style="margin:6px 0 0;line-height:1.8">جرّب: كلمة أقصر، أو صيغة «أي كلمة»، أو مصطلحاً فقهياً مرادفاً (مثل «التقسيط» أو «البيع لأجل»). البحث الآن في ${ar(d.filter((b) => b.index_status === 'indexed').length)} كتب مفهرسة.</p></div>`;
        return;
      }
      el.innerHTML = `<p class="muted" style="margin:8px 0">${ar(st.total)} صفحة مطابقة${st.total > 400 ? ' • رُتّبت الصفحات التي يرد اللفظ في عناوينها أولاً؛ أضف كلمات لتدقيق الترتيب' : ' • مرتبة حسب الصلة'}</p>
        ${st.rows.map((r) => { const b = BK[r.book_id] || { title: '', madhhab: '' }; const a = b.fiqh_authors; return `<button class="fq-hit" data-r="${r.book_id}/${r.seq}"><span class="fq-hit-h"><b>${esc(b.title.split(' ').slice(0, 4).join(' '))}</b><small>${a ? esc(a.short_name) + ' • ' : ''}${MAD[b.madhhab] || ''} • ${r.page ? `${r.vol ? `ج${ar(r.vol)} ` : ''}ص${ar(r.page)}` : `مقطع ${ar(r.seq)}`}</small></span>${r.heading ? `<span class="fq-hit-t">${esc(r.heading)}</span>` : ''}<span class="fq-hit-s">${snippet(r.body, rx)}</span></button>`; }).join('')}
        ${st.off < st.total ? '<button class="btn ghost block" id="fqMore">عرض المزيد</button>' : ''}`;
      $$('[data-r]', el).forEach((x) => { x.onclick = () => go(`fqread/${x.dataset.r}/${encodeURIComponent(q)}`); });
      const mo = $('#fqMore'); if (mo) mo.onclick = () => { mo.disabled = true; mo.textContent = 'جارٍ التحميل…'; load(false); };
    }
    load(true);
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
    fqread: { title: 'قراءة', render: renderRead, back: 'fqlib' },
    fqs: { title: 'نتائج البحث', render: renderSearch, back: 'fiqh' },
    fqsaved: { title: 'الأسئلة المحفوظة', render: () => listView('fiqh:saved', 'لم تحفظ أي بحث بعد', 'المحفوظات'), back: 'fiqh' },
    fqhist: { title: 'سجل البحث', render: () => listView('fiqh:hist', 'لا يوجد سجل بحث', 'السجل'), back: 'fiqh' },
  });
  N.fiqh = { sb, rpc, catalog, cite, termRx, snippet, MAD, FIELD };
});
