// تطبيق «أثر»: يحوّل رابط بث radiojar (الذي يعيد التوجيه إلى http) إلى رابط https آمن يعمل داخل التطبيق.
// عام وللقراءة فقط، ومقصور على محطات stream.radiojar.com (ليس وكيلاً عاماً).
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!/^[a-z0-9]{6,20}$/i.test(id)) return Response.json({ error: 'bad id' }, { status: 400, headers: CORS });
  try {
    const r = await fetch(`https://stream.radiojar.com/${id}`, { redirect: 'manual' });
    const loc = r.headers.get('location') || '';
    try { await r.body?.cancel(); } catch { /* */ }
    const u = new URL(loc);
    if (!/^n[0-9a-z]{1,3}\.radiojar\.com$/.test(u.hostname)) throw new Error('unexpected ' + u.hostname);
    u.protocol = 'https:';
    return Response.json({ url: u.toString() }, { headers: { ...CORS, 'Cache-Control': 'no-store' } });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502, headers: CORS });
  }
});
