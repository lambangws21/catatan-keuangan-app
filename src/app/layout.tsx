'use client';

import './globals.css';
import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import Navbar from '@/components/navbar/navbar';
import Sidebar from '@/components/navbar/sidebar';
import { motion } from 'framer-motion';


function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // State untuk mengelola status sidebar (minimize/maximize)
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && pathname !== '/register') {
      router.push('/login');
    }
    if (!loading && user && (pathname === '/login' || pathname === '/register')) {
      router.push('/transaction-manager');
    }
  }, [user, loading, pathname, router]);

  if (loading) return null;

  const noLayoutPages: string[] = ['/login', '/register'];
  if (noLayoutPages.includes(pathname) || !user) {
    return <>{children}</>;
  }

  // Fungsi untuk mengubah state sidebar
  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  return (
    <div className="min-h-screen w-full bg-gray-900">
      {/* Kirim state dan fungsi toggle ke Sidebar */}
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      
      {/* Konten utama sekarang memiliki class padding kiri yang dinamis */}
      <motion.div
        className="flex flex-col transition-all duration-300 ease-in-out"
        // Animasikan margin kiri berdasarkan status sidebar
        animate={{ paddingLeft: isSidebarCollapsed ? '80px' : '256px' }}
        // Untuk mobile (di bawah breakpoint lg), margin direset ke 0
        initial={{ paddingLeft: '0px' }}
    
        media-lg={{ paddingLeft: isSidebarCollapsed ? '80px' : '256px' }}
      >
        {/* Kirim fungsi toggle ke Navbar */}
        <Navbar/>
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </motion.div>
    </div>
  );
}

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

