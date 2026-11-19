-- تطبيق «أثر»: مساحة عامة لملفات التحديث (web.zip وAPK وlatest.json)، لأن مستودع GitHub خاص.
-- القراءة عامة (روابط مباشرة)، والرفع فقط عبر الدالة athar-publish بعد التحقق من هوية GitHub Actions.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('athar-releases', 'athar-releases', true, 62914560,
        array['application/zip', 'application/vnd.android.package-archive', 'application/json', 'application/octet-stream'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
