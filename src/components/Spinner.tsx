// Spinner.tsx

import React from 'react';

// Mendefinisikan tipe untuk properti 'size'. 
// 🔹 PERUBAHAN: Sekarang menerima string literal ATAU number.
interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg' | number; 
    className?: string; // 🔹 Ditambahkan kembali jika Anda menggunakannya di luar
}

/**
 * Spinner adalah komponen untuk indikator loading.
 * Menampilkan animasi berputar untuk menandakan proses yang sedang berjalan.
 */
export default function Spinner({ size = 'md', className = '' }: SpinnerProps & { className?: string }) {
    
    // Objek untuk memetakan prop 'size' ke kelas Tailwind CSS default
    const defaultSizeClasses = {
      sm: 'w-5 h-5 border-2',
      md: 'w-8 h-8 border-4',
      lg: 'w-12 h-12 border-4',
    };
    
    let spinnerClasses = '';

    if (typeof size === 'number') {
        // 🔹 LOGIKA BARU: Jika size adalah number (misalnya 16)
        // Kita akan menggunakan style inline untuk lebar dan tinggi, 
        // dan tentukan ukuran border default (misal border-2px)
        spinnerClasses = `border-2`;
    } else {
        // Jika size adalah string literal ("sm", "md", "lg")
        spinnerClasses = defaultSizeClasses[size];
    }
  
    // 🔹 Mendapatkan style inline untuk nilai number
    const customStyle = typeof size === 'number' 
        ? { width: `${size}px`, height: `${size}px`, borderTopWidth: '3px', borderRightWidth: '3px' } 
        : {};


    return (
      <div 
        className={`
          animate-spin 
          rounded-full 
          border-t-blue-500 
          border-gray-200 
          ${spinnerClasses}
          ${className} 
        `}
        style={customStyle} // 🔹 Menerapkan style custom
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
}