"use client";

import BottomNavigation from "@/components/core/navigation/BottomNavigation";

interface ShulBottomNavigationProps {
  currentPath?: string;
  onNavigate?: (href: string) => void;
  notificationCount?: number;
}

export default function ShulBottomNavigation({
  currentPath,
  onNavigate,
  notificationCount = 0,
}: ShulBottomNavigationProps) {
  return (
    <BottomNavigation
      currentPath={currentPath}
      onNavigate={onNavigate}
      notificationCount={notificationCount}
    />
  );
}