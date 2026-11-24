/* أكاديمية القرآن، المرحلة الثانية: مدرّب الاستماع والترديد بقراء متعددين، وضع الأطفال بملفات منفصلة ولوحة للوالدين، والمعلّم النصي.
 * كل البيانات على الجهاز فقط (لا حسابات، لا رفع). النص: الرسم العثماني من alquran.cloud، التفسير: الميسر (مجمع الملك فهد). */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, esc, routes } = N;
  const SN = (typeof SURAH_NAMES !== 'undefined' && SURAH_NAMES) || [];
  const sName = (s) => SN[s - 1] || `سورة ${s}`;
  const norm = (t) => String(t || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىئ]/g, 'ي').replace(/ؤ/g, 'و').replace(/[^\u0621-\u064A\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const NOTE = '<div class="card calc-disc"><b>⚖️ تنبيه</b><p>هذا معلّم مساعد، ولا يغني عن معلّم متقن يسمع منك مشافهة. التفسير من «التفسير الميسر»، وليس فتوى.</p></div>';
  const bind = () => { $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); }); };
  const loading = () => { N.view.innerHTML = '<div class="loader" style="margin:40px auto"></div>'; };
  const SC = {};
  async function surah(n) {
    if (SC[n]) return SC[n];
    const ck = `qa:s${n}`; let d;
    try { const r = await fetch(`${N.API}/surah/${n}/quran-uthmani`); if (!r.ok) throw new Error(r.status); const j = (await r.json()).data; d = { t: j.ayahs.map((a) => a.text), g: j.ayahs.map((a) => a.number) }; try { localStorage.setItem('noor:' + ck, JSON.stringify(d.t)); } catch { /* ممتلئ */ } }
    catch (e) { const t = store.get(ck, null); if (!t) throw e; d = { t, g: null }; }
    if (n !== 1 && n !== 9 && d.t[0]) { const p = d.t[0].split(' '); if (norm(p.slice(0, 4).join(' ')) === 'بسم الله الرحمن الرحيم' && p.length > 4) d.t[0] = p.slice(4).join(' '); }
    if (!d.g) { const m = store.get('qmeta:v1'); if (m) d.g = d.t.map((_, i) => m.off[n - 1] + i + 1); }
    return (SC[n] = d);
  }
  const RECITERS = [['ar.alafasy', 'مشاري العفاسي'], ['ar.husary', 'محمود خليل الحصري'], ['ar.husarymujawwad', 'الحصري (مجوّد)'], ['ar.minshawi', 'محمد صديق المنشاوي'], ['ar.abdulbasitmurattal', 'عبد الباسط (مرتّل)'], ['ar.mahermuaiqly', 'ماهر المعيقلي'], ['ar.muhammadayyoub', 'محمد أيوب'], ['ar.hudhaify', 'علي الحذيفي']];
  const pop = (list, i) => list[i % list.length];
  let au = null; const stopAu = () => { if (au) { au.onended = null; au.pause(); au = null; } };
  const ayahUrl = (ed, g) => `https://cdn.islamic.network/quran/audio/128/${ed}/${g}.mp3`;
  const shuf = (a) => a.map((x) => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  const fetchTafsir = (g) => N.fetchJSON(`${N.API}/ayah/${g}/ar.muyassar`, `tafsir:${g}`).then((d) => d.text);
  const opts = (sel) => SN.map((n, i) => `<option value="${i + 1}" ${sel === i + 1 ? 'selected' : ''}>${ar(i + 1)}. ${n}</option>`).join('');
  async function meta() { let m = store.get('qmeta:v1'); if (m) return m; const r = await fetch(`${N.API}/meta`); const d = (await r.json()).data; const counts = d.surahs.references.map((s) => s.numberOfAyahs); const off = [0]; counts.forEach((c, i) => { off[i + 1] = off[i] + c; }); const g = (x) => off[x.surah - 1] + x.ayah; m = { counts, off, pages: d.pages.references.map(g), rubs: d.hizbQuarters.references.map(g), juzs: d.juzs.references.map(g) }; store.set('qmeta:v1', m); return m; }

  // ---------- مدرّب الاستماع والترديد ----------
  async function renderPractice(a0) {
    N.setTitle('تدريب الاستماع والترديد'); routes.qapr.back = 'qa'; loading();
    let M; try { M = await meta(); } catch { N.view.innerHTML = '<div class="card center muted">يلزم الاتصال بالإنترنت</div>'; return; }
    const cfg = store.get('qa:pr', { s: 1, a: 1, b: 7, r: 'ar.alafasy', rep: 3, gap: 1, speed: 1 });
    if (a0) cfg.s = +a0;
    N.view.innerHTML = `<div class="card"><h3>🎧 استمع ثم رددّ</h3><p class="muted" style="margin:0 0 8px">يقرأ القارئ الآية، ثم يصمت لتردد أنت، ويعيدها بعدد المرات التي تختار.</p>
      <label class="muted">السورة</label><select id="pS" class="search">${opts(cfg.s)}</select>
      <div class="qa-row"><div><label class="muted">من آية</label><input id="pA" type="number" min="1" class="search" value="${cfg.a}"></div><div><label class="muted">إلى آية</label><input id="pB" type="number" min="1" class="search" value="${cfg.b}"></div></div>
      <label class="muted">القارئ</label><select id="pR" class="search">${RECITERS.map((r) => `<option value="${r[0]}" ${cfg.r === r[0] ? 'selected' : ''}>${r[1]}</option>`).join('')}</select>
      <div class="qa-row"><div><label class="muted">تكرار كل آية</label><select id="pT" class="search">${[1, 2, 3, 5, 7, 10].map((n) => `<option ${cfg.rep === n ? 'selected' : ''} value="${n}">${ar(n)}</option>`).join('')}</select></div>
      <div><label class="muted">السرعة</label><select id="pV" class="search">${[0.7, 0.85, 1, 1.15].map((n) => `<option ${cfg.speed === n ? 'selected' : ''} value="${n}">${ar(n)}×</option>`).join('')}</select></div></div>
      <label class="qa-chk"><input type="checkbox" id="pG" ${cfg.gap ? 'checked' : ''}> صمت بعد كل مرة لأردّد (بقدر مدة الآية)</label>
      <button class="btn block" id="pGo">▶️ ابدأ</button></div><div class="card" id="pBox" hidden></div>
      <div class="card"><small class="muted">تسجيل صوتك والمقارنة الآلية بصوت القارئ غير متاحة مجاناً، فالمقارنة هنا بالأذن: استمع ثم رددّ. وللمقارنة الدقيقة اعرض تلاوتك على معلّم متقن.</small></div>${NOTE}`;
    const cap = () => { const n = M.counts[+$('#pS').value - 1]; $('#pA').max = n; $('#pB').max = n; if (+$('#pB').value > n) $('#pB').value = n; if (+$('#pA').value > n) $('#pA').value = 1; };
    $('#pS').onchange = () => { $('#pA').value = 1; $('#pB').value = Math.min(7, M.counts[+$('#pS').value - 1]); cap(); }; cap();
    let run = 0;
    $('#pGo').onclick = async () => {
      stopAu(); const my = ++run;
      const s = +$('#pS').value; const n = M.counts[s - 1]; const a = Math.max(1, Math.min(n, +$('#pA').value || 1)); const b = Math.max(a, Math.min(n, +$('#pB').value || a));
      const c = { s, a, b, r: $('#pR').value, rep: +$('#pT').value, gap: $('#pG').checked ? 1 : 0, speed: +$('#pV').value }; store.set('qa:pr', c);
      let d; try { d = await surah(s); } catch { toast('تعذّر تحميل النص'); return; }
      const box = $('#pBox'); box.hidden = false;
      const playOnce = (g) => new Promise((res) => { stopAu(); const x = new Audio(ayahUrl(c.r, g)); x.playbackRate = c.speed; au = x; const t0 = Date.now(); x.onended = () => res(Date.now() - t0); x.onerror = () => res(-1); x.play().catch(() => res(-1)); });
      for (let v = a; v <= b; v++) {
        for (let k = 1; k <= c.rep; k++) {
          if (my !== run) return;
          box.innerHTML = `<div class="qa-ayat">${esc(d.t[v - 1])} <span class="qa-end">﴿${ar(v)}﴾</span></div><p class="muted center">الآية ${ar(v)} • المرة ${ar(k)} من ${ar(c.rep)} • 🔊 استمع</p><button class="chip" id="pStop">⏹ إيقاف</button>`;
          $('#pStop').onclick = () => { run++; stopAu(); box.innerHTML += '<p class="muted">أُوقف.</p>'; };
          const ms = await playOnce(d.g[v - 1]); if (ms < 0) { toast('تعذّر تشغيل الصوت، تأكد من الاتصال'); return; }
          if (c.gap) { if (my !== run) return; box.querySelector('p').textContent = `الآية ${ar(v)} • المرة ${ar(k)} من ${ar(c.rep)} • 🎙️ رددّ الآن`; await new Promise((r) => setTimeout(r, Math.min(ms + 400, 25000))); }
        }
      }
      if (my === run) box.innerHTML = '<div class="center"><div style="font-size:2rem">🌿</div><b>أتممت المقطع، بارك الله فيك</b><br><button class="btn" data-go="qarec">اختبر حفظك بالتسميع</button></div>', bind();
    };
    return () => { run++; stopAu(); };
  }

  // ---------- المعلّم النصي ----------
  async function renderAsk() {
    N.setTitle('المعلّم'); routes.qaask.back = 'qa'; loading();
    let M; try { M = await meta(); } catch { N.view.innerHTML = '<div class="card center muted">يلزم الاتصال بالإنترنت</div>'; return; }
    N.view.innerHTML = `<div class="card"><h3>🧑‍🏫 معلّم القرآن</h3><p class="muted" style="margin:0 0 8px">اختر آية لتعرف معناها من التفسير الميسر، وكيف تحفظها، وارجع إلى درس التجويد المناسب. لا يخترع المعلّم تفسيراً ولا حديثاً ولا حكماً.</p>
      <select id="aS" class="search">${opts(2)}</select><input id="aA" type="number" min="1" value="255" class="search" style="margin-top:8px">
      <div class="chips" style="justify-content:flex-start;margin-top:10px"><button class="chip" data-q="mean">📘 ما معنى هذه الآية؟</button><button class="chip" data-q="how">🧠 كيف أحفظها؟</button><button class="chip" data-q="say">🔊 كيف تُنطق؟</button><button class="chip" data-q="taj">🎓 أحكام التجويد</button><button class="chip" data-q="test">📝 اختبرني فيها</button></div></div>
      <div class="card" id="aOut"><p class="muted">اختر سؤالاً.</p></div>${NOTE}`;
    $('#aS').onchange = () => { $('#aA').value = 1; };
    $$('[data-q]').forEach((b) => { b.onclick = async () => {
      const s = +$('#aS').value; const a = Math.max(1, Math.min(M.counts[s - 1], +$('#aA').value || 1)); const out = $('#aOut'); const q = b.dataset.q;
      out.innerHTML = '<div class="loader" style="margin:14px auto"></div>';
      let d; try { d = await surah(s); } catch { out.textContent = 'تعذّر التحميل'; return; }
      const g = d.g[a - 1]; const verse = `<div class="qa-ayat">${esc(d.t[a - 1])} <span class="qa-end">﴿${ar(a)}﴾</span></div><small class="muted">سورة ${sName(s)}، الآية ${ar(a)}</small>`;
      if (q === 'mean') { try { out.innerHTML = `${verse}<p style="line-height:1.9"><small class="muted">التفسير الميسر (مجمع الملك فهد):</small><br>${esc(await fetchTafsir(g))}</p>`; } catch { out.innerHTML = `${verse}<p class="muted">تعذّر تحميل التفسير.</p>`; } }
      else if (q === 'how') { const n = d.t[a - 1].split(' ').length; out.innerHTML = `${verse}<p style="line-height:2">طريقة مجرّبة للحفظ (${ar(n)} كلمة في هذه الآية):<br>١. اقرأ الآية بتدبّر وافهم معناها (زر المعنى).<br>٢. استمع إليها من قارئ متقن ${n > 8 ? 'وقسّمها إلى مقاطع قصيرة' : 'ثلاث مرات'}.<br>٣. كرّر كل مقطع ١٠ مرات وأنت تنظر، ثم ١٠ مرات من غير نظر.<br>٤. اربط المقطع بالذي قبله.<br>٥. سمّعها لنفسك قبل النوم وبعد الفجر، وراجعها غداً وبعد ثلاثة أيام وبعد أسبوع.</p><button class="btn" data-go="qapr/${s}">🎧 تدريب الاستماع والترديد</button>`; bind(); }
      else if (q === 'say') { out.innerHTML = `${verse}<div class="chips" style="justify-content:flex-start;margin-top:8px"><button class="chip" id="aP1">▶️ استمع</button><button class="chip" id="aP3">🔁 ×٣</button><button class="chip" id="aSl">🐢 ببطء</button></div><p class="muted">للتلقّي الصحيح استمع للحصري المجوّد أو المنشاوي واتّبع قراءتهم.</p>`; const pl = (rate, rep, ed) => { stopAu(); let n = 0; const x = new Audio(ayahUrl(ed || 'ar.husarymujawwad', g)); x.playbackRate = rate; x.onended = () => { if (++n < rep) x.play(); }; x.play().catch(() => toast('تعذّر تشغيل الصوت')); au = x; }; $('#aP1').onclick = () => pl(1, 1); $('#aP3').onclick = () => pl(1, 3); $('#aSl').onclick = () => pl(0.7, 1); }
      else if (q === 'taj') { out.innerHTML = `${verse}<p style="line-height:1.9">طبّق ما تعلّمته على هذه الآية: ابحث فيها عن النون الساكنة والتنوين والميم الساكنة وحروف المد والقلقلة. وتفاصيل كل حكم في الدروس:</p><div class="chips" style="justify-content:flex-start"><button class="chip" data-go="qataj/nun">النون الساكنة</button><button class="chip" data-go="qataj/meem">الميم الساكنة</button><button class="chip" data-go="qataj/madd">المد</button><button class="chip" data-go="qataj/qal">القلقلة والغنّة</button></div><p class="muted">تعيين الأحكام على كلمات الآية آلياً غير متاح لعدم مراجعته من مختصين، فاعرضها على معلّمك.</p>`; bind(); }
      else if (q === 'test') {
        const w = d.t[a - 1].split(' ').filter((x) => norm(x).length >= 3); if (w.length < 2) { out.innerHTML = `${verse}<p class="muted">آية قصيرة، جرّب التسميع.</p>`; return; }
        const k = Math.floor(Math.random() * w.length); const ans = w[k]; const full = d.t[a - 1].split(' '); const idx = full.indexOf(ans);
        out.innerHTML = `<div class="qa-ayat">${esc(full.map((x, j) => (j === idx ? '＿＿＿' : x)).join(' '))}</div><p>اكتب الكلمة الناقصة (بدون تشكيل):</p><input id="aT" class="search"><button class="btn block" id="aC" style="margin-top:8px">تحقق</button><div id="aR"></div>`;
        $('#aC').onclick = () => { const ok = norm($('#aT').value) === norm(ans); $('#aR').innerHTML = `<p>${ok ? '✅ أحسنت' : `❌ الصحيح: <b>${esc(ans)}</b>`}</p>`; };
      }
    }; });
  }

  // ---------- وضع الأطفال ----------
  const KS = [[1, 'الفاتحة'], [112, 'الإخلاص'], [113, 'الفلق'], [114, 'الناس'], [108, 'الكوثر'], [103, 'العصر'], [110, 'النصر'], [109, 'الكافرون'], [111, 'المسد'], [107, 'الماعون'], [106, 'قريش'], [105, 'الفيل']];
  const AV = ['🦁', '🐰', '🐼', '🦊', '🐯', '🐧', '🦄', '🐢'];
  const KB = [[5, 'نجمة البداية', '🌟'], [20, 'قارئ صغير', '📖'], [50, 'حافظ نشيط', '🏅'], [100, 'بطل القرآن', '🏆']];
  const ld = () => store.get('qk:v1', { kids: [], cur: null });
  const sv = (x) => store.set('qk:v1', x);
  const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const kid = (x) => x.kids.find((k) => k.id === x.cur);
  const star = (k, n = 1) => { k.stars += n; k.days[today()] = (k.days[today()] || 0) + n; };
  function renderKids() {
    N.setTitle('الأطفال'); routes.qakids.back = 'qa'; const X = ld();
    if (!X.kids.length || !kid(X)) {
      N.view.innerHTML = `<div class="ch-hero qa-hero"><div class="ch-hero-t">🧒 ركن الأطفال</div><div class="ch-hero-s">سور قصيرة، ألعاب، نجوم ومكافآت</div></div>
        ${X.kids.length ? `<div class="card"><b>من يلعب الآن؟</b><div class="chips" style="justify-content:flex-start;margin-top:8px">${X.kids.map((k) => `<button class="chip" data-k="${k.id}">${k.av} ${esc(k.name)}</button>`).join('')}</div></div>` : ''}
        <div class="card"><h3>➕ ملف طفل جديد</h3><input id="kN" class="search" placeholder="اسم الطفل (أو اسم مستعار)" maxlength="20"><div class="chips" id="kA" style="justify-content:flex-start;margin:8px 0">${AV.map((a, i) => `<button class="chip ${i ? '' : 'active'}">${a}</button>`).join('')}</div>
        <label class="qa-chk"><input type="checkbox" id="kC"> أنا ولي الأمر وأوافق على حفظ تقدّم الطفل على هذا الجهاز فقط (لا يُرسل لأي جهة، ويمكنني حذفه في أي وقت)</label><button class="btn block" id="kAdd">إضافة</button></div>${NOTE}`;
      $$('[data-k]').forEach((b) => { b.onclick = () => { X.cur = b.dataset.k; sv(X); renderKids(); }; });
      let av = AV[0]; $$('#kA .chip').forEach((b) => { b.onclick = () => { $$('#kA .chip').forEach((x) => x.classList.remove('active')); b.classList.add('active'); av = b.textContent; }; });
      $('#kAdd').onclick = () => { const n = $('#kN').value.trim(); if (!n) { toast('اكتب الاسم'); return; } if (!$('#kC').checked) { toast('موافقة ولي الأمر مطلوبة'); return; } const id = `k${Date.now()}`; X.kids.push({ id, name: n, av, stars: 0, done: {}, days: {} }); X.cur = id; sv(X); renderKids(); };
      return;
    }
    const k = kid(X); const t = k.days[today()] || 0; let streak = 0; for (let ts = Date.now(); k.days[new Date(ts - new Date(ts).getTimezoneOffset() * 60000).toISOString().slice(0, 10)]; ts -= 864e5) streak++;
    const bd = KB.filter((b) => k.stars >= b[0]); const nx = KB.find((b) => k.stars < b[0]);
    N.view.innerHTML = `<div class="ch-hero qa-hero"><div class="ch-hero-t">${k.av} أهلاً ${esc(k.name)}</div><div class="ch-hero-s">⭐ ${ar(k.stars)} نجمة • 🔥 ${ar(streak)} يوم متتالٍ</div></div>
      <div class="card"><b>هدف اليوم:</b> اجمع ٣ نجوم <div class="qa-prog"><i style="width:${Math.min(100, Math.round(t / 3 * 100))}%"></i></div><small class="muted">${t >= 3 ? 'أحسنت! أتممت هدف اليوم 🎉' : `${ar(t)} من ٣`}</small>
        <div style="margin-top:6px">${bd.map((b) => `<span title="${b[1]}" style="font-size:1.6rem">${b[2]}</span>`).join(' ') || '<small class="muted">اجمع النجوم لتفوز بالأوسمة</small>'}${nx ? `<br><small class="muted">الوسام القادم: ${nx[1]} عند ${ar(nx[0])} نجمة</small>` : ''}</div></div>
      <div class="section-title">اختر سورة</div><div class="qa-map">${KS.map(([s, n]) => `<button class="qa-cell ${k.done[s] ? 'mem' : 'prog'}" data-go="qakid/${s}"><b>${k.done[s] ? '✅' : ar(s)}</b><small>${n}</small></button>`).join('')}</div>
      <div class="qa-sub" style="margin-top:12px"><button class="chip" data-go="qakp">👨‍👩‍👧 لوحة الوالدين</button><button class="chip" id="kSw">تبديل الطفل</button></div>`;
    bind(); $('#kSw').onclick = () => { X.cur = null; sv(X); renderKids(); };
  }
  async function renderKidSurah(sa) {
    const s = +sa; const X = ld(); const k = kid(X); if (!k) { go('qakids'); return; }
    routes.qakid.back = 'qakids'; N.setTitle(`سورة ${sName(s)}`);
    N.view.innerHTML = `<div class="card center"><h3>سورة ${sName(s)}</h3><div class="qa-main"><button class="btn block" data-g="listen">🎧 استمع ورددّ</button><button class="btn block" data-g="order">🧩 رتّب الكلمات</button><button class="btn block" data-g="fill">❓ أكمل الكلمة</button></div></div>`;
    let d; try { d = await surah(s); } catch { toast('يلزم الإنترنت لأول مرة'); return; }
    const ok = () => { const X2 = ld(); const k2 = kid(X2); star(k2); sv(X2); };
    const finish = (g) => { const X2 = ld(); const k2 = kid(X2); k2.log = k2.log || {}; k2.log[s] = k2.log[s] || {}; k2.log[s][g] = 1; if (k2.log[s].listen && k2.log[s].order && k2.log[s].fill) { k2.done[s] = 1; star(k2, 3); toast('أتممت السورة! +٣ نجوم 🌟'); } sv(X2); };
    $$('[data-g]').forEach((b) => { b.onclick = () => game(b.dataset.g); });
    const game = (g) => {
      const n = d.t.length; let v = 0; const box = N.view;
      const step = () => {
        if (v >= n) { finish(g); box.innerHTML = `<div class="card center"><div style="font-size:2.6rem">🎉</div><h3>أحسنت يا ${esc(k.name)}!</h3><p>أتممت اللعبة</p><button class="btn block" data-go="qakid/${s}">رجوع</button></div>`; bind(); return; }
        const txt = d.t[v]; const ws = txt.split(' ');
        if (g === 'listen') {
          box.innerHTML = `<div class="card center"><small class="muted">الآية ${ar(v + 1)} من ${ar(n)}</small><div class="qa-ayat" style="text-align:center">${esc(txt)}</div><button class="btn block" id="gP">▶️ استمع</button><button class="btn ghost block" id="gD" style="margin-top:8px">رددتها ✅</button></div>`;
          $('#gP').onclick = () => { stopAu(); au = new Audio(ayahUrl('ar.husarymujawwad', d.g[v])); au.play().catch(() => toast('تعذّر الصوت')); };
          $('#gD').onclick = () => { stopAu(); ok(); v++; step(); };
        } else if (g === 'order') {
          const w = ws.filter((x) => norm(x)); if (w.length < 2 || w.length > 7) { v++; step(); return; }
          const pool = shuf(w.map((x, i) => ({ x, i }))); let nx = 0; const got = [];
          box.innerHTML = `<div class="card center"><small class="muted">رتّب كلمات الآية ${ar(v + 1)} بالترتيب الصحيح</small><div class="qa-ayat" id="gAns" style="text-align:center;min-height:60px"></div><div id="gPool" class="chips" style="justify-content:center"></div><button class="chip" id="gH">💡 استمع للآية</button></div>`;
          $('#gH').onclick = () => { stopAu(); au = new Audio(ayahUrl('ar.husarymujawwad', d.g[v])); au.play().catch(() => {}); };
          const drawP = () => { $('#gPool').innerHTML = pool.map((p) => `<button class="chip" data-i="${p.i}" style="font-size:1.3rem">${esc(p.x)}</button>`).join(''); $$('#gPool .chip').forEach((b) => { b.onclick = () => { if (+b.dataset.i === nx) { got.push(w[nx]); nx++; pool.splice(pool.findIndex((p) => p.i === nx - 1), 1); $('#gAns').textContent = got.join(' '); if (nx === w.length) { ok(); setTimeout(() => { v++; step(); }, 700); } else drawP(); } else { b.classList.add('qa-wrong'); setTimeout(() => b.classList.remove('qa-wrong'), 500); } }; }); };
          drawP();
        } else {
          const c = ws.map((x, i) => i).filter((i) => norm(ws[i]).length >= 3); if (!c.length) { v++; step(); return; }
          const i = c[Math.floor(Math.random() * c.length)]; const ans = ws[i];
          const dis = shuf(d.t.join(' ').split(' ').filter((x) => norm(x).length >= 3 && norm(x) !== norm(ans))).slice(0, 2); const o = shuf([ans, ...dis]);
          box.innerHTML = `<div class="card center"><small class="muted">الآية ${ar(v + 1)}</small><div class="qa-ayat" style="text-align:center">${esc(ws.map((x, j) => (j === i ? '＿＿＿' : x)).join(' '))}</div>${o.map((x) => `<button class="btn ghost block" data-a="${esc(x)}" style="margin-top:8px;font-size:1.3rem">${esc(x)}</button>`).join('')}</div>`;
          $$('[data-a]').forEach((b) => { b.onclick = () => { if (b.dataset.a === ans) { ok(); b.classList.add('qa-right'); setTimeout(() => { v++; step(); }, 600); } else { b.classList.add('qa-wrong'); } }; });
        }
      };
      step();
    };
    return stopAu;
  }
  function renderParent() {
    N.setTitle('لوحة الوالدين'); routes.qakp.back = 'qakids'; const X = ld();
    const wk = (k) => { let n = 0; for (let i = 0; i < 7; i++) n += k.days[new Date(Date.now() - i * 864e5 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)] || 0; return n; };
    N.view.innerHTML = `<div class="card"><h3>👨‍👩‍👧 لوحة الوالدين</h3><p class="muted" style="margin:0">التقدّم محفوظ على هذا الجهاز فقط، ولا يُرسل لأي جهة.</p></div>
      ${X.kids.length ? X.kids.map((k) => `<div class="card"><b>${k.av} ${esc(k.name)}</b><br><small class="muted">⭐ ${ar(k.stars)} • نجوم هذا الأسبوع ${ar(wk(k))} • سور مكتملة ${ar(Object.keys(k.done).length)} من ${ar(KS.length)}</small><div class="qa-prog"><i style="width:${Math.round((Object.keys(k.done).length / KS.length) * 100)}%"></i></div><small>${Object.keys(k.done).map((s) => sName(+s)).join('، ') || 'لم يُتمّ سورة بعد'}</small><br><button class="chip" data-d="${k.id}" style="margin-top:8px">🗑️ حذف الملف وبياناته</button></div>`).join('') : '<div class="card muted">لا ملفات أطفال بعد.</div>'}`;
    $$('[data-d]').forEach((b) => { b.onclick = () => { if (confirm('حذف ملف الطفل وكل بياناته؟')) { X.kids = X.kids.filter((k) => k.id !== b.dataset.d); if (X.cur === b.dataset.d) X.cur = null; sv(X); renderParent(); } }; });
  }

  Object.assign(routes, {
    qapr: { title: 'تدريب الاستماع', render: renderPractice, back: 'qa' },
    qaask: { title: 'المعلّم', render: renderAsk, back: 'qa' },
    qakids: { title: 'الأطفال', render: renderKids, back: 'qa' },
    qakid: { title: 'سورة', render: renderKidSurah, back: 'qakids' },
    qakp: { title: 'لوحة الوالدين', render: renderParent, back: 'qakids' },
  });
});
