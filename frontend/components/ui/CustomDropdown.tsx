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
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Check if the click is on a dropdown option (rendered via portal)
        const target = event.target as Element;
        if (target && target.closest('[data-dropdown-option]')) {
          return; // Don't close if clicking on a dropdown option
        }
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use a slight delay to prevent immediate closing
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

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
        const viewportWidth = window.innerWidth;
        const dropdownHeight = Math.min(options.length * 48 + 16, 300); // Max height 300px
        const dropdownWidth = Math.max(rect.width, 200); // Min width 200px
        
        // If there's not enough space below, open upward
        const shouldOpenUpward = rect.bottom + dropdownHeight > viewportHeight - 20;
        setOpenUpward(shouldOpenUpward);
        
        // Calculate position for portal with bounds checking
        let top = shouldOpenUpward 
          ? rect.top - dropdownHeight - 8 // 8px gap
          : rect.bottom + 8; // 8px gap
        
        let left = rect.left;
        
        // Ensure dropdown doesn't go off screen horizontally
        if (left + dropdownWidth > viewportWidth - 20) {
          left = viewportWidth - dropdownWidth - 20;
        }
        if (left < 20) {
          left = 20;
        }
        
        // Ensure dropdown doesn't go off screen vertically
        if (top < 20) {
          top = 20;
        }
        if (top + dropdownHeight > viewportHeight - 20) {
          top = viewportHeight - dropdownHeight - 20;
        }
        
        setDropdownPosition({
          top,
          left,
          width: dropdownWidth
        });
      }
    }
    
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
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

      {/* Dropdown Popup - Rendered via Portal with higher z-index */}
      {isOpen && createPortal(
        <div 
          data-dropdown-option
          className="fixed bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
          style={{ 
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 10001, // Higher than modal z-index
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          <div className="py-2">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                data-dropdown-option
                onClick={() => handleOptionClick(option.value)}
                className={`
                  w-full text-left px-4 py-3 text-sm font-medium transition-colors duration-200
                  hover:bg-green-50 hover:text-green-800 focus:bg-green-50 focus:text-green-800
                  ${value === option.value ? 'bg-green-100 text-green-800' : 'text-black bg-white'}
                `}
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
