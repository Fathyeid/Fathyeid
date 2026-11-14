#!/usr/bin/env python3
"""يجلب من ويكيبيديا العربية (ترخيص CC BY-SA) بيانات مقالات الموسوعات المحددة في scripts/enc-titles.json:
العنوان الصحيح بعد التحويلات، معرّف الصفحة، المقدمة نصاً، صورة مصغّرة، الإحداثيات، تاريخ آخر تعديل.
الناتج: data/enc-wiki.json — يُشغَّل عبر GitHub Actions لأن بيئة التطوير لا تصل لويكيبيديا."""
import json, os, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {'User-Agent': 'AtharApp/1.0 (Islamic educational app; github.com/Fathyeid/Fathyeid)'}
T = json.load(open(os.path.join(ROOT, 'scripts/enc-titles.json'), encoding='utf-8'))

def api(params):
    q = urllib.parse.urlencode(dict(params, format='json', formatversion='2'))
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request('https://ar.wikipedia.org/w/api.php?' + q, headers=UA), timeout=40) as r:
                return json.load(r)
        except Exception as e:
            print('retry', e, file=sys.stderr); time.sleep(3 * (i + 1))
    raise SystemExit('failed')

def fetch(titles):
    out, missing = {}, []
    for i in range(0, len(titles), 20):
        batch = titles[i:i + 20]
        d = api({'action': 'query', 'redirects': 1, 'titles': '|'.join(batch), 'prop': 'extracts|pageimages|coordinates|info',
                 'exintro': 1, 'explaintext': 1, 'exlimit': 'max', 'piprop': 'thumbnail', 'pithumbsize': 480, 'colimit': 'max'})
        q = d.get('query', {})
        norm = {x['from']: x['to'] for x in q.get('normalized', [])}
        redir = {x['from']: x['to'] for x in q.get('redirects', [])}
        pages = {p['title']: p for p in q.get('pages', [])}
        for t in batch:
            t2 = redir.get(norm.get(t, t), norm.get(t, t))
            p = pages.get(t2)
            if not p or p.get('missing') or p.get('invalid'):
                missing.append(t); continue
            ext = (p.get('extract') or '').strip()
            out[t] = {
                'title': p['title'], 'id': p['pageid'], 'intro': ext[:1800],
                'img': (p.get('thumbnail') or {}).get('source'),
                'geo': [p['coordinates'][0]['lat'], p['coordinates'][0]['lon']] if p.get('coordinates') else None,
                'touched': p.get('touched'),
            }
        time.sleep(1)
    return out, missing

all_titles = list(T['mosques']) + [t for v in T['scholars'].values() for t in v] + list(T['history'])
data, missing = fetch(all_titles)
# المقدمات القصيرة جداً (صفحات توضيح) تُعدّ ناقصة
for t, v in list(data.items()):
    if len(v['intro']) < 80 or 'قد يشير إلى' in v['intro'] or 'يمكن أن يشير' in v['intro']:
        missing.append(t + ' (توضيح/قصير)'); del data[t]
os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
json.dump({'source': 'ويكيبيديا العربية — CC BY-SA 4.0', 'fetched': time.strftime('%Y-%m-%d'), 'pages': data},
          open(os.path.join(ROOT, 'data/enc-wiki.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('pages', len(data)); print('MISSING', json.dumps(missing, ensure_ascii=False))
