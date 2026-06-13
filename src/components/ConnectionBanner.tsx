/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useDevice } from '../context';

/**
 * Top-of-screen banner that surfaces BLE link issues:
 * - "reconnecting" while the manager retries
 * - "disconnected" (with a Reconnect button) after retries exhausted
 * - hidden while connected
 *
 * Only renders when there is a saved device (i.e. the user expects a connection).
 */
export function ConnectionBanner() {
  const { bleState, savedDevices, reconnectDevice } = useDevice();
  const [hideOnConnected, setHideOnConnected] = useState(false);
  const [busy, setBusy] = useState(false);

  // Briefly show a "Reconnected" success flash when transitioning back to connected.
  const [showReconnectedFlash, setShowReconnectedFlash] = useState(false);
  useEffect(() => {
    if (bleState === 'connected') {
      // If we previously showed the banner (because we were not connected),
      // flash a success message for ~1.5s.
      if (hideOnConnected) {
        setShowReconnectedFlash(true);
        const t = setTimeout(() => setShowReconnectedFlash(false), 1500);
        return () => clearTimeout(t);
      }
    } else {
      setHideOnConnected(true);
    }
  }, [bleState, hideOnConnected]);

  if (savedDevices.length === 0) return null;
  if (bleState === 'connected' && !showReconnectedFlash) return null;

  let message = '';
  let bg = 'bg-amber-500';
  let showReconnect = false;
  if (bleState === 'connected' && showReconnectedFlash) {
    message = 'Device reconnected';
    bg = 'bg-emerald-500';
  } else if (bleState === 'reconnecting' || bleState === 'connecting') {
    message = 'Reconnecting to device…';
    bg = 'bg-amber-500';
  } else if (bleState === 'disconnected') {
    message = 'Device disconnected';
    bg = 'bg-red-500';
    showReconnect = true;
  } else if (bleState === 'scanning') {
    return null;
  }

  const handleReconnect = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await reconnectDevice();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${bg} text-white text-xs px-4 py-2 flex items-center justify-between flex-shrink-0 z-50`}>
      <span className="truncate">{message}</span>
      {showReconnect && (
        <button
          onClick={handleReconnect}
          disabled={busy}
          className="ml-3 px-2.5 py-1 rounded bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white text-xs font-medium"
        >
          {busy ? '…' : 'Reconnect'}
        </button>
      )}
    </div>
  );
}
