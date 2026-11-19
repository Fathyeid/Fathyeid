// تطبيق «أثر»: معلومات آخر إصدار للتحديث داخل التطبيق، ورابط ثابت لتحميل أحدث APK.
//   GET /athar-update          → { version_code, web_code, native_level, web_url, web_sha256, apk_url, ... }
//   GET /athar-update?dl=apk   → تحويل (302) إلى أحدث ملف APK (للروابط في صفحات المشاركة)
// المصدر: latest.json في Supabase Storage (تكتبه athar-publish بعد كل إصدار)، لأن مستودع GitHub خاص.
// عام وللقراءة فقط، ولا يستقبل أي بيانات من المستخدم.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type' };
const LATEST = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/athar-releases/latest.json`;
const TTL = 60 * 1000;
let cached: { at: number; data: Record<string, unknown> } | null = null;

async function latest() {
  if (cached && Date.now() - cached.at < TTL) return cached.data;
  try {
    const r = await fetch(`${LATEST}?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
    if (!r.ok) throw new Error('storage ' + r.status);
    const data = await r.json();
    if (!data.web_code && !data.version_code) throw new Error('empty manifest');
    cached = { at: Date.now(), data };
    return data;
  } catch (e) {
    if (cached) return { ...cached.data, stale: true }; // آخر رد ناجح
    throw e;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  try {
    const data = await latest();
    if (new URL(req.url).searchParams.get('dl') === 'apk' && data.apk_url) {
      return new Response(null, { status: 302, headers: { ...CORS, Location: String(data.apk_url), 'Cache-Control': 'no-store' } });
    }
    return Response.json(data, { headers: { ...CORS, 'Cache-Control': 'public, max-age=60' } });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502, headers: CORS });
  }
});
