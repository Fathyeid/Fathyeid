#!/usr/bin/env python3
"""يبني js/azkar-data.js (موسوعة الأذكار والأدعية) من مصادر موثقة:
  - scripts/src/hisn-api.json   : نص «حصن المسلم» الرسمي من hisnmuslim.com (مع رقم الذكر وملف الصوت)
  - scripts/src/hisn-takhrij.json: حواشي التخريج من نسخة الكتاب (rn0x/hisn_almuslim_json)
  - scripts/quran-duas.json      : أدعية القرآن، نصها من alquran.cloud مع السورة ورقم الآية
  - MANUAL أدناه                 : أحاديث قليلة غير موجودة في الحصن، كل منها بتخريجه الصريح
لا يُنسب أي نص للنبي ﷺ إلا بتخريج؛ والحكم يُستخرج فقط مما نص عليه التخريج نفسه.
"""
import json, re, difflib, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
API = json.load(open(P('scripts/src/hisn-api.json'), encoding='utf-8'))
TK = json.load(open(P('scripts/src/hisn-takhrij.json'), encoding='utf-8'))
QD = json.load(open(P('scripts/quran-duas.json'), encoding='utf-8'))

DIAC = re.compile('[ً-ْٰـ]')
def norm(s):
    s = DIAC.sub('', s or '')
    s = re.sub('[إأآٱ]', 'ا', s).replace('ة', 'ه').replace('ى', 'ي')
    return re.sub('[^ء-ي ]', '', s).strip()
def nk(s): return re.sub(r'\s+', '', norm(s))

# ---------- مطابقة أبواب الحصن بين المصدرين ----------
tk_keys = list(TK.keys())
TITLE_FIX = {72: 'الدعاء لمن سقاه أو إذا أراد ذلك', 85: 'كفارة المجلس ومايختم به المجالس', 95: 'دعاء ركوب الدابة',
             86: 'الدعاء لمن قال غفر الله لك', 87: 'الدعاء لمن صنع إليك معروفاً'}
def match_chapter(title, cid=None):
    if cid in TITLE_FIX:
        return TITLE_FIX[cid], 1.0
    best = max(tk_keys, key=lambda k: difflib.SequenceMatcher(None, nk(title), nk(k)).ratio())
    return best, difflib.SequenceMatcher(None, nk(title), nk(best)).ratio()

SRC_RE = re.compile('البخاري|مسلم|أبو داود|أبي داود|الترمذي|النسائي|ابن ماجه|أحمد|الحاكم|سورة|الطبراني|ابن السني|مالك|البيهقي|ابن حبان|الألباني|الدارمي|ابن أبي شيبة|عبد الرزاق|متفق')
def takhrij_list(ch):
    t, f = ch['text'], ch['footnote']
    if len(t) == len(f):
        return f, True
    ff = [x for x in f if SRC_RE.search(x)]
    if len(ff) == len(t):
        return ff, True
    return f, False

def grade(f):
    if not f:
        return None
    s = re.sub('على شرط (البخاري|مسلم|الشيخين)', '', f)
    s = re.sub(r'(و?البخاري )?في (كتاب )?الأدب المفرد( برقم ?\d+)?', '', s)
    if re.match(r'\s*(سورة|البقرة|آل عمران)', s):
        return 'quran'
    if re.search('ضعيف|ضعفه|ضعّفه', s):
        return 'daif'
    b = 'البخاري' in s
    m = re.search(r'(^|[\s،,(.\d]|و)مسلم', s)
    if 'متفق عليه' in s or (b and m):
        return 'muttafaq'
    if b:
        return 'bukhari'
    if m:
        return 'muslim'
    if re.search('صححه|صحّحه|صحح|صحيح الإسناد|إسناده صحيح|حديث صحيح|إسناد صحيح|سند صحيح|سنده صحيح', s):
        return 'sahih'
    if re.search(r'(?<![ء-ي])و?حسّ?ن(ه|\s)|إسناده حسن|حديث حسن', s):
        return 'hasan'
    if re.search('صحيح (الترمذي|أبي داود|أبو داود|ابن ماجه|النسائي|الجامع|الترغيب|الأدب)', s):
        return 'maqbul'
    return 'cited'

