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
  const numberModeStorageKey = "summary-cards:number-mode:v2";

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
  
  const reimbursementValue = Math.max(0, reimbursementAmount);

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

  if (reimbursementValue > 0) {
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
      accent: "text-emerald-200",
      badge: "bg-emerald-400/10 border-emerald-300/20",
      glow: "from-emerald-400/18 via-transparent to-transparent",
      line: "bg-emerald-300",
    },
    expense: {
      accent: "text-rose-200",
      badge: "bg-rose-400/10 border-rose-300/20",
      glow: "from-rose-400/18 via-transparent to-transparent",
      line: "bg-rose-300",
    },
    balance: {
      accent: "text-sky-200",
      badge: "bg-sky-400/10 border-sky-300/20",
      glow: "from-sky-400/18 via-transparent to-transparent",
      line: "bg-sky-300",
    },
    reimbursement: {
      accent: "text-amber-200",
      badge: "bg-amber-400/10 border-amber-300/20",
      glow: "from-amber-400/18 via-transparent to-transparent",
      line: "bg-amber-300",
    },
  } as const;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="dash-kicker">Ringkasan</p>
          <p className="text-xs text-(--dash-muted)">Angka utama periode terpilih</p>
        </div>
        <button
          type="button"
          onClick={() => setNumberMode((prev) => (prev === "compact" ? "full" : "compact"))}
          className="rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-medium text-(--dash-ink) hover:bg-white/15"
        >
          Angka: {numberMode === "compact" ? "Ringkas" : "Penuh"}
        </button>
      </div>
      <motion.div
        className={`grid grid-cols-1 ${
          summaryData.length >= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3"
        } ${compact ? "gap-2" : "gap-3"} items-stretch`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {summaryData.map((item, index) => {
          const tone = toneStyles[item.tone];
          return (
            <motion.div
              key={index}
              className={`dash-panel relative min-w-0 overflow-hidden rounded-2xl ${compact ? "p-3" : "p-4"}`}
              variants={itemVariants}
            >
              <div className={`absolute inset-0 bg-linear-to-br ${tone.glow}`} />
              <div className={`absolute inset-x-0 top-0 h-1 ${tone.line}`} />

              <div className="relative z-10 flex min-w-0 flex-col gap-3">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tone.badge}`}>
                    <item.icon className={`h-4 w-4 ${tone.accent}`} />
                  </div>
                  {item.count !== null && (
                    <span className="max-w-[60%] truncate rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-(--dash-muted)">
                      {item.count} transaksi
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--dash-muted)">
                    {item.title}
                  </p>
                  <AnimatedNumber
                    value={item.value}
                    className={`dash-value mt-1.5 block w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold leading-tight ${tone.accent} ${
                      compact
                        ? "text-[clamp(1rem,1.7vw,1.45rem)]"
                        : "text-[clamp(1.1rem,2.2vw,1.75rem)]"
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
