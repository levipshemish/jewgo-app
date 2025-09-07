import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(option => option.value === value);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (disabled) return;
    
    if (!isOpen) {
      // Calculate position for portal
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = options.length * 48 + 16; // Approximate height (48px per option + padding)
        
        // If there's not enough space below, open upward
        const shouldOpenUpward = rect.bottom + dropdownHeight > viewportHeight;
        setOpenUpward(shouldOpenUpward);
        
        // Calculate position for portal
        const top = shouldOpenUpward 
          ? rect.top - dropdownHeight - 8 // 8px gap
          : rect.bottom + 8; // 8px gap
        
        setDropdownPosition({
          top,
          left: rect.left,
          width: rect.width
        });
      }
    }
    
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef} style={{ zIndex: isOpen ? 10000 : 'auto' }}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-full bg-white text-black border border-green-500 rounded-full px-4 py-3 sm:py-4 
          focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent 
          text-sm appearance-none cursor-pointer flex items-center justify-between
          transition-colors duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-green-600'}
        `}
      >
        <span className={selectedOption ? 'text-black' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-green-500 transition-transform duration-200 ${
            isOpen ? (openUpward ? 'rotate-0' : 'rotate-180') : ''
          }`} 
        />
      </button>

      {/* Dropdown Popup - Rendered via Portal */}
      {isOpen && createPortal(
        <div 
          className="fixed z-[9999] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
          style={{ 
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            backgroundColor: '#ffffff',
            zIndex: 9999,
            opacity: 1,
            background: '#ffffff'
          }}
        >
          <div className="py-2 bg-white" style={{ 
            backgroundColor: '#ffffff', 
            opacity: 1,
            background: '#ffffff'
          }}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleOptionClick(option.value)}
                className={`
                  w-full text-left px-4 py-3 text-sm font-medium transition-colors duration-200
                  hover:bg-green-50 hover:text-green-800
                  ${value === option.value ? 'bg-green-100 text-green-800' : 'text-black bg-white'}
                `}
                style={{ 
                  backgroundColor: value === option.value ? '#dcfce7' : '#ffffff',
                  opacity: 1,
                  background: value === option.value ? '#dcfce7' : '#ffffff'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
