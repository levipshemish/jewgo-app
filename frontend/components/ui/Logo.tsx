import React from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'light' | 'dark';
}

export default function Logo({ size = 'md', className = '', variant: _variant = 'light' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const logoSrc = '/icon.webp';

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      <Image 
        src={logoSrc}
        alt="Jewgo Logo"
        fill
        sizes="(max-width: 768px) 32px, (max-width: 1200px) 48px, 64px"
        className="object-contain rounded-lg"
        priority
        placeholder="blur"
        blurDataURL="data:image/webp;base64,UklGRnoGAABXRUJQVlA4IG4GAACwYwCdASoKAAYABUB8JYwCdAEO/v7+AA=="
      />
    </div>
  );
} 