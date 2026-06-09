package com.smarthome.control;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothClass;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothProfile;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.KeyEvent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@CapacitorPlugin(name = "MediaControl")
public class MediaControlPlugin extends Plugin {
    private static final String TAG = "MediaControlPlugin";

    private BluetoothAdapter bluetoothAdapter;
    private AudioManager audioManager;
    private BluetoothProfile a2dpProxy;
    private MediaSessionManager mediaSessionManager;
    private ComponentName notificationComponent;
    private Handler mainHandler;
    private MediaController activeController;
    private MediaSessionManager.OnActiveSessionsChangedListener sessionsListener;

    // Classic Bluetooth Discovery
    private boolean isDiscovering = false;
    private final List<JSONObject> discoveredClassicDevices = Collections.synchronizedList(new ArrayList<>());
    private BroadcastReceiver discoveryReceiver;

    @Override
    public void load() {
        try {
            bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
        } catch (Exception e) {
            Log.e(TAG, "Failed to get BluetoothAdapter", e);
        }
        try {
            audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        } catch (Exception e) {
            Log.e(TAG, "Failed to get AudioManager", e);
        }
        try {
            mediaSessionManager = (MediaSessionManager) getContext().getSystemService(Context.MEDIA_SESSION_SERVICE);
        } catch (Exception e) {
            Log.e(TAG, "Failed to get MediaSessionManager", e);
        }
        try {
            notificationComponent = new ComponentName(getContext(), MediaNotificationListener.class);
        } catch (Exception e) {
            Log.e(TAG, "Failed to create notification component", e);
        }
        mainHandler = new Handler(Looper.getMainLooper());

        sessionsListener = controllers -> updateActiveController(controllers);

        try {
            initA2dpProxy();
        } catch (Exception e) {
            Log.e(TAG, "initA2dpProxy failed", e);
        }
        try {
            initDiscoveryReceiver();
        } catch (Exception e) {
            Log.e(TAG, "initDiscoveryReceiver failed", e);
        }
        try {
            registerReceivers();
        } catch (Exception e) {
            Log.e(TAG, "registerReceivers failed", e);
        }

        if (mediaSessionManager != null) {
            try {
                mediaSessionManager.addOnActiveSessionsChangedListener(sessionsListener, notificationComponent);
                List<MediaController> sessions = mediaSessionManager.getActiveSessions(notificationComponent);
                updateActiveController(sessions);
            } catch (SecurityException e) {
                Log.w(TAG, "No permission to access media sessions", e);
            }
        }

        mainHandler.postDelayed(this::emitState, 1000);
    }

    @Override
    protected void handleOnDestroy() {
        unregisterReceivers();
        if (discoveryReceiver != null) {
            try {
                getContext().unregisterReceiver(discoveryReceiver);
            } catch (Exception e) {}
        }
        if (mediaSessionManager != null && sessionsListener != null) {
            try {
                mediaSessionManager.removeOnActiveSessionsChangedListener(sessionsListener);
            } catch (Exception e) {
                Log.w(TAG, "Error removing sessions listener", e);
            }
        }
        if (a2dpProxy != null && bluetoothAdapter != null) {
            bluetoothAdapter.closeProfileProxy(BluetoothProfile.A2DP, a2dpProxy);
            a2dpProxy = null;
        }
        super.handleOnDestroy();
    }

