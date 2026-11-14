/* صفحة المشاركة: تحدد المحتوى المطلوب وتفتحه في تطبيق أثر (أندرويد) أو في نسخة الويب */
(function () {
  'use strict';
  var SITE = 'https://fathyeid.github.io/Fathyeid/';
  var PKG = 'com.fathyeid.noor';
  var b = document.body; var q = new URLSearchParams(location.search);
  var base = b.getAttribute('data-base') || ''; var kind = b.getAttribute('data-kind');
  var route = base;
  if (kind === 'quran' && /^\d+$/.test(q.get('a') || '')) route = base + '/' + q.get('a');
  else if (kind === 'azkar' && /^\d+$/.test(q.get('i') || '')) route = base + '/' + q.get('i');
  else if (kind === 'any') { var r = q.get('r') || ''; route = /^[\w\-/%.]+$/.test(r) ? r : 'home'; }
  if (!route) route = 'home';
  var web = SITE + '#/' + route;
  var intent = 'intent://open?r=' + encodeURIComponent(route) + '#Intent;scheme=athar;package=' + PKG + ';S.browser_fallback_url=' + encodeURIComponent(web) + ';end';
  var android = /Android/i.test(navigator.userAgent);
  document.getElementById('web').href = web;
  document.getElementById('open').href = android ? intent : web;
  // معاينة نص الآية من مصدر القرآن المعتمد في التطبيق
  var m = route.match(/^surah\/(\d+)\/(\d+)$/);
  if (m) {
    fetch('https://api.alquran.cloud/v1/ayah/' + m[1] + ':' + m[2] + '/quran-uthmani').then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.data && d.data.text) { var p = document.getElementById('prev'); p.className = 'prev ayah'; p.textContent = '﴿' + d.data.text + '﴾'; var s = document.createElement('small'); s.textContent = d.data.surah.name + ' — الآية ' + d.data.numberInSurah; p.appendChild(s); }
    }).catch(function () {});
  }
  // محاولة فتح التطبيق تلقائياً على أندرويد، وإلا الانتقال لنسخة الويب على باقي الأجهزة
  setTimeout(function () { if (android) location.href = intent; else location.replace(web); }, android ? 400 : 1800);
})();
