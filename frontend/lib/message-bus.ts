'use client';

// Simple message bus that proxies heavy work to a Web Worker

export type FilterWorkerMessage = {
  type: 'FILTER_RESTAURANTS';
  payload: any;
};

export type FilterWorkerResult = {
  type: 'FILTER_RESTAURANTS_RESULT';
  payload: any;
};

type Listener = (data: FilterWorkerResult) => void;

let worker: Worker | null = null;
const listeners: Set<Listener> = new Set();

// Throttle worker message dispatch to avoid flooding React with updates
let latestResult: FilterWorkerResult | null = null;
let dispatchTimer: number | null = null;
const DISPATCH_INTERVAL_MS = 120;

function scheduleDispatch() {
  if (dispatchTimer !== null) {
    return;
  }
  dispatchTimer = window.setTimeout(() => {
    const data = latestResult;
    latestResult = null;
    dispatchTimer = null;
    if (!data) {
      return;
    }
    for (const cb of Array.from(listeners)) {
      try { cb(data); } catch { /* no-op */ }
    }
  }, DISPATCH_INTERVAL_MS);
}

function ensureWorker(): Worker | null {
  if (typeof window === 'undefined') {
    return null;
  }
  if (worker) {
    return worker;
  }
  try {
    worker = new Worker(new URL('./workers/mendel-worker.ts', import.meta.url));
  } catch (_err) {
    // Fallback: assume public path worker if bundler URL fails
    try {
      worker = new Worker('/workers/mendel-worker.js');
    } catch (_err2) {
      worker = null;
    }
  }

  if (worker) {
    worker.onmessage = (evt: MessageEvent<FilterWorkerResult>) => {
      console.log('Message-bus: Received worker result:', evt.data.type, {
        restaurantCount: evt.data.payload?.restaurants?.length || 0
      });
      latestResult = evt.data;
      scheduleDispatch();
    };
  }
  return worker;
}

export function postToWorker(message: FilterWorkerMessage) {
  const w = ensureWorker();
  if (!w) {
    console.warn('Message-bus: Worker not available');
    return;
  }
  try { 
    console.log('Message-bus: Posting to worker:', message.type, {
      restaurantCount: message.payload?.restaurants?.length || 0,
      searchQuery: message.payload?.searchQuery || '',
      activeFilters: message.payload?.activeFilters || {}
    });
    w.postMessage(message); 
  } catch (err) { 
    console.error('Message-bus: Error posting to worker:', err);
  }
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
