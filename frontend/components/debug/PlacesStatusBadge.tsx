'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { googlePlacesAPI } from '@/lib/google/places';

type Diagnostics = ReturnType<typeof googlePlacesAPI.getDiagnostics>;

function colorFor(diag: Diagnostics) {
      if (!diag.ready || !diag.hasPlaces) {
      return 'bg-red-600 text-white';
    }
      const modernPred = diag.predictionStrategy === 'modern-async' || diag.predictionStrategy === 'modern-sync';
    const modernDetails = diag.detailsStrategy === 'modern';
    if (modernPred && modernDetails) {
      return 'bg-green-600 text-white';
    }
    return 'bg-yellow-600 text-black';
}

export default function PlacesStatusBadge() {
  const enabled = process.env.NEXT_PUBLIC_DEBUG_PLACES_BADGE === 'true';
  const [diag, setDiag] = useState<Diagnostics>(() => googlePlacesAPI.getDiagnostics());

  useEffect(() => {
    if (!enabled) return;
    // poll periodically since we don't have an event bus here
    const id = setInterval(() => {
      try { setDiag(googlePlacesAPI.getDiagnostics()); } catch { /* noop */ }
    }, 1000);
    return () => clearInterval(id);
  }, [enabled]);

  const cls = useMemo(() => colorFor(diag), [diag]);
  if (!enabled) {
    return null;
  }

  return (
    <div className={`fixed bottom-3 right-3 z-50 text-xs px-2 py-1 rounded shadow-lg ${cls}`}>
      <span className="font-semibold">Places</span>:
      {' '}ready {diag.ready ? '&check;' : '&times;'} | lib {diag.hasPlaces ? '&check;' : '&times;'} |
      {' '}pred {diag.predictionStrategy}{' '}| details {diag.detailsStrategy}
      {' '}| Sugg {diag.hasAutocompleteSuggestion ? '&check;' : '&times;'}
    </div>
  );
}

