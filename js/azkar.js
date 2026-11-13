/* موسوعة الأذكار والأدعية: تصنيفات موثقة، بحث شامل، عدّاد بتكرار مخصص، صوت حصن المسلم،
 * المفضلة والقوائم الشخصية، نسخ ومشاركة، حجم الخط، الوضع الليلي، التذكيرات، تقدم يومي، آخر قراءة.
 * البيانات في js/azkar-data.js (مولّدة من scripts/build-azkar.py) وتعمل بلا إنترنت. */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const DB = window.AZ_DB;
  if (!DB) return;
  const { $, $$, store, toast, go, ar, arG, esc, routes, sheet, shareText, todayKey } = N;
  const ITEMS = DB.items;
  const AUDIO = (id) => `https://www.hisnmuslim.com/audio/ar/${id}.mp3`;
  const CH = Object.fromEntries(DB.chapters.map((c) => [c.id, c]));
  const SETS = { azkar: DB.azkar, duas: DB.duas };
  const catOf = (type, key) => (SETS[type] || []).find((c) => c.k === key);
  const GOOD = ['quran', 'muttafaq', 'bukhari', 'muslim', 'sahih'];
  const gClass = (g) => (GOOD.includes(g) ? 'g-ok' : g === 'hasan' || g === 'maqbul' ? 'g-hasan' : g === 'daif' ? 'g-weak' : 'g-ref');

  // ---------- الحالة المحفوظة على الجهاز (بلا تسجيل دخول) ----------
  const pKey = () => `az:p:${todayKey()}`;
  const prog = () => store.get(pKey(), {});
  const target = (k) => store.get('az:rep', {})[k] || ITEMS[k].n || 1;
  const favs = () => store.get('az:fav', []);
  const lists = () => store.get('az:lists', []);
  const fs = () => store.get('az:fs', 1);
  const applyFs = () => document.documentElement.style.setProperty('--azfs', fs());
  applyFs();

  function bump(k) {
    const p = prog();
    const t = target(k);
    if ((p[k] || 0) >= t) return p[k];
    p[k] = (p[k] || 0) + 1;
    store.set(pKey(), p);
    if (p[k] >= t) { const d = store.get('az:days', {}); d[todayKey()] = (d[todayKey()] || 0) + 1; store.set('az:days', d); }
    return p[k];
  }
  function streak() {
    const d = store.get('az:days', {});
    let n = 0; const t = new Date();
    for (let i = 0; i < 400; i++) {
      const x = new Date(t.getFullYear(), t.getMonth(), t.getDate() - i);
      const k = N.ymdIn(x, N.tz()).join('-');
      if (d[k]) n++; else if (i > 0) break;
    }
    return n;
  }

  // ---------- البحث ----------
  const norm = (s) => String(s || '').replace(/[ً-ْٰـ]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^ء-ي0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  let IDX = null;
  function index() {
    if (IDX) return IDX;
    const where = {};
    for (const [type, set] of Object.entries(SETS)) for (const c of set) for (const k of c.items) (where[k] = where[k] || []).push([type, c.k, c.t]);
    IDX = Object.values(ITEMS).map((it) => ({
      k: it.k,
      s: norm([it.t, it.title, it.ch ? CH[`c${it.ch}`] && CH[`c${it.ch}`].t : '', (where[it.k] || []).map((w) => w[2]).join(' '), it.f, it.p].join(' ')),
      where: where[it.k] || [],
    }));
    return IDX;
  }
  function search(q) {
    const words = norm(q).split(' ').filter((w) => w.length > 1);
    if (!words.length) return [];
    return index().filter((x) => words.every((w) => x.s.includes(w))).map((x) => x.k);
  }

  // ---------- صوت حصن المسلم ----------
  const player = new Audio();
  player.preload = 'none';
  let playing = null;
  function play(k, btn) {
    if (playing === k && !player.paused) { player.pause(); return; }
    window.dispatchEvent(new CustomEvent('noor:audio', { detail: 'azkar' }));
    playing = k;
    player.src = AUDIO(ITEMS[k].a);
    player.play().catch(() => toast('تعذّر تشغيل الصوت — تأكد من الاتصال بالإنترنت'));
    const sync = () => $$('[data-play]').forEach((b) => { b.textContent = b.dataset.play === playing && !player.paused ? '⏸' : '🔊'; });
    player.onplay = player.onpause = player.onended = sync;
    sync();
  }
  window.addEventListener('noor:audio', (e) => { if (e.detail !== 'azkar') player.pause(); });

  // ---------- بطاقة الذكر ----------
  function card(k, i) {
    const it = ITEMS[k];
    const ch = it.ch && CH[`c${it.ch}`];
    const head = it.title || (ch ? ch.t : '');
    const t = target(k);
    return `<div class="card zikr azi" data-k="${k}" data-i="${i}">
      ${head ? `<div class="az-head">${esc(head)}</div>` : ''}
      <p class="azt">${esc(it.t)}</p>
      <div class="az-src"><span class="az-g ${gClass(it.g)}">${esc(DB.grades[it.g] || 'المصدر')}</span>
        <small>${esc(srcLine(it))}</small></div>
      <div class="meta">
        <div class="az-act">
          ${it.a ? `<button data-play="${k}" title="استماع">🔊</button>` : ''}
          <button data-fav title="المفضلة">${favs().includes(k) ? '★' : '☆'}</button>
          <button data-copy title="نسخ">📋</button>
          <button data-share title="مشاركة">↗</button>
          <button data-more title="المزيد">⋯</button>
        </div>
        <button class="counter-btn" data-t="${t}"></button>
      </div>
    </div>`;
  }
  function srcLine(it) {
    if (it.src === 'quran') return it.f;
    if (it.src === 'hisn') return it.no ? `حصن المسلم • الذكر رقم ${ar(it.no)}` : 'حصن المسلم';
    return (it.f || '').split('،')[0];
  }
  const plain = (it) => `${it.title ? it.title + '\n' : ''}${it.t}\n\n[${it.src === 'quran' ? it.f : (DB.grades[it.g] || '') + (it.f ? ' — ' + it.f : '')}]`;

  function sourceSheet(k) {
    const it = ITEMS[k];
    const ch = it.ch && CH[`c${it.ch}`];
    let link = '';
    if (it.src === 'quran') link = `<button class="btn block" data-surah="${it.s}">📖 فتح السورة في المصحف</button><a class="btn ghost block" target="_blank" rel="noopener" href="https://quran.com/${it.s}/${it.ay[0]}-${it.ay[1]}">عرض الآيات على Quran.com</a>`;
    else if (it.link) { const [b, n] = it.link.split(':'); link = `<a class="btn block" target="_blank" rel="noopener" href="https://sunnah.com/${b}:${n}">📚 عرض الحديث في مصدره (sunnah.com)</a>`; }
    else if (it.src === 'hisn') link = `<a class="btn block" target="_blank" rel="noopener" href="https://www.hisnmuslim.com/">📚 الموقع الرسمي لحصن المسلم</a>`;
    const s = sheet(`<h3 style="margin-top:0">📚 التوثيق والمصدر</h3>
      <p><span class="az-g ${gClass(it.g)}">${esc(DB.grades[it.g] || '')}</span></p>
      ${it.src === 'hisn' ? `<p><b>المصدر:</b> كتاب «حصن المسلم من أذكار الكتاب والسنة» للشيخ د. سعيد بن علي بن وهف القحطاني — باب «${esc(ch ? ch.t : '')}»${it.no ? `، الذكر رقم ${ar(it.no)}` : ''}.</p>` : ''}
      ${it.src === 'quran' ? `<p><b>المصدر:</b> القرآن الكريم — ${esc(it.f)}</p>` : ''}
      ${it.f && it.src !== 'quran' ? `<p><b>التخريج كما في المصدر:</b><br>${esc(it.f)}</p>` : ''}
      ${!it.f && ch && ch.notes ? `<p><b>تخريج أحاديث الباب:</b><br>${ch.notes.map(esc).join('<br>')}</p>` : ''}
      <p class="muted" style="font-size:.85rem">الحكم المذكور منقول عمّا نصّ عليه التخريج نفسه، ولا نضع حكماً من عندنا. «مقبول» تعني أن الألباني أورده في كتبه التي جمع فيها الصحيح والحسن.</p>
      <div style="display:grid;gap:8px">${link}</div>`);
    const b = $('[data-surah]', s.el); if (b) b.onclick = () => { s.close(); go(`surah/${b.dataset.surah}`); };
  }

  function moreSheet(k, refresh) {
    const it = ITEMS[k];
    const L = lists();
    const s = sheet(`<h3 style="margin-top:0">خيارات الذكر</h3>
      <div style="display:grid;gap:8px">
        <button class="btn ghost block" data-a="src">📚 المصدر والتوثيق</button>
        <div class="card" style="margin:0"><b>🔁 عدد التكرار</b> <small class="muted">(الأصلي: ${ar(it.n)})</small>
          <div class="chips" style="margin-top:8px">${[1, 3, 7, 10, 33, 100].map((n) => `<button class="chip ${target(k) === n ? 'active' : ''}" data-rep="${n}">${ar(n)}</button>`).join('')}
          <input type="number" min="1" max="1000" id="azRep" placeholder="عدد آخر" style="width:90px" class="chip"></div></div>
        <div class="card" style="margin:0"><b>➕ أضف إلى قائمة</b>
          <div class="chips" style="margin-top:8px">${L.map((l, i) => `<button class="chip ${l.items.includes(k) ? 'active' : ''}" data-list="${i}">${esc(l.name)}</button>`).join('')}<button class="chip" data-newlist>+ قائمة جديدة</button></div></div>
        <button class="btn ghost block" data-a="reset">↺ تصفير عدّاد هذا الذكر اليوم</button>
      </div>`);
    const setRep = (n) => { const r = store.get('az:rep', {}); if (n === it.n) delete r[k]; else r[k] = n; store.set('az:rep', r); toast(`التكرار: ${ar(n)}`); s.close(); refresh(); };
    $$('[data-rep]', s.el).forEach((b) => { b.onclick = () => setRep(+b.dataset.rep); });
    $('#azRep', s.el).onchange = (e) => { const n = Math.max(1, Math.min(1000, +e.target.value || 1)); setRep(n); };
    $$('[data-list]', s.el).forEach((b) => { b.onclick = () => { const L2 = lists(); const l = L2[+b.dataset.list]; const j = l.items.indexOf(k); if (j < 0) l.items.push(k); else l.items.splice(j, 1); store.set('az:lists', L2); b.classList.toggle('active', j < 0); toast(j < 0 ? `أضيف إلى «${l.name}»` : 'أُزيل من القائمة'); }; });
    $('[data-newlist]', s.el).onclick = () => { const name = (prompt('اسم القائمة الجديدة') || '').trim(); if (!name) return; const L2 = lists(); L2.push({ name, items: [k] }); store.set('az:lists', L2); toast(`أُنشئت «${name}» وأضيف الذكر`); s.close(); };
    $('[data-a="src"]', s.el).onclick = () => { s.close(); setTimeout(() => sourceSheet(k), 260); };
    $('[data-a="reset"]', s.el).onclick = () => { const p = prog(); delete p[k]; store.set(pKey(), p); s.close(); refresh(); };
  }

  // ---------- قائمة بطاقات (قسم، بحث، مفضلة، قائمة شخصية) ----------
  function renderItems(keys, opts = {}) {
    const box = opts.root || N.view;
    box.innerHTML = `${opts.top || ''}
      ${opts.noProgress ? '' : '<div class="progress"><div id="bar"></div></div>'}
      <div class="az-tools"><button class="chip" id="fsM">أ−</button><button class="chip" id="fsP">أ+</button><button class="chip" id="night">🌓 ليلي</button>${opts.noProgress ? '' : '<button class="chip" id="rstAll">↺ تصفير</button>'}</div>
      ${keys.length ? keys.map((k, i) => card(k, i)).join('') : `<div class="card center muted">${opts.empty || 'لا توجد نتائج'}</div>`}
      ${opts.bottom || ''}`;
    const update = () => {
      const p = prog(); let done = 0;
      $$('.azi', box).forEach((el) => {
        const k = el.dataset.k, t = target(k), c = p[k] || 0, ok = c >= t;
        if (ok) done++;
        el.classList.toggle('done', ok);
        $('.counter-btn', el).textContent = ok ? '✓ تم' : `${ar(c)} / ${ar(t)}`;
      });
      const bar = $('#bar', box); if (bar) bar.style.width = (keys.length ? (done / keys.length) * 100 : 0) + '%';
      return done;
    };
    const rerender = () => renderItems(keys, opts);
    $$('.azi', box).forEach((el) => {
      const k = el.dataset.k;
      const tap = () => {
        const before = prog()[k] || 0;
        if (before >= target(k)) return;
        const c = bump(k);
        navigator.vibrate && navigator.vibrate(c >= target(k) ? [30, 40, 30] : 12);
        if (opts.lastRead) store.set('az:last', Object.assign({}, opts.lastRead, { i: +el.dataset.i, at: Date.now() }));
        const done = update();
        if (c >= target(k)) {
          if (!opts.noProgress && done === keys.length) toast('أتممت هذا القسم، تقبّل الله منك 🤍');
          else { const nx = el.nextElementSibling; if (nx && nx.classList.contains('azi')) setTimeout(() => nx.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250); }
        }
      };
      $('.counter-btn', el).onclick = (e) => { e.stopPropagation(); tap(); };
      $('.azt', el).onclick = tap;
      const pb = $('[data-play]', el); if (pb) pb.onclick = () => play(k, pb);
      $('[data-fav]', el).onclick = (e) => { const F = favs(); const j = F.indexOf(k); if (j < 0) F.push(k); else F.splice(j, 1); store.set('az:fav', F); e.target.textContent = j < 0 ? '★' : '☆'; toast(j < 0 ? 'أضيف إلى المفضلة' : 'أُزيل من المفضلة'); };
      $('[data-copy]', el).onclick = async () => { try { await navigator.clipboard.writeText(plain(ITEMS[k])); toast('تم النسخ'); } catch { toast('تعذّر النسخ'); } };
      $('[data-share]', el).onclick = () => shareText(plain(ITEMS[k]) + '\n\nمن تطبيق أثر - رفيق المسلم');
      $('[data-more]', el).onclick = () => moreSheet(k, rerender);
      $('.az-src', el).onclick = () => sourceSheet(k);
    });
    $('#fsM', box).onclick = () => { store.set('az:fs', Math.max(0.8, +(fs() - 0.1).toFixed(2))); applyFs(); };
    $('#fsP', box).onclick = () => { store.set('az:fs', Math.min(1.9, +(fs() + 0.1).toFixed(2))); applyFs(); };
    $('#night', box).onclick = () => { const dark = document.documentElement.dataset.theme === 'dark'; N.settings.theme = dark ? 'light' : 'dark'; store.set('themeChosen', true); N.saveSettings(); N.applyTheme && N.applyTheme(); };
    const ra = $('#rstAll', box); if (ra) ra.onclick = () => { if (!confirm('تصفير عدّادات هذا القسم لليوم؟')) return; const p = prog(); keys.forEach((k) => delete p[k]); store.set(pKey(), p); update(); };
    update();
    if (opts.scrollTo != null) { const el = $(`.azi[data-i="${opts.scrollTo}"]`, box); if (el) setTimeout(() => el.scrollIntoView({ block: 'center' }), 60); }
  }

  // ---------- الصفحة الرئيسية للموسوعة ----------
  function catStats(c) { const p = prog(); return c.items.filter((k) => (p[k] || 0) >= target(k)).length; }
  function renderHome(tab) {
    tab = tab === 'duas' ? 'duas' : 'azkar';
    const last = store.get('az:last');
    const lastCat = last && catOf(last.type, last.key);
    const todayDone = Object.keys(prog()).filter((k) => ITEMS[k] && (prog()[k] || 0) >= target(k)).length;
    const st = streak();
    const set = SETS[tab];
    const cnt = (k) => Object.values(ITEMS).filter((x) => x.src === k).length;
    N.view.innerHTML = `
      <form id="azS" class="az-search"><input id="azQ" type="search" placeholder="ابحث في الأذكار والأدعية: كلمة من النص، موضوع، سورة…" autocomplete="off"><button class="btn">بحث</button></form>
      <div class="az-stats card">
        <div><b>${ar(todayDone)}</b><small>ذكر أتممته اليوم</small></div>
        <div><b>${ar(st)}</b><small>يوم متتالٍ</small></div>
        <div><b>${ar(favs().length)}</b><small>في المفضلة</small></div>
      </div>
      ${lastCat ? `<div class="card continue"><div style="min-width:0"><small class="muted">📌 آخر قراءة</small><br><b>${esc(lastCat.t)}</b></div><button class="btn" id="cont">متابعة</button></div>` : ''}
      <div class="seg" style="margin-bottom:14px"><button data-tab="azkar" class="${tab === 'azkar' ? 'active' : ''}">📿 الأذكار</button><button data-tab="duas" class="${tab === 'duas' ? 'active' : ''}">🤲 الأدعية</button></div>
      <div class="grid az-grid">
        ${set.map((c) => `<button class="tile" data-c="${c.k}"><span class="ic">${c.ic}</span>${esc(c.t)}<small class="muted">${ar(catStats(c))} / ${ar(c.items.length)}</small></button>`).join('')}
      </div>
      <div class="grid az-grid" style="margin-top:6px">
        <button class="tile" data-go="azfav"><span class="ic">⭐</span>المفضلة</button>
        <button class="tile" data-go="azlists"><span class="ic">🗂️</span>قوائمي</button>
        <button class="tile" data-go="azset"><span class="ic">⏰</span>التذكيرات</button>
        <button class="tile" data-go="azabout"><span class="ic">📚</span>المصادر والمنهج</button>
      </div>
      <div class="card"><h3>📿 الأذكار المختصرة (الأقسام السابقة)</h3>
        <div class="chips">${Object.entries(N.AZKAR || {}).map(([k, z]) => `<button class="chip" data-old="${k}">${z.icon} ${esc(z.title)}</button>`).join('')}</div></div>
      <p class="center muted" style="font-size:.8rem">${arG(cnt('hisn'))} ذكراً من حصن المسلم • ${arG(cnt('quran'))} دعاءً وآية من القرآن • ${arG(cnt('sunnah'))} حديثاً مخرّجاً — كلها محفوظة داخل التطبيق وتعمل بلا إنترنت</p>`;
    $('#azS').onsubmit = (e) => { e.preventDefault(); const q = $('#azQ').value.trim(); if (q.length < 2) { toast('اكتب كلمة من حرفين على الأقل'); return; } go(`azsearch/${encodeURIComponent(q)}`); };
    $$('[data-tab]').forEach((b) => { b.onclick = () => go(`azkar/${b.dataset.tab}`); });
    $$('[data-c]').forEach((b) => { b.onclick = () => go(`azcat/${tab}/${b.dataset.c}`); });
    $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); });
    $$('[data-old]').forEach((b) => { b.onclick = () => go(`zikr/${b.dataset.old}`); });
    const cb = $('#cont'); if (cb) cb.onclick = () => go(`azcat/${last.type}/${last.key}/${last.i || 0}`);
  }

  function renderCat(type, key, at) {
    const c = catOf(type, key);
    if (!c) { go('azkar'); return; }
    N.setTitle(c.t);
    routes.azcat.back = `azkar/${type}`;
    store.set('az:last', { type, key, i: +at || 0, at: Date.now() });
    renderItems(c.items, { lastRead: { type, key }, scrollTo: at != null ? +at : null });
  }
  function renderSearch(q) {
    q = decodeURIComponent(q || '');
    const res = search(q);
    renderItems(res, {
      noProgress: true,
      top: `<form id="azS2" class="az-search"><input id="azQ2" type="search" value="${esc(q)}"><button class="btn">بحث</button></form><p class="muted" style="font-size:.9rem">${arG(res.length)} نتيجة لـ «${esc(q)}»</p>`,
      empty: 'لا توجد نتائج. جرّب كلمة أخرى مثل: الكرب، السفر، المطر، الرزق، يونس…',
    });
    $('#azS2').onsubmit = (e) => { e.preventDefault(); const v = $('#azQ2').value.trim(); if (v.length >= 2) go(`azsearch/${encodeURIComponent(v)}`); };
  }
  function renderFav() { renderItems(favs().filter((k) => ITEMS[k]), { empty: 'لم تُضف شيئاً بعد. اضغط ☆ على أي ذكر لإضافته.' }); }
  function renderLists() {
    const L = lists();
    N.view.innerHTML = `${L.map((l, i) => `<div class="card continue"><div style="min-width:0"><b>${esc(l.name)}</b><br><small class="muted">${ar(l.items.length)} ذكر/دعاء</small></div><div style="display:flex;gap:6px"><button class="btn" data-open="${i}">فتح</button><button class="btn ghost" data-del="${i}">🗑</button></div></div>`).join('') || '<div class="card center muted">لا توجد قوائم بعد. أنشئ قائمة ثم أضف إليها من زر ⋯ على أي ذكر.</div>'}
      <button class="btn block" id="newL">+ إنشاء قائمة جديدة</button>`;
    $$('[data-open]').forEach((b) => { b.onclick = () => go(`azlist/${b.dataset.open}`); });
    $$('[data-del]').forEach((b) => { b.onclick = () => { const L2 = lists(); if (!confirm(`حذف قائمة «${L2[+b.dataset.del].name}»؟`)) return; L2.splice(+b.dataset.del, 1); store.set('az:lists', L2); renderLists(); }; });
    $('#newL').onclick = () => { const name = (prompt('اسم القائمة') || '').trim(); if (!name) return; const L2 = lists(); L2.push({ name, items: [] }); store.set('az:lists', L2); renderLists(); };
  }
  function renderList(i) {
    const l = lists()[+i];
    if (!l) { go('azlists'); return; }
    N.setTitle(l.name);
    renderItems(l.items.filter((k) => ITEMS[k]), { lastRead: null, empty: 'القائمة فارغة. أضف إليها من زر ⋯ على أي ذكر.', bottom: '<button class="btn ghost block" id="renL">✏️ إعادة تسمية القائمة</button>' });
    $('#renL').onclick = () => { const L2 = lists(); const name = (prompt('الاسم الجديد', L2[+i].name) || '').trim(); if (!name) return; L2[+i].name = name; store.set('az:lists', L2); renderList(i); };
  }

  // ---------- التذكيرات ----------
  const REM = [
    { id: 3101, k: 'morning', t: 'أذكار الصباح', def: '06:30', route: 'azcat/azkar/morning' },
    { id: 3102, k: 'evening', t: 'أذكار المساء', def: '17:00', route: 'azcat/azkar/morning' },
    { id: 3103, k: 'sleep', t: 'أذكار النوم', def: '22:30', route: 'azcat/azkar/sleep' },
    { id: 3104, k: 'friday', t: 'الجمعة: الكهف والصلاة على النبي ﷺ', def: '10:00', route: 'azcat/azkar/friday', weekday: 6 },
  ];
  const LN = () => N.NATIVE && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  async function scheduleRem() {
    const ln = LN(); if (!ln) return;
    try {
      const R = store.get('az:rem', {});
      const D = dayRem();
      await ln.cancel({ notifications: REM.map((r) => ({ id: r.id })).concat(Array.from({ length: 24 }, (_, i) => ({ id: 3110 + i }))) });
      const on = REM.filter((r) => R[r.k]);
      const slots = daySlots(D);
      if (N.scheduleAdhan) N.scheduleAdhan(); // أذكار ما بعد الصلاة تُجدول مع مواقيت الأذان
      if (!on.length && !slots.length) return;
      let perm = await ln.checkPermissions(); if (perm.display !== 'granted') perm = await ln.requestPermissions(); if (perm.display !== 'granted') return;
      await ln.createChannel({ id: 'azkar', name: 'تذكير الأذكار', description: 'أذكار الصباح والمساء والنوم والتذكير بالذكر خلال اليوم', importance: 4, visibility: 1 });
      const list = on.map((r) => { const [hour, minute] = R[r.k].split(':').map(Number); const sch = { hour, minute }; if (r.weekday) sch.weekday = r.weekday; return { id: r.id, title: `حان وقت ${r.t} 📿`, body: '﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾ — افتح «أثر»', channelId: 'azkar', extra: { route: r.route }, schedule: { on: sch, allowWhileIdle: true } }; });
      slots.forEach(([hour, minute], i) => { const z = SHORT[i % SHORT.length]; list.push({ id: 3110 + i, title: '📿 تذكير بالذكر', body: `${z.t}\n${z.f}`, channelId: 'azkar', extra: { route: 'tasbih' }, schedule: { on: { hour, minute }, allowWhileIdle: true } }); });
      await ln.schedule({ notifications: list });
    } catch (e) { console.warn('azkar reminders', e); }
  }
  // أذكار قصيرة صحيحة للتذكير خلال اليوم (كل ذكر بمصدره)
  const SHORT = [
    { t: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ', f: '«كلمتان خفيفتان على اللسان، ثقيلتان في الميزان» — متفق عليه' },
    { t: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', f: '«من صلى عليّ صلاة صلى الله عليه بها عشراً» — رواه مسلم' },
    { t: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', f: '«كنز من كنوز الجنة» — متفق عليه' },
    { t: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', f: '«إني لأستغفر الله وأتوب إليه في اليوم أكثر من سبعين مرة» — رواه البخاري' },
    { t: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ', f: '«أحب الكلام إلى الله أربع» — رواه مسلم' },
    { t: 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ', f: 'دعاء ذي النون — سورة الأنبياء: ٨٧' },
    { t: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', f: 'متفق عليه' },
    { t: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ وَرِضَا نَفْسِهِ وَزِنَةَ عَرْشِهِ وَمِدَادَ كَلِمَاتِهِ', f: 'رواه مسلم' },
  ];
  const dayRem = () => Object.assign({ every: 0, from: '09:00', to: '22:00', after: false }, store.get('az:rem2', {}));
  function daySlots(D) {
    if (!D.every) return [];
    const m = (s) => { const [h, x] = s.split(':').map(Number); return h * 60 + x; };
    const out = [];
    for (let t = m(D.from); t <= m(D.to) && out.length < 24; t += D.every * 60) out.push([Math.floor(t / 60), t % 60]);
    return out;
  }
  N.azAfterPrayer = () => dayRem().after;
  function renderSet() {
    const R = store.get('az:rem', {});
    const D = dayRem();
    N.view.innerHTML = `<div class="card"><h3>⏰ تذكيرات الأذكار</h3>
      ${N.NATIVE ? '' : '<p class="muted" style="font-size:.9rem">التذكيرات تعمل في تطبيق أندرويد. في المتصفح تُحفظ الأوقات فقط.</p>'}
      ${REM.map((r) => `<div class="az-rem"><label><input type="checkbox" data-on="${r.k}" ${R[r.k] ? 'checked' : ''}> ${esc(r.t)}</label><input type="time" data-time="${r.k}" value="${R[r.k] || r.def}"></div>`).join('')}
      <div class="az-rem"><label><input type="checkbox" id="afterP" ${D.after ? 'checked' : ''}> أذكار ما بعد الصلاة (بعد الأذان بـ ١٥ دقيقة)</label></div>
      </div>
      <div class="card"><h3>📿 تذكير بالذكر خلال اليوم</h3>
      <p class="muted" style="font-size:.88rem;margin-top:0">يصلك إشعار بذكر قصير صحيح (مع مصدره) على فترات منتظمة.</p>
      <div class="seg" id="every" style="flex-wrap:wrap">${[[0, 'إيقاف'], [1, 'كل ساعة'], [2, 'كل ساعتين'], [3, 'كل ٣ ساعات'], [4, 'كل ٤ ساعات']].map(([v, t]) => `<button data-v="${v}" class="${D.every === v ? 'active' : ''}">${t}</button>`).join('')}</div>
      <div class="az-rem"><span>من الساعة</span><input type="time" id="dFrom" value="${D.from}"></div>
      <div class="az-rem"><span>حتى الساعة</span><input type="time" id="dTo" value="${D.to}"></div>
      </div>`;
    const save = () => { const R2 = {}; REM.forEach((r) => { if ($(`[data-on="${r.k}"]`).checked) R2[r.k] = $(`[data-time="${r.k}"]`).value || r.def; }); store.set('az:rem', R2); D.after = $('#afterP').checked; D.from = $('#dFrom').value || '09:00'; D.to = $('#dTo').value || '22:00'; store.set('az:rem2', D); scheduleRem(); toast('تم حفظ التذكيرات'); };
    $$('[data-on],[data-time],#afterP,#dFrom,#dTo').forEach((x) => { x.onchange = save; });
    $$('#every button').forEach((b) => { b.onclick = () => { D.every = +b.dataset.v; $$('#every button').forEach((x) => x.classList.toggle('active', x === b)); save(); }; });
  }
  function renderAbout() {
    N.view.innerHTML = `<div class="card"><h3>📚 المصادر</h3><ul style="line-height:2;margin:0;padding-inline-start:18px">${DB.sources.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
      <div class="card"><h3>⚖️ المنهج في التوثيق</h3><ul style="line-height:2;margin:0;padding-inline-start:18px">
        <li>كل ذكر أو دعاء معه مصدره؛ والقرآني معه اسم السورة ورقم الآية.</li>
        <li>الحكم على الحديث منقول من نص التخريج نفسه (البخاري/مسلم/تصحيح أو تحسين أهل العلم)، ولا نضع حكماً من عندنا.</li>
        <li>لم نُدرج أي دعاء منسوب للنبي ﷺ بلا تخريج، ولم نؤلّف أدعية.</li>
        <li>الصوت من التسجيلات الرسمية لموقع حصن المسلم ويحتاج اتصالاً بالإنترنت؛ والنصوص كلها تعمل بلا إنترنت.</li>
      </ul></div>
      <div class="card"><h3>🔤 دلالة الأحكام</h3>${Object.entries(DB.grades).map(([g, t]) => `<p style="margin:6px 0"><span class="az-g ${gClass(g)}">${esc(t)}</span></p>`).join('')}</div>`;
  }

  Object.assign(routes, {
    azkar: { title: 'الأذكار والأدعية', render: renderHome },
    azcat: { title: 'الأذكار', render: renderCat, back: 'azkar' },
    azsearch: { title: 'البحث في الأذكار', render: renderSearch, back: 'azkar' },
    azfav: { title: 'المفضلة', render: renderFav, back: 'azkar' },
    azlists: { title: 'قوائمي', render: renderLists, back: 'azkar' },
    azlist: { title: 'قائمة', render: renderList, back: 'azlists' },
    azset: { title: 'تذكيرات الأذكار', render: renderSet, back: 'azkar' },
    azabout: { title: 'المصادر والمنهج', render: renderAbout, back: 'azkar' },
  });

  const ln = LN();
  if (ln) {
    setTimeout(scheduleRem, 3500);
    try { ln.addListener('localNotificationActionPerformed', (e) => { const r = e && e.notification && e.notification.extra && e.notification.extra.route; if (r) go(r); }); } catch (e) { /* */ }
  }
});
