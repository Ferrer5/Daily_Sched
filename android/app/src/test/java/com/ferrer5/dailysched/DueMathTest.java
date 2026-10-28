package com.ferrer5.dailysched;

import org.junit.Test;

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.List;
import java.util.TimeZone;

import static org.junit.Assert.*;

public class DueMathTest {
    @Test
    public void testMinuteAndHour() {
        TimeZone tz = TimeZone.getTimeZone("Asia/Manila");
        // minute task every 1, completed at 10:00:45 -> due 10:01 same day
        DueMath.Item item = new DueMath.Item();
        item.id = 1;
        item.title = "Test";
        item.time = "10:00";
        item.dueDate = "2025-10-28";
        item.unit = "minute";
        item.every = 1;
        item.endAfter = 0;
        item.doneCount = 0;
        item.lastDone = null;
        item.snoozeUntil = 0;
        // complete at 10:00:45
        Calendar completeAt = new GregorianCalendar(tz);
        completeAt.set(2025, Calendar.OCTOBER, 28, 10, 0, 45);
        completeAt.set(Calendar.MILLISECOND, 0);
        DueMath.Item completed = DueMath.completed(item, completeAt.getTimeInMillis(), tz);
        assertEquals("2025-10-28", completed.dueDate);
        assertEquals("10:01", completed.time);
        assertEquals(1, completed.doneCount);
        assertEquals("2025-10-28", completed.lastDone);
        assertEquals(0, completed.snoozeUntil);

        // every 30 minutes crossing midnight -> next day's date
        DueMath.Item item2 = new DueMath.Item();
        item2.id = 2;
        item2.time = "23:50";
        item2.dueDate = "2025-10-28";
        item2.unit = "minute";
        item2.every = 30;
        item2.endAfter = 0;
        item2.doneCount = 0;
        Calendar completeAt2 = new GregorianCalendar(tz);
        completeAt2.set(2025, Calendar.OCTOBER, 28, 23, 50, 10);
        completeAt2.set(Calendar.MILLISECOND, 0);
        DueMath.Item completed2 = DueMath.completed(item2, completeAt2.getTimeInMillis(), tz);
        assertEquals("2025-10-29", completed2.dueDate);
        assertEquals("00:20", completed2.time);
    }

    @Test
    public void testHourCrossingMidnight() {
        TimeZone tz = TimeZone.getTimeZone("Asia/Manila");
        // hour task every 2 completed at 23:10 -> next day 01:10
        DueMath.Item item = new DueMath.Item();
        item.id = 3;
        item.time = "23:10";
        item.dueDate = "2025-10-28";
        item.unit = "hour";
        item.every = 2;
        item.endAfter = 0;
        item.doneCount = 0;
        Calendar completeAt = new GregorianCalendar(tz);
        completeAt.set(2025, Calendar.OCTOBER, 28, 23, 10, 0);
        DueMath.Item completed = DueMath.completed(item, completeAt.getTimeInMillis(), tz);
        assertEquals("2025-10-29", completed.dueDate);
        assertEquals("01:10", completed.time);
    }

    @Test
    public void testDayWeek() {
        TimeZone tz = TimeZone.getTimeZone("Asia/Manila");
        // day every 3 -> today+3, time unchanged
        DueMath.Item item = new DueMath.Item();
        item.id = 4;
        item.time = "14:30";
        item.dueDate = "2025-10-28";
        item.unit = "day";
        item.every = 3;
        item.endAfter = 0;
        item.doneCount = 1;
        Calendar completeAt = new GregorianCalendar(tz);
        completeAt.set(2025, Calendar.OCTOBER, 28, 9, 0, 0);
        DueMath.Item completed = DueMath.completed(item, completeAt.getTimeInMillis(), tz);
        assertEquals("2025-10-31", completed.dueDate);
        assertEquals("14:30", completed.time); // time unchanged
        assertEquals(2, completed.doneCount);

        // week every 1 -> +7 days
        DueMath.Item item2 = new DueMath.Item();
        item2.id = 5;
        item2.time = "08:00";
        item2.dueDate = "2025-10-28";
        item2.unit = "week";
        item2.every = 1;
        Calendar completeAt2 = new GregorianCalendar(tz);
        completeAt2.set(2025, Calendar.OCTOBER, 28, 12, 0, 0);
        DueMath.Item completed2 = DueMath.completed(item2, completeAt2.getTimeInMillis(), tz);
        assertEquals("2025-11-04", completed2.dueDate);
        assertEquals("08:00", completed2.time);
    }

