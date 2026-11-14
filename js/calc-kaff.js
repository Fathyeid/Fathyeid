/* الحاسبات — المرحلة الرابعة: الكفارات، الفدية، النذور، الوصايا، الوقف، الصدقات.
 * المقادير الشرعية تُعرض بأقوال المذاهب، ويمكن تعديلها؛ والحساب إرشادي وليس فتوى. */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const C = N.calc; if (!C || !C.rowsEditor) return;
  const { $, $$, store, toast, ar, esc } = N;
  const { num, money, pct, curSelect, saveHist, takeOpen, exportBar, bindExport, rowsEditor, readRows, bindRows, src, r2 } = C;
  const curBind = () => { const el = $('#cCur'); if (el) el.onchange = (e) => store.set('calc:cur', e.target.value); };
  const row = (id, label, v, ph = '', type = 'decimal') => `<div class="calc-row"><label>${label}</label><input class="calc-in" id="${id}" inputmode="${type}" value="${esc(v ?? '')}" placeholder="${ph}"></div>`;
  const kv = (k, v) => `<div class="pr-extra"><span>${k}</span><b>${v}</b></div>`;
  const kg = (x) => `${ar(r2(x))} كجم`;
  const poor = (n) => (n === 1 ? 'مسكين واحد' : n === 2 ? 'مسكينان' : n <= 10 ? `${ar(n)} مساكين` : `${ar(n)} مسكيناً`);
  const kfs = (n) => (n === 2 ? 'كفارتان' : n <= 10 ? `${ar(n)} كفارات` : `${ar(n)} كفارة`);
  const daysAcc = (n) => (n === 1 ? 'يوم واحد' : n === 2 ? 'يومين' : n <= 10 ? `${ar(n)} أيام` : `${ar(n)} يوماً`);
  const days = (n) => (n === 1 ? 'يوم واحد' : n === 2 ? 'يومان' : n <= 10 ? `${ar(n)} أيام` : `${ar(n)} يوماً`);

  // مقدار إطعام المسكين: قائمة موحدة تُستخدم في الكفارات والفدية
  const FOOD = [
    ['mudd', 0.51, 'مُدّ ≈ ٠٫٥١ كجم (المالكية والشافعية، والحنابلة في البُرّ)'],
    ['half', 1.5, 'نصف صاع ≈ ١٫٥ كجم من الأرز ونحوه (اختيار اللجنة الدائمة بالسعودية احتياطاً)'],
    ['hanafi', 1.63, 'نصف صاع من البُرّ عند الحنفية ≈ ١٫٦٣ كجم (وصاع كامل من التمر والشعير)'],
  ];
  const foodSel = (S) => `<div class="calc-row"><label>مقدار طعام كل مسكين</label><select class="calc-in" id="kQ">${FOOD.map(([k, , t]) => `<option value="${k}" ${S.q === k ? 'selected' : ''}>${t}</option>`).join('')}<option value="custom" ${S.q === 'custom' ? 'selected' : ''}>مقدار آخر (كجم)</option></select></div>${S.q === 'custom' ? row('kQc', 'الكجم لكل مسكين', S.qc) : ''}`;
  const foodKg = (S) => (S.q === 'custom' ? num(S.qc) : FOOD.find((f) => f[0] === S.q)[1]);
  const modeSeg = (S) => `<div class="seg" id="kMd" style="margin:8px 0"><button data-v="food" class="${S.mode === 'food' ? 'active' : ''}">🌾 طعاماً</button><button data-v="cash" class="${S.mode === 'cash' ? 'active' : ''}">💵 قيمة نقدية</button></div>${S.mode === 'cash' ? `${row('kV', 'قيمة إطعام المسكين الواحد', S.v, 'كما تعلنها جهة الفتوى في بلدك')}<small class="muted">إخراج القيمة جائز عند الحنفية وبه تفتي دار الإفتاء المصرية التي تعلن القيمة كل عام، والجمهور على الإطعام.</small>` : ''}`;
  function bindFood(S, read, draw) {
    $$('#kMd button').forEach((b) => { b.onclick = () => { read(); S.mode = b.dataset.v; draw(); }; });
    const q = $('#kQ'); if (q) q.onchange = () => { read(); draw(); };
  }
  const readFood = (S) => { const q = $('#kQ'); if (q) S.q = q.value; if ($('#kQc')) S.qc = $('#kQc').value; if ($('#kV')) S.v = $('#kV').value; };
  const feedOut = (S, n) => (S.mode === 'cash' ? money(num(S.v) * n) : `${kg(foodKg(S) * n)} طعاماً (${kg(foodKg(S))} لكل مسكين)`);

  // ================= الكفارات =================
  const KT = {
    yamin: { t: 'كفارة اليمين', d: 'لمن حلف بالله على أمر مستقبل ثم حنث', poor: 10, fast: 3, seq: false },
    jima: { t: 'كفارة الجماع في نهار رمضان', d: 'على من جامع عامداً في نهار رمضان وهو صائم', poor: 60, fast: 60, seq: true },
    zihar: { t: 'كفارة الظهار', d: 'قبل أن يمسّ زوجته بعد الظهار', poor: 60, fast: 60, seq: true },
    qatl: { t: 'كفارة القتل الخطأ', d: 'مع الدية لأولياء المقتول', poor: 0, fast: 60, seq: true },
  };
  function renderKaffara() {
    const S = takeOpen({ type: 'yamin', n: 1, mode: 'food', q: 'half', qc: '', v: '', able: 'feed' });
    const draw = () => {
      const K = KT[S.type];
      N.view.innerHTML = `
        <div class="card"><div class="calc-row"><label>نوع الكفارة</label><select class="calc-in" id="kT">${Object.entries(KT).map(([k, x]) => `<option value="${k}" ${S.type === k ? 'selected' : ''}>${x.t}</option>`).join('')}</select></div>
          <p class="muted" style="margin-top:0">${K.d}</p>
          <div class="calc-cnt"><span>عدد الكفارات الواجبة</span><button class="chip" id="kM">−</button><b>${ar(S.n)}</b><button class="chip" id="kP">+</button></div>
          ${S.type === 'yamin' ? '<small class="muted">من حلف أيماناً متعددة على أمور مختلفة فلكل يمين كفارة؛ وإن كرر اليمين على شيء واحد ولم يكفّر فكفارة واحدة عند الجمهور.</small>' : S.type === 'jima' ? '<small class="muted">لكل يوم جامع فيه كفارة عند الجمهور، مع قضاء الأيام.</small>' : ''}
          ${S.type === 'yamin' ? `<div class="calc-row" style="margin-top:10px"><label>ما تقدر عليه</label><select class="calc-in" id="kA"><option value="feed" ${S.able === 'feed' ? 'selected' : ''}>إطعام عشرة مساكين</option><option value="cloth" ${S.able === 'cloth' ? 'selected' : ''}>كسوة عشرة مساكين</option><option value="fast" ${S.able === 'fast' ? 'selected' : ''}>لا أجد (عاجز عن الإطعام والكسوة)</option></select></div>` : ''}
          ${K.poor && (S.type !== 'yamin' || S.able === 'feed') ? modeSeg(S) + (S.mode === 'food' ? foodSel(S) : '') : ''}
          <button class="btn block" id="kGo" style="margin-top:10px">🧮 احسب</button></div>
        <div id="kRes"></div>
        ${src(S.type === 'yamin' ? ['﴿فَكَفَّارَتُهُ إِطْعَامُ عَشَرَةِ مَسَاكِينَ مِنْ أَوْسَطِ مَا تُطْعِمُونَ أَهْلِيكُمْ أَوْ كِسْوَتُهُمْ أَوْ تَحْرِيرُ رَقَبَةٍ ۖ فَمَن لَّمْ يَجِدْ فَصِيَامُ ثَلَاثَةِ أَيَّامٍ﴾ — المائدة: ٨٩.', 'التخيير بين الإطعام والكسوة والعتق، ولا ينتقل إلى الصيام إلا العاجز عنها جميعاً.', 'اليمين اللغو (ما يجري على اللسان بلا قصد) لا كفارة فيه — البقرة: ٢٢٥؛ واليمين الغموس (الحلف على الماضي كذباً) كبيرة تجب منها التوبة، ولا كفارة لها عند الجمهور.', 'التتابع في صيام الأيام الثلاثة واجب عند الحنفية والحنابلة، ومستحب عند المالكية والشافعية.'] : S.type === 'qatl' ? ['﴿وَمَن قَتَلَ مُؤْمِنًا خَطَأً فَتَحْرِيرُ رَقَبَةٍ مُّؤْمِنَةٍ وَدِيَةٌ مُّسَلَّمَةٌ إِلَىٰ أَهْلِهِ… فَمَن لَّمْ يَجِدْ فَصِيَامُ شَهْرَيْنِ مُتَتَابِعَيْنِ تَوْبَةً مِّنَ اللَّهِ﴾ — النساء: ٩٢.', 'ليس في كفارة القتل إطعام عند جمهور الفقهاء لعدم ذكره في الآية.', 'تشمل حوادث السير التي يتسبب فيها السائق بتفريط؛ وتقدير الدية والمسؤولية يرجع فيه للقضاء والمختصين.'] : ['حديث الأعرابي الذي وقع على امرأته في رمضان: «هل تجد رقبة؟… فهل تستطيع أن تصوم شهرين متتابعين؟… فهل تجد إطعام ستين مسكيناً؟» — رواه البخاري (١٩٣٦) ومسلم (١١١١).', '﴿فَمَن لَّمْ يَجِدْ فَصِيَامُ شَهْرَيْنِ مُتَتَابِعَيْنِ مِن قَبْلِ أَن يَتَمَاسَّا ۖ فَمَن لَّمْ يَسْتَطِعْ فَإِطْعَامُ سِتِّينَ مِسْكِينًا﴾ — المجادلة: ٤.', 'الكفارة على الترتيب: العتق، فإن لم يجد فصيام شهرين متتابعين، فإن لم يستطع فإطعام ستين مسكيناً؛ والتتابع ينقطع بالفطر بلا عذر.'])}`;
      $('#kT').onchange = () => { read(); S.type = $('#kT').value; draw(); };
      $('#kM').onclick = () => { read(); S.n = Math.max(1, S.n - 1); draw(); };
      $('#kP').onclick = () => { read(); S.n = Math.min(100, S.n + 1); draw(); };
      const a = $('#kA'); if (a) a.onchange = () => { read(); draw(); };
      bindFood(S, read, draw);
      $('#kGo').onclick = () => { read(); compute(); };
    };
    function read() { readFood(S); const a = $('#kA'); if (a) S.able = a.value; }
    function compute() {
      const K = KT[S.type]; const n = S.n; let html = '';
      if (S.type === 'yamin') {
        if (S.able === 'fast') html = kv('صيام', days(3 * n)) + `<p class="calc-why">${n > 1 ? `ثلاثة أيام لكل كفارة (${kfs(n)})` : 'ثلاثة أيام'}، والأحوط التتابع.</p>`;
        else if (S.able === 'cloth') html = kv('كسوة', `${poor(10 * n)}`) + '<p class="calc-why">لكل مسكين ثوب يجزئ في الصلاة (ثوب يستر البدن) — وهو قول جمهور الفقهاء.</p>';
        else html = kv('إطعام', poor(10 * n)) + kv('المقدار', feedOut(S, 10 * n)) + '<p class="calc-why">يجوز عند الحنفية والمالكية أن تُطعمهم غداءً وعشاءً مشبعين من أوسط طعام أهلك بدل تمليكهم الطعام، ويشترط الشافعية والحنابلة التمليك. ولا يجزئ عند الجمهور إعطاء المقدار كله لمسكين واحد.</p>';
      } else {
        html = `<p class="calc-why"><b>الترتيب:</b> عتق رقبة ← فإن لم يجد: صيام شهرين متتابعين${K.poor ? ' ← فإن لم يستطع: إطعام ستين مسكيناً' : ''}.</p>${kv('الصيام', `شهران هجريان متتابعان لكل كفارة${n > 1 ? ` (${kfs(n)})` : ''}، أو ستون يوماً إن بدأ في أثناء الشهر`)}${K.poor ? kv('الإطعام عند العجز عن الصيام', `${poor(60 * n)} — ${feedOut(S, 60 * n)}`) : ''}${S.type === 'jima' ? `<p class="calc-why">مع قضاء ${daysAcc(n)} مكان ما أفسد، والتوبة. وفي وجوب الكفارة على الزوجة المطاوِعة خلاف: أوجبها الحنفية والمالكية وهو رواية عند الحنابلة، ولم يوجبها الشافعية في الأصح.</p>` : ''}`;
      }
      $('#kRes').innerHTML = `<div class="card calc-ok"><h3>${K.t}${n > 1 ? ` × ${ar(n)}` : ''}</h3>${html}</div>`;
      saveHist('kaffara', `${K.t}${n > 1 ? ` × ${ar(n)}` : ''}`, S, '');
    }
    draw();
  }

  // ================= فدية الصيام =================
  const FC = [
    ['old', 'كبير سن أو مريض مرضاً لا يُرجى شفاؤه (لا يستطيع الصيام)'],
    ['delay', 'أخّر قضاء رمضان حتى دخل رمضان التالي بلا عذر'],
    ['child', 'حامل أو مرضع أفطرت خوفاً على الولد'],
    ['self', 'حامل أو مرضع أفطرت خوفاً على نفسها'],
    ['sick', 'مريض يُرجى شفاؤه أو مسافر'],
    ['dead', 'مات وعليه صيام'],
  ];
  function renderFidya() {
    const S = takeOpen({ c: 'old', d: '', mode: 'food', q: 'mudd', qc: '', v: '' });
    const draw = () => {
      N.view.innerHTML = `
        <div class="card"><div class="calc-row"><label>الحالة</label><select class="calc-in" id="fC">${FC.map(([k, t]) => `<option value="${k}" ${S.c === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          ${row('fD', 'عدد الأيام', S.d, '', 'numeric')}
          ${['old', 'delay', 'child', 'dead'].includes(S.c) ? modeSeg(S) + (S.mode === 'food' ? foodSel(S) : '') : ''}
          <button class="btn block" id="fGo" style="margin-top:10px">🧮 احسب</button></div>
        <div id="fRes"></div>
        ${src(['﴿وَعَلَى الَّذِينَ يُطِيقُونَهُ فِدْيَةٌ طَعَامُ مِسْكِينٍ﴾ — البقرة: ١٨٤؛ قال ابن عباس رضي الله عنهما: «ليست بمنسوخة، هو الشيخ الكبير والمرأة الكبيرة لا يستطيعان أن يصوما فيطعمان مكان كل يوم مسكيناً» — رواه البخاري (٤٥٠٥).', '﴿فَمَن كَانَ مِنكُم مَّرِيضًا أَوْ عَلَىٰ سَفَرٍ فَعِدَّةٌ مِّنْ أَيَّامٍ أُخَرَ﴾ — البقرة: ١٨٤.', 'تأخير القضاء بلا عذر حتى رمضان التالي: القضاء مع إطعام مسكين عن كل يوم عند المالكية والشافعية والحنابلة (مأثور عن جمع من الصحابة)، والقضاء فقط عند الحنفية.', 'الحامل والمرضع إن خافتا على الولد: القضاء والفدية عند الشافعية والحنابلة، والقضاء فقط عند الحنفية، وفرّق المالكية فأوجبوا الفدية على المرضع دون الحامل.', '«من مات وعليه صيام صام عنه وليّه» — رواه البخاري (١٩٥٢) ومسلم (١١٤٧)؛ وذهب الجمهور إلى الإطعام عنه من تركته في صيام رمضان.'])}`;
      $('#fC').onchange = () => { read(); S.c = $('#fC').value; draw(); };
      bindFood(S, read, draw);
      $('#fGo').onclick = () => { read(); compute(); };
    };
    function read() { readFood(S); S.d = $('#fD').value; }
    function compute() {
      const n = Math.round(num(S.d)); if (!n) { toast('أدخل عدد الأيام'); return; }
      const feed = kv('الفدية', `إطعام ${poor(n)} — ${feedOut(S, n)}`);
      const H = {
        old: `${feed}<p class="calc-why">لا قضاء عليه؛ ويجوز إخراجها عن كل يوم بيومه، أو مجتمعة آخر الشهر، أو إطعام مساكين وجبات بعدد الأيام كما فعل أنس رضي الله عنه لما كبر (رواه البخاري تعليقاً).</p>`,
        delay: `${kv('القضاء', days(n))}${feed}<p class="calc-why">الفدية هنا على قول الجمهور؛ والحنفية يوجبون القضاء فقط.</p>`,
        child: `${kv('القضاء', days(n))}${feed}<p class="calc-why">الفدية على قول الشافعية والحنابلة؛ والحنفية: القضاء فقط؛ والمالكية: الفدية على المرضع دون الحامل.</p>`,
        self: `${kv('القضاء', days(n))}<p class="calc-why">عليها القضاء فقط بلا فدية، كالمريض.</p>`,
        sick: `${kv('القضاء', days(n))}<p class="calc-why">القضاء فقط، ولا فدية إلا إن أخّره حتى رمضان التالي بلا عذر.</p>`,
        dead: `${kv('إن مات قبل التمكن من القضاء', 'لا شيء عليه')}${kv('إن تمكّن ولم يقضِ', `يصوم عنه وليّه ${days(n)}، أو يُطعم عنه`)}${feed}<p class="calc-why">الصيام عن الميت مستحب للولي عند من قال به (الشافعية في القديم المختار والحنابلة في النذر)، والإطعام من التركة قول الجمهور.</p>`,
      };
      $('#fRes').innerHTML = `<div class="card calc-ok">${H[S.c]}</div>`;
      saveHist('fidya', `فدية/قضاء — ${days(n)}`, S, FC.find((x) => x[0] === S.c)[1]);
    }
    draw();
  }

  // ================= فدية الأذى في الحج =================
  function renderHajjFidya() {
    N.view.innerHTML = `<div class="card"><h3>فدية الأذى (حلق الشعر أو تقليم الأظافر أو الطيب أو اللبس للمحرم لعذر)</h3>
      <p class="calc-why">يُخيَّر بين ثلاثة أمور:</p>
      ${kv('١. صيام', 'ثلاثة أيام')}${kv('٢. إطعام', 'ستة مساكين، لكل مسكين نصف صاع (≈ ١٫٥ كجم)')}${kv('٣. نسك', 'ذبح شاة توزع على فقراء الحرم')}
      <p class="calc-why">ومن فعل ذلك بلا عذر فعليه الفدية مع الإثم عند الجمهور.</p></div>
      ${src(['﴿فَمَن كَانَ مِنكُم مَّرِيضًا أَوْ بِهِ أَذًى مِّن رَّأْسِهِ فَفِدْيَةٌ مِّن صِيَامٍ أَوْ صَدَقَةٍ أَوْ نُسُكٍ﴾ — البقرة: ١٩٦.', 'حديث كعب بن عُجرة رضي الله عنه: «احلق رأسك، وصم ثلاثة أيام، أو أطعم ستة مساكين، أو انسك بشاة» — رواه البخاري (١٨١٤) ومسلم (١٢٠١).', 'دم التمتع والقران: ﴿فَمَن لَّمْ يَجِدْ فَصِيَامُ ثَلَاثَةِ أَيَّامٍ فِي الْحَجِّ وَسَبْعَةٍ إِذَا رَجَعْتُمْ﴾ — البقرة: ١٩٦.'])}`;
  }

  // ================= النذور =================
  const NT = [['sadaqa', 'صدقة بمبلغ'], ['fast', 'صيام أيام'], ['prayer', 'صلاة ركعات'], ['quran', 'ختمة أو قراءة'], ['other', 'طاعة أخرى'], ['maasiya', 'نذر معصية أو ما لا يملك'], ['mubham', 'نذر مبهم (لله عليّ نذر)']];
  function renderNudhur() {
    const K = 'calc:nudhur';
    const L = () => store.get(K, []);
    const draw = () => {
      const list = L();
      N.view.innerHTML = `
        <button class="btn block" id="nNew" style="margin-bottom:10px">+ تسجيل نذر</button>
        ${list.length ? list.map((x, i) => { const T = num(x.total) || 1; const d = Math.min(T, x.done || 0); const fin = d >= T; const nt = NT.find((t) => t[0] === x.t); return `<div class="lib-at ${fin ? 'calc-done' : ''}"><b>${esc(x.text)}</b><small>${nt ? nt[1] : ''}${x.cond ? ` • معلّق على: ${esc(x.cond)}` : ''}</small>${['maasiya', 'mubham'].includes(x.t) ? `<small style="color:#a33">${x.t === 'maasiya' ? 'لا يجوز الوفاء به، وتجب فيه كفارة يمين عند الحنابلة وغيرهم' : 'كفارته كفارة يمين'}</small>` : `<div class="calc-bar"><span style="width:${(d / T) * 100}%"></span></div><small>${fin ? '✅ تم الوفاء' : `المنجَز ${ar(r2(d))} من ${ar(T)}${x.t === 'sadaqa' ? ` ${esc(C.curName())}` : x.t === 'fast' ? ' أيام' : x.t === 'prayer' ? ' ركعات' : ''}`}</small>`}<div class="lib-at-b">${!fin && !['maasiya', 'mubham'].includes(x.t) ? `<button class="btn" data-pr="${i}">+ تسجيل وفاء</button>` : ''}${['maasiya', 'mubham'].includes(x.t) ? '<button class="btn" data-gk="1">احسب الكفارة</button>' : ''}<button class="btn ghost" data-dl="${i}">🗑</button></div></div>`; }).join('') : '<div class="card center muted">لا توجد نذور مسجلة</div>'}
        ${src(['«من نذر أن يطيع الله فليطعه، ومن نذر أن يعصيه فلا يعصه» — رواه البخاري (٦٦٩٦).', '﴿يُوفُونَ بِالنَّذْرِ وَيَخَافُونَ يَوْمًا كَانَ شَرُّهُ مُسْتَطِيرًا﴾ — الإنسان: ٧.', '«كفارة النذر كفارة اليمين» — رواه مسلم (١٦٤٥)، ويُحمل على النذر المبهم ونذر اللجاج عند جمع من العلماء.', '«لا نذر في معصية، وكفارته كفارة يمين» — رواه أبو داود (٣٢٩٠) والترمذي (١٥٢٤) وصححه الألباني.', 'نهى النبي ﷺ عن النذر وقال: «إنه لا يأتي بخير، وإنما يُستخرج به من البخيل» — رواه البخاري (٦٦٩٣) ومسلم (١٦٣٩)؛ فالأولى ألا يُبتدأ النذر، فإن نذر طاعة وجب الوفاء.'])}`;
      $('#nNew').onclick = edit;
      $$('[data-pr]').forEach((b) => { b.onclick = () => { const i = +b.dataset.pr; const x = L()[i]; const v = prompt(`كم أنجزت الآن؟ (المتبقي ${r2((num(x.total) || 1) - (x.done || 0))})`, x.t === 'sadaqa' ? '' : '1'); if (v === null) return; const a = num(v); if (!a) return; const A = L(); A[i].done = (A[i].done || 0) + a; store.set(K, A); draw(); }; });
      $$('[data-dl]').forEach((b) => { b.onclick = () => { if (!confirm('حذف هذا النذر؟')) return; const A = L(); A.splice(+b.dataset.dl, 1); store.set(K, A); draw(); }; });
      $$('[data-gk]').forEach((b) => { b.onclick = () => { store.set('calc:open', { type: 'yamin', n: 1 }); N.go('c/kaffara'); }; });
    };
    function edit() {
      const sh = N.sheet(`<h3>نذر جديد</h3><div class="calc-row"><label>نص النذر</label><input class="calc-in" id="eX" placeholder="مثال: لله عليّ أن أصوم ثلاثة أيام إن نجحت"></div>
        <div class="calc-row"><label>نوعه</label><select class="calc-in" id="eT">${NT.map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></div>
        <div class="calc-row"><label>المقدار (مبلغ، أيام، ركعات…)</label><input class="calc-in" id="eN" inputmode="decimal"></div>
        <div class="calc-row"><label>معلّق على شرط (اختياري)</label><input class="calc-in" id="eC" placeholder="مثال: شفاء المريض"></div>
        <button class="btn block" id="eS">حفظ</button>`);
      $('#eS', sh.el).onclick = () => { const text = $('#eX', sh.el).value.trim(); if (!text) { toast('اكتب نص النذر'); return; } const A = L(); A.push({ text, t: $('#eT', sh.el).value, total: $('#eN', sh.el).value, cond: $('#eC', sh.el).value.trim(), done: 0, at: Date.now() }); store.set(K, A); sh.close(); draw(); };
    }
    draw();
  }

  // ================= الوصية =================
  function renderWasiyya() {
    const S = takeOpen({ total: '', debts: '', law: 'jumhur', rows: [{ n: '', a: '', k: 'amt', h: false }], ok: false });
    const draw = () => {
      N.view.innerHTML = `
        <div class="card"><div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>
          ${row('wT', 'التركة المتوقعة (أو الحالية)', S.total)}${row('wD', 'الديون ومصاريف التجهيز', S.debts, '0')}
          <div class="calc-row"><label>المرجعية</label><select class="calc-in" id="wL"><option value="jumhur" ${S.law === 'jumhur' ? 'selected' : ''}>جمهور الفقهاء: لا وصية لوارث إلا بإجازة الورثة</option><option value="egypt" ${S.law === 'egypt' ? 'selected' : ''}>القانون المصري (٧١ لسنة ١٩٤٦): تصح للوارث في حدود الثلث</option></select></div>
          <h4>الموصى لهم: الاسم، القيمة، النوع</h4>
          ${rowsEditor('wR', S.rows, (r, i) => `<select class="calc-in" data-k="${i}"><option value="amt" ${r.k === 'amt' ? 'selected' : ''}>مبلغ</option><option value="pct" ${r.k === 'pct' ? 'selected' : ''}>نسبة ٪ من التركة</option></select><label class="calc-chk" style="grid-column:1/-1;margin:0"><input type="checkbox" data-h="${i}" ${r.h ? 'checked' : ''}> الموصى له من الورثة</label>`)}
          <label class="calc-chk" style="margin-top:8px"><input type="checkbox" id="wOk" ${S.ok ? 'checked' : ''}> أجاز الورثة البالغون ما زاد على الثلث أو ما كان لوارث</label>
          <button class="btn block" id="wGo" style="margin-top:10px">🧮 احسب</button></div>
        <div id="wRes"></div>
        <div class="card"><b>📝 نموذج كتابة الوصية</b><p class="calc-why">«بسم الله الرحمن الرحيم. هذا ما أوصى به [الاسم]، وهو يشهد أن لا إله إلا الله وحده لا شريك له، وأن محمداً عبده ورسوله، وأن الجنة حق والنار حق، وأن الساعة آتية لا ريب فيها، وأن الله يبعث من في القبور. أوصي أهلي أن يتقوا الله ويصلحوا ذات بينهم. وأوصي من ثلث مالي بـ[...] لـ[...]، وعليّ من الديون [...] ولي عند الناس [...]. شهد على ذلك: [شاهدان عدلان]. التاريخ [...]».</p><button class="btn ghost block" id="wTpl">📤 مشاركة النموذج</button></div>
        ${src(['﴿كُتِبَ عَلَيْكُمْ إِذَا حَضَرَ أَحَدَكُمُ الْمَوْتُ إِن تَرَكَ خَيْرًا الْوَصِيَّةُ﴾ — البقرة: ١٨٠.', '«ما حق امرئ مسلم له شيء يوصي فيه يبيت ليلتين إلا ووصيته مكتوبة عنده» — رواه البخاري (٢٧٣٨) ومسلم (١٦٢٧).', 'حديث سعد بن أبي وقاص رضي الله عنه: «الثلث، والثلث كثير؛ إنك أن تذر ورثتك أغنياء خير من أن تذرهم عالة يتكففون الناس» — رواه البخاري (٢٧٤٢) ومسلم (١٦٢٨).', '«إن الله قد أعطى كل ذي حق حقه، فلا وصية لوارث» — رواه أبو داود (٢٨٧٠) والترمذي (٢١٢٠) وصححه الألباني.', 'الزائد على الثلث يتوقف على إجازة الورثة البالغين الراشدين بعد الموت؛ وإن لم يجيزوا قُسم الثلث بين الموصى لهم بالمحاصّة.', 'قانون الوصية المصري رقم ٧١ لسنة ١٩٤٦ (م٣٧): تصح الوصية بالثلث للوارث وغيره وتنفذ من غير إجازة الورثة.'])}`;
      curBind();
      const rd = () => { readRows('wR', S.rows, (r, i) => { r.k = $(`#wR [data-k="${i}"]`).value; r.h = $(`#wR [data-h="${i}"]`).checked; }); S.total = $('#wT').value; S.debts = $('#wD').value; S.law = $('#wL').value; S.ok = $('#wOk').checked; };
      bindRows('wR', S.rows, draw, rd, { k: 'amt', h: false });
      $('#wTpl').onclick = () => N.shareText($('#wTpl').previousElementSibling.textContent);
      $('#wGo').onclick = () => { rd(); compute(); };
    };
    function compute() {
      const net = num(S.total) - num(S.debts); if (net <= 0) { toast('أدخل التركة'); return; }
      const third = net / 3;
      const B = S.rows.map((r, i) => ({ n: r.n || `موصى له ${ar(i + 1)}`, a: r.k === 'pct' ? net * num(r.a) / 100 : num(r.a), h: r.h })).filter((b) => b.a > 0);
      const notes = [];
      B.forEach((b) => { b.ok = b.a; if (b.h && S.law === 'jumhur' && !S.ok) { b.ok = 0; b.why = 'وصية لوارث موقوفة على إجازة باقي الورثة'; } });
      const sum = B.reduce((s, b) => s + b.ok, 0);
      if (sum > third && !S.ok) { const f = third / sum; B.forEach((b) => { if (b.ok) { b.ok *= f; b.why = b.why || `خُفّضت بالمحاصّة إلى ${pct(f)} لأن مجموع الوصايا زاد على الثلث`; } }); notes.push(`مجموع الوصايا ${money(sum)} أكبر من الثلث (${money(third)})؛ فقُسم الثلث بينهم بالمحاصّة ما لم يُجز الورثة.`); }
      const used = B.reduce((s, b) => s + b.ok, 0);
      $('#wRes').innerHTML = `<div class="card calc-ok">${kv('صافي التركة', money(net))}${kv('الحد الأقصى للوصية (الثلث)', money(third))}
        <div class="pt-wrap" style="margin-top:8px"><table class="pt calc-t"><thead><tr><th>الموصى له</th><th>الموصى به</th><th>يُنفَّذ</th></tr></thead><tbody>${B.map((b) => `<tr><td>${esc(b.n)}${b.h ? '<small>وارث</small>' : ''}${b.why ? `<small>${esc(b.why)}</small>` : ''}</td><td>${money(b.a)}</td><td><b>${money(b.ok)}</b></td></tr>`).join('')}</tbody></table></div>
        ${kv('مجموع الوصايا المنفذة', `${money(used)} (${pct(used / net)})`)}${kv('الباقي للورثة يُقسم بالمواريث', money(net - used))}
        ${notes.map((n) => `<p class="calc-why">${esc(n)}</p>`).join('')}<p class="calc-why">الأفضل لمن ورثته فقراء أن يوصي بأقل من الثلث، كما فعل أبو بكر رضي الله عنه حين أوصى بالخُمس.</p>
        <button class="btn block" id="wInh">⚖️ وزّع الباقي على الورثة</button></div>${exportBar('wEx')}`;
      $('#wInh').onclick = () => { store.set('calc:open', { total: String(r2(net - used)), funeral: '', debts: '', will: '', mode: 'egypt', gender: 'm', h: {}, ww: [] }); N.go('c/mirath'); };
      saveHist('wasiyya', `وصية — ${money(used)}`, S, `من ${money(net)}`);
      bindExport('wEx', 'حساب الوصية', () => [{ t: `صافي التركة ${money(net)} — الثلث ${money(third)}`, b: 1 }, { table: [['الموصى له', 'الموصى به', 'يُنفذ'], ...B.map((b) => [b.n, money(b.a), money(b.ok)])] }, ...notes.map((n) => ({ t: n, s: 24 }))], () => B.map((b) => `• ${b.n}: ${money(b.ok)}`).join('\n'));
    }
    draw();
  }

  // ================= الوقف =================
  function renderWaqf() {
    const S = takeOpen({ cap: '', ret: '', maint: '10', grow: '0', rows: [{ n: 'الفقراء والمساكين', a: '50' }, { n: 'طلاب العلم وتحفيظ القرآن', a: '50' }] });
    const draw = () => {
      N.view.innerHTML = `
        <div class="card"><p class="muted" style="margin-top:0">الوقف: حبس الأصل وتسبيل المنفعة؛ يبقى الأصل ويُصرف ريعه في الوجوه التي حددها الواقف.</p>
          <div class="calc-row"><label>العملة</label>${curSelect('cCur')}</div>
          ${row('qC', 'قيمة الأصل الموقوف (عقار، محل، مبلغ مستثمر…)', S.cap)}${row('qR', 'الريع السنوي المتوقع (إيجار أو عائد)', S.ret)}${row('qM', 'نسبة عمارة الوقف وصيانته والنظارة ٪', S.maint)}${row('qG', 'زيادة الأصل من الريع سنوياً ٪ (اختياري لتنمية الوقف)', S.grow, '0')}
          <h4>مصارف الريع (النسبة ٪)</h4>${rowsEditor('qB', S.rows)}
          <button class="btn block" id="qGo" style="margin-top:10px">🧮 احسب</button></div>
        <div id="qRes"></div>
        ${src(['حديث عمر رضي الله عنه في أرضه بخيبر: «إن شئت حبست أصلها وتصدقت بها» فتصدّق بها عمر: لا يُباع أصلها ولا يوهب ولا يورث، في الفقراء والقربى والرقاب وفي سبيل الله وابن السبيل والضيف — رواه البخاري (٢٧٣٧) ومسلم (١٦٣٢).', '«إذا مات الإنسان انقطع عنه عمله إلا من ثلاثة: إلا من صدقة جارية، أو علم ينتفع به، أو ولد صالح يدعو له» — رواه مسلم (١٦٣١).', 'عمارة الوقف وصيانته مقدَّمة على الصرف إلى المستحقين عند الفقهاء، حفظاً لأصله؛ وشرط الواقف كنص الشارع في الفهم والدلالة ما لم يخالف الشرع.', 'يُستحب توثيق الوقف رسمياً لدى الجهة المختصة (في مصر: هيئة الأوقاف المصرية) حفظاً له من الضياع.'])}`;
      curBind();
      const rd = () => { readRows('qB', S.rows); S.cap = $('#qC').value; S.ret = $('#qR').value; S.maint = $('#qM').value; S.grow = $('#qG').value; };
      bindRows('qB', S.rows, draw, rd);
      $('#qGo').onclick = () => { rd(); compute(); };
    };
    function compute() {
      const cap = num(S.cap); const R = num(S.ret); if (!R) { toast('أدخل الريع السنوي'); return; }
      const m = R * num(S.maint) / 100; const g = R * num(S.grow) / 100; const dist = R - m - g;
      const B = S.rows.map((r, i) => ({ n: r.n || `مصرف ${ar(i + 1)}`, p: num(r.a) })).filter((b) => b.p > 0);
      const ps = B.reduce((s, b) => s + b.p, 0); if (Math.abs(ps - 100) > 0.01) { toast(`مجموع نسب المصارف ${ar(r2(ps))}٪ ويجب أن يكون ١٠٠٪`); return; }
      $('#qRes').innerHTML = `<div class="card calc-ok">${cap ? kv('العائد على الأصل', pct(R / cap)) : ''}${kv('الريع السنوي', money(R))}${kv('− العمارة والصيانة والنظارة', money(m))}${g ? kv('− تنمية الأصل', money(g)) : ''}${kv('الموزَّع على المستحقين سنوياً', money(dist))}${kv('شهرياً', money(dist / 12))}
        <div class="pt-wrap" style="margin-top:8px"><table class="pt calc-t"><thead><tr><th>المصرف</th><th>النسبة</th><th>سنوياً</th><th>شهرياً</th></tr></thead><tbody>${B.map((b) => `<tr><td>${esc(b.n)}</td><td>${ar(b.p)}٪</td><td>${money(dist * b.p / 100)}</td><td>${money(dist * b.p / 1200)}</td></tr>`).join('')}</tbody></table></div>
        ${g && cap ? `<p class="calc-why">بعد ١٠ سنوات يصير الأصل نحو ${money(cap + g * 10)} تقريباً (دون احتساب نمو العائد).</p>` : ''}</div>${exportBar('qEx')}`;
      saveHist('waqf', `وقف — ${money(dist)} سنوياً`, S, `ريع ${money(R)}`);
      bindExport('qEx', 'توزيع ريع الوقف', () => [{ t: `الريع ${money(R)} — العمارة ${money(m)} — الموزع ${money(dist)}`, b: 1 }, { table: [['المصرف', 'النسبة', 'سنوياً', 'شهرياً'], ...B.map((b) => [b.n, `${b.p}%`, money(dist * b.p / 100), money(dist * b.p / 1200)])] }], () => B.map((b) => `• ${b.n}: ${money(dist * b.p / 100)} سنوياً`).join('\n'));
    }
    draw();
  }

  // ================= سجل الصدقات =================
  const ST = [['sadaqa', 'صدقة'], ['zakat', 'زكاة'], ['kaffara', 'كفارة / فدية'], ['nadhr', 'نذر'], ['waqf', 'وقف / صدقة جارية']];
  function renderSadaqat() {
    const K = 'calc:sadaqat';
    const draw = () => {
      const L = store.get(K, []); const y = new Date().getFullYear();
      const yr = L.filter((x) => new Date(x.d).getFullYear() === y);
      const sum = (a) => a.reduce((s, x) => s + x.a, 0);
      N.view.innerHTML = `
        <div class="calc-2"><div class="card center"><small class="muted">هذا العام</small><b class="calc-big" style="display:block">${money(sum(yr))}</b></div><div class="card center"><small class="muted">الإجمالي</small><b class="calc-big" style="display:block">${money(sum(L))}</b></div></div>
        <div class="card" style="margin-top:10px">${ST.map(([k, t]) => { const v = sum(yr.filter((x) => x.t === k)); return v ? kv(t, money(v)) : ''; }).join('') || '<p class="muted center">لا توجد سجلات هذا العام</p>'}</div>
        <button class="btn block" id="sNew" style="margin-bottom:10px">+ تسجيل صدقة</button>
        ${L.slice().reverse().slice(0, 50).map((x) => `<div class="pr-extra"><span>${ST.find((t) => t[0] === x.t)[1]}${x.on ? ` عن ${esc(x.on)}` : ''}${x.note ? ` — ${esc(x.note)}` : ''}<small class="muted" style="display:block">${new Date(x.d).toLocaleDateString('ar-EG')}</small></span><b>${money(x.a)} <button class="chip" data-x="${x.id}">✕</button></b></div>`).join('')}
        ${src(['﴿مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ﴾ — البقرة: ٢٦١.', '«ما نقصت صدقة من مال» — رواه مسلم (٢٥٨٨).', '﴿إِن تُبْدُوا الصَّدَقَاتِ فَنِعِمَّا هِيَ ۖ وَإِن تُخْفُوهَا وَتُؤْتُوهَا الْفُقَرَاءَ فَهُوَ خَيْرٌ لَّكُمْ﴾ — البقرة: ٢٧١؛ السجل خاص بك على جهازك للمحاسبة لا للمباهاة.', 'الصدقة عن الميت تصل إليه بإذن الله: قال رجل: إن أمي افتُلتت نفسها وأظنها لو تكلمت تصدقت، فهل لها أجر إن تصدقت عنها؟ قال: «نعم» — رواه البخاري (١٣٨٨) ومسلم (١٠٠٤).'])}`;
      $('#sNew').onclick = () => {
        const sh = N.sheet(`<h3>تسجيل صدقة</h3><div class="calc-row"><label>المبلغ</label><input class="calc-in" id="eA" inputmode="decimal"></div>
          <div class="calc-row"><label>النوع</label><select class="calc-in" id="eT">${ST.map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></div>
          <div class="calc-row"><label>عن (اختياري)</label><input class="calc-in" id="eO" list="eOl" placeholder="مثال: المرحوم عيد فتحي أبو طالب"><datalist id="eOl"><option value="المرحوم عيد فتحي أبو طالب"><option value="والديّ"></datalist></div>
          <div class="calc-row"><label>ملاحظة</label><input class="calc-in" id="eN"></div>
          <div class="calc-row"><label>التاريخ</label><input class="calc-in" id="eD" type="date" value="${new Date().toISOString().slice(0, 10)}"></div><button class="btn block" id="eS">حفظ</button>`);
        $('#eS', sh.el).onclick = () => { const a = num($('#eA', sh.el).value); if (!a) { toast('أدخل المبلغ'); return; } const A = store.get(K, []); A.push({ id: Date.now(), a, t: $('#eT', sh.el).value, on: $('#eO', sh.el).value.trim(), note: $('#eN', sh.el).value.trim(), d: $('#eD', sh.el).value }); store.set(K, A); sh.close(); draw(); toast('تقبّل الله منك'); };
      };
      $$('[data-x]').forEach((b) => { b.onclick = () => { if (!confirm('حذف هذا السجل؟')) return; store.set(K, store.get(K, []).filter((x) => String(x.id) !== b.dataset.x)); draw(); }; });
    };
    draw();
  }

  const NEW = [
    { k: 'kaffara', ic: '📿', t: 'حاسبة الكفارات', d: 'اليمين، والجماع في رمضان، والظهار، والقتل الخطأ', cat: 'ibadat', ready: 1 },
    { k: 'fidya', ic: '🍽️', t: 'فدية الصيام والقضاء', d: 'كبير السن والمريض والحامل والمرضع وتأخير القضاء والميت', cat: 'ibadat', ready: 1 },
    { k: 'hajjfidya', ic: '🕋', t: 'فدية الأذى في الحج', d: 'الصيام أو الإطعام أو النسك', cat: 'ibadat', ready: 1 },
    { k: 'nudhur', ic: '🤲', t: 'سجل النذور', d: 'تسجيل النذر ومتابعة الوفاء به وحكم كل نوع', cat: 'ibadat', ready: 1 },
    { k: 'wasiyya', ic: '📜', t: 'حاسبة الوصية', d: 'حد الثلث والوصية لوارث والمحاصّة، ونموذج كتابة الوصية', cat: 'mawarith', ready: 1 },
    { k: 'waqf', ic: '🌳', t: 'حاسبة الوقف', d: 'توزيع ريع الوقف على المصارف بعد عمارته', cat: 'mal', ready: 1 },
    { k: 'sadaqat', ic: '🤍', t: 'سجل الصدقات', d: 'صدقاتك وزكاتك وكفاراتك وما تصدّقت به عن موتاك', cat: 'ibadat', ready: 1 },
  ];
  const at = C.TOOLS.findIndex((t) => t.k === 'kaffarat');
  C.TOOLS.splice(at >= 0 ? at : C.TOOLS.length, at >= 0 ? 1 : 0, ...NEW);
  Object.assign(C.CALCS, { kaffara: [renderKaffara, 'حاسبة الكفارات'], fidya: [renderFidya, 'فدية الصيام والقضاء'], hajjfidya: [renderHajjFidya, 'فدية الأذى في الحج'], nudhur: [renderNudhur, 'سجل النذور'], wasiyya: [renderWasiyya, 'حاسبة الوصية'], waqf: [renderWaqf, 'حاسبة الوقف'], sadaqat: [renderSadaqat, 'سجل الصدقات'] });
});
