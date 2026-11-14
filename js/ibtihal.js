/* الابتهالات الدينية: كبار المبتهلين، فهرس يُحدَّث أسبوعياً من يوتيوب (خدمة athar-ibtihal على Supabase)،
 * والمشاهدة/الاستماع داخل التطبيق عبر مشغّل يوتيوب الرسمي (yt.html) — لا يُنزَّل أي فيديو. */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, esc, routes } = N;
  const SB = 'https://movodjdwghharkfrgqtv.supabase.co';
  const SB_KEY = 'sb_publishable_41NxOHPNTwzGP5nvZOt2UQ_m7FMSyY4';
  const BRIDGE = 'https://fathyeid.github.io/Fathyeid/yt.html';
  const MUNSHIDIN = [
    { k: 'naqshbandi', n: 'الشيخ سيد النقشبندي', d: 'كروان السماء — «مولاي إني ببابك»' },
    { k: 'tobar', n: 'الشيخ نصر الدين طوبار', d: 'صاحب الابتهالات الخاشعة قبل الفجر' },
    { k: 'fashni', n: 'الشيخ طه الفشني', d: 'من رواد فن التواشيح' },
    { k: 'omran', n: 'الشيخ محمد عمران', d: '«إلهي إن يكن ذنبي عظيماً»' },
    { k: 'toukhi', n: 'الشيخ محمد الطوخي', d: 'ابتهالات المناسبات الدينية' },
    { k: 'alimahmoud', n: 'الشيخ علي محمود', d: 'شيخ المنشدين وأستاذ الأجيال' },
    { k: 'hilbawi', n: 'الشيخ محمد الهلباوي', d: 'ابتهالات وتواشيح نادرة' },
    { k: 'general', n: 'ابتهالات الفجر', d: 'مختارات لعدد من المبتهلين' },
  ];
  const byK = Object.fromEntries(MUNSHIDIN.map((m) => [m.k, m]));
  const thumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  const fmtDur = (s) => { if (!s) return ''; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return N.toAr(h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`); };
  const isIbtihal = (t) => !/سورة|تلاوة|قرآن كريم كامل/.test(t) || /ابته|إبته|تواشيح|توشيح|إنشاد|انشاد/.test(t);

  async function list(k) {
    const ck = `ibt:${k}`;
    const c = store.get(ck);
    if (c && Date.now() - c.t < 12 * 36e5) return c.d;
    try {
      const res = await fetch(`${SB}/rest/v1/athar_ibtihal?munshid=eq.${k}&select=video_id,title,channel_title,duration_s&order=rank.asc`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
      if (!res.ok) throw new Error(res.status);
      const d = (await res.json()).filter((v) => isIbtihal(v.title));
      store.set(ck, { t: Date.now(), d });
      return d;
    } catch (e) { if (c) return c.d; throw e; }
  }

  function renderHome() {
    const favs = store.get('ibt:fav', []);
    N.view.innerHTML = `
      <div class="card ibt-hero"><h3>🎙️ الابتهالات الدينية</h3><p class="muted" style="margin:0">روائع كبار المبتهلين، تُشاهد وتُسمع داخل التطبيق.</p></div>
      ${favs.length ? `<button class="card continue ibt-fav" style="width:100%" data-go="ibt/fav"><div><small class="muted">⭐ المفضلة</small><br><b>${ar(favs.length)} ابتهال</b></div><span class="btn">فتح</span></button>` : ''}
      <div class="ibt-grid">${MUNSHIDIN.map((m) => `<button class="ibt-m" data-go="ibt/${m.k}"><span class="ibt-av">🎙️</span><b>${m.n}</b><small>${m.d}</small></button>`).join('')}</div>
      <p class="center muted" style="font-size:.8rem">تُعرض من يوتيوب عبر المشغّل الرسمي، وتحتاج اتصالاً بالإنترنت. القائمة تُحدَّث أسبوعياً.</p>`;
    $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); });
  }

  function renderList(k) { loadList(k); }
  async function loadList(k) {
    const fav = k === 'fav';
    const m = byK[k];
    N.setTitle(fav ? 'المفضلة' : m ? m.n : 'الابتهالات');
    N.view.innerHTML = '<div class="card center muted">جارٍ التحميل…</div>';
    let items;
    try { items = fav ? store.get('ibt:favItems', []) : await list(k); } catch { N.view.innerHTML = '<div class="card center">تعذّر التحميل، تأكد من الاتصال بالإنترنت.</div>'; return; }
    if (!location.hash.startsWith('#/ibt/')) return;
    store.set('ibt:cur', { k, items });
    N.view.innerHTML = `${items.length ? `<button class="btn block" id="ibtAll" style="margin-bottom:12px">▶ تشغيل الكل بالترتيب</button>` : ''}
      ${items.map((v, i) => `<button class="dw-card" data-i="${i}"><span class="dw-thumb"><img src="${thumb(v.video_id)}" alt="" loading="lazy">${v.duration_s ? `<span class="dw-dur">${fmtDur(v.duration_s)}</span>` : ''}</span><span class="dw-info"><b>${esc(v.title)}</b><small>${esc(v.channel_title || '')}</small></span></button>`).join('') || '<div class="card center muted">لا توجد عناصر بعد</div>'}`;
    $$('[data-i]', N.view).forEach((b) => { b.onclick = () => go(`ibw/${k}/${b.dataset.i}`); });
    const all = $('#ibtAll'); if (all) all.onclick = () => go(`ibw/${k}/0`);
  }

  function renderWatch(k, idx) {
    const cur = store.get('ibt:cur', {});
    const items = cur.k === k ? cur.items : [];
    let i = Math.max(0, Math.min(items.length - 1, +idx || 0));
    const v = items[i];
    if (!v) { go(`ibt/${k}`); return; }
    routes.ibw.back = `ibt/${k}`;
    window.dispatchEvent(new CustomEvent('noor:audio', { detail: 'ibtihal' }));
    N.view.innerHTML = `
      <div class="dw-player"><iframe id="ibf" src="${BRIDGE}?v=${v.video_id}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="مشغّل الابتهال"></iframe></div>
      <h2 class="dw-title">${esc(v.title)}</h2>
      <p class="muted" style="margin:0 0 12px">${esc(v.channel_title || '')}${v.duration_s ? ` — ${fmtDur(v.duration_s)}` : ''}</p>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button class="btn ghost block" id="ibPrev" ${i === 0 ? 'disabled' : ''}>⏮ السابق</button>
        <button class="btn ghost block" id="ibFav"></button>
        <button class="btn ghost block" id="ibNext" ${i >= items.length - 1 ? 'disabled' : ''}>التالي ⏭</button>
      </div>
      <button class="btn ghost block" id="ibShare">📤 مشاركة</button>`;
    const favIds = () => store.get('ibt:fav', []);
    const paintFav = () => { $('#ibFav').textContent = favIds().includes(v.video_id) ? '★ في المفضلة' : '☆ المفضلة'; };
    paintFav();
    $('#ibFav').onclick = () => {
      const F = favIds(); const FI = store.get('ibt:favItems', []); const j = F.indexOf(v.video_id);
      if (j < 0) { F.unshift(v.video_id); FI.unshift(v); toast('أضيف إلى المفضلة'); } else { F.splice(j, 1); FI.splice(FI.findIndex((x) => x.video_id === v.video_id), 1); toast('أُزيل من المفضلة'); }
      store.set('ibt:fav', F); store.set('ibt:favItems', FI); paintFav();
    };
    $('#ibPrev').onclick = () => go(`ibw/${k}/${i - 1}`);
    $('#ibNext').onclick = () => go(`ibw/${k}/${i + 1}`);
    $('#ibShare').onclick = () => N.shareText(`${v.title}\nhttps://youtu.be/${v.video_id}\n\nمن تطبيق أثر - رفيق المسلم`);
    // الانتقال تلقائياً للابتهال التالي عند انتهاء الحالي
    const frame = $('#ibf');
    const onMsg = (e) => {
      const msg = e.data || {}; if (msg.src !== 'athar-yt' || e.source !== frame.contentWindow) return;
      if (msg.type === 'state' && msg.s === 0 && i < items.length - 1) go(`ibw/${k}/${i + 1}`);
      if (msg.type === 'error') toast(msg.code === 101 || msg.code === 150 ? 'صاحب الفيديو لا يسمح بتشغيله خارج يوتيوب — جرّب التالي' : 'تعذّر تشغيل هذا الابتهال');
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }

  Object.assign(routes, {
    ibtihal: { title: 'الابتهالات', render: renderHome, back: 'home' },
    ibt: { title: 'الابتهالات', render: renderList, back: 'ibtihal' },
    ibw: { title: 'الابتهالات', render: renderWatch, back: 'ibtihal' },
  });
});
