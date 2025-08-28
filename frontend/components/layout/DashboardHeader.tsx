'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  className?: string;
}

export default function DashboardHeader({
  title,
  subtitle,
  showBackButton = false,
  className = '',
}: DashboardHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <header className={`bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 ${className}`}>
      <div className="px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center space-x-4">
          {/* Back Button */}
          {showBackButton && (
            <button
              onClick={handleBack}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Logo */}
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-sm">
            <Logo size="md" variant="dark" className="w-6 h-6" />
          </div>

          {/* Title and Subtitle */}
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
