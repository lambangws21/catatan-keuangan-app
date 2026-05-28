"use client";

import { useState } from "react";
import { Camera, Handshake, Landmark, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SaldoForm from "@/components/FormSaldo";
import ExpenseForm from "@/components/ExepenseForm";
import { cn } from "@/lib/utils";

interface FinanceFloatingActionsProps {
  onSaldoAdded: () => Promise<void>;
  onTransactionAdded: () => Promise<void>;
}

export default function FinanceFloatingActions({
  onSaldoAdded,
  onTransactionAdded,
}: FinanceFloatingActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openMealsMeeting = () => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent("meals-meeting:open-create"));
  };

  const optionClass =
    "h-12 rounded-2xl border border-white/25 bg-white/80 px-4 text-sm font-bold text-slate-900 shadow-[0_16px_45px_rgba(15,23,42,0.22)] backdrop-blur-2xl hover:-translate-y-0.5 hover:bg-white dark:border-white/15 dark:bg-slate-950/80 dark:text-white dark:hover:bg-slate-900";

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-4 z-[70] flex flex-col items-end gap-3 print:hidden lg:bottom-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div
        className={cn(
          "flex flex-col items-end gap-2 transition-all duration-200",
          isOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        )}
      >
        <SaldoForm
          onSaldoAdded={onSaldoAdded}
          trigger={
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className={optionClass}
            >
              <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-white shadow-inner shadow-white/20">
                <Landmark className="h-4 w-4" />
              </span>
              Tambah Saldo
            </Button>
          }
        />
        <ExpenseForm
          onTransactionAdded={onTransactionAdded}
          trigger={
            <Button
              type="button"
              onClick={() => setIsOpen(false)}
              className={optionClass}
            >
              <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-inner shadow-white/20">
                <Camera className="h-4 w-4" />
              </span>
              Tambah Transaksi
            </Button>
          }
        />
        <Button
          type="button"
          onClick={openMealsMeeting}
          className={optionClass}
        >
          <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white shadow-inner shadow-white/20">
            <Handshake className="h-4 w-4" />
          </span>
          Meals Metting
        </Button>
      </div>

      <Button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className="h-14 rounded-full border border-white/30 bg-white/75 px-5 font-bold text-slate-900 shadow-[0_18px_55px_rgba(15,23,42,0.25)] shadow-cyan-500/20 backdrop-blur-2xl transition-all hover:-translate-y-0.5 hover:bg-white/90 hover:text-slate-950 hover:shadow-[0_22px_70px_rgba(6,182,212,0.28)] dark:border-white/15 dark:bg-slate-950/80 dark:text-white dark:shadow-cyan-950/40 dark:hover:bg-slate-900/90"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500 text-white shadow-inner shadow-white/20">
          <Plus className={cn("h-5 w-5 transition-transform", isOpen && "rotate-45")} />
        </span>
        <span className="ml-2 hidden sm:inline">Tambah</span>
      </Button>
    </div>
  );
}
