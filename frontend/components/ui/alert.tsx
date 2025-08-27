'use client';

import * as React from 'react';

export function Alert({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const base = 'w-full rounded-md border p-3 flex items-start gap-2';
  return <div className={[base, className].join(' ')} {...props} />;
}

export function AlertDescription({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={["text-sm", className].join(' ')} {...props} />;
}

export default Alert;

