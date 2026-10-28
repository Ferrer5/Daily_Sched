package com.ferrer5.dailysched;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.AsyncTask;

import androidx.core.app.NotificationManagerCompat;

import java.util.TimeZone;

public class NotificationActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        final PendingResult pendingResult = goAsync();
        final Context appContext = context.getApplicationContext();
        final String action = intent.getAction();
        final long itemId = intent.getLongExtra("itemId", -1);
        AsyncTask.THREAD_POOL_EXECUTOR.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    if (itemId == -1 || action == null) {
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
                        }
                        return;
                    }
                    long now = System.currentTimeMillis();
                    if ("DONE".equals(action)) {
                        item = DueMath.completed(item, now, TimeZone.getDefault());
                        DueStore.saveItem(appContext, item);
                        DueStore.addPatch(appContext, item.id, item.dueDate, item.time, item.doneCount, item.lastDone, item.snoozeUntil == 0 ? null : item.snoozeUntil);
                    } else if ("SNOOZE".equals(action)) {
                        item = DueMath.snoozed(item, now);
                        DueStore.saveItem(appContext, item);
                        DueStore.addPatch(appContext, item.id, item.dueDate, item.time, item.doneCount, item.lastDone, item.snoozeUntil == 0 ? null : item.snoozeUntil);
                    } else {
                        return;
                    }
                    try {
                        for (int k = 0; k <= 10; k++) {
                            NotificationManagerCompat.from(appContext).cancel(DueMath.notificationCode(itemId, k));
                        }
                        NotificationManagerCompat.from(appContext).cancel(DueMath.notificationCode(itemId, 95));
                    } catch (Exception e) {
                    }
                    try {
                        DueScheduler.rescheduleAll(appContext);
                    } catch (Exception e) {
                    }
                    try {
                        DueAlarmsPlugin.notifyPatches();
                    } catch (Exception e) {
                    }
                } finally {
                    try {
                        pendingResult.finish();
                    } catch (Exception e) {
                    }
                }
            }
        });
    }
}