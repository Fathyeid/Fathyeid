#!/usr/bin/env python3
"""يبني فهرس المكتبة الموحّدة من IslamHouse (دار الإسلام): كتب وصوتيات ومرئيات عربية في تصنيفات الموسوعات والأكاديمية.
- يمشي شجرة التصنيفات من الجذر (viewcat) ويأخذ معرّف كل تصنيف كما تعطيه الشجرة (هو المعرّف الذي تقبله get-category-items).
- يربط التصنيفات بأقسام التطبيق حسب عناوينها، ثم يجلب موادها (الكتب والصوتيات والمرئيات) مع الترقيم.
الناتج: data/lib-index.json — والتفاصيل والمرفقات تُجلب عند فتح المادة من get-item."""
import json, os, re, sys, time, urllib.request
B = 'https://api3.islamhouse.com/v3/paV29H2gm56kvLPy'
ROOT = 397053
# القسم ← أنماط عناوين التصنيفات (يُطابق العنوان أو أي عنوان أب في المسار)
RULES = [
    ('masajid', r'المسجد|المساجد|مكة والمدينة'),
    ('akhirah', r'اليوم الآخر|الجنائز|الموت|القيامة|البرزخ|الجنة والنار|أشراط الساعة'),
    ('ulama', r'تراجم|الصحابة|سير الأعلام|العلماء'),
    ('tarikh', r'^التاريخ$|السيرة النبوية|الحضارة الإسلامية|تاريخ'),
    ('tajweed', r'التجويد|القراءات'),
    ('usul', r'أصول الفقه|القواعد الفقهية|القواعد الأصولية'),
    ('hadith', r'^السنة$|مصطلح الحديث|علوم الحديث|شروح الحديث'),
    ('tafsir', r'^القرآن الكريم$|التفسير|علوم القرآن'),
    ('aqeedah', r'^العقيدة$'),
    ('fiqh', r'^فقه$|^الفقه$'),
    ('lugha', r'^اللغة العربية$'),
    ('mutoon', r'الدروس والمتون العلمية|^متون'),
]
TYPES = {'books': 'b', 'audios': 'a', 'videos': 'v'}
MAX_PER = 700

def get(u):
    for i in range(4):
        try:
            with urllib.request.urlopen(u, timeout=40) as r: return json.load(r)
        except Exception as e:
            print('retry', str(e)[:50], u[-70:], file=sys.stderr); time.sleep(2 + i * 3)
    return None

nodes = []
def walk(url, path, depth):
    lst = get(url)
    if not isinstance(lst, list): return
    for c in lst:
        if not isinstance(c, dict) or not c.get('id'): continue
        p = path + [c.get('title', '').strip()]
        nodes.append({'id': c['id'], 'path': p})
        api = c.get('apiurl') or ''
        if depth < 3 and c.get('datatype') == 'multicategories' and '/viewcat/' in api:
            walk(api, p, depth + 1)
        time.sleep(.1)
walk(f'{B}/categories/viewcat/{ROOT}/ar/showall/json', [], 0)
print('nodes', len(nodes), flush=True)

# اختيار التصنيفات: أعلى تصنيف مطابق في كل مسار (لتجنّب تكرار جلب الأبناء)
picked = {}
for n in nodes:
    for sec, rx in RULES:
        if re.search(rx, n['path'][-1]):
            # إن كان أحد الآباء مختاراً لنفس القسم فلا داعي للابن
            if any(re.search(rx, t) for t in n['path'][:-1]): break
            picked.setdefault(sec, []).append(n)
            break
for sec, l in picked.items(): print(sec, [(n['id'], ' > '.join(n['path'])) for n in l], flush=True)

items = {}
for sec, lst in picked.items():
    for n in lst:
        for typ, y in TYPES.items():
            page, got = 1, 0
            while got < MAX_PER:
                d = get(f'{B}/main/get-category-items/{n["id"]}/{typ}/ar/ar/{page}/50/json') or {}
                data = d.get('data') or []
                if isinstance(data, dict): data = list(data.values())
                data = [it for it in data if isinstance(it, dict) and it.get('id')]
                for it in data:
                    x = items.setdefault(it['id'], {'id': it['id'], 't': (it.get('title') or '').strip(), 'y': y,
                        'au': [p.get('title', '').strip() for p in (it.get('prepared_by') or []) if (p.get('kind') or p.get('type')) == 'author'][:3],
                        'd': re.sub(r'\s+', ' ', (it.get('description') or '')).strip()[:220], 'img': it.get('image'), 's': []})
                    if sec not in x['s']: x['s'].append(sec)
                got += len(data)
                links = d.get('links') or {}
                if not data or page >= int(links.get('pages_number') or 1): break
                page += 1; time.sleep(.12)
        print(sec, n['id'], n['path'][-1], 'items so far', len(items), flush=True)

os.makedirs('data', exist_ok=True)
out = {'source': 'IslamHouse — دار الإسلام (islamhouse.com)', 'fetched': time.strftime('%Y-%m-%d'),
       'cats': {sec: [' > '.join(n['path']) for n in l] for sec, l in picked.items()},
       'items': sorted(items.values(), key=lambda x: -x['id'])}
json.dump(out, open('data/lib-index.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('TOTAL', len(items), {y: sum(1 for i in items.values() if i['y'] == y) for y in 'bav'})
