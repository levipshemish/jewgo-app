'use client';

/// <reference types="node" />
import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { appLogger } from '@/lib/utils/logger';

interface DayHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
  isShabbatRelative?: boolean;
  shabbatOffset?: number; // minutes after shabbat ends
}

interface CustomHoursSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  testMode?: boolean; // Add test mode to isolate issues
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

const SHABBAT_OFFSET_OPTIONS = [
  { value: 0, label: 'Immediately after Shabbat' },
  { value: 15, label: '15 minutes after Shabbat' },
  { value: 30, label: '30 minutes after Shabbat' },
  { value: 45, label: '45 minutes after Shabbat' },
  { value: 60, label: '1 hour after Shabbat' },
  { value: 90, label: '1.5 hours after Shabbat' },
  { value: 120, label: '2 hours after Shabbat' },
  { value: 180, label: '3 hours after Shabbat' },
];

export default function CustomHoursSelector({ value, onChange, error, testMode = false }: CustomHoursSelectorProps) {
  const [daysHours, setDaysHours] = useState<DayHours[]>([]);
  const componentRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<string>('');
  const prevValueRef = useRef<string | null>(null);

  // Component lifecycle (minimal logging)
  useEffect(() => {
    if (testMode) {
      appLogger.debug('CustomHoursSelector component mounted', { testMode });
    }
    
    return () => {
      if (testMode) {
        appLogger.debug('CustomHoursSelector component unmounting');
      }
    };
  }, [testMode]);

  // Initialize or parse existing hours
  useEffect(() => {
    if (testMode) {
      appLogger.debug('CustomHoursSelector value changed', { value });
    }
    // Prevent reprocessing the same incoming value repeatedly
    if (prevValueRef.current === value) {return;}
    prevValueRef.current = value;

    if (value && value !== 'custom') {
      // Parse existing hours string
      const parsed = parseHoursString(value);
      if (testMode) {
        appLogger.debug('CustomHoursSelector parsed hours', { 
          parsedLength: parsed.length,
          firstDay: parsed[0]?.day,
          lastDay: parsed[parsed.length - 1]?.day
        } as any);
      }
      // Only update state if it actually differs in content
      const currentFormatted = daysHours.length ? formatHoursString(daysHours) : '';
      const newFormatted = formatHoursString(parsed);
      if (currentFormatted !== newFormatted) {
        setDaysHours(parsed);
      }
    } else {
      // Initialize with default hours for 'custom' or empty value
      const defaultHours: DayHours[] = DAYS_OF_WEEK.map(day => ({
        day: day.label,
        open: '10:00 AM',
        close: '10:00 PM',
        isClosed: day.key === 'saturday', // Default to closed on Saturday
        isShabbatRelative: day.key === 'saturday',
        shabbatOffset: day.key === 'saturday' ? 30 : 0 // Default to 30 minutes after Shabbat
      }));
      const currentFormatted = daysHours.length ? formatHoursString(daysHours) : '';
      const newFormatted = formatHoursString(defaultHours);
      if (currentFormatted !== newFormatted) {
        if (testMode) {
          appLogger.debug('CustomHoursSelector setting default hours', { 
            defaultHoursLength: defaultHours.length,
            firstDay: defaultHours[0]?.day,
            lastDay: defaultHours[defaultHours.length - 1]?.day
          });
        }
        setDaysHours(defaultHours);
      }
    }
  }, [value, testMode, daysHours]);

  // Update parent form when hours change
  useEffect(() => {
    if (daysHours.length > 0) {
      const hoursString = formatHoursString(daysHours);
      // Only emit when string actually changes to avoid render loops
      if (lastEmittedRef.current !== hoursString) {
        if (testMode) {
          appLogger.debug('CustomHoursSelector updating parent with hours', { hoursString });
        }
        lastEmittedRef.current = hoursString;
        onChange(hoursString);
      }
    }
  }, [daysHours, onChange, testMode]);

  // Global event listeners for debugging (only in test mode)
  useEffect(() => {
    if (!testMode) {return;}

    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      appLogger.debug('CustomHoursSelector global click detected', {
        target: target.tagName,
        className: target.className,
        id: target.id,
        textContent: target.textContent?.substring(0, 50),
        isWithinComponent: componentRef.current?.contains(target)
      });
    };

    const handleGlobalFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      appLogger.debug('CustomHoursSelector global focus detected', {
        target: target.tagName,
        className: target.className,
        id: target.id,
        isWithinComponent: componentRef.current?.contains(target)
      });
    };

    const handleGlobalBlur = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      appLogger.debug('CustomHoursSelector global blur detected', {
        target: target.tagName,
        className: target.className,
        id: target.id,
        isWithinComponent: componentRef.current?.contains(target)
      });
    };

    const handleGlobalMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      appLogger.debug('CustomHoursSelector global mousedown detected', {
        target: target.tagName,
        className: target.className,
        id: target.id,
        isWithinComponent: componentRef.current?.contains(target)
      });
    };

    // Add event listeners
    document.addEventListener('click', handleGlobalClick, true);
    document.addEventListener('focus', handleGlobalFocus, true);
    document.addEventListener('blur', handleGlobalBlur, true);
    document.addEventListener('mousedown', handleGlobalMouseDown, true);

    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
      document.removeEventListener('focus', handleGlobalFocus, true);
      document.removeEventListener('blur', handleGlobalBlur, true);
      document.removeEventListener('mousedown', handleGlobalMouseDown, true);
    };
  }, [testMode]);

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
              open: timeMatch[1]?.trim() || '10:00 AM',
              close: timeMatch[2]?.trim() || '10:00 PM',
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
      
      // Special formatting for Saturday with Shabbat relative timing
      if (day.day === 'Saturday' && day.isShabbatRelative && day.shabbatOffset !== undefined) {
        const offsetLabel = SHABBAT_OFFSET_OPTIONS.find(opt => opt.value === day.shabbatOffset)?.label || 
                           `${day.shabbatOffset} minutes after Shabbat`;
        return `${day.day}: ${offsetLabel} – ${day.close}`;
      }
      
      return `${day.day}: ${day.open} – ${day.close}`;
    }).join('\n');
  };

  const updateDayHours = (index: number, updates: Partial<DayHours>) => {
    if (testMode) {
      appLogger.debug('CustomHoursSelector updating day hours', { index, updates: updates as any });
    }
    const updated = [...daysHours];
    if (updated[index]) {
      updated[index] = { 
        day: updated[index].day,
        open: updated[index].open,
        close: updated[index].close,
        isClosed: updated[index].isClosed,
        ...updates 
      };
    }
    setDaysHours(updated);
  };

  const toggleDayClosed = (index: number) => {
    if (testMode) {
      appLogger.debug('CustomHoursSelector toggling day closed', { index });
    }
    const day = daysHours[index];
    if (day) {
      updateDayHours(index, { isClosed: !day.isClosed });
    }
  };

  const setAllDays = (open: string, close: string, isClosed: boolean) => {
    if (testMode) {
      appLogger.debug('CustomHoursSelector setting all days', { open, close, isClosed });
    }
    const updated = daysHours.map(day => ({
      ...day,
      open,
      close,
      isClosed
    }));
    setDaysHours(updated);
  };

  const handleSelectChange = (index: number, field: 'open' | 'close', timeValue: string) => {
    if (testMode) {
      appLogger.debug('CustomHoursSelector select change', { index, field, value: timeValue });
    }
    updateDayHours(index, { [field]: timeValue });
  };

  const handleSelectFocus = (index: number, field: string) => {
    if (testMode) {
      appLogger.debug('CustomHoursSelector select focus', { index, field });
    }
  };

  const handleSelectBlur = (index: number, field: string) => {
    if (testMode) {
      appLogger.debug('CustomHoursSelector select blur', { index, field });
    }
  };

  const handleSelectClick = (index: number, field: string) => {
    if (testMode) {
      appLogger.debug('CustomHoursSelector select click', { index, field });
    }
  };

  const handleShabbatOffsetChange = (index: number, offset: number) => {
    if (testMode) {
      appLogger.debug('CustomHoursSelector shabbat offset change', { index, offset });
    }
    updateDayHours(index, { shabbatOffset: offset });
  };

  // Test mode wrapper
  if (testMode) {
    return (
      <div className="p-8 bg-white border rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">CustomHoursSelector Test Mode</h2>
        <div ref={componentRef} className="space-y-4">
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
                {day.day === 'Saturday' && day.isShabbatRelative ? (
                  // Special Saturday interface with Shabbat relative timing
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Open</span>
                      <select
                        value={day.shabbatOffset || 30}
                        onChange={(e) => handleShabbatOffsetChange(index, parseInt(e.target.value))}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                        style={{ zIndex: 9999, position: 'relative' }}
                      >
                        {SHABBAT_OFFSET_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-gray-500">to</span>
                    <select
                      value={day.close}
                      onChange={(e) => handleSelectChange(index, 'close', e.target.value)}
                      onFocus={() => handleSelectFocus(index, 'close')}
                      onBlur={() => handleSelectBlur(index, 'close')}
                      onClick={() => handleSelectClick(index, 'close')}
                      className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                      style={{ zIndex: 9999, position: 'relative' }}
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  // Regular time selectors for other days
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <select
                      value={day.open}
                      onChange={(e) => handleSelectChange(index, 'open', e.target.value)}
                      onFocus={() => handleSelectFocus(index, 'open')}
                      onBlur={() => handleSelectBlur(index, 'open')}
                      onClick={() => handleSelectClick(index, 'open')}
                      className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                      style={{ zIndex: 9999, position: 'relative' }}
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    <span className="text-gray-500">to</span>
                    <select
                      value={day.close}
                      onChange={(e) => handleSelectChange(index, 'close', e.target.value)}
                      onFocus={() => handleSelectFocus(index, 'close')}
                      onBlur={() => handleSelectBlur(index, 'close')}
                      onClick={() => handleSelectClick(index, 'close')}
                      className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                      style={{ zIndex: 9999, position: 'relative' }}
                    >
                      {TIME_OPTIONS.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                )}
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
      </div>
    );
  }

  return (
    <div ref={componentRef} className="space-y-4">
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
                    onChange={(e) => handleSelectChange(index, 'open', e.target.value)}
                    onFocus={() => handleSelectFocus(index, 'open')}
                    onBlur={() => handleSelectBlur(index, 'open')}
                    onClick={() => handleSelectClick(index, 'open')}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                    style={{ zIndex: 9999, position: 'relative' }}
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  <span className="text-gray-500">to</span>
                  <select
                    value={day.close}
                    onChange={(e) => handleSelectChange(index, 'close', e.target.value)}
                    onFocus={() => handleSelectFocus(index, 'close')}
                    onBlur={() => handleSelectBlur(index, 'close')}
                    onClick={() => handleSelectClick(index, 'close')}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                    style={{ zIndex: 9999, position: 'relative' }}
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
