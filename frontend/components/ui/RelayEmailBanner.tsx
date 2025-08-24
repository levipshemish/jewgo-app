'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function RelayEmailBanner() {
  const params = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const flag = params.get('relay');
    setVisible(flag === '1');
  }, [params]);

  if (!visible) return null;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="max-w-5xl mx-auto px-4 py-2 text-sm flex items-start gap-3">
        <span role="img" aria-label="info">🔒</span>
        <div className="flex-1">
          You signed in with an Apple private relay email. For account recovery, consider adding a backup email in settings.
        </div>
        <button
          className="text-amber-900/70 hover:text-amber-900"
          onClick={() => setVisible(false)}
          aria-label="Dismiss notice"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

