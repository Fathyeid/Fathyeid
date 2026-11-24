package com.fathyeid.noor;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // خدمة التشغيل في الخلفية (الإذاعة والتلاوة والشاشة مقفولة)
        registerPlugin(BgAudioPlugin.class);
        // ويدجت مواقيت الصلاة على الشاشة الرئيسية
        registerPlugin(PrayerWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
