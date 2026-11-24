package com.fathyeid.noor;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** يستقبل مواقيت الصلاة المحسوبة من التطبيق ويحدّث ويدجت الشاشة الرئيسية بها. */
@CapacitorPlugin(name = "PrayerWidget")
public class PrayerWidgetPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        try {
            Context ctx = getContext();
            SharedPreferences p = ctx.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE);
            p.edit().putString(PrayerWidgetProvider.KEY, call.getData().toString()).apply();
            PrayerWidgetProvider.refreshAll(ctx);
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }
}
