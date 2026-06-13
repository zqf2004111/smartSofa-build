import { useEffect, useState } from 'react';
import { getDebugEntries, subscribeDebug, clearDebugEntries } from './debugLog';

// Always-on debug overlay. Positioned over the sofa image area in the
// middle of the screen so it's visible without any activation gesture.
// Remove this component (or guard with __DEV__) before shipping to App Store.
export function DebugOverlay() {
  const [, force] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const unsub = subscribeDebug(() => force((n) => (n + 1) % 1_000_000));
    return unsub;
  }, []);

  const entries = getDebugEntries();
  const latest = entries.slice(-40); // most recent 40 fit nicely

  return (
    <div
      style={{
        position: 'fixed',
        // Anchor over the sofa image (roughly the vertical middle of the screen).
        top: '18%',
        left: 8,
        right: 8,
        maxHeight: collapsed ? 28 : '40vh',
        background: 'rgba(0,0,0,0.78)',
        color: '#0f0',
        fontFamily: 'Menlo, Consolas, monospace',
        fontSize: 10,
        lineHeight: 1.25,
        borderRadius: 6,
        zIndex: 99999,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        pointerEvents: 'auto',
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
          <button onClick={() => setCollapsed((c) => !c)} style={btnStyle}>
            {collapsed ? '▲' : '▼'}
          </button>
          <button onClick={() => clearDebugEntries()} style={btnStyle}>
            clear
          </button>
        </div>
      </div>
      {!collapsed && (
        <div
          style={{
            padding: '4px 8px',
            overflowY: 'auto',
            maxHeight: 'calc(40vh - 28px)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {latest.length === 0 && (
            <div style={{ color: '#888' }}>(no events yet — tap a heating/ventilation mode)</div>
          )}
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
