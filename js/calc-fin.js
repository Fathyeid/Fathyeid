/* الحاسبات — المرحلة الثالثة: المعاملات المالية الإسلامية
 * المرابحة، المضاربة، الشركة (العنان)، المشاركة المتناقصة، الإجارة، الوكالة والسمسرة، التعويض.
 * الحساب إرشادي، والضوابط منقولة من قرارات مجمع الفقه الإسلامي الدولي والمعايير الشرعية (أيوفي). */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const C = N.calc; if (!C || !C.rowsEditor) return;
  const { $, $$, store, toast, ar, esc } = N;
  const { num, money, pct, curSelect, saveHist, takeOpen, exportBar, bindExport, rowsEditor, readRows, bindRows, src, r2, mon } = C;
  const curBind = () => { const el = $('#cCur'); if (el) el.onchange = (e) => store.set('calc:cur', e.target.value); };
  const row = (id, label, v, ph = '', type = 'decimal') => `<div class="calc-row"><label>${label}</label><input class="calc-in" id="${id}" inputmode="${type}" value="${esc(v ?? '')}" placeholder="${ph}"></div>`;
  const kv = (k, v) => `<div class="pr-extra"><span>${k}</span><b>${v}</b></div>`;
  const warn = (t) => `<div class="card calc-warn"><b>⚠️ تنبيه شرعي</b><p class="calc-why">${t}</p></div>`;

  // ================= المرابحة =================
  function renderMurabaha() {
    const S = takeOpen({ cost: '', exp: '', how: 'pct', p: '', down: '', months: '12', own: true, late: false });
    const draw = () => {
      N.view.innerHTML = `
        <div class="card"><p class="muted" style="margin-top:0">بيع المرابحة: أن يبيع السلعة بثمن شرائها مع ربح معلوم. وفي «المرابحة للآمر بالشراء» يشتري المصرف أو التاجر السلعة أولاً ثم يبيعها لك مقسّطة.</p>
          <div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>
          ${row('rC', 'ثمن شراء السلعة على البائع', S.cost)}${row('rE', 'المصروفات المباشرة (شحن، جمارك، تسجيل…)', S.exp, '0')}
          <div class="seg" id="rH" style="margin:8px 0"><button data-v="pct" class="${S.how === 'pct' ? 'active' : ''}">الربح نسبة من التكلفة</button><button data-v="amt" class="${S.how === 'amt' ? 'active' : ''}">الربح مبلغ مقطوع</button></div>
          ${row('rP', S.how === 'pct' ? 'نسبة الربح ٪' : 'مبلغ الربح', S.p)}${row('rD', 'المقدَّم', S.down, '0')}${row('rM', 'عدد الأقساط الشهرية (١ = حالّ)', S.months, '', 'numeric')}
          <label class="calc-chk"><input type="checkbox" id="rO" ${S.own ? 'checked' : ''}> البائع يملك السلعة ويقبضها قبل بيعها لي</label>
          <label class="calc-chk"><input type="checkbox" id="rL" ${S.late ? 'checked' : ''}> العقد ينص على زيادة الثمن أو فوائد عند التأخر</label>
          <button class="btn block" id="rGo">🧮 احسب</button></div>
        <div id="rRes"></div>
        ${src(['﴿وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا﴾ — البقرة: ٢٧٥.', '«لا تبع ما ليس عندك» — رواه أبو داود (٣٥٠٣) والترمذي (١٢٣٢) وصححه الألباني؛ فيُشترط تملّك البائع للسلعة وقبضها قبل بيعها.', 'بيع المرابحة للآمر بالشراء جائز إذا وقع على سلعة بعد دخولها في ملك البائع وحصول القبض، وكانت المواعدة ملزمة لطرف واحد فقط — قرار مجمع الفقه الإسلامي الدولي ٤٠-٤١ (٢/٥ و٣/٥).', 'يجوز أن يكون الثمن المؤجل أكبر من الحالّ، ولا تجوز زيادته بعد العقد عند التأخر — قرار المجمع ٥١ (٢/٦).'])}`;
      curBind();
      $$('#rH button').forEach((b) => { b.onclick = () => { read(); S.how = b.dataset.v; draw(); }; });
      $('#rGo').onclick = () => { read(); compute(); };
    };
    function read() { S.cost = $('#rC').value; S.exp = $('#rE').value; S.p = $('#rP').value; S.down = $('#rD').value; S.months = $('#rM').value; S.own = $('#rO').checked; S.late = $('#rL').checked; }
    function compute() {
      const cost = num(S.cost) + num(S.exp); if (!cost) { toast('أدخل ثمن الشراء'); return; }
      const profit = S.how === 'pct' ? cost * num(S.p) / 100 : num(S.p);
      const price = cost + profit; const down = num(S.down); const n = Math.max(1, Math.round(num(S.months)));
      const inst = (price - down) / n;
      $('#rRes').innerHTML = `<div class="card calc-ok">${kv('التكلفة الكلية (رأس المال)', money(cost))}${kv('الربح', `${money(profit)} (${pct(profit / cost)})`)}${kv('ثمن البيع بالمرابحة', money(price))}${down ? kv('المقدَّم', money(down)) : ''}${n > 1 ? kv(`القسط الشهري × ${ar(n)}`, money(inst)) : ''}
        <p class="calc-why">صيغة الإفصاح في العقد: «أبيعك هذه السلعة بما قامت عليّ (${money(cost)}) وربح ${money(profit)}، فيكون الثمن ${money(price)}».</p></div>
        ${!S.own ? warn('لا يصح أن يبيعك السلعة قبل أن يملكها ويقبضها (ولو قبضاً حكمياً)؛ وإلا صار العقد تمويلاً ربوياً في صورة بيع. الواجب: وعد بالشراء أولاً، ثم يشتري البائع، ثم يُعقد البيع.') : ''}
        ${S.late ? warn('زيادة الثمن أو احتساب فوائد على التأخر بعد ثبوت الدين ربا محرم. البديل المقبول عند المجامع: اشتراط حلول باقي الأقساط عند المماطلة، أو التزام بالتصدق يُصرف في وجوه الخير لا لمصلحة البائع.') : ''}
        ${exportBar('rEx')}`;
      saveHist('murabaha', `مرابحة — ${money(price)}`, S, `ربح ${pct(profit / cost)}`);
      bindExport('rEx', 'حساب المرابحة', () => [{ table: [['البند', 'القيمة'], ['التكلفة الكلية', money(cost)], ['الربح', `${money(profit)} (${pct(profit / cost)})`], ['ثمن البيع', money(price)], ['المقدم', money(down)], ['القسط الشهري', `${money(inst)} × ${n}`]] }], () => `مرابحة: التكلفة ${money(cost)} + ربح ${money(profit)} = ${money(price)}${n > 1 ? `\nالقسط ${money(inst)} × ${n}` : ''}`);
    }
    draw();
  }

  // ================= المضاربة =================
  function renderMudaraba() {
    const S = takeOpen({ cap: '', end: '', ratio: '50', type: 'ratio', fixed: '', neg: false, prev: '' });
    const draw = () => {
      N.view.innerHTML = `
        <div class="card"><p class="muted" style="margin-top:0">المضاربة: مال من طرف (ربّ المال) وعمل من طرف (المضارب)، والربح بينهما بنسبة شائعة متفق عليها.</p>
          <div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>
          ${row('uC', 'رأس مال المضاربة', S.cap)}${row('uE', 'قيمة المال عند التصفية (نقداً وبضائع بسعر السوق)', S.end)}${row('uP', 'أرباح وُزّعت سابقاً تحت الحساب (إن وُجدت)', S.prev, '0')}
          <div class="calc-row"><label>طريقة تحديد نصيب المضارب في العقد</label><select class="calc-in" id="uT"><option value="ratio" ${S.type === 'ratio' ? 'selected' : ''}>نسبة شائعة من الربح</option><option value="fixed" ${S.type === 'fixed' ? 'selected' : ''}>مبلغ ثابت أو نسبة من رأس المال</option></select></div>
          ${S.type === 'ratio' ? row('uR', 'نسبة المضارب من الربح ٪', S.ratio) : row('uF', 'المبلغ الثابت المتفق عليه', S.fixed)}
          <label class="calc-chk"><input type="checkbox" id="uN" ${S.neg ? 'checked' : ''}> الخسارة بسبب تعدّي المضارب أو تقصيره أو مخالفته الشروط</label>
          <button class="btn block" id="uGo">🧮 احسب التصفية</button></div>
        <div id="uRes"></div>
        ${src(['أجمع العلماء على جواز المضاربة (القراض) — نقله ابن المنذر في «الإجماع»، وعمل بها الصحابة رضي الله عنهم.', 'يُشترط أن يكون الربح جزءاً شائعاً معلوماً (كالنصف والثلث)؛ فإن شُرط لأحدهما مبلغ مقطوع أو نسبة من رأس المال فسدت المضاربة بالإجماع لاحتمال ألا يربح غيره.', 'الخسارة على رب المال وحده، ويخسر المضارب جهده، ولا يضمن إلا بالتعدي أو التقصير أو مخالفة الشروط.', 'الربح وقاية لرأس المال: لا يستحق أحد ربحاً حتى يسلم رأس المال، وما وُزّع تحت الحساب يُرد لجبر الخسارة عند التصفية.', 'لا يجوز أن يضمن المضارب رأس المال — قرار مجمع الفقه الإسلامي الدولي ٣٠ (٥/٤) بشأن سندات المقارضة.'])}`;
      curBind();
      $('#uT').onchange = () => { read(); S.type = $('#uT').value; draw(); };
      $('#uGo').onclick = () => { read(); compute(); };
    };
    function read() { S.cap = $('#uC').value; S.end = $('#uE').value; S.prev = $('#uP').value; S.type = $('#uT').value; if ($('#uR')) S.ratio = $('#uR').value; if ($('#uF')) S.fixed = $('#uF').value; S.neg = $('#uN').checked; }
    function compute() {
      const cap = num(S.cap); const end = num(S.end); const prev = num(S.prev);
      if (!cap) { toast('أدخل رأس المال'); return; }
      if (S.type === 'fixed') { $('#uRes').innerHTML = warn('اشتراط مبلغ ثابت أو نسبة من رأس المال لأحد الطرفين يُفسد المضاربة بإجماع الفقهاء؛ فإن وقع: فللمضارب أجرة مثله، والربح كله والخسارة على رب المال (عند الجمهور). صحّح العقد بجعل نصيب كل طرف نسبة شائعة من الربح.'); return; }
      const total = end + prev; const profit = total - cap; const r = num(S.ratio) / 100;
      let out = '';
      if (profit > 0) {
        const m = profit * r; const o = profit - m;
        out = `<div class="card calc-ok"><p class="calc-big">الربح المحقق: <b>${money(profit)}</b> (${pct(profit / cap)})</p>${kv('نصيب المضارب', money(m))}${kv('نصيب رب المال من الربح', money(o))}${kv('يُسلَّم لرب المال إجمالاً', money(cap + o))}${prev ? kv('منها موزَّع سابقاً تحت الحساب', money(prev)) : ''}<p class="calc-why">يُسترد رأس المال أولاً، ثم يُقسم الربح: ${pct(r)} للمضارب و${pct(1 - r)} لرب المال.</p></div>`;
      } else {
        const loss = -profit;
        out = `<div class="card ${S.neg ? 'calc-warn' : ''}"><p class="calc-big">${loss ? `الخسارة: <b>${money(loss)}</b> (${pct(loss / cap)})` : 'لا ربح ولا خسارة'}</p>
          ${S.neg ? `${kv('يضمنها المضارب لتعديه أو تقصيره', money(loss))}` : `${kv('يتحملها رب المال', money(loss))}${kv('يتحمل المضارب', 'جهده وعمله فقط')}`}
          ${prev ? `<p class="calc-why">ما وُزّع سابقاً تحت الحساب (${money(prev)}) يُحسب لجبر رأس المال؛ فإن كان المضارب أخذ منه شيئاً لزمه ردّه.</p>` : ''}
          ${kv('يُسلَّم لرب المال', money(S.neg ? cap : end))}</div>`;
      }
      $('#uRes').innerHTML = out + exportBar('uEx');
      saveHist('mudaraba', `مضاربة — ${profit >= 0 ? 'ربح' : 'خسارة'} ${money(Math.abs(profit))}`, S, `رأس المال ${money(cap)}`);
      bindExport('uEx', 'تصفية المضاربة', () => [{ table: [['البند', 'القيمة'], ['رأس المال', money(cap)], ['قيمة المال عند التصفية', money(end)], ['موزع سابقاً', money(prev)], [profit >= 0 ? 'الربح' : 'الخسارة', money(Math.abs(profit))], ...(profit > 0 ? [['نصيب المضارب', money(profit * r)], ['نصيب رب المال', money(profit * (1 - r))]] : [['يتحمل الخسارة', S.neg ? 'المضارب (تعدٍّ/تقصير)' : 'رب المال']])] }], () => `مضاربة: رأس المال ${money(cap)} — ${profit >= 0 ? `ربح ${money(profit)}: للمضارب ${money(profit * r)} ولرب المال ${money(profit * (1 - r))}` : `خسارة ${money(-profit)} على ${S.neg ? 'المضارب' : 'رب المال'}`}`);
    }
    draw();
  }

  // ================= الشركة (العنان) =================
  function renderSharika() {
    const S = takeOpen({ rows: [{ n: 'الشريك الأول', a: '', p: '' }, { n: 'الشريك الثاني', a: '', p: '' }], res: '', mode: 'agreed' });
    const draw = () => {
      N.view.innerHTML = `
        <div class="card"><p class="muted" style="margin-top:0">شركة العنان: يشترك اثنان فأكثر بماليهما ويعملان فيه، والربح بينهم والخسارة على قدر رؤوس الأموال.</p>
          <div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>
          <h4>الشركاء: الاسم، رأس المال، نسبة الربح المتفق عليها ٪</h4>
          ${rowsEditor('sR', S.rows, (r, i) => `<input class="calc-in" data-p="${i}" inputmode="decimal" value="${esc(r.p || '')}" placeholder="ربح ٪">`)}
          ${row('sX', 'صافي الربح (أو الخسارة بالسالب) للفترة', S.res)}
          <div class="calc-row"><label>توزيع الربح</label><select class="calc-in" id="sM"><option value="agreed" ${S.mode === 'agreed' ? 'selected' : ''}>بالنسب المتفق عليها (الحنفية والحنابلة)</option><option value="capital" ${S.mode === 'capital' ? 'selected' : ''}>بنسبة رؤوس الأموال (المالكية والشافعية)</option></select></div>
          <button class="btn block" id="sGo">🧮 وزّع</button></div>
        <div id="sRes"></div>
        ${src(['﴿وَإِنَّ كَثِيرًا مِّنَ الْخُلَطَاءِ لَيَبْغِي بَعْضُهُمْ عَلَىٰ بَعْضٍ إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ﴾ — ص: ٢٤.', 'القاعدة المقررة عند الفقهاء: «الربح على ما اصطلحا عليه، والوضيعة (الخسارة) على قدر المالين».', 'يجوز عند الحنفية والحنابلة أن يُشترط لأحد الشركاء ربح أكثر من نسبة ماله مقابل عمله أو خبرته؛ ويشترط المالكية والشافعية أن يكون الربح بقدر المال.', 'لا يجوز أن يُشترط لأحد الشركاء مبلغ مقطوع من الربح، ولا أن يضمن شريكٌ رأس مال غيره — المعيار الشرعي رقم (١٢) «الشركة» لهيئة المحاسبة والمراجعة (أيوفي).'])}`;
      curBind();
      const rd = () => { readRows('sR', S.rows, (r, i) => { r.p = $(`#sR [data-p="${i}"]`).value; }); S.res = $('#sX').value; S.mode = $('#sM').value; };
      bindRows('sR', S.rows, draw, rd, { p: '' });
      $('#sGo').onclick = () => { rd(); compute(); };
    };
    function compute() {
      const P = S.rows.map((r, i) => ({ n: r.n || `شريك ${ar(i + 1)}`, a: num(r.a), p: num(r.p) })).filter((x) => x.a > 0 || x.p > 0);
      const cap = P.reduce((s, x) => s + x.a, 0); const res = num(S.res);
      if (!cap) { toast('أدخل رؤوس الأموال'); return; }
      const psum = P.reduce((s, x) => s + x.p, 0);
      if (res > 0 && S.mode === 'agreed' && Math.abs(psum - 100) > 0.01) { toast(`مجموع نسب الربح ${ar(r2(psum))}٪ ويجب أن يكون ١٠٠٪`); return; }
      const share = (x) => (res > 0 ? (S.mode === 'agreed' ? res * x.p / 100 : res * x.a / cap) : res * x.a / cap);
      $('#sRes').innerHTML = `<div class="card ${res >= 0 ? 'calc-ok' : 'calc-warn'}"><p class="calc-big">${res >= 0 ? 'الربح' : 'الخسارة'}: <b>${money(Math.abs(res))}</b> (${pct(Math.abs(res) / cap)} من رأس المال)</p>
        <div class="pt-wrap"><table class="pt calc-t"><thead><tr><th>الشريك</th><th>رأس المال</th><th>حصته</th><th>${res >= 0 ? 'من الربح' : 'من الخسارة'}</th></tr></thead><tbody>${P.map((x) => `<tr><td>${esc(x.n)}</td><td>${money(x.a)}</td><td>${pct(x.a / cap)}</td><td><b>${money(Math.abs(share(x)))}</b></td></tr>`).join('')}</tbody></table></div>
        ${res < 0 ? '<p class="calc-why">الخسارة تُوزَّع دائماً بنسبة رؤوس الأموال، ولو اتُّفق على غير ذلك.</p>' : ''}</div>${exportBar('sEx')}`;
      saveHist('sharika', `شركة — ${res >= 0 ? 'ربح' : 'خسارة'} ${money(Math.abs(res))}`, S, `${ar(P.length)} شركاء`);
      bindExport('sEx', 'توزيع أرباح الشركة', () => [{ t: `${res >= 0 ? 'الربح' : 'الخسارة'}: ${money(Math.abs(res))} — رأس المال: ${money(cap)}`, b: 1 }, { table: [['الشريك', 'رأس المال', 'الحصة', 'النصيب'], ...P.map((x) => [x.n, money(x.a), pct(x.a / cap), money(share(x))])] }], () => P.map((x) => `• ${x.n}: ${money(share(x))}`).join('\n'));
    }
    draw();
  }

  // ================= المشاركة المتناقصة =================
  function renderMutanaqisa() {
    const S = takeOpen({ val: '', mine: '', rent: '', years: '10', grow: '0' });
    N.view.innerHTML = `
      <div class="card"><p class="muted" style="margin-top:0">يشترك الممول والعميل في تملك عقار أو أصل، ويستأجر العميل حصة الممول، ويشتري حصصه تدريجياً حتى يتملك الأصل كاملاً.</p>
        <div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>
        ${row('nV', 'قيمة الأصل (العقار) عند الشراء', S.val)}${row('nM', 'مساهمتك في الشراء', S.mine)}${row('nR', 'أجرة المثل الشهرية للأصل كاملاً', S.rent)}${row('nY', 'مدة شراء حصص الممول (سنوات)', S.years, '', 'numeric')}${row('nG', 'تغير القيمة السوقية للحصص سنوياً ٪ (تقديري)', S.grow)}
        <button class="btn block" id="nGo">🧮 احسب الجدول</button></div>
      <div id="nRes"></div>
      ${src(['المشاركة المتناقصة جائزة إذا كانت الشركة حقيقية يتحمل فيها كل طرف المخاطر بحسب حصته، وكان عقد الشركة منفصلاً عن عقد بيع الحصص — قرار مجمع الفقه الإسلامي الدولي ١٣٦ (٢/١٥).', 'لا يجوز اشتراط شراء الحصص بقيمتها الاسمية (الأصلية) لأنه ضمان لرأس مال الشريك، وإنما بالقيمة السوقية أو بما يتفقان عليه وقت الشراء — المعيار الشرعي رقم (١٢) لأيوفي.', 'يجوز أن يستأجر العميل حصة الممول بأجرة معلومة، وتنقص الأجرة بنقص حصة الممول.', 'الجدول تقديري لأن الحصص تُشترى بقيمتها وقت الشراء.'])}`;
    curBind();
    $('#nGo').onclick = () => {
      S.val = $('#nV').value; S.mine = $('#nM').value; S.rent = $('#nR').value; S.years = $('#nY').value; S.grow = $('#nG').value;
      const V = num(S.val); const M = num(S.mine); const R = num(S.rent); const Y = Math.max(1, Math.round(num(S.years))); const g = num(S.grow) / 100;
      if (!V || M >= V) { toast('أدخل قيمة الأصل ومساهمة أقل منها'); return; }
      let bank = 1 - M / V; const step = bank / Y; const rows = []; let tRent = 0; let tBuy = 0;
      for (let y = 1; y <= Y; y++) {
        const vy = V * Math.pow(1 + g, y - 1); const rentY = R * 12 * Math.pow(1 + g, y - 1) * bank; const buy = vy * step;
        tRent += rentY; tBuy += buy; rows.push([y, bank, rentY, buy]); bank -= step;
      }
      $('#nRes').innerHTML = `<div class="card calc-ok">${kv('حصتك الابتدائية', pct(M / V))}${kv('حصة الممول الابتدائية', pct(1 - M / V))}${kv('إجمالي الأجرة المدفوعة', money(tRent))}${kv('إجمالي ثمن شراء الحصص (تقديري)', money(tBuy))}${kv('إجمالي ما تدفعه بعد المساهمة', money(tRent + tBuy))}${kv('متوسط الدفع الشهري في السنة الأولى', money((rows[0][2] + rows[0][3]) / 12))}</div>
        <div class="card"><div class="pt-wrap"><table class="pt calc-t"><thead><tr><th>السنة</th><th>حصة الممول</th><th>الأجرة</th><th>شراء حصص</th></tr></thead><tbody>${rows.map(([y, b, r, p]) => `<tr><td>${ar(y)}</td><td>${pct(b)}</td><td>${money(r, 0)}</td><td>${money(p, 0)}</td></tr>`).join('')}</tbody></table></div></div>${exportBar('nEx')}`;
      saveHist('mutanaqisa', `مشاركة متناقصة — ${ar(Y)} سنوات`, S, `أصل ${money(V)}`);
      bindExport('nEx', 'جدول المشاركة المتناقصة', () => [{ t: `قيمة الأصل ${money(V)} — مساهمتك ${money(M)} — المدة ${Y} سنوات`, b: 1 }, { table: [['السنة', 'حصة الممول', 'الأجرة', 'شراء الحصص'], ...rows.map(([y, b, r, p]) => [String(y), pct(b), money(r, 0), money(p, 0)])] }], () => `مشاركة متناقصة: أجرة ${money(tRent)} + حصص ${money(tBuy)}`);
    };
  }

  // ================= الإجارة =================
  function renderIjara() {
    const S = takeOpen({ rent: '', per: 'month', from: '', to: '', inc: '', every: '1', dep: '' });
    N.view.innerHTML = `
      <div class="card"><div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>
        ${row('iR', 'الأجرة المتفق عليها', S.rent)}
        <div class="calc-row"><label>عن كل</label><select class="calc-in" id="iP"><option value="month" ${S.per === 'month' ? 'selected' : ''}>شهر</option><option value="year" ${S.per === 'year' ? 'selected' : ''}>سنة</option><option value="day" ${S.per === 'day' ? 'selected' : ''}>يوم</option></select></div>
        <div class="calc-row"><label>بداية الإجارة</label><input class="calc-in" id="iF" type="date" value="${esc(S.from)}"></div>
        <div class="calc-row"><label>نهاية الإجارة</label><input class="calc-in" id="iT" type="date" value="${esc(S.to)}"></div>
        ${row('iI', 'زيادة متفق عليها في العقد ٪ (اختياري)', S.inc)}${row('iE', 'تُطبَّق الزيادة كل كم سنة', S.every, '', 'numeric')}${row('iD', 'التأمين المدفوع', S.dep, '0')}
        <button class="btn block" id="iGo">🧮 احسب</button></div>
      <div id="iRes"></div>
      ${src(['﴿فَإِنْ أَرْضَعْنَ لَكُمْ فَآتُوهُنَّ أُجُورَهُنَّ﴾ — الطلاق: ٦؛ و«أعطوا الأجير أجره قبل أن يجفّ عرقه» — رواه ابن ماجه (٢٤٤٣) وصححه الألباني.', 'يُشترط أن تكون الأجرة والمدة معلومتين؛ ويجوز الاتفاق في العقد على زيادة معلومة النسبة في مدد لاحقة.', 'الصيانة الأساسية التي يتوقف عليها الانتفاع على المؤجر، والتشغيلية على المستأجر — المعيار الشرعي رقم (٩) «الإجارة» لأيوفي.', 'الإجارة المنتهية بالتمليك جائزة إذا كان عقد الإجارة فعلياً مستقلاً عن عقد التمليك، وضمان العين على المؤجر — قرار مجمع الفقه الإسلامي الدولي ١١٠ (٤/١٢).', 'التأمين (العربون الضامن) أمانة عند المؤجر يُرد للمستأجر بعد خصم ما ثبت عليه من تلفيات أو أجرة متأخرة.'])}`;
    curBind();
    $('#iGo').onclick = () => {
      S.rent = $('#iR').value; S.per = $('#iP').value; S.from = $('#iF').value; S.to = $('#iT').value; S.inc = $('#iI').value; S.every = $('#iE').value; S.dep = $('#iD').value;
      const R = num(S.rent); if (!R || !S.from || !S.to) { toast('أدخل الأجرة وتاريخي البداية والنهاية'); return; }
      const a = new Date(S.from); const b = new Date(S.to); if (b <= a) { toast('تاريخ النهاية قبل البداية'); return; }
      const days = Math.round((b - a) / 864e5); const daily = S.per === 'day' ? R : S.per === 'month' ? R * 12 / 365 : R / 365;
      const inc = num(S.inc) / 100; const every = Math.max(1, Math.round(num(S.every)));
      let total = 0; const years = [];
      for (let d = 0; d < days; d += 365) { const y = Math.floor(d / 365); const n = Math.min(365, days - d); const k = inc ? Math.pow(1 + inc, Math.floor(y / every)) : 1; const amt = daily * k * n; total += amt; years.push([y + 1, n, daily * k * 365 / 12, amt]); }
      $('#iRes').innerHTML = `<div class="card calc-ok">${kv('مدة الإجارة', `${ar(days)} يوماً (≈ ${mon(Math.round(days / 30.44))})`)}${kv('إجمالي الأجرة', money(total))}${kv('ما يعادل الأجرة اليومية', money(daily))}${num(S.dep) ? kv('التأمين المسترد', money(num(S.dep))) : ''}</div>
        ${years.length > 1 || inc ? `<div class="card"><div class="pt-wrap"><table class="pt calc-t"><thead><tr><th>السنة</th><th>الأيام</th><th>الأجرة الشهرية</th><th>إجمالي السنة</th></tr></thead><tbody>${years.map(([y, n, m, t]) => `<tr><td>${ar(y)}</td><td>${ar(n)}</td><td>${money(m)}</td><td>${money(t)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}${exportBar('iEx')}`;
      saveHist('ijara', `إجارة — ${money(total)}`, S, `${ar(days)} يوماً`);
      bindExport('iEx', 'حساب الإجارة', () => [{ t: `المدة ${days} يوماً — الإجمالي ${money(total)}`, b: 1 }, { table: [['السنة', 'الأيام', 'الأجرة الشهرية', 'الإجمالي'], ...years.map(([y, n, m, t]) => [String(y), String(n), money(m), money(t)])] }], () => `إجارة ${days} يوماً — الإجمالي ${money(total)}`);
    };
  }

  // ================= الوكالة والسمسرة والعمولات =================
  function renderWakala() {
    const S = takeOpen({ deal: '', how: 'pct', v: '', sides: '1', over: '', base: '' });
    const draw = () => {
      N.view.innerHTML = `
        <div class="card"><div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>
          ${row('wD', 'قيمة الصفقة (البيع أو الشراء أو الإيجار)', S.deal)}
          <div class="calc-row"><label>نوع الأجر</label><select class="calc-in" id="wH"><option value="pct" ${S.how === 'pct' ? 'selected' : ''}>نسبة من قيمة الصفقة</option><option value="fixed" ${S.how === 'fixed' ? 'selected' : ''}>مبلغ مقطوع</option><option value="over" ${S.how === 'over' ? 'selected' : ''}>ما زاد على سعر محدد فهو للوسيط</option></select></div>
          ${S.how === 'over' ? row('wB', 'السعر الذي حدده صاحب السلعة', S.base) : row('wV', S.how === 'pct' ? 'نسبة العمولة ٪' : 'مبلغ العمولة', S.v)}
          ${S.how === 'pct' ? `<div class="calc-row"><label>تُدفع العمولة من</label><select class="calc-in" id="wS"><option value="1" ${S.sides === '1' ? 'selected' : ''}>طرف واحد</option><option value="2" ${S.sides === '2' ? 'selected' : ''}>الطرفين (النسبة على كل طرف)</option></select></div>` : ''}
          <button class="btn block" id="wGo">🧮 احسب</button></div>
        <div id="wRes"></div>
        ${src(['الوكالة بأجر جائزة بالإجماع، ويُشترط أن يكون الأجر معلوماً.', 'قال ابن عباس رضي الله عنهما: «لا بأس أن يقول: بع هذا الثوب، فما زاد على كذا وكذا فهو لك» — ذكره البخاري معلقاً في كتاب الإجارة، باب أجر السمسرة.', 'لا يجوز للوكيل أن يأخذ من الطرف الآخر عمولة خفية دون علم موكله، لأنه أمين؛ فإن علم الطرفان جاز أخذ العمولة منهما.', '«لا يبع حاضر لباد» ونحوه من الأحاديث في ضبط السمسرة — رواه البخاري (٢١٥٨) ومسلم (١٥٢١).'])}`;
      curBind();
      $('#wH').onchange = () => { read(); S.how = $('#wH').value; draw(); };
      $('#wGo').onclick = () => { read(); compute(); };
    };
    function read() { S.deal = $('#wD').value; S.how = $('#wH').value; if ($('#wV')) S.v = $('#wV').value; if ($('#wB')) S.base = $('#wB').value; if ($('#wS')) S.sides = $('#wS').value; }
    function compute() {
      const D = num(S.deal); if (!D) { toast('أدخل قيمة الصفقة'); return; }
      let c; let note = '';
      if (S.how === 'pct') { c = D * num(S.v) / 100; } else if (S.how === 'fixed') c = num(S.v); else { c = Math.max(0, D - num(S.base)); note = 'هذه الصورة أجازها ابن عباس وابن سيرين وغيرهما، ومنعها بعض الفقهاء للجهالة؛ والأحوط تحديد أجر معلوم.'; }
      const sides = S.how === 'pct' ? +S.sides : 1;
      $('#wRes').innerHTML = `<div class="card calc-ok">${kv('العمولة', money(c))}${sides === 2 ? kv('إجمالي ما يستحقه الوسيط من الطرفين', money(c * 2)) : ''}${kv('صافي ما يصل لصاحب السلعة إن كانت العمولة عليه', money(D - c))}${kv('نسبة العمولة الفعلية', pct(c / D))}${note ? `<p class="calc-why">${note}</p>` : ''}</div>`;
      saveHist('wakala', `عمولة — ${money(c)}`, S, `صفقة ${money(D)}`);
    }
    draw();
  }

  // ================= التعويض =================
  function renderTawid() {
    const S = takeOpen({ val: '', salv: '', exp: '', lost: '', moral: '', debt: false, force: false });
    N.view.innerHTML = `
      <div class="card"><p class="muted" style="margin-top:0">لتقدير التعويض عن إتلاف مال أو الإخلال بعقد.</p>
        <div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>
        ${row('tV', 'قيمة الشيء المتلَف وقت الإتلاف (بسعر السوق)', S.val)}${row('tS', 'قيمة ما بقي منه إن احتفظ به صاحبه', S.salv, '0')}${row('tE', 'المصروفات الفعلية التي تكبّدها المتضرر', S.exp, '0')}${row('tL', 'كسب فائت مؤكد (لا محتمل)', S.lost, '0')}${row('tM', 'تعويض عن ضرر معنوي (للمقارنة فقط)', S.moral, '0')}
        <label class="calc-chk"><input type="checkbox" id="tDb" ${S.debt ? 'checked' : ''}> المطالبة بسبب تأخر سداد دين (قرض أو ثمن مؤجل)</label>
        <label class="calc-chk"><input type="checkbox" id="tF" ${S.force ? 'checked' : ''}> الإخلال كان بسبب خارج عن الإرادة (قوة قاهرة)</label>
        <button class="btn block" id="tGo">🧮 احسب</button></div>
      <div id="tRes"></div>
      ${src(['﴿وَإِنْ عَاقَبْتُمْ فَعَاقِبُوا بِمِثْلِ مَا عُوقِبْتُم بِهِ﴾ — النحل: ١٢٦؛ و«لا ضرر ولا ضرار» — رواه ابن ماجه (٢٣٤١) وحسّنه النووي والألباني بمجموع طرقه.', 'المتلَف يُضمن بمثله إن كان مثلياً، وبقيمته يوم الإتلاف إن كان قيمياً — عند جمهور الفقهاء.', 'الضرر الذي يجوز التعويض عنه يشمل الضرر المالي الفعلي وما لحق المضرور من خسارة حقيقية وما فاته من كسب مؤكد، ولا يشمل الضرر الأدبي أو المعنوي؛ ولا يُعمل بالشرط الجزائي إذا ثبت أن الإخلال بسبب خارج عن الإرادة؛ ولا يجوز الشرط الجزائي في الديون — قرار مجمع الفقه الإسلامي الدولي ١٠٩ (٣/١٢).', 'القوانين الوضعية في بعض البلاد تقضي بالتعويض المعنوي؛ فالمرجع عند النزاع القضاء المختص.'])}`;
    curBind();
    $('#tGo').onclick = () => {
      S.val = $('#tV').value; S.salv = $('#tS').value; S.exp = $('#tE').value; S.lost = $('#tL').value; S.moral = $('#tM').value; S.debt = $('#tDb').checked; S.force = $('#tF').checked;
      if (S.debt) { $('#tRes').innerHTML = warn('لا يجوز التعويض المالي عن مجرد تأخر سداد الدين، ولا الشرط الجزائي في الديون، لأنه زيادة على الدين في مقابل الأجل وهو ربا الجاهلية — قرار مجمع الفقه الإسلامي الدولي ١٠٩ (٣/١٢). وللدائن المطالبة بأصل حقه ومصروفات التقاضي الفعلية عند بعض الهيئات.'); return; }
      const base = Math.max(0, num(S.val) - num(S.salv)); const tot = base + num(S.exp) + num(S.lost);
      $('#tRes').innerHTML = `<div class="card ${S.force ? 'calc-warn' : 'calc-ok'}">${kv('تعويض الإتلاف (القيمة − المتبقي)', money(base))}${num(S.exp) ? kv('المصروفات الفعلية', money(num(S.exp))) : ''}${num(S.lost) ? kv('الكسب الفائت المؤكد', money(num(S.lost))) : ''}
        <p class="calc-big">التعويض المستحق: <b>${S.force ? '—' : money(tot)}</b></p>
        ${S.force ? '<p class="calc-why">إن ثبت أن الإخلال بسبب قاهر خارج عن الإرادة فلا يُعمل بالشرط الجزائي ولا يلزم التعويض عن الإخلال بالعقد (قرار المجمع ١٠٩)؛ أما إتلاف مال الغير مباشرة فيُضمن ولو بلا قصد.</p>' : ''}
        ${num(S.moral) ? `<p class="calc-why">التعويض المعنوي (${money(num(S.moral))}) غير داخل في الحساب وفق قرار المجمع، وقد تحكم به بعض المحاكم وفق قانون البلد.</p>` : ''}</div>`;
      saveHist('tawid', `تعويض — ${money(tot)}`, S, '');
    };
  }

  const NEW = [
    { k: 'murabaha', ic: '🛒', t: 'حاسبة المرابحة', d: 'ثمن البيع والربح والأقساط مع ضوابط المرابحة للآمر بالشراء', cat: 'mal', ready: 1 },
    { k: 'mudaraba', ic: '💼', t: 'حاسبة المضاربة', d: 'تصفية المضاربة وتوزيع الربح وتحمّل الخسارة', cat: 'mal', ready: 1 },
    { k: 'sharika', ic: '🤝', t: 'توزيع أرباح الشركة', d: 'شركة العنان: الربح بالاتفاق والخسارة بقدر رأس المال', cat: 'mal', ready: 1 },
    { k: 'mutanaqisa', ic: '🏠', t: 'المشاركة المتناقصة', d: 'تملك العقار تدريجياً: الأجرة وشراء الحصص سنوياً', cat: 'mal', ready: 1 },
    { k: 'ijara', ic: '🔑', t: 'حاسبة الإجارة', d: 'إجمالي الأجرة بالأيام والزيادات السنوية والتأمين', cat: 'mal', ready: 1 },
    { k: 'wakala', ic: '🧑‍💼', t: 'الوكالة والسمسرة والعمولات', d: 'أجر الوكيل والوسيط بنسبة أو مبلغ', cat: 'mal', ready: 1 },
    { k: 'tawid', ic: '🛡️', t: 'حاسبة التعويض', d: 'ضمان المتلفات والإخلال بالعقود وضوابط الشرط الجزائي', cat: 'mal', ready: 1 },
  ];
  const at = C.TOOLS.findIndex((t) => t.k === 'islamic');
  C.TOOLS.splice(at >= 0 ? at : C.TOOLS.length, at >= 0 ? 1 : 0, ...NEW);
  Object.assign(C.CALCS, { murabaha: [renderMurabaha, 'حاسبة المرابحة'], mudaraba: [renderMudaraba, 'حاسبة المضاربة'], sharika: [renderSharika, 'توزيع أرباح الشركة'], mutanaqisa: [renderMutanaqisa, 'المشاركة المتناقصة'], ijara: [renderIjara, 'حاسبة الإجارة'], wakala: [renderWakala, 'الوكالة والسمسرة'], tawid: [renderTawid, 'حاسبة التعويض'] });
});
