'use client';

import './globals.css';
import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import Navbar from '@/components/navbar/navbar';


// Komponen baru yang bertugas melindungi halaman dan menampilkan layout
function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
 

  useEffect(() => {
    // Jika pengecekan selesai dan tidak ada user, paksa ke halaman login
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  // Selama pengecekan, jangan tampilkan apa-apa (AuthProvider sudah menampilkan spinner)
  if (loading) {
    return null;
  }
  
  // Jika tidak ada user, halaman login akan dirender
  if (!user) {
    return <>{children}</>;
  }

  // PERBAIKAN: Berikan tipe eksplisit 'string[]' pada array
  const noLayoutPages: string[] = [];
  const useMainLayout = !noLayoutPages.some(path => pathname.startsWith(path));

  if (!useMainLayout) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full bg-gray-100 dark:bg-gray-800">
      <main className="flex-1 flex flex-col">
        <Navbar />
        <div className="flex-grow overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}

// Komponen RootLayout utama
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
          <AuthProvider>
            <Toaster richColors position="top-right" />
            {/* 3. Render AppLayout yang akan menangani logika */}
            <AppLayout>{children}</AppLayout>
          </AuthProvider>
      </body>
    </html>
  );
}

