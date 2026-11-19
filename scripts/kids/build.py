#!/usr/bin/env python3
"""يبني محتوى «موسوعة الطفل» ويتحقق منه: bash scripts/kids/build.sh

المدخلات: scripts/kids/src/<قسم>/*.json — مادة واحدة لكل ملف أو قائمة مواد.
المخرجات: data/kids/index.json (الأقسام والفهرس المختصر للبحث) و data/kids/<قسم>.json (المواد الكاملة، تُحمَّل عند الحاجة).

يعيد استخدام قواعد التحقق في scripts/quiz/build.py:
  - لا يُكتب نص قرآني يدوياً: ⟦سورة:آية⟧ يُدرج من المصحف العثماني.
  - كل حديث منسوب إلى البخاري أو مسلم يُتحقق من لفظه في نص الصحيح.
ويضيف: المصادر وتاريخ المراجعة إلزاميان للمحتوى الموثّق، ونوع المادة (موثّق/خيالي) إلزامي.
"""
import argparse, importlib.util, json, os, re, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'scripts', 'kids', 'src')
OUT = os.path.join(ROOT, 'data', 'kids')
spec = importlib.util.spec_from_file_location('quizbuild', os.path.join(ROOT, 'scripts', 'quiz', 'build.py'))
qb = importlib.util.module_from_spec(spec); spec.loader.exec_module(qb)

# الأقسام الخمسة عشر: (المعرّف، الاسم، الأيقونة، اللون، الوصف، الأقسام الفرعية)
CATS = [
    ('quran', 'القرآن الكريم للأطفال', '📖', '#0f8a5f', 'قصص القرآن ومعاني الكلمات وتعلّم القراءة والحفظ', ['قصص القرآن', 'شرح السور', 'معاني الكلمات', 'الحروف والتجويد', 'الحفظ']),
    ('anbiya', 'قصص الأنبياء', '⛵', '#1f7a8c', 'قصص الأنبياء كما وردت في القرآن والسنة الصحيحة', []),
    ('seerah', 'السيرة النبوية', '🌴', '#b07d2b', 'حياة النبي ﷺ من المولد إلى الوفاة', ['المولد والطفولة', 'الوحي والدعوة', 'الهجرة والمدينة', 'الأخلاق والشمائل']),
    ('sahaba', 'الصحابة والصحابيات', '🛡️', '#6a4c93', 'سير الصحابة ومواقفهم مع النبي ﷺ', ['الخلفاء الراشدون', 'العشرة المبشرون', 'الصحابيات', 'كبار الصحابة']),
    ('ibadat', 'العقيدة والعبادات', '🕌', '#2d6a4f', 'أركان الإسلام والإيمان والعبادات خطوة بخطوة', ['أركان الإسلام', 'أركان الإيمان', 'الطهارة والصلاة', 'الصيام والزكاة والحج', 'الأذكار']),
    ('akhlaq', 'الأخلاق والآداب', '🤝', '#e07a5f', 'دروس الأخلاق بقصص قصيرة ومواقف عملية', ['الأخلاق', 'الآداب']),
    ('science', 'العلوم والاكتشافات', '🔭', '#3a86ff', 'الفضاء وجسم الإنسان والحيوانات والنباتات والتجارب الآمنة', ['الفضاء والفلك', 'جسم الإنسان', 'عالم الحيوان', 'عالم النبات', 'الفيزياء والكيمياء', 'التكنولوجيا']),
    ('history', 'التاريخ والحضارات', '🏛️', '#9c6644', 'الحضارات والعلماء والمعالم عبر الزمن', ['الحضارة الإسلامية', 'الحضارات القديمة', 'تاريخ العلوم']),
    ('geo', 'الجغرافيا والعالم', '🌍', '#2a9d8f', 'القارات والمحيطات والدول والعواصم', ['القارات والمحيطات', 'الدول والعواصم', 'التضاريس والمناخ']),
    ('arabic', 'اللغة العربية', '✍️', '#d62828', 'الحروف والقراءة والكتابة والمفردات', ['الحروف', 'القراءة', 'المفردات', 'القواعد']),
    ('stories', 'القصص والحكايات', '📚', '#8338ec', 'قصص تربوية وقصص قبل النوم (مع تمييز الخيالي من الموثّق)', ['قصص تربوية', 'قصص قبل النوم', 'قصص علمية']),
    ('people', 'الشخصيات والأعلام', '🧑‍🔬', '#457b9d', 'علماء ومخترعون ومستكشفون وإنجازاتهم', ['العلماء المسلمون', 'المخترعون', 'المستكشفون']),
    ('occasions', 'المناسبات الإسلامية', '🌙', '#c9a227', 'رمضان والعيدان والحج والأيام الفاضلة', []),
    ('puzzles', 'الألغاز والذكاء', '🧩', '#ef476f', 'ألغاز وتحديات تفكير وألعاب ذاكرة', []),
    ('skills', 'المهارات والحياة', '🎯', '#06a77d', 'إدارة الوقت والسلامة والتفكير وحل المشكلات', []),
]
CAT_IDS = [c[0] for c in CATS]
KINDS = {'موثق', 'خيالي', 'علمي'}

