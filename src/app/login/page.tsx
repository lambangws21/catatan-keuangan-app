'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, WalletCards } from 'lucide-react';

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
        router.push('/dashboard'); // Arahkan ke halaman dashboard setelah login
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
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#020617] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.2),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.18),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#042f2e_100%)]" />
      <div className="pointer-events-none absolute inset-x-4 top-8 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 grid w-full max-w-5xl items-stretch gap-4 md:grid-cols-[1.05fr_0.95fr]"
      >
        <section className="hidden min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur md:flex md:flex-col md:justify-between lg:p-8">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm font-medium text-cyan-100">
              <WalletCards className="h-4 w-4" />
              Catatan Keuangan
            </div>
            <div className="space-y-3">
              <h1 className="max-w-md break-words text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                Kelola transaksi lebih rapi dari satu tempat.
              </h1>
              <p className="max-w-md text-sm leading-6 text-slate-300">
                Masuk untuk melihat dashboard, saldo, jadwal, dan dokumentasi transaksi tanpa layout yang berantakan.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm text-slate-300">
            {["Dashboard ringkas", "Input transaksi cepat", "Data tersimpan di Firebase"].map((item) => (
              <div key={item} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-300" />
                <span className="min-w-0 break-words">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <Card className="min-w-0 overflow-hidden rounded-2xl border-white/10 bg-slate-950/80 text-white shadow-2xl shadow-black/30 backdrop-blur">
          <CardHeader className="space-y-4 px-5 pt-6 text-center sm:px-7 sm:pt-8">
            <div className="mx-auto rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3">
              <ShieldCheck className="h-8 w-8 text-cyan-300" />
            </div>
            <div className="space-y-2">
              <CardTitle className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
              {isLogin ? 'Selamat Datang' : 'Buat Akun Baru'}
              </CardTitle>
              <CardDescription className="mx-auto max-w-xs break-words text-sm leading-6 text-slate-400">
                {isLogin ? 'Masuk untuk melanjutkan ke dashboard.' : 'Mulai kelola keuangan Anda dengan akun baru.'}
              </CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 px-5 sm:px-7">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-slate-200">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="email@example.com" 
                  value={email} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} 
                  required 
                  disabled={loading}
                  className="h-12 min-w-0 border-white/10 bg-white/[0.06] text-white placeholder:text-slate-500 focus-visible:ring-cyan-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-slate-200">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} 
                  required 
                  disabled={loading}
                  className="h-12 min-w-0 border-white/10 bg-white/[0.06] text-white placeholder:text-slate-500 focus-visible:ring-cyan-300"
                />
              </div>
               <AnimatePresence>
                {error && (
                    <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-center text-sm leading-5 text-red-200 break-words"
                    >
                        {error}
                    </motion.p>
                )}
              </AnimatePresence>
            </CardContent>
            <CardFooter className="flex flex-col gap-5 px-5 pb-6 pt-4 sm:px-7 sm:pb-8">
              <Button type="submit" disabled={loading} className="h-12 w-full bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-300">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Memproses...' : (isLogin ? 'Login' : 'Daftar')}
              </Button>
              <p className="max-w-full text-center text-sm leading-6 text-slate-400">
                {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}
                <button 
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError(null); }} 
                  className="ml-1 font-semibold text-cyan-300 underline-offset-4 hover:underline"
                  disabled={loading}
                >
                  {isLogin ? 'Daftar di sini' : 'Login di sini'}
                </button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </main>
  );
}
