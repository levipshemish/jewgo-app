import React from 'react';

export default function RestaurantLayout({
  children, }: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-full bg-[#f4f4f4] flex flex-col">
      {/* No header for restaurant detail pages */}
      {children}
    </div>
  )
} 