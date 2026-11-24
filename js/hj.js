/* منصة الحج والعمرة (المرحلة ١، مجانية وتعمل دون إنترنت): دليل المناسك التفاعلي بقوائم تحقق وتقدّم محفوظ،
 * الفروق بين الأنساك، محظورات الإحرام، مساعد أسئلة من المحتوى الموثّق فقط، قائمة الأغراض، مدير المستندات،
 * ميزانية الرحلة، مدير المجموعة والعائلة، ومواقع مهمة. بلا حجز ولا دفع ولا حسابات. */
(window.NoorModules = window.NoorModules || []).push((N) => {
  'use strict';
  const { $, $$, store, toast, go, ar, esc, routes } = N;
  const NOTE = '<div class="card calc-disc"><b>⚖️ تنبيه</b><p>هذا دليل عام مبسّط على ما اتفق عليه جمهور العلماء، مع بيان مواضع الخلاف. ليس فتوى، وأحوالك الخاصة (مرض، حيض، نسيان، مخالفة) اسأل فيها عالماً مؤهلاً أو لجنة الفتوى في الحملة أو في الحرمين. تنظيمات الدخول والمسارات والمواعيد تتغير، فاعتمد التعليمات الرسمية الحالية.</p></div>';
  const bind = () => { $$('[data-go]', N.view).forEach((b) => { b.onclick = () => go(b.dataset.go); }); };
  const hero = (t, s) => `<div class="ch-hero gold"><div class="ch-hero-t">${t}</div><div class="ch-hero-s">${s}</div></div>`;
  const TALB = 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ';
  const D201 = 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ';

  const TYPES = {
    umra: { n: 'العمرة', ic: '🕋', d: 'إحرام وطواف وسعي وحلق أو تقصير' },
    tamattu: { n: 'حج التمتع', ic: '🕌', d: 'عمرة ثم التحلل ثم حج بإحرام جديد، وعليه هدي' },
    qiran: { n: 'حج القران', ic: '🔗', d: 'إحرام بالعمرة والحج معاً، ويبقى محرماً إلى يوم النحر، وعليه هدي' },
    ifrad: { n: 'حج الإفراد', ic: '1️⃣', d: 'إحرام بالحج وحده، ولا هدي واجب عليه' },
  };
  const UMRA = [
    ['الاستعداد للإحرام', ['الاغتسال وتنظيف الجسد وقص الشارب والأظافر قبل الإحرام (قبل عقد النية لا بعدها)', 'التطيّب في البدن لا في ثوب الإحرام، وهو سنة قبل عقد النية', 'الرجل: يلبس إزاراً ورداءً أبيضين نظيفين ويتجرّد من المخيط', 'المرأة: تحرم في ثيابها العادية الساترة، ولا تلبس النقاب ولا القفازين، ووجهها وكفاها مكشوفان بلا زينة']],
    ['الميقات', ['الإحرام يكون من الميقات أو قبله، ولا يجوز تجاوزه لمن يريد النسك بغير إحرام', 'المواقيت: ذو الحليفة (أبيار علي) لأهل المدينة، الجحفة (ورابغ) لأهل الشام ومصر والمغرب، قرن المنازل (السيل الكبير) لأهل نجد، يلملم لأهل اليمن، ذات عرق لأهل العراق', 'في الطائرة: يحرم عند محاذاة الميقات، وتعلن شركة الطيران ذلك، ويستحب أن يتهيأ ويلبس الإحرام قبل الركوب', 'من كان مقيماً داخل المواقيت يحرم من مكانه']],
    ['الإحرام والتلبية', ['صلاة فريضة أو ركعتين (لا صلاة خاصة بالإحرام) إن حضر وقتها', 'نية العمرة: «لبيك عمرة»', 'التلبية للرجل جهراً وللمرأة سراً: ' + TALB, 'يستمر في التلبية حتى يبدأ بالطواف (عند الجمهور)']],
    ['الطواف', ['الطهارة وستر العورة شرط عند الجمهور', 'يبدأ من الحجر الأسود ويجعل الكعبة عن يساره، سبعة أشواط تنتهي عنده', 'الاضطباع (كشف الكتف الأيمن) للرجل في طواف القدوم وحده، والرمل (إسراع الخطى) في الأشواط الثلاثة الأولى للرجل إن تيسّر', 'بين الركن اليماني والحجر الأسود: ' + D201 + ' (البقرة ٢٠١)، والدعاء في سائر الطواف بما تيسر', 'بعد الطواف: ركعتان خلف مقام إبراهيم إن تيسّر أو في أي موضع من المسجد، يقرأ فيهما بعد الفاتحة بالكافرون والإخلاص استحباباً', 'شرب ماء زمزم']],
    ['السعي', ['يبدأ بالصفا وينتهي بالمروة، سبعة أشواط (الذهاب شوط والعودة شوط)', 'عند الصفا يقرأ: «إِنَّ الصَّفَا وَالْمَرْوَةَ مِن شَعَائِرِ اللَّهِ» (البقرة ١٥٨)', 'الهرولة للرجل بين العلمين الأخضرين، والمرأة تمشي', 'الطهارة في السعي مستحبة ولا تشترط عند جمهور العلماء']],
    ['التحلل', ['الحلق أو التقصير، والحلق أفضل للرجل', 'المرأة تقصّر مقدار أنملة من أطراف شعرها', 'بذلك تنتهي العمرة ويحل له كل ما حرم بالإحرام']],
  ];
  const HAJJ = (ty) => {
    const pre = ty === 'tamattu' ? [['العمرة أولاً (أشهر الحج)', ['يحرم بالعمرة من الميقات ويؤديها كاملة: طواف وسعي وتقصير', 'يتحلل ويحل له كل شيء حتى يوم التروية', 'التفاصيل في مسار العمرة']]] : ty === 'qiran' ? [['الإحرام بالعمرة والحج معاً', ['ينوي من الميقات: «لبيك عمرة وحجاً»', 'يطوف ويسعى للقدوم ويبقى على إحرامه ولا يتحلل', 'لو ساق الهدي لزمه البقاء محرماً، وإلا فالتمتع أولى عند بعض العلماء، فاسأل أهل العلم عن حالك']]] : [['الإحرام بالحج (الإفراد)', ['ينوي من الميقات: «لبيك حجاً»', 'يطوف للقدوم ويسعى بعده إن شاء ليكفيه عن سعي الحج، ولا يتحلل']]];
    return pre.concat([
      ['يوم التروية (٨ ذو الحجة)', [ty === 'tamattu' ? 'يحرم بالحج من مكان إقامته في مكة: «لبيك حجاً»، بعد الغسل والتطيّب في البدن' : 'يبقى على إحرامه', 'يتجه إلى منى قبل الظهر، ويصلي بها الظهر والعصر والمغرب والعشاء والفجر قصراً بلا جمع', 'يكثر من التلبية والذكر']],
      ['يوم عرفة (٩ ذو الحجة)', ['الوقوف بعرفة ركن الحج الأعظم، ويبدأ وقته من فجر يوم عرفة عند الحنابلة ومن زوال الشمس عند الجمهور، وينتهي بغروب الشمس مع الاستمرار إلى الغروب لمن وقف نهاراً', 'يجمع الظهر والعصر جمع تقديم مع القصر في وقت الظهر', 'التأكد من أنه داخل حدود عرفة، فوادي عرنة ليس منها، ونمرة ليست من عرفة', 'يتفرغ للدعاء والذكر والتلبية، ومن أفضل الدعاء ما ورد: «لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير»']],
      ['المبيت بمزدلفة (ليلة ١٠)', ['ينصرف بعد الغروب بسكينة إلى مزدلفة', 'يصلي المغرب والعشاء جمعاً وقصراً (العشاء ركعتان) عند وصوله ولو تأخر عن وقت العشاء', 'يبيت بها ويصلي الفجر ويذكر الله عند المشعر الحرام', 'الضعفة والنساء يرخص لهم الدفع بعد منتصف الليل عند الجمهور', 'يلتقط حصى الجمرات (سبعين على الأكثر)، ويجوز أخذه من أي مكان']],
      ['يوم النحر (١٠ ذو الحجة)', ['١) رمي جمرة العقبة بسبع حصيات متعاقبات يكبّر مع كل حصاة، وتقطع التلبية مع أول حصاة', '٢) الهدي لمن وجب عليه (تمتع أو قران)، فمن لم يجد صام ثلاثة أيام في الحج وسبعة إذا رجع (البقرة ١٩٦)', '٣) الحلق أو التقصير، والحلق أفضل للرجل', '٤) طواف الإفاضة (ركن) ثم السعي للمتمتع، وللقارن والمفرد إن لم يكونا سعيا بعد طواف القدوم', 'ترتيب هذه الأعمال سنة عند الجمهور، ومن قدّم أو أخّر منها ناسياً أو جاهلاً فلا حرج، فاسأل إن اختلط عليك الأمر', 'بعد الرمي والحلق يحصل التحلل الأول، ويحل كل شيء إلا النساء حتى طواف الإفاضة، ثم التحلل الثاني بالطواف']],
      ['أيام التشريق (١١ و١٢ و١٣)', ['المبيت بمنى ليالي أيام التشريق', 'رمي الجمرات الثلاث كل يوم بعد الزوال بسبع حصيات لكل جمرة، بالترتيب: الصغرى ثم الوسطى ثم الكبرى (العقبة)، ويدعو بعد الأولى والثانية', 'من تعجّل في يومين خرج من منى قبل غروب شمس اليوم الثاني عشر، ومن تأخر فهو أفضل (البقرة ٢٠٣)']],
      ['طواف الوداع', ['إذا أراد مغادرة مكة طاف سبعاً، ويكون آخر عهده بالبيت', 'يسقط عن الحائض والنفساء', 'إن اشتغل بعده بشراء حاجة في طريقه فلا بأس، وإن أقام بعده طويلاً أعاده']],
    ]);
  };
  const stages = (t) => (t === 'umra' ? UMRA : HAJJ(t));

  const PROHIB = [
    ['عامة للرجل والمرأة', ['إزالة الشعر من أي موضع من الجسد', 'قص الأظافر', 'استعمال الطيب في البدن والثوب بعد الإحرام (والصابون المعطّر)', 'عقد النكاح والخطبة', 'الجماع ومقدماته (الجماع قبل التحلل الأول يفسد الحج ويوجب أحكاماً خاصة)', 'قتل الصيد البري وإعانة عليه، وقطع شجر الحرم ونباته الأخضر']],
    ['خاصة بالرجل', ['تغطية الرأس بملاصق (كالطاقية والغترة)، ولا بأس بالمظلة والخيمة', 'لبس المخيط على هيئة البدن (قميص، سروال، جوارب)، ولا بأس بحذاء لا يغطي الكعبين، وبساعة وحزام ونظارة وخاتم']],
    ['خاصة بالمرأة', ['النقاب والقفازان، وتغطي وجهها عند مرور الرجال الأجانب بما لا يلامس الوجه']],
    ['إذا وقعت مخالفة', ['الفدية أنواع (صيام ثلاثة أيام، أو إطعام ستة مساكين، أو ذبح شاة) بحسب المخالفة، والعذر والنسيان والجهل لهما أحكام', 'لا تحكم على نفسك، اسأل عالماً أو لجنة الفتوى في الحملة، وهذا الدليل لا يحدد لك الفدية']],
  ];
  const DIFF = [
    ['التمتع', 'عمرة في أشهر الحج ثم التحلل، ثم حج في العام نفسه بإحرام جديد من مكة. عليه هدي. هو الأفضل عند الحنابلة، وهو الأيسر لمن لم يسق الهدي.'],
    ['القران', 'إحرام بالعمرة والحج معاً بنية واحدة، يؤدي أعمال الحج وتدخل العمرة فيها، ويبقى محرماً إلى يوم النحر. عليه هدي. هو الأفضل عند الحنفية.'],
    ['الإفراد', 'إحرام بالحج وحده. لا هدي واجب عليه. هو الأفضل عند المالكية والشافعية. يجوز له أن يعتمر بعد الحج.'],
    ['ملاحظة', 'كلها جائزة بالإجماع وصحيحة، والخلاف في الأفضلية. اختر بحسب ما تأمر به حملتك وظروفك واسأل أهل العلم عند التردد.'],
  ];
  const MISSED = [
    ['ركن تُرك', 'الإحرام والوقوف بعرفة وطواف الإفاضة (ويضاف السعي عند الجمهور) لا يصح الحج بدونها، فيجب الإتيان بها إن أمكن، وإلا فاسأل فوراً عن حالك.'],
    ['واجب تُرك', 'كالمبيت بمزدلفة أو منى أو رمي الجمرات أو طواف الوداع أو الإحرام من الميقات: عند الجمهور يجبر بدم (ذبح شاة توزع على فقراء الحرم)، وللعذر أحكام، فاسأل عالماً.'],
    ['سنة تُركت', 'لا شيء عليه، وحجه صحيح.'],
    ['النسيان والجهل', 'من نسي أو جهل في بعض ما سبق من ترتيب الأعمال يوم النحر فلا حرج عليه، وقد قال النبي ﷺ لمن سأله في ذلك: «افعل ولا حرج» (رواه البخاري ومسلم).'],
  ];
  const DUAS = [
    ['التلبية', TALB, 'متفق عليه'],
    ['بين الركن اليماني والحجر الأسود', D201, 'البقرة ٢٠١'],
    ['عند الصفا والمروة', 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِن شَعَائِرِ اللَّهِ', 'البقرة ١٥٨ (يُقرأ عند الاقتراب من الصفا في أول السعي)'],
    ['يوم عرفة', 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', 'رواه الترمذي: «خير الدعاء دعاء يوم عرفة...» وحسّنه الألباني'],
    ['التكبير مع رمي الجمرات', 'اللَّهُ أَكْبَرُ', 'مع كل حصاة'],
  ];
  const PACK = ['جواز السفر (صلاحيته حسب شروط الجهة الرسمية)', 'تأشيرة العمرة/الحج وتصريحها', 'صور شخصية وصور من المستندات', 'ثوبا إحرام إضافيان للرجال', 'حقيبة صغيرة للمشاعر', 'حذاء مريح وشبشب', 'مظلة للشمس', 'أدوية الاستعمال الشخصي مع وصفاتها', 'شواحن وبنك طاقة', 'مصحف أو تطبيق وسجادة خفيفة', 'ملابس قطنية خفيفة', 'مستلزمات عناية غير معطّرة (للإحرام)', 'مبلغ نقدي وبطاقة', 'نسخة ورقية من حجز الإقامة والحملة وأرقام الطوارئ'];
  const DOCT = ['جواز السفر', 'التأشيرة/التصريح', 'تذكرة الطيران', 'حجز الفندق', 'عقد/تأكيد الحملة', 'تأمين السفر', 'شهادة التطعيمات المطلوبة', 'بطاقة الحملة والسوار إن وُجد'];
  const ASKS = [
    ['كيف أؤدي العمرة', 'umra'], ['ترتيب مناسك الحج', 'tamattu'], ['الميقات', 'umra'], ['الفرق بين التمتع والقران والإفراد', 'diff'], ['محظورات الإحرام', 'proh'], ['نسيت أحد المناسك', 'miss'], ['الأدعية', 'dua'],
  ];

  const ld = () => store.get('hj:v1', { type: '', date: '', chk: {}, stage: {}, pack: {}, docs: {}, bud: [], grp: [], places: [], packx: [] });
  const sv = (S) => store.set('hj:v1', S);
  const days = (d) => { if (!d) return null; const t = new Date(d + 'T00:00:00'); return Math.ceil((t - new Date().setHours(0, 0, 0, 0)) / 86400000); };

  const CHIPS = [['hjdiff', '⚖️ الفروق بين الأنساك'], ['hjproh', '🚫 محظورات الإحرام'], ['hjmiss', '❓ نسيت منسكاً'], ['hjdua', '🤲 أدعية وأذكار'], ['hjpack', '🧳 قائمة الأغراض'], ['hjdocs', '📄 مستنداتي'], ['hjbud', '💰 ميزانية الرحلة'], ['hjgrp', '👨‍👩‍👧 المجموعة والعائلة'], ['hjmap', '🗺 مواقع مهمة'], ['hjask', '💬 اسأل الدليل'], ['hjbak', '🔐 نسخ احتياطي']];

  function renderHome() {
    N.setTitle('الحج والعمرة'); const S = ld(); const dd = days(S.date);
    const prog = (t) => { const st = stages(t); let n = 0, d = 0; st.forEach((s, i) => s[1].forEach((_, j) => { n++; if (S.chk[`${t}:${i}:${j}`]) d++; })); return n ? Math.round(d * 100 / n) : 0; };
    N.view.innerHTML = hero('الحج والعمرة', 'دليل مناسك تفاعلي يعمل دون إنترنت') + `
      <div class="card"><b>موعد رحلتي</b><div style="display:flex;gap:8px;margin-top:8px"><input type="date" id="hjD" class="search" value="${esc(S.date)}"><button class="btn" id="hjDs">حفظ</button></div>${dd == null ? '' : `<p class="muted" style="margin:8px 0 0">${dd > 0 ? `باقٍ ${ar(dd)} يوم` : dd === 0 ? 'اليوم موعد رحلتك' : `مرّ ${ar(-dd)} يوم`}</p>`}</div>
      <div class="section-title">اختر نسكك</div>
      ${Object.keys(TYPES).map((k) => `<button class="card" style="width:100%;text-align:right" data-go="hjg/${k}"><b>${TYPES[k].ic} ${TYPES[k].n}</b> <span class="muted" style="float:left">${ar(prog(k))}٪</span><p class="muted" style="margin:6px 0 0;font-size:.85rem">${TYPES[k].d}</p></button>`).join('')}
      <div class="chips" style="justify-content:flex-start;margin:10px 0">${CHIPS.map((c) => `<button class="chip" data-go="${c[0]}">${c[1]}</button>`).join('')}</div>
      <div class="card"><b>ما هو متاح وما ليس متاحاً</b><p class="muted" style="margin:6px 0;font-size:.85rem">متاح مجاناً دون حساب: دليل المناسك وقوائم التحقق، الفروق والمحظورات، الأغراض والمستندات والميزانية والمجموعة، ومواقع مهمة. لا يوجد في هذه النسخة حجز برامج أو فنادق أو طيران أو دفع أو شركات ومرشدون ومتجر ولوحات إدارة، لأنها تحتاج مزودي خدمات وحسابات وبوابة دفع ولا يمكن بناؤها بلا تكلفة أو اتفاقيات. للحجز استخدم القنوات الرسمية المرخّصة.</p></div>` + NOTE;
    $('#hjDs').onclick = () => { const S2 = ld(); S2.date = $('#hjD').value; sv(S2); toast('حُفظ'); renderHome(); };
    bind();
  }
  function renderGuide(t) {
    if (!TYPES[t]) { go('hj'); return; }
    N.setTitle(TYPES[t].n); routes.hjg.back = 'hj'; const S = ld(); const st = stages(t);
    N.view.innerHTML = hero(TYPES[t].ic + ' ' + TYPES[t].n, TYPES[t].d) + st.map((s, i) => `<div class="card ${S.stage[t] === i ? 'qa-cur' : ''}"><b>${ar(i + 1)}. ${esc(s[0])}</b> <button class="chip" data-st="${i}" style="float:left">${S.stage[t] === i ? '📍 أنا هنا' : 'أنا هنا'}</button>
      <div style="margin-top:8px">${s[1].map((x, j) => `<label style="display:flex;gap:8px;align-items:flex-start;margin:6px 0"><input type="checkbox" data-c="${t}:${i}:${j}" ${S.chk[`${t}:${i}:${j}`] ? 'checked' : ''}><span>${esc(x)}</span></label>`).join('')}</div></div>`).join('') + '<div class="chips" style="justify-content:flex-start"><button class="chip" data-go="hjdiff">⚖️ الفروق</button><button class="chip" data-go="hjproh">🚫 المحظورات</button><button class="chip" data-go="hjdua">🤲 الأدعية</button></div>' + NOTE;
    $$('[data-c]').forEach((c) => { c.onchange = () => { const S2 = ld(); if (c.checked) S2.chk[c.dataset.c] = 1; else delete S2.chk[c.dataset.c]; sv(S2); }; });
    $$('[data-st]').forEach((b) => { b.onclick = () => { const S2 = ld(); S2.stage[t] = +b.dataset.st; sv(S2); renderGuide(t); }; });
    bind();
  }
  const listPage = (title, back, data, extra) => { N.setTitle(title); N.view.innerHTML = hero(title, '') + data.map((s) => `<div class="card"><b>${esc(s[0])}</b>${Array.isArray(s[1]) ? '<ul style="margin:8px 0 0;padding-inline-start:18px">' + s[1].map((x) => `<li style="margin:5px 0">${esc(x)}</li>`).join('') + '</ul>' : `<p style="margin:6px 0 0">${esc(s[1])}</p>`}</div>`).join('') + (extra || '') + NOTE; bind(); };
  const rDiff = () => { routes.hjdiff.back = 'hj'; listPage('الفروق بين الأنساك', 'hj', DIFF); };
  const rProh = () => { routes.hjproh.back = 'hj'; listPage('محظورات الإحرام', 'hj', PROHIB); };
  const rMiss = () => { routes.hjmiss.back = 'hj'; listPage('نسيت منسكاً', 'hj', MISSED); };
  function rDua() {
    routes.hjdua.back = 'hj'; N.setTitle('أدعية وأذكار');
    N.view.innerHTML = hero('أدعية وأذكار', 'من القرآن والسنة الصحيحة فقط') + DUAS.map((d) => `<div class="card"><b>${esc(d[0])}</b><p style="font-size:1.15rem;line-height:2;margin:8px 0">${esc(d[1])}</p><small class="muted">${esc(d[2])}</small></div>`).join('') + '<div class="card"><p class="muted" style="margin:0">ليس للحج والعمرة دعاء محدد ملزم في الطواف والسعي وعرفة، فادعُ بما شئت بلغتك. وما يُتداول من أدعية مخصوصة لكل شوط لا يثبت عن النبي ﷺ، ولذلك لم نضعه.</p></div>' + NOTE; bind();
  }
  function checklist(key, title, items, back) {
    N.setTitle(title); routes[key].back = back; const S = ld(); const base = key === 'hjpack' ? PACK : DOCT;
    N.view.innerHTML = hero(title, 'علّم ما أنجزته، تحفظ على جهازك') + `<div class="card">${base.map((x, i) => `<label style="display:flex;gap:8px;margin:7px 0"><input type="checkbox" data-k="${i}" ${S[key === 'hjpack' ? 'pack' : 'docs'][i] ? 'checked' : ''}><span>${esc(x)}</span></label>`).join('')}</div>`;
    $$('[data-k]').forEach((c) => { c.onchange = () => { const S2 = ld(); const o = S2[key === 'hjpack' ? 'pack' : 'docs']; if (c.checked) o[c.dataset.k] = 1; else delete o[c.dataset.k]; sv(S2); }; });
  }
  const rPack = () => { checklist('hjpack', 'قائمة الأغراض', PACK, 'hj'); N.view.insertAdjacentHTML('beforeend', NOTE); };
  function rDocs() {
    checklist('hjdocs', 'مستنداتي', DOCT, 'hj');
    N.view.insertAdjacentHTML('beforeend', '<div class="card"><p class="muted" style="margin:0">قائمة تحقق فقط. لا تُرفع صور مستنداتك ولا تغادر جهازك. تأكد من شروط الجواز والتأشيرة والتطعيمات من الجهات الرسمية، فهي تتغير.</p></div>' + NOTE);
  }
  function rBud() {
    routes.hjbud.back = 'hj'; N.setTitle('ميزانية الرحلة'); const S = ld(); const tot = S.bud.reduce((a, b) => a + (+b.a || 0), 0);
    N.view.innerHTML = hero('ميزانية الرحلة', 'تقدير شخصي، لا أسعار ولا حجز') + `<div class="card"><div style="display:flex;gap:6px;flex-wrap:wrap"><input id="bN" class="search" placeholder="البند (طيران، فندق...)" style="flex:2"><input id="bA" class="search" type="number" placeholder="المبلغ" style="flex:1"><button class="btn" id="bAdd">أضف</button></div></div>
      <div class="card">${S.bud.length ? S.bud.map((b, i) => `<div style="display:flex;justify-content:space-between;margin:6px 0"><span>${esc(b.n)}</span><span>${ar(b.a)} <button class="chip" data-d="${i}">✕</button></span></div>`).join('') + `<hr><b>الإجمالي: ${ar(tot)}</b>` : '<p class="muted" style="margin:0">لا بنود بعد. اكتب العملة التي تحسب بها كما تشاء.</p>'}</div>` + NOTE;
    $('#bAdd').onclick = () => { const n = $('#bN').value.trim(); const a = +$('#bA').value; if (!n || !(a >= 0)) { toast('اكتب البند والمبلغ'); return; } const S2 = ld(); S2.bud.push({ n, a }); sv(S2); rBud(); };
    $$('[data-d]').forEach((b) => { b.onclick = () => { const S2 = ld(); S2.bud.splice(+b.dataset.d, 1); sv(S2); rBud(); }; });
  }
  function rGrp() {
    routes.hjgrp.back = 'hj'; N.setTitle('المجموعة والعائلة'); const S = ld();
    N.view.innerHTML = hero('المجموعة والعائلة', 'سجل محلي لمن معك، وللطوارئ') + `<div class="card"><input id="gN" class="search" placeholder="الاسم"><input id="gP" class="search" placeholder="رقم الهاتف" style="margin-top:6px"><input id="gT" class="search" placeholder="ملاحظة (غرفة، حالة صحية، موقع التجمع...)" style="margin-top:6px"><button class="btn block" id="gAdd" style="margin-top:8px">أضف</button></div>
      ${S.grp.map((g, i) => `<div class="card"><b>${esc(g.n)}</b> <button class="chip" data-d="${i}" style="float:left">✕</button><p style="margin:6px 0 0">${g.p ? `<a href="tel:${esc(g.p)}">${esc(g.p)}</a>` : ''} ${esc(g.t || '')}</p></div>`).join('')}
      ${S.grp.length ? '<button class="chip" id="gSh">↗️ مشاركة القائمة</button>' : ''}<div class="card"><p class="muted" style="margin:0">تُحفظ على جهازك فقط. لا تتبّع مباشر لمواقع أفراد المجموعة في هذه النسخة، لأنه يحتاج خادماً وحسابات. حدّدوا مكان تجمع واضحاً وسجّلوا اسم الفندق ورقم الحملة.</p></div>` + NOTE;
    $('#gAdd').onclick = () => { const n = $('#gN').value.trim(); if (!n) { toast('اكتب الاسم'); return; } const S2 = ld(); S2.grp.push({ n, p: $('#gP').value.trim(), t: $('#gT').value.trim() }); sv(S2); rGrp(); };
    $$('[data-d]').forEach((b) => { b.onclick = () => { const S2 = ld(); S2.grp.splice(+b.dataset.d, 1); sv(S2); rGrp(); }; });
    const sh = $('#gSh'); if (sh) sh.onclick = () => { const t = S.grp.map((g) => `${g.n} ${g.p || ''} ${g.t || ''}`).join('\n'); if (navigator.share) navigator.share({ text: t }); else { navigator.clipboard && navigator.clipboard.writeText(t); toast('نُسخت القائمة'); } };
  }
  const MAPQ = [['المسجد الحرام', 'Masjid al-Haram Makkah'], ['المسجد النبوي', 'Al-Masjid an-Nabawi Madinah'], ['منى', 'Mina Makkah'], ['عرفة', 'Arafat Makkah'], ['مزدلفة', 'Muzdalifah Makkah'], ['ميقات ذو الحليفة', 'Dhul Hulayfah Miqat'], ['ميقات الجحفة (رابغ)', 'Al Juhfah Miqat Rabigh'], ['محطة قطار الحرمين مكة', 'Haramain high speed railway Makkah station']];
  function rMap() {
    routes.hjmap.back = 'hj'; N.setTitle('مواقع مهمة'); const S = ld();
    N.view.innerHTML = hero('مواقع مهمة', 'تفتح في تطبيق الخرائط عندك') + `<div class="card"><b>أماكن رئيسية</b>${MAPQ.map((m) => `<p style="margin:8px 0"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m[1])}" target="_blank" rel="noopener">📍 ${m[0]}</a></p>`).join('')}<small class="muted">تحتاج إنترنت. الخرائط غير المتصلة غير متوفرة هنا، ويمكنك تنزيل المنطقة من تطبيق الخرائط قبل السفر.</small></div>
      <div class="card"><b>أماكني المحفوظة (فندقي، نقطة التجمع...)</b><input id="pN" class="search" placeholder="اسم المكان" style="margin-top:6px"><button class="btn block" id="pAdd" style="margin-top:8px">📍 احفظ موقعي الحالي هنا</button>${S.places.map((p, i) => `<p style="margin:8px 0"><a href="https://www.google.com/maps/search/?api=1&query=${p.la},${p.lo}" target="_blank" rel="noopener">${esc(p.n)}</a> <button class="chip" data-d="${i}">✕</button></p>`).join('')}</div>
      <div class="card"><p class="muted" style="margin:0">لا نعرض نقاط خدمات أو مداخل أو مسارات غير موثقة رسمياً، وترتيبات الوصول تتغير، فاتّبع لوحات الإرشاد والتعليمات الرسمية.</p></div>` + NOTE;
    $('#pAdd').onclick = () => { const n = $('#pN').value.trim(); if (!n) { toast('اكتب اسم المكان'); return; } if (!navigator.geolocation) { toast('تحديد الموقع غير متاح'); return; } navigator.geolocation.getCurrentPosition((p) => { const S2 = ld(); S2.places.push({ n, la: +p.coords.latitude.toFixed(5), lo: +p.coords.longitude.toFixed(5) }); sv(S2); rMap(); }, () => toast('تعذّر تحديد موقعك، فعّل الموقع'), { enableHighAccuracy: true, timeout: 15000 });
    };
    $$('[data-d]').forEach((b) => { b.onclick = () => { const S2 = ld(); S2.places.splice(+b.dataset.d, 1); sv(S2); rMap(); }; });
  }
  const norm = (t) => String(t || '').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  function rAsk() {
    routes.hjask.back = 'hj'; N.setTitle('اسأل الدليل');
    const corpus = [];
    UMRA.forEach((s) => s[1].forEach((x) => corpus.push({ t: 'العمرة: ' + s[0], x })));
    HAJJ('tamattu').forEach((s) => s[1].forEach((x) => corpus.push({ t: 'الحج: ' + s[0], x })));
    PROHIB.forEach((s) => s[1].forEach((x) => corpus.push({ t: 'المحظورات: ' + s[0], x })));
    DIFF.concat(MISSED).forEach((s) => corpus.push({ t: s[0], x: s[1] }));
    N.view.innerHTML = hero('اسأل الدليل', 'يجيب من محتوى الدليل الموثّق فقط') + `<div class="card"><input id="aQ" class="search" placeholder="اكتب سؤالك أو كلمة (الميقات، الإحرام، عرفة...)"><div class="chips" style="justify-content:flex-start;margin-top:8px">${ASKS.map((a, i) => `<button class="chip" data-q="${i}">${a[0]}</button>`).join('')}</div></div><div id="aR"></div>` + NOTE;
    const run = (q) => {
      const ws = norm(q).split(/\s+/).filter((w) => w.length > 2); const R = $('#aR');
      if (!ws.length) { R.innerHTML = ''; return; }
      const hits = corpus.map((c) => ({ c, s: ws.reduce((a, w) => a + (norm(c.x + c.t).includes(w) ? 1 : 0), 0) })).filter((h) => h.s > 0).sort((a, b) => b.s - a.s).slice(0, 6);
      R.innerHTML = hits.length ? hits.map((h) => `<div class="card"><small class="muted">${esc(h.c.t)}</small><p style="margin:6px 0 0">${esc(h.c.x)}</p></div>`).join('') + '<p class="muted">إن كانت مسألتك خاصة فاسأل عالماً مؤهلاً.</p>' : '<div class="card"><p style="margin:0">لا أجد جواباً موثّقاً في الدليل لهذا السؤال، ولا أخمّن في أمور الدين. اسأل عالماً مؤهلاً أو لجنة فتوى معتمدة.</p></div>';
    };
    $('#aQ').oninput = (e) => run(e.target.value);
    $$('[data-q]').forEach((b) => { b.onclick = () => { const a = ASKS[+b.dataset.q]; if (a[1] === 'diff') go('hjdiff'); else if (a[1] === 'proh') go('hjproh'); else if (a[1] === 'miss') go('hjmiss'); else if (a[1] === 'dua') go('hjdua'); else go('hjg/' + a[1]); }; });
  }
  function rBak() {
    routes.hjbak.back = 'hj'; N.setTitle('نسخ احتياطي');
    N.view.innerHTML = hero('نسخ احتياطي', 'انقل بيانات رحلتك لجهاز آخر') + `<div class="card"><button class="btn block" id="e">📤 أنشئ كود</button><textarea id="t" class="search" rows="4" style="margin-top:8px" placeholder="الكود يظهر هنا، أو الصق كوداً لاستعادته"></textarea><div class="chips" style="justify-content:flex-start;margin-top:8px"><button class="chip" id="cp">📋 نسخ</button><button class="chip" id="im">📥 استعادة</button><button class="chip" id="dl">🧹 حذف بياناتي</button></div></div>`;
    $('#e').onclick = () => { $('#t').value = 'ATHARHJ1:' + btoa(unescape(encodeURIComponent(JSON.stringify(ld())))); };
    $('#cp').onclick = async () => { try { await navigator.clipboard.writeText($('#t').value); toast('نُسخ'); } catch { $('#t').select(); } };
    $('#im').onclick = () => { const t = $('#t').value.trim(); if (!t.startsWith('ATHARHJ1:')) { toast('الكود غير صحيح'); return; } try { const o = JSON.parse(decodeURIComponent(escape(atob(t.slice(9))))); if (!confirm('ستُستبدل بيانات الحج والعمرة الحالية، متأكد؟')) return; sv(o); toast('تمت الاستعادة'); go('hj'); } catch { toast('الكود تالف'); } };
    $('#dl').onclick = () => { if (confirm('حذف كل بيانات الحج والعمرة من هذا الجهاز؟')) { localStorage.removeItem('noor:hj:v1'); toast('حُذفت'); go('hj'); } };
  }
  Object.assign(routes, {
    hj: { title: 'الحج والعمرة', render: renderHome, back: 'home' },
    hjg: { title: 'المناسك', render: renderGuide, back: 'hj' },
    hjdiff: { title: 'الفروق', render: rDiff, back: 'hj' }, hjproh: { title: 'المحظورات', render: rProh, back: 'hj' }, hjmiss: { title: 'نسيت منسكاً', render: rMiss, back: 'hj' },
    hjdua: { title: 'أدعية', render: rDua, back: 'hj' }, hjpack: { title: 'الأغراض', render: rPack, back: 'hj' }, hjdocs: { title: 'المستندات', render: rDocs, back: 'hj' },
    hjbud: { title: 'الميزانية', render: rBud, back: 'hj' }, hjgrp: { title: 'المجموعة', render: rGrp, back: 'hj' }, hjmap: { title: 'مواقع', render: rMap, back: 'hj' },
    hjask: { title: 'اسأل الدليل', render: rAsk, back: 'hj' }, hjbak: { title: 'نسخ احتياطي', render: rBak, back: 'hj' },
  });
});
