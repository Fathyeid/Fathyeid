/* المكتبة الصوتية للقرآن الكريم
 * مصدر تلاوات السور الكاملة: mp3quran.net (واجهة برمجية مجانية ومتاحة للمطورين)
 * مصدر التلاوة آية بآية (للتكرار والحفظ): cdn.islamic.network عبر alquran.cloud
 */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, arG, esc, routes } = N;
  const API3 = 'https://www.mp3quran.net/api/v3';
  const CACHE = 'noor-audio-v1';
  // القراء المطلوبون في الصفحة الأولى (معرّفات mp3quran)
  const FEATURED = [51, 118, 112, 125, 123, 102, 54, 31, 92, 81, 89, 12, 5, 60];
  const pad3 = (n) => String(n).padStart(3, '0');
  const sName = (s) => `سورة ${SURAH_NAMES[s - 1]}`;
  const rewaya = (m) => m.name.split(' - ')[0].trim();
  const fmtT = (sec) => {
    if (!isFinite(sec)) return '--:--';
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60;
    const t = h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
    return N.toAr(t);
  };
  const fmtSize = (b) => (b >= 1073741824 ? `${ar((b / 1073741824).toFixed(2))} جيجا` : `${ar(Math.max(0.1, b / 1048576).toFixed(1))} ميجا`);
  const normAr = (t) => t.replace(/[ً-ٰٟ]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, '');

  // ================= بيانات القراء =================
  let reciters = null;
  async function loadReciters(force) {
    if (reciters && !force) return reciters;
    const c = store.get('mp3q:reciters');
    if (!force && c && Date.now() - c.t < 7 * 864e5) return (reciters = c.data);
    try {
      const res = await fetch(`${API3}/reciters?language=ar`);
      if (!res.ok) throw new Error(res.status);
      const j = await res.json();
      const data = j.reciters
        .map((r) => ({ id: r.id, name: r.name.trim(), moshaf: r.moshaf.map((m) => ({ id: m.id, name: m.name.trim(), server: m.server, list: m.surah_list })) }))
        .filter((r) => r.moshaf.length);
      store.set('mp3q:reciters', { t: Date.now(), data });
      return (reciters = data);
    } catch (e) {
      if (c) return (reciters = c.data);
      throw e;
    }
  }
  const surahsOf = (m) => m.list.split(',').map(Number).filter(Boolean);
  const getR = (rid) => reciters && reciters.find((r) => r.id === rid);
  const itemFor = (r, m, s) => ({ kind: 'surah', url: `${m.server}${pad3(s)}.mp3`, title: sName(s), sub: `${r.name} • ${rewaya(m)}`, rid: r.id, mid: m.id, s });

  // ================= التحميل دون اتصال =================
  const dlIndex = () => store.get('audio:dl', {});
  const DL = { queue: [], active: null, ctrl: null, subs: new Set() };
  const emit = () => DL.subs.forEach((f) => { try { f(); } catch { /* تجاهل */ } });
  function enqueue(items) {
    const idx = dlIndex();
    let added = 0;
    items.forEach((it) => {
      if (idx[it.url] || (DL.active && DL.active.url === it.url) || DL.queue.some((q) => q.url === it.url)) return;
      DL.queue.push({ ...it });
      added++;
    });
    if (added && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    pump();
    return added;
  }
  async function pump() {
    if (DL.active || !DL.queue.length) { emit(); return; }
    const it = (DL.active = DL.queue.shift());
    DL.ctrl = new AbortController();
    it.got = 0; it.total = 0;
    emit();
    try {
      const res = await fetch(it.url, { signal: DL.ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      it.total = +res.headers.get('content-length') || 0;
      const reader = res.body.getReader();
      const chunks = [];
      let last = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        it.got += value.length;
        if (Date.now() - last > 300) { last = Date.now(); emit(); }
      }
      const blob = new Blob(chunks, { type: 'audio/mpeg' });
      const cache = await caches.open(CACHE);
      await cache.put(it.url, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': String(blob.size) } }));
      const idx = dlIndex();
      idx[it.url] = { size: blob.size, t: Date.now(), title: it.title, sub: it.sub, rid: it.rid, mid: it.mid, s: it.s };
      store.set('audio:dl', idx);
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('download', e);
        const n = DL.queue.length;
        DL.queue = [];
        toast(navigator.onLine === false ? 'لا يوجد اتصال بالإنترنت، تم إيقاف التحميل' : `تعذّر تحميل ${it.title}${n ? ' وتم إيقاف باقي التحميلات' : ''}`);
      }
    }
    DL.active = null;
    pump();
  }
  function cancelAll() { DL.queue = []; if (DL.ctrl) DL.ctrl.abort(); emit(); }
  async function removeDl(url) {
    try { const c = await caches.open(CACHE); await c.delete(url); } catch { /* تجاهل */ }
    const idx = dlIndex(); delete idx[url]; store.set('audio:dl', idx); emit();
  }
  const dlState = (url) => {
    if (dlIndex()[url]) return { done: true };
    if (DL.active && DL.active.url === url) return { active: true, pct: DL.active.total ? DL.active.got / DL.active.total : 0, got: DL.active.got };
    if (DL.queue.some((q) => q.url === url)) return { queued: true };
    return {};
  };

  // ================= المشغّل العام =================
  const audio = new Audio();
  audio.preload = 'auto';
  const P = { queue: [], idx: -1, repeat: store.get('audio:repeat', 'off'), speed: store.get('audio:speed', 1), sleepTimer: null, sleepAt: 0, sleepEnd: false };
  let objUrl = null;
  const cur = () => P.queue[P.idx];

  async function srcFor(url) {
    if (dlIndex()[url]) {
      try {
        const c = await caches.open(CACHE);
        const r = await c.match(url);
        if (r) return URL.createObjectURL(await r.blob());
      } catch { /* نعود للبث المباشر */ }
    }
    return url;
  }
  async function playIndex(i, startAt = 0) {
    if (i < 0 || i >= P.queue.length) return;
    P.idx = i;
    const it = cur();
    const src = await srcFor(it.url);
    if (objUrl) URL.revokeObjectURL(objUrl);
    objUrl = src.startsWith('blob:') ? src : null;
    audio.src = src;
    audio.playbackRate = P.speed;
    if (startAt > 1) audio.addEventListener('loadedmetadata', () => { try { audio.currentTime = startAt; } catch { /* تجاهل */ } }, { once: true });
    try { await audio.play(); } catch (e) { if (e.name !== 'AbortError') toast(navigator.onLine === false && !objUrl ? 'لا يوجد اتصال، حمّل السورة للاستماع دون إنترنت' : 'تعذّر تشغيل التلاوة'); }
    mediaMeta(it);
    saveLast(true);
    render();
  }
  function playQueue(items, i = 0, startAt = 0) { P.queue = items.slice(); playIndex(i, startAt); }
  const toggle = () => { if (!cur()) return; if (audio.paused) audio.play().catch(() => {}); else audio.pause(); };
  const next = () => { if (P.idx + 1 < P.queue.length) playIndex(P.idx + 1); else if (P.repeat === 'all' && P.queue.length) playIndex(0); };
  const prev = () => { if (audio.currentTime > 5 || P.idx === 0) audio.currentTime = 0; else playIndex(P.idx - 1); };
  function setSpeed(v) { P.speed = v; audio.playbackRate = v; store.set('audio:speed', v); render(); }
  function setRepeat(v) { P.repeat = v; store.set('audio:repeat', v); render(); }
  function setSleep(min) {
    clearTimeout(P.sleepTimer);
    P.sleepTimer = null; P.sleepAt = 0; P.sleepEnd = false;
    if (min === 'end') { P.sleepEnd = true; toast('سيتوقف التشغيل بنهاية السورة الحالية'); }
    else if (min > 0) {
      P.sleepAt = Date.now() + min * 60000;
      P.sleepTimer = setTimeout(() => { audio.pause(); P.sleepAt = 0; toast('تم إيقاف التشغيل (مؤقت النوم)'); render(); }, min * 60000);
      toast(`سيتوقف التشغيل بعد ${ar(min)} دقيقة`);
    }
    render();
  }
  audio.addEventListener('ended', () => {
    if (P.sleepEnd) { P.sleepEnd = false; render(); toast('تم إيقاف التشغيل (مؤقت النوم)'); return; }
    if (P.repeat === 'one') { playIndex(P.idx); return; }
    if (P.idx + 1 < P.queue.length) { playIndex(P.idx + 1); return; }
    if (P.repeat === 'all' && P.queue.length) { playIndex(0); return; }
    render();
  });
  audio.addEventListener('play', () => { window.dispatchEvent(new CustomEvent('noor:audio', { detail: 'lib' })); render(); });
  audio.addEventListener('pause', () => { saveLast(true); render(); });
  window.addEventListener('noor:audio', (e) => { if (e.detail !== 'lib' && !audio.paused) audio.pause(); });

  let lastSave = 0;
  function saveLast(force) {
    const it = cur();
    if (!it || (!force && Date.now() - lastSave < 5000)) return;
    lastSave = Date.now();
    store.set('audio:last', { item: it, time: audio.currentTime || 0, t: Date.now() });
  }
  audio.addEventListener('timeupdate', () => { saveLast(false); renderProgress(); });

  function mediaMeta(it) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: it.title, artist: it.sub, album: 'أثر - المكتبة الصوتية' });
      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('nexttrack', next);
      navigator.mediaSession.setActionHandler('previoustrack', prev);
      navigator.mediaSession.setActionHandler('seekto', (d) => { audio.currentTime = d.seekTime; });
    } catch { /* تجاهل */ }
  }

  // ================= المشغّل المصغّر =================
  const mini = document.createElement('div');
  mini.className = 'mini';
  mini.hidden = true;
  mini.innerHTML = `
    <div class="mini-prog"><div id="miniBar"></div></div>
    <div class="mini-row">
      <button class="mini-btn" id="miniPlay" aria-label="تشغيل أو إيقاف"></button>
      <button class="mini-info" id="miniOpen"><b id="miniTitle"></b><small id="miniSub"></small></button>
      <button class="mini-btn" id="miniNext" aria-label="التالي"><svg viewBox="0 0 24 24"><path d="M18 5v14M14 12L4 5v14z" fill="currentColor"/></svg></button>
      <button class="mini-btn" id="miniClose" aria-label="إغلاق المشغل"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>`;
  document.body.appendChild(mini);
  const PLAY_I = '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z" fill="currentColor"/></svg>';
  const PAUSE_I = '<svg viewBox="0 0 24 24"><path d="M7 4h4v16H7zM13 4h4v16h-4z" fill="currentColor"/></svg>';
  $('#miniPlay', mini).onclick = toggle;
  $('#miniNext', mini).onclick = next;
  $('#miniOpen', mini).onclick = () => go('player');
  $('#miniClose', mini).onclick = () => { audio.pause(); saveLast(true); P.queue = []; P.idx = -1; audio.removeAttribute('src'); audio.load(); render(); };

  function renderProgress() {
    const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    const bar = $('#miniBar', mini); if (bar) bar.style.width = pct + '%';
    const seek = $('#pSeek'); if (seek && !seek.matches(':active')) { seek.max = audio.duration || 0; seek.value = audio.currentTime || 0; }
    const t1 = $('#pCur'); if (t1) t1.textContent = fmtT(audio.currentTime);
    const t2 = $('#pDur'); if (t2) t2.textContent = fmtT(audio.duration);
  }
  function render() {
    const it = cur();
    const onPlayer = location.hash.startsWith('#/player');
    mini.hidden = !it || onPlayer;
    document.body.classList.toggle('has-mini', !mini.hidden);
    if (it) {
      $('#miniTitle', mini).textContent = it.title;
      $('#miniSub', mini).textContent = it.sub;
      $('#miniPlay', mini).innerHTML = audio.paused ? PLAY_I : PAUSE_I;
    }
    renderProgress();
    playerSubs.forEach((f) => f());
  }
  const playerSubs = new Set();
  window.addEventListener('hashchange', () => setTimeout(render, 0));

  // ================= المفضلة وقوائم التشغيل =================
  const favR = () => store.get('audio:favR', []);
  const toggleFavR = (rid) => { const f = favR(); const i = f.indexOf(rid); if (i >= 0) f.splice(i, 1); else f.unshift(rid); store.set('audio:favR', f); return i < 0; };
  const favS = () => store.get('audio:favS', []);
  const isFavS = (url) => favS().some((x) => x.url === url);
  const toggleFavS = (it) => { const f = favS(); const i = f.findIndex((x) => x.url === it.url); if (i >= 0) f.splice(i, 1); else f.unshift(it); store.set('audio:favS', f); return i < 0; };
  const lists = () => store.get('audio:playlists', []);
  const saveLists = (l) => store.set('audio:playlists', l);

  function addToPlaylistSheet(it) {
    const draw = () => {
      const l = lists();
      return `<div class="sheet-title">إضافة «${esc(it.title)}» إلى قائمة تشغيل</div>
        <div class="pl-pick">${l.map((p) => `<button class="btn ghost block" data-pl="${p.id}">📃 ${esc(p.name)} <small class="muted">(${ar(p.items.length)})</small></button>`).join('') || '<p class="muted center">لا توجد قوائم بعد</p>'}</div>
        <form id="newPl" style="display:flex;gap:8px;margin-top:10px"><input class="search" id="plName" placeholder="اسم قائمة جديدة" style="margin:0" maxlength="40"><button class="btn" type="submit">إنشاء</button></form>`;
    };
    const sh = N.sheet(draw());
    const bind = () => {
      $$('[data-pl]', sh.el).forEach((b) => b.addEventListener('click', () => {
        const l = lists(); const p = l.find((x) => x.id === b.dataset.pl);
        if (p.items.some((x) => x.url === it.url)) toast('موجودة بالفعل في القائمة');
        else { p.items.push(it); saveLists(l); toast(`أُضيفت إلى «${p.name}»`); }
        sh.close();
      }));
      $('#newPl', sh.el).addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#plName', sh.el).value.trim();
        if (!name) return;
        const l = lists(); l.unshift({ id: 'p' + Date.now(), name, items: [it] }); saveLists(l);
        toast(`تم إنشاء «${name}» وإضافة السورة`); sh.close();
      });
    };
    bind();
  }

  // ================= الصفحات =================
  const loading = () => { N.view.innerHTML = '<div class="loader"></div>'; };
  const failBox = (retry) => {
    N.view.innerHTML = '<div class="card center"><p>تعذّر تحميل قائمة القراء. تأكد من الاتصال بالإنترنت.</p><button class="btn" id="retry">إعادة المحاولة</button></div>';
    $('#retry').onclick = retry;
  };
  const resumeCard = () => {
    const l = store.get('audio:last');
    if (!l || !l.item) return '';
    return `<div class="card continue"><div style="min-width:0"><small class="muted">آخر موضع استماع</small><br><b>${esc(l.item.title)}</b> <small class="muted">— ${fmtT(l.time)}</small><br><small class="muted">${esc(l.item.sub)}</small></div><button class="btn" data-resume>متابعة</button></div>`;
  };
  const bindResume = (root) => {
    const b = $('[data-resume]', root);
    if (b) b.onclick = () => { const l = store.get('audio:last'); playQueue([l.item], 0, l.time); };
  };

  let audioTab = 'reciters';
  let rwFilter = store.get('audio:rw', 'حفص عن عاصم');
  function renderAudio() {
    loading();
    let alive = true;
    loadReciters().then(() => {
      if (!alive) return;
      const rws = [...new Set(reciters.flatMap((r) => r.moshaf.map(rewaya)))].sort();
      N.view.innerHTML = `
        ${resumeCard()}
        <div class="card dl-summary" id="dlSum" hidden></div>
        <input class="search" id="aq" type="search" placeholder="ابحث باسم القارئ أو السورة أو الرواية...">
        <div class="seg" id="atabs" style="margin-bottom:12px"><button data-t="reciters">القراء</button><button data-t="fav">المفضلة</button><button data-t="lists">القوائم</button><button data-t="dl">التحميلات</button></div>
        <div id="abody"></div>
        <div class="card" style="margin-top:14px"><h3>🔁 التكرار للحفظ</h3><p class="muted" style="margin:0 0 10px;font-size:.9rem">كرّر آية أو مجموعة آيات بعدد مرات تحدده، بصوت القارئ الذي تختاره.</p><button class="btn block" data-go="repeat">ابدأ التكرار</button></div>
        <p class="muted center" style="font-size:.78rem">التلاوات من موقع mp3quran.net، والتلاوة آية بآية من alquran.cloud.</p>`;
      bindResume(N.view);
      $$('[data-go]', N.view).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));

      const body = $('#abody');
      const recRow = (r) => {
        const ms = r.moshaf.filter((m) => !rwFilter || rewaya(m) === rwFilter);
        return `<button class="aud-rec" data-r="${r.id}"><span class="aud-av">${esc(r.name.replace(/^(الشيخ\s+)/, '').trim().charAt(0))}</span><span class="aud-info"><b>${esc(r.name)}</b><small>${ms.map((m) => esc(m.name)).join(' • ') || esc(r.moshaf.map((m) => m.name).join(' • '))}</small></span>${favR().includes(r.id) ? '<span class="aud-star">★</span>' : ''}</button>`;
      };
      const tabReciters = (q) => {
        const nq = normAr(q || '');
        const sMatch = nq ? SURAH_NAMES.map((n, i) => ({ n, s: i + 1 })).filter((x) => normAr(x.n).includes(nq)).slice(0, 6) : [];
        const list = reciters.filter((r) => r.moshaf.some((m) => !rwFilter || rewaya(m) === rwFilter))
          .filter((r) => !nq || normAr(r.name).includes(nq) || r.moshaf.some((m) => normAr(m.name).includes(nq)));
        const feat = !nq ? FEATURED.map(getR).filter((r) => r && list.includes(r)) : [];
        body.innerHTML = `
          <div class="field" style="margin-bottom:10px"><label for="rw">الرواية</label>
            <select id="rw"><option value="">كل الروايات</option>${rws.map((x) => `<option ${x === rwFilter ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
          ${sMatch.length ? `<div class="section-title" style="margin-top:6px">السور</div><div class="card" style="padding:4px">${sMatch.map((x) => `<button class="aud-rec" data-cmp="${x.s}"><span class="surah-num">${ar(x.s)}</span><span class="aud-info"><b>سورة ${x.n}</b><small>استمع بأصوات أكثر من قارئ وقارن بينهم</small></span></button>`).join('')}</div>` : ''}
          ${feat.length ? `<div class="section-title" style="margin-top:6px">قراء مختارون</div><div class="card" style="padding:4px">${feat.map(recRow).join('')}</div>` : ''}
          <div class="section-title">${nq ? 'نتائج البحث' : 'كل القراء'} <small class="muted">(${arG(list.length)})</small></div>
          <div class="card" style="padding:4px">${list.map(recRow).join('') || '<p class="center muted">لا توجد نتائج</p>'}</div>`;
        $('#rw').onchange = (e) => { rwFilter = e.target.value; store.set('audio:rw', rwFilter); tabReciters($('#aq').value); };
        $$('[data-r]', body).forEach((b) => b.addEventListener('click', () => go(`reciter/${b.dataset.r}`)));
        $$('[data-cmp]', body).forEach((b) => b.addEventListener('click', () => go(`compare/${b.dataset.cmp}`)));
      };
      const tabFav = () => {
        const fr = favR().map(getR).filter(Boolean);
        const fs = favS();
        body.innerHTML = `
          <div class="section-title" style="margin-top:4px">القراء المفضلون</div>
          <div class="card" style="padding:4px">${fr.map(recRow).join('') || '<p class="muted center">اضغط ☆ في صفحة القارئ لإضافته هنا</p>'}</div>
          <div class="section-title">السور المفضلة</div>
          ${fs.length ? `<button class="btn block" id="playFav" style="margin-bottom:10px">▶ تشغيل الكل (${ar(fs.length)})</button>` : ''}
          <div class="card" style="padding:4px">${fs.map((it, i) => `<div class="aud-row"><button class="aud-play" data-i="${i}">${PLAY_I}</button><div class="aud-info"><b>${esc(it.title)}</b><small>${esc(it.sub)}</small></div><button class="aud-ic" data-unfav="${i}" aria-label="إزالة">★</button></div>`).join('') || '<p class="muted center">اضغط ☆ بجانب أي سورة لإضافتها هنا</p>'}</div>`;
        $$('[data-r]', body).forEach((b) => b.addEventListener('click', () => go(`reciter/${b.dataset.r}`)));
        $$('[data-i]', body).forEach((b) => b.addEventListener('click', () => playQueue(fs, +b.dataset.i)));
        $$('[data-unfav]', body).forEach((b) => b.addEventListener('click', () => { toggleFavS(fs[+b.dataset.unfav]); tabFav(); }));
        if ($('#playFav')) $('#playFav').onclick = () => playQueue(fs, 0);
      };
      const tabLists = () => {
        const l = lists();
        body.innerHTML = `
          <form id="mkPl" style="display:flex;gap:8px;margin-bottom:12px"><input class="search" id="plN" placeholder="اسم قائمة تشغيل جديدة" style="margin:0" maxlength="40"><button class="btn" type="submit">إنشاء</button></form>
          <div class="card" style="padding:4px">${l.map((p) => `<button class="aud-rec" data-pl="${p.id}"><span class="aud-av">📃</span><span class="aud-info"><b>${esc(p.name)}</b><small>${ar(p.items.length)} عنصر</small></span></button>`).join('') || '<p class="muted center">لا توجد قوائم تشغيل بعد. أنشئ قائمة، ثم أضف إليها السور من صفحات القراء (زر ⋮).</p>'}</div>`;
        $('#mkPl').addEventListener('submit', (e) => {
          e.preventDefault();
          const name = $('#plN').value.trim(); if (!name) return;
          const x = lists(); x.unshift({ id: 'p' + Date.now(), name, items: [] }); saveLists(x); tabLists();
        });
        $$('[data-pl]', body).forEach((b) => b.addEventListener('click', () => go(`playlist/${b.dataset.pl}`)));
      };
      const tabDl = () => {
        const idx = dlIndex();
        const entries = Object.entries(idx).sort((a, b) => b[1].t - a[1].t);
        const total = entries.reduce((s, [, v]) => s + v.size, 0);
        body.innerHTML = `
          <div class="card"><div class="z-line"><span>الملفات المحمّلة</span><b>${arG(entries.length)}</b></div><div class="z-line"><span>المساحة المستخدمة</span><b>${fmtSize(total)}</b></div><div class="z-line" style="border:0"><span>المساحة المتاحة للتطبيق</span><b id="quota">…</b></div></div>
          ${entries.length ? `<button class="btn block" id="playDl" style="margin-bottom:10px">▶ تشغيل المحمّلات</button>` : ''}
          <div class="card" style="padding:4px">${entries.map(([url, v]) => `<div class="aud-row"><button class="aud-play" data-u="${esc(url)}">${PLAY_I}</button><div class="aud-info"><b>${esc(v.title)}</b><small>${esc(v.sub)} • ${fmtSize(v.size)}</small></div><button class="aud-ic" data-del="${esc(url)}" aria-label="حذف"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div>`).join('') || '<p class="muted center">لم تحمّل أي سورة بعد. اضغط ⬇ بجانب السورة في صفحة القارئ.</p>'}</div>`;
        if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then((e) => { const q = $('#quota'); if (q) q.textContent = fmtSize(Math.max(0, e.quota - e.usage)); }).catch(() => {});
        const items = entries.map(([url, v]) => ({ kind: 'surah', url, title: v.title, sub: v.sub, rid: v.rid, mid: v.mid, s: v.s }));
        $$('[data-u]', body).forEach((b) => b.addEventListener('click', () => playQueue(items, items.findIndex((x) => x.url === b.dataset.u))));
        $$('[data-del]', body).forEach((b) => b.addEventListener('click', async () => { await removeDl(b.dataset.del); toast('تم الحذف'); tabDl(); }));
        if ($('#playDl')) $('#playDl').onclick = () => playQueue(items, 0);
      };
      const tabs = { reciters: () => tabReciters($('#aq').value), fav: tabFav, lists: tabLists, dl: tabDl };
      const setTab = (t) => { audioTab = t; $$('#atabs button').forEach((b) => b.classList.toggle('active', b.dataset.t === t)); tabs[t](); };
      $$('#atabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.t)));
      $('#aq').addEventListener('input', (e) => { if (audioTab !== 'reciters') setTab('reciters'); else tabReciters(e.target.value); });
      setTab(audioTab);

      const sum = () => {
        const el = $('#dlSum'); if (!el) return;
        const n = DL.queue.length + (DL.active ? 1 : 0);
        el.hidden = !n;
        if (n) el.innerHTML = `<div class="dl-line"><span>⬇ جارٍ التحميل: ${esc(DL.active ? DL.active.title : '')} ${DL.active && DL.active.total ? ar(Math.round((DL.active.got / DL.active.total) * 100)) + '٪' : ''}</span><button class="btn ghost" id="dlCancel">إلغاء الكل</button></div><small class="muted">متبقٍ في الطابور: ${arG(DL.queue.length)}</small>`;
        const c = $('#dlCancel'); if (c) c.onclick = cancelAll;
      };
      DL.subs.add(sum); sum();
      cleanupFns.push(() => DL.subs.delete(sum));
    }).catch(() => alive && failBox(renderAudio));
    const cleanupFns = [];
    return () => { alive = false; cleanupFns.forEach((f) => f()); };
  }

  function renderReciter(arg, arg2) {
    loading();
    let alive = true;
    const subs = [];
    loadReciters().then(() => {
      if (!alive) return;
      const r = getR(+arg);
      if (!r) { N.view.innerHTML = '<div class="card center">لم يتم العثور على القارئ</div>'; return; }
      N.setTitle(r.name);
      let m = r.moshaf.find((x) => x.id === +arg2) || r.moshaf.find((x) => rewaya(x) === 'حفص عن عاصم' && /مرتل/.test(x.name)) || r.moshaf[0];
      const draw = () => {
        const ss = surahsOf(m);
        const items = ss.map((s) => itemFor(r, m, s));
        N.view.innerHTML = `
          <div class="card rec-head">
            <div class="aud-av big">${esc(r.name.charAt(0))}</div>
            <div style="flex:1;min-width:0"><b style="font-size:1.1rem">${esc(r.name)}</b><br><small class="muted">${ar(ss.length)} سورة</small></div>
            <button class="icon-btn" id="favR" aria-label="المفضلة">${favR().includes(r.id) ? '★' : '☆'}</button>
          </div>
          ${r.moshaf.length > 1 ? `<div class="field"><label for="ms">المصحف / الرواية</label><select id="ms">${r.moshaf.map((x) => `<option value="${x.id}" ${x.id === m.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>` : `<p class="muted" style="margin:0 0 10px">${esc(m.name)}</p>`}
          <div style="display:flex;gap:8px;margin-bottom:12px">
            <button class="btn block" id="playAll">▶ تشغيل الكل</button>
            <button class="btn ghost block" id="dlAll">⬇ تحميل الكل</button>
          </div>
          <div class="card" style="padding:4px" id="slist">${items.map((it, i) => `
            <div class="aud-row" data-row="${i}">
              <button class="aud-play" data-p="${i}" aria-label="تشغيل">${PLAY_I}</button>
              <div class="aud-info"><b>${ar(it.s)}. ${SURAH_NAMES[it.s - 1]}</b><small data-st="${i}"></small></div>
              <button class="aud-ic" data-f="${i}" aria-label="المفضلة">${isFavS(it.url) ? '★' : '☆'}</button>
              <button class="aud-ic" data-d="${i}" aria-label="تحميل"></button>
              <button class="aud-ic" data-m="${i}" aria-label="المزيد">⋮</button>
            </div>`).join('')}</div>`;
        $('#favR').onclick = (e) => { const on = toggleFavR(r.id); e.currentTarget.textContent = on ? '★' : '☆'; toast(on ? 'أُضيف إلى المفضلة' : 'أُزيل من المفضلة'); };
        if ($('#ms')) $('#ms').onchange = (e) => { m = r.moshaf.find((x) => x.id === +e.target.value); draw(); };
        $('#playAll').onclick = () => playQueue(items, 0);
        $('#dlAll').onclick = () => {
          const left = items.filter((it) => !dlIndex()[it.url]);
          if (!left.length) { toast('كل السور محمّلة بالفعل'); return; }
          const sh = N.sheet(`<div class="sheet-title">تحميل ${ar(left.length)} سورة</div>
            <p class="muted" style="line-height:1.9">سيتم تحميل السور واحدة تلو الأخرى لتعمل دون إنترنت. المصحف الكامل قد يصل حجمه إلى <b>١ جيجابايت أو أكثر</b> حسب القارئ، لذلك يُفضّل الاتصال بشبكة Wi-Fi.</p>
            <p class="muted" id="freeSp"></p>
            <div style="display:flex;gap:8px"><button class="btn block" id="go1">ابدأ التحميل</button><button class="btn ghost block" id="no1">إلغاء</button></div>`);
          if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then((e) => { const f = $('#freeSp', sh.el); if (f) f.textContent = `المساحة المتاحة للتطبيق: ${fmtSize(Math.max(0, e.quota - e.usage))}`; }).catch(() => {});
          $('#go1', sh.el).onclick = () => { enqueue(left); sh.close(); toast('بدأ التحميل'); };
          $('#no1', sh.el).onclick = sh.close;
        };
        $$('[data-p]').forEach((b) => b.addEventListener('click', () => playQueue(items, +b.dataset.p)));
        $$('[data-f]').forEach((b) => b.addEventListener('click', () => { const on = toggleFavS(items[+b.dataset.f]); b.textContent = on ? '★' : '☆'; }));
        $$('[data-d]').forEach((b) => b.addEventListener('click', () => {
          const it = items[+b.dataset.d];
          const st = dlState(it.url);
          if (st.done) {
            const sh = N.sheet(`<div class="sheet-title">${esc(it.title)}</div><p class="center muted">السورة محمّلة على جهازك</p><button class="btn ghost block" id="rm1">🗑 حذف التحميل</button>`);
            $('#rm1', sh.el).onclick = async () => { await removeDl(it.url); sh.close(); toast('تم الحذف'); };
          } else if (!st.active && !st.queued) { enqueue([it]); }
        }));
        $$('[data-m]').forEach((b) => b.addEventListener('click', () => {
          const it = items[+b.dataset.m];
          const sh = N.sheet(`<div class="sheet-title">${esc(it.title)}</div><p class="center muted" style="margin-top:0">${esc(it.sub)}</p>
            <div class="sheet-actions" style="grid-template-columns:1fr">
              <button class="btn" data-a="next">⏭ تشغيل بعد الحالية</button>
              <button class="btn ghost" data-a="pl">📃 إضافة إلى قائمة تشغيل</button>
              <button class="btn ghost" data-a="cmp">🎧 مقارنة مع قراء آخرين</button>
              <button class="btn ghost" data-a="read">📖 قراءة السورة</button>
            </div>`);
          $('[data-a="next"]', sh.el).onclick = () => { if (!cur()) playQueue([it]); else { P.queue.splice(P.idx + 1, 0, it); toast('ستُشغّل بعد الحالية'); } sh.close(); };
          $('[data-a="pl"]', sh.el).onclick = () => { sh.close(); setTimeout(() => addToPlaylistSheet(it), 260); };
          $('[data-a="cmp"]', sh.el).onclick = () => { sh.close(); go(`compare/${it.s}`); };
          $('[data-a="read"]', sh.el).onclick = () => { sh.close(); go(`surah/${it.s}`); };
        }));
        const upd = () => {
          items.forEach((it, i) => {
            const st = dlState(it.url);
            const d = $(`[data-d="${i}"]`); const s = $(`[data-st="${i}"]`);
            if (!d || !s) return;
            d.textContent = st.done ? '✔' : st.active ? `${ar(Math.round(st.pct * 100))}٪` : st.queued ? '…' : '⬇';
            d.classList.toggle('ok', !!st.done);
            const playing = cur() && cur().url === it.url;
            s.textContent = playing ? (audio.paused ? 'متوقفة' : '▶ يتم التشغيل الآن') : st.done ? 'محمّلة • تعمل دون إنترنت' : st.active ? `جارٍ التحميل ${st.got ? fmtSize(st.got) : ''}` : st.queued ? 'في طابور التحميل' : '';
            $(`[data-row="${i}"]`).classList.toggle('playing', !!playing);
          });
        };
        upd();
        DL.subs.add(upd); playerSubs.add(upd);
        subs.push(() => { DL.subs.delete(upd); playerSubs.delete(upd); });
      };
      draw();
    }).catch(() => alive && failBox(() => renderReciter(arg, arg2)));
    return () => { alive = false; subs.forEach((f) => f()); };
  }

  function renderPlayer() {
    const it = cur();
    if (!it) {
      const l = store.get('audio:last');
      N.view.innerHTML = `<div class="card center"><p style="font-size:2.4rem;margin:0">🎧</p><p>لا يوجد تشغيل حالياً</p>${l ? '<button class="btn" data-resume>متابعة آخر استماع</button> ' : ''}<button class="btn ghost" data-go="audio">افتح المكتبة الصوتية</button></div>`;
      bindResume(N.view);
      $('[data-go]').onclick = () => go('audio');
      return;
    }
    const draw = () => {
      const c = cur();
      if (!c) { go('audio'); return; }
      const sleepLabel = P.sleepEnd ? 'بنهاية السورة' : P.sleepAt ? `بعد ${ar(Math.max(1, Math.round((P.sleepAt - Date.now()) / 60000)))} د` : 'متوقف';
      N.view.innerHTML = `
        <section class="hero player-hero">
          <div class="pl-art">${c.kind === 'ayah' ? '🔁' : '🎧'}</div>
          <div class="next-name" style="font-family:'Amiri',serif">${esc(c.title)}</div>
          <div class="loc" style="justify-content:center">${esc(c.sub)}</div>
          <input type="range" id="pSeek" class="seek" min="0" step="1" aria-label="موضع التشغيل">
          <div class="p-times"><span id="pCur"></span><span id="pDur"></span></div>
          <div class="p-ctrl">
            <button class="p-btn" id="pPrev" aria-label="السابق"><svg viewBox="0 0 24 24"><path d="M6 5v14M10 12l10-7v14z" fill="currentColor"/></svg></button>
            <button class="p-btn big" id="pPlay" aria-label="تشغيل">${audio.paused ? PLAY_I : PAUSE_I}</button>
            <button class="p-btn" id="pNext" aria-label="التالي"><svg viewBox="0 0 24 24"><path d="M18 5v14M14 12L4 5v14z" fill="currentColor"/></svg></button>
          </div>
        </section>
        <div class="card">
          <div class="field"><label>سرعة التشغيل</label><div class="seg" id="spd">${[0.75, 1, 1.25, 1.5, 2].map((v) => `<button data-v="${v}">${ar(v)}×</button>`).join('')}</div></div>
          <div class="field"><label>التكرار</label><div class="seg" id="rpt"><button data-v="off">بدون</button><button data-v="one">تكرار الحالية</button><button data-v="all">تكرار القائمة</button></div></div>
          <div class="field" style="margin:0"><label>مؤقت إيقاف التشغيل <small class="muted">(${sleepLabel})</small></label><div class="seg" id="slp"><button data-v="0">إيقاف</button><button data-v="15">١٥د</button><button data-v="30">٣٠د</button><button data-v="60">ساعة</button><button data-v="end">نهاية السورة</button></div></div>
        </div>
        ${c.kind === 'surah' ? `<div style="display:flex;gap:8px;margin-bottom:14px"><button class="btn ghost block" id="pFav">${isFavS(c.url) ? '★ في المفضلة' : '☆ المفضلة'}</button><button class="btn ghost block" id="pList">📃 قائمة تشغيل</button><button class="btn ghost block" id="pRead">📖 قراءة</button></div>` : ''}
        <div class="section-title">قائمة التشغيل الحالية <small class="muted">(${ar(P.queue.length)})</small></div>
        <div class="card" style="padding:4px">${P.queue.slice(0, 200).map((q, i) => `<button class="aud-rec ${i === P.idx ? 'playing' : ''}" data-q="${i}"><span class="aud-av">${i === P.idx ? '▶' : ar(i + 1)}</span><span class="aud-info"><b>${esc(q.title)}</b><small>${esc(q.sub)}</small></span></button>`).join('')}${P.queue.length > 200 ? `<p class="muted center">و${arG(P.queue.length - 200)} عنصر آخر</p>` : ''}</div>`;
      $('#pPlay').onclick = toggle; $('#pNext').onclick = next; $('#pPrev').onclick = prev;
      const seek = $('#pSeek');
      seek.addEventListener('input', () => { $('#pCur').textContent = fmtT(+seek.value); });
      seek.addEventListener('change', () => { audio.currentTime = +seek.value; });
      $$('#spd button').forEach((b) => { b.classList.toggle('active', +b.dataset.v === P.speed); b.onclick = () => { setSpeed(+b.dataset.v); }; });
      $$('#rpt button').forEach((b) => { b.classList.toggle('active', b.dataset.v === P.repeat); b.onclick = () => setRepeat(b.dataset.v); });
      $$('#slp button').forEach((b) => { b.onclick = () => setSleep(b.dataset.v === 'end' ? 'end' : +b.dataset.v); });
      if ($('#pFav')) $('#pFav').onclick = (e) => { const on = toggleFavS(c); e.currentTarget.textContent = on ? '★ في المفضلة' : '☆ المفضلة'; };
      if ($('#pList')) $('#pList').onclick = () => addToPlaylistSheet(c);
      if ($('#pRead')) $('#pRead').onclick = () => go(`surah/${c.s}`);
      $$('[data-q]').forEach((b) => b.addEventListener('click', () => playIndex(+b.dataset.q)));
      renderProgress();
    };
    let lastKey = '';
    const onChange = () => {
      const key = `${P.idx}|${audio.paused}|${P.speed}|${P.repeat}|${P.sleepAt}|${P.sleepEnd}|${P.queue.length}`;
      if (key !== lastKey) { lastKey = key; draw(); }
    };
    onChange();
    playerSubs.add(onChange);
    return () => playerSubs.delete(onChange);
  }

  function renderCompare(arg) {
    const s = Math.min(114, Math.max(1, parseInt(arg, 10) || 1));
    N.setTitle(`مقارنة التلاوات • ${SURAH_NAMES[s - 1]}`);
    loading();
    let alive = true;
    const subs = [];
    loadReciters().then(() => {
      if (!alive) return;
      const opts = [];
      const add = (r) => r.moshaf.filter((m) => rewaya(m) === 'حفص عن عاصم' && surahsOf(m).includes(s)).forEach((m) => opts.push(itemFor(r, m, s)));
      FEATURED.map(getR).filter(Boolean).forEach(add);
      favR().map(getR).filter((r) => r && !FEATURED.includes(r.id)).forEach(add);
      let samePos = store.get('audio:cmpSame', true);
      const draw = () => {
        N.view.innerHTML = `
          <p class="muted" style="margin-top:0">استمع لسورة ${SURAH_NAMES[s - 1]} بأصوات عدة قراء، وانتقل بينهم بضغطة.</p>
          <label class="chk"><input type="checkbox" id="same" ${samePos ? 'checked' : ''}> عند التبديل ابدأ من نفس الموضع تقريباً</label>
          <div class="card" style="padding:4px;margin-top:10px">${opts.map((it, i) => `<div class="aud-row" data-row="${i}"><button class="aud-play" data-p="${i}">${PLAY_I}</button><div class="aud-info"><b>${esc(it.sub.split(' • ')[0])}</b><small>${esc(it.sub.split(' • ').slice(1).join(' • '))}</small></div></div>`).join('')}</div>`;
        $('#same').onchange = (e) => { samePos = e.target.checked; store.set('audio:cmpSame', samePos); };
        $$('[data-p]').forEach((b) => b.addEventListener('click', () => {
          const it = opts[+b.dataset.p];
          const c = cur();
          if (c && c.url === it.url) { toggle(); return; }
          const ratio = samePos && c && c.kind === 'surah' && c.s === s && audio.duration ? audio.currentTime / audio.duration : 0;
          playQueue([it], 0, 0);
          if (ratio) audio.addEventListener('loadedmetadata', () => { audio.currentTime = ratio * audio.duration; }, { once: true });
        }));
        upd();
      };
      const upd = () => opts.forEach((it, i) => {
        const row = $(`[data-row="${i}"]`); if (!row) return;
        const on = cur() && cur().url === it.url;
        row.classList.toggle('playing', !!on);
        $('.aud-play', row).innerHTML = on && !audio.paused ? PAUSE_I : PLAY_I;
      });
      draw();
      playerSubs.add(upd); subs.push(() => playerSubs.delete(upd));
    }).catch(() => alive && failBox(() => renderCompare(arg)));
    return () => { alive = false; subs.forEach((f) => f()); };
  }

  function renderPlaylist(arg) {
    const draw = () => {
      const l = lists(); const p = l.find((x) => x.id === arg);
      if (!p) { go('audio'); return; }
      N.setTitle(p.name);
      N.view.innerHTML = `
        <div style="display:flex;gap:8px;margin-bottom:12px"><button class="btn block" id="plPlay" ${p.items.length ? '' : 'disabled'}>▶ تشغيل</button><button class="btn ghost block" id="plDl" ${p.items.length ? '' : 'disabled'}>⬇ تحميل</button><button class="btn ghost" id="plDel">🗑</button></div>
        <div class="card" style="padding:4px">${p.items.map((it, i) => `<div class="aud-row"><button class="aud-play" data-p="${i}">${PLAY_I}</button><div class="aud-info"><b>${esc(it.title)}</b><small>${esc(it.sub)}</small></div><button class="aud-ic" data-up="${i}" aria-label="لأعلى">↑</button><button class="aud-ic" data-rm="${i}" aria-label="إزالة">✕</button></div>`).join('') || '<p class="muted center">القائمة فارغة. أضف سوراً من صفحة أي قارئ عبر زر ⋮</p>'}</div>`;
      if (p.items.length) { $('#plPlay').onclick = () => playQueue(p.items, 0); $('#plDl').onclick = () => { const n = enqueue(p.items); toast(n ? `بدأ تحميل ${ar(n)} عنصر` : 'كل العناصر محمّلة'); }; }
      $('#plDel').onclick = (e) => {
        if (!e.currentTarget.dataset.sure) { e.currentTarget.dataset.sure = 1; e.currentTarget.textContent = 'تأكيد الحذف؟'; return; }
        saveLists(lists().filter((x) => x.id !== arg)); toast('تم حذف القائمة'); go('audio');
      };
      $$('[data-p]').forEach((b) => b.addEventListener('click', () => playQueue(p.items, +b.dataset.p)));
      $$('[data-rm]').forEach((b) => b.addEventListener('click', () => { p.items.splice(+b.dataset.rm, 1); saveLists(l); draw(); }));
      $$('[data-up]').forEach((b) => b.addEventListener('click', () => { const i = +b.dataset.up; if (i > 0) { [p.items[i - 1], p.items[i]] = [p.items[i], p.items[i - 1]]; saveLists(l); draw(); } }));
    };
    draw();
  }

  // ================= التكرار للحفظ (آية بآية) =================
  const VERSE_RECITERS = {
    'ar.alafasy': ['مشاري العفاسي', 128], 'ar.husary': ['محمود خليل الحصري', 128], 'ar.husarymujawwad': ['الحصري (المجوّد)', 128],
    'ar.minshawi': ['محمد صديق المنشاوي', 128], 'ar.abdulbasitmurattal': ['عبد الباسط عبد الصمد (مرتل)', 192], 'ar.abdulsamad': ['عبد الباسط عبد الصمد (مجوّد)', 64],
    'ar.mahermuaiqly': ['ماهر المعيقلي', 128], 'ar.abdurrahmaansudais': ['عبد الرحمن السديس', 192], 'ar.saoodshuraym': ['سعود الشريم', 64],
    'ar.ahmedajamy': ['أحمد العجمي', 128], 'ar.hanirifai': ['هاني الرفاعي', 192], 'ar.abdullahbasfar': ['عبد الله بصفر', 192],
    'ar.muhammadayyoub': ['محمد أيوب', 128], 'ar.hudhaify': ['علي الحذيفي', 128],
  };
  function renderRepeat() {
    loading();
    let alive = true;
    N.fetchJSON(`${N.API}/surah`, 'surahList').then((list) => {
      if (!alive) return;
      const st = Object.assign({ ed: 'ar.husary', s: 1, from: 1, to: 7, each: 3, range: 1 }, store.get('audio:repeatCfg', {}));
      const offsets = []; list.reduce((acc, x, i) => { offsets[i] = acc; return acc + x.numberOfAyahs; }, 0);
      const cnt = (s) => list[s - 1].numberOfAyahs;
      N.view.innerHTML = `
        <div class="card">
          <div class="field"><label for="rEd">القارئ</label><select id="rEd">${Object.entries(VERSE_RECITERS).map(([k, v]) => `<option value="${k}" ${k === st.ed ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
          <div class="field"><label for="rS">السورة</label><select id="rS">${SURAH_NAMES.map((n, i) => `<option value="${i + 1}" ${i + 1 === st.s ? 'selected' : ''}>${ar(i + 1)}. ${n}</option>`).join('')}</select></div>
          <div style="display:flex;gap:10px"><div class="field" style="flex:1"><label for="rF">من آية</label><input class="search" id="rF" type="number" inputmode="numeric" min="1"></div><div class="field" style="flex:1"><label for="rT">إلى آية</label><input class="search" id="rT" type="number" inputmode="numeric" min="1"></div></div>
          <div class="field"><label>تكرار كل آية</label><div class="seg" id="rE">${[1, 2, 3, 5, 7, 10].map((v) => `<button data-v="${v}">${ar(v)}×</button>`).join('')}</div></div>
          <div class="field" style="margin:0"><label>تكرار المقطع كاملاً</label><div class="seg" id="rR">${[1, 2, 3, 5, 10, 0].map((v) => `<button data-v="${v}">${v ? ar(v) + '×' : '∞'}</button>`).join('')}</div></div>
        </div>
        <p class="muted center" id="rInfo"></p>
        <button class="btn block" id="rGo">▶ ابدأ التكرار</button>`;
      const fixRange = () => {
        const max = cnt(st.s);
        st.from = Math.min(Math.max(1, st.from | 0), max); st.to = Math.min(Math.max(st.from, st.to | 0), max);
        $('#rF').value = st.from; $('#rT').value = st.to; $('#rF').max = max; $('#rT').max = max;
        const ay = (n) => `${ar(n)} ${n >= 3 && n <= 10 ? 'آيات' : 'آية'}`;
        $('#rInfo').textContent = `سورة ${SURAH_NAMES[st.s - 1]} (${ay(max)}) • ${ay(st.to - st.from + 1)} × ${ar(st.each)} مرات${st.range ? ` × ${ar(st.range)} للمقطع` : ' • المقطع بلا توقف'}`;
        store.set('audio:repeatCfg', st);
      };
      const segs = () => {
        $$('#rE button').forEach((b) => b.classList.toggle('active', +b.dataset.v === st.each));
        $$('#rR button').forEach((b) => b.classList.toggle('active', +b.dataset.v === st.range));
      };
      $('#rEd').onchange = (e) => { st.ed = e.target.value; fixRange(); };
      $('#rS').onchange = (e) => { st.s = +e.target.value; st.from = 1; st.to = Math.min(cnt(st.s), 10); fixRange(); };
      $('#rF').onchange = (e) => { st.from = +e.target.value; fixRange(); };
      $('#rT').onchange = (e) => { st.to = +e.target.value; fixRange(); };
      $$('#rE button').forEach((b) => b.onclick = () => { st.each = +b.dataset.v; segs(); fixRange(); });
      $$('#rR button').forEach((b) => b.onclick = () => { st.range = +b.dataset.v; segs(); fixRange(); });
      segs(); fixRange();
      $('#rGo').onclick = () => {
        const [rn, br] = VERSE_RECITERS[st.ed];
        const one = [];
        for (let a = st.from; a <= st.to; a++) {
          const g = offsets[st.s - 1] + a;
          for (let k = 0; k < st.each; k++) one.push({ kind: 'ayah', url: `https://cdn.islamic.network/quran/audio/${br}/${st.ed}/${g}.mp3`, title: `${SURAH_NAMES[st.s - 1]} • الآية ${ar(a)}${st.each > 1 ? ` (${ar(k + 1)}/${ar(st.each)})` : ''}`, sub: `${rn} • تكرار للحفظ`, s: st.s });
        }
        let q = one;
        if (st.range > 1) { q = []; for (let i = 0; i < st.range; i++) q = q.concat(one); }
        setRepeat(st.range === 0 ? 'all' : 'off');
        playQueue(q, 0);
        go('player');
      };
    }).catch(() => alive && failBox(renderRepeat));
    return () => { alive = false; };
  }

  // ================= تسجيل الصفحات =================
  Object.assign(routes, {
    audio: { title: 'المكتبة الصوتية', render: renderAudio, back: 'home' },
    reciter: { title: 'القارئ', render: renderReciter, back: 'audio' },
    player: { title: 'المشغّل', render: renderPlayer, back: 'audio' },
    compare: { title: 'مقارنة التلاوات', render: renderCompare, back: 'audio' },
    playlist: { title: 'قائمة تشغيل', render: renderPlaylist, back: 'audio' },
    repeat: { title: 'التكرار للحفظ', render: renderRepeat, back: 'audio' },
  });

  // بطاقة آخر استماع في الرئيسية
  N.homeExtras.push((root) => {
    const html = resumeCard();
    if (!html) return;
    const d = document.createElement('div'); d.innerHTML = html; root.appendChild(d);
    bindResume(d);
  });

  N.audioLib = { playQueue, enqueue, loadReciters, dlIndex, removeDl, cur: () => cur(), audio, VERSE_RECITERS };
});
