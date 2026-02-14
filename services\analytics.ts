type EventPayload = Record<string, number | string | boolean | null | undefined>;

const endpoint = '';
const sessionId = Math.random().toString(36).slice(2, 10);
const startedAt = performance.now();

const emit = (event: string, payload: EventPayload = {}) => {
  const body = JSON.stringify({
    event,
    ts: Date.now(),
    sessionId,
    ttiMs: Math.round(performance.now() - startedAt),
    ...payload
  });

  if (endpoint && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(endpoint, body);
    return;
  }

  if (typeof console !== 'undefined') {
    console.debug('[analytics]', event, payload);
  }
};

export const analytics = {
  open: () => emit('open'),
  loadTime: (ms: number) => emit('loadTime', { ms }),
  start: () => emit('start'),
  slap: (payload: EventPayload) => emit('slap', payload),
  result: (payload: EventPayload) => emit('result', payload)
};

