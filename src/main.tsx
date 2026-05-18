import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { debugLog } from './debugLog';
import './index.css';

// #region agent log
debugLog('H1', 'main.tsx:top', 'main module executing', {
  readyState: document.readyState,
  rootExists: !!document.getElementById('root'),
});
// #endregion

window.addEventListener('error', (ev) => {
  // #region agent log
  debugLog('H5', 'main.tsx:window.error', 'uncaught error', {
    message: ev.message,
    filename: ev.filename,
    lineno: ev.lineno,
    colno: ev.colno,
  });
  // #endregion
});

window.addEventListener('unhandledrejection', (ev) => {
  // #region agent log
  debugLog('H5', 'main.tsx:unhandledrejection', 'unhandled promise rejection', {
    reason: String(ev.reason),
  });
  // #endregion
});

async function bootstrap() {
  try {
    // #region agent log
    debugLog('H1', 'main.tsx:bootstrap', 'importing App', {});
    // #endregion

    const { default: App } = await import('./App.tsx');

    const rootEl = document.getElementById('root');
    // #region agent log
    debugLog('H2', 'main.tsx:root', 'root element check', { rootEl: !!rootEl });
    // #endregion

    if (!rootEl) {
      throw new Error('#root element not found');
    }

    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    // #region agent log
    debugLog('H2', 'main.tsx:render', 'createRoot.render completed', {});
    // #endregion
  } catch (err) {
    // #region agent log
    debugLog('H2', 'main.tsx:bootstrap.catch', 'bootstrap failed', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    // #endregion
    throw err;
  }
}

void bootstrap();
