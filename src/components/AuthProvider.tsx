'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import Spinner from '@/components/Spinner';

// Tipe untuk data yang akan disediakan oleh context
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

// Buat context
const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

// Komponen Provider yang akan membungkus aplikasi
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged adalah listener real-time dari Firebase
    // yang akan berjalan setiap kali status login pengguna berubah.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Hentikan listener saat komponen tidak lagi digunakan
    return () => unsubscribe();
  }, []);

  // Tampilkan loading spinner saat status auth sedang diperiksa
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook kustom untuk memudahkan akses ke data auth
export const useAuth = () => useContext(AuthContext);
