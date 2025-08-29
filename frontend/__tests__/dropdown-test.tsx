import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Simple test component to verify dropdown functionality
function TestDropdown() {
  const [value, setValue] = useState<string | undefined>(undefined);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value === "" ? undefined : e.target.value;
    setValue(newValue);
  };

  return (
    <div>
      <select value={value || ""} onChange={handleChange}>
        <option value="">All Kosher Types</option>
        <option value="Dairy">Dairy</option>
        <option value="Meat">Meat</option>
        <option value="Pareve">Pareve</option>
      </select>
      <div data-testid="current-value">Current: {value || 'undefined'}</div>
    </div>
  );
}

describe('Dropdown Functionality', () => {
  it('should handle empty value selection correctly', () => {
    render(<TestDropdown />);
    
    const select = screen.getByRole('combobox');
    const valueDisplay = screen.getByTestId('current-value');
    
    // Initially should show "All Kosher Types"
    expect(select).toHaveValue('');
    expect(valueDisplay).toHaveTextContent('Current: undefined');
    
    // Select a value
    fireEvent.change(select, { target: { value: 'Dairy' } });
    expect(select).toHaveValue('Dairy');
    expect(valueDisplay).toHaveTextContent('Current: Dairy');
    
    // Select "All Kosher Types" (empty value)
    fireEvent.change(select, { target: { value: '' } });
    expect(select).toHaveValue('');
    expect(valueDisplay).toHaveTextContent('Current: undefined');
  });
});
