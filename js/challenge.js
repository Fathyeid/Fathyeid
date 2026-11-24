/* تحدّي ٣٠ يوماً للالتزام | 30-Day Islamic Commitment Challenge
 * رحلة روحية تدريجية: عادات يومية، آية وحديث لكل يوم، إحصاءات، أوسمة، تذكيرات، وتقرير ختامي.
 * البيانات محفوظة تلقائياً على الجهاز (store) وتُربط بمتابعة الصلوات الموجودة في التطبيق دون تكرار. */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, esc, routes } = N;
  const DAYS = window.CH30_DAYS || [];
  const KEY = 'ch30';
  const NKEY = 'ch30:notif';

  const STAGES = [
    { n: 1, a: 1, b: 7, t: 'بناء الأساس', e: 'Building the Foundation', d: 'ثبّت الصلوات الخمس، وابدأ القرآن كل يوم، وأذكار الصباح والمساء، بلا إرهاق.' },
    { n: 2, a: 8, b: 15, t: 'تقوية العادات', e: 'Strengthening Habits', d: 'زد القرآن بالتدريج، وجرّب النوافل، وأكثر من الذكر والدعاء والصدقة والإحسان.' },
    { n: 3, a: 16, b: 23, t: 'النمو الروحي', e: 'Spiritual Growth', d: 'احفظ آيات قصيرة، وقم من الليل ما تيسّر، وحديث صحيح كل يوم، مع الصبر والشكر واللين.' },
    { n: 4, a: 24, b: 30, t: 'الالتزام الدائم', e: 'Lasting Commitment', d: 'حافظ على عاداتك، وراجع تقدّمك، واعرف أقوى عاداتك، وضع خطة لما بعد اليوم الثلاثين.' },
  ];
  const stageOf = (d) => STAGES.find((s) => d >= s.a && d <= s.b) || STAGES[0];

  // ---------- العادات ----------
  const H = [
    { id: 'salah', core: 1, a: 'أداء الصلوات الخمس في وقتها', e: 'Five daily prayers on time', rule: 'فرض', type: 'prayers', ex: 'الصلوات الخمس فريضة على كل مسلم بالغ عاقل. حاول أداءها في أول وقتها وبخشوع. العلامات هنا مرتبطة بصفحة «متابعة الصلوات» في التطبيق نفسها.', route: 'tracker', locked: 1 },
    { id: 'quran', core: 1, a: 'قراءة القرآن الكريم', e: 'Read the Quran', rule: 'من أحب القربات', type: 'count', unit: 'صفحة', step: 1, ex: 'قراءة وردك اليومي بتدبّر. صفحتان حدّ أدنى مقترح للتحدي، وهو تنظيم للعادة وليس حكماً شرعياً، فاختر ما تقدر على المداومة عليه.', route: 'quran', cfg: 'pages' },
    { id: 'adm', core: 1, a: 'أذكار الصباح', e: 'Morning adhkar', rule: 'سنة', type: 'check', ex: 'تُقال في أول النهار بعد صلاة الفجر. وهي حصن يومك بإذن الله بما صحّ من الأذكار.', route: 'azcat/azkar/morning' },
    { id: 'ade', core: 1, a: 'أذكار المساء', e: 'Evening adhkar', rule: 'سنة', type: 'check', ex: 'تُقال في آخر النهار بعد العصر إلى المغرب تقريباً.', route: 'azcat/azkar/morning' },
    { id: 'ist', core: 1, a: 'الاستغفار', e: 'Seeking forgiveness', rule: 'سنة', type: 'count', unit: 'مرة', step: 10, ex: 'قل «أستغفر الله». ثبت أن النبي ﷺ كان يستغفر في اليوم أكثر من سبعين مرة (البخاري). وعدد المئة هنا اختيار تنظيمي للتحدي وليس تحديداً شرعياً.', route: 'tasbih', cfg: 'istighfar' },
    { id: 'sal', core: 1, a: 'الصلاة على النبي ﷺ', e: 'Send blessings upon the Prophet ﷺ', rule: 'سنة', type: 'count', unit: 'مرة', step: 10, ex: 'قل «اللهم صلّ وسلّم على نبينا محمد». وعدد المئة تنظيمي للتحدي وليس تحديداً شرعياً. وفي صحيح مسلم: «من صلى عليّ صلاة صلى الله عليه بها عشراً».', route: 'tasbih', cfg: 'salawat' },
    { id: 'slp', core: 1, a: 'المحافظة على أذكار النوم', e: 'Bedtime adhkar', rule: 'سنة', type: 'check', ex: 'مثل آية الكرسي والمعوّذات قبل النوم، كما ثبت في الصحيح.', route: 'azcat/azkar/sleep' },
    { id: 'duha', a: 'صلاة الضحى', e: 'Duha prayer', rule: 'سنة', type: 'check', ex: 'ركعتان فأكثر بعد ارتفاع الشمس إلى قبيل الظهر. وفي صحيح مسلم أن ركعتين من الضحى تجزئان عن صدقات المفاصل.' },
    { id: 'qiyam', a: 'قيام الليل', e: 'Night prayer', rule: 'سنة', type: 'check', ex: 'ما تيسّر من الركعات بين العشاء والفجر، وأفضله الثلث الأخير. ولو ركعتين.' },
    { id: 'witr', a: 'صلاة الوتر', e: 'Witr prayer', rule: 'سنة مؤكدة', type: 'check', ex: 'تختم بها صلاة الليل، ركعة فأكثر. وهي سنة مؤكدة عند جمهور العلماء، وواجبة عند الحنفية.' },
    { id: 'sadaqa', a: 'صدقة ولو بمبلغ بسيط', e: 'Give charity, even a small amount', rule: 'تطوع', type: 'check', ex: 'ولو بقليل أو بكلمة طيبة أو ابتسامة. وفي الصحيح: «اتقوا النار ولو بشق تمرة».' },
    { id: 'silat', a: 'صلة الرحم', e: 'Keep family ties', rule: 'من البر', type: 'check', ex: 'اتصال أو رسالة أو زيارة لقريب. وفي الصحيح أن صلة الرحم سبب لبسط الرزق وطول الأثر.' },
    { id: 'help', a: 'مساعدة شخص محتاج', e: 'Help someone in need', rule: 'تطوع', type: 'check', ex: 'قضاء حاجة أو تفريج كربة أو عون بسيط لأحد حولك.' },
    { id: 'memorize', a: 'حفظ آية من القرآن', e: 'Memorize an ayah', rule: 'تطوع', type: 'check', ex: 'اختر آية قصيرة، واقرأها مرات، وراجعها آخر اليوم.' },
    { id: 'hadith', a: 'قراءة حديث شريف', e: 'Read a hadith', rule: 'تطوع', type: 'check', ex: 'اقرأ حديث اليوم أو حديثاً من الأربعين النووية، وتأمّل معناه.', route: 'hadith' },
    { id: 'gheeba', a: 'تجنّب الغيبة', e: 'Avoid backbiting', rule: 'ترك المحرّم واجب', type: 'check', ex: 'ترك الغيبة واجب على كل مسلم لأنها محرّمة. جُعلت هنا عادة للمراقبة والتذكّر، وليست اختيارية في حكمها.' },
  ];
  const HB = Object.fromEntries(H.map((h) => [h.id, h]));

  const BADGES = [
    { n: 1, t: 'بداية الرحلة', e: 'The Journey Begins', ic: '🌱' },
    { n: 3, t: 'أول خطوة', e: 'First Step', ic: '👣' },
    { n: 7, t: 'أسبوع من الالتزام', e: 'A Week of Commitment', ic: '🌙' },
    { n: 15, t: 'نصف الطريق', e: 'Halfway There', ic: '⛰️' },
    { n: 21, t: 'ثبات العادة', e: 'Habit Firmly Rooted', ic: '🌳' },
    { n: 30, t: 'أتممت الرحلة', e: 'Journey Completed', ic: '🏆' },
  ];

  const KIND = { core: 'العادات الأساسية للتحدي', opt: 'عادات اختيارية' };
  const ENC = [
    'لا تستسلم، كل يوم فرصة جديدة للعودة إلى الله 🤍',
    'رحلتك لا تزال هنا، تبدأ من حيث وصلت. خطوة صغيرة اليوم تكفي.',
    'لا بأس، الأهم أن تعود. يوم جديد وبداية جديدة بإذن الله.',
  ];

  // ---------- التخزين ----------
  const load = () => {
    const s = store.get(KEY, null);
    return s && s.v === 1 ? s : { v: 1, list: [], active: null };
  };
  let S = load();
  const save = () => { store.set(KEY, S); };
  const cur = () => S.list.find((c) => c.id === S.active) || null;
  const nprefs = () => Object.assign({ morning: { on: true, t: 'fajr' }, quran: { on: true, t: '16:00' }, evening: { on: true, t: '17:30' }, night: { on: false, t: '22:30' }, daily: { on: true, t: '20:30' }, missed: { on: true } }, store.get(NKEY, {}));

  const today = () => N.todayKey();
  const dnum = (k) => { const [y, m, d] = k.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 864e5); };
  const addDays = (k, n) => { const [y, m, d] = k.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`; };
  const fmtDay = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); };

  function newCfg(from) {
    const c = from ? JSON.parse(JSON.stringify(from)) : { pages: 2, istighfar: 100, salawat: 100, on: {}, custom: [] };
    H.forEach((h) => { if (c.on[h.id] == null) c.on[h.id] = !!h.core; });
    return c;
  }
  function startChallenge(cfgFrom) {
    const c = cur();
    if (c && c.status === 'active') { c.status = 'paused'; c.pausedAt = today(); }
    const id = 'c' + Date.now().toString(36);
    const n = S.list.length + 1;
    S.list.push({ id, name: `تحدّي ${ar(n)}`, start: today(), created: today(), status: 'active', ack: 0, cfg: newCfg(cfgFrom), log: {}, badges: {}, last: today() });
    S.active = id;
    save();
    reschedule();
    return id;
  }
  const calDay = (c) => {
    const ref = c.status === 'paused' && c.pausedAt ? c.pausedAt : today();
    return dnum(ref) - dnum(c.start) + 1;
  };
  const todayDay = (c) => Math.max(1, Math.min(30, calDay(c)));
  const L = (c, d) => c.log[d] || (c.log[d] = { done: {}, date: today(), fin: null, note: '' });
  const trk = () => store.get('tracker', {});
  const P5 = () => (N.PRAYERS || []).filter((p) => !p.sun);

  // الأهداف المختارة لليوم
  function goalsOf(c) {
    const g = H.filter((h) => c.cfg.on[h.id]).map((h) => h.id);
    c.cfg.custom.forEach((x) => { if (x.on !== false) g.push(x.id); });
    return g;
  }
  function target(c, id) {
    const h = HB[id];
    if (!h || h.type !== 'count') return 1;
    return c.cfg[h.cfg] || 1;
  }
  function val(c, d, id) {
    const lg = c.log[d];
    if (id === 'salah') {
      const dt = (lg && lg.date) || today();
      const t = trk()[dt] || {};
      return P5().filter((p) => t[p.key]).length;
    }
    return (lg && lg.done[id]) || 0;
  }
  const isDone = (c, d, id) => (id === 'salah' ? val(c, d, id) >= 5 : id.startsWith('x') ? !!val(c, d, id) : val(c, d, id) >= target(c, id));
  function dayStat(c, d) {
    const lg = c.log[d];
    if (lg && lg.fin && lg.snap) return lg.snap;
    const g = goalsOf(c);
    const by = {};
    g.forEach((id) => { by[id] = isDone(c, d, id); });
    return { done: g.filter((id) => by[id]).length, total: g.length, by };
  }
  const pctOf = (st) => (st.total ? Math.round((st.done / st.total) * 100) : 0);
  const finished = (c) => Object.keys(c.log).filter((d) => c.log[d].fin).map(Number).sort((a, b) => a - b);

  function streaks(c) {
    const f = new Set(finished(c));
    let longest = 0, run = 0;
    for (let d = 1; d <= 30; d++) { if (f.has(d)) { run++; longest = Math.max(longest, run); } else run = 0; }
    const t = todayDay(c);
    let curS = 0;
    let d = f.has(t) ? t : t - 1;
    while (d >= 1 && f.has(d)) { curS++; d--; }
    return { cur: curS, longest };
  }
  function totals(c) {
    const T = { tasks: 0, pages: 0, adhkar: 0, sets: 0, prayers: 0, deeds: 0, days: 0 };
    const fin = finished(c);
    T.days = fin.length;
    Object.keys(c.log).forEach((k) => {
      const d = +k; const lg = c.log[d];
      if (!lg.fin && !Object.keys(lg.done).length) return;
      T.pages += lg.done.quran || 0;
      T.adhkar += (lg.done.ist || 0) + (lg.done.sal || 0);
      T.sets += ['adm', 'ade', 'slp'].filter((x) => lg.done[x]).length;
      T.prayers += val(c, d, 'salah');
      T.deeds += ['sadaqa', 'silat', 'help'].filter((x) => lg.done[x]).length;
      const st = dayStat(c, d);
      T.tasks += st.done;
    });
    return T;
  }
  function habitRates(c) {
    const R = {};
    finished(c).forEach((d) => {
      const st = c.log[d].snap; if (!st) return;
      Object.keys(st.by).forEach((id) => { const r = R[id] || (R[id] = { n: 0, ok: 0 }); r.n++; if (st.by[id]) r.ok++; });
    });
    return Object.keys(R).map((id) => ({ id, n: R[id].n, rate: R[id].ok / R[id].n })).sort((a, b) => b.rate - a.rate);
  }
  const nameOf = (c, id) => (HB[id] ? HB[id].a : ((c.cfg.custom.find((x) => x.id === id) || {}).a || id));

  function missedDays(c) {
    const t = calDay(c);
    const out = [];
    for (let d = 1; d < Math.min(t, 31); d++) if (!(c.log[d] && c.log[d].fin)) out.push(d);
    return out;
  }

  // ---------- مساعدات الواجهة ----------
  const ring = (p, size = 150, sw = 12) => {
    const r = (size - sw) / 2; const C = 2 * Math.PI * r;
    return `<svg class="ch-ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="bg" stroke-width="${sw}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="fg" stroke-width="${sw}" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C * (1 - p / 100)}"/></svg>`;
  };
  const animRings = (root) => requestAnimationFrame(() => requestAnimationFrame(() => $$('.ch-ring .fg', root).forEach((e) => { e.style.strokeDashoffset = e.dataset.off; })));
  const pat = '<svg class="ch-pat" aria-hidden="true" viewBox="0 0 80 80"><g fill="none" stroke="currentColor" stroke-width="1"><path d="M40 4l9 21 22-9-9 22 21 9-21 9 9 22-22-9-9 21-9-21-22 9 9-22-21-9 21-9-9-22 22 9z"/><circle cx="40" cy="40" r="12"/></g></svg>';
  const bi = (a, e) => `<span class="ch-bi">${a}<small>${e}</small></span>`;

  function confetti() {
    const box = document.createElement('div');
    box.className = 'ch-confetti';
    const cols = ['#d8b45e', '#26996f', '#f6f1e6', '#b8913a', '#145a45'];
    box.innerHTML = Array.from({ length: 36 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-delay:${Math.random() * 0.5}s;animation-duration:${1.6 + Math.random() * 1.4}s;transform:rotate(${Math.random() * 360}deg)"></i>`).join('');
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3600);
  }

  // ---------- لوحة التحدي ----------
  function renderHome() {
    S = load();
    const c = cur();
    if (!c) return renderIntro();
    N.setTitle('تحدي ٣٠ يوم');
    const t = todayDay(c);
    const fin = finished(c);
    const pc = Math.round((fin.length / 30) * 100);
    const sk = streaks(c); const T = totals(c);
    const missed = missedDays(c);
    const paused = c.status === 'paused';
    const done30 = c.status === 'completed';
    const st = stageOf(t);
    const dd = DAYS[t - 1];
    N.view.innerHTML = `
      <div class="ch-hero">${pat}
        <div class="ch-hero-t">رحلتك إلى الالتزام تبدأ اليوم</div>
        <div class="ch-hero-s">30 يوماً تقرّبك من الله وتساعدك على بناء عادات تدوم.</div>
        <div class="ch-hero-en">Your journey to commitment begins today</div>
      </div>
      ${paused ? `<div class="card ch-note"><b>⏸️ التحدي متوقف مؤقتاً</b><p>تقدّمك محفوظ كما هو. اضغط استئناف حين تكون جاهزاً، وسيكمل من حيث توقفت.</p><button class="btn block" id="chResume">▶ استئناف التحدي</button></div>` : ''}
      ${!paused && missed.length && c.ack < calDay(c) && !done30 ? missedCard(c, missed) : ''}
      <div class="card ch-dash">
        <div class="ch-ringwrap">${ring(pc)}<div class="ch-ringtxt"><b>${ar(pc)}٪</b><small>${done30 ? 'اكتمل' : `اليوم ${ar(t)} من ${ar(30)}`}</small></div></div>
        <div class="ch-stats">
          <div><b>${ar(sk.cur)}</b><small>🔥 أيام متتالية</small></div>
          <div><b>${ar(T.tasks)}</b><small>✅ مهام منجزة</small></div>
          <div><b>${ar(Math.max(0, 30 - fin.length))}</b><small>⏳ أيام متبقية</small></div>
        </div>
      </div>
      ${done30 ? `<button class="card ch-today" data-go="ch30end"><div><small>🏆</small><br><b>الحمد لله، أتممت الرحلة</b><br><small>اضغط لعرض تقرير رحلتك وخطتك القادمة</small></div><span class="btn">التقرير ‹</span></button>`
        : `<button class="card ch-today" data-go="ch30d/${t}"><div><small>${stageOf(t).t} · اليوم ${ar(t)}</small><br><b>${dd ? dd.t : ''}</b><br><small>${ar(dayStat(c, t).done)}/${ar(dayStat(c, t).total)} مهام اليوم${c.log[t] && c.log[t].fin ? ' · ✅ أنهيت اليوم' : ''}</small></div><span class="btn">${c.log[t] && c.log[t].fin ? 'مراجعة' : 'ابدأ اليوم'} ‹</span></button>`}
      <div class="ch-stage"><b>المرحلة ${ar(st.n)}: ${st.t}</b> <small>${st.e}</small><p>${st.d}</p></div>
      <div class="section-title">خريطة الرحلة · Journey map</div>
      <div class="ch-map">${STAGES.map((s) => `<div class="ch-stg"><div class="ch-stg-h"><b>${s.t}</b><small>الأيام ${ar(s.a)}–${ar(s.b)}</small></div><div class="ch-days">${Array.from({ length: s.b - s.a + 1 }, (_, i) => {
        const d = s.a + i; const f = c.log[d] && c.log[d].fin; const open = d <= calDay(c) || f;
        const cls = ['ch-day', f ? 'fin' : '', d === t && !done30 ? 'now' : '', !open ? 'lock' : '', open && !f && d < calDay(c) ? 'miss' : ''].join(' ');
        return `<button class="${cls}" data-d="${d}" ${open ? '' : 'aria-disabled="true"'}><span>${ar(d)}</span>${f ? '<i>✓</i>' : !open ? '<i>🔒</i>' : ''}</button>`;
      }).join('')}</div></div>`).join('')}</div>
      <div class="ch-legend"><span><i class="ch-day fin"></i> أُنهي</span><span><i class="ch-day now"></i> اليوم</span><span><i class="ch-day miss"></i> متاح للتعويض</span><span><i class="ch-day lock"></i> قادم</span></div>
      <div class="section-title">أوسمتك · Badges</div>
      <div class="ch-badges">${BADGES.map((b) => { const got = fin.length >= b.n; return `<div class="ch-badge ${got ? 'got' : ''}"><span>${got ? b.ic : '🔒'}</span><b>${b.t}</b><small>${b.e}</small><small>${got ? 'حصلت عليه' : `بعد ${ar(b.n)} ${b.n === 1 ? 'يوم' : 'أيام'}`}</small></div>`; }).join('')}</div>
      <div class="ch-actions">
        <button class="btn ghost" data-go="ch30s">📊 الإحصاءات</button>
        <button class="btn ghost" data-go="ch30n">⚙️ الإعدادات</button>
        <button class="btn ghost" data-go="ch30h">🗂️ السجل</button>
      </div>`;
    wire(c);
    animRings(N.view);
  }
  function missedCard(c, missed) {
    const first = missed[0]; const t = todayDay(c);
    return `<div class="card ch-note"><b>🤍 أهلاً بعودتك</b>
      <p>${missed.length === 1 ? 'فاتك يوم واحد' : missed.length === 2 ? 'فاتك يومان' : `فاتتك ${ar(missed.length)} ${missed.length <= 10 ? 'أيام' : 'يوماً'}`} من الرحلة، ولا بأس بذلك. تقدّمك كله محفوظ ولم يُعاد شيء من البداية. ${ENC[0]}</p>
      <button class="btn block" id="chRebase" style="margin-bottom:8px">↩ أعد اليوم ${ar(first)} (نكمل من حيث توقفت)</button>
      <button class="btn ghost block" id="chSkip">➡ تابع من اليوم ${ar(t)} (تبقى الأيام الفائتة متاحة للتعويض)</button></div>`;
  }
  function wire(c) {
    $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); });
    $$('.ch-day[data-d]', N.view).forEach((b) => { b.onclick = () => { if (b.getAttribute('aria-disabled')) { toast('هذا اليوم يفتح في موعده، بإذن الله'); return; } go(`ch30d/${b.dataset.d}`); }; });
    const r = $('#chRebase'); if (r) r.onclick = () => { const m = missedDays(c)[0]; c.start = addDays(today(), -(m - 1)); c.ack = 0; save(); toast('تمام، نكمل من اليوم ' + ar(m)); renderHome(); };
    const k = $('#chSkip'); if (k) k.onclick = () => { c.ack = calDay(c); save(); toast('بارك الله فيك، نكمل بإذن الله'); renderHome(); };
    const rs = $('#chResume'); if (rs) rs.onclick = () => { const gap = dnum(today()) - dnum(c.pausedAt || today()); c.start = addDays(c.start, gap); c.status = 'active'; c.pausedAt = null; c.last = today(); save(); reschedule(); renderHome(); };
  }

  // ---------- شاشة البداية ----------
  function renderIntro() {
    N.setTitle('تحدي ٣٠ يوم');
    N.view.innerHTML = `
      <div class="ch-hero">${pat}<div class="ch-hero-t">رحلتك إلى الالتزام تبدأ اليوم</div><div class="ch-hero-s">30 يوماً تقرّبك من الله وتساعدك على بناء عادات تدوم.</div><div class="ch-hero-en">30-Day Islamic Commitment Challenge</div></div>
      <div class="card"><h3>🌙 رحلة روحية لا قائمة مهام</h3>
        <p class="muted" style="margin:0 0 10px">برنامج تدريجي في أربع مراحل: تبني فيه عادات الصلاة والقرآن والذكر والإحسان خطوة بخطوة. لكل يوم آية وحديث صحيح بمصدره ودرجته وسؤال للتأمل.</p>
        ${STAGES.map((s) => `<div class="ch-stg-line"><b>${ar(s.n)}. ${s.t}</b> <small>(${ar(s.a)}–${ar(s.b)})</small><br><small class="muted">${s.d}</small></div>`).join('')}
        <p class="muted" style="font-size:.82rem;margin:10px 0 0">أهدافك قابلة للتعديل بحسب طاقتك. لا تُجبَر على زيادة، ولن يُعاد التحدي من الصفر إن فاتك يوم.</p></div>
      <button class="btn block" id="chStart" style="font-size:1.05rem;padding:15px">ابدأ رحلتي الآن</button>
      <button class="btn ghost block" id="chImp" style="margin-top:10px">استعادة نسخة احتياطية</button>`;
    $('#chStart').onclick = () => { startChallenge(); go('ch30n/first'); };
    $('#chImp').onclick = importSheet;
  }

  // ---------- شاشة اليوم ----------
  function renderDay(arg) {
    S = load();
    const c = cur(); if (!c) { go('ch30'); return; }
    const d = Math.max(1, Math.min(30, +arg || todayDay(c)));
    if (d > calDay(c) && !(c.log[d] && c.log[d].fin)) { toast('هذا اليوم يفتح في موعده'); go('ch30'); return; }
    routes.ch30d.back = 'ch30';
    N.setTitle(`اليوم ${ar(d)}`);
    const dd = DAYS[d - 1]; const st = stageOf(d);
    const lg = L(c, d);
    const dateStr = fmtDay(lg.date || today());
    const draw = () => {
      const goals = goalsOf(c);
      const g = goals.map((id) => ({ id, done: isDone(c, d, id) }));
      const dn = g.filter((x) => x.done).length;
      const all = goals.length && dn === goals.length;
      const core = goals.filter((id) => HB[id] && HB[id].core);
      const opt = goals.filter((id) => !(HB[id] && HB[id].core));
      N.view.innerHTML = `
        <div class="ch-dayhead">${pat}<div><small>${dateStr}</small><div class="ch-dayno">اليوم ${ar(d)} <small>من 30</small></div><div class="ch-theme">${dd.t}</div><small class="ch-en">${dd.te} · ${st.e}</small></div>
          <div class="ch-ringwrap sm">${ring(goals.length ? (dn / goals.length) * 100 : 0, 84, 8)}<div class="ch-ringtxt"><b>${ar(dn)}/${ar(goals.length)}</b></div></div></div>
        <div class="card ch-verse"><small class="muted">📖 آية اليوم</small>
          <div class="ch-ayah">﴿${dd.q.t}﴾</div><div class="ch-ref">سورة ${dd.q.r.replace(' :', '، الآية').replace(' :', '')}</div></div>
        <div class="card ch-hadith"><small class="muted">📜 حديث اليوم</small>
          <div class="ch-htxt">«${dd.h.t}»</div><div class="ch-ref">${dd.h.s}</div><div class="ch-grade">الدرجة: ${dd.h.g}</div></div>
        <div class="section-title">مهام اليوم · Today's habits</div>
        <div class="card ch-tasks">${core.map((id) => taskRow(c, d, id, dd)).join('') || '<p class="muted">لا توجد عادات أساسية مفعّلة.</p>'}</div>
        ${opt.length ? `<div class="section-title">عادات اختيارية <small class="muted">(تطوع، لا تُلزِم نفسك بما لا تطيق)</small></div><div class="card ch-tasks">${opt.map((id) => taskRow(c, d, id, dd)).join('')}</div>` : ''}
        <button class="btn ghost block" id="chEdit" style="margin-bottom:12px">✏️ تعديل أهدافي واختيار العادات</button>
        <div class="card"><h3>💭 سؤال للتأمل</h3><p style="margin:0 0 8px">${dd.r}</p><textarea id="chNote" class="search ch-note-in" rows="3" placeholder="اكتب خاطرتك هنا (تُحفظ تلقائياً على جهازك)">${esc(lg.note || '')}</textarea></div>
        ${lg.fin ? `<div class="card ch-fin"><b>✅ أنهيت تحدي هذا اليوم</b><p class="muted" style="margin:4px 0 0">بارك الله فيك. يمكنك تعديل المهام وسيُحدَّث تقدمك.</p></div>` : ''}
        <button class="btn block ch-finish ${all ? 'ready' : ''}" id="chFin" style="padding:15px;font-size:1.05rem">${lg.fin ? 'تحديث إنجاز اليوم' : all ? 'أنهيت تحدي اليوم' : `أنهيت تحدي اليوم (${ar(dn)}/${ar(goals.length)})`}</button>
        ${!all && !lg.fin ? '<p class="center muted" style="font-size:.8rem;margin:6px 0 0">يمكنك إنهاء اليوم بما تيسّر، فالمداومة على القليل خير من الانقطاع.</p>' : ''}
        <div class="ch-nav"><button class="btn ghost" id="chPrev" ${d <= 1 ? 'disabled' : ''}>› اليوم السابق</button><button class="btn ghost" id="chNext" ${d >= 30 || d + 1 > calDay(c) ? 'disabled' : ''}>اليوم التالي ‹</button></div>`;
      animRings(N.view);
      bindDay(c, d, draw, all, dn, goals.length);
    };
    draw();
  }
  function taskRow(c, d, id, dd) {
    const h = HB[id]; const cust = !h;
    const a = cust ? c.cfg.custom.find((x) => x.id === id).a : h.a;
    const en = cust ? '' : h.e;
    const done = isDone(c, d, id);
    const v = val(c, d, id); const tg = target(c, id);
    let ctl = '';
    if (!cust && h.type === 'prayers') {
      const t = trk()[(c.log[d] && c.log[d].date) || today()] || {};
      ctl = `<div class="ch-pray">${P5().map((p) => `<button class="${t[p.key] ? 'on' : ''}" data-pr="${p.key}">${p.name}</button>`).join('')}</div>`;
    } else if (!cust && h.type === 'count') {
      ctl = `<div class="ch-count"><button data-c="${id}" data-n="-${h.step}" aria-label="إنقاص">−</button><span><b>${ar(v)}</b> / ${ar(tg)} ${h.unit}</span><button data-c="${id}" data-n="${h.step}" aria-label="زيادة">+${ar(h.step)}</button>${h.step > 1 ? `<button data-c="${id}" data-n="1" class="sm">+${ar(1)}</button>` : ''}</div>`;
    }
    const focus = dd.f === id ? '<span class="ch-tag f">مقترح اليوم</span>' : '';
    const rule = cust ? '<span class="ch-tag">مخصّص</span>' : `<span class="ch-tag ${h.rule === 'فرض' ? 'fard' : h.rule.startsWith('ترك') ? 'fard' : ''}">${h.rule}</span>`;
    return `<div class="ch-task ${done ? 'done' : ''}" data-t="${id}">
      <button class="ch-chk" data-k="${id}" aria-label="${esc(a)}" ${!cust && h.type === 'prayers' ? 'disabled' : ''}>${done ? '✓' : ''}</button>
      <div class="ch-tbody"><div class="ch-tt">${esc(a)} ${rule} ${focus}</div>${en ? `<small class="muted">${en}</small>` : ''}${ctl}
        <details><summary>شرح مختصر</summary><p>${cust ? 'عادة أضفتها بنفسك.' : h.ex}${!cust && h.route ? ` <button class="ch-lnk" data-open="${h.route}">فتح القسم ‹</button>` : ''}</p></details></div></div>`;
  }
  function bindDay(c, d, draw, all, dn, total) {
    const lg = L(c, d);
    const touch = () => { lg.touched = today(); c.last = today(); save(); };
    $$('[data-k]', N.view).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.k; const h = HB[id];
      if (h && h.type === 'prayers') return;
      if (h && h.type === 'count') lg.done[id] = isDone(c, d, id) ? 0 : target(c, id);
      else lg.done[id] = lg.done[id] ? 0 : 1;
      touch(); const before = dn; draw(); if (!lg.fin) celebrateIfAll(c, d, before);
    }));
    $$('[data-c]', N.view).forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.c; const n = +b.dataset.n;
      lg.done[id] = Math.max(0, (lg.done[id] || 0) + n);
      touch(); const before = dn; draw(); if (!lg.fin) celebrateIfAll(c, d, before);
    }));
    $$('[data-pr]', N.view).forEach((b) => b.addEventListener('click', () => {
      const dt = lg.date || today(); const all5 = trk(); const t = all5[dt] || {};
      t[b.dataset.pr] = !t[b.dataset.pr]; all5[dt] = t; store.set('tracker', all5);
      touch(); const before = dn; draw(); if (!lg.fin) celebrateIfAll(c, d, before);
    }));
    $$('[data-open]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.open); });
    const note = $('#chNote'); if (note) note.oninput = () => { lg.note = note.value; save(); };
    $('#chEdit').onclick = () => go('ch30n');
    $('#chPrev').onclick = () => go(`ch30d/${d - 1}`);
    $('#chNext').onclick = () => go(`ch30d/${d + 1}`);
    $('#chFin').onclick = () => finishDay(c, d);
  }
  function celebrateIfAll(c, d, before) {
    const g = goalsOf(c); const n = g.filter((id) => isDone(c, d, id)).length;
    if (g.length && n === g.length && before !== g.length) { confetti(); toast('ما شاء الله! أكملت كل أهداف اليوم 🤍'); navigator.vibrate && navigator.vibrate(30); }
  }
  function finishDay(c, d) {
    const lg = L(c, d);
    const was = !!lg.fin;
    const goals = goalsOf(c);
    const by = {}; goals.forEach((id) => { by[id] = isDone(c, d, id); });
    lg.snap = { done: goals.filter((id) => by[id]).length, total: goals.length, by };
    lg.fin = lg.fin || today();
    c.last = today();
    const nfin = finished(c).length;
    const newBadges = BADGES.filter((b) => nfin >= b.n && !c.badges[b.n]);
    newBadges.forEach((b) => { c.badges[b.n] = today(); });
    if (d === 30 || nfin >= 30) { c.status = 'completed'; c.completedAt = today(); }
    save(); reschedule();
    if (lg.snap.done === lg.snap.total) confetti();
    if (c.status === 'completed' && !was) { setTimeout(() => go('ch30end'), 700); return; }
    if (newBadges.length) {
      const b = newBadges[newBadges.length - 1];
      const sh = N.sheet(`<div class="center ch-sheet"><div style="font-size:3rem">${b.ic}</div><h2 style="margin:6px 0">${b.t}</h2><p class="muted">${b.e}</p><p>حصلت على وسام جديد. استمر بخطوات صغيرة ثابتة.</p><button class="btn block" id="chOk">الحمد لله</button><button class="btn ghost block" id="chSh" style="margin-top:8px">📤 مشاركة</button></div>`);
      $('#chOk', sh.el).onclick = () => { sh.close(); go('ch30'); };
      $('#chSh', sh.el).onclick = () => N.shareText(`${b.ic} حصلت على وسام «${b.t}» في تحدي ٣٠ يوماً للالتزام مع تطبيق أثر`, { route: 'ch30' });
      return;
    }
    toast(was ? 'تم تحديث إنجاز اليوم' : 'تقبّل الله منك، أنهيت يومك 🤍');
    go('ch30');
  }

  // ---------- الإحصاءات ----------
  function renderStats() {
    S = load();
    const c = cur(); if (!c) { go('ch30'); return; }
    routes.ch30s.back = 'ch30';
    const fin = finished(c); const T = totals(c); const sk = streaks(c);
    const t = todayDay(c);
    const hasData = Object.keys(c.log).some((k) => Object.keys(c.log[k].done).length || c.log[k].fin);
    if (!hasData) { N.view.innerHTML = '<div class="card center muted" style="padding:34px 18px"><div style="font-size:2.4rem">📊</div><b>لا توجد بيانات بعد</b><p>ابدأ مهام اليوم الأول وستظهر إحصاءاتك هنا.</p><button class="btn" data-go="ch30d/1">ابدأ اليوم الأول</button></div>'; $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); }); return; }
    const pcts = Array.from({ length: 30 }, (_, i) => { const d = i + 1; const lg = c.log[d]; return lg && (lg.fin || Object.keys(lg.done).length) ? pctOf(dayStat(c, d)) : null; });
    const wk = [0, 1, 2, 3, 4].map((w) => { const days = Array.from({ length: 7 }, (_, i) => w * 7 + i + 1).filter((d) => d <= 30); const f = days.filter((d) => c.log[d] && c.log[d].fin).length; return { n: w + 1, f, tot: days.length }; });
    const last7 = Array.from({ length: 7 }, (_, i) => t - i).filter((d) => d >= 1);
    const wrate = Math.round((last7.filter((d) => c.log[d] && c.log[d].fin).length / Math.max(1, last7.length)) * 100);
    const R = habitRates(c);
    const best = R.filter((x) => x.rate >= 0.5).slice(0, 3);
    const grow = R.slice().reverse().filter((x) => x.rate < 1).slice(0, 2);
    const avg = pcts.filter((x) => x != null);
    N.view.innerHTML = `
      <div class="ch-kpis">
        <div><b>${ar(Math.round((fin.length / 30) * 100))}٪</b><small>إنجاز الرحلة</small></div>
        <div><b>${ar(avg.length ? Math.round(avg.reduce((a, b) => a + b, 0) / avg.length) : 0)}٪</b><small>متوسط إنجاز الأيام</small></div>
        <div><b>${ar(wrate)}٪</b><small>معدل آخر ٧ أيام</small></div>
        <div><b>${ar(sk.cur)}</b><small>🔥 التتابع الحالي</small></div>
        <div><b>${ar(sk.longest)}</b><small>🏅 أطول تتابع</small></div>
        <div><b>${ar(fin.length)}</b><small>أيام منتهية</small></div>
        <div><b>${ar(T.pages)}</b><small>📖 صفحات القرآن</small></div>
        <div><b>${ar(T.adhkar)}</b><small>📿 استغفار وصلاة على النبي</small></div>
        <div><b>${ar(T.sets)}</b><small>أوراد الأذكار</small></div>
        <div><b>${ar(T.prayers)}</b><small>🕌 صلوات مسجّلة</small></div>
        <div><b>${ar(T.deeds)}</b><small>💝 أعمال خير</small></div>
        <div><b>${ar(T.tasks)}</b><small>✅ مهام منجزة</small></div>
      </div>
      <div class="section-title">إنجاز كل يوم · Daily completion</div>
      <div class="card"><div class="ch-bars">${pcts.map((p, i) => `<div class="ch-bar" title="اليوم ${i + 1}"><i style="height:${p == null ? 3 : Math.max(4, p)}%" class="${p == null ? 'nil' : p >= 100 ? 'full' : ''}"></i><span>${(i + 1) % 5 === 0 || i === 0 ? ar(i + 1) : ''}</span></div>`).join('')}</div></div>
      <div class="section-title">الأسابيع · Weekly</div>
      <div class="card">${wk.map((w) => `<div class="ch-wk"><span>الأسبوع ${ar(w.n)}</span><div class="progress" style="margin:0;flex:1"><div style="width:${(w.f / w.tot) * 100}%"></div></div><b>${ar(w.f)}/${ar(w.tot)}</b></div>`).join('')}</div>
      <div class="section-title">الخريطة الحرارية · Calendar heatmap</div>
      <div class="card"><div class="ch-heat">${Array.from({ length: 30 }, (_, i) => { const p = pcts[i]; const lv = p == null ? 0 : p >= 100 ? 4 : p >= 70 ? 3 : p >= 40 ? 2 : 1; return `<div class="h${lv}" title="اليوم ${i + 1}: ${p == null ? 'لا بيانات' : p + '%'}">${ar(i + 1)}</div>`; }).join('')}</div>
        <div class="ch-legend" style="margin-top:10px"><span>أقل</span><i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i><span>أكثر</span></div></div>
      <div class="section-title">عاداتك</div>
      <div class="card">${R.length ? `<b>الأكثر التزاماً 💚</b><ul class="ch-ul">${best.map((x) => `<li>${esc(nameOf(c, x.id))} <small class="muted">${ar(Math.round(x.rate * 100))}٪</small></li>`).join('') || '<li class="muted">تظهر بعد إنهاء بعض الأيام.</li>'}</ul>
        ${grow.length ? `<b>فرص للنمو 🌱</b><ul class="ch-ul">${grow.map((x) => `<li>${esc(nameOf(c, x.id))} <small class="muted">${ar(Math.round(x.rate * 100))}٪ · خطوة صغيرة تكفي</small></li>`).join('')}</ul>` : ''}` : '<p class="muted" style="margin:0">تظهر عاداتك الأقوى بعد إنهاء أول يوم.</p>'}</div>
      <button class="btn ghost block" data-go="ch30">‹ العودة للوحة</button>`;
    $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); });
  }

  // ---------- الإعدادات والتخصيص والتذكيرات ----------
  function renderSettings(arg) {
    S = load();
    const c = cur(); if (!c) { go('ch30'); return; }
    routes.ch30n.back = 'ch30';
    const NP = nprefs();
    const first = arg === 'first';
    const NAT = N.NATIVE;
    const nrow = (k, t, en) => `<div class="ch-nrow"><label><input type="checkbox" data-n="${k}" ${NP[k].on ? 'checked' : ''}> ${t}<br><small class="muted">${en}</small></label>${k === 'missed' ? '' : k === 'morning' ? `<select data-nt="${k}"><option value="fajr" ${NP[k].t === 'fajr' ? 'selected' : ''}>عند الفجر</option><option value="custom" ${NP[k].t !== 'fajr' ? 'selected' : ''}>وقت محدد</option></select><input type="time" data-ntt="${k}" value="${NP[k].t === 'fajr' ? '05:00' : NP[k].t}" ${NP[k].t === 'fajr' ? 'hidden' : ''}>` : `<input type="time" data-nt="${k}" value="${NP[k].t}">`}</div>`;
    N.view.innerHTML = `
      ${first ? '<div class="card ch-note"><b>🌿 خصّص رحلتك</b><p>اختر ما يناسب طاقتك. يمكنك تغيير أي شيء لاحقاً. الأفضل أن تبدأ بالقليل الذي تداوم عليه.</p></div>' : ''}
      <div class="section-title">أهدافك اليومية</div>
      <div class="card">
        ${H.map((h) => `<div class="ch-set"><label><input type="checkbox" data-h="${h.id}" ${c.cfg.on[h.id] ? 'checked' : ''} ${h.locked ? 'disabled' : ''}> ${h.a} <span class="ch-tag ${h.rule === 'فرض' || h.rule.startsWith('ترك') ? 'fard' : ''}">${h.rule}</span><br><small class="muted">${h.e}${h.locked ? ' · هدف ثابت' : ''}</small></label>
          ${h.cfg ? `<div class="ch-num"><button data-cfg="${h.cfg}" data-n="-${h.step}">−</button><b id="cv-${h.cfg}">${ar(c.cfg[h.cfg])}</b><button data-cfg="${h.cfg}" data-n="${h.step}">+</button></div>` : ''}</div>`).join('')}
        <small class="muted">الاستغفار والصلاة على النبي والقرآن أعداد تنظيمية لتساعدك على المداومة، وليست تحديداً شرعياً. غيّرها كما يناسبك.</small>
      </div>
      <div class="section-title">عاداتي الخاصة</div>
      <div class="card"><div id="chCust">${c.cfg.custom.map((x) => `<div class="ch-set"><label><input type="checkbox" data-cx="${x.id}" ${x.on !== false ? 'checked' : ''}> ${esc(x.a)}</label><button class="ch-del" data-del="${x.id}" aria-label="حذف">🗑️</button></div>`).join('') || '<p class="muted" style="margin:0 0 8px">لم تضف عادات خاصة بعد.</p>'}</div>
        <div style="display:flex;gap:8px;margin-top:8px"><input class="search" id="chAdd" placeholder="مثال: قراءة أذكار بعد الصلاة" maxlength="60" style="margin:0"><button class="btn" id="chAddB">إضافة</button></div></div>
      <div class="section-title">التذكيرات ${NAT ? '' : '<small class="muted">(تعمل في تطبيق أندرويد)</small>'}</div>
      <div class="card">
        ${nrow('morning', '🌅 الفجر وأذكار الصباح', 'Fajr & morning adhkar')}
        ${nrow('quran', '📖 قراءة القرآن', 'Quran reading')}
        ${nrow('evening', '🌇 أذكار المساء', 'Evening adhkar')}
        ${nrow('night', '🌙 قيام الليل', 'Night prayer')}
        ${nrow('daily', '🗓️ تذكير بتحدي اليوم', 'Daily challenge reminder')}
        ${nrow('missed', '🤍 رسالة تشجيع إن غبت يوماً', 'Gentle encouragement if you miss a day')}
        <small class="muted">كل التذكيرات لطيفة وتشجيعية، ولا تحمل أي لوم.</small>
      </div>
      <div class="section-title">إدارة التحدي</div>
      <div class="card">
        ${c.status === 'active' ? '<button class="btn ghost block" id="chPause" style="margin-bottom:8px">⏸️ إيقاف مؤقت للتحدي</button>' : ''}
        <button class="btn ghost block" id="chNew" style="margin-bottom:8px">➕ بدء تحدٍّ جديد</button>
        <button class="btn ghost block" id="chExp" style="margin-bottom:8px">💾 نسخة احتياطية (نقل لجهاز آخر)</button>
        <button class="btn ghost block" id="chImp">📥 استعادة من نسخة احتياطية</button>
      </div>
      <button class="btn block" id="chDone">${first ? 'ابدأ اليوم الأول' : 'تم'}</button>`;
    const sv = () => { save(); };
    $$('[data-h]', N.view).forEach((i) => { i.onchange = () => { c.cfg.on[i.dataset.h] = i.checked; sv(); }; });
    $$('[data-cfg]', N.view).forEach((b) => { b.onclick = () => { const k = b.dataset.cfg; const mx = k === 'pages' ? 60 : 1000; c.cfg[k] = Math.max(k === 'pages' ? 1 : 10, Math.min(mx, c.cfg[k] + +b.dataset.n)); $(`#cv-${k}`).textContent = ar(c.cfg[k]); sv(); }; });
    $$('[data-cx]', N.view).forEach((i) => { i.onchange = () => { const x = c.cfg.custom.find((y) => y.id === i.dataset.cx); if (x) x.on = i.checked; sv(); }; });
    $$('[data-del]', N.view).forEach((b) => { b.onclick = () => { c.cfg.custom = c.cfg.custom.filter((x) => x.id !== b.dataset.del); sv(); renderSettings(arg); }; });
    $('#chAddB').onclick = () => { const v = $('#chAdd').value.trim(); if (!v) { toast('اكتب اسم العادة أولاً'); return; } if (c.cfg.custom.length >= 8) { toast('الحد الأقصى ٨ عادات خاصة'); return; } c.cfg.custom.push({ id: 'x' + Date.now().toString(36), a: v.slice(0, 60), on: true }); sv(); renderSettings(arg); };
    const np = (fn) => { fn(NP); store.set(NKEY, NP); reschedule(true); };
    $$('[data-n]', N.view).forEach((i) => { if (i.type === 'checkbox') i.onchange = () => np((p) => { p[i.dataset.n].on = i.checked; }); });
    $$('input[type=time][data-nt]', N.view).forEach((i) => { i.onchange = () => np((p) => { p[i.dataset.nt].t = i.value || '09:00'; }); });
    $$('select[data-nt]', N.view).forEach((s) => { s.onchange = () => { const tt = $(`[data-ntt="${s.dataset.nt}"]`); tt.hidden = s.value === 'fajr'; np((p) => { p[s.dataset.nt].t = s.value === 'fajr' ? 'fajr' : tt.value || '05:00'; }); }; });
    $$('input[data-ntt]', N.view).forEach((i) => { i.onchange = () => np((p) => { p[i.dataset.ntt].t = i.value || '05:00'; }); });
    const ps = $('#chPause'); if (ps) ps.onclick = () => { c.status = 'paused'; c.pausedAt = today(); sv(); reschedule(); toast('تم الإيقاف المؤقت، تقدمك محفوظ'); go('ch30'); };
    $('#chNew').onclick = () => { const sh = N.sheet('<div class="ch-sheet"><h3 style="margin-top:0">بدء تحدٍّ جديد؟</h3><p class="muted">يبقى تحدّيك الحالي محفوظاً في السجل ولن يُحذف منه شيء. سيبدأ التحدي الجديد من اليوم الأول بنفس أهدافك.</p><button class="btn block" id="y">نعم، ابدأ تحدياً جديداً</button><button class="btn ghost block" id="n" style="margin-top:8px">إلغاء</button></div>'); $('#n', sh.el).onclick = sh.close; $('#y', sh.el).onclick = () => { const cf = c.cfg; if (c.status === 'active') { c.status = 'paused'; c.pausedAt = today(); } startChallenge(cf); sh.close(); go('ch30n/first'); }; };
    $('#chExp').onclick = exportSheet; $('#chImp').onclick = importSheet;
    $('#chDone').onclick = () => { reschedule(true); go(first ? `ch30d/${todayDay(c)}` : 'ch30'); };
  }

  // ---------- نسخة احتياطية ----------
  function exportSheet() {
    const code = btoa(unescape(encodeURIComponent(JSON.stringify({ s: S, n: nprefs(), t: store.get('tracker', {}) }))));
    const sh = N.sheet(`<div class="ch-sheet"><h3 style="margin-top:0">نسخة احتياطية</h3><p class="muted">انسخ هذا الرمز واحفظه. لاستعادته على جهاز آخر افتح التحدي واختر «استعادة من نسخة احتياطية».</p><textarea class="search" id="chCode" rows="5" readonly style="font-size:.7rem;direction:ltr">${code}</textarea><button class="btn block" id="cp" style="margin-top:8px">نسخ الرمز</button></div>`);
    $('#cp', sh.el).onclick = async () => { try { await navigator.clipboard.writeText(code); toast('تم النسخ'); } catch { $('#chCode', sh.el).select(); toast('حدد النص وانسخه'); } };
  }
  function importSheet() {
    const sh = N.sheet('<div class="ch-sheet"><h3 style="margin-top:0">استعادة نسخة احتياطية</h3><p class="muted">ألصق الرمز هنا. سيُستبدل تقدمك الحالي في التحدي بالنسخة المستعادة (متابعة الصلوات تُدمج دون حذف).</p><textarea class="search" id="chIn" rows="5" style="direction:ltr;font-size:.7rem"></textarea><button class="btn block" id="ok" style="margin-top:8px">استعادة</button></div>');
    $('#ok', sh.el).onclick = () => {
      try {
        const o = JSON.parse(decodeURIComponent(escape(atob($('#chIn', sh.el).value.trim()))));
        if (!o.s || o.s.v !== 1 || !Array.isArray(o.s.list)) throw new Error('bad');
        S = o.s; save(); if (o.n) store.set(NKEY, o.n);
        if (o.t) { const cur2 = store.get('tracker', {}); Object.keys(o.t).forEach((k) => { cur2[k] = Object.assign({}, o.t[k], cur2[k] || {}); }); store.set('tracker', cur2); }
        reschedule(); sh.close(); toast('تمت الاستعادة'); renderHome();
      } catch { toast('الرمز غير صالح، تأكد من نسخه كاملاً'); }
    };
  }

  // ---------- السجل ----------
  function renderHistory() {
    S = load();
    routes.ch30h.back = 'ch30';
    if (!S.list.length) { N.view.innerHTML = '<div class="card center muted" style="padding:30px">لا يوجد سجل بعد.</div>'; return; }
    const stl = { active: 'نشط', paused: 'متوقف مؤقتاً', completed: 'مكتمل ✅' };
    N.view.innerHTML = S.list.slice().reverse().map((c) => { const f = finished(c).length; return `<div class="card ch-hist"><div><b>${esc(c.name)}</b> <span class="ch-tag ${c.status === 'completed' ? 'fard' : ''}">${stl[c.status]}</span><br><small class="muted">بدأ في ${fmtDay(c.start)} · ${ar(f)} من ٣٠ يوماً · أطول تتابع ${ar(streaks(c).longest)}</small></div><div class="progress" style="margin:10px 0 0"><div style="width:${(f / 30) * 100}%"></div></div>${c.id !== S.active ? `<button class="btn ghost" data-sw="${c.id}" style="margin-top:10px">فتح هذا التحدي</button>` : '<small class="muted">التحدي المعروض حالياً</small>'}</div>`; }).join('');
    $$('[data-sw]', N.view).forEach((b) => { b.onclick = () => { const cc = cur(); if (cc && cc.status === 'active') { cc.status = 'paused'; cc.pausedAt = today(); } S.active = b.dataset.sw; const t = cur(); if (t.status === 'paused') { const gap = dnum(today()) - dnum(t.pausedAt || today()); t.start = addDays(t.start, gap); t.status = 'active'; t.pausedAt = null; } save(); reschedule(); go('ch30'); }; });
  }

  // ---------- شاشة اليوم الثلاثين ----------
  function renderEnd() {
    S = load();
    const c = cur(); if (!c) { go('ch30'); return; }
    routes.ch30end.back = 'ch30';
    if (c.status !== 'completed' && finished(c).length < 30) { go('ch30'); return; }
    const T = totals(c); const sk = streaks(c); const R = habitRates(c);
    const avg = (() => { const a = finished(c).map((d) => pctOf(dayStat(c, d))); return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0; })();
    const best = R.filter((x) => x.rate >= 0.5).slice(0, 3);
    const grow = R.slice().reverse().filter((x) => x.rate < 0.8).slice(0, 2);
    const keep = R.filter((x) => x.rate >= 0.8).map((x) => nameOf(c, x.id));
    const plan = [];
    if (keep.length) plan.push(`ثبّت ما نجحت فيه: ${keep.slice(0, 4).join('، ')}.`);
    grow.forEach((x) => plan.push(`ركّز على «${nameOf(c, x.id)}» بخطوة أصغر وأيسر من قبل، فالقليل الدائم خير.`));
    if (R.find((x) => x.id === 'quran' && x.rate >= 0.8)) plan.push(`إن رأيت في نفسك القدرة فجرّب زيادة وردك من القرآن صفحة واحدة، ولا تثقل على نفسك.`);
    else plan.push('حافظ على وردك من القرآن كما هو، واجعله في وقت ثابت من يومك.');
    if (!c.cfg.on.qiyam && !c.cfg.on.duha) plan.push('اختر نافلة واحدة تحبها (الضحى أو ركعتين من الليل) وابدأ بها إن شئت.');
    plan.push('اجعل لك يوماً في الأسبوع لمراجعة عاداتك وتجديد النية.');
    N.setTitle('أتممت الرحلة');
    N.view.innerHTML = `
      <div class="ch-hero gold">${pat}<div style="font-size:3rem">🏆</div><div class="ch-hero-t">الحمد لله، أتممت 30 يوماً من رحلتك!</div><div class="ch-hero-en">Alhamdulillah, you completed 30 days of your journey</div></div>
      <div class="card ch-dash"><div class="ch-ringwrap">${ring(100)}<div class="ch-ringtxt"><b>${ar(avg)}٪</b><small>متوسط إنجاز الأيام</small></div></div>
        <div class="ch-stats"><div><b>${ar(finished(c).length)}</b><small>أيام منتهية</small></div><div><b>${ar(sk.longest)}</b><small>أطول تتابع</small></div><div><b>${ar(T.tasks)}</b><small>مهمة منجزة</small></div></div></div>
      <div class="section-title">إنجازاتك</div>
      <div class="ch-kpis"><div><b>${ar(T.pages)}</b><small>📖 صفحات القرآن</small></div><div><b>${ar(T.adhkar)}</b><small>📿 استغفار وصلاة على النبي</small></div><div><b>${ar(T.prayers)}</b><small>🕌 صلوات مسجّلة</small></div><div><b>${ar(T.deeds)}</b><small>💝 أعمال خير</small></div></div>
      <div class="ch-badges" style="margin-top:12px">${BADGES.map((b) => `<div class="ch-badge got"><span>${b.ic}</span><b>${b.t}</b><small>${b.e}</small></div>`).join('')}</div>
      <div class="card"><h3>💚 أقوى عاداتك</h3><ul class="ch-ul">${best.map((x) => `<li>${esc(nameOf(c, x.id))} <small class="muted">${ar(Math.round(x.rate * 100))}٪</small></li>`).join('') || '<li class="muted">لا بيانات كافية.</li>'}</ul></div>
      ${grow.length ? `<div class="card"><h3>🌱 فرص للنمو</h3><ul class="ch-ul">${grow.map((x) => `<li>${esc(nameOf(c, x.id))}</li>`).join('')}</ul></div>` : ''}
      <div class="card"><h3>🗺️ خطتك المقترحة للثلاثين يوماً القادمة</h3><ul class="ch-ul">${plan.map((p) => `<li>${p}</li>`).join('')}</ul><small class="muted">هذه اقتراحات تنظيمية مبنية على أرقامك فقط، وليست فتوى ولا حكماً شرعياً.</small></div>
      <button class="btn block" id="chAgain" style="padding:15px">ابدأ تحدياً جديداً بنفس أهدافك</button>
      <button class="btn ghost block" id="chShare" style="margin-top:10px">📤 مشاركة إنجازي</button>
      <button class="btn ghost block" data-go="ch30s" style="margin-top:10px">📊 كل الإحصاءات</button>`;
    animRings(N.view);
    $('#chAgain').onclick = () => { startChallenge(c.cfg); go('ch30n/first'); };
    $('#chShare').onclick = () => N.shareText(`🏆 الحمد لله، أتممت تحدي ٣٠ يوماً للالتزام مع تطبيق أثر`, { route: 'ch30' });
    $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); });
    confetti();
  }

  // ---------- التذكيرات ----------
  const IDS = { morning: 4001, quran: 4002, evening: 4003, night: 4004, daily: 4005 };
  const MISSED = [4090, 4091];
  async function reschedule(ask) {
    const LN = N.NATIVE && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
    if (!LN) return;
    try {
      await LN.cancel({ notifications: Object.values(IDS).concat(MISSED).map((id) => ({ id })) });
      const c = cur();
      if (!c || c.status !== 'active') return;
      const NP = nprefs();
      const any = Object.keys(IDS).some((k) => NP[k].on) || NP.missed.on;
      if (!any) return;
      let perm = await LN.checkPermissions();
      if (perm.display !== 'granted' && ask) perm = await LN.requestPermissions();
      if (perm.display !== 'granted') return;
      await LN.createChannel({ id: 'ch30', name: 'تحدي ٣٠ يوماً', description: 'تذكيرات لطيفة لتحدي الالتزام', importance: 3, visibility: 1 });
      const T = { morning: ['🌅 صباح الخير', 'وقت الفجر وأذكار الصباح. ابدأ يومك بذكر الله.'], quran: ['📖 وردك من القرآن', 'صفحات قليلة تنير يومك. افتح التحدي وتابع.'], evening: ['🌇 أذكار المساء', 'حان وقت أذكار المساء. تقبّل الله منك.'], night: ['🌙 قيام الليل', 'ركعتان في جوف الليل تكفي إن تيسّرت.'], daily: ['🤍 تحدي اليوم', 'لم تنهِ تحدي اليوم بعد. خطوة صغيرة تكفي.'] };
      const list = [];
      const now = new Date();
      Object.keys(IDS).forEach((k) => {
        if (!NP[k].on) return;
        let hh, mm;
        if (NP[k].t === 'fajr') { try { const f = N.timesFor(new Date()).fajr; const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: N.tz() }).format(f).split(':'); hh = +parts[0]; mm = +parts[1]; } catch { hh = 5; mm = 0; } } else { [hh, mm] = NP[k].t.split(':').map(Number); }
        list.push({ id: IDS[k], title: T[k][0], body: T[k][1], channelId: 'ch30', extra: { route: 'ch30' }, schedule: { on: { hour: hh, minute: mm }, allowWhileIdle: true } });
      });
      if (NP.missed.on) {
        [2, 4].forEach((n, i) => {
          const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n, 10, 0);
          list.push({ id: MISSED[i], title: '🤍 رحلتك تنتظرك', body: ENC[i % ENC.length], channelId: 'ch30', extra: { route: 'ch30' }, schedule: { at, allowWhileIdle: true }, autoCancel: true });
        });
      }
      if (list.length) await LN.schedule({ notifications: list });
    } catch (e) { console.warn('ch30 notif', e); }
  }

  // ---------- ربط المسارات والرئيسية ----------
  Object.assign(routes, {
    ch30: { title: 'تحدي ٣٠ يوم', render: renderHome, back: 'home' },
    ch30d: { title: 'اليوم', render: renderDay, back: 'ch30' },
    ch30s: { title: 'إحصاءات التحدي', render: renderStats, back: 'ch30' },
    ch30n: { title: 'إعدادات التحدي', render: renderSettings, back: 'ch30' },
    ch30h: { title: 'سجل التحديات', render: renderHistory, back: 'ch30' },
    ch30end: { title: 'أتممت الرحلة', render: renderEnd, back: 'ch30' },
  });
  N.homeExtras.push((root) => {
    const S2 = load(); const c = S2.list.find((x) => x.id === S2.active);
    const d = document.createElement('div');
    if (!c) {
      d.innerHTML = '<button class="card continue ch-home"><div style="min-width:0"><small class="muted">🌙 رحلة جديدة</small><br><b>تحدي ٣٠ يوماً للالتزام</b><br><small class="muted">عادات تدوم بإذن الله، خطوة كل يوم</small></div><span class="btn">ابدأ ‹</span></button>';
    } else {
      const f = finished(c).length; const t = todayDay(c); const ts = c.log[t] && c.log[t].fin;
      d.innerHTML = `<button class="card continue ch-home"><div style="min-width:0"><small class="muted">🌙 تحدي ٣٠ يوماً</small><br><b>${c.status === 'completed' ? 'أتممت الرحلة 🏆' : c.status === 'paused' ? 'متوقف مؤقتاً' : `اليوم ${ar(t)} من ٣٠${ts ? ' · أنهيته ✅' : ''}`}</b><div class="progress" style="margin:8px 0 0"><div style="width:${(f / 30) * 100}%"></div></div></div><span class="btn">متابعة ‹</span></button>`;
    }
    $('button', d).onclick = () => go('ch30');
    root.appendChild(d);
  });
  if (N.NATIVE) setTimeout(() => reschedule(false), 4000);
});
