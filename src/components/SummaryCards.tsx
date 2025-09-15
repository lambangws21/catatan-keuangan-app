import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react';

interface SummaryProps {
  pemasukan: number;
  pengeluaran: number;
  saldo: number;
  pemasukanCount: number;
  pengeluaranCount: number;
}

// Fungsi untuk format mata uang standar
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Math.round(value)); // Bulatkan nilai untuk memastikan tidak ada desimal
};

// Fungsi khusus untuk menangani format saldo yang mungkin sangat besar
const formatSaldoDisplay = (value: number) => {
    // Jika angka di atas 1 triliun (positif atau negatif), tampilkan dalam jutaan.
    if (value > 999999999999 || value < -999999999999) {
        const valueInMillions = Math.round(value / 1000000);
        return formatCurrency(valueInMillions);
    }
    // Jika tidak, format seperti biasa
    return formatCurrency(value);
}

// Komponen untuk menganimasikan angka, sekarang menerima fungsi formatter kustom
function AnimatedNumber({ value, className, formatter }: { value: number, className: string, formatter: (num: number) => string }) {
  const count = useMotionValue(0);
  
  // Gunakan formatter yang diberikan untuk mengubah angka yang dianimasikan
  const displayValue = useTransform(count, (latest) => formatter(latest));

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: "easeOut" });
    return controls.stop;
  }, [value, count]);

  return <motion.p className={className}>{displayValue}</motion.p>;
}

// Varian animasi untuk container dan item
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Jeda antar item
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function SummaryCards({ 
  pemasukan, 
  pengeluaran, 
  saldo, 
  pemasukanCount, 
  pengeluaranCount,
}: SummaryProps) {
  
  // Setiap item sekarang memiliki fungsi formatter-nya sendiri
  const summaryData = [
    // PERBAIKAN: Terapkan formatSaldoDisplay ke semua kartu
    { title: 'Total Pemasukan', value: pemasukan, count: pemasukanCount, icon: ArrowUpRight, color: 'text-green-400', formatter: formatSaldoDisplay },
    { title: 'Total Pengeluaran', value: pengeluaran, count: pengeluaranCount, icon: ArrowDownLeft, color: 'text-red-400', formatter: formatSaldoDisplay },
    { title: 'Saldo Saat Ini', value: saldo, count: null, icon: Wallet, color: 'text-cyan-400', formatter: formatSaldoDisplay },
  ];

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {summaryData.map((item, index) => (
        <motion.div
          key={index}
          className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col justify-between"
          variants={itemVariants}
        >
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">{item.title}</p>
              <item.icon className={`h-6 w-6 ${item.color}`} />
            </div>
            {/* Kirim formatter yang sesuai ke komponen AnimatedNumber */}
            <AnimatedNumber value={item.value} className={`text-3xl font-bold mt-2 ${item.color}`} formatter={item.formatter} />
          </div>
          {item.count !== null && (
            <p className="text-xs text-gray-500 mt-3">
              dari {item.count} transaksi
            </p>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}

