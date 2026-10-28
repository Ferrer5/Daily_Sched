package com.ferrer5.dailysched;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DueAlarmsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
