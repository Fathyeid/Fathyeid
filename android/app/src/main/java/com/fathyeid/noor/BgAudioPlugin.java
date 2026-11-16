package com.fathyeid.noor;

import android.content.Intent;
import android.os.Build;
import android.webkit.WebView;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** واجهة بين المشغّل في التطبيق وخدمة التشغيل في الخلفية. */
@CapacitorPlugin(name = "BgAudio")
public class BgAudioPlugin extends Plugin {
    private static BgAudioPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @PluginMethod
    public void start(PluginCall call) {
        String title = call.getString("title", "أثر");
        String sub = call.getString("sub", "يُشغَّل الآن");
        try {
            keepRendererAlive();
            if (PlaybackService.running) {
                PlaybackService.update(getContext(), title, sub);
            } else {
                Intent i = new Intent(getContext(), PlaybackService.class);
                i.putExtra("title", title);
                i.putExtra("sub", sub);
                ContextCompat.startForegroundService(getContext(), i);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            getContext().stopService(new Intent(getContext(), PlaybackService.class));
        } catch (Exception ignored) {
        }
        PlaybackService.running = false;
        call.resolve();
    }

    /** زر «إيقاف» في الإشعار: نُبلغ واجهة التطبيق لتوقف الصوت. */
    static void notifyStopRequested() {
        if (instance != null) instance.notifyListeners("stop", new JSObject());
    }

    /** يمنع أندرويد من خفض أولوية عملية العرض (WebView) عند إخفاء التطبيق، فيستمر الصوت. */
    private void keepRendererAlive() {
        if (Build.VERSION.SDK_INT < 26 || getActivity() == null) return;
        getActivity().runOnUiThread(() -> {
            try {
                WebView wv = getBridge().getWebView();
                if (wv != null) wv.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
            } catch (Exception ignored) {
            }
        });
    }
}
