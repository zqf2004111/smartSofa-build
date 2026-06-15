// Lightweight in-app debug log buffer for on-device diagnosis.
// We avoid React state to keep this usable from non-React modules
// (e.g. bluetooth/ble.ts). Components subscribe via subscribe() and
// trigger their own re-renders.

// Optional remote sink: when set (e.g. "http://172.30.48.2:8765/log"),
// every pushDebug() also POSTs to that URL. Useful on iOS where there is
// no easy stdout / overlay-free console. Set via window.__remoteLog(url).
let REMOTE_LOG_URL: string | null = null;
try {
  // Preserve across reloads — handy for native WebView.
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('smartsofa.remoteLog') : null;
  if (saved) REMOTE_LOG_URL = saved;
} catch { /* ignore */ }

// Default to project LAN dev box if nothing else has been configured.
// Safe to leave on: if the host is unreachable the fetch silently fails.
// [Disabled] 默认远程回传暂时关闭，避免发布版本向 LAN 调试服务器发送日志。
// if (!REMOTE_LOG_URL) {
//   REMOTE_LOG_URL = 'http://172.30.48.2:8765/log';
// }

export function setRemoteLog(url: string | null): void {
  REMOTE_LOG_URL = url;
  try {
    if (url) localStorage.setItem('smartsofa.remoteLog', url);
    else localStorage.removeItem('smartsofa.remoteLog');
  } catch { /* ignore */ }
}

function sendRemote(_tag: string, _msg: string): void {
  // [Disabled] 暂时关闭日志回传，保留函数体以便后续恢复。
  return;
  // const url = REMOTE_LOG_URL;
  // if (!url) return;
  // try {
  //   // Fire-and-forget. keepalive lets it survive page transitions.
  //   fetch(url, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ tag, msg, t: Date.now() }),
  //     keepalive: true,
  //   }).catch(() => { /* ignore */ });
  // } catch { /* ignore */ }
}

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
  sendRemote(tag, msg);
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
// > __remoteLog('http://192.168.x.x:8765/log') to override LAN sink
// > __remoteLog(null) to disable
if (typeof window !== 'undefined') {
  (window as any).__debugOn = () => { setDebugOverlayEnabled(true); window.location.reload(); };
  (window as any).__debugOff = () => { setDebugOverlayEnabled(false); window.location.reload(); };
  (window as any).__remoteLog = (url: string | null) => setRemoteLog(url);
}
