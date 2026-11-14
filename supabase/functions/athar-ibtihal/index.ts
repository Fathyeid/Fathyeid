// تطبيق «أثر»: فهرس الابتهالات الدينية من يوتيوب (بحث بمفتاح YouTube Data API المحفوظ في Vault)
// تُحفظ العناوين والمعرّفات فقط، والمشاهدة عبر مشغّل يوتيوب الرسمي داخل التطبيق؛ لا يُنزَّل أي فيديو.
// يعمل أسبوعياً (~٨٠٠ وحدة من حصة يوتيوب اليومية المجانية ١٠٬٠٠٠).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const MUNSHIDIN: Record<string, string> = {
  naqshbandi: 'ابتهالات الشيخ سيد النقشبندي',
  tobar: 'ابتهالات الشيخ نصر الدين طوبار',
  fashni: 'ابتهالات الشيخ طه الفشني',
  omran: 'ابتهالات الشيخ محمد عمران',
  toukhi: 'ابتهالات الشيخ محمد الطوخي',
  alimahmoud: 'ابتهالات الشيخ علي محمود',
  hilbawi: 'ابتهالات الشيخ محمد الهلباوي',
  general: 'ابتهالات دينية قبل الفجر',
};
const dur = (iso?: string) => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || ''); return m ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : null; };
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: key } = await sb.rpc('athar_get_yt_key');
  if (!key) return Response.json({ error: 'no key' }, { status: 500 });
  const report: Record<string, number | string> = {};
  for (const [m, q] of Object.entries(MUNSHIDIN)) {
    try {
      const u = new URL('https://www.googleapis.com/youtube/v3/search');
      Object.entries({ part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: '40', q, relevanceLanguage: 'ar', regionCode: 'EG', safeSearch: 'strict', key }).forEach(([k, v]) => u.searchParams.set(k, v as string));
      const r = await (await fetch(u)).json();
      if (r.error) throw new Error(r.error.message);
      const items = (r.items || []).filter((x: any) => x.id && x.id.videoId);
      const ids = items.map((x: any) => x.id.videoId);
      const durs: Record<string, number | null> = {};
      if (ids.length) {
        const v = await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids.join(',')}&key=${key}`)).json();
        (v.items || []).forEach((x: any) => { durs[x.id] = dur(x.contentDetails && x.contentDetails.duration); });
      }
      const rows = items
        .map((x: any, i: number) => ({ video_id: x.id.videoId, munshid: m, title: decode(x.snippet.title), channel_title: x.snippet.channelTitle, published_at: x.snippet.publishedAt, duration_s: durs[x.id.videoId] ?? null, rank: i, updated_at: new Date().toISOString() }))
        .filter((x: any) => !x.duration_s || (x.duration_s >= 60 && x.duration_s <= 3 * 3600));
      if (rows.length) {
        await sb.from('athar_ibtihal').delete().eq('munshid', m);
        const { error } = await sb.from('athar_ibtihal').upsert(rows, { onConflict: 'video_id' });
        if (error) throw error;
      }
      report[m] = rows.length;
    } catch (e) { report[m] = 'error: ' + String(e); }
  }
  return Response.json(report);
});
