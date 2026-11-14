/* الحاسبات — المرحلة الثانية: الديون، خطط السداد، قسمة الغرماء، ديون المتوفى، التقسيط، البيع والربح، رد المظالم.
 * كل البيانات محفوظة على الجهاز فقط. الحساب إرشادي وليس فتوى. */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const C = N.calc; if (!C) return;
  const { $, $$, store, toast, go, ar, esc } = N;
  const { num, money, pct, curSelect, saveHist, takeOpen, exportBar, bindExport, REVIEW } = C;
  const LN = () => N.NATIVE && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  const r2 = (x) => Math.round(x * 100) / 100;
  const mon = (n) => (n === 1 ? 'شهر واحد' : n === 2 ? 'شهران' : n <= 10 ? `${ar(n)} أشهر` : `${ar(n)} شهراً`);
  const dstr = (t) => new Date(t).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  const curBind = () => { const el = $('#cCur'); if (el) el.onchange = (e) => { store.set('calc:cur', e.target.value); }; };
  const src = (items) => `<div class="card calc-src"><b>📚 المرجعية والأدلة</b><ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul><small class="muted">${REVIEW}. الحساب إرشادي وليس فتوى.</small></div>`;

  // صفوف قابلة للإضافة والحذف (اسم + مبلغ + حقل إضافي اختياري)
  function rowsEditor(id, rows, extra) {
    return `<div id="${id}">${rows.map((r, i) => `<div class="calc-ww calc-rw"><input class="calc-in" data-n="${i}" value="${esc(r.n || '')}" placeholder="الاسم / البيان"><input class="calc-in" data-a="${i}" inputmode="decimal" value="${esc(r.a || '')}" placeholder="المبلغ">${extra ? extra(r, i) : ''}<button class="chip" data-x="${i}">✕</button></div>`).join('')}</div><button class="btn ghost block" id="${id}Add">+ إضافة</button>`;
  }
  function readRows(id, rows, extraRead) {
    $$(`#${id} [data-n]`).forEach((el) => { const i = +el.dataset.n; rows[i].n = el.value; rows[i].a = $(`#${id} [data-a="${i}"]`).value; if (extraRead) extraRead(rows[i], i); });
  }
  function bindRows(id, rows, redraw, read, blank) {
    $(`#${id}Add`).onclick = () => { read(); rows.push(Object.assign({ n: '', a: '' }, blank || {})); redraw(); };
    $$(`#${id} [data-x]`).forEach((b) => { b.onclick = () => { read(); rows.splice(+b.dataset.x, 1); redraw(); }; });
  }

  // ================= سجل الديون =================
  const LKEY = 'calc:ledger';
  const ledger = () => store.get(LKEY, []);
  const saveLedger = (L) => { store.set(LKEY, L); scheduleDebtRem(); };
  const paid = (d) => (d.pays || []).reduce((s, p) => s + p.a, 0);
  async function scheduleDebtRem() {
    const ln = LN(); if (!ln) return;
    try {
      await ln.cancel({ notifications: Array.from({ length: 100 }, (_, i) => ({ id: 3500 + i })) });
      const now = Date.now();
      const list = ledger().filter((d) => d.rem && d.due && paid(d) < d.a).map((d, i) => {
        const [y, m, dd] = d.due.split('-').map(Number); const at = new Date(y, m - 1, dd, 9, 0);
        if (at.getTime() < now) return null;
        const rest = money(d.a - paid(d));
        return { id: 3500 + (i % 100), title: d.dir === 'out' ? '📒 موعد سداد دين' : '📒 موعد استحقاق دين لك', body: d.dir === 'out' ? `اليوم موعد سداد ${rest} إلى ${d.who}. «من أخذ أموال الناس يريد أداءها أدّى الله عنه» — البخاري` : `اليوم موعد استحقاق ${rest} عند ${d.who}. ﴿وَإِن كَانَ ذُو عُسْرَةٍ فَنَظِرَةٌ إِلَىٰ مَيْسَرَةٍ﴾`, channelId: 'azkar', extra: { route: 'c/dayn' }, schedule: { at, allowWhileIdle: true }, autoCancel: true };
      }).filter(Boolean);
      if (!list.length) return;
      let perm = await ln.checkPermissions(); if (perm.display !== 'granted') perm = await ln.requestPermissions(); if (perm.display !== 'granted') return;
      await ln.createChannel({ id: 'azkar', name: 'تذكير الأذكار', description: 'الأذكار والتذكيرات', importance: 4, visibility: 1 });
      await ln.schedule({ notifications: list });
    } catch (e) { console.warn('debt reminders', e); }
  }
  function renderLedger() {
    let tab = store.get('calc:ltab', 'out');
    const draw = () => {
      const L = ledger();
      const tot = (dir) => L.filter((d) => d.dir === dir).reduce((s, d) => s + Math.max(0, d.a - paid(d)), 0);
      const items = L.map((d, i) => ({ d, i })).filter(({ d }) => d.dir === tab).sort((a, b) => (paid(a.d) >= a.d.a) - (paid(b.d) >= b.d.a) || String(a.d.due || '9').localeCompare(String(b.d.due || '9')));
      N.view.innerHTML = `
        <div class="calc-2"><div class="card center"><small class="muted">ديون عليّ</small><b class="calc-big" style="display:block">${money(tot('out'))}</b></div><div class="card center"><small class="muted">ديون لي</small><b class="calc-big" style="display:block">${money(tot('in'))}</b></div></div>
        <div class="seg" id="lTab" style="margin:10px 0"><button data-v="out" class="${tab === 'out' ? 'active' : ''}">عليّ</button><button data-v="in" class="${tab === 'in' ? 'active' : ''}">لي</button></div>
        <button class="btn block" id="lNew" style="margin-bottom:10px">+ تسجيل دين ${tab === 'out' ? 'عليّ' : 'لي'}</button>
        ${items.length ? items.map(({ d, i }) => { const p = paid(d); const done = p >= d.a; const late = !done && d.due && new Date(d.due) < new Date(new Date().toDateString()); return `<div class="lib-at ${done ? 'calc-done' : ''}"><b>${esc(d.who)} — ${money(d.a)}</b><small>${d.note ? esc(d.note) + ' • ' : ''}${d.due ? `الاستحقاق: ${dstr(d.due)}${late ? ' • <span style="color:#c0392b">متأخر</span>' : ''}` : 'بلا أجل محدد'}${d.rem ? ' • 🔔' : ''}</small><div class="calc-bar"><span style="width:${Math.min(100, (p / d.a) * 100)}%"></span></div><small>${done ? '✅ تم السداد كاملاً' : `المسدَّد ${money(p)} • المتبقي <b>${money(d.a - p)}</b>`}</small><div class="lib-at-b">${done ? '' : `<button class="btn" data-pay="${i}">تسجيل سداد</button>`}<button class="btn ghost" data-ed="${i}">تعديل</button><button class="btn ghost" data-sh="${i}">📤</button></div></div>`; }).join('') : `<div class="card center muted">لا توجد ديون مسجّلة ${tab === 'out' ? 'عليك' : 'لك'}</div>`}
        <div class="card"><b>🤲 دعاء قضاء الدين</b><p class="calc-why">«اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ، وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ» — رواه الترمذي (٣٥٦٣) وحسّنه.</p><p class="calc-why">«اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ» — رواه البخاري (٦٣٦٩).</p></div>
        ${src(['﴿يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا تَدَايَنتُم بِدَيْنٍ إِلَىٰ أَجَلٍ مُّسَمًّى فَاكْتُبُوهُ﴾ — البقرة: ٢٨٢.', '﴿وَإِن كَانَ ذُو عُسْرَةٍ فَنَظِرَةٌ إِلَىٰ مَيْسَرَةٍ ۚ وَأَن تَصَدَّقُوا خَيْرٌ لَّكُمْ﴾ — البقرة: ٢٨٠.', '«مَطْلُ الغنيِّ ظُلم» — رواه البخاري (٢٢٨٧) ومسلم (١٥٦٤).', '«من أخذ أموال الناس يريد أداءها أدّى الله عنه، ومن أخذ يريد إتلافها أتلفه الله» — رواه البخاري (٢٣٨٧).', 'بيانات السجل محفوظة على جهازك فقط ولا تُرسل لأي جهة.'])}`;
      $$('#lTab button').forEach((b) => { b.onclick = () => { tab = b.dataset.v; store.set('calc:ltab', tab); draw(); }; });
      $('#lNew').onclick = () => edit(-1);
      $$('[data-ed]').forEach((b) => { b.onclick = () => edit(+b.dataset.ed); });
      $$('[data-pay]').forEach((b) => { b.onclick = () => pay(+b.dataset.pay); });
      $$('[data-sh]').forEach((b) => { b.onclick = () => { const d = ledger()[+b.dataset.sh]; const p = paid(d); N.shareText(`📒 ${d.dir === 'out' ? 'دين عليّ' : 'دين لي'} — ${d.who}\nأصل الدين: ${money(d.a)}\nالمسدَّد: ${money(p)}\nالمتبقي: ${money(d.a - p)}${d.due ? `\nالاستحقاق: ${dstr(d.due)}` : ''}${(d.pays || []).length ? '\nالدفعات:\n' + d.pays.map((x) => `• ${dstr(x.t)}: ${money(x.a)}`).join('\n') : ''}`); }; });
    };
    function edit(i) {
      const L = ledger(); const d = i >= 0 ? L[i] : { dir: tab, who: '', a: '', due: '', note: '', rem: true, pays: [] };
      const sh = N.sheet(`<h3>${i >= 0 ? 'تعديل الدين' : 'دين جديد'}</h3>
        <div class="seg" id="eDir" style="margin-bottom:10px"><button data-v="out" class="${d.dir === 'out' ? 'active' : ''}">عليّ</button><button data-v="in" class="${d.dir === 'in' ? 'active' : ''}">لي</button></div>
        <div class="calc-row"><label>${d.dir === 'out' ? 'الدائن' : 'المدين'}</label><input class="calc-in" id="eW" value="${esc(d.who)}"></div>
        <div class="calc-row"><label>المبلغ</label><input class="calc-in" id="eA" inputmode="decimal" value="${esc(d.a)}"></div>
        <div class="calc-row"><label>تاريخ الاستحقاق (اختياري)</label><input class="calc-in" id="eD" type="date" value="${esc(d.due || '')}"></div>
        <div class="calc-row"><label>ملاحظة / الشهود / سبب الدين</label><input class="calc-in" id="eN" value="${esc(d.note || '')}"></div>
        <label class="calc-chk"><input type="checkbox" id="eR" ${d.rem ? 'checked' : ''}> تذكير يوم الاستحقاق${N.NATIVE ? '' : ' (في تطبيق أندرويد)'}</label>
        <button class="btn block" id="eS">حفظ</button>${i >= 0 ? '<button class="btn ghost block" id="eX" style="margin-top:6px">🗑 حذف الدين</button>' : ''}`);
      let dir = d.dir;
      $$('#eDir button', sh.el).forEach((b) => { b.onclick = () => { dir = b.dataset.v; $$('#eDir button', sh.el).forEach((x) => x.classList.toggle('active', x === b)); }; });
      $('#eS', sh.el).onclick = () => {
        const a = num($('#eA', sh.el).value); const who = $('#eW', sh.el).value.trim();
        if (!who || !a) { toast('أدخل الاسم والمبلغ'); return; }
        const nd = Object.assign({}, d, { dir, who, a, due: $('#eD', sh.el).value, note: $('#eN', sh.el).value.trim(), rem: $('#eR', sh.el).checked });
        const L2 = ledger(); if (i >= 0) L2[i] = nd; else L2.push(Object.assign(nd, { id: Date.now(), at: Date.now() }));
        saveLedger(L2); tab = dir; store.set('calc:ltab', tab); sh.close(); draw();
      };
      const x = $('#eX', sh.el); if (x) x.onclick = () => { if (!confirm('حذف هذا الدين وسجل دفعاته؟')) return; const L2 = ledger(); L2.splice(i, 1); saveLedger(L2); sh.close(); draw(); };
    }
    function pay(i) {
      const d = ledger()[i]; const rest = d.a - paid(d);
      const sh = N.sheet(`<h3>تسجيل سداد — ${esc(d.who)}</h3><p class="muted">المتبقي: ${money(rest)}</p>
        <div class="calc-row"><label>المبلغ المدفوع</label><input class="calc-in" id="pA" inputmode="decimal" value="${r2(rest)}"></div>
        <div class="calc-row"><label>التاريخ</label><input class="calc-in" id="pD" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
        ${d.dir === 'in' ? '<label class="calc-chk"><input type="checkbox" id="pF"> أسقطتُ الباقي عنه صدقةً ﴿وَأَن تَصَدَّقُوا خَيْرٌ لَّكُمْ﴾</label>' : ''}
        <button class="btn block" id="pS">حفظ</button>
        ${(d.pays || []).length ? `<h4>الدفعات السابقة</h4>${d.pays.map((p) => `<div class="pr-extra"><span>${dstr(p.t)}${p.f ? ' (إبراء)' : ''}</span><b>${money(p.a)}</b></div>`).join('')}` : ''}`);
      $('#pS', sh.el).onclick = () => {
        let a = num($('#pA', sh.el).value); if (a <= 0) { toast('أدخل المبلغ'); return; }
        a = Math.min(a, rest);
        const L = ledger(); L[i].pays = (L[i].pays || []).concat([{ a, t: $('#pD', sh.el).value || new Date().toISOString().slice(0, 10) }]);
        const f = $('#pF', sh.el); if (f && f.checked && rest - a > 0) L[i].pays.push({ a: rest - a, t: new Date().toISOString().slice(0, 10), f: 1 });
        saveLedger(L); sh.close(); draw(); toast(f && f.checked ? 'جزاك الله خيراً' : 'تم تسجيل السداد');
      };
    }
    draw();
  }

  // ================= خطة السداد =================
  function renderPlan() {
    const S = takeOpen({ rows: ledger().filter((d) => d.dir === 'out' && paid(d) < d.a).map((d) => ({ n: d.who, a: String(r2(d.a - paid(d))) })), m: '', how: 'prop' });
    if (!S.rows.length) S.rows = [{ n: '', a: '' }, { n: '', a: '' }];
    const draw = () => {
      N.view.innerHTML = `
        <div class="card"><h3>الديون الحالية</h3><div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>${rowsEditor('pR', S.rows)}
          <div class="calc-row" style="margin-top:10px"><label>المبلغ المتاح للسداد شهرياً</label><input class="calc-in" id="pM" inputmode="decimal" value="${esc(S.m)}"></div>
          <div class="calc-row"><label>طريقة التوزيع</label><select class="calc-in" id="pH"><option value="prop" ${S.how === 'prop' ? 'selected' : ''}>بالمحاصّة: كل دائن بنسبة دينه (أعدل بين الدائنين)</option><option value="small" ${S.how === 'small' ? 'selected' : ''}>الأصغر أولاً: إنهاء الديون الصغيرة تباعاً</option><option value="order" ${S.how === 'order' ? 'selected' : ''}>بالترتيب المُدخل (الأقدم أو الأحلّ أولاً)</option></select></div>
          <button class="btn block" id="pGo">📅 احسب خطة السداد</button></div>
        <div id="pRes"></div>
        ${src(['الدين الحالّ الذي طالب به صاحبه أولى بالتقديم من المؤجل؛ والمحاصّة (التوزيع بالنسبة) هي طريقة الفقهاء في قسمة مال المدين على غرمائه عند ضيقه.', '«مَطْلُ الغنيِّ ظُلم» — البخاري (٢٢٨٧) ومسلم (١٥٦٤)؛ فلا يؤخَّر السداد مع القدرة.', 'هذه الخطة تنظيم شخصي، وأي اتفاق مع الدائنين على التأجيل أو التقسيط يكون برضاهم دون زيادة على أصل الدين (فالزيادة مقابل التأجيل ربا).'])}`;
      curBind();
      const read = () => { readRows('pR', S.rows); S.m = $('#pM').value; S.how = $('#pH').value; };
      bindRows('pR', S.rows, () => { draw(); }, read);
      $('#pGo').onclick = () => { read(); compute(); };
    };
    function compute() {
      const debts = S.rows.map((r, i) => ({ i, n: r.n || `دين ${ar(i + 1)}`, a: num(r.a) })).filter((d) => d.a > 0);
      const M = num(S.m);
      if (!debts.length || M <= 0) { toast('أدخل الديون والمبلغ الشهري'); return; }
      const total = debts.reduce((s, d) => s + d.a, 0);
      const rest = debts.map((d) => d.a); const months = []; const finish = {};
      let k = 0;
      while (rest.some((x) => x > 0.005) && k < 600) {
        k++; let avail = M; const pay = debts.map(() => 0);
        let order = debts.map((_, j) => j).filter((j) => rest[j] > 0.005);
        if (S.how === 'small') order.sort((a, b) => rest[a] - rest[b]);
        if (S.how === 'prop') {
          // توزيع بالنسبة مع إعادة توزيع الفائض على من بقي
          while (avail > 0.005 && order.length) {
            const sum = order.reduce((s, j) => s + rest[j], 0); let used = 0;
            order.forEach((j) => { const p = Math.min(rest[j] - pay[j], (avail * rest[j]) / sum); pay[j] += p; used += p; });
            avail -= used; order = order.filter((j) => rest[j] - pay[j] > 0.005); if (used < 0.005) break;
          }
        } else order.forEach((j) => { const p = Math.min(rest[j], avail); pay[j] += p; avail -= p; });
        pay.forEach((p, j) => { rest[j] -= p; if (rest[j] <= 0.005 && !finish[j]) finish[j] = k; });
        months.push(pay);
      }
      const due = new Date(); due.setMonth(due.getMonth() + months.length);
      $('#pRes').innerHTML = `<div class="card calc-ok"><p class="calc-big">مدة السداد: <b>${mon(months.length)}</b></p><small class="muted">إجمالي الديون ${money(total)} • تنتهي تقريباً في ${due.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}</small>
        ${debts.map((d, j) => `<div class="pr-extra"><span>${esc(d.n)} (${money(d.a)})</span><b>ينتهي في الشهر ${ar(finish[j] || months.length)}</b></div>`).join('')}</div>
        <div class="card"><h3>جدول السداد${months.length > 12 ? ' (أول ١٢ شهراً)' : ''}</h3><div class="pt-wrap"><table class="pt calc-t"><thead><tr><th>الشهر</th>${debts.map((d) => `<th>${esc(d.n)}</th>`).join('')}</tr></thead><tbody>${months.slice(0, 12).map((p, mi) => `<tr><td>${ar(mi + 1)}</td>${debts.map((_, j) => `<td>${p[j] ? ar(r2(p[j])) : '—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>${exportBar('pEx')}`;
      saveHist('sadad', `خطة سداد — ${mon(months.length)}`, S, `إجمالي ${money(total)} • شهرياً ${money(M)}`);
      const lines = () => [{ t: `إجمالي الديون: ${money(total)} — المتاح شهرياً: ${money(M)} — المدة: ${months.length} شهراً`, b: 1 }, { table: [['الدائن', 'الدين', 'ينتهي في الشهر'], ...debts.map((d, j) => [d.n, money(d.a), String(finish[j] || months.length)])] }, { table: [['الشهر', ...debts.map((d) => d.n)], ...months.slice(0, 24).map((p, mi) => [String(mi + 1), ...debts.map((_, j) => (p[j] ? String(r2(p[j])) : '—'))])] }];
      bindExport('pEx', 'خطة سداد الديون', lines, () => `خطة سداد — ${months.length} شهراً\n` + debts.map((d, j) => `• ${d.n}: ${money(d.a)} — ينتهي في الشهر ${finish[j]}`).join('\n'));
    }
    draw();
  }

  // ================= قسمة الغرماء (المحاصّة) =================
  function renderMuhassa() {
    const S = takeOpen({ avail: '', rows: [{ n: '', a: '' }, { n: '', a: '' }] });
    const draw = () => {
      N.view.innerHTML = `
        <div class="card"><p class="muted" style="margin-top:0">إذا كان المال المتاح لا يكفي لسداد كل الديون الحالّة، يُقسم بين الدائنين كلٌّ بنسبة دينه.</p>
          <div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>
          <div class="calc-row"><label>المال المتاح للسداد</label><input class="calc-in" id="mA" inputmode="decimal" value="${esc(S.avail)}"></div>
          <h4>الدائنون وديونهم</h4>${rowsEditor('mR', S.rows)}
          <button class="btn block" id="mGo" style="margin-top:10px">⚖️ وزّع</button></div>
        <div id="mRes"></div>
        ${src(['قسمة مال المفلس أو المدين العاجز بين الغرماء بالمحاصّة (بنسبة ديونهم) هو المقرر عند الفقهاء في باب الحجر والتفليس.', '«من أدرك ماله بعينه عند رجل قد أفلس فهو أحق به من غيره» — رواه البخاري (٢٤٠٢) ومسلم (١٥٥٩)؛ فصاحب السلعة الموجودة بعينها يُقدَّم بها بشروطها، ولا تدخل في المحاصّة.', 'الدين الموثق برهن يُستوفى أولاً من ثمن الرهن، وما بقي منه يدخل في المحاصّة.'])}`;
      curBind();
      const read = () => { readRows('mR', S.rows); S.avail = $('#mA').value; };
      bindRows('mR', S.rows, draw, read);
      $('#mGo').onclick = () => {
        read(); const A = num(S.avail); const D = S.rows.map((r, i) => ({ n: r.n || `دائن ${ar(i + 1)}`, a: num(r.a) })).filter((d) => d.a > 0);
        const T = D.reduce((s, d) => s + d.a, 0); if (!A || !T) { toast('أدخل المال المتاح والديون'); return; }
        const ratio = Math.min(1, A / T);
        $('#mRes').innerHTML = `<div class="card calc-ok">${A >= T ? `<p class="calc-big">المال يكفي لسداد كل الديون، ويبقى <b>${money(A - T)}</b></p>` : `<p class="calc-big">يُعطى كل دائن <b>${pct(ratio)}</b> من دينه</p><small class="muted">إجمالي الديون ${money(T)} والمتاح ${money(A)}؛ ويبقى في الذمة ${money(T - A)} يُسدَّد عند اليسار.</small>`}
          <div class="pt-wrap" style="margin-top:10px"><table class="pt calc-t"><thead><tr><th>الدائن</th><th>الدين</th><th>يُعطى الآن</th><th>المتبقي</th></tr></thead><tbody>${D.map((d) => `<tr><td>${esc(d.n)}</td><td>${money(d.a)}</td><td><b>${money(d.a * ratio)}</b></td><td>${money(d.a * (1 - ratio))}</td></tr>`).join('')}</tbody></table></div></div>${exportBar('mEx')}`;
        saveHist('muhassa', `قسمة غرماء — ${pct(ratio)}`, S, `المتاح ${money(A)} من ${money(T)}`);
        bindExport('mEx', 'قسمة المال بين الدائنين', () => [{ t: `المتاح: ${money(A)} — إجمالي الديون: ${money(T)} — النسبة: ${pct(ratio)}`, b: 1 }, { table: [['الدائن', 'الدين', 'يُعطى الآن', 'المتبقي'], ...D.map((d) => [d.n, money(d.a), money(d.a * ratio), money(d.a * (1 - ratio))])] }], () => D.map((d) => `• ${d.n}: ${money(d.a * ratio)} من ${money(d.a)}`).join('\n'));
      };
    };
    draw();
  }

  // ================= ديون المتوفى =================
  const DT = [['ppl', 'دين لآدمي (قرض، ثمن، أجرة، مهر مؤخر…)'], ['zakat', 'زكاة واجبة لم تُخرج'], ['kaff', 'كفارة أو نذر لم يُؤدَّ'], ['hajj', 'حجة الإسلام الواجبة (تكلفتها)']];
  function renderDeathDebts() {
    const S = takeOpen({ total: '', funeral: '', mode: 'hanbali', rows: [{ n: '', a: '', t: 'ppl', r: '' }] });
    const draw = () => {
      N.view.innerHTML = `
        <div class="card"><div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>
          <div class="calc-row"><label>إجمالي التركة</label><input class="calc-in" id="dT" inputmode="decimal" value="${esc(S.total)}"></div>
          <div class="calc-row"><label>مصاريف التجهيز والدفن بالمعروف</label><input class="calc-in" id="dF" inputmode="decimal" value="${esc(S.funeral)}"></div>
          <div class="calc-row"><label>الترجيح عند ضيق التركة</label><select class="calc-in" id="dM">
            <option value="hanbali" ${S.mode === 'hanbali' ? 'selected' : ''}>الحنابلة: حقوق الله والعباد سواء بالمحاصّة</option>
            <option value="shafii" ${S.mode === 'shafii' ? 'selected' : ''}>الشافعية: دين الله مقدَّم</option>
            <option value="hanafi" ${S.mode === 'hanafi' ? 'selected' : ''}>الحنفية: ديون العباد فقط، وحقوق الله من الثلث إن أوصى بها</option></select></div></div>
        <div class="card"><h3>الديون</h3>${rowsEditor('dR', S.rows, (r, i) => `<select class="calc-in" data-t="${i}">${DT.map(([k, t]) => `<option value="${k}" ${r.t === k ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
          <label class="calc-chk" style="margin-top:8px"><input type="checkbox" id="dW" ${S.willed ? 'checked' : ''}> أوصى المتوفى بإخراج حقوق الله (للحنفية)</label>
          <button class="btn block" id="dGo" style="margin-top:10px">⚖️ احسب</button></div>
        <div id="dRes"></div>
        ${src(['﴿مِن بَعْدِ وَصِيَّةٍ يُوصِي بِهَا أَوْ دَيْنٍ﴾ — النساء: ١١؛ والدين مقدَّم على الوصية بالإجماع.', '«نفس المؤمن معلّقة بدينه حتى يُقضى عنه» — رواه الترمذي (١٠٧٨) وصححه الألباني.', '«اقضوا الله، فالله أحق بالوفاء» — رواه البخاري (١٨٥٢)، وبه استدل الجمهور على قضاء حقوق الله من التركة.', 'ترتيب الحقوق في قانون المواريث المصري (م٤): التجهيز، ثم الديون، ثم الوصية في حدودها، ثم الباقي للورثة.', 'الدين المتعلق بعين من التركة (كالمرهونة) يُقدَّم من ثمنها عند الجمهور؛ أدخله هنا بقيمة ما يُستوفى منه.'])}`;
      curBind();
      const read = () => { readRows('dR', S.rows, (r, i) => { r.t = $(`#dR [data-t="${i}"]`).value; }); S.total = $('#dT').value; S.funeral = $('#dF').value; S.mode = $('#dM').value; S.willed = $('#dW').checked; };
      bindRows('dR', S.rows, draw, read, { t: 'ppl' });
      $('#dGo').onclick = () => { read(); compute(); };
    };
    function compute() {
      const T = num(S.total); const F = num(S.funeral); if (!T) { toast('أدخل التركة'); return; }
      let avail = Math.max(0, T - F);
      const D = S.rows.map((r, i) => ({ n: r.n || DT.find((x) => x[0] === r.t)[1].split(' (')[0], a: num(r.a), t: r.t, allah: r.t !== 'ppl', i })).filter((d) => d.a > 0);
      const notes = [];
      const payOf = {};
      const prop = (list, money0) => { const sum = list.reduce((s, d) => s + d.a, 0); const ratio = sum ? Math.min(1, money0 / sum) : 0; list.forEach((d) => { payOf[d.i] = d.a * ratio; }); return Math.min(sum, money0); };
      let fromThird = 0;
      if (S.mode === 'hanbali') avail -= prop(D, avail);
      else if (S.mode === 'shafii') { avail -= prop(D.filter((d) => d.allah), avail); avail -= prop(D.filter((d) => !d.allah), avail); }
      else {
        avail -= prop(D.filter((d) => !d.allah), avail);
        const A = D.filter((d) => d.allah);
        if (A.length) {
          if (S.willed) { const third = avail / 3; fromThird = prop(A, third); avail -= fromThird; notes.push('حقوق الله أُخرجت من ثلث الباقي لأنه أوصى بها (عند الحنفية تكون كالوصية).'); }
          else { A.forEach((d) => { payOf[d.i] = 0; }); notes.push('عند الحنفية تسقط حقوق الله في أحكام الدنيا بالموت إن لم يوصِ بها، ويُستحب للورثة إخراجها تبرعاً. والجمهور على وجوب إخراجها من التركة.'); }
        }
      }
      const allPaid = D.every((d) => payOf[d.i] >= d.a - 0.005);
      if (!allPaid) notes.push('التركة لا تفي بكل الديون؛ فما بقي يبقى في ذمة المتوفى، ويُستحب للورثة وغيرهم قضاؤه عنه، ولا يلزمهم من أموالهم الخاصة.');
      $('#dRes').innerHTML = `<div class="card ${allPaid ? 'calc-ok' : 'calc-warn'}"><div class="pr-extra"><span>التركة</span><b>${money(T)}</b></div>${F ? `<div class="pr-extra"><span>− التجهيز والدفن</span><b>${money(F)}</b></div>` : ''}
        <div class="pt-wrap" style="margin-top:8px"><table class="pt calc-t"><thead><tr><th>الدين</th><th>المستحق</th><th>يُسدَّد</th><th>يبقى</th></tr></thead><tbody>${D.map((d) => `<tr><td>${esc(d.n)}<small>${d.allah ? 'حق لله' : 'حق لآدمي'}</small></td><td>${money(d.a)}</td><td><b>${money(payOf[d.i] || 0)}</b></td><td>${money(d.a - (payOf[d.i] || 0))}</td></tr>`).join('')}</tbody></table></div>
        <p class="calc-big">الباقي بعد الديون: <b>${money(avail)}</b></p>${notes.map((n) => `<p class="calc-why">${esc(n)}</p>`).join('')}
        ${avail > 0 ? '<button class="btn block" id="dInh">⚖️ انتقل لتوزيع الباقي على الورثة</button>' : ''}</div>${exportBar('dEx')}`;
      const b = $('#dInh'); if (b) b.onclick = () => { store.set('calc:open', { total: String(r2(avail)), funeral: '', debts: '', will: '', mode: S.mode === 'hanafi' ? 'hanafi' : 'egypt', gender: 'm', h: {}, ww: [] }); go('c/mirath'); };
      saveHist('tdeath', `ديون متوفى — الباقي ${money(avail)}`, S, `التركة ${money(T)}`);
      bindExport('dEx', 'سداد ديون المتوفى', () => [{ t: `التركة: ${money(T)} — التجهيز: ${money(F)}`, b: 1 }, { table: [['الدين', 'النوع', 'المستحق', 'يُسدَّد'], ...D.map((d) => [d.n, d.allah ? 'حق لله' : 'حق لآدمي', money(d.a), money(payOf[d.i] || 0)])] }, { t: `الباقي للوصية والورثة: ${money(avail)}`, b: 1 }, ...notes.map((n) => ({ t: n, s: 24, c: '#555' }))], () => D.map((d) => `• ${d.n}: ${money(payOf[d.i] || 0)} من ${money(d.a)}`).join('\n') + `\nالباقي: ${money(avail)}`);
    }
    draw();
  }

  // ================= التقسيط =================
  function renderTaqsit() {
    const S = takeOpen({ cash: '', down: '', months: '12', inst: '', total: '', by: 'inst', pen: false });
    const draw = () => {
      N.view.innerHTML = `
        <div class="card"><div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>
          <div class="calc-row"><label>السعر نقداً (الحالّ)</label><input class="calc-in" id="tC" inputmode="decimal" value="${esc(S.cash)}"></div>
          <div class="calc-row"><label>المقدَّم</label><input class="calc-in" id="tD" inputmode="decimal" value="${esc(S.down)}" placeholder="0"></div>
          <div class="calc-row"><label>عدد الأشهر</label><input class="calc-in" id="tM" inputmode="numeric" value="${esc(S.months)}"></div>
          <div class="seg" id="tBy" style="margin:8px 0"><button data-v="inst" class="${S.by === 'inst' ? 'active' : ''}">أعرف القسط الشهري</button><button data-v="total" class="${S.by === 'total' ? 'active' : ''}">أعرف إجمالي سعر التقسيط</button><button data-v="pct" class="${S.by === 'pct' ? 'active' : ''}">أعرف نسبة الزيادة</button></div>
          <div class="calc-row"><label>${S.by === 'inst' ? 'القسط الشهري' : S.by === 'total' ? 'إجمالي سعر التقسيط (شامل المقدَّم)' : 'نسبة الزيادة على السعر النقدي ٪'}</label><input class="calc-in" id="tV" inputmode="decimal" value="${esc(S.by === 'inst' ? S.inst : S.total)}"></div>
          <label class="calc-chk"><input type="checkbox" id="tP" ${S.pen ? 'checked' : ''}> العقد فيه غرامة مالية تزيد عند تأخر السداد</label>
          <button class="btn block" id="tGo">🧾 احسب</button></div>
        <div id="tRes"></div>
        ${src(['يجوز أن يكون ثمن البيع المؤجل أو المقسَّط أكثر من الثمن الحالّ، بشرط أن يُحدَّد الثمن الإجمالي عند العقد وأن تكون السلعة مملوكة للبائع — قرار مجمع الفقه الإسلامي الدولي رقم ٥١ (٢/٦) بشأن البيع بالتقسيط.', 'لا يجوز إلزام المشتري المتأخر بزيادة على الدين، شُرطت أو لم تُشترط، لأنها ربا — القرار نفسه.', 'الفرق بين التقسيط الجائز والقرض الربوي: في التقسيط تشتري سلعة بثمن أعلى معلوم ثابت؛ وفي القرض الربوي تقترض نقداً وتردّه بزيادة، أو تزيد الزيادة كلما تأخرت.', '﴿وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا﴾ — البقرة: ٢٧٥.'])}`;
      curBind();
      $$('#tBy button').forEach((b) => { b.onclick = () => { read(); S.by = b.dataset.v; draw(); }; });
      $('#tGo').onclick = () => { read(); compute(); };
    };
    function read() { S.cash = $('#tC').value; S.down = $('#tD').value; S.months = $('#tM').value; const v = $('#tV').value; if (S.by === 'inst') S.inst = v; else S.total = v; S.pen = $('#tP').checked; }
    function compute() {
      const cash = num(S.cash); const down = num(S.down); const n = Math.max(1, Math.round(num(S.months)));
      if (!cash) { toast('أدخل السعر النقدي'); return; }
      let inst; let total;
      if (S.by === 'inst') { inst = num(S.inst); total = down + inst * n; } else if (S.by === 'total') { total = num(S.total); inst = (total - down) / n; } else { total = cash * (1 + num(S.total) / 100); inst = (total - down) / n; }
      if (!inst || inst < 0) { toast('أدخل القيمة'); return; }
      const inc = total - cash; const incPct = inc / cash; const fin = cash - down; const perYear = fin > 0 ? (inc / fin) / (n / 12) : 0;
      $('#tRes').innerHTML = `<div class="card calc-ok">
        <div class="pr-extra"><span>القسط الشهري</span><b>${money(inst)}</b></div>
        <div class="pr-extra"><span>إجمالي ما ستدفعه</span><b>${money(total)}</b></div>
        <div class="pr-extra"><span>الزيادة عن السعر النقدي</span><b>${money(inc)} (${pct(incPct)})</b></div>
        <div class="pr-extra"><span>متوسط الزيادة السنوية على المبلغ المؤجَّل</span><b>${pct(perYear)}</b></div>
        <small class="muted">«متوسط الزيادة السنوية» للمقارنة بين العروض فقط؛ والمعتبر شرعاً أن يكون الثمن الإجمالي معلوماً ثابتاً عند العقد.</small></div>
        ${S.pen ? '<div class="card calc-warn"><b>⚠️ تنبيه</b><p class="calc-why">الغرامة المالية التي تزيد على المدين عند التأخر وتعود للبائع هي من ربا الديون عند المجامع الفقهية. يجوز بدلها اشتراط حلول باقي الأقساط عند التأخر بلا عذر، أو التزام بالتصدق يُصرف في وجوه الخير (عند من أجازه من الهيئات الشرعية) لا لمصلحة البائع. راجع العقد مع مختص.</p></div>' : ''}
        ${exportBar('tEx')}`;
      saveHist('taqsit', `تقسيط — ${money(inst)} × ${ar(n)}`, S, `زيادة ${pct(incPct)}`);
      bindExport('tEx', 'حساب التقسيط', () => [{ table: [['البند', 'القيمة'], ['السعر النقدي', money(cash)], ['المقدَّم', money(down)], ['عدد الأشهر', String(n)], ['القسط الشهري', money(inst)], ['الإجمالي', money(total)], ['الزيادة', `${money(inc)} (${pct(incPct)})`]] }], () => `السعر نقداً ${money(cash)}\nالمقدم ${money(down)}\nالقسط ${money(inst)} × ${n} شهراً\nالإجمالي ${money(total)} (زيادة ${pct(incPct)})`);
    }
    draw();
  }

  // ================= البيع والربح =================
  function renderBay() {
    const S = takeOpen({ cost: '', exp: '', qty: '1', price: '', want: '', disc: '' });
    N.view.innerHTML = `
      <div class="card"><div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>
        <div class="calc-row"><label>تكلفة شراء الوحدة</label><input class="calc-in" id="bC" inputmode="decimal" value="${esc(S.cost)}"></div>
        <div class="calc-row"><label>مصاريف إضافية للوحدة (نقل، تخزين…)</label><input class="calc-in" id="bE" inputmode="decimal" value="${esc(S.exp)}" placeholder="0"></div>
        <div class="calc-row"><label>عدد الوحدات</label><input class="calc-in" id="bQ" inputmode="numeric" value="${esc(S.qty)}"></div>
        <div class="calc-row"><label>سعر البيع للوحدة (أو اتركه واكتب نسبة الربح)</label><input class="calc-in" id="bP" inputmode="decimal" value="${esc(S.price)}"></div>
        <div class="calc-row"><label>نسبة الربح المطلوبة من التكلفة ٪</label><input class="calc-in" id="bW" inputmode="decimal" value="${esc(S.want)}"></div>
        <div class="calc-row"><label>خصم على سعر البيع ٪ (اختياري)</label><input class="calc-in" id="bD" inputmode="decimal" value="${esc(S.disc)}"></div>
        <button class="btn block" id="bGo">🏷️ احسب</button></div>
      <div id="bRes"></div>
      ${src(['لم يحدد الشرع نسبة ربح ثابتة، والمعتبر التراضي مع الصدق والبيان وعدم الغش، وعدم الغبن الفاحش واستغلال حاجة الناس، وعدم الاحتكار.', '«البيِّعان بالخيار ما لم يتفرقا، فإن صدقا وبيّنا بورك لهما في بيعهما، وإن كتما وكذبا مُحقت بركة بيعهما» — رواه البخاري (٢٠٧٩) ومسلم (١٥٣٢).', '«لا يحتكر إلا خاطئ» — رواه مسلم (١٦٠٥).', '«من غشّ فليس مني» — رواه مسلم (١٠٢).'])}`;
    curBind();
    $('#bGo').onclick = () => {
      S.cost = $('#bC').value; S.exp = $('#bE').value; S.qty = $('#bQ').value; S.price = $('#bP').value; S.want = $('#bW').value; S.disc = $('#bD').value;
      const c = num(S.cost) + num(S.exp); const q = Math.max(1, num(S.qty)); if (!c) { toast('أدخل التكلفة'); return; }
      let p = num(S.price); if (!p && num(S.want)) p = c * (1 + num(S.want) / 100); if (!p) { toast('أدخل سعر البيع أو نسبة الربح'); return; }
      const pd = p * (1 - num(S.disc) / 100); const prof = pd - c;
      $('#bRes').innerHTML = `<div class="card ${prof >= 0 ? 'calc-ok' : 'calc-warn'}">
        <div class="pr-extra"><span>التكلفة الكلية للوحدة</span><b>${money(c)}</b></div>
        <div class="pr-extra"><span>سعر البيع${num(S.disc) ? ' بعد الخصم' : ''}</span><b>${money(pd)}</b></div>
        <div class="pr-extra"><span>${prof >= 0 ? 'الربح' : 'الخسارة'} في الوحدة</span><b>${money(Math.abs(prof))}</b></div>
        <div class="pr-extra"><span>نسبة ${prof >= 0 ? 'الربح' : 'الخسارة'} من التكلفة</span><b>${pct(Math.abs(prof) / c)}</b></div>
        <div class="pr-extra"><span>هامش الربح من سعر البيع</span><b>${pct(prof / pd)}</b></div>
        ${q > 1 ? `<div class="pr-extra"><span>إجمالي ${prof >= 0 ? 'الربح' : 'الخسارة'} (عدد الوحدات ${ar(q)})</span><b>${money(Math.abs(prof) * q)}</b></div>` : ''}
        <div class="pr-extra"><span>سعر التعادل (بلا ربح ولا خسارة)</span><b>${money(c)}</b></div></div>`;
      saveHist('bay', `بيع — ${prof >= 0 ? 'ربح' : 'خسارة'} ${pct(Math.abs(prof) / c)}`, S, `${money(pd)} للوحدة`);
    };
  }

  // ================= رد المظالم =================
  const OWN = [['alive', 'صاحبه حي معروف'], ['dead', 'صاحبه متوفى'], ['unknown', 'صاحبه مجهول']];
  function renderMazalim() {
    const K = 'calc:mazalim';
    const S = store.get(K, { rows: [], m: '' });
    const draw = () => {
      const open = S.rows.filter((r) => !r.done);
      const total = open.reduce((s, r) => s + num(r.a), 0);
      N.view.innerHTML = `
        <div class="card calc-disc"><b>🤍 باب التوبة مفتوح</b><p>من شروط التوبة من حقوق العباد ردّها إلى أصحابها أو استحلالهم. سجّل ما في ذمتك هنا (محفوظ على جهازك فقط)، وستعرف كيف تبرأ منه.</p></div>
        <div class="card"><div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>
          ${rowsEditor('zR', S.rows, (r, i) => `<select class="calc-in" data-o="${i}">${OWN.map(([k, t]) => `<option value="${k}" ${r.o === k ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
          <div class="calc-row" style="margin-top:10px"><label>ما تستطيع ردّه شهرياً (اختياري)</label><input class="calc-in" id="zM" inputmode="decimal" value="${esc(S.m)}"></div>
          <button class="btn block" id="zGo">💾 حفظ وعرض الخطة</button></div>
        <div id="zRes"></div>
        <div class="card"><b>🗣️ المظالم في غير المال (غيبة، إساءة…)</b><p class="calc-why">تُستحلّ من صاحبها إن أمكن بلا مفسدة أكبر؛ فإن خُشي من إخباره مفسدة، دعا له واستغفر له وذكره بخير في المواضع التي ذكره فيها بسوء — وهو ما ذكره جمع من أهل العلم.</p></div>
        ${src(['«من كانت له مظلمة لأخيه من عرضه أو شيء فليتحلّله منه اليوم، قبل أن لا يكون دينار ولا درهم…» — رواه البخاري (٢٤٤٩).', '«أتدرون ما المفلس؟… يأتي يوم القيامة بصلاة وصيام وزكاة، ويأتي قد شتم هذا وأكل مال هذا…» — رواه مسلم (٢٥٨١).', 'إن مات صاحب الحق رُدّ إلى ورثته لأنه من تركته؛ وإن جُهل صاحبه أو تعذّر الوصول إليه تُصدِّق به عنه، وهو قول جمهور الفقهاء، فإن ظهر بعد ذلك خُيّر بين إمضاء الصدقة وأخذ حقه.', 'العبرة في ردّ الديون الثابتة بعملةٍ ما هي بالمثل لا بالقيمة — قرار مجمع الفقه الإسلامي الدولي ٤٢ (٤/٥)؛ وفي الأشياء المغصوبة تُرد بعينها أو مثلها أو قيمتها.'])}`;
      curBind();
      const read = () => { readRows('zR', S.rows, (r, i) => { r.o = $(`#zR [data-o="${i}"]`).value; }); S.m = $('#zM').value; };
      bindRows('zR', S.rows, draw, read, { o: 'alive' });
      $('#zGo').onclick = () => { read(); store.set(K, S); show(); };
      if (open.length) show();
      function show() {
        const R = S.rows.filter((r) => num(r.a) > 0);
        const by = (o) => R.filter((r) => r.o === o).reduce((s, r) => s + num(r.a), 0);
        const T = R.reduce((s, r) => s + num(r.a), 0); const M = num(S.m);
        $('#zRes').innerHTML = R.length ? `<div class="card"><p class="calc-big">إجمالي ما في الذمة: <b>${money(T)}</b></p>
          ${by('alive') ? `<div class="pr-extra"><span>يُردّ إلى أصحابه مباشرة</span><b>${money(by('alive'))}</b></div>` : ''}
          ${by('dead') ? `<div class="pr-extra"><span>يُردّ إلى ورثة أصحابه</span><b>${money(by('dead'))}</b></div>` : ''}
          ${by('unknown') ? `<div class="pr-extra"><span>يُتصدَّق به عن أصحابه</span><b>${money(by('unknown'))}</b></div>` : ''}
          ${M ? `<p class="muted">بمعدل ${money(M)} شهرياً تبرأ ذمتك خلال <b>${mon(Math.ceil(T / M))}</b> بإذن الله. وبادر بما استطعت، فالأجل لا يُعلم.</p>` : ''}
          <p class="calc-why">يجوز أن تردّ الحق دون أن تُخبر صاحبه بالسبب إن خشيت مفسدة، كأن تضعه في حسابه أو تهديه إليه بطريقة تصل إليه.</p></div>` : '';
      }
    };
    draw();
  }

  // ---------- التسجيل في قائمة الحاسبات ----------
  const NEW = [
    { k: 'dayn', ic: '📒', t: 'سجل ديوني', d: 'ديون لك وعليك، والدفعات، والتذكير يوم الاستحقاق', cat: 'mal', ready: 1 },
    { k: 'sadad', ic: '📅', t: 'خطة سداد الديون', d: 'كم شهراً تحتاج، وكيف توزّع المتاح بين الدائنين', cat: 'mal', ready: 1 },
    { k: 'muhassa', ic: '⚖️', t: 'توزيع مبلغ على الدائنين', d: 'قسمة الغرماء بالمحاصّة عند عدم كفاية المال', cat: 'mal', ready: 1 },
    { k: 'tdeath', ic: '🕊️', t: 'سداد ديون المتوفى', d: 'ترتيب التجهيز والديون وحقوق الله قبل الميراث', cat: 'mawarith', ready: 1 },
    { k: 'taqsit', ic: '🧾', t: 'حاسبة التقسيط', d: 'القسط والزيادة والمقارنة، مع ضوابط البيع بالتقسيط', cat: 'mal', ready: 1 },
    { k: 'bay', ic: '🏷️', t: 'حاسبة البيع والربح', d: 'التكلفة والربح والهامش والخصم وسعر التعادل', cat: 'mal', ready: 1 },
    { k: 'mazalim', ic: '🤍', t: 'رد المظالم', d: 'سجل ما في ذمتك وخطة لردّه إلى أصحابه', cat: 'mal', ready: 1 },
  ];
  const at = C.TOOLS.findIndex((t) => t.k === 'debts');
  C.TOOLS.splice(at >= 0 ? at : C.TOOLS.length, at >= 0 ? 1 : 0, ...NEW);
  Object.assign(C.CALCS, { dayn: [renderLedger, 'سجل ديوني'], sadad: [renderPlan, 'خطة سداد الديون'], muhassa: [renderMuhassa, 'توزيع مبلغ على الدائنين'], tdeath: [renderDeathDebts, 'سداد ديون المتوفى'], taqsit: [renderTaqsit, 'حاسبة التقسيط'], bay: [renderBay, 'حاسبة البيع والربح'], mazalim: [renderMazalim, 'رد المظالم'] });
  setTimeout(scheduleDebtRem, 4000);
});
