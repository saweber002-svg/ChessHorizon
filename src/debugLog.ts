const ENDPOINT = 'http://127.0.0.1:7663/ingest/2107a746-6fa6-450c-b733-f4c45256be2e';
const SESSION = 'df0ea7';

export function debugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {},
  runId = 'pre-fix'
) {
  // #region agent log
  // Avoid noisy failed network requests during local development
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return;
  }

  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION },
    body: JSON.stringify({
      sessionId: SESSION,
      runId,
      hypothesisId,
      location,
      message,
      data: {
        ...data,
        href: typeof window !== 'undefined' ? window.location.href : undefined,
        protocol: typeof window !== 'undefined' ? window.location.protocol : undefined,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}
