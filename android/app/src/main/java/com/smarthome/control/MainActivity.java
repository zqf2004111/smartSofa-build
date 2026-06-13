package com.smarthome.control;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.os.Build;
import android.os.Bundle;
import android.os.Parcelable;
import android.util.Log;

import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import android.view.View;
import android.view.WindowInsetsController;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "SmartSofaNFC";
    /** External Type record domain:type — present in NDEF tags written by us. */
    private static final String EXT_TYPE = "vnd.smartsofa.com:pair";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        WebView.setWebContentsDebuggingEnabled(true);
        registerPlugin(MediaControlPlugin.class);
        registerPlugin(BleBondPlugin.class);
        // Convert NFC NDEF intent → VIEW intent BEFORE super.onCreate
        // so Capacitor App plugin picks it up via getLaunchUrl().
        rewriteNfcIntent(getIntent());
        super.onCreate(savedInstanceState);

        // Immersive status bar
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                );
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
        getWindow().setStatusBarColor(Color.TRANSPARENT);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        // App already running, NFC tap → rewrite then forward to Capacitor.
        rewriteNfcIntent(intent);
        super.onNewIntent(intent);
    }

    /**
     * If the incoming intent is an NFC NDEF_DISCOVERED, extract the first URI record
     * from the NDEF message and rewrite the intent action to VIEW with that Uri.
     * Capacitor's @capacitor/app plugin emits 'appUrlOpen' for ACTION_VIEW intents,
     * so the existing JS listener (src/context.tsx) handles it without modification.
     */
    private void rewriteNfcIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action)
                && !NfcAdapter.ACTION_TAG_DISCOVERED.equals(action)
                && !NfcAdapter.ACTION_TECH_DISCOVERED.equals(action)) {
            return;
        }
        Uri uri = extractUriFromNdef(intent);
        if (uri == null) {
            Log.w(TAG, "NFC tag had no URI record, action=" + action);
            return;
        }
        Log.i(TAG, "NFC tag URI extracted: " + uri);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(uri);
    }

    private Uri extractUriFromNdef(Intent intent) {
        Parcelable[] rawMessages = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
        if (rawMessages == null || rawMessages.length == 0) {
            // Fallback: TAG_DISCOVERED without parsed NDEF — use intent's data if any
            return intent.getData();
        }
        // Pass 1: prefer our External Type record (vnd.smartsofa.com:pair)
        // — carries structured payload that may include data not present in the URI record.
        for (Parcelable raw : rawMessages) {
            if (!(raw instanceof NdefMessage)) continue;
            for (NdefRecord rec : ((NdefMessage) raw).getRecords()) {
                Uri u = externalRecordToUri(rec);
                if (u != null) {
                    Log.i(TAG, "NFC external record matched: " + u);
                    return u;
                }
            }
        }
        // Pass 2: fall back to first URI record (works for tags written without our external type)
        for (Parcelable raw : rawMessages) {
            if (!(raw instanceof NdefMessage)) continue;
            for (NdefRecord rec : ((NdefMessage) raw).getRecords()) {
                Uri u = recordToUri(rec);
                if (u != null) return u;
            }
        }
        return intent.getData();
    }

    /**
     * Decode a vnd.smartsofa.com:pair external record. Payload is expected to be a UTF-8
     * JSON object like {"name":"KD_SOF","serial":"...","model":"..."}; returns a synthesized
     * smartsofa://pair?name=...&serial=...&model=... Uri so the existing JS handler
     * (src/context.tsx) can consume it via standard URL parsing.
     *
     * For forward compatibility, also accepts a plain string payload (treated as name).
     */
    private Uri externalRecordToUri(NdefRecord rec) {
        if (rec.getTnf() != NdefRecord.TNF_EXTERNAL_TYPE) return null;
        String type = new String(rec.getType(), StandardCharsets.US_ASCII);
        if (!EXT_TYPE.equalsIgnoreCase(type)) return null;
        byte[] payload = rec.getPayload();
        if (payload == null || payload.length == 0) return null;
        String text = new String(payload, StandardCharsets.UTF_8).trim();

        Uri.Builder b = new Uri.Builder().scheme("smartsofa").authority("pair");
        boolean any = false;
        if (text.startsWith("{")) {
            try {
                JSONObject obj = new JSONObject(text);
                java.util.Iterator<String> keys = obj.keys();
                while (keys.hasNext()) {
                    String k = keys.next();
                    String v = obj.optString(k, null);
                    if (v != null && !v.isEmpty()) {
                        b.appendQueryParameter(k, v);
                        any = true;
                    }
                }
            } catch (Throwable t) {
                Log.w(TAG, "external payload not JSON, treating as name: " + text);
            }
        }
        if (!any) {
            // Fallback: bare string → treat as device name
            b.appendQueryParameter("name", text);
        }
        return b.build();
    }

    private Uri recordToUri(NdefRecord rec) {
        try {
            // Built-in helper handles WELL_KNOWN/U, ABSOLUTE_URI, smart poster, etc.
            Uri u = rec.toUri();
            if (u != null && u.getScheme() != null) return u;
        } catch (Throwable ignored) {}
        return null;
    }
}
