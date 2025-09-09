/**
 * Worker Factory - Type-safe Worker Creation
 * 
 * Creates workers with proper TypeScript support and error handling.
 */

export function makeWorker<Request, Response>(
  workerUrl: URL
): {
  post: (request: Request, onResponse: (response: Response) => void) => void;
  terminate: () => void;
} {
  let worker: Worker | null = null;
  let messageId = 0;
  const pendingRequests = new Map<number, (response: Response) => void>();

  const createWorker = () => {
    if (worker) {
      worker.terminate();
    }

    worker = new Worker(workerUrl);
    
    worker.onmessage = (event: MessageEvent<Response & { id?: number }>) => {
      const { id, ...response } = event.data;
      
      if (id !== undefined && pendingRequests.has(id)) {
        const callback = pendingRequests.get(id)!;
        pendingRequests.delete(id);
        callback(response as Response);
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      // Reject all pending requests
      pendingRequests.forEach((callback) => {
        callback({ kind: 'ERROR', payload: { message: 'Worker error', requestKind: 'UNKNOWN' } } as Response);
      });
      pendingRequests.clear();
    };

    return worker;
  };

  const post = (request: Request, onResponse: (response: Response) => void) => {
    if (!worker) {
      createWorker();
    }

    const id = ++messageId;
    pendingRequests.set(id, onResponse);

    // Add timeout to prevent hanging requests
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        onResponse({ kind: 'ERROR', payload: { message: 'Request timeout', requestKind: 'UNKNOWN' } } as Response);
      }
    }, 10000); // 10 second timeout

    worker!.postMessage({ ...request, id });
  };

  const terminate = () => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    pendingRequests.clear();
  };

  return { post, terminate };
}
