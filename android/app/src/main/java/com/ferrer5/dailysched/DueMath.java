package com.ferrer5.dailysched;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.GregorianCalendar;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

public class DueMath {
    private static final long MINUTE_MS = 60000L;
    private static final long HOUR_MS = 3600000L;
    private static final long FIVE_MINUTES_MS = 5 * MINUTE_MS;
    private static final long SIXTY_MINUTES_MS = 60 * MINUTE_MS;

    public static class Item {
        public long id;
        public String title;
        public String detail;
        public String time;        // "HH:mm"
        public String dueDate;     // "yyyy-MM-dd"
        public String unit;        // minute|hour|day|week|month|year
        public int every;
        public int endAfter;       // 0 = never
        public int doneCount;
        public String lastDone;    // "yyyy-MM-dd" or null
        public long snoozeUntil;   // epoch ms, 0 = none

        public Item copy() {
            Item item = new Item();
            item.id = this.id;
            item.title = this.title;
            item.detail = this.detail;
            item.time = this.time;
            item.dueDate = this.dueDate;
            item.unit = this.unit;
            item.every = this.every;
            item.endAfter = this.endAfter;
            item.doneCount = this.doneCount;
            item.lastDone = this.lastDone;
            item.snoozeUntil = this.snoozeUntil;
            return item;
        }
    }

    public static class Alarm {
        public long atMillis;
        public String kind; // "due" | "reminder" | "snooze"
        public int k;

        public Alarm(long atMillis, String kind, int k) {
            this.atMillis = atMillis;
            this.kind = kind;
            this.k = k;
        }
    }

    private static String formatDate(Calendar cal, TimeZone tz) {
        Calendar c = (Calendar) cal.clone();
        c.setTimeZone(tz);
        int year = c.get(Calendar.YEAR);
        int month = c.get(Calendar.MONTH) + 1;
        int day = c.get(Calendar.DAY_OF_MONTH);
        return String.format(Locale.US, "%04d-%02d-%02d", year, month, day);
    }

    private static String formatTime(Calendar cal, TimeZone tz) {
        Calendar c = (Calendar) cal.clone();
        c.setTimeZone(tz);
        int hour = c.get(Calendar.HOUR_OF_DAY);
        int minute = c.get(Calendar.MINUTE);
        return String.format(Locale.US, "%02d:%02d", hour, minute);
    }

    private static Calendar parseDate(String dateStr, TimeZone tz) {
        String[] parts = dateStr.split("-");
        int year = Integer.parseInt(parts[0]);
        int month = Integer.parseInt(parts[1]) - 1;
        int day = Integer.parseInt(parts[2]);
        Calendar cal = new GregorianCalendar(tz);
        cal.set(Calendar.YEAR, year);
        cal.set(Calendar.MONTH, month);
        cal.set(Calendar.DAY_OF_MONTH, day);
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal;
    }

    private static Calendar parseDateTime(String dateStr, String timeStr, TimeZone tz) {
        String[] dateParts = dateStr.split("-");
        String[] timeParts = timeStr.split(":");
        int year = Integer.parseInt(dateParts[0]);
        int month = Integer.parseInt(dateParts[1]) - 1;
        int day = Integer.parseInt(dateParts[2]);
        int hour = Integer.parseInt(timeParts[0]);
        int minute = Integer.parseInt(timeParts[1]);
        Calendar cal = new GregorianCalendar(tz);
        cal.set(Calendar.YEAR, year);
        cal.set(Calendar.MONTH, month);
        cal.set(Calendar.DAY_OF_MONTH, day);
        cal.set(Calendar.HOUR_OF_DAY, hour);
        cal.set(Calendar.MINUTE, minute);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal;
    }

    private static Calendar addMonthsCalendar(Calendar date, int count) {
        // target month = month + count with day 1; day = min(original day, last day of target month)
        int originalDay = date.get(Calendar.DAY_OF_MONTH);
        Calendar target = new GregorianCalendar(date.getTimeZone());
        target.setTime(date.getTime());
        target.set(Calendar.DAY_OF_MONTH, 1);
        target.add(Calendar.MONTH, count);
        int lastDay = target.getActualMaximum(Calendar.DAY_OF_MONTH);
        target.set(Calendar.DAY_OF_MONTH, Math.min(originalDay, lastDay));
        // keep time unchanged? but for calendar date operations in context of dueDate/time handling
        target.set(Calendar.HOUR_OF_DAY, date.get(Calendar.HOUR_OF_DAY));
        target.set(Calendar.MINUTE, date.get(Calendar.MINUTE));
        target.set(Calendar.SECOND, 0);
        target.set(Calendar.MILLISECOND, 0);
        return target;
    }

    public static long dueAtMillis(Item item, TimeZone tz) {
        Calendar cal = parseDateTime(item.dueDate, item.time != null ? item.time : "00:00", tz);
        return cal.getTimeInMillis();
    }

    public static boolean isFinished(Item item) {
        if (item.endAfter > 0 && item.doneCount >= item.endAfter) {
            return true;
        }
        return false;
    }

