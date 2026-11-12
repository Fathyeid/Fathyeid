/* أكاديمية العلوم الشرعية: المسارات، خارطة الطريق، الدروس، الاختبارات، الإنجاز، الشهادات */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, esc, routes } = N;
  const PASS = 0.75;
  const prog = () => store.get('acad:progress', {});
  const saveProg = (p) => store.set('acad:progress', p);
  const key = (t, l) => `${t}:${l}`;
  const lv = (t, l) => Object.assign({ lessons: [], quiz: 0, passed: false, date: 0 }, prog()[key(t, l)]);
  const track = (id) => ACADEMY.find((x) => x.id === id);
  const levelDone = (t, l) => { const T = track(t); const s = lv(t, l); return s.passed && s.lessons.length >= T.levels[l].lessons.length; };
  const unlocked = (t, l) => l === 0 || lv(t, l - 1).passed;
  const levelPct = (t, l) => { const T = track(t); const s = lv(t, l); const tot = T.levels[l].lessons.length + 1; return (s.lessons.length + (s.passed ? 1 : 0)) / tot; };
  const trackPct = (t) => [0, 1, 2].reduce((a, l) => a + levelPct(t, l), 0) / 3;
  const pctTxt = (x) => `${ar(Math.round(x * 100))}٪`;
  const ytSearch = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  const current = () => {
    for (const T of ACADEMY) for (let l = 0; l < 3; l++) {
      const s = lv(T.id, l);
      if ((s.lessons.length || s.quiz) && !levelDone(T.id, l)) {
        const i = T.levels[l].lessons.findIndex((_, k) => !s.lessons.includes(k));
        return { T, l, lesson: i >= 0 ? T.levels[l].lessons[i] : 'اختبار المستوى' };
      }
    }
    return null;
  };

  function renderAcademy() {
    const c = current();
    const overall = ACADEMY.reduce((a, T) => a + trackPct(T.id), 0) / ACADEMY.length;
    N.view.innerHTML = `
      <section class="hero acad-hero">
        <div class="next-label">أكاديمية أثر للعلوم الشرعية</div>
        <div class="next-name" style="font-size:1.5rem">تسعة مسارات من البداية إلى التمكّن</div>
        <div class="progress on-dark"><div style="width:${overall * 100}%"></div></div>
        <div class="loc">إنجازك الكلي: ${pctTxt(overall)}</div>
      </section>
      ${c ? `<div class="card continue" style="margin-top:14px"><div style="min-width:0"><small class="muted">الدرس الحالي</small><br><b>${esc(c.lesson)}</b><br><small class="muted">${c.T.title} · ${ACADEMY_LEVELS[c.l]}</small></div><button class="btn" data-go="level/${c.T.id}/${c.l}">متابعة</button></div>` : ''}
      <div class="section-title">المسارات</div>
      <div class="acad-grid">
        ${ACADEMY.map((T) => { const p = trackPct(T.id); return `
          <button class="acad-track" data-go="track/${T.id}">
            <span class="ic">${T.icon}</span>
            <b>${T.title}</b>
            <span class="mini-progress"><span style="width:${p * 100}%"></span></span>
            <small class="muted">${p ? pctTxt(p) : 'ابدأ الآن'}</small>
          </button>`; }).join('')}
      </div>
      <div class="card acad-note"><b>📌 عن المنهج</b><p>رُتّبت المسارات والكتب استرشاداً بالمتون المقررة في المعاهد الشرعية والأزهر الشريف، مع ذكر الخلاف المعتبر بين المذاهب. التطبيق وسيلة للتنظيم والمراجعة، ولا يغني عن التلقي عن أهل العلم الموثوقين. الشهادات تحفيزية لإتمام المحتوى داخل التطبيق، وليست شهادات علمية معتمدة.</p></div>`;
    $$('[data-go]', N.view).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
  }

  function renderTrack(id) {
    const T = track(id);
    if (!T) { go('academy'); return; }
    N.setTitle(T.title);
    const mz = store.get('acad:madhhab', '');
    N.view.innerHTML = `
      <div class="card"><p style="margin:0">${T.icon} ${T.desc}</p>${T.note ? `<p class="muted" style="margin:8px 0 0;font-size:.88rem">ℹ️ ${T.note}</p>` : ''}</div>
      ${T.madhhab ? `<div class="field"><label for="mz">مذهبك الفقهي</label><select id="mz"><option value="">— اختر لعرض الكتب المناسبة —</option>${MADHAHIB.map((m) => `<option ${m === mz ? 'selected' : ''}>${m}</option>`).join('')}</select></div>` : ''}
      <div class="section-title">خارطة الطريق</div>
      <div class="roadmap">
        ${T.levels.map((L, l) => {
          const open = unlocked(id, l), done = levelDone(id, l), p = levelPct(id, l), s = lv(id, l);
          return `
          <div class="rm-step ${done ? 'done' : open ? 'open' : 'locked'}">
            <div class="rm-dot">${done ? '✓' : open ? ar(l + 1) : '🔒'}</div>
            <button class="rm-card card" ${open ? `data-go="level/${id}/${l}"` : 'disabled'}>
              <div class="rm-head"><b>المستوى ${['الأول', 'الثاني', 'الثالث'][l]}: ${ACADEMY_LEVELS[l]}</b><small>${pctTxt(p)}</small></div>
              <p class="muted">${L.goals}</p>
              <span class="mini-progress"><span style="width:${p * 100}%"></span></span>
              <small class="muted">${ar(s.lessons.length)} من ${ar(L.lessons.length)} دروس · ${s.passed ? `✅ اجتاز الاختبار (${pctTxt(s.quiz)})` : open ? 'الاختبار لم يُجتز بعد' : 'يُفتح بعد اجتياز اختبار المستوى السابق'}</small>
              ${done ? '<span class="rm-cert">🏅 الشهادة متاحة</span>' : ''}
            </button>
          </div>`; }).join('')}
      </div>`;
    $$('[data-go]', N.view).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
    if ($('#mz')) $('#mz').onchange = (e) => { store.set('acad:madhhab', e.target.value); toast('تم الحفظ'); };
  }

  function renderLevel(id, lStr) {
    const T = track(id); const l = +lStr;
    if (!T || !T.levels[l]) { go('academy'); return; }
    if (!unlocked(id, l)) { toast('اجتز اختبار المستوى السابق أولاً'); go(`track/${id}`); return; }
    N.setTitle(`${T.title} · ${ACADEMY_LEVELS[l]}`);
    const L = T.levels[l];
    const mz = store.get('acad:madhhab', '');
    const draw = () => {
      const s = lv(id, l);
      const books = T.madhhab && mz ? L.books.filter((b) => !b.m || b.m === mz) : L.books;
      N.view.innerHTML = `
        <div class="card"><b>🎯 أهداف المستوى</b><p style="margin:6px 0 0">${L.goals}</p>
          <span class="mini-progress" style="margin-top:12px"><span style="width:${levelPct(id, l) * 100}%"></span></span>
          <small class="muted">الإنجاز: ${pctTxt(levelPct(id, l))}</small></div>
        <div class="section-title">الدروس <small class="muted" style="font-weight:500">(بالترتيب)</small></div>
        <div class="card" style="padding:4px">
          ${L.lessons.map((x, i) => `
            <div class="juz-row ${s.lessons.includes(i) ? 'done' : ''}">
              <button class="check" data-ls="${i}" aria-label="تم الدرس">${s.lessons.includes(i) ? '✓' : ''}</button>
              <div class="juz-open" style="cursor:default"><b>${ar(i + 1)}. ${esc(x)}</b>
                <a class="lesson-link" href="${ytSearch(`شرح ${x} ${T.title}`)}" target="_blank" rel="noopener">🎬 ابحث عن شرح مرئي</a></div>
            </div>`).join('')}
        </div>
        <div class="section-title">📚 الكتب والمراجع</div>
        <div class="card" style="padding:4px">
          ${books.map((b) => `<div class="book-row"><span class="aud-av">📘</span><div class="aud-info"><b>${esc(b.t)}</b><small>${esc(b.a)}${b.m ? ` · المذهب ${b.m}` : ''}${b.n ? ` · ${esc(b.n)}` : ''}</small></div><a class="aud-ic" href="${ytSearch(`شرح ${b.t}`)}" target="_blank" rel="noopener" aria-label="شروح مرئية">🎬</a></div>`).join('')}
          ${T.madhhab && !mz ? '<p class="muted center" style="font-size:.85rem">اختر مذهبك من صفحة المسار لعرض كتاب مذهبك فقط</p>' : ''}
        </div>
        <p class="muted" style="font-size:.8rem">روابط 🎬 تفتح بحثاً في يوتيوب عن شروح الدرس أو الكتاب، فاختر منها ما كان لأهل علم موثوقين.</p>
        <div class="card center">
          <b>📝 اختبار المستوى</b>
          <p class="muted" style="margin:6px 0 12px">${ar(L.quiz.length)} أسئلة · النجاح من ${ar(PASS * 100)}٪ ${s.quiz ? `· أفضل نتيجة: ${pctTxt(s.quiz)}` : ''}</p>
          <button class="btn block" data-go="quiz/${id}/${l}">${s.passed ? 'إعادة الاختبار' : 'ابدأ الاختبار'}</button>
          ${levelDone(id, l) ? `<button class="btn ghost block" style="margin-top:8px" data-go="cert/${id}/${l}">🏅 عرض شهادة الإتمام</button>` : ''}
        </div>`;
      $$('[data-go]', N.view).forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
      $$('[data-ls]', N.view).forEach((b) => b.addEventListener('click', () => {
        const p = prog(); const k = key(id, l); const st = lv(id, l); const i = +b.dataset.ls;
        st.lessons = st.lessons.includes(i) ? st.lessons.filter((x) => x !== i) : [...st.lessons, i];
        p[k] = st; saveProg(p);
        if (st.lessons.length === L.lessons.length && !st.passed) toast('أحسنت! أنهيت الدروس، الآن اختبر نفسك');
        draw();
      }));
    };
    draw();
  }

  function renderQuiz(id, lStr) {
    const T = track(id); const l = +lStr;
    if (!T || !T.levels[l] || !unlocked(id, l)) { go('academy'); return; }
    N.setTitle(`اختبار ${T.title} · ${ACADEMY_LEVELS[l]}`);
    const Q = T.levels[l].quiz;
    const order = Q.map((_, i) => i).sort(() => Math.random() - 0.5);
    let i = 0, score = 0;
    const answers = [];
    const ask = () => {
      if (i >= order.length) return finish();
      const q = Q[order[i]];
      N.view.innerHTML = `
        <div class="quiz-top"><span>السؤال ${ar(i + 1)} من ${ar(order.length)}</span><span class="mini-progress" style="flex:1"><span style="width:${(i / order.length) * 100}%"></span></span></div>
        <div class="card quiz-card"><p class="quiz-q">${esc(q.q)}</p>
          <div class="quiz-opts">${q.o.map((o, k) => `<button class="quiz-opt" data-k="${k}">${esc(o)}</button>`).join('')}</div>
          <div id="qFb"></div></div>`;
      $$('.quiz-opt').forEach((b) => b.addEventListener('click', () => {
        const k = +b.dataset.k; const ok = k === q.a;
        if (ok) score++;
        answers.push({ q, k, ok });
        $$('.quiz-opt').forEach((x) => { x.disabled = true; if (+x.dataset.k === q.a) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        navigator.vibrate && navigator.vibrate(ok ? 15 : [40, 40, 40]);
        $('#qFb').innerHTML = `<p class="quiz-fb ${ok ? 'ok' : 'no'}">${ok ? '✅ إجابة صحيحة' : '❌ إجابة غير صحيحة'}</p>${q.n ? `<p class="muted quiz-note">ℹ️ ${esc(q.n)}</p>` : ''}<button class="btn block" id="qNext">${i + 1 < order.length ? 'السؤال التالي' : 'عرض النتيجة'}</button>`;
        $('#qNext').onclick = () => { i++; ask(); };
      }));
    };
    const finish = () => {
      const r = score / order.length; const pass = r >= PASS;
      const p = prog(); const k = key(id, l); const st = lv(id, l);
      st.quiz = Math.max(st.quiz, r);
      if (pass && !st.passed) { st.passed = true; st.date = Date.now(); }
      p[k] = st; saveProg(p);
      const done = levelDone(id, l);
      N.view.innerHTML = `
        <div class="card center">
          <p style="font-size:3rem;margin:0">${pass ? '🎉' : '📖'}</p>
          <h2 style="margin:6px 0">${pass ? 'مبارك! اجتزت الاختبار' : 'لم تجتز الاختبار هذه المرة'}</h2>
          <p class="big-num">${ar(score)} / ${ar(order.length)}</p>
          <p class="muted">${pass ? (l < 2 ? `تم فتح المستوى ${ACADEMY_LEVELS[l + 1]}.` : 'أتممت آخر مستويات هذا المسار.') : 'راجع الدروس ثم أعد المحاولة، فالعلم بالتكرار.'}${pass && !done ? ' أكمل تحديد كل الدروس لتحصل على الشهادة.' : ''}</p>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${done ? `<button class="btn block" data-go="cert/${id}/${l}">🏅 شهادة الإتمام</button>` : ''}
            ${pass && l < 2 ? `<button class="btn ${done ? 'ghost' : ''} block" data-go="level/${id}/${l + 1}">انتقل للمستوى التالي</button>` : ''}
            <button class="btn ghost block" data-go="quiz/${id}/${l}" id="again">إعادة الاختبار</button>
            <button class="btn ghost block" data-go="level/${id}/${l}">العودة للدروس</button>
          </div>
        </div>
        <div class="section-title">مراجعة الإجابات</div>
        ${answers.map((x) => `<div class="card"><b>${x.ok ? '✅' : '❌'} ${esc(x.q.q)}</b><p class="muted" style="margin:6px 0 0">الإجابة الصحيحة: ${esc(x.q.o[x.q.a])}</p>${x.q.n ? `<p class="muted" style="margin:4px 0 0;font-size:.85rem">ℹ️ ${esc(x.q.n)}</p>` : ''}</div>`).join('')}`;
      $$('[data-go]', N.view).forEach((b) => b.addEventListener('click', () => { if (b.id === 'again') { renderQuiz(id, lStr); window.scrollTo(0, 0); } else go(b.dataset.go); }));
    };
    ask();
  }

  function renderCert(id, lStr) {
    const T = track(id); const l = +lStr;
    if (!T || !levelDone(id, l)) { toast('أكمل الدروس واجتز الاختبار أولاً'); go(T ? `level/${id}/${l}` : 'academy'); return; }
    N.setTitle('شهادة إتمام');
    const st = lv(id, l);
    let name = store.get('acad:name', '');
    N.view.innerHTML = `
      <div class="field"><label for="cn">الاسم كما سيظهر في الشهادة</label><input class="search" id="cn" value="${esc(name)}" placeholder="اكتب اسمك" maxlength="40"></div>
      <div class="cert-wrap"><canvas id="cv" width="1400" height="990"></canvas></div>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="btn block" id="cShare">📤 مشاركة / حفظ</button></div>
      <p class="muted center" style="font-size:.82rem">شهادة تحفيزية لإتمام المحتوى داخل تطبيق أثر، وليست شهادة علمية معتمدة.</p>`;
    const cv = $('#cv'); const ctx = cv.getContext('2d');
    const draw = () => {
      const W = cv.width, H = cv.height;
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#fffdf6'); g.addColorStop(1, '#f3ead3');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#0d3b2e'; ctx.lineWidth = 18; ctx.strokeRect(30, 30, W - 60, H - 60);
      ctx.strokeStyle = '#b8913a'; ctx.lineWidth = 4; ctx.strokeRect(62, 62, W - 124, H - 124);
      ctx.direction = 'rtl'; ctx.textAlign = 'center';
      const t = (txt, y, font, color) => { ctx.font = font; ctx.fillStyle = color; ctx.fillText(txt, W / 2, y); };
      t('بسم الله الرحمن الرحيم', 150, '42px Amiri, serif', '#0d3b2e');
      t('شهادة إتمام', 270, 'bold 96px Amiri, serif', '#b8913a');
      t('تشهد أكاديمية أثر للعلوم الشرعية بأن', 370, '40px Tajawal, sans-serif', '#33443c');
      t(name || '................................', 480, 'bold 76px Amiri, serif', '#0d3b2e');
      t(`قد أتمّ المستوى ${['الأول', 'الثاني', 'الثالث'][l]} (${ACADEMY_LEVELS[l]}) في مسار «${T.title}»`, 580, '42px Tajawal, sans-serif', '#33443c');
      t(`بنسبة ${pctTxt(st.quiz)} في اختبار المستوى`, 645, '36px Tajawal, sans-serif', '#33443c');
      const d = new Date(st.date || Date.now());
      t(`${N.hijri(d)} — ${d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}`, 730, '34px Tajawal, sans-serif', '#6b766f');
      t('«مَن سلك طريقاً يلتمس فيه علماً سهّل الله له به طريقاً إلى الجنة» — رواه مسلم', 820, '32px Amiri, serif', '#0d3b2e');
      t('شهادة تحفيزية لإتمام المحتوى داخل التطبيق، وليست شهادة علمية معتمدة', 900, '26px Tajawal, sans-serif', '#8a8f86');
    };
    const ready = document.fonts ? Promise.all([document.fonts.load('bold 76px Amiri'), document.fonts.load('40px Tajawal')]).catch(() => {}) : Promise.resolve();
    ready.then(draw);
    $('#cn').addEventListener('input', (e) => { name = e.target.value.trim(); store.set('acad:name', name); draw(); });
    $('#cShare').onclick = () => {
      cv.toBlob(async (blob) => {
        const file = new File([blob], `شهادة-${T.id}-${l + 1}.png`, { type: 'image/png' });
        try {
          if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'شهادة إتمام' }); return; }
        } catch (e) { if (e && e.name === 'AbortError') return; }
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
        toast('تم حفظ الشهادة');
      }, 'image/png');
    };
  }

  Object.assign(routes, {
    academy: { title: 'أكاديمية العلوم الشرعية', render: renderAcademy, back: 'home' },
    track: { title: 'المسار', render: renderTrack, back: 'academy' },
    level: { title: 'المستوى', render: renderLevel, back: 'academy' },
    quiz: { title: 'الاختبار', render: renderQuiz, back: 'academy' },
    cert: { title: 'شهادة إتمام', render: renderCert, back: 'academy' },
  });

  // بطاقة الدرس الحالي في الرئيسية
  N.homeExtras.push((root) => {
    const c = current();
    if (!c) return;
    const d = document.createElement('div');
    d.innerHTML = `<div class="card continue"><div style="min-width:0"><small class="muted">🎓 درسك الحالي</small><br><b>${esc(c.lesson)}</b><br><small class="muted">${c.T.title} · ${ACADEMY_LEVELS[c.l]}</small></div><button class="btn">متابعة</button></div>`;
    $('button', d).onclick = () => go(`level/${c.T.id}/${c.l}`);
    root.appendChild(d);
  });
});
