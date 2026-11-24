/* أكاديمية القرآن، المرحلة ٤: نموذج القرآن المتخصص على الجهاز (Whisper مضبوط على التلاوة، يعمل دون إنترنت بعد التحميل)،
 * تسجيلات على الجهاز مع الحذف، مقارنة إيقاع تلاوتك بالقارئ، محادثة المعلّم الصوتية/النصية (بحث وتفسير موثّق فقط)،
 * الباقات (محلية ومجانية للجميع) والنسخ الاحتياطي ونقل البيانات بين الأجهزة بكود. */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, esc, routes } = N;
  const SN = (typeof SURAH_NAMES !== 'undefined' && SURAH_NAMES) || [];
  const sName = (s) => SN[s - 1] || `سورة ${s}`;
  const norm = (t) => String(t || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/[ىئ]/g, 'ي').replace(/ؤ/g, 'و').replace(/[^\u0621-\u064A\s0-9٠-٩]/g, ' ').replace(/\s+/g, ' ').trim();
  const NOTE = '<div class="card calc-disc"><b>⚖️ تنبيه</b><p>أدوات مساعدة وليست بديلاً عن معلّم متقن. النتائج الآلية تقديرية وقد تخطئ. التفسير من «التفسير الميسر» وليس فتوى.</p></div>';
  const bind = () => { $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); }); };
  const supported = !!(window.WebAssembly && window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const pad3 = (n) => String(n).padStart(3, '0');

  // ---------- المحرك المتخصص ----------
  const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/transformers.min.js';
  const MODEL = 'omartariq612/tarteel-ai-whisper-tiny-ar-quran-onnx';
  let ASR = null;
  async function loadModel(cb) {
    if (ASR) return ASR;
    cb && cb('جارٍ تحميل المحرك…');
    const T = await import(LIB);
    T.env.backends.onnx.wasm.numThreads = 1;
    const seen = {};
    ASR = await T.pipeline('automatic-speech-recognition', MODEL, {
      dtype: { encoder_model: 'q4', decoder_model_merged: 'q4' }, device: 'wasm',
      progress_callback: (p) => { if (p.status === 'progress' && p.file) { seen[p.file] = p.progress; const v = Object.values(seen); cb && cb(`تحميل نموذج القرآن… ${ar(Math.round(v.reduce((a, b) => a + b, 0) / Math.max(1, v.length)))}٪`); } },
    });
    return ASR;
  }
  async function toPCM(blob) {
    const buf = await new (window.AudioContext || window.webkitAudioContext)().decodeAudioData(await blob.arrayBuffer());
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(buf.duration * 16000)), 16000);
    const src = off.createBufferSource(); src.buffer = buf; src.connect(off.destination); src.start();
    return (await off.startRendering()).getChannelData(0);
  }
  // يقسّم التسجيل عند الوقفات (٠٫٣ ثانية فأكثر) لأن النموذج مدرَّب على آية واحدة في كل مرة
  function splitPCM(pcm) {
    const hop = 800; const n = Math.floor(pcm.length / hop); const e = new Float32Array(n);
    for (let i = 0; i < n; i++) { let t = 0; for (let j = 0; j < hop; j++) { const v = pcm[i * hop + j]; t += v * v; } e[i] = 10 * Math.log10(t / hop + 1e-10); }
    let mx = -100; for (let i = 0; i < n; i++) if (e[i] > mx) mx = e[i];
    const thr = mx - 32; const cuts = []; let run = 0;
    for (let i = 0; i <= n; i++) { if (i < n && e[i] < thr) run++; else { if (run >= 6) cuts.push(i - Math.floor(run / 2)); run = 0; } }
    const bounds = [0, ...cuts, n]; const segs = [];
    for (let k = 0; k + 1 < bounds.length; k++) { const a = bounds[k] * hop, b = bounds[k + 1] * hop; if (b - a > 8000) segs.push([a, b]); }
    // مقطع طويل بلا وقفة: نقصّه عند أخفض طاقة بين الثانية ٣ و٨ (النموذج يتوقف غالباً بعد آية واحدة)
    const fine = [];
    segs.forEach(([a, b]) => { let st = a; while (b - st > 9 * 16000) { const f0 = Math.floor((st + 3 * 16000) / hop), f1 = Math.floor((st + 8 * 16000) / hop); let bi = f0; for (let f = f0; f <= f1 && f < n; f++) if (e[f] < e[bi]) bi = f; fine.push([st, bi * hop]); st = bi * hop; } fine.push([st, b]); });
    segs.length = 0; fine.forEach((x) => segs.push(x));
    const out = [];
    segs.forEach((sg) => { if (out.length && (out[out.length - 1][1] - out[out.length - 1][0]) < 24000 && (sg[1] - sg[0]) < 24000 && (out[out.length - 1][1] - out[out.length - 1][0]) + (sg[1] - sg[0]) < 4 * 16000) out[out.length - 1][1] = sg[1]; else out.push(sg.slice()); });
    return out.length ? out.map(([a, b]) => pcm.slice(a, b)) : [pcm];
  }
  async function transcribe(blob, cb) {
    const asr = await loadModel(cb);
    for (let i = 0; i < parts.length; i++) {
      cb && cb(`جارٍ تحليل تلاوتك… ${ar(i + 1)} من ${ar(parts.length)}`);
      const o = await asr(parts[i], { language: 'arabic', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5 });
      if (o.text) texts.push(o.text.trim());
    }
    return texts.join(' ');
  }
  async function record() {
    const P = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition);
    if (P && P.requestPermissions) { try { const c = P.checkPermissions ? await P.checkPermissions() : {}; if (c.speechRecognition !== 'granted') await P.requestPermissions(); } catch { /* لا شيء */ } }
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { const e = new Error('no-mediadevices'); e.name = 'NoMediaDevices'; throw e; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, channelCount: 1 } }); }
    catch (e1) { try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e2) { throw e2; } }
    const mr = new MediaRecorder(stream); const chunks = [];
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    mr.start(1000);
    return { stop: () => new Promise((res) => { mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); res(new Blob(chunks, { type: mr.mimeType || 'audio/webm' })); }; try { mr.stop(); } catch { res(new Blob(chunks)); } }) };
  }

  // ---------- تسجيلات على الجهاز (IndexedDB) ----------
  const db = () => new Promise((res, rej) => { const r = indexedDB.open('qa-rec', 1); r.onupgradeneeded = () => r.result.createObjectStore('r', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, f) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('r', mode); const o = f(t.objectStore('r')); t.oncomplete = () => res(o && o.result); t.onerror = () => rej(t.error); }); };
  const saveRec = (meta, blob) => tx('readwrite', (s) => s.put({ id: `r${Date.now()}`, t: Date.now(), ...meta, blob }));
  const listRec = () => tx('readonly', (s) => s.getAll()).then((x) => (x || []).sort((a, b) => b.t - a.t));
  const delRec = (id) => tx('readwrite', (s) => s.delete(id));
  const clearRec = () => tx('readwrite', (s) => s.clear());
  window.QA3 = { supported, record, transcribe, saveRec };

  // ---------- مقارنة بالقارئ ----------
  const RC = [['Alafasy_128kbps', 'مشاري العفاسي'], ['Husary_128kbps', 'محمود خليل الحصري'], ['Minshawy_Murattal_128kbps', 'محمد صديق المنشاوي'], ['Abdul_Basit_Murattal_192kbps', 'عبد الباسط (مرتّل)'], ['Hudhaify_128kbps', 'علي الحذيفي'], ['Abdurrahmaan_As-Sudais_192kbps', 'عبد الرحمن السديس'], ['Ghamadi_40kbps', 'سعد الغامدي']];
  const envOf = (pcm) => {
    const hop = 800; const n = Math.floor(pcm.length / hop); const e = new Float32Array(n);
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < hop; j++) { const v = pcm[i * hop + j]; s += v * v; } e[i] = 10 * Math.log10(s / hop + 1e-10); }
    const mx = Math.max(...e); const thr = mx - 35; let a = 0, b = n - 1; while (a < n && e[a] < thr) a++; while (b > a && e[b] < thr) b--;
    const t = Array.from(e.slice(a, b + 1)).map((x) => Math.max(x, thr));
    const m = t.reduce((x, y) => x + y, 0) / t.length; const sd = Math.sqrt(t.reduce((x, y) => x + (y - m) ** 2, 0) / t.length) || 1;
    let gaps = 0, run = 0; t.forEach((x) => { if (x <= thr + 3) run++; else { if (run >= 4) gaps++; run = 0; } });
    return { z: t.map((x) => (x - m) / sd), dur: t.length * 0.05, gaps };
  };
  const dtw = (A, B) => {
    const n = A.length, m = B.length; const w = Math.max(Math.abs(n - m), Math.round(Math.max(n, m) * 0.35));
    let prev = new Float32Array(m + 1).fill(Infinity); prev[0] = 0;
    for (let i = 1; i <= n; i++) { const cur = new Float32Array(m + 1).fill(Infinity); for (let j = Math.max(1, i - w); j <= Math.min(m, i + w); j++) { const c = Math.abs(A[i - 1] - B[j - 1]); cur[j] = c + Math.min(prev[j], cur[j - 1], prev[j - 1]); } prev = cur; }
    return prev[m] / (n + m);
  };
  const compare = async (userBlob, folder, s, a) => {
    const r = await fetch(`https://everyayah.com/data/${folder}/${pad3(s)}${pad3(a)}.mp3`); if (!r.ok) throw new Error('audio');
    const [U, R] = [envOf(await toPCM(userBlob)), envOf(await toPCM(await r.blob()))];
    const d = dtw(U.z, R.z); const sim = Math.max(0, Math.min(1, 1 - d / 1.4));
    return { sim, ratio: U.dur / R.dur, ud: U.dur, rd: R.dur, ug: U.gaps, rg: R.gaps };
  };
  let au = null; const stopAu = () => { if (au) { au.pause(); au = null; } };
  const playBlob = (b) => { stopAu(); au = new Audio(URL.createObjectURL(b)); au.play().catch(() => toast('تعذّر التشغيل')); };
  const playRef = (folder, s, a) => { stopAu(); au = new Audio(`https://everyayah.com/data/${folder}/${pad3(s)}${pad3(a)}.mp3`); au.play().catch(() => toast('تعذّر التشغيل')); };
  const opts = (sel) => SN.map((n, i) => `<option value="${i + 1}" ${sel === i + 1 ? 'selected' : ''}>${ar(i + 1)}. ${n}</option>`).join('');
  const cmpHtml = (c) => `<div class="qa-stats"><div><b>${ar(Math.round(c.sim * 100))}٪</b><small>تشابه شكل الإيقاع</small></div><div><b>${ar(c.ratio.toFixed(2))}×</b><small>سرعتك نسبةً للقارئ</small></div><div><b>${ar(c.ug)}/${ar(c.rg)}</b><small>وقفاتك/وقفات القارئ</small></div></div>
    <p class="muted" style="margin:6px 0 0">${c.ratio > 1.25 ? 'قراءتك أبطأ من القارئ كثيراً، وهذا حسن للتعلّم، وتدرّج نحو إيقاعه.' : c.ratio < 0.8 ? 'قراءتك أسرع من القارئ، فتمهّل ورتّل.' : 'سرعتك قريبة من سرعة القارئ.'}<br>هذا قياس للإيقاع والوقفات فقط، وليس حكماً على النطق أو التجويد.</p>`;

  async function renderRecs() {
    N.setTitle('تسجيلاتي والمقارنة'); routes.qarecs.back = 'qa';
    const cfg = store.get('qa:cmp', { s: 1, a: 1, r: RC[0][0] });
    const list = await listRec().catch(() => []);
    const size = list.reduce((x, y) => x + (y.blob ? y.blob.size : 0), 0);
    N.view.innerHTML = `<div class="card"><h3>🎙️ سجّل آية وقارنها بالقارئ</h3>
      <label class="muted">السورة</label><select id="cS" class="search">${opts(cfg.s)}</select>
      <div class="qa-row"><div><label class="muted">رقم الآية</label><input id="cA" type="number" min="1" value="${cfg.a}" class="search"></div><div><label class="muted">القارئ</label><select id="cR" class="search">${RC.map((r) => `<option value="${r[0]}" ${cfg.r === r[0] ? 'selected' : ''}>${r[1]}</option>`).join('')}</select></div></div>
      ${supported ? '<div class="qa-mic" id="cMic">🎙️</div><div class="muted center" id="cSt">اضغط، اقرأ الآية، ثم اضغط للإنهاء</div>' : '<p class="muted">التسجيل غير مدعوم في هذا المتصفح.</p>'}
      <div id="cOut"></div></div>
      <div class="card"><b>تسجيلاتي المحفوظة على هذا الجهاز</b> <small class="muted">(${ar(list.length)} • ${ar((size / 1048576).toFixed(1))} ميجا)</small>
      ${list.length ? list.map((r) => `<div class="qa-log" data-id="${r.id}">${new Date(r.t).toLocaleDateString('ar-EG')} • ${sName(r.s)} ${ar(r.a)}${r.b && r.b !== r.a ? `–${ar(r.b)}` : ''}${r.acc != null ? ` • ${ar(Math.round(r.acc * 100))}٪` : ''}<br><button class="chip" data-p="${r.id}">▶️ تشغيل</button><button class="chip" data-c="${r.id}">⚖️ قارن بالقارئ</button><button class="chip" data-x="${r.id}">🗑️ حذف</button><div class="cres"></div></div>`).join('') + '<button class="chip" id="cAll" style="margin-top:10px">🗑️ حذف كل تسجيلاتي</button>' : '<p class="muted">لا تسجيلات. تُحفظ تسجيلات التسميع عند تفعيل «احتفظ بتسجيلي».</p>'}
      <p class="muted" style="font-size:.8rem;margin:8px 0 0">تسجيلاتك تبقى على جهازك فقط ولا تُرفع لأي جهة، وتُحذف بزر الحذف.</p></div>${NOTE}`;
    $('#cS').onchange = () => { $('#cA').value = 1; };
    const getCfg = () => { const c = { s: +$('#cS').value, a: Math.max(1, +$('#cA').value || 1), r: $('#cR').value }; store.set('qa:cmp', c); return c; };
    let rec = null;
    const mic = $('#cMic'); if (mic) mic.onclick = async () => {
      if (!rec) { try { rec = await record(); mic.classList.add('on'); mic.textContent = '⏹'; $('#cSt').textContent = '🔴 جارٍ التسجيل…'; } catch { toast('تعذّر الوصول للميكروفون'); } return; }
      const r = rec; rec = null; mic.classList.remove('on'); mic.textContent = '🎙️'; const blob = await r.stop(); const c = getCfg(); $('#cSt').textContent = 'جارٍ المقارنة…';
      try { const res = await compare(blob, c.r, c.s, c.a); $('#cOut').innerHTML = `${cmpHtml(res)}<div class="chips" style="justify-content:flex-start;margin-top:8px"><button class="chip" id="cMine">▶️ صوتي</button><button class="chip" id="cRef">▶️ القارئ</button><button class="chip" id="cSave">💾 احفظ تسجيلي</button></div>`; $('#cSt').textContent = ''; $('#cMine').onclick = () => playBlob(blob); $('#cRef').onclick = () => playRef(c.r, c.s, c.a); $('#cSave').onclick = async () => { await saveRec({ s: c.s, a: c.a, b: c.a }, blob); toast('حُفظ على جهازك'); renderRecs(); }; }
      catch (e) { console.warn(e); $('#cSt').textContent = 'تعذّرت المقارنة. تأكد من الإنترنت لتحميل صوت القارئ، وأن التسجيل واضح.'; }
    };
    $$('[data-p]').forEach((b) => { b.onclick = async () => { const r = (await listRec()).find((x) => x.id === b.dataset.p); if (r) playBlob(r.blob); }; });
    $$('[data-x]').forEach((b) => { b.onclick = async () => { if (confirm('حذف هذا التسجيل؟')) { await delRec(b.dataset.x); renderRecs(); } }; });
    $$('[data-c]').forEach((b) => { b.onclick = async () => { const r = (await listRec()).find((x) => x.id === b.dataset.c); const box = b.parentElement.querySelector('.cres'); if (!r) return; if (r.b && r.b !== r.a) { box.innerHTML = '<p class="muted">المقارنة تعمل لآية واحدة. سجّل آية واحدة من الأعلى.</p>'; return; } box.innerHTML = '<div class="loader" style="margin:8px auto"></div>'; try { const c = getCfg(); box.innerHTML = cmpHtml(await compare(r.blob, c.r, r.s, r.a)); } catch { box.innerHTML = '<p class="muted">تعذّرت المقارنة (تحتاج الإنترنت).</p>'; } }; });
    const all = $('#cAll'); if (all) all.onclick = async () => { if (confirm('حذف كل التسجيلات نهائياً؟')) { await clearRec(); renderRecs(); } };
    return stopAu;
  }

  // ---------- محادثة المعلّم ----------
  const digits = (t) => String(t).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const findSurah = (q) => { const nq = ` ${norm(q)} `; let best = 0, len = 0; SN.forEach((n, i) => { const k = norm(n).replace(/^ال/, ''); if (k.length > 2 && (nq.includes(` ${norm(n)} `) || nq.includes(` ال${k} `) || nq.includes(` ${k} `)) && k.length > len) { best = i + 1; len = k.length; } }); return best; };
  const metaCounts = () => { const m = store.get('qmeta:v1'); return m ? m.counts : null; };
  const SC = {};
  async function verse(s, a) { if (!SC[s]) { const r = await fetch(`${N.API}/surah/${s}/quran-uthmani`); const d = (await r.json()).data.ayahs; SC[s] = d.map((x) => ({ n: x.number, t: x.text })); if (s !== 1 && s !== 9) { const p = SC[s][0].t.split(' '); if (norm(p.slice(0, 4).join(' ')) === 'بسم الله الرحمن الرحيم' && p.length > 4) SC[s][0].t = p.slice(4).join(' '); } } return SC[s][a - 1]; }
  const speak = (t) => { try { if (!store.get('qa:tts', true) || !window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(t).slice(0, 600)); u.lang = 'ar-SA'; speechSynthesis.speak(u); } catch { /* لا شيء */ } };
  function renderChat() {
    N.setTitle('محادثة المعلّم'); routes.qachat.back = 'qa';
    const SRW = window.SpeechRecognition || window.webkitSpeechRecognition; const NSR = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition;
    N.view.innerHTML = `<div class="card"><h3>💬 معلّم القرآن</h3><p class="muted" style="margin:0">اسأل بصوتك أو بالكتابة: «ما معنى سورة الإخلاص الآية ١»، «كيف أحفظ البقرة ٢٥٥»، «اختبرني في الفاتحة ٢»، «ما أخطائي الأخيرة»، «أحكام التجويد». أجيب من نص القرآن والتفسير الميسر فقط، ولا أخترع تفسيراً أو حديثاً.</p>
      <label class="qa-chk"><input type="checkbox" id="chT" ${store.get('qa:tts', true) ? 'checked' : ''}> اقرأ الإجابة بصوت عالٍ</label></div>
      <div id="chLog"></div>
      <div class="card"><div class="qa-row" style="grid-template-columns:1fr auto auto"><input id="chQ" class="search" placeholder="اكتب سؤالك…">${NSR || SRW ? '<button class="btn" id="chMic">🎙️</button>' : ''}<button class="btn" id="chGo">إرسال</button></div></div>${NOTE}`;
    const log = $('#chLog'); const add = (who, html) => { const d = document.createElement('div'); d.className = 'card'; d.style.background = who === 'u' ? 'var(--gold-soft)' : ''; d.innerHTML = `<small class="muted">${who === 'u' ? 'أنت' : 'المعلّم'}</small><div style="line-height:1.9">${html}</div>`; log.appendChild(d); d.scrollIntoView({ block: 'nearest' }); return d; };
    $('#chT').onchange = (e) => store.set('qa:tts', e.target.checked);
    add('t', 'السلام عليكم، أنا معلّمك. كيف أساعدك في القرآن اليوم؟');
    const ask = async (q) => {
      if (!q.trim()) return; add('u', esc(q)); const nq = norm(digits(q)); const out = add('t', '<div class="loader" style="margin:8px auto"></div>');
      const say = (html, tts) => { out.querySelector('div').innerHTML = html; bind(); if (tts) speak(tts); };
      try {
        const s = findSurah(q); const num = (digits(q).match(/\d+/g) || []).map(Number).filter((x) => x > 0 && x < 300); let a = 0; num.forEach((x) => { if (!a) a = x; });
        const has = (...w) => w.some((x) => nq.includes(norm(x)));
        if (has('اخطائي', 'اخطاء', 'غلطاتي')) { const S = store.get('qa:v1', { ses: [], vs: {} }); const bad = Object.keys(S.vs || {}).map((g) => [+g, S.vs[g].m]).filter((x) => x[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, 5); if (!bad.length) { say('لا أخطاء مسجّلة بعد. ابدأ بالتسميع وسأرصدها وأذكّرك بها.', 'لا أخطاء مسجلة بعد'); return; } const m = store.get('qmeta:v1'); const items = bad.map(([g, c]) => { let sI = 1; while (sI < 114 && m.off[sI] < g) sI++; return `سورة ${sName(sI)} آية ${ar(g - m.off[sI - 1])} (${ar(c)} مرة)`; }); say(`أكثر آياتك خطأً:<br>${items.join('<br>')}<br><button class="chip" data-go="qarev">🔁 راجعها الآن</button>`, `أكثر آياتك خطأ ${items.join('، ')}`); return; }
        if (has('تجويد', 'احكام', 'غنه', 'اخفاء', 'ادغام', 'اقلاب', 'مد')) { say('دروس التجويد المتاحة:<div class="chips" style="justify-content:flex-start"><button class="chip" data-go="qataj/mk">المخارج</button><button class="chip" data-go="qataj/nun">النون الساكنة</button><button class="chip" data-go="qataj/meem">الميم الساكنة</button><button class="chip" data-go="qataj/madd">المد</button><button class="chip" data-go="qataj/qal">القلقلة</button><button class="chip" data-go="qataj/waqf">الوقف</button></div>', 'اخترت لك دروس التجويد'); return; }
        if (has('راجع', 'مراجعه')) { say('<button class="btn" data-go="qarev">🔁 ابدأ المراجعة اليومية</button>', 'ابدأ المراجعة اليومية'); return; }
        if (has('هل قراءتي', 'قراءتي صحيحه', 'صحح')) { say('لأتأكد من تلاوتك سمّعها لي: <button class="btn" data-go="qarec">🎙️ ابدأ التسميع</button>. أقارن كلماتك بالنص وأحدد مواضع الخطأ. أما النطق والتجويد فيلزم فيهما معلّم متقن.', 'سمعها لي من صفحة التسميع'); return; }
        if (s && a) {
          const cn = metaCounts(); if (cn && a > cn[s - 1]) { say(`سورة ${sName(s)} فيها ${ar(cn[s - 1])} آية فقط.`); return; }
          const v = await verse(s, a); if (!v) { say('لم أجد هذه الآية.'); return; }
          const head = `<div class="qa-ayat">${esc(v.t)} <span class="qa-end">﴿${ar(a)}﴾</span></div><small class="muted">سورة ${sName(s)}، الآية ${ar(a)}</small>`;
          if (has('اختبر', 'اختبرني')) { say(`${head}<div class="chips" style="justify-content:flex-start;margin-top:8px"><button class="chip" data-go="qatest/fill/${s}">📝 اختبار في السورة</button><button class="chip" data-go="qarec/${s}/${a}/${a}/0">🎙️ سمّعها</button></div>`, 'هيا نختبر حفظك'); return; }
          if (has('احفظ', 'حفظ')) { say(`${head}<p>١. افهم المعنى ثم استمع للقارئ ثلاثاً. ٢. قسّم الآية لمقاطع قصيرة وكرّر كل مقطع عشراً. ٣. اربط المقاطع. ٤. سمّعها قبل النوم وراجعها غداً وبعد أسبوع.</p><button class="chip" data-go="qapr/${s}">🎧 استمع ورددّ</button>`, 'اتبع خطوات الحفظ المعروضة'); return; }
          if (has('نطق', 'اسمع', 'استمع', 'صوت')) { say(`${head}<button class="chip" id="chPl">▶️ استمع</button>`); const b = out.querySelector('#chPl'); if (b) b.onclick = () => playRef('Husary_128kbps', s, a); return; }
          const t = await N.fetchJSON(`${N.API}/ayah/${v.n}/ar.muyassar`, `tafsir:${v.n}`).then((d) => d.text); say(`${head}<p><small class="muted">التفسير الميسر (مجمع الملك فهد):</small><br>${esc(t)}</p>`, t); return;
        }
        // بحث بالكلمات
        const kw = nq.split(' ').filter((w) => w.length > 2 && !['ماذا', 'معني', 'اين', 'ايه', 'اية', 'سوره', 'عن', 'في', 'هل', 'كيف', 'ابحث'].includes(w)).slice(0, 3).join(' ');
        if (!kw) { say('لم أفهم السؤال. اذكر اسم السورة ورقم الآية، مثل: «معنى سورة الإخلاص آية ١»، أو كلمة للبحث في القرآن.'); return; }
        const r = await fetch(`${N.API}/search/${encodeURIComponent(kw)}/all/quran-simple-clean`); const j = await r.json();
        const ms = (j.data && j.data.matches) || []; if (!ms.length) { say('لم أجد نتائج لهذه الكلمات في القرآن. جرّب كلمة أخرى أو اذكر السورة والآية.'); return; }
        const top = ms.slice(0, 5); say(`وجدت ${ar(j.data.count)} آية فيها «${esc(kw)}». أولها:<br>${top.map((m) => `<div class="qa-log">﴿${esc(m.text)}﴾<br><small class="muted">سورة ${esc(m.surah.name.replace('سُورَةُ ', ''))} آية ${ar(m.numberInSurah)}</small></div>`).join('')}<small class="muted">اسألني عن معنى أي منها بذكر السورة والآية.</small>`, `وجدت ${j.data.count} آية`);
      } catch (e) { console.warn(e); say('تعذّر الوصول للمصدر. تأكد من الإنترنت وحاول مرة أخرى.'); }
    };
    $('#chGo').onclick = () => { const q = $('#chQ').value; $('#chQ').value = ''; ask(q); };
    $('#chQ').onkeydown = (e) => { if (e.key === 'Enter') $('#chGo').click(); };
    const mic = $('#chMic'); if (mic) mic.onclick = async () => {
      try {
        if (NSR) { let p = await NSR.checkPermissions(); if (p.speechRecognition !== 'granted') p = await NSR.requestPermissions(); if (p.speechRecognition !== 'granted') { toast('لم يُسمح بالميكروفون'); return; } mic.textContent = '🔴'; const r = await NSR.start({ language: 'ar-SA', maxResults: 1, popup: false, partialResults: false }); mic.textContent = '🎙️'; const q = r && r.matches && r.matches[0]; if (q) ask(q); else toast('لم أسمع شيئاً'); }
        else { const r = new SRW(); r.lang = 'ar-SA'; r.onresult = (e) => ask(e.results[0][0].transcript); r.onend = () => { mic.textContent = '🎙️'; }; mic.textContent = '🔴'; r.start(); }
      } catch { mic.textContent = '🎙️'; toast('تعذّر الاستماع'); }
    };
    return () => { try { speechSynthesis.cancel(); } catch { /* لا شيء */ } stopAu(); };
  }

  // ---------- الباقات والنسخ الاحتياطي ----------
  const KEYS = ['qa:v1', 'qk:v1', 'hifz:st', 'qa:taj', 'qa:pr', 'qa:cmp', 'qa:inst', 'qa:eng', 'qa:keep', 'qa:tts', 'ch30'];
  const b64 = (s) => btoa(unescape(encodeURIComponent(s)));
  const unb64 = (s) => decodeURIComponent(escape(atob(s)));
  function renderPlans() {
    N.setTitle('الباقات والنسخ الاحتياطي'); routes.qaplans.back = 'qa';
    const S = store.get('qa:v1', { days: {} }); const dk = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10); const today = (S.days && S.days[dk] && S.days[dk].s) || 0;
    const rows = [['قراءة القرآن ونصّه', '✅', '✅', '✅'], ['التسميع الذكي', '✅ بلا حد', '✅', '✅'], ['تحليل الأخطاء والمصحف الملوّن', '✅', '✅', '✅'], ['الخطط ومحرّك المراجعة', '✅', '✅', '✅'], ['اختبارات الحفظ ودروس التجويد', '✅', '✅', '✅'], ['نموذج القرآن والتسجيلات والمقارنة', '✅', '✅', '✅'], ['محادثة المعلّم الصوتية', '✅', '✅', '✅'], ['ركن الأطفال ولوحة الوالدين', '✅', '—', '✅']];
    N.view.innerHTML = `<div class="ch-hero qa-hero"><div class="ch-hero-t">كل المزايا مجانية الآن</div><div class="ch-hero-s">أثر صدقة جارية، ولا حدود على التعلّم</div></div>
      <div class="card"><b>الباقات</b><table style="width:100%;font-size:.82rem;margin-top:8px;border-collapse:collapse"><tr><th></th><th>مجاني</th><th>مميّز</th><th>عائلة</th></tr>${rows.map((r) => `<tr><td style="padding:5px 0">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</table>
      <p class="muted" style="margin:8px 0 0;font-size:.85rem">الباقتان المدفوعتان تحتاجان نظام دفع وحسابات، وهما غير مفعّلتين حالياً. لذلك فُتحت المزايا كلها مجاناً، ولن يُحجب نص القرآن ولا العبادات الأساسية أبداً. جلسات التسميع الذكي اليوم: ${ar(today)}.</p></div>
      <div class="card"><b>🔐 النسخ الاحتياطي والنقل بين الأجهزة</b><p class="muted" style="margin:6px 0">أثر بلا حسابات، فبياناتك على جهازك. انسخ الكود ثم الصقه في جهازك الآخر لتنتقل كل بياناتك (التقدّم، الخطط، المراجعة، الأطفال، الإعدادات). التسجيلات الصوتية لا تُنقل.</p>
      <button class="btn block" id="bkExp">📤 أنشئ كود النسخ الاحتياطي</button><textarea id="bkTxt" class="search" rows="4" style="margin-top:8px" placeholder="الكود يظهر هنا، أو الصق كوداً لاستعادته"></textarea>
      <div class="chips" style="justify-content:flex-start;margin-top:8px"><button class="chip" id="bkCp">📋 نسخ</button><button class="chip" id="bkSh">↗️ مشاركة</button><button class="chip" id="bkImp">📥 استعادة من الكود</button></div></div>
      <div class="card"><b>🧹 بياناتي</b><p class="muted" style="margin:6px 0">حذف كل تقدّم الأكاديمية من هذا الجهاز (لا يمسّ محفوظاتك في «حفظ القرآن»).</p><button class="chip" id="bkDel">حذف بيانات الأكاديمية</button></div>`;
    $('#bkExp').onclick = () => { const o = {}; KEYS.forEach((k) => { const v = localStorage.getItem('noor:' + k); if (v != null) o[k] = v; }); $('#bkTxt').value = `ATHARQA1:${b64(JSON.stringify(o))}`; toast('أُنشئ الكود، انسخه واحتفظ به'); };
    $('#bkCp').onclick = async () => { const t = $('#bkTxt').value; if (!t) { toast('أنشئ الكود أولاً'); return; } try { await navigator.clipboard.writeText(t); toast('نُسخ الكود'); } catch { $('#bkTxt').select(); document.execCommand('copy'); toast('نُسخ الكود'); } };
    $('#bkSh').onclick = () => { const t = $('#bkTxt').value; if (!t) { toast('أنشئ الكود أولاً'); return; } if (N.shareText) N.shareText(t, {}); else if (navigator.share) navigator.share({ text: t }); else toast('انسخ الكود يدوياً'); };
    $('#bkImp').onclick = () => { const t = $('#bkTxt').value.trim(); if (!t.startsWith('ATHARQA1:')) { toast('الكود غير صحيح'); return; } try { const o = JSON.parse(unb64(t.slice(9))); if (!confirm('ستُستبدل بيانات الأكاديمية على هذا الجهاز بما في الكود. متابعة؟')) return; Object.keys(o).filter((k) => KEYS.includes(k)).forEach((k) => localStorage.setItem('noor:' + k, o[k])); toast('تمت الاستعادة، سيُعاد التحميل'); setTimeout(() => location.reload(), 900); } catch { toast('تعذّرت قراءة الكود'); } };
    $('#bkDel').onclick = () => { if (confirm('حذف بيانات الأكاديمية (التقدّم والخطط وجداول المراجعة وملفات الأطفال)؟')) { ['qa:v1', 'qk:v1', 'qa:taj', 'qa:pr', 'qa:cmp'].forEach((k) => localStorage.removeItem('noor:' + k)); toast('حُذفت'); renderPlans(); } };
  }

  Object.assign(routes, {
    qarecs: { title: 'تسجيلاتي والمقارنة', render: renderRecs, back: 'qa' },
    qachat: { title: 'محادثة المعلّم', render: renderChat, back: 'qa' },
    qaplans: { title: 'الباقات والنسخ الاحتياطي', render: renderPlans, back: 'qa' },
  });
});
