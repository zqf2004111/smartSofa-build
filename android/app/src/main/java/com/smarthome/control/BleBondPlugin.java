package com.smarthome.control;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.reflect.Method;

@CapacitorPlugin(name = "BleBond")
public class BleBondPlugin extends Plugin {
    private static final String TAG = "BleBondPlugin";

    @PluginMethod
    public void removeBond(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            call.reject("Missing address");
            return;
        }

        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) {
            call.reject("Bluetooth adapter not available");
            return;
        }

        try {
            BluetoothDevice device = adapter.getRemoteDevice(address);
            Method removeBondMethod = device.getClass().getMethod("removeBond");
            boolean result = (Boolean) removeBondMethod.invoke(device);
            Log.d(TAG, "removeBond(" + address + ") returned " + result);
            JSObject ret = new JSObject();
            ret.put("success", result);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "removeBond failed", e);
            call.reject("removeBond failed", e);
        }
    }
}
