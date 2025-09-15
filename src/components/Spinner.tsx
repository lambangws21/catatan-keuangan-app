// Mendefinisikan tipe untuk properti 'size'
interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
  }
  
  /**
   * Spinner adalah komponen untuk indikator loading.
   * Menampilkan animasi berputar untuk menandakan proses yang sedang berjalan.
   */
  export default function Spinner({ size = 'md' }: SpinnerProps) {
    // Objek untuk memetakan prop 'size' ke kelas Tailwind CSS
    const sizeClasses = {
      sm: 'w-5 h-5 border-2',
      md: 'w-8 h-8 border-4',
      lg: 'w-12 h-12 border-4',
    };
  
    return (
      <div 
        className={`
          animate-spin 
          rounded-full 
          border-t-blue-500 
          border-gray-200 
          ${sizeClasses[size]}
        `}
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }