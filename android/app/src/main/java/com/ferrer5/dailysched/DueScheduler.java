package com.ferrer5.dailysched;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import java.text.DateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TimeZone;

public class DueScheduler {
    private static final String TAG = "DueAlarm";

    public static void rescheduleAll(Context context) {
        Context appContext = context.getApplicationContext();
        AlarmManager alarmManager = (AlarmManager) appContext.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            Log.e(TAG, "Cannot reschedule alarms: AlarmManager is unavailable");
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
                Log.e(TAG, "Failed to cancel previously scheduled alarm code " + code, e);
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
                        boolean canScheduleExactAlarms = Build.VERSION.SDK_INT < 31 || alarmManager.canScheduleExactAlarms();
                        String exactAlarmPermission = Build.VERSION.SDK_INT >= 31
                                ? String.valueOf(canScheduleExactAlarms)
                                : "not applicable";
                        long millisFromNow = alarm.atMillis - System.currentTimeMillis();
                        String readableTime = DateFormat.getDateTimeInstance(
                                DateFormat.MEDIUM, DateFormat.MEDIUM).format(new Date(alarm.atMillis));
                        Log.i(TAG, "Scheduling alarm itemId=" + item.id
                                + " kind=" + alarm.kind
                                + " k=" + alarm.k
                                + " time=" + readableTime
                                + " millisFromNow=" + millisFromNow
                                + " canScheduleExactAlarms=" + exactAlarmPermission);
                        if (!canScheduleExactAlarms) {
                            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.atMillis, pi);
                            Log.i(TAG, "Scheduled alarm itemId=" + item.id + " kind=" + alarm.kind
                                    + " k=" + alarm.k + " using setAndAllowWhileIdle (inexact fallback)");
                        } else {
                            try {
                                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.atMillis, pi);
                                Log.i(TAG, "Scheduled alarm itemId=" + item.id + " kind=" + alarm.kind
                                        + " k=" + alarm.k + " using setExactAndAllowWhileIdle");
                            } catch (Exception ex) {
                                Log.e(TAG, "setExactAndAllowWhileIdle failed for itemId=" + item.id
                                        + " kind=" + alarm.kind + " k=" + alarm.k
                                        + "; using setAndAllowWhileIdle fallback", ex);
                                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, alarm.atMillis, pi);
                                Log.i(TAG, "Scheduled alarm itemId=" + item.id + " kind=" + alarm.kind
                                        + " k=" + alarm.k + " using setAndAllowWhileIdle (inexact fallback)");
                            }
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to schedule alarm itemId=" + item.id
                                + " kind=" + alarm.kind + " k=" + alarm.k, e);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to process alarms for itemId=" + item.id, e);
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
                    Log.e(TAG, "Failed to cancel alarm for itemId=" + id + " k=" + k, e);
                }
            }
            try {
                int codeS = DueMath.notificationCode(id, 95);
                Intent intentS = new Intent(appContext, DueAlarmReceiver.class);
                PendingIntent piS = PendingIntent.getBroadcast(appContext, codeS, intentS, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
                alarmManager.cancel(piS);
                piS.cancel();
            } catch (Exception e) {
                Log.e(TAG, "Failed to cancel snooze alarm for itemId=" + id, e);
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
            Log.e(TAG, "Failed to cancel notifications for itemId=" + id, e);
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