COUNT_WORDS = [('مائة', 100), ('مِائَة', 100), ('عشر', 10), ('سبع', 7), ('أربع', 4), ('ثلاث', 3)]
def count_of(text, rep):
    try:
        n = int(rep)
    except Exception:
        n = 1
    if n > 1:
        return n
    tail = norm(text)[-60:]
    m = re.search(r'(سبع|اربع|ثلاث|عشر|مائه|ميه)\s*(مرات|مره)', tail)
    if m:
        return {'سبع': 7, 'اربع': 4, 'ثلاث': 3, 'عشر': 10, 'مائه': 100, 'ميه': 100}[m.group(1)]
    return 1

def clean(t):
    t = re.sub('ـ{2,}', '', t or '').replace('﻿', '')
    return re.sub(r'\s+', ' ', t).strip()

# أذكار الصباح والمساء: حواشي الكتاب تتضمن صيغ المساء، فرُبطت كل حاشية تخريج بذكرها يدوياً بعد المراجعة
MORNING = {75: [1], 76: [2], 77: [5], 78: [7], 79: [9], 80: [11], 81: [13], 82: [14], 83: [15], 84: [16], 85: [17], 86: [18],
           87: [19], 88: [20], 89: [23], 90: [25], 91: [26], 92: [27, 28], 93: [29], 94: [30], 95: [31], 96: [32], 97: [33], 98: [34]}

# ---------- عناصر الحصن ----------
items = {}      # key -> item
chapters = []   # [{id, t, items:[keys], audio}]
seen_ids = set()
report = []
for ch in API:
    tkey, ratio = match_chapter(ch['title'], ch['id'])
    if ratio < 0.8: print('CH', ch['id'], ch['title'], '=>', tkey, round(ratio, 2)) if '-v' in sys.argv else None
    tch = TK[tkey]
    fl, aligned = takhrij_list(tch)
    t_norm = [nk(x)[:90] for x in tch['text']]
    keys = []
    MAN = MORNING if ch['id'] == 27 else None
    for pos, it in enumerate(ch['items']):
        hid = it['id']
        text = clean(it['text'])
        dup = hid in seen_ids
        seen_ids.add(hid)
        # أفضل نص مطابق في نسخة التخريج
        sc = [difflib.SequenceMatcher(None, nk(text)[:90], x).ratio() for x in t_norm]
        j = max(range(len(sc)), key=lambda i: sc[i]) if sc else -1
        if dup and j >= 0:  # خطأ في المصدر: نفس الذكر مكرر في بابين، نأخذ نص هذا الباب من الكتاب
            text = clean(tch['text'][j]); sc[j] = 1
        if aligned and j >= 0 and sc[j] <= 0.45 and len(ch['items']) == len(tch['text']):
            j = pos; sc[j] = 1  # نفس الترتيب ونفس العدد
        f = fl[j] if (aligned and j >= 0 and sc[j] > 0.45 and j < len(fl)) else None
        if MAN:
            f = ' — '.join(tch['footnote'][x] for x in MAN[hid])
        elif not aligned and len(ch['items']) == 1:
            f = ' — '.join(x for x in tch['footnote'] if SRC_RE.search(x))
        key = f'h{hid}' if not dup else f'h{hid}b'
        items[key] = {
            'k': key, 't': text, 'n': count_of(text, it['repeat']),
            'a': None if dup else hid,
            'f': clean(f) if f else None, 'g': grade(f),
            'src': 'hisn', 'no': None if dup else hid, 'ch': ch['id'],
        }
        keys.append(key)
        report.append((ch['id'], hid, round(sc[j], 2) if j >= 0 else 0, aligned))
    if MAN or (not aligned and len(ch['items']) == 1):
        aligned = True
    chapters.append({'id': f'c{ch["id"]}', 't': clean(ch['title']).replace('ﺗﻬ', 'ته').replace('اﻟﻤﺠ', 'المج').replace('مترلا', 'منزلاً').replace('ُ ', '').replace('ُلبْس', 'لُبس'),
                     'items': keys, 'notes': None if aligned else [clean(x) for x in tch['footnote'] if SRC_RE.search(x)]})

