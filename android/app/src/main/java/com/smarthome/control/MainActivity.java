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
import android.view.View;
import android.view.WindowInsetsController;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "SmartSofaNFC";

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
        for (Parcelable raw : rawMessages) {
            if (!(raw instanceof NdefMessage)) continue;
            NdefMessage msg = (NdefMessage) raw;
            for (NdefRecord rec : msg.getRecords()) {
                Uri u = recordToUri(rec);
                if (u != null) return u;
            }
        }
        return intent.getData();
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
