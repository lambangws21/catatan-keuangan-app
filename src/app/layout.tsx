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
    if (!loading && !user && pathname !== '/login' && pathname !== '/register') {
      router.push('/login');
    }
    // Jika pengecekan selesai dan user sudah login tapi berada di halaman login/register, arahkan ke dashboard
    if (!loading && user && (pathname === '/login' || pathname === '/register')) {
      router.push('/transaction-manager');
    }
  }, [user, loading, pathname, router]);

  // Selama pengecekan, jangan tampilkan apa-apa (AuthProvider sudah menampilkan spinner)
  if (loading) {
    return null;
  }
  
  // PERBAIKAN: Secara eksplisit daftarkan halaman yang tidak menggunakan layout utama.
  // Ini memastikan navbar tidak akan pernah muncul di halaman login atau register.
  const noLayoutPages: string[] = ['/login', '/register'];
  if (noLayoutPages.includes(pathname)) {
    return <>{children}</>;
  }
  
  // Jika tidak ada user, jangan tampilkan layout utama (meskipun sudah ada redirect di useEffect)
  if (!user) {
    return null;
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
            {/* Render AppLayout yang akan menangani semua logika */}
            <AppLayout>{children}</AppLayout>
          </AuthProvider>
      </body>
    </html>
  );
}

