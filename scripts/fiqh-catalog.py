#!/usr/bin/env python3
"""يبني فهرس كتب الموسوعة الفقهية من بيانات OpenITI الحقيقية (رأس ملف كل كتاب + ملف yml).
لا تُكتب أي بيانات كتاب يدوياً عدا: المذهب/المجال (تصنيف) واختيار نسخة شاملة.
الاستخدام: python3 scripts/fiqh-catalog.py paths.txt > data/fiqh-catalog.json
paths.txt: قائمة مسارات مستودعات OpenITI (repo/data/...) — تُولَّد بـ git ls-tree.
"""
import json
import re
import sys
import urllib.request

# (مقطع المعرّف الفريد للكتاب في OpenITI, المذهب, المجال)
WANT = [
    ('Sarakhsi.Mabsut', 'hanafi', 'fiqh'),
    ('Kasani.BadaicSanaic', 'hanafi', 'fiqh'),
    ('Marghinani.HidayaFiSharhBidaya', 'hanafi', 'fiqh'),
    ('IbnHumam.FathQadir', 'hanafi', 'fiqh'),
    ('IbnCabidinDimashqi.RaddMukhtar', 'hanafi', 'fiqh'),
    ('IbnNujaymMisri.AshbahWaNazair', 'hanafi', 'qawaid'),
    ('SahnunIbnSacid.MudawwanaKubra', 'maliki', 'fiqh'),
    ('KhalilIbnIshaq.MukhtasarKhalil', 'maliki', 'fiqh'),
    ('IbnAhmadDasuqi.HashiyatCalaSharhKabir', 'maliki', 'fiqh'),
    ('Shafici.Umm', 'shafii', 'fiqh'),
    ('Nawawi.Majmuc', 'shafii', 'fiqh'),
    ('Nawawi.RawdatTalibin', 'shafii', 'fiqh'),
    ('TajDinSubki.AshbahWaNazair', 'shafii', 'qawaid'),
    ('Shafici.Risala', 'shafii', 'usul'),
    ('IbnQudamaMaqdisi.Mughni', 'hanbali', 'fiqh'),
    ('IbnQudamaMaqdisi.RawdatNazir', 'hanbali', 'usul'),
    ('IbnRushdHafid.BidayatMujtahid', 'muqaran', 'fiqh'),
    ('IbnTaymiyya.MajmucFatawa', 'hanbali', 'fatawa'),
    ('IbnTaymiyya.FatawaKubra', 'hanbali', 'fatawa'),
    ('IbnQayyimJawziyya.AclamMuwaqqicin', 'hanbali', 'usul'),
    ('Shatibi.Muwafaqat', 'maliki', 'usul'),
    ('IbnHajarCasqalani.BulughMaram', 'hadith', 'hadith'),
]
RAW = 'https://raw.githubusercontent.com/OpenITI/{repo}/master/{path}'


def get(url, rng=None):
    req = urllib.request.Request(url, headers={'Range': f'bytes=0-{rng}'} if rng else {})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')


def main():
    paths = [p.strip() for p in open(sys.argv[1], encoding='utf-8') if p.strip()]
    out = []
    for key, madhhab, field in WANT:
        cands = [p for p in paths if f'.{key.split(".")[-1]}.' in p and key.split('.')[0] in p and not p.endswith(('.yml', '.md', '.inProgress'))]
        # تفضيل نسخ «الشاملة» لاحتوائها على ترقيم الأجزاء والصفحات وبيانات الطبعة
        sham = [p for p in cands if re.search(r'\.Shamela\d', p)] or [p for p in cands if '.Sham' in p] or cands
        best = None
        for p in sham:
            repo, rest = p.split('/', 1)
            try:
                yml = get(RAW.format(repo=repo, path=re.sub(r'\.completed$', '', rest) + '.yml'))
            except Exception:
                continue
            m = re.search(r'#VERS#LENGTH###:\s*(\d+)', yml)
            words = int(m.group(1)) if m else 0
            if not best or words > best[1]:
                best = (p, words)
        if not best:
            print(f'!! not found: {key}', file=sys.stderr)
            continue
        p, words = best
        repo, rest = p.split('/', 1)
        head = get(RAW.format(repo=repo, path=rest), 6000)
        meta = {}
        for k, v in re.findall(r'#META# \d+\.(\w+)\s*::\s*(.*)', head):
            if k not in meta or meta[k].strip() in ('NODATA', 'NOTGIVEN', ''):
                meta[k] = v
        clean = lambda v: None if not v or v.strip() in ('NODATA', 'NOTGIVEN', 'NOCODE') else v.strip()
        uri = re.sub(r'\.completed$', '', rest.split('/')[-1])
        out.append({
            'uri': uri, 'repo': repo, 'path': rest, 'words': words, 'madhhab': madhhab, 'field': field,
            'title': clean(meta.get('BookTITLE')), 'author': clean(meta.get('AuthorNAME')), 'died': clean(meta.get('AuthorDIED')),
            'subject': clean(meta.get('BookSUBJ')), 'vols': clean(meta.get('BookVOLS')), 'editor': clean(meta.get('EdEDITOR')),
            'edition': clean(meta.get('EdNUMBER')), 'publisher': clean(meta.get('EdPUBLISHER')), 'place': clean(meta.get('EdPLACE')),
            'year': clean(meta.get('EdYEAR')), 'shamela': clean(meta.get('LibURL')),
            'pages': bool(re.search(r'PageV\d+P\d+', get(RAW.format(repo=repo, path=rest), 60000))),
        })
        print(f'ok {uri} {words}', file=sys.stderr)
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