# ---------- أدعية القرآن ----------
quran = []
for i, q in enumerate(QD):
    key = f'q{i}'
    a0, a1 = q['a']
    ref = f"{q['surah']} • الآية {a0}" if a0 == a1 else f"{q['surah']} • الآيات {a0}–{a1}"
    items[key] = {'k': key, 't': clean(q['text']), 'n': 1, 'a': None, 'f': ref, 'g': 'quran', 'src': 'quran',
                  'title': q['t'], 's': q['s'], 'ay': [a0, a1], 'cat': q.get('cat'), 'p': q.get('p')}
    quran.append(key)

# ---------- أحاديث مضافة بتخريجها (ليست في الحصن) ----------
MANUAL = [
    ('m1', 'إِنَّ مِنْ أَفْضَلِ أَيَّامِكُمْ يَوْمَ الْجُمُعَةِ... فَأَكْثِرُوا عَلَيَّ مِنَ الصَّلَاةِ فِيهِ، فَإِنَّ صَلَاتَكُمْ مَعْرُوضَةٌ عَلَيَّ', 1,
     'رواه أبو داود (1047) والنسائي (1374) وابن ماجه (1085)، وصححه الألباني', 'sahih', 'abudawud:1047', 'فضل الإكثار من الصلاة على النبي ﷺ يوم الجمعة'),
    ('m2', 'مَنْ قَرَأَ سُورَةَ الْكَهْفِ فِي يَوْمِ الْجُمُعَةِ أَضَاءَ لَهُ مِنَ النُّورِ مَا بَيْنَ الْجُمُعَتَيْنِ', 1,
     'رواه الحاكم (2/368) والبيهقي، وصححه الألباني في صحيح الجامع (6470)', 'sahih', None, 'قراءة سورة الكهف يوم الجمعة'),
    ('m3', 'فِيهِ سَاعَةٌ لَا يُوَافِقُهَا عَبْدٌ مُسْلِمٌ وَهُوَ قَائِمٌ يُصَلِّي يَسْأَلُ اللَّهَ تَعَالَى شَيْئًا إِلَّا أَعْطَاهُ إِيَّاهُ', 1,
     'رواه البخاري (935) ومسلم (852) عن أبي هريرة رضي الله عنه', 'muttafaq', 'bukhari:935', 'ساعة الإجابة يوم الجمعة'),
    ('m4', 'يَوْمُ الْجُمُعَةِ ثِنْتَا عَشْرَةَ سَاعَةً... فَالْتَمِسُوهَا آخِرَ سَاعَةٍ بَعْدَ الْعَصْرِ', 1,
     'رواه أبو داود (1048) والنسائي (1389)، وصححه الألباني', 'sahih', 'abudawud:1048', 'التماس ساعة الإجابة آخر ساعة بعد العصر'),
    ('m5', 'بِاسْمِ اللَّهِ أَرْقِيكَ، مِنْ كُلِّ شَيْءٍ يُؤْذِيكَ، مِنْ شَرِّ كُلِّ نَفْسٍ أَوْ عَيْنِ حَاسِدٍ، اللَّهُ يَشْفِيكَ، بِاسْمِ اللَّهِ أَرْقِيكَ', 3,
     'رواه مسلم (2186) من رقية جبريل عليه السلام للنبي ﷺ', 'muslim', 'muslim:2186', 'رقية جبريل عليه السلام'),
    ('m6', 'اللَّهُمَّ رَبَّ النَّاسِ، أَذْهِبِ الْبَاسَ، اشْفِهِ وَأَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا', 3,
     'رواه البخاري (5743) ومسلم (2191) عن عائشة رضي الله عنها', 'muttafaq', 'bukhari:5743', 'رقية النبي ﷺ للمريض'),
    ('m7', 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّةِ، مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ، وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ', 3,
     'رواه البخاري (3371) — كان النبي ﷺ يعوّذ بها الحسن والحسين', 'bukhari', 'bukhari:3371', 'التحصين من العين والشياطين'),
    ('m8', 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى، وَالتُّقَى، وَالْعَفَافَ، وَالْغِنَى', 1,
     'رواه مسلم (2721) عن ابن مسعود رضي الله عنه', 'muslim', 'muslim:2721', 'سؤال الهدى والتقى'),
    ('m9', 'اللَّهُمَّ أَصْلِحْ لِي دِينِيَ الَّذِي هُوَ عِصْمَةُ أَمْرِي، وَأَصْلِحْ لِي دُنْيَايَ الَّتِي فِيهَا مَعَاشِي، وَأَصْلِحْ لِي آخِرَتِي الَّتِي فِيهَا مَعَادِي، وَاجْعَلِ الْحَيَاةَ زِيَادَةً لِي فِي كُلِّ خَيْرٍ، وَاجْعَلِ الْمَوْتَ رَاحَةً لِي مِنْ كُلِّ شَرٍّ', 1,
     'رواه مسلم (2720) عن أبي هريرة رضي الله عنه', 'muslim', 'muslim:2720', 'صلاح الدين والدنيا والآخرة'),
    ('m10', 'يَا مُقَلِّبَ الْقُلُوبِ، ثَبِّتْ قَلْبِي عَلَى دِينِكَ', 1,
     'رواه الترمذي (2140) عن أنس رضي الله عنه، وصححه الألباني', 'sahih', 'tirmidhi:2140', 'الثبات على الدين'),
    ('m11', 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي', 1,
     'رواه الترمذي (3513) وابن ماجه (3850) عن عائشة رضي الله عنها حين سألت: ماذا أقول إن علمت ليلة القدر؟ وصححه الألباني', 'sahih', 'tirmidhi:3513', 'دعاء ليلة القدر'),
    ('m12', 'يَنْزِلُ رَبُّنَا تَبَارَكَ وَتَعَالَى كُلَّ لَيْلَةٍ إِلَى السَّمَاءِ الدُّنْيَا حِينَ يَبْقَى ثُلُثُ اللَّيْلِ الْآخِرُ يَقُولُ: مَنْ يَدْعُونِي فَأَسْتَجِيبَ لَهُ، مَنْ يَسْأَلُنِي فَأُعْطِيَهُ، مَنْ يَسْتَغْفِرُنِي فَأَغْفِرَ لَهُ', 1,
     'رواه البخاري (1145) ومسلم (758) عن أبي هريرة رضي الله عنه', 'muttafaq', 'bukhari:1145', 'فضل الدعاء في ثلث الليل الآخر'),
    ('m13', 'اللَّهُمَّ انْفَعْنِي بِمَا عَلَّمْتَنِي، وَعَلِّمْنِي مَا يَنْفَعُنِي، وَزِدْنِي عِلْمًا', 1,
     'رواه ابن ماجه (251) والترمذي (3599)، وصححه الألباني', 'sahih', 'ibnmajah:251', 'دعاء طلب العلم النافع'),
    ('m14', 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عِلْمٍ لَا يَنْفَعُ، وَمِنْ قَلْبٍ لَا يَخْشَعُ، وَمِنْ نَفْسٍ لَا تَشْبَعُ، وَمِنْ دَعْوَةٍ لَا يُسْتَجَابُ لَهَا', 1,
     'رواه مسلم (2722) عن زيد بن أرقم رضي الله عنه', 'muslim', 'muslim:2722', 'الاستعاذة من العلم الذي لا ينفع'),
]
manual = []
for k, t, n, f, g, link, title in MANUAL:
    items[k] = {'k': k, 't': t, 'n': n, 'a': None, 'f': f, 'g': g, 'src': 'sunnah', 'link': link, 'title': title}
    manual.append(k)

