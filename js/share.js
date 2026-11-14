/* المشاركة الموحّدة: صورة بطاقة أو رابط يفتح المحتوى نفسه داخل التطبيق، أو نص.
 * - في تطبيق أندرويد: قائمة المشاركة الأصلية للهاتف (فيسبوك، واتساب، ماسنجر…) عبر @capacitor/share
 *   (تتطلب نسخة التطبيق ٥ فأحدث؛ النسخ الأقدم تنسخ النص مع الرابط وتطلب التحديث)
 * - في المتصفح: Web Share API، وإلا نسخ/تنزيل
 * - الروابط تمر بصفحات s/ على GitHub Pages (فيها معاينة فيسبوك) ثم تفتح التطبيق على المحتوى نفسه (athar://)
 */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, toast, esc } = N;
  const SITE = 'https://fathyeid.github.io/Fathyeid/';
  const P = () => (window.Capacitor && window.Capacitor.Plugins) || {};
  const nativeShare = () => N.NATIVE && P().Share && P().Filesystem;
  const SIGN = 'تطبيق أثر — صدقة جارية على روح المرحوم عيد فتحي أبو طالب';

  // ---------- الروابط ----------
  function linkFor(route) {
    if (!route) return SITE;
    let m = route.match(/^surah\/(\d+)(?:\/(\d+))?/);
    if (m) return `${SITE}s/q/${m[1]}.html${m[2] ? `?a=${m[2]}` : ''}`;
    m = route.match(/^azcat\/(azkar|duas)\/([\w-]+)(?:\/(\d+))?/);
    if (m) return `${SITE}s/z/${m[1]}-${m[2]}.html${m[3] ? `?i=${m[3]}` : ''}`;
    return `${SITE}s/?r=${encodeURIComponent(route)}`;
  }

  // ---------- بطاقة الصورة ----------
  function wrap(ctx, text, maxW) {
    const out = []; let line = '';
    String(text).split(/\s+/).forEach((w) => { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
    if (line) out.push(line);
    return out;
  }
  async function drawCard({ kind, text, ref }) {
    try { if (document.fonts) await Promise.all([document.fonts.load('48px "Amiri Quran"'), document.fonts.load('bold 48px Amiri'), document.fonts.load('bold 30px Tajawal')]); } catch { /* */ }
    const W = 1080; const H = 1350; const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'); c.direction = 'rtl';
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d1a13'); g.addColorStop(1, '#050a07'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    // زخرفة هندسية خفيفة
    c.strokeStyle = 'rgba(143,220,118,.07)'; c.lineWidth = 2;
    for (let y = -60; y < H + 60; y += 120) for (let x = -60; x < W + 60; x += 120) { c.beginPath(); c.moveTo(x, y - 40); c.lineTo(x + 40, y); c.lineTo(x, y + 40); c.lineTo(x - 40, y); c.closePath(); c.stroke(); }
    // إطار
    c.strokeStyle = 'rgba(143,220,118,.55)'; c.lineWidth = 3; c.strokeRect(46, 46, W - 92, H - 92);
    c.strokeStyle = 'rgba(184,145,58,.6)'; c.lineWidth = 1.5; c.strokeRect(62, 62, W - 124, H - 124);
    c.textAlign = 'center';
    c.fillStyle = '#8fdc76'; c.font = 'bold 34px Tajawal, sans-serif'; c.fillText(kind || '', W / 2, 150);
    // النص الرئيسي بحجم يتكيف مع طوله
    const quran = /آية|قرآن/.test(kind || '');
    const fam = quran ? '"Amiri Quran", Amiri, serif' : 'Amiri, serif';
    let size = 84; let lines; const maxW = W - 220;
    for (; size >= 30; size -= 2) { c.font = `${quran ? '' : 'bold '}${size}px ${fam}`; lines = wrap(c, text, maxW); if (lines.length * size * 1.75 < H - 520) break; }
    const lh = size * 1.75; let y = (H - lines.length * lh) / 2 + size * 0.6;
    c.fillStyle = '#f2f7ee';
    lines.forEach((ln) => { c.fillText(ln, W / 2, y); y += lh; });
    if (ref) { c.fillStyle = '#d6b45c'; c.font = 'bold 32px Tajawal, sans-serif'; c.fillText(ref, W / 2, Math.min(H - 250, y + 30)); }
    // التذييل
    c.fillStyle = 'rgba(143,220,118,.12)'; c.fillRect(62, H - 205, W - 124, 143);
    c.fillStyle = '#8fdc76'; c.font = 'bold 40px Tajawal, sans-serif'; c.fillText('أثر — رفيق المسلم', W / 2, H - 140);
    c.fillStyle = '#c9d6c3'; c.font = '26px Tajawal, sans-serif'; c.fillText('صدقة جارية على روح المرحوم عيد فتحي أبو طالب', W / 2, H - 92);
    return cv;
  }

  // ---------- التنفيذ ----------
  async function sendNative({ text, url, canvas }) {
    const { Share, Filesystem } = P();
    const opts = { title: 'أثر — رفيق المسلم', dialogTitle: 'مشاركة عبر' };
    if (text) opts.text = text;
    if (url) opts.url = url;
    if (canvas) {
      const data = canvas.toDataURL('image/png').split(',')[1];
      const f = await Filesystem.writeFile({ path: `athar-share-${Date.now()}.png`, data, directory: 'CACHE' });
      opts.files = [f.uri];
      delete opts.url; // فيسبوك يأخذ صورة أو رابطاً، والرابط مذكور في النص
    }
    await Share.share(opts);
  }
  async function sendWeb({ text, url, canvas }) {
    if (canvas) {
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      const file = new File([blob], 'athar.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'athar.png'; document.body.appendChild(a); a.click(); a.remove();
      toast('حُفظت الصورة؛ يمكنك مشاركتها من معرض الصور');
      return;
    }
    if (navigator.share) { await navigator.share(url ? { text, url } : { text }); return; }
    await navigator.clipboard.writeText([text, url].filter(Boolean).join('\n'));
    toast('تم نسخ النص والرابط');
  }
  async function send(o) {
    try {
      if (nativeShare()) return await sendNative(o);
      if (N.NATIVE) { // نسخة تطبيق قديمة بلا مكوّن المشاركة: ننسخ ونعرض تحديثاً اختيارياً
        try { await navigator.clipboard.writeText([o.text, o.url].filter(Boolean).join('\n')); } catch { /* */ }
        const sh = N.sheet(`<div class="sheet-title">تم نسخ النص والرابط ✓</div>
          <p class="muted" style="line-height:1.9">الصقه في فيسبوك أو واتساب. ولتظهر لك قائمة المشاركة مباشرة مع صورة جاهزة، ثبّت النسخة الجديدة من التطبيق مرة واحدة (بياناتك محفوظة).</p>
          <a class="btn block" id="shUp" href="https://github.com/Fathyeid/Fathyeid/releases/latest/download/athar.apk" target="_blank" rel="noopener">⬇️ تحميل النسخة الجديدة</a>`);
        $('#shUp', sh.el).onclick = () => setTimeout(sh.close, 300);
        return;
      }
      return await sendWeb(o);
    } catch (e) {
      if (e && (e.name === 'AbortError' || /cancel/i.test(String(e.message || e)))) return;
      try { await navigator.clipboard.writeText([o.text, o.url].filter(Boolean).join('\n')); toast('تم النسخ'); } catch { toast('تعذّرت المشاركة'); }
    }
  }

  /** مشاركة عامة: text نص، opts.route مسار يُفتح عند الضغط على الرابط، opts.card {kind,text,ref} لبطاقة الصورة */
  async function share(text, opts = {}) {
    const url = opts.route ? linkFor(opts.route) : null;
    const body = (opts.clean || text || '').trim();
    const signed = /من تطبيق أثر|تطبيق أثر —/.test(body);
    const caption = `${body}${url ? `\n\n${opts.card ? 'اقرأ في التطبيق' : 'افتحه في التطبيق'}: ${url}` : ''}${signed ? '' : `\n\n${SIGN}`}`;
    if (!opts.card) return send({ text: caption, url: null });
    const sh = N.sheet(`<div class="sheet-title">مشاركة</div>
      <div class="share-prev"><canvas id="shCv"></canvas></div>
      <div class="share-opts">
        <button class="btn" data-s="img">🖼️ صورة</button>
        <button class="btn ghost" data-s="link">🔗 رابط</button>
        <button class="btn ghost" data-s="txt">📋 نسخ النص</button>
      </div>
      <p class="muted share-note">الصورة تظهر كمنشور جميل، والرابط يفتح ${esc(opts.card.kind || 'المحتوى')} نفسه داخل تطبيق أثر لمن يضغط عليه.</p>`);
    const cv = await drawCard(opts.card);
    const pv = $('#shCv', sh.el); pv.width = cv.width; pv.height = cv.height; pv.getContext('2d').drawImage(cv, 0, 0);
    $('[data-s="img"]', sh.el).onclick = () => { sh.close(); send({ text: caption, canvas: cv }); };
    $('[data-s="link"]', sh.el).onclick = () => { sh.close(); send({ text: `${opts.card.kind ? `${opts.card.kind}${opts.card.ref ? ` — ${opts.card.ref}` : ''}` : ''}\n${url || SITE}`, url: url || SITE }); };
    $('[data-s="txt"]', sh.el).onclick = async () => { sh.close(); try { await navigator.clipboard.writeText(caption); toast('تم نسخ النص مع الرابط'); } catch { toast('تعذّر النسخ'); } };
  }
  window.NoorShare = share;
  N.share = share; N.shareLink = linkFor; N.shareSite = SITE;

  // ---------- فتح الروابط داخل التطبيق (athar://open?r=…) ----------
  function openUrl(u) {
    try {
      const url = new URL(u);
      const r = url.searchParams.get('r');
      if (r && /^[\w\-/%.]+$/.test(r)) N.go(decodeURIComponent(r));
    } catch { /* */ }
  }
  const App = P().App;
  if (N.NATIVE && App) {
    try { App.addListener('appUrlOpen', (e) => openUrl(e.url)); } catch { /* */ }
    try { App.getLaunchUrl().then((r) => { if (r && r.url) setTimeout(() => openUrl(r.url), 400); }); } catch { /* */ }
  }
});
