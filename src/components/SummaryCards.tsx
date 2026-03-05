import { useEffect, useState, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, Wallet, Handshake, type LucideProps } from 'lucide-react';

interface SummaryProps {
  pemasukan: number;
  pengeluaran: number;
  saldo: number;
  pemasukanCount: number;
  pengeluaranCount: number;
  compact?: boolean;
  reimbursementAmount?: number;
}

type LucideIconType = ForwardRefExoticComponent<
  Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
>;

type SummaryTone = "income" | "expense" | "balance" | "reimbursement";

type SummaryItem = {
  title: "Total Pemasukan" | "Total Pengeluaran" | "Saldo Saat Ini" | "Reimburse";
  value: number;
  count: number | null;
  icon: LucideIconType;
  tone: SummaryTone;
  formatter: (num: number) => string;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Math.round(value));
};

const formatCurrencyCompact = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.round(value));

const formatSaldoDisplay = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 10_000_000) return formatCurrencyCompact(value);
  return formatCurrency(value);
};

function AnimatedNumber({ value, className, formatter }: { value: number, className: string, formatter: (num: number) => string }) {
  const count = useMotionValue(0);
  
  const displayValue = useTransform(count, (latest) => formatter(latest));

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: "easeOut" });
    return controls.stop;
  }, [value, count]);

  return <motion.p className={className}>{displayValue}</motion.p>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
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
  compact = false,
  reimbursementAmount = 0,
}: SummaryProps) {
  const [numberMode, setNumberMode] = useState<"compact" | "full">("compact");
  const numberModeStorageKey = "summary-cards:number-mode:v1";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(numberModeStorageKey);
    if (raw === "compact" || raw === "full") setNumberMode(raw);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(numberModeStorageKey, numberMode);
  }, [numberMode]);

  const valueFormatter = numberMode === "compact" ? formatSaldoDisplay : formatCurrency;
  
  // Reimburse: saat pengeluaran > pemasukan / saldo minus (defisit)
  const computedReimbursement = Math.max(0, pengeluaran - pemasukan);
  const reimbursementValue = Math.max(0, reimbursementAmount || computedReimbursement);

  const summaryData: SummaryItem[] = [
    {
      title: "Total Pemasukan",
      value: pemasukan,
      count: pemasukanCount,
      icon: ArrowUpRight,
      tone: "income",
      formatter: valueFormatter,
    },
    {
      title: "Total Pengeluaran",
      value: pengeluaran,
      count: pengeluaranCount,
      icon: ArrowDownLeft,
      tone: "expense",
      formatter: valueFormatter,
    },
    {
      title: "Saldo Saat Ini",
      value: saldo,
      count: null,
      icon: Wallet,
      tone: "balance",
      formatter: valueFormatter,
    },
  ];

  if (saldo < 0 && pengeluaran > 0 && reimbursementValue > 0) {
    summaryData.push({
      title: "Reimburse",
      value: reimbursementValue,
      count: null,
      icon: Handshake,
      tone: "reimbursement",
      formatter: valueFormatter,
    });
  }

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
    reimbursement: {
      accent: "text-amber-300",
      badge: "bg-amber-400/10",
      glow: "from-amber-500/20 via-transparent to-transparent",
    },
  } as const;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setNumberMode((prev) => (prev === "compact" ? "full" : "compact"))}
          className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-(--dash-ink) hover:bg-white/15"
        >
          Angka: {numberMode === "compact" ? "Ringkas" : "Penuh"}
        </button>
      </div>
      <motion.div
        className={`grid grid-cols-1 ${
          summaryData.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3"
        } ${compact ? "gap-3" : "gap-5"} items-stretch`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {summaryData.map((item, index) => {
          const tone = toneStyles[item.tone];
          return (
            <motion.div
              key={index}
              className={`relative overflow-hidden rounded-2xl border border-white/10 bg-(--dash-surface) ${compact ? "p-4 shadow-[0_12px_24px_rgba(2,6,23,0.35)]" : "p-5 shadow-[0_16px_30px_rgba(2,6,23,0.45)]"}`}
              variants={itemVariants}
            >
              <div className={`absolute inset-0 bg-linear-to-br ${tone.glow}`} />

              <div className="relative z-10 flex min-w-0 flex-col gap-4">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.badge}`}>
                    <item.icon className={`h-5 w-5 ${tone.accent}`} />
                  </div>
                  {item.count !== null && (
                    <span className="max-w-[60%] truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-(--dash-muted)">
                      {item.count} transaksi
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="line-clamp-1 text-[10px] uppercase tracking-[0.25em] text-(--dash-muted)">
                    {item.title}
                  </p>
                  <AnimatedNumber
                    value={item.value}
                    className={`mt-2 block w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold leading-tight tracking-tight tabular-nums ${tone.accent} ${
                      compact
                        ? "text-[clamp(1.1rem,2.4vw,1.75rem)]"
                        : "text-[clamp(1.2rem,2.9vw,2.1rem)]"
                    }`}
                    formatter={item.formatter}
                  />
                  {item.title === "Reimburse" ? (
                    <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-white/70">
                      Pengeluaran melebihi pemasukan, segera ajukan reimbusen.
                    </p>
                  ) : null}
                </div>
              </div>
            </motion.div>
            );
          })}
        </motion.div>
    </div>
  );
}
