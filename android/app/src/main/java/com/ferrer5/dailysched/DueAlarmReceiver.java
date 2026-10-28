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

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import java.util.TimeZone;

public class DueAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            Context appContext = context.getApplicationContext();
            long itemId = intent.getLongExtra("itemId", -1);
            String kind = intent.getStringExtra("kind");
            int k = intent.getIntExtra("k", 0);
            long expectedMillis = intent.getLongExtra("expectedMillis", Long.MIN_VALUE / 4);
            if (itemId == -1 || kind == null) {
                return;
            }
            DueMath.Item item = DueStore.getItem(appContext, itemId);
            if (item == null) {
                return;
            }
            if (DueMath.isFinished(item)) {
                return;
            }
            if ("snooze".equals(kind)) {
                if (item.snoozeUntil != expectedMillis) {
                    return;
                }
            } else {
                if (DueMath.dueAtMillis(item, TimeZone.getDefault()) != expectedMillis) {
                    return;
                }
            }
            if (Build.VERSION.SDK_INT >= 33) {
                if (ContextCompat.checkSelfPermission(appContext, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    return;
                }
            }
            String soundId = DueStore.getSoundId(appContext);
            String channelId = "alarm_" + soundId;
            NotificationManager nm = (NotificationManager) appContext.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26 && nm != null) {
                NotificationChannel existing = nm.getNotificationChannel(channelId);
                if (existing == null) {
                    channelId = "alarm_fallback";
                    NotificationChannel fallback = nm.getNotificationChannel(channelId);
                    if (fallback == null) {
                        NotificationChannel ch = new NotificationChannel(channelId, "Alarms", NotificationManager.IMPORTANCE_HIGH);
                        ch.setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI, null);
                        nm.createNotificationChannel(ch);
                    }
                }
            }
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
            int smallIcon = R.mipmap.ic_launcher;
            // try to find common icon names if possible; use launcher as fallback
            NotificationCompat.Builder builder = new NotificationCompat.Builder(appContext, channelId)
                    .setSmallIcon(smallIcon)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(contentPi)
                    .addAction(0, "Mark done", donePi)
                    .addAction(0, "Snooze 10 min", snoozePi);
            int notifId = DueMath.notificationCode(itemId, k);
            NotificationManagerCompat.from(appContext).notify(notifId, builder.build());
        } catch (Exception e) {
            // ignore
        }
    }
}