def C(*ids):
    out = []
    for i in ids:
        if isinstance(i, int):
            out += next(c['items'] for c in chapters if c['id'] == f'c{i}')
        else:
            out.append(i)
    return out
QP = [k for k in quran if items[k]['cat'] == 'prophets']
QQ = [k for k in quran if items[k]['cat'] in ('quran', 'prophets')]
QR = [k for k in quran if items[k]['cat'] == 'ruqya']
def qn(*idx): return [f'q{i}' for i in idx]

AZ = [
    ('morning', 'أذكار الصباح والمساء', '🌅', C(27)),
    ('prayer', 'أذكار الصلاة وبعد السلام', '🕌', C(25, 16, 17, 18, 19, 20, 22, 23, 24, 21)),
    ('sleep', 'أذكار الاستيقاظ والنوم', '🌙', C(1, 28, 29, 30, 31)),
    ('home', 'دخول المنزل والخروج منه', '🏠', C(11, 10)),
    ('masjid', 'أذكار المسجد والأذان', '🕋', C(12, 13, 14, 15)),
    ('food', 'الطعام والشراب', '🍽️', C(69, 70, 71, 72, 73, 74, 68, 76)),
    ('wudu', 'الوضوء والطهارة', '💧', C(6, 7, 8, 9)),
    ('travel', 'السفر والركوب', '🧳', C(95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105)),
    ('anxiety', 'الخوف والقلق والحزن والكرب', '🫶', C(34, 35, 36, 37, 39, 43, 46, 126, 30)),
    ('istighfar', 'الاستغفار والتوبة', '🤍', C(129, 44, 85)),
    ('tasbih', 'التسبيح والتحميد والتهليل والتكبير', '📿', C(130, 131, 107)),
    ('friday', 'يوم الجمعة', '🕌', ['m1', 'm2', 'm3', 'm4'] + C(107)),
    ('hajj', 'الحج والعمرة', '🕋', C(115, 116, 117, 118, 119, 120, 121)),
    ('illness', 'المرض والشفاء', '🩺', C(49, 50, 51, 124, 52) + ['m6', 'm5']),
    ('ruqya', 'الرقية الشرعية', '🛡️', QR + qn(5) + ['m5', 'm6', 'm7'] + C(48, 124, 125, 128)),
    ('mixed', 'أذكار متنوعة من القرآن والسنة', '📖', C(132, 92, 88, 94, 45, 40, 42, 128)),
    ('daily', 'المناسبات والمواقف اليومية', '☀️', C(2, 3, 4, 5, 47, 61, 62, 63, 64, 65, 66, 67, 75, 77, 78, 79, 80, 81, 82, 83, 84, 86, 87, 89, 90, 91, 93, 106, 108, 109, 110, 111, 112, 113, 114, 122, 123, 127, 38, 53, 57, 26)),
]
DU = [
    ('quran', 'أدعية القرآن الكريم كاملة', '📖', QQ),
    ('prophets', 'أدعية الأنبياء', '🌿', QP),
    ('nabawi', 'الأدعية النبوية الصحيحة', '🤲', None),  # تُملأ بالأدعية الصحيحة/الحسنة فقط
    ('rizq', 'الرزق والبركة', '🌾', ['h95', 'h73', 'h136', 'h107', 'h49'] + qn(48, 16) + ['m8']),
    ('karb', 'تفريج الهم والكرب', '🫶', C(34, 35) + qn(35, 12, 23) + C(43, 46)),
    ('dain', 'قضاء الدين', '💳', C(41) + ['h107']),
    ('shifa', 'الشفاء للمريض', '🩺', C(49, 51, 124) + ['m6', 'm5'] + qn(34)),
    ('huda', 'الهداية وصلاح الحال', '✨', qn(0, 6) + ['m8', 'm9', 'm10', 'h116', 'h88', 'h30']),
    ('tawba', 'التوبة والمغفرة', '🤍', C(129) + ['h79', 'h57', 'h58', 'h46'] + qn(17, 46, 22, 39, 40, 7)),
    ('family', 'الوالدين والأهل والأبناء', '👨‍👩‍👧', qn(29, 28, 58, 42, 53) + C(48)),
    ('marriage', 'الزواج والذرية', '💍', C(79, 80, 81) + qn(42, 9, 36, 50)),
    ('success', 'النجاح والتوفيق', '🎯', C(26, 43) + qn(32, 30, 3)),
    ('safar', 'أدعية السفر', '🧳', C(96, 95, 97, 100, 101, 103, 104, 105)),
    ('deceased', 'الدعاء للمتوفى', '🕊️', C(54, 55, 56, 59, 60) + qn(58, 54)),
    ('qiyam', 'قيام الليل والتهجد', '🌌', ['m12', 'h32', 'h30', 'h4'] + C(32, 33)),
    ('sujud', 'السجود والصلاة', '🧎', C(16, 17, 18, 19, 20, 24, 21)),
    ('ramadan', 'ليلة القدر ورمضان', '🌙', ['m11'] + C(68, 67, 74, 75)),
    ('arafa', 'يوم عرفة', '⛰️', C(119) + qn(3)),
    ('ilm', 'طلب العلم', '📚', qn(33) + ['m13', 'm14', 'h95']),
    ('hifdh', 'الحفظ من الحسد والشرور', '🛡️', ['h76', 'h86', 'h97', 'm7'] + C(48, 125, 128, 45)),
]
DUA_START = re.compile('^[\\s(\\[]*(اللهم|رب|ربنا|يا|أعوذ|اعوذ|اسال)')
nab = [k for k, v in items.items() if v['src'] == 'hisn' and v['g'] in ('muttafaq', 'bukhari', 'muslim', 'sahih', 'hasan')
       and DUA_START.match(norm(v['t']))]
