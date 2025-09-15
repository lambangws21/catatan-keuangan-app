"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client'; // Mengimpor dari file client.ts Anda

// Definisikan tipe untuk konteks
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

// Buat konteks dengan nilai default
const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

// Buat komponen Provider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged adalah listener dari Firebase yang akan berjalan
    // setiap kali status login pengguna berubah (login, logout, dll.)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    // Membersihkan listener saat komponen tidak lagi digunakan
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Buat custom hook untuk memudahkan penggunaan konteks ini di komponen lain
export const useAuth = () => useContext(AuthContext);
