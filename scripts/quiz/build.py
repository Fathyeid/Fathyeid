#!/usr/bin/env python3
"""يبني بنك أسئلة «الموسوعة الإسلامية | اختبر علمك» ويتحقق منه.

المدخلات:
  scripts/quiz/src/*.json   الأسئلة المكتوبة يدوياً (مصدر الحقيقة، مع مراجعها)
  --quran  quran.json       نص المصحف بالرسم العثماني (حزمة npm: quran-json@3.1.2، عن موسوعة القرآن الكريم quranenc.com)
  --bukhari / --muslim      نصوص الصحيحين (حزم npm: sahih-al-bukhari@3.1.7 و sahih-muslim@1.1.2) للتحقق من ألفاظ الأحاديث فقط

المخرجات (تُشحن مع التطبيق وتعمل دون إنترنت):
  data/quiz/index.json      التصنيفات والأعداد والحزم
  data/quiz/<cat>.json      أسئلة كل تصنيف (تُحمَّل عند الحاجة فقط)

قواعد التحقق (يفشل البناء عند مخالفتها):
  - كل نص قرآني يُدرج من المصحف نفسه عبر المرجع ⟦سورة:آية⟧ أو ⟦سورة:آية:من-إلى⟧ فلا يُكتب أي نص قرآني يدوياً.
  - كل حديث منسوب إلى البخاري أو مسلم يجب أن يوجد لفظه في نص الصحيح المذكور.
  - أسئلة «أكمل الآية» المولّدة: بداية الآية فريدة في المصحف كله، ولا يصلح أي اختيار خاطئ تكملةً لها في أي موضع.
"""
import argparse, gzip, json, os, random, re, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'scripts', 'quiz', 'src')
OUT = os.path.join(ROOT, 'data', 'quiz')

CATS = [
    ('quran', 'القرآن الكريم وعلومه', '📖'),
    ('tafsir', 'تفسير القرآن الكريم', '📘'),
    ('hadith', 'الحديث الشريف', '📜'),
    ('seerah', 'السيرة النبوية', '🌴'),
    ('anbiya', 'قصص الأنبياء', '⛵'),
    ('sahaba', 'الصحابة والصحابيات', '🛡️'),
    ('fiqh', 'الفقه والعبادات', '⚖️'),
    ('salah', 'الطهارة والصلاة', '🕌'),
    ('siyam', 'الصيام والزكاة والحج', '🌙'),
    ('aqeedah', 'العقيدة والتوحيد', '☝️'),
    ('akhlaq', 'الأخلاق والآداب الإسلامية', '🤝'),
    ('adhkar', 'الأذكار والأدعية', '🤲'),
    ('tarikh', 'التاريخ الإسلامي', '🏰'),
    ('general', 'معلومات إسلامية عامة', '💡'),
    ('muamalat', 'فقه المعاملات والتجارة', '🏪'),
]
CAT_IDS = [c[0] for c in CATS]
TYPES = {'mcq', 'tf', 'cmp', 'who', 'mean', 'ord'}
LEVELS = {1, 2, 3, 4}

AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
def ard(n): return ''.join(AR_DIGITS[int(c)] if c.isdigit() else c for c in str(n))

