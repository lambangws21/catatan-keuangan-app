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
    { title: 'Total Pemasukan', value: pemasukan, count: pemasukanCount, icon: ArrowUpRight, tone: 'income', formatter: formatSaldoDisplay },
    { title: 'Total Pengeluaran', value: pengeluaran, count: pengeluaranCount, icon: ArrowDownLeft, tone: 'expense', formatter: formatSaldoDisplay },
    { title: 'Saldo Saat Ini', value: saldo, count: null, icon: Wallet, tone: 'balance', formatter: formatSaldoDisplay },
  ] as const;

  const toneStyles = {
    income: {
      accent: "text-emerald-300",
      badge: "bg-emerald-400/10",
      glow: "from-emerald-500/20 via-transparent to-transparent",
    },
    expense: {
      accent: "text-rose-300",
      badge: "bg-rose-400/10",
      glow: "from-rose-500/20 via-transparent to-transparent",
    },
    balance: {
      accent: "text-sky-300",
      badge: "bg-sky-400/10",
      glow: "from-sky-500/20 via-transparent to-transparent",
    },
  } as const;

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {summaryData.map((item, index) => {
        const tone = toneStyles[item.tone];
        return (
        <motion.div
          key={index}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--dash-surface)] p-5 shadow-[0_16px_30px_rgba(2,6,23,0.45)]"
          variants={itemVariants}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${tone.glow}`} />

          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.badge}`}>
                <item.icon className={`h-5 w-5 ${tone.accent}`} />
              </div>
              {item.count !== null && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-[color:var(--dash-muted)]">
                  {item.count} transaksi
                </span>
              )}
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--dash-muted)]">
                {item.title}
              </p>
              <AnimatedNumber
                value={item.value}
                className={`mt-3 text-3xl sm:text-4xl font-semibold font-[var(--font-display)] ${tone.accent}`}
                formatter={item.formatter}
              />
            </div>
          </div>
        </motion.div>
        );
      })}
    </motion.div>
  );
}
