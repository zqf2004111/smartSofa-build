import { useEffect, useRef, useState } from 'react';
import { getDebugEntries, subscribeDebug, clearDebugEntries } from './debugLog';

// Compact, draggable debug overlay.
// - Defaults to COLLAPSED (header bar only) so it never blocks the sofa
//   image or any button.
// - Anchored to the very top of the screen by default, can be dragged
//   anywhere by long-pressing the header bar.
// - Filters noisy low-level RX/TX frames by default. Toggle "all" in the
//   header to see them.
// - "pause" stops re-rendering so the screen stays still while the user
//   reads the trace.
// Remove (or guard with __DEV__) before shipping to App Store.

const NOISY_TAGS = new Set(['RX', 'TX']);

interface Pos {
  top: number;
  left: number;
}

const POS_KEY = 'debug-overlay-pos';
const COLLAPSED_KEY = 'debug-overlay-collapsed';
const SHOW_ALL_KEY = 'debug-overlay-show-all';

function loadPos(): Pos {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.top === 'number' && typeof p.left === 'number') return p;
    }
  } catch {
    /* ignore */
  }
  return { top: 4, left: 8 };
}

export function DebugOverlay() {
  const [, force] = useState(0);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(COLLAPSED_KEY) !== '0';
  });
  const [showAll, setShowAll] = useState<boolean>(() => {
    return localStorage.getItem(SHOW_ALL_KEY) === '1';
  });
  const [paused, setPaused] = useState(false);
  const [pos, setPos] = useState<Pos>(() => loadPos());
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origTop: number;
    origLeft: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    if (paused) return;
    const unsub = subscribeDebug(() => force((n) => (n + 1) % 1_000_000));
    return unsub;
  }, [paused]);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);
  useEffect(() => {
    localStorage.setItem(SHOW_ALL_KEY, showAll ? '1' : '0');
  }, [showAll]);
  useEffect(() => {
    localStorage.setItem(POS_KEY, JSON.stringify(pos));
  }, [pos]);

  const allEntries = getDebugEntries();
  const filtered = showAll
    ? allEntries
    : allEntries.filter((e) => !NOISY_TAGS.has(e.tag));
  const latest = filtered.slice(-30);

  const onPointerDown = (e: React.PointerEvent) => {
    // Don't start drag from buttons
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origTop: pos.top,
      origLeft: pos.left,
      moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const newLeft = Math.max(0, Math.min(vw - 60, d.origLeft + dx));
    const newTop = Math.max(0, Math.min(vh - 24, d.origTop + dy));
    setPos({ top: newTop, left: newLeft });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = null;
  };

  const width = collapsed ? 'auto' : 'min(420px, calc(100vw - 16px))';

  return (
    <div
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width,
        maxHeight: collapsed ? 24 : '38vh',
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
        touchAction: 'none',
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '2px 6px',
          background: 'rgba(255,255,255,0.08)',
          cursor: 'move',
          userSelect: 'none',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 600 }}>
          DBG {filtered.length}/{allEntries.length}
        </span>
        <button onClick={() => setCollapsed((c) => !c)} style={btnStyle}>
          {collapsed ? '▲' : '▼'}
        </button>
        {!collapsed && (
          <>
            <button
              onClick={() => setShowAll((s) => !s)}
              style={{ ...btnStyle, color: showAll ? '#0ff' : '#fff' }}
              title="toggle RX/TX raw frames"
            >
              {showAll ? 'all' : 'evt'}
            </button>
            <button
              onClick={() => setPaused((p) => !p)}
              style={{ ...btnStyle, color: paused ? '#ff0' : '#fff' }}
            >
              {paused ? '▶' : '⏸'}
            </button>
            <button onClick={() => clearDebugEntries()} style={btnStyle}>
              clr
            </button>
          </>
        )}
      </div>
      {!collapsed && (
        <div
          style={{
            padding: '4px 6px',
            overflowY: 'auto',
            maxHeight: 'calc(38vh - 24px)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {latest.length === 0 && (
            <div style={{ color: '#888' }}>
              (no events yet — tap a heating/ventilation mode)
            </div>
          )}
          {latest.map((e, i) => {
            const ts = new Date(e.t);
            const hh = ts.getHours().toString().padStart(2, '0');
            const mm = ts.getMinutes().toString().padStart(2, '0');
            const ss = ts.getSeconds().toString().padStart(2, '0');
            const ms = ts.getMilliseconds().toString().padStart(3, '0');
            return (
              <div
                key={i}
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
              >
                <span style={{ color: '#888' }}>
                  {hh}:{mm}:{ss}.{ms}{' '}
                </span>
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
  padding: '1px 6px',
  borderRadius: 4,
  lineHeight: 1.1,
};
