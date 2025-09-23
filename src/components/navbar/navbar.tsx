"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { logOut } from "@/lib/AuthServices";
import { Bell, Settings, LogOut, Menu, Search, Home } from "lucide-react";
import { motion } from "framer-motion";
import { listenForNotifications, markNotificationAsRead, type Notification } from "@/lib/notificationService";
import { cn } from "@/lib/utils";

// Import komponen dari shadcn/ui
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

// Pemetaan path URL ke judul halaman
const pageTitles: { [key: string]: string } = {
    '/saldo-manager': 'Dashboard',
    '/transaction-manager': 'Manajer Transaksi',
    '/saldo': 'Manajer Saldo',
    '/gallery': 'Galeri Berkas',
    '/settings': 'Pengaturan',
};

export default function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [currentDate, setCurrentDate] = useState("");
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const hasUnread = notifications.some(n => !n.isRead);

  useEffect(() => {
    setPageTitle(pageTitles[pathname] || "Halaman");
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(today.toLocaleDateString('id-ID', options));
  }, [pathname]);

  // Efek untuk mendengarkan notifikasi secara real-time
  useEffect(() => {
    if (user?.uid) {
      // Mulai mendengarkan notifikasi saat pengguna login
      const unsubscribe = listenForNotifications(user.uid, (newNotifications) => {
        setNotifications(newNotifications);
      });
      // Berhenti mendengarkan saat komponen unmount atau user berubah
      return () => unsubscribe();
    }
  }, [user]);
  
  const handleNotificationClick = (notification: Notification) => {
      if (!notification.isRead && user?.uid) {
          markNotificationAsRead(user.uid, notification.id);
      }
      // Di sini Anda bisa menambahkan logika redirect jika notifikasi memiliki link
  };

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
        <Button variant="ghost" size="icon" className="md:hidden text-gray-300 hover:text-white"><Menu className="h-6 w-6" /></Button>
        <h2 className="hidden md:block text-lg font-semibold text-white">{pageTitle}</h2>
      </div>

      {/* Sisi Kanan Navbar */}
      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input type="search" placeholder="Cari transaksi..." className="pl-8 w-[200px] lg:w-[300px]" />
        </div>
        
        {/* Tombol Notifikasi Fungsional */}
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-gray-300 hover:text-white hover:bg-gray-700 rounded-full">
                    <Bell className="h-5 w-5" />
                    {hasUnread && (
                        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 bg-gray-800 border-gray-700 text-white" align="end">
                <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                {notifications.length > 0 ? (
                    notifications.map(notif => (
                        <DropdownMenuItem 
                            key={notif.id} 
                            onClick={() => handleNotificationClick(notif)}
                            className={cn("cursor-pointer focus:bg-gray-700 whitespace-normal", !notif.isRead && "bg-cyan-900/50")}
                        >
                            <div className="flex items-start gap-3 py-2">
                                {!notif.isRead && <div className="h-2 w-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />}
                                <p className={cn("text-sm", !notif.isRead ? "text-white" : "text-gray-400")}>
                                    {notif.message}
                                </p>
                            </div>
                        </DropdownMenuItem>
                    ))
                ) : (
                    <p className="text-center text-sm text-gray-400 p-4">Tidak ada notifikasi baru.</p>
                )}
            </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-white truncate max-w-[150px]">{user?.email}</p>
          <p className="text-xs text-gray-400">{currentDate}</p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10"><AvatarFallback className="bg-cyan-600 text-white">{getInitials(user?.email)}</AvatarFallback></Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-gray-800 border-gray-700 text-white" align="end">
            <DropdownMenuLabel>
                <p>Akun Saya</p>
                <p className="text-xs font-normal text-gray-400 truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem asChild className="cursor-pointer focus:bg-gray-700"><Link href="/transaction-manager"><Home className="mr-2 h-4 w-4" /><span>Dashboard</span></Link></DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer focus:bg-gray-700"><Link href="/settings"><Settings className="mr-2 h-4 w-4" /><span>Pengaturan</span></Link></DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem onClick={logOut} className="cursor-pointer focus:bg-red-600/50 focus:text-white"><LogOut className="mr-2 h-4 w-4" /><span>Logout</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}

