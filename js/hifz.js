/* برنامج حفظ القرآن الكريم: الخطة اليومية، المراجعة المتباعدة، الاختبار بالإخفاء، الاستماع والترديد،
 * تقسيم الأجزاء والأحزاب والأرباع، الإحصائيات، تذكير يومي بالحفظ */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, arG, esc, routes } = N;
  const TOTAL = 6236;
  const INTERVALS = [1, 2, 4, 7, 15, 30, 60]; // أيام المراجعة المتباعدة
  const DAY = 86400000;

  // ---------- البيانات الوصفية للمصحف (من alquran.cloud) ----------
  let META = store.get('qmeta:v1');
  async function loadMeta() {
    if (META) return META;
    const res = await fetch(`${N.API}/meta`);
    if (!res.ok) throw new Error(res.status);
    const d = (await res.json()).data;
    const counts = d.surahs.references.map((s) => s.numberOfAyahs);
    const off = [0]; counts.forEach((c, i) => { off[i + 1] = off[i] + c; });
    const g = (r) => off[r.surah - 1] + r.ayah;
    META = { counts, off, pages: d.pages.references.map(g), rubs: d.hizbQuarters.references.map(g), juzs: d.juzs.references.map(g) };
    store.set('qmeta:v1', META);
    return META;
  }
  const gOf = (s, a) => META.off[s - 1] + a;
  const saOf = (g) => { let s = 1; while (s < 114 && META.off[s] < g) s++; return [s, g - META.off[s - 1]]; };
  const idxIn = (starts, g) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= g) lo = m; else hi = m - 1; } return lo; };
  const pageOf = (g) => idxIn(META.pages, g) + 1;
  const rangeOf = (starts, i) => [starts[i], i + 1 < starts.length ? starts[i + 1] - 1 : TOTAL];

  // ---------- حالة الحفظ: لكل آية 0 لم تُحفظ، 1 محفوظة، 2 متقنة ----------
  let ST = store.get('hifz:st', '');
  if (ST.length !== TOTAL) ST = '0'.repeat(TOTAL);
  const st = (g) => +ST[g - 1];
  function setSt(list, v) {
    const a = ST.split('');
    list.forEach((g) => { a[g - 1] = String(v); });
    ST = a.join(''); store.set('hifz:st', ST);
    list.forEach((g) => { if (v > 0) schedule(pageOf(g)); });
  }
  const countIn = (from, to, min = 1) => { let n = 0; for (let g = from; g <= to; g++) if (st(g) >= min) n++; return n; };
  const plan = () => Object.assign({ unit: 'ayat', amount: 5, dir: 'end', time: '', reps: 3 }, store.get('hifz:plan', {}));
  const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / DAY);
  const rev = () => store.get('hifz:rev', {});
  function schedule(p) { const r = rev(); if (!r[p]) { r[p] = { due: today() + 1, step: 0 }; store.set('hifz:rev', r); } }
  const dueToday = () => Object.entries(rev()).filter(([, v]) => v.due <= today()).map(([p]) => +p).sort((a, b) => a - b);
  function logAct(kind, n) { const L = store.get('hifz:log', {}); const k = today(); L[k] = L[k] || { n: 0, r: 0 }; L[k][kind] += n; store.set('hifz:log', L); }

  // الآيات الجديدة لليوم حسب الخطة
  function newToday() {
    const P = plan();
    if (P.unit === 'pages' && P.amount < 1) { P.unit = 'ayat'; P.amount = 8; } // نصف صفحة ≈ ٨ آيات
    const order = [];
    if (P.dir === 'end') { for (let s = 114; s >= 1; s--) for (let a = 1; a <= META.counts[s - 1]; a++) order.push(gOf(s, a)); }
    else for (let g = 1; g <= TOTAL; g++) order.push(g);
    const out = [];
    if (P.unit === 'ayat') {
      for (const g of order) { if (!st(g)) out.push(g); if (out.length >= P.amount) break; }
    } else {
      const pages = [];
      for (const g of order) { if (!st(g)) { const p = pageOf(g); if (!pages.includes(p)) pages.push(p); if (pages.length >= P.amount) break; } }
      pages.forEach((p) => { const [a, b] = rangeOf(META.pages, p - 1); for (let g = a; g <= b; g++) if (!st(g)) out.push(g); });
      out.sort((x, y) => x - y);
    }
    return out;
  }

  // نصوص الآيات (من نفس ذاكرة صفحة السورة)
  async function texts(list) {
    const bySurah = {};
    list.forEach((g) => { const [s, a] = saOf(g); (bySurah[s] = bySurah[s] || []).push([g, a]); });
    const out = {};
    for (const s of Object.keys(bySurah)) {
      const d = await N.fetchJSON(`${N.API}/surah/${s}/quran-uthmani`, `surah:${s}`);
      bySurah[s].forEach(([g, a]) => {
        let t = d.ayahs[a - 1].text;
        if (a === 1 && +s !== 1 && +s !== 9 && /^بِسْمِ|^بِسۡمِ/.test(t)) t = t.split(' ').slice(4).join(' ');
        out[g] = { s: +s, a, t };
      });
    }
    return out;
  }
  const pct = (x) => `${ar((x * 100).toFixed(x > 0 && x < 0.01 ? 2 : 1))}٪`;

  // ---------- الصفحة الرئيسية للحفظ ----------
  function renderHifz() {
    N.view.innerHTML = '<div class="loader"></div>';
    let alive = true;
    loadMeta().then(() => {
      if (!alive) return;
      const P = plan();
      const mem = countIn(1, TOTAL), mast = countIn(1, TOTAL, 2);
      const pagesDone = META.pages.filter((_, i) => { const [a, b] = rangeOf(META.pages, i); return countIn(a, b) === b - a + 1; }).length;
      const nt = newToday(); const due = dueToday();
      const L = store.get('hifz:log', {}); const t0 = today();
      const week = Array.from({ length: 7 }, (_, i) => { const k = t0 - 6 + i; return { k, ...(L[k] || { n: 0, r: 0 }) }; });
      const month = Array.from({ length: 30 }, (_, i) => L[t0 - 29 + i] || { n: 0, r: 0 });
      const mN = month.reduce((s, x) => s + x.n, 0), mR = month.reduce((s, x) => s + x.r, 0);
      const maxW = Math.max(1, ...week.map((x) => x.n + x.r));
      const doneToday = (L[t0] || { n: 0 }).n > 0;
      const fmtRange = (list) => { if (!list.length) return ''; const [s1, a1] = saOf(list[0]); const [s2, a2] = saOf(list[list.length - 1]); return s1 === s2 ? `سورة ${SURAH_NAMES[s1 - 1]}: ${ar(a1)}${a2 !== a1 ? ` - ${ar(a2)}` : ''}` : `من ${SURAH_NAMES[s1 - 1]} ${ar(a1)} إلى ${SURAH_NAMES[s2 - 1]} ${ar(a2)}`; };
      N.view.innerHTML = `
        <section class="hero">
          <div class="next-label">تقدّمك في حفظ القرآن الكريم</div>
          <div class="next-name">${arG(mem)} ${mem >= 3 && mem <= 10 ? 'آيات' : 'آية'} <small style="font-size:1rem;opacity:.85">من ${arG(TOTAL)}</small></div>
          <div class="progress on-dark"><div style="width:${(mem / TOTAL) * 100}%"></div></div>
          <div class="loc">${pct(mem / TOTAL)} • ${arG(pagesDone)} صفحة كاملة • ${arG(mast)} آية متقنة</div>
        </section>
        <div class="section-title">مهام اليوم</div>
        <div class="card hifz-task">
          <div><b>📖 الحفظ الجديد</b><p class="muted">${nt.length ? `${fmtRange(nt)} • ${arG(nt.length)} ${nt.length >= 3 && nt.length <= 10 ? 'آيات' : 'آية'}` : 'ما شاء الله! أتممت حفظ القرآن الكريم'}${doneToday ? ' • ✅ أنجزت حفظ اليوم' : ''}</p></div>
          ${nt.length ? '<button class="btn" data-go="hifzs/new">ابدأ</button>' : ''}
        </div>
        <div class="card hifz-task">
          <div><b>🔁 المراجعة</b><p class="muted">${due.length ? `${arG(due.length)} صفحة مستحقة للمراجعة اليوم` : mem ? 'لا مراجعة مستحقة اليوم' : 'تبدأ المراجعة بعد أول حفظ'}</p></div>
          ${due.length ? '<button class="btn" data-go="hifzs/rev">ابدأ</button>' : ''}
        </div>
        <div class="grid" style="grid-template-columns:repeat(3,1fr);margin:14px 0">
          <button class="tile" data-go="hifzp"><span class="ic">🗂️</span>الأجزاء والأحزاب</button>
          <button class="tile" data-go="hifzplan"><span class="ic">⚙️</span>خطة الحفظ</button>
          <button class="tile" data-go="repeat"><span class="ic">🔁</span>التكرار الصوتي</button>
        </div>
        <div class="section-title">إحصائيات الأسبوع</div>
        <div class="card">
          <div class="bars">${week.map((x) => `<div class="bar-col"><div class="bar"><span class="b-rev" style="height:${(x.r / maxW) * 100}%"></span><span class="b-new" style="height:${(x.n / maxW) * 100}%"></span></div><small>${new Date(x.k * DAY).toLocaleDateString('ar-EG', { weekday: 'short', timeZone: 'UTC' })}</small></div>`).join('')}</div>
          <div class="legend"><span><i class="lg new"></i>حفظ جديد (آيات)</span><span><i class="lg rev"></i>مراجعة (صفحات)</span></div>
        </div>
        <div class="stats" style="margin-bottom:14px">
          <div class="stat"><b>${arG(week.reduce((s, x) => s + x.n, 0))}</b><small>آية هذا الأسبوع</small></div>
          <div class="stat"><b>${arG(mN)}</b><small>آية هذا الشهر</small></div>
          <div class="stat"><b>${arG(mR)}</b><small>صفحة روجعت هذا الشهر</small></div>
        </div>
        <p class="muted center" style="font-size:.8rem">الخطة: ${P.unit === 'ayat' ? `${ar(P.amount)} آيات` : `${ar(P.amount)} صفحة`} يومياً • ${P.dir === 'end' ? 'من جزء عمّ' : 'من سورة الفاتحة'}${P.time ? ` • تذكير ${ar(P.time)}` : ''}</p>`;
      $$('[data-go]', N.view).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
    }).catch(() => alive && (N.view.innerHTML = '<div class="card center"><p>تعذّر تحميل بيانات المصحف. تأكد من الاتصال بالإنترنت (مرة واحدة فقط).</p><button class="btn" id="retry">إعادة المحاولة</button></div>', $('#retry') && ($('#retry').onclick = renderHifz)));
    return () => { alive = false; };
  }

  // ---------- جلسة الحفظ أو المراجعة ----------
  function renderSession(kind) {
    N.setTitle(kind === 'rev' ? 'مراجعة اليوم' : 'حفظ اليوم');
    N.view.innerHTML = '<div class="loader"></div>';
    let alive = true;
    const player = new Audio();
    const onEx = (e) => { if (e.detail !== 'hifz') player.pause(); };
    window.addEventListener('noor:audio', onEx);
    let stopLR = null;
    loadMeta().then(async () => {
      const due = kind === 'rev' ? dueToday() : [];
      let list = [];
      if (kind === 'rev') due.forEach((p) => { const [a, b] = rangeOf(META.pages, p - 1); for (let g = a; g <= b; g++) if (st(g)) list.push(g); });
      else list = newToday();
      if (!list.length) { N.view.innerHTML = '<div class="card center">لا توجد آيات في هذه الجلسة اليوم ✨</div>'; return; }
      const T = await texts(list);
      if (!alive) return;
      const P = plan();
      const rc = store.get('audio:repeatCfg', {}); const ed = rc.ed || 'ar.husary';
      const VR = (N.audioLib && N.audioLib.VERSE_RECITERS) || {}; const br = (VR[ed] || ['', 128])[1];
      const audioUrl = (g) => `https://cdn.islamic.network/quran/audio/${br}/${ed}/${g}.mp3`;
      let mode = 'show';
      const ayahRow = (g) => {
        const x = T[g]; const words = x.t.split(' ');
        return `<div class="hz-ayah ${st(g) === 2 ? 'mastered' : st(g) ? 'memorized' : ''}" data-g="${g}">
          <p class="hz-text ${mode === 'test' ? 'hidden' : ''}"><span class="hz-first">${words[0]}</span> <span class="hz-rest">${words.slice(1).join(' ')}</span> <span class="ayah-num">${ar(x.a)}</span></p>
          <div class="hz-tools">
            <small class="muted">سورة ${SURAH_NAMES[x.s - 1]}، الآية ${ar(x.a)}</small>
            <button class="aud-ic" data-play="${g}" aria-label="استماع">🔊</button>
            ${kind === 'new' ? `<button class="aud-ic ${st(g) ? 'ok' : ''}" data-mem="${g}">${st(g) ? '✔ حفظتها' : 'حفظتها'}</button>` : ''}
            <button class="aud-ic ${st(g) === 2 ? 'ok' : ''}" data-mast="${g}">${st(g) === 2 ? '★ متقنة' : '☆ متقنة'}</button>
          </div>
        </div>`;
      };
      const draw = () => {
        let html;
        if (kind === 'rev') {
          html = due.map((p) => {
            const gs = list.filter((g) => pageOf(g) === p);
            return `<div class="card"><div class="hz-page-head"><b>صفحة ${ar(p)}</b><small class="muted">${SURAH_NAMES[T[gs[0]].s - 1]}</small></div>${gs.map(ayahRow).join('')}
              <div class="hz-grade"><button class="btn block" data-good="${p}">✔ راجعتها جيداً</button><button class="btn ghost block" data-weak="${p}">تحتاج مراجعة</button></div></div>`;
          }).join('');
        } else html = `<div class="card">${list.map(ayahRow).join('')}</div>`;
        N.view.innerHTML = `
          <div class="seg" id="hzMode" style="margin-bottom:10px"><button data-m="show">عرض الآيات</button><button data-m="test">اختبار (إخفاء)</button></div>
          <div class="card hz-bar">
            <button class="btn block" id="lr">🎧 استمع وردّد (${ar(P.reps)}×)</button>
            <p class="muted" style="margin:6px 0 0;font-size:.8rem">بصوت ${(VR[ed] || ['الحصري'])[0]} • يتغيّر القارئ من صفحة «التكرار الصوتي»</p>
          </div>
          ${mode === 'test' ? '<p class="muted center" style="font-size:.85rem">تظهر أول كلمة من كل آية. حاول التسميع، ثم اضغط على الآية لإظهارها.</p>' : ''}
          ${html}
          ${kind === 'new' ? '<button class="btn block" id="finish">✅ أنهيت حفظ اليوم</button>' : ''}`;
        $$('#hzMode button').forEach((b) => { b.classList.toggle('active', b.dataset.m === mode); b.onclick = () => { mode = b.dataset.m; draw(); }; });
        $$('.hz-text.hidden').forEach((p) => p.addEventListener('click', () => p.classList.remove('hidden')));
        $$('[data-play]').forEach((b) => b.addEventListener('click', () => { player.src = audioUrl(+b.dataset.play); player.play().catch(() => toast('تعذّر التشغيل')); window.dispatchEvent(new CustomEvent('noor:audio', { detail: 'hifz' })); }));
        $$('[data-mem]').forEach((b) => b.addEventListener('click', () => { const g = +b.dataset.mem; setSt([g], st(g) ? 0 : 1); draw(); }));
        $$('[data-mast]').forEach((b) => b.addEventListener('click', () => { const g = +b.dataset.mast; setSt([g], st(g) === 2 ? 1 : 2); draw(); }));
        $$('[data-good]').forEach((b) => b.addEventListener('click', () => grade(+b.dataset.good, true)));
        $$('[data-weak]').forEach((b) => b.addEventListener('click', () => grade(+b.dataset.weak, false)));
        $('#lr').onclick = () => listenRepeat();
        if ($('#finish')) $('#finish').onclick = () => {
          const fresh = list.filter((g) => !st(g));
          if (fresh.length) setSt(fresh, 1);
          logAct('n', list.length);
          toast('بارك الله فيك! سُجّل حفظ اليوم وجُدولت مراجعته');
          go('hifz');
        };
      };
      const grade = (p, good) => {
        const r = rev(); const x = r[p] || { step: 0 };
        x.step = good ? Math.min(x.step + 1, INTERVALS.length - 1) : 0;
        x.due = today() + INTERVALS[x.step];
        r[p] = x; store.set('hifz:rev', r); logAct('r', 1);
        if (good && x.step >= 4) { const [a, b] = rangeOf(META.pages, p - 1); const gs = []; for (let g = a; g <= b; g++) if (st(g) === 1) gs.push(g); if (gs.length) setSt(gs, 2); }
        due.splice(due.indexOf(p), 1);
        toast(good ? `المراجعة القادمة بعد ${ar(INTERVALS[x.step])} يوم` : 'ستعود للمراجعة غداً');
        if (!due.length) { toast('أتممت مراجعة اليوم، تقبّل الله منك'); go('hifz'); return; }
        list = list.filter((g) => pageOf(g) !== p); draw();
      };
      // الاستماع ثم الترديد: تُشغّل الآية ثم مهلة للترديد بقدر مدتها
      const listenRepeat = () => {
        if (stopLR) { stopLR(); return; }
        let i = 0, k = 0, timer = null, on = true;
        const btn = $('#lr');
        stopLR = () => { on = false; clearTimeout(timer); player.pause(); stopLR = null; if (btn) btn.textContent = `🎧 استمع وردّد (${ar(P.reps)}×)`; $$('.hz-ayah.active').forEach((x) => x.classList.remove('active')); };
        const step = () => {
          if (!on) return;
          if (i >= list.length) { stopLR(); toast('انتهى الاستماع والترديد'); return; }
          const g = list[i];
          $$('.hz-ayah.active').forEach((x) => x.classList.remove('active'));
          const row = $(`.hz-ayah[data-g="${g}"]`); if (row) { row.classList.add('active'); row.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
          if (btn) btn.textContent = `⏹ إيقاف • الآية ${ar(T[g].a)} (${ar(k + 1)}/${ar(P.reps)}) • استمع`;
          player.src = audioUrl(g);
          player.onended = () => {
            if (!on) return;
            if (btn) btn.textContent = `⏹ إيقاف • ردّد الآية ${ar(T[g].a)} الآن 🗣️`;
            timer = setTimeout(() => { k++; if (k >= P.reps) { k = 0; i++; } step(); }, Math.max(2500, (player.duration || 3) * 1100));
          };
          player.play().catch(() => { toast('تعذّر التشغيل، تأكد من الاتصال'); stopLR && stopLR(); });
          window.dispatchEvent(new CustomEvent('noor:audio', { detail: 'hifz' }));
        };
        step();
      };
      draw();
    }).catch(() => alive && (N.view.innerHTML = '<div class="card center">تعذّر تحميل الآيات. تأكد من الاتصال بالإنترنت.</div>'));
    return () => { alive = false; if (stopLR) stopLR(); player.pause(); window.removeEventListener('noor:audio', onEx); };
  }

  // ---------- التقدّم بالأجزاء والأحزاب والأرباع ----------
  let openJuz = -1;
  function renderProgress() {
    N.view.innerHTML = '<div class="loader"></div>';
    let alive = true;
    loadMeta().then(() => {
      if (!alive) return;
      const draw = () => {
        N.view.innerHTML = `<p class="muted" style="margin-top:0;font-size:.88rem">اضغط على الجزء لعرض أحزابه وأرباعه. إن كنت تحفظ جزءاً من قبل، سجّله بزر «حفظته» ليدخل في جدول المراجعة.</p>
          <div class="card" style="padding:4px">${META.juzs.map((_, j) => {
            const [a, b] = rangeOf(META.juzs, j); const n = b - a + 1; const m = countIn(a, b); const ms = countIn(a, b, 2);
            return `<div class="juz-block ${openJuz === j ? 'open' : ''}">
              <button class="juz-line" data-j="${j}"><span class="surah-num">${ar(j + 1)}</span><span class="aud-info"><b>الجزء ${ar(j + 1)} • ${JUZ_NAMES[j]}</b><span class="mini-progress"><span style="width:${(m / n) * 100}%"></span></span><small>${pct(m / n)}${ms ? ` • متقن ${pct(ms / n)}` : ''}</small></span></button>
              ${openJuz === j ? `<div class="rub-list">${[0, 1, 2, 3, 4, 5, 6, 7].map((q) => {
                const ri = j * 8 + q; const [ra, rb] = rangeOf(META.rubs, ri); const rn = rb - ra + 1; const rm = countIn(ra, rb);
                const [s, ay] = saOf(ra); const hizb = j * 2 + Math.floor(q / 4) + 1;
                return `<div class="rub-row"><div class="aud-info"><b>الحزب ${ar(hizb)} • ${['الربع الأول', 'الربع الثاني', 'الربع الثالث', 'الربع الرابع'][q % 4]}</b><small>يبدأ من ${SURAH_NAMES[s - 1]} ${ar(ay)} • ${pct(rm / rn)}</small></div>
                  <button class="aud-ic ${rm === rn ? 'ok' : ''}" data-rub="${ri}">${rm === rn ? '✔ محفوظ' : 'حفظته'}</button></div>`;
              }).join('')}</div>` : ''}
            </div>`; }).join('')}</div>`;
        $$('[data-j]').forEach((b) => b.addEventListener('click', () => { openJuz = openJuz === +b.dataset.j ? -1 : +b.dataset.j; draw(); }));
        $$('[data-rub]').forEach((b) => b.addEventListener('click', () => {
          const ri = +b.dataset.rub; const [ra, rb] = rangeOf(META.rubs, ri); const gs = []; for (let g = ra; g <= rb; g++) gs.push(g);
          const all = countIn(ra, rb) === gs.length;
          setSt(gs, all ? 0 : 1);
          if (all) { const r = rev(); gs.forEach((g) => { const p = pageOf(g); const [pa, pb] = rangeOf(META.pages, p - 1); if (!countIn(pa, pb)) delete r[p]; }); store.set('hifz:rev', r); }
          toast(all ? 'أُلغي تسجيل الربع' : 'سُجّل الربع محفوظاً وأضيف إلى المراجعة');
          draw();
        }));
      };
      draw();
    }).catch(() => alive && (N.view.innerHTML = '<div class="card center">تعذّر تحميل بيانات المصحف.</div>'));
    return () => { alive = false; };
  }

  // ---------- خطة الحفظ والتذكير ----------
  function renderPlan() {
    const P = plan();
    N.view.innerHTML = `
      <div class="card">
        <div class="field"><label>الهدف اليومي بـ</label><div class="seg" id="pu"><button data-v="ayat">الآيات</button><button data-v="pages">الصفحات</button></div></div>
        <div class="field"><label>المقدار اليومي</label><div class="seg" id="pa"></div></div>
        <div class="field"><label>ترتيب الحفظ</label><div class="seg" id="pd"><button data-v="end">من جزء عمّ (الناس ثم ما قبلها)</button><button data-v="start">من سورة الفاتحة</button></div></div>
        <div class="field"><label>عدد مرات التكرار في «استمع وردّد»</label><div class="seg" id="pr">${[1, 2, 3, 5, 7, 10].map((v) => `<button data-v="${v}">${ar(v)}×</button>`).join('')}</div></div>
        <div class="field" style="margin:0"><label for="pt">تذكير يومي بموعد الحفظ ${N.NATIVE ? '' : '<small class="muted">(في تطبيق أندرويد فقط)</small>'}</label>
          <div style="display:flex;gap:8px"><input class="search" id="pt" type="time" value="${P.time}" style="margin:0" ${N.NATIVE ? '' : 'disabled'}><button class="btn ghost" id="ptOff" ${N.NATIVE ? '' : 'disabled'}>إيقاف</button></div></div>
      </div>
      <div class="card acad-note"><b>💡 كيف تعمل المراجعة؟</b><p>كل صفحة تحفظ منها شيئاً تدخل جدول المراجعة تلقائياً. تُراجَع بعد يوم، ثم يومين، ثم ٤ أيام، ثم أسبوع، ثم ١٥ يوماً، ثم شهر، ثم شهرين. إن اخترت «تحتاج مراجعة» تعود من البداية، وبعد خمس مراجعات جيدة متتالية تُعلَّم آياتها «متقنة».</p></div>`;
    const sync = () => {
      const amounts = P.unit === 'ayat' ? [3, 5, 7, 10, 15] : [0.5, 1, 2, 3];
      if (!amounts.includes(P.amount)) P.amount = P.unit === 'ayat' ? 5 : 1;
      $('#pa').innerHTML = amounts.map((v) => `<button data-v="${v}" class="${v === P.amount ? 'active' : ''}">${v === 0.5 ? 'نصف' : ar(v)}</button>`).join('');
      $$('#pa button').forEach((b) => { b.onclick = () => { P.amount = +b.dataset.v; save(); }; });
      [['#pu', 'unit'], ['#pd', 'dir'], ['#pr', 'reps']].forEach(([id, k]) => $$(`${id} button`).forEach((b) => { b.classList.toggle('active', String(P[k]) === b.dataset.v); b.onclick = () => { P[k] = k === 'reps' ? +b.dataset.v : b.dataset.v; save(); }; }));
    };
    const save = () => { store.set('hifz:plan', P); sync(); };
    sync();
    $('#pt').onchange = (e) => { P.time = e.target.value; store.set('hifz:plan', P); scheduleReminder(); toast(P.time ? `سيصلك تذكير يومياً ${ar(P.time)}` : 'تم إيقاف التذكير'); };
    $('#ptOff').onclick = () => { P.time = ''; $('#pt').value = ''; store.set('hifz:plan', P); scheduleReminder(); toast('تم إيقاف التذكير'); };
  }
  async function scheduleReminder() {
    const LN = N.NATIVE && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
    if (!LN) return;
    try {
      await LN.cancel({ notifications: [{ id: 3000 }] });
      const P = plan();
      if (!P.time) return;
      let perm = await LN.checkPermissions(); if (perm.display !== 'granted') perm = await LN.requestPermissions(); if (perm.display !== 'granted') return;
      await LN.createChannel({ id: 'hifz', name: 'تذكير الحفظ', description: 'موعد ورد الحفظ اليومي', importance: 4, visibility: 1 });
      const [hour, minute] = P.time.split(':').map(Number);
      await LN.schedule({ notifications: [{ id: 3000, title: 'حان موعد ورد الحفظ 📖', body: 'خيركم من تعلّم القرآن وعلّمه. افتح «أثر» لحفظ اليوم ومراجعته.', channelId: 'hifz', schedule: { on: { hour, minute }, allowWhileIdle: true } }] });
    } catch (e) { console.warn('hifz reminder', e); }
  }

  Object.assign(routes, {
    hifz: { title: 'برنامج حفظ القرآن', render: renderHifz, back: 'home' },
    hifzs: { title: 'جلسة الحفظ', render: renderSession, back: 'hifz' },
    hifzp: { title: 'الأجزاء والأحزاب والأرباع', render: renderProgress, back: 'hifz' },
    hifzplan: { title: 'خطة الحفظ', render: renderPlan, back: 'hifz' },
  });

  // بطاقة الحفظ في الرئيسية
  N.homeExtras.push((root) => {
    if (!META || !store.get('hifz:plan') && ST.indexOf('1') < 0 && ST.indexOf('2') < 0) return;
    const mem = countIn(1, TOTAL); const due = dueToday().length;
    const d = document.createElement('div');
    d.innerHTML = `<div class="card continue"><div style="min-width:0"><small class="muted">📖 حفظ القرآن</small><br><b>${arG(mem)} آية محفوظة (${pct(mem / TOTAL)})</b><br><small class="muted">${due ? `${arG(due)} صفحة للمراجعة اليوم` : 'لا مراجعة مستحقة اليوم'}</small></div><button class="btn">متابعة</button></div>`;
    $('button', d).onclick = () => go('hifz');
    root.appendChild(d);
  });
  if (N.NATIVE) setTimeout(scheduleReminder, 3000);
});