# ---------- التطبيع للمقارنة فقط (لا يغيّر النص المعروض) ----------
HARAKAT = re.compile('[ؐ-ًؚ-ٰٟۖ-ۭـ]')
def norm(s):
    s = HARAKAT.sub('', s)
    s = re.sub('[ٱأإآ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', '').replace('ئ', '').replace('ء', '')
    s = re.sub(r'[^ء-ي ]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

# ---------- المصحف ----------
class Quran:
    def __init__(self, path):
        d = json.load(open(path, encoding='utf-8'))
        self.sur = {s['id']: s for s in d}
        self.v = {(s['id'], x['id']): x['text'].replace('\u06de', '').strip() for s in d for x in s['verses']}
        self.allnorm = [(k, norm(t)) for k, t in self.v.items()]
        self.big = '\n' + '\n'.join(' ' + t + ' ' for _, t in self.allnorm) + '\n'
    def contains(self, phrase):
        return (' ' + norm(phrase) + ' ') in self.big
    def name(self, s): return self.sur[s]['name']
    def words(self, s, a): return self.v[(s, a)].split(' ')
    def text(self, s, a, w=None):
        if (s, a) not in self.v: raise ValueError(f'آية غير موجودة {s}:{a}')
        ws = self.words(s, a)
        if w:
            i, j = w
            if not (1 <= i <= j <= len(ws)): raise ValueError(f'نطاق كلمات غير صحيح {s}:{a}:{i}-{j} (عدد الكلمات {len(ws)})')
            ws = ws[i - 1:j]
        return ' '.join(ws)
    def ref(self, s, a, a2=None):
        return f'[{self.name(s)}: {ard(a)}{"-" + ard(a2) if a2 else ""}]'

REF = re.compile(r'⟦(\d+):(\d+)(?:-(\d+))?(?::(\d+)-(\d+))?⟧')
def expand(q, s):
    """⟦2:255⟧ آية كاملة، ⟦2:255:1-6⟧ كلمات من آية، ⟦2:285-286⟧ آيات متتالية."""
    def rep(m):
        su, a, a2, w1, w2 = m.groups()
        su, a = int(su), int(a)
        if a2:
            return '﴿' + ' '.join(q.text(su, x) for x in range(a, int(a2) + 1)) + '﴾ ' + q.ref(su, a, int(a2))
        t = q.text(su, a, (int(w1), int(w2)) if w1 else None)
        return '﴿' + t + '﴾ ' + q.ref(su, a)
    return REF.sub(rep, s)
def expand_bare(q, s):
    """نفس التوسيع لكن بدون المرجع (لنصوص الاختيارات)."""
    def rep(m):
        su, a, a2, w1, w2 = m.groups()
        return q.text(int(su), int(a), (int(w1), int(w2)) if w1 else None)
    return REF.sub(rep, s)

# ---------- الصحيحان (للتحقق فقط) ----------
class Sahih:
    def __init__(self, path):
        self.texts = [norm(h['arabic']) for h in json.load(gzip.open(path))['hadiths']] if path else None
    def has(self, frag):
        f = norm(frag)
        return any(f in t for t in self.texts)

ERRORS = []
# أذكار شائعة يقولها المسلم بلفظها، وهي ألفاظ قرآنية أيضاً؛ لا تُعد اقتباساً للآية
DHIKR_OK = {'لا اله الا الله', 'بسم الله الرحمن الرحيم'}
def die(msg):
    print('✗', msg, file=sys.stderr); sys.exit(1)

# ---------- الأسئلة اليدوية ----------
def load_manual(q, bukhari, muslim, stats):
    out, seen = [], set()
    for fn in sorted(os.listdir(SRC)):
        if not fn.endswith('.json'): continue
        items = json.load(open(os.path.join(SRC, fn), encoding='utf-8'))
        for it in items:
            where = f'{fn}:{it.get("id")}'
            for k in ('id', 'c', 't', 'l', 'q', 'o', 'a', 'e'):
                if k not in it: die(f'{where}: الحقل {k} ناقص')
            if it['id'] in seen: die(f'{where}: معرّف مكرر')
            seen.add(it['id'])
            if it['c'] not in CAT_IDS: die(f'{where}: تصنيف غير معروف {it["c"]}')
            if it['t'] not in TYPES: die(f'{where}: نوع غير معروف')
            if it['l'] not in LEVELS: die(f'{where}: مستوى غير صحيح')
            o = it['o']
            if it['t'] == 'tf':
                if o != ['صح', 'خطأ']: die(f'{where}: اختيارات صح/خطأ يجب أن تكون ["صح","خطأ"]')
            elif it['t'] == 'ord':
                if sorted(it['a']) != list(range(len(o))): die(f'{where}: ترتيب غير صحيح')
            else:
                if len(o) != 4 or len(set(o)) != 4: die(f'{where}: يلزم ٤ اختيارات مختلفة')
                if not (isinstance(it['a'], int) and 0 <= it['a'] < 4): die(f'{where}: رقم الإجابة غير صحيح')
            if not it.get('r'): die(f'{where}: لا مرجع للسؤال')
            # منع كتابة نص قرآني بالرسم العثماني يدوياً: يجب أن يأتي من المصحف عبر ⟦⟧
            raw = REF.sub('', json.dumps([it['q'], it['o'], it['e'], it.get('w')], ensure_ascii=False))
            if re.search('[ٱۡ۟ۥۦۜ]', raw): die(f'{where}: نص قرآني مكتوب يدوياً؛ استخدم ⟦سورة:آية⟧')
            # منع النص القرآني المكتوب يدوياً بالإملاء الحديث في الاختيارات (يجب أن يأتي عبر ⟦⟧)
            for opt in o:
                if '⟦' not in opt and len(norm(opt).split()) >= 4 and norm(opt) not in DHIKR_OK and q.contains(opt):
                    ERRORS.append(f'{where}: الاختيار «{opt}» نص قرآني مكتوب يدوياً؛ استخدم ⟦سورة:آية:من-إلى⟧')
            # الأدلة: قرآن من المصحف، وحديث يُتحقق من لفظه
            ev = []
            for d in it.get('d', []):
                if 'q' in d:
                    su, a = d['q'][0], d['q'][1]
                    w = d.get('w')
                    a2 = d['q'][2] if len(d['q']) > 2 else None
                    if a2: t = ' '.join(q.text(su, x) for x in range(a, a2 + 1))
                    else: t = q.text(su, a, w)
                    ev.append({'k': 'q', 'x': t, 'r': q.ref(su, a, a2)})
                    stats['quran_refs'] += 1
                elif 'h' in d:
                    src = d['src']
                    need = []
                    if 'البخاري' in src or 'متفق عليه' in src: need.append(('البخاري', bukhari))
                    if 'مسلم' in src or 'متفق عليه' in src: need.append(('مسلم', muslim))
                    for nm, book in need:
                        if book.texts is None: die(f'{where}: يلزم تمرير نص {nm} للتحقق')
                        txt = d.get('hm', d['h']) if nm == 'مسلم' else d.get('hb', d['h'])
                        if not book.has(txt): ERRORS.append(f'{where}: لفظ الحديث غير موجود في {nm}: {txt}'); continue
                        stats['hadith_verified'] += 1
                    if not need: stats['hadith_other'] += 1
                    if not d.get('g'): die(f'{where}: يلزم ذكر درجة الحديث')
                    ev.append({'k': 'h', 'x': d['h'], 'r': src, 'g': d['g']})
                else: die(f'{where}: دليل غير معروف')
            row = {
                'id': it['id'], 't': it['t'], 'l': it['l'],
                'q': expand(q, it['q']), 'o': [('﴿' + expand_bare(q, x) + '﴾') if REF.fullmatch(x) else expand_bare(q, x) for x in o], 'a': it['a'],
                'e': expand(q, it['e']), 'r': it['r'],
            }
            if ev: row['d'] = ev
            if it.get('w'): row['w'] = it['w']
            if it.get('x'): row['x'] = it['x']  # تنبيه خلاف فقهي
            if it.get('k'): row['k'] = it['k']
            out.append((it['c'], row))
    return out

# ---------- الأسئلة المولّدة من نص المصحف ----------
# مقاطع يكثر حفظها: جزء عمّ كاملاً + مواضع مشهورة
SELECT = [(s, None) for s in range(78, 115)] + [
    (1, None), (2, (1, 5)), (2, (255, 257)), (2, (284, 286)), (3, (190, 194)), (18, (1, 10)), (23, (1, 11)),
    (25, (63, 77)), (31, (12, 19)), (36, (1, 27)), (49, None), (55, None), (59, (18, 24)), (67, None),
]
def gen_quran(q, rnd):
    out = []
    starts = defaultdict(set)  # بدايات الآيات (أول n كلمة) → مواضعها
    nv = q.allnorm
    # نص المصحف كله مطبَّعاً في سلسلة واحدة: كل آية في سطر محاط بمسافتين، للبحث السريع
    BIG = '\n' + '\n'.join(' ' + t + ' ' for _, t in nv) + '\n'
    def prefix_conflicts(stem_n, key):
        # هل تبدأ آية أخرى (غير هذه) بالنص نفسه؟
        return BIG.count('\n ' + stem_n + ' ') > 1
    def occurs(phrase_n):
        # هل يرد هذا النص متصلاً في أي موضع من المصحف؟
        return (' ' + phrase_n + ' ') in BIG
    pool = []
    for s, rng in SELECT:
        n = q.sur[s]['total_verses']
        a1, a2 = rng or (1, n)
        for a in range(a1, a2 + 1): pool.append((s, a))
    # عدد مرات ورود كل آية بنصها (لاستبعاد المكرر مثل «فبأي آلاء ربكما تكذبان»)
    cnt = defaultdict(int)
    for _, t in nv: cnt[t] += 1
    for s, a in pool:
        ws = q.words(s, a)
        key = (s, a)
        juz30 = s >= 78
        lvl = (1 if s >= 93 or s == 1 else 2) if juz30 or s == 1 else 3
        # ١) أكمل الآية
        if len(ws) >= 3 and cnt[norm(q.v[key])] == 1:
            k = max(2, (len(ws) + 1) // 2)
            while k < len(ws) and prefix_conflicts(norm(' '.join(ws[:k])), key): k += 1
            if k < len(ws):
                stem = ' '.join(ws[:k]); ans = ' '.join(ws[k:])
                stem_n = norm(stem)
                # تكملات بديلة من آيات السورة نفسها بطول قريب، بشرط ألا تكوّن مع البداية نصاً قرآنياً في أي موضع
                cands = []
                same = [x for x in range(1, q.sur[s]['total_verses'] + 1) if x != a]
                near = [(s2, a2) for s2, a2 in pool if s2 != s and abs(len(q.words(s2, a2)) - len(ws)) <= 3]
                rnd.shuffle(same); rnd.shuffle(near)
                for s2, a2 in [(s, x) for x in same] + near:
                    if len(cands) >= 3: break
                    w2 = q.words(s2, a2)
                    m = len(ws) - k
                    if len(w2) < m + 1: continue
                    alt = ' '.join(w2[-m:]) if m <= len(w2) else ' '.join(w2)
                    alt_n = norm(alt)
                    if alt_n == norm(ans) or any(alt_n == norm(c) for c in cands): continue
                    combo = stem_n + ' ' + alt_n
                    if occurs(combo): continue
                    cands.append(alt)
                if len(cands) >= 3:
                    out.append(('quran', {
                        'id': f'qc-{s}-{a}', 't': 'cmp', 'l': lvl,
                        'q': f'أكمل الآية الكريمة: ﴿{stem} ...﴾',
                        'o': [ans] + cands[:3], 'a': 0,
                        'e': f'الآية كاملة: ﴿{q.v[key]}﴾ {q.ref(s, a)}',
                        'r': f'المصحف الشريف، سورة {q.name(s)} الآية {ard(a)} (برواية حفص عن عاصم)',
                        'k': 'أكمل الآية',
                    }))
        # ٢) ما الآية التالية؟
        nxt = (s, a + 1)
        if nxt in q.v and cnt[norm(q.v[key])] == 1 and len(ws) >= 3:
            others = [q.v[(s, x)] for x in range(1, q.sur[s]['total_verses'] + 1) if x not in (a, a + 1) and len(q.words(s, x)) <= 30]
            others = [t for t in dict.fromkeys(others) if norm(t) != norm(q.v[nxt])]
            if len(others) >= 3 and len(q.words(*nxt)) <= 30:
                rnd.shuffle(others)
                out.append(('quran', {
                    'id': f'qn-{s}-{a}', 't': 'cmp', 'l': min(4, lvl + 1),
                    'q': f'ما الآية التي تلي قوله تعالى: ﴿{q.v[key]}﴾ في سورة {q.name(s)}؟',
                    'o': [q.v[nxt]] + others[:3], 'a': 0,
                    'e': f'تليها الآية: ﴿{q.v[nxt]}﴾ {q.ref(s, a + 1)}',
                    'r': f'المصحف الشريف، سورة {q.name(s)} الآيتان {ard(a)}-{ard(a + 1)}',
                    'k': 'ترتيب الآيات',
                }))
    # ٣) معلومات السور: الترتيب، عدد الآيات، السورة التالية
    names = [q.name(s) for s in range(1, 115)]
    for s in range(1, 115):
        nm = q.name(s); n = q.sur[s]['total_verses']
        lv = 1 if s == 1 or s >= 100 else 2 if s >= 67 else 3
        # ترتيب السورة
        opts = sorted({s + d for d in (-2, -1, 1, 2, 3, -3) if 1 <= s + d <= 114} - {s})
        rnd.shuffle(opts)
        out.append(('quran', {
            'id': f'qs-{s}', 't': 'mcq', 'l': lv,
            'q': f'ما ترتيب سورة {nm} في المصحف الشريف؟',
            'o': [ard(s)] + [ard(x) for x in opts[:3]], 'a': 0,
            'e': f'سورة {nm} هي السورة رقم {ard(s)} في ترتيب المصحف.',
            'r': 'ترتيب السور في مصحف المدينة النبوية', 'k': 'ترتيب السور',
        }))
        # عدد الآيات (بالعدّ الكوفي المعتمد في رواية حفص)
        alts = sorted({n + d for d in (-3, -2, -1, 1, 2, 4, 5) if n + d >= 3} - {n})
        rnd.shuffle(alts)
        out.append(('quran', {
            'id': f'qv-{s}', 't': 'mcq', 'l': min(4, lv + 1),
            'q': f'كم عدد آيات سورة {nm}؟',
            'o': [ard(n)] + [ard(x) for x in alts[:3]], 'a': 0,
            'e': f'عدد آيات سورة {nm} {ard(n)} آية بالعدّ الكوفي، وهو المعتمد في مصحف المدينة برواية حفص عن عاصم. وقد يختلف العدد يسيراً في مذاهب العدّ الأخرى دون اختلاف في نص القرآن.',
            'r': 'مصحف المدينة النبوية (العدّ الكوفي)', 'k': 'عدد الآيات',
        }))
        if s < 114:
            nx = names[s]
            alts = [names[x - 1] for x in range(max(1, s - 4), min(114, s + 5) + 1) if x not in (s, s + 1)]
            rnd.shuffle(alts)
            out.append(('quran', {
                'id': f'qa-{s}', 't': 'mcq', 'l': lv,
                'q': f'ما السورة التي تأتي بعد سورة {nm} في ترتيب المصحف؟',
                'o': [nx] + alts[:3], 'a': 0,
                'e': f'بعد سورة {nm} ({ard(s)}) تأتي سورة {nx} ({ard(s + 1)}).',
                'r': 'ترتيب السور في مصحف المدينة النبوية', 'k': 'ترتيب السور',
            }))
    # ٤) في أي سورة وردت هذه الآية؟ (آيات فريدة النص فقط)
    for s, a in pool:
        t = q.v[(s, a)]
        if cnt[norm(t)] != 1 or len(t.split(' ')) < 5: continue
        if (s * 7 + a) % 3: continue  # عيّنة متوازنة
        alts = [q.name(x) for x in range(max(1, s - 6), min(114, s + 6) + 1) if x != s]
        rnd.shuffle(alts)
        out.append(('quran', {
            'id': f'qw-{s}-{a}', 't': 'mcq', 'l': 3 if s >= 78 else 4,
            'q': f'في أي سورة وردت هذه الآية: ﴿{t}﴾؟',
            'o': [q.name(s)] + alts[:3], 'a': 0,
            'e': f'وردت في سورة {q.name(s)} {q.ref(s, a)}.',
            'r': f'المصحف الشريف، سورة {q.name(s)} الآية {ard(a)}', 'k': 'مواضع الآيات',
        }))
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--quran', required=True)
    ap.add_argument('--bukhari'); ap.add_argument('--muslim')
    args = ap.parse_args()
    q = Quran(args.quran)
    bukhari, muslim = Sahih(args.bukhari), Sahih(args.muslim)
    stats = defaultdict(int)
    rnd = random.Random(20261117)  # بذرة ثابتة حتى تبقى الأسئلة والمعرّفات مستقرة بين البنايات
    rows = load_manual(q, bukhari, muslim, stats)
    if ERRORS:
        for e in ERRORS: print('✗', e, file=sys.stderr)
        sys.exit(1)
    stats['manual'] = len(rows)
    gen = gen_quran(q, rnd)
    stats['generated'] = len(gen)
    by = defaultdict(list)
    ids = set()
    for c, r in rows + gen:
        if r['id'] in ids: die(f'معرّف مكرر {r["id"]}')
        ids.add(r['id']); by[c].append(r)
    os.makedirs(OUT, exist_ok=True)
    index = {'v': 1, 'total': len(ids), 'cats': [], 'levels': {'1': 'مبتدئ', '2': 'متوسط', '3': 'متقدم', '4': 'تحدي العلماء'}, 'packs': []}
    for cid, name, ic in CATS:
        items = by.get(cid, [])
        fn = f'{cid}.json'
        json.dump(items, open(os.path.join(OUT, fn), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        lv = defaultdict(int)
        for r in items: lv[r['l']] += 1
        index['cats'].append({'id': cid, 'n': name, 'ic': ic, 'f': fn, 'count': len(items), 'lv': {str(k): lv[k] for k in sorted(lv)}})
    json.dump(index, open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('✓ إجمالي الأسئلة', len(ids), dict(stats))
    for c in index['cats']: print(f"  {c['ic']} {c['n']}: {c['count']} {c['lv']}")

if __name__ == '__main__':
    main()
