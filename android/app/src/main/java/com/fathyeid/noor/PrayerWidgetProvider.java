package com.fathyeid.noor;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.Locale;

/**
 * ويدجت الشاشة الرئيسية: يعرض مواقيت الصلاة كلها كما يحسبها التطبيق نفسه
 * (الموقع وطريقة الحساب والتعديلات اليدوية تأتي جاهزة من التطبيق عبر PrayerWidgetPlugin).
 * الصلاة القادمة بارزة بأيقونتها وعدّ تنازلي حي، وباقي المواقيت بأيقوناتها في صف سفلي.
 * يُحدَّث عند فتح التطبيق، وعند دخول كل وقت صلاة، وبعد منتصف الليل.
 */
public class PrayerWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "prayer_widget";
    static final String KEY = "data";
    static final String ACTION_REFRESH = "com.fathyeid.noor.widget.REFRESH";
    static final String ACTION_TICK = "com.fathyeid.noor.widget.TICK";

    static final String[] KEYS = {"fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"};
    static final String[] AR = {"الفجر", "الشروق", "الظهر", "العصر", "المغرب", "العشاء"};
    static final int[] ICONS = {
            R.drawable.ic_prayer_fajr, R.drawable.ic_prayer_sunrise, R.drawable.ic_prayer_dhuhr,
            R.drawable.ic_prayer_asr, R.drawable.ic_prayer_maghrib, R.drawable.ic_prayer_isha};
    static final int[] CELL_ICONS = {R.id.c1_icon, R.id.c2_icon, R.id.c3_icon, R.id.c4_icon, R.id.c5_icon};
    static final int[] CELL_NAMES = {R.id.c1_name, R.id.c2_name, R.id.c3_name, R.id.c4_name, R.id.c5_name};
    static final int[] CELL_TIMES = {R.id.c1_time, R.id.c2_time, R.id.c3_time, R.id.c4_time, R.id.c5_time};

    /** موعد واحد في الخط الزمني المدمج (اليوم + الغد). */
    static class Entry {
        long t;
        int keyIdx;
        String label;
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) render(ctx, mgr, id);
        scheduleNextTick(ctx);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String a = intent.getAction();
        if (ACTION_REFRESH.equals(a) || ACTION_TICK.equals(a)
                || Intent.ACTION_DATE_CHANGED.equals(a) || Intent.ACTION_TIME_CHANGED.equals(a)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(a)) {
            refreshAll(ctx);
        }
    }

    static void refreshAll(Context ctx) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, PrayerWidgetProvider.class));
            for (int id : ids) render(ctx, mgr, id);
            scheduleNextTick(ctx);
        } catch (Exception ignored) {
        }
    }

    static void render(Context ctx, AppWidgetManager mgr, int appWidgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_prayer);

        // الضغط على الودجت يفتح صفحة المواقيت داخل التطبيق
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("athar://open?r=prayers"));
        open.setPackage(ctx.getPackageName());
        v.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(ctx, 1, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        // زر التحديث يعيد رسم الودجت من آخر بيانات دون فتح التطبيق
        Intent refresh = new Intent(ctx, PrayerWidgetProvider.class).setAction(ACTION_REFRESH);
        v.setOnClickPendingIntent(R.id.wg_refresh, PendingIntent.getBroadcast(ctx, 2, refresh,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        long now = System.currentTimeMillis();
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(now));

        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String json = p.getString(KEY, null);

        // نبني خطًا زمنيًا مدمجًا من كل الأيام المحفوظة (اليوم والغد عادة)
        ArrayList<Entry> timeline = new ArrayList<>();
        boolean stale = false;
        try {
            if (json != null) {
                JSONObject root = new JSONObject(json);
                v.setTextViewText(R.id.wg_hijri, root.optString("hijri", ""));
                JSONArray days = root.optJSONArray("days");
                if (days != null) {
                    boolean hasToday = false;
                    for (int i = 0; i < days.length(); i++) {
                        JSONObject d = days.optJSONObject(i);
                        if (d == null) continue;
                        if (today.equals(d.optString("date"))) hasToday = true;
                        JSONObject times = d.optJSONObject("times");
                        JSONObject labels = d.optJSONObject("labels");
                        if (times == null) continue;
                        for (int k = 0; k < KEYS.length; k++) {
                            long t = times.optLong(KEYS[k], -1);
                            if (t <= 0) continue;
                            Entry e = new Entry();
                            e.t = t;
                            e.keyIdx = k;
                            e.label = labels != null ? labels.optString(KEYS[k], "—") : "—";
                            timeline.add(e);
                        }
                    }
                    stale = !hasToday && days.length() > 0;
                }
                String loc = root.optString("location", "");
                v.setTextViewText(R.id.wg_loc, stale
                        ? ctx.getString(R.string.widget_stale, loc)
                        : (loc.isEmpty() ? "" : "📍 " + loc));
            }
        } catch (Exception ignored) {
        }
        Collections.sort(timeline, new Comparator<Entry>() {
            @Override
            public int compare(Entry a, Entry b) {
                return Long.compare(a.t, b.t);
            }
        });

        if (json == null) {
            v.setTextViewText(R.id.wg_loc, ctx.getString(R.string.widget_empty));
        }

        // الصلاة القادمة (مثل التطبيق: الشروق لا يُحسب «صلاة تالية»)
        int heroIdx = -1;
        for (int i = 0; i < timeline.size(); i++) {
            Entry e = timeline.get(i);
            if (e.t > now && !"sunrise".equals(KEYS[e.keyIdx])) { heroIdx = i; break; }
        }

        if (heroIdx >= 0) {
            Entry hero = timeline.get(heroIdx);
            v.setTextViewText(R.id.wg_next_name, AR[hero.keyIdx]);
            v.setTextViewText(R.id.wg_next_time, hero.label);
            v.setImageViewResource(R.id.wg_next_icon, ICONS[hero.keyIdx]);
            // عدّ تنازلي حي حتى دخول الوقت
            long base = SystemClock.elapsedRealtime() + (hero.t - now);
            v.setChronometer(R.id.wg_countdown, base, null, true);
            v.setChronometerCountDown(R.id.wg_countdown, true);
            v.setViewVisibility(R.id.wg_count_row, View.VISIBLE);
            // الخمسة التالون له في الصف السفلي
            int c = 0;
            for (int i = heroIdx + 1; i < timeline.size() && c < 5; i++, c++) {
                setCell(v, c, timeline.get(i));
            }
            for (; c < 5; c++) clearCell(v, c);
        } else {
            // لا صلاة قادمة في البيانات (قديمة أو فارغة): نعرض مواقيت اليوم المعروفة دون الشروق
            v.setTextViewText(R.id.wg_next_name, "—");
            v.setTextViewText(R.id.wg_next_time, "");
            v.setImageViewResource(R.id.wg_next_icon, R.drawable.ic_prayer_dhuhr);
            v.setChronometer(R.id.wg_countdown, SystemClock.elapsedRealtime(), null, false);
            v.setViewVisibility(R.id.wg_count_row, View.GONE);
            int c = 0;
            for (Entry e : timeline) {
                if ("sunrise".equals(KEYS[e.keyIdx]) || c >= 5) continue;
                setCell(v, c, e);
                c++;
            }
            for (; c < 5; c++) clearCell(v, c);
        }

        mgr.updateAppWidget(appWidgetId, v);
    }

    static void setCell(RemoteViews v, int c, Entry e) {
        v.setImageViewResource(CELL_ICONS[c], ICONS[e.keyIdx]);
        v.setTextViewText(CELL_NAMES[c], AR[e.keyIdx]);
        v.setTextViewText(CELL_TIMES[c], e.label);
    }

    static void clearCell(RemoteViews v, int c) {
        v.setImageViewResource(CELL_ICONS[c], android.R.color.transparent);
        v.setTextViewText(CELL_NAMES[c], "");
        v.setTextViewText(CELL_TIMES[c], "");
    }

    /** يجدول التحديث القادم: عند دخول أقرب وقت محفوظ، وبعد منتصف الليل لتبديل اليوم. */
    static void scheduleNextTick(Context ctx) {
        try {
            long now = System.currentTimeMillis();
            long next = -1;
            SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String json = p.getString(KEY, null);
            if (json != null) {
                JSONArray days = new JSONObject(json).optJSONArray("days");
                if (days != null) {
                    for (int i = 0; i < days.length(); i++) {
                        JSONObject d = days.optJSONObject(i);
                        JSONObject times = d != null ? d.optJSONObject("times") : null;
                        if (times == null) continue;
                        for (String k : KEYS) {
                            long t = times.optLong(k, -1);
                            if (t > now && (next < 0 || t < next)) next = t;
                        }
                    }
                }
            }
            Calendar c = Calendar.getInstance();
            c.add(Calendar.DAY_OF_YEAR, 1);
            c.set(Calendar.HOUR_OF_DAY, 0);
            c.set(Calendar.MINUTE, 0);
            c.set(Calendar.SECOND, 30);
            long midnight = c.getTimeInMillis();
            if (next < 0 || midnight < next) next = midnight;

            Intent tick = new Intent(ctx, PrayerWidgetProvider.class).setAction(ACTION_TICK);
            PendingIntent pi = PendingIntent.getBroadcast(ctx, 3, tick,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am != null) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pi);
        } catch (Exception ignored) {
            // دون إذن التنبيهات الدقيقة يكفي التحديث الدوري كل ٣٠ دقيقة
        }
    }
}
