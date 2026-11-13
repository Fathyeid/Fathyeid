// تطبيق «أثر»: مزامنة فهرس المكتبة الدعوية من القنوات الرسمية على يوتيوب
// - بمفتاح YouTube Data API (محفوظ مشفّراً في Vault): كل الفيديوهات + قوائم التشغيل (السلاسل) + المدة
// - بدون مفتاح: الخلاصات العامة (RSS) لآخر ١٥ فيديو
// لا يُنزَّل أي فيديو؛ تُحفظ العناوين والتواريخ والتصنيف فقط
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const TOPICS: Record<string, string[]> = {
  aqeedah: ['عقيد', 'توحيد', 'الشرك', 'أسماء الله', 'اسماء الله', 'صفات الله', 'القدر', 'قدره', 'قضاء الله', 'الإيمان بالله', 'العروة الوثقى', 'لا إله إلا الله', 'العرش', 'العليم', 'القدير', 'الرحمن الرحيم', 'الأسماء الحسنى'],
  seerah: ['السيرة', 'سيرة', 'النبي ﷺ', 'رسول الله', 'غزوة', 'الهجرة', 'النبوية', 'حياة النبي', 'هدي النبي', 'حادثة الإفك', 'الإفك'],
  tawbah: ['توب', 'تائب', 'استغفار', 'الاستغفار', 'المعاصي', 'معصية', 'الذنوب', 'ذنوب', 'ذنب', 'الرجوع إلى الله', 'لا تقنطوا', 'رحمة الله', 'برحمتك', 'المغفرة'],
  tazkiyah: ['تزكية', 'النفس', 'نفسك', 'الإخلاص', 'الرياء', 'الكبر', 'العجب', 'الحسد', 'مجاهدة', 'الهوى', 'المهلكات', 'منهاج القاصدين', 'التفكر', 'انشغل بنفسك'],
  prophets: ['قصص الأنبياء', 'الأنبياء', 'موسى', 'يوسف', 'إبراهيم', 'ابراهيم', 'نوح', 'عيسى', 'يونس', 'آدم', 'سليمان', 'داود', 'أيوب', 'يعقوب', 'زكريا', 'لوط'],
  sahaba: ['الصحابة', 'صحابي', 'الصحابي', 'أبو بكر', 'ابو بكر', 'عمر بن الخطاب', 'عثمان بن عفان', 'علي بن أبي طالب', 'خالد بن الوليد', 'بلال', 'رضي الله عنه', 'رضي الله عنها', 'أمهات المؤمنين', 'أبو ذر', 'أبا ذر', 'فاطمة', 'عائشة', 'خديجة'],
  akhirah: ['الآخرة', 'الاخرة', 'الجنة', 'النار', 'جهنم', 'القبر', 'القيامة', 'القارعة', 'الموت', 'الحساب', 'البرزخ', 'الصراط', 'الميزان', 'الحشر', 'خير وأبقى'],
  fitan: ['فتن', 'الفتنة', 'فتنة', 'الدجال', 'آخر الزمان', 'اخر الزمان', 'علامات الساعة', 'الملاحم', 'المهدي', 'أشراط الساعة'],
  akhlaq: ['أخلاق', 'اخلاق', 'الخلق', 'حسن الخلق', 'الصدق', 'الكذب', 'الغيبة', 'النميمة', 'بر الوالدين', 'الأمانة', 'اللسان', 'الظلم', 'الغضب', 'البخل', 'الكرم', 'الآداب', 'آداب', 'الأرحام', 'الصاحب', 'حقوق العباد', 'السلام'],
  tarbiyah: ['تربية', 'التربية', 'الأبناء', 'الابناء', 'الأولاد', 'الاولاد', 'الأسرة', 'الزواج', 'الزوجة', 'زوجك', 'زوجتك', 'الزوج', 'المرأة', 'الشباب', 'البنات', 'البيت المسلم', 'قدوتك'],
  qalb: ['القلب', 'قلب', 'القلوب', 'قلوب', 'قسوة', 'صحة القلب', 'أمراض القلوب', 'الخشوع', 'المراقبة', 'المراقبه', 'ينظر إليك', 'الخلوات', 'اطمئن'],
  iman: ['إيمان', 'الإيمان', 'ايمان', 'يقين', 'اليقين', 'الصلاة', 'الذكر', 'الدعاء', 'دعاء', 'الاستخارة', 'رمضان', 'القرآن', 'تدبر', 'سورة', 'التوكل', 'ثق بالله', 'الصبر', 'الشكر', 'الرضا', 'محبة الله', 'الاستقامة', 'تستقيم', 'الخطب', 'خطبة'],
};
function classify(text: string): string[] {
  const out = Object.entries(TOPICS).filter(([, kws]) => kws.some((k) => text.includes(k))).map(([t]) => t);
  return out.length ? out : ['iman'];
}
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const pick = (block: string, re: RegExp) => { const m = re.exec(block); return m ? decode(m[1]).trim() : ''; };
const dur = (iso?: string) => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || ''); return m ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : null; };
const HIDDEN = new Set(['Private video', 'Deleted video']);

Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: key } = await sb.rpc('athar_get_yt_key');
  // تحديث أسبوعي للسلاسل حتى تُضاف الحلقات الجديدة إلى سلاسلها
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: stale } = await sb.from('athar_channels').select('channel_id').eq('active', true).eq('playlists_done', true).lt('playlists_refreshed_at', weekAgo);
  for (const s of stale ?? []) {
    await sb.from('athar_channels').update({ playlists_done: false, playlists_token: null, playlists_refreshed_at: new Date().toISOString() }).eq('channel_id', s.channel_id);
    await sb.from('athar_playlists').update({ items_done: false, items_token: null }).eq('channel_id', s.channel_id);
  }
  const { data: channels, error } = await sb.from('athar_channels').select('*').eq('active', true);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const report: Record<string, unknown>[] = [];
  let calls = 0;
  const MAX_CALLS = 140; // حدّ لكل تشغيل حتى لا تنتهي مهلة الوظيفة؛ الباقي يُستكمل في التشغيل التالي

  const yt = async (path: string, params: Record<string, string>) => {
    calls++;
    const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...params, key })}`);
    const j = await res.json();
    if (!res.ok) throw new Error(`YouTube ${res.status}: ${j?.error?.message || ''}`);
    return j;
  };
  // حفظ دفعة فيديوهات من عناصر قائمة تشغيل مع جلب مدتها
  // deno-lint-ignore no-explicit-any
  const saveItems = async (ch: { channel_id: string; sheikh: string }, items: any[]) => {
    const vis = items.filter((it) => !HIDDEN.has(it.snippet?.title) && it.contentDetails?.videoId);
    if (!vis.length) return 0;
    const ids = vis.map((it) => it.contentDetails.videoId);
    const det = await yt('videos', { part: 'contentDetails', id: ids.join(','), maxResults: '50' });
    // deno-lint-ignore no-explicit-any
    const dmap = Object.fromEntries((det.items || []).map((v: any) => [v.id, dur(v.contentDetails?.duration)]));
    const rows = vis.filter((it) => dmap[it.contentDetails.videoId] !== undefined).map((it) => ({
      video_id: it.contentDetails.videoId,
      channel_id: ch.channel_id,
      sheikh: ch.sheikh,
      title: it.snippet.title,
      description: (it.snippet.description || '').slice(0, 600),
      published_at: it.contentDetails.videoPublishedAt || it.snippet.publishedAt,
      topics: classify(it.snippet.title),
      duration_s: dmap[it.contentDetails.videoId],
      updated_at: new Date().toISOString(),
    }));
    if (rows.length) { const { error: e } = await sb.from('athar_videos').upsert(rows, { onConflict: 'video_id' }); if (e) throw new Error(e.message); }
    return rows.length;
  };

  for (const ch of channels ?? []) {
    const r: Record<string, unknown> = { channel: ch.channel_id };
    try {
      if (!key) {
        // بدون مفتاح: آخر ١٥ فيديو من الخلاصة العامة
        const xml = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channel_id}`)).text();
        const rows = xml.split('<entry>').slice(1).map((e) => {
          const title = pick(e, /<title>([\s\S]*?)<\/title>/);
          return { video_id: pick(e, /<yt:videoId>([^<]+)<\/yt:videoId>/), channel_id: ch.channel_id, sheikh: ch.sheikh, title, description: pick(e, /<media:description>([\s\S]*?)<\/media:description>/).slice(0, 600), published_at: pick(e, /<published>([^<]+)<\/published>/) || null, topics: classify(title), updated_at: new Date().toISOString() };
        }).filter((x) => x.video_id && x.title);
        await sb.from('athar_videos').upsert(rows, { onConflict: 'video_id' });
        r.rss = rows.length;
      } else {
        const uploads = 'UU' + ch.channel_id.slice(2);
        // ١) الأحدث دائماً (الصفحة الأولى)
        const first = await yt('playlistItems', { part: 'snippet,contentDetails', playlistId: uploads, maxResults: '50' });
        r.latest = await saveItems(ch, first.items || []);
        r.total = first.pageInfo?.totalResults;
        const upd: Record<string, unknown> = { last_synced: new Date().toISOString(), video_total: first.pageInfo?.totalResults ?? null };
        // ٢) استكمال الأرشيف القديم على دفعات
        let token = ch.uploads_done ? null : (ch.uploads_token || first.nextPageToken || null);
        let n = 0;
        while (token && calls < MAX_CALLS - 4) {
          const page = await yt('playlistItems', { part: 'snippet,contentDetails', playlistId: uploads, maxResults: '50', pageToken: token });
          n += await saveItems(ch, page.items || []);
          token = page.nextPageToken || null;
        }
        if (!ch.uploads_done) { upd.uploads_token = token; upd.uploads_done = !token; }
        r.backfilled = n;
        // ٣) قوائم التشغيل (السلاسل)
        if (!ch.playlists_done && calls < MAX_CALLS - 2) {
          let pt = ch.playlists_token || '';
          let pl = 0;
          do {
            const page = await yt('playlists', { part: 'snippet,contentDetails', channelId: ch.channel_id, maxResults: '50', ...(pt ? { pageToken: pt } : {}) });
            // deno-lint-ignore no-explicit-any
            const rows = (page.items || []).map((p: any) => ({ playlist_id: p.id, channel_id: ch.channel_id, sheikh: ch.sheikh, title: p.snippet.title, item_count: p.contentDetails?.itemCount ?? null, published_at: p.snippet.publishedAt, updated_at: new Date().toISOString() }));
            if (rows.length) await sb.from('athar_playlists').upsert(rows, { onConflict: 'playlist_id' });
            pl += rows.length;
            pt = page.nextPageToken || '';
          } while (pt && calls < MAX_CALLS - 2);
          upd.playlists_token = pt || null;
          upd.playlists_done = !pt;
          r.playlists = pl;
        }
        await sb.from('athar_channels').update(upd).eq('channel_id', ch.channel_id);
      }
      await sb.from('athar_sync_runs').insert({ channel_id: ch.channel_id, fetched: Number(r.latest ?? r.rss ?? 0), upserted: Number(r.backfilled ?? 0) });
    } catch (e) {
      r.error = e instanceof Error ? e.message : String(e);
      await sb.from('athar_sync_runs').insert({ channel_id: ch.channel_id, error: String(r.error) });
    }
    report.push(r);
  }

  // ٤) محتوى السلاسل (ترتيب الحلقات) على دفعات
  if (key && calls < MAX_CALLS - 2) {
    const { data: pls } = await sb.from('athar_playlists').select('playlist_id, items_token').eq('items_done', false).limit(40);
    let done = 0;
    for (const p of pls ?? []) {
      if (calls >= MAX_CALLS - 1) break;
      try {
        let t = p.items_token || '';
        do {
          const page = await yt('playlistItems', { part: 'contentDetails,snippet', playlistId: p.playlist_id, maxResults: '50', ...(t ? { pageToken: t } : {}) });
          // deno-lint-ignore no-explicit-any
          const rows = (page.items || []).filter((it: any) => it.contentDetails?.videoId && !HIDDEN.has(it.snippet?.title)).map((it: any) => ({ playlist_id: p.playlist_id, video_id: it.contentDetails.videoId, position: it.snippet.position }));
          if (rows.length) await sb.from('athar_playlist_items').upsert(rows, { onConflict: 'playlist_id,video_id' });
          t = page.nextPageToken || '';
        } while (t && calls < MAX_CALLS - 1);
        await sb.from('athar_playlists').update({ items_token: t || null, items_done: !t }).eq('playlist_id', p.playlist_id);
        if (!t) done++;
      } catch (_e) {
        await sb.from('athar_playlists').update({ items_done: true }).eq('playlist_id', p.playlist_id);
      }
    }
    report.push({ playlists_items_done: done });
  }
  return new Response(JSON.stringify({ ok: true, calls, report }), { headers: { 'Content-Type': 'application/json' } });
});
