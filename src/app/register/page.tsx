'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { signUpWithEmail } from '@/lib/AuthServices';

// Import komponen dari shadcn/ui
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok.");
      toast.error("Password tidak cocok.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { error } = await signUpWithEmail(email, password);
      if (error) throw new Error(error);
      
      toast.success('Akun berhasil dibuat! Silakan login.');
      router.push('/login'); // Arahkan ke halaman login setelah berhasil mendaftar
      
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.';
        setError(errorMessage);
        toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md bg-gray-800 border-gray-700 text-white">
          <CardHeader className="text-center space-y-1">
            <CardTitle className="text-2xl font-bold text-cyan-400">
              Buat Akun Baru
            </CardTitle>
            <CardDescription className="text-gray-400">
              Mulai kelola keuangan Anda hari ini.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="email@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Minimal 6 karakter" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="Ulangi password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                  disabled={loading}
                />
              </div>
               <AnimatePresence>
                {error && (
                    <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-red-400 text-sm text-center"
                    >
                        {error}
                    </motion.p>
                )}
              </AnimatePresence>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Memproses...' : 'Daftar'}
              </Button>
              <p className="text-center text-sm text-gray-400">
                Sudah punya akun?
                <Link href="/login" className="font-semibold text-cyan-400 hover:underline ml-1">
                  Login di sini
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
