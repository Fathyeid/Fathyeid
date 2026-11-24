/* أكاديمية القرآن الكريم: تسميع بالصوت مع كشف أخطاء الحفظ، مصحف ملوّن، مراجعة متباعدة، اختبارات، خطط، أحكام التجويد، إحصاءات.
 * النص المرجعي: الرسم العثماني من alquran.cloud (quran-uthmani). التعرّف الصوتي يعتمد على محرّك Google في الهاتف (تقديري).
 * لا يحكم التطبيق على النطق والتجويد من الصوت؛ يكشف فقط فروق الكلمات (نسيان/إبدال/زيادة/تكرار/تقديم وتأخير) مع درجة ثقة. */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, esc, routes } = N;
  const TOTAL = 6236;
  const DAY = 86400000;
  const BOX = [1, 2, 4, 7, 15, 30, 60];
  const KEY = 'qa:v1';
  const SN = (typeof SURAH_NAMES !== 'undefined' && SURAH_NAMES) || [];
  const sName = (s) => SN[s - 1] || `سورة ${s}`;

  // ---------- الحالة ----------
  const blank = () => ({ v: 1, vs: {}, ses: [], tests: [], plan: null, days: {} });
  let S = store.get(KEY, null); if (!S || S.v !== 1) S = blank();
  const save = () => store.set(KEY, S);
  const dayKey = (t = Date.now()) => new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const touchDay = (k, n = 1) => { const d = dayKey(); S.days[d] = S.days[d] || { s: 0, t: 0 }; S.days[d][k] += n; };

  // ---------- بيانات المصحف الوصفية (تشارك حالة «حفظ القرآن») ----------
  let META = store.get('qmeta:v1');
  async function meta() {
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
  const hifzStr = () => { let t = store.get('hifz:st', ''); if (t.length !== TOTAL) t = '0'.repeat(TOTAL); return t; };
  const hifzSet = (list, v) => { const a = hifzStr().split(''); list.forEach((g) => { if (+a[g - 1] < v) a[g - 1] = String(v); }); store.set('hifz:st', a.join('')); };

  // ---------- نص السورة ----------
  const SC = {};
  const norm = (t) => String(t || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u08D3-\u08FF]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ٱ/g, 'ا').replace(/ة/g, 'ه').replace(/[ىئ]/g, 'ي').replace(/ؤ/g, 'و').replace(/[^\u0621-\u064A\s]/g, ' ').replace(/\s+/g, ' ').trim();
  async function surah(n) {
    if (SC[n]) return SC[n];
    let d = null;
    const ck = `qa:s${n}`;
    try {
      const r = await fetch(`${N.API}/surah/${n}/quran-uthmani`);
      if (!r.ok) throw new Error(r.status);
      d = (await r.json()).data.ayahs.map((a) => a.text);
      try { localStorage.setItem('noor:' + ck, JSON.stringify(d)); } catch { /* ممتلئ */ }
    } catch (e) { d = store.get(ck, null); if (!d) throw e; }
    // تُدرَج البسملة في أول آية من كل سورة (عدا الفاتحة والتوبة) في هذا الإصدار: نزيلها من الآية الأولى
    if (n !== 1 && n !== 9 && d[0]) {
      const parts = d[0].split(' ');
      if (norm(parts.slice(0, 4).join(' ')) === 'بسم الله الرحمن الرحيم' && parts.length > 4) d[0] = parts.slice(4).join(' ');
    }
    return (SC[n] = d);
  }
  const wordsOf = async (s, a, b) => {
    const t = await surah(s); const out = [];
    for (let i = a; i <= b; i++) (t[i - 1] || '').split(' ').filter(Boolean).forEach((w, k) => out.push({ a: i, k, w, n: norm(w) }));
    return out.filter((x) => x.n);
  };

  // ---------- محرّك المطابقة ----------
  const lev = (a, b) => {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let p = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
    return p[n];
  };
  const sim = (a, b) => { if (a === b) return 1; const a2 = a.replace(/ا/g, ''), b2 = b.replace(/ا/g, ''); if (a2 && a2 === b2) return 0.98; const x = a.replace(/^(ال|و|ف|ب|ل)/, ''), y = b.replace(/^(ال|و|ف|ب|ل)/, ''); const s1 = 1 - lev(a, b) / Math.max(a.length, b.length); const s2 = x && y ? 1 - lev(x, y) / Math.max(x.length, y.length) : 0; return Math.max(s1, s2 * 0.95); };
  // يعيد لكل كلمة متوقعة: {st: ok|unsure|subst|forgot|stop|reorder, heard} + قائمة الزوائد
  function align(E, heard) {
    const R = norm(heard).split(' ').filter(Boolean);
    const m = E.length, n = R.length;
    const D = Array.from({ length: m + 1 }, () => new Float32Array(n + 1));
    const T = Array.from({ length: m + 1 }, () => new Uint8Array(n + 1));
    for (let i = 1; i <= m; i++) { D[i][0] = i; T[i][0] = 1; }
    for (let j = 1; j <= n; j++) { D[0][j] = j; T[0][j] = 2; }
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      const s = sim(E[i - 1].n, R[j - 1]); const sc = s >= 0.45 ? 1 - s : 1.05;
      let best = D[i - 1][j - 1] + sc, t = 0;
      if (D[i - 1][j] + 1 < best) { best = D[i - 1][j] + 1; t = 1; }
      if (D[i][j - 1] + 1 < best) { best = D[i][j - 1] + 1; t = 2; }
      D[i][j] = best; T[i][j] = t;
    }
    const res = E.map(() => ({ st: 'forgot', heard: '' })); const extra = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      const t = i === 0 ? 2 : j === 0 ? 1 : T[i][j];
      if (t === 0) { const s = sim(E[i - 1].n, R[j - 1]); res[i - 1] = { st: s >= 0.8 ? 'ok' : s >= 0.45 ? 'unsure' : 'subst', heard: R[j - 1], s }; i--; j--; }
      else if (t === 1) { i--; } else { extra.push({ after: i - 1, w: R[j - 1] }); j--; }
    }
    extra.reverse();
    // ما بعد آخر كلمة مسموعة = «توقّف» وليس نسياناً
    let last = -1; res.forEach((r, k) => { if (r.heard) last = k; });
    for (let k = last + 1; k < m; k++) res[k].st = n ? 'stop' : 'forgot';
    // تكرار / تقديم وتأخير
    const dups = []; const rest = [];
    extra.forEach((x) => {
      const near = [res[x.after - 1], res[x.after], res[x.after + 1]].filter(Boolean);
      const prevHeard = x.after >= 0 && res[x.after] && sim(res[x.after].heard || '', x.w) > 0.8;
      if (prevHeard || near.some((r) => r.heard && sim(r.heard, x.w) > 0.8)) { dups.push(x); if (res[x.after]) res[x.after].rep = true; return; }
      const k = res.findIndex((r, idx) => (r.st === 'forgot') && Math.abs(idx - x.after) <= 3 && sim(E[idx].n, x.w) > 0.8);
      if (k >= 0) { res[k] = { st: 'reorder', heard: x.w }; return; }
      rest.push(x);
    });
    return { res, extra: rest, dups, n };
  }
  const summarize = (E, A) => {
    const c = { ok: 0, unsure: 0, subst: 0, forgot: 0, stop: 0, reorder: 0 };
    A.res.forEach((r) => { c[r.st]++; });
    const total = E.length; const bad = c.subst + c.forgot + c.reorder + c.stop;
    return { c, total, acc: total ? (c.ok + c.unsure * 0.5) / total : 0, unclear: !A.n || (c.ok + c.unsure) / total < 0.35 };
  };

  // ---------- جدولة المراجعة ----------
  function recordVerse(g, good) {
    const v = S.vs[g] || { m: 0, k: 0, b: 0, due: 0, t: 0 };
    if (good) { v.k++; v.b = Math.min(v.b + 1, BOX.length - 1); } else { v.m++; v.b = 0; }
    v.t = Date.now(); v.due = Date.now() + BOX[v.b] * DAY;
    S.vs[g] = v;
  }
  const classOf = (g) => {
    const v = S.vs[g]; const h = +hifzStr()[g - 1];
    if (!v && !h) return 'none';
    if (v && (v.b <= 1 && v.m >= 2 && v.m >= v.k)) return 'weak';
    if (v && v.due <= Date.now()) return 'due';
    if (v && v.b >= 4 && v.k >= 3) return 'mastered';
    return h || v ? 'prog' : 'none';
  };
  const dueList = () => {
    const now = Date.now(); const out = [];
    Object.keys(S.vs).forEach((k) => { const v = S.vs[k]; if (v.due <= now) out.push({ g: +k, w: (v.m - v.k) * 2 + (now - v.due) / DAY }); });
    const h = hifzStr();
    for (let g = 1; g <= TOTAL; g++) if (h[g - 1] !== '0' && !S.vs[g]) out.push({ g, w: 0.5 });
    return out.sort((a, b) => b.w - a.w).map((x) => x.g);
  };

  // ---------- أدوات الواجهة ----------
  const pat = '<svg class="ch-pat" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2"><circle cx="50" cy="50" r="46"/><path d="M50 4l12 34 34 12-34 12-12 34-12-34L4 50l34-12z"/></svg>';
  const pct = (x) => `${ar(Math.round(x * 100))}٪`;
  const hero = (t, s) => `<div class="ch-hero qa-hero">${pat}<div class="ch-hero-t">${t}</div><div class="ch-hero-s">${s}</div></div>`;
  const bind = () => { $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); }); };
  const NOTE = '<div class="card calc-disc"><b>⚖️ تنبيه علمي</b><p>التطبيق معلّم مساعد وليس بديلاً عن شيخ مجاز. يكشف فروق الكلمات بتقدير آلي قد يخطئ بحسب اللهجة والميكروفون والضوضاء، فراجع قراءتك على معلّم متقن. لم تُراجَع أحكام التجويد المعروضة من مختصين بعد.</p></div>';
  let audioEl = null;
  const playG = (g, times = 1) => {
    if (audioEl) { audioEl.pause(); audioEl = null; }
    const a = new Audio(`https://cdn.islamic.network/quran/audio/128/${(N.settings && N.settings.reciter) || 'ar.alafasy'}/${g}.mp3`);
    let n = 0; a.onended = () => { if (++n < times) a.play().catch(() => {}); };
    a.onerror = () => toast('تعذّر تشغيل الصوت، تأكد من الاتصال'); a.play().catch(() => toast('تعذّر تشغيل الصوت'));
    audioEl = a;
  };
  const stopAudio = () => { if (audioEl) { audioEl.pause(); audioEl = null; } };
  const surahOpts = (sel) => SN.map((n, i) => `<option value="${i + 1}" ${sel === i + 1 ? 'selected' : ''}>${ar(i + 1)}. ${n}</option>`).join('');
  const loading = () => { N.view.innerHTML = '<div class="loader" style="margin:40px auto"></div>'; };
  const failMsg = () => { N.view.innerHTML = '<div class="card center muted" style="padding:30px"><b>تعذّر تحميل نص القرآن</b><p>الاتصال بالإنترنت مطلوب في أول استخدام لكل سورة، وبعدها تُحفظ على جهازك.</p><button class="btn" data-go="qa">رجوع</button></div>'; bind(); };

  // ---------- الرئيسية ----------
  async function renderHome() {
    N.setTitle('أكاديمية القرآن الكريم');
    loading();
    try { await meta(); } catch { failMsg(); return; }
    const h = hifzStr(); let mem = 0; for (let i = 0; i < TOTAL; i++) if (h[i] !== '0') mem++;
    let done = 0; for (let s = 1; s <= 114; s++) { let all = true; for (let a = 1; a <= META.counts[s - 1]; a++) if (h[META.off[s - 1] + a - 1] === '0') { all = false; break; } if (all) done++; }
    const ses = S.ses; const acc = ses.length ? ses.slice(-10).reduce((x, y) => x + y.acc, 0) / Math.min(10, ses.length) : 0;
    let streak = 0; for (let t = Date.now(); S.days[dayKey(t)]; t -= DAY) streak++;
    const due = dueList(); const lastS = ses.length ? ses[ses.length - 1] : null;
    const pages = new Set(); Object.keys(S.vs).forEach((g) => { let lo = 0, hi = META.pages.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (META.pages[m] <= +g) lo = m; else hi = m - 1; } pages.add(lo); });
    const lvl = mem < 100 ? 'مبتدئ' : mem < 600 ? 'متدرّج' : mem < 2000 ? 'متوسط' : mem < 4500 ? 'متقدم' : 'متقن';
    N.view.innerHTML = `${hero('أكاديمية القرآن الكريم', 'رفيقك الذكي لحفظ القرآن الكريم وإتقان تلاوته')}
      <div class="qa-stats">
        <div><b>${lvl}</b><small>مستواك</small></div><div><b>${ar(done)}</b><small>سور مكتملة</small></div>
        <div><b>${ar(mem)}</b><small>آية محفوظة</small></div><div><b>${ar(pages.size)}</b><small>صفحة سُمّعت</small></div>
        <div><b>${ar(streak)}</b><small>أيام متتالية</small></div><div><b>${ses.length ? pct(acc) : '—'}</b><small>دقة التسميع</small></div></div>
      <div class="card"><small class="muted">آخر ما وصلت إليه</small><br><b>${lastS ? `سورة ${sName(lastS.s)} ${ar(lastS.a)}–${ar(lastS.b)}` : 'لم تبدأ التسميع بعد'}</b>
        <br><small class="muted">موعد المراجعة القادم: ${due.length ? `عندك ${ar(Math.min(due.length, 999))} آية مستحقة اليوم` : (mem || Object.keys(S.vs).length ? 'لا شيء مستحق الآن، بارك الله فيك' : 'أضف محفوظاتك أو سمّع لتبدأ الجدولة')}</small></div>
      <div class="qa-main">
        <button class="btn block" data-go="qarec">🎙️ ابدأ التسميع</button>
        <button class="btn block" data-go="qaplan">📖 احفظ آيات جديدة</button>
        <button class="btn block" data-go="qarev">🔁 راجع محفوظاتي${due.length ? ` (${ar(Math.min(due.length, 99))})` : ''}</button>
        <button class="btn block" data-go="qataj">🎓 تعلّم أحكام التجويد</button></div>
      <div class="qa-sub"><button class="chip" data-go="qatest">📝 اختبار من الحفظ</button><button class="chip" data-go="qamap">🗺️ خريطة الحفظ</button><button class="chip" data-go="qastats">📊 التقارير</button><button class="chip" data-go="qapr">🎧 استمع ورددّ</button><button class="chip" data-go="qaask">🧑‍🏫 المعلّم</button><button class="chip" data-go="audio">📻 المكتبة الصوتية</button><button class="chip" data-go="qakids">🧒 ركن الأطفال</button></div>
      ${NOTE}`;
    bind();
  }

  // ---------- اختيار المقطع ----------
  function renderPick(args) {
    N.setTitle('التسميع');
    meta().then(() => {
      const s0 = +args[0] || 1;
      N.view.innerHTML = `<div class="card"><h3>🎙️ اختر ما تريد تسميعه</h3>
        <label class="muted">السورة</label><select id="qaS" class="search">${surahOpts(s0)}</select>
        <div class="qa-row"><div><label class="muted">من آية</label><input id="qaA" type="number" min="1" value="1" class="search"></div><div><label class="muted">إلى آية</label><input id="qaB" type="number" min="1" value="7" class="search"></div></div>
        <label class="qa-chk"><input type="checkbox" id="qaShow"> أظهر الآيات أثناء القراءة (للتعلّم، وليس للاختبار)</label>
        <button class="btn block" id="qaGo">ابدأ</button></div>
        <div class="card"><b>طريقتان للتسميع</b><p class="muted" style="margin:6px 0 0">١. بالصوت: يستمع التطبيق ويقارن بالنص (يحتاج الإنترنت وإذن الميكروفون في تطبيق أندرويد).<br>٢. ذاتي: تسمّع بصوتك ثم تكشف النص وتعلّم أنت ما أخطأت فيه. يعمل دائماً.</p></div>${NOTE}`;
      const cap = () => { const s = +$('#qaS').value; const n = META.counts[s - 1]; $('#qaA').max = n; $('#qaB').max = n; $('#qaB').value = Math.min(+$('#qaB').value || 7, n); if (+$('#qaA').value > n) $('#qaA').value = 1; };
      $('#qaS').onchange = () => { $('#qaA').value = 1; $('#qaB').value = Math.min(7, META.counts[+$('#qaS').value - 1]); cap(); };
      cap();
      $('#qaGo').onclick = () => {
        const s = +$('#qaS').value, n = META.counts[s - 1]; let a = Math.max(1, Math.min(n, +$('#qaA').value || 1)), b = Math.max(a, Math.min(n, +$('#qaB').value || a));
        if (b - a > 29) { toast('اختر حتى ٣٠ آية في الجلسة الواحدة'); b = a + 29; }
        go(`qarec/${s}/${a}/${b}/${$('#qaShow').checked ? 1 : 0}`);
      };
    }).catch(failMsg);
  }
  const SRC = () => { const P = (window.Capacitor && window.Capacitor.Plugins) || {}; if (P.SpeechRecognition) return 'native'; if (window.SpeechRecognition || window.webkitSpeechRecognition) return N.NATIVE ? null : 'web'; return null; };

  // ---------- جلسة التسميع ----------
  async function renderRec(args) {
    const [s, a, b, show] = [+args[0], +args[1], +args[2], +args[3] === 1];
    if (!s || !a || !b) return renderPick(args);
    N.setTitle(`تسميع ${sName(s)}`); routes.qarec.back = 'qa';
    loading();
    let E; try { await meta(); E = await wordsOf(s, a, b); } catch { failMsg(); return; }
    const src = SRC();
    let text = ''; let listening = false; let handles = []; let rec = null; let acc = '', cur = '';
    const draw = () => {
      N.view.innerHTML = `<div class="card center"><b>سورة ${sName(s)} • الآيات ${ar(a)}–${ar(b)}</b><br><small class="muted">${show ? 'وضع التعلّم: النص ظاهر' : 'وضع الاختبار: النص مخفي، سمّع من حفظك'}</small>
        ${show ? `<div class="qa-ayat">${await_text()}</div>` : ''}
        <div class="qa-mic ${listening ? 'on' : ''}" id="qaMic">${listening ? '⏹' : '🎙️'}</div>
        <div class="muted" id="qaLive" style="min-height:44px;margin-top:8px">${listening ? esc(text) || 'أنا أستمع… ابدأ القراءة' : (src ? 'اضغط الميكروفون وابدأ، ثم اضغط مرة أخرى عند الانتهاء' : '')}</div>
        ${src ? '' : '<p class="muted" style="font-size:.85rem">التسميع الصوتي غير متاح على هذا الجهاز الآن. إن كنت على أندرويد فثبّت آخر نسخة من التطبيق (تحديث واحد) ليعمل. يمكنك الآن استخدام التسميع الذاتي.</p>'}
        <button class="btn ghost block" id="qaSelf" style="margin-top:10px">✍️ تسميع ذاتي (أكشف النص وأعلّم أخطائي)</button></div>${NOTE}`;
      const mic = $('#qaMic'); if (mic) mic.onclick = () => (listening ? stopRec() : startRec());
      $('#qaSelf').onclick = () => { if (listening) cancelRec(); selfMode(); };
    };
    const tcache = await surah(s);
    const await_text = () => { let o = ''; for (let i = a; i <= b; i++) o += `${tcache[i - 1]} <span class="qa-end">﴿${ar(i)}﴾</span> `; return o; };
    const cancelRec = async () => { listening = false; try { const P = window.Capacitor.Plugins.SpeechRecognition; if (P) { await P.stop(); await P.removeAllListeners(); } } catch { /* لا شيء */ } try { rec && rec.abort(); } catch { /* لا شيء */ } handles = []; rec = null; };
    const upd = () => { text = `${acc} ${cur}`.trim(); const l = $('#qaLive'); if (l) l.textContent = text || 'أنا أستمع… ابدأ القراءة'; };
    async function startRec() {
      acc = ''; cur = ''; text = '';
      try {
        if (src === 'native') {
          const P = window.Capacitor.Plugins.SpeechRecognition;
          const av = await P.available().catch(() => ({ available: true }));
          if (av && av.available === false) { toast('خدمة التعرّف على الكلام غير مثبّتة على الهاتف (Google)'); return; }
          let perm = await P.checkPermissions(); if (perm.speechRecognition !== 'granted') perm = await P.requestPermissions();
          if (perm.speechRecognition !== 'granted') { toast('لم يُسمح بالميكروفون. فعّله من إعدادات الهاتف'); return; }
          await P.addListener('partialResults', (e) => { if (e.accumulated) acc = e.accumulated; if (e.matches && e.matches[0]) cur = e.matches[0]; else if (e.accumulated && !e.matches) cur = ''; upd(); });
          await P.addListener('listeningState', (e) => { if (e.status === 'stopped' && listening) { /* انتهت الجلسة من النظام */ if (cur) acc = `${acc} ${cur}`.trim(); cur = ''; if (listening) restart(P); } });
          listening = true; draw(); upd();
          P.start({ language: 'ar-SA', maxResults: 1, partialResults: true, popup: false, continuousPTT: true, muteRecognizerBeep: true }).then((r) => { if (r && r.matches && r.matches[0] && !cur) cur = r.matches[0]; upd(); }).catch((e) => { if (listening) { toast('تعذّر بدء التسجيل'); console.warn(e); } });
        } else if (src === 'web') {
          const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
          rec = new SR(); rec.lang = 'ar-SA'; rec.continuous = true; rec.interimResults = true;
          rec.onresult = (e) => { let f = '', i = ''; for (let k = 0; k < e.results.length; k++) { if (e.results[k].isFinal) f += ` ${e.results[k][0].transcript}`; else i += ` ${e.results[k][0].transcript}`; } acc = f.trim(); cur = i.trim(); upd(); };
          rec.onend = () => { if (listening) { try { rec.start(); } catch { /* لا شيء */ } } };
          rec.onerror = (e) => { if (e.error === 'not-allowed') { toast('لم يُسمح بالميكروفون'); listening = false; draw(); } };
          listening = true; rec.start(); draw(); upd();
        }
      } catch (e) { console.warn(e); toast('تعذّر تشغيل الميكروفون'); listening = false; draw(); }
    }
    async function restart(P) { try { await P.start({ language: 'ar-SA', maxResults: 1, partialResults: true, popup: false, continuousPTT: true, muteRecognizerBeep: true }); } catch { /* لا شيء */ } }
    async function stopRec() {
      const final = `${acc} ${cur}`.trim(); await cancelRec();
      if (!final) { toast('لم أسمع شيئاً. جرّب مرة أخرى بصوت أوضح وقرب الميكروفون'); draw(); return; }
      showResult(analyze(final));
    }
    const analyze = (heard) => { const A = align(E, heard); return { A, sm: summarize(E, A), heard, self: false }; };
    function selfMode() {
      const A = { res: E.map(() => ({ st: 'ok', heard: '' })), extra: [], dups: [], n: 1 };
      showResult({ A, sm: summarize(E, A), heard: '', self: true });
    }
    const COL = { ok: 'ok', unsure: 'un', subst: 'bad', forgot: 'bad', stop: 'stop', reorder: 'rep' };
    const LBL = { ok: 'صحيحة', unsure: 'تحتاج مراجعة (غير مؤكدة)', subst: 'كلمة مختلفة', forgot: 'منسية', stop: 'لم تُقرأ (توقّف)', reorder: 'تقديم/تأخير' };
    function showResult(R) {
      stopAudio();
      const { A } = R; let sm = R.sm;
      const logOnce = { done: false };
      const paint = () => {
        sm = summarize(E, A);
        let h = ''; let last = 0;
        E.forEach((w, i) => {
          if (w.a !== last) { h += `<span class="qa-end">﴿${ar(w.a)}﴾</span> `.replace(/^/, last ? ' ' : ''); last = w.a; }
          const r = A.res[i]; h += `<span class="qa-w ${COL[r.st]}${r.rep ? ' rp' : ''}" data-i="${i}">${esc(w.w)}</span> `;
        });
        const errs = sm.c.subst + sm.c.forgot + sm.c.reorder;
        const verdict = R.self ? '' : (sm.unclear ? '<div class="card" style="border-color:#c9a227"><b>⚠️ لم أتبيّن تلاوتك بوضوح</b><p class="muted" style="margin:6px 0 0">النتيجة غير موثوقة، فلن أحكم عليها. أعد التسجيل في مكان أهدأ وقرب الميكروفون.</p></div>' : '');
        N.view.innerHTML = `${verdict}<div class="card center"><div class="qa-acc">${pct(sm.acc)}</div><small class="muted">${R.self ? 'حسب تقييمك الذاتي' : 'تقدير آلي لمطابقة الكلمات (ليس حكماً على التجويد)'}</small>
          <div class="qa-legend"><span class="qa-w ok">صحيحة ${ar(sm.c.ok)}</span><span class="qa-w un">غير مؤكدة ${ar(sm.c.unsure)}</span><span class="qa-w bad">أخطاء ${ar(errs)}</span><span class="qa-w rep">تقديم/تأخير ${ar(sm.c.reorder)}</span><span class="qa-w stop">لم تُقرأ ${ar(sm.c.stop)}</span></div></div>
          <div class="card"><div class="qa-ayat" id="qaTxt">${h}</div><small class="muted">${R.self ? 'اضغط كل كلمة أخطأت أو نسيتها لتعليمها، ' : ''}اضغط أي كلمة لترى الصحيح وتسمع الآية.</small></div>
          ${A.extra.length || A.dups.length ? `<div class="card"><b>كلمات زائدة أو مكررة</b><p class="muted" style="margin:6px 0 0">${A.dups.length ? `مكررة (برتقالي): ${A.dups.map((x) => esc(x.w)).join('، ')}<br>` : ''}${A.extra.length ? `زائدة عن النص: ${A.extra.map((x) => esc(x.w)).join('، ')}` : ''}</p></div>` : ''}
          <div class="card"><b>نوع الأخطاء</b><p class="muted" style="margin:6px 0 0">أخطاء الحفظ (نسيان/إبدال/زيادة): ${ar(errs + A.extra.length)}.<br>النطق والتجويد: لا يحكم عليهما التطبيق من الصوت، ويلزم عرضهما على معلّم متقن.</p></div>
          <div class="qa-main"><button class="btn block" id="qaSave">💾 احفظ النتيجة وجدول المراجعة</button><button class="btn ghost block" id="qaAgain">🔁 أعد التسميع</button><button class="btn ghost block" id="qaHome">رجوع</button></div>`;
        $$('.qa-w[data-i]', N.view).forEach((el) => { el.onclick = () => wordSheet(+el.dataset.i, R.self, paint); });
        $('#qaSave').onclick = () => {
          if (logOnce.done) { go('qa'); return; } logOnce.done = true;
          const byV = {}; E.forEach((w, i) => { const bad = ['subst', 'forgot', 'reorder', 'stop'].includes(A.res[i].st); byV[w.a] = byV[w.a] || (R.self ? false : false) || bad; });
          const lst = []; for (let v = a; v <= b; v++) { const bad = !!byV[v] && true; const g = gOf(s, v); if (R.self || !sm.unclear) { recordVerse(g, !bad); if (!bad) lst.push(g); } }
          S.ses.push({ t: Date.now(), s, a, b, acc: sm.acc, w: sm.total, e: errs, self: R.self ? 1 : 0, show: show ? 1 : 0 }); touchDay('s'); save();
          const perfect = lst.length;
          if (perfect && !show) { hifzSet(lst, 1); toast(`حُفظت النتيجة. أُضيفت ${ar(perfect)} آية سلمت من الأخطاء إلى محفوظاتك`); } else toast('حُفظت النتيجة وجُدولت المراجعة');
          go('qa');
        };
        $('#qaAgain').onclick = () => { go(`qarec/${s}/${a}/${b}/${show ? 1 : 0}`); renderRec([s, a, b, show ? 1 : 0]); };
        $('#qaHome').onclick = () => go('qa');
        if (errs + sm.c.stop === 0 && !R.self && !sm.unclear) toast('ما شاء الله، تسميع بلا أخطاء مرصودة 🌿');
      };
      paint();
    }
    async function wordSheet(i, self, repaint) {
      const w = E[i]; const r = A_ref().res[i]; const g = gOf(s, w.a);
      const sh = N.sheet(`<h3 style="margin:0 0 8px">${esc(w.w)}</h3><p class="muted" style="margin:0 0 8px">آية ${ar(w.a)} من سورة ${sName(s)}${r.heard ? ` • سُمعت: «${esc(r.heard)}»` : ''}<br>${LBL[r.st]}</p>
        <div class="qa-ayat" style="font-size:1.4rem">${esc((tcache[w.a - 1] || ''))}</div>
        <div class="chips" style="justify-content:flex-start;margin:10px 0"><button class="chip" data-a="p1">▶️ استمع للآية</button><button class="chip" data-a="p3">🔁 كرّر ×٣</button><button class="chip" data-a="tf">📘 المعنى</button></div>
        ${self ? '<div class="chips" style="justify-content:flex-start"><button class="chip" data-a="ok">✅ صحيحة</button><button class="chip" data-a="bad">❌ أخطأت/نسيت</button></div>' : '<div class="chips" style="justify-content:flex-start"><button class="chip" data-a="fix">✅ صحّحتها وأعدتها</button></div>'}
        <div id="qaTf" class="tafsir-body muted" style="margin-top:8px"></div>`);
      const el = sh.el || document;
      const click = (k, f) => { const b = $(`[data-a="${k}"]`, el); if (b) b.onclick = f; };
      click('p1', () => playG(g, 1)); click('p3', () => playG(g, 3));
      click('tf', () => { const t = $('#qaTf', el); t.innerHTML = '<div class="loader" style="margin:10px auto"></div>'; N.fetchJSON(`${N.API}/ayah/${g}/ar.muyassar`, `tafsir:${g}`).then((d) => { t.innerHTML = `<small>التفسير الميسر (مجمع الملك فهد)</small><br>${esc(d.text)}`; }).catch(() => { t.textContent = 'تعذّر تحميل التفسير'; }); });
      click('ok', () => { r.st = 'ok'; sh.close(); repaint(); }); click('bad', () => { r.st = 'forgot'; sh.close(); repaint(); });
      click('fix', () => { r.st = 'ok'; r.fixed = 1; sh.close(); repaint(); toast('أحسنت، سُجّل التصحيح'); });
    }
    let cur_ref = null; const A_ref = () => cur_ref;
    const _show = showResult; showResult = (R) => { cur_ref = R.A; _show(R); }; // eslint-disable-line no-func-assign
    draw();
    return () => { cancelRec(); stopAudio(); };
  }

  // ---------- المراجعة اليومية ----------
  async function renderReview() {
    N.setTitle('المراجعة اليومية'); routes.qarev.back = 'qa'; loading();
    try { await meta(); } catch { failMsg(); return; }
    const q = dueList().slice(0, 10); let i = 0; let ok = 0;
    if (!q.length) { N.view.innerHTML = '<div class="card center muted" style="padding:30px"><div style="font-size:2.4rem">🌿</div><b>لا مراجعة مستحقة الآن</b><p>سمّع آيات أو أضف محفوظاتك من «حفظ القرآن» لتبدأ الجدولة.</p><button class="btn" data-go="qarec">ابدأ التسميع</button> <button class="btn ghost" data-go="hifz">محفوظاتي</button></div>'; bind(); return; }
    const step = async () => {
      if (i >= q.length) { touchDay('t', q.length); save(); N.view.innerHTML = `<div class="card center"><div style="font-size:2.4rem">🎉</div><h3>أتممت مراجعة اليوم</h3><p>${ar(ok)} من ${ar(q.length)} آية ثبتت. وُجدولت البقية بحسب أدائك.</p><button class="btn block" data-go="qa">رجوع</button></div>`; bind(); return; }
      const g = q[i]; const [s, a] = saOf(g); const t = await surah(s); const ws = (t[a - 1] || '').split(' ');
      const hint = ws.slice(0, 3).join(' ');
      N.view.innerHTML = `<div class="card center"><small class="muted">${ar(i + 1)} / ${ar(q.length)} • سورة ${sName(s)} • الآية ${ar(a)}</small>
        <p class="muted" style="margin:10px 0 4px">أكمل الآية من حفظك:</p><div class="qa-ayat">${esc(hint)} …</div>
        <div id="qaRv"><button class="btn block" id="qaShow">أظهر الآية</button><button class="btn ghost block" id="qaSay" style="margin-top:8px">🎙️ سمّعها بالصوت</button></div></div>`;
      $('#qaShow').onclick = () => { $('#qaRv').innerHTML = `<div class="qa-ayat">${esc(t[a - 1])}</div><p class="muted">كيف كان حفظك؟</p><div class="chips" style="justify-content:center"><button class="chip" data-r="2">😊 ثابتة</button><button class="chip" data-r="1">😐 ترددت</button><button class="chip" data-r="0">😕 نسيت</button></div><button class="chip" id="qaP" style="margin-top:8px">▶️ استمع</button>`;
        $('#qaP').onclick = () => playG(g); $$('[data-r]').forEach((b) => { b.onclick = () => { const r = +b.dataset.r; recordVerse(g, r >= 1); if (r === 2) ok++; if (r === 0) { const v = S.vs[g]; v.due = Date.now() + 0.25 * DAY; } save(); stopAudio(); i++; step(); }; }); };
      $('#qaSay').onclick = () => go(`qarec/${s}/${a}/${a}/0`);
    };
    step(); return stopAudio;
  }

  // ---------- الاختبار ----------
  async function renderTest(args) {
    N.setTitle('اختبار من الحفظ'); routes.qatest.back = 'qa'; loading();
    try { await meta(); } catch { failMsg(); return; }
    if (!args[0]) {
      N.view.innerHTML = `<div class="card"><h3>📝 اختبار من الحفظ</h3><label class="muted">السورة</label><select id="qtS" class="search">${surahOpts(1)}</select>
        <div class="chips" style="justify-content:flex-start;margin-top:12px"><button class="chip" data-t="next">ما الآية التالية؟</button><button class="chip" data-t="fill">أكمل الكلمة الناقصة</button></div></div>
        <div class="card"><p class="muted" style="margin:0">اختبار من جميع محفوظاتك:</p><div class="chips" style="justify-content:flex-start;margin-top:8px"><button class="chip" data-t="nextAll">التالية (محفوظاتي)</button><button class="chip" data-t="fillAll">كلمة ناقصة (محفوظاتي)</button></div></div>${NOTE}`;
      $$('[data-t]').forEach((b) => { b.onclick = () => go(`qatest/${b.dataset.t}/${$('#qtS').value}`); }); return;
    }
    const type = args[0]; const sel = +args[1] || 1; const all = type.endsWith('All'); const kind = type.replace('All', '');
    let pool = []; const h = hifzStr();
    if (all) for (let g = 1; g <= TOTAL; g++) if (h[g - 1] !== '0') pool.push(g); else if (S.vs[g]) pool.push(g);
    else for (let a = 1; a <= META.counts[sel - 1]; a++) pool.push(gOf(sel, a));
    if (pool.length < 4) { N.view.innerHTML = '<div class="card center muted" style="padding:28px"><b>لا توجد آيات كافية</b><p>أضف محفوظاتك من «حفظ القرآن» أو اختر سورة أخرى.</p><button class="btn" data-go="qatest">رجوع</button></div>'; bind(); return; }
    const rnd = (n) => Math.floor(Math.random() * n); const shuf = (a) => a.map((x) => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
    let n = 0, right = 0; const N_Q = Math.min(8, pool.length - 1); const used = new Set();
    const txt = async (g) => { const [s, a] = saOf(g); return (await surah(s))[a - 1]; };
    const next = async () => {
      if (n >= N_Q) { S.tests.push({ t: Date.now(), type, n: N_Q, ok: right }); touchDay('t', N_Q); save(); N.view.innerHTML = `<div class="card center"><div class="qa-acc">${ar(right)}/${ar(N_Q)}</div><p>${right === N_Q ? 'ما شاء الله، درجة كاملة' : right >= N_Q * 0.6 ? 'جيد، واصل المراجعة' : 'لا بأس، المراجعة تقوّي الحفظ'}</p><button class="btn block" data-go="qatest">اختبار آخر</button><button class="btn ghost block" data-go="qa" style="margin-top:8px">رجوع</button></div>`; bind(); return; }
      let g; do { g = pool[rnd(pool.length)]; } while (used.has(g) || (kind === 'next' && (!pool.includes(g + 1) || saOf(g + 1)[0] !== saOf(g)[0]))); used.add(g);
      let q, opts, ans;
      if (kind === 'next') {
        const [s, a] = saOf(g); const cand = shuf(pool.filter((x) => x !== g + 1 && x !== g && saOf(x)[0] === s)).slice(0, 3);
        if (cand.length < 3) { const extra = shuf(pool.filter((x) => x !== g + 1 && !cand.includes(x))).slice(0, 3 - cand.length); cand.push(...extra); }
        const ts = await Promise.all([g + 1, ...cand].map(txt)); opts = shuf(ts.map((t, k) => ({ t, ok: k === 0 })));
        q = `<small class="muted">سورة ${sName(s)}</small><div class="qa-ayat">${esc(await txt(g))}</div><p>ما الآية التي تليها؟</p>`;
      } else {
        const full = (await txt(g)).split(' '); const idx = full.map((w, k) => k).filter((k) => norm(full[k]).length >= 3); const k = idx[rnd(idx.length)] ?? 0; ans = full[k];
        const [s] = saOf(g); const others = shuf(pool.filter((x) => x !== g)).slice(0, 6); const dis = [];
        for (const o of others) { const ws = (await txt(o)).split(' ').filter((w) => norm(w).length >= 3 && norm(w) !== norm(ans)); if (ws.length) dis.push(ws[rnd(ws.length)]); if (dis.length >= 3) break; }
        opts = shuf([{ t: ans, ok: true }, ...[...new Set(dis)].slice(0, 3).map((t) => ({ t, ok: false }))]);
        q = `<small class="muted">سورة ${sName(s)}</small><div class="qa-ayat">${esc(full.map((w, j) => (j === k ? '＿＿＿' : w)).join(' '))}</div><p>ما الكلمة الناقصة؟</p>`;
      }
      N.view.innerHTML = `<div class="card"><small class="muted">السؤال ${ar(n + 1)} / ${ar(N_Q)}</small>${q}${opts.map((o, j) => `<button class="btn ghost block qa-opt" data-j="${j}" style="margin-top:8px;text-align:right;font-size:${kind === 'next' ? '1rem' : '1.2rem'}">${esc(o.t)}</button>`).join('')}</div>`;
      $$('.qa-opt').forEach((b) => { b.onclick = () => { const o = opts[+b.dataset.j]; if (o.ok) right++; recordVerse(g, o.ok); $$('.qa-opt').forEach((x, j) => { x.disabled = true; x.classList.add(opts[j].ok ? 'qa-right' : 'qa-wrong-dim'); }); b.classList.toggle('qa-wrong', !o.ok); setTimeout(() => { n++; next(); }, 1100); }; });
    };
    next();
  }

  // ---------- خطة الحفظ ----------
  async function renderPlan() {
    N.setTitle('خطة الحفظ'); routes.qaplan.back = 'qa'; loading();
    try { await meta(); } catch { failMsg(); return; }
    const P = S.plan;
    const info = () => {
      const h = hifzStr(); const p = S.plan; if (!p) return '';
      const a0 = gOf(p.s, p.a), b0 = gOf(p.s, p.b); let done = 0; for (let g = a0; g <= b0; g++) if (h[g - 1] !== '0') done++;
      const total = b0 - a0 + 1; const left = total - done; const dLeft = Math.max(1, Math.ceil((p.end - Date.now()) / DAY));
      const recent = S.ses.filter((x) => Date.now() - x.t < 7 * DAY); const racc = recent.length ? recent.reduce((x, y) => x + y.acc, 0) / recent.length : 1;
      let per = Math.ceil(left / dLeft); let msg = '';
      if (racc < 0.6 && per > 1) { per = Math.max(1, Math.ceil(per * 0.7)); msg = 'خفّفنا ورد اليوم لأن دقة تسميعك الأخيرة منخفضة، ثبّت ما حفظت أولاً.'; }
      else if (Date.now() > p.end && left > 0) msg = 'تجاوزت المدة المقدّرة. لا بأس، يمكنك تمديد الخطة بتعديلها.';
      const nxt = (() => { for (let g = a0; g <= b0; g++) if (h[g - 1] === '0') return g; return null; })();
      const todayEnd = nxt ? Math.min(b0, nxt + per - 1) : null;
      return `<div class="card"><b>خطتك: سورة ${sName(p.s)} (${ar(p.a)}–${ar(p.b)})</b><div class="qa-prog"><i style="width:${Math.round((done / total) * 100)}%"></i></div><small class="muted">${ar(done)} من ${ar(total)} آية • ${ar(dLeft)} يوم متبقٍ • ${ar(per)} آية في اليوم</small>
        ${nxt ? `<p style="margin:10px 0 0"><b>ورد اليوم:</b> الآيات ${ar(saOf(nxt)[1])} إلى ${ar(saOf(todayEnd)[1])}</p><div class="qa-main"><button class="btn block" data-go="qarec/${saOf(nxt)[0]}/${saOf(nxt)[1]}/${saOf(todayEnd)[1]}/1">📖 تعلّم ورد اليوم بالقراءة والاستماع</button><button class="btn ghost block" data-go="qarec/${saOf(nxt)[0]}/${saOf(nxt)[1]}/${saOf(todayEnd)[1]}/0">🎙️ سمّع ورد اليوم</button></div>` : '<p style="margin:10px 0 0"><b>🎉 أتممت حفظ الخطة، ما شاء الله. راجعها دورياً.</b></p>'}
        ${msg ? `<p class="muted" style="margin:8px 0 0">${msg}</p>` : '<p class="muted" style="margin:8px 0 0">الخطة مرنة: إن فاتتك أيام يُعاد توزيع الباقي تلقائياً دون ضغط.</p>'}
        <button class="chip" id="qaDel" style="margin-top:8px">حذف الخطة</button></div>`;
    };
    N.view.innerHTML = `${info()}<div class="card"><h3>${P ? 'خطة جديدة' : '📖 أنشئ خطة حفظ'}</h3>
      <label class="muted">السورة</label><select id="plS" class="search">${surahOpts(78)}</select>
      <div class="qa-row"><div><label class="muted">من آية</label><input id="plA" type="number" min="1" value="1" class="search"></div><div><label class="muted">إلى آية</label><input id="plB" type="number" min="1" value="40" class="search"></div></div>
      <label class="muted">المدة</label><div class="chips" id="plD" style="justify-content:flex-start"><button class="chip active" data-d="30">٣٠ يوماً</button><button class="chip" data-d="90">٩٠ يوماً</button><button class="chip" data-d="180">٦ أشهر</button><button class="chip" data-d="365">سنة</button></div>
      <label class="muted" style="margin-top:8px;display:block">أو مدة مخصصة (أيام)</label><input id="plC" type="number" min="1" class="search" placeholder="اختياري">
      <button class="btn block" id="plGo" style="margin-top:12px">ابدأ الخطة</button></div>
      <div class="card"><p class="muted" style="margin:0">لا تُجبَر على سرعة معينة: خطتك تتكيّف مع أدائك، وتُخفَّف إن تعثّرت. وللحفظ الصحيح اعرض ورد اليوم على معلّم متقن.</p></div>`;
    bind();
    let days = 30;
    $$('#plD .chip').forEach((b) => { b.onclick = () => { $$('#plD .chip').forEach((x) => x.classList.remove('active')); b.classList.add('active'); days = +b.dataset.d; $('#plC').value = ''; }; });
    const cap = () => { const s = +$('#plS').value; const n = META.counts[s - 1]; $('#plA').value = 1; $('#plB').value = Math.min(40, n); };
    $('#plS').onchange = cap; cap();
    $('#plGo').onclick = () => {
      const s = +$('#plS').value; const n = META.counts[s - 1]; const a = Math.max(1, Math.min(n, +$('#plA').value || 1)); const b = Math.max(a, Math.min(n, +$('#plB').value || n));
      const d = +$('#plC').value || days; S.plan = { s, a, b, start: Date.now(), end: Date.now() + d * DAY, days: d }; save(); toast('بدأت خطتك، بارك الله في همّتك'); renderPlan();
    };
    const del = $('#qaDel'); if (del) del.onclick = () => { if (confirm('حذف الخطة؟ لن تُحذف محفوظاتك.')) { S.plan = null; save(); renderPlan(); } };
  }

  // ---------- خريطة الحفظ ----------
  async function renderMap(args) {
    N.setTitle('خريطة الحفظ'); routes.qamap.back = 'qa'; loading();
    try { await meta(); } catch { failMsg(); return; }
    const h = hifzStr();
    const stat = (s) => { let m = 0, w = 0, d = 0, mm = 0; const n = META.counts[s - 1]; for (let a = 1; a <= n; a++) { const g = META.off[s - 1] + a; const c = classOf(g); if (h[g - 1] !== '0' || S.vs[g]) m++; if (c === 'weak') w++; if (c === 'due') d++; if (c === 'mastered') mm++; } return { n, m, w, d, mm }; };
    if (args[0]) {
      const s = +args[0]; const st = stat(s); routes.qamap.back = 'qamap';
      const logs = S.ses.filter((x) => x.s === s).slice(-8).reverse();
      const rows = []; for (let a = 1; a <= st.n; a++) { const g = gOf(s, a); const v = S.vs[g]; if (v && v.m > 0) rows.push([a, v.m, v.due]); }
      rows.sort((x, y) => y[1] - x[1]);
      N.setTitle(`سورة ${sName(s)}`);
      N.view.innerHTML = `<div class="card center"><h3>سورة ${sName(s)}</h3><div class="qa-prog"><i style="width:${Math.round((st.m / st.n) * 100)}%"></i></div><small class="muted">محفوظ ${ar(st.m)} • متبقٍ ${ar(st.n - st.m)} • إنجاز ${pct(st.m / st.n)}</small>
        <div class="qa-main"><button class="btn block" data-go="qarec/${s}/1/${Math.min(st.n, 10)}/0">🎙️ سمّع من أولها</button></div></div>
        <div class="card"><b>سجل التسميع</b>${logs.length ? logs.map((x) => `<div class="qa-log">${new Date(x.t).toLocaleDateString('ar-EG')} • الآيات ${ar(x.a)}–${ar(x.b)} • ${pct(x.acc)}${x.self ? ' (ذاتي)' : ''}</div>`).join('') : '<p class="muted">لا يوجد بعد</p>'}</div>
        <div class="card"><b>آيات تتكرر فيها الأخطاء</b>${rows.length ? rows.slice(0, 10).map((r) => `<div class="qa-log">الآية ${ar(r[0])} • أخطاء ${ar(r[1])} • المراجعة ${r[2] <= Date.now() ? 'الآن' : new Date(r[2]).toLocaleDateString('ar-EG')}</div>`).join('') : '<p class="muted">لا شيء</p>'}</div>`;
      bind(); return;
    }
    N.view.innerHTML = `<div class="card"><div class="qa-legend"><span class="qa-cell none">لم تبدأ</span><span class="qa-cell prog">قيد الحفظ</span><span class="qa-cell mem">محفوظة</span><span class="qa-cell due">تحتاج مراجعة</span><span class="qa-cell mas">متقنة</span></div></div>
      <div class="qa-map">${Array.from({ length: 114 }, (_, i) => { const s = i + 1; const st = stat(s); const f = st.m / st.n; const c = st.m === 0 ? 'none' : st.mm / st.n > 0.8 ? 'mas' : st.w + st.d > 0 ? 'due' : f >= 1 ? 'mem' : 'prog'; return `<button class="qa-cell ${c}" data-go="qamap/${s}" title="${sName(s)}"><b>${ar(s)}</b><small>${sName(s)}</small></button>`; }).join('')}</div>`;
    bind();
  }

  // ---------- التقارير ----------
  async function renderStats() {
    N.setTitle('تقارير الأكاديمية'); routes.qastats.back = 'qa'; loading();
    try { await meta(); } catch { failMsg(); return; }
    const ses = S.ses; const wk = ses.filter((x) => Date.now() - x.t < 7 * DAY); const mo = ses.filter((x) => Date.now() - x.t < 30 * DAY);
    const avg = (l) => (l.length ? pct(l.reduce((x, y) => x + y.acc, 0) / l.length) : '—');
    const verses = Object.keys(S.vs).length; const h = hifzStr(); let mem = 0; for (let i = 0; i < TOTAL; i++) if (h[i] !== '0') mem++;
    const worst = Object.keys(S.vs).map((g) => [+g, S.vs[g].m]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const cal = Array.from({ length: 28 }, (_, i) => { const t = Date.now() - (27 - i) * DAY; const d = S.days[dayKey(t)]; const n = d ? d.s + d.t : 0; return `<i class="qa-d l${Math.min(3, n)}" title="${dayKey(t)}"></i>`; }).join('');
    const bars = Array.from({ length: 7 }, (_, i) => { const t = Date.now() - (6 - i) * DAY; const d = S.days[dayKey(t)]; const n = d ? d.s + d.t : 0; return [new Date(t).toLocaleDateString('ar-EG', { weekday: 'short' }), n]; }); const mx = Math.max(1, ...bars.map((b) => b[1]));
    const tOk = S.tests.reduce((x, y) => x + y.ok, 0), tN = S.tests.reduce((x, y) => x + y.n, 0);
    N.view.innerHTML = `<div class="qa-stats"><div><b>${ar(mem)}</b><small>آيات محفوظة</small></div><div><b>${ar(verses)}</b><small>آيات تحت المتابعة</small></div><div><b>${ar(ses.length)}</b><small>جلسات تسميع</small></div><div><b>${avg(wk)}</b><small>دقة هذا الأسبوع</small></div><div><b>${avg(mo)}</b><small>دقة الشهر</small></div><div><b>${tN ? pct(tOk / tN) : '—'}</b><small>نتائج الاختبارات</small></div></div>
      <div class="card"><b>نشاط آخر ٧ أيام</b><div class="qa-bars">${bars.map((b) => `<div><i style="height:${Math.round((b[1] / mx) * 60) + 3}px"></i><small>${b[0]}</small></div>`).join('')}</div></div>
      <div class="card"><b>تقويم النشاط (٢٨ يوماً)</b><div class="qa-cal">${cal}</div></div>
      <div class="card"><b>أكثر الآيات خطأً</b>${worst.length ? worst.map(([g, m]) => { const [s, a] = saOf(g); return `<div class="qa-log">سورة ${sName(s)} • آية ${ar(a)} • ${ar(m)} مرة</div>`; }).join('') : '<p class="muted">لا أخطاء مسجّلة بعد</p>'}</div>
      <div class="card"><small class="muted">بياناتك محفوظة على هذا الجهاز فقط (لا حسابات في أثر)، ولا تُرفع تسجيلاتك الصوتية أصلاً: التسجيل يُحوَّل إلى نص لحظياً ولا يُخزَّن. انقل بياناتك عبر النسخ الاحتياطي من الإعدادات.</small></div>`;
  }

  // ---------- أكاديمية التجويد ----------
  const TJ = [
    { id: 'mk', t: 'مخارج الحروف', d: 'المخرج موضع خروج الحرف. للحروف خمسة مواضع عامة: الجوف (حروف المد الثلاثة: الألف والواو والياء الساكنتان بعد حركة تناسبها)، والحلق (الهمزة والهاء، ثم العين والحاء، ثم الغين والخاء)، واللسان (بقية الحروف في مواضعه)، والشفتان (الفاء والباء والميم والواو)، والخيشوم (الغنّة). والتفصيل الدقيق يؤخذ بالتلقّي عن معلّم متقن.', ex: [[1, 2]], q: [['من أي موضع تخرج الباء؟', ['الشفتان', 'الحلق', 'اللسان'], 0], ['الغنّة تخرج من…', ['الجوف', 'الخيشوم', 'الشفتين'], 1]] },
    { id: 'nun', t: 'أحكام النون الساكنة والتنوين', d: 'للنون الساكنة والتنوين أربعة أحكام: إظهار (عند أحرف الحلق ء هـ ع ح غ خ)، إدغام (في يرملون: بغنة في ينمو، وبلا غنة في اللام والراء)، إقلاب (عند الباء: تُقلب ميماً مخفاة بغنة)، إخفاء (عند بقية الحروف الخمسة عشر).', ex: [[2, 62, 'مَنْ آمَنَ: إظهار'], [2, 8, 'مَن يَقُولُ: إدغام بغنة'], [2, 5, 'مِن رَّبِّهِمْ: إدغام بلا غنة'], [2, 27, 'مِن بَعْدِ: إقلاب'], [2, 4, 'مِن قَبْلِكَ: إخفاء']], q: [['«مِن بَعْدِ» حكمها…', ['إخفاء', 'إقلاب', 'إظهار'], 1], ['«مَنْ آمَنَ» حكمها…', ['إدغام', 'إظهار', 'إخفاء'], 1], ['«مِن رَّبِّهِمْ» حكمها…', ['إدغام بلا غنة', 'إدغام بغنة', 'إخفاء'], 0]] },
    { id: 'meem', t: 'أحكام الميم الساكنة', d: 'ثلاثة أحكام: إخفاء شفوي (عند الباء)، وإدغام مثلين صغير (عند الميم)، وإظهار شفوي (عند بقية الحروف، ويُنتبه عند الواو والفاء حتى لا تُخفى).', ex: [[105, 4, 'تَرْمِيهِم بِحِجَارَةٍ: إخفاء شفوي'], [36, 57, 'لَهُم مَّا: إدغام مثلين صغير'], [1, 7, 'عَلَيْهِمْ وَلَا: إظهار شفوي']], q: [['«تَرْمِيهِم بِحِجَارَةٍ» حكمها…', ['إظهار شفوي', 'إخفاء شفوي', 'إدغام'], 1], ['«لَهُم مَّا» حكمها…', ['إدغام مثلين صغير', 'إخفاء', 'إظهار'], 0]] },
    { id: 'madd', t: 'أحكام المد', d: 'المد الطبيعي حركتان. المد المتصل: همزة بعد حرف المد في كلمة واحدة، ويُمد أربع أو خمس حركات. المد المنفصل: همزة في أول الكلمة التالية، وهو جائز. المد اللازم: سكون أصلي بعد حرف المد، ويُمد ست حركات. والمقادير تُضبط بالتلقّي.', ex: [[2, 19, 'السَّمَاءِ: مد متصل'], [108, 1, 'إِنَّا أَعْطَيْنَاكَ: مد منفصل'], [69, 1, 'الْحَاقَّةُ: مد لازم']], q: [['«السَّمَاءِ» مدّها…', ['منفصل', 'متصل', 'لازم'], 1], ['«الْحَاقَّةُ» مدّها…', ['لازم', 'طبيعي', 'متصل'], 0]] },
    { id: 'qal', t: 'القلقلة والغنّة', d: 'القلقلة اضطراب المخرج عند النطق بالحرف الساكن من حروف (قطب جد): ق ط ب ج د. والغنّة صوت يخرج من الخيشوم، وأكملها في النون والميم المشدّدتين.', ex: [[112, 1, 'أَحَدٌ: قلقلة'], [111, 1, 'تَبَّتْ: قلقلة'], [2, 28, 'ثُمَّ: غنّة']], q: [['حروف القلقلة…', ['قطب جد', 'يرملون', 'ءهعحغخ'], 0], ['الغنّة تكون أكمل في…', ['النون والميم المشدّدتين', 'الباء', 'اللام'], 0]] },
    { id: 'waqf', t: 'الوقف والابتداء', d: 'علامات الوقف في المصحف: «م» وقف لازم، «لا» لا يُوقف عليه، «ج» جائز الوجهين، «صلى» الوصل أولى، «قلى» الوقف أولى، ونقاط التعانق «∴» يُوقف على أحد الموضعين. والغاية ألا يُفسد الوقف المعنى.', ex: [[1, 7]], q: [['علامة «لا» تعني…', ['لا يُوقف عليه', 'وقف لازم', 'جائز'], 0], ['علامة «م» تعني…', ['وقف لازم', 'ممنوع', 'الوصل أولى'], 0]] },
  ];
  function renderTaj(args) {
    N.setTitle('أحكام التجويد'); routes.qataj.back = 'qa';
    if (!args[0]) {
      N.view.innerHTML = `${hero('أكاديمية التجويد', 'دروس مبسّطة بأمثلة من القرآن وتمارين')}<div class="fq-grid" style="display:grid;gap:10px">${TJ.map((x) => { const dn = (store.get('qa:taj', {})[x.id] || 0); return `<button class="card" data-go="qataj/${x.id}" style="text-align:right"><b>${x.t}</b><br><small class="muted">${dn ? `✅ أجبت ${ar(dn)} من ${ar(x.q.length)} صحيحاً` : 'ابدأ الدرس'}</small></button>`; }).join('')}</div>${NOTE}`; bind(); return;
    }
    const L = TJ.find((x) => x.id === args[0]); if (!L) { go('qataj'); return; }
    routes.qataj.back = 'qataj'; N.setTitle(L.t);
    N.view.innerHTML = `<div class="card"><h3>${L.t}</h3><p style="line-height:1.9">${L.d}</p></div>
      <div class="card"><b>أمثلة من القرآن</b><div id="tjEx"><div class="loader" style="margin:14px auto"></div></div></div>
      <div class="card"><b>تمرين</b><div id="tjQ"></div></div>${NOTE}`;
    Promise.all(L.ex.map(async (e) => { const t = await surah(e[0]); return `<div class="qa-ex"><div class="qa-ayat">﴿${esc(t[e[1] - 1])}﴾</div><small class="muted">${sName(e[0])}، الآية ${ar(e[1])}${e[2] ? ` • ${e[2]}` : ''}</small> <button class="chip" data-p="${e[0]}:${e[1]}">▶️ استمع</button></div>`; })).then((h) => { $('#tjEx').innerHTML = h.join(''); $$('[data-p]').forEach((b) => { b.onclick = async () => { await meta(); const [s, a] = b.dataset.p.split(':').map(Number); playG(gOf(s, a)); }; }); }).catch(() => { $('#tjEx').innerHTML = '<p class="muted">تعذّر تحميل الأمثلة، تأكد من الاتصال.</p>'; });
    let qi = 0, ok = 0;
    const q = () => {
      if (qi >= L.q.length) { const m = store.get('qa:taj', {}); m[L.id] = Math.max(m[L.id] || 0, ok); store.set('qa:taj', m); $('#tjQ').innerHTML = `<p>النتيجة: ${ar(ok)} من ${ar(L.q.length)}</p><button class="btn" data-go="qataj">الدروس</button>`; bind(); return; }
      const it = L.q[qi]; $('#tjQ').innerHTML = `<p>${it[0]}</p>${it[1].map((o, j) => `<button class="btn ghost block" data-j="${j}" style="margin-top:6px">${o}</button>`).join('')}`;
      $$('#tjQ [data-j]').forEach((b) => { b.onclick = () => { const good = +b.dataset.j === it[2]; if (good) ok++; b.classList.add(good ? 'qa-right' : 'qa-wrong'); $$('#tjQ [data-j]').forEach((x) => { x.disabled = true; }); setTimeout(() => { qi++; q(); }, 900); }; });
    };
    q(); return stopAudio;
  }

  Object.assign(routes, {
    qa: { title: 'أكاديمية القرآن الكريم', render: renderHome, back: 'home' },
    qarec: { title: 'التسميع', render: (a, b, c, d) => renderRec([a, b, c, d]), back: 'qa' },
    qarev: { title: 'المراجعة اليومية', render: renderReview, back: 'qa' },
    qatest: { title: 'اختبار', render: (a, b) => renderTest([a, b]), back: 'qa' },
    qaplan: { title: 'خطة الحفظ', render: renderPlan, back: 'qa' },
    qamap: { title: 'خريطة الحفظ', render: (a) => renderMap([a]), back: 'qa' },
    qastats: { title: 'التقارير', render: renderStats, back: 'qa' },
    qataj: { title: 'أحكام التجويد', render: (a) => renderTaj([a]), back: 'qa' },
  });
  routes.qarec.render = (a, b, c, d) => (a ? renderRec([a, b, c, d]) : renderPick([]));
  window.QA_TEST = { align, norm, summarize };
});
