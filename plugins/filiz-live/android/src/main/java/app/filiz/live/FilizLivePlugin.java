package app.filiz.live;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

/**
 * Ders sürerken tek bir sürekli bildirim gösterir ve günceller.
 * Android 16 ve üstünde "Live Update" (ProgressStyle + öne çıkarılmış sürekli bildirim) olarak,
 * eski sürümlerde ilerleme çubuklu normal sürekli bildirim olarak görünür.
 * Android 16 sınıfları yansıma (reflection) ile çağrılır; derleme SDK'sı ne olursa olsun derlenir.
 */
@CapacitorPlugin(name = "FilizLive")
public class FilizLivePlugin extends Plugin {
    private static final String CHANNEL_ID = "filiz_live";
    private static final int NOTIFICATION_ID = 4242;
    private static final long TIMEOUT_MS = 30L * 60L * 1000L; // uygulama kapanırsa bildirim kendiliğinden kalkar

    @PluginMethod
    public void show(PluginCall call) {
        try {
            Context ctx = getContext();
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            ensureChannel(nm);

            String title = call.getString("title", "Ders sürüyor");
            String text = call.getString("text", "");
            String subText = call.getString("subText", "");
            String chip = call.getString("chipText", "");
            int progress = call.getInt("progress", 0);
            int max = Math.max(1, call.getInt("max", 1));
            long whenMs = call.getLong("whenMs", System.currentTimeMillis());
            boolean countDown = Boolean.TRUE.equals(call.getBoolean("countDown", false));

            Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
            PendingIntent pi = PendingIntent.getActivity(
                ctx, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

            Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(ctx, CHANNEL_ID)
                : new Notification.Builder(ctx);
            b.setSmallIcon(ctx.getResources().getIdentifier("ic_stat_filiz", "drawable", ctx.getPackageName()))
                .setContentTitle(title)
                .setContentText(text)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(Notification.CATEGORY_PROGRESS)
                .setContentIntent(pi)
                .setColor(0xFF2C9A68)
                .setShowWhen(true)
                .setWhen(whenMs)
                .setUsesChronometer(true);
            if (subText != null && !subText.isEmpty()) b.setSubText(subText);
            if (Build.VERSION.SDK_INT >= 24) b.setChronometerCountDown(countDown);
            if (Build.VERSION.SDK_INT >= 26) b.setTimeoutAfter(TIMEOUT_MS);

            boolean promoted = false;
            if (Build.VERSION.SDK_INT >= 36) promoted = applyLiveUpdate(b, progress, max, chip);
            if (!promoted) b.setProgress(max, Math.min(progress, max), false);

            nm.notify(NOTIFICATION_ID, b.build());
            JSObject r = new JSObject();
            r.put("promoted", promoted);
            call.resolve(r);
        } catch (Throwable t) {
            call.reject("Bildirim gösterilemedi: " + t.getMessage());
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        try {
            NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            nm.cancel(NOTIFICATION_ID);
            call.resolve();
        } catch (Throwable t) {
            call.reject(t.getMessage());
        }
    }

    /** Seri bildirimi ayarını kaydeder; saat aralığına göre gösterir ya da kaldırır, alarm kurar. */
    @PluginMethod
    public void setStreak(PluginCall call) {
        try {
            Context ctx = getContext();
            android.content.SharedPreferences.Editor e =
                ctx.getSharedPreferences(StreakReceiver.PREFS, Context.MODE_PRIVATE).edit();
            e.putBoolean("enabled", Boolean.TRUE.equals(call.getBoolean("enabled", false)));
            e.putInt("n", call.getInt("n", 0));
            e.putLong("lastStudyMs", call.getLong("lastStudyMs", 0L));
            e.putLong("resetAt", call.getLong("resetAt", 0L));
            e.putInt("fromHour", call.getInt("fromHour", 18));
            e.putInt("toHour", call.getInt("toHour", 23));
            e.apply();
            StreakReceiver.refresh(ctx);
            call.resolve();
        } catch (Throwable t) {
            call.reject("Seri bildirimi ayarlanamadı: " + t.getMessage());
        }
    }

    /** Ders sürerken sabit seri bildirimini geçici olarak gizler (ayar ve alarm yerinde kalır). */
    @PluginMethod
    public void hideStreak(PluginCall call) {
        StreakReceiver.hide(getContext());
        call.resolve();
    }

    private void ensureChannel(NotificationManager nm) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Ders sürüyor", NotificationManager.IMPORTANCE_LOW);
        ch.setDescription("Ders sırasında ilerleme ve seri sayacı");
        ch.setShowBadge(false);
        nm.createNotificationChannel(ch);
    }

    /** Android 16: ProgressStyle ve öne çıkarılmış sürekli bildirim. Başarısız olursa false döner. */
    private boolean applyLiveUpdate(Notification.Builder b, int progress, int max, String chip) {
        try {
            Class<?> styleClass = Class.forName("android.app.Notification$ProgressStyle");
            Class<?> segClass = Class.forName("android.app.Notification$ProgressStyle$Segment");
            Object style = styleClass.getConstructor().newInstance();
            Object seg = segClass.getConstructor(int.class).newInstance(max);
            segClass.getMethod("setColor", int.class).invoke(seg, 0xFF2C9A68);
            List<Object> segs = new ArrayList<>();
            segs.add(seg);
            styleClass.getMethod("setProgressSegments", List.class).invoke(style, segs);
            styleClass.getMethod("setProgress", int.class).invoke(style, Math.min(progress, max));
            b.setStyle((Notification.Style) style);
            Notification.Builder.class.getMethod("setRequestPromotedOngoing", boolean.class).invoke(b, true);
            if (chip != null && !chip.isEmpty()) {
                Notification.Builder.class.getMethod("setShortCriticalText", String.class).invoke(b, chip);
            }
            return true;
        } catch (Throwable t) {
            return false;
        }
    }
}
