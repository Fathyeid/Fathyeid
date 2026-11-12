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
    theme: 'auto',
    qsize: 1.6,
    reciter: 'ar.alafasy',
    alerts: false,
  };
  const settings = Object.assign({}, DEFAULTS, store.get('settings', {}));
  const saveSettings = () => store.set('settings', settings);

  const RECITERS = {
    'ar.alafasy': { name: 'مشاري راشد العفاسي', br: 128 },
    'ar.husary': { name: 'محمود خليل الحصري', br: 128 },
    'ar.minshawi': { name: 'محمد صديق المنشاوي', br: 128 },
    'ar.abdulbasitmurattal': { name: 'عبد الباسط عبد الصمد', br: 192 },
    'ar.mahermuaiqly': { name: 'ماهر المعيقلي', br: 128 },
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
  };

  let cleanup = null;
  function router() {
    const [name, arg] = (location.hash.slice(2) || 'home').split('/');
    const route = routes[name] || routes.home;
    if (cleanup) { cleanup(); cleanup = null; }
    $('#pageTitle').textContent = route.title;
    $('#backBtn').hidden = !route.back;
    $('#backBtn').onclick = () => history.length > 1 ? history.back() : go(route.back);
    const tab = { surah: 'quran', zikr: 'azkar' }[name] || name;
    $$('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.route === tab));
    view.innerHTML = '';
    view.className = 'fade-in';
    void view.offsetWidth;
    cleanup = route.render(arg) || null;
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

      <div class="grid">
        <button class="tile" data-go="quran"><span class="ic">📖</span>القرآن</button>
        <button class="tile" data-go="zikr/${zikrKey}"><span class="ic">${AZKAR[zikrKey].icon}</span>${AZKAR[zikrKey].title}</button>
        <button class="tile" data-go="prayers"><span class="ic">🕌</span>المواقيت</button>
        <button class="tile" data-go="tasbih"><span class="ic">📿</span>السبحة</button>
        <button class="tile" data-go="qibla"><span class="ic">🧭</span>القبلة</button>
        <button class="tile" data-go="names"><span class="ic">✨</span>الأسماء الحسنى</button>
      </div>

      ${last ? `<div class="card continue"><div><small class="muted">متابعة القراءة</small><br><b>${esc(last.name)}</b> <small class="muted">— الآية ${ar(last.ayah)}</small></div><button class="btn" data-go="surah/${last.n}">متابعة</button></div>` : ''}

      <div class="card"><h3>📖 آية اليوم</h3><p class="ayah-text">﴿${ayah.text}﴾</p><div class="ref">${ayah.ref}</div></div>
      <div class="card"><h3>💬 حديث اليوم</h3><p class="hadith-text">«${hadith.text}»</p><div class="ref">${hadith.ref}</div></div>
    `;
    $$('[data-go]', view).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));

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

  function renderQuran() {
    view.innerHTML = '<div class="loader"></div>';
    let alive = true;
    fetchJSON(`${API}/surah`, 'surahList').then((list) => {
      if (!alive) return;
      const last = store.get('lastRead');
      view.innerHTML = `
        ${last ? `<div class="card continue"><div><small class="muted">آخر قراءة</small><br><b>${esc(last.name)}</b> <small class="muted">— الآية ${ar(last.ayah)}</small></div><button class="btn" id="cont">متابعة</button></div>` : ''}
        <input class="search" id="q" type="search" placeholder="ابحث عن سورة بالاسم أو الرقم...">
        <div class="card" style="padding:4px 4px" id="list"></div>`;
      if (last) $('#cont').onclick = () => go(`surah/${last.n}`);
      const draw = (q = '') => {
        const norm = (s) => s.replace(/[ً-ٰٟۖ-ۭ]/g, '').replace(/[ٱأإآ]/g, 'ا');
        const nq = norm(q.trim());
        $('#list').innerHTML = list
          .filter((s) => !nq || norm(s.name).includes(nq) || String(s.number) === q.trim() || ar(s.number) === q.trim())
          .map((s) => `<button class="surah-item" data-n="${s.number}"><span class="surah-num">${ar(s.number)}</span><span class="surah-info"><b>${s.name}</b><small>${s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'} · ${ar(s.numberOfAyahs)} آية</small></span></button>`)
          .join('') || '<p class="center muted">لا توجد نتائج</p>';
        $$('.surah-item').forEach((b) => b.addEventListener('click', () => go(`surah/${b.dataset.n}`)));
      };
      draw();
      $('#q').addEventListener('input', (e) => draw(e.target.value));
    }).catch(() => alive && errorBox(renderQuran));
    return () => { alive = false; };
  }

  function renderSurah(arg) {
    const n = Math.min(114, Math.max(1, parseInt(arg, 10) || 1));
    view.innerHTML = '<div class="loader"></div>';
    let alive = true;
    const audio = new Audio();
    audio.preload = 'auto';

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
          <div style="flex:1;font-size:.85rem"><b id="pState">استماع للسورة</b><br><small class="muted">${RECITERS[settings.reciter].name}</small></div>
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
      const playAt = (i) => {
        if (i >= ayahs.length) { cur = -1; $('#pState').textContent = 'انتهت التلاوة'; setBtn(); return; }
        cur = i;
        const r = RECITERS[settings.reciter];
        audio.src = `https://cdn.islamic.network/quran/audio/${r.br}/${settings.reciter}/${ayahs[i].number}.mp3`;
        audio.play().catch(() => toast('تعذّر تشغيل الصوت'));
        $('#pState').textContent = `الآية ${ar(ayahs[i].numberInSurah)}`;
        mark(i, true);
      };
      audio.onended = () => playAt(cur + 1);
      audio.onplay = audio.onpause = setBtn;
      $('#play').onclick = () => {
        if (cur < 0) playAt(0);
        else if (audio.paused) audio.play(); else audio.pause();
      };
      $$('.ayah').forEach((el) => el.addEventListener('click', () => playAt(+el.dataset.i)));

      if (last && last.n === n && last.ayah > 1) {
        const i = ayahs.findIndex((a) => a.numberInSurah === last.ayah);
        if (i > 0) setTimeout(() => mark(i, true), 150);
      } else {
        store.set('lastRead', { n, name: s.name, ayah: 1 });
      }
    }).catch(() => alive && errorBox(() => renderSurah(arg)));

    return () => { alive = false; audio.pause(); audio.src = ''; };
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
          <small class="muted">يعمل التنبيه أثناء فتح التطبيق.</small>
        </div>
      </div>
      <div class="card">
        <h3>📖 القرآن الكريم</h3>
        <div class="field"><label for="reciter">القارئ</label>
          <select id="reciter">${Object.entries(RECITERS).map(([k, r]) => `<option value="${k}" ${k === settings.reciter ? 'selected' : ''}>${r.name}</option>`).join('')}</select>
        </div>
      </div>
      <div class="card">
        <h3>🎨 المظهر</h3>
        <div class="seg" id="theme"><button data-v="auto">تلقائي</button><button data-v="light">فاتح</button><button data-v="dark">داكن</button></div>
      </div>
      <p class="center muted" style="font-size:.8rem">نور - رفيق المسلم · الإصدار ١٫٠</p>`;

    const seg = (id, key, cast) => {
      const sync = () => $$(`#${id} button`).forEach((b) => b.classList.toggle('active', cast(b.dataset.v) === settings[key]));
      $$(`#${id} button`).forEach((b) => b.addEventListener('click', () => {
        settings[key] = cast(b.dataset.v); saveSettings(); sync();
        if (key === 'theme') applyTheme();
        if (key === 'alerts' && settings.alerts && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission();
      }));
      sync();
    };
    seg('asr', 'asr', Number);
    seg('theme', 'theme', String);
    seg('alerts', 'alerts', (v) => v === '1' || v === true);

    $('#method').onchange = (e) => { settings.method = e.target.value; saveSettings(); toast('تم الحفظ'); };
    $('#reciter').onchange = (e) => { settings.reciter = e.target.value; saveSettings(); toast('تم الحفظ'); };
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

  // ---------- تنبيه الأذان ----------
  let lastAlert = store.get('lastAlert', 0);
  setInterval(() => {
    if (!settings.alerts) return;
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

  // ---------- التشغيل ----------
  applyTheme();
  router();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
