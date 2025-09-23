'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

// Menggunakan fungsi dari authService untuk menjaga konsistensi
import { signInWithEmail, signUpWithEmail } from '@/lib/AuthServices';

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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await signInWithEmail(email, password);
        if (error) throw new Error(error);
        toast.success('Login berhasil!');
        router.push('/dahsboard'); // Arahkan ke halaman transaksi setelah login
      } else {
        const { error } = await signUpWithEmail(email, password);
        if (error) throw new Error(error);
        toast.success('Akun berhasil dibuat!');
        router.push('/'); // Arahkan ke halaman utama/dashboard setelah mendaftar
      }
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
        <Card className="w-[360px] h-[500px] max-w-md bg-gray-800 border-gray-700 text-white">
        <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-cyan-500/10 p-3 rounded-full border border-cyan-500/30">
                <ShieldCheck className="h-8 w-8 text-cyan-400" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {isLogin ? 'Selamat Datang' : 'Buat Akun Baru'}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {isLogin ? 'Masuk untuk melanjutkan.' : 'Mulai kelola keuangan Anda.'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-7">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="email@example.com" 
                  value={email} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} 
                  required 
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} 
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
            <CardFooter className="flex flex-col gap-8 mt-7">
              <Button type="submit" disabled={loading} className="w-full bg-cyan-600 mt-4 hover:bg-cyan-700">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Memproses...' : (isLogin ? 'Login' : 'Daftar')}
              </Button>
              <p className="text-center text-sm text-gray-400">
                {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}
                <button 
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError(null); }} 
                  className="font-semibold text-cyan-400 hover:underline ml-1"
                  disabled={loading}
                >
                  {isLogin ? 'Daftar di sini' : 'Login di sini'}
                </button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
