package com.ferrer5.dailysched;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class ShortRepeatScheduler {
    private static final String TAG = "ShortRepeatScheduler";
    private static final long MINUTE_MS = 60_000L;
    private static final long HOUR_MS = 3_600_000L;

    public static boolean isShortRepeat(DueMath.Item item) {
        return item != null
                && "interval".equals(item.repeat)
                && ("minute".equals(item.unit) || "hour".equals(item.unit));
    }

    public static long nextOccurrenceMillis(long startAt, long period, long afterMillis, int endAfter) {
        if (startAt <= 0 || period <= 0) return -1;
        long index = 0;
        if (afterMillis >= startAt) {
            long elapsed = afterMillis - startAt;
            index = elapsed / period + 1;
        }
        if (endAfter > 0 && index >= endAfter) return -1;
        if (index > (Long.MAX_VALUE - startAt) / period) return -1;
        return startAt + index * period;
    }

    private static long periodMillis(DueMath.Item item) {
        if (item == null || item.every < 1) return -1;
        long unitMillis;
        if ("minute".equals(item.unit)) {
            unitMillis = MINUTE_MS;
        } else if ("hour".equals(item.unit)) {
            unitMillis = HOUR_MS;
        } else {
            return -1;
        }
        if (item.every > Long.MAX_VALUE / unitMillis) return -1;
        return item.every * unitMillis;
    }

    public static boolean isExpectedOccurrence(DueMath.Item item, long expectedMillis) {
        if (!isShortRepeat(item) || item.startAt <= 0) return false;
        long period = periodMillis(item);
        if (period <= 0 || expectedMillis < item.startAt) return false;
        long offset = expectedMillis - item.startAt;
        long occurrence = offset / period;
        return offset % period == 0 && (item.endAfter <= 0 || occurrence < item.endAfter);
    }

    public static void rescheduleAll(Context context) {
        Context appContext = context.getApplicationContext();
        Set<Long> oldIds = DueStore.getShortRepeatIds(appContext);
        for (Long id : oldIds) {
            if (id != null) cancelAlarm(appContext, id);
        }
        DueStore.saveShortRepeatIds(appContext, new HashSet<Long>());

        List<DueMath.Item> items = DueStore.getItems(appContext);
        long now = System.currentTimeMillis();
        for (DueMath.Item item : items) {
            if (!isShortRepeat(item)) continue;
            long period = periodMillis(item);
            long atMillis = nextOccurrenceMillis(item.startAt, period, now, item.endAfter);
            if (atMillis > 0) scheduleAt(appContext, item, atMillis);
        }
    }

    public static void scheduleNext(Context context, DueMath.Item item, long firedAtMillis) {
        if (!isShortRepeat(item)) return;
        long period = periodMillis(item);
        long afterMillis = Math.max(System.currentTimeMillis(), firedAtMillis);
        long atMillis = nextOccurrenceMillis(item.startAt, period, afterMillis, item.endAfter);
        if (atMillis > 0) {
            scheduleAt(context.getApplicationContext(), item, atMillis);
        } else {
            forgetItem(context.getApplicationContext(), item.id);
        }
    }

    public static void cancelItem(Context context, long id) {
        Context appContext = context.getApplicationContext();
        cancelAlarm(appContext, id);
        forgetItem(appContext, id);
    }

    private static void scheduleAt(Context context, DueMath.Item item, long atMillis) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            Log.e(TAG, "Cannot schedule short-repeat alarm: AlarmManager is unavailable itemId=" + item.id);
            return;
        }
        try {
            int requestCode = DueMath.notificationCode(item.id, 0);
            Intent alarmIntent = alarmIntent(context, item.id);
            alarmIntent.putExtra("itemId", item.id);
            alarmIntent.putExtra("expectedMillis", atMillis);
            PendingIntent alarmPi = PendingIntent.getBroadcast(context, requestCode, alarmIntent,
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

            Intent showIntent = new Intent(context, MainActivity.class);
            showIntent.setData(Uri.parse("shortrepeat://show/" + item.id));
            PendingIntent showPi = PendingIntent.getActivity(context, requestCode, showIntent,
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(atMillis, showPi), alarmPi);

            Set<Long> scheduledIds = DueStore.getShortRepeatIds(context);
            scheduledIds.add(item.id);
            DueStore.saveShortRepeatIds(context, scheduledIds);
            Log.i(TAG, "Scheduled short-repeat alarm itemId=" + item.id
                    + " atMillis=" + atMillis + " using setAlarmClock");
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule short-repeat alarm itemId=" + item.id, e);
        }
    }

    private static void cancelAlarm(Context context, long id) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            Log.e(TAG, "Cannot cancel short-repeat alarm: AlarmManager is unavailable itemId=" + id);
            return;
        }
        try {
            PendingIntent alarmPi = PendingIntent.getBroadcast(context, DueMath.notificationCode(id, 0),
                    alarmIntent(context, id),
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_NO_CREATE);
            if (alarmPi != null) {
                alarmManager.cancel(alarmPi);
                alarmPi.cancel();
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to cancel short-repeat alarm itemId=" + id, e);
        }
    }

    private static Intent alarmIntent(Context context, long id) {
        Intent intent = new Intent(context, DueAlarmReceiver.class);
        intent.setAction("com.ferrer5.dailysched.SHORT_REPEAT");
        intent.setData(Uri.parse("shortrepeat://item/" + id));
        intent.putExtra("kind", "shortRepeat");
        return intent;
    }

    private static void forgetItem(Context context, long id) {
        Set<Long> scheduledIds = DueStore.getShortRepeatIds(context);
        scheduledIds.remove(id);
        DueStore.saveShortRepeatIds(context, scheduledIds);
    }
}
