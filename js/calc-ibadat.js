/* الحاسبات — المرحلة الخامسة: حاسبات العبادات
 * قضاء الصلوات (مرتبط بعداد الفوائت في «متابعة الصلوات»)، قضاء الصيام، خطة الختمة (مرتبطة بالختمة)،
 * قيام الليل (من مواقيت الصلاة)، تقويم صيام التطوع، وعداد الذكر (السبحة). */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const C = N.calc; if (!C || !C.src) return;
  const { $, $$, store, toast, ar, esc, go } = N;
  const { num, saveHist, takeOpen, src, r2 } = C;
  const row = (id, label, v, ph = '', type = 'decimal') => `<div class="calc-row"><label>${label}</label><input class="calc-in" id="${id}" inputmode="${type}" value="${esc(v ?? '')}" placeholder="${ph}"></div>`;
  const kv = (k, v) => `<div class="pr-extra"><span>${k}</span><b>${v}</b></div>`;
  const nDays = (n) => (n === 0 ? 'لا شيء' : n === 1 ? 'يوم واحد' : n === 2 ? 'يومان' : n <= 10 ? `${ar(n)} أيام` : `${ar(n)} يوماً`);
  const nPr = (n) => (n === 1 ? 'صلاة واحدة' : n === 2 ? 'صلاتان' : n <= 10 ? `${ar(n)} صلوات` : `${ar(n)} صلاة`);
  const span = (d) => { if (d < 31) return nDays(d); const m = Math.round(d / 30.44); if (m < 12) return m <= 10 ? `${ar(m)} ${m <= 2 ? 'شهر' : 'أشهر'}` : `${ar(m)} شهراً`; const y = Math.round(d / 365 * 10) / 10; return `${y === 1 ? 'سنة واحدة' : y === 2 ? 'سنتان' : Number.isInteger(y) && y <= 10 ? `${ar(y)} سنوات` : `${ar(y)} سنة`} تقريباً`; };
  const dstr = (d) => d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });

  // التاريخ الهجري رقمياً (أم القرى) مع تصحيح المستخدم
  const HF = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' });
  function hp(d) {
    const x = new Date(d.getTime() + ((N.settings && N.settings.hijriAdj) || 0) * 864e5);
    const P = {}; HF.formatToParts(x).forEach((p) => { if (p.type !== 'literal') P[p.type] = parseInt(p.value, 10); });
    return { d: P.day, m: P.month, y: P.year };
  }
  const HM = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
  function nextRamadan(from = new Date()) {
    const t = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    for (let i = 0; i < 400; i++) { const d = new Date(t.getTime() + i * 864e5); const h = hp(d); if (h.m === 9 && h.d === 1) return d; }
    return null;
  }

  // ================= قضاء الصلوات =================
  function renderSalah() {
    const S = takeOpen({ from: '', to: '', woman: false, hayd: '7', per: '1' });
    const qada = () => Object.assign({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, store.get('qada', {}));
    const draw = () => {
      const q = qada(); const tot = Object.values(q).reduce((s, x) => s + x, 0);
      N.view.innerHTML = `
        <div class="card"><h3>📋 الفوائت المسجّلة حالياً</h3>${tot ? `${kv('الإجمالي', nPr(tot))}${kv('أكثرها', `${N.PRAYERS.find((p) => p.key === Object.keys(q).sort((a, b) => q[b] - q[a])[0]).name} (${ar(Math.max(...Object.values(q)))})`)}` : '<p class="muted">لا توجد فوائت مسجّلة في «متابعة الصلوات».</p>'}
          <button class="btn ghost block" id="sTr">✅ فتح متابعة الصلوات وتسجيل ما قضيته</button></div>
        <div class="card"><h3>🧮 تقدير الصلوات الفائتة</h3><p class="muted" style="margin-top:0">لمن ترك الصلاة مدة ثم تاب: أدخل بداية المدة (البلوغ أو آخر انتظام) ونهايتها.</p>
          <div class="calc-row"><label>من تاريخ</label><input class="calc-in" id="sF" type="date" value="${esc(S.from)}"></div>
          <div class="calc-row"><label>إلى تاريخ</label><input class="calc-in" id="sT" type="date" value="${esc(S.to)}"></div>
          <label class="calc-chk"><input type="checkbox" id="sW" ${S.woman ? 'checked' : ''}> امرأة (تُستثنى أيام الحيض والنفاس فلا قضاء فيها)</label>
          ${S.woman ? row('sH', 'متوسط أيام الحيض في الشهر', S.hayd, '', 'numeric') : ''}
          <button class="btn block" id="sGo">احسب</button></div>
        <div id="sRes"></div>
        <div class="card"><h3>📅 خطة القضاء</h3>${row('sP', 'كم صلاة فائتة تقضي مع كل فريضة؟', S.per, '', 'numeric')}<button class="btn block" id="sPl">احسب المدة</button><div id="sPlR"></div></div>
        ${src(['«من نسي صلاة أو نام عنها فكفارتها أن يصليها إذا ذكرها» — رواه البخاري (٥٩٧) ومسلم (٦٨٤).', 'قضاء الصلوات المتروكة عمداً واجب عند جمهور الفقهاء والمذاهب الأربعة؛ واختار ابن تيمية وجماعة أن المتعمد لا يقضي وإنما يتوب ويكثر من النوافل. والأحوط القضاء.', 'يجوز القضاء في كل وقت حتى أوقات النهي عند الجمهور لعموم الحديث؛ ويُستحب الترتيب بين الفوائت عند من أوجبه إن كانت قليلة.', 'الحائض والنفساء لا تقضيان الصلاة: «كنا نؤمر بقضاء الصوم ولا نؤمر بقضاء الصلاة» — رواه مسلم (٣٣٥).', 'إن جهل العدد فيقضي حتى يغلب على ظنه براءة ذمته.'])}`;
      $('#sTr').onclick = () => go('tracker');
      $('#sW').onchange = () => { read(); S.woman = $('#sW').checked; draw(); };
      $('#sGo').onclick = () => { read(); compute(); };
      $('#sPl').onclick = () => { read(); plan(); };
    };
    function read() { S.from = $('#sF').value; S.to = $('#sT').value; S.woman = $('#sW').checked; if ($('#sH')) S.hayd = $('#sH').value; S.per = $('#sP').value; }
    function compute() {
      if (!S.from || !S.to) { toast('أدخل التاريخين'); return; }
      const d = Math.round((new Date(S.to) - new Date(S.from)) / 864e5) + 1; if (d <= 0) { toast('تاريخ النهاية قبل البداية'); return; }
      const off = S.woman ? Math.round(d * Math.min(15, num(S.hayd)) / 30.44) : 0; const days = d - off;
      $('#sRes').innerHTML = `<div class="card calc-ok">${kv('المدة', span(d))}${off ? kv('− أيام الحيض التقديرية', nDays(off)) : ''}${kv('الأيام التي تُقضى', nDays(days))}${kv('عدد الصلوات', `${nPr(days * 5)} (${ar(days)} من كل فريضة)`)}
        <button class="btn block" id="sAdd">➕ أضفها إلى عداد الفوائت</button><small class="muted">تُضاف إلى ما هو مسجّل في «متابعة الصلوات»، وتنقص كلما سجلت صلاة قضيتها.</small></div>`;
      $('#sAdd').onclick = () => { const q = qada(); Object.keys(q).forEach((k) => { q[k] += days; }); store.set('qada', q); saveHist('qsalah', `قضاء صلوات — ${nPr(days * 5)}`, S, span(d)); toast('أُضيفت إلى عداد الفوائت'); draw(); };
    }
    function plan() {
      const q = qada(); const tot = Object.values(q).reduce((s, x) => s + x, 0); const per = Math.max(1, Math.round(num(S.per)));
      if (!tot) { $('#sPlR').innerHTML = '<p class="muted">سجّل الفوائت أولاً.</p>'; return; }
      const d = Math.ceil(Math.max(...Object.values(q)) / per);
      $('#sPlR').innerHTML = `<div style="margin-top:10px">${kv('قضاء يومياً', nPr(per * 5))}${kv('المدة المتوقعة', span(d))}${kv('تنتهي تقريباً', new Date(Date.now() + d * 864e5).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }))}</div><p class="calc-why">من الطرق الميسّرة: أن تصلي مع كل فريضة حاضرة فريضة مثلها قضاءً، فتقضي يوماً كاملاً في كل يوم.</p>`;
    }
    draw();
  }

  // ================= قضاء الصيام =================
  function renderSawm() {
    const K = 'calc:sawm';
    const st = () => Object.assign({ owe: 0, done: [], reason: 'excuse' }, store.get(K, {}));
    const draw = () => {
      const s = st(); const left = Math.max(0, s.owe - s.done.length);
      const R = nextRamadan(); const toR = R ? Math.ceil((R - new Date()) / 864e5) : 0;
      const weeks = Math.max(1, Math.floor(toR / 7));
      N.view.innerHTML = `
        <div class="card ${left ? '' : 'calc-ok'}"><div class="calc-2"><div class="center"><small class="muted">عليك</small><b class="calc-big" style="display:block">${nDays(left)}</b></div><div class="center"><small class="muted">قضيت</small><b class="calc-big" style="display:block">${nDays(s.done.length)}</b></div></div>
          ${s.owe ? `<div class="calc-bar"><span style="width:${(s.done.length / s.owe) * 100}%"></span></div>` : ''}
          ${R ? kv('رمضان القادم', `${R.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })} — بعد ${nDays(toR)}`) : ''}
          ${left ? kv('لتنتهي قبل رمضان', left > toR ? 'الأيام أكثر من الوقت المتبقي؛ صم ما استطعت' : `${Math.ceil(left / weeks) === 1 ? 'يوم واحد' : Math.ceil(left / weeks) === 2 ? 'يومان' : `${ar(Math.ceil(left / weeks))} أيام`} في الأسبوع`) : ''}
          ${left ? '<button class="btn block" id="wDone">✅ صمت اليوم يوم قضاء</button>' : s.owe ? '<p class="calc-big center">🎉 أتممت القضاء، تقبّل الله منك</p>' : ''}</div>
        <div class="card"><h3>الأيام التي عليك</h3>
          <div class="calc-cnt"><span>عدد الأيام</span><button class="chip" id="wM">−</button><b>${ar(s.owe)}</b><button class="chip" id="wP">+</button></div>
          <div class="calc-row" style="margin-top:8px"><label>سبب الفطر</label><select class="calc-in" id="wR"><option value="excuse" ${s.reason === 'excuse' ? 'selected' : ''}>عذر: مرض، سفر، حيض، نفاس، حمل، رضاع</option><option value="none" ${s.reason === 'none' ? 'selected' : ''}>بغير عذر</option></select></div>
          ${s.reason === 'none' ? '<p class="calc-why">الفطر بغير عذر كبيرة تجب منه التوبة مع القضاء؛ وإن كان بالجماع فعليه الكفارة أيضاً.</p><button class="btn ghost block" data-g="c/kaffara">احسب كفارة الجماع</button>' : ''}
          ${s.done.length ? `<details class="calc-grp"><summary>سجل القضاء (${ar(s.done.length)})</summary>${s.done.slice().reverse().map((d) => `<div class="pr-extra"><span>${new Date(d).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><b><button class="chip" data-x="${d}">✕</button></b></div>`).join('')}</details>` : ''}
          <button class="btn ghost block" data-g="c/fidya">إن أخّرت القضاء حتى رمضان التالي: احسب الفدية</button></div>
        ${src(['﴿فَمَن كَانَ مِنكُم مَّرِيضًا أَوْ عَلَىٰ سَفَرٍ فَعِدَّةٌ مِّنْ أَيَّامٍ أُخَرَ﴾ — البقرة: ١٨٤.', 'قالت عائشة رضي الله عنها: «كان يكون عليّ الصوم من رمضان فما أستطيع أن أقضي إلا في شعبان» — رواه البخاري (١٩٥٠) ومسلم (١١٤٦)؛ فوقت القضاء موسَّع إلى رمضان التالي.', 'لا يُشترط التتابع في القضاء عند الجمهور، والتتابع أفضل.', 'من صام الست من شوال قبل القضاء: أجازه جمع من العلماء، والأولى تقديم القضاء لأنه دَين.'])}`;
      const d0 = $('#wDone'); if (d0) d0.onclick = () => { const x = st(); const k = N.todayKey(); if (x.done.includes(k)) { toast('سجّلت اليوم من قبل'); return; } x.done.push(k); store.set(K, x); toast('تقبّل الله صيامك'); draw(); };
      $('#wM').onclick = () => { const x = st(); x.owe = Math.max(x.done.length, x.owe - 1); store.set(K, x); draw(); };
      $('#wP').onclick = () => { const x = st(); x.owe = Math.min(400, x.owe + 1); store.set(K, x); draw(); };
      $('#wR').onchange = (e) => { const x = st(); x.reason = e.target.value; store.set(K, x); draw(); };
      $$('[data-x]').forEach((b) => { b.onclick = () => { const x = st(); x.done = x.done.filter((d) => d !== b.dataset.x); store.set(K, x); draw(); }; });
      $$('[data-g]').forEach((b) => { b.onclick = () => go(b.dataset.g); });
    };
    draw();
  }

  // ================= خطة الختمة =================
  function renderKhatmaPlan() {
    const S = takeOpen({ by: 'days', v: '30', mins: '2' });
    const draw = () => {
      N.view.innerHTML = `
        <div class="card"><div class="seg" id="hBy" style="margin-bottom:10px"><button data-v="days" class="${S.by === 'days' ? 'active' : ''}">أريد الختم في مدة</button><button data-v="pages" class="${S.by === 'pages' ? 'active' : ''}">أقرأ عدداً من الصفحات يومياً</button></div>
          ${row('hV', S.by === 'days' ? 'عدد الأيام' : 'الصفحات يومياً', S.v, '', 'numeric')}${row('hM', 'متوسط دقائق قراءة الصفحة', S.mins)}
          <button class="btn block" id="hGo">احسب</button></div>
        <div id="hRes"></div>
        <div class="chips" style="justify-content:flex-start">${[[3, 'ثلاثة أيام'], [7, 'أسبوع'], [10, 'عشرة أيام'], [30, 'شهر'], [60, 'شهرين']].map(([d, t]) => `<button class="chip" data-q="${d}">${t}</button>`).join('')}</div>
        ${src(['مصحف المدينة ٦٠٤ صفحات، ٣٠ جزءاً، ٦٠ حزباً، ٢٤٠ ربعاً.', 'قال النبي ﷺ لعبد الله بن عمرو: «اقرأ القرآن في شهر»… حتى قال: «فاقرأه في سبع ولا تزد على ذلك» — رواه البخاري (٥٠٥٤) ومسلم (١١٥٩).', '«لا يفقه من قرأ القرآن في أقل من ثلاث» — رواه أبو داود (١٣٩٤) والترمذي (٢٩٤٩) وصححه الألباني.', '«اقرؤوا القرآن فإنه يأتي يوم القيامة شفيعاً لأصحابه» — رواه مسلم (٨٠٤).'])}`;
      $$('#hBy button').forEach((b) => { b.onclick = () => { S.by = b.dataset.v; S.v = S.by === 'days' ? '30' : '20'; draw(); }; });
      $$('[data-q]').forEach((b) => { b.onclick = () => { S.by = 'days'; S.v = b.dataset.q; draw(); compute(); }; });
      $('#hGo').onclick = () => { S.v = $('#hV').value; S.mins = $('#hM').value; compute(); };
    };
    function compute() {
      const v = Math.max(1, num(S.v)); const days = S.by === 'days' ? Math.round(v) : Math.ceil(604 / v); const pages = S.by === 'days' ? 604 / v : v;
      const min = pages * Math.max(0.5, num(S.mins));
      $('#hRes').innerHTML = `<div class="card calc-ok">${kv('مدة الختمة', span(days))}${kv('يومياً', `${ar(Math.ceil(pages))} صفحة ≈ ${ar(r2(pages / 20))} جزء`)}${kv('بعد كل صلاة (٥ صلوات)', `${ar(Math.ceil(pages / 5))} صفحات`)}${kv('الوقت اليومي التقريبي', `${ar(Math.round(min))} دقيقة`)}${kv('ختمات في السنة', ar(r2(365 / days)))}
        ${days < 3 ? '<p class="calc-why">الختم في أقل من ثلاث خلاف الهدي النبوي الغالب (حديث أبي داود والترمذي)، إلا في الأوقات الفاضلة عند بعض السلف.</p>' : ''}
        ${[7, 15, 30, 60].includes(days) ? `<button class="btn block" id="hSet">📗 اضبط ختمتي على ${nDays(days)}</button>` : '<button class="btn ghost block" id="hOpen">📗 فتح الختمة</button>'}</div>`;
      const set = $('#hSet'); if (set) set.onclick = () => { const k = store.get('khatma', null); if (k) { k.days = days; k.start = N.todayKey(); store.set('khatma', k); } else store.set('khatma', { days, start: N.todayKey(), done: Array(30).fill(false), completed: 0 }); toast('تم ضبط الختمة'); go('khatma'); };
      const op = $('#hOpen'); if (op) op.onclick = () => go('khatma');
      saveHist('khplan', `خطة ختمة — ${span(days)}`, S, `${ar(Math.ceil(pages))} صفحة يومياً`);
    }
    draw();
  }

  // ================= قيام الليل =================
  function renderQiyam() {
    const S = takeOpen({ ayat: '100', rak: '11', spa: '20' });
    let T = null; try { const now = new Date(); const t1 = N.timesFor(now); const t2 = N.timesFor(new Date(now.getTime() + 864e5)); T = { m: t1.maghrib, i: t1.isha, f: t2.fajr }; } catch { /* */ }
    const draw = () => {
      let night = '';
      if (T && T.m && T.f) {
        const L = T.f - T.m; const mid = new Date(T.m.getTime() + L / 2); const third = new Date(T.m.getTime() + (2 * L) / 3);
        night = `<div class="card"><h3>🌙 ليلة اليوم (حسب موقعك)</h3>${kv('المغرب', N.fmtTime(T.m))}${kv('العشاء', N.fmtTime(T.i))}${kv('منتصف الليل', N.fmtTime(mid))}${kv('بداية الثلث الأخير', N.fmtTime(third))}${kv('الفجر', N.fmtTime(T.f))}${kv('طول الليل', `${ar(Math.floor(L / 36e5))} ساعة و${ar(Math.round((L % 36e5) / 6e4))} دقيقة`)}
          <p class="calc-why">وقت الوتر من بعد صلاة العشاء إلى طلوع الفجر، وأفضله الثلث الأخير لمن وثق بالقيام.</p></div>`;
      }
      N.view.innerHTML = `${night}
        <div class="card"><h3>🧮 خطة القيام</h3>${row('qA', 'عدد الآيات التي تنوي قراءتها', S.ayat, '', 'numeric')}${row('qR', 'عدد الركعات (مع الوتر)', S.rak, '', 'numeric')}${row('qS', 'ثوانٍ تقريبية لقراءة الآية مع التأني', S.spa, '', 'numeric')}
          <div class="chips" style="justify-content:flex-start">${[[10, 'عشر آيات'], [100, 'مائة آية'], [1000, 'ألف آية']].map(([a, t]) => `<button class="chip" data-a="${a}">${t}</button>`).join('')}</div>
          <button class="btn block" id="qGo" style="margin-top:8px">احسب</button></div>
        <div id="qRes"></div>
        ${src(['«من قام بعشر آيات لم يُكتب من الغافلين، ومن قام بمائة آية كُتب من القانتين، ومن قام بألف آية كُتب من المقنطرين» — رواه أبو داود (١٣٩٨) وصححه الألباني.', '«ينزل ربنا تبارك وتعالى كل ليلة إلى السماء الدنيا حين يبقى ثلث الليل الآخر، يقول: من يدعوني فأستجيب له…» — رواه البخاري (١١٤٥) ومسلم (٧٥٨).', 'قالت عائشة رضي الله عنها: «ما كان يزيد في رمضان ولا في غيره على إحدى عشرة ركعة» — رواه البخاري (١١٤٧) ومسلم (٧٣٨)؛ ويجوز الزيادة: «صلاة الليل مثنى مثنى» — متفق عليه.', 'سورة المُلك ٣٠ آية، والسجدة ٣٠، ويس ٨٣، والواقعة ٩٦، والإنسان ٣١، والمزمل ٢٠، وآخر جزء تبارك ٤٣١ آية تقريباً.'])}`;
      $$('[data-a]').forEach((b) => { b.onclick = () => { S.ayat = b.dataset.a; draw(); compute(); }; });
      $('#qGo').onclick = () => { S.ayat = $('#qA').value; S.rak = $('#qR').value; S.spa = $('#qS').value; compute(); };
    };
    function compute() {
      const a = Math.max(1, Math.round(num(S.ayat))); const r = Math.max(1, Math.round(num(S.rak))); const sp = Math.max(3, num(S.spa));
      const per = Math.ceil(a / r); const mins = Math.round((a * sp) / 60 + r * 2.5);
      const lvl = a >= 1000 ? 'المقنطرين' : a >= 100 ? 'القانتين' : a >= 10 ? 'من لم يُكتب من الغافلين' : '';
      $('#qRes').innerHTML = `<div class="card calc-ok">${kv('آيات في كل ركعة', `≈ ${ar(per)}`)}${kv('الوقت التقريبي', `${ar(mins)} دقيقة`)}${lvl ? `<p class="calc-big">تُكتب بإذن الله من <b>${lvl}</b></p>` : ''}${a >= 431 && a < 1000 ? '<p class="calc-why">قراءة جزء تبارك كاملاً (≈٤٣١ آية) تحقق المائة وتزيد.</p>' : a >= 1000 ? '<p class="calc-why">جزءا تبارك وعمّ معاً ٩٩٥ آية؛ فبزيادة آيات يسيرة تبلغ الألف.</p>' : ''}${T && T.f ? kv('ابدأ قبل الفجر بـ', `${ar(mins + 15)} دقيقة على الأقل (≈ ${N.fmtTime(new Date(T.f.getTime() - (mins + 15) * 6e4))})`) : ''}</div>`;
    }
    draw();
  }

  // ================= تقويم صيام التطوع =================
  function fastInfo(d) {
    const h = hp(d); const w = d.getDay(); const out = { good: [], bad: null };
    if (h.m === 10 && h.d === 1) out.bad = 'عيد الفطر — يحرم صومه';
    else if (h.m === 12 && h.d === 10) out.bad = 'عيد الأضحى — يحرم صومه';
    else if (h.m === 12 && h.d >= 11 && h.d <= 13) out.bad = 'أيام التشريق — لا تُصام إلا لمن لم يجد الهدي';
    else if (h.m === 9) out.bad = 'رمضان — صيام فريضة';
    if (out.bad) return out;
    if (h.m === 12 && h.d === 9) out.good.push(['⭐', 'يوم عرفة: يكفّر السنة الماضية والباقية (لغير الحاج) — مسلم ١١٦٢']);
    if (h.m === 12 && h.d <= 8) out.good.push(['🌿', 'العشر الأوائل من ذي الحجة — البخاري ٩٦٩']);
    if (h.m === 1 && h.d === 10) out.good.push(['⭐', 'يوم عاشوراء: يكفّر السنة الماضية — مسلم ١١٦٢']);
    if (h.m === 1 && h.d === 9) out.good.push(['🌿', 'تاسوعاء: «لئن بقيت إلى قابل لأصومن التاسع» — مسلم ١١٣٤']);
    if (h.m === 1 && h.d !== 9 && h.d !== 10) out.good.push(['🌿', 'شهر الله المحرم: أفضل الصيام بعد رمضان — مسلم ١١٦٣']);
    if (h.m === 10 && h.d >= 2) out.good.push(['🌿', 'ست من شوال: كصيام الدهر — مسلم ١١٦٤']);
    if (h.m === 8 && h.d <= 28) out.good.push(['🌿', 'شعبان: كان ﷺ يصوم أكثره — البخاري ١٩٦٩']);
    if (h.d >= 13 && h.d <= 15) out.good.push(['🌕', 'الأيام البيض (١٣، ١٤، ١٥) — الترمذي ٧٦١ وحسّنه']);
    if (w === 1) out.good.push(['📅', 'الاثنين: «ذاك يوم ولدت فيه» وتُعرض فيه الأعمال — مسلم ١١٦٢، الترمذي ٧٤٧']);
    if (w === 4) out.good.push(['📅', 'الخميس: تُعرض فيه الأعمال — الترمذي ٧٤٧ وصححه الألباني']);
    if (w === 5) out.note = 'لا يُفرد الجمعة بصيام إلا مع يوم قبله أو بعده — البخاري ١٩٨٥ ومسلم ١١٤٤';
    if (h.m === 8 && h.d >= 29) out.note = 'يوم الشك أو آخر شعبان: يُنهى عن تقدّم رمضان بصوم يوم أو يومين إلا لمن له عادة — البخاري ١٩١٤ ومسلم ١٠٨٢';
    return out;
  }
  function renderTatawwu() {
    const K = 'calc:tatawwu';
    let span2 = 45;
    const draw = () => {
      const done = store.get(K, []); const t0 = new Date(); t0.setHours(12, 0, 0, 0);
      const list = []; for (let i = -7; i < span2; i++) { const d = new Date(t0.getTime() + i * 864e5); const f = fastInfo(d); if (f.good.length || f.bad || f.note) list.push({ d, f, h: hp(d), k: N.ymdIn(d, N.tz()).map((x) => String(x).padStart(2, '0')).join('-') }); }
      const yr = done.filter((x) => x.slice(0, 4) === String(new Date().getFullYear())).length;
      const today = N.ymdIn(t0, N.tz()).map((x) => String(x).padStart(2, '0')).join('-');
      N.view.innerHTML = `
        <div class="card center"><small class="muted">أيام التطوع التي صمتها هذا العام</small><b class="calc-big" style="display:block">${nDays(yr)}</b></div>
        ${list.map(({ d, f, h, k }) => `<div class="lib-at ${f.bad ? 'calc-warn' : ''}" style="${f.good.some((g) => g[0] === '⭐') ? 'border-color:var(--primary)' : ''}"><b>${dstr(d)} <small class="muted">— ${ar(h.d)} ${HM[h.m - 1]}</small></b>
          ${f.bad ? `<small>⛔ ${f.bad}</small>` : f.good.map(([i, t]) => `<small>${i} ${t}</small>`).join('')}${f.note ? `<small style="color:#a60">⚠️ ${f.note}</small>` : ''}
          ${!f.bad && f.good.length && k <= today ? `<div class="lib-at-b"><button class="btn ${done.includes(k) ? '' : 'ghost'}" data-k="${k}">${done.includes(k) ? '✅ صمتُه' : 'سجّل أني صمته'}</button></div>` : ''}</div>`).join('')}
        <button class="btn ghost block" id="tMore">عرض المزيد</button>
        ${src(['«من صام يوماً في سبيل الله بعّد الله وجهه عن النار سبعين خريفاً» — رواه البخاري (٢٨٤٠) ومسلم (١١٥٣).', 'التواريخ الهجرية بتقويم أم القرى مع تصحيح التاريخ من إعدادات الصلاة؛ وقد تختلف عن رؤية الهلال في بلدك بيوم.', 'أحاديث الأيام الفاضلة مذكورة بجوار كل يوم مع مصدرها.'])}`;
      $$('[data-k]').forEach((b) => { b.onclick = () => { let A = store.get(K, []); A = A.includes(b.dataset.k) ? A.filter((x) => x !== b.dataset.k) : A.concat([b.dataset.k]); store.set(K, A); draw(); }; });
      $('#tMore').onclick = () => { span2 += 60; draw(); };
    };
    draw();
  }

  const NEW = [
    { k: 'qsalah', ic: '🕌', t: 'قضاء الصلوات الفائتة', d: 'تقدير الفوائت وخطة قضائها، مرتبطة بعداد «متابعة الصلوات»', cat: 'ibadat', ready: 1 },
    { k: 'qsawm', ic: '🌙', t: 'قضاء الصيام', d: 'الأيام التي عليك والمدة حتى رمضان القادم وتسجيل القضاء', cat: 'ibadat', ready: 1 },
    { k: 'khplan', ic: '📗', t: 'خطة الختمة', d: 'الصفحات اليومية والوقت لختم القرآن في المدة التي تريد', cat: 'ibadat', ready: 1 },
    { k: 'qiyam', ic: '🌌', t: 'قيام الليل', d: 'الثلث الأخير من الليل حسب موقعك وخطة الآيات والركعات', cat: 'ibadat', ready: 1 },
    { k: 'tatawwu', ic: '📅', t: 'تقويم صيام التطوع', d: 'الاثنين والخميس والأيام البيض وعرفة وعاشوراء والأيام المنهي عنها', cat: 'ibadat', ready: 1 },
    { k: 'tasbihgo', ic: '📿', t: 'عداد الذكر', d: 'السبحة الإلكترونية', cat: 'ibadat', ready: 1 },
  ];
  const at = C.TOOLS.findIndex((t) => t.k === 'ibadat');
  C.TOOLS.splice(at >= 0 ? at : C.TOOLS.length, at >= 0 ? 1 : 0, ...NEW);
  Object.assign(C.CALCS, { qsalah: [renderSalah, 'قضاء الصلوات الفائتة'], qsawm: [renderSawm, 'قضاء الصيام'], khplan: [renderKhatmaPlan, 'خطة الختمة'], qiyam: [renderQiyam, 'قيام الليل'], tatawwu: [renderTatawwu, 'تقويم صيام التطوع'], tasbihgo: [() => { go('tasbih'); }, 'عداد الذكر'] });
});
