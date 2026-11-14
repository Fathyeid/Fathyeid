#!/usr/bin/env python3
"""يجلب شجرة تصنيفات IslamHouse (العربية) ويحفظها في scripts/src/ih-tree.json"""
import json, urllib.request, time, os, sys
B = 'https://api3.islamhouse.com/v3/paV29H2gm56kvLPy'
def get(u):
    for i in range(3):
        try:
            with urllib.request.urlopen(u, timeout=40) as r: return json.load(r)
        except Exception as e: print('retry', u, e, file=sys.stderr); time.sleep(2)
    return None
top = get(f'{B}/categories/showall/ar/json')
out = []
def walk(c, depth):
    d = get(c['apiurl']) if c.get('apiurl') else None
    node = {'id': c.get('id'), 'sid': c.get('source_id'), 't': c.get('title'), 'api': c.get('apiurl')}
    if isinstance(d, dict):
        node['keys'] = list(d.keys())[:12]
        subs = d.get('sub_categories') or d.get('subcategories') or d.get('children') or []
        if depth < 3: node['sub'] = [walk(s, depth + 1) for s in subs]
    elif isinstance(d, list) and depth < 3:
        node['sub'] = [walk(s, depth + 1) for s in d if isinstance(s, dict)]
    time.sleep(.2)
    return node
for c in top: out.append(walk(c, 0))
os.makedirs('scripts/src', exist_ok=True)
json.dump({'top_raw': top[:3], 'tree': out}, open('scripts/src/ih-tree.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok', len(out))
