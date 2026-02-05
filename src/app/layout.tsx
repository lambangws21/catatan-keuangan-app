'use client';

import './globals.css';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import Navbar from '@/components/navbar/navbar';
import Sidebar from '@/components/navbar/sidebar';
import { cn } from '@/lib/utils';
import PWARegister from '@/components/PWARegister';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

// Komponen AppLayout yang diperbarui untuk tampilan yang fleksibel dan responsif
function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // State untuk mengelola status sidebar (minimize/maximize)
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Jika pengecekan selesai dan tidak ada user, paksa ke halaman login
    if (!loading && !user && pathname !== '/login' && pathname !== '/register') {
      router.push('/login');
    }
    // Jika pengecekan selesai dan user sudah login tapi berada di halaman login/register, arahkan ke dashboard
    if (!loading && user && (pathname === '/login' || pathname === '/register')) {
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return null; // AuthProvider sudah menampilkan spinner
  }
  
  // Halaman login/register dirender tanpa layout utama
  const noLayoutPages: string[] = ['/login', '/register'];
  if (noLayoutPages.includes(pathname) || !user) {
    return <>{children}</>;
  }

  // Fungsi untuk mengubah state sidebar
  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen w-full bg-black text-white">
        <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
        <div
          className={cn(
            "flex flex-col transition-all duration-300 ease-in-out",
            isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
          )}
        >
          <Navbar />
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}

// Komponen RootLayout utama
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0b1220" />
        <link rel="apple-touch-icon" href="/pwa/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Catatan Keuangan" />
      </head>
      <body className="bg-black">
          <AuthProvider>
            <PWARegister />
            <PWAInstallPrompt />
            <Toaster richColors position="top-right" />
            <AppLayout>{children}</AppLayout>
          </AuthProvider>
      </body>
    </html>
  );
}