    @Test
    public void testMonth() {
        TimeZone tz = TimeZone.getTimeZone("Asia/Manila");
        // Jan 31 +1 -> Feb 28 (non-leap)
        DueMath.Item item = new DueMath.Item();
        item.id = 6;
        item.time = "10:00";
        item.unit = "month";
        item.every = 1;
        Calendar completeAt = new GregorianCalendar(tz);
        completeAt.set(2025, Calendar.JANUARY, 31, 15, 0, 0);
        DueMath.Item completed = DueMath.completed(item, completeAt.getTimeInMillis(), tz);
        assertEquals("2025-02-28", completed.dueDate);
        assertEquals("10:00", completed.time);

        // Jan 31 +1 -> Feb 29 (leap year)
        Calendar completeAtLeap = new GregorianCalendar(tz);
        completeAtLeap.set(2028, Calendar.JANUARY, 31, 15, 0, 0);
        DueMath.Item completedLeap = DueMath.completed(item, completeAtLeap.getTimeInMillis(), tz);
        assertEquals("2028-02-29", completedLeap.dueDate);

        // Jan 5 +1 -> Feb 5
        DueMath.Item item2 = new DueMath.Item();
        item2.id = 7;
        item2.time = "09:00";
        item2.unit = "month";
        item2.every = 1;
        Calendar completeAt2 = new GregorianCalendar(tz);
        completeAt2.set(2025, Calendar.JANUARY, 5, 10, 0, 0);
        DueMath.Item completed2 = DueMath.completed(item2, completeAt2.getTimeInMillis(), tz);
        assertEquals("2025-02-05", completed2.dueDate);
        assertEquals("09:00", completed2.time);

        // every 3 months from Nov 30 -> Feb 28/29
        DueMath.Item item3 = new DueMath.Item();
        item3.id = 8;
        item3.time = "12:00";
        item3.unit = "month";
        item3.every = 3;
        Calendar completeAt3 = new GregorianCalendar(tz);
        completeAt3.set(2025, Calendar.NOVEMBER, 30, 8, 0, 0);
        DueMath.Item completed3 = DueMath.completed(item3, completeAt3.getTimeInMillis(), tz);
        assertEquals("2026-02-28", completed3.dueDate);

        Calendar completeAt3b = new GregorianCalendar(tz);
        completeAt3b.set(2027, Calendar.NOVEMBER, 30, 8, 0, 0);
        DueMath.Item completed3b = DueMath.completed(item3, completeAt3b.getTimeInMillis(), tz);
        assertEquals("2028-02-29", completed3b.dueDate);
    }

    @Test
    public void testYear() {
        TimeZone tz = TimeZone.getTimeZone("Asia/Manila");
        // year every 1 from Feb 29 2028 -> Feb 28 2029
        DueMath.Item item = new DueMath.Item();
        item.id = 9;
        item.time = "10:00";
        item.unit = "year";
        item.every = 1;
        Calendar completeAt = new GregorianCalendar(tz);
        completeAt.set(2028, Calendar.FEBRUARY, 29, 10, 0, 0);
        DueMath.Item completed = DueMath.completed(item, completeAt.getTimeInMillis(), tz);
        assertEquals("2029-02-28", completed.dueDate);
        assertEquals("10:00", completed.time);
    }

    @Test
    public void testDoneCountAndFinished() {
        TimeZone tz = TimeZone.getTimeZone("Asia/Manila");
        DueMath.Item item = new DueMath.Item();
        item.id = 10;
        item.time = "10:00";
        item.dueDate = "2025-10-28";
        item.unit = "day";
        item.every = 1;
        item.endAfter = 3;
        item.doneCount = 1;
        assertFalse(DueMath.isFinished(item));
        item.doneCount = 3;
        assertTrue(DueMath.isFinished(item));
        item.doneCount = 2;
        Calendar completeAt = new GregorianCalendar(tz);
        completeAt.set(2025, Calendar.OCTOBER, 28, 10, 0, 0);
        DueMath.Item completed = DueMath.completed(item, completeAt.getTimeInMillis(), tz);
        assertEquals(3, completed.doneCount);
        assertTrue(DueMath.isFinished(completed));
    }

