// تطبيق «أثر» – موسوعة الطفل: نسخ احتياطي ومزامنة بيانات الأطفال برمز العائلة.
// لا بريد ولا حسابات: ولي الأمر يحتفظ برمز سري (ATHR-XXXX-XXXX-XXXX) يستعيد به البيانات على أي جهاز.
// نخزّن بصمة الرمز فقط. الجداول مغلقة أمام المفتاح العام، والوصول عبر هذه الدالة بمفتاح الخدمة.
//   POST { action: 'create' }                                  → { code }
//   POST { action: 'pull', code }                              → { parent, kids: [{ id, data, updated_at }] }
//   POST { action: 'push', code, parent?, kids: [{ id, data }] } → { ok }
//   POST { action: 'delkid', code, id }                        → { ok }   (ويُسجَّل في parent.removed حتى لا يعيده جهاز آخر)
//   POST { action: 'wipe', code }                              → { ok }   (حذف كل بيانات العائلة)
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // بلا حروف متشابهة (O/0، I/1، L)
const MAX_KIDS = 8, MAX_KID_BYTES = 256 * 1024, MAX_BODY = 2 * 1024 * 1024;
const J = (b: unknown, s = 200) => Response.json(b, { status: s, headers: CORS });

const norm = (c: unknown) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^ATHR/, '');
async function hash(code: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('athar-kids:' + code));
  return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
}
function newCode() {
  const r = crypto.getRandomValues(new Uint8Array(12));
  const s = Array.from(r, (x) => ABC[x % ABC.length]).join('');
  return { raw: s, pretty: `ATHR-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}` };
}
// حدّ بسيط لإنشاء الرموز من العنوان نفسه (لمنع الإغراق)
const hits = new Map<string, number[]>();
function limited(ip: string, n: number, ms: number) {
  const now = Date.now(); const a = (hits.get(ip) || []).filter((t) => now - t < ms);
  a.push(now); hits.set(ip, a); return a.length > n;
}
async function family(code: unknown) {
  const c = norm(code);
  if (c.length !== 12 || [...c].some((ch) => !ABC.includes(ch))) return null;
  const { data } = await db.from('athar_kids_families').select('id, parent').eq('code_hash', await hash(c)).maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return J({ error: 'method' }, 405);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'x';
  if (limited('all:' + ip, 120, 60_000)) return J({ error: 'rate' }, 429);
  let body: Record<string, unknown>;
  try { const t = await req.text(); if (t.length > MAX_BODY) return J({ error: 'too_big' }, 413); body = JSON.parse(t); } catch { return J({ error: 'bad_json' }, 400); }
  try {
    const action = body.action;
    if (action === 'create') {
      if (limited('create:' + ip, 5, 3600_000)) return J({ error: 'rate' }, 429);
      const c = newCode();
      const { error } = await db.from('athar_kids_families').insert({ code_hash: await hash(c.raw) });
      if (error) throw error;
      return J({ code: c.pretty });
    }
    const fam = await family(body.code);
    if (!fam) return J({ error: 'not_found' }, 404);
    if (action === 'pull') {
      const { data, error } = await db.from('athar_kids_children').select('kid_id, data, updated_at').eq('family_id', fam.id);
      if (error) throw error;
      return J({ parent: fam.parent, kids: (data || []).map((k) => ({ id: k.kid_id, data: k.data, updated_at: k.updated_at })) });
    }
    if (action === 'push') {
      const kids = Array.isArray(body.kids) ? body.kids as { id: string; data: unknown }[] : [];
      for (const k of kids) {
        if (typeof k.id !== 'string' || !/^[a-z0-9]{1,32}$/i.test(k.id) || typeof k.data !== 'object' || !k.data) return J({ error: 'bad_kid' }, 400);
        if (JSON.stringify(k.data).length > MAX_KID_BYTES) return J({ error: 'kid_too_big' }, 413);
      }
      const removed: string[] = (fam.parent && Array.isArray(fam.parent.removed)) ? fam.parent.removed : [];
      const keep = kids.filter((k) => !removed.includes(k.id)); // طفل حذفه ولي الأمر من جهاز آخر لا يعود
      const ids = new Set(((await db.from('athar_kids_children').select('kid_id').eq('family_id', fam.id)).data || []).map((r) => r.kid_id));
      if (ids.size + keep.filter((k) => !ids.has(k.id)).length > MAX_KIDS) return J({ error: 'too_many_kids' }, 400);
      const now = new Date().toISOString();
      if (keep.length) {
        const { error } = await db.from('athar_kids_children').upsert(keep.map((k) => ({ family_id: fam.id, kid_id: k.id, data: k.data, updated_at: now })));
        if (error) throw error;
      }
      const p = body.parent as Record<string, unknown> | undefined;
      const parent = p && typeof p.hash === 'string' && typeof p.salt === 'string' ? { hash: p.hash.slice(0, 128), salt: p.salt.slice(0, 64), removed } : fam.parent;
      await db.from('athar_kids_families').update({ parent, synced_at: now }).eq('id', fam.id);
      return J({ ok: true, at: now });
    }
    if (action === 'delkid') {
      const id = String(body.id || '').slice(0, 32);
      await db.from('athar_kids_children').delete().eq('family_id', fam.id).eq('kid_id', id);
      const removed = [...new Set([...((fam.parent && fam.parent.removed) || []), id])].slice(-50);
      await db.from('athar_kids_families').update({ parent: { ...(fam.parent || {}), removed } }).eq('id', fam.id);
      return J({ ok: true });
    }
    if (action === 'wipe') {
      await db.from('athar_kids_families').delete().eq('id', fam.id); // تُحذف ملفات الأطفال معها (cascade)
      return J({ ok: true });
    }
    return J({ error: 'action' }, 400);
  } catch (e) {
    console.error(e);
    return J({ error: 'server' }, 500);
  }
});
