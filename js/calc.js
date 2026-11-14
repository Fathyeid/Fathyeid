/* الحاسبات الإسلامية والمعاملات الشرعية — المرحلة الأولى: المواريث، الزكاة بأنواعها، زكاة الفطر.
 * كل الحسابات محلية على الجهاز (لا تحتاج إنترنت) عدا جلب أسعار الذهب والفضة والصرف (اختياري، ويمكن الإدخال يدوياً).
 * الحساب الرياضي ليس فتوى: تُذكر المرجعية والأدلة، وتُعلَّم المسائل التي تحتاج متخصصاً. */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const Fa = window.Faraid;
  const { $, $$, store, toast, go, ar, esc, routes } = N;
  const PRICES = 'https://movodjdwghharkfrgqtv.supabase.co/functions/v1/athar-prices';
  const REVIEW = 'آخر مراجعة للمراجع: جمادى الآخرة ١٤٤٨هـ';
  const CUR = [['EGP', 'جنيه مصري'], ['SAR', 'ريال سعودي'], ['AED', 'درهم إماراتي'], ['KWD', 'دينار كويتي'], ['QAR', 'ريال قطري'], ['JOD', 'دينار أردني'], ['MAD', 'درهم مغربي'], ['DZD', 'دينار جزائري'], ['TND', 'دينار تونسي'], ['IQD', 'دينار عراقي'], ['USD', 'دولار أمريكي'], ['EUR', 'يورو'], ['GBP', 'جنيه إسترليني'], ['TRY', 'ليرة تركية']];
  const num = (v) => { const n = parseFloat(String(v ?? '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫,]/g, '.').replace(/[^\d.\-]/g, '')); return isNaN(n) ? 0 : n; };
  const cur = () => store.get('calc:cur', 'EGP');
  const curName = () => (CUR.find((c) => c[0] === cur()) || [0, cur()])[1];
  const money = (n, d = 2) => `${(Math.round(n * 100) / 100).toLocaleString('ar-EG', { maximumFractionDigits: d })} ${curName()}`;
  const pct = (x) => `${(Math.round(x * 10000) / 100).toLocaleString('ar-EG')}٪`;
  const frac = (f) => (f.n === 0 ? '٠' : f.d === 1 ? ar(f.n) : `${ar(f.n)}/${ar(f.d)}`);

  // ---------- السجل ----------
  const hist = () => store.get('calc:hist', []);
  function saveHist(type, title, input, summary) {
    const H = hist(); const id = input._id || `${type}-${Date.now()}`;
    const i = H.findIndex((x) => x.id === id);
    const rec = { id, type, title, input: Object.assign({}, input, { _id: id }), summary, at: Date.now() };
    if (i >= 0) H.splice(i, 1);
    H.unshift(rec); store.set('calc:hist', H.slice(0, 100));
    return id;
  }

  // ---------- تقرير صورة / PDF ----------
  function drawReport(title, lines) {
    const W = 1240, PAD = 70, LH = 46;
    const pages = []; let cv, ctx, y;
    const newPage = () => { cv = document.createElement('canvas'); cv.width = W; cv.height = 1754; ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, cv.height); ctx.fillStyle = '#0d3b2e'; ctx.fillRect(0, 0, W, 14); ctx.direction = 'rtl'; ctx.textAlign = 'right'; y = 90; pages.push(cv); };
    newPage();
    const iso = (t) => String(t).replace(/[0-9٠-٩][0-9٠-٩٬٫,./]*/g, '\u202D$&\u202C');
    const text = (t, font, color, x = W - PAD) => { ctx.font = font; ctx.fillStyle = color; ctx.fillText(iso(t), x, y); };
    const wrap = (t, font, maxW) => { ctx.font = font; const out = []; let line = ''; String(t).split(' ').forEach((w) => { const tt = line ? line + ' ' + w : w; if (ctx.measureText(tt).width > maxW && line) { out.push(line); line = w; } else line = tt; }); if (line) out.push(line); return out; };
    text('أثر — رفيق المسلم', '30px Tajawal, sans-serif', '#b8913a'); y += 60;
    text(title, 'bold 50px Amiri, serif', '#0d3b2e'); y += 30;
    ctx.fillStyle = '#e5dcc8'; ctx.fillRect(PAD, y, W - 2 * PAD, 3); y += 50;
    lines.forEach((L) => {
      if (y > 1640) newPage();
      if (L.table) {
        const cols = L.table[0].length; const cw = (W - 2 * PAD) / cols;
        L.table.forEach((row, ri) => {
          if (y > 1660) newPage();
          if (ri === 0) { ctx.fillStyle = '#f1eadb'; ctx.fillRect(PAD, y - 34, W - 2 * PAD, 48); }
          row.forEach((c, ci) => { ctx.font = `${ri === 0 ? 'bold ' : ''}26px Tajawal, sans-serif`; ctx.fillStyle = '#1c2a24'; const x = W - PAD - ci * cw - 8; const t = String(c); let s = t; while (ctx.measureText(s).width > cw - 14 && s.length > 3) s = s.slice(0, -2); ctx.fillText(iso(s === t ? t : s + '…'), x, y); });
          y += 46;
        });
        y += 14; return;
      }
      const font = L.b ? 'bold 32px Tajawal, sans-serif' : `${L.s || 28}px Tajawal, sans-serif`;
      wrap(L.t, font, W - 2 * PAD).forEach((ln) => { if (y > 1680) newPage(); text(ln, font, L.c || '#1c2a24'); y += L.b ? LH + 4 : LH - 4; });
      y += L.gap || 6;
    });
    pages.forEach((p, i) => { const c = p.getContext('2d'); c.direction = 'rtl'; c.textAlign = 'center'; c.font = '22px Tajawal, sans-serif'; c.fillStyle = '#8a8f86'; c.fillText(`صفحة \u202D${ar(i + 1)}\u202C من \u202D${ar(pages.length)}\u202C — الحساب إرشادي وليس فتوى؛ راجع أهل العلم في المسائل المشكلة`, W / 2, 1720); });
    return pages;
  }
  function pdfFromCanvases(pages) {
    const enc = new TextEncoder(); const chunks = []; const offs = []; let len = 0;
    const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); body.forEach(push); push('\nendobj\n'); };
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const n = pages.length; const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
    obj(1, ['<< /Type /Catalog /Pages 2 0 R >>']); obj(2, [`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`]);
    pages.forEach((cv, i) => {
      const jpg = atob(cv.toDataURL('image/jpeg', 0.85).split(',')[1]); const bytes = new Uint8Array(jpg.length); for (let k = 0; k < jpg.length; k++) bytes[k] = jpg.charCodeAt(k);
      const p = 3 + i * 3; const W = 595.28, H = 841.89; const cs = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
      obj(p, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${p + 1} 0 R >> >> /Contents ${p + 2} 0 R >>`]);
      obj(p + 1, [`<< /Type /XObject /Subtype /Image /Width ${cv.width} /Height ${cv.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`, bytes, '\nendstream']);
      obj(p + 2, [`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`]);
    });
    const xref = len; const total = 3 + n * 3;
    push(`xref\n0 ${total}\n0000000000 65535 f \n`); for (let i = 1; i < total; i++) push(`${String(offs[i]).padStart(10, '0')} 00000 n \n`);
    push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(chunks, { type: 'application/pdf' });
  }
  async function exportReport(title, lines, kind) {
    try { if (document.fonts) await Promise.all([document.fonts.load('bold 50px Amiri'), document.fonts.load('28px Tajawal')]); } catch { /* */ }
    const pages = drawReport(title, lines);
    const name = `${title.replace(/\s+/g, '-')}`;
    let file;
    if (kind === 'pdf') file = new File([pdfFromCanvases(pages)], `${name}.pdf`, { type: 'application/pdf' });
    else { const blob = await new Promise((r) => pages[0].toBlob(r, 'image/png')); file = new File([blob], `${name}.png`, { type: 'image/png' }); }
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
    toast('تم حفظ التقرير');
  }
  const exportBar = (id) => `<div class="calc-ex" id="${id}"><button class="btn ghost" data-ex="pdf">📄 تقرير PDF</button><button class="btn ghost" data-ex="png">🖼️ صورة</button><button class="btn ghost" data-ex="txt">📤 مشاركة نصية</button></div>`;
  function bindExport(id, title, linesFn, textFn) {
    $$(`#${id} [data-ex]`).forEach((b) => { b.onclick = () => { const k = b.dataset.ex; if (k === 'txt') N.shareText(textFn() + '\n\n— حساب إرشادي من تطبيق أثر، وليس فتوى'); else exportReport(title, linesFn(), k); }; });
  }

  // ---------- الأسعار ----------
  async function prices(force) {
    const c = store.get('calc:prices');
    if (!force && c && Date.now() - c.t < 6 * 36e5) return c.d;
    const r = await fetch(PRICES); if (!r.ok) throw new Error(r.status);
    const d = await r.json(); if (d.error) throw new Error(d.error);
    store.set('calc:prices', { t: Date.now(), d }); return d;
  }
  const curSelect = (id) => `<select id="${id}" class="calc-in">${CUR.map(([k, t]) => `<option value="${k}" ${k === cur() ? 'selected' : ''}>${t}</option>`).join('')}</select>`;

  // ---------- قائمة الحاسبات ----------
  const TOOLS = [
    { k: 'mirath', ic: '⚖️', t: 'حاسبة المواريث والفرائض', d: 'توزيع التركة على الورثة بالفروض والتعصيب والحجب والعول والرد والوصية الواجبة', cat: 'mawarith', ready: 1 },
    { k: 'zakat2', ic: '💰', t: 'حاسبة زكاة المال', d: 'النقود والذهب والفضة وعروض التجارة والأسهم والديون مع النصاب وأسعار اليوم', cat: 'zakat', ready: 1 },
    { k: 'zagri', ic: '🌾', t: 'زكاة الزروع والثمار', d: 'النصاب خمسة أوسق، والواجب العشر أو نصفه حسب السقي', cat: 'zakat', ready: 1 },
    { k: 'zanam', ic: '🐑', t: 'زكاة الأنعام', d: 'الإبل والبقر والغنم السائمة وفق كتاب أبي بكر الصديق', cat: 'zakat', ready: 1 },
    { k: 'zrent', ic: '🏢', t: 'زكاة المستغلات والإيرادات', d: 'العقارات المؤجرة والإيرادات الدورية', cat: 'zakat', ready: 1 },
    { k: 'fitr', ic: '🌙', t: 'زكاة الفطر', d: 'عدد أفراد الأسرة والمقدار طعاماً أو قيمة', cat: 'zakat', ready: 1 },
    { k: 'debts', ic: '📒', t: 'حاسبات الديون والأقساط ورد المظالم', d: 'المرحلة الثانية', cat: 'mal' },
    { k: 'islamic', ic: '🤝', t: 'المرابحة والمضاربة والشراكة والإجارة', d: 'المرحلة الثالثة', cat: 'mal' },
    { k: 'kaffarat', ic: '📿', t: 'الكفارات والفدية والنذور والوصايا والوقف', d: 'المرحلة الرابعة', cat: 'ibadat' },
    { k: 'ibadat', ic: '🕌', t: 'قضاء الصيام والصلوات وحاسبات العبادات', d: 'المرحلة الخامسة', cat: 'ibadat' },
    { k: 'contract', ic: '🔍', t: 'فاحص العقود والمعاملات', d: 'المرحلة السادسة', cat: 'mal' },
  ];
  function renderHub() {
    const H = hist().slice(0, 5);
    const used = store.get('calc:used', {});
    const top = TOOLS.filter((t) => t.ready && used[t.k]).sort((a, b) => used[b.k] - used[a.k]).slice(0, 3);
    N.view.innerHTML = `
      <input class="calc-in calc-search" id="cS" type="search" placeholder="ابحث عن حاسبة: ميراث، ذهب، فطر…">
      ${top.length ? `<h3 class="dash-sec">⭐ الأكثر استخداماً</h3><div class="chips" style="justify-content:flex-start">${top.map((t) => `<button class="chip" data-go="${t.k}">${t.ic} ${t.t}</button>`).join('')}</div>` : ''}
      <div id="cList">${TOOLS.map((t) => `<button class="calc-tool ${t.ready ? '' : 'soon'}" data-go="${t.ready ? t.k : ''}" data-s="${esc(t.t + ' ' + t.d)}"><span class="calc-ic">${t.ic}</span><span><b>${t.t}</b><small>${t.ready ? t.d : `⏳ قريباً — ${t.d}`}</small></span></button>`).join('')}</div>
      ${H.length ? `<h3 class="dash-sec">🕘 آخر العمليات</h3>${H.map((x) => `<button class="btn ghost block" style="margin-bottom:6px;text-align:start" data-h="${x.id}">${esc(x.title)} <small class="muted">— ${new Date(x.at).toLocaleDateString('ar-EG')}</small></button>`).join('')}<button class="btn ghost block" data-go="chist">كل السجل</button>` : ''}
      <div class="card calc-disc"><b>⚠️ تنبيه مهم</b><p>هذه الحاسبات أدوات حساب إرشادية مبنية على أحكام الفقه المعتمدة ومصادرها المذكورة في كل حاسبة، وليست فتوى. المسائل المشكلة أو التي فيها خلاف تُعلَّم، ويُرجع فيها إلى المختصين في الفقه والفرائض أو دار الإفتاء في بلدك. ${REVIEW}.</p></div>`;
    $$('[data-go]', N.view).forEach((b) => { b.onclick = () => { const k = b.dataset.go; if (!k) { toast('ستُضاف في المرحلة القادمة بإذن الله'); return; } const U = store.get('calc:used', {}); U[k] = (U[k] || 0) + 1; store.set('calc:used', U); go(k === 'chist' ? 'chist' : `c/${k}`); }; });
    $$('[data-h]', N.view).forEach((b) => { b.onclick = () => openHist(b.dataset.h); });
    $('#cS').oninput = (e) => { const q = N.normAr(e.target.value.trim()); $$('.calc-tool').forEach((el) => { el.hidden = q && !N.normAr(el.dataset.s).includes(q); }); };
  }
  function openHist(id) { const x = hist().find((r) => r.id === id); if (!x) return; store.set('calc:open', x.input); go(`c/${x.type}`); }
  function renderHist() {
    const H = hist();
    N.view.innerHTML = H.length ? H.map((x) => `<div class="lib-at"><b>${esc(x.title)}</b><small>${new Date(x.at).toLocaleString('ar-EG')} • ${esc(x.summary || '')}</small><div class="lib-at-b"><button class="btn" data-o="${x.id}">فتح وتعديل</button><button class="btn ghost" data-d="${x.id}">🗑 حذف</button></div></div>`).join('') : '<div class="card center muted">لا توجد عمليات محفوظة</div>';
    $$('[data-o]').forEach((b) => { b.onclick = () => openHist(b.dataset.o); });
    $$('[data-d]').forEach((b) => { b.onclick = () => { if (!confirm('حذف هذه العملية؟')) return; store.set('calc:hist', hist().filter((x) => x.id !== b.dataset.d)); renderHist(); }; });
  }
  const takeOpen = (def) => { const o = store.get('calc:open', null); store.set('calc:open', null); return Object.assign({}, def, o || {}); };

  // ================= المواريث =================
  const HEIRS_M = [['husband', 'الزوج', 1], ['wife', 'الزوجات', 4]];
  const HEIRS = [
    ['أصول', [['father', 'الأب', 1], ['mother', 'الأم', 1], ['gf', 'الجد (أبو الأب)', 1], ['gmm', 'الجدة (أم الأم)', 1], ['gmf', 'الجدة (أم الأب)', 1]]],
    ['فروع', [['son', 'الأبناء', 20], ['daughter', 'البنات', 20], ['ss', 'أبناء الابن', 20], ['sd', 'بنات الابن', 20]]],
    ['إخوة', [['b', 'الإخوة الأشقاء', 20], ['z', 'الأخوات الشقيقات', 20], ['pb', 'الإخوة لأب', 20], ['pz', 'الأخوات لأب', 20], ['mb', 'الإخوة لأم', 20], ['mz', 'الأخوات لأم', 20]]],
    ['عصبات أخرى', [['nb', 'أبناء الأخ الشقيق', 20], ['npb', 'أبناء الأخ لأب', 20], ['u', 'الأعمام الأشقاء', 20], ['pu', 'الأعمام لأب', 20], ['cu', 'أبناء العم الشقيق', 20], ['cpu', 'أبناء العم لأب', 20]]],
  ];
  function renderMirath() {
    const S = takeOpen({ total: '', funeral: '', debts: '', will: '', mode: 'egypt', gender: 'm', h: {}, ww: [] });
    let res = null;
    const draw = () => {
      N.view.innerHTML = `
        <div class="card"><h3>١. التركة</h3>
          <div class="calc-row"><label>العملة</label>${curSelect('mC')}</div>
          <div class="calc-row"><label>إجمالي التركة</label><input class="calc-in" id="mT" inputmode="decimal" value="${esc(S.total)}" placeholder="مثال: 1200000"></div>
          <div class="calc-row"><label>مصاريف التجهيز والدفن بالمعروف</label><input class="calc-in" id="mF" inputmode="decimal" value="${esc(S.funeral)}" placeholder="0"></div>
          <div class="calc-row"><label>الديون والحقوق على المتوفى</label><input class="calc-in" id="mD" inputmode="decimal" value="${esc(S.debts)}" placeholder="0"></div>
          <div class="calc-row"><label>الوصية لغير وارث (مبلغ)</label><input class="calc-in" id="mW" inputmode="decimal" value="${esc(S.will)}" placeholder="0"></div>
          <div class="calc-row"><label>المرجعية</label><select class="calc-in" id="mM"><option value="egypt" ${S.mode === 'egypt' ? 'selected' : ''}>قانون المواريث المصري (الجمهور غالباً)</option><option value="hanafi" ${S.mode === 'hanafi' ? 'selected' : ''}>المذهب الحنفي</option></select></div>
        </div>
        <div class="card"><h3>٢. المتوفى والورثة الأحياء</h3>
          <div class="seg" id="mG" style="margin-bottom:10px"><button data-v="m" class="${S.gender === 'm' ? 'active' : ''}">المتوفى رجل</button><button data-v="f" class="${S.gender === 'f' ? 'active' : ''}">المتوفاة امرأة</button></div>
          ${counter(S.gender === 'f' ? HEIRS_M[0] : HEIRS_M[1], S.h)}
          ${HEIRS.map(([g, L]) => `<details class="calc-grp" data-g="${g}" ${(S.open || ['أصول', 'فروع']).includes(g) || L.some(([k]) => S.h[k]) ? 'open' : ''}><summary>${g}</summary>${L.map((x) => counter(x, S.h)).join('')}</details>`).join('')}
          <p class="muted" style="font-size:.8rem;margin:8px 0 0">أدخل الورثة الأحياء وقت الوفاة فقط. ذوو الأرحام (كالخال والعمة وأولاد البنات) غير مدعومين، ويُحالون للمختص.</p>
        </div>
        ${S.mode === 'egypt' ? `<div class="card"><h3>٣. الوصية الواجبة (قانون ٧١ لسنة ١٩٤٦)</h3>
          <p class="muted" style="font-size:.85rem;margin-top:0">لأولاد الابن أو البنت الذي مات قبل المورث أو معه، إن لم يرثوا ولم يُعطَوا مثل نصيب أصلهم.</p>
          <div id="wwList">${S.ww.map((w, i) => `<div class="calc-ww"><select class="calc-in" data-wg="${i}"><option value="son" ${w.g === 'son' ? 'selected' : ''}>ابن متوفى</option><option value="daughter" ${w.g === 'daughter' ? 'selected' : ''}>بنت متوفاة</option></select><input class="calc-in" data-wm="${i}" inputmode="numeric" value="${w.m || ''}" placeholder="أحفاد ذكور"><input class="calc-in" data-wf="${i}" inputmode="numeric" value="${w.f || ''}" placeholder="أحفاد إناث"><button class="chip" data-wx="${i}">✕</button></div>`).join('')}</div>
          <button class="btn ghost block" id="wwAdd">+ إضافة ولد متوفى له أولاد</button></div>` : ''}
        <button class="btn block" id="mGo" style="margin:6px 0 14px">⚖️ احسب توزيع التركة</button>
        <div id="mRes"></div>
        <div class="card calc-src"><b>📚 المرجعية والأدلة</b><ul>
          <li>آيات المواريث: النساء ١١ و١٢ و١٧٦.</li>
          <li>«ألحقوا الفرائض بأهلها، فما بقي فلأولى رجل ذكر» — رواه البخاري (٦٧٣٢) ومسلم (١٦١٥).</li>
          <li>قضاء ابن مسعود رضي الله عنه في البنت وبنت الابن والأخت: للبنت النصف ولبنت الابن السدس والباقي للأخت — رواه البخاري (٦٧٣٦).</li>
          <li>قانون المواريث المصري رقم ٧٧ لسنة ١٩٤٣، وقانون الوصية رقم ٧١ لسنة ١٩٤٦ (الوصية الواجبة).</li>
          <li>المذهب الحنفي: الجد كالأب يحجب الإخوة، ولا تشريك في المسألة المشتركة.</li>
        </ul><small class="muted">${REVIEW}. يُنصح بمراجعة متخصص في علم الفرائض أو دار الإفتاء قبل القسمة الفعلية.</small></div>`;
      $('#mC').onchange = (e) => { store.set('calc:cur', e.target.value); };
      $$('#mG button').forEach((b) => { b.onclick = () => { read(); S.gender = b.dataset.v; delete S.h.husband; delete S.h.wife; draw(); }; });
      $('#mM').onchange = () => { read(); draw(); };
      $$('[data-cm]').forEach((b) => { b.onclick = () => { read(); const k = b.dataset.cm; S.h[k] = Math.max(0, (S.h[k] || 0) - 1); draw(); }; });
      $$('[data-cp]').forEach((b) => { b.onclick = () => { read(); const k = b.dataset.cp; S.h[k] = Math.min(+b.dataset.max, (S.h[k] || 0) + 1); draw(); }; });
      const wa = $('#wwAdd'); if (wa) wa.onclick = () => { read(); S.ww.push({ g: 'son', m: 1, f: 0 }); draw(); };
      $$('[data-wx]').forEach((b) => { b.onclick = () => { read(); S.ww.splice(+b.dataset.wx, 1); draw(); }; });
      $('#mGo').onclick = () => { read(); compute(); };
      if (res) showRes();
    };
    function counter([k, t, max], h) { return `<div class="calc-cnt"><span>${t}</span><button class="chip" data-cm="${k}">−</button><b>${ar(h[k] || 0)}</b><button class="chip" data-cp="${k}" data-max="${max}">+</button></div>`; }
    function read() {
      S.open = $$('details[data-g]').filter((d) => d.open).map((d) => d.dataset.g);
      S.total = $('#mT').value; S.funeral = $('#mF').value; S.debts = $('#mD').value; S.will = $('#mW').value; S.mode = $('#mM').value;
      $$('[data-wg]').forEach((el) => { const i = +el.dataset.wg; S.ww[i] = { g: el.value, m: num($(`[data-wm="${i}"]`).value), f: num($(`[data-wf="${i}"]`).value) }; });
    }
    function compute() {
      const T = num(S.total); const fun = num(S.funeral); const dbt = num(S.debts); const will = num(S.will);
      if (!T) { toast('أدخل إجمالي التركة'); return; }
      const afterDebts = T - fun - dbt;
      if (afterDebts <= 0) { res = { err: 'الديون ومصاريف التجهيز تستغرق التركة كلها؛ فلا ميراث ولا وصية حتى تُسدّد الديون. (الدين مقدَّم على الوصية والميراث — النساء: ١١، وقضاء النبي ﷺ: «الدَّين قبل الوصية» رواه الترمذي ٢٠٩٤ وحسّنه الألباني)' }; showRes(); return; }
      const third = afterDebts / 3;
      const notes = [];
      // الوصية الواجبة
      let wwTotal = 0; const wwRows = [];
      if (S.mode === 'egypt') S.ww.filter((w) => (w.m || 0) + (w.f || 0) > 0).forEach((w) => {
        const h2 = Object.assign({}, S.h); h2[w.g] = (h2[w.g] || 0) + 1;
        const r = Fa.solve(h2, S.mode); const row = r.rows.find((x) => x.k === w.g);
        const part = row ? Fa.val(row.per) * afterDebts : 0;
        if (w.g === 'son' && !(S.h.son > 0)) notes.push('أولاد الابن المتوفى قد يرثون بأنفسهم (أبناء الابن/بنات الابن) عند عدم وجود ابن حي؛ وحينئذ لا وصية واجبة لهم إلا لتكملة نصيب أصلهم. أدخلهم ضمن الورثة وراجع متخصصاً.');
        wwRows.push({ w, part }); wwTotal += part;
      });
      let wwScale = 1; if (wwTotal > third) { wwScale = third / wwTotal; notes.push('الوصية الواجبة لا تزيد على ثلث التركة، فخُفّضت إلى الثلث.'); }
      wwTotal *= wwScale;
      let willOk = will; if (wwTotal + will > third) { willOk = Math.max(0, third - wwTotal); notes.push(`الوصية الاختيارية تزيد على الثلث (بعد الوصية الواجبة)، فنُفّذ منها ${money(willOk)}، والزائد موقوف على إجازة الورثة («الثلث، والثلث كثير» — متفق عليه).`); }
      const net = afterDebts - wwTotal - willOk;
      const r = Fa.solve(S.h, S.mode);
      res = { T, fun, dbt, will, willOk, wwRows: wwRows.map((x) => ({ ...x, part: x.part * wwScale })), wwTotal, net, r, notes };
      const sum = r.rows.map((x) => `${x.name}: ${money(Fa.val(x.share) * net)}`).join('، ');
      S._id = saveHist('mirath', `ميراث — تركة ${money(T, 0)}`, S, sum.slice(0, 120));
      showRes();
      setTimeout(() => { const el = $('#mRes'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 60);
    }
    function showRes() {
      const box = $('#mRes'); if (!box) return;
      if (res.err) { box.innerHTML = `<div class="card calc-warn">${esc(res.err)}</div>`; return; }
      const { r, net } = res;
      const rows = r.rows.map((x) => ({ ...x, amt: Fa.val(x.share) * net }));
      box.innerHTML = `
        <div class="card"><h3>📋 تصفية التركة</h3>
          <div class="pr-extra"><span>إجمالي التركة</span><b>${money(res.T)}</b></div>
          ${res.fun ? `<div class="pr-extra"><span>− التجهيز والدفن</span><b>${money(res.fun)}</b></div>` : ''}
          ${res.dbt ? `<div class="pr-extra"><span>− الديون</span><b>${money(res.dbt)}</b></div>` : ''}
          ${res.wwTotal ? `<div class="pr-extra"><span>− الوصية الواجبة</span><b>${money(res.wwTotal)}</b></div>` : ''}
          ${res.willOk ? `<div class="pr-extra"><span>− الوصية (في حدود الثلث)</span><b>${money(res.willOk)}</b></div>` : ''}
          <div class="pr-extra"><span><b>صافي التركة للورثة</b></span><b>${money(net)}</b></div></div>
        ${res.wwRows.length ? `<div class="card"><h3>🧒 الوصية الواجبة</h3>${res.wwRows.map(({ w, part }) => { const tw = 2 * (w.m || 0) + (w.f || 0); return `<p style="margin:4px 0">أولاد ${w.g === 'son' ? 'الابن' : 'البنت'} المتوفى: ${money(part)} ${tw ? `— ${[w.m ? `لكل حفيد ${money((part * 2) / tw)}` : '', w.f ? `لكل حفيدة ${money(part / tw)}` : ''].filter(Boolean).join(' و')}` : ''}</p>`; }).join('')}<small class="muted">مقدار نصيب أصلهم لو كان حياً، في حدود الثلث، للذكر مثل حظ الأنثيين.</small></div>` : ''}
        <div class="card"><h3>⚖️ توزيع الميراث</h3>
          <p class="muted" style="margin-top:0">أصل المسألة: ${ar(r.asl)}${r.awlTo ? ` • عالت إلى ${ar(Math.round(r.awlTo))}` : ''}${r.radd ? ' • فيها ردّ' : ''} • التصحيح: ${ar(r.tas)} سهماً</p>
          <div class="pt-wrap"><table class="pt calc-t"><thead><tr><th>الوارث</th><th>النصيب</th><th>الأسهم</th><th>النسبة</th><th>المبلغ</th></tr></thead><tbody>
          ${rows.map((x) => `<tr><td><b>${esc(x.name)}</b>${x.count > 1 ? `<small>${ar(x.count)} أشخاص • لكل واحد ${money(x.amt / x.count)}</small>` : ''}<small>${esc(x.type)}</small></td><td>${frac(x.share)}</td><td>${ar(x.sahm)}</td><td>${pct(Fa.val(x.share))}</td><td><b>${money(x.amt)}</b></td></tr>`).join('')}
          </tbody></table></div>
          ${rows.map((x) => `<p class="calc-why"><b>${esc(x.name)}:</b> ${esc(x.reason)}</p>`).join('')}
        </div>
        ${r.blocked.length ? `<div class="card"><h3>🚫 المحجوبون ومن لم يبق لهم شيء</h3>${r.blocked.map((b) => `<p class="calc-why"><b>${esc(b.name)}${b.count > 1 ? ` (${ar(b.count)})` : ''}:</b> ${esc(b.reason)}</p>`).join('')}</div>` : ''}
        ${r.notes.length || res.notes.length ? `<div class="card"><h3>ℹ️ ملاحظات</h3>${[...r.notes, ...res.notes].map((n) => `<p class="calc-why">${esc(n)}</p>`).join('')}</div>` : ''}
        ${r.needsExpert.length ? `<div class="card calc-warn"><b>👨‍⚖️ تحتاج مراجعة متخصص في الفرائض</b>${r.needsExpert.map((n) => `<p class="calc-why">${esc(n)}</p>`).join('')}</div>` : ''}
        ${exportBar('mEx')}
        <div class="card"><b>🔁 المناسخات</b><p class="muted" style="font-size:.85rem">إن مات أحد الورثة قبل القسمة، احسب تركته مستقلة: اضغط على اسمه لتبدأ مسألة جديدة بنصيبه.</p><div class="chips" style="justify-content:flex-start">${rows.filter((x) => x.count === 1).map((x) => `<button class="chip" data-mn="${Math.round(x.amt * 100) / 100}">${esc(x.name)}</button>`).join('')}</div></div>`;
      $$('[data-mn]').forEach((b) => { b.onclick = () => { store.set('calc:open', { total: b.dataset.mn, funeral: '', debts: '', will: '', mode: S.mode, gender: 'm', h: {}, ww: [] }); toast('أضف ورثة هذا المتوفى، وأضف إلى المبلغ تركته الخاصة إن وُجدت'); renderMirath(); window.scrollTo(0, 0); }; });
      const lines = () => [
        { t: [['إجمالي التركة', res.T], ['التجهيز', res.fun], ['الديون', res.dbt], ['الوصية الواجبة', res.wwTotal], ['الوصية', res.willOk]].filter(([, v]) => v).map(([k, v]) => `${k}: ${money(v)}`).join(' — '), s: 26 },
        { t: `صافي التركة للورثة: ${money(net)} • المرجعية: ${S.mode === 'egypt' ? 'قانون المواريث المصري' : 'المذهب الحنفي'}`, b: 1 },
        { t: `أصل المسألة ${ar(r.asl)}${r.awlTo ? ` وعالت إلى ${ar(Math.round(r.awlTo))}` : ''}${r.radd ? '، وفيها رد' : ''}`, s: 26 },
        { table: [['الوارث', 'العدد', 'النصيب', 'النسبة', 'المبلغ'], ...rows.map((x) => [x.name, ar(x.count), frac(x.share), pct(Fa.val(x.share)), money(x.amt)])] },
        ...rows.map((x) => ({ t: `${x.name}: ${x.reason}`, s: 24 })),
        ...(r.blocked.length ? [{ t: "المحجوبون ومن لم يبق لهم شيء:", b: 1 }, ...r.blocked.map((b) => ({ t: `${b.name}: ${b.reason}`, s: 24 }))] : []),
        ...[...r.notes, ...res.notes].map((n) => ({ t: n, s: 24, c: '#555' })),
        ...(r.needsExpert.length ? [{ t: 'تحتاج مراجعة متخصص:', b: 1, c: '#a33' }, ...r.needsExpert.map((n) => ({ t: n, s: 24, c: '#a33' }))] : []),
        { t: 'المراجع: النساء ١١، ١٢، ١٧٦ • البخاري ٦٧٣٢ ومسلم ١٦١٥ • البخاري ٦٧٣٦ • قانون ٧٧ لسنة ١٩٤٣ وقانون ٧١ لسنة ١٩٤٦', s: 22, c: '#666' },
      ];
      bindExport('mEx', 'تقرير توزيع التركة', lines, () => `توزيع التركة — صافي ${money(net)}\n` + rows.map((x) => `• ${x.name}${x.count > 1 ? ` (${x.count})` : ''}: ${frac(x.share)} = ${money(x.amt)}`).join('\n'));
    }
    draw();
  }

  // ================= زكاة المال =================
  function renderZakat() {
    const S = takeOpen({ cash: '', bank: '', g24: '', g22: '', g21: '', g18: '', silver: '', trade: '', tradeRecv: '', tradeDebt: '', stocksTrade: '', stocksInv: '', stocksInvPct: '', recv: '', debts: '', gp: '', sp: '', basis: 'gold', hawl: '' });
    const draw = () => {
      const F = [
        ['💵 النقود', [['cash', 'النقود في اليد'], ['bank', 'أرصدة البنوك والحسابات والودائع']]],
        ['🪙 الذهب (جرام)', [['g24', 'عيار ٢٤'], ['g22', 'عيار ٢٢'], ['g21', 'عيار ٢١'], ['g18', 'عيار ١٨']]],
        ['🥈 الفضة', [['silver', 'الفضة (جرام)']]],
        ['🏪 عروض التجارة', [['trade', 'قيمة البضاعة بسعر البيع اليوم'], ['tradeRecv', 'ديون التجارة المرجوّة عند العملاء'], ['tradeDebt', 'ديون التجارة الحالّة عليك للموردين']]],
        ['📈 الأسهم', [['stocksTrade', 'أسهم للمضاربة/المتاجرة (القيمة السوقية)'], ['stocksInv', 'أسهم للاستثمار طويل الأجل (القيمة السوقية)'], ['stocksInvPct', 'نسبة الأصول الزكوية في الشركة ٪ (من قوائمها، اختياري)']]],
        ['🤝 الديون', [['recv', 'ديون لك على مليء مقرّ (مرجوّة السداد)'], ['debts', 'ديون عليك حالّة الآن']]],
      ];
      N.view.innerHTML = `
        <div class="card"><h3>💱 الأسعار والعملة</h3>
          <div class="calc-row"><label>العملة</label>${curSelect('zC')}</div>
          <div class="calc-row"><label>سعر جرام الذهب عيار ٢٤</label><input class="calc-in" id="z-gp" inputmode="decimal" value="${esc(S.gp)}"></div>
          <div class="calc-row"><label>سعر جرام الفضة</label><input class="calc-in" id="z-sp" inputmode="decimal" value="${esc(S.sp)}"></div>
          <button class="btn ghost block" id="zPr">🔄 جلب أسعار اليوم (تقديرية)</button>
          <small class="muted" id="zPrNote">الأسعار العالمية تقريبية؛ عدّلها لسعر السوق في بلدك قبل الحساب.</small>
          <div class="calc-row" style="margin-top:10px"><label>النصاب على أساس</label><select class="calc-in" id="zB"><option value="gold" ${S.basis === 'gold' ? 'selected' : ''}>الذهب (٨٥ جراماً عيار ٢٤)</option><option value="silver" ${S.basis === 'silver' ? 'selected' : ''}>الفضة (٥٩٥ جراماً) — أحظ للفقراء</option></select></div>
        </div>
        ${F.map(([g, L]) => `<details class="calc-grp card" ${g.includes('النقود') || g.includes('الذهب') ? 'open' : ''}><summary>${g}</summary>${L.map(([k, t]) => `<div class="calc-row"><label>${t}</label><input class="calc-in" id="z-${k}" inputmode="decimal" value="${esc(S[k])}"></div>`).join('')}</details>`).join('')}
        <div class="card"><div class="calc-row"><label>📅 تاريخ بلوغ النصاب (لحساب الحول)</label><input class="calc-in" id="z-hawl" type="date" value="${esc(S.hawl)}"></div><small class="muted" id="zHawl"></small></div>
        <button class="btn block" id="zGo" style="margin:6px 0 14px">💰 احسب الزكاة</button>
        <div id="zRes"></div>
        <div class="card calc-src"><b>📚 المرجعية والأدلة</b><ul>
          <li>«ليس فيما دون خمس أواقٍ صدقة» — رواه البخاري (١٤٤٧) ومسلم (٩٧٩)؛ وخمس أواقٍ من الفضة = ٢٠٠ درهم ≈ ٥٩٥ جراماً.</li>
          <li>نصاب الذهب عشرون ديناراً ≈ ٨٥ جراماً (حديث علي رضي الله عنه — رواه أبو داود ١٥٧٣، وصححه الألباني).</li>
          <li>«وفي الرِّقة ربع العشر» — كتاب أبي بكر الصديق في الصدقة، رواه البخاري (١٤٥٤)؛ أي ٢٫٥٪.</li>
          <li>عروض التجارة تُقوَّم بسعر البيع عند الحول، وهو قول جمهور الفقهاء.</li>
          <li>الأسهم: أسهم المتاجرة تُزكّى بقيمتها السوقية؛ وأسهم الاستثمار تُزكّى بقدر ما يقابلها من أصول زكوية — وفق قرارات مجمع الفقه الإسلامي الدولي (قرار ٢٨ (٣/٤)) ومعيار الزكاة لهيئة المحاسبة والمراجعة (أيوفي).</li>
          <li>ذهب الزينة المستعمل: لا زكاة فيه عند الجمهور (المالكية والشافعية والحنابلة)، وتجب عند الحنفية؛ فأدخله إن كنت تأخذ بالوجوب.</li>
        </ul><small class="muted">${REVIEW}.</small></div>`;
      $('#zC').onchange = (e) => { store.set('calc:cur', e.target.value); read(); S.gp = ''; S.sp = ''; draw(); };
      $('#zPr').onclick = async () => {
        const b = $('#zPr'); b.disabled = true; b.textContent = 'جارٍ الجلب…';
        try { const p = await prices(true); const rate = p.rates[cur()]; if (!rate) throw new Error('cur'); read(); S.gp = (p.goldUsdGram24 * rate).toFixed(2); S.sp = (p.silverUsdGram * rate).toFixed(2); draw(); $('#zPrNote').textContent = `سعر عالمي تقديري (${p.sources.join(' و')}) — ${new Date(p.goldAt).toLocaleString('ar-EG')}. عدّله لسعر السوق المحلي.`; }
        catch { b.disabled = false; b.textContent = '🔄 جلب أسعار اليوم (تقديرية)'; toast('تعذّر جلب الأسعار؛ أدخلها يدوياً'); }
      };
      $('#zGo').onclick = () => { read(); compute(); };
      $('#z-hawl').onchange = () => { read(); hawlNote(); };
      hawlNote();
    };
    const keys = ['cash', 'bank', 'g24', 'g22', 'g21', 'g18', 'silver', 'trade', 'tradeRecv', 'tradeDebt', 'stocksTrade', 'stocksInv', 'stocksInvPct', 'recv', 'debts', 'gp', 'sp', 'hawl'];
    function read() { keys.forEach((k) => { const el = $(`#z-${k}`); if (el) S[k] = el.value; }); S.basis = $('#zB').value; }
    function hawlNote() {
      const el = $('#zHawl'); if (!el) return;
      if (!S.hawl) { el.textContent = 'الحول عام هجري (٣٥٤ يوماً تقريباً) من يوم بلوغ النصاب.'; return; }
      const due = new Date(new Date(S.hawl).getTime() + 354 * 864e5); const left = Math.ceil((due - Date.now()) / 864e5);
      el.textContent = left > 0 ? `يحول الحول تقريباً يوم ${due.toLocaleDateString('ar-EG')} (${N.hijri(due)}) — بعد ${ar(left)} يوماً.` : `حال الحول منذ ${due.toLocaleDateString('ar-EG')}؛ فإن بقي المال فوق النصاب وجبت الزكاة.`;
    }
    function compute() {
      const gp = num(S.gp); const sp = num(S.sp);
      if (!gp && S.basis === 'gold') { toast('أدخل سعر جرام الذهب أو اجلبه'); return; }
      if (!sp && S.basis === 'silver') { toast('أدخل سعر جرام الفضة أو اجلبه'); return; }
      const goldG = num(S.g24) + num(S.g22) * 22 / 24 + num(S.g21) * 21 / 24 + num(S.g18) * 18 / 24;
      const items = [
        ['النقود', num(S.cash)], ['أرصدة البنوك', num(S.bank)], ['الذهب (بما يعادل عيار ٢٤: ' + ar(Math.round(goldG * 100) / 100) + ' جم)', goldG * gp], ['الفضة', num(S.silver) * sp],
        ['عروض التجارة', num(S.trade) + num(S.tradeRecv) - num(S.tradeDebt)], ['أسهم المتاجرة', num(S.stocksTrade)],
        ['أسهم الاستثمار' + (num(S.stocksInvPct) ? ` (${ar(num(S.stocksInvPct))}٪ أصول زكوية)` : ' (كامل القيمة احتياطاً)'), num(S.stocksInv) * (num(S.stocksInvPct) ? num(S.stocksInvPct) / 100 : 1)],
        ['ديون لك مرجوّة', num(S.recv)], ['− ديون عليك حالّة', -num(S.debts)],
      ].filter(([, v]) => v);
      const total = items.reduce((s, [, v]) => s + v, 0);
      const nisab = S.basis === 'gold' ? 85 * gp : 595 * sp;
      const due = total >= nisab && total > 0;
      const zakat = due ? total * 0.025 : 0;
      $('#zRes').innerHTML = `
        <div class="card ${due ? 'calc-ok' : ''}"><h3>📋 النتيجة</h3>
          ${items.map(([t, v]) => `<div class="pr-extra"><span>${esc(t)}</span><b>${money(v)}</b></div>`).join('')}
          <div class="pr-extra"><span><b>الوعاء الزكوي</b></span><b>${money(total)}</b></div>
          <div class="pr-extra"><span>النصاب (${S.basis === 'gold' ? '٨٥ جم ذهب' : '٥٩٥ جم فضة'})</span><b>${money(nisab)}</b></div>
          <p class="calc-big">${due ? `الزكاة الواجبة: <b>${money(zakat)}</b>` : 'لم يبلغ المال النصاب، فلا زكاة عليك الآن'}</p>
          <small class="muted">${due ? 'ربع العشر (٢٫٥٪) من الوعاء، بشرط مرور الحول الهجري على بلوغ النصاب.' : 'إن بلغ المال النصاب لاحقاً يبدأ حوله من يومها.'}</small>
          ${goldG && due ? `<p class="muted" style="font-size:.85rem">إن أخرجت زكاة الذهب ذهباً: ${ar(Math.round(goldG * 0.025 * 100) / 100)} جراماً عيار ٢٤.</p>` : ''}
        </div>${exportBar('zEx')}`;
      S._id = saveHist('zakat2', `زكاة المال — ${money(zakat)}`, S, `الوعاء ${money(total)} • النصاب ${money(nisab)}`);
      const lines = () => [{ t: `العملة: ${curName()} • النصاب على ${S.basis === 'gold' ? 'الذهب ٨٥ جم' : 'الفضة ٥٩٥ جم'} = ${money(nisab)}`, s: 26 }, { table: [['البند', 'القيمة'], ...items.map(([t, v]) => [t, money(v)])] }, { t: `الوعاء الزكوي: ${money(total)}`, b: 1 }, { t: due ? `الزكاة الواجبة (٢٫٥٪): ${money(zakat)}` : 'لم يبلغ المال النصاب', b: 1, c: '#0d3b2e' }, { t: 'المراجع: البخاري ١٤٤٧ ومسلم ٩٧٩ • أبو داود ١٥٧٣ • البخاري ١٤٥٤ • مجمع الفقه الإسلامي قرار ٢٨', s: 22, c: '#666' }];
      bindExport('zEx', 'تقرير زكاة المال', lines, () => `زكاة المال\n${items.map(([t, v]) => `• ${t}: ${money(v)}`).join('\n')}\nالوعاء: ${money(total)} • النصاب: ${money(nisab)}\n${due ? `الزكاة: ${money(zakat)}` : 'لم يبلغ النصاب'}`);
    }
    draw();
  }

  // ================= الزروع والثمار =================
  function renderAgri() {
    const S = takeOpen({ kg: '', price: '', irr: 'rain', cost: '' });
    N.view.innerHTML = `
      <div class="card"><div class="calc-row"><label>كمية المحصول (كجم)</label><input class="calc-in" id="aK" inputmode="decimal" value="${esc(S.kg)}"></div>
        <div class="calc-row"><label>طريقة السقي</label><select class="calc-in" id="aI"><option value="rain" ${S.irr === 'rain' ? 'selected' : ''}>بماء المطر أو الأنهار بلا كلفة — العشر ١٠٪</option><option value="cost" ${S.irr === 'cost' ? 'selected' : ''}>بآلات أو بكلفة — نصف العشر ٥٪</option><option value="mix" ${S.irr === 'mix' ? 'selected' : ''}>مناصفة بين الطريقتين — ثلاثة أرباع العشر ٧٫٥٪</option></select></div>
        <div class="calc-row"><label>سعر الكيلو (اختياري للقيمة)</label><input class="calc-in" id="aP" inputmode="decimal" value="${esc(S.price)}"></div>
        <button class="btn block" id="aGo">🌾 احسب</button></div>
      <div id="aRes"></div>
      <div class="card calc-src"><b>📚 الأدلة</b><ul>
        <li>«فيما سقت السماء والعيون أو كان عَثَرياً العشر، وما سُقي بالنضح نصف العشر» — رواه البخاري (١٤٨٣).</li>
        <li>«ليس فيما دون خمسة أوسق صدقة» — رواه البخاري (١٤٤٧) ومسلم (٩٧٩). الوسق ستون صاعاً، والنصاب ٣٠٠ صاع؛ ويقدّره كثير من المعاصرين بنحو ٦٥٣ كجم من القمح، ويختلف باختلاف المحصول وتقدير الصاع.</li>
        <li>ما سُقي بالطريقتين مناصفة: ثلاثة أرباع العشر عند جمهور الفقهاء.</li>
        <li>تجب عند الجمهور فيما يُقتات ويُدّخر من الحبوب والثمار، وعند أبي حنيفة في كل ما يُقصد بزراعته نماء الأرض؛ فاسأل أهل العلم عن نوع محصولك.</li>
      </ul><small class="muted">${REVIEW}.</small></div>`;
    $('#aGo').onclick = () => {
      S.kg = $('#aK').value; S.irr = $('#aI').value; S.price = $('#aP').value;
      const kg = num(S.kg); const rate = { rain: 0.1, cost: 0.05, mix: 0.075 }[S.irr]; const NIS = 653;
      const due = kg >= NIS; const z = due ? kg * rate : 0;
      $('#aRes').innerHTML = `<div class="card ${due ? 'calc-ok' : ''}"><p class="calc-big">${due ? `الزكاة: <b>${ar(Math.round(z * 100) / 100)} كجم</b>${num(S.price) ? ` ≈ ${money(z * num(S.price))}` : ''}` : `المحصول أقل من النصاب التقديري (${ar(NIS)} كجم) فلا زكاة فيه`}</p><small class="muted">النسبة: ${pct(rate)} • تُخرج يوم الحصاد ولا يُشترط لها الحول («وآتوا حقه يوم حصاده» — الأنعام: ١٤١).</small></div>`;
      saveHist('zagri', `زكاة زروع — ${ar(Math.round(z))} كجم`, S, `${ar(kg)} كجم`);
    };
  }

  // ================= الأنعام =================
  function camels(n) {
    if (n < 5) return null; if (n < 10) return 'شاة واحدة'; if (n < 15) return 'شاتان'; if (n < 20) return 'ثلاث شياه'; if (n < 25) return 'أربع شياه';
    if (n < 36) return 'بنت مخاض (أتمّت سنة)'; if (n < 46) return 'بنت لبون (أتمّت سنتين)'; if (n < 61) return 'حِقّة (أتمّت ثلاث سنين)'; if (n < 76) return 'جَذَعة (أتمّت أربع سنين)';
    if (n < 91) return 'بنتا لبون'; if (n <= 120) return 'حِقّتان';
    // ما زاد على ١٢٠: في كل أربعين بنت لبون وفي كل خمسين حقة — نختار التركيبة التي تستوعب أكبر عدد
    let best = null; for (let h = 0; h * 50 <= n; h++) { const rest = n - h * 50; const b = Math.floor(rest / 40); const cov = h * 50 + b * 40; if (!best || cov > best.cov || (cov === best.cov && h > best.h)) best = { h, b, cov }; }
    return [best.h ? `${ar(best.h)} حِقّة` : '', best.b ? `${ar(best.b)} بنت لبون` : ''].filter(Boolean).join(' و');
  }
  function cattle(n) {
    if (n < 30) return null; if (n < 40) return 'تبيع أو تبيعة (أتمّ سنة)'; if (n < 60) return 'مُسِنّة (أتمّت سنتين)';
    let best = null; for (let m = 0; m * 40 <= n; m++) { const t = Math.floor((n - m * 40) / 30); const cov = m * 40 + t * 30; if (!best || cov > best.cov || (cov === best.cov && m > best.m)) best = { m, t, cov }; }
    return [best.t ? `${ar(best.t)} تبيع` : '', best.m ? `${ar(best.m)} مُسِنّة` : ''].filter(Boolean).join(' و');
  }
  function sheep(n) { if (n < 40) return null; if (n <= 120) return 'شاة واحدة'; if (n <= 200) return 'شاتان'; if (n <= 399) return 'ثلاث شياه'; return `${ar(Math.floor(n / 100))} شياه (في كل مائة شاة)`; }
  function renderAnam() {
    N.view.innerHTML = `
      <div class="card"><div class="calc-row"><label>عدد الإبل</label><input class="calc-in" id="nC" inputmode="numeric"></div>
        <div class="calc-row"><label>عدد البقر والجاموس</label><input class="calc-in" id="nB" inputmode="numeric"></div>
        <div class="calc-row"><label>عدد الغنم والماعز</label><input class="calc-in" id="nS" inputmode="numeric"></div>
        <label class="calc-chk"><input type="checkbox" id="nSa" checked> سائمة (ترعى الكلأ المباح أكثر العام)</label>
        <label class="calc-chk"><input type="checkbox" id="nH" checked> حال عليها الحول</label>
        <button class="btn block" id="nGo">🐑 احسب</button></div>
      <div id="nRes"></div>
      <div class="card calc-src"><b>📚 الأدلة</b><ul>
        <li>كتاب أبي بكر الصديق رضي الله عنه في فريضة الصدقة (الإبل والغنم) — رواه البخاري (١٤٥٤).</li>
        <li>حديث معاذ رضي الله عنه في البقر: «من كل ثلاثين تبيعاً أو تبيعة، ومن كل أربعين مسنّة» — رواه أبو داود (١٥٧٦) والترمذي (٦٢٣) وحسّنه.</li>
        <li>اشتراط السوم: «في صدقة الغنم في سائمتها» — من كتاب أبي بكر عند البخاري؛ والمعلوفة أكثر العام لا زكاة فيها عند الجمهور خلافاً للمالكية. الأنعام المعدّة للتجارة تُزكّى زكاة عروض التجارة.</li>
      </ul><small class="muted">${REVIEW}.</small></div>`;
    $('#nGo').onclick = () => {
      const c = num($('#nC').value); const b = num($('#nB').value); const s = num($('#nS').value);
      if (!$('#nH').checked) { $('#nRes').innerHTML = '<div class="card">لا زكاة حتى يحول الحول.</div>'; return; }
      const R = [['🐪 الإبل', c, camels(c), 'أقل من ٥ فلا زكاة'], ['🐄 البقر', b, cattle(b), 'أقل من ٣٠ فلا زكاة'], ['🐑 الغنم', s, sheep(s), 'أقل من ٤٠ فلا زكاة']].filter((x) => x[1]);
      $('#nRes').innerHTML = `<div class="card">${!$('#nSa').checked ? '<p class="calc-warn">غير السائمة (المعلوفة) لا زكاة فيها عند الجمهور؛ والنتيجة أدناه على قول المالكية بالوجوب.</p>' : ''}${R.map(([t, n, z, no]) => `<div class="pr-extra"><span>${t} (${ar(n)})</span><b>${z || no}</b></div>`).join('') || 'أدخل الأعداد'}</div>`;
    };
  }

  // ================= المستغلات =================
  function renderRent() {
    N.view.innerHTML = `
      <div class="card"><div class="calc-row"><label>صافي الإيراد المتبقي بعد النفقات خلال العام</label><input class="calc-in" id="rI" inputmode="decimal"></div>
        <div class="calc-row"><label>سعر جرام الذهب عيار ٢٤</label><input class="calc-in" id="rG" inputmode="decimal" value="${esc((store.get('calc:prices') && store.get('calc:prices').d.rates[cur()]) ? (store.get('calc:prices').d.goldUsdGram24 * store.get('calc:prices').d.rates[cur()]).toFixed(2) : '')}"></div>
        <button class="btn block" id="rGo">🏢 احسب</button></div>
      <div id="rRes"></div>
      <div class="card calc-src"><b>📚 الحكم</b><ul>
        <li>العقار المؤجَّر نفسه لا زكاة في قيمته عند جمهور الفقهاء والمجامع، وإنما الزكاة في الأجرة إذا بلغت النصاب وحال عليها الحول.</li>
        <li>القول الذي أخذت به أكثر الهيئات المعاصرة (منها قرار مجمع الفقه الإسلامي الدولي ٢ (٢/١)): ضم صافي الأجرة المدّخرة إلى بقية المال وإخراج ربع العشر ٢٫٥٪.</li>
        <li>وهناك قول بقياسها على الزروع (العشر من الصافي) ذكره بعض المعاصرين، وهو مرجوح عند أكثر الهيئات.</li>
      </ul><small class="muted">${REVIEW}.</small></div>`;
    $('#rGo').onclick = () => {
      const inc = num($('#rI').value); const gp = num($('#rG').value); const nis = 85 * gp;
      if (!gp) { toast('أدخل سعر الذهب لمعرفة النصاب'); return; }
      $('#rRes').innerHTML = `<div class="card ${inc >= nis ? 'calc-ok' : ''}"><p class="calc-big">${inc >= nis ? `الزكاة (٢٫٥٪): <b>${money(inc * 0.025)}</b>` : 'الصافي أقل من النصاب منفرداً؛ فاضممه إلى أموالك في حاسبة زكاة المال'}</p><small class="muted">النصاب: ${money(nis)}</small></div>`;
    };
  }

  // ================= زكاة الفطر =================
  function renderFitr() {
    const S = takeOpen({ n: 1, mode: 'food', kg: '2.5', food: 'أرز', cash: '', country: 'مصر' });
    const draw = () => {
      N.view.innerHTML = `
        <div class="card"><h3>👨‍👩‍👧 أفراد الأسرة</h3>
          <div class="calc-cnt"><span>عدد من تُخرج عنهم (نفسك ومن تعولهم)</span><button class="chip" id="fM">−</button><b>${ar(S.n)}</b><button class="chip" id="fP">+</button></div>
          <div class="calc-row"><label>الدولة</label><input class="calc-in" id="fCo" value="${esc(S.country)}"></div>
          <div class="seg" id="fMode" style="margin:10px 0"><button data-v="food" class="${S.mode === 'food' ? 'active' : ''}">🌾 طعاماً (الأصل)</button><button data-v="cash" class="${S.mode === 'cash' ? 'active' : ''}">💵 قيمة نقدية</button></div>
          ${S.mode === 'food' ? `<div class="calc-row"><label>نوع القوت الغالب</label><input class="calc-in" id="fF" value="${esc(S.food)}"></div><div class="calc-row"><label>مقدار الصاع للفرد (كجم)</label><input class="calc-in" id="fK" inputmode="decimal" value="${esc(S.kg)}"></div><small class="muted">الصاع النبوي حجماً يقارب ٢٫٠٤ إلى ٣ كجم بحسب نوع الطعام؛ وقدّرته جهات كثيرة بنحو ٢٫٥ كجم من الأرز، وقدّرته اللجنة الدائمة بالسعودية بنحو ٣ كجم احتياطاً.</small>` : `<div class="calc-row"><label>القيمة عن الفرد (${curName()})</label><input class="calc-in" id="fC" inputmode="decimal" value="${esc(S.cash)}" placeholder="كما تعلنها جهة الفتوى"></div><small class="muted">تعلن دار الإفتاء في مصر (وجهات الفتوى في كل بلد) الحد الأدنى للقيمة كل عام قبيل العيد؛ أدخل القيمة المعلنة لسنتك. إخراج القيمة جائز عند الحنفية وبه تفتي دار الإفتاء المصرية، والجمهور على إخراجها طعاماً.</small>`}
          <button class="btn block" id="fGo" style="margin-top:10px">🌙 احسب</button></div>
        <div id="fRes"></div>
        <div class="card calc-src"><b>📚 الأدلة</b><ul>
          <li>«فرض رسول الله ﷺ زكاة الفطر صاعاً من تمر أو صاعاً من شعير على العبد والحر والذكر والأنثى والصغير والكبير من المسلمين، وأمر بها أن تؤدى قبل خروج الناس إلى الصلاة» — رواه البخاري (١٥٠٣) ومسلم (٩٨٤).</li>
          <li>«فرض رسول الله ﷺ زكاة الفطر طُهرة للصائم من اللغو والرفث وطُعمة للمساكين» — رواه أبو داود (١٦٠٩) وحسّنه الألباني.</li>
        </ul><small class="muted">${REVIEW}.</small></div>`;
      $('#fM').onclick = () => { read(); S.n = Math.max(1, S.n - 1); draw(); };
      $('#fP').onclick = () => { read(); S.n = Math.min(50, S.n + 1); draw(); };
      $$('#fMode button').forEach((b) => { b.onclick = () => { read(); S.mode = b.dataset.v; draw(); }; });
      $('#fGo').onclick = () => { read(); const tot = S.mode === 'food' ? `${ar(Math.round(num(S.kg) * S.n * 100) / 100)} كجم من ${S.food}` : money(num(S.cash) * S.n); $('#fRes').innerHTML = `<div class="card calc-ok"><p class="calc-big">زكاة الفطر عن ${ar(S.n)} ${S.n > 2 && S.n < 11 ? 'أفراد' : 'فرداً'}: <b>${tot}</b></p><small class="muted">تُخرج قبل صلاة العيد، ويجوز تعجيلها قبل العيد بيوم أو يومين (فعل ابن عمر رضي الله عنهما — البخاري ١٥١١).</small></div>`; saveHist('fitr', `زكاة الفطر — ${tot}`, S, S.country); };
    };
    function read() { S.country = $('#fCo').value; if ($('#fF')) { S.food = $('#fF').value; S.kg = $('#fK').value; } if ($('#fC')) S.cash = $('#fC').value; }
    draw();
  }

  const CALCS = { mirath: [renderMirath, 'حاسبة المواريث'], zakat2: [renderZakat, 'زكاة المال'], zagri: [renderAgri, 'زكاة الزروع والثمار'], zanam: [renderAnam, 'زكاة الأنعام'], zrent: [renderRent, 'زكاة المستغلات'], fitr: [renderFitr, 'زكاة الفطر'] };
  Object.assign(routes, {
    calc: { title: 'الحاسبات الإسلامية', render: renderHub, back: 'home' },
    c: { title: 'حاسبة', render: (k) => { const c = CALCS[k]; if (!c) { go('calc'); return; } N.setTitle(c[1]); return c[0](); }, back: 'calc' },
    chist: { title: 'سجل العمليات', render: renderHist, back: 'calc' },
    // الحاسبة القديمة: تُحوَّل إلى الجديدة مع نقل القيم المحفوظة
    zakat: { title: 'زكاة المال', render: () => { const o = store.get('zakat', null); if (o && !store.get('calc:zmig')) { store.set('calc:open', { cash: o.cash, g24: o.g24, g21: o.g21, g18: o.g18, silver: o.silver, gp: o.gp, sp: o.sp, debts: o.debts }); store.set('calc:zmig', 1); } return renderZakat(); }, back: 'calc' },
  });
  N.calc = { exportReport, money, Faraid: Fa, num, cur, curName, curSelect, saveHist, takeOpen, exportBar, bindExport, TOOLS, CALCS, REVIEW, pct, frac, hist };
});