def die(m): print('✗', m, file=sys.stderr); sys.exit(1)

def check_text(where, s):
    raw = qb.REF.sub('', s)
    if re.search('[ٱۡ۟ۥۦۜ]', raw): die(f'{where}: نص قرآني مكتوب يدوياً؛ استخدم ⟦سورة:آية⟧')

def load(q, bukhari, muslim, stats):
    items, seen = [], set()
    for cat in sorted(os.listdir(SRC)):
        d = os.path.join(SRC, cat)
        if not os.path.isdir(d): continue
        if cat not in CAT_IDS: die(f'مجلد قسم غير معروف: {cat}')
        for fn in sorted(os.listdir(d)):
            if not fn.endswith('.json'): continue
            data = json.load(open(os.path.join(d, fn), encoding='utf-8'))
            for it in (data if isinstance(data, list) else [data]):
                w = f'{cat}/{fn}:{it.get("id")}'
                for k in ('id', 'title', 'kind', 'age', 'level', 'intro'):
                    if k not in it: die(f'{w}: الحقل {k} ناقص')
                if it['id'] in seen: die(f'{w}: معرّف مكرر')
                seen.add(it['id'])
                if it['kind'] not in KINDS: die(f'{w}: النوع يجب أن يكون موثق أو خيالي أو علمي')
                a = it['age']
                if not (isinstance(a, list) and len(a) == 2 and 3 <= a[0] <= a[1] <= 15): die(f'{w}: العمر يجب أن يكون [من، إلى] بين ٣ و١٥')
                if it['level'] not in (1, 2, 3): die(f'{w}: مستوى الصعوبة ١ أو ٢ أو ٣')
                if it['kind'] != 'خيالي' and (not it.get('sources') or not it.get('reviewed')): die(f'{w}: المصادر وتاريخ المراجعة إلزاميان للمحتوى الموثّق والعلمي')
                if it.get('sub') and it['sub'] not in dict((c[0], c[5]) for c in CATS)[cat]: die(f'{w}: قسم فرعي غير معروف {it["sub"]}')
                # التحقق من كل النصوص وتوسيع مراجع الآيات
                def ex(s, bare=False):
                    check_text(w, s)
                    return qb.expand_bare(q, s) if bare else qb.expand(q, s)
                row = {k: it[k] for k in ('id', 'title', 'kind', 'age', 'level') if k in it}
                row['cat'] = cat
                for k in ('sub', 'icon', 'tags', 'sources', 'reviewed', 'media', 'author'):
                    if k in it: row[k] = it[k]
                row['intro'] = ex(it['intro'])
                if 'sections' in it:
                    row['sections'] = [{'h': s.get('h', ''), 'p': [ex(p) for p in s['p']]} for s in it['sections']]
                if 'steps' in it:
                    row['steps'] = [{'t': s['t'], 'd': ex(s.get('d', ''))} for s in it['steps']]
                if 'facts' in it: row['facts'] = it['facts']
                if 'lessons' in it: row['lessons'] = [ex(x) for x in it['lessons']]
                if 'situation' in it:
                    s = it['situation']
                    if len(s['o']) < 2 or not (0 <= s['a'] < len(s['o'])): die(f'{w}: موقف عملي غير صحيح')
                    row['situation'] = {'story': ex(s['story']), 'q': s['q'], 'o': s['o'], 'a': s['a'], 'e': ex(s.get('e', ''))}
                ev = []
                for v in it.get('verses', []):
                    su, ay = v['q'][0], v['q'][1]; a2 = v['q'][2] if len(v['q']) > 2 else None
                    t = ' '.join(q.text(su, x) for x in range(ay, a2 + 1)) if a2 else q.text(su, ay, v.get('w'))
                    ev.append({'k': 'q', 'x': t, 'r': q.ref(su, ay, a2)}); stats['verses'] += 1
                for h in it.get('hadith', []):
                    src = h['src']; need = []
                    if 'البخاري' in src or 'متفق عليه' in src: need.append(('البخاري', bukhari, h.get('hb', h['h'])))
                    if 'مسلم' in src or 'متفق عليه' in src: need.append(('مسلم', muslim, h.get('hm', h['h'])))
                    for nm, book, txt in need:
                        if book.texts is None: die(f'{w}: يلزم نص {nm} للتحقق')
                        if not book.has(txt): die(f'{w}: لفظ الحديث غير موجود في {nm}: {txt}')
                        stats['hadith'] += 1
                    if not h.get('g'): die(f'{w}: يلزم ذكر درجة الحديث')
                    ev.append({'k': 'h', 'x': h['h'], 'r': src, 'g': h['g']})
                if ev: row['evidence'] = ev
                qz = []
                for i, x in enumerate(it.get('quiz', [])):
                    if len(x['o']) < 2 or not (0 <= x['a'] < len(x['o'])): die(f'{w}: سؤال {i} غير صحيح')
                    for o in x['o']:
                        check_text(w, o)
                        if len(qb.norm(o).split()) >= 4 and qb.norm(o) not in qb.DHIKR_OK and q.contains(o): die(f'{w}: الاختيار «{o}» نص قرآني مكتوب يدوياً')
                    qz.append({'q': ex(x['q']), 'o': [ex(o, True) for o in x['o']], 'a': x['a'], 'e': ex(x.get('e', ''))})
                if qz: row['quiz'] = qz
                if 'cards' in it: row['cards'] = it['cards']
                items.append(row)
    return items

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--quran', required=True); ap.add_argument('--bukhari'); ap.add_argument('--muslim')
    a = ap.parse_args()
    q = qb.Quran(a.quran); bukhari, muslim = qb.Sahih(a.bukhari), qb.Sahih(a.muslim)
    stats = defaultdict(int)
    items = load(q, bukhari, muslim, stats)
    os.makedirs(OUT, exist_ok=True)
    by = defaultdict(list)
    for it in items: by[it['cat']].append(it)
    index = {'v': 1, 'total': len(items), 'cats': [], 'items': []}
    for cid, name, ic, color, desc, subs in CATS:
        lst = by.get(cid, [])
        json.dump(lst, open(os.path.join(OUT, f'{cid}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        index['cats'].append({'id': cid, 'n': name, 'ic': ic, 'color': color, 'desc': desc, 'subs': subs, 'count': len(lst)})
        for it in lst:  # فهرس مختصر للبحث والصفحة الرئيسية دون تحميل كل المحتوى
            index['items'].append({'id': it['id'], 'c': cid, 't': it['title'], 'k': it['kind'], 'age': it['age'], 'l': it['level'],
                                   'ic': it.get('icon', ic), 'sub': it.get('sub', ''), 'tags': it.get('tags', []),
                                   'm': sorted({'نص'} | ({'اختبار'} if it.get('quiz') else set()) | ({'خطوات'} if it.get('steps') else set()) | ({'بطاقات'} if it.get('cards') else set()) | ({'آيات'} if any(e['k'] == 'q' for e in it.get('evidence', [])) else set())),
                                   'x': (it['intro'][:140])})
    json.dump(index, open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('✓ مواد الموسوعة', len(items), dict(stats))
    for c in index['cats']: print(f"  {c['ic']} {c['n']}: {c['count']}")

if __name__ == '__main__':
    main()
