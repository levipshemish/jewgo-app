import { getHoursStatus, formatWeeklyHours } from '@/lib/utils/hours';
import { HoursData } from '@/lib/types/restaurant';

interface Props {
  hoursOfOperation?: string;
  hoursJson?: HoursData;
  hoursLastUpdated?: string;
}

export default function HoursDisplay({ hoursOfOperation, hoursJson, hoursLastUpdated }: Props) {
  if (!hoursOfOperation) {
    return <div className="text-sm text-gray-500">Hours not available</div>;
  }

  const hoursStatus = getHoursStatus(hoursJson as HoursData | string | null | undefined || hoursOfOperation);
  const weeklyHours = formatWeeklyHours(hoursJson as HoursData | string | null | undefined || hoursOfOperation);

  return (
    <div className="text-sm text-gray-800">
      <div className="flex items-center gap-2">
        <p><strong>Today:</strong> {hoursStatus.label}</p>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          hoursStatus.isOpenNow ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {hoursStatus.badge}
        </span>
      </div>
      
      <details className="mt-1">
        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
          View all hours
        </summary>
        <div className="mt-1 text-gray-700 whitespace-pre-line">
          {weeklyHours}
        </div>
      </details>
      
      {hoursLastUpdated && (
        <p className="text-xs text-gray-500 mt-2">
          Last updated: {new Date(hoursLastUpdated).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}