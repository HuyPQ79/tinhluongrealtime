import React from 'react';
import { formatDateDisplay, formatDateInput } from '../../utils/dateFormat';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void; // Returns YYYY-MM-DD format
  displayFormat?: boolean; // If true, show dd/mm/yyyy in a text input, else use native date input
}

/**
 * DateInput component that handles date formatting
 * - Internal: Uses YYYY-MM-DD for input type="date"
 * - Display: Can show dd/mm/yyyy format
 */
export const DateInput: React.FC<DateInputProps> = ({ 
  value, 
  onChange, 
  displayFormat = false,
  className = '',
  ...props 
}) => {
  if (displayFormat) {
    // Text input với format dd/mm/yyyy
    const displayValue = formatDateDisplay(value);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      // Parse dd/mm/yyyy to YYYY-MM-DD
      if (inputValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = inputValue.split('/');
        onChange(`${year}-${month}-${day}`);
      } else if (inputValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        onChange(inputValue);
      }
    };
    
    return (
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder="dd/mm/yyyy"
        className={className}
        {...props}
      />
    );
  }
  
  // Native date input (browser sẽ format theo locale)
  return (
    <input
      type="date"
      value={formatDateInput(value)}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      {...props}
    />
  );
};