    // ===== A2DP & Media Status =====

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(buildState());
    }

    @PluginMethod
    public void sendMediaCommand(PluginCall call) {
        String action = call.getString("action");
        if (action == null) {
            call.reject("Action is required");
            return;
        }

        int keyCode;
        switch (action) {
            case "playPause":
                keyCode = KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE;
                break;
            case "next":
                keyCode = KeyEvent.KEYCODE_MEDIA_NEXT;
                break;
            case "previous":
                keyCode = KeyEvent.KEYCODE_MEDIA_PREVIOUS;
                break;
            default:
                call.reject("Unknown action: " + action);
                return;
        }

        boolean sent = dispatchMediaButton(keyCode);
        JSObject ret = new JSObject();
        ret.put("success", sent);
        call.resolve(ret);
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void isNotificationListenerEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", isNotificationServiceEnabled());
        call.resolve(ret);
    }

    // ===== Classic Bluetooth Discovery =====

    @PluginMethod
    public void startDiscovery(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth not available");
            return;
        }
        try {
            if (!bluetoothAdapter.isEnabled()) {
                call.reject("Bluetooth is disabled");
                return;
            }
        } catch (SecurityException e) {
            call.reject("No BLUETOOTH_CONNECT permission");
            return;
        }

        try {
            if (bluetoothAdapter.isDiscovering()) {
                bluetoothAdapter.cancelDiscovery();
            }
        } catch (SecurityException e) {
            Log.w(TAG, "No permission to cancel discovery", e);
        }

        discoveredClassicDevices.clear();

        // Add already bonded devices first
        try {
            for (BluetoothDevice device : bluetoothAdapter.getBondedDevices()) {
                addDeviceToList(device, (short) 0, true);
            }
        } catch (SecurityException e) {
            Log.w(TAG, "No permission to get bonded devices", e);
        }
        sortDeviceList();
        emitDiscoveryResult();

        boolean started = false;
        try {
            started = bluetoothAdapter.startDiscovery();
        } catch (SecurityException e) {
            Log.w(TAG, "No permission to start discovery", e);
        }
        isDiscovering = started;
        emitDiscoveryState();

        JSObject ret = new JSObject();
        ret.put("started", started);
        call.resolve(ret);

        // Auto stop after 12s
        mainHandler.postDelayed(() -> {
            try {
                if (bluetoothAdapter != null && bluetoothAdapter.isDiscovering()) {
                    bluetoothAdapter.cancelDiscovery();
                }
            } catch (SecurityException e) {
                Log.w(TAG, "No permission to auto-cancel discovery", e);
            }
            isDiscovering = false;
            emitDiscoveryState();
        }, 12000);
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        if (bluetoothAdapter != null && bluetoothAdapter.isDiscovering()) {
            bluetoothAdapter.cancelDiscovery();
        }
        isDiscovering = false;
        emitDiscoveryState();
        call.resolve();
    }

    @PluginMethod
    public void getDiscoveredDevices(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            ret.put("devices", new JSONArray(new ArrayList<>(discoveredClassicDevices)));
        } catch (Exception e) {
            ret.put("devices", new JSONArray());
        }
        ret.put("isDiscovering", isDiscovering);
        call.resolve(ret);
    }

    @PluginMethod
    public void bondDevice(PluginCall call) {
        String address = call.getString("address");
        if (address == null) {
            call.reject("Address is required");
            return;
        }
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth not available");
            return;
        }

        try {
            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
            boolean result;
            if (device.getBondState() == BluetoothDevice.BOND_BONDED) {
                result = true;
            } else {
                result = device.createBond();
            }
            JSObject ret = new JSObject();
            ret.put("success", result);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to bond: " + e.getMessage());
        }
    }

    @PluginMethod
    public void connectA2dp(PluginCall call) {
        String address = call.getString("address");
        if (address == null) {
            call.reject("Address is required");
            return;
        }
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth not available");
            return;
        }

        // Ensure A2DP proxy is initialized
        if (a2dpProxy == null) {
            initA2dpProxy();
        }

        try {
            BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
            boolean result = false;

            if (a2dpProxy != null) {
                // BluetoothA2dp.connect() is hidden API, use reflection
                java.lang.reflect.Method connectMethod = a2dpProxy.getClass().getMethod("connect", BluetoothDevice.class);
                result = (boolean) connectMethod.invoke(a2dpProxy, device);
            }

            // Refresh proxy and emit state after a delay
            mainHandler.postDelayed(() -> {
                initA2dpProxy();
                emitState();
            }, 1000);

            JSObject ret = new JSObject();
            ret.put("success", result);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "A2DP connect failed", e);
            call.reject("A2DP connect failed: " + e.getMessage());
        }
    }

    // ===== Internal Methods =====

    private void initDiscoveryReceiver() {
        discoveryReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                    BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                    short rssi = intent.getShortExtra(BluetoothDevice.EXTRA_RSSI, (short) 0);
                    if (device != null) {
                        addDeviceToList(device, rssi, false);
                        sortDeviceList();
                        emitDiscoveryResult();
                    }
                } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                    isDiscovering = false;
                    emitDiscoveryState();
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(BluetoothDevice.ACTION_FOUND);
        filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            getContext().registerReceiver(discoveryReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(discoveryReceiver, filter);
        }
    }

    private void addDeviceToList(BluetoothDevice device, short rssi, boolean isBonded) {
        try {
            String address = device.getAddress();
            // Skip if already in list
            synchronized (discoveredClassicDevices) {
                for (JSONObject existing : discoveredClassicDevices) {
                    if (address.equals(existing.optString("address"))) {
                        // Update RSSI if found again
                        if (rssi != 0) {
                            existing.put("rssi", rssi);
                        }
                        return;
                    }
                }
            }

            JSONObject info = new JSONObject();
            info.put("address", address);
            info.put("name", device.getName() != null ? device.getName() : "Unknown Device");
            info.put("rssi", rssi);
            info.put("bondState", device.getBondState());
            info.put("isBonded", isBonded);

            boolean isAudio = false;
            BluetoothClass btClass = device.getBluetoothClass();
            if (btClass != null) {
                int majorClass = btClass.getMajorDeviceClass();
                isAudio = (majorClass == BluetoothClass.Device.Major.AUDIO_VIDEO);
            }
            info.put("isAudio", isAudio);

            discoveredClassicDevices.add(info);
        } catch (JSONException e) {
            Log.e(TAG, "JSON error", e);
        }
    }

    private void sortDeviceList() {
        synchronized (discoveredClassicDevices) {
            Collections.sort(discoveredClassicDevices, new Comparator<JSONObject>() {
                @Override
                public int compare(JSONObject a, JSONObject b) {
                    boolean aAudio = a.optBoolean("isAudio", false);
                    boolean bAudio = b.optBoolean("isAudio", false);
                    if (aAudio && !bAudio) return -1;
                    if (!aAudio && bAudio) return 1;
                    // Same category: bonded first, then by RSSI
                    boolean aBonded = a.optBoolean("isBonded", false);
                    boolean bBonded = b.optBoolean("isBonded", false);
                    if (aBonded && !bBonded) return -1;
                    if (!aBonded && bBonded) return 1;
                    return 0;
                }
            });
        }
    }

    private void updateActiveController(List<MediaController> controllers) {
        activeController = null;

        if (controllers != null) {
            for (MediaController controller : controllers) {
                if (controller.getPlaybackState() != null &&
                    controller.getPlaybackState().getState() == PlaybackState.STATE_PLAYING) {
                    activeController = controller;
                    break;
                }
            }

            if (activeController == null && !controllers.isEmpty()) {
                activeController = controllers.get(0);
            }
        }

        emitState();
    }

    private JSObject buildState() {
        JSObject ret = new JSObject();

        boolean a2dpConnected = isA2dpConnected();
        ret.put("a2dpConnected", a2dpConnected);
        ret.put("deviceName", getConnectedA2dpDeviceName());
        ret.put("musicActive", isMusicActive());
        ret.put("notificationEnabled", isNotificationServiceEnabled());

        if (activeController != null) {
            MediaMetadata metadata = activeController.getMetadata();
            if (metadata != null) {
                String title = metadata.getString(MediaMetadata.METADATA_KEY_TITLE);
                String artist = metadata.getString(MediaMetadata.METADATA_KEY_ARTIST);
                String album = metadata.getString(MediaMetadata.METADATA_KEY_ALBUM);
                long duration = metadata.getLong(MediaMetadata.METADATA_KEY_DURATION);

                ret.put("title", title != null ? title : "");
                ret.put("artist", artist != null ? artist : "");
                ret.put("album", album != null ? album : "");
                ret.put("duration", duration > 0 ? duration / 1000 : 0);
            } else {
                ret.put("title", "");
                ret.put("artist", "");
                ret.put("album", "");
                ret.put("duration", 0);
            }

            PlaybackState pbState = activeController.getPlaybackState();
            if (pbState != null) {
                ret.put("isPlaying", pbState.getState() == PlaybackState.STATE_PLAYING);
                long position = pbState.getPosition();
                ret.put("position", position > 0 ? position / 1000 : 0);
            } else {
                ret.put("isPlaying", false);
                ret.put("position", 0);
            }
        } else {
            ret.put("title", "");
            ret.put("artist", "");
            ret.put("album", "");
            ret.put("isPlaying", false);
            ret.put("duration", 0);
            ret.put("position", 0);
        }

        return ret;
    }

    private void emitState() {
        notifyListeners("mediaStateChanged", buildState());
    }

    private void emitDiscoveryResult() {
        JSObject ret = new JSObject();
        try {
            ret.put("devices", new JSONArray(new ArrayList<>(discoveredClassicDevices)));
        } catch (Exception e) {
            ret.put("devices", new JSONArray());
        }
        ret.put("isDiscovering", isDiscovering);
        notifyListeners("discoveryResult", ret);
    }

    private void emitDiscoveryState() {
        JSObject ret = new JSObject();
        ret.put("isDiscovering", isDiscovering);
        notifyListeners("discoveryStateChanged", ret);
    }

    private boolean isA2dpConnected() {
        if (a2dpProxy != null) {
            try {
                List<BluetoothDevice> devices = a2dpProxy.getConnectedDevices();
                boolean connected = !devices.isEmpty();
                Log.d(TAG, "A2DP connected=" + connected + ", devices=" + devices.size());
                return connected;
            } catch (SecurityException e) {
                Log.w(TAG, "No permission to get connected A2DP devices", e);
            }
        }
        Log.d(TAG, "A2DP proxy is null");
        return false;
    }

    private String getConnectedA2dpDeviceName() {
        if (a2dpProxy != null) {
            try {
                List<BluetoothDevice> devices = a2dpProxy.getConnectedDevices();
                if (!devices.isEmpty()) {
                    BluetoothDevice device = devices.get(0);
                    String name = device.getName();
                    return name != null ? name : "";
                }
            } catch (SecurityException e) {
                Log.w(TAG, "No permission to get A2DP device name", e);
            }
        }
        return "";
    }

    private boolean isMusicActive() {
        return audioManager != null && audioManager.isMusicActive();
    }

    private boolean dispatchMediaButton(int keyCode) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT && audioManager != null) {
                long time = System.currentTimeMillis();
                audioManager.dispatchMediaKeyEvent(new KeyEvent(time, time, KeyEvent.ACTION_DOWN, keyCode, 0));
                audioManager.dispatchMediaKeyEvent(new KeyEvent(time, time, KeyEvent.ACTION_UP, keyCode, 0));
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "dispatchMediaKeyEvent failed", e);
        }
        return false;
    }

    private boolean isNotificationServiceEnabled() {
        String flat = android.provider.Settings.Secure.getString(
            getContext().getContentResolver(),
            "enabled_notification_listeners"
        );
        if (flat != null) {
            String pkgName = getContext().getPackageName();
            for (String name : flat.split(":")) {
                if (name.contains(pkgName)) {
                    return true;
                }
            }
        }
        return false;
    }

    private void initA2dpProxy() {
        if (bluetoothAdapter == null) {
            Log.d(TAG, "Bluetooth adapter is null");
            return;
        }
        try {
            if (!bluetoothAdapter.isEnabled()) {
                Log.d(TAG, "Bluetooth is disabled");
                return;
            }
        } catch (SecurityException e) {
            Log.w(TAG, "No BLUETOOTH_CONNECT permission to check enabled state", e);
            return;
        }
        try {
            bluetoothAdapter.getProfileProxy(getContext(), new BluetoothProfile.ServiceListener() {
                @Override
                public void onServiceConnected(int profile, BluetoothProfile proxy) {
                    if (profile == BluetoothProfile.A2DP) {
                        a2dpProxy = proxy;
                        Log.d(TAG, "A2DP proxy connected");
                        emitState();
                    }
                }

                @Override
                public void onServiceDisconnected(int profile) {
                    if (profile == BluetoothProfile.A2DP) {
                        a2dpProxy = null;
                        emitState();
                    }
                }
            }, BluetoothProfile.A2DP);
        } catch (Exception e) {
            Log.e(TAG, "getProfileProxy failed", e);
        }
    }

    private void registerReceivers() {
        IntentFilter filter = new IntentFilter();
        filter.addAction(BluetoothDevice.ACTION_ACL_CONNECTED);
        filter.addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED);
        filter.addAction(BluetoothAdapter.ACTION_CONNECTION_STATE_CHANGED);
        filter.addAction(AudioManager.ACTION_AUDIO_BECOMING_NOISY);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            getContext().registerReceiver(bluetoothReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(bluetoothReceiver, filter);
        }
    }

    private void unregisterReceivers() {
        try {
            getContext().unregisterReceiver(bluetoothReceiver);
        } catch (Exception e) {
            // ignore
        }
    }

    private final BroadcastReceiver bluetoothReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (BluetoothDevice.ACTION_ACL_CONNECTED.equals(action) ||
                BluetoothDevice.ACTION_ACL_DISCONNECTED.equals(action) ||
                BluetoothAdapter.ACTION_CONNECTION_STATE_CHANGED.equals(action)) {
                mainHandler.postDelayed(() -> {
                    initA2dpProxy();
                    emitState();
                }, 500);
            }
        }
    };
}
