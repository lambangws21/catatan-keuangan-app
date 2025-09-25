"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

// Definisikan props baru yang akan diterima komponen ini
// PERBAIKAN: Gunakan tipe props standar dari React untuk elemen input
export interface CurrencyInputProps
  extends Omit<React.ComponentPropsWithoutRef<'input'>, 'onChange' | 'value'> {
  value: number | string;
  onValueChange: (value: number | undefined) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, ...props }, ref) => {
    
    const format = (num: number | string) => {
        if (typeof num === 'number') {
            return new Intl.NumberFormat('id-ID').format(num);
        }
        return '';
    };
    
    const [displayValue, setDisplayValue] = React.useState(format(value));
    
    React.useEffect(() => {
        setDisplayValue(format(value));
    }, [value]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value;
      const numericValue = parseInt(rawValue.replace(/[^\d]/g, ''), 10);

      if (isNaN(numericValue)) {
        onValueChange(undefined);
        setDisplayValue('');
      } else {
        onValueChange(numericValue);
        setDisplayValue(format(numericValue));
      }
    };

    return (
        <Input
            {...props}
            ref={ref}
            value={displayValue}
            onChange={handleChange}
            inputMode="numeric"
        />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };

