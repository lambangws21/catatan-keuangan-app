"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { logOut } from "@/lib/AuthServices";
import { Bell, Settings, LogOut, Menu, Search, Home } from "lucide-react"; // Ikon baru
import { motion } from "framer-motion";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Pemetaan path URL ke judul halaman yang lebih ramah pengguna
const pageTitles: { [key: string]: string } = {

    '/transaction-manager': 'Manajer Transaksi',
    '/saldo-manager': 'Manajer Saldo',
    '/gallery': 'Galeri Berkas',
    '/settings': 'Pengaturan',
};


export default function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [currentDate, setCurrentDate] = useState("");
  const [pageTitle, setPageTitle] = useState("Dashboard");

  useEffect(() => {
    setPageTitle(pageTitles[pathname] || "Halaman");

    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    };
    setCurrentDate(today.toLocaleDateString('id-ID', options));
  }, [pathname]);

  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <motion.header 
      className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-700 bg-gray-800 px-4 md:px-6"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Sisi Kiri Navbar */}
      <div className="flex items-center gap-4">
        {/* Tombol Hamburger Menu (hanya tampil di mobile) */}
        <Button variant="ghost" size="icon" className="md:hidden text-gray-300 hover:text-white">
          <Menu className="h-6 w-6" />
        </Button>
        {/* Judul Halaman (hanya tampil di desktop) */}
        <h2 className="hidden md:block text-lg font-semibold text-white">{pageTitle}</h2>
      </div>

      {/* Sisi Kanan Navbar */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Kolom Pencarian (hanya tampil di desktop) */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input type="search" placeholder="Cari transaksi..." className="pl-8 w-[200px] lg:w-[300px]" />
        </div>
        
        {/* Tombol Notifikasi */}
        <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white hover:bg-gray-700 rounded-full">
            <Bell className="h-5 w-5" />
        </Button>

        {/* Info Pengguna (hanya tampil di desktop) */}
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-white truncate max-w-[150px]">{user?.email}</p>
          <p className="text-xs text-gray-400">{currentDate}</p>
        </div>
        
        {/* Menu Dropdown Profil */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-cyan-600 text-white">
                  {getInitials(user?.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-gray-800 border-gray-700 text-white" align="end">
            <DropdownMenuLabel>
                <p>Akun Saya</p>
                <p className="text-xs font-normal text-gray-400 truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-700" />
            {/* Tombol Kembali ke Dashboard */}
            <DropdownMenuItem asChild className="cursor-pointer focus:bg-gray-700">
              <Link href="/transaction-manager">
                <Home className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer focus:bg-gray-700">
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Pengaturan</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem onClick={logOut} className="cursor-pointer focus:bg-red-600/50 focus:text-white">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}

