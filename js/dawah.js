/* المكتبة الدعوية: محاضرات الشيخ سمير مصطفى والشيخ أمجد سمير من قنواتهم الرسمية
 * - فهرس الحلقات يُجمَّع يومياً على Supabase من خلاصات يوتيوب العامة (RSS) للقنوات الرسمية فقط
 * - المشاهدة داخل التطبيق عبر مشغّل يوتيوب الرسمي (لا تنزيل ولا نسخ للفيديوهات)
 */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, arG, esc, routes } = N;
  const SB = 'https://movodjdwghharkfrgqtv.supabase.co';
  const SB_KEY = 'sb_publishable_41NxOHPNTwzGP5nvZOt2UQ_m7FMSyY4';
  const BRIDGE = 'https://fathyeid.github.io/Fathyeid/yt.html';

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

  // ---------- البيانات ----------
  let VIDEOS = store.get('dawah:videos', []);
  let loading = null;
  async function load(force) {
    if (!force && VIDEOS.length && Date.now() - store.get('dawah:t', 0) < 3 * 3600e3) return VIDEOS;
    if (loading) return loading;
    loading = (async () => {
      try {
        const res = await fetch(`${SB}/rest/v1/athar_videos?select=video_id,sheikh,channel_id,title,published_at,topics&order=published_at.desc&limit=2000`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
        if (!res.ok) throw new Error(res.status);
        VIDEOS = await res.json();
        store.set('dawah:videos', VIDEOS); store.set('dawah:t', Date.now());
      } catch (e) { if (!VIDEOS.length) throw e; }
      loading = null;
      return VIDEOS;
    })();
    return loading;
  }
  const byId = (id) => VIDEOS.find((v) => v.video_id === id);
  const favs = () => store.get('dawah:fav', []);
  const isFav = (id) => favs().includes(id);
  const toggleFav = (id) => { const f = favs(); const i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.unshift(id); store.set('dawah:fav', f); return i < 0; };
  const lists = () => store.get('dawah:lists', []);
  const pos = (id) => store.get('dawah:pos', {})[id];
  function savePos(id, t, d) { const p = store.get('dawah:pos', {}); p[id] = { t, d, at: Date.now() }; store.set('dawah:pos', p); store.set('dawah:last', id); }

  const card = (v) => {
    const p = pos(v.video_id);
    return `<button class="dw-card" data-v="${v.video_id}">
      <span class="dw-thumb"><img src="${thumb(v.video_id)}" alt="" loading="lazy">${p && p.d ? `<span class="dw-prog"><span style="width:${Math.min(100, (p.t / p.d) * 100)}%"></span></span>` : ''}</span>
      <span class="dw-info"><b>${esc(v.title)}</b><small>${SHEIKHS[v.sheikh] ? SHEIKHS[v.sheikh].short : ''} — ${ago(v.published_at)}${isFav(v.video_id) ? ' — ★' : ''}</small></span>
    </button>`;
  };
  const bindCards = (root) => $$('button.dw-card[data-v]', root).forEach((b) => b.addEventListener('click', () => go(`dwatch/${b.dataset.v}`)));
  const failBox = (retry) => { N.view.innerHTML = '<div class="card center"><p>تعذّر تحميل المكتبة الدعوية. تأكد من الاتصال بالإنترنت.</p><button class="btn" id="retry">إعادة المحاولة</button></div>'; $('#retry').onclick = retry; };
  const notice = '<div class="card acad-note"><b>📌 عن المحتوى</b><p>الحلقات من القنوات الرسمية للشيخين فقط، وتُعرض بمشغّل يوتيوب الرسمي داخل التطبيق وتحتاج اتصالاً بالإنترنت. تحميل الحلقات للمشاهدة دون إنترنت سيُضاف بعد الحصول على إذن من فريق كل شيخ.</p></div>';

  // ---------- الصفحة الرئيسية للمكتبة ----------
  function renderDawah() {
    N.view.innerHTML = '<div class="loader"></div>';
    let alive = true;
    load().then(() => {
      if (!alive) return;
      const last = store.get('dawah:last'); const lv = last && byId(last);
      N.view.innerHTML = `
        <form id="dwF" style="display:flex;gap:8px;margin-bottom:12px"><input class="search" id="dwQ" type="search" placeholder="ابحث باسم الشيخ أو عنوان المحاضرة أو موضوعها..." style="margin:0"><button class="btn" type="submit">بحث</button></form>
        ${lv ? `<div class="section-title" style="margin-top:4px">تابع المشاهدة</div>${card(lv)}` : ''}
        <div class="dw-sheikhs">${Object.entries(SHEIKHS).map(([k, s]) => `
          <button class="dw-sheikh card" data-s="${k}"><span class="aud-av big">${s.short.charAt(0)}</span><b>${s.name}</b><small class="muted">${arG(VIDEOS.filter((v) => v.sheikh === k).length)} حلقة في الفهرس</small></button>`).join('')}</div>
        <div class="section-title">الموضوعات</div>
        <div class="chips dw-topics">${TOPICS.map(([k, n, ic]) => `<button class="chip" data-t="${k}">${ic} ${n}</button>`).join('')}</div>
        <div class="seg" id="dwTabs" style="margin:16px 0 10px"><button data-t="new" class="active">آخر الإضافات</button><button data-t="fav">المفضلة (${ar(favs().length)})</button><button data-t="lists">القوائم</button></div>
        <div id="dwBody"></div>
        ${notice}`;
      bindCards(N.view);
      $$('[data-s]').forEach((b) => b.addEventListener('click', () => go(`dsheikh/${b.dataset.s}`)));
      $$('[data-t]', $('.dw-topics')).forEach((b) => b.addEventListener('click', () => go(`dtopic/${b.dataset.t}`)));
      $('#dwF').addEventListener('submit', (e) => { e.preventDefault(); const q = $('#dwQ').value.trim(); if (q.length < 2) { toast('اكتب كلمتين على الأقل'); return; } go(`dsearch/${encodeURIComponent(q)}`); });
      const body = $('#dwBody');
      const tabs = {
        new: () => { body.innerHTML = VIDEOS.slice(0, 30).map(card).join('') || '<div class="card center muted">لا توجد حلقات بعد</div>'; bindCards(body); },
        fav: () => { const f = favs().map(byId).filter(Boolean); body.innerHTML = f.map(card).join('') || '<div class="card center muted">اضغط ☆ في صفحة أي حلقة لإضافتها هنا</div>'; bindCards(body); },
        lists: () => {
          const l = lists();
          body.innerHTML = `<form id="mkL" style="display:flex;gap:8px;margin-bottom:10px"><input class="search" id="lN" placeholder="اسم قائمة جديدة" style="margin:0" maxlength="40"><button class="btn" type="submit">إنشاء</button></form>
            <div class="card" style="padding:4px">${l.map((p) => `<button class="aud-rec" data-l="${p.id}"><span class="aud-av">📃</span><span class="aud-info"><b>${esc(p.name)}</b><small>${ar(p.items.length)} حلقة</small></span></button>`).join('') || '<p class="muted center">أنشئ قائمة، ثم أضف إليها الحلقات من صفحة الحلقة.</p>'}</div>`;
          $('#mkL').addEventListener('submit', (e) => { e.preventDefault(); const n = $('#lN').value.trim(); if (!n) return; const x = lists(); x.unshift({ id: 'l' + Date.now(), name: n, items: [] }); store.set('dawah:lists', x); tabs.lists(); });
          $$('[data-l]', body).forEach((b) => b.addEventListener('click', () => go(`dlist/${b.dataset.l}`)));
        },
      };
      $$('#dwTabs button').forEach((b) => b.addEventListener('click', () => { $$('#dwTabs button').forEach((x) => x.classList.toggle('active', x === b)); tabs[b.dataset.t](); }));
      tabs.new();
      load(true).catch(() => {});
    }).catch(() => alive && failBox(renderDawah));
    return () => { alive = false; };
  }

  // ---------- صفحة الشيخ ----------
  function renderSheikh(k) {
    const s = SHEIKHS[k]; if (!s) { go('dawah'); return; }
    N.setTitle(s.name);
    N.view.innerHTML = '<div class="loader"></div>';
    let alive = true;
    load().then(() => {
      if (!alive) return;
      const mine = VIDEOS.filter((v) => v.sheikh === k);
      const counts = {}; mine.forEach((v) => (v.topics || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
      N.view.innerHTML = `
        <div class="card rec-head"><span class="aud-av big">${s.short.charAt(0)}</span><div style="flex:1;min-width:0"><b style="font-size:1.1rem">${s.name}</b><p class="muted" style="margin:4px 0 0;font-size:.86rem">${s.bio}</p></div></div>
        <div class="section-title">القنوات الرسمية</div>
        <div class="card" style="padding:4px">${s.channels.map((c) => `<div class="aud-row"><span class="aud-av">▶</span><div class="aud-info"><b>${c.title}</b><small>${esc(c.url.replace('https://www.', ''))}</small></div><button class="btn ghost" data-all="${c.id}">كل الفيديوهات</button></div>`).join('')}
          ${s.official ? `<p class="muted" style="font-size:.78rem;margin:6px 10px">المصدر: الموقع الرسمي للشيخ</p>` : ''}</div>
        <div class="section-title">الموضوعات</div>
        <div class="chips">${TOPICS.filter(([t]) => counts[t]).map(([t, n, ic]) => `<button class="chip" data-t="${t}">${ic} ${n} (${ar(counts[t])})</button>`).join('') || '<span class="muted">تُصنَّف الحلقات تلقائياً من عناوينها</span>'}</div>
        <div class="section-title">آخر الإضافات</div>
        ${mine.slice(0, 40).map(card).join('') || '<div class="card center muted">لا توجد حلقات في الفهرس بعد</div>'}`;
      bindCards(N.view);
      $$('[data-t]').forEach((b) => b.addEventListener('click', () => go(`dtopic/${b.dataset.t}/${k}`)));
      $$('[data-all]').forEach((b) => b.addEventListener('click', () => go(`dwatch/all/${b.dataset.all}`)));
    }).catch(() => alive && failBox(() => renderSheikh(k)));
    return () => { alive = false; };
  }

  function listPage(title, items, empty) {
    N.setTitle(title);
    N.view.innerHTML = `<p class="muted" style="margin:0 0 10px">${arG(items.length)} حلقة</p>${items.slice(0, 200).map(card).join('') || `<div class="card center muted">${empty}</div>`}`;
    bindCards(N.view);
  }
  function renderTopic(t, k) {
    N.view.innerHTML = '<div class="loader"></div>';
    load().then(() => listPage(`${topicName(t)}${k && SHEIKHS[k] ? ` — ${SHEIKHS[k].short}` : ''}`, VIDEOS.filter((v) => (v.topics || []).includes(t) && (!k || v.sheikh === k)), 'لا توجد حلقات في هذا الموضوع بعد')).catch(() => failBox(() => renderTopic(t, k)));
  }
  function search(q) {
    const nq = normAr(q).split(/\s+/).filter(Boolean);
    const topicHits = TOPICS.filter(([, n]) => nq.some((w) => normAr(n).includes(w))).map(([t]) => t);
    const sheikhHits = Object.entries(SHEIKHS).filter(([, s]) => nq.some((w) => normAr(s.name).includes(w))).map(([k]) => k);
    return VIDEOS.map((v) => {
      const nt = normAr(v.title); let sc = 0;
      nq.forEach((w) => { if (nt.includes(w)) sc += 3; });
      if ((v.topics || []).some((t) => topicHits.includes(t))) sc += 2;
      if (sheikhHits.includes(v.sheikh)) sc += 1;
      return [sc, v];
    }).filter(([sc]) => sc > 0).sort((a, b) => b[0] - a[0]).map(([, v]) => v);
  }
  function renderSearch(qEnc) {
    const q = decodeURIComponent(qEnc || '');
    N.view.innerHTML = '<div class="loader"></div>';
    load().then(() => listPage(`بحث: ${q}`, search(q), 'لا توجد نتائج. جرّب كلمة أخرى أو اسم موضوع')).catch(() => failBox(() => renderSearch(qEnc)));
  }
  function renderList(id) {
    load().catch(() => {}).then(() => {
      const l = lists().find((x) => x.id === id); if (!l) { go('dawah'); return; }
      listPage(l.name, l.items.map(byId).filter(Boolean), 'القائمة فارغة');
      const del = document.createElement('button'); del.className = 'btn ghost block'; del.textContent = '🗑 حذف القائمة';
      del.onclick = () => { if (!del.dataset.sure) { del.dataset.sure = 1; del.textContent = 'اضغط مرة أخرى للتأكيد'; return; } store.set('dawah:lists', lists().filter((x) => x.id !== id)); go('dawah'); };
      N.view.appendChild(del);
    });
  }

  // ---------- المشاهدة داخل التطبيق ----------
  function renderWatch(id, chan) {
    const all = id === 'all';
    N.view.innerHTML = '<div class="loader"></div>';
    let alive = true;
    let frame = null;
    const onMsg = (e) => {
      const m = e.data || {}; if (m.src !== 'athar-yt' || !frame || e.source !== frame.contentWindow) return;
      if (m.type === 'time' && m.id && m.d) savePos(m.id, m.t, m.d);
      if (m.type === 'error') toast(m.code === 101 || m.code === 150 ? 'صاحب القناة لا يسمح بتشغيل هذا الفيديو خارج يوتيوب' : 'تعذّر تشغيل الفيديو');
    };
    window.addEventListener('message', onMsg);
    load().catch(() => {}).then(() => {
      if (!alive) return;
      const v = all ? null : byId(id);
      const p = !all && pos(id);
      const start = p && p.d && p.t < p.d - 20 ? Math.floor(p.t) : 0;
      const speed = store.get('dawah:rate', 1);
      const src = all ? `${BRIDGE}?list=UU${chan.slice(2)}&r=${speed}` : `${BRIDGE}?v=${id}&t=${start}&r=${speed}`;
      const sk = v && SHEIKHS[v.sheikh];
      N.setTitle(all ? 'كل فيديوهات القناة' : (sk ? sk.name : 'المشاهدة'));
      const similar = v ? VIDEOS.filter((x) => x.video_id !== id && (x.topics || []).some((t) => (v.topics || []).includes(t))).slice(0, 8) : [];
      N.view.innerHTML = `
        <div class="dw-player"><iframe id="ytf" src="${src}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="مشغّل الفيديو"></iframe></div>
        ${v ? `<h2 class="dw-title">${esc(v.title)}</h2><p class="muted" style="margin:0 0 10px">${sk ? sk.name : ''} — ${ago(v.published_at)}${start ? ` — يستكمل من ${N.toAr(Math.floor(start / 60))}:${N.toAr(String(start % 60).padStart(2, '0'))}` : ''}</p>
          <div class="chips" style="justify-content:flex-start;margin-bottom:10px">${(v.topics || []).map((t) => `<button class="chip" data-t="${t}">${topicName(t)}</button>`).join('')}</div>` : '<p class="muted">يمكنك التنقل بين كل فيديوهات القناة من قائمة المشغّل.</p>'}
        <div class="field"><label>سرعة التشغيل</label><div class="seg" id="dwRate">${[0.75, 1, 1.25, 1.5, 2].map((x) => `<button data-rate="${x}" class="${x === speed ? 'active' : ''}">${ar(x)}×</button>`).join('')}</div></div>
        ${v ? `<div style="display:flex;gap:8px;margin-bottom:12px">
          <button class="btn ghost block" id="dwFav">${isFav(id) ? '★ في المفضلة' : '☆ المفضلة'}</button>
          <button class="btn ghost block" id="dwList">📃 قائمة تشغيل</button>
          <button class="btn ghost block" id="dwShare">📤 مشاركة</button>
        </div>
        <button class="btn ghost block" id="dwDl" style="margin-bottom:14px">⬇ تحميل للمشاهدة دون إنترنت</button>` : ''}
        ${similar.length ? `<div class="section-title">حلقات مشابهة</div>${similar.map(card).join('')}` : ''}`;
      frame = $('#ytf');
      bindCards(N.view);
      $$('[data-t]').forEach((b) => b.addEventListener('click', () => go(`dtopic/${b.dataset.t}`)));
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
    dtopic: { title: 'الموضوع', render: renderTopic, back: 'dawah' },
    dsearch: { title: 'بحث', render: renderSearch, back: 'dawah' },
    dlist: { title: 'قائمة', render: renderList, back: 'dawah' },
    dwatch: { title: 'المشاهدة', render: renderWatch, back: 'dawah' },
  });

  N.homeExtras.push((root) => {
    const last = store.get('dawah:last'); const v = last && byId(last);
    if (!v) return;
    const d = document.createElement('div');
    d.innerHTML = `<div class="card continue"><div style="min-width:0"><small class="muted">🎬 تابع المشاهدة</small><br><b>${esc(v.title)}</b><br><small class="muted">${SHEIKHS[v.sheikh] ? SHEIKHS[v.sheikh].name : ''}</small></div><button class="btn">متابعة</button></div>`;
    $('button', d).onclick = () => go(`dwatch/${v.video_id}`);
    root.appendChild(d);
  });
});
