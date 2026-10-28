package com.ferrer5.dailysched;

import android.content.Context;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "DueAlarms")
public class DueAlarmsPlugin extends Plugin {
    private static DueAlarmsPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void notifyPatches() {
        try {
            if (instance == null) {
                return;
            }
            Context appContext = instance.getContext().getApplicationContext();
            if (!DueStore.getPatchedIds(appContext).isEmpty()) {
                instance.notifyListeners("patchesAvailable", new JSObject());
            }
        } catch (Exception e) {
            // ignore
        }
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        notifyPatches();
    }

    @PluginMethod
    public void sync(PluginCall call) {
        try {
            String itemsStr = call.getString("items");
            JSObject settings = call.getObject("settings");
            Context appContext = getContext().getApplicationContext();
            if (itemsStr == null) {
                call.reject("items is required");
                return;
            }
            if (settings == null) {
                call.reject("settings is required");
                return;
            }
            JSONArray incoming;
            try {
                incoming = new JSONArray(itemsStr);
            } catch (Exception e) {
                call.reject("items must be valid JSON array");
                return;
            }
            // store settings
            try {
                JSONObject settingsJson = new JSONObject();
                if (settings.has("overdueReminders")) {
                    settingsJson.put("overdueReminders", settings.getInt("overdueReminders"));
                }
                if (settings.has("soundId")) {
                    settingsJson.put("soundId", settings.getString("soundId"));
                }
                DueStore.setSettings(appContext, settingsJson);
            } catch (Exception e) {
                // ignore
            }
            // apply rule: if there is a pending patch for an item id, keep native's stored version of that item and ignore the incoming one
            Set<Long> patchedIds = DueStore.getPatchedIds(appContext);
            JSONArray stored = DueStore.getItemsJson(appContext);
            // build map of stored by id
            java.util.HashMap<Long, JSONObject> storedMap = new java.util.HashMap<Long, JSONObject>();
            for (int i = 0; i < stored.length(); i++) {
                try {
                    JSONObject s = stored.getJSONObject(i);
                    if (s.has("id")) {
                        storedMap.put(s.getLong("id"), s);
                    }
                } catch (Exception e) {
                }
            }
            // build result array
            JSONArray result = new JSONArray();
            // items that are in incoming and not patched - add/update from incoming; items patched keep stored
            // also need to track which incoming ids we've processed
            Set<Long> incomingIds = new HashSet<Long>();
            for (int i = 0; i < incoming.length(); i++) {
                try {
                    JSONObject in = incoming.getJSONObject(i);
                    if (!in.has("id")) {
                        continue;
                    }
                    long id = in.getLong("id");
                    incomingIds.add(id);
                    if (patchedIds.contains(id)) {
                        // keep native's stored version
                        if (storedMap.containsKey(id)) {
                            result.put(storedMap.get(id));
                        } else {
                            // if not in stored map but patched, still skip incoming
                        }
                    } else {
                        // use incoming, normalize
                        JSONObject out = normalizeIncoming(in);
                        result.put(out);
                    }
                } catch (Exception e) {
                    // skip bad item
                }
            }
            // items no longer in incoming list are deleted - so don't add them
            DueStore.saveItems(appContext, result);
            try {
                DueScheduler.rescheduleAll(appContext);
            } catch (Exception e) {
            }
            JSObject ret = new JSObject();
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("sync failed: " + e.getMessage());
        }
    }

    private JSONObject normalizeIncoming(JSONObject in) {
        try {
            JSONObject out = new JSONObject();
            out.put("id", in.getLong("id"));
            out.put("title", in.optString("title", ""));
            out.put("detail", in.optString("detail", ""));
            out.put("time", in.optString("time", "00:00"));
            out.put("dueDate", in.optString("dueDate", "1970-01-01"));
            if (in.has("interval")) {
                out.put("interval", in.getJSONObject("interval"));
            } else {
                JSONObject interval = new JSONObject();
                interval.put("every", in.optInt("every", 1));
                interval.put("unit", in.optString("unit", "day"));
                out.put("interval", interval);
            }
            out.put("endAfter", in.optInt("endAfter", 0));
            out.put("doneCount", in.optInt("doneCount", 0));
            if (in.isNull("lastDone") || !in.has("lastDone")) {
                out.put("lastDone", JSONObject.NULL);
            } else {
                out.put("lastDone", in.optString("lastDone"));
            }
            if (in.isNull("snoozeUntil") || !in.has("snoozeUntil")) {
                out.put("snoozeUntil", JSONObject.NULL);
            } else {
                try {
                    out.put("snoozeUntil", in.getLong("snoozeUntil"));
                } catch (Exception e) {
                    out.put("snoozeUntil", JSONObject.NULL);
                }
            }
            return out;
        } catch (Exception e) {
            return in;
        }
    }

    @PluginMethod
    public void takePatches(PluginCall call) {
        try {
            Context appContext = getContext().getApplicationContext();
            JSONArray patches = DueStore.takeAllPatches(appContext);
            JSObject ret = new JSObject();
            ret.put("patches", patches.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("takePatches failed: " + e.getMessage());
        }
    }
}