/* المكتبة الدعوية: محاضرات الشيخ سمير مصطفى والشيخ أمجد سمير من قنواتهم الرسمية
 * - الفهرس على Supabase (مشروع AgriTrade Pro، جداول athar_*) ويُحدَّث تلقائياً من القنوات الرسمية فقط
 * - كل صفحة تطلب ما تحتاجه فقط (الأحدث، موضوع، بحث، سلسلة) لأن الحلقات بالآلاف
 * - المشاهدة داخل التطبيق عبر مشغّل يوتيوب الرسمي (لا تنزيل ولا نسخ للفيديوهات)
 */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, arG, esc, routes } = N;
  const SB = 'https://movodjdwghharkfrgqtv.supabase.co';
  const SB_KEY = 'sb_publishable_41NxOHPNTwzGP5nvZOt2UQ_m7FMSyY4';
  const BRIDGE = 'https://fathyeid.github.io/Fathyeid/yt.html';
  const COLS = 'video_id,sheikh,title,published_at,topics,duration_s';
  const PAGE = 40;

  const SHEIKHS = {
    samir: {
      name: 'الشيخ سمير مصطفى', short: 'سمير مصطفى',
      bio: 'داعية مصري، له دروس وسلاسل في العقيدة والسيرة وتزكية النفس وإصلاح القلب.',
      channels: [{ id: 'UCch6Y4YgssEzMa4Q5zw4xjw', title: 'قناة الشيخ سمير مصطفى الرسمية', url: 'https://www.youtube.com/@samirmoustafa' }],
      official: 'https://samirmoustafa.com',
    },
    amgad: {
      name: 'الشيخ أمجد سمير', short: 'أمجد سمير',
      bio: 'داعية مصري، له دروس تربوية وإيمانية وشروح علمية. القنوات مأخوذة من موقعه الرسمي.',
      channels: [
        { id: 'UC_FFy2YxiElNMba-t-6VwTA', title: 'قناة الشيخ أمجد سمير الرسمية', url: 'https://www.youtube.com/@amgad_samir' },
        { id: 'UCoFflcHXUS78RlNMQJDbNGw', title: 'أمجد سمير | القناة العلمية', url: 'https://www.youtube.com/channel/UCoFflcHXUS78RlNMQJDbNGw' },
      ],
      official: 'https://sites.google.com/view/amgad-samir/home',
    },
  };
  const TOPICS = [
    ['aqeedah', 'العقيدة', '🕋'], ['seerah', 'السيرة النبوية', '🌴'], ['tawbah', 'التوبة والاستغفار', '🤲'], ['tazkiyah', 'تزكية النفس', '🌱'],
    ['prophets', 'قصص الأنبياء', '📜'], ['sahaba', 'الصحابة', '⭐'], ['akhirah', 'الآخرة والجنة والنار', '⚖️'], ['fitan', 'الفتن', '🌪️'],
    ['akhlaq', 'الأخلاق', '🤝'], ['tarbiyah', 'التربية الإسلامية', '👨‍👩‍👧'], ['qalb', 'إصلاح القلب', '❤️'], ['iman', 'الدروس الإيمانية', '✨'],
  ];
  const topicName = (k) => (TOPICS.find((t) => t[0] === k) || [k, k])[1];
  const normAr = (t) => (t || '').replace(/[ً-ٰٟ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();
  const thumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  const ago = (iso) => { const d = Math.floor((Date.now() - new Date(iso)) / 864e5); return d < 1 ? 'اليوم' : d < 2 ? 'أمس' : d < 30 ? `منذ ${ar(d)} يوم` : d < 365 ? `منذ ${ar(Math.floor(d / 30))} شهر` : `منذ ${ar(Math.floor(d / 365))} سنة`; };
  const fmtDur = (s) => { if (!s) return ''; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return N.toAr(h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`); };
  const plural = (n, one, many) => `${arG(n)} ${n >= 3 && n <= 10 ? many : one}`;

  // ---------- طبقة البيانات (طلبات صغيرة مع ذاكرة مؤقتة للعمل دون اتصال) ----------
  const CACHE = {}; // ذاكرة الجلسة
  async function q(path, cacheKey, ttlMin = 60) {
    const k = cacheKey || path;
    if (CACHE[k] && Date.now() - CACHE[k].t < ttlMin * 60000) return CACHE[k].v;
    try {
      const res = await fetch(`${SB}/rest/v1/${path}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
      if (!res.ok) throw new Error(res.status);
      const v = await res.json();
      CACHE[k] = { t: Date.now(), v };
      if (cacheKey) store.set(`dawah:c:${cacheKey}`, v);
      v.forEach && v.forEach((x) => x.video_id && remember(x));
      return v;
    } catch (e) {
      const saved = cacheKey && store.get(`dawah:c:${cacheKey}`);
      if (saved) return saved;
      throw e;
    }
  }
  // حفظ بيانات الحلقات التي رآها المستخدم (للمفضلة والقوائم ومتابعة المشاهدة دون اتصال)
  const seen = () => store.get('dawah:seen', {});
  function remember(v) {
    const s = seen();
    if (s[v.video_id]) return;
    s[v.video_id] = { video_id: v.video_id, sheikh: v.sheikh, title: v.title, published_at: v.published_at, topics: v.topics, duration_s: v.duration_s };
    const keys = Object.keys(s);
    if (keys.length > 600) keys.slice(0, keys.length - 600).forEach((x) => delete s[x]);
    store.set('dawah:seen', s);
  }
  async function getVideo(id) {
    const s = seen()[id];
    if (s) return s;
    const r = await q(`athar_videos?video_id=eq.${encodeURIComponent(id)}&select=${COLS}`);
    return r[0];
  }
  const latest = (sheikh, offset = 0) => q(`athar_videos?select=${COLS}${sheikh ? `&sheikh=eq.${sheikh}` : ''}&order=published_at.desc&limit=${PAGE}&offset=${offset}`, offset ? null : `latest:${sheikh || 'all'}`, 30);
  const byTopic = (t, sheikh, offset = 0) => q(`athar_videos?select=${COLS}&topics=cs.%7B${t}%7D${sheikh ? `&sheikh=eq.${sheikh}` : ''}&order=published_at.desc&limit=${PAGE}&offset=${offset}`, offset ? null : `topic:${t}:${sheikh || 'all'}`);
  const topicCounts = (sheikh) => q(`rpc/athar_topic_counts${sheikh ? `?p_sheikh=${sheikh}` : ''}`, `tc:${sheikh || 'all'}`, 180);
  const series = (sheikh) => q(`athar_playlists?select=playlist_id,title,item_count,published_at&sheikh=eq.${sheikh}&item_count=gt.1&order=published_at.desc&limit=300`, `series:${sheikh}`, 180);
  const seriesItems = (pid) => q(`athar_series_v?playlist_id=eq.${encodeURIComponent(pid)}&select=${COLS},position&order=position.asc&limit=500`, `si:${pid}`, 180);
  const similar = (v) => q(`athar_videos?select=${COLS}&topics=ov.%7B${(v.topics || []).join(',')}%7D&sheikh=eq.${v.sheikh}&video_id=neq.${v.video_id}&order=published_at.desc&limit=8`, null, 60);
  async function search(text, offset = 0) {
    const words = text.trim().split(/\s+/).filter((w) => w.length > 1).slice(0, 4);
    const sheikhs = Object.entries(SHEIKHS).filter(([, s]) => words.some((w) => normAr(s.name).includes(normAr(w)))).map(([k]) => k);
    const topics = TOPICS.filter(([, n]) => words.some((w) => normAr(n).includes(normAr(w)))).map(([t]) => t);
    const titleWords = words.filter((w) => !sheikhs.length || !Object.values(SHEIKHS).some((s) => normAr(s.name).includes(normAr(w))));
    const conds = [];
    if (titleWords.length) conds.push(`and=(${titleWords.map((w) => `title.ilike.*${encodeURIComponent(w)}*`).join(',')})`);
    let path = `athar_videos?select=${COLS}${conds.length ? '&' + conds.join('&') : ''}${sheikhs.length === 1 ? `&sheikh=eq.${sheikhs[0]}` : ''}&order=published_at.desc&limit=${PAGE}&offset=${offset}`;
    let r = await q(path, null, 10);
    if (!r.length && topics.length) {
      path = `athar_videos?select=${COLS}&topics=ov.%7B${topics.join(',')}%7D${sheikhs.length === 1 ? `&sheikh=eq.${sheikhs[0]}` : ''}&order=published_at.desc&limit=${PAGE}&offset=${offset}`;
      r = await q(path, null, 10);
    }
    return r;
  }

  const favs = () => store.get('dawah:fav', []);
  const isFav = (id) => favs().includes(id);
  const toggleFav = (id) => { const f = favs(); const i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.unshift(id); store.set('dawah:fav', f); return i < 0; };
  const lists = () => store.get('dawah:lists', []);
  const pos = (id) => store.get('dawah:pos', {})[id];
  function savePos(id, t, d) { const p = store.get('dawah:pos', {}); p[id] = { t, d, at: Date.now() }; store.set('dawah:pos', p); store.set('dawah:last', id); }

  const card = (v) => {
    const p = pos(v.video_id);
    return `<button class="dw-card" data-v="${v.video_id}">
      <span class="dw-thumb"><img src="${thumb(v.video_id)}" alt="" loading="lazy">${v.duration_s ? `<span class="dw-dur">${fmtDur(v.duration_s)}</span>` : ''}${p && p.d ? `<span class="dw-prog"><span style="width:${Math.min(100, (p.t / p.d) * 100)}%"></span></span>` : ''}</span>
      <span class="dw-info"><b>${esc(v.title)}</b><small>${SHEIKHS[v.sheikh] ? SHEIKHS[v.sheikh].short : ''} — ${ago(v.published_at)}${isFav(v.video_id) ? ' — ★' : ''}</small></span>
    </button>`;
  };
  const bindCards = (root) => $$('button.dw-card[data-v]', root).forEach((b) => b.addEventListener('click', () => go(`dwatch/${b.dataset.v}`)));
  const loader = () => { N.view.innerHTML = '<div class="loader"></div>'; };
  const failBox = (retry) => { N.view.innerHTML = '<div class="card center"><p>تعذّر تحميل المكتبة الدعوية. تأكد من الاتصال بالإنترنت.</p><button class="btn" id="retry">إعادة المحاولة</button></div>'; $('#retry').onclick = retry; };
  const notice = '<div class="card acad-note"><b>📌 عن المحتوى</b><p>الحلقات من القنوات الرسمية للشيخين فقط، وتُعرض بمشغّل يوتيوب الرسمي داخل التطبيق وتحتاج اتصالاً بالإنترنت. تحميل الحلقات للمشاهدة دون إنترنت سيُضاف بعد الحصول على إذن من فريق كل شيخ.</p></div>';

  // قائمة حلقات مع «عرض المزيد»
  function pagedList(root, fetchPage, empty) {
    let offset = 0;
    const wrap = document.createElement('div');
    const more = document.createElement('button');
    more.className = 'btn ghost block'; more.textContent = 'عرض المزيد';
    root.appendChild(wrap); root.appendChild(more);
    const step = async () => {
      more.disabled = true; more.textContent = 'جارٍ التحميل...';
      try {
        const rows = await fetchPage(offset);
        offset += rows.length;
        if (!offset) wrap.innerHTML = `<div class="card center muted">${empty}</div>`;
        else { const d = document.createElement('div'); d.innerHTML = rows.map(card).join(''); bindCards(d); wrap.appendChild(d); }
        more.hidden = rows.length < PAGE;
      } catch { toast('تعذّر التحميل، تأكد من الاتصال'); }
      more.disabled = false; more.textContent = 'عرض المزيد';
    };
    more.onclick = step;
    return step();
  }

  // ---------- الصفحة الرئيسية للمكتبة ----------
  function renderDawah() {
    loader();
    let alive = true;
    Promise.all([latest(), topicCounts()]).then(async ([rows, tc]) => {
      if (!alive) return;
      const counts = Object.fromEntries((tc || []).map((x) => [x.topic, x.n]));
      const total = (tc || []).length ? null : 0;
      const last = store.get('dawah:last'); const lv = last && (await getVideo(last).catch(() => null));
      N.view.innerHTML = `
        <form id="dwF" style="display:flex;gap:8px;margin-bottom:12px"><input class="search" id="dwQ" type="search" placeholder="ابحث باسم الشيخ أو عنوان المحاضرة أو موضوعها..." style="margin:0"><button class="btn" type="submit">بحث</button></form>
        ${lv ? `<div class="section-title" style="margin-top:4px">تابع المشاهدة</div>${card(lv)}` : ''}
        <div class="dw-sheikhs">${Object.entries(SHEIKHS).map(([k, s]) => `
          <button class="dw-sheikh card" data-s="${k}"><span class="aud-av big">${s.short.charAt(0)}</span><b>${s.name}</b><small class="muted">السلاسل والحلقات</small></button>`).join('')}</div>
        <div class="section-title">الموضوعات</div>
        <div class="chips dw-topics">${TOPICS.map(([k, n, ic]) => `<button class="chip" data-t="${k}">${ic} ${n}${counts[k] ? ` (${arG(counts[k])})` : ''}</button>`).join('')}</div>
        <div class="seg" id="dwTabs" style="margin:16px 0 10px"><button data-t="new" class="active">آخر الإضافات</button><button data-t="fav">المفضلة (${ar(favs().length)})</button><button data-t="lists">القوائم</button></div>
        <div id="dwBody"></div>
        ${notice}`;
      void total;
      bindCards(N.view);
      $$('[data-s]').forEach((b) => b.addEventListener('click', () => go(`dsheikh/${b.dataset.s}`)));
      $$('[data-t]', $('.dw-topics')).forEach((b) => b.addEventListener('click', () => go(`dtopic/${b.dataset.t}`)));
      $('#dwF').addEventListener('submit', (e) => { e.preventDefault(); const qq = $('#dwQ').value.trim(); if (qq.length < 2) { toast('اكتب كلمتين على الأقل'); return; } go(`dsearch/${encodeURIComponent(qq)}`); });
      const body = $('#dwBody');
      const tabs = {
        new: () => { body.innerHTML = ''; const d = document.createElement('div'); d.innerHTML = rows.map(card).join(''); bindCards(d); body.appendChild(d); const more = document.createElement('div'); body.appendChild(more); let off = rows.length; const b = document.createElement('button'); b.className = 'btn ghost block'; b.textContent = 'عرض المزيد'; b.hidden = rows.length < PAGE; b.onclick = async () => { b.disabled = true; const r = await latest(null, off).catch(() => []); off += r.length; const x = document.createElement('div'); x.innerHTML = r.map(card).join(''); bindCards(x); more.appendChild(x); b.hidden = r.length < PAGE; b.disabled = false; }; body.appendChild(b); },
        fav: async () => { body.innerHTML = '<div class="loader"></div>'; const f = (await Promise.all(favs().map((id) => getVideo(id).catch(() => null)))).filter(Boolean); body.innerHTML = f.map(card).join('') || '<div class="card center muted">اضغط ☆ في صفحة أي حلقة لإضافتها هنا</div>'; bindCards(body); },
        lists: () => {
          const l = lists();
          body.innerHTML = `<form id="mkL" style="display:flex;gap:8px;margin-bottom:10px"><input class="search" id="lN" placeholder="اسم قائمة جديدة" style="margin:0" maxlength="40"><button class="btn" type="submit">إنشاء</button></form>
            <div class="card" style="padding:4px">${l.map((p) => `<button class="aud-rec" data-l="${p.id}"><span class="aud-av">📃</span><span class="aud-info"><b>${esc(p.name)}</b><small>${plural(p.items.length, 'حلقة', 'حلقات')}</small></span></button>`).join('') || '<p class="muted center">أنشئ قائمة، ثم أضف إليها الحلقات من صفحة الحلقة.</p>'}</div>`;
          $('#mkL').addEventListener('submit', (e) => { e.preventDefault(); const n = $('#lN').value.trim(); if (!n) return; const x = lists(); x.unshift({ id: 'l' + Date.now(), name: n, items: [] }); store.set('dawah:lists', x); tabs.lists(); });
          $$('[data-l]', body).forEach((b) => b.addEventListener('click', () => go(`dlist/${b.dataset.l}`)));
        },
      };
      $$('#dwTabs button').forEach((b) => b.addEventListener('click', () => { $$('#dwTabs button').forEach((x) => x.classList.toggle('active', x === b)); tabs[b.dataset.t](); }));
      tabs.new();
    }).catch(() => alive && failBox(renderDawah));
    return () => { alive = false; };
  }

  // ---------- صفحة الشيخ ----------
  function renderSheikh(k, tab) {
    const s = SHEIKHS[k]; if (!s) { go('dawah'); return; }
    N.setTitle(s.name);
    loader();
    let alive = true;
    Promise.all([topicCounts(k), series(k).catch(() => [])]).then(([tc, sr]) => {
      if (!alive) return;
      const counts = Object.fromEntries((tc || []).map((x) => [x.topic, x.n]));
      const total = (tc || []).length ? null : 0; void total;
      N.view.innerHTML = `
        <div class="card rec-head"><span class="aud-av big">${s.short.charAt(0)}</span><div style="flex:1;min-width:0"><b style="font-size:1.1rem">${s.name}</b><p class="muted" style="margin:4px 0 0;font-size:.86rem">${s.bio}</p></div></div>
        <div class="card" style="padding:4px">${s.channels.map((c) => `<div class="aud-row"><span class="aud-av">▶</span><div class="aud-info"><b>${c.title}</b><small>القناة الرسمية</small></div><button class="btn ghost" data-all="${c.id}">تشغيل الكل</button></div>`).join('')}</div>
        <div class="section-title">الموضوعات</div>
        <div class="chips" style="justify-content:flex-start">${TOPICS.filter(([t]) => counts[t]).map(([t, n, ic]) => `<button class="chip" data-t="${t}">${ic} ${n} (${arG(counts[t])})</button>`).join('') || '<span class="muted">تُصنَّف الحلقات تلقائياً من عناوينها</span>'}</div>
        <div class="seg" id="shTabs" style="margin:16px 0 10px"><button data-t="new">آخر الإضافات</button><button data-t="series">السلاسل (${arG(sr.length)})</button></div>
        <div id="shBody"></div>`;
      $$('[data-t]', $('.chips')).forEach((b) => b.addEventListener('click', () => go(`dtopic/${b.dataset.t}/${k}`)));
      $$('[data-all]').forEach((b) => b.addEventListener('click', () => go(`dwatch/all/${b.dataset.all}`)));
      const body = $('#shBody');
      const tabs = {
        new: () => { body.innerHTML = ''; pagedList(body, (off) => latest(k, off), 'لا توجد حلقات في الفهرس بعد'); },
        series: () => {
          body.innerHTML = `<div class="card" style="padding:4px">${sr.map((p) => `<button class="aud-rec" data-p="${p.playlist_id}"><span class="aud-av">📚</span><span class="aud-info"><b>${esc(p.title)}</b><small>${plural(p.item_count || 0, 'حلقة', 'حلقات')}</small></span></button>`).join('') || '<p class="muted center">جارٍ تجميع السلاسل، أعد المحاولة لاحقاً</p>'}</div>`;
          $$('[data-p]', body).forEach((b) => b.addEventListener('click', () => go(`dseries/${b.dataset.p}`)));
        },
      };
      const setTab = (t) => { $$('#shTabs button').forEach((x) => x.classList.toggle('active', x.dataset.t === t)); tabs[t](); };
      $$('#shTabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.t)));
      setTab(tab === 'series' ? 'series' : 'new');
    }).catch(() => alive && failBox(() => renderSheikh(k, tab)));
    return () => { alive = false; };
  }

  function renderSeries(pid) {
    loader();
    let alive = true;
    seriesItems(pid).then(async (items) => {
      if (!alive) return;
      const meta = (await q(`athar_playlists?playlist_id=eq.${encodeURIComponent(pid)}&select=title,sheikh,item_count`, `sm:${pid}`, 180).catch(() => []))[0] || {};
      N.setTitle(meta.title || 'سلسلة');
      N.view.innerHTML = `
        <div class="card"><b>${esc(meta.title || '')}</b><p class="muted" style="margin:4px 0 0">${SHEIKHS[meta.sheikh] ? SHEIKHS[meta.sheikh].name : ''} — ${plural(items.length, 'حلقة', 'حلقات')}</p>
          <button class="btn block" id="sPlay" style="margin-top:10px">▶ تشغيل السلسلة بالترتيب</button></div>
        ${items.map((v, i) => card({ ...v, title: `${ar(i + 1)}. ${v.title}` })).join('') || '<div class="card center muted">لم تُجمع حلقات هذه السلسلة بعد</div>'}`;
      bindCards(N.view);
      $('#sPlay').onclick = () => go(`dwatch/list/${pid}`);
    }).catch(() => alive && failBox(() => renderSeries(pid)));
    return () => { alive = false; };
  }

  function listPage(title, root) { N.setTitle(title); N.view.innerHTML = ''; return root || N.view; }
  function renderTopic(t, k) {
    listPage(`${topicName(t)}${k && SHEIKHS[k] ? ` — ${SHEIKHS[k].short}` : ''}`);
    pagedList(N.view, (off) => byTopic(t, k, off), 'لا توجد حلقات في هذا الموضوع بعد');
  }
  function renderSearch(qEnc) {
    const text = decodeURIComponent(qEnc || '');
    listPage(`بحث: ${text}`);
    pagedList(N.view, (off) => search(text, off), 'لا توجد نتائج. جرّب كلمة أخرى أو اسم موضوع');
  }
  function renderList(id) {
    const l = lists().find((x) => x.id === id); if (!l) { go('dawah'); return; }
    listPage(l.name);
    N.view.innerHTML = '<div class="loader"></div>';
    Promise.all(l.items.map((x) => getVideo(x).catch(() => null))).then((vs) => {
      N.view.innerHTML = vs.filter(Boolean).map(card).join('') || '<div class="card center muted">القائمة فارغة</div>';
      bindCards(N.view);
      const del = document.createElement('button'); del.className = 'btn ghost block'; del.textContent = '🗑 حذف القائمة';
      del.onclick = () => { if (!del.dataset.sure) { del.dataset.sure = 1; del.textContent = 'اضغط مرة أخرى للتأكيد'; return; } store.set('dawah:lists', lists().filter((x) => x.id !== id)); go('dawah'); };
      N.view.appendChild(del);
    });
  }

  // ---------- المشاهدة داخل التطبيق ----------
  function renderWatch(id, arg2) {
    const mode = id === 'all' ? 'all' : id === 'list' ? 'list' : 'one';
    loader();
    let alive = true;
    let frame = null;
    const onMsg = (e) => {
      const m = e.data || {}; if (m.src !== 'athar-yt' || !frame || e.source !== frame.contentWindow) return;
      if (m.type === 'time' && m.id && m.d) savePos(m.id, m.t, m.d);
      if (m.type === 'error') toast(m.code === 101 || m.code === 150 ? 'صاحب القناة لا يسمح بتشغيل هذا الفيديو خارج يوتيوب' : 'تعذّر تشغيل الفيديو');
    };
    window.addEventListener('message', onMsg);
    (mode === 'one' ? getVideo(id).catch(() => null) : Promise.resolve(null)).then(async (v) => {
      if (!alive) return;
      if (v) remember(v);
      const p = mode === 'one' && pos(id);
      const start = p && p.d && p.t < p.d - 20 ? Math.floor(p.t) : 0;
      const speed = store.get('dawah:rate', 1);
      const src = mode === 'all' ? `${BRIDGE}?list=UU${arg2.slice(2)}&r=${speed}` : mode === 'list' ? `${BRIDGE}?list=${encodeURIComponent(arg2)}&r=${speed}` : `${BRIDGE}?v=${id}&t=${start}&r=${speed}`;
      const sk = v && SHEIKHS[v.sheikh];
      N.setTitle(mode === 'one' ? (sk ? sk.name : 'المشاهدة') : mode === 'list' ? 'السلسلة' : 'كل فيديوهات القناة');
      const sim = v ? await similar(v).catch(() => []) : [];
      if (!alive) return;
      N.view.innerHTML = `
        <div class="dw-player"><iframe id="ytf" src="${src}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="مشغّل الفيديو"></iframe></div>
        ${v ? `<h2 class="dw-title">${esc(v.title)}</h2><p class="muted" style="margin:0 0 10px">${sk ? sk.name : ''} — ${ago(v.published_at)}${v.duration_s ? ` — ${fmtDur(v.duration_s)}` : ''}${start ? ` — يستكمل من ${fmtDur(start)}` : ''}</p>
          <div class="chips" style="justify-content:flex-start;margin-bottom:10px">${(v.topics || []).map((t) => `<button class="chip" data-t="${t}">${topicName(t)}</button>`).join('')}</div>` : `<p class="muted">${mode === 'list' ? 'تُعرض حلقات السلسلة بالترتيب، ويمكنك التنقل بينها من قائمة المشغّل.' : 'يمكنك التنقل بين كل فيديوهات القناة من قائمة المشغّل.'}</p>`}
        <div class="field"><label>سرعة التشغيل</label><div class="seg" id="dwRate">${[0.75, 1, 1.25, 1.5, 2].map((x) => `<button data-rate="${x}" class="${x === speed ? 'active' : ''}">${ar(x)}×</button>`).join('')}</div></div>
        ${v ? `<div style="display:flex;gap:8px;margin-bottom:12px">
          <button class="btn ghost block" id="dwFav">${isFav(id) ? '★ في المفضلة' : '☆ المفضلة'}</button>
          <button class="btn ghost block" id="dwList">📃 قائمة تشغيل</button>
          <button class="btn ghost block" id="dwShare">📤 مشاركة</button>
        </div>
        <button class="btn ghost block" id="dwDl" style="margin-bottom:14px">⬇ تحميل للمشاهدة دون إنترنت</button>` : ''}
        ${sim.length ? `<div class="section-title">حلقات مشابهة</div>${sim.map(card).join('')}` : ''}`;
      frame = $('#ytf');
      bindCards(N.view);
      $$('.chips [data-t]').forEach((b) => b.addEventListener('click', () => go(`dtopic/${b.dataset.t}`)));
      $$('#dwRate button').forEach((b) => b.addEventListener('click', () => {
        const r = +b.dataset.rate; store.set('dawah:rate', r);
        $$('#dwRate button').forEach((x) => x.classList.toggle('active', x === b));
        frame.contentWindow.postMessage({ dst: 'athar-yt', cmd: 'rate', v: r }, '*');
      }));
      if (!v) return;
      $('#dwFav').onclick = (e) => { const on = toggleFav(id); e.currentTarget.textContent = on ? '★ في المفضلة' : '☆ المفضلة'; };
      $('#dwShare').onclick = () => N.shareText(`${v.title}\n${sk ? sk.name : ''}\nhttps://www.youtube.com/watch?v=${id}\n\nمن تطبيق أثر - صدقة جارية على روح المرحوم عيد فتحي أبو طالب`);
      $('#dwDl').onclick = () => N.sheet(`<div class="sheet-title">التحميل غير متاح حالياً</div><p class="muted" style="line-height:1.9">تحميل الحلقات داخل التطبيق يحتاج إذناً من فريق الشيخ، لأن يوتيوب لا يسمح بنقل فيديوهاته إلى تطبيقات أخرى. نسعى للحصول على الإذن، وسيُضاف التحميل فور ذلك بإذن الله.</p><p class="muted" style="line-height:1.9">يمكنك الآن حفظ الحلقة في تطبيق يوتيوب نفسه باستخدام زر «تنزيل» أسفل الفيديو.</p><a class="btn block" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">فتح في يوتيوب</a>`);
      $('#dwList').onclick = () => {
        const sh = N.sheet(`<div class="sheet-title">إضافة إلى قائمة</div>${lists().map((l) => `<button class="btn ghost block" style="margin-bottom:6px" data-pl="${l.id}">📃 ${esc(l.name)}</button>`).join('') || '<p class="muted center">لا توجد قوائم. أنشئ واحدة:</p>'}
          <form id="nl" style="display:flex;gap:8px;margin-top:8px"><input class="search" id="nlN" placeholder="اسم قائمة جديدة" style="margin:0" maxlength="40"><button class="btn" type="submit">إنشاء</button></form>`);
        $$('[data-pl]', sh.el).forEach((b) => b.addEventListener('click', () => { const x = lists(); const l = x.find((y) => y.id === b.dataset.pl); if (!l.items.includes(id)) l.items.push(id); store.set('dawah:lists', x); toast(`أُضيفت إلى «${l.name}»`); sh.close(); }));
        $('#nl', sh.el).addEventListener('submit', (e) => { e.preventDefault(); const n = $('#nlN', sh.el).value.trim(); if (!n) return; const x = lists(); x.unshift({ id: 'l' + Date.now(), name: n, items: [id] }); store.set('dawah:lists', x); toast(`أُنشئت «${n}»`); sh.close(); });
      };
    });
    return () => { alive = false; window.removeEventListener('message', onMsg); };
  }

  Object.assign(routes, {
    dawah: { title: 'المكتبة الدعوية', render: renderDawah, back: 'home' },
    dsheikh: { title: 'الشيخ', render: renderSheikh, back: 'dawah' },
    dseries: { title: 'سلسلة', render: renderSeries, back: 'dawah' },
    dtopic: { title: 'الموضوع', render: renderTopic, back: 'dawah' },
    dsearch: { title: 'بحث', render: renderSearch, back: 'dawah' },
    dlist: { title: 'قائمة', render: renderList, back: 'dawah' },
    dwatch: { title: 'المشاهدة', render: renderWatch, back: 'dawah' },
  });

  N.homeExtras.push((root) => {
    const last = store.get('dawah:last'); const v = last && seen()[last];
    if (!v) return;
    const d = document.createElement('div');
    d.innerHTML = `<div class="card continue"><div style="min-width:0"><small class="muted">🎬 تابع المشاهدة</small><br><b>${esc(v.title)}</b><br><small class="muted">${SHEIKHS[v.sheikh] ? SHEIKHS[v.sheikh].name : ''}</small></div><button class="btn">متابعة</button></div>`;
    $('button', d).onclick = () => go(`dwatch/${v.video_id}`);
    root.appendChild(d);
  });
});
