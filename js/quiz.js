/* الموسوعة الإسلامية | اختبر علمك
 * يعمل دون إنترنت بالكامل: الأسئلة ملفات محلية في data/quiz/ تُشحن مع التطبيق (لا API ولا Supabase)،
 * ويُحمَّل ملف التصنيف عند الحاجة فقط. كل تقدّم المستخدم محفوظ على جهازه (localStorage عبر N.store، مفاتيح qz:*).
 * مصدر الأسئلة وقواعد التحقق منها: scripts/quiz/README.md */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, esc, routes } = N;
  const LV = { 1: 'مبتدئ', 2: 'متوسط', 3: 'متقدم', 4: 'تحدي العلماء' };
  const TYPE = { mcq: 'اختيار من متعدد', tf: 'صح أم خطأ', cmp: 'أكمل', who: 'من القائل؟', mean: 'ما المقصود؟', ord: 'رتّب' };
  const QURAN_RX = /[ٱۡ۟ۥۦ]/; // حروف الرسم العثماني → خط المصحف

  // ---------- البيانات (محلية، تُحمَّل عند الحاجة) ----------
  let idxP = null;
  const cache = new Map();
  const index = () => (idxP = idxP || fetch('data/quiz/index.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch((e) => { idxP = null; throw e; }));
  async function cat(id) {
    if (cache.has(id)) return cache.get(id);
    const I = await index();
    const C = I.cats.find((c) => c.id === id);
    if (!C) return [];
    const p = fetch('data/quiz/' + C.f).then((r) => r.json()).then((list) => { list.forEach((q) => { q.c = id; }); return list; });
    cache.set(id, p);
    p.catch(() => cache.delete(id));
    return p;
  }
  async function byIds(refs) { // refs: [[cat, id]] → أسئلة بالترتيب نفسه
    const cats = [...new Set(refs.map((r) => r[0]))];
    const maps = {};
    await Promise.all(cats.map(async (c) => { maps[c] = new Map((await cat(c)).map((q) => [q.id, q])); }));
    return refs.map(([c, id]) => maps[c] && maps[c].get(id)).filter(Boolean);
  }
  const allCats = async () => (await Promise.all((await index()).cats.map((c) => cat(c.id)))).flat();

  // ---------- حالة المستخدم ----------
  // st[id] = [عدد مرات الظهور, عدد الصحيح, الصحيح المتتالي, آخر وقت, التصنيف, آخر إجابة صحيحة؟]
  const S = {
    st: () => store.get('qz:st', {}), setSt: (v) => store.set('qz:st', v),
    fav: () => store.get('qz:fav', []), setFav: (v) => store.set('qz:fav', v),
    rev: () => store.get('qz:rev', []), setRev: (v) => store.set('qz:rev', v),
    hist: () => store.get('qz:hist', []), setHist: (v) => store.set('qz:hist', v.slice(0, 60)),
    run: () => store.get('qz:run', null), setRun: (v) => store.set('qz:run', v),
    days: () => store.get('qz:days', []),
    xp: () => store.get('qz:xp', 0),
    ach: () => store.get('qz:ach', {}),
  };
  const isFav = (id) => S.fav().some((f) => f[1] === id);
  function toggleFav(q) {
    let f = S.fav();
    if (f.some((x) => x[1] === q.id)) { f = f.filter((x) => x[1] !== q.id); toast('أُزيل من المفضلة'); } else { f.unshift([q.c, q.id]); toast('أُضيف إلى المفضلة ⭐'); }
    S.setFav(f);
    return isFav(q.id);
  }
  function addDay() {
    const d = N.todayKey(); const days = S.days();
    if (days[days.length - 1] !== d) { days.push(d); store.set('qz:days', days.slice(-400)); }
  }
  function streak() {
    const set = new Set(S.days());
    const day = (n) => { const t = new Date(Date.now() - n * 864e5); return N.ymdIn(t, N.tz()).join('-'); };
    let n = set.has(day(0)) ? 0 : 1; let s = 0;
    while (set.has(day(n))) { s++; n++; }
    return s;
  }
  function record(q, ok) {
    const st = S.st(); const e = st[q.id] || [0, 0, 0, 0, q.c, 0];
    e[0]++; if (ok) { e[1]++; e[2]++; } else e[2] = 0;
    e[3] = Date.now(); e[4] = q.c; e[5] = ok ? 1 : 0;
    st[q.id] = e; S.setSt(st);
    if (!ok) S.setRev(S.rev().filter((x) => x[1] !== q.id)); // خطأ جديد → يعود إلى قائمة الأخطاء
    store.set('qz:xp', S.xp() + (ok ? 10 : 2));
    addDay();
  }
  function totals() {
    const st = S.st(); let seen = 0, right = 0, answered = 0; const per = {};
    for (const id in st) {
      const e = st[id]; answered++; seen += e[0]; right += e[1];
      const p = per[e[4]] = per[e[4]] || { seen: 0, right: 0, q: 0 }; p.seen += e[0]; p.right += e[1]; p.q++;
    }
    return { seen, right, answered, per, acc: seen ? right / seen : 0 };
  }
  const wrongList = () => { const st = S.st(); const rv = new Set(S.rev().map((x) => x[1])); return Object.keys(st).filter((id) => st[id][5] === 0 && !rv.has(id)).sort((a, b) => st[b][3] - st[a][3]).map((id) => [st[id][4], id]); };

  // ---------- الاختيار الذكي ----------
  // الأولوية: ما أخطأ فيه المستخدم ← ما لم يره ← ما أجاب عنه صحيحاً مرة أو مرتين؛ وما أجاب عنه صحيحاً ٣ مرات متتالية يُؤجَّل.
  function weight(q, st) {
    const e = st[q.id];
    if (!e) return 3;
    if (e[5] === 0) return 6;
    if (e[2] >= 3) return 0.05;
    return 1 / e[2];
  }
  function pick(pool, n) {
    const st = S.st(); const items = pool.map((q) => ({ q, k: Math.pow(Math.random(), 1 / weight(q, st)) }));
    return items.sort((a, b) => b.k - a.k).slice(0, n).map((x) => x.q);
  }
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- عرض النصوص ----------
  const qtext = (t) => esc(t).replace(/﴿([^﴾]*)﴾/g, '<span class="qz-qr">﴿$1﴾</span>');
  const optCls = (o) => (QURAN_RX.test(o) ? ' qz-qr' : '');
  function evidence(q) {
    const d = (q.d || []).map((x) => x.k === 'q'
      ? `<div class="qz-ev qz-ev-q"><span class="qz-qr">﴿${esc(x.x)}﴾</span> <small>${esc(x.r)}</small></div>`
      : `<div class="qz-ev qz-ev-h">«${esc(x.x)}» <small>— ${esc(x.r)}${x.g ? ` • الدرجة: ${esc(x.g)}` : ''}</small></div>`).join('');
    return d ? `<div class="qz-evs"><b>📚 الدليل</b>${d}</div>` : '';
  }
  function explain(q, chosen) {
    const why = (q.w && chosen != null && chosen !== q.a && q.w[chosen]) ? `<p class="qz-why">✖️ ${esc(q.w[chosen])}</p>` : '';
    return `<div class="qz-exp"><p>${qtext(q.e)}</p>${why}${evidence(q)}
      ${q.x ? `<p class="qz-khilaf">⚖️ <b>تنبيه:</b> ${esc(q.x)}</p>` : ''}
      <p class="qz-ref">📖 المرجع: ${esc(q.r)}</p></div>`;
  }
  const answerText = (q) => (q.t === 'ord' ? q.a.map((i, n) => `${ar(n + 1)}. ${q.o[i]}`).join('  ') : q.o[q.a]);
  function report(q) {
    N.shareText(`بلاغ عن ملاحظة في سؤال «اختبر علمك»\nالمعرّف: ${q.id}\nالسؤال: ${q.q}\nالإجابة المعتمدة: ${answerText(q)}\nالملاحظة: `);
  }
  function qSheet(q) { // عرض سؤال كامل مع إجابته (من القوائم والبحث)
    const sh = N.sheet(`<div class="qz">
      <div class="qz-meta"><span class="chip">${esc(TYPE[q.t] || '')}</span><span class="chip">${LV[q.l]}</span></div>
      <p class="quiz-q">${qtext(q.q)}</p>
      <div class="quiz-opts">${(q.t === 'ord' ? q.a.map((i) => q.o[i]) : q.o).map((o, k) => `<div class="quiz-opt ${q.t !== 'ord' && k === q.a ? 'right' : ''}${optCls(o)}">${q.t === 'ord' ? ar(k + 1) + '. ' : ''}${esc(o)}</div>`).join('')}</div>
      ${explain(q)}
      <div class="qz-row"><button class="btn ghost" id="sFav">${isFav(q.id) ? '★ في المفضلة' : '☆ أضف للمفضلة'}</button><button class="btn ghost" id="sRep">⚑ إبلاغ عن خطأ</button></div></div>`);
    $('#sFav', sh.el).onclick = (e) => { e.target.textContent = toggleFav(q) ? '★ في المفضلة' : '☆ أضف للمفضلة'; };
    $('#sRep', sh.el).onclick = () => report(q);
  }
  const loader = () => { N.view.innerHTML = '<div class="loader"></div>'; };
  const failed = () => { N.view.innerHTML = '<div class="card center"><p>تعذّر تحميل الأسئلة. أعد فتح القسم.</p></div>'; };
  const pct = (x) => `${ar(Math.round(x * 100))}٪`;
  const fmtDur = (ms) => { const s = Math.round(ms / 1000); return `<bdi dir="ltr">${ar(Math.floor(s / 60))}:${ar(String(s % 60).padStart(2, '0'))}</bdi>`; };

  // ---------- سؤال اليوم: ثابت طوال اليوم حسب تاريخ الجهاز ----------
  async function dailyQ() {
    const I = await index(); const d = N.todayKey();
    let h = 0; for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const dayN = Math.floor(Date.parse(d + 'T00:00:00Z') / 864e5);
    const C = I.cats[dayN % I.cats.length];
    const list = (await cat(C.id)).filter((q) => q.t !== 'ord' && q.l <= 3);
    return list[h % list.length];
  }

  // ---------- الرئيسية ----------
  async function renderHome() {
    loader();
    let I; try { I = await index(); } catch { return failed(); }
    const T = totals(); const run = S.run(); const s = streak(); const xp = S.xp();
    const lvl = Math.floor(Math.sqrt(xp / 60)) + 1;
    const wr = wrongList().length; const fv = S.fav().length;
    const weak = I.cats.filter((c) => T.per[c.id] && T.per[c.id].seen >= 5 && T.per[c.id].right / T.per[c.id].seen < 0.6);
    const dd = store.get('qz:day', {});
    N.view.innerHTML = `<div class="qz">
      <section class="qz-hero">
        <div class="qz-hero-t">اختبر معلوماتك الإسلامية</div>
        <div class="qz-hero-s">تعلّم شيئاً جديداً كل يوم</div>
        <div class="qz-stats">
          <div><b>${ar(I.total)}</b><small>سؤال متاح</small></div>
          <div><b>${ar(T.answered)}</b><small>أجبت عنه</small></div>
          <div><b>${T.seen ? pct(T.acc) : '—'}</b><small>نسبة الصواب</small></div>
          <div><b>${ar(s)}</b><small>يوم متتالٍ</small></div>
        </div>
        <div class="qz-xp"><span>المستوى ${ar(lvl)}</span><span class="mini-progress" style="flex:1"><span style="width:${Math.min(100, ((xp - 60 * (lvl - 1) ** 2) / (60 * lvl ** 2 - 60 * (lvl - 1) ** 2)) * 100)}%"></span></span><span>${ar(xp)} نقطة</span></div>
      </section>
      ${run ? `<button class="card qz-card qz-resume" data-go="qzrun"><span>⏯️</span><div><b>استكمل اختبارك</b><small class="muted">السؤال ${ar(run.i + 1)} من ${ar(run.ids.length)} • ${esc(run.title)}</small></div></button>` : ''}
      <button class="card qz-card qz-daily" data-go="qzday"><span>🌟</span><div><b>سؤال اليوم</b><small class="muted">${dd.d === N.todayKey() ? (dd.ok ? 'أجبت إجابة صحيحة اليوم ✓' : 'أجبت عنه اليوم، راجع الشرح') : 'سؤال جديد ينتظرك'}</small></div></button>
      <div class="qz-actions">
        <button class="qz-act" id="qMix"><span>🎯</span>اختبار شامل</button>
        <button class="qz-act" id="qSmart"><span>🧠</span>اختبار مخصّص لك</button>
        <button class="qz-act" data-go="qzwrong"><span>📝</span>أخطائي ${wr ? `<i>${ar(wr)}</i>` : ''}</button>
        <button class="qz-act" data-go="qzfav"><span>⭐</span>المفضلة ${fv ? `<i>${ar(fv)}</i>` : ''}</button>
      </div>
      ${weak.length ? `<div class="card qz-card qz-tip">💡 ننصحك بمراجعة: ${weak.map((c) => `<button class="chip" data-go="qzcat/${c.id}">${c.ic} ${esc(c.n)}</button>`).join(' ')}</div>` : ''}
      <h3 class="section-title">الأقسام</h3>
      <div class="qz-cats">${I.cats.map((c) => { const p = T.per[c.id]; const done = p ? p.q : 0; return `<button class="qz-cat" data-go="qzcat/${c.id}"><span class="qz-cat-ic">${c.ic}</span><b>${esc(c.n)}</b><small>${ar(c.count)} سؤال${done ? ` • أجبت ${ar(done)}` : ''}</small><span class="mini-progress"><span style="width:${(done / c.count) * 100}%"></span></span></button>`; }).join('')}</div>
      <div class="qz-links">
        <button class="chip" data-go="qzsearch">🔍 البحث في الأسئلة</button>
        <button class="chip" data-go="qzhist">📊 السجل والإحصائيات</button>
        <button class="chip" data-go="qzach">🏅 الإنجازات</button>
        <button class="chip" data-go="qzrev">✅ ما راجعته</button>
      </div>
      <p class="muted qz-note">الأسئلة موثّقة بالآيات (بالسورة ورقم الآية) والأحاديث (بالمصدر والدرجة)، ويُنبَّه على الخلاف الفقهي المعتبر. يعمل القسم كاملاً دون إنترنت.</p>
    </div>`;
    $$('[data-go]', N.view).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
    $('#qMix').onclick = () => startMixed();
    $('#qSmart').onclick = () => startSmart();
  }

  // ---------- صفحة التصنيف ----------
  async function renderCat(id) {
    loader();
    let I, list; try { I = await index(); list = await cat(id); } catch { return failed(); }
    const C = I.cats.find((c) => c.id === id);
    if (!C) return go('qz');
    N.setTitle(C.n);
    const p = totals().per[id];
    const tags = [...new Set(list.map((q) => q.k).filter(Boolean))];
    let lv = store.get('qz:lv', 0); let n = store.get('qz:n', 10); let tg = '';
    const draw = () => {
      const pool = list.filter((q) => (!tg || q.k === tg));
      const cnt = (l) => pool.filter((q) => !l || q.l === l || (l === 4 && q.l === 3 && !pool.some((x) => x.l === 4))).length;
      N.view.innerHTML = `<div class="qz">
        <section class="qz-hero qz-hero-sm"><div class="qz-hero-t">${C.ic} ${esc(C.n)}</div>
          <div class="qz-hero-s">${ar(C.count)} سؤال${p ? ` • أجبت عن ${ar(p.q)} • الصواب ${pct(p.right / p.seen)}` : ''}</div></section>
        <div class="card qz-card">
          <b>المستوى</b>
          <div class="qz-seg">${[0, 1, 2, 3, 4].map((l) => `<button data-l="${l}" class="${lv === l ? 'active' : ''}" ${cnt(l) ? '' : 'disabled'}>${l ? LV[l] : 'الكل'}<small>${ar(cnt(l))}</small></button>`).join('')}</div>
          ${lv === 4 && !pool.some((x) => x.l === 4) ? '<p class="muted qz-note">لا توجد أسئلة من مستوى «تحدي العلماء» في هذا القسم بعد، فيُختبر بأصعب المتاح (المتقدم).</p>' : ''}
          ${tags.length ? `<b>نوع الأسئلة</b><div class="qz-seg qz-seg-wrap"><button data-t="" class="${tg ? '' : 'active'}">الكل</button>${tags.map((t) => `<button data-t="${esc(t)}" class="${tg === t ? 'active' : ''}">${esc(t)}</button>`).join('')}</div>` : ''}
          <b>عدد الأسئلة</b>
          <div class="qz-seg">${[10, 20, 30].map((k) => `<button data-n="${k}" class="${n === k ? 'active' : ''}">${ar(k)}</button>`).join('')}</div>
          <button class="btn block qz-start" id="qGo">ابدأ الاختبار</button>
        </div>
        <p class="muted qz-note">لا يوجد وقت محدد للإجابة؛ فكّر بهدوء. تظهر الإجابة الصحيحة مع الشرح والدليل فور الإجابة.</p></div>`;
      $$('[data-l]').forEach((b) => b.onclick = () => { lv = +b.dataset.l; store.set('qz:lv', lv); draw(); });
      $$('[data-n]').forEach((b) => b.onclick = () => { n = +b.dataset.n; store.set('qz:n', n); draw(); });
      $$('[data-t]').forEach((b) => b.onclick = () => { tg = b.dataset.t; draw(); });
      $('#qGo').onclick = () => {
        let src = pool.filter((q) => !lv || q.l === lv);
        if (lv === 4 && !src.length) src = pool.filter((q) => q.l === 3);
        if (!src.length) return toast('لا توجد أسئلة بهذه الخيارات');
        start(pick(src, n), `${C.n}${lv ? ' • ' + LV[lv] : ''}`, id);
      };
    };
    draw();
  }

  // ---------- بدء الاختبارات ----------
  function start(qs, title, kind) {
    if (!qs.length) return toast('لا توجد أسئلة متاحة');
    const run = {
      title, kind, i: 0, el: 0, ts: Date.now(),
      ids: qs.map((q) => [q.c, q.id]),
      ord: qs.map((q) => (q.t === 'tf' ? [0, 1] : shuffle(q.o.map((_, k) => k)))),
      ans: [],
    };
    S.setRun(run);
    if (location.hash === '#/qzrun') renderRun(); else go('qzrun');
  }
  async function startMixed() {
    loader();
    const I = await index(); const n = store.get('qz:n', 10);
    const per = Math.max(1, Math.ceil(n / I.cats.length));
    const chosen = [];
    for (const c of shuffle(I.cats)) { if (chosen.length >= n) break; chosen.push(...pick((await cat(c.id)).filter((q) => q.l <= 3), per)); }
    start(shuffle(chosen).slice(0, n), 'اختبار شامل', 'mix');
  }
  async function startSmart() {
    loader();
    const I = await index(); const T = totals(); const n = store.get('qz:n', 10);
    const wrong = await byIds(wrongList().slice(0, Math.ceil(n / 2)));
    const weak = I.cats.map((c) => ({ c, a: T.per[c.id] ? T.per[c.id].right / T.per[c.id].seen : 0.5 })).sort((a, b) => a.a - b.a).slice(0, 3);
    let more = [];
    for (const w of weak) more.push(...(await cat(w.c.id)).filter((q) => q.l <= 3));
    const have = new Set(wrong.map((q) => q.id));
    more = pick(more.filter((q) => !have.has(q.id)), n - wrong.length);
    start(shuffle([...wrong, ...more]), 'اختبار مخصّص لك', 'smart');
    if (!wrong.length && !T.seen) toast('سيتكيّف الاختبار المخصّص مع أدائك بعد عدة اختبارات');
  }

  // ---------- شاشة السؤال ----------
  async function renderRun() {
    const run = S.run();
    if (!run) return go('qz');
    loader();
    let qs; try { qs = await byIds(run.ids); } catch { return failed(); }
    if (qs.length !== run.ids.length) { S.setRun(null); toast('تغيّرت الأسئلة بعد التحديث، ابدأ اختباراً جديداً'); return go('qz'); }
    N.setTitle(run.title);
    let qStart = Date.now();
    const show = () => {
      const r = S.run(); if (!r) return;
      if (r.i >= r.ids.length) return finish();
      const q = qs[r.i]; const order = r.ord[r.i];
      const done = r.ans[r.i];
      qStart = Date.now();
      N.view.innerHTML = `<div class="qz qz-run">
        <div class="quiz-top"><span>السؤال ${ar(r.i + 1)} من ${ar(r.ids.length)}</span><span class="mini-progress" style="flex:1"><span style="width:${(r.i / r.ids.length) * 100}%"></span></span>
          <button class="qz-star" id="qStar" aria-label="المفضلة">${isFav(q.id) ? '★' : '☆'}</button></div>
        <div class="card quiz-card qz-qcard">
          <div class="qz-meta"><span class="chip">${esc(TYPE[q.t] || '')}</span><span class="chip">${LV[q.l]}</span></div>
          <p class="quiz-q">${qtext(q.q)}</p>
          ${q.t === 'ord' ? `<p class="muted qz-note">اضغط على العناصر بالترتيب الصحيح ثم اضغط «تأكيد».</p>
            <div class="quiz-opts" id="qOpts">${order.map((k) => `<button class="quiz-opt qz-ord" data-k="${k}"><i></i>${esc(q.o[k])}</button>`).join('')}</div>
            <div class="qz-row"><button class="btn ghost" id="qReset">إعادة</button><button class="btn" id="qOk" disabled>تأكيد الترتيب</button></div>`
            : `<div class="quiz-opts" id="qOpts">${order.map((k) => `<button class="quiz-opt${optCls(q.o[k])}" data-k="${k}">${esc(q.o[k])}</button>`).join('')}</div>`}
          <div id="qFb"></div></div></div>`;
      $('#qStar').onclick = (e) => { e.target.textContent = toggleFav(q) ? '★' : '☆'; };
      const answer = (k) => {
        const r2 = S.run();
        const ok = q.t === 'ord' ? JSON.stringify(k) === JSON.stringify(q.a) : k === q.a;
        r2.ans[r2.i] = { k, ok }; r2.el += Math.min(Date.now() - qStart, 600000);
        S.setRun(r2); record(q, ok);
        navigator.vibrate && navigator.vibrate(ok ? 15 : [40, 40, 40]);
        feedback(r2.ans[r2.i]);
      };
      const feedback = (a) => {
        const card = $('.qz-qcard');
        card.classList.add(a.ok ? 'qz-ok' : 'qz-no');
        if (q.t === 'ord') {
          $$('.qz-ord').forEach((b) => { b.disabled = true; });
          $('#qReset') && $('#qReset').remove(); $('#qOk') && $('#qOk').remove();
          $('#qOpts').insertAdjacentHTML('afterend', `<div class="qz-ordans"><b>الترتيب الصحيح:</b>${q.a.map((i, n) => `<div>${ar(n + 1)}. ${esc(q.o[i])}</div>`).join('')}</div>`);
        } else {
          $$('#qOpts .quiz-opt').forEach((b) => { b.disabled = true; const k = +b.dataset.k; if (k === q.a) b.classList.add('right'); else if (k === a.k) b.classList.add('wrong'); });
        }
        const last = S.run().i + 1 >= qs.length;
        $('#qFb').innerHTML = `<p class="quiz-fb ${a.ok ? 'ok' : 'no'}">${a.ok ? '✅ إجابة صحيحة، بارك الله فيك' : '❌ إجابة غير صحيحة'}</p>
          ${explain(q, q.t === 'ord' ? null : a.k)}
          <div class="qz-row"><button class="btn ghost qz-rep" id="qRep">⚑ إبلاغ</button><button class="btn" id="qNext" style="flex:1">${last ? 'عرض النتيجة' : 'السؤال التالي'}</button></div>`;
        $('#qRep').onclick = () => report(q);
        $('#qNext').onclick = () => { const r3 = S.run(); r3.i++; S.setRun(r3); window.scrollTo(0, 0); show(); };
      };
      if (done) { feedback(done); return; }
      if (q.t === 'ord') {
        let seq = [];
        const upd = () => { $$('.qz-ord').forEach((b) => { const p = seq.indexOf(+b.dataset.k); b.querySelector('i').textContent = p >= 0 ? ar(p + 1) : ''; b.classList.toggle('picked', p >= 0); }); $('#qOk').disabled = seq.length !== q.o.length; };
        $$('.qz-ord').forEach((b) => b.onclick = () => { const k = +b.dataset.k; if (!seq.includes(k)) seq.push(k); upd(); });
        $('#qReset').onclick = () => { seq = []; upd(); };
        $('#qOk').onclick = () => answer(seq);
      } else {
        $$('#qOpts .quiz-opt').forEach((b) => b.onclick = () => answer(+b.dataset.k));
      }
    };
    const finish = () => {
      const r = S.run(); S.setRun(null);
      const ok = r.ans.filter((a) => a && a.ok).length;
      const h = { t: Date.now(), title: r.title, kind: r.kind, n: r.ids.length, ok, el: r.el, ids: r.ids, ans: r.ans.map((a) => [a.k, a.ok ? 1 : 0]) };
      S.setHist([h, ...S.hist()]);
      store.set('qz:xp', S.xp() + 20);
      checkAch(h);
      go('qzres/0');
    };
    show();
  }

  // ---------- النتائج ----------
  function rating(x) {
    if (x >= 0.9) return ['ممتاز', 'ما شاء الله، علم نافع بإذن الله'];
    if (x >= 0.75) return ['جيد جداً', 'أداء رائع، واصل التعلّم'];
    if (x >= 0.6) return ['جيد', 'بداية طيبة، راجع الأخطاء لتثبيت المعلومة'];
    return ['يحتاج إلى مراجعة', 'العلم بالتعلّم؛ راجع الشروح ثم أعد المحاولة'];
  }
  function bars(vals, labels) {
    return `<div class="bars">${vals.map((v, i) => `<div class="bar-col"><small>${pct(v)}</small><div class="bar"><span style="height:${Math.max(4, v * 100)}%;background:linear-gradient(var(--gold),var(--primary-2))"></span></div><small>${labels[i]}</small></div>`).join('')}</div>`;
  }
  async function renderRes(iStr) {
    const h = S.hist()[+iStr || 0];
    if (!h) return go('qz');
    loader();
    let qs; try { qs = await byIds(h.ids); } catch { return failed(); }
    const r = h.ok / h.n; const [rt, msg] = rating(r);
    const recent = S.hist().slice(0, 10).reverse();
    N.view.innerHTML = `<div class="qz">
      <section class="qz-hero qz-res"><div class="qz-score">${pct(r)}</div><div class="qz-hero-t">${rt}</div><div class="qz-hero-s">${msg}</div>
        <div class="qz-stats"><div><b>${ar(h.ok)} من ${ar(h.n)}</b><small>الدرجة</small></div><div><b>${ar(h.ok)}</b><small>صحيحة</small></div><div><b>${ar(h.n - h.ok)}</b><small>خاطئة</small></div><div><b>${fmtDur(h.el)}</b><small>الوقت</small></div></div></section>
      <div class="qz-row"><button class="btn" id="qAgain" style="flex:1">🔁 إعادة الاختبار</button><button class="btn ghost" data-go="qz">اختبار جديد</button></div>
      ${recent.length > 1 ? `<div class="card qz-card"><h3>📈 تطوّر مستواك (آخر ${ar(recent.length)} اختبارات)</h3>${bars(recent.map((x) => x.ok / x.n), recent.map((_, i) => ar(i + 1)))}</div>` : ''}
      <h3 class="section-title">مراجعة الأسئلة</h3>
      ${qs.map((q, i) => { const a = h.ans[i] || [null, 0]; return `<button class="card qz-card qz-revitem ${a[1] ? 'ok' : 'no'}" data-i="${i}"><span>${a[1] ? '✅' : '❌'}</span><div><b>${qtext(q.q)}</b>${a[1] ? '' : `<small class="muted">إجابتك: ${a[0] == null ? '—' : q.t === 'ord' ? a[0].map((k, n) => `${ar(n + 1)}. ${esc(q.o[k])}`).join('  ') : esc(q.o[a[0]])}<br>الصحيح: ${esc(answerText(q))}</small>`}</div></button>`; }).join('')}
    </div>`;
    $$('[data-go]', N.view).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
    $$('.qz-revitem').forEach((b) => b.onclick = () => qSheet(qs[+b.dataset.i]));
    $('#qAgain').onclick = () => start(qs, h.title, h.kind);
  }

  // ---------- سؤال اليوم ----------
  async function renderDay() {
    loader();
    let q; try { q = await dailyQ(); } catch { return failed(); }
    const d = N.todayKey(); const saved = store.get('qz:day', {});
    const order = saved.d === d && saved.ord ? saved.ord : (q.t === 'tf' ? [0, 1] : shuffle(q.o.map((_, k) => k)));
    if (saved.d !== d) store.set('qz:day', { d, id: q.id, ord: order });
    const I = await index(); const C = I.cats.find((c) => c.id === q.c);
    N.view.innerHTML = `<div class="qz">
      <section class="qz-hero qz-hero-sm"><div class="qz-hero-t">🌟 سؤال اليوم</div><div class="qz-hero-s">${N.hijri(new Date())} • ${C.ic} ${esc(C.n)}</div></section>
      <div class="card quiz-card qz-qcard"><p class="quiz-q">${qtext(q.q)}</p>
        <div class="quiz-opts" id="qOpts">${order.map((k) => `<button class="quiz-opt${optCls(q.o[k])}" data-k="${k}">${esc(q.o[k])}</button>`).join('')}</div><div id="qFb"></div></div></div>`;
    const reveal = (k) => {
      const ok = k === q.a;
      $('.qz-qcard').classList.add(ok ? 'qz-ok' : 'qz-no');
      $$('#qOpts .quiz-opt').forEach((b) => { b.disabled = true; const x = +b.dataset.k; if (x === q.a) b.classList.add('right'); else if (x === k) b.classList.add('wrong'); });
      $('#qFb').innerHTML = `<p class="quiz-fb ${ok ? 'ok' : 'no'}">${ok ? '✅ أحسنت!' : '❌ الإجابة الصحيحة: ' + esc(q.o[q.a])}</p>${explain(q, k)}
        <div class="qz-row"><button class="btn" id="qShare" style="flex:1">📤 مشاركة السؤال والإجابة</button><button class="btn ghost" id="qFav">${isFav(q.id) ? '★' : '☆'}</button></div>
        <p class="muted qz-note">سؤال جديد غداً بإذن الله.</p>`;
      $('#qShare').onclick = () => {
        const ev = (q.d || [])[0];
        N.shareText(`🌟 سؤال اليوم من «اختبر علمك»\n\n${q.q}\n\n✅ الإجابة: ${q.o[q.a]}\n\n${q.e}${ev ? `\n\n${ev.k === 'q' ? '﴿' + ev.x + '﴾ ' + ev.r : '«' + ev.x + '» — ' + ev.r}` : ''}\n📖 ${q.r}`);
      };
      $('#qFav').onclick = (e) => { e.target.textContent = toggleFav(q) ? '★' : '☆'; };
    };
    if (saved.d === d && saved.k != null) return reveal(saved.k);
    $$('#qOpts .quiz-opt').forEach((b) => b.onclick = () => {
      const k = +b.dataset.k; const ok = k === q.a;
      store.set('qz:day', { d, id: q.id, ord: order, k, ok });
      store.set('qz:dayn', store.get('qz:dayn', 0) + 1);
      record(q, ok); checkAch(); reveal(k);
    });
  }

  // ---------- القوائم: المفضلة، الأخطاء، ما رُوجع ----------
  async function renderList(kind) {
    loader();
    const conf = {
      fav: { title: 'الأسئلة المحفوظة', refs: S.fav(), empty: 'لم تحفظ أي سؤال بعد. اضغط ☆ أثناء الاختبار لحفظ السؤال.', test: 'اختبر المفضلة', act: 'إزالة' },
      wrong: { title: 'الأسئلة التي أخطأت فيها', refs: wrongList(), empty: 'لا توجد أخطاء تحتاج مراجعة. بارك الله فيك!', test: 'أعد اختبار أخطائك', act: 'تمت المراجعة ✓' },
      rev: { title: 'الأسئلة التي راجعتها', refs: S.rev(), empty: 'عند مراجعة خطأ اضغط «تمت المراجعة» ليظهر هنا.', act: 'إعادة إلى الأخطاء' },
    }[kind];
    N.setTitle(conf.title);
    let qs; try { qs = await byIds(conf.refs); } catch { return failed(); }
    if (!qs.length) { N.view.innerHTML = `<div class="qz"><div class="card center qz-card"><p style="font-size:2.4rem;margin:0">${kind === 'wrong' ? '🌿' : '📭'}</p><p>${conf.empty}</p><button class="btn" data-go="qz">العودة للقسم</button></div></div>`; $('[data-go]').onclick = () => go('qz'); return; }
    N.view.innerHTML = `<div class="qz">
      ${conf.test ? `<button class="btn block" id="qTest">${conf.test} (${ar(Math.min(qs.length, 30))})</button>` : ''}
      ${kind === 'rev' ? '<button class="btn ghost block" id="qClr">مسح القائمة</button>' : ''}
      <p class="muted qz-note">${ar(qs.length)} سؤال • اضغط على السؤال لعرض الإجابة والشرح.</p>
      ${qs.map((q, i) => `<div class="card qz-card qz-li"><button class="qz-li-q" data-i="${i}">${qtext(q.q)}</button><button class="chip" data-x="${i}">${conf.act}</button></div>`).join('')}</div>`;
    $$('.qz-li-q').forEach((b) => b.onclick = () => qSheet(qs[+b.dataset.i]));
    $$('[data-x]').forEach((b) => b.onclick = () => {
      const q = qs[+b.dataset.x];
      if (kind === 'fav') S.setFav(S.fav().filter((x) => x[1] !== q.id));
      if (kind === 'wrong') { S.setRev([[q.c, q.id], ...S.rev().filter((x) => x[1] !== q.id)]); toast('نُقل إلى «ما راجعته»'); }
      if (kind === 'rev') S.setRev(S.rev().filter((x) => x[1] !== q.id));
      renderList(kind);
    });
    if ($('#qTest')) $('#qTest').onclick = () => start(shuffle(qs).slice(0, 30), conf.test, kind);
    if ($('#qClr')) $('#qClr').onclick = () => { S.setRev([]); renderList(kind); };
  }

  // ---------- السجل والإحصائيات ----------
  async function renderHist() {
    loader();
    let I; try { I = await index(); } catch { return failed(); }
    const H = S.hist(); const T = totals();
    const recent = H.slice(0, 12).reverse();
    const cats = I.cats.filter((c) => T.per[c.id]);
    N.view.innerHTML = `<div class="qz">
      <div class="card qz-card"><h3>📊 ملخّص</h3><div class="qz-stats qz-stats-card">
        <div><b>${ar(H.length)}</b><small>اختبار</small></div><div><b>${ar(T.seen)}</b><small>إجابة</small></div><div><b>${T.seen ? pct(T.acc) : '—'}</b><small>الصواب</small></div><div><b>${ar(streak())}</b><small>يوم متتالٍ</small></div></div></div>
      ${recent.length ? `<div class="card qz-card"><h3>📈 تطوّر مستواك</h3>${bars(recent.map((x) => x.ok / x.n), recent.map((x) => new Date(x.t).toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric' })))}</div>` : ''}
      ${cats.length ? `<div class="card qz-card"><h3>🎯 مستواك في كل قسم</h3>${cats.map((c) => { const p = T.per[c.id]; const a = p.right / p.seen; return `<div class="qz-hbar"><span>${c.ic} ${esc(c.n)}</span><span class="mini-progress"><span style="width:${a * 100}%;${a < 0.6 ? 'background:#c0392b' : ''}"></span></span><b>${pct(a)}</b></div>`; }).join('')}</div>` : ''}
      <h3 class="section-title">الاختبارات السابقة</h3>
      ${H.length ? H.map((h, i) => `<button class="card qz-card qz-hrow" data-i="${i}"><div><b>${esc(h.title)}</b><small class="muted">${new Date(h.t).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })} • ${fmtDur(h.el)}</small></div><b class="qz-hpct">${ar(h.ok)} من ${ar(h.n)}</b></button>`).join('') : '<p class="muted center">لم تُكمل أي اختبار بعد.</p>'}
    </div>`;
    $$('.qz-hrow').forEach((b) => b.onclick = () => go('qzres/' + b.dataset.i));
  }

  // ---------- الإنجازات ----------
  const ACH = [
    ['first', '🌱', 'أول اختبار', 'أكملت اختبارك الأول', (c) => c.H >= 1],
    ['c10', '✨', '١٠ إجابات صحيحة', 'أجبت إجابة صحيحة عشر مرات', (c) => c.right >= 10],
    ['c100', '📗', '١٠٠ إجابة صحيحة', 'مائة إجابة صحيحة', (c) => c.right >= 100],
    ['hafiz', '📚', 'حافظ العلم', '٥٠٠ إجابة صحيحة', (c) => c.right >= 500],
    ['quran', '📖', 'متفوق القرآن', '١٠٠ إجابة صحيحة في القرآن وعلومه', (c) => c.cat('quran') >= 100],
    ['seerah', '🌴', 'خبير السيرة', '٣٠ إجابة صحيحة في السيرة بنسبة ٨٠٪ فأكثر', (c) => c.cat('seerah') >= 30 && c.acc('seerah') >= 0.8],
    ['all', '🧭', 'جولة في الأقسام', 'أجبت في كل الأقسام الخمسة عشر', (c) => c.cats >= 15],
    ['perfect', '🎯', 'علامة كاملة', 'أكملت اختباراً من ١٠ أسئلة أو أكثر دون خطأ', (c) => c.perfect],
    ['daily7', '🌟', 'رفيق سؤال اليوم', 'أجبت عن سؤال اليوم ٧ مرات', (c) => c.daily >= 7],
    ['s7', '🔥', 'سلسلة ٧ أيام', 'تعلّمت ٧ أيام متتالية', (c) => c.streak >= 7],
    ['s30', '🏆', 'سلسلة ٣٠ يوماً', 'تعلّمت ٣٠ يوماً متتالية', (c) => c.streak >= 30],
  ];
  function ctx(h) {
    const T = totals(); const H = S.hist();
    return {
      H: H.length, right: T.right, streak: streak(), daily: store.get('qz:dayn', 0), cats: Object.keys(T.per).length,
      perfect: store.get('qz:perfect', false) || !!(h && h.n >= 10 && h.ok === h.n),
      cat: (id) => (T.per[id] ? T.per[id].right : 0), acc: (id) => (T.per[id] ? T.per[id].right / T.per[id].seen : 0),
    };
  }
  function checkAch(h) {
    if (h && h.n >= 10 && h.ok === h.n) store.set('qz:perfect', true);
    const c = ctx(h); const got = S.ach(); let fresh = null;
    for (const [id, ic, name, , test] of ACH) if (!got[id] && test(c)) { got[id] = Date.now(); fresh = `${ic} ${name}`; }
    if (fresh) { store.set('qz:ach', got); setTimeout(() => toast(`🏅 إنجاز جديد: ${fresh}`), 600); }
  }
  function renderAch() {
    const got = S.ach(); const xp = S.xp(); const lvl = Math.floor(Math.sqrt(xp / 60)) + 1;
    N.view.innerHTML = `<div class="qz">
      <section class="qz-hero qz-hero-sm"><div class="qz-hero-t">🏅 الإنجازات</div><div class="qz-hero-s">المستوى ${ar(lvl)} • ${ar(xp)} نقطة • ${ar(Object.keys(got).length)} من ${ar(ACH.length)} شارة</div></section>
      <div class="qz-badges">${ACH.map(([id, ic, name, desc]) => `<div class="qz-badge ${got[id] ? 'on' : ''}"><span>${ic}</span><b>${name}</b><small>${desc}</small>${got[id] ? `<small class="qz-date">${new Date(got[id]).toLocaleDateString('ar-EG')}</small>` : ''}</div>`).join('')}</div>
      <p class="muted qz-note">النقاط والشارات وسيلة تشجيع على المداومة في طلب العلم، لا للتفاخر؛ «أحب الأعمال إلى الله أدومها وإن قلّ».</p></div>`;
  }

  // ---------- البحث ----------
  async function renderSearch() {
    loader();
    let I, all; try { I = await index(); all = await allCats(); } catch { return failed(); }
    const norm = N.normAr || ((t) => t);
    const nq = all.map((q) => norm(q.q + ' ' + q.o.join(' ')));
    let term = '', fc = '', fl = 0;
    N.view.innerHTML = `<div class="qz">
      <input class="search" id="qS" type="search" placeholder="ابحث في ${ar(all.length)} سؤال..." autocomplete="off">
      <div class="qz-filters"><select id="qC"><option value="">كل الأقسام</option>${I.cats.map((c) => `<option value="${c.id}">${c.ic} ${esc(c.n)}</option>`).join('')}</select>
      <select id="qL"><option value="0">كل المستويات</option>${[1, 2, 3, 4].map((l) => `<option value="${l}">${LV[l]}</option>`).join('')}</select></div>
      <div id="qR"></div></div>`;
    const draw = () => {
      const t = norm(term.trim());
      if (!t && !fc && !fl) { $('#qR').innerHTML = '<p class="muted center">اكتب كلمة أو اختر قسماً ومستوى.</p>'; return; }
      const res = [];
      for (let i = 0; i < all.length && res.length < 60; i++) {
        const q = all[i];
        if ((fc && q.c !== fc) || (fl && q.l !== fl) || (t && !nq[i].includes(t))) continue;
        res.push(q);
      }
      $('#qR').innerHTML = res.length ? `<p class="muted qz-note">${res.length >= 60 ? 'أول ٦٠ نتيجة' : ar(res.length) + ' نتيجة'}</p>${res.map((q, i) => `<button class="card qz-card qz-li-q" data-i="${i}">${qtext(q.q)}<small class="muted"> • ${LV[q.l]}</small></button>`).join('')}` : '<p class="muted center">لا توجد نتائج.</p>';
      $$('#qR [data-i]').forEach((b) => b.onclick = () => qSheet(res[+b.dataset.i]));
    };
    let tm;
    $('#qS').oninput = (e) => { term = e.target.value; clearTimeout(tm); tm = setTimeout(draw, 200); };
    $('#qC').onchange = (e) => { fc = e.target.value; draw(); };
    $('#qL').onchange = (e) => { fl = +e.target.value; draw(); };
    draw();
  }

  Object.assign(routes, {
    qz: { title: 'اختبر علمك', render: renderHome, back: 'home' },
    qzcat: { title: 'اختبر علمك', render: renderCat, back: 'qz' },
    qzrun: { title: 'الاختبار', render: renderRun, back: 'qz' },
    qzres: { title: 'النتيجة', render: renderRes, back: 'qz' },
    qzday: { title: 'سؤال اليوم', render: renderDay, back: 'qz' },
    qzfav: { title: 'المفضلة', render: () => renderList('fav'), back: 'qz' },
    qzwrong: { title: 'أخطائي', render: () => renderList('wrong'), back: 'qz' },
    qzrev: { title: 'ما راجعته', render: () => renderList('rev'), back: 'qz' },
    qzhist: { title: 'السجل والإحصائيات', render: renderHist, back: 'qz' },
    qzach: { title: 'الإنجازات', render: renderAch, back: 'qz' },
    qzsearch: { title: 'البحث في الأسئلة', render: renderSearch, back: 'qz' },
  });

  // بطاقة في الرئيسية: سؤال اليوم أو استكمال اختبار
  N.homeExtras.push((root) => {
    const run = S.run(); const dd = store.get('qz:day', {}); const today = dd.d === N.todayKey() && dd.k != null;
    if (!run && today) return;
    const d = document.createElement('div');
    d.innerHTML = `<div class="card continue"><div style="min-width:0"><small class="muted">🎯 اختبر علمك</small><br><b>${run ? 'استكمل اختبارك' : 'سؤال اليوم ينتظرك'}</b><br><small class="muted">${run ? `السؤال ${ar(run.i + 1)} من ${ar(run.ids.length)}` : 'سؤال إسلامي جديد كل يوم بشرحه ودليله'}</small></div><button class="btn">${run ? 'متابعة' : 'أجب الآن'}</button></div>`;
    $('button', d).onclick = () => go(run ? 'qzrun' : 'qzday');
    root.appendChild(d);
  });
});