    public static Item completed(Item item, long nowMillis, TimeZone tz) {
        Item copy = item.copy();
        String unit = item.unit;
        if ("minute".equals(unit) || "hour".equals(unit)) {
            long unitMs = "minute".equals(unit) ? MINUTE_MS : HOUR_MS;
            long dueMillis = nowMillis + copy.every * unitMs;
            Calendar dueCal = new GregorianCalendar(tz);
            dueCal.setTimeInMillis(dueMillis);
            dueCal.set(Calendar.SECOND, 0);
            dueCal.set(Calendar.MILLISECOND, 0);
            copy.dueDate = formatDate(dueCal, tz);
            copy.time = formatTime(dueCal, tz);
        } else if ("day".equals(unit)) {
            Calendar today = new GregorianCalendar(tz);
            today.setTimeInMillis(nowMillis);
            today.set(Calendar.HOUR_OF_DAY, 0);
            today.set(Calendar.MINUTE, 0);
            today.set(Calendar.SECOND, 0);
            today.set(Calendar.MILLISECOND, 0);
            today.add(Calendar.DAY_OF_MONTH, copy.every);
            copy.dueDate = formatDate(today, tz);
            // time is UNCHANGED
        } else if ("week".equals(unit)) {
            Calendar today = new GregorianCalendar(tz);
            today.setTimeInMillis(nowMillis);
            today.set(Calendar.HOUR_OF_DAY, 0);
            today.set(Calendar.MINUTE, 0);
            today.set(Calendar.SECOND, 0);
            today.set(Calendar.MILLISECOND, 0);
            today.add(Calendar.DAY_OF_MONTH, copy.every * 7);
            copy.dueDate = formatDate(today, tz);
            // time is UNCHANGED
        } else if ("month".equals(unit)) {
            // addMonths from today at the time of completion? use today's date as base
            Calendar todayBase = new GregorianCalendar(tz);
            todayBase.setTimeInMillis(nowMillis);
            // use the date components of today
            Calendar baseDate = parseDate(formatDate(todayBase, tz), tz);
            Calendar newDate = addMonthsCalendarFromDate(baseDate, copy.every, tz);
            copy.dueDate = formatDate(newDate, tz);
            // time is UNCHANGED
        } else if ("year".equals(unit)) {
            Calendar todayBase = new GregorianCalendar(tz);
            todayBase.setTimeInMillis(nowMillis);
            Calendar baseDate = parseDate(formatDate(todayBase, tz), tz);
            Calendar newDate = addMonthsCalendarFromDate(baseDate, copy.every * 12, tz);
            copy.dueDate = formatDate(newDate, tz);
            // time is UNCHANGED
        }
        copy.doneCount = copy.doneCount + 1;
        Calendar todayLocal = new GregorianCalendar(tz);
        todayLocal.setTimeInMillis(nowMillis);
        copy.lastDone = formatDate(todayLocal, tz);
        copy.snoozeUntil = 0;
        return copy;
    }

    private static Calendar addMonthsCalendarFromDate(Calendar baseDate, int count, TimeZone tz) {
        int originalDay = baseDate.get(Calendar.DAY_OF_MONTH);
        Calendar target = new GregorianCalendar(tz);
        target.set(Calendar.YEAR, baseDate.get(Calendar.YEAR));
        target.set(Calendar.MONTH, baseDate.get(Calendar.MONTH));
        target.set(Calendar.DAY_OF_MONTH, 1);
        target.add(Calendar.MONTH, count);
        int lastDay = target.getActualMaximum(Calendar.DAY_OF_MONTH);
        target.set(Calendar.DAY_OF_MONTH, Math.min(originalDay, lastDay));
        target.set(Calendar.HOUR_OF_DAY, 0);
        target.set(Calendar.MINUTE, 0);
        target.set(Calendar.SECOND, 0);
        target.set(Calendar.MILLISECOND, 0);
        return target;
    }

    public static Item snoozed(Item item, long nowMillis) {
        Item copy = item.copy();
        copy.snoozeUntil = nowMillis + 10 * MINUTE_MS;
        return copy;
    }

    public static List<Alarm> alarms(Item item, long nowMillis, int reminderCount, TimeZone tz) {
        List<Alarm> result = new ArrayList<Alarm>();
        if (isFinished(item)) {
            return result;
        }
        long dueAt = dueAtMillis(item, tz);
        if (dueAt > nowMillis) {
            result.add(new Alarm(dueAt, "due", 0));
        }
        if (reminderCount > 0) {
            long gap = 0;
            if ("minute".equals(item.unit) || "hour".equals(item.unit)) {
                long unitMs = "minute".equals(item.unit) ? MINUTE_MS : HOUR_MS;
                gap = item.every * unitMs;
                if (gap < FIVE_MINUTES_MS) gap = FIVE_MINUTES_MS;
                if (gap > SIXTY_MINUTES_MS) gap = SIXTY_MINUTES_MS;
            }
            for (int k = 1; k <= reminderCount; k++) {
                long when;
                if ("minute".equals(item.unit) || "hour".equals(item.unit)) {
                    when = dueAt + k * gap;
                } else {
                    // for day/week/month/year the k-th reminder is dueAt moved forward k calendar DAYS
                    Calendar cal = new GregorianCalendar(tz);
                    cal.setTimeInMillis(dueAt);
                    cal.add(Calendar.DAY_OF_MONTH, k);
                    when = cal.getTimeInMillis();
                }
                if (when > nowMillis) {
                    result.add(new Alarm(when, "reminder", k));
                }
            }
        }
        if (item.snoozeUntil > nowMillis) {
            result.add(new Alarm(item.snoozeUntil, "snooze", 95));
            // drop every "reminder" whose time is before snoozeUntil
            List<Alarm> filtered = new ArrayList<Alarm>();
            for (Alarm alarm : result) {
                if ("reminder".equals(alarm.kind)) {
                    if (alarm.atMillis < item.snoozeUntil) {
                        continue;
                    }
                }
                filtered.add(alarm);
            }
            result = filtered;
        }
        Collections.sort(result, new Comparator<Alarm>() {
            public int compare(Alarm a, Alarm b) {
                if (a.atMillis < b.atMillis) return -1;
                if (a.atMillis > b.atMillis) return 1;
                return 0;
            }
        });
        return result;
    }

    public static int notificationCode(long itemId, int k) {
        return ((int) (Math.abs(itemId) % 20000000L)) * 100 + k;
    }
}
