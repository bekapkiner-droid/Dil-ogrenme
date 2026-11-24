package app.filiz.live;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import java.util.Calendar;

/**
 * Seri bildirimini belirli bir saat aralığında gösterir.
 * Başlangıç saatinde bir alarmla uyanır, bildirimi gösterir; bildirim bitiş saatinde kendiliğinden kalkar
 * (setTimeoutAfter). Ayarlar SharedPreferences'ta durur, uygulama kapalıyken de çalışır.
 */
public class StreakReceiver extends BroadcastReceiver {
    static final String ACTION = "app.filiz.live.STREAK_TICK";
    static final String PREFS = "filiz_streak";
    static final String CHANNEL_ID = "filiz_streak";
    static final int NOTIFICATION_ID = 4243;
    private static final long DAY_MS = 24L * 60L * 60L * 1000L;

    @Override
    public void onReceive(Context ctx, Intent intent) {
        refresh(ctx);
    }

    static PendingIntent alarmIntent(Context ctx) {
        Intent i = new Intent(ctx, StreakReceiver.class).setAction(ACTION);
        return PendingIntent.getBroadcast(ctx, 77, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static void hide(Context ctx) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        nm.cancel(NOTIFICATION_ID);
    }

    private static Calendar at(long now, int hour) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(now);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        if (hour >= 24) {
            c.set(Calendar.HOUR_OF_DAY, 0);
            c.add(Calendar.DAY_OF_MONTH, 1);
        } else {
            c.set(Calendar.HOUR_OF_DAY, hour);
        }
        return c;
    }

    /** Ayarlara bakar: aralıktaysa bildirimi gösterir, değilse kaldırır; bir sonraki başlangıç için alarm kurar. */
    static void refresh(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        PendingIntent alarm = alarmIntent(ctx);
        am.cancel(alarm);

        long now = System.currentTimeMillis();
        int n = p.getInt("n", 0);
        long resetAt = p.getLong("resetAt", 0L);
        if (!p.getBoolean("enabled", false) || n <= 0 || resetAt <= now) {
            nm.cancel(NOTIFICATION_ID);
            return;
        }
        int from = p.getInt("fromHour", 18);
        int to = p.getInt("toHour", 23);
        if (to <= from) to = Math.min(24, from + 1);

        long start = at(now, from).getTimeInMillis();
        long end = at(now, to).getTimeInMillis();
        long nextStart;
        if (now >= start && now < end) {
            show(ctx, nm, p, n, resetAt, Math.min(end, resetAt) - now, now);
            nextStart = start + DAY_MS;
        } else {
            nm.cancel(NOTIFICATION_ID);
            nextStart = now < start ? start : start + DAY_MS;
        }
        try {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextStart, alarm);
        } catch (Throwable t) {
            // alarm kurulamazsa bildirim yalnızca uygulama açılınca yenilenir
        }
    }

    private static void show(Context ctx, NotificationManager nm, SharedPreferences p, int n, long resetAt, long timeoutMs, long now) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Seri", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Serinin sıfırlanmasına kalan süre");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        long todayStart = at(now, 0).getTimeInMillis();
        if (at(now, 0).getTimeInMillis() > now) todayStart -= DAY_MS;
        boolean studiedToday = p.getLong("lastStudyMs", 0L) >= todayStart;
        String text = studiedToday
            ? "Bugün tamam. Sıfırlanmasına kalan süre sağda."
            : "Bugün bir ders bitir. Sıfırlanmasına kalan süre sağda.";

        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent pi = PendingIntent.getActivity(
            ctx, 1, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(ctx, CHANNEL_ID)
            : new Notification.Builder(ctx);
        b.setSmallIcon(ctx.getResources().getIdentifier("ic_stat_filiz", "drawable", ctx.getPackageName()))
            .setContentTitle("Seri " + n + " gün")
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(Notification.CATEGORY_STATUS)
            .setContentIntent(pi)
            .setColor(0xFF2C9A68)
            .setShowWhen(true)
            .setWhen(resetAt)
            .setUsesChronometer(true);
        if (Build.VERSION.SDK_INT >= 24) b.setChronometerCountDown(true);
        if (Build.VERSION.SDK_INT >= 26 && timeoutMs > 0) b.setTimeoutAfter(timeoutMs);
        nm.notify(NOTIFICATION_ID, b.build());
    }
}
