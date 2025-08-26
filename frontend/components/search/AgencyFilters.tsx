import React from 'react';

import { cn } from '@/lib/utils/classNames';

interface AgencyFiltersProps {
  selectedAgency: string | undefined;
  onAgencyChange: (agency: string) => void;
  agencyCounts?: Record<string, number>;
  totalCount?: number;
}

const AGENCIES = [
  { id: 'ORB', name: 'ORB', color: 'bg-blue-500', description: 'Orthodox Rabbinical Board' },
  { id: 'KM', name: 'KM', color: 'bg-green-500', description: 'Kosher Miami' },
  { id: 'Kosher Miami', name: 'Kosher Miami', color: 'bg-green-600', description: 'Kosher Miami Certification' },
];

export const AgencyFilters: React.FC<AgencyFiltersProps> = ({
  selectedAgency, onAgencyChange, agencyCounts, totalCount
}) => {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-between">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2 text-jewgo-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Certifying Agencies
        </div>
        {totalCount && (
          <span className="text-xs text-gray-500">
            {totalCount} total
          </span>
        )}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {AGENCIES.map((agency) => {
          const count = agencyCounts?.[agency.id] || 0;
          return (
            <button
              key={agency.id}
              onClick={() => onAgencyChange(selectedAgency === agency.id ? '' : agency.id)}
              className={cn(
                "p-3 rounded-lg border-2 transition-all duration-200 text-left",
                "hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-jewgo-primary/20",
                selectedAgency === agency.id
                  ? `${agency.color} text-white border-transparent`
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              )}
            >
              <div className="flex items-center space-x-2 mb-1">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  selectedAgency === agency.id ? "bg-white" : agency.color
                )} />
                <span className="font-semibold text-sm">{agency.name}</span>
              </div>
              <p className="text-xs opacity-80 mb-2">{agency.description}</p>
              {count > 0 && (
                <div className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full",
                  selectedAgency === agency.id
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 text-gray-600"
                )}>
                  {count} {count === 1 ? 'place' : 'places'}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}; 