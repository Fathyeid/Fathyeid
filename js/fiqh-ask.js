/* الموسوعة الفقهية — المرحلة الرابعة: «اسأل الموسوعة»
 * إجابة موثقة دون ذكاء اصطناعي توليدي: يُحلَّل السؤال بقاموس مصطلحات (فصحى وعامية ومصطلحات معاصرة)،
 * ثم تُسترجع أفضل الصفحات من كل كتاب مفهرس (fiqh_ask)، وتُعرض النصوص كما هي منسوبة إلى الكتاب والجزء والصفحة،
 * مع الأدلة التي أوردها المؤلفون، ودرجة اكتمال المصادر. لا يُستنتج قول لمذهب دون نص.
 */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const F = N.fiqh; if (!F) return;
  const { $, $$, store, toast, go, ar, esc, routes } = N;

  // كلمات لا تدخل في البحث (أدوات استفهام وعامية)
  const STOP = new Set(('هل يجوز ما حكم في من على عن الى إلى مع او أو ثم لو اذا إذا ان أن إن كان يكون هو هي هم انا أنا انت أنت ده دي دا ايه إيه اللي الذي التي '
    + 'ينفع يصح ينفعش حلال حرام عايز عاوز عشان علشان ازاي إزاي كده كدا بقى بقي امتى إمتى ليه لماذا كيف ماذا متى ممكن لا لم لن قد كل بعض شيء حاجة حاجه '
    + 'وهل فهل وما الحكم الشرعي شرعا شرعاً سؤال افيدوني أفيدوني جزاكم الله خيرا خير يا شيخ '
    + 'عليه عليها عليهم منه منها فيه فيها له لها اخذ أخذ اعمل أعمل عملت معملتش مش مفيش بعد قبل كامل كاملة جدا جداً عندي عنده عندها واحد واحدة').split(/\s+/).map((w) => N.normAr(w)));
  // مفاهيم معاصرة/عامية ← مصطلحات الفقه في الكتب (البحث الدلالي المحلي)
  const CONCEPTS = [
    { re: /قسط|اقساط|أقساط|تقسيط|بالتقسيط/, add: ['بيع', 'أجل', 'نسيئة'], topic: 'buyu', label: 'البيع بالتقسيط (البيع إلى أجل)' },
    { re: /قبل (ما )?(اسدد|أسدد|يسدد|اخلص|أخلص|سداد|دفع|ادفع|أدفع)|قبل السداد|قبل الدفع|قبل القبض|قبل ما استلم|قبل ما أستلم|قبل الاستلام/, add: ['قبل قبضه', 'نقد الثمن'], label: 'البيع قبل القبض أو قبل نقد الثمن' },
    { re: /فوايد|فوائد|فايده|فائدة|بنك|بنوك|مصرف/, add: ['ربا', 'قرض', 'زيادة'], topic: 'riba', label: 'الفوائد المصرفية (الربا في القرض)', modern: true },
    { re: /شهاد(ه|ة|ات) (استثمار|ادخار)|وديعه|وديعة|ودائع/, add: ['قرض', 'ربا', 'زيادة'], topic: 'riba', label: 'الودائع والشهادات البنكية', modern: true },
    { re: /سلف(ه|ة)?|قرض|استلف|أستلف|دين|ديون/, add: ['قرض', 'دين'], topic: 'duyun', label: 'القرض والدين' },
    { re: /غرام(ه|ة) تاخير|غرامة تأخير|تاخير|تأخير/, add: ['زيادة', 'دين', 'أجل'], label: 'الزيادة على الدين مقابل التأخير' },
    { re: /ذهب|دهب|فضه|فضة|عمله|عملة|دولار|صرف/, add: ['صرف', 'ذهب', 'يدا بيد'], topic: 'riba', label: 'الصرف وبيع الذهب' },
    { re: /عمول(ه|ة)|سمسار|سمسره|سمسرة|وسيط|واسطة/, add: ['سمسرة', 'جعل', 'أجرة'], topic: 'ijara', label: 'العمولة والسمسرة' },
    { re: /مرابح(ه|ة)/, add: ['مرابحة', 'بيع', 'رأس المال'], topic: 'buyu', label: 'بيع المرابحة' },
    { re: /ايجار|إيجار|اجار|أجرة|اجره|استئجار|مستأجر|ايجار منتهي/, add: ['إجارة', 'أجرة'], topic: 'ijara', label: 'الإجارة' },
    { re: /شرك(ه|ة)|شريك|مضارب(ه|ة)|استثمار/, add: ['شركة', 'مضاربة', 'ربح'], topic: 'sharikat', label: 'الشركة والمضاربة' },
    { re: /عربون/, add: ['عربون', 'بيع'], topic: 'buyu', label: 'بيع العربون' },
    { re: /تامين|تأمين/, add: ['ضمان', 'غرر'], label: 'التأمين', modern: true },
    { re: /ميراث|ورث|ورثه|ورثة|تركه|تركة/, add: ['ميراث', 'فرائض', 'تركة'], topic: 'mawarith', label: 'الميراث' },
    { re: /زكا(ه|ة)|نصاب/, add: ['زكاة', 'نصاب', 'حول'], topic: 'zakat', label: 'الزكاة' },
    { re: /طلق|طلاق|طالق/, add: ['طلاق'], topic: 'talaq', label: 'الطلاق' },
    { re: /صلا(ه|ة)|صليت|اصلي|أصلي/, add: ['صلاة'], topic: 'salah', label: 'الصلاة' },
    { re: /صيام|صوم|صايم|صائم|رمضان|فطرت|افطر|أفطر/, add: ['صوم'], topic: 'siyam', label: 'الصيام' },
    { re: /وضوء|اتوضا|أتوضأ|توضأ/, add: ['وضوء'], topic: 'tahara', label: 'الوضوء' },
    { re: /حيض|حايض|حائض|دورة شهرية/, add: ['حيض'], topic: 'tahara', label: 'الحيض' },
    { re: /نذر|نذرت|يمين|حلفت|حلف/, add: ['يمين', 'كفارة', 'نذر'], topic: 'ayman', label: 'الأيمان والنذور' },
  ];
  const TOOLS = { buyu: ['c/taqsit', 'حاسبة التقسيط'], riba: ['c/contract', 'فاحص العقود والمعاملات'], duyun: ['c/dayn', 'سجل الديون'], ijara: ['c/ijara', 'حاسبة الإجارة'], sharikat: ['c/mudaraba', 'حاسبة المضاربة'], mawarith: ['c/mirath', 'حاسبة المواريث'], zakat: ['c/zakat2', 'حاسبة الزكاة'], ayman: ['c/kaffara', 'حاسبة الكفارات'], siyam: ['c/qsawm', 'قضاء الصيام'] };
  const STRIP = (t) => String(t || '').replace(/<[^>]+>/g, '');

  function analyze(q) {
    const nq = N.normAr(q);
    const hit = CONCEPTS.filter((c) => c.re.test(nq) || c.re.test(q));
    const words = nq.replace(/[؟?!.,،:;«»"()]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w) && !STOP.has(w.replace(/^[وف]/, '')))
      .filter((w) => !hit.some((c) => c.re.test(w))) // الكلمة التي دلّت على مفهوم استُبدلت بمصطلحاته
      .map((w) => w.replace(/^(وال|فال|بال|كال|لل|ال)(?=...)/, ''));
    const terms = [];
    hit.forEach((c) => c.add.forEach((t) => { if (!terms.includes(t)) terms.push(t); }));
    words.forEach((w) => { if (terms.length < 6 && !terms.some((t) => N.normAr(t).includes(w) || w.includes(N.normAr(t)))) terms.push(w); });
    return { q, terms: terms.slice(0, 6), concepts: hit, modern: hit.some((c) => c.modern), topics: [...new Set(hit.map((c) => c.topic).filter(Boolean))] };
  }

  // جمل الشروط والاستثناءات والأدلة كما وردت في النص
  const sentences = (t) => STRIP(t).replace(/【[^】]*】/g, ' ').split(/(?<=[.؛:])\s+/).map((s) => s.trim()).filter((s) => s.length > 25 && s.length < 400);
  function evidence(rows, BK) {
    const ay = []; const hd = []; const seen = new Set();
    rows.forEach((r) => {
      const t = STRIP(r.body);
      for (const m of t.matchAll(/\{([^{}]{8,260})\}\s*\[([^\]]{3,40})\]/g)) { const k = m[1].slice(0, 40); if (!seen.has(k)) { seen.add(k); ay.push({ text: m[1], ref: m[2], r }); } }
      for (const m of t.matchAll(/«([^«»]{20,320})»/g)) { const k = m[1].slice(0, 40); if (!seen.has(k)) { seen.add(k); hd.push({ text: m[1], r }); } }
    });
    return { ay: ay.slice(0, 6), hd: hd.slice(0, 8) };
  }
  const where = (r, BK) => { const b = BK[r.book_id] || {}; return `${b.title || ''}${b.fiqh_authors ? ` — ${b.fiqh_authors.short_name}` : ''}، ${r.page ? `${r.vol ? `ج${ar(r.vol)} ` : ''}ص${ar(r.page)}` : `مقطع ${ar(r.seq)}`}`; };

  async function renderAsk(qEnc) {
    const q = qEnc ? decodeURIComponent(qEnc) : '';
    if (!q) return renderForm();
    N.view.innerHTML = '<div class="loader" style="margin:30px auto"></div>';
    let d; try { d = await F.catalog(); } catch { N.view.innerHTML = '<div class="card center">تعذّر الاتصال بالموسوعة؛ تحقق من الإنترنت.</div>'; return; }
    const BK = Object.fromEntries(d.map((b) => [b.id, b]));
    const A = analyze(q);
    F.rpc('fiqh_log_search', { q }).catch(() => {});
    const H = store.get('fiqh:asks', []).filter((x) => x.q !== q); H.unshift({ q, t: Date.now() }); store.set('fiqh:asks', H.slice(0, 50));
    if (!A.terms.length) { N.view.innerHTML = '<div class="card">لم نستخرج من السؤال مصطلحاً للبحث؛ أعد صياغته بكلمات أوضح، مثل: «حكم بيع السلعة قبل قبضها».</div>'; return; }
    let R;
    try { R = await F.rpc('fiqh_ask', { terms: A.terms, per_book: 2 }); } catch { N.view.innerHTML = '<div class="card center">تعذّر البحث؛ تحقق من الاتصال.</div>'; return; }
    const rx = F.termRx(A.terms.join(' '));
    const byBook = {}; R.forEach((r) => { (byBook[r.book_id] = byBook[r.book_id] || []).push(r); });
    const MADS = [['hanafi', 'الحنفية'], ['maliki', 'المالكية'], ['shafii', 'الشافعية'], ['hanbali', 'الحنابلة']];
    const forMad = (m) => d.filter((b) => b.madhhab === m && byBook[b.id]).map((b) => ({ b, rows: byBook[b.id] }));
    const cmp = d.filter((b) => (b.madhhab === 'muqaran') && byBook[b.id]).map((b) => ({ b, rows: byBook[b.id] }));
    const hdb = d.filter((b) => b.madhhab === 'hadith' && byBook[b.id]).map((b) => ({ b, rows: byBook[b.id] }));
    const E = evidence(R, BK);
    const conds = []; R.forEach((r) => sentences(r.body).forEach((s) => { if (conds.length < 6 && /(بشرط|يشترط|يُشترط|إلا أن|إلا إذا|إلا إن|ما لم|بخلاف ما)/.test(s) && rx && (rx.lastIndex = 0, rx.test(s))) conds.push({ s, r }); }));
    const madFound = MADS.filter(([m]) => forMad(m).length).length;
    const level = madFound >= 4 && (E.ay.length || E.hd.length) ? ['مرتفع', 'وُجدت نصوص للمذاهب الأربعة مع أدلة منقولة'] : madFound >= 2 ? ['متوسط', `وُجدت نصوص لـ${ar(madFound)} من المذاهب الأربعة`] : ['منخفض', 'النصوص المطابقة قليلة في المصادر المفهرسة حالياً'];
    const card = (b, r) => `<div class="fq-ans-src"><div class="fq-hit-h"><b>${esc(b.title)}</b><small>${b.fiqh_authors ? esc(b.fiqh_authors.short_name) : ''} • ${r.page ? `${r.vol ? `ج${ar(r.vol)} ` : ''}ص${ar(r.page)}` : `مقطع ${ar(r.seq)}`}</small></div>${r.heading ? `<span class="fq-hit-t">${esc(STRIP(r.heading))}</span>` : ''}<p class="fq-hit-s">${F.snippet(STRIP(r.body), rx, 520)}</p><button class="fq-link" data-r="${r.book_id}/${r.seq}">📖 اقرأ الصفحة كاملة في الكتاب</button></div>`;
    const tool = A.topics.map((t) => TOOLS[t]).filter(Boolean)[0];
    N.view.innerHTML = `
      <div class="card fq-q"><small class="muted">سؤالك</small><p>${esc(q)}</p></div>
      <section class="card"><h3>أولاً: ملخص المسألة</h3>
        ${A.concepts.length ? `<p class="calc-why">فهمنا أن المسألة تتعلق بـ: <b>${A.concepts.map((c) => esc(c.label)).join('، ')}</b>.</p>` : ''}
        <p class="calc-why">بحثنا في نصوص الكتب المفهرسة عن: ${A.terms.map((t) => `<span class="chip">${esc(t)}</span>`).join(' ')}</p>
        ${A.modern ? '<p class="calc-why">⚠️ هذه مسألة معاصرة؛ الكتب التراثية لا تذكرها باسمها، وإنما تُعرض أصولها (كأحكام القرض والزيادة فيه). وللمجامع الفقهية المعاصرة قرارات فيها.</p>' : ''}
        ${tool ? `<button class="btn ghost block" data-go="${tool[0]}">🧮 ${tool[1]}</button>` : ''}</section>
      <section class="card"><h3>ثانياً: الأقوال المنقولة بإيجاز</h3>
        ${MADS.map(([m, t]) => { const x = forMad(m)[0]; const s = x ? sentences(x.rows[0].body).find((y) => rx && (rx.lastIndex = 0, rx.test(y))) : null; return `<div class="fq-mad"><b>${t}</b>${x ? `<p>«${esc((s || STRIP(x.rows[0].body).slice(0, 220)).slice(0, 260))}…»</p><small class="muted">${esc(where(x.rows[0], BK))}</small>` : '<p class="muted">لم يتم العثور على مصدر موثق في الكتب المفهرسة حالياً لهذا المذهب.</p>'}</div>`; }).join('')}
        <p class="muted" style="font-size:.8rem;margin:8px 0 0">هذه مقتطفات حرفية من الصفحات الأقرب لسؤالك، وليست حكماً مستنتجاً؛ اقرأ السياق كاملاً.</p></section>
      <section class="card"><h3>ثالثاً: شرح المسألة وأسباب الخلاف</h3>
        ${cmp.length ? cmp.map(({ b, rows }) => card(b, rows[0])).join('') : '<p class="muted">لم يُعثر على المسألة في الكتب المقارنة المفهرسة (بداية المجتهد).</p>'}</section>
      <section class="card"><h3>رابعاً: الأدلة من القرآن والسنة</h3>
        ${E.ay.length ? `<h4>آيات أوردها العلماء في هذه الصفحات</h4>${E.ay.map((x) => `<p class="fq-ev q">﴿${esc(x.text)}﴾ <small>[${esc(x.ref)}] — أوردها في ${esc(where(x.r, BK))}</small></p>`).join('')}` : ''}
        ${E.hd.length ? `<h4>أحاديث وآثار كما نقلها المؤلفون</h4>${E.hd.map((x) => `<p class="fq-ev">«${esc(x.text)}» <small>— نقله في ${esc(where(x.r, BK))}</small></p>`).join('')}` : ''}
        ${hdb.length ? hdb.map(({ b, rows }) => card(b, rows[0])).join('') : ''}
        ${!E.ay.length && !E.hd.length && !hdb.length ? '<p class="muted">لم تظهر أدلة نصية في الصفحات المسترجعة.</p>' : '<p class="muted" style="font-size:.8rem">الأحاديث منقولة كما أوردها المؤلفون في كتبهم؛ وتخريجها ودرجتها يُراجعان في كتب الحديث.</p>'}</section>
      <section class="card"><h3>خامساً: أقوال المذاهب الأربعة (النصوص)</h3>
        ${MADS.map(([m, t]) => { const L = forMad(m); return `<h4 class="fq-mad-h">${t}</h4>${L.length ? L.map(({ b, rows }) => rows.map((r) => card(b, r)).join('')).join('') : '<p class="muted">لم يتم العثور على مصدر موثق.</p>'}`; }).join('')}</section>
      <section class="card"><h3>سادساً: الشروط والاستثناءات كما وردت</h3>
        ${conds.length ? conds.map((c) => `<p class="fq-ev">«${esc(c.s)}» <small>— ${esc(where(c.r, BK))}</small></p>`).join('') : '<p class="muted">لم تظهر عبارات شروط أو استثناءات صريحة في الصفحات المسترجعة.</p>'}</section>
      <section class="card"><h3>سابعاً: المراجع</h3><ol class="fq-refs">${R.map((r) => `<li>${esc(where(r, BK))}${(BK[r.book_id] || {}).publisher ? ` — ط. ${esc(BK[r.book_id].publisher)}${BK[r.book_id].pub_year ? `، ${esc(BK[r.book_id].pub_year)}` : ''}` : ''}</li>`).join('')}</ol></section>
      <section class="card calc-warn"><h3>ثامناً: ما يحتاج إلى مراجعة عالم مختص</h3>
        <p class="calc-why">هذه نصوص علمية للبحث وليست فتوى. يُرجع إلى المفتي أو دار الإفتاء في: تنزيل الحكم على واقعتك بتفاصيلها، والترجيح بين الأقوال، و${A.modern ? 'المسائل المعاصرة التي لا تذكرها الكتب التراثية باسمها، و' : ''}كل ما يترتب عليه حق لغيرك.</p>
        <p class="calc-why">في مصر: دار الإفتاء المصرية (الخط الساخن ١٠٧).</p></section>
      <section class="card"><h3>تاسعاً: مستوى اكتمال المصادر: <span class="fq-lvl ${level[0] === 'مرتفع' ? 'hi' : level[0] === 'متوسط' ? 'mid' : 'lo'}">${level[0]}</span></h3>
        <p class="calc-why">${level[1]}. البحث في ${ar(d.filter((b) => b.index_status === 'indexed').length)} كتب مفهرسة حتى الآن.</p></section>
      <div class="fq-links" style="margin-bottom:14px"><button class="btn ghost" id="aSave">🔖 حفظ السؤال</button><button class="btn ghost" id="aSearch">🔎 بحث حر بنفس الكلمات</button><button class="btn ghost" id="aNew">✏️ سؤال جديد</button></div>`;
    $$('[data-r]').forEach((x) => { x.onclick = () => go(`fqread/${x.dataset.r}/${encodeURIComponent(A.terms.join(' '))}`); });
    $$('[data-go]').forEach((x) => { x.onclick = () => go(x.dataset.go); });
    $('#aSave').onclick = () => { const S = store.get('fiqh:saved', []).filter((x) => x.q !== q); S.unshift({ q, t: Date.now(), ask: 1 }); store.set('fiqh:saved', S); toast('حُفظ السؤال'); };
    $('#aSearch').onclick = () => go(`fqs/${encodeURIComponent(A.terms.join(' '))}`);
    $('#aNew').onclick = () => go('fqask');
  }

  function renderForm() {
    const H = store.get('fiqh:asks', []);
    const EX = ['هل يجوز شراء سلعة بالتقسيط ثم بيعها قبل سداد كامل الأقساط؟', 'حكم فوايد البنك', 'هل المضمضة واجبة في الوضوء؟', 'هل يجوز أخذ عمولة من البائع والمشتري؟', 'ما حكم بيع العربون؟'];
    N.view.innerHTML = `
      <div class="card"><h3>💬 اسأل الموسوعة</h3><p class="muted" style="margin-top:0;line-height:1.8">اكتب سؤالك بالفصحى أو بالعامية. نبحث لك في نصوص كتب المذاهب الأربعة المفهرسة، ونعرض أقوال العلماء بنصوصها وأدلتها منسوبة إلى الكتاب والجزء والصفحة.</p>
        <form id="aF"><textarea class="calc-in" id="aQ" rows="3" placeholder="مثال: هل يجوز بيع السلعة قبل قبضها؟"></textarea><button class="btn block" style="margin-top:8px">ابحث في المصادر</button></form></div>
      <h3 class="dash-sec">أمثلة</h3>${EX.map((x) => `<button class="fq-book" data-q="${esc(x)}"><b>${esc(x)}</b></button>`).join('')}
      ${H.length ? `<h3 class="dash-sec">أسئلتك السابقة</h3>${H.slice(0, 10).map((x) => `<button class="fq-book" data-q="${esc(x.q)}"><b>${esc(x.q)}</b><small>${new Date(x.t).toLocaleDateString('ar-EG')}</small></button>`).join('')}` : ''}
      <div class="card calc-disc"><b>كيف تعمل؟</b><p>لا نستخدم ذكاءً اصطناعياً يكتب إجابات من عنده؛ كل ما تراه نصوص من الكتب كما هي. نحلل سؤالك بقاموس للمصطلحات الفقهية والمعاصرة والعامية، ثم نسترجع أقرب الصفحات من كل كتاب. فإذا لم نجد نصاً لمذهب قلنا ذلك صراحة.</p></div>`;
    $('#aF').onsubmit = (e) => { e.preventDefault(); const v = $('#aQ').value.trim(); if (v.length < 4) { toast('اكتب سؤالك'); return; } go(`fqask/${encodeURIComponent(v)}`); };
    $$('[data-q]').forEach((b) => { b.onclick = () => go(`fqask/${encodeURIComponent(b.dataset.q)}`); });
  }

  Object.assign(routes, { fqask: { title: 'اسأل الموسوعة', render: renderAsk, back: 'fiqh' } });
  N.fiqh.analyze = analyze;
});
