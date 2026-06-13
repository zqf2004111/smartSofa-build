// Lightweight in-app debug log buffer for on-device diagnosis.
// We avoid React state to keep this usable from non-React modules
// (e.g. bluetooth/ble.ts). Components subscribe via subscribe() and
// trigger their own re-renders.

export type DebugEntry = {
  t: number;          // epoch ms
  tag: string;        // short category
  msg: string;        // human readable
};

const MAX_ENTRIES = 200;
const buffer: DebugEntry[] = [];
const listeners = new Set<() => void>();

export function pushDebug(tag: string, msg: string): void {
  buffer.push({ t: Date.now(), tag, msg });
  if (buffer.length > MAX_ENTRIES) {
    buffer.splice(0, buffer.length - MAX_ENTRIES);
  }
  listeners.forEach((cb) => {
    try { cb(); } catch { /* ignore */ }
  });
}

export function getDebugEntries(): DebugEntry[] {
  return buffer;
}

export function clearDebugEntries(): void {
  buffer.length = 0;
  listeners.forEach((cb) => {
    try { cb(); } catch { /* ignore */ }
  });
}

export function subscribeDebug(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Persistent toggle so the overlay survives reloads while diagnosing.
const STORAGE_KEY = 'smartsofa.debugOverlay';

export function isDebugOverlayEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDebugOverlayEnabled(on: boolean): void {
  try {
    if (on) localStorage.setItem(STORAGE_KEY, '1');
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

// Globals for easy enable from Safari Web Inspector / on-device:
// > __debugOn() / __debugOff()
if (typeof window !== 'undefined') {
  (window as any).__debugOn = () => { setDebugOverlayEnabled(true); window.location.reload(); };
  (window as any).__debugOff = () => { setDebugOverlayEnabled(false); window.location.reload(); };
}
