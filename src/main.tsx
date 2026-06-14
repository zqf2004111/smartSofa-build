import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { pushDebug } from './debug/debugLog';

try { pushDebug('VOL', 'main.tsx eval'); } catch {}
const rootEl = document.getElementById('root')!;
try { pushDebug('VOL', `root el=${rootEl ? 'ok' : 'null'}`); } catch {}
const _root = createRoot(rootEl);
try { pushDebug('VOL', 'createRoot done'); } catch {}
_root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
try { pushDebug('VOL', 'root.render() called'); } catch {}

// Detect if window/document is being reloaded
window.addEventListener('beforeunload', () => {
  try { pushDebug('VOL', 'BEFOREUNLOAD'); } catch {}
});
window.addEventListener('error', (e) => {
  try { pushDebug('VOL', `WINDOW ERR ${String(e.message).slice(0,80)}`); } catch {}
});
window.addEventListener('unhandledrejection', (e: any) => {
  try { pushDebug('VOL', `UNHANDLED REJ ${String(e?.reason).slice(0,80)}`); } catch {}
});
