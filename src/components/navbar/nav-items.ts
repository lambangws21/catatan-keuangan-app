import {
  Database,
  DollarSign,
  GalleryHorizontal,
  HeartHandshakeIcon,
  Home,
  Landmark,
  FileText,
  Settings,
  StethoscopeIcon,
  Wallet,
  Wrench,
} from "lucide-react";

export const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/transaction-manager", icon: Wallet, label: "Transaksi" },
  { href: "/saldo", icon: Landmark, label: "Saldo" },
  { href: "/gallery", icon: GalleryHorizontal, label: "Galeri Berkas" },
  { href: "/pdf-editor", icon: FileText, label: "PDF Editor" },
  { href: "/operasi", icon: StethoscopeIcon, label: "Operasi" },
  { href: "/visit-dokter", icon: HeartHandshakeIcon, label: "Visit Dokter" },
  { href: "/penjadwalan-ts", icon: Wrench, label: "Penjadwalan TS" },
  { href: "/prices", icon: DollarSign, label: "List harga" },
  { href: "/stock-dasboard", icon: Database, label: "Stock" },
  { href: "/settings", icon: Settings, label: "Pengaturan" },
];
