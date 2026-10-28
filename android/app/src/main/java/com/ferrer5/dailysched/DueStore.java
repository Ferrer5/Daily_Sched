package com.ferrer5.dailysched;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class DueStore {
    private static final String PREFS_NAME = "due_alarms";
    private static final String KEY_ITEMS = "items";
    private static final String KEY_OVERDUE_REMINDERS = "overdue_reminders";
    private static final String KEY_SOUND_ID = "sound_id";
    private static final String KEY_SCHEDULED_CODES = "scheduled_codes";
    private static final String KEY_PATCHES = "patches";

    private static SharedPreferences getPrefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static void saveItems(Context context, JSONArray itemsJson) {
        if (itemsJson == null) {
            itemsJson = new JSONArray();
        }
        getPrefs(context).edit().putString(KEY_ITEMS, itemsJson.toString()).apply();
    }

    public static JSONArray getItemsJson(Context context) {
        String s = getPrefs(context).getString(KEY_ITEMS, "[]");
        try {
            return new JSONArray(s);
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    public static List<DueMath.Item> getItems(Context context) {
        List<DueMath.Item> result = new ArrayList<DueMath.Item>();
        JSONArray arr = getItemsJson(context);
        for (int i = 0; i < arr.length(); i++) {
            try {
                JSONObject obj = arr.getJSONObject(i);
                DueMath.Item item = jsonToItem(obj);
                result.add(item);
            } catch (Exception e) {
                // skip corrupt
            }
        }
        return result;
    }

    public static DueMath.Item jsonToItem(JSONObject obj) throws JSONException {
        DueMath.Item item = new DueMath.Item();
        if (obj.has("id")) {
            item.id = obj.getLong("id");
        } else {
            item.id = 0;
        }
        item.title = obj.optString("title", "");
        item.detail = obj.optString("detail", "");
        item.time = obj.optString("time", "00:00");
        item.dueDate = obj.optString("dueDate", "1970-01-01");
        JSONObject interval = obj.optJSONObject("interval");
        if (interval != null) {
            item.every = interval.optInt("every", 1);
            item.unit = interval.optString("unit", "day");
        } else {
            item.every = obj.optInt("every", 1);
            item.unit = obj.optString("unit", "day");
        }
        item.endAfter = obj.optInt("endAfter", 0);
        item.doneCount = obj.optInt("doneCount", 0);
        if (obj.isNull("lastDone") || !obj.has("lastDone")) {
            item.lastDone = null;
        } else {
            item.lastDone = obj.optString("lastDone");
        }
        if (obj.isNull("snoozeUntil") || !obj.has("snoozeUntil")) {
            item.snoozeUntil = 0;
        } else {
            try {
                item.snoozeUntil = obj.getLong("snoozeUntil");
            } catch (Exception e) {
                item.snoozeUntil = 0;
            }
        }
        return item;
    }

    public static JSONObject itemToJson(DueMath.Item item) throws JSONException {
        JSONObject obj = new JSONObject();
        obj.put("id", item.id);
        obj.put("title", item.title == null ? "" : item.title);
        obj.put("detail", item.detail == null ? "" : item.detail);
        obj.put("time", item.time == null ? "00:00" : item.time);
        obj.put("dueDate", item.dueDate == null ? "1970-01-01" : item.dueDate);
        JSONObject interval = new JSONObject();
        interval.put("every", item.every);
        interval.put("unit", item.unit == null ? "day" : item.unit);
        obj.put("interval", interval);
        obj.put("endAfter", item.endAfter);
        obj.put("doneCount", item.doneCount);
        if (item.lastDone == null) {
            obj.put("lastDone", JSONObject.NULL);
        } else {
            obj.put("lastDone", item.lastDone);
        }
        if (item.snoozeUntil == 0) {
            obj.put("snoozeUntil", JSONObject.NULL);
        } else {
            obj.put("snoozeUntil", item.snoozeUntil);
        }
        return obj;
    }

    public static void saveItem(Context context, DueMath.Item item) {
        try {
            JSONArray arr = getItemsJson(context);
            JSONArray newArr = new JSONArray();
            boolean updated = false;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                long id = obj.optLong("id", Long.MIN_VALUE / 4);
                if (id == item.id) {
                    newArr.put(itemToJson(item));
                    updated = true;
                } else {
                    newArr.put(obj);
                }
            }
            if (!updated) {
                newArr.put(itemToJson(item));
            }
            saveItems(context, newArr);
        } catch (Exception e) {
        }
    }

    public static DueMath.Item getItem(Context context, long id) {
        JSONArray arr = getItemsJson(context);
        for (int i = 0; i < arr.length(); i++) {
            try {
                JSONObject obj = arr.getJSONObject(i);
                if (obj.optLong("id", Long.MIN_VALUE / 4) == id) {
                    return jsonToItem(obj);
                }
            } catch (Exception e) {
            }
        }
        return null;
    }

    public static void removeItem(Context context, long id) {
        try {
            JSONArray arr = getItemsJson(context);
            JSONArray newArr = new JSONArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                if (obj.optLong("id", Long.MIN_VALUE / 4) == id) {
                    continue;
                }
                newArr.put(obj);
            }
            saveItems(context, newArr);
        } catch (Exception e) {
        }
    }

    public static int getOverdueReminders(Context context) {
        return getPrefs(context).getInt(KEY_OVERDUE_REMINDERS, 5);
    }

    public static void setOverdueReminders(Context context, int count) {
        getPrefs(context).edit().putInt(KEY_OVERDUE_REMINDERS, count).apply();
    }

    public static String getSoundId(Context context) {
        String s = getPrefs(context).getString(KEY_SOUND_ID, "chime");
        return s == null ? "chime" : s;
    }

    public static void setSoundId(Context context, String soundId) {
        getPrefs(context).edit().putString(KEY_SOUND_ID, soundId == null ? "chime" : soundId).apply();
    }

    public static void setSettings(Context context, JSONObject settings) {
        try {
            if (settings != null) {
                if (settings.has("overdueReminders")) {
                    setOverdueReminders(context, settings.optInt("overdueReminders", 5));
                }
                if (settings.has("soundId")) {
                    setSoundId(context, settings.optString("soundId", "chime"));
                }
            }
        } catch (Exception e) {
        }
    }

    public static Set<Integer> getScheduledCodes(Context context) {
        Set<String> set = getPrefs(context).getStringSet(KEY_SCHEDULED_CODES, new HashSet<String>());
        Set<Integer> codes = new HashSet<Integer>();
        if (set == null) return codes;
        for (String s : set) {
            try {
                codes.add(Integer.parseInt(s));
            } catch (Exception e) {
            }
        }
        return codes;
    }

    public static void saveScheduledCodes(Context context, Set<Integer> codes) {
        Set<String> set = new HashSet<String>();
        if (codes != null) {
            for (Integer c : codes) {
                if (c != null) set.add(String.valueOf(c));
            }
        }
        getPrefs(context).edit().putStringSet(KEY_SCHEDULED_CODES, set).apply();
    }

    public static void addPatch(Context context, long id, String dueDate, String time, int doneCount, String lastDone, Long snoozeUntil) {
        try {
            JSONArray patches = getPatchesJson(context);
            JSONObject patch = new JSONObject();
            patch.put("id", id);
            patch.put("dueDate", dueDate);
            patch.put("time", time);
            patch.put("doneCount", doneCount);
            if (lastDone == null) {
                patch.put("lastDone", JSONObject.NULL);
            } else {
                patch.put("lastDone", lastDone);
            }
            if (snoozeUntil == null || snoozeUntil == 0) {
                patch.put("snoozeUntil", JSONObject.NULL);
            } else {
                patch.put("snoozeUntil", snoozeUntil);
            }
            patches.put(patch);
            getPrefs(context).edit().putString(KEY_PATCHES, patches.toString()).apply();
        } catch (Exception e) {
        }
    }

    private static JSONArray getPatchesJson(Context context) {
        String s = getPrefs(context).getString(KEY_PATCHES, "[]");
        try {
            return new JSONArray(s);
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    public static Set<Long> getPatchedIds(Context context) {
        Set<Long> ids = new HashSet<Long>();
        JSONArray patches = getPatchesJson(context);
        for (int i = 0; i < patches.length(); i++) {
            try {
                JSONObject p = patches.getJSONObject(i);
                if (p.has("id")) {
                    ids.add(p.getLong("id"));
                }
            } catch (Exception e) {
            }
        }
        return ids;
    }

    public static JSONArray takeAllPatches(Context context) {
        JSONArray patches = getPatchesJson(context);
        getPrefs(context).edit().putString(KEY_PATCHES, "[]").apply();
        return patches;
    }

    public static boolean hasPatchFor(Context context, long id) {
        return getPatchedIds(context).contains(id);
    }
}