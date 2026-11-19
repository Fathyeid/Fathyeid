#!/usr/bin/env python3
"""يولّد صفحات المشاركة s/ على GitHub Pages:
  s/index.html          رابط عام: ?r=<مسار داخل التطبيق>
  s/q/<n>.html          سورة (ومعها ?a=<رقم الآية>)
  s/z/<type>-<key>.html باب أذكار/أدعية (ومعه ?i=<رقم الذكر>)
لكل صفحة وسوم Open Graph (عنوان ووصف وصورة) لتظهر معاينة عند النشر على فيسبوك وواتساب،
ثم تفتح المحتوى نفسه في تطبيق أثر (athar://) أو في نسخة الويب.
الاستخدام: python3 scripts/build-share.py
"""
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://fathyeid.github.io/Fathyeid/'
OUT = os.path.join(ROOT, 's')
SIGN = 'تطبيق أثر — رفيق المسلم: صدقة جارية على روح المرحوم عيد فتحي أبو طالب'


def page(path, title, desc, base, kind):
    url = SITE + 's/' + path
    t, d = html.escape(title), html.escape(desc)
    return f'''<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{t}</title>
<meta name="description" content="{d}">
<meta property="og:type" content="website"><meta property="og:site_name" content="أثر — رفيق المسلم">
<meta property="og:title" content="{t}"><meta property="og:description" content="{d}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}icons/og-share.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="ar_AR">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#0b1610">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=Amiri+Quran&family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{'../' if '/' in path else ''}s.css">
</head><body data-base="{html.escape(base)}" data-kind="{kind}">
<main class="box"><div class="brand">أثر <small>رفيق المسلم</small></div>
<h1 id="t">{t}</h1><div id="prev" class="prev"></div>
<a class="btn" id="open" href="#">📲 افتح في تطبيق أثر</a>
<a class="btn ghost" id="web" href="{SITE}">🌐 افتحه في المتصفح</a>
<a class="btn ghost" id="dl" href="https://movodjdwghharkfrgqtv.supabase.co/functions/v1/athar-update?dl=apk">⬇️ حمّل التطبيق (أندرويد)</a>
<p class="note">{html.escape(SIGN)}</p></main>
<script src="{'../' if '/' in path else ''}open.js"></script>
</body></html>
'''


def main():
    os.makedirs(os.path.join(OUT, 'q'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'z'), exist_ok=True)
    meta = open(os.path.join(ROOT, 'js', 'quran-meta.js'), encoding='utf-8').read()
    names = re.findall(r"'([^']+)'", meta[meta.index('SURAH_NAMES'):meta.index('];', meta.index('SURAH_NAMES'))])
    assert len(names) == 114, len(names)
    for i, nm in enumerate(names, 1):
        open(os.path.join(OUT, 'q', f'{i}.html'), 'w', encoding='utf-8').write(
            page(f'q/{i}.html', f'سورة {nm} — اقرأها في تطبيق أثر', f'آية من سورة {nm} مع التفسير والتلاوة بأصوات كبار القراء. ' + SIGN, f'surah/{i}', 'quran'))
    az = open(os.path.join(ROOT, 'js', 'azkar-data.js'), encoding='utf-8').read()
    db = json.loads(az[az.index('{'):az.rindex('}') + 1])
    n = 0
    for typ in ('azkar', 'duas'):
        for c in db[typ]:
            k = c['k']
            if not re.fullmatch(r'[\w-]+', k):
                continue
            open(os.path.join(OUT, 'z', f'{typ}-{k}.html'), 'w', encoding='utf-8').write(
                page(f'z/{typ}-{k}.html', f"{c['t']} — تطبيق أثر", f"{c['t']} من حصن المسلم بالتخريج، مع العدّاد والتذكير. " + SIGN, f'azcat/{typ}/{k}', 'azkar'))
            n += 1
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(
        page('index.html', 'أثر — رفيق المسلم', 'القرآن والتفسير، الأذكار، الحديث، محاضرات الشيخ سمير مصطفى والشيخ أمجد سمير، والحاسبات الإسلامية. ' + SIGN, '', 'any'))
    print('surahs', len(names), 'azkar pages', n)


if __name__ == '__main__':
    main()
