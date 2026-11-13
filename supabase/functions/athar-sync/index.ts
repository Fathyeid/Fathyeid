// تطبيق «أثر»: مزامنة فهرس المكتبة الدعوية من الخلاصات العامة (RSS) للقنوات الرسمية على يوتيوب
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

Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: channels, error } = await sb.from('athar_channels').select('channel_id, sheikh').eq('active', true);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const report: unknown[] = [];
  for (const ch of channels ?? []) {
    try {
      const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channel_id}`, { headers: { 'User-Agent': 'AtharApp/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const entries = xml.split('<entry>').slice(1);
      const rows = entries.map((e) => {
        const title = pick(e, /<title>([\s\S]*?)<\/title>/);
        const description = pick(e, /<media:description>([\s\S]*?)<\/media:description>/).slice(0, 600);
        return {
          video_id: pick(e, /<yt:videoId>([^<]+)<\/yt:videoId>/),
          channel_id: ch.channel_id,
          sheikh: ch.sheikh,
          title,
          description,
          published_at: pick(e, /<published>([^<]+)<\/published>/) || null,
          topics: classify(title),
          updated_at: new Date().toISOString(),
        };
      }).filter((r) => r.video_id && r.title);
      const { error: upErr } = await sb.from('athar_videos').upsert(rows, { onConflict: 'video_id' });
      if (upErr) throw new Error(upErr.message);
      await sb.from('athar_channels').update({ last_synced: new Date().toISOString() }).eq('channel_id', ch.channel_id);
      await sb.from('athar_sync_runs').insert({ channel_id: ch.channel_id, fetched: entries.length, upserted: rows.length });
      report.push({ channel: ch.channel_id, fetched: entries.length, upserted: rows.length });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sb.from('athar_sync_runs').insert({ channel_id: ch.channel_id, error: msg });
      report.push({ channel: ch.channel_id, error: msg });
    }
  }
  return new Response(JSON.stringify({ ok: true, report }), { headers: { 'Content-Type': 'application/json' } });
});