    @Test
    public void testAlarms() {
        TimeZone tz = TimeZone.getTimeZone("Asia/Manila");
        // a minute task every 1 due in 2 minutes with reminderCount 3 -> due alarm + reminders exactly 5 minutes apart
        DueMath.Item item = new DueMath.Item();
        item.id = 100;
        item.time = "10:02";
        item.dueDate = "2025-10-28";
        item.unit = "minute";
        item.every = 1;
        item.endAfter = 0;
        item.doneCount = 0;
        item.snoozeUntil = 0;
        Calendar nowCal = new GregorianCalendar(tz);
        nowCal.set(2025, Calendar.OCTOBER, 28, 10, 0, 0);
        nowCal.set(Calendar.MILLISECOND, 0);
        List<DueMath.Alarm> alarms = DueMath.alarms(item, nowCal.getTimeInMillis(), 3, tz);
        // due at 10:02, reminders 5 min apart? gap for minute/hour = clamp(every * unitMs, 5 min, 60 min) -> every 1 min = 1*60000 = 1 min, clamped to 5 min
        assertEquals(4, alarms.size());
        assertEquals("due", alarms.get(0).kind);
        assertEquals(0, alarms.get(0).k);
        assertEquals(1, alarms.get(1).k);
        assertEquals(2, alarms.get(2).k);
        assertEquals(3, alarms.get(3).k);
        assertEquals(5 * 60 * 1000, alarms.get(1).atMillis - alarms.get(0).atMillis);
        assertEquals(5 * 60 * 1000, alarms.get(2).atMillis - alarms.get(1).atMillis);
        assertEquals(5 * 60 * 1000, alarms.get(3).atMillis - alarms.get(2).atMillis);

        // an hour task every 2 -> reminders 60 minutes apart
        DueMath.Item item2 = new DueMath.Item();
        item2.id = 101;
        item2.time = "12:00";
        item2.dueDate = "2025-10-28";
        item2.unit = "hour";
        item2.every = 2;
        item2.endAfter = 0;
        item2.snoozeUntil = 0;
        Calendar nowCal2 = new GregorianCalendar(tz);
        nowCal2.set(2025, Calendar.OCTOBER, 28, 10, 0, 0);
        nowCal2.set(Calendar.MILLISECOND, 0);
        List<DueMath.Alarm> alarms2 = DueMath.alarms(item2, nowCal2.getTimeInMillis(), 3, tz);
        // gap clamped to 60 min max
        assertEquals(60 * 60 * 1000, alarms2.get(1).atMillis - alarms2.get(0).atMillis);
        assertEquals(60 * 60 * 1000, alarms2.get(2).atMillis - alarms2.get(1).atMillis);
        assertEquals(60 * 60 * 1000, alarms2.get(3).atMillis - alarms2.get(2).atMillis);

        // a day task already 2 days overdue with reminderCount 5 -> only reminders still in the future, 1 calendar day apart at the same clock time
        DueMath.Item item3 = new DueMath.Item();
        item3.id = 102;
        item3.time = "09:00";
        item3.dueDate = "2025-10-26"; // 2 days overdue from 28th
        item3.unit = "day";
        item3.every = 1;
        item3.endAfter = 0;
        item3.snoozeUntil = 0;
        Calendar nowCal3 = new GregorianCalendar(tz);
        nowCal3.set(2025, Calendar.OCTOBER, 28, 10, 0, 0);
        nowCal3.set(Calendar.MILLISECOND, 0);
        List<DueMath.Alarm> alarms3 = DueMath.alarms(item3, nowCal3.getTimeInMillis(), 5, tz);
        // dueAt is in the past (Oct 26 09:00) so due alarm not added if dueAt > now is false
        assertEquals(3, alarms3.size());
        // all should be reminders, 1 calendar day apart
        for (int i = 0; i < alarms3.size(); i++) {
            assertEquals("reminder", alarms3.get(i).kind);
        }
        assertEquals(3, alarms3.get(0).k);
        assertEquals(4, alarms3.get(1).k);
        assertEquals(5, alarms3.get(2).k);
        if (alarms3.size() >= 2) {
            // check 1 day apart
            Calendar a1 = new GregorianCalendar(tz);
            a1.setTimeInMillis(alarms3.get(0).atMillis);
            Calendar a2 = new GregorianCalendar(tz);
            a2.setTimeInMillis(alarms3.get(1).atMillis);
            assertEquals(a1.get(Calendar.HOUR_OF_DAY), a2.get(Calendar.HOUR_OF_DAY));
            assertEquals(a1.get(Calendar.MINUTE), a2.get(Calendar.MINUTE));
            // 1 day difference
            long diffDays = (a2.getTimeInMillis() - a1.getTimeInMillis()) / (24 * 60 * 60 * 1000);
            assertEquals(1, diffDays);
        }

        // reminderCount 0 -> only the due alarm
        DueMath.Item item4 = new DueMath.Item();
        item4.id = 103;
        item4.time = "11:00";
        item4.dueDate = "2025-10-28";
        item4.unit = "day";
        item4.every = 1;
        item4.endAfter = 0;
        item4.snoozeUntil = 0;
        Calendar nowCal4 = new GregorianCalendar(tz);
        nowCal4.set(2025, Calendar.OCTOBER, 28, 10, 0, 0);
        nowCal4.set(Calendar.MILLISECOND, 0);
        List<DueMath.Alarm> alarms4 = DueMath.alarms(item4, nowCal4.getTimeInMillis(), 0, tz);
        assertEquals(1, alarms4.size());
        assertEquals("due", alarms4.get(0).kind);

        // snoozeUntil in the future -> a "snooze" alarm and no reminders before it
        DueMath.Item item5 = new DueMath.Item();
        item5.id = 104;
        item5.time = "10:00";
        item5.dueDate = "2025-10-28";
        item5.unit = "minute";
        item5.every = 1;
        item5.endAfter = 0;
        Calendar nowCal5 = new GregorianCalendar(tz);
        nowCal5.set(2025, Calendar.OCTOBER, 28, 10, 20, 0);
        nowCal5.set(Calendar.MILLISECOND, 0);
        item5.snoozeUntil = nowCal5.getTimeInMillis() + 30 * 60 * 1000;
        List<DueMath.Alarm> alarms5 = DueMath.alarms(item5, nowCal5.getTimeInMillis(), 5, tz);
        assertEquals(1, alarms5.size());
        assertEquals("snooze", alarms5.get(0).kind);
        assertEquals(95, alarms5.get(0).k);
        // reminders k = 1..2 (10:05, 10:10 are past; 10:15 past) are absent
        for (DueMath.Alarm a : alarms5) {
            if ("reminder".equals(a.kind)) {
                assertTrue(a.atMillis >= item5.snoozeUntil);
            }
        }

        // finished item -> empty list
        DueMath.Item item6 = new DueMath.Item();
        item6.id = 105;
        item6.time = "12:00";
        item6.dueDate = "2025-10-28";
        item6.unit = "day";
        item6.every = 1;
        item6.endAfter = 2;
        item6.doneCount = 2;
        item6.snoozeUntil = 0;
        List<DueMath.Alarm> alarms6 = DueMath.alarms(item6, nowCal5.getTimeInMillis(), 5, tz);
        assertEquals(0, alarms6.size());
    }

