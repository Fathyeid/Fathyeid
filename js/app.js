/* نور - رفيق المسلم | المنطق الرئيسي للتطبيق */
(() => {
  'use strict';

  // ---------- أدوات مساعدة ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const view = $('#view');
  const ar = (n) => Number(n).toLocaleString('ar-EG', { useGrouping: false });
  const arG = (n) => Number(n).toLocaleString('ar-EG');
  const pad = (n) => String(n).padStart(2, '0');
  const toAr = (s) => String(s).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const store = {
    get(k, d) { try { const v = localStorage.getItem('noor:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('noor:' + k, JSON.stringify(v)); } catch { /* تجاهل */ } },
  };

  const DEFAULTS = {
    location: { name: 'القاهرة', lat: 30.0444, lng: 31.2357, tz: 'Africa/Cairo' },
    method: 'egypt',
    asr: 1,
    theme: 'light',
    qsize: 1.6,
    reciter: 'ar.alafasy',
    repeat: 1,
    translation: '',
    alerts: false,
  };
  const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (NATIVE) DEFAULTS.alerts = true;
  const settings = Object.assign({}, DEFAULTS, store.get('settings', {}));
  // الثيم الفاتح هو الافتراضي؛ من لم يختر ثيماً بنفسه ينتقل إلى الفاتح
  if (settings.theme === 'auto' && !store.get('themeChosen', false)) settings.theme = 'light';
  const saveSettings = () => { store.set('settings', settings); if (typeof scheduleAdhan === 'function') scheduleAdhan(); };

  const RECITERS = {
    'ar.alafasy': { name: 'مشاري راشد العفاسي', br: 128 },
    'ar.husary': { name: 'محمود خليل الحصري', br: 128 },
    'ar.minshawi': { name: 'محمد صديق المنشاوي', br: 128 },
    'ar.abdulbasitmurattal': { name: 'عبد الباسط عبد الصمد', br: 192 },
    'ar.mahermuaiqly': { name: 'ماهر المعيقلي', br: 128 },
  };

  const TRANSLATIONS = {
    '': 'بدون ترجمة',
    'en.sahih': 'English — Saheeh International',
    'fr.hamidullah': 'Français — Hamidullah',
    'de.bubenheim': 'Deutsch — Bubenheim',
    'es.cortes': 'Español — Cortés',
    'tr.diyanet': 'Türkçe — Diyanet',
    'id.indonesian': 'Bahasa Indonesia',
    'ur.jalandhry': 'اردو — جالندھری',
  };

  const PRAYERS = [
    { key: 'fajr', name: 'الفجر', ic: '🌅' },
    { key: 'sunrise', name: 'الشروق', ic: '☀️', sun: true },
    { key: 'dhuhr', name: 'الظهر', ic: '🌞' },
    { key: 'asr', name: 'العصر', ic: '🌤️' },
    { key: 'maghrib', name: 'المغرب', ic: '🌇' },
    { key: 'isha', name: 'العشاء', ic: '🌙' },
  ];

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function applyTheme() {
    const dark = settings.theme === 'dark' || (settings.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('meta[name="theme-color"]').content = dark ? '#0b1512' : '#0d3b2e';
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  // ---------- التاريخ والمواقيت ----------
  const tz = () => settings.location.tz || undefined;

  function ymdIn(date, timeZone) {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const g = (t) => +p.find((x) => x.type === t).value;
    return [g('year'), g('month'), g('day')];
  }

  function timesFor(date) {
    const [y, m, d] = ymdIn(date, tz());
    const { lat, lng } = settings.location;
    return PrayTimes.compute(y, m, d, lat, lng, settings.method, settings.asr);
  }

  const fmtTime = (d) => d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', timeZone: tz() });
  const hijri = (d) => {
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric', timeZone: tz() }).format(d);
    } catch { return ''; }
  };
  const greg = (d) => d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz() });

  function nextPrayer(now = new Date()) {
    const t = timesFor(now);
    for (const p of PRAYERS) {
      if (p.sun) continue;
      if (t[p.key] > now) return { ...p, time: t[p.key] };
    }
    const tomorrow = new Date(now.getTime() + 86400000);
    return { ...PRAYERS[0], time: timesFor(tomorrow).fajr };
  }

  function countdown(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return toAr(`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`);
  }

  const dayIndex = () => Math.floor(Date.now() / 86400000);

  // ---------- الموجّه (Router) ----------
  const routes = {
    home: { title: 'نور', render: renderHome },
    prayers: { title: 'مواقيت الصلاة', render: renderPrayers },
    quran: { title: 'القرآن الكريم', render: renderQuran },
    surah: { title: 'القرآن الكريم', render: renderSurah, back: 'quran' },
    azkar: { title: 'الأذكار', render: renderAzkarList },
    zikr: { title: 'الأذكار', render: renderAzkar, back: 'azkar' },
    tasbih: { title: 'السبحة الإلكترونية', render: renderTasbih },
    qibla: { title: 'اتجاه القبلة', render: renderQibla, back: 'home' },
    names: { title: 'أسماء الله الحسنى', render: renderNames, back: 'home' },
    settings: { title: 'الإعدادات', render: renderSettings, back: 'home' },
    juz: { title: 'القرآن الكريم', render: renderJuz, back: 'quran' },
    khatma: { title: 'ختمة القرآن', render: renderKhatma, back: 'home' },
    tracker: { title: 'متابعة الصلوات', render: renderTracker, back: 'home' },
    calendar: { title: 'التقويم الهجري', render: renderCalendar, back: 'home' },
    zakat: { title: 'حاسبة الزكاة', render: renderZakat, back: 'home' },
    bookmarks: { title: 'العلامات المحفوظة', render: renderBookmarks, back: 'home' },
  };

  let cleanup = null;
  function router() {
    const [name, arg, arg2] = (location.hash.slice(2) || 'home').split('/');
    const route = routes[name] || routes.home;
    if (cleanup) { cleanup(); cleanup = null; }
    $$('.sheet-backdrop').forEach((e) => e.remove());
    $('#pageTitle').textContent = route.title;
    $('#backBtn').hidden = !route.back;
    $('#backBtn').onclick = () => history.length > 1 ? history.back() : go(route.back);
    const tab = { surah: 'quran', juz: 'quran', zikr: 'azkar', audio: 'quran', reciter: 'quran', player: 'quran', compare: 'quran', playlist: 'quran', repeat: 'quran' }[name] || name;
    $$('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.route === tab));
    view.innerHTML = '';
    view.className = 'fade-in';
    void view.offsetWidth;
    cleanup = route.render(arg, arg2) || null;
    window.scrollTo(0, 0);
  }
  const go = (r) => { location.hash = '#/' + r; };

  $$('#tabbar button').forEach((b) => b.addEventListener('click', () => go(b.dataset.route)));
  $('#settingsBtn').addEventListener('click', () => go('settings'));
  window.addEventListener('hashchange', router);

  // ---------- الرئيسية ----------
  function renderHome() {
    const now = new Date();
    const ayah = DAILY_AYAT[dayIndex() % DAILY_AYAT.length];
    const hadith = DAILY_HADITH[dayIndex() % DAILY_HADITH.length];
    const hour = +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: tz() }).format(now);
    const zikrKey = hour >= 4 && hour < 12 ? 'morning' : 'evening';
    const last = store.get('lastRead');

    view.innerHTML = `
      <section class="hero">
        <div class="dates"><span class="hijri">${hijri(now)}</span><span>${greg(now)}</span></div>
        <div class="next-label">الصلاة القادمة</div>
        <div class="next-name" id="nextName"></div>
        <div class="countdown" id="cd"></div>
        <div class="loc"><svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>${esc(settings.location.name)}</div>
      </section>

      <section class="dedication">
        <img class="ded-photo" src="icons/father.jpg" alt="المرحوم عيد فتحي أبو طالب" width="112" height="112">
        <div class="ded-label">صدقة جارية على روح</div>
        <div class="ded-name">المرحوم بإذن الله<br>عيد فتحي أبو طالب</div>
        <p class="ded-dua">اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ، وَعَافِهِ وَاعْفُ عَنْهُ، وَأَكْرِمْ نُزُلَهُ، وَوَسِّعْ مُدْخَلَهُ، وَاغْسِلْهُ بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ</p>
        <div class="ded-actions">
          <button class="btn ded-btn" data-go="zikr/deceased">🤲 أدعية للمتوفى</button>
        </div>
      </section>

      <div class="grid">
        <button class="tile" data-go="quran"><span class="ic">📖</span>القرآن</button>
        <button class="tile" data-go="audio"><span class="ic">🎧</span>المكتبة الصوتية</button>
        <button class="tile" data-go="academy"><span class="ic">🎓</span>الأكاديمية</button>
        <button class="tile" data-go="zikr/${zikrKey}"><span class="ic">${AZKAR[zikrKey].icon}</span>${AZKAR[zikrKey].title}</button>
        <button class="tile" data-go="prayers"><span class="ic">🕌</span>المواقيت</button>
        <button class="tile" data-go="tasbih"><span class="ic">📿</span>السبحة</button>
        <button class="tile" data-go="qibla"><span class="ic">🧭</span>القبلة</button>
        <button class="tile" data-go="names"><span class="ic">✨</span>الأسماء الحسنى</button>
        <button class="tile" data-go="khatma"><span class="ic">📗</span>ختمة القرآن</button>
        <button class="tile" data-go="tracker"><span class="ic">✅</span>متابعة الصلوات</button>
        <button class="tile" data-go="calendar"><span class="ic">📅</span>التقويم الهجري</button>
        <button class="tile" data-go="zikr/duas"><span class="ic">🤲</span>أدعية قرآنية</button>
        <button class="tile" data-go="zakat"><span class="ic">💰</span>حاسبة الزكاة</button>
        <button class="tile" data-go="bookmarks"><span class="ic">🔖</span>العلامات</button>
      </div>

      <div id="homeExtras"></div>

      ${last ? `<div class="card continue"><div><small class="muted">متابعة القراءة</small><br><b>${esc(last.name)}</b> <small class="muted">— الآية ${ar(last.ayah)}</small></div><button class="btn" data-go="surah/${last.n}">متابعة</button></div>` : ''}

      <div class="card"><h3>📖 آية اليوم</h3><p class="ayah-text">﴿${ayah.text}﴾</p><div class="ref">${ayah.ref}</div></div>
      <div class="card"><h3>💬 حديث اليوم</h3><p class="hadith-text">«${hadith.text}»</p><div class="ref">${hadith.ref}</div></div>
    `;
    $$('[data-go]', view).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
    (window.Noor.homeExtras || []).forEach((fn) => { try { fn($('#homeExtras')); } catch (e) { console.error(e); } });

    let np = nextPrayer();
    const tick = () => {
      const n = new Date();
      if (n >= np.time) np = nextPrayer(n);
      $('#nextName').textContent = `${np.name} • ${fmtTime(np.time)}`;
      $('#cd').textContent = countdown(np.time - n);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }

  // ---------- مواقيت الصلاة ----------
  function renderPrayers() {
    let offset = 0;
    const draw = () => {
      const now = new Date();
      const date = new Date(now.getTime() + offset * 86400000);
      const t = timesFor(date);
      const np = offset === 0 ? nextPrayer(now) : null;
      view.innerHTML = `
        <div class="date-nav">
          <button class="icon-btn" id="prev" aria-label="اليوم السابق"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>
          <div class="d"><b>${offset === 0 ? 'اليوم' : greg(date)}</b><small>${hijri(date)}</small></div>
          <button class="icon-btn" id="next" aria-label="اليوم التالي"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
        </div>
        <div class="prayer-list">
          ${PRAYERS.map((p) => {
            const cls = [p.sun ? 'sun' : '', np && np.key === p.key && np.time.getTime() === t[p.key].getTime() ? 'next' : '', offset === 0 && t[p.key] < now ? 'passed' : ''].join(' ');
            return `<div class="prayer-row ${cls}"><span class="p-ic">${p.ic}</span><span class="p-name">${p.name}</span><span class="p-time">${fmtTime(t[p.key])}</span></div>`;
          }).join('')}
        </div>
        <div class="card" style="margin-top:16px">
          <div class="muted" style="font-size:.85rem">📍 ${esc(settings.location.name)} · ${PrayTimes.METHODS[settings.method].name} · العصر: ${settings.asr === 2 ? 'الحنفي' : 'الجمهور'}</div>
          <button class="btn ghost block" style="margin-top:10px" id="toSettings">تغيير الموقع وطريقة الحساب</button>
        </div>`;
      $('#prev').onclick = () => { offset--; draw(); };
      $('#next').onclick = () => { offset++; draw(); };
      $('#toSettings').onclick = () => go('settings');
    };
    draw();
  }

  // ---------- القرآن الكريم ----------
  const API = 'https://api.alquran.cloud/v1';
  async function fetchJSON(url, cacheKey) {
    const cached = cacheKey && store.get(cacheKey);
    if (cached) return cached;
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const json = await res.json();
    if (cacheKey) store.set(cacheKey, json.data);
    return json.data;
  }
  const errorBox = (retry) => {
    view.innerHTML = `<div class="card center"><p>تعذّر تحميل البيانات. تأكد من اتصالك بالإنترنت.</p><button class="btn" id="retry">إعادة المحاولة</button></div>`;
    $('#retry').onclick = retry;
  };

  const normAr = (t) => t.replace(/[ً-ٰٟۖ-ۭ]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  let quranMode = 'surah';
  function renderQuran() {
    view.innerHTML = '<div class="loader"></div>';
    let alive = true;
    fetchJSON(`${API}/surah`, 'surahList').then((list) => {
      if (!alive) return;
      const last = store.get('lastRead');
      view.innerHTML = `
        ${last ? `<div class="card continue"><div><small class="muted">آخر قراءة</small><br><b>${esc(last.name)}</b> <small class="muted">— الآية ${ar(last.ayah)}</small></div><button class="btn" id="cont">متابعة</button></div>` : ''}
        <div class="seg" id="qmode" style="margin-bottom:14px"><button data-m="surah">السور</button><button data-m="juz">الأجزاء</button><button data-m="search">بحث في الآيات</button></div>
        <div id="qbody"></div>`;
      if (last) $('#cont').onclick = () => go(`surah/${last.n}/${last.ayah}`);
      const body = $('#qbody');

      const surahMode = () => {
        body.innerHTML = `<input class="search" id="q" type="search" placeholder="ابحث عن سورة بالاسم أو الرقم..."><div class="card" style="padding:4px" id="list"></div>`;
        const draw = (q = '') => {
          const nq = normAr(q.trim());
          $('#list').innerHTML = list
            .filter((s) => !nq || normAr(s.name).includes(nq) || String(s.number) === q.trim() || ar(s.number) === q.trim())
            .map((s) => `<button class="surah-item" data-n="${s.number}"><span class="surah-num">${ar(s.number)}</span><span class="surah-info"><b>${s.name}</b><small>${s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · ${ar(s.numberOfAyahs)} آية</small></span></button>`)
            .join('') || '<p class="center muted">لا توجد نتائج</p>';
          $$('.surah-item', body).forEach((b) => b.addEventListener('click', () => go(`surah/${b.dataset.n}`)));
        };
        draw();
        $('#q').addEventListener('input', (e) => draw(e.target.value));
      };

      const juzMode = () => {
        const k = khatmaState();
        body.innerHTML = `<div class="card" style="padding:4px">${JUZ_NAMES.map((nm, i) => `<button class="surah-item" data-j="${i + 1}"><span class="surah-num">${ar(i + 1)}</span><span class="surah-info"><b>${nm}</b><small>الجزء ${ar(i + 1)}${k.done[i] ? ' · ✓ مقروء في الختمة' : ''}</small></span></button>`).join('')}</div>`;
        $$('[data-j]', body).forEach((b) => b.addEventListener('click', () => go(`juz/${b.dataset.j}`)));
      };

      const searchMode = () => {
        body.innerHTML = `<form id="sf" style="display:flex;gap:8px"><input class="search" id="sq" type="search" placeholder="اكتب كلمة من الآية... مثال: الصبر" style="margin:0"><button class="btn" type="submit">بحث</button></form><div id="sres" style="margin-top:14px"></div>`;
        $('#sf').addEventListener('submit', async (e) => {
          e.preventDefault();
          const q = normAr($('#sq').value.trim());
          if (q.length < 2) return toast('اكتب كلمتين أو حرفين على الأقل');
          const out = $('#sres');
          out.innerHTML = '<div class="loader"></div>';
          try {
            const res = await fetch(`${API}/search/${encodeURIComponent(q)}/all/quran-simple-clean`);
            const json = res.ok ? await res.json() : null;
            const m = (json && json.data && json.data.matches) || [];
            if (!m.length) { out.innerHTML = '<p class="center muted">لا توجد نتائج</p>'; return; }
            const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            out.innerHTML = `<p class="muted" style="font-size:.85rem">${arG(m.length)} نتيجة${m.length > 100 ? ' (أول ١٠٠)' : ''}</p>` + m.slice(0, 100).map((x) =>
              `<button class="card result" data-s="${x.surah.number}" data-a="${x.numberInSurah}"><p>${esc(x.text).replace(re, '<mark>$&</mark>')}</p><small class="muted">${x.surah.name} · الآية ${ar(x.numberInSurah)}</small></button>`).join('');
            $$('.result', out).forEach((b) => b.addEventListener('click', () => go(`surah/${b.dataset.s}/${b.dataset.a}`)));
          } catch { out.innerHTML = '<p class="center muted">تعذّر البحث، تأكد من الاتصال بالإنترنت.</p>'; }
        });
        $('#sq').focus();
      };

      const setMode = (m) => {
        quranMode = m;
        $$('#qmode button').forEach((b) => b.classList.toggle('active', b.dataset.m === m));
        ({ surah: surahMode, juz: juzMode, search: searchMode })[m]();
      };
      $$('#qmode button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.m)));
      setMode(quranMode);
    }).catch(() => alive && errorBox(renderQuran));
    return () => { alive = false; };
  }

  // ---------- أدوات الآيات: العلامات والمشاركة ونافذة الخيارات ----------
  const getBM = () => store.get('bookmarks', []);
  const isBM = (n, a) => getBM().some((b) => b.n === n && b.ayah === a);
  function toggleBM(item) {
    const bm = getBM();
    const i = bm.findIndex((b) => b.n === item.n && b.ayah === item.ayah);
    if (i >= 0) { bm.splice(i, 1); toast('أُزيلت العلامة'); } else { bm.unshift({ ...item, t: Date.now() }); toast('تم حفظ العلامة 🔖'); }
    store.set('bookmarks', bm);
    return i < 0;
  }
  async function shareText(text) {
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('تم نسخ النص'); } catch { toast('تعذّر النسخ'); }
  }
  const APP_SIGN = () => `\n\nمن تطبيق نور - صدقة جارية على روح المرحوم عيد فتحي أبو طالب\n${location.origin}${location.pathname}`;
  function sheet(html) {
    const bd = document.createElement('div');
    bd.className = 'sheet-backdrop';
    bd.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-handle"></div>${html}</div>`;
    document.body.appendChild(bd);
    requestAnimationFrame(() => bd.classList.add('open'));
    const close = () => { bd.classList.remove('open'); setTimeout(() => bd.remove(), 250); };
    bd.addEventListener('click', (e) => { if (e.target === bd) close(); });
    return { el: $('.sheet', bd), close };
  }

  function renderSurah(arg, arg2) {
    const n = Math.min(114, Math.max(1, parseInt(arg, 10) || 1));
    view.innerHTML = '<div class="loader"></div>';
    let alive = true;
    const audio = new Audio();
    audio.preload = 'auto';
    const onExclusive = (e) => { if (e.detail !== 'surah') audio.pause(); };
    window.addEventListener('noor:audio', onExclusive);

    fetchJSON(`${API}/surah/${n}/quran-uthmani`, `surah:${n}`).then((s) => {
      if (!alive) return;
      $('#pageTitle').textContent = s.name;
      const ayahs = s.ayahs.map((a, i) => {
        let text = a.text;
        if (i === 0 && n !== 1 && n !== 9 && /^بِسْمِ|^بِسۡمِ/.test(text)) text = text.split(' ').slice(4).join(' ');
        return { ...a, text };
      });
      const last = store.get('lastRead');
      view.innerHTML = `
        <div class="player">
          <button class="icon-btn" id="play" aria-label="تشغيل"></button>
          <div class="p-info"><b id="pState">استماع</b><small class="muted">${RECITERS[settings.reciter].name}</small></div>
          <select id="rep" class="rep" aria-label="تكرار الآية للحفظ">${[1, 3, 5, 10].map((v) => `<option value="${v}" ${v === settings.repeat ? 'selected' : ''}>${v === 1 ? 'بدون تكرار' : 'تكرار ×' + ar(v)}</option>`).join('')}</select>
          <button class="icon-btn" id="fminus" aria-label="تصغير الخط">ـأ</button>
          <button class="icon-btn" id="fplus" aria-label="تكبير الخط">أ+</button>
        </div>
        <article class="mushaf">
          <div class="surah-header"><h2>${s.name}</h2><small>${s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · ${ar(s.numberOfAyahs)} آية</small></div>
          ${n !== 1 && n !== 9 ? '<div class="basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>' : ''}
          <p class="quran-text" id="qt">${ayahs.map((a, i) => `<span class="ayah" data-i="${i}">${a.text}</span> <span class="ayah-num">${ar(a.numberInSurah)}</span> `).join('')}</p>
        </article>
        <div style="display:flex;gap:10px;margin-top:14px">
          ${n > 1 ? `<button class="btn ghost block" data-go="surah/${n - 1}">→ السورة السابقة</button>` : ''}
          ${n < 114 ? `<button class="btn ghost block" data-go="surah/${n + 1}">السورة التالية ←</button>` : ''}
        </div>`;
      $$('[data-go]', view).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
      document.documentElement.style.setProperty('--qsize', settings.qsize + 'rem');
      const setSize = (d) => { settings.qsize = Math.min(3, Math.max(1.1, +(settings.qsize + d).toFixed(1))); saveSettings(); document.documentElement.style.setProperty('--qsize', settings.qsize + 'rem'); };
      $('#fplus').onclick = () => setSize(0.15);
      $('#fminus').onclick = () => setSize(-0.15);

      let cur = -1;
      const playIcon = '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z" fill="currentColor"/></svg>';
      const pauseIcon = '<svg viewBox="0 0 24 24"><path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor"/></svg>';
      const setBtn = () => { $('#play').innerHTML = audio.paused ? playIcon : pauseIcon; };
      setBtn();
      const mark = (i, scroll) => {
        $$('.ayah.active').forEach((e) => e.classList.remove('active'));
        const el = $(`.ayah[data-i="${i}"]`);
        if (el) { el.classList.add('active'); if (scroll) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        store.set('lastRead', { n, name: s.name, ayah: ayahs[i].numberInSurah });
      };
      let rep = 0;
      $('#rep').onchange = (e) => { settings.repeat = +e.target.value; saveSettings(); toast(settings.repeat > 1 ? `وضع الحفظ: كل آية ${ar(settings.repeat)} مرات` : 'تم إلغاء التكرار'); };
      const playAt = (i) => {
        rep = 0;
        if (i >= ayahs.length) { cur = -1; $('#pState').textContent = 'انتهت التلاوة'; setBtn(); return; }
        cur = i;
        const r = RECITERS[settings.reciter];
        audio.src = `https://cdn.islamic.network/quran/audio/${r.br}/${settings.reciter}/${ayahs[i].number}.mp3`;
        audio.play().catch(() => toast('تعذّر تشغيل الصوت'));
        $('#pState').textContent = `الآية ${ar(ayahs[i].numberInSurah)}`;
        mark(i, true);
      };
      audio.onended = () => {
        rep++;
        if (rep < (settings.repeat || 1)) { audio.currentTime = 0; audio.play().catch(() => {}); $('#pState').textContent = `الآية ${ar(ayahs[cur].numberInSurah)} · تكرار ${ar(rep + 1)}`; return; }
        playAt(cur + 1);
      };
      audio.onpause = setBtn;
      audio.onplay = () => { setBtn(); window.dispatchEvent(new CustomEvent('noor:audio', { detail: 'surah' })); };
      $('#play').onclick = () => {
        if (cur < 0) playAt(0);
        else if (audio.paused) audio.play(); else audio.pause();
      };
      const openAyah = (i) => {
        const a = ayahs[i];
        const ref = `${s.name} - الآية ${ar(a.numberInSurah)}`;
        const bmLabel = () => (isBM(n, a.numberInSurah) ? '🔖 إزالة العلامة' : '🔖 حفظ علامة');
        const sh = sheet(`
          <div class="sheet-title">${esc(ref)}</div>
          <p class="sheet-ayah">${a.text}</p>
          <div class="sheet-actions">
            <button class="btn" data-a="play">▶ استماع من هنا</button>
            <button class="btn ghost" data-a="bm">${bmLabel()}</button>
            <button class="btn ghost" data-a="share">📤 مشاركة</button>
          </div>
          ${settings.translation ? `<div class="tafsir"><h4>الترجمة · ${esc(TRANSLATIONS[settings.translation] || '')}</h4><div class="trans-body" dir="${settings.translation.startsWith('ur') ? 'rtl' : 'ltr'}"><div class="loader" style="margin:16px auto"></div></div></div>` : ''}
          <div class="tafsir"><h4>التفسير الميسر</h4><div class="tafsir-body"><div class="loader" style="margin:16px auto"></div></div></div>`);
        if (settings.translation) {
          const trb = $('.trans-body', sh.el);
          fetchJSON(`${API}/ayah/${a.number}/${settings.translation}`, `tr:${settings.translation}:${a.number}`)
            .then((d) => { trb.textContent = d.text; })
            .catch(() => { trb.textContent = 'تعذّر تحميل الترجمة، تأكد من الاتصال بالإنترنت.'; });
        }
        $('[data-a="play"]', sh.el).onclick = () => { sh.close(); playAt(i); };
        $('[data-a="bm"]', sh.el).onclick = (e) => { toggleBM({ n, name: s.name, ayah: a.numberInSurah, text: a.text.slice(0, 90) }); e.currentTarget.textContent = bmLabel(); };
        $('[data-a="share"]', sh.el).onclick = () => shareText(`﴿${a.text}﴾
[${ref}]` + APP_SIGN());
        const tb = $('.tafsir-body', sh.el);
        fetchJSON(`${API}/ayah/${a.number}/ar.muyassar`, `tafsir:${a.number}`)
          .then((d) => { tb.textContent = d.text; })
          .catch(() => { tb.textContent = 'تعذّر تحميل التفسير، تأكد من الاتصال بالإنترنت.'; });
      };
      $$('.ayah').forEach((el) => el.addEventListener('click', () => openAyah(+el.dataset.i)));

      const target = arg2 ? +arg2 : (last && last.n === n ? last.ayah : 1);
      if (target > 1) {
        const i = ayahs.findIndex((a) => a.numberInSurah === target);
        if (i > 0) setTimeout(() => mark(i, true), 150);
      } else {
        store.set('lastRead', { n, name: s.name, ayah: 1 });
      }
    }).catch(() => alive && errorBox(() => renderSurah(arg)));

    return () => { alive = false; audio.pause(); audio.src = ''; window.removeEventListener('noor:audio', onExclusive); };
  }

  // ---------- الأذكار ----------
  const todayKey = () => ymdIn(new Date(), tz()).join('-');

  function renderAzkarList() {
    view.innerHTML = `<div class="grid" style="grid-template-columns:repeat(2,1fr)">
      ${Object.entries(AZKAR).map(([k, z]) => {
        const prog = store.get(`azkar:${k}:${todayKey()}`, {});
        const done = z.items.filter((it, i) => (prog[i] || 0) >= it.count).length;
        return `<button class="tile" data-k="${k}" style="padding:22px 8px"><span class="ic">${z.icon}</span>${z.title}<small class="muted">${ar(done)} / ${ar(z.items.length)}</small></button>`;
      }).join('')}
    </div>
    <div class="card"><h3>💡 فضل الذكر</h3><p class="ayah-text" style="font-size:1.3rem">﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾</p><div class="ref">الرعد: ٢٨</div></div>`;
    $$('[data-k]', view).forEach((b) => b.addEventListener('click', () => go(`zikr/${b.dataset.k}`)));
  }

  function renderAzkar(key) {
    const z = AZKAR[key] || AZKAR.morning;
    $('#pageTitle').textContent = z.title;
    const sk = `azkar:${key}:${todayKey()}`;
    const prog = store.get(sk, {});
    view.innerHTML = `<div class="progress"><div id="bar"></div></div>
      ${z.items.map((it, i) => `
        <div class="card zikr" data-i="${i}">
          <p>${it.text}</p>
          <div class="meta"><small>${it.ref}${it.count > 1 ? ` · التكرار: ${ar(it.count)}` : ''}</small>
            <button class="counter-btn"></button></div>
        </div>`).join('')}
      <button class="btn ghost block" id="resetAz">إعادة تعيين</button>`;

    const update = () => {
      let done = 0;
      $$('.zikr', view).forEach((el) => {
        const i = +el.dataset.i, it = z.items[i], c = prog[i] || 0;
        const isDone = c >= it.count;
        if (isDone) done++;
        el.classList.toggle('done', isDone);
        $('.counter-btn', el).textContent = isDone ? '✓ تم' : `${ar(c)} / ${ar(it.count)}`;
      });
      $('#bar').style.width = (done / z.items.length) * 100 + '%';
      return done;
    };
    $$('.zikr', view).forEach((el) => {
      const handler = () => {
        const i = +el.dataset.i, it = z.items[i];
        if ((prog[i] || 0) >= it.count) return;
        prog[i] = (prog[i] || 0) + 1;
        store.set(sk, prog);
        navigator.vibrate && navigator.vibrate(prog[i] >= it.count ? [30, 40, 30] : 12);
        const done = update();
        if (prog[i] >= it.count) {
          if (done === z.items.length) toast('أتممت الأذكار، تقبّل الله منك 🤍');
          else { const nx = el.nextElementSibling; if (nx && nx.classList.contains('zikr')) setTimeout(() => nx.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250); }
        }
      };
      $('.counter-btn', el).addEventListener('click', (e) => { e.stopPropagation(); handler(); });
      $('p', el).addEventListener('click', handler);
    });
    $('#resetAz').onclick = () => { for (const k in prog) delete prog[k]; store.set(sk, prog); update(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    update();
  }

  // ---------- السبحة ----------
  function renderTasbih() {
    const st = Object.assign({ zikr: 0, count: 0, target: 33, rounds: 0, total: 0, today: 0, day: '' }, store.get('tasbih', {}));
    if (st.day !== todayKey()) { st.today = 0; st.day = todayKey(); }
    const C = 2 * Math.PI * 126;
    view.innerHTML = `
      <div class="tasbih-wrap">
        <div class="chips" id="presets">${TASBIH_PRESETS.map((t, i) => `<button class="chip" data-i="${i}">${t}</button>`).join('')}</div>
        <div class="tasbih-zikr" id="tz"></div>
        <button class="bead" id="bead" aria-label="تسبيح">
          <svg class="ring" viewBox="0 0 264 264"><circle class="bg" cx="132" cy="132" r="126"/><circle class="fg" id="ring" cx="132" cy="132" r="126" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
          <div><div class="count" id="cnt"></div><div class="target" id="tgt"></div></div>
        </button>
        <div class="seg" id="targets" style="width:100%">
          ${[33, 100, 1000, 0].map((v) => `<button data-v="${v}">${v ? ar(v) : 'مفتوح'}</button>`).join('')}
        </div>
        <div class="stats">
          <div class="stat"><b id="sRounds"></b><small>الدورات</small></div>
          <div class="stat"><b id="sToday"></b><small>اليوم</small></div>
          <div class="stat"><b id="sTotal"></b><small>الإجمالي</small></div>
        </div>
        <button class="btn ghost block" id="reset">تصفير العداد</button>
      </div>`;
    const save = () => store.set('tasbih', st);
    const draw = () => {
      $('#tz').textContent = TASBIH_PRESETS[st.zikr];
      $('#cnt').textContent = ar(st.count);
      $('#tgt').textContent = st.target ? `من ${ar(st.target)}` : 'عدد مفتوح';
      $('#ring').style.strokeDashoffset = st.target ? C * (1 - st.count / st.target) : C * (1 - (st.count % 100) / 100);
      $('#sRounds').textContent = arG(st.rounds);
      $('#sToday').textContent = arG(st.today);
      $('#sTotal').textContent = arG(st.total);
      $$('#presets .chip').forEach((c) => c.classList.toggle('active', +c.dataset.i === st.zikr));
      $$('#targets button').forEach((b) => b.classList.toggle('active', +b.dataset.v === st.target));
    };
    $('#bead').addEventListener('click', () => {
      st.count++; st.total++; st.today++;
      if (st.target && st.count >= st.target) {
        st.rounds++;
        navigator.vibrate && navigator.vibrate([60, 60, 60]);
        toast(`أتممت ${ar(st.target)} — ${TASBIH_PRESETS[st.zikr]}`);
        setTimeout(() => { st.count = 0; save(); draw(); }, 350);
      } else {
        navigator.vibrate && navigator.vibrate(15);
      }
      save(); draw();
    });
    $$('#presets .chip').forEach((c) => c.addEventListener('click', () => { st.zikr = +c.dataset.i; st.count = 0; save(); draw(); }));
    $$('#targets button').forEach((b) => b.addEventListener('click', () => { st.target = +b.dataset.v; st.count = 0; save(); draw(); }));
    $('#reset').onclick = () => { st.count = 0; save(); draw(); };
    draw();
  }

  // ---------- القبلة ----------
  function renderQibla() {
    const { lat, lng, name } = settings.location;
    const q = PrayTimes.qibla(lat, lng);
    const dist = PrayTimes.distanceToMakkah(lat, lng);
    view.innerHTML = `
      <div class="compass-wrap">
        <div class="compass" id="dial">
          <span class="mark n">ش</span><span class="mark e">ق</span><span class="mark s">ج</span><span class="mark w">غ</span>
          <div class="needle" style="transform:rotate(${q}deg)"><span class="kaaba">🕋</span></div>
          <div class="center"></div>
        </div>
        <div><div class="big-num">${ar(q.toFixed(1))}°</div><div class="muted">من الشمال باتجاه عقارب الساعة</div></div>
        <div class="card" style="width:100%">
          <div>📍 ${esc(name)}</div>
          <div class="muted" style="font-size:.9rem">المسافة إلى مكة المكرمة: ${arG(Math.round(dist))} كم</div>
        </div>
        <button class="btn block" id="compassBtn">تفعيل البوصلة</button>
        <p class="muted" id="hint" style="font-size:.85rem">ضع الهاتف بشكل مسطّح وبعيداً عن المعادن، ثم وجّه أعلى الهاتف نحو رمز الكعبة.</p>
      </div>`;
    const dial = $('#dial');
    let active = false;
    const onOrient = (e) => {
      let heading = null;
      if (typeof e.webkitCompassHeading === 'number') heading = e.webkitCompassHeading;
      else if (e.absolute && e.alpha != null) heading = 360 - e.alpha;
      if (heading == null) return;
      active = true;
      dial.style.transform = `rotate(${-heading}deg)`;
      const diff = Math.abs(((q - heading + 540) % 360) - 180);
      $('#hint').textContent = diff < 5 ? '✅ أنت متجه نحو القبلة' : 'أدِر الهاتف حتى يشير رمز الكعبة إلى الأعلى';
    };
    const start = async () => {
      try {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          const r = await DeviceOrientationEvent.requestPermission();
          if (r !== 'granted') { toast('لم يتم منح إذن البوصلة'); return; }
        }
        window.addEventListener('deviceorientationabsolute', onOrient);
        window.addEventListener('deviceorientation', onOrient);
        $('#compassBtn').hidden = true;
        setTimeout(() => { if (!active) $('#hint').textContent = 'البوصلة غير متاحة على هذا الجهاز. استخدم الزاوية الموضحة أعلاه.'; }, 2500);
      } catch { toast('البوصلة غير مدعومة'); }
    };
    $('#compassBtn').onclick = start;
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrient);
      window.removeEventListener('deviceorientation', onOrient);
    };
  }

  // ---------- الأسماء الحسنى ----------
  function renderNames() {
    view.innerHTML = `
      <div class="card center"><p class="hadith-text" style="font-size:1.15rem">«إِنَّ لِلَّهِ تِسْعَةً وَتِسْعِينَ اسْمًا، مِائَةً إِلَّا وَاحِدًا، مَنْ أَحْصَاهَا دَخَلَ الْجَنَّةَ»</p><div class="ref">متفق عليه</div></div>
      <div class="names-grid">${ASMA_ALHUSNA.map((n, i) => `<div class="name-card"><small>${ar(i + 1)}</small><b>${n}</b></div>`).join('')}</div>`;
  }

  // ---------- الإعدادات ----------
  function renderSettings() {
    const cityIdx = CITIES.findIndex((c) => c.name === settings.location.name);
    view.innerHTML = `
      <div class="card">
        <h3>📍 الموقع</h3>
        <button class="btn block" id="gps"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/></svg>تحديد موقعي تلقائياً</button>
        <div class="field" style="margin-top:12px"><label for="city">أو اختر مدينة</label>
          <select id="city"><option value="-1">${cityIdx < 0 ? esc(settings.location.name) : '— اختر —'}</option>${CITIES.map((c, i) => `<option value="${i}" ${i === cityIdx ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
        </div>
      </div>
      <div class="card">
        <h3>🕌 مواقيت الصلاة</h3>
        <div class="field"><label for="method">طريقة الحساب</label>
          <select id="method">${Object.entries(PrayTimes.METHODS).map(([k, m]) => `<option value="${k}" ${k === settings.method ? 'selected' : ''}>${m.name}</option>`).join('')}</select>
        </div>
        <div class="field"><label>حساب وقت العصر</label>
          <div class="seg" id="asr"><button data-v="1">الجمهور (شافعي/مالكي/حنبلي)</button><button data-v="2">الحنفي</button></div>
        </div>
        <div class="field"><label>تنبيه عند دخول وقت الصلاة</label>
          <div class="seg" id="alerts"><button data-v="1">مفعّل</button><button data-v="0">معطّل</button></div>
          <small class="muted">${NATIVE ? `يصلك إشعار ${window.NOOR_NATIVE_ADHAN ? 'بصوت الأذان' : 'بصوت التنبيه'} عند دخول كل صلاة حتى لو كان الهاتف مقفولاً.` : 'في نسخة المتصفح يعمل التنبيه أثناء فتح التطبيق فقط. ثبّت تطبيق أندرويد ليصلك الأذان والهاتف مقفول.'}</small>
          ${NATIVE ? '<button class="btn block" id="exactBtn" style="margin-top:8px" hidden>⏰ السماح بالتنبيه في الوقت بالضبط</button><button class="btn ghost block" id="testAdhan" style="margin-top:8px">🔔 تجربة التنبيه بعد ١٠ ثوانٍ</button>' : ''}
        </div>
      </div>
      <div class="card">
        <h3>📖 القرآن الكريم</h3>
        <div class="field"><label for="reciter">القارئ</label>
          <select id="reciter">${Object.entries(RECITERS).map(([k, r]) => `<option value="${k}" ${k === settings.reciter ? 'selected' : ''}>${r.name}</option>`).join('')}</select>
        </div>
        <div class="field" style="margin:0"><label for="translation">ترجمة معاني القرآن (تظهر عند الضغط على الآية)</label>
          <select id="translation">${Object.entries(TRANSLATIONS).map(([k, v]) => `<option value="${k}" ${k === settings.translation ? 'selected' : ''}>${v}</option>`).join('')}</select>
        </div>
      </div>
      <div class="card">
        <h3>🎨 المظهر</h3>
        <div class="seg" id="theme"><button data-v="auto">تلقائي</button><button data-v="light">فاتح</button><button data-v="dark">داكن</button></div>
      </div>
      ${NATIVE ? '' : `<div class="card"><h3>📱 تطبيق أندرويد</h3><p class="muted" style="margin:0 0 10px;font-size:.9rem">ثبّت نسخة أندرويد ليصلك تنبيه الأذان عند كل صلاة حتى والهاتف مقفول.</p><a class="btn block" href="https://github.com/Fathyeid/Fathyeid/releases/latest/download/noor.apk">⬇️ تحميل التطبيق (APK)</a></div>`}
      ${NATIVE ? `<div class="card"><h3>🔄 التحديثات</h3><p class="muted" style="margin:0 0 10px;font-size:.9rem">رقم النسخة الحالية: ${arG(BUILD.code || 0)}. يتحقق التطبيق من التحديثات تلقائياً.</p><button class="btn ghost block" id="chkUpd">التحقق من وجود تحديث</button></div>` : ''}
      <p class="center muted" style="font-size:.85rem">هذا التطبيق صدقة جارية على روح المرحوم عيد فتحي أبو طالب<br>نسألكم الدعاء له بالرحمة والمغفرة 🤍</p>
      <p class="center muted" style="font-size:.8rem">نور - رفيق المسلم · الإصدار ٢٫٠</p>`;

    const seg = (id, key, cast) => {
      const sync = () => $$(`#${id} button`).forEach((b) => b.classList.toggle('active', cast(b.dataset.v) === settings[key]));
      $$(`#${id} button`).forEach((b) => b.addEventListener('click', () => {
        settings[key] = cast(b.dataset.v); saveSettings(); sync();
        if (key === 'theme') { store.set('themeChosen', true); applyTheme(); }
        if (key === 'alerts' && settings.alerts && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
      }));
      sync();
    };
    seg('asr', 'asr', Number);
    seg('theme', 'theme', String);
    seg('alerts', 'alerts', (v) => v === '1' || v === true);

    if ($('#testAdhan')) $('#testAdhan').onclick = () => testAdhan();
    if ($('#chkUpd')) $('#chkUpd').onclick = () => checkUpdate(true);
    if ($('#exactBtn')) {
      exactAllowed().then((ok) => { if ($('#exactBtn')) $('#exactBtn').hidden = ok; });
      $('#exactBtn').onclick = async () => {
        try { await LN.changeExactNotificationSetting(); } catch { /* تجاهل */ }
        const ok = await exactAllowed();
        if ($('#exactBtn')) $('#exactBtn').hidden = ok;
        if (ok) { toast('تم، سيصلك الأذان في وقته بالضبط'); scheduleAdhan(); }
      };
    }
    $('#method').onchange = (e) => { settings.method = e.target.value; saveSettings(); toast('تم الحفظ'); };
    $('#reciter').onchange = (e) => { settings.reciter = e.target.value; saveSettings(); toast('تم الحفظ'); };
    $('#translation').onchange = (e) => { settings.translation = e.target.value; saveSettings(); toast('تم الحفظ'); };
    $('#city').onchange = (e) => {
      const c = CITIES[+e.target.value];
      if (!c) return;
      settings.location = { name: c.name, lat: c.lat, lng: c.lng, tz: c.tz };
      settings.method = c.method;
      $('#method').value = c.method;
      saveSettings();
      toast(`تم اختيار ${c.name}`);
    };
    $('#gps').onclick = () => {
      if (!navigator.geolocation) return toast('تحديد الموقع غير مدعوم');
      toast('جاري تحديد الموقع...');
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        settings.location = { name: `موقعي (${ar(lat.toFixed(2))}، ${ar(lng.toFixed(2))})`, lat, lng, tz: null };
        saveSettings();
        toast('تم تحديد موقعك بنجاح');
        renderSettings();
      }, () => toast('تعذّر تحديد الموقع، اختر مدينة يدوياً'), { enableHighAccuracy: false, timeout: 15000 });
    };
  }

  // ---------- قراءة جزء كامل ----------
  function renderJuz(arg) {
    const j = Math.min(30, Math.max(1, parseInt(arg, 10) || 1));
    $('#pageTitle').textContent = `الجزء ${ar(j)} · ${JUZ_NAMES[j - 1]}`;
    view.innerHTML = '<div class="loader"></div>';
    let alive = true;
    fetchJSON(`${API}/juz/${j}/quran-uthmani`, `juz:${j}`).then((d) => {
      if (!alive) return;
      let html = '';
      let curS = 0;
      d.ayahs.forEach((a) => {
        if (a.surah.number !== curS) {
          if (curS) html += '</p>';
          curS = a.surah.number;
          if (a.numberInSurah === 1) {
            html += `<div class="surah-header small"><h2>${a.surah.name}</h2></div>`;
            if (curS !== 1 && curS !== 9) html += '<div class="basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>';
          } else {
            html += `<div class="juz-surah">${a.surah.name}</div>`;
          }
          html += '<p class="quran-text">';
        }
        let t = a.text;
        if (a.numberInSurah === 1 && curS !== 1 && curS !== 9 && /^بِسْمِ|^بِسۡمِ/.test(t)) t = t.split(' ').slice(4).join(' ');
        html += `<span class="ayah" data-s="${curS}" data-a="${a.numberInSurah}">${t}</span> <span class="ayah-num">${ar(a.numberInSurah)}</span> `;
      });
      html += '</p>';
      const k = khatmaState();
      view.innerHTML = `
        <p class="muted center" style="font-size:.85rem;margin:0 0 10px">اضغط على أي آية لفتح السورة والاستماع والتفسير</p>
        <article class="mushaf">${html}</article>
        <button class="btn block" id="doneJuz" style="margin-top:14px">${k.done[j - 1] ? '✓ هذا الجزء مُسجَّل في ختمتك' : '✓ أتممت قراءة هذا الجزء'}</button>
        <div style="display:flex;gap:10px;margin-top:10px">
          ${j > 1 ? `<button class="btn ghost block" data-go="juz/${j - 1}">→ الجزء السابق</button>` : ''}
          ${j < 30 ? `<button class="btn ghost block" data-go="juz/${j + 1}">الجزء التالي ←</button>` : ''}
        </div>`;
      document.documentElement.style.setProperty('--qsize', settings.qsize + 'rem');
      $$('[data-go]', view).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
      $$('.ayah', view).forEach((el) => el.addEventListener('click', () => go(`surah/${el.dataset.s}/${el.dataset.a}`)));
      $('#doneJuz').onclick = () => {
        const s = khatmaState();
        s.done[j - 1] = true;
        saveKhatma(s);
        toast(`بارك الله فيك، أتممت الجزء ${ar(j)}`);
        go('khatma');
      };
    }).catch(() => alive && errorBox(() => renderJuz(arg)));
    return () => { alive = false; };
  }

  // ---------- ختمة القرآن ----------
  function khatmaState() {
    const k = Object.assign({ days: 30, start: todayKey(), done: [], completed: 0 }, store.get('khatma', {}));
    if (!Array.isArray(k.done) || k.done.length !== 30) k.done = Array(30).fill(false);
    return k;
  }
  const saveKhatma = (k) => store.set('khatma', k);
  const dayNumber = (key) => { const [y, m, d] = key.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); };

  function renderKhatma() {
    const k = khatmaState();
    const doneN = k.done.filter(Boolean).length;
    const elapsed = Math.max(0, dayNumber(todayKey()) - dayNumber(k.start));
    const daysLeft = Math.max(1, k.days - elapsed);
    const pagesPerDay = Math.ceil(((30 - doneN) * 20) / daysLeft);
    const nextJ = k.done.indexOf(false);
    view.innerHTML = `
      <section class="hero">
        <div class="next-label">الختمة رقم ${ar(k.completed + 1)}${k.completed ? ` · أتممت ${ar(k.completed)} ختمة من قبل` : ''}</div>
        <div class="next-name">${ar(doneN)} من ٣٠ جزءاً</div>
        <div class="progress on-dark"><div style="width:${(doneN / 30) * 100}%"></div></div>
        <div class="loc">${doneN === 30 ? 'ختمت القرآن الكريم، تقبّل الله منك' : `وردك اليومي: ${ar(pagesPerDay)} صفحة تقريباً · متبقٍ ${ar(daysLeft)} يوم`}</div>
      </section>
      ${doneN === 30 ? `
        <div class="card center" style="margin-top:14px"><h3 style="justify-content:center">🎉 مبارك ختم القرآن</h3>
          <p class="hadith-text" style="font-size:1.15rem">اللَّهُمَّ اجْعَلْ ثَوَابَ هَذِهِ الْخَتْمَةِ فِي مِيزَانِ حَسَنَاتِ عَبْدِكَ عِيد فَتْحِي أَبُو طَالِب، وَارْحَمْهُ وَاغْفِرْ لَهُ</p>
          <button class="btn block" id="newK">ابدأ ختمة جديدة</button></div>` : `
        <button class="btn block" style="margin-top:14px" data-go="juz/${nextJ + 1}">📖 تابع القراءة: الجزء ${ar(nextJ + 1)} (${JUZ_NAMES[nextJ]})</button>`}
      <div class="section-title">مدة الختمة</div>
      <div class="seg" id="kdays">${[7, 15, 30, 60].map((v) => `<button data-v="${v}">${ar(v)} يوم</button>`).join('')}</div>
      <div class="section-title">الأجزاء <small class="muted" style="font-weight:500">(اضغط على الدائرة لتسجيل القراءة)</small></div>
      <div class="card" style="padding:4px">
        ${JUZ_NAMES.map((nm, i) => `
          <div class="juz-row ${k.done[i] ? 'done' : ''}">
            <button class="check" data-t="${i}" aria-label="تسجيل الجزء ${i + 1}">${k.done[i] ? '✓' : ''}</button>
            <button class="juz-open" data-go="juz/${i + 1}"><b>الجزء ${ar(i + 1)}</b><small class="muted">${nm}</small></button>
          </div>`).join('')}
      </div>
      <button class="btn ghost block" id="resetK" style="margin-top:10px">إعادة ضبط الختمة الحالية</button>`;
    $$('[data-go]', view).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
    $$('#kdays button').forEach((b) => {
      b.classList.toggle('active', +b.dataset.v === k.days);
      b.addEventListener('click', () => { k.days = +b.dataset.v; k.start = todayKey(); saveKhatma(k); renderKhatma(); });
    });
    $$('[data-t]', view).forEach((b) => b.addEventListener('click', () => { const i = +b.dataset.t; k.done[i] = !k.done[i]; saveKhatma(k); renderKhatma(); }));
    if ($('#newK')) $('#newK').onclick = () => { k.completed++; k.done = Array(30).fill(false); k.start = todayKey(); saveKhatma(k); toast('بدأت ختمة جديدة، وفقك الله'); renderKhatma(); };
    $('#resetK').onclick = (e) => {
      if (e.currentTarget.dataset.sure) { k.done = Array(30).fill(false); k.start = todayKey(); saveKhatma(k); renderKhatma(); return; }
      e.currentTarget.dataset.sure = '1';
      e.currentTarget.textContent = 'اضغط مرة أخرى للتأكيد';
    };
  }

  // ---------- متابعة الصلوات وقضاء الفوائت ----------
  const PRAY5 = PRAYERS.filter((p) => !p.sun);
  function renderTracker() {
    const all = store.get('tracker', {});
    const qada = Object.assign({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, store.get('qada', {}));
    const keyOf = (d) => ymdIn(d, tz()).join('-');
    const today = keyOf(new Date());
    const day = all[today] || {};
    const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 86400000));
    let streak = 0;
    for (let i = 0; i < 400; i++) {
      const d = all[keyOf(new Date(Date.now() - i * 86400000))] || {};
      if (PRAY5.every((p) => d[p.key])) streak++;
      else if (i > 0) break;
    }
    const doneToday = PRAY5.filter((p) => day[p.key]).length;
    view.innerHTML = `
      <div class="stats">
        <div class="stat"><b>${ar(doneToday)} / ٥</b><small>صلوات اليوم</small></div>
        <div class="stat"><b>${ar(streak)}</b><small>أيام متتالية كاملة</small></div>
      </div>
      <div class="section-title">صلوات اليوم</div>
      <div class="prayer-list">
        ${PRAY5.map((p) => `<button class="prayer-row track ${day[p.key] ? 'on' : ''}" data-p="${p.key}"><span class="p-ic">${p.ic}</span><span class="p-name">${p.name}</span><span class="check">${day[p.key] ? '✓' : ''}</span></button>`).join('')}
      </div>
      <div class="section-title">آخر ٧ أيام</div>
      <div class="card week">
        <div class="week-grid">
          <span></span>${days.map((d) => `<span class="wd">${d.toLocaleDateString('ar-EG', { weekday: 'short', timeZone: tz() })}</span>`).join('')}
          ${PRAY5.map((p) => `<span class="wp">${p.name}</span>${days.map((d) => `<span class="dot ${(all[keyOf(d)] || {})[p.key] ? 'on' : ''}"></span>`).join('')}`).join('')}
        </div>
      </div>
      <div class="section-title">الصلوات الفائتة (القضاء)</div>
      <div class="card">
        ${PRAY5.map((p) => `<div class="qada-row"><span>${p.name}</span><div class="qada-ctrl"><button class="icon-btn" data-q="${p.key}" data-d="-1" aria-label="قضيت صلاة">−</button><b>${arG(qada[p.key])}</b><button class="icon-btn" data-q="${p.key}" data-d="1" aria-label="إضافة فائتة">+</button></div></div>`).join('')}
        <small class="muted">أضف عدد الصلوات الفائتة بزر (+)، واضغط (−) كلما قضيت صلاة منها.</small>
      </div>`;
    $$('[data-p]', view).forEach((b) => b.addEventListener('click', () => {
      day[b.dataset.p] = !day[b.dataset.p];
      all[today] = day;
      store.set('tracker', all);
      if (day[b.dataset.p]) navigator.vibrate && navigator.vibrate(15);
      if (PRAY5.every((p) => day[p.key])) toast('ما شاء الله، أتممت صلوات اليوم 🤍');
      renderTracker();
    }));
    $$('[data-q]', view).forEach((b) => b.addEventListener('click', () => {
      qada[b.dataset.q] = Math.max(0, qada[b.dataset.q] + +b.dataset.d);
      store.set('qada', qada);
      renderTracker();
    }));
  }

  // ---------- التقويم الهجري والمناسبات ----------
  function hijriParts(d) {
    const p = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: tz() }).formatToParts(d);
    const g = (t) => parseInt(p.find((x) => x.type === t).value, 10);
    return { d: g('day'), m: g('month'), y: g('year') };
  }
  const HIJRI_EVENTS = [
    { m: 1, d: 1, name: 'رأس السنة الهجرية', ic: '🌙' },
    { m: 1, d: 10, name: 'يوم عاشوراء', ic: '🤲', note: 'يُستحب صيامه مع يوم قبله' },
    { m: 9, d: 1, name: 'أول أيام شهر رمضان', ic: '🏮' },
    { m: 9, d: 21, name: 'العشر الأواخر من رمضان', ic: '✨', note: 'تُتحرّى فيها ليلة القدر' },
    { m: 10, d: 1, name: 'عيد الفطر المبارك', ic: '🎉' },
    { m: 12, d: 1, name: 'العشر الأوائل من ذي الحجة', ic: '🕋', note: 'أفضل أيام الدنيا' },
    { m: 12, d: 9, name: 'يوم عرفة', ic: '⛰️', note: 'صيامه يكفّر السنة الماضية والباقية' },
    { m: 12, d: 10, name: 'عيد الأضحى المبارك', ic: '🐑' },
  ];
  function renderCalendar() {
    const DAY = 86400000;
    const now = Date.now();
    const found = [];
    let white = null;
    for (let i = 0; i < 390 && found.length < HIJRI_EVENTS.length; i++) {
      const d = new Date(now + i * DAY);
      const h = hijriParts(d);
      HIJRI_EVENTS.forEach((e) => { if (e.m === h.m && e.d === h.d && !found.some((f) => f.e === e)) found.push({ e, d, i }); });
      if (!white && h.d >= 13 && h.d <= 15) white = { d, i, h };
    }
    found.sort((a, b) => a.i - b.i);

    let anchor = new Date(now);
    const drawMonth = () => {
      const h0 = hijriParts(anchor);
      const first = new Date(anchor.getTime() - (h0.d - 1) * DAY);
      const cells = [];
      for (let i = 0; i < 31; i++) {
        const d = new Date(first.getTime() + i * DAY);
        const h = hijriParts(d);
        if (h.m !== h0.m) break;
        cells.push({ d, h });
      }
      const lead = (first.getDay() + 1) % 7; // السبت أول الأسبوع
      const todayK = ymdIn(new Date(), tz()).join('-');
      const title = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { month: 'long', year: 'numeric', timeZone: tz() }).format(first);
      $('#cal').innerHTML = `
        <div class="date-nav"><button class="icon-btn" id="cp" aria-label="الشهر السابق"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>
          <div class="d"><b>${title}</b><small>${first.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric', timeZone: tz() })}</small></div>
          <button class="icon-btn" id="cn" aria-label="الشهر التالي"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button></div>
        <div class="cal-grid">
          ${['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'].map((w) => `<span class="cw">${w}</span>`).join('')}
          ${'<span></span>'.repeat(lead)}
          ${cells.map(({ d, h }) => {
            const ev = HIJRI_EVENTS.some((e) => e.m === h.m && e.d === h.d);
            const wh = h.d >= 13 && h.d <= 15;
            const isToday = ymdIn(d, tz()).join('-') === todayK;
            return `<span class="cd ${isToday ? 'today' : ''} ${ev ? 'ev' : ''} ${wh ? 'white' : ''}"><b>${ar(h.d)}</b><small>${ar(ymdIn(d, tz())[2])}</small></span>`;
          }).join('')}
        </div>
        <div class="cal-legend"><span><i class="lg ev"></i>مناسبة</span><span><i class="lg white"></i>الأيام البيض</span><span><i class="lg today"></i>اليوم</span></div>`;
      $('#cp').onclick = () => { anchor = new Date(first.getTime() - 2 * DAY); drawMonth(); };
      $('#cn').onclick = () => { anchor = new Date(cells[cells.length - 1].d.getTime() + 2 * DAY); drawMonth(); };
    };

    const inDays = (i) => (i === 0 ? 'اليوم' : i === 1 ? 'غداً' : `بعد ${arG(i)} يوم`);
    view.innerHTML = `
      <div class="card" id="cal"></div>
      <div class="section-title">المناسبات القادمة</div>
      <div class="prayer-list">
        ${white ? `<div class="prayer-row"><span class="p-ic">🌕</span><span class="p-name">الأيام البيض (صيام ١٣ و١٤ و١٥)<br><small class="muted">${white.d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz() })}</small></span><span class="p-time ev-in">${inDays(white.i)}</span></div>` : ''}
        ${found.map(({ e, d, i }) => `<div class="prayer-row"><span class="p-ic">${e.ic}</span><span class="p-name">${e.name}<br><small class="muted">${d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz() })}${e.note ? ' · ' + e.note : ''}</small></span><span class="p-time ev-in">${inDays(i)}</span></div>`).join('')}
      </div>
      <p class="muted center" style="font-size:.8rem;margin-top:14px">التواريخ حسب تقويم أم القرى، وقد تختلف يوماً حسب رؤية الهلال في بلدك.</p>`;
    drawMonth();
  }

  // ---------- حاسبة الزكاة ----------
  function renderZakat() {
    const z = Object.assign({ cash: '', g24: '', g21: '', g18: '', silver: '', gp: '', sp: '', debts: '' }, store.get('zakat', {}));
    const F = [
      ['cash', 'النقود والمدخرات وأرصدة البنوك', 'المبلغ'],
      ['g24', 'ذهب عيار ٢٤', 'جرام'],
      ['g21', 'ذهب عيار ٢١', 'جرام'],
      ['g18', 'ذهب عيار ١٨', 'جرام'],
      ['silver', 'الفضة', 'جرام'],
      ['debts', 'ديون عليك مستحقة الآن', 'المبلغ'],
    ];
    view.innerHTML = `
      <div class="card">
        <h3>💰 أسعار اليوم</h3>
        <div class="field"><label for="z-gp">سعر جرام الذهب عيار ٢٤ (بعملتك)</label><input class="search" id="z-gp" inputmode="decimal" value="${esc(z.gp)}" placeholder="مثال: 4500"></div>
        <div class="field" style="margin:0"><label for="z-sp">سعر جرام الفضة (اختياري)</label><input class="search" id="z-sp" inputmode="decimal" value="${esc(z.sp)}" placeholder="مثال: 55"></div>
      </div>
      <div class="card">
        <h3>📋 أموالك</h3>
        ${F.map(([k, l, u]) => `<div class="field"><label for="z-${k}">${l}</label><input class="search" id="z-${k}" inputmode="decimal" value="${esc(z[k])}" placeholder="${u}"></div>`).join('')}
      </div>
      <div class="card zakat-result" id="zres"></div>
      <div class="card"><h3>📌 شروط وجوب الزكاة</h3>
        <ul class="muted" style="margin:0;padding-inline-start:20px;font-size:.9rem;line-height:1.9">
          <li>بلوغ النصاب: قيمة ٨٥ جراماً من الذهب عيار ٢٤.</li>
          <li>مرور عام هجري كامل على بلوغ المال النصاب.</li>
          <li>مقدار الزكاة: ربع العشر (٢٫٥٪) من إجمالي المال.</li>
          <li>ذهب الزينة المستعمل فيه خلاف بين العلماء، فاسأل أهل العلم في بلدك.</li>
        </ul></div>`;
    const num = (v) => { const n = parseFloat(String(v).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫,]/g, '.')); return isNaN(n) ? 0 : n; };
    const money = (n) => n.toLocaleString('ar-EG', { maximumFractionDigits: 2 });
    const calc = () => {
      ['gp', 'sp', ...F.map((f) => f[0])].forEach((k) => { z[k] = $(`#z-${k}`).value; });
      store.set('zakat', z);
      const gp = num(z.gp);
      const goldEq = num(z.g24) + (num(z.g21) * 21) / 24 + (num(z.g18) * 18) / 24;
      const total = num(z.cash) + goldEq * gp + num(z.silver) * num(z.sp) - num(z.debts);
      const res = $('#zres');
      if (!gp) { res.innerHTML = '<p class="center muted" style="margin:0">أدخل سعر جرام الذهب عيار ٢٤ لحساب النصاب.</p>'; return; }
      const nisab = 85 * gp;
      const due = total >= nisab;
      res.innerHTML = `
        <div class="z-line"><span>إجمالي أموالك الزكوية</span><b>${money(Math.max(0, total))}</b></div>
        <div class="z-line"><span>النصاب (٨٥ جرام ذهب)</span><b>${money(nisab)}</b></div>
        <div class="z-total ${due ? 'due' : ''}">${due ? `<small>الزكاة الواجبة</small><b>${money(total * 0.025)}</b>` : '<b style="font-size:1.1rem">لم يبلغ مالك النصاب، فلا زكاة عليك</b>'}</div>`;
    };
    $$('input', view).forEach((i) => i.addEventListener('input', calc));
    calc();
  }

  // ---------- العلامات المحفوظة ----------
  function renderBookmarks() {
    const bm = getBM();
    if (!bm.length) {
      view.innerHTML = `<div class="card center"><p style="font-size:2.5rem;margin:0">🔖</p><p>لا توجد علامات بعد.</p><p class="muted" style="font-size:.9rem">أثناء القراءة اضغط على أي آية ثم اختر «حفظ علامة».</p><button class="btn" data-go="quran">افتح المصحف</button></div>`;
      $('[data-go]', view).onclick = () => go('quran');
      return;
    }
    view.innerHTML = bm.map((b, i) => `
      <div class="card bm">
        <button class="bm-open" data-i="${i}"><p class="bm-text">${b.text}${b.text.length >= 90 ? '…' : ''}</p><small class="muted">${b.name} · الآية ${ar(b.ayah)}</small></button>
        <button class="icon-btn" data-del="${i}" aria-label="حذف العلامة"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>
      </div>`).join('');
    $$('[data-i]', view).forEach((b) => b.addEventListener('click', () => { const x = bm[+b.dataset.i]; go(`surah/${x.n}/${x.ayah}`); }));
    $$('[data-del]', view).forEach((b) => b.addEventListener('click', () => { bm.splice(+b.dataset.del, 1); store.set('bookmarks', bm); renderBookmarks(); }));
  }


  // ---------- الأذان في تطبيق أندرويد (إشعارات مجدولة تعمل والهاتف مقفول) ----------
  const LN = NATIVE && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  const ADHAN_CHANNEL = window.NOOR_NATIVE_ADHAN ? 'adhan-voice' : 'adhan-alert';
  let channelReady = false;
  async function ensureNotify() {
    if (!LN) return false;
    let perm = await LN.checkPermissions();
    if (perm.display !== 'granted') perm = await LN.requestPermissions();
    if (perm.display !== 'granted') return false;
    if (!channelReady) {
      await LN.createChannel({
        id: ADHAN_CHANNEL,
        name: 'الأذان ومواقيت الصلاة',
        description: 'تنبيه عند دخول وقت كل صلاة',
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        ...(window.NOOR_NATIVE_ADHAN ? { sound: 'adhan.mp3' } : {}),
      });
      channelReady = true;
    }
    return true;
  }
  let scheduling = null;
  function scheduleAdhan() {
    if (!LN) return;
    clearTimeout(scheduling);
    scheduling = setTimeout(async () => {
      try {
        const pending = await LN.getPending();
        const old = pending.notifications.filter((n) => n.id < 1000);
        if (old.length) await LN.cancel({ notifications: old.map((n) => ({ id: n.id })) });
        if (!settings.alerts) return;
        if (!(await ensureNotify())) { toast('فعّل الإشعارات للتطبيق ليصلك الأذان'); return; }
        const now = Date.now();
        const list = [];
        for (let day = 0; day < 14; day++) {
          const t = timesFor(new Date(now + day * 86400000));
          PRAY5.forEach((p, i) => {
            const at = t[p.key];
            if (at.getTime() <= now + 5000) return;
            list.push({
              id: day * 10 + i + 1,
              title: `حان الآن موعد صلاة ${p.name} ${p.ic}`,
              body: `${fmtTime(at)} · ${settings.location.name}\nحيّ على الصلاة، حيّ على الفلاح`,
              channelId: ADHAN_CHANNEL,
              schedule: { at, allowWhileIdle: true },
              autoCancel: true,
            });
          });
        }
        await LN.schedule({ notifications: list });
      } catch (e) { console.warn('adhan schedule', e); }
    }, 400);
  }
  async function exactAllowed() {
    try { const r = await LN.checkExactNotificationSetting(); return r.exact_alarm !== 'denied'; } catch { return true; }
  }
  async function testAdhan() {
    if (!(await ensureNotify())) { toast('الإشعارات غير مفعّلة للتطبيق'); return; }
    await LN.schedule({ notifications: [{ id: 5000, title: 'تجربة تنبيه الأذان 🕌', body: 'هكذا سيصلك التنبيه عند دخول وقت الصلاة', channelId: ADHAN_CHANNEL, schedule: { at: new Date(Date.now() + 10000), allowWhileIdle: true } }] });
    toast('سيصلك التنبيه بعد ١٠ ثوانٍ، يمكنك قفل الهاتف');
  }
  if (LN) {
    scheduleAdhan();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') scheduleAdhan(); });
  }


  // ---------- التنبيه بالتحديثات (تطبيق أندرويد المثبّت من الرابط) ----------
  const RELEASES_API = 'https://api.github.com/repos/Fathyeid/Fathyeid/releases/latest';
  const BUILD = window.NOOR_BUILD || { code: 0, kind: 'local' };
  async function checkUpdate(manual) {
    if (!NATIVE || !BUILD.code) { if (manual) toast('التحقق من التحديثات متاح في تطبيق أندرويد فقط'); return; }
    if (!manual && Date.now() - store.get('upd:checked', 0) < 6 * 3600000) return;
    if (manual) toast('جارٍ التحقق من التحديثات...');
    try {
      const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) throw new Error(res.status);
      const rel = await res.json();
      store.set('upd:checked', Date.now());
      const m = /VERSION_CODE=(\d+)/.exec(rel.body || '');
      const apk = (rel.assets || []).find((a) => a.name === 'noor.apk');
      const latest = m ? +m[1] : 0;
      if (!apk || latest <= BUILD.code) { if (manual) toast('أنت تستخدم أحدث نسخة ✓'); return; }
      if (!manual && store.get('upd:skip', 0) === latest) return;
      showUpdate(apk.browser_download_url, latest);
    } catch {
      if (manual) toast('تعذّر التحقق، تأكد من الاتصال بالإنترنت');
    }
  }
  function showUpdate(url, latest) {
    const sh = sheet(`
      <div class="center"><p style="font-size:2.6rem;margin:0">🎉</p>
      <div class="sheet-title" style="font-size:1.15rem">يوجد تحديث جديد لتطبيق نور</div>
      <p class="muted" style="line-height:1.9">اضغط «تحديث الآن» لتنزيل النسخة الجديدة، ثم افتح الملف بعد اكتمال التنزيل واضغط «تثبيت».<br>كل بياناتك ستبقى كما هي.</p></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <a class="btn block" id="updGo" href="${url}" target="_blank" rel="noopener">⬇️ تحديث الآن</a>
        <button class="btn ghost block" id="updLater">لاحقاً</button>
        <button class="btn ghost block" id="updSkip" style="font-size:.85rem">تخطي هذه النسخة</button>
      </div>`);
    $('#updGo', sh.el).addEventListener('click', () => { setTimeout(sh.close, 300); toast('بعد اكتمال التنزيل افتح الملف واضغط «تثبيت»'); });
    $('#updLater', sh.el).onclick = sh.close;
    $('#updSkip', sh.el).onclick = () => { store.set('upd:skip', latest); sh.close(); };
  }
  if (NATIVE) {
    setTimeout(() => checkUpdate(false), 4000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(false); });
  }

  // ---------- تنبيه الأذان ----------
  let lastAlert = store.get('lastAlert', 0);
  setInterval(() => {
    if (!settings.alerts || LN) return;
    const now = new Date();
    const t = timesFor(now);
    for (const p of PRAYERS) {
      if (p.sun) continue;
      const diff = now - t[p.key];
      if (diff >= 0 && diff < 60000 && lastAlert !== t[p.key].getTime()) {
        lastAlert = t[p.key].getTime();
        store.set('lastAlert', lastAlert);
        const msg = `حان الآن موعد صلاة ${p.name}`;
        toast('🕌 ' + msg);
        if ('Notification' in window && Notification.permission === 'granted') {
          try { new Notification('نور', { body: msg, icon: 'icons/icon.svg' }); } catch { /* تجاهل */ }
        }
      }
    }
  }, 20000);

  // ---------- واجهة الوحدات الإضافية (المكتبة الصوتية، الأكاديمية، ...) ----------
  window.Noor = {
    $, $$, view, store, toast, go, ar, arG, toAr, esc, routes, settings, saveSettings,
    fetchJSON, API, sheet, shareText, todayKey, ymdIn, tz, hijri, greg, NATIVE,
    setTitle: (t) => { $('#pageTitle').textContent = t; },
    homeExtras: [],
  };
  (window.NoorModules || []).forEach((m) => { try { m(window.Noor); } catch (e) { console.error('module', e); } });

  // ---------- التشغيل ----------
  applyTheme();
  router();
  if (!NATIVE && 'serviceWorker' in navigator && location.protocol !== 'file:') {
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloaded) { reloaded = true; location.reload(); }
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
  }
})();
