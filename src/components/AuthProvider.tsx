"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logOut } from '@/lib/AuthServices'; // Pastikan logOut diimpor dari service Anda
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  // Fungsi untuk me-reset timer setiap kali ada aktivitas
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    // PERBAIKAN: Timer diatur ke 1 jam (3600000 milidetik)
    inactivityTimer.current = setTimeout(() => {
      if (auth.currentUser) { 
        logOut().then(() => {
          toast.info("Anda telah logout secara otomatis karena tidak aktif.");
        });
      }
    }, 3600000); 
  };

  useEffect(() => {
    // Listener onAuthStateChanged adalah cara terbaik untuk melacak sesi.
    // Ia akan berjalan saat inisialisasi, login, dan logout.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Hentikan loading setelah status auth pertama kali diketahui
      if (currentUser) {
        resetInactivityTimer(); // Mulai/reset timer saat pengguna login atau aktif
      } else {
        if (inactivityTimer.current) {
          clearTimeout(inactivityTimer.current); // Hentikan timer saat pengguna logout
        }
      }
    });

    const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const handleActivity = () => {
      // Hanya reset timer jika ada pengguna yang login
      if (auth.currentUser) {
        resetInactivityTimer();
      }
    };

    activityEvents.forEach(event => window.addEventListener(event, handleActivity));

    // Cleanup saat komponen tidak lagi digunakan
    return () => {
      unsubscribe();
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
      activityEvents.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, []); // Dependency array kosong agar listener ini hanya dipasang sekali

  // Tampilkan spinner loading global saat status autentikasi awal sedang diperiksa
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

