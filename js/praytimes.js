/* حساب مواقيت الصلاة فلكياً بدون إنترنت
 * مبني على الخوارزمية القياسية لحساب مواقع الشمس (Astronomical Algorithms)
 */
const PrayTimes = (() => {
  const dtr = (d) => (d * Math.PI) / 180;
  const rtd = (r) => (r * 180) / Math.PI;
  const sin = (d) => Math.sin(dtr(d));
  const cos = (d) => Math.cos(dtr(d));
  const tan = (d) => Math.tan(dtr(d));
  const arcsin = (x) => rtd(Math.asin(x));
  const arccos = (x) => rtd(Math.acos(x));
  const arctan2 = (y, x) => rtd(Math.atan2(y, x));
  const arccot = (x) => rtd(Math.atan(1 / x));
  const fix = (a, b) => {
    a = a - b * Math.floor(a / b);
    return a < 0 ? a + b : a;
  };

  // طرق الحساب: زاوية الفجر، والعشاء (زاوية أو دقائق بعد المغرب)
  const METHODS = {
    egypt: { name: 'الهيئة المصرية العامة للمساحة', fajr: 19.5, isha: 17.5 },
    makkah: { name: 'أم القرى - مكة المكرمة', fajr: 18.5, ishaMin: 90 },
    mwl: { name: 'رابطة العالم الإسلامي', fajr: 18, isha: 17 },
    karachi: { name: 'جامعة العلوم الإسلامية - كراتشي', fajr: 18, isha: 18 },
    isna: { name: 'أمريكا الشمالية (ISNA)', fajr: 15, isha: 15 },
    gulf: { name: 'منطقة الخليج', fajr: 19.5, ishaMin: 90 },
    kuwait: { name: 'الكويت', fajr: 18, isha: 17.5 },
    qatar: { name: 'قطر', fajr: 18, ishaMin: 90 },
    france: { name: 'اتحاد المنظمات الإسلامية بفرنسا', fajr: 12, isha: 12 },
  };

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    const D = jd - 2451545.0;
    const g = fix(357.529 + 0.98560028 * D, 360);
    const q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * sin(g) + 0.02 * sin(2 * g), 360);
    const e = 23.439 - 0.00000036 * D;
    const RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
    return { decl: arcsin(sin(e) * sin(L)), eqt: q / 15 - fix(RA, 24) };
  }

  /**
   * يحسب المواقيت لتاريخ معين (سنة، شهر 1-12، يوم) بالتوقيت العالمي.
   * يُرجع كائنات Date حقيقية.
   */
  function compute(y, m, d, lat, lng, methodKey = 'egypt', asrFactor = 1) {
    const method = METHODS[methodKey] || METHODS.egypt;
    const jd = julian(y, m, d) - lng / (15 * 24);

    const midDay = (t) => fix(12 - sunPosition(jd + t).eqt, 24);
    const angleTime = (angle, t, ccw) => {
      const decl = sunPosition(jd + t).decl;
      const noon = midDay(t);
      const T = arccos((-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat))) / 15;
      return noon + (ccw ? -T : T);
    };
    const asrTime = (factor, t) => {
      const decl = sunPosition(jd + t).decl;
      const angle = -arccot(factor + tan(Math.abs(lat - decl)));
      return angleTime(angle, t);
    };

    let t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, isha: 18 };
    for (let i = 0; i < 2; i++) {
      t = {
        fajr: angleTime(method.fajr, t.fajr / 24, true),
        sunrise: angleTime(0.833, t.sunrise / 24, true),
        dhuhr: midDay(t.dhuhr / 24),
        asr: asrTime(asrFactor, t.asr / 24),
        sunset: angleTime(0.833, t.sunset / 24),
        isha: method.isha ? angleTime(method.isha, t.isha / 24) : t.isha,
      };
    }

    // معالجة خطوط العرض العليا (طريقة نسبة الزاوية من الليل)
    const night = 24 - (t.sunset - t.sunrise);
    const fajrLimit = t.sunrise - (method.fajr / 60) * night;
    if (isNaN(t.fajr) || t.fajr < fajrLimit) t.fajr = fajrLimit;
    if (method.ishaMin) {
      t.isha = t.sunset + method.ishaMin / 60;
    } else {
      const ishaLimit = t.sunset + (method.isha / 60) * night;
      if (isNaN(t.isha) || t.isha > ishaLimit) t.isha = ishaLimit;
    }

    const base = Date.UTC(y, m - 1, d);
    const toDate = (h) => new Date(base + (h - lng / 15) * 3600000);
    return {
      fajr: toDate(t.fajr),
      sunrise: toDate(t.sunrise),
      dhuhr: toDate(t.dhuhr + 1 / 60), // دقيقة احتياط بعد الزوال
      asr: toDate(t.asr),
      maghrib: toDate(t.sunset),
      isha: toDate(t.isha),
    };
  }

  // اتجاه القبلة بالدرجات من الشمال الجغرافي
  function qibla(lat, lng) {
    const kLat = 21.4225, kLng = 39.8262;
    const dLng = kLng - lng;
    return fix(arctan2(sin(dLng), cos(lat) * tan(kLat) - sin(lat) * cos(dLng)), 360);
  }

  // المسافة إلى مكة بالكيلومتر
  function distanceToMakkah(lat, lng) {
    const R = 6371, kLat = 21.4225, kLng = 39.8262;
    const a = sin((kLat - lat) / 2) ** 2 + cos(lat) * cos(kLat) * sin((kLng - lng) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  return { compute, qibla, distanceToMakkah, METHODS };
})();

if (typeof module !== 'undefined') module.exports = PrayTimes;
