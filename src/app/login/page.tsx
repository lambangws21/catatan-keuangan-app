'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Mail, ShieldCheck, WalletCards } from 'lucide-react';

// Menggunakan fungsi dari authService untuk menjaga konsistensi
import { signInWithEmail, signUpWithEmail, sendResetPasswordEmail } from '@/lib/AuthServices';

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSendReset = async (e: FormEvent) => {
    e.preventDefault();
    setIsSendingReset(true);
    try {
      const { error } = await sendResetPasswordEmail(resetEmail);
      if (error) throw new Error(error);
      toast.success('Link reset password telah dikirim. Periksa inbox (atau folder spam) email Anda.');
      setIsResetOpen(false);
      setResetEmail('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengirim email reset password.';
      toast.error(message);
    } finally {
      setIsSendingReset(false);
    }
  };

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
      <div className="pointer-events-none absolute inset-x-4 top-8 h-px bg-linear-to-r from-transparent via-cyan-300/40 to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 grid w-full max-w-5xl items-stretch gap-4 md:grid-cols-[1.05fr_0.95fr]"
      >
        <section className="hidden min-w-0 rounded-2xl border border-white/10 bg-white/6 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur md:flex md:flex-col md:justify-between lg:p-8">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm font-medium text-cyan-100">
              <WalletCards className="h-4 w-4" />
              Catatan Keuangan
            </div>
            <div className="space-y-3">
              <h1 className="max-w-md wrap-break-word text-4xl font-semibold tracking-tight text-white lg:text-5xl">
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
                <span className="min-w-0 wrap-break-word">{item}</span>
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
              <CardTitle className="wrap-break-word text-2xl font-semibold tracking-tight sm:text-3xl">
              {isLogin ? 'Selamat Datang' : 'Buat Akun Baru'}
              </CardTitle>
              <CardDescription className="mx-auto max-w-xs wrap-break-word text-sm leading-6 text-slate-400">
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
                  className="h-12 min-w-0 border-white/10 bg-white/6 text-white placeholder:text-slate-500 focus-visible:ring-cyan-300"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm text-slate-200">Password</Label>
                  {isLogin && (
                    <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setResetEmail(email)}
                          className="text-xs font-medium text-cyan-300 underline-offset-4 hover:underline"
                        >
                          Lupa password?
                        </button>
                      </DialogTrigger>
                      <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Reset Password</DialogTitle>
                          <DialogDescription className="text-slate-400">
                            Masukkan email akun Anda. Kami akan mengirimkan link untuk membuat password baru.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSendReset} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="resetEmail" className="text-sm text-slate-200">Email</Label>
                            <div className="relative">
                              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                              <Input
                                id="resetEmail"
                                type="email"
                                placeholder="email@example.com"
                                value={resetEmail}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setResetEmail(e.target.value)}
                                required
                                disabled={isSendingReset}
                                className="h-11 border-white/10 bg-white/6 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-300"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={isSendingReset} className="w-full bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-300">
                              {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {isSendingReset ? 'Mengirim...' : 'Kirim Link Reset'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 min-w-0 border-white/10 bg-white/6 pr-11 text-white placeholder:text-slate-500 focus-visible:ring-cyan-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-200 disabled:opacity-40"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
               <AnimatePresence>
                {error && (
                    <motion.p 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-center text-sm leading-5 text-red-200 wrap-break-word"
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
