import { useEffect, useState } from 'react';
import {
  getDebugEntries,
  subscribeDebug,
  clearDebugEntries,
  isDebugOverlayEnabled,
  setDebugOverlayEnabled,
} from './debugLog';

// Floating, draggable-ish (top-anchored, fixed position) translucent panel
// that shows the most recent debug entries. Activation:
//  - localStorage.smartsofa.debugOverlay = '1' (or call __debugOn())
//  - secret gesture: 5 quick taps on the top-right 40x40 corner
export function DebugOverlay() {
  const [, force] = useState(0);
  const [enabled, setEnabled] = useState(isDebugOverlayEnabled());
  const [collapsed, setCollapsed] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    const unsub = subscribeDebug(() => force((n) => (n + 1) % 1_000_000));
    return unsub;
  }, []);

  // Reset secret tap count if more than 1.5s passes
  useEffect(() => {
    if (tapCount === 0) return;
    const t = setTimeout(() => setTapCount(0), 1500);
    return () => clearTimeout(t);
  }, [tapCount]);

  const handleSecretTap = () => {
    setTapCount((c) => {
      const next = c + 1;
      if (next >= 5) {
        const newVal = !enabled;
        setDebugOverlayEnabled(newVal);
        setEnabled(newVal);
        return 0;
      }
      return next;
    });
  };

  // Always-mounted invisible 40x40 corner tap target (top-right) used to
  // toggle the overlay even before the user knows the feature exists.
  const corner = (
    <div
      onClick={handleSecretTap}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 44,
        height: 44,
        zIndex: 99998,
        // Fully transparent. No visible UI to avoid distracting normal users.
      }}
    />
  );

  if (!enabled) return corner;

  const entries = getDebugEntries();
  const latest = entries.slice(-60); // most recent 60

  return (
    <>
      {corner}
      <div
        style={{
          position: 'fixed',
          left: 4,
          right: 4,
          bottom: 4,
          maxHeight: collapsed ? 28 : '45vh',
          background: 'rgba(0,0,0,0.78)',
          color: '#0f0',
          fontFamily: 'Menlo, Consolas, monospace',
          fontSize: 10,
          lineHeight: 1.25,
          borderRadius: 6,
          zIndex: 99999,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            background: 'rgba(255,255,255,0.08)',
          }}
        >
          <span style={{ color: '#fff', fontWeight: 600 }}>
            DEBUG ({entries.length})
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCollapsed((c) => !c)}
              style={btnStyle}
            >
              {collapsed ? '▲' : '▼'}
            </button>
            <button onClick={() => clearDebugEntries()} style={btnStyle}>
              clear
            </button>
            <button
              onClick={() => {
                setDebugOverlayEnabled(false);
                setEnabled(false);
              }}
              style={btnStyle}
            >
              ✕
            </button>
          </div>
        </div>
        {!collapsed && (
          <div
            style={{
              padding: '4px 8px',
              overflowY: 'auto',
              maxHeight: 'calc(45vh - 28px)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {latest.map((e, i) => {
              const ts = new Date(e.t);
              const hh = ts.getHours().toString().padStart(2, '0');
              const mm = ts.getMinutes().toString().padStart(2, '0');
              const ss = ts.getSeconds().toString().padStart(2, '0');
              const ms = ts.getMilliseconds().toString().padStart(3, '0');
              return (
                <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  <span style={{ color: '#888' }}>{hh}:{mm}:{ss}.{ms} </span>
                  <span style={{ color: '#ff0' }}>[{e.tag}]</span> {e.msg}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  color: '#fff',
  fontSize: 11,
  padding: '2px 8px',
  borderRadius: 4,
};
