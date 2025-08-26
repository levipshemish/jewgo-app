'use client';

import React, { useCallback, useEffect, useState } from 'react';

export type ToastType = 'success' | 'error';

export interface ToastState {
  message: string;
  type: ToastType;
}

export function useToast(options: { autoHideMs?: number } = {}) {
  const { autoHideMs = 3000 } = options;
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((message: string, type: ToastType) => {
    setToast({ message, type });
  }, []);

  const showSuccess = useCallback((message: string) => show(message, 'success'), [show]);
  const showError = useCallback((message: string) => show(message, 'error'), [show]);

  const clear = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), autoHideMs);
    return () => clearTimeout(t);
  }, [toast, autoHideMs]);

  return { toast, showSuccess, showError, clear } as const;
}

export function ToastContainer({ toast, onDismiss }: { toast: ToastState | null; onDismiss?: () => void }) {
  if (!toast) return null;
  const base = 'fixed bottom-4 right-4 z-50 rounded-md px-4 py-3 shadow-lg border';
  const styles = toast.type === 'success'
    ? 'bg-green-50 border-green-200 text-green-800'
    : 'bg-red-50 border-red-200 text-red-800';

  return (
    <div className={`${base} ${styles}`} role="status" aria-live="polite" onClick={onDismiss}>
      {toast.message}
    </div>
  );
}

