"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Wallet,
  GalleryHorizontal,
  Settings,
  Landmark,
  ChevronsLeft,
  HeartHandshakeIcon,
  StethoscopeIcon,
  DollarSign,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Impor komponen dari shadcn/ui
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

// Daftar item navigasi yang bisa dibagikan
export const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/transaction-manager", icon: Wallet, label: "Transaksi" },
  { href: "/saldo", icon: Landmark, label: "Saldo" },
  { href: "/gallery", icon: GalleryHorizontal, label: "Galeri Berkas" },
  { href: "/operasi", icon: StethoscopeIcon, label: "Operasi" },
  { href: "/visit-dokter", icon: HeartHandshakeIcon, label: "Visit Dokter" },
  { href: "/prices", icon: DollarSign, label: "List harga" },
  { href: "/stock-dasboard", icon: Database, label: "Stock" },
  { href: "/settings", icon: Settings, label: "Pengaturan" },
];

// Varian animasi untuk teks
const textVariants = {
  hidden: { opacity: 0, x: -10, transition: { duration: 0.1 } },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, delay: 0.1 } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.1 } },
};

// Definisikan props yang akan diterima komponen
interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <motion.aside
        className="hidden lg:flex h-screen flex-col fixed inset-y-0 left-0 z-40 border-r border-gray-700 bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-900/60 text-white shadow-2xl"
        animate={{ width: isCollapsed ? 80 : 260 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="flex h-16 items-center justify-center border-b border-white/10 px-4">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Wallet className="h-6 w-6 text-emerald-300" />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  className="text-xl font-semibold tracking-tight text-white whitespace-nowrap"
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  KeuanganKu
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
        <nav className="flex-1 space-y-2 p-3">
          <TooltipProvider delayDuration={0}>
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-slate-200 transition-all",
                        isCollapsed && "justify-center px-2",
                        isActive
                          ? "bg-gradient-to-r from-emerald-400/30 to-cyan-400/20 text-white shadow-lg"
                          : "hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition",
                          isActive ? "text-emerald-200" : "text-slate-400"
                        )}
                      />
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            className="truncate leading-tight"
                            variants={textVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" className="bg-white text-gray-800 shadow-lg">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>

        <div className="mt-auto border-t border-white/10 p-3">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleSidebar}
                  variant="ghost"
                  className="w-full justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
                >
                  <ChevronsLeft
                    className={cn(
                      "h-5 w-5 transition-transform duration-300",
                      isCollapsed && "rotate-180"
                    )}
                  />
                  {!isCollapsed && <span className="text-xs font-semibold uppercase">Ciutkan</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-white text-gray-800 shadow-lg">
                {isCollapsed ? "Perluas" : "Ciutkan"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.aside>

      <div className="lg:hidden pointer-events-auto fixed bottom-4 left-1/2 z-50 flex w-[92%] -translate-x-1/2 items-center justify-between rounded-3xl border border-white/15 bg-slate-900/80 p-2 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-1 items-center justify-center rounded-2xl px-3 py-2 text-xs font-semibold text-slate-200 transition",
                isActive
                  ? "bg-gradient-to-b from-emerald-400/40 to-cyan-500/10 text-white shadow-inner"
                  : "hover:bg-white/10"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="ml-1 hidden truncate md:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
