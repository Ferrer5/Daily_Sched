package com.ferrer5.dailysched;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.AsyncTask;
import android.util.Log;

import androidx.core.app.NotificationManagerCompat;

import java.util.TimeZone;

public class NotificationActionReceiver extends BroadcastReceiver {
    private static final String TAG = "DueAlarm";

    @Override
    public void onReceive(Context context, Intent intent) {
        final PendingResult pendingResult = goAsync();
        final Context appContext = context.getApplicationContext();
        final String action = intent == null ? null : intent.getAction();
        final long itemId = intent == null ? -1 : intent.getLongExtra("itemId", -1);
        Log.i(TAG, "Notification action arrived action=" + action + " itemId=" + itemId);
        AsyncTask.THREAD_POOL_EXECUTOR.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    if (itemId == -1 || action == null) {
                        Log.i(TAG, "Notification action ignored: missing item id or action");
                        return;
                    }
                    DueMath.Item item = DueStore.getItem(appContext, itemId);
                    if (item == null) {
                        // just cancel notifications
                        try {
                            for (int k = 0; k <= 10; k++) {
                                NotificationManagerCompat.from(appContext).cancel(DueMath.notificationCode(itemId, k));
                            }
                            NotificationManagerCompat.from(appContext).cancel(DueMath.notificationCode(itemId, 95));
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to cancel notifications for missing itemId=" + itemId, e);
                        }
                        Log.i(TAG, "Notification action found no item; notifications cancelled itemId=" + itemId);
                        return;
                    }
                    long now = System.currentTimeMillis();
                    if ("DONE".equals(action)) {
                        item = DueMath.completed(item, now, TimeZone.getDefault());
                        synchronized (DueStore.class) {
                            DueStore.saveItem(appContext, item);
                            DueStore.addPatch(appContext, item.id, item.dueDate, item.time, item.doneCount, item.lastDone, item.snoozeUntil == 0 ? null : item.snoozeUntil);
                        }
                        Log.i(TAG, "Notification action completed itemId=" + itemId
                                + " doneCount=" + item.doneCount + " lastDone=" + item.lastDone);
                    } else if ("SNOOZE".equals(action)) {
                        item = DueMath.snoozed(item, now);
                        synchronized (DueStore.class) {
                            DueStore.saveItem(appContext, item);
                            DueStore.addPatch(appContext, item.id, item.dueDate, item.time, item.doneCount, item.lastDone, item.snoozeUntil == 0 ? null : item.snoozeUntil);
                        }
                        Log.i(TAG, "Notification action snoozed itemId=" + itemId
                                + " snoozeUntil=" + item.snoozeUntil);
                    } else {
                        Log.i(TAG, "Notification action ignored: unsupported action=" + action);
                        return;
                    }
                    try {
                        for (int k = 0; k <= 10; k++) {
                            NotificationManagerCompat.from(appContext).cancel(DueMath.notificationCode(itemId, k));
                        }
                        NotificationManagerCompat.from(appContext).cancel(DueMath.notificationCode(itemId, 95));
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to cancel notifications after action itemId=" + itemId, e);
                    }
                    try {
                        DueScheduler.rescheduleAll(appContext);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to reschedule alarms after action itemId=" + itemId, e);
                    }
                    try {
                        DueAlarmsPlugin.notifyPatches();
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to notify patches after action itemId=" + itemId, e);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Failed to process notification action action=" + action
                            + " itemId=" + itemId, e);
                } finally {
                    try {
                        pendingResult.finish();
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to finish notification action result itemId=" + itemId, e);
                    }
                }
            }
        });
    }
}