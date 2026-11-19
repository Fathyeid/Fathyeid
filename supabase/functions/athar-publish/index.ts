// تطبيق «أثر»: نشر ملفات التحديث إلى Supabase Storage من GitHub Actions.
// لا أسرار مشتركة: يُقبل الطلب فقط بتوكن OIDC صادر من GitHub لمسار البناء الرسمي في المستودع وفرع الإصدارات،
// ويُتحقق من توقيعه بمفاتيح GitHub العامة. يعطي روابط رفع موقّعة لملفي الإصدار فقط، ثم يكتب latest.json.
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5.9.6';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const BUCKET = 'athar-releases';
const REPO = 'Fathyeid/Fathyeid';
const REF = 'refs/heads/ccr-93877a35-woradx';
const WORKFLOW = `${REPO}/.github/workflows/android.yml@${REF}`;
const JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
const PUBLIC = (p: string) => `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${BUCKET}/${p}`;
const json = (d: unknown, status = 200) => Response.json(d, { status });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const { payload } = await jwtVerify(token, JWKS, { issuer: 'https://token.actions.githubusercontent.com', audience: 'athar-publish' });
    if (payload.repository !== REPO || payload.ref !== REF || payload.workflow_ref !== WORKFLOW) return json({ error: 'not allowed' }, 403);
  } catch (e) {
    return json({ error: 'unauthorized: ' + String(e) }, 401);
  }
  const body = await req.json().catch(() => ({}));
  const code = Number(body.code);
  if (!Number.isInteger(code) || code <= 0) return json({ error: 'bad code' }, 400);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const st = sb.storage.from(BUCKET);
  const webPath = `web/${code}.zip`;
  const apkPath = `apk/athar-${code}.apk`;

  if (body.action === 'urls') {
    const out: Record<string, string> = {};
    for (const [k, p] of [['web', webPath], ['apk', apkPath]]) {
      const { data, error } = await st.createSignedUploadUrl(p, { upsert: true });
      if (error) return json({ error: String(error.message || error) }, 500);
      out[k] = data.signedUrl;
    }
    return json(out);
  }

  if (body.action === 'commit') {
    const nativeLevel = Number(body.native_level);
    const sha = String(body.web_sha256 || '');
    if (!Number.isInteger(nativeLevel) || !/^[0-9a-f]{64}$/.test(sha)) return json({ error: 'bad metadata' }, 400);
    for (const [dir, name] of [['web', `${code}.zip`], ['apk', `athar-${code}.apk`]]) {
      const { data } = await st.list(dir, { search: name });
      if (!data || !data.some((f) => f.name === name)) return json({ error: `missing ${dir}/${name}` }, 409);
    }
    const latest = {
      tag: String(body.tag || ''), version_code: code, web_code: code, native_level: nativeLevel,
      web_url: PUBLIC(webPath), web_sha256: sha, apk_url: PUBLIC(apkPath), published_at: new Date().toISOString(),
    };
    const { error } = await st.upload('latest.json', new Blob([JSON.stringify(latest)], { type: 'application/json' }), { upsert: true, contentType: 'application/json', cacheControl: '60' });
    if (error) return json({ error: String(error.message || error) }, 500);
    return json(latest);
  }
  return json({ error: 'unknown action' }, 400);
});
