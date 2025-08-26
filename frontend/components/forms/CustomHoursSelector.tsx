'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface DayHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

interface CustomHoursSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const TIME_OPTIONS = [
  '12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM', '3:00 AM', '3:30 AM',
  '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM',
];

export default function CustomHoursSelector({ value, onChange, error }: CustomHoursSelectorProps) {
  const [daysHours, setDaysHours] = useState<DayHours[]>([]);

  // Initialize or parse existing hours
  useEffect(() => {
    if (value && value !== 'custom') {
      // Parse existing hours string
      const parsed = parseHoursString(value);
      setDaysHours(parsed);
    } else {
      // Initialize with default hours
      const defaultHours: DayHours[] = DAYS_OF_WEEK.map(day => ({
        day: day.label,
        open: '10:00 AM',
        close: '10:00 PM',
        isClosed: day.key === 'saturday' // Default to closed on Saturday
      }));
      setDaysHours(defaultHours);
    }
  }, [value]);

  // Update parent form when hours change
  useEffect(() => {
    if (daysHours.length > 0) {
      const hoursString = formatHoursString(daysHours);
      onChange(hoursString);
    }
  }, [daysHours, onChange]);

  const parseHoursString = (hoursString: string): DayHours[] => {
    const lines = hoursString.split('\n');
    const parsed: DayHours[] = [];

    DAYS_OF_WEEK.forEach(({ label }) => {
      const line = lines.find(l => l.toLowerCase().includes(label.toLowerCase()));
      if (line) {
        if (line.toLowerCase().includes('closed')) {
          parsed.push({ day: label, open: '10:00 AM', close: '10:00 PM', isClosed: true });
        } else {
          const timeMatch = line.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s*[AP]M)/);
          if (timeMatch) {
            parsed.push({
              day: label,
              open: timeMatch[1].trim(),
              close: timeMatch[2].trim(),
              isClosed: false
            });
          } else {
            parsed.push({ day: label, open: '10:00 AM', close: '10:00 PM', isClosed: false });
          }
        }
      } else {
        parsed.push({ day: label, open: '10:00 AM', close: '10:00 PM', isClosed: false });
      }
    });

    return parsed;
  };

  const formatHoursString = (hours: DayHours[]): string => {
    return hours.map(day => {
      if (day.isClosed) {
        return `${day.day}: Closed`;
      }
      return `${day.day}: ${day.open} – ${day.close}`;
    }).join('\n');
  };

  const updateDayHours = (index: number, updates: Partial<DayHours>) => {
    const updated = [...daysHours];
    updated[index] = { ...updated[index], ...updates };
    setDaysHours(updated);
  };

  const toggleDayClosed = (index: number) => {
    updateDayHours(index, { isClosed: !daysHours[index].isClosed });
  };

  const setAllDays = (open: string, close: string, isClosed: boolean) => {
    const updated = daysHours.map(day => ({
      ...day,
      open,
      close,
      isClosed
    }));
    setDaysHours(updated);
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAllDays('10:00 AM', '10:00 PM', false)}
          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
        >
          Set All: 10 AM - 10 PM
        </button>
        <button
          type="button"
          onClick={() => setAllDays('9:00 AM', '9:00 PM', false)}
          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
        >
          Set All: 9 AM - 9 PM
        </button>
        <button
          type="button"
          onClick={() => setAllDays('', '', true)}
          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
        >
          Close All
        </button>
      </div>

      {/* Days Grid */}
      <div className="grid gap-3">
        {daysHours.map((day, index) => (
          <div key={day.day} className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
            {/* Day Label */}
            <div className="w-20 text-sm font-medium text-gray-700">
              {day.day}
            </div>

            {/* Closed Toggle */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={day.isClosed}
                onChange={() => toggleDayClosed(index)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-600">Closed</span>
            </label>

            {/* Time Selectors */}
            {!day.isClosed && (
              <>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <select
                    value={day.open}
                    onChange={(e) => updateDayHours(index, { open: e.target.value })}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  <span className="text-gray-500">to</span>
                  <select
                    value={day.close}
                    onChange={(e) => updateDayHours(index, { close: e.target.value })}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Display Hours */}
            {day.isClosed && (
              <span className="text-sm text-gray-500 italic">Closed</span>
            )}
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
          {formatHoursString(daysHours)}
        </pre>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}
