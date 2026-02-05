"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { logOut } from "@/lib/AuthServices"; // PERBAIKAN: Path impor disesuaikan
import {
  Bell,
  CalendarDays,
  Check,
  Clock,
  Home,
  LogOut,
  Menu,
  Palette,
  Search,
  Settings,
  Wallet,
} from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  listenForNotifications,
  markNotificationAsRead,
  type Notification,
} from "@/lib/notificationService";
import { navItems } from "@/components/navbar/sidebar";
import { useVisitSchedules } from "@/hooks/use-visit-schedules";
import { getVisitAlertsForNextDays } from "@/lib/visit-dokter-alerts";

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
import { ActivityLog, ImplantedFirestoreStock } from "@/types/implant-stock";

const pageTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/transaction-manager': 'Transaksi',
    '/saldo': 'Saldo',
    '/operasi': 'Operasi',
    '/gallery': 'Galeri',
    '/settings': 'Pengaturan',
};

type ActivityLogPreview = {
  id: string;
  action: string;
  label: string;
  changedAt: string;
  stockId?: string;
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

interface ActivityLogRaw {
  action?: string;
  after?: ImplantedFirestoreStock | null;
  before?: ImplantedFirestoreStock | null;
  changedAt?: string;
  id?: string;
  stockId?: string;
}

const buildActivityLabel = (item: ActivityLogRaw) => {
  const toText = (entry?: ImplantedFirestoreStock | null) => {
    if (!entry) return undefined;
    const extended = entry as ImplantedFirestoreStock & { description?: string };
    return extended.deskripsi ?? extended.description;
  };

  const piece =
    toText(item.after) ??
    toText(item.before) ??
    "stok";
  switch (item.action) {
    case "CREATE":
      return `Tambah ${piece}`;
    case "DELETE":
      return `Hapus ${piece}`;
    case "UPDATE":
      return `Perbarui ${piece}`;
    default:
      return `Aktivitas ${piece}`;
  }
};

const themeOptions = [
  { value: "light", label: "Tema Terang" },
  { value: "dark", label: "Gelap Standar" },
  { value: "premium", label: "Tampilan Gelap Premium" },
];

const timeAgo = (timestamp: string) => {
  if (!timestamp) return "Baru saja";
  const when = new Date(timestamp);
  const diff = Date.now() - when.getTime();
  if (diff < 60000) return "Baru saja";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
  return `${Math.floor(diff / 86400000)} hari lalu`;
};

const getActivityHref = (item: ActivityLogPreview) =>
  item.stockId ? `/stock-dasboard?stock=${item.stockId}` : "/stock-dasboard";

export default function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { schedules: visitSchedules } = useVisitSchedules();
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [currentDate, setCurrentDate] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityPreview, setActivityPreview] = useState<ActivityLogPreview[]>([]);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [isThemeOpen, setThemeOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const hasUnread = notifications.some((n) => !n.isRead);
  const visitAlerts = useMemo(() => getVisitAlertsForNextDays(visitSchedules, 1), [visitSchedules]);
  const hasVisitAlert = visitAlerts.length > 0;
  const themeLabel =
    themeOptions.find((opt) => opt.value === theme)?.label ?? "Tema";

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

  useEffect(() => {
    const loadActivityPreview = async () => {
      try {
        const res = await fetch("/api/activity-log");
        const json: { data?: ActivityLog[] } = await res.json();
        if (Array.isArray(json.data)) {
          setActivityPreview(
            json.data
              .slice(0, 4)
              .map((item) => ({
                id: item.id,
                action: item.action ?? "UPDATE",
                changedAt: item.changedAt,
                label: buildActivityLabel(item),
                stockId: item.stockId,
              }))
          );
        }
      } catch (error) {
        console.error("Gagal mengambil ringkasan timeline:", error);
      }
    };

    loadActivityPreview();
  }, []);
  
  const handleNotificationClick = (notification: Notification) => {
      if (!notification.isRead && user?.uid) {
          markNotificationAsRead(user.uid, notification.id);
          setNotifications((prev) =>
            prev.map((notif) =>
              notif.id === notification.id ? { ...notif, isRead: true } : notif
            )
          );
      }
  };

  const handleMarkAllRead = async () => {
    if (!user?.uid) return;
    const unread = notifications.filter((notif) => !notif.isRead);
    if (!unread.length) return;

    await Promise.all(
      unread.map((notif) => markNotificationAsRead(user.uid!, notif.id))
    );

    setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
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
        <DropdownMenu open={isThemeOpen} onOpenChange={setThemeOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/90"
            >
              <Palette className="h-4 w-4 text-cyan-300" />
              {themeLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-48 rounded-2xl bg-gray-900/90 backdrop-blur-xl border border-white/10 shadow-2xl"
            align="end"
          >
            <DropdownMenuLabel className="text-xs uppercase tracking-[0.3em] text-gray-400">
              Tema
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-800" />
            {themeOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setTheme(option.value)}
                className="flex items-center justify-between text-sm text-white transition hover:text-white"
              >
                <span>{option.label}</span>
                {theme === option.value && (
                  <Check className="h-4 w-4 text-cyan-400" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu open={isNotifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-gray-300 hover:text-white hover:bg-gray-700 rounded-full">
                    <Bell className="h-5 w-5" />
                    {(hasUnread || hasVisitAlert) && (
                      <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                      </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <AnimatePresence>
                {isNotifOpen && (
                    <DropdownMenuContent
                      asChild
                      align="end"
                      className="w-[calc(100vw-1rem)] bg-gray-900/80 backdrop-blur-xl border border-cyan-500/30 text-white shadow-2xl sm:w-96"
                    >
                        <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4 px-1 py-2">
                            <div className="rounded-2xl border border-gray-800 bg-slate-900/80 p-4">
                              <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-gray-500">
                                <span className="inline-flex items-center gap-2">
                                  <CalendarDays className="h-4 w-4 text-cyan-300" />
                                  Visit Dokter
                                </span>
                                <Link
                                  href="/visit-dokter"
                                  className="text-cyan-300 transition hover:text-white"
                                >
                                  Buka
                                </Link>
                              </div>
                              <div className="mt-3 space-y-2">
                                {visitAlerts.length === 0 ? (
                                  <p className="text-sm text-gray-400">
                                    Tidak ada jadwal visit hari ini & besok.
                                  </p>
                                ) : (
                                  visitAlerts.slice(0, 3).map((v) => {
                                    const when = new Date(v.waktuVisit);
                                    const dayLabel = v.dayOffset === 0 ? "Hari ini" : "Besok";
                                    return (
                                      <Link
                                        key={v.id}
                                        href="/visit-dokter"
                                        className="block rounded-2xl border border-gray-800 bg-gradient-to-r from-slate-900/70 to-slate-900 px-3 py-2 text-sm text-gray-100 transition hover:border-cyan-500/50 hover:bg-cyan-900/40"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <p className="font-semibold leading-snug">
                                            {v.namaDokter}
                                          </p>
                                          <p className="inline-flex shrink-0 items-center gap-2 text-xs text-cyan-300">
                                            <Clock className="h-4 w-4" />
                                            {dayLabel}{" "}
                                            {when.toLocaleTimeString("id-ID", {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </p>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-400">
                                          {v.rumahSakit}
                                        </p>
                                      </Link>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-slate-900/60 to-slate-800/80 px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <DropdownMenuLabel className="text-sm">Notifikasi</DropdownMenuLabel>
                                  {hasUnread && (
                                    <button
                                      type="button"
                                      onClick={handleMarkAllRead}
                                      className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300 transition hover:text-cyan-100"
                                    >
                                      Tandai semua
                                    </button>
                                  )}
                                </div>
                                <DropdownMenuSeparator className="bg-gray-700" />
                                {notifications.length > 0 ? (
                                  <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                                    {notifications.map((notif) => (
                                      <DropdownMenuItem
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={cn(
                                          "cursor-pointer focus:bg-cyan-600/20 whitespace-normal rounded-2xl py-2 px-3 text-sm transition",
                                          !notif.isRead ? "bg-cyan-900/50 text-white" : "text-gray-300"
                                        )}
                                      >
                                        <div className="flex items-start gap-3">
                                          {!notif.isRead && (
                                            <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 mt-1 shrink-0" />
                                          )}
                                          <p className="leading-snug">{notif.message}</p>
                                        </div>
                                      </DropdownMenuItem>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-center text-sm text-gray-400 py-4">
                                    Tidak ada notifikasi baru.
                                  </p>
                                )}
                            </div>
                            <div className="rounded-2xl border border-gray-800 bg-slate-900/80 p-4">
                                <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-gray-500">
                                  <span>Timeline terbaru</span>
                                  <span>{activityPreview.length} entri</span>
                                </div>
                                <div className="mt-3 space-y-2">
                                  {activityPreview.length === 0 && (
                                    <p className="text-sm text-gray-400">
                                      Belum ada aktivitas terbaru.
                                    </p>
                                  )}
                                  {activityPreview.map((item) => (
                                    <Link
                                      key={item.id}
                                      href={getActivityHref(item)}
                                      className="block rounded-2xl border border-gray-800 bg-gradient-to-r from-slate-900/70 to-slate-900 px-3 py-2 text-sm text-gray-100 transition hover:border-cyan-500/50 hover:bg-cyan-900/40"
                                    >
                                      <p className="font-semibold">{item.label}</p>
                                      <p className="text-xs text-cyan-300">{timeAgo(item.changedAt)}</p>
                                    </Link>
                                  ))}
                                </div>
                                <div className="mt-3 text-right text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                                  <Link href="/stock-dasboard" className="hover:text-white">
                                    Lihat semua aktivitas
                                  </Link>
                                </div>
                            </div>
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
