'use client';

import * as React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error = false, ...props }, ref) => {
    const base = 'block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';
    const border = error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300';
    return <input ref={ref} className={[base, border, className].join(' ')} {...props} />;
  }
);
Input.displayName = 'Input';

export default Input;

