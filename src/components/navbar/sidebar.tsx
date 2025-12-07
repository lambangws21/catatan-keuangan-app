"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, GalleryHorizontal, Settings, Landmark, ChevronsLeft, HeartHandshakeIcon, StethoscopeIcon, DollarSign } from "lucide-react";
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
  { href: "/visit-dokter", icon:HeartHandshakeIcon , label: "Visit Dokter" },
  { href: "/prices", icon:DollarSign , label: "List harga" },
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
    <motion.aside
      className={cn(
        "hidden lg:flex h-screen flex-col fixed inset-y-0 left-0 z-40 bg-gray-800 text-white border-r border-gray-700"
      )}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="flex h-16 items-center justify-center border-b border-gray-700 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold overflow-hidden">
          <Wallet className="h-7 w-7 text-cyan-400 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                className="text-xl font-bold text-white whitespace-nowrap"
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
      <nav className="flex-1 space-y-2 p-2">
        <TooltipProvider delayDuration={0}>
            {navItems.map((item) => (
            <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                <Link
                    href={item.href}
                    className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-300 transition-all hover:bg-gray-700 hover:text-white",
                    isCollapsed && "justify-center",
                    // Logika 'active' diubah menjadi startsWith untuk mencakup sub-halaman
                    pathname.startsWith(item.href) && "bg-cyan-600 text-white"
                    )}
                >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          className="truncate"
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
                    <TooltipContent side="right" className="bg-slate-200 text-gray-700 border-gray-600">
                        {item.label}
                    </TooltipContent>
                )}
            </Tooltip>
            ))}
        </TooltipProvider>
      </nav>

      <div className="mt-auto border-t border-gray-700 p-2">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={toggleSidebar}
                variant="ghost"
                className="w-full justify-center h-10 hover:bg-gray-700"
              >
                <ChevronsLeft className={cn("h-5 w-5 transition-transform duration-300", isCollapsed && "rotate-180")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-slate-200 text-gray-700 border-gray-600">
              {isCollapsed ? "Perluas" : "Ciutkan"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.aside>
  );
}

