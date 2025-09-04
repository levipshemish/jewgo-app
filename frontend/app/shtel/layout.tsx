import React from 'react';
import { PostgresAuthProvider } from '@/lib/contexts/PostgresAuthContext';

export default function ShtelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PostgresAuthProvider>
      {children}
    </PostgresAuthProvider>
  );
}