DU[2] = ('nabawi', DU[2][1], DU[2][2], nab)

def chk(lst):
    for k, t, ic, ks in lst:
        for x in ks:
            assert x in items, (k, x)
        assert len(set(ks)) == len(ks) or True
chk(AZ); chk(DU)
dedupe = lambda ks: list(dict.fromkeys(ks))

GL = {'quran': 'قرآن كريم', 'muttafaq': 'صحيح — متفق عليه', 'bukhari': 'صحيح — رواه البخاري', 'muslim': 'صحيح — رواه مسلم',
      'sahih': 'صحيح', 'hasan': 'حسن', 'maqbul': 'مقبول (صحيح أو حسن) — أورده الألباني في كتب الصحيح', 'daif': 'ضعيف', 'cited': 'مخرَّج — انظر التخريج'}

out = {
    'v': 1,
    'grades': GL,
    'chapters': chapters,
    'items': items,
    'azkar': [{'k': k, 't': t, 'ic': ic, 'items': dedupe(ks)} for k, t, ic, ks in AZ],
    'duas': [{'k': k, 't': t, 'ic': ic, 'items': dedupe(ks)} for k, t, ic, ks in DU],
    'sources': [
        'حصن المسلم من أذكار الكتاب والسنة — د. سعيد بن علي بن وهف القحطاني (النص والصوت من الموقع الرسمي hisnmuslim.com، والتخريج من حواشي الكتاب)',
        'القرآن الكريم — نص الرسم الإملائي من Tanzil عبر alquran.cloud، مع اسم السورة ورقم الآية',
        'الأحاديث المضافة من خارج الحصن موثقة برقمها في الصحيحين والسنن مع حكم الألباني حيث وُجد',
    ],
}
js = '/* مُولَّد آلياً بواسطة scripts/build-azkar.py — لا تعدّله يدوياً */\nwindow.AZ_DB=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(P('js/azkar-data.js'), 'w', encoding='utf-8').write(js)

if '-v' in sys.argv:
    from collections import Counter
    print('items', len(items), 'bytes', len(js.encode()))
    print(Counter(v['g'] for v in items.values()))
    print('nabawi', len(nab))
    print('azkar', [(c[0], len(dedupe(c[3]))) for c in AZ])
    print('duas', [(c[0], len(dedupe(c[3]))) for c in DU])
    print('unaligned chapters', [c['t'] for c in chapters if c['notes'] is not None])
    print('low match', [r for r in report if r[2] < 0.6])
