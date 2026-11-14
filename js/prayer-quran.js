/* تطوير قسمي الصلاة والقرآن:
 * الصلاة: الصلاة الحالية والمتبقي، تسجيل أداء الصلاة من القائمة، الإمساك ومنتصف الليل والثلث الأخير، جدول الشهر،
 *         ضبط يدوي لكل صلاة، تنبيه قبل الأذان، إيقاف تنبيه صلوات بعينها، تصحيح التاريخ الهجري.
 * القرآن: القراءة بصفحات المصحف (٦٠٤ صفحة) مع الانتقال السريع لصفحة أو آية. */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, esc, routes, settings } = N;
  const P5 = N.PRAYERS.filter((p) => !p.sun);
  const keyOf = (d) => N.ymdIn(d, N.tz()).join('-');
  const DAY = 864e5;
  const dur = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); const h = Math.floor(m / 60); return h ? `${ar(h)} س ${ar(m % 60)} د` : `${ar(m)} دقيقة`; };

  // ---------- صفحة المواقيت ----------
  function renderPrayers() {
    let offset = 0;
    let timer = 0;
    const draw = () => {
      clearInterval(timer);
      const now = new Date();
      const date = new Date(now.getTime() + offset * DAY);
      const t = N.timesFor(date);
      const tn = N.timesFor(new Date(date.getTime() + DAY));
      const tp = N.timesFor(new Date(date.getTime() - DAY));
      const np = offset === 0 ? N.nextPrayer(now) : null;
      const tr = store.get('tracker', {});
      const day = tr[keyOf(date)] || {};
      // الليل الشرعي: من المغرب إلى الفجر التالي
      const night = (mg, fj) => ({ mid: new Date(mg.getTime() + (fj - mg) / 2), third: new Date(mg.getTime() + (2 * (fj - mg)) / 3) });
      const nt = night(t.maghrib, tn.fajr);
      let curName = '';
      if (offset === 0) {
        if (now < t.fajr) curName = 'العشاء';
        else { const passed = N.PRAYERS.filter((p) => t[p.key] <= now); const last = passed[passed.length - 1]; curName = last ? (last.sun ? '' : last.name) : ''; }
      }
      N.view.innerHTML = `
        <div class="date-nav">
          <button class="icon-btn" id="prev" aria-label="اليوم السابق"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>
          <div class="d"><b>${offset === 0 ? 'اليوم' : N.greg(date)}</b><small>${N.hijri(date)}</small></div>
          <button class="icon-btn" id="next" aria-label="اليوم التالي"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>
        </div>
        ${np ? `<div class="card pr-now"><div><small class="muted">${curName ? `الوقت الحالي: ${curName}` : 'بين الشروق والظهر'}</small><br><b>الصلاة القادمة: ${np.name} • ${N.fmtTime(np.time)}</b></div><div class="pr-cd" id="prCd"></div></div>` : ''}
        <div class="prayer-list">
          ${N.PRAYERS.map((p) => {
            const cls = [p.sun ? 'sun' : '', np && np.key === p.key && np.time.getTime() === t[p.key].getTime() ? 'next' : '', offset === 0 && t[p.key] < now ? 'passed' : ''].join(' ');
            const adj = (settings.adj || {})[p.key];
            const off = (settings.alertOff || []).includes(p.key);
            return `<div class="prayer-row ${cls}"><span class="p-ic">${p.ic}</span><span class="p-name">${p.name}${adj ? ` <small class="muted">(${adj > 0 ? '+' : ''}${ar(adj)} د)</small>` : ''}${!p.sun && off ? ' <small class="muted">🔕</small>' : ''}</span><span class="p-time">${N.fmtTime(t[p.key])}</span>${!p.sun && offset <= 0 ? `<button class="pr-done ${day[p.key] ? 'on' : ''}" data-k="${p.key}" aria-label="صليت ${p.name}">${day[p.key] ? '✓' : ''}</button>` : ''}</div>`;
          }).join('')}
        </div>
        <div class="card"><h3>🌙 أوقات أخرى</h3>
          <div class="pr-extra"><span>الإمساك <small class="muted">(تقديري: ١٠ دقائق قبل الفجر)</small></span><b>${N.fmtTime(new Date(t.fajr.getTime() - 600000))}</b></div>
          <div class="pr-extra"><span>منتصف الليل <small class="muted">(بين المغرب والفجر)</small></span><b>${N.fmtTime(nt.mid)}</b></div>
          <div class="pr-extra"><span>بداية الثلث الأخير من الليل</span><b>${N.fmtTime(nt.third)}</b></div>
          <div class="pr-extra"><span>طول النهار <small class="muted">(من الفجر إلى المغرب)</small></span><b>${dur(t.maghrib - t.fajr)}</b></div>
          <p class="muted" style="font-size:.8rem;margin:8px 0 0">«ينزل ربنا تبارك وتعالى كل ليلة إلى السماء الدنيا حين يبقى ثلث الليل الآخر…» — متفق عليه</p>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button class="btn block" id="ptab">📅 جدول الشهر</button>
          <button class="btn ghost block" id="padj">⚙️ ضبط المواقيت والتنبيه</button>
        </div>
        <div class="card"><div class="muted" style="font-size:.85rem">📍 ${esc(settings.location.name)} • ${PrayTimes.METHODS[settings.method].name} • العصر: ${settings.asr === 2 ? 'الحنفي' : 'الجمهور'}</div>
          <button class="btn ghost block" style="margin-top:10px" id="toSettings">تغيير الموقع وطريقة الحساب</button></div>`;
      $('#prev').onclick = () => { offset--; draw(); };
      $('#next').onclick = () => { offset++; draw(); };
      $('#toSettings').onclick = () => go('settings');
      $('#ptab').onclick = () => go(`ptable/${offset}`);
      $('#padj').onclick = adjustSheet;
      $$('.pr-done').forEach((b) => { b.onclick = () => { const T = store.get('tracker', {}); const k = keyOf(date); T[k] = T[k] || {}; T[k][b.dataset.k] = !T[k][b.dataset.k]; store.set('tracker', T); if (T[k][b.dataset.k]) { navigator.vibrate && navigator.vibrate(15); toast('تقبّل الله منك 🤍'); } draw(); }; });
      if (np) {
        const tick = () => { const el = $('#prCd'); if (!el) return clearInterval(timer); const ms = np.time - new Date(); if (ms <= 0) return draw(); el.textContent = N.countdown(ms); };
        tick(); timer = setInterval(tick, 1000);
      }
    };
    function adjustSheet() {
      const adj = Object.assign({}, settings.adj || {});
      const off = new Set(settings.alertOff || []);
      let pre = +settings.pre || 0;
      let hAdj = +settings.hijriAdj || 0;
      const sh = N.sheet(`<h3 style="margin-top:0">⚙️ ضبط المواقيت والتنبيه</h3>
        <p class="muted" style="font-size:.85rem;margin-top:0">إن اختلفت المواقيت عن أذان مسجدك، اضبط كل صلاة بالدقائق.</p>
        ${N.PRAYERS.map((p) => `<div class="pr-adj"><span>${p.ic} ${p.name}</span><button class="chip" data-m="${p.key}">−</button><b id="adj-${p.key}">${ar(adj[p.key] || 0)}</b><button class="chip" data-p="${p.key}">+</button>${p.sun ? '<span style="width:42px"></span>' : `<button class="chip ${off.has(p.key) ? '' : 'active'}" data-al="${p.key}">${off.has(p.key) ? '🔕' : '🔔'}</button>`}</div>`).join('')}
        <div class="field"><label>⏳ تنبيه قبل الأذان</label><div class="seg" id="preSeg" style="flex-wrap:wrap">${[0, 5, 10, 15, 20, 30].map((v) => `<button data-v="${v}" class="${v === pre ? 'active' : ''}">${v ? `${ar(v)} د` : 'بدون'}</button>`).join('')}</div></div>
        <div class="field"><label>🌙 تصحيح التاريخ الهجري (حسب رؤية بلدك)</label><div class="seg" id="hSeg">${[-2, -1, 0, 1, 2].map((v) => `<button data-v="${v}" class="${v === hAdj ? 'active' : ''}">${v > 0 ? '+' : ''}${ar(v)}</button>`).join('')}</div></div>
        <button class="btn block" id="adjSave">حفظ</button>`);
      $$('[data-m],[data-p]', sh.el).forEach((b) => { b.onclick = () => { const k = b.dataset.m || b.dataset.p; adj[k] = Math.max(-30, Math.min(30, (adj[k] || 0) + (b.dataset.m ? -1 : 1))); $(`#adj-${k}`, sh.el).textContent = ar(adj[k]); }; });
      $$('[data-al]', sh.el).forEach((b) => { b.onclick = () => { const k = b.dataset.al; if (off.has(k)) off.delete(k); else off.add(k); b.textContent = off.has(k) ? '🔕' : '🔔'; b.classList.toggle('active', !off.has(k)); }; });
      $$('#preSeg button', sh.el).forEach((b) => { b.onclick = () => { pre = +b.dataset.v; $$('#preSeg button', sh.el).forEach((x) => x.classList.toggle('active', x === b)); }; });
      $$('#hSeg button', sh.el).forEach((b) => { b.onclick = () => { hAdj = +b.dataset.v; $$('#hSeg button', sh.el).forEach((x) => x.classList.toggle('active', x === b)); }; });
      $('#adjSave', sh.el).onclick = () => {
        Object.keys(adj).forEach((k) => { if (!adj[k]) delete adj[k]; });
        settings.adj = adj; settings.alertOff = [...off]; settings.pre = pre; settings.hijriAdj = hAdj;
        N.saveSettings(); if (N.scheduleAdhan) N.scheduleAdhan();
        sh.close(); toast('تم الحفظ'); draw();
      };
    }
    draw();
    return () => clearInterval(timer);
  }

  // ---------- جدول الشهر ----------
  function renderTable(offStr) {
    const base = new Date(Date.now() + (+offStr || 0) * DAY);
    const [y, m] = N.ymdIn(base, N.tz());
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const todayK = keyOf(new Date());
    const rows = [];
    for (let d = 1; d <= days; d++) {
      const dt = new Date(Date.UTC(y, m - 1, d, 12));
      rows.push({ dt, k: keyOf(dt), t: N.timesFor(dt) });
    }
    const monthName = base.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric', timeZone: N.tz() });
    const hm = (d) => d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: false, timeZone: N.tz() });
    N.setTitle(`مواقيت ${monthName}`);
    N.view.innerHTML = `
      <div class="date-nav"><button class="icon-btn" id="mPrev"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button><div class="d"><b>${monthName}</b><small>📍 ${esc(settings.location.name)}</small></div><button class="icon-btn" id="mNext"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button></div>
      <div class="pt-wrap"><table class="pt"><thead><tr><th>اليوم</th>${N.PRAYERS.map((p) => `<th>${p.name}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr class="${r.k === todayK ? 'today' : ''}"><td><b>${ar(r.dt.getUTCDate())}</b><small>${N.hijri(r.dt).split(' ')[0]}</small></td>${N.PRAYERS.map((p) => `<td>${hm(r.t[p.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="muted" style="font-size:.8rem">الأوقات بنظام ٢٤ ساعة، ومحسوبة بطريقة «${PrayTimes.METHODS[settings.method].name}»${Object.keys(settings.adj || {}).length ? ' مع ضبطك اليدوي' : ''}.</p>
      <button class="btn block" id="mShare">📤 مشاركة الجدول</button>`;
    const shift = (n) => { const d = new Date(Date.UTC(y, m - 1 + n, 15, 12)); go(`ptable/${Math.round((d - new Date()) / DAY)}`); };
    $('#mPrev').onclick = () => shift(-1); $('#mNext').onclick = () => shift(1);
    $('#mShare').onclick = () => N.shareText(`مواقيت الصلاة — ${monthName} — ${settings.location.name}\nاليوم | ${N.PRAYERS.map((p) => p.name).join(' | ')}\n` + rows.map((r) => `${ar(r.dt.getUTCDate())} | ${N.PRAYERS.map((p) => hm(r.t[p.key])).join(' | ')}`).join('\n') + '\n\nمن تطبيق أثر - رفيق المسلم');
  }

  // ---------- المصحف بالصفحات ----------
  function renderPage(nStr) {
    const n = Math.max(1, Math.min(604, +nStr || store.get('mpage:last', 1)));
    N.view.innerHTML = '<div class="loader"></div>';
    let alive = true;
    store.set('mpage:last', n);
    N.fetchJSON(`${N.API}/page/${n}/quran-uthmani`, `page:${n}`).then((d) => {
      if (!alive) return;
      const A = d.ayahs;
      N.setTitle(`صفحة ${ar(n)}`);
      let html = ''; let lastS = 0;
      A.forEach((a) => {
        let text = a.text;
        if (a.surah.number !== lastS) {
          if (lastS) html += '</p>';
          if (a.numberInSurah === 1) {
            html += `<div class="surah-header"><h2>${a.surah.name}</h2></div>`;
            if (a.surah.number !== 1 && a.surah.number !== 9) { html += '<div class="basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>'; text = text.split(' ').slice(4).join(' '); }
          }
          html += '<p class="quran-text">'; lastS = a.surah.number;
        }
        html += `<span class="ayah" data-s="${a.surah.number}" data-a="${a.numberInSurah}">${text}</span> <span class="ayah-num">${ar(a.numberInSurah)}</span>${a.sajda ? ' <span class="q-sajda">۩ سجدة</span>' : ''} `;
      });
      html += '</p>';
      const f = A[0];
      N.view.innerHTML = `
        <div class="mp-top"><span>${f.surah.name}</span><span>الجزء ${ar(f.juz)} • الحزب ${ar(Math.floor((f.hizbQuarter - 1) / 4) + 1)}</span></div>
        <article class="mushaf mp-page" id="mpBody">${html}</article>
        <div class="mp-foot"><button class="btn ghost" id="mpPrev" ${n <= 1 ? 'disabled' : ''}>→ السابقة</button><span><input id="mpN" type="number" min="1" max="604" value="${n}"> / ${ar(604)}</span><button class="btn ghost" id="mpNext" ${n >= 604 ? 'disabled' : ''}>التالية ←</button></div>
        <p class="muted center" style="font-size:.8rem">اضغط على أي آية لفتحها مع التفسير والاستماع • اسحب يميناً ويساراً للتقليب</p>`;
      document.documentElement.style.setProperty('--qsize', settings.qsize + 'rem');
      $('#mpPrev').onclick = () => go(`mpage/${n - 1}`);
      $('#mpNext').onclick = () => go(`mpage/${n + 1}`);
      $('#mpN').onchange = (e) => go(`mpage/${Math.max(1, Math.min(604, +e.target.value || 1))}`);
      $$('.ayah', N.view).forEach((el) => { el.onclick = () => go(`surah/${el.dataset.s}/${el.dataset.a}`); });
      const body = $('#mpBody'); let sx = 0;
      body.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
      body.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 80) go(`mpage/${n + (dx > 0 ? 1 : -1)}`); }, { passive: true });
      // تحميل الصفحة التالية مسبقاً للقراءة دون انتظار
      if (n < 604) N.fetchJSON(`${N.API}/page/${n + 1}/quran-uthmani`, `page:${n + 1}`).catch(() => {});
    }).catch(() => { if (alive) N.view.innerHTML = `<div class="card center"><p>تعذّر تحميل الصفحة، تأكد من الاتصال بالإنترنت.</p><button class="btn" onclick="location.reload()">إعادة المحاولة</button></div>`; });
    return () => { alive = false; };
  }

  // ---------- إضافة المصحف بالصفحات والانتقال السريع في صفحة القرآن ----------
  const origQuran = routes.quran.render;
  routes.quran.render = (...a) => {
    const out = origQuran(...a);
    let tries = 0;
    const inject = () => {
      if (!location.hash.startsWith('#/quran')) return;
      const anchor = $('#qmode');
      if (!anchor) { if (tries++ < 50) setTimeout(inject, 100); return; }
      if ($('#qExtra')) return;
      const box = document.createElement('div');
      box.id = 'qExtra';
      const lp = store.get('mpage:last', 0);
      box.innerHTML = `<div class="q-quick">
          <button class="btn" id="qPages">📖 المصحف بالصفحات${lp ? ` <small>(ص ${ar(lp)})</small>` : ''}</button>
          <form id="qJump" class="q-jump"><input id="qJ" placeholder="انتقل: صفحة أو سورة:آية مثل ٢:٢٥٥" inputmode="numeric"><button class="btn ghost">انتقال</button></form>
        </div>`;
      anchor.parentNode.insertBefore(box, anchor);
      $('#qPages').onclick = () => go(`mpage/${lp || 1}`);
      $('#qJump').onsubmit = (e) => {
        e.preventDefault();
        const v = $('#qJ').value.trim().replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
        const m = /^(\d{1,3})\s*[:：\/\-]\s*(\d{1,3})$/.exec(v);
        if (m && +m[1] >= 1 && +m[1] <= 114) return go(`surah/${+m[1]}/${+m[2]}`);
        if (/^\d{1,3}$/.test(v) && +v >= 1 && +v <= 604) return go(`mpage/${+v}`);
        toast('اكتب رقم صفحة (١–٦٠٤) أو سورة:آية مثل ٢:٢٥٥');
      };
    };
    inject();
    return out;
  };

  Object.assign(routes, {
    ptable: { title: 'جدول المواقيت', render: renderTable, back: 'prayers' },
    mpage: { title: 'المصحف', render: renderPage, back: 'quran' },
  });
  routes.prayers.render = renderPrayers;
});
