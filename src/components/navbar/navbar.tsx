"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { logOut } from "@/lib/AuthServices"; // PERBAIKAN: Path impor disesuaikan
import { Bell, Settings, LogOut, Menu, Search, Home, Wallet } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { listenForNotifications, markNotificationAsRead, type Notification } from "@/lib/notificationService";
import { navItems } from "@/components/navbar/sidebar";

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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const pageTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/transaction-manager': 'Transaksi',
    '/saldo': 'Saldo',
    '/operasi': 'Operasi',
    '/gallery': 'Galeri',
    '/settings': 'Pengaturan',
};

const dropdownVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.15, ease: "easeIn" } },
};

const mobileNavContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
const mobileNavItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export default function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [currentDate, setCurrentDate] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const hasUnread = notifications.some(n => !n.isRead);

  useEffect(() => {
    setPageTitle(pageTitles[pathname] || "Halaman");
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(today.toLocaleDateString('id-ID', options));
  }, [pathname]);

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = listenForNotifications(user.uid, setNotifications);
      return () => unsubscribe();
    }
  }, [user]);
  
  const handleNotificationClick = (notification: Notification) => {
      if (!notification.isRead && user?.uid) {
          markNotificationAsRead(user.uid, notification.id);
      }
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <motion.header 
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-700 bg-gray-800/80 backdrop-blur-lg px-4 md:px-6"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-4">
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white"><Menu className="h-6 w-6" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-gray-800 text-white border-gray-700 w-64 p-0">
              <SheetHeader className="sr-only"><SheetTitle>Menu Utama</SheetTitle></SheetHeader>
              <div className="flex h-16 items-center justify-center border-b border-gray-700">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                  <Wallet className="h-7 w-7 text-cyan-400" /><span className="text-xl font-bold text-white">KeuanganKu</span>
                </Link>
              </div>
              <motion.nav className="flex-1 space-y-2 p-4" variants={mobileNavContainerVariants} initial="hidden" animate="visible">
                {navItems.map((item) => (
                  <motion.div key={item.label} variants={mobileNavItemVariants}>
                    <Link
                      href={item.href}
                      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-gray-300 transition-all hover:bg-gray-700 hover:text-white", pathname.startsWith(item.href) && "bg-cyan-600 text-white")}
                    >
                      <item.icon className="h-5 w-5" />{item.label}
                    </Link>
                  </motion.div>
                ))}
              </motion.nav>
            </SheetContent>
          </Sheet>
        </div>
        <h2 className="hidden md:block text-lg font-semibold text-white">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input type="search" placeholder="Cari..." className="pl-8 w-[150px] md:w-[200px] lg:w-[300px]" />
        </div>
        
        <DropdownMenu open={isNotifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-gray-300 hover:text-white hover:bg-gray-700 rounded-full">
                    <Bell className="h-5 w-5" />
                    {hasUnread && <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span></span>}
                </Button>
            </DropdownMenuTrigger>
            <AnimatePresence>
                {isNotifOpen && (
                    <DropdownMenuContent asChild className="w-80 bg-gray-800/80 backdrop-blur-md border-gray-700 text-white" align="end">
                        <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit">
                            <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-gray-700" />
                            {notifications.length > 0 ? notifications.map(notif => (
                                <DropdownMenuItem key={notif.id} onClick={() => handleNotificationClick(notif)} className={cn("cursor-pointer focus:bg-gray-700 whitespace-normal", !notif.isRead && "bg-cyan-900/50")}>
                                    <div className="flex items-start gap-3 py-2">
                                        {!notif.isRead && <div className="h-2 w-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />}
                                        <p className={cn("text-sm", !notif.isRead ? "text-white" : "text-gray-400")}>{notif.message}</p>
                                    </div>
                                </DropdownMenuItem>
                            )) : <p className="text-center text-sm text-gray-400 p-4">Tidak ada notifikasi baru.</p>}
                        </motion.div>
                    </DropdownMenuContent>
                )}
            </AnimatePresence>
        </DropdownMenu>
        
        <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-white truncate max-w-[150px]">{user?.email}</p>
            <p className="text-xs text-gray-400">{currentDate}</p>
        </div>

        <DropdownMenu open={isProfileOpen} onOpenChange={setProfileOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full"><Avatar className="h-10 w-10"><AvatarFallback className="bg-cyan-600 text-white">{getInitials(user?.email)}</AvatarFallback></Avatar></Button>
          </DropdownMenuTrigger>
           <AnimatePresence>
                {isProfileOpen && (
                    <DropdownMenuContent asChild className="w-56 bg-gray-800/80 backdrop-blur-md border-gray-700 text-white" align="end">
                        <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit">
                            <DropdownMenuLabel><p className="font-medium">Akun Saya</p><p className="text-xs font-normal text-gray-400 truncate">{user?.email}</p></DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-gray-700" />
                            <DropdownMenuItem asChild className="cursor-pointer focus:bg-gray-700"><Link href="/dashboard"><Home className="mr-2 h-4 w-4" /><span>Dashboard</span></Link></DropdownMenuItem>
                            <DropdownMenuItem asChild className="cursor-pointer focus:bg-gray-700"><Link href="/settings"><Settings className="mr-2 h-4 w-4" /><span>Pengaturan</span></Link></DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-700" />
                            <DropdownMenuItem onClick={logOut} className="cursor-pointer focus:bg-red-600/50 focus:text-white"><LogOut className="mr-2 h-4 w-4" /><span>Logout</span></DropdownMenuItem>
                        </motion.div>
                    </DropdownMenuContent>
                )}
            </AnimatePresence>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}

