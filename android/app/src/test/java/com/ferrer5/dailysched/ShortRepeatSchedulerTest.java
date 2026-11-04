package com.ferrer5.dailysched;

import org.junit.Test;

import static org.junit.Assert.assertEquals;

public class ShortRepeatSchedulerTest {
    @Test
    public void nextOccurrenceSkipsPastIntervals() {
        assertEquals(1300L, ShortRepeatScheduler.nextOccurrenceMillis(1000L, 100L, 1250L, 0));
    }

    @Test
    public void nextOccurrenceSkipsAnOccurrenceAtNow() {
        assertEquals(1200L, ShortRepeatScheduler.nextOccurrenceMillis(1000L, 100L, 1100L, 0));
    }

    @Test
    public void endAfterStopsAfterTheRequestedNumberOfOccurrences() {
        assertEquals(-1L, ShortRepeatScheduler.nextOccurrenceMillis(1000L, 100L, 1300L, 3));
        assertEquals(1200L, ShortRepeatScheduler.nextOccurrenceMillis(1000L, 100L, 1100L, 4));
    }
}
