"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, GalleryHorizontal, Settings, Landmark, UserCircle, LayoutGrid, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Daftar item navigasi utama
export const navItems = [
  { href: "/transaction-manager", icon: Home, label: "Dashboard" },
  { href: "/transaction-manager", icon: Wallet, label: "Transaksi" },
  { href: "/saldo", icon: Landmark, label: "Saldo" },
  { href: "/gallery", icon: GalleryHorizontal, label: "Galeri Berkas" },
  { href: "/settings", icon: Settings, label: "Pengaturan" },
];

// Daftar item sub-navigasi untuk halaman Pengaturan
const settingsNavItems = [
    { href: "/settings", icon: UserCircle, label: "Profil" },
    { href: "/settings/categories", icon: LayoutGrid, label: "Kategori" },
    { href: "/settings/notifications", icon: Bell, label: "Notifikasi" },
];

export default function Sidebar() {
  const pathname = usePathname();

  // Cek apakah kita sedang berada di dalam halaman pengaturan
  const isSettingsPage = pathname.startsWith('/settings');

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col fixed inset-y-0 z-50 bg-gray-800 text-white border-r border-gray-700">
      <div className="flex h-16 items-center justify-center border-b border-gray-700">
        <Link href="/dashboard">
          <h1 className="text-2xl font-bold text-cyan-400">KeuanganKu</h1>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <div key={item.label}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-300 transition-all hover:bg-gray-700 hover:text-white",
                // Sorot item utama jika path cocok atau jika kita berada di sub-halaman pengaturan
                (pathname === item.href || (item.href === "/settings" && isSettingsPage)) && "bg-gray-700 text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>

            {/* Jika item adalah "Pengaturan" dan kita ada di halaman pengaturan, tampilkan sub-menu */}
            <AnimatePresence>
              {item.href === "/settings" && isSettingsPage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-4 mt-1 pl-4 border-l-2 border-gray-700 space-y-1"
                >
                  {settingsNavItems.map((subItem) => (
                    <Link
                      key={subItem.label}
                      href={subItem.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-gray-400 transition-all hover:bg-gray-700 hover:text-white",
                        pathname === subItem.href && "text-cyan-300"
                      )}
                    >
                      <subItem.icon className="h-4 w-4" />
                      {subItem.label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>
    </aside>
  );
}

