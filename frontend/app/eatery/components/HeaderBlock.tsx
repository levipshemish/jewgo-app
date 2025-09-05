'use client';

import React from 'react';
import { Header } from '@/components/layout';
import ActionButtons from '@/components/layout/ActionButtons';
import { CategoryTabs } from '@/components/core';

type Props = {
  onSearch: (q: string) => void;
  onShowFilters: () => void;
};

export default function HeaderBlock({ onSearch, onShowFilters }: Props) {
  return (
    <div className="sticky top-0 z-40 bg-white shadow-sm">
      <Header 
        onSearch={onSearch}
        placeholder="Search restaurants..."
        showFilters={true}
        onShowFilters={onShowFilters}
      />

      <CategoryTabs 
        activeTab="eatery"
        onTabChange={() => {}}
      />

      <ActionButtons 
        onShowFilters={onShowFilters}
        onShowMap={() => {}}
        onAddEatery={() => {}}
      />
    </div>
  );
}

