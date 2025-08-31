import React from 'react'

// Stack: vertical rhythm without manual margins
export function Stack({
  as: Tag = 'div',
  gap = 4, // 16px default
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  as?: any;
  gap?: 1|2|3|4|6|8|10|12;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={`flex flex-col space-y-${gap} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

// Cluster: horizontal layout with wrap + consistent gaps
export function Cluster({
  as: Tag = 'div',
  gap = 3, // 12px default
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  as?: any;
  gap?: 1|2|3|4|6|8|10|12;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={`flex flex-wrap items-center gap-${gap} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
