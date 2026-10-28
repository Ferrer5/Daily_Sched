package com.ferrer5.dailysched;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TimeZone;

public class DueScheduler {
    public static void rescheduleAll(Context context) {
        Context appContext = context.getApplicationContext();
        AlarmManager alarmManager = (AlarmManager) appContext.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }
        // cancel every alarm whose code is in the stored set
        Set<Integer> oldCodes = DueStore.getScheduledCodes(appContext);
        for (Integer code : new HashSet<Integer>(oldCodes)) {
            if (code == null) continue;
            try {
                Intent intent = new Intent(appContext, DueAlarmReceiver.class);
                PendingIntent pi = PendingIntent.getBroadcast(appContext, code, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
                alarmManager.cancel(pi);
                pi.cancel();
            } catch (Exception e) {
                // ignore
            }
        }
        // cancel notifications for old codes too? just rely on codes
        Set<Integer> newCodes = new HashSet<Integer>();
        int overdueReminders = DueStore.getOverdueReminders(appContext);
        List<DueMath.Item> items = DueStore.getItems(appContext);
        Set<Long> patchedIds = DueStore.getPatchedIds(appContext);
        for (DueMath.Item item : items) {
            try {
                // If there is a pending patch for an item id, keep native's stored version - we already have stored version; but sync rule says ignore incoming if patch pending. 
                // For rescheduling, just schedule based on stored items (which are kept if patched)
                if (patchedIds.contains(item.id)) {
                    // still schedule based on stored version
                }
                List<DueMath.Alarm> alarms = DueMath.alarms(item, System.currentTimeMillis(), overdueReminders, TimeZone.getDefault());
                for (DueMath.Alarm alarm : alarms) {
                    try {
                        int code = DueMath.notificationCode(item.id, alarm.k);
                        newCodes.add(code);
                        long expectedMillis;
                        if ("snooze".equals(alarm.kind)) {
                            expectedMillis = item.snoozeUntil;
                        } else {
                            expectedMillis = DueMath.dueAtMillis(item, TimeZone.getDefault());
                        }
                        Intent intent = new Intent(appContext, DueAlarmReceiver.class);
                        intent.putExtra("itemId", item.id);
                        intent.putExtra("kind", alarm.kind);
                        intent.putExtra("k", alarm.k);
                        intent.putExtra("expectedMillis", expectedMillis);
                        PendingIntent pi = PendingIntent.getBroadcast(appContext, code, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
                        if (Build.VERSION.SDK_INT >= 31 && !alarmManager.canScheduleExactAlarms()) {
                            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.atMillis, pi);
                        } else {
                            try {
                                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.atMillis, pi);
                            } catch (Exception ex) {
                                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.atMillis, pi);
                            }
                        }
                    } catch (Exception e) {
                        // skip this alarm
                    }
                }
            } catch (Exception e) {
                // skip this item
            }
        }
        DueStore.saveScheduledCodes(appContext, newCodes);
    }

    public static void cancelItem(Context context, long id) {
        Context appContext = context.getApplicationContext();
        AlarmManager alarmManager = (AlarmManager) appContext.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            for (int k = 0; k <= 10; k++) {
                try {
                    int code = DueMath.notificationCode(id, k);
                    Intent intent = new Intent(appContext, DueAlarmReceiver.class);
                    PendingIntent pi = PendingIntent.getBroadcast(appContext, code, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
                    alarmManager.cancel(pi);
                    pi.cancel();
                } catch (Exception e) {
                }
            }
            try {
                int codeS = DueMath.notificationCode(id, 95);
                Intent intentS = new Intent(appContext, DueAlarmReceiver.class);
                PendingIntent piS = PendingIntent.getBroadcast(appContext, codeS, intentS, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
                alarmManager.cancel(piS);
                piS.cancel();
            } catch (Exception e) {
            }
        }
        try {
            android.app.NotificationManager nm = (android.app.NotificationManager) appContext.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                for (int k = 0; k <= 10; k++) {
                    nm.cancel(DueMath.notificationCode(id, k));
                }
                nm.cancel(DueMath.notificationCode(id, 95));
            }
        } catch (Exception e) {
        }
        // update stored codes
        Set<Integer> codes = DueStore.getScheduledCodes(appContext);
        Set<Integer> toRemove = new HashSet<Integer>();
        for (int k = 0; k <= 10; k++) toRemove.add(DueMath.notificationCode(id, k));
        toRemove.add(DueMath.notificationCode(id, 95));
        codes.removeAll(toRemove);
        DueStore.saveScheduledCodes(appContext, codes);
    }
}