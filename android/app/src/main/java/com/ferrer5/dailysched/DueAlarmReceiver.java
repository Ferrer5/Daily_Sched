package com.ferrer5.dailysched;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import java.util.TimeZone;

public class DueAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "DueAlarm";

    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            Context appContext = context.getApplicationContext();
            long itemId = intent == null ? -1 : intent.getLongExtra("itemId", -1);
            String kind = intent == null ? null : intent.getStringExtra("kind");
            int k = intent == null ? 0 : intent.getIntExtra("k", 0);
            long expectedMillis = intent == null
                    ? Long.MIN_VALUE / 4
                    : intent.getLongExtra("expectedMillis", Long.MIN_VALUE / 4);
            Log.i(TAG, "Alarm receiver fired itemId=" + itemId + " kind=" + kind + " k=" + k);
            if (itemId == -1 || kind == null) {
                Log.i(TAG, "Alarm receiver returning: missing or invalid item id/kind");
                return;
            }
            DueMath.Item item = DueStore.getItem(appContext, itemId);
            if (item == null) {
                Log.i(TAG, "Alarm receiver returning: item missing itemId=" + itemId);
                return;
            }
            boolean shortRepeat = "shortRepeat".equals(kind);
            if (!shortRepeat && DueMath.isFinished(item)) {
                Log.i(TAG, "Alarm receiver returning: item is finished itemId=" + itemId);
                return;
            }
            if (shortRepeat) {
                if (!ShortRepeatScheduler.isExpectedOccurrence(item, expectedMillis)) {
                    Log.i(TAG, "Alarm receiver returning: invalid short-repeat occurrence itemId=" + itemId);
                    return;
                }
            } else if ("snooze".equals(kind)) {
                if (item.snoozeUntil != expectedMillis) {
                    Log.i(TAG, "Alarm receiver returning: snoozeUntil mismatch itemId=" + itemId
                            + " expectedMillis=" + expectedMillis + " actualMillis=" + item.snoozeUntil);
                    return;
                }
            } else {
                long dueAtMillis = DueMath.dueAtMillis(item, TimeZone.getDefault());
                if (dueAtMillis != expectedMillis) {
                    Log.i(TAG, "Alarm receiver returning: dueAt mismatch itemId=" + itemId
                            + " expectedMillis=" + expectedMillis + " actualMillis=" + dueAtMillis);
                    return;
                }
            }
            if (shortRepeat) {
                try {
                    postNotification(appContext, item, kind, 0);
                } finally {
                    ShortRepeatScheduler.scheduleNext(appContext, item, expectedMillis);
                }
                return;
            }
            postNotification(appContext, item, kind, k);
        } catch (Exception e) {
            Log.e(TAG, "Failed while handling due alarm notification", e);
        }
    }

    private static void postNotification(Context appContext, DueMath.Item item, String kind, int k) {
        long itemId = item.id;
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(appContext, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                Log.i(TAG, "Notification not posted: POST_NOTIFICATIONS permission missing itemId=" + itemId);
                return;
            }
        }
        String soundId = DueStore.getSoundId(appContext);
        String channelId = "alarm_" + soundId;
        NotificationManager nm = (NotificationManager) appContext.getSystemService(Context.NOTIFICATION_SERVICE);
        boolean usedFallbackChannel = false;
        if (Build.VERSION.SDK_INT >= 26 && nm != null) {
            NotificationChannel existing = nm.getNotificationChannel(channelId);
            if (existing == null) {
                channelId = "alarm_fallback";
                usedFallbackChannel = true;
                NotificationChannel fallback = nm.getNotificationChannel(channelId);
                if (fallback == null) {
                    NotificationChannel ch = new NotificationChannel(channelId, "Alarms", NotificationManager.IMPORTANCE_HIGH);
                    ch.setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI, null);
                    nm.createNotificationChannel(ch);
                }
            }
        }
        Log.i(TAG, "Using notification channelId=" + channelId + " usedAlarmFallback=" + usedFallbackChannel);
        String title = item.title == null ? "" : item.title;
        String body;
        int overdueReminders = DueStore.getOverdueReminders(appContext);
        if ("due".equals(kind)) {
            if (item.detail != null && !item.detail.isEmpty()) {
                body = item.detail;
            } else {
                body = title;
            }
        } else if ("reminder".equals(kind)) {
            body = "Overdue: " + title + " (reminder " + k + " of " + overdueReminders + ")";
        } else if ("snooze".equals(kind)) {
            body = "Snoozed reminder: " + title;
        } else {
            body = item.detail == null || item.detail.isEmpty() ? title : item.detail;
        }
        Intent contentIntent = new Intent(appContext, MainActivity.class);
        PendingIntent contentPi = PendingIntent.getActivity(appContext, (int) (itemId * 131542391L + k), contentIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Intent doneIntent = new Intent(appContext, NotificationActionReceiver.class);
        doneIntent.setAction("DONE");
        doneIntent.putExtra("itemId", itemId);
        doneIntent.setData(Uri.parse("dueitem://" + itemId + "/DONE"));
        PendingIntent donePi = PendingIntent.getBroadcast(appContext, (int) (itemId * 1009L + 2000), doneIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Intent snoozeIntent = new Intent(appContext, NotificationActionReceiver.class);
        snoozeIntent.setAction("SNOOZE");
        snoozeIntent.putExtra("itemId", itemId);
        snoozeIntent.setData(Uri.parse("dueitem://" + itemId + "/SNOOZE"));
        PendingIntent snoozePi = PendingIntent.getBroadcast(appContext, (int) (itemId * 1009L + 3000), snoozeIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        int smallIcon = R.drawable.ic_stat_alarm;
        NotificationCompat.Builder builder = new NotificationCompat.Builder(appContext, channelId)
                .setSmallIcon(smallIcon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(contentPi);
        if (!"shortRepeat".equals(kind)) {
            builder.addAction(0, "Mark done", donePi)
                    .addAction(0, "Snooze 10 min", snoozePi);
        }
        int notifId = DueMath.notificationCode(itemId, k);
        Log.i(TAG, "Calling notify() itemId=" + itemId + " kind=" + kind + " k=" + k
                + " notificationId=" + notifId + " channelId=" + channelId);
        NotificationManagerCompat.from(appContext).notify(notifId, builder.build());
    }
}