    @Test
    public void testDstDayReminder() {
        TimeZone tzNY = TimeZone.getTimeZone("America/New_York");
        // spring-forward: due 2025-03-08 09:00, now = 2025-03-08 08:00, reminderCount 3
        DueMath.Item item = new DueMath.Item();
        item.id = 200;
        item.time = "09:00";
        item.dueDate = "2025-03-08";
        item.unit = "day";
        item.every = 1;
        item.endAfter = 0;
        item.snoozeUntil = 0;
        Calendar nowCal = new GregorianCalendar(tzNY);
        nowCal.set(2025, Calendar.MARCH, 8, 8, 0, 0);
        nowCal.set(Calendar.MILLISECOND, 0);
        List<DueMath.Alarm> alarms = DueMath.alarms(item, nowCal.getTimeInMillis(), 3, tzNY);
        // due alarm plus 3 reminders
        assertEquals(4, alarms.size());
        assertEquals("due", alarms.get(0).kind);
        for (int i = 0; i < alarms.size(); i++) {
            Calendar a = new GregorianCalendar(tzNY);
            a.setTimeInMillis(alarms.get(i).atMillis);
            assertEquals(9, a.get(Calendar.HOUR_OF_DAY));
            assertEquals(0, a.get(Calendar.MINUTE));
        }
        // due -> reminder 1 is exactly 23 hours (spring-forward)
        long gap1 = alarms.get(1).atMillis - alarms.get(0).atMillis;
        assertEquals(23 * 60 * 60 * 1000, gap1);

        // fall-back: due 2025-11-01 09:00, now 08:00
        DueMath.Item item2 = new DueMath.Item();
        item2.id = 201;
        item2.time = "09:00";
        item2.dueDate = "2025-11-01";
        item2.unit = "day";
        item2.every = 1;
        item2.endAfter = 0;
        item2.snoozeUntil = 0;
        Calendar nowCal2 = new GregorianCalendar(tzNY);
        nowCal2.set(2025, Calendar.NOVEMBER, 1, 8, 0, 0);
        nowCal2.set(Calendar.MILLISECOND, 0);
        List<DueMath.Alarm> alarms2 = DueMath.alarms(item2, nowCal2.getTimeInMillis(), 1, tzNY);
        assertEquals(2, alarms2.size());
        long gap2 = alarms2.get(1).atMillis - alarms2.get(0).atMillis;
        assertEquals(25 * 60 * 60 * 1000, gap2);
    }
}
