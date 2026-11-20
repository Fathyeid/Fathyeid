/* موسوعة الطفل – عالم المعرفة والاكتشاف
 * المحتوى ملفات محلية مراجَعة في data/kids/ (تعمل دون إنترنت، ويُحمَّل كل قسم عند الحاجة فقط).
 * ملفات الأطفال وتقدّمهم محفوظة على الجهاز (N.store، مفاتيح kd:*)؛ ومزامنتها بحساب ولي الأمر مرحلة لاحقة.
 * مصدر المحتوى وقواعد التحقق منه: scripts/kids/build.py */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, esc, routes } = N;
  const LEVEL = { 1: 'سهل', 2: 'متوسط', 3: 'متقدم' };
  const STAGES = [[3, 5, 'المستكشف الصغير'], [6, 8, 'القارئ النشيط'], [9, 11, 'الباحث الذكي'], [12, 15, 'العالِم الصاعد']];
  const AVATARS = ['🦉', '🐱', '🐰', '🦁', '🐼', '🦊', '🐢', '🐬'];
  const KIND = { 'موثق': ['📜 موثّق', 'kd-k-doc'], 'علمي': ['🔬 علمي', 'kd-k-sci'], 'خيالي': ['🎈 قصة خيالية تربوية', 'kd-k-fic'] };
  const QURAN_RX = /[ٱۡ۟ۥۦ]/;

  // ---------- الشخصية المرشدة «نور»: بومة صغيرة (رسم أصلي) ----------
  const OWL = `<svg class="kd-owl" viewBox="0 0 120 120" aria-hidden="true">
    <ellipse cx="60" cy="112" rx="30" ry="5" fill="rgba(0,0,0,.12)"/>
    <path d="M24 70c0-26 16-44 36-44s36 18 36 44c0 22-16 38-36 38S24 92 24 70z" fill="#1f8a5f"/>
    <path d="M38 78c0-12 10-20 22-20s22 8 22 20c0 14-10 22-22 22S38 92 38 78z" fill="#e9d9b0"/>
    <path d="M30 34l10 12M90 34l-10 12" stroke="#145a45" stroke-width="7" stroke-linecap="round"/>
    <circle cx="45" cy="56" r="14" fill="#fff"/><circle cx="75" cy="56" r="14" fill="#fff"/>
    <circle class="kd-eye" cx="47" cy="57" r="6.5" fill="#1c2a24"/><circle class="kd-eye" cx="73" cy="57" r="6.5" fill="#1c2a24"/>
    <circle cx="49" cy="55" r="2" fill="#fff"/><circle cx="75" cy="55" r="2" fill="#fff"/>
    <path d="M55 66l5 8 5-8z" fill="#d8b45e"/>
    <path d="M44 84q4 4 8 0M56 88q4 4 8 0M68 84q4 4 8 0" stroke="#b8913a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M24 70q-10 6-6 20 8-2 12-10" fill="#145a45"/><path d="M96 70q10 6 6 20-8-2-12-10" fill="#145a45"/>
    <path d="M42 24l18-10 18 10-18 8z" fill="#d8b45e"/><path d="M72 22v10" stroke="#d8b45e" stroke-width="2"/><circle cx="72" cy="34" r="2.5" fill="#d8b45e"/>
  </svg>`;

  // ---------- البيانات ----------
  let idxP = null; const cache = new Map();
  const index = () => (idxP = idxP || fetch('data/kids/index.json').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch((e) => { idxP = null; throw e; }));
  function catItems(id) {
    if (!cache.has(id)) {
      const p = fetch(`data/kids/${id}.json`).then((r) => r.json());
      cache.set(id, p); p.catch(() => cache.delete(id));
    }
    return cache.get(id);
  }
  async function item(cat, id) { return (await catItems(cat)).find((x) => x.id === id); }

  // ---------- ملف الطفل والتقدّم (على الجهاز) ----------
  const P = {
    list: () => store.get('kd:profiles', []), save: (v) => store.set('kd:profiles', v),
    activeId: () => store.get('kd:active', ''), setActive: (id) => store.set('kd:active', id),
  };
  const me = () => P.list().find((p) => p.id === P.activeId()) || null;
  const key = (k) => `kd:${P.activeId()}:${k}`;
  const S = {
    prog: () => store.get(key('prog'), {}), setProg: (v) => store.set(key('prog'), v), // id → {done, stars, quiz, seen, at, cat}
    fav: () => store.get(key('fav'), []), setFav: (v) => store.set(key('fav'), v),
    stars: () => store.get(key('stars'), 0), addStars: (n) => store.set(key('stars'), store.get(key('stars'), 0) + n),
    last: () => store.get(key('last'), null), setLast: (v) => store.set(key('last'), v),
    badges: () => store.get(key('badges'), {}),
  };
  const stageOf = (age) => STAGES.find((s) => age >= s[0] && age <= s[1]) || STAGES[1];
  const levelOf = (stars) => Math.floor(Math.sqrt(stars / 5)) + 1;
  const fitsAge = (it, age) => !age || (age >= it.age[0] - 1 && age <= it.age[1] + 1);
  // قواعد ولي الأمر لكل طفل (تُضبط من لوحة ولي الأمر)
  const RULES0 = { cats: null, maxLevel: 3, minutes: 0, audio: true };
  const rulesOf = (p) => Object.assign({}, RULES0, (p && p.rules) || {});
  const catAllowed = (c) => { const r = rulesOf(me()); return !r.cats || r.cats.includes(c); };
  const allowed = (it) => catAllowed(it.c || it.cat) && (it.l || it.level || 1) <= rulesOf(me()).maxLevel;
  const audioOn = () => rulesOf(me()).audio;
  const lockedPage = () => { N.view.innerHTML = `<div class="kd"><div class="kd-card center kd-soon">${OWL}<p><b>هذا المحتوى غير متاح في ملفك 🔒</b></p><p class="muted">اختار ولي أمرك الأقسام المناسبة لك. يمكنك أن تطلب منه فتحه.</p><button class="btn" data-go="kids">العودة للموسوعة</button></div></div>`; $('[data-go]').onclick = () => go('kids'); };
  const ageTxt = (a) => `${ar(a[0])}–${ar(a[1])} سنة`;
  const loader = () => { N.view.innerHTML = '<div class="loader"></div>'; };
  const failed = () => { N.view.innerHTML = '<div class="kd"><div class="kd-card center"><p>تعذّر تحميل الموسوعة. أعد فتح القسم.</p></div></div>'; };
  const qtext = (t) => esc(t).replace(/﴿([^﴾]*)﴾/g, '<span class="kd-qr">﴿$1﴾</span>');
  function celebrate(msg) {
    const d = document.createElement('div'); d.className = 'kd-confetti';
    d.innerHTML = `${Array.from({ length: 24 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 6) * 0.12}s;--c:${['#d8b45e', '#1f8a5f', '#ef476f', '#3a86ff', '#ffd166'][i % 5]}"></i>`).join('')}<div class="kd-cele">${OWL}<b>${esc(msg)}</b></div>`;
    document.body.appendChild(d); setTimeout(() => d.remove(), 2600);
  }
  const BADGES = [
    ['first', '🌱', 'الخطوة الأولى', (c) => c.done >= 1],
    ['reader', '📖', 'قارئ صغير', (c) => c.done >= 5],
    ['anbiya', '⛵', 'صديق الأنبياء', (c) => c.cat.anbiya >= 5],
    ['akhlaq', '🦸', 'بطل الأخلاق', (c) => c.cat.akhlaq >= 5],
    ['ibadat', '🕌', 'المصلّي الصغير', (c) => c.cat.ibadat >= 5],
    ['stars50', '⭐', 'صديق المعرفة', (c) => c.stars >= 50],
  ];
  function checkBadges() {
    const pr = S.prog(); const c = { done: 0, cat: {}, stars: S.stars() };
    for (const id in pr) if (pr[id].done) { c.done++; c.cat[pr[id].cat] = (c.cat[pr[id].cat] || 0) + 1; }
    const got = S.badges(); let fresh = null;
    for (const [id, ic, name, t] of BADGES) if (!got[id] && t(c)) { got[id] = Date.now(); fresh = `${ic} ${name}`; }
    if (fresh) { store.set(key('badges'), got); setTimeout(() => celebrate(`شارة جديدة: ${fresh}`), 900); }
  }

  // الانتقال إلى رئيسية الموسوعة (أو إعادة عرضها إن كنا عليها، لأن تغيير العنوان للعنوان نفسه لا يعيد العرض)
  const goHome = () => { if (location.hash === '#/kids') renderHome(); else go('kids'); };

  // ---------- عدّاد المناسبات: الأيام الباقية حتى تاريخ هجري (تقويم أم القرى مع تعديل المستخدم) ----------
  const hjFmt = (() => { try { return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric', day: 'numeric' }); } catch { return null; } })();
  function daysUntil(hj) {
    if (!hjFmt || !hj) return null;
    const adj = (N.settings && N.settings.hijriAdj) || 0;
    for (let i = 0; i < 400; i++) {
      const p = hjFmt.formatToParts(new Date(Date.now() + (i + adj) * 864e5));
      const m = +p.find((x) => x.type === 'month').value, d = +p.find((x) => x.type === 'day').value;
      if (m === hj.m && d === hj.d) return i;
    }
    return null;
  }
  const untilTxt = (n) => (n === 0 ? 'اليوم! 🎉' : n === 1 ? 'غداً' : `بعد ${ar(n)} يوماً`);

  // ---------- إنشاء ملف الطفل ----------
  function renderSetup(edit) {
    const p = edit ? me() : null;
    let av = p ? p.avatar : AVATARS[0];
    N.setTitle('موسوعة الطفل');
    N.view.innerHTML = `<div class="kd"><div class="kd-hero kd-setup">${OWL}
      <div class="kd-bubble">أهلاً! أنا <b>نور</b>، سأرافقك في عالم المعرفة والاكتشاف. ما اسمك؟</div></div>
      <div class="kd-card">
        <label class="kd-lbl">الاسم المستعار (لا تكتب اسمك الكامل)</label>
        <input class="search" id="kName" maxlength="20" placeholder="مثلاً: البطل يوسف" value="${p ? esc(p.name) : ''}">
        <label class="kd-lbl">العمر</label>
        <div class="kd-ages">${Array.from({ length: 13 }, (_, i) => i + 3).map((a) => `<button data-a="${a}" class="${p && p.age === a ? 'on' : ''}">${ar(a)}</button>`).join('')}</div>
        <label class="kd-lbl">اختر شخصيتك</label>
        <div class="kd-avs">${[...AVATARS, ...UNLOCK.filter(([, n]) => p && S.stars() >= n).map(([x]) => x)].map((x) => `<button data-v="${x}" class="${x === av ? 'on' : ''}">${x}</button>`).join('')}</div>
        <button class="btn block kd-big" id="kSave">${p ? 'حفظ' : 'ابدأ الرحلة 🚀'}</button>
        <p class="muted kd-note">تُحفظ هذه البيانات على هذا الجهاز فقط.</p>
      </div></div>`;
    let age = p ? p.age : 0;
    $$('[data-a]').forEach((b) => b.onclick = () => { age = +b.dataset.a; $$('[data-a]').forEach((x) => x.classList.toggle('on', x === b)); });
    $$('[data-v]').forEach((b) => b.onclick = () => { av = b.dataset.v; $$('[data-v]').forEach((x) => x.classList.toggle('on', x === b)); });
    $('#kSave').onclick = () => {
      const name = $('#kName').value.trim().slice(0, 20);
      if (!name) return toast('اكتب اسماً مستعاراً');
      if (!age) return toast('اختر العمر');
      const list = P.list();
      if (p) Object.assign(list.find((x) => x.id === p.id), { name, age, avatar: av });
      else { const id = 'k' + Date.now().toString(36); list.push({ id, name, age, avatar: av, created: Date.now() }); P.setActive(id); }
      P.save(list); goHome();
    };
  }

  // ---------- الصفحة الرئيسية للموسوعة ----------
  async function renderHome() {
    if (!me()) return renderSetup(false);
    loader();
    let I; try { I = await index(); } catch { return failed(); }
    const k = me(); const pr = S.prog(); const stars = S.stars(); const lvl = levelOf(stars); const st = stageOf(k.age);
    const fit = I.items.filter((it) => fitsAge(it, k.age) && allowed(it));
    const done = fit.filter((it) => pr[it.id] && pr[it.id].done).length;
    const day = N.todayKey(); let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const pick = (arr, salt) => (arr.length ? arr[(h + salt) % arr.length] : null);
    const story = pick(fit.filter((it) => it.c === 'anbiya' || it.c === 'stories'), 0);
    const fact = pick(fit.filter((it) => it.c !== 'anbiya'), 7);
    const unseen = fit.filter((it) => !pr[it.id]);
    const discover = pick(unseen.length ? unseen : fit, 13);
    const last = S.last(); const lastIt = last && I.items.find((x) => x.id === last.id && allowed(x));
    const viewed = Object.entries(pr).filter(([, v]) => v.seen).sort((a, b) => b[1].seen - a[1].seen).slice(0, 6).map(([id]) => I.items.find((x) => x.id === id)).filter((x) => x && allowed(x));
    const favs = S.fav().map((id) => I.items.find((x) => x.id === id)).filter((x) => x && allowed(x));
    const newest = I.items.filter(allowed).slice(-6).reverse();
    const card = (it, label) => it ? `<button class="kd-mini" data-go="kidsitem/${it.c}/${it.id}"><span class="kd-mini-ic">${it.ic}</span><span><small>${label || ''}</small><b>${esc(it.t)}</b></span></button>` : '';
    const row = (title, items) => items.length ? `<h3 class="kd-h">${title}</h3><div class="kd-row">${items.map((it) => `<button class="kd-tile" data-go="kidsitem/${it.c}/${it.id}"><span>${it.ic}</span><b>${esc(it.t)}</b>${pr[it.id] && pr[it.id].done ? '<i>✓</i>' : ''}</button>`).join('')}</div>` : '';
    N.setTitle('موسوعة الطفل');
    N.view.innerHTML = `<div class="kd">
      <section class="kd-hero">
        <div class="kd-hero-top">${OWL}<div class="kd-bubble">مرحباً يا <b>${esc(k.name)}</b> ${k.avatar}<br><small>${st[2]} • ${ar(k.age)} سنوات${minutesLeft() !== Infinity ? ` • ⏳ باقي ${ar(Math.max(0, Math.ceil(minutesLeft())))} دقيقة اليوم` : ''}</small></div></div>
        <div class="kd-stats"><div><b>⭐ ${ar(stars)}</b><small>نجمة</small></div><div><b>🏅 ${ar(lvl)}</b><small>المستوى</small></div><div><b>📚 ${ar(done)}/${ar(fit.length)}</b><small>درس مكتمل</small></div></div>
        <div class="kd-prog"><span style="width:${fit.length ? (done / fit.length) * 100 : 0}%"></span></div>
        ${lastIt ? `<button class="btn kd-big kd-cont" data-go="kidsitem/${lastIt.c}/${lastIt.id}">▶️ تابع التعلّم: ${esc(lastIt.t)}</button>` : ''}
      </section>
      <input class="search kd-search" id="kQ" type="search" placeholder="🔍 ابحث في الموسوعة...">
      <div class="kd-today">
        ${card(story, '📖 قصة اليوم')}${card(fact, '💡 معلومة اليوم')}
        <button class="kd-mini" id="kChal"><span class="kd-mini-ic">🎯</span><span><small>تحدي اليوم</small><b>${store.get(key('chal'), '') === day ? 'أنجزت تحدي اليوم ✓' : 'سؤال واحد، هل تعرف الإجابة؟'}</b></span></button>
        ${card(discover, '🧭 اكتشف شيئاً جديداً')}
        ${(() => { const occ = I.items.filter((x) => x.hj && allowed(x)).map((x) => [x, daysUntil(x.hj)]).filter((x) => x[1] != null).sort((a, b) => a[1] - b[1])[0]; return occ ? card(occ[0], `🌙 المناسبة القادمة: ${untilTxt(occ[1])}`) : ''; })()}
      </div>
      <h3 class="kd-h">أقسام الموسوعة</h3>
      <div class="kd-cats">${I.cats.filter((c) => catAllowed(c.id)).map((c) => { const n = fit.filter((x) => x.c === c.id).length; return `<button class="kd-cat" style="--cc:${c.color}" data-go="kidscat/${c.id}"><span class="kd-cat-ic">${c.ic}</span><b>${esc(c.n)}</b><small>${c.count ? `${ar(n)} مادة لعمرك` : 'قيد الإعداد'}</small></button>`; }).join('')}</div>
      ${row('⭐ المفضلة', favs)}${row('👀 الأكثر مشاهدة عندك', viewed)}${row('🆕 المحتوى الجديد', newest)}
      <div class="kd-play"><button class="kd-pl" data-go="kidsgames"><span>🎮</span>الألعاب</button><button class="kd-pl" data-go="kidsweek"><span>🗓️</span>تحديات الأسبوع</button><button class="kd-pl" data-go="kidsjourney"><span>🗺️</span>رحلتي</button></div>
      <div class="kd-links"><button class="chip" data-go="kidsbadges">🏅 شاراتي</button><button class="chip" data-go="kidssearch">🔍 البحث المتقدم</button><button class="chip" id="kProf">${k.avatar} تعديل ملفي</button>${P.list().length > 1 ? '<button class="chip" id="kSwitch">🔄 تبديل الطفل</button>' : '<button class="chip" id="kAdd">➕ إضافة طفل</button>'}<button class="chip" data-go="kidsparent">👨‍👩‍👧 ولي الأمر</button></div>
    </div>`;
    $$('[data-go]', N.view).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
    $('#kQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') { store.set('kd:q', e.target.value); go('kidssearch'); } });
    $('#kProf').onclick = () => renderSetup(true);
    if ($('#kAdd')) $('#kAdd').onclick = () => parentGate(() => { P.setActive(''); renderSetup(false); });
    if ($('#kSwitch')) $('#kSwitch').onclick = () => {
      const sh = N.sheet(`<div class="kd"><div class="sheet-title">من يتعلّم الآن؟</div>${P.list().map((p) => `<button class="kd-mini" data-k="${p.id}"><span class="kd-mini-ic">${p.avatar}</span><span><b>${esc(p.name)}</b><small>${ar(p.age)} سنوات</small></span></button>`).join('')}<button class="btn ghost block" id="kNew">➕ إضافة طفل</button></div>`);
      $$('[data-k]', sh.el).forEach((b) => b.onclick = () => { P.setActive(b.dataset.k); sh.close(); renderHome(); });
      $('#kNew', sh.el).onclick = () => { sh.close(); parentGate(() => { P.setActive(''); renderSetup(false); }); };
    };
    $('#kChal').onclick = () => dailyChallenge(fit, h);
  }

  async function dailyChallenge(fit, h) {
    const day = N.todayKey();
    const pool = fit.filter((it) => it.m.includes('اختبار'));
    if (!pool.length) return toast('لا يوجد تحدٍّ اليوم');
    const ref = pool[h % pool.length];
    const it = await item(ref.c, ref.id); const q = it.quiz[h % it.quiz.length];
    const order = q.o.map((_, i) => i).sort((a, b) => ((a * 7 + h) % 5) - ((b * 7 + h) % 5));
    const sh = N.sheet(`<div class="kd"><div class="sheet-title">🎯 تحدي اليوم</div><p class="kd-q">${qtext(q.q)}</p>
      <div class="kd-opts">${order.map((i) => `<button class="kd-opt${QURAN_RX.test(q.o[i]) ? ' kd-qr' : ''}" data-i="${i}">${esc(q.o[i])}</button>`).join('')}</div><div id="cFb"></div></div>`);
    $$('.kd-opt', sh.el).forEach((b) => b.onclick = () => {
      const ok = +b.dataset.i === q.a;
      $$('.kd-opt', sh.el).forEach((x) => { x.disabled = true; if (+x.dataset.i === q.a) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      const first = store.get(key('chal'), '') !== day;
      if (first) { store.set(key('chal'), day); if (ok) { S.addStars(2); celebrate('أحسنت! +٢ نجمة'); } }
      $('#cFb', sh.el).innerHTML = `<p class="kd-fb ${ok ? 'ok' : 'no'}">${ok ? '✅ إجابة صحيحة' : '❌ الإجابة الصحيحة: ' + esc(q.o[q.a])}</p>${q.e ? `<p class="muted">${qtext(q.e)}</p>` : ''}<button class="btn block" id="cGo">اقرأ الدرس: ${esc(it.title)}</button>`;
      $('#cGo', sh.el).onclick = () => { sh.close(); go(`kidsitem/${it.cat}/${it.id}`); };
    });
  }

  // ---------- صفحة القسم ----------
  async function renderCat(cid) {
    if (!me()) return renderSetup(false);
    loader();
    let I, list; try { I = await index(); list = await catItems(cid); } catch { return failed(); }
    const C = I.cats.find((c) => c.id === cid); if (!C) return go('kids');
    if (!catAllowed(cid)) return lockedPage();
    N.setTitle(C.n);
    const pr = S.prog(); const age = me().age;
    let sub = '', onlyAge = true;
    const draw = () => {
      const items = list.filter((it) => allowed(it) && (!sub || it.sub === sub) && (!onlyAge || fitsAge(it, age)));
      N.view.innerHTML = `<div class="kd">
        <section class="kd-hero kd-cathero" style="--cc:${C.color}"><span class="kd-cat-big">${C.ic}</span><div><b>${esc(C.n)}</b><small>${esc(C.desc)}</small></div></section>
        ${!list.length ? `<div class="kd-card center kd-soon">${OWL}<p><b>هذا القسم قيد الإعداد</b></p><p class="muted">نجهّز له محتوى موثّقاً ومراجَعاً، ولن نضع فيه شيئاً قبل التأكد منه. عُد إلينا قريباً بإذن الله!</p><button class="btn" data-go="kids">العودة للموسوعة</button></div>` : `
        <div class="kd-filters">${C.subs.length ? `<button class="chip ${sub ? '' : 'active'}" data-s="">الكل</button>${C.subs.filter((s) => list.some((x) => x.sub === s)).map((s) => `<button class="chip ${sub === s ? 'active' : ''}" data-s="${esc(s)}">${esc(s)}</button>`).join('')}` : ''}
          <label class="kd-chk"><input type="checkbox" id="kAge" ${onlyAge ? 'checked' : ''}> المناسب لعمري فقط</label></div>
        <div class="kd-list">${items.map((it) => { const p = pr[it.id]; return `<button class="kd-item" data-go="kidsitem/${cid}/${it.id}"><span class="kd-item-ic">${it.icon || C.ic}</span><div><b>${esc(it.title)}</b><small>${esc(it.intro.slice(0, 90))}…</small><span class="kd-tags"><i>${ageTxt(it.age)}</i><i>${LEVEL[it.level]}</i>${it.quiz ? '<i>❓ اختبار</i>' : ''}${it.steps ? '<i>👣 خطوات</i>' : ''}</span></div>${p && p.done ? `<span class="kd-done">${'⭐'.repeat(Math.max(1, p.stars || 1))}</span>` : ''}</button>`; }).join('') || '<p class="muted center">لا توجد مواد بهذه الخيارات. جرّب إلغاء «المناسب لعمري».</p>'}</div>`}</div>`;
      $$('[data-go]', N.view).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
      $$('[data-s]').forEach((b) => b.onclick = () => { sub = b.dataset.s; draw(); });
      if ($('#kAge')) $('#kAge').onchange = (e) => { onlyAge = e.target.checked; draw(); };
    };
    draw();
  }

  // ---------- القراءة بالصوت (صوت الجهاز) مع الاستكمال ----------
  const TTS = window.speechSynthesis;
  let ttsState = null;
  const arVoice = () => (TTS && TTS.getVoices().find((v) => /^ar/i.test(v.lang))) || null;
  function stopTTS() { if (TTS) TTS.cancel(); ttsState = null; $$('.kd-say').forEach((p) => p.classList.remove('kd-reading')); const b = $('#kRead'); if (b) b.textContent = '🔊 اقرأ لي'; }
  function readFrom(it, start) {
    const paras = $$('.kd-say');
    if (!paras.length) return;
    stopTTS();
    ttsState = { id: it.id, i: Math.min(start, paras.length - 1) };
    $('#kRead').textContent = '⏸️ إيقاف القراءة';
    const next = () => {
      if (!ttsState || ttsState.id !== it.id) return;
      if (ttsState.i >= paras.length) { store.set(key('tts:' + it.id), 0); stopTTS(); return; }
      const el = paras[ttsState.i];
      paras.forEach((p) => p.classList.toggle('kd-reading', p === el));
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const u = new SpeechSynthesisUtterance(el.textContent.replace(/\[[^\]]*\]/g, ''));
      u.lang = 'ar'; const v = arVoice(); if (v) u.voice = v; u.rate = me().age <= 6 ? 0.85 : 0.95;
      u.onend = () => { if (!ttsState) return; ttsState.i++; store.set(key('tts:' + it.id), ttsState.i); next(); };
      u.onerror = () => stopTTS();
      TTS.speak(u);
    };
    next();
  }

  // ---------- الخريطة التفاعلية (حدود Natural Earth، والبيانات العربية من scripts/kids/countries.json) ----------
  let worldP = null;
  async function mountMap(box, onWin) {
    box.innerHTML = '<div class="loader"></div>';
    let W; try { W = await (worldP = worldP || fetch('data/kids/world.json').then((r) => r.json())); } catch { worldP = null; box.innerHTML = '<p class="muted center">تعذّر تحميل الخريطة.</p>'; return; }
    let zoom = 1; let quiz = null;
    box.innerHTML = `<div class="kd-map-bar"><button class="btn ghost kd-tool" id="mOut">➖</button><button class="btn ghost kd-tool" id="mIn">➕</button><button class="btn kd-tool" id="mQuiz">🎯 تحدي الخريطة</button></div>
      <p class="kd-map-q" id="mQ" hidden></p>
      <div class="kd-map-wrap"><svg class="kd-map" id="mSvg" viewBox="0 0 ${W.w} ${W.h}" role="img" aria-label="خريطة العالم">${W.c.map(([id, , d]) => `<path d="${d}" data-id="${id}" class="${W.info[id] ? 'has' : ''}"/>`).join('')}</svg></div>
      <p class="muted kd-note">الدول الملوّنة لها بطاقة معلومات. حرّك الخريطة بإصبعك بعد التكبير.</p>`;
    const svg = $('#mSvg', box);
    const setZoom = (z) => { zoom = Math.min(4, Math.max(1, z)); svg.style.width = `${zoom * 100}%`; };
    $('#mIn', box).onclick = () => setZoom(zoom + 0.75);
    $('#mOut', box).onclick = () => setZoom(zoom - 0.75);
    const ids = Object.keys(W.info).filter((id) => svg.querySelector(`[data-id="${id}"]`));
    const ask = () => {
      const id = ids[Math.floor(Math.random() * ids.length)];
      quiz = { id, tries: 0 };
      $('#mQ', box).hidden = false; $('#mQ', box).innerHTML = `🎯 أين تقع <b>${esc(W.info[id].n)}</b>؟ اضغط عليها في الخريطة.`;
      $$('path.found, path.miss', svg).forEach((p) => p.classList.remove('found', 'miss'));
    };
    $('#mQuiz', box).onclick = ask;
    svg.addEventListener('click', (e) => {
      const p = e.target.closest('path'); if (!p) return;
      const id = p.dataset.id; const c = W.info[id];
      $$('path.sel', svg).forEach((x) => x.classList.remove('sel')); p.classList.add('sel');
      if (quiz) {
        if (id === quiz.id) {
          p.classList.add('found'); const first = quiz.tries === 0; quiz = null;
          $('#mQ', box).innerHTML = `✅ أحسنت! هذه ${esc(c.n)}. ${first ? '+١ ⭐' : ''} <button class="chip" id="mNext">سؤال آخر</button>`;
          if (first && onWin) onWin();
          $('#mNext', box).onclick = ask; return;
        }
        quiz.tries++; p.classList.add('miss');
        $('#mQ', box).innerHTML = `🤔 ليست هذه، حاول مرة أخرى. أين تقع <b>${esc(W.info[quiz.id].n)}</b>؟${quiz.tries >= 3 ? ' (تلميح: في قارة ' + esc(W.info[quiz.id].c) + ')' : ''}`;
        return;
      }
      N.sheet(c ? `<div class="kd"><div class="sheet-title">${esc(c.n)}</div><div class="kd-chips"><span>🏛️ العاصمة: ${esc(c.cap)}</span><span>🌍 القارة: ${esc(c.c)}</span></div><p>💡 ${esc(c.f)}</p></div>`
        : '<div class="kd"><div class="sheet-title">🗺️ دولة</div><p class="muted">بطاقة هذه الدولة قيد الإعداد. جرّب دولة ملوّنة!</p></div>');
    });
  }

  // ---------- صفحة المادة ----------
  async function renderItem(cid, id) {
    if (!me()) return renderSetup(false);
    loader();
    let it, I; try { I = await index(); it = await item(cid, id); } catch { return failed(); }
    if (!it) return go('kidscat/' + cid);
    if (!allowed(it)) return lockedPage();
    const C = I.cats.find((c) => c.id === cid);
    N.setTitle(it.title);
    const pr = S.prog(); const p = pr[id] || { cat: cid };
    p.seen = Date.now(); p.cat = cid; pr[id] = p; S.setProg(pr); S.setLast({ id, cat: cid, at: Date.now() });
    const fav = () => S.fav().includes(id);
    const [kLabel, kCls] = KIND[it.kind] || KIND['موثق'];
    const say = (t, tag = 'p', cls = '') => `<${tag} class="kd-say ${cls}">${qtext(t)}</${tag}>`;
    const resumeAt = store.get(key('tts:' + id), 0);
    N.view.innerHTML = `<div class="kd kd-read">
      <section class="kd-hero kd-cathero" style="--cc:${C.color}"><span class="kd-cat-big">${it.icon || C.ic}</span><div><b>${esc(it.title)}</b>
        <span class="kd-tags kd-tags-l"><i class="${kCls}">${kLabel}</i><i>${ageTxt(it.age)}</i><i>${LEVEL[it.level]}</i></span></div></section>
      <div class="kd-tools">
        ${TTS && audioOn() ? `<button class="btn kd-tool" id="kRead">🔊 اقرأ لي</button>${resumeAt > 0 ? '<button class="btn ghost kd-tool" id="kResume">⏯️ أكمل من حيث توقفت</button>' : ''}` : ''}
        <button class="btn ghost kd-tool" id="kFav">${fav() ? '★ في المفضلة' : '☆ المفضلة'}</button>
        <button class="btn ghost kd-tool" id="kPrint">🖨️ للطباعة</button>
      </div>
      <div class="kd-card kd-body">
        ${say(it.intro, 'p', 'kd-lead')}
        ${(it.sections || []).map((s) => `${s.h ? say(s.h, 'h3') : ''}${s.p.map((x) => say(x)).join('')}`).join('')}
        ${it.hijri && daysUntil(it.hijri) != null ? `<div class="kd-count">🗓️ <b>${untilTxt(daysUntil(it.hijri))}</b><small>حسب تقويم أم القرى، وقد يختلف يوماً حسب رؤية الهلال في بلدك</small></div>` : ''}
        ${it.timeline ? `<div class="kd-tl">${it.timeline.map((e, i) => `<button class="kd-tl-e" data-tl="${i}"><span class="kd-tl-y">${esc(e.y)}</span><span class="kd-tl-dot"></span><span class="kd-tl-c"><b>${esc(e.t)}</b><span class="kd-tl-d">${qtext(e.d)}</span></span></button>`).join('')}</div>` : ''}
        ${it.steps ? `<div class="kd-steps">${it.steps.map((s, i) => `<div class="kd-step"><span>${ar(i + 1)}</span><div>${say(s.t, 'b')}${s.d ? say(s.d) : ''}</div></div>`).join('')}</div>` : ''}
      </div>
      ${it.map ? '<div class="kd-card" id="kMap"></div>' : ''}
      ${it.experiment ? `<div class="kd-card kd-exp"><h3 class="kd-h3">🧪 جرّبها بنفسك</h3><p class="kd-safe">⚠️ ${esc(it.experiment.safety)}</p><b>الأدوات:</b><div class="kd-chips">${it.experiment.tools.map((x) => `<span>${esc(x)}</span>`).join('')}</div><b>الخطوات:</b><ol>${it.experiment.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>${it.experiment.why ? `<details><summary>🤔 لماذا حدث ذلك؟</summary><p>${esc(it.experiment.why)}</p></details>` : ''}</div>` : ''}
      ${it.facts ? `<div class="kd-card"><h3 class="kd-h3">👥 الشخصيات والأماكن</h3>${it.facts.people ? `<div class="kd-chips">${it.facts.people.map((x) => `<span>👤 ${esc(x)}</span>`).join('')}</div>` : ''}${it.facts.places ? `<div class="kd-chips">${it.facts.places.map((x) => `<span>📍 ${esc(x)}</span>`).join('')}</div>` : ''}</div>` : ''}
      ${it.evidence ? `<div class="kd-card"><h3 class="kd-h3">📜 من القرآن والسنة</h3>${it.evidence.map((e) => e.k === 'q' ? `<div class="kd-ev"><span class="kd-qr">﴿${esc(e.x)}﴾</span><small>${esc(e.r)}</small></div>` : `<div class="kd-ev">«${esc(e.x)}»<small>${esc(e.r)} • ${esc(e.g)}</small></div>`).join('')}</div>` : ''}
      ${it.lessons ? `<div class="kd-card kd-lessons"><h3 class="kd-h3">🌟 ماذا تعلّمنا؟</h3>${it.lessons.map((x) => `<p>✔️ ${qtext(x)}</p>`).join('')}</div>` : ''}
      ${it.situation ? `<div class="kd-card kd-sit"><h3 class="kd-h3">🤔 ماذا تفعل لو كنت مكانه؟</h3><p>${qtext(it.situation.story)}</p><p class="kd-q">${esc(it.situation.q)}</p><div class="kd-opts" id="kSit">${it.situation.o.map((o, i) => `<button class="kd-opt" data-i="${i}">${esc(o)}</button>`).join('')}</div><div id="kSitFb"></div></div>` : ''}
      ${it.cards ? `<div class="kd-card"><h3 class="kd-h3">🃏 بطاقات المراجعة <small class="muted">(اضغط لتقلب البطاقة)</small></h3><div class="kd-flash">${it.cards.map((c) => `<button class="kd-fc"><span class="kd-fc-f">${esc(c.f)}</span><span class="kd-fc-b">${esc(c.b)}</span></button>`).join('')}</div></div>` : ''}
      ${gameKinds(it).length ? `<div class="kd-card"><h3 class="kd-h3">🎮 العب وتعلّم</h3><div class="kd-row2">${gameKinds(it).map(([k, l]) => `<button class="btn ghost" data-game="${k}">${l}</button>`).join('')}</div><div id="kGame"></div></div>` : ''}
      ${it.quiz ? `<div class="kd-card" id="kQuiz"><h3 class="kd-h3">❓ اختبر نفسك</h3><button class="btn block kd-big" id="kStartQ">ابدأ الاختبار (${ar(it.quiz.length)} أسئلة)</button></div>` : ''}
      <button class="btn block kd-big" id="kDone">${p.done ? '✓ أكملت هذا الدرس' : '✅ أنهيت القراءة'}</button>
      ${it.sources ? `<details class="kd-card kd-src"><summary>📚 المصادر والمراجع</summary><ul>${it.sources.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>${it.reviewed ? `<small class="muted">آخر مراجعة: ${esc(it.reviewed)}</small>` : ''}</details>` : ''}
    </div>`;
    const finish = (extra) => {
      const pr2 = S.prog(); const q = pr2[id] || { cat: cid };
      if (!q.done) { bumpWeek('lessons'); q.done = true; q.at = Date.now(); S.addStars(1 + (extra || 0)); q.stars = Math.max(q.stars || 0, 1 + (extra || 0)); pr2[id] = q; S.setProg(pr2); celebrate(`أحسنت يا ${me().name}! +${ar(1 + (extra || 0))} ⭐`); checkBadges(); }
      else if (extra && extra + 1 > (q.stars || 0)) { S.addStars(extra + 1 - (q.stars || 0)); q.stars = extra + 1; pr2[id] = q; S.setProg(pr2); celebrate('نتيجة أفضل! ⭐'); checkBadges(); }
      $('#kDone').textContent = '✓ أكملت هذا الدرس';
    };
    if ($('#kRead')) $('#kRead').onclick = () => (ttsState ? stopTTS() : readFrom(it, 0));
    if ($('#kResume')) $('#kResume').onclick = () => readFrom(it, resumeAt);
    $('#kFav').onclick = (e) => { let f = S.fav(); f = f.includes(id) ? f.filter((x) => x !== id) : [id, ...f]; S.setFav(f); e.target.textContent = fav() ? '★ في المفضلة' : '☆ المفضلة'; toast(fav() ? 'أُضيف إلى المفضلة ⭐' : 'أُزيل من المفضلة'); };
    $('#kPrint').onclick = () => { stopTTS(); document.body.classList.add('kd-printing'); window.print(); setTimeout(() => document.body.classList.remove('kd-printing'), 500); };
    $('#kDone').onclick = () => finish(0);
    // قلب البطاقة ونطقها بصوت الجهاز (مفيد لتعلّم الحروف والكلمات)
    const sayWord = (t) => { if (!TTS || ttsState || !audioOn()) return; try { TTS.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'ar'; const v = arVoice(); if (v) u.voice = v; u.rate = 0.8; TTS.speak(u); } catch { /* تجاهل */ } };
    $$('.kd-fc').forEach((b) => b.onclick = () => { b.classList.toggle('flip'); if (b.classList.contains('flip')) sayWord(`${b.querySelector('.kd-fc-f').textContent}، ${b.querySelector('.kd-fc-b').textContent.replace(/\p{Extended_Pictographic}/gu, '')}`); });
    $$('.kd-tl-e').forEach((b) => b.onclick = () => b.classList.toggle('open'));
    if (it.map) mountMap($('#kMap'), () => { S.addStars(1); bumpWeek('games'); });
    $$('[data-game]').forEach((b) => b.onclick = () => { stopTTS(); playOn($('#kGame'), it, b.dataset.game); $('#kGame').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    if (it.situation) $$('#kSit .kd-opt').forEach((b) => b.onclick = () => {
      const s = it.situation; const ok = +b.dataset.i === s.a;
      $$('#kSit .kd-opt').forEach((x) => { x.disabled = true; if (+x.dataset.i === s.a) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      $('#kSitFb').innerHTML = `<p class="kd-fb ${ok ? 'ok' : 'no'}">${ok ? '👏 تصرّف رائع!' : '🤗 لنفكّر معاً: التصرّف الأفضل هو: ' + esc(s.o[s.a])}</p>${s.e ? `<p class="muted">${qtext(s.e)}</p>` : ''}`;
    });
    if (it.quiz) $('#kStartQ').onclick = () => runQuiz(it, (score) => { const pq = S.prog(); const e = pq[id] || { cat: cid }; e.quiz = { s: score, n: it.quiz.length, at: Date.now(), best: Math.max(score, (e.quiz && e.quiz.best) || 0) }; pq[id] = e; S.setProg(pq); finish(Math.min(2, score === it.quiz.length ? 2 : score >= it.quiz.length / 2 ? 1 : 0)); });
    return () => stopTTS();
  }

  function runQuiz(it, onEnd) {
    const box = $('#kQuiz'); let i = 0, score = 0;
    const order = it.quiz.map((q) => q.o.map((_, k) => k).sort(() => Math.random() - 0.5));
    const show = () => {
      if (i >= it.quiz.length) {
        const all = score === it.quiz.length;
        box.innerHTML = `<div class="center"><p style="font-size:2.6rem;margin:0">${all ? '🏆' : score ? '👏' : '🌱'}</p><h3>${ar(score)} من ${ar(it.quiz.length)}</h3><p class="muted">${all ? 'ممتاز! كل إجاباتك صحيحة.' : 'أحسنت المحاولة، يمكنك إعادة الاختبار متى شئت.'}</p><button class="btn ghost" id="kAgain">🔁 أعد الاختبار</button></div>`;
        $('#kAgain').onclick = () => { i = 0; score = 0; show(); };
        bumpWeek('quizzes'); onEnd(score); return;
      }
      const q = it.quiz[i];
      box.innerHTML = `<h3 class="kd-h3">❓ السؤال ${ar(i + 1)} من ${ar(it.quiz.length)}</h3><div class="kd-prog kd-prog-s"><span style="width:${(i / it.quiz.length) * 100}%"></span></div>
        <p class="kd-q">${qtext(q.q)}</p><div class="kd-opts">${order[i].map((k) => `<button class="kd-opt${QURAN_RX.test(q.o[k]) ? ' kd-qr' : ''}" data-i="${k}">${esc(q.o[k])}</button>`).join('')}</div><div id="kQFb"></div>`;
      $$('.kd-opt', box).forEach((b) => b.onclick = () => {
        const ok = +b.dataset.i === q.a; if (ok) score++;
        $$('.kd-opt', box).forEach((x) => { x.disabled = true; if (+x.dataset.i === q.a) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        navigator.vibrate && navigator.vibrate(ok ? 15 : [30, 30, 30]);
        $('#kQFb').innerHTML = `<p class="kd-fb ${ok ? 'ok' : 'no'}">${ok ? '✅ صحيح!' : '❌ الإجابة الصحيحة: ' + esc(q.o[q.a])}</p>${q.e ? `<p class="muted">${qtext(q.e)}</p>` : ''}<button class="btn block" id="kNext">${i + 1 < it.quiz.length ? 'التالي' : 'النتيجة'}</button>`;
        $('#kNext').onclick = () => { i++; show(); };
      });
    };
    show();
  }

  // ---------- البحث ----------
  async function renderSearch() {
    if (!me()) return renderSetup(false);
    loader();
    let I; try { I = await index(); } catch { return failed(); }
    const norm = N.normAr || ((t) => t);
    const hay = I.items.map((it) => norm([it.t, it.x, it.sub, ...(it.tags || [])].join(' ')));
    const f = { q: store.get('kd:q', ''), c: '', age: me().age, k: '', m: '', l: 0 }; store.set('kd:q', '');
    N.view.innerHTML = `<div class="kd">
      <input class="search" id="sQ" type="search" placeholder="ابحث باسم موضوع أو شخصية أو كلمة..." value="${esc(f.q)}">
      <div class="kd-sf">
        <select id="sC"><option value="">كل الأقسام</option>${I.cats.filter((c) => c.count && catAllowed(c.id)).map((c) => `<option value="${c.id}">${c.ic} ${esc(c.n)}</option>`).join('')}</select>
        <select id="sA"><option value="0">كل الأعمار</option>${STAGES.map((s) => `<option value="${s[0]}" ${f.age >= s[0] && f.age <= s[1] ? 'selected' : ''}>${ar(s[0])}–${ar(s[1])} سنة</option>`).join('')}</select>
        <select id="sK"><option value="">كل الأنواع</option><option value="موثق">موثّق</option><option value="علمي">علمي</option><option value="خيالي">قصة خيالية</option></select>
        <select id="sM"><option value="">كل الوسائط</option>${['اختبار', 'خطوات', 'بطاقات', 'آيات', 'خط زمني', 'تجربة', 'خريطة'].map((m) => `<option>${m}</option>`).join('')}</select>
        <select id="sL"><option value="0">كل المستويات</option>${[1, 2, 3].map((l) => `<option value="${l}">${LEVEL[l]}</option>`).join('')}</select>
      </div><div id="sR"></div></div>`;
    const ageSel = () => { const v = +$('#sA').value; const s = STAGES.find((x) => x[0] === v); return s ? [s[0], s[1]] : null; };
    const draw = () => {
      const t = norm(f.q.trim()); const a = ageSel();
      const res = I.items.filter((it, i) => allowed(it) && (!t || hay[i].includes(t)) && (!f.c || it.c === f.c) && (!a || (it.age[0] <= a[1] && it.age[1] >= a[0])) && (!f.k || it.k === f.k) && (!f.m || it.m.includes(f.m)) && (!f.l || it.l === f.l));
      $('#sR').innerHTML = res.length ? `<p class="muted kd-note">${ar(res.length)} نتيجة</p><div class="kd-list">${res.map((it) => `<button class="kd-item" data-go="kidsitem/${it.c}/${it.id}"><span class="kd-item-ic">${it.ic}</span><div><b>${esc(it.t)}</b><small>${esc(it.x.slice(0, 80))}…</small><span class="kd-tags"><i>${esc(I.cats.find((c) => c.id === it.c).n)}</i><i>${ageTxt(it.age)}</i><i>${LEVEL[it.l]}</i></span></div></button>`).join('')}</div>` : `<div class="kd-card center">${OWL}<p>لم أجد نتائج. جرّب كلمة أخرى أو غيّر الفلاتر.</p></div>`;
      $$('#sR [data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
    };
    let tm;
    $('#sQ').oninput = (e) => { f.q = e.target.value; clearTimeout(tm); tm = setTimeout(draw, 200); };
    $('#sC').onchange = (e) => { f.c = e.target.value; draw(); };
    $('#sA').onchange = () => draw();
    $('#sK').onchange = (e) => { f.k = e.target.value; draw(); };
    $('#sM').onchange = (e) => { f.m = e.target.value; draw(); };
    $('#sL').onchange = (e) => { f.l = +e.target.value; draw(); };
    draw();
  }

  // ---------- الشارات ----------
  function renderBadges() {
    if (!me()) return renderSetup(false);
    const got = S.badges(); const stars = S.stars();
    N.view.innerHTML = `<div class="kd"><section class="kd-hero"><div class="kd-hero-top">${OWL}<div class="kd-bubble">جمعت <b>⭐ ${ar(stars)}</b> نجمة، والمستوى <b>${ar(levelOf(stars))}</b>. واصل التعلّم بهدوء، ولا تنسَ اللعب والحركة!</div></div></section>
      <div class="kd-badges">${BADGES.map(([id, ic, name]) => `<div class="kd-badge ${got[id] ? 'on' : ''}"><span>${ic}</span><b>${name}</b>${got[id] ? '<small>✓ حصلت عليها</small>' : '<small>لم تحصل عليها بعد</small>'}</div>`).join('')}</div></div>`;
  }

  // ================= الألعاب والتحفيز (المرحلة ٣) =================
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // نجوم اللعبة: مرة واحدة لكل لعبة ومادة، حتى لا يتحوّل التعلّم إلى تكرار لجمع النقاط
  function gameWon(gkey, n) {
    bumpWeek('games');
    const g = store.get(key('games'), {});
    if (g[gkey]) { celebrate('أحسنت! 👏'); return; }
    g[gkey] = Date.now(); store.set(key('games'), g); S.addStars(n); celebrate(`فزت! +${ar(n)} ⭐`); checkBadges();
  }
  // ---------- التحديات الأسبوعية ----------
  const weekId = () => { const d = new Date(); const t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); const day = (new Date(t).getUTCDay() + 1) % 7; return Math.floor((t / 864e5 - day + 3) / 7); }; // الأسبوع يبدأ السبت
  const WEEKLY = [['lessons', 5, 'أكمل ٥ دروس', 3, '📚'], ['quizzes', 3, 'أنهِ ٣ اختبارات', 2, '❓'], ['games', 3, 'العب ٣ ألعاب تعليمية', 2, '🎮']];
  const week = () => { const w = store.get(key('week'), null); return w && w.w === weekId() ? w : { w: weekId(), lessons: 0, quizzes: 0, games: 0, claimed: {} }; };
  function bumpWeek(k) { if (!me()) return; const w = week(); w[k] = (w[k] || 0) + 1; store.set(key('week'), w); }
  function renderWeekly() {
    if (!me()) return renderSetup(false);
    const w = week();
    N.view.innerHTML = `<div class="kd"><section class="kd-hero"><div class="kd-hero-top">${OWL}<div class="kd-bubble">تحديات هذا الأسبوع! خطوة صغيرة كل يوم تكفي، ولا تنسَ وقت اللعب والراحة 🌿</div></div></section>
      ${WEEKLY.map(([k, goal, title, stars, ic]) => { const v = Math.min(goal, w[k] || 0); const done = v >= goal; const got = w.claimed[k]; return `<div class="kd-card kd-wk"><div class="kd-wk-t"><span>${ic}</span><b>${title}</b><small>${ar(v)} / ${ar(goal)}</small></div><div class="kd-prog kd-prog-s"><span style="width:${(v / goal) * 100}%"></span></div>${got ? '<small class="kd-wk-ok">✓ حصلت على المكافأة</small>' : done ? `<button class="btn block" data-claim="${k}">🎁 افتح المكافأة (+${ar(stars)} ⭐)</button>` : ''}</div>`; }).join('')}
      <p class="muted kd-note">تتجدد التحديات كل يوم سبت.</p></div>`;
    $$('[data-claim]').forEach((b) => b.onclick = () => { const k = b.dataset.claim; const w2 = week(); if (w2.claimed[k]) return; const c = WEEKLY.find((x) => x[0] === k); w2.claimed[k] = Date.now(); store.set(key('week'), w2); S.addStars(c[3]); celebrate(`مكافأة الأسبوع! +${ar(c[3])} ⭐`); checkBadges(); renderWeekly(); });
  }
  // ---------- خريطة رحلة التعلّم ----------
  const STATIONS = [[0, 'بداية الرحلة', '🚩'], [10, 'المستكشف', '🧭'], [25, 'القارئ النشيط', '📖'], [50, 'الباحث الذكي', '🔍'], [100, 'العالِم الصغير', '🔬'], [200, 'نجم المعرفة', '🌟'], [350, 'سفير العلم', '🏆']];
  function renderJourney() {
    if (!me()) return renderSetup(false);
    const stars = S.stars(); const cur = STATIONS.filter((s) => stars >= s[0]).length - 1; const next = STATIONS[cur + 1];
    N.view.innerHTML = `<div class="kd"><section class="kd-hero"><div class="kd-hero-top">${OWL}<div class="kd-bubble">أنت في محطة <b>${STATIONS[cur][2]} ${STATIONS[cur][1]}</b>${next ? `<br><small>باقي ${ar(next[0] - stars)} ⭐ للوصول إلى «${next[1]}»</small>` : '<br><small>وصلت إلى آخر محطة، ما شاء الله!</small>'}</div></div></section>
      <div class="kd-journey">${STATIONS.map((s, i) => `<div class="kd-st ${i <= cur ? 'on' : ''} ${i === cur ? 'cur' : ''}" style="--i:${i}"><span class="kd-st-ic">${i === cur ? me().avatar : s[2]}</span><b>${s[1]}</b><small>${ar(s[0])} ⭐</small></div>`).join('')}</div>
      <h3 class="kd-h">🎁 صندوق المكافآت: شخصيات جديدة</h3>
      <div class="kd-avs">${UNLOCK.map(([x, n]) => `<button class="${stars >= n ? '' : 'locked'}" ${stars >= n ? `data-av="${x}"` : 'disabled'} title="${ar(n)} نجمة">${stars >= n ? x : '🔒'}<small>${ar(n)}⭐</small></button>`).join('')}</div>
      <p class="muted kd-note">اضغط على شخصية مفتوحة لتختارها.</p></div>`;
    $$('[data-av]').forEach((b) => b.onclick = () => { const list = P.list(); list.find((p) => p.id === P.activeId()).avatar = b.dataset.av; P.save(list); toast('تم تغيير شخصيتك ' + b.dataset.av); renderJourney(); });
  }
  // ---------- الألعاب ----------
  let ayatP = null;
  const ayat = () => (ayatP = ayatP || fetch('data/kids/ayat.json').then((r) => r.json()).catch((e) => { ayatP = null; throw e; }));
  async function allItems() { const I = await index(); return (await Promise.all(I.cats.filter((c) => c.count).map((c) => catItems(c.id)))).flat(); }
  // لعبة الترتيب: اضغط العناصر بالترتيب الصحيح
  function orderGame(box, title, list, gkey, opts = {}) {
    let picked = [];
    const order = shuffle(list.map((_, i) => i));
    const draw = () => {
      box.innerHTML = `<h3 class="kd-h3">🔢 ${esc(title)}</h3><p class="muted">اضغط على العناصر بالترتيب الصحيح.</p>
        <div class="kd-ordl">${picked.map((i, n) => `<div class="kd-ord-p${opts.quran ? ' kd-qr' : ''}"><span>${ar(n + 1)}</span>${esc(list[i])}</div>`).join('')}</div>
        <div class="kd-opts">${order.filter((i) => !picked.includes(i)).map((i) => `<button class="kd-opt${opts.quran ? ' kd-qr' : ''}" data-o="${i}">${esc(list[i])}</button>`).join('')}</div>
        <div class="kd-row2"><button class="btn ghost" id="gReset">↺ من جديد</button></div><div id="gFb"></div>`;
      $$('[data-o]', box).forEach((b) => b.onclick = () => {
        const i = +b.dataset.o;
        if (i !== picked.length) { b.classList.add('wrong'); navigator.vibrate && navigator.vibrate(30); setTimeout(() => b.classList.remove('wrong'), 400); return; } // يتعلّم بالمحاولة: الخطأ لا يُحسب
        picked.push(i); draw();
        if (picked.length === list.length) { $('#gFb', box).innerHTML = '<p class="kd-fb ok">🎉 ترتيب صحيح!</p>'; gameWon(gkey, 1); }
      });
      $('#gReset', box).onclick = () => { picked = []; draw(); };
    };
    draw();
  }
  // لعبة الذاكرة: اقلب بطاقتين متطابقتين
  function memoryGame(box, title, pairs, gkey) {
    const tiles = shuffle(pairs.flatMap((p, i) => [{ i, t: p.f }, { i, t: p.b }]));
    let open = [], done = new Set(), moves = 0, lock = false;
    box.innerHTML = `<h3 class="kd-h3">🧠 ${esc(title)}</h3><p class="muted">اقلب بطاقتين: الكلمة ومعناها.</p><div class="kd-mem">${tiles.map((t, n) => `<button class="kd-mt" data-n="${n}"><span>${esc(t.t)}</span></button>`).join('')}</div><p class="muted kd-note" id="gMv"></p>`;
    $$('.kd-mt', box).forEach((b) => b.onclick = () => {
      const n = +b.dataset.n; if (lock || done.has(n) || open.includes(n)) return;
      b.classList.add('up'); open.push(n);
      if (open.length < 2) return;
      moves++; const [a, c] = open;
      if (tiles[a].i === tiles[c].i) { done.add(a); done.add(c); $$('.kd-mt', box).filter((x) => [a, c].includes(+x.dataset.n)).forEach((x) => x.classList.add('ok')); open = []; if (done.size === tiles.length) { $('#gMv', box).textContent = `أنهيتها في ${ar(moves)} محاولات!`; gameWon(gkey, 1); } }
      else { lock = true; setTimeout(() => { $$('.kd-mt', box).filter((x) => [a, c].includes(+x.dataset.n)).forEach((x) => x.classList.remove('up')); open = []; lock = false; }, 800); }
    });
  }
  // لعبة التوصيل: اختر من العمود الأول ثم ما يناسبه من الثاني
  function matchGame(box, title, pairs, gkey) {
    const right = shuffle(pairs.map((_, i) => i)); let sel = null; const done = new Set();
    box.innerHTML = `<h3 class="kd-h3">🔗 ${esc(title)}</h3><p class="muted">اضغط على عنصر من اليمين ثم ما يناسبه من اليسار.</p>
      <div class="kd-match"><div>${pairs.map((p, i) => `<button class="kd-mb" data-l="${i}">${esc(p.f)}</button>`).join('')}</div><div>${right.map((i) => `<button class="kd-mb" data-r="${i}">${esc(pairs[i].b)}</button>`).join('')}</div></div><div id="gFb"></div>`;
    $$('[data-l]', box).forEach((b) => b.onclick = () => { if (done.has(+b.dataset.l)) return; $$('[data-l]', box).forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); sel = +b.dataset.l; });
    $$('[data-r]', box).forEach((b) => b.onclick = () => {
      if (sel == null || done.has(+b.dataset.r)) return;
      if (+b.dataset.r === sel) { done.add(sel); b.classList.add('ok'); $(`[data-l="${sel}"]`, box).classList.add('ok'); $(`[data-l="${sel}"]`, box).classList.remove('sel'); sel = null; if (done.size === pairs.length) { $('#gFb', box).innerHTML = '<p class="kd-fb ok">🎉 وصّلت الكل!</p>'; gameWon(gkey, 1); } }
      else { b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 400); }
    });
  }
  // تشغيل لعبة على مادة (من صفحة المادة أو من صفحة الألعاب)
  function playOn(box, it, kind) {
    const cards = shuffle((it.cards || []).filter((c) => c.f !== c.b)); // بطاقة وجهاها متطابقان لا تصلح للعب
    if (kind === 'mem') return memoryGame(box, it.title, cards.slice(0, 6), `mem:${it.id}`);
    if (kind === 'match') return matchGame(box, it.title, cards.slice(0, 5), `match:${it.id}`);
    if (kind === 'tl') { const t = it.timeline; const step = Math.max(1, Math.floor(t.length / 6)); const pick = t.filter((_, i) => i % step === 0).slice(0, 6); return orderGame(box, `رتّب الأحداث: ${it.title}`, pick.map((e) => e.t), `tl:${it.id}`); }
    if (kind === 'steps') return orderGame(box, `رتّب الخطوات: ${it.title}`, it.steps.map((s) => s.t.replace(/^[٠-٩0-9]+\.\s*/, '')), `steps:${it.id}`);
  }
  const gameKinds = (it) => [...(it.cards && it.cards.length >= 4 ? [['mem', '🧠 الذاكرة'], ['match', '🔗 التوصيل']] : []), ...(it.timeline && it.timeline.length >= 4 ? [['tl', '🔢 رتّب الأحداث']] : []), ...(it.steps && it.steps.length >= 4 && /^[٠-٩0-9]+\./.test(it.steps[0].t) ? [['steps', '👣 رتّب الخطوات']] : [])];
  async function renderGames(kind, arg) {
    if (!me()) return renderSetup(false);
    loader();
    if (kind === 'ayat') {
      if (!catAllowed('quran')) return lockedPage();
      let A; try { A = await ayat(); } catch { return failed(); }
      const su = A.find((x) => String(x.s) === arg);
      if (su) {
        N.setTitle(`ترتيب آيات سورة ${su.n}`);
        N.view.innerHTML = `<div class="kd"><div class="kd-card" id="gBox"></div><button class="btn ghost block" data-go="kidsgames/ayat">سورة أخرى</button></div>`;
        $('[data-go]').onclick = () => go('kidsgames/ayat');
        return orderGame($('#gBox'), `رتّب آيات سورة ${su.n}`, su.v.slice(0, 8), `ayat:${su.s}`, { quran: true });
      }
      N.setTitle('ترتيب الآيات');
      N.view.innerHTML = `<div class="kd"><div class="kd-card"><p>📖 اختر سورة ورتّب آياتها كما في المصحف. النصوص من المصحف الشريف برواية حفص.</p></div><div class="kd-list">${A.map((x) => `<button class="kd-item" data-go="kidsgames/ayat/${x.s}"><span class="kd-item-ic">📖</span><div><b>سورة ${esc(x.n)}</b><small>${ar(Math.min(8, x.v.length))} آيات</small></div>${store.get(key('games'), {})[`ayat:${x.s}`] ? '<span class="kd-done">✓</span>' : ''}</button>`).join('')}</div></div>`;
      $$('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
      return;
    }
    let all; try { all = await allItems(); } catch { return failed(); }
    if (kind && arg) {
      const it = all.find((x) => x.id === arg); if (!it) return go('kidsgames');
      if (!allowed(it)) return lockedPage();
      N.setTitle(it.title);
      N.view.innerHTML = `<div class="kd"><div class="kd-card" id="gBox"></div><button class="btn ghost block" data-go="kidsitem/${it.cat}/${it.id}">📖 اقرأ الدرس</button></div>`;
      $('[data-go]').onclick = () => go(`kidsitem/${it.cat}/${it.id}`);
      return playOn($('#gBox'), it, kind);
    }
    N.setTitle('الألعاب التعليمية');
    const age = me().age; const g = store.get(key('games'), {});
    const list = all.filter((it) => fitsAge(it, age) && allowed(it)).flatMap((it) => gameKinds(it).map(([k, l]) => ({ it, k, l })));
    N.view.innerHTML = `<div class="kd"><section class="kd-hero"><div class="kd-hero-top">${OWL}<div class="kd-bubble">العب وتعلّم! كل لعبة تفوز بها أول مرة تعطيك نجمة ⭐</div></div></section>
      ${catAllowed('quran') ? `<button class="kd-mini" data-go="kidsgames/ayat"><span class="kd-mini-ic">📖</span><span><small>من المصحف الشريف</small><b>ترتيب آيات السور القصيرة</b></span></button>` : ''}
      <h3 class="kd-h">🎮 ألعاب من دروس الموسوعة</h3>
      <div class="kd-list">${list.map(({ it, k, l }) => `<button class="kd-item" data-go="kidsgames/${k}/${it.id}"><span class="kd-item-ic">${it.icon || '🎮'}</span><div><b>${l}</b><small>${esc(it.title)}</small></div>${g[`${k}:${it.id}`] ? '<span class="kd-done">✓</span>' : ''}</button>`).join('')}</div></div>`;
    $$('[data-go]').forEach((b) => b.onclick = () => go(b.dataset.go));
  }
  const UNLOCK = [['🦄', 30], ['🐉', 60], ['🦋', 90], ['🚀', 150], ['🐳', 220], ['🦅', 300]];

  // ================= لوحة ولي الأمر (المرحلة ٤) — على هذا الجهاز =================
  const kget = (pid, k, d) => store.get(`kd:${pid}:${k}`, d);
  // ---------- وقت الاستخدام اليومي ----------
  const usage = (pid) => kget(pid, 'usage', {});
  const usedSec = (pid, day = N.todayKey()) => usage(pid)[day] || 0;
  const extraMin = (pid) => { const e = kget(pid, 'extra', null); return e && e.day === N.todayKey() ? e.min : 0; };
  const minutesLeft = (p = me()) => { const r = rulesOf(p); if (!p || !r.minutes) return Infinity; return r.minutes + extraMin(p.id) - usedSec(p.id) / 60; };
  const blocked = () => !!me() && minutesLeft() <= 0;
  const TICK = 15;
  setInterval(() => {
    const p = me(); if (!p || document.visibilityState !== 'visible' || !/^#\/kids(?!parent)/.test(location.hash)) return;
    const u = usage(p.id); const day = N.todayKey(); u[day] = (u[day] || 0) + TICK;
    for (const d of Object.keys(u).sort().slice(0, -14)) delete u[d]; // نحتفظ بآخر أسبوعين فقط
    store.set(`kd:${p.id}:usage`, u);
    const left = minutesLeft(p);
    if (left <= 5 && left > 0 && kget(p.id, 'warned', '') !== day) { store.set(`kd:${p.id}:warned`, day); toast(`⏳ باقي ${ar(Math.ceil(left))} دقائق على وقت التعلّم اليوم`); }
    if (left <= 0) renderLimit();
  }, TICK * 1000);
  function renderLimit() {
    stopTTS(); N.setTitle('موسوعة الطفل');
    N.view.innerHTML = `<div class="kd"><section class="kd-hero"><div class="kd-hero-top">${OWL}<div class="kd-bubble"><b>انتهى وقت التعلّم لليوم 🌙</b><br>أحسنت يا ${esc(me().name)}! حان وقت الراحة واللعب مع أسرتك. نلتقي غداً بإذن الله.</div></div></section>
      <button class="btn block kd-big" id="lHome">العودة إلى التطبيق</button>
      <button class="btn ghost block" id="lMore">👨‍👩‍👧 ولي الأمر: إضافة ١٥ دقيقة</button></div>`;
    $('#lHome').onclick = () => go('home');
    $('#lMore').onclick = () => parentGate(() => { const p = me(); store.set(`kd:${p.id}:extra`, { day: N.todayKey(), min: extraMin(p.id) + 15 }); toast('أُضيفت ١٥ دقيقة لليوم ✓'); goHome(); });
  }
  const G = (fn) => (...a) => (blocked() ? renderLimit() : fn(...a));

  // ---------- رمز ولي الأمر (PIN) ----------
  // يُحفظ بصمةً (SHA-256 مع ملح عشوائي) لا الرمز نفسه
  async function hashPin(pin, salt) {
    const s = salt + ':' + pin;
    if (window.crypto && crypto.subtle) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
    let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return 'f' + h.toString(16);
  }
  const PIN = { get: () => store.get('kd:parent', null), has: () => !!store.get('kd:parent', null) };
  async function setPin(pin) { const salt = Array.from(crypto.getRandomValues(new Uint8Array(12)), (x) => x.toString(16).padStart(2, '0')).join(''); store.set('kd:parent', { salt, hash: await hashPin(pin, salt) }); }
  let parentUntil = 0; // فتح مؤقت للوحة (٥ دقائق) في الذاكرة فقط
  const unlocked = () => Date.now() < parentUntil;
  const touch = () => { parentUntil = Date.now() + 5 * 60000; };
  function askPin(title, sub) {
    return new Promise((res) => {
      let v = '';
      const sh = N.sheet(`<div class="kd kd-pin"><div class="sheet-title">${esc(title)}</div>${sub ? `<p class="muted center">${esc(sub)}</p>` : ''}<div class="kd-dots" id="pD"></div><p class="kd-pin-err" id="pE"></p>
        <div class="kd-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((d) => d === '' ? '<span></span>' : `<button data-d="${d}">${d === '⌫' ? d : ar(d)}</button>`).join('')}</div></div>`);
      const draw = () => { $('#pD', sh.el).innerHTML = [0, 1, 2, 3].map((i) => `<i class="${i < v.length ? 'on' : ''}"></i>`).join(''); };
      draw();
      $$('[data-d]', sh.el).forEach((b) => b.onclick = () => {
        const d = b.dataset.d;
        if (d === '⌫') v = v.slice(0, -1); else if (v.length < 4) v += d;
        draw();
        if (v.length === 4) setTimeout(() => { sh.close(); res(v); }, 150);
      });
    });
  }
  async function verifyPin(title = 'رمز ولي الأمر') {
    const f = store.get('kd:pinfail', { n: 0, until: 0 });
    if (Date.now() < f.until) { toast(`محاولات كثيرة. انتظر ${ar(Math.ceil((f.until - Date.now()) / 1000))} ثانية`); return false; }
    const pin = await askPin(title, 'أدخل الرمز المكوّن من ٤ أرقام');
    const P0 = PIN.get();
    if ((await hashPin(pin, P0.salt)) === P0.hash) { store.set('kd:pinfail', { n: 0, until: 0 }); touch(); return true; }
    f.n++; if (f.n >= 5) { f.n = 0; f.until = Date.now() + 60000; }
    store.set('kd:pinfail', f); toast('الرمز غير صحيح'); return false;
  }
  async function newPin() {
    const a = await askPin('اختر رمزاً جديداً', '٤ أرقام لا يعرفها الطفل');
    const b = await askPin('أعد كتابة الرمز للتأكيد');
    if (a !== b) { toast('الرمزان غير متطابقين، حاول مرة أخرى'); return false; }
    await setPin(a); touch(); toast('تم حفظ رمز ولي الأمر ✓'); return true;
  }
  // تنفيذ إجراء يحتاج إذن ولي الأمر
  async function parentGate(fn) { if (!PIN.has() || unlocked() || (await verifyPin())) fn(); }
  // استعادة الرمز المنسي: سؤال حساب لا يحلّه الطفل الصغير عادة
  function forgotPin() {
    const a = 12 + Math.floor(Math.random() * 37), b = 13 + Math.floor(Math.random() * 46);
    const sh = N.sheet(`<div class="kd"><div class="sheet-title">نسيت الرمز؟</div><p>للتأكد من أنك ولي الأمر، اكتب ناتج: <b dir="ltr">${a} × ${b}</b></p><input class="search" id="fA" inputmode="numeric" autocomplete="off"><button class="btn block" id="fGo">تأكيد</button></div>`);
    $('#fGo', sh.el).onclick = async () => { const n = parseInt(String($('#fA', sh.el).value).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), 10); sh.close(); if (n === a * b) { if (await newPin()) renderParent(); } else toast('الإجابة غير صحيحة'); };
  }

  // ---------- قواعد الطفل ----------
  function rulesSheet(p, cats, done) {
    const r = rulesOf(p); let lvl = r.maxLevel;
    const sh = N.sheet(`<div class="kd"><div class="sheet-title">⚙️ إعدادات ${esc(p.name)} ${p.avatar}</div>
      <label class="kd-lbl">⏱️ وقت الاستخدام اليومي</label>
      <select class="search" id="rM">${[[0, 'بلا حد'], [15, '١٥ دقيقة'], [30, '٣٠ دقيقة'], [45, '٤٥ دقيقة'], [60, 'ساعة'], [90, 'ساعة ونصف'], [120, 'ساعتان']].map(([v, t]) => `<option value="${v}" ${r.minutes === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <label class="kd-lbl">📶 أعلى مستوى صعوبة</label>
      <div class="kd-ages kd-lvls">${[1, 2, 3].map((l) => `<button data-l="${l}" class="${l === lvl ? 'on' : ''}">${LEVEL[l]}</button>`).join('')}</div>
      <label class="kd-chk kd-sw"><input type="checkbox" id="rA" ${r.audio ? 'checked' : ''}> 🔊 السماح بالقراءة بالصوت</label>
      <label class="kd-lbl">📚 الأقسام المسموحة</label>
      <label class="kd-chk"><input type="checkbox" id="rAll" ${!r.cats ? 'checked' : ''}> كل الأقسام</label>
      <div class="kd-rcats">${cats.map((c) => `<label class="kd-chk"><input type="checkbox" data-c="${c.id}" ${!r.cats || r.cats.includes(c.id) ? 'checked' : ''}> ${c.ic} ${esc(c.n)}</label>`).join('')}</div>
      <button class="btn block kd-big" id="rSave">حفظ</button></div>`);
    $$('[data-l]', sh.el).forEach((b) => b.onclick = () => { lvl = +b.dataset.l; $$('[data-l]', sh.el).forEach((x) => x.classList.toggle('on', x === b)); });
    $('#rAll', sh.el).onchange = (e) => $$('[data-c]', sh.el).forEach((x) => { x.checked = e.target.checked; });
    $$('[data-c]', sh.el).forEach((x) => x.onchange = () => { $('#rAll', sh.el).checked = $$('[data-c]', sh.el).every((y) => y.checked); });
    $('#rSave', sh.el).onclick = () => {
      const sel = $$('[data-c]', sh.el).filter((x) => x.checked).map((x) => x.dataset.c);
      if (!sel.length) return toast('اختر قسماً واحداً على الأقل');
      const list = P.list(); const q = list.find((x) => x.id === p.id);
      q.rules = { cats: sel.length === cats.length ? null : sel, maxLevel: lvl, minutes: +$('#rM', sh.el).value, audio: $('#rA', sh.el).checked };
      P.save(list); touch(); sh.close(); toast('تم حفظ الإعدادات ✓'); done();
    };
  }
  function removeChild(p) {
    if (!confirm(`حذف ملف «${p.name}» وكل تقدّمه من هذا الجهاز؟ لا يمكن التراجع عن ذلك.`)) return false;
    const pre = `noor:kd:${p.id}:`;
    Object.keys(localStorage).filter((k) => k.startsWith(pre)).forEach((k) => localStorage.removeItem(k));
    const list = P.list().filter((x) => x.id !== p.id); P.save(list);
    if (P.activeId() === p.id) P.setActive(list[0] ? list[0].id : '');
    toast('تم حذف الملف'); return true;
  }

  // ---------- اللوحة ----------
  async function renderParent() {
    N.setTitle('لوحة ولي الأمر');
    if (!PIN.has()) {
      N.view.innerHTML = `<div class="kd"><section class="kd-hero"><div class="kd-hero-top">${OWL}<div class="kd-bubble">أهلاً بولي الأمر! أنشئ رمزاً سرياً من ٤ أرقام لحماية الإعدادات، حتى لا يغيّرها الطفل.</div></div></section>
        <button class="btn block kd-big" id="pNew">🔐 إنشاء رمز ولي الأمر</button><p class="muted kd-note">الرمز والإعدادات محفوظة على هذا الجهاز فقط.</p></div>`;
      $('#pNew').onclick = async () => { if (await newPin()) renderParent(); };
      return;
    }
    if (!unlocked()) {
      N.view.innerHTML = `<div class="kd"><section class="kd-hero"><div class="kd-hero-top">${OWL}<div class="kd-bubble">هذه الصفحة لولي الأمر فقط 🔒</div></div></section>
        <button class="btn block kd-big" id="pIn">🔑 أدخل الرمز</button><button class="btn ghost block" id="pForgot">نسيت الرمز؟</button></div>`;
      const open = async () => { if (await verifyPin()) renderParent(); };
      $('#pIn').onclick = open; $('#pForgot').onclick = forgotPin; open();
      return;
    }
    touch(); loader();
    let I; try { I = await index(); } catch { return failed(); }
    const cats = I.cats.filter((c) => c.count);
    const dates = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 864e5));
    const days = dates.map((d) => N.ymdIn(d, N.tz()).join('-')); // بنفس صيغة todayKey
    const dayName = (i) => new Intl.DateTimeFormat('ar', { weekday: 'short' }).format(dates[i]);
    const kids = P.list();
    const card = (p) => {
      const r = rulesOf(p); const pr = kget(p.id, 'prog', {}); const stars = kget(p.id, 'stars', 0);
      const fit = I.items.filter((it) => fitsAge(it, p.age));
      const done = Object.entries(pr).filter(([, v]) => v.done);
      const quizzes = Object.values(pr).filter((v) => v.quiz);
      const avg = quizzes.length ? Math.round((quizzes.reduce((s, v) => s + v.quiz.s / v.quiz.n, 0) / quizzes.length) * 100) : null;
      const byCat = {}; done.forEach(([, v]) => { byCat[v.cat] = (byCat[v.cat] || 0) + 1; });
      const recent = done.sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).slice(0, 5).map(([id, v]) => [I.items.find((x) => x.id === id), v]).filter((x) => x[0]);
      const mins = days.map((d) => Math.round(usedSec(p.id, d) / 60)); const mx = Math.max(10, ...mins);
      const today = mins[mins.length - 1];
      const games = Object.keys(kget(p.id, 'games', {})).length; const badges = Object.keys(kget(p.id, 'badges', {})).length;
      const lastSeen = Math.max(0, ...Object.values(pr).map((v) => v.seen || 0));
      return `<div class="kd-card kd-pk">
        <div class="kd-pk-h"><span class="kd-pk-av">${p.avatar}</span><div><b>${esc(p.name)}</b><small>${ar(p.age)} سنوات • المستوى ${ar(levelOf(stars))}${lastSeen ? ` • آخر نشاط ${new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short' }).format(lastSeen)}` : ''}</small></div></div>
        <div class="kd-stats kd-pk-s"><div><b>⭐ ${ar(stars)}</b><small>نجمة</small></div><div><b>📚 ${ar(done.length)}/${ar(fit.length)}</b><small>درس مكتمل</small></div><div><b>${avg == null ? '—' : ar(avg) + '٪'}</b><small>متوسط الاختبارات (${ar(quizzes.length)})</small></div><div><b>🎮 ${ar(games)}</b><small>لعبة</small></div><div><b>🏅 ${ar(badges)}</b><small>شارة</small></div></div>
        <h4 class="kd-pk-t">⏱️ وقت الاستخدام: اليوم ${ar(today)} دقيقة${r.minutes ? ` من ${ar(r.minutes + extraMin(p.id))}` : ''}</h4>
        <div class="kd-bars">${mins.map((m, i) => `<div><span style="height:${(m / mx) * 100}%"></span><small>${dayName(i)}</small><i>${m ? ar(m) : ''}</i></div>`).join('')}</div>
        ${Object.keys(byCat).length ? `<h4 class="kd-pk-t">📊 التقدّم حسب القسم</h4>${cats.filter((c) => byCat[c.id]).map((c) => { const tot = fit.filter((x) => x.c === c.id).length || 1; return `<div class="kd-pk-c"><span>${c.ic} ${esc(c.n)}</span><div class="kd-prog kd-prog-s"><span style="width:${Math.min(100, (byCat[c.id] / tot) * 100)}%"></span></div><small>${ar(byCat[c.id])}/${ar(tot)}</small></div>`; }).join('')}` : ''}
        ${recent.length ? `<h4 class="kd-pk-t">🕘 آخر الدروس المكتملة</h4><ul class="kd-pk-r">${recent.map(([it, v]) => `<li>${it.ic} ${esc(it.t)}${v.quiz ? ` <small>— الاختبار: ${ar(v.quiz.s)} من ${ar(v.quiz.n)}</small>` : ''}</li>`).join('')}</ul>` : '<p class="muted">لم يُكمل دروساً بعد.</p>'}
        <p class="kd-pk-rules">⚙️ ${r.minutes ? `حد يومي ${ar(r.minutes)} دقيقة` : 'بلا حد يومي'} • حتى مستوى «${LEVEL[r.maxLevel]}» • ${r.cats ? `${ar(r.cats.length)} من ${ar(cats.length)} أقسام` : 'كل الأقسام'} • ${r.audio ? 'الصوت مسموح' : 'الصوت متوقف'}</p>
        <div class="kd-row2"><button class="btn" data-set="${p.id}">⚙️ الإعدادات</button><button class="btn ghost" data-edit="${p.id}">✏️ الاسم والعمر</button><button class="btn ghost" data-del="${p.id}">🗑️ حذف</button></div></div>`;
    };
    N.view.innerHTML = `<div class="kd"><section class="kd-hero"><div class="kd-hero-top">${OWL}<div class="kd-bubble">لوحة ولي الأمر 👨‍👩‍👧<br><small>تابع تقدّم أطفالك وحدّد ما يناسبهم. كل البيانات على هذا الجهاز فقط.</small></div></div></section>
      ${kids.length ? kids.map(card).join('') : '<div class="kd-card center"><p>لا توجد ملفات أطفال بعد.</p></div>'}
      <button class="btn block kd-big" id="pAdd">➕ إضافة طفل</button>
      <div class="kd-links"><button class="chip" id="pPin">🔑 تغيير الرمز</button><button class="chip" id="pLock">🔒 قفل اللوحة</button></div></div>`;
    $$('[data-set]').forEach((b) => b.onclick = () => rulesSheet(kids.find((x) => x.id === b.dataset.set), cats, renderParent));
    $$('[data-edit]').forEach((b) => b.onclick = () => { P.setActive(b.dataset.edit); renderSetup(true); });
    $$('[data-del]').forEach((b) => b.onclick = () => { if (removeChild(kids.find((x) => x.id === b.dataset.del))) renderParent(); });
    $('#pAdd').onclick = () => { P.setActive(''); renderSetup(false); };
    $('#pPin').onclick = async () => { if (await verifyPin('الرمز الحالي') && (await newPin())) renderParent(); };
    $('#pLock').onclick = () => { parentUntil = 0; go('kids'); };
  }

  Object.assign(routes, {
    kids: { title: 'موسوعة الطفل', render: G(renderHome), back: 'home' },
    kidscat: { title: 'موسوعة الطفل', render: G(renderCat), back: 'kids' },
    kidsitem: { title: 'موسوعة الطفل', render: G(renderItem), back: 'kids' },
    kidssearch: { title: 'البحث في الموسوعة', render: G(renderSearch), back: 'kids' },
    kidsbadges: { title: 'شاراتي', render: G(renderBadges), back: 'kids' },
    kidsgames: { title: 'الألعاب التعليمية', render: G(renderGames), back: 'kids' },
    kidsweek: { title: 'تحديات الأسبوع', render: G(renderWeekly), back: 'kids' },
    kidsjourney: { title: 'رحلة التعلّم', render: G(renderJourney), back: 'kids' },
    kidsparent: { title: 'لوحة ولي الأمر', render: renderParent, back: 'kids' },
  });
});
