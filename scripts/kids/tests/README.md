# اختبارات موسوعة الطفل (Playwright)

شغّل خادماً محلياً من جذر المستودع ثم الاختبار:

```bash
python3 -m http.server 8099 &
node scripts/kids/tests/full.js /tmp/shots   # كل الصفحات وكل المواد × ٣ مقاسات × ٣ مظاهر: أخطاء، تمدد أفقي، روابط داخلية، أزرار فارغة
node scripts/kids/tests/offline.js           # بعد تثبيت عامل الخدمة: الصفحات والخريطة والقاموس دون إنترنت
node scripts/kids/tests/perf.js              # زمن فتح الصفحات بمعالج أبطأ ×٤ وشبكة 3G، وأحجام الملفات
```

يحتاج `playwright` مثبّتاً مع متصفح Chromium.
