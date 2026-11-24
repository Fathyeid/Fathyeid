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
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * ويدجت الشاشة الرئيسية: يعرض مواقيت الصلاة كلها كما يحسبها التطبيق نفسه
 * (الموقع وطريقة الحساب والتعديلات اليدوية تأتي جاهزة من التطبيق عبر PrayerWidgetPlugin).
 * يُحدَّث عند فتح التطبيق، وعند دخول كل وقت صلاة، وبعد منتصف الليل.
 */
public class PrayerWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "prayer_widget";
    static final String KEY = "data";
    static final String ACTION_REFRESH = "com.fathyeid.noor.widget.REFRESH";
    static final String ACTION_TICK = "com.fathyeid.noor.widget.TICK";

    static final String[] KEYS = {"fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"};
    static final int[] ROWS = {R.id.row_fajr, R.id.row_sunrise, R.id.row_dhuhr, R.id.row_asr, R.id.row_maghrib, R.id.row_isha};
    static final int[] NAMES = {R.id.name_fajr, R.id.name_sunrise, R.id.name_dhuhr, R.id.name_asr, R.id.name_maghrib, R.id.name_isha};
    static final int[] TIMES = {R.id.time_fajr, R.id.time_sunrise, R.id.time_dhuhr, R.id.time_asr, R.id.time_maghrib, R.id.time_isha};

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

        JSONObject day = null;
        boolean stale = false;
        try {
            if (json != null) {
                JSONObject root = new JSONObject(json);
                v.setTextViewText(R.id.wg_hijri, root.optString("hijri", ""));
                JSONArray days = root.optJSONArray("days");
                if (days != null) {
                    for (int i = 0; i < days.length(); i++) {
                        JSONObject d = days.optJSONObject(i);
                        if (d != null && today.equals(d.optString("date"))) { day = d; break; }
                    }
                    // لم يصل تحديث اليوم بعد (لم يُفتح التطبيق): نعرض أحدث يوم محفوظ مع تنبيه
                    if (day == null && days.length() > 0) { day = days.optJSONObject(days.length() - 1); stale = true; }
                }
                String loc = root.optString("location", "");
                v.setTextViewText(R.id.wg_loc, stale
                        ? ctx.getString(R.string.widget_stale, loc)
                        : (loc.isEmpty() ? "" : "📍 " + loc));
            }
        } catch (Exception ignored) {
        }

        if (json == null) {
            v.setTextViewText(R.id.wg_loc, ctx.getString(R.string.widget_empty));
        }

        // الصلاة التالية (مثل التطبيق: الشروق لا يُحسب «صلاة تالية»)
        long nextMs = -1;
        int nextIdx = -1;
        if (day != null && !stale) {
            for (int i = 0; i < KEYS.length; i++) {
                if ("sunrise".equals(KEYS[i])) continue;
                long t = day.optJSONObject("times") != null ? day.optJSONObject("times").optLong(KEYS[i], -1) : -1;
                if (t > now && (nextMs < 0 || t < nextMs)) { nextMs = t; nextIdx = i; }
            }
        }

        for (int i = 0; i < KEYS.length; i++) {
            String label = "—";
            try {
                if (day != null && day.optJSONObject("labels") != null) {
                    label = day.getJSONObject("labels").optString(KEYS[i], "—");
                }
            } catch (Exception ignored) {
            }
            v.setTextViewText(TIMES[i], label);
            if (i == nextIdx) {
                v.setInt(ROWS[i], "setBackgroundResource", R.drawable.widget_row_next);
                v.setTextColor(NAMES[i], 0xFF0D3B2E);
                v.setTextColor(TIMES[i], 0xFF0D3B2E);
            }
        }

        mgr.updateAppWidget(appWidgetId, v);
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
