/* إذاعات القرآن الكريم: بث مباشر من قائمة mp3quran.net الرسمية (واجهة مجانية للمطورين)،
 * ومنها إذاعة القرآن الكريم من السعودية. التشغيل عبر مشغّل المكتبة الصوتية (يعمل في الخلفية مع مؤقت النوم). */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, esc, routes } = N;
  const API = 'https://www.mp3quran.net/api/v3/radios?language=ar';
  const MAIN_ID = 109082; // إذاعة القرآن الكريم - السعودية
  // نسخة احتياطية عند تعذّر تحميل القائمة (من نفس الواجهة الرسمية)
  const FALLBACK = [
    { id: 109082, name: 'إذاعة القرآن الكريم - السعودية', url: 'https://stream.radiojar.com/0tpy1h0kxtzuv' },
    { id: 108, name: 'العامة - متنوعة لمختلف القراء', url: 'https://backup.qurango.net/radio/mix' },
    { id: 109, name: 'تلاوات خاشعة', url: 'https://backup.qurango.net/radio/salma' },
    { id: 79, name: 'مشاري العفاسي', url: 'https://backup.qurango.net/radio/mishary_alafasi' },
    { id: 74, name: 'محمود خليل الحصري', url: 'https://backup.qurango.net/radio/mahmoud_khalil_alhussary' },
    { id: 69, name: 'محمد صديق المنشاوي', url: 'https://backup.qurango.net/radio/mohammed_siddiq_alminshawi' },
    { id: 32, name: 'عبدالباسط عبدالصمد', url: 'https://backup.qurango.net/radio/abdulbasit_abdulsamad' },
    { id: 63, name: 'ماهر المعيقلي', url: 'https://backup.qurango.net/radio/maher' },
  ];
  const FEATURED = [108, 109, 123, 10902, 115, 114, 10906, 10907];
  const GROUPS = [
    { k: 'reciters', t: '🎙️ إذاعات القراء' },
    { k: 'general', t: '📻 إذاعات متنوعة' },
    { k: 'ilm', t: '📚 التفسير والسيرة والحديث' },
    { k: 'tr', t: '🌍 ترجمات معاني القرآن' },
  ];
  const variant = (url) => (/_mojawwad$/.test(url) ? ' (مجوّد)' : /_warsh$/.test(url) ? ' (ورش)' : /_qalon$/.test(url) ? ' (قالون)' : '');
  const clean = (r) => ({ id: r.id, url: String(r.url || '').replace(/^http:/, 'https:'), name: String(r.name || '').replace(/^[-*\s]+|[-*\s]+$/g, '').replace(/\s+/g, ' ').trim() + variant(r.url || '') });
  function groupOf(r) {
    if (/translation/i.test(r.url)) return 'tr';
    if (/tafseer|tafsir|tabri|gareeb|siyra|sahabah|saheh|riyad|alanbiya|shmaeel|fatwa|alaikhtiarat|ramadan/i.test(r.url)) return 'ilm';
    if (/\/(mix|salma|tarateel|sakeenah|albaqarah|Surah_Al-Mulk|roqiah|athkar_sabah|athkar_masa|eid)$/.test(r.url) || r.id === MAIN_ID) return 'general';
    return 'reciters';
  }
  const norm = (t) => t.replace(/[ً-ْ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');

  let LIST = null;
  async function load() {
    if (LIST) return LIST;
    const c = store.get('radio:list');
    if (c && Date.now() - c.t < 3 * 864e5) return (LIST = c.data);
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(res.status);
      const data = (await res.json()).radios.map(clean).filter((r) => /^https:\/\//.test(r.url));
      store.set('radio:list', { t: Date.now(), data });
      return (LIST = data);
    } catch (e) {
      return c ? (LIST = c.data) : FALLBACK.map(clean);
    }
  }

  const favs = () => store.get('radio:fav', []);
  function play(r) {
    const lib = N.audioLib;
    if (!lib) { toast('المشغّل غير متاح'); return; }
    if (navigator.onLine === false) { toast('الإذاعة تحتاج اتصالاً بالإنترنت'); return; }
    lib.playQueue([{ url: r.url, title: r.name, sub: '📻 بث مباشر', live: true, radio: r.id }], 0);
    store.set('radio:last', r);
    toast(`جارٍ تشغيل: ${r.name}`);
    setTimeout(paint, 300);
  }
  const playingId = () => { const c = N.audioLib && N.audioLib.cur(); return c && c.radio && !N.audioLib.audio.paused ? c.radio : null; };

  function row(r) {
    const on = playingId() === r.id;
    return `<div class="card rd-row ${on ? 'on' : ''}" data-r="${r.id}">
      <button class="rd-play" data-p="${r.id}" aria-label="تشغيل">${on ? '⏸' : '▶'}</button>
      <div class="rd-name">${esc(r.name)}${on ? '<small>يُبث الآن</small>' : ''}</div>
      <button class="rd-fav" data-f="${r.id}" aria-label="المفضلة">${favs().includes(r.id) ? '★' : '☆'}</button>
    </div>`;
  }
  function bind(root, list) {
    const byId = Object.fromEntries(list.map((r) => [r.id, r]));
    $$('[data-p]', root).forEach((b) => { b.onclick = () => { const id = +b.dataset.p; if (playingId() === id) { N.audioLib.audio.pause(); setTimeout(paint, 100); } else play(byId[id]); }; });
    $$('[data-f]', root).forEach((b) => { b.onclick = () => { const F = favs(); const id = +b.dataset.f; const i = F.indexOf(id); if (i < 0) F.unshift(id); else F.splice(i, 1); store.set('radio:fav', F); b.textContent = i < 0 ? '★' : '☆'; toast(i < 0 ? 'أضيفت إلى المفضلة' : 'أُزيلت من المفضلة'); relist(); }; });
  }
  let paint = () => {};
  let relist = () => {};

  async function renderRadio() {
    N.view.innerHTML = '<div class="card center muted">جارٍ تحميل الإذاعات…</div>';
    const list = await load();
    if (!location.hash.startsWith('#/radio')) return;
    const byId = Object.fromEntries(list.map((r) => [r.id, r]));
    const main = byId[MAIN_ID] || clean(FALLBACK[0]);
    let q = '';
    let group = store.get('radio:group', 'reciters');
    paint = () => {
      if (!location.hash.startsWith('#/radio')) return;
      const mainOn = playingId() === main.id;
      N.view.innerHTML = `
        <div class="card rd-hero ${mainOn ? 'on' : ''}">
          <div><small>📻 بث مباشر على مدار الساعة</small><h2>${esc(main.name)}</h2></div>
          <button class="btn" id="rdMain">${mainOn ? '⏸ إيقاف' : '▶ استمع الآن'}</button>
        </div>
        <div class="chips" style="margin-bottom:12px">${FEATURED.map((id) => byId[id]).filter(Boolean).map((r) => `<button class="chip ${playingId() === r.id ? 'active' : ''}" data-p="${r.id}">${esc(r.name)}</button>`).join('')}</div>
        <input id="rdQ" class="rd-search" type="search" placeholder="ابحث باسم القارئ أو الإذاعة…" value="${esc(q)}">
        <div id="rdBody"></div>
        <p class="center muted" style="font-size:.8rem">${ar(list.length)} إذاعة • المصدر: mp3quran.net • تحتاج اتصالاً بالإنترنت، ويمكن ضبط مؤقت النوم من شاشة المشغّل</p>`;
      $('#rdMain').onclick = () => { if (playingId() === main.id) { N.audioLib.audio.pause(); setTimeout(paint, 100); } else play(main); };
      bind($('.chips', N.view), list);
      const inp = $('#rdQ');
      inp.oninput = () => { q = inp.value; paintList(); };
      paintList();
    };
    const paintList = () => {
      const box = $('#rdBody'); if (!box) return;
      const F = favs().map((id) => byId[id]).filter(Boolean);
      const nq = norm(q.trim());
      const shown = nq ? list.filter((r) => norm(r.name).includes(nq)) : list.filter((r) => groupOf(r) === group);
      box.innerHTML = `${F.length && !nq ? `<h3 class="rd-h">⭐ المفضلة</h3>${F.map(row).join('')}` : ''}
        ${nq ? '' : `<div class="seg rd-seg">${GROUPS.map((g) => `<button data-g="${g.k}" class="${g.k === group ? 'active' : ''}">${g.t}</button>`).join('')}</div>`}
        ${shown.map(row).join('') || '<div class="card center muted">لا توجد نتائج</div>'}`;
      bind(box, list);
      $$('[data-g]', box).forEach((b) => { b.onclick = () => { group = b.dataset.g; store.set('radio:group', group); paintList(); }; });
    };
    relist = () => paintList();
    paint();
    const a = N.audioLib && N.audioLib.audio;
    const re = () => paint();
    if (a) { a.addEventListener('play', re); a.addEventListener('pause', re); }
    return () => { paint = () => {}; if (a) { a.removeEventListener('play', re); a.removeEventListener('pause', re); } };
  }

  routes.radio = { title: 'إذاعات القرآن الكريم', render: renderRadio, back: 'home' };
});
