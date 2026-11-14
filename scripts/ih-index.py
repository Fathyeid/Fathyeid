#!/usr/bin/env python3
"""يبني فهرس المكتبة الموحّدة من IslamHouse (دار الإسلام): كتب وصوتيات ومرئيات في تصنيفات الموسوعات والأكاديمية.
يحفظ data/lib-index.json (عنوان، نوع، مؤلفون، أقسام، وصف مختصر) — التفاصيل والمرفقات تُجلب عند الفتح من get-item."""
import json, os, sys, time, urllib.request
B = 'https://api3.islamhouse.com/v3/paV29H2gm56kvLPy'
SECTIONS = {
    'masajid': [279, 294, 496, 614], 'ulama': [618, 31, 117, 487], 'tarikh': [612, 795, 657], 'akhirah': [95, 242, 243],
    'aqeedah': [34, 627, 135], 'tafsir': [15, 20, 625], 'hadith': [30], 'tajweed': [626], 'usul': [462, 644, 463, 464],
    'fiqh': [646, 454, 780], 'lugha': [619, 621], 'mutoon': [764],
}
TYPES = {'books': 'b', 'audios': 'a', 'videos': 'v'}
def get(u):
    for i in range(4):
        try:
            with urllib.request.urlopen(u, timeout=40) as r: return json.load(r)
        except Exception as e: print('retry', e, u[-60:], file=sys.stderr); time.sleep(2 + i * 3)
    return {}
items = {}
for sec, cats in SECTIONS.items():
    for cat in cats:
        for typ, y in TYPES.items():
            page = 1
            while page <= 40:
                d = get(f'{B}/main/get-category-items/{cat}/{typ}/ar/ar/{page}/50/json')
                data = d.get('data') or []
                if isinstance(data, dict): data = list(data.values())
                data = [it for it in data if isinstance(it, dict) and it.get('id')]
                if page == 1: print(' ', sec, cat, typ, 'total', (d.get('links') or {}).get('total_items'), 'got', len(data), flush=True)
                for it in data:
                    if it.get('translated_language', 'ar') != 'ar': continue
                    x = items.setdefault(it['id'], {'id': it['id'], 't': (it.get('title') or '').strip(), 'y': y,
                        'au': [p.get('title', '').strip() for p in (it.get('prepared_by') or []) if p.get('kind') == 'author' or p.get('type') == 'author'][:3],
                        'd': (it.get('description') or '').strip()[:220], 'img': it.get('image'), 'n': it.get('num_attachments'), 's': []})
                    if sec not in x['s']: x['s'].append(sec)
                links = d.get('links') or {}
                if not data or page >= int(links.get('pages_number') or 1): break
                page += 1; time.sleep(.15)
        print(sec, cat, len(items), flush=True)
os.makedirs('data', exist_ok=True)
out = {'source': 'IslamHouse — دار الإسلام (islamhouse.com)', 'fetched': time.strftime('%Y-%m-%d'), 'items': sorted(items.values(), key=lambda x: -x['id'])}
json.dump(out, open('data/lib-index.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('TOTAL', len(items), {y: sum(1 for i in items.values() if i['y'] == y) for y in 'bav'})
