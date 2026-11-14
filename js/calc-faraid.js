/* محرك المواريث (علم الفرائض) — حساب محلي بالكسور الدقيقة.
 * المرجعية: أحكام الفرائض في القرآن (النساء ١١، ١٢، ١٧٦) والسنة الصحيحة، على قول جمهور الفقهاء،
 * مع خيار «قانون المواريث المصري رقم ٧٧ لسنة ١٩٤٣» (ومنه: مقاسمة الجد للإخوة بحد أدنى السدس م٢٢، والتشريك في المشتركة)،
 * وخيار «المذهب الحنفي» (الجد يحجب الإخوة، ولا تشريك في المشتركة). الوصية الواجبة وفق القانون المصري رقم ٧١ لسنة ١٩٤٦.
 * المسائل التي تحتاج متخصصاً تُعلَّم صراحة (needsExpert) ولا تُقدَّم كحكم نهائي. */
(function (root) {
  'use strict';
  // ---------- الكسور ----------
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  function F(n, d = 1) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; }
  const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
  const sub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => F(a.n * b.n, a.d * b.d);
  const div = (a, b) => F(a.n * b.d, a.d * b.n);
  const cmp = (a, b) => a.n * b.d - b.n * a.d;
  const ZERO = F(0); const ONE = F(1);
  const val = (a) => a.n / a.d;
  const fs = (a) => (a.n === 0 ? '٠' : a.d === 1 ? String(a.n) : `${a.n}/${a.d}`);

  const NAMES = {
    husband: 'الزوج', wife: 'الزوجة', father: 'الأب', mother: 'الأم', gf: 'الجد (أبو الأب)', gmm: 'الجدة لأم (أم الأم)', gmf: 'الجدة لأب (أم الأب)',
    son: 'الابن', daughter: 'البنت', ss: 'ابن الابن', sd: 'بنت الابن',
    b: 'الأخ الشقيق', z: 'الأخت الشقيقة', pb: 'الأخ لأب', pz: 'الأخت لأب', mb: 'الأخ لأم', mz: 'الأخت لأم',
    nb: 'ابن الأخ الشقيق', npb: 'ابن الأخ لأب', u: 'العم الشقيق', pu: 'العم لأب', cu: 'ابن العم الشقيق', cpu: 'ابن العم لأب',
  };
  const PLURAL = { wife: 'الزوجات', son: 'الأبناء', daughter: 'البنات', ss: 'أبناء الابن', sd: 'بنات الابن', b: 'الإخوة الأشقاء', z: 'الأخوات الشقيقات', pb: 'الإخوة لأب', pz: 'الأخوات لأب', mb: 'الإخوة لأم', mz: 'الأخوات لأم', nb: 'أبناء الأخ الشقيق', npb: 'أبناء الأخ لأب', u: 'الأعمام الأشقاء', pu: 'الأعمام لأب', cu: 'أبناء العم الشقيق', cpu: 'أبناء العم لأب' };
  const KEYS = Object.keys(NAMES);

  /**
   * h: عدد كل صنف من الورثة (h.husband 0/1، h.wife 0..4، ...)، mode: 'egypt' | 'hanafi'
   * يعيد: { rows: [{k,name,count,share(F),type,reason}], blocked: [{k,name,count,reason}], asl, awl, radd, notes[], needsExpert[] }
   */
  function solve(h0, mode = 'egypt') {
    const h = {}; KEYS.forEach((k) => { h[k] = Math.max(0, Math.floor(+h0[k] || 0)); });
    if (h.husband > 1) h.husband = 1; if (h.wife > 4) h.wife = 4; if (h.husband && h.wife) h.wife = 0;
    ['father', 'mother', 'gf', 'gmm', 'gmf'].forEach((k) => { if (h[k] > 1) h[k] = 1; });
    const notes = []; const expert = []; const blocked = []; const fixed = {}; const reasons = {};
    const block = (k, why) => { if (h[k]) { blocked.push({ k, name: h[k] > 1 && PLURAL[k] ? PLURAL[k] : NAMES[k], count: h[k], reason: why }); h[k] = 0; } };

    const maleDesc = h.son + h.ss > 0;
    const femaleDesc = h.daughter + h.sd > 0;
    const hasDesc = maleDesc || femaleDesc;
    const siblingsCount = h.b + h.z + h.pb + h.pz + h.mb + h.mz;

    // ---------- الحجب ----------
    if (h.father) { block('gf', 'يُحجب الجد بوجود الأب'); block('gmf', 'تُحجب الجدة لأب بوجود الأب'); }
    if (h.mother) { block('gmm', 'تُحجب الجدة بوجود الأم'); block('gmf', 'تُحجب الجدة بوجود الأم'); }
    if (h.son) { block('ss', 'يُحجب ابن الابن بوجود الابن'); block('sd', 'تُحجب بنت الابن بوجود الابن'); }
    const maleAsc = h.father || h.gf;
    if (hasDesc || maleAsc) { const w = hasDesc ? 'بوجود الفرع الوارث' : 'بوجود الأصل الوارث من الذكور'; block('mb', `يُحجب الإخوة لأم ${w}`); block('mz', `تُحجب الأخوات لأم ${w}`); }
    if (maleDesc || h.father) {
      const w = h.father ? 'بوجود الأب' : 'بوجود الفرع الوارث المذكر';
      ['b', 'z', 'pb', 'pz', 'nb', 'npb', 'u', 'pu', 'cu', 'cpu'].forEach((k) => block(k, `محجوب ${w}`));
    }
    const gfWithSiblings = h.gf && (h.b + h.z + h.pb + h.pz) > 0;
    if (h.gf) {
      ['nb', 'npb', 'u', 'pu', 'cu', 'cpu'].forEach((k) => block(k, 'محجوب بوجود الجد'));
      if (mode === 'hanafi') ['b', 'z', 'pb', 'pz'].forEach((k) => block(k, 'يحجب الجدُّ الإخوةَ عند الحنفية (قول أبي بكر الصديق رضي الله عنه)'));
    }
    if (h.b) ['pb', 'pz', 'nb', 'npb', 'u', 'pu', 'cu', 'cpu'].forEach((k) => block(k, 'محجوب بوجود الأخ الشقيق'));
    // الأخت الشقيقة مع البنات عصبة مع الغير فتحجب من يحجبه الأخ الشقيق
    if (h.z && !h.b && femaleDesc && !h.gf) ['pb', 'pz', 'nb', 'npb', 'u', 'pu', 'cu', 'cpu'].forEach((k) => block(k, 'محجوب بالأخت الشقيقة لأنها عصبة مع البنات'));
    if (h.pb) ['nb', 'npb', 'u', 'pu', 'cu', 'cpu'].forEach((k) => block(k, 'محجوب بوجود الأخ لأب'));
    if (h.pz && !h.pb && femaleDesc && !h.gf) ['nb', 'npb', 'u', 'pu', 'cu', 'cpu'].forEach((k) => block(k, 'محجوب بالأخت لأب لأنها عصبة مع البنات'));
    const ORDER = ['nb', 'npb', 'u', 'pu', 'cu', 'cpu'];
    for (let i = 0; i < ORDER.length; i++) if (h[ORDER[i]]) { ORDER.slice(i + 1).forEach((k) => block(k, `محجوب بوجود ${NAMES[ORDER[i]]} (أقرب في التعصيب)`)); break; }

    // ---------- الفروض ----------
    const setFixed = (k, f, why) => { fixed[k] = f; reasons[k] = why; };
    if (h.husband) setFixed('husband', hasDesc ? F(1, 4) : F(1, 2), hasDesc ? 'الربع لوجود الفرع الوارث (النساء: ١٢)' : 'النصف لعدم وجود الفرع الوارث (النساء: ١٢)');
    if (h.wife) setFixed('wife', hasDesc ? F(1, 8) : F(1, 4), `${hasDesc ? 'الثمن لوجود الفرع الوارث' : 'الربع لعدم وجود الفرع الوارث'}${h.wife > 1 ? '، يشتركن فيه بالتساوي' : ''} (النساء: ١٢)`);
    // البنات
    if (h.daughter && !h.son) setFixed('daughter', h.daughter === 1 ? F(1, 2) : F(2, 3), h.daughter === 1 ? 'النصف لانفرادها وعدم المعصِّب (النساء: ١١)' : 'الثلثان للبنتين فأكثر (النساء: ١١)');
    if (h.sd && !h.son && !h.ss) {
      if (h.daughter === 0) setFixed('sd', h.sd === 1 ? F(1, 2) : F(2, 3), h.sd === 1 ? 'النصف لعدم البنت والمعصِّب' : 'الثلثان لعدم البنت والمعصِّب');
      else if (h.daughter === 1) setFixed('sd', F(1, 6), 'السدس تكملة الثلثين مع البنت الواحدة (حديث ابن مسعود — البخاري ٦٧٣٦)');
      else block('sd', 'تُحجب بنات الابن باستكمال البنات الثلثين وعدم المعصِّب');
    }
    // الأم
    let umariyya = false;
    if (h.mother) {
      if (hasDesc || siblingsCount >= 2) setFixed('mother', F(1, 6), hasDesc ? 'السدس لوجود الفرع الوارث (النساء: ١١)' : 'السدس لوجود جمع من الإخوة (النساء: ١١)');
      else if (h.father && (h.husband || h.wife) && !hasDesc && siblingsCount < 2 && !h.gf) { umariyya = true; setFixed('mother', F(1, 3), 'ثلث الباقي بعد فرض الزوجية (المسألة العُمَرية — قضاء عمر رضي الله عنه وعليه الجمهور)'); }
      else setFixed('mother', F(1, 3), 'الثلث لعدم الفرع الوارث وعدم جمع الإخوة (النساء: ١١)');
    }
    // الجدات
    if (h.gmm || h.gmf) {
      const n = h.gmm + h.gmf;
      if (h.gmm) setFixed('gmm', F(1, 6 * n), n > 1 ? 'السدس مشتركاً بين الجدتين' : 'السدس (حديث قبيصة في جدة — أبو داود والترمذي)');
      if (h.gmf) setFixed('gmf', F(1, 6 * n), n > 1 ? 'السدس مشتركاً بين الجدتين' : 'السدس');
    }
    // الأب والجد
    const ascFard = (k) => { if (h[k] && hasDesc) setFixed(k, F(1, 6), maleDesc ? 'السدس فرضاً لوجود الفرع الوارث المذكر (النساء: ١١)' : 'السدس فرضاً، والباقي تعصيباً لوجود الفرع الوارث المؤنث'); };
    ascFard('father'); if (!gfWithSiblings || mode === 'hanafi') ascFard('gf');
    // الإخوة لأم
    if (h.mb + h.mz) { const n = h.mb + h.mz; const f = n === 1 ? F(1, 6) : F(1, 3); if (h.mb) setFixed('mb', F(f.n * h.mb, f.d * n), n === 1 ? 'السدس للواحد من ولد الأم (النساء: ١٢)' : 'الثلث يشتركون فيه بالتساوي ذكورهم وإناثهم (النساء: ١٢)'); if (h.mz) setFixed('mz', F(f.n * h.mz, f.d * n), n === 1 ? 'السدس للواحدة من ولد الأم (النساء: ١٢)' : 'الثلث يشتركون فيه بالتساوي (النساء: ١٢)'); }
    // الأخوات (عند عدم المعصِّب وعدم الفرع الوارث)
    const sisFard = !femaleDesc && !gfWithSiblings;
    if (h.z && !h.b && sisFard) setFixed('z', h.z === 1 ? F(1, 2) : F(2, 3), h.z === 1 ? 'النصف (النساء: ١٧٦)' : 'الثلثان للأختين فأكثر (النساء: ١٧٦)');
    if (h.pz && !h.pb && !gfWithSiblings) {
      if (h.z >= 2 && !h.b && !h.pb) block('pz', 'تُحجب الأخوات لأب باستكمال الشقيقات الثلثين وعدم المعصِّب');
      else if (h.z === 1 && !h.b && sisFard) setFixed('pz', F(1, 6), 'السدس تكملة الثلثين مع الأخت الشقيقة');
      else if (h.z === 0 && sisFard) setFixed('pz', h.pz === 1 ? F(1, 2) : F(2, 3), h.pz === 1 ? 'النصف' : 'الثلثان');
    }

    // ---------- مسألة الجد مع الإخوة (القانون المصري م٢٢) ----------
    if (gfWithSiblings && mode !== 'hanafi') {
      expert.push('اجتماع الجد مع الإخوة: حُسبت وفق المادة ٢٢ من قانون المواريث المصري (المقاسمة بحيث لا يقل نصيب الجد عن السدس). المذاهب تختلف في هذه المسألة اختلافاً كبيراً، فراجع متخصصاً.');
      if (h.b + h.z && h.pb + h.pz) expert.push('اجتماع الإخوة الأشقاء والإخوة لأب مع الجد (مسألة المعادّة) لم تُطبَّق هنا؛ حُجب الإخوة لأب بالأشقاء.');
    }

    // ---------- المشتركة (الحمارية) ----------
    let mushtaraka = false;
    if (h.husband && (h.mother || h.gmm || h.gmf) && (h.mb + h.mz) >= 2 && h.b && !hasDesc && !maleAsc) {
      if (mode === 'hanafi') { notes.push('المسألة المشتركة: عند الحنفية والحنابلة لا يُشرَّك الإخوة الأشقاء مع الإخوة لأم، فيسقطون لاستغراق الفروض.'); }
      else { mushtaraka = true; expert.push('المسألة المشتركة (الحمارية): شُرِّك الإخوة الأشقاء مع الإخوة لأم في الثلث بالتساوي، وهو قول المالكية والشافعية وبه أخذ القانون المصري؛ ولا تشريك عند الحنفية والحنابلة.'); }
    }

    // ---------- مجموع الفروض والباقي ----------
    let sum = ZERO; Object.values(fixed).forEach((f) => { sum = add(sum, f); });
    // العمرية: الأم تأخذ ثلث الباقي بعد الزوجية
    if (umariyya) { const sp = fixed.husband || fixed.wife; fixed.mother = mul(F(1, 3), sub(ONE, sp)); sum = ZERO; Object.values(fixed).forEach((f) => { sum = add(sum, f); }); }
    if (mushtaraka) {
      const third = add(fixed.mb || ZERO, fixed.mz || ZERO); const n = h.mb + h.mz + h.b + h.z;
      if (h.mb) fixed.mb = mul(third, F(h.mb, n)); if (h.mz) fixed.mz = mul(third, F(h.mz, n));
      fixed.b = mul(third, F(h.b, n)); reasons.b = 'شُرِّكوا مع الإخوة لأم في الثلث بالتساوي (المسألة المشتركة)';
      if (h.z) { fixed.z = mul(third, F(h.z, n)); reasons.z = reasons.b; }
    }
    let rem = sub(ONE, sum);
    const asaba = []; // [key, weight]
    const share = Object.assign({}, fixed); const type = {}; Object.keys(fixed).forEach((k) => { type[k] = 'فرض'; });
    const giveAsaba = (list, why) => {
      if (cmp(rem, ZERO) <= 0) { list.forEach(([k]) => { if (!fixed[k]) block(k, 'لم يبق له شيء بعد أصحاب الفروض (العصبة يأخذ ما أبقت الفروض)'); }); return; }
      const tw = list.reduce((s, [k, w]) => s + h[k] * w, 0);
      list.forEach(([k, w]) => { const part = mul(rem, F(h[k] * w, tw)); share[k] = add(share[k] || ZERO, part); type[k] = fixed[k] ? 'فرض وتعصيب' : 'تعصيب'; reasons[k] = (fixed[k] ? reasons[k] + '، ' : '') + why; });
      rem = ZERO;
    };

    if (!mushtaraka) {
      if (h.son) giveAsaba([['son', 2], ['daughter', 1]], h.daughter ? 'الباقي تعصيباً للذكر مثل حظ الأنثيين (النساء: ١١)' : 'الباقي تعصيباً');
      else if (h.ss) giveAsaba([['ss', 2], ['sd', 1]], h.sd && !fixed.sd ? 'الباقي تعصيباً للذكر مثل حظ الأنثيين' : 'الباقي تعصيباً');
      else if (h.father) giveAsaba([['father', 1]], 'الباقي تعصيباً («ألحقوا الفرائض بأهلها فما بقي فلأولى رجل ذكر» — متفق عليه)');
      else if (h.gf && (!gfWithSiblings || mode === 'hanafi')) giveAsaba([['gf', 1]], 'الباقي تعصيباً');
      else if (gfWithSiblings && mode !== 'hanafi') {
        // الإخوة المعتبرون: الأشقاء إن وُجدوا وإلا لأب
        const [bk, zk] = h.b + h.z ? ['b', 'z'] : ['pb', 'pz'];
        if (bk === 'b') { block('pb', 'محجوب بالإخوة الأشقاء'); block('pz', 'محجوبة بالإخوة الأشقاء'); }
        const sixth = F(1, 6);
        const males = h[bk]; const asabaWithGirls = femaleDesc;
        if (males || asabaWithGirls) {
          // الحالة الأولى: يقاسمهم كأخ
          const tw = 2 + 2 * h[bk] + h[zk];
          let gfShare = cmp(rem, ZERO) > 0 ? mul(rem, F(2, tw)) : ZERO;
          if (cmp(gfShare, sixth) < 0) {
            share.gf = sixth; type.gf = 'فرض'; reasons.gf = 'السدس فرضاً لأن المقاسمة تنقصه عن السدس (م٢٢ قانون المواريث)';
            rem = sub(rem, sixth);
            if (cmp(rem, ZERO) > 0) { const tw2 = 2 * h[bk] + h[zk]; share[bk] = mul(rem, F(2 * h[bk], tw2)); if (h[zk]) share[zk] = mul(rem, F(h[zk], tw2)); type[bk] = 'تعصيب'; reasons[bk] = 'الباقي تعصيباً'; if (h[zk]) { type[zk] = 'تعصيب'; reasons[zk] = 'الباقي تعصيباً للذكر مثل حظ الأنثيين'; } rem = ZERO; }
            else { block(bk, 'لم يبق شيء بعد الفروض'); block(zk, 'لم يبق شيء بعد الفروض'); }
          } else {
            share.gf = gfShare; type.gf = 'تعصيب'; reasons.gf = 'يقاسم الإخوة كأخ (م٢٢ قانون المواريث)';
            if (h[bk]) { share[bk] = mul(rem, F(2 * h[bk], tw)); type[bk] = 'تعصيب'; reasons[bk] = 'يقاسمون الجد للذكر مثل حظ الأنثيين'; }
            if (h[zk]) { share[zk] = mul(rem, F(h[zk], tw)); type[zk] = 'تعصيب'; reasons[zk] = 'يقاسمن الجد للذكر مثل حظ الأنثيين'; }
            rem = ZERO;
          }
        } else {
          // الحالة الثانية: أخوات فقط بلا فرع وارث مؤنث: يأخذن فرضهن والجد الباقي بحد أدنى السدس
          const n = h[zk]; const zf = n === 1 ? F(1, 2) : F(2, 3);
          share[zk] = zf; type[zk] = 'فرض'; reasons[zk] = n === 1 ? 'النصف فرضاً' : 'الثلثان فرضاً';
          rem = sub(rem, zf);
          if (cmp(rem, sixth) >= 0) { share.gf = rem; type.gf = 'تعصيب'; reasons.gf = 'الباقي تعصيباً (م٢٢ قانون المواريث)'; rem = ZERO; }
          else { share.gf = sixth; type.gf = 'فرض'; reasons.gf = 'السدس فرضاً لأن الباقي أقل من السدس (م٢٢ قانون المواريث)'; rem = sub(rem, sixth); }
        }
      }
      else if (h.b) giveAsaba([['b', 2], ['z', 1]], h.z ? 'الباقي تعصيباً للذكر مثل حظ الأنثيين (النساء: ١٧٦)' : 'الباقي تعصيباً');
      else if (h.z && femaleDesc) giveAsaba([['z', 1]], 'الباقي تعصيباً مع الغير (الأخوات مع البنات عصبة — حديث ابن مسعود، البخاري ٦٧٣٦)');
      else if (h.pb) giveAsaba([['pb', 2], ['pz', 1]], h.pz ? 'الباقي تعصيباً للذكر مثل حظ الأنثيين' : 'الباقي تعصيباً');
      else if (h.pz && femaleDesc) giveAsaba([['pz', 1]], 'الباقي تعصيباً مع الغير');
      else { for (const k of ORDER) if (h[k]) { giveAsaba([[k, 1]], 'الباقي تعصيباً'); break; } }
    }

    // ---------- العول ----------
    let total = ZERO; Object.values(share).forEach((f) => { total = add(total, f); });
    let awl = null; let radd = false;
    if (cmp(total, ONE) > 0) {
      awl = total;
      Object.keys(share).forEach((k) => { share[k] = div(share[k], total); });
      notes.push(`المسألة عائلة: زادت الفروض على التركة فنقص نصيب كل صاحب فرض بنسبة فرضه (العول، قضى به عمر رضي الله عنه بمحضر الصحابة).`);
    } else if (cmp(total, ONE) < 0) {
      // ---------- الرد ----------
      const rk = Object.keys(share).filter((k) => k !== 'husband' && k !== 'wife');
      const left = sub(ONE, total);
      if (rk.length) {
        radd = true;
        let base = ZERO; rk.forEach((k) => { base = add(base, share[k]); });
        rk.forEach((k) => { share[k] = add(share[k], mul(left, div(share[k], base))); if (type[k] === 'فرض') type[k] = 'فرض وردّ'; });
        notes.push('فاض من التركة شيء بعد الفروض ولا عاصب، فيُرد الباقي على أصحاب الفروض بنسبة فروضهم عدا الزوجين.');
      } else if (Object.keys(share).length) {
        expert.push('لا يوجد إلا الزوج/الزوجة: يأخذ فرضه، والباقي لذوي الأرحام إن وُجدوا، وإلا رُدّ على الزوج/الزوجة وفق المادة ٣٠ من القانون المصري. ذوو الأرحام غير مدعومين في هذه الحاسبة؛ راجع متخصصاً.');
      }
    }
    if (!Object.keys(share).length) expert.push('لا يوجد وارث من أصحاب الفروض أو العصبة المدعومين؛ قد يرث ذوو الأرحام أو تؤول التركة لبيت المال. راجع متخصصاً.');

    // ---------- أصل المسألة ----------
    let asl = 1; Object.values(fixed).forEach((f) => { asl = lcm(asl, f.d); });
    let tas = 1; Object.values(share).forEach((f) => { tas = lcm(tas, f.d); });
    KEYS.forEach((k) => { if (share[k] && h[k] > 1) { const per = div(share[k], F(h[k])); tas = lcm(tas, per.d); } });

    const rows = KEYS.filter((k) => share[k] && cmp(share[k], ZERO) > 0).map((k) => ({
      k, name: h[k] > 1 && PLURAL[k] ? PLURAL[k] : NAMES[k], count: h[k], share: share[k], per: div(share[k], F(h[k])),
      type: type[k] || 'فرض', reason: reasons[k] || '', sahm: share[k].n * (tas / share[k].d),
    }));
    return { rows, blocked, asl, awlTo: awl ? val(awl) * asl : null, radd, tas, notes, needsExpert: expert, mode };
  }

  root.Faraid = { solve, F, add, sub, mul, div, cmp, val, fs, NAMES, PLURAL, KEYS, ONE, ZERO };
  if (typeof module !== 'undefined') module.exports = root.Faraid;
})(typeof window !== 'undefined' ? window : globalThis);
