'use client';

import './globals.css';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import Navbar from '@/components/navbar/navbar';
import Sidebar from '@/components/navbar/sidebar';
import { cn } from '@/lib/utils';

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
    <div className="min-h-screen w-full bg-gray-900 text-white">
      {/* Kirim state dan fungsi toggle ke Sidebar */}
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      
      {/* Konten utama sekarang memiliki class padding kiri yang dinamis */}
      <div
        className={cn(
          "flex flex-col transition-all duration-300 ease-in-out",
          // Terapkan padding kiri di layar besar (lg) berdasarkan status sidebar
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        <Navbar  />
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// Komponen RootLayout utama
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="bg-gray-900">
          <AuthProvider>
            <Toaster richColors position="top-right" />
            <AppLayout>{children}</AppLayout>
          </AuthProvider>
      </body>
    </html>
  );
}

