import React from 'react';
import { SupabaseProvider } from '@/lib/contexts/SupabaseContext';

export default function ShtelLayout({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      {children}
    </SupabaseProvider>
  );
}


