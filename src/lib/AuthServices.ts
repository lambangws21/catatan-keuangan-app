import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updatePassword,
  deleteUser,
  type User, // 1. Impor tipe User dari Firebase
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase/client';

// Inisialisasi Auth dari instance app client-side Anda
export const auth = getAuth();

// Tipe untuk nilai balik fungsi yang lebih konsisten
interface AuthResponse {
  user?: User | null; // 2. Gunakan tipe User yang spesifik, bukan 'any'
  error: string | null;
}

// Pesan error Firebase Auth aslinya berbahasa Inggris dan teknis (contoh:
// "Firebase: Error (auth/invalid-credential)."). Peta ini menerjemahkannya
// menjadi pesan yang bisa dipahami pengguna, sekaligus jadi tempat tunggal
// untuk menambah kode error baru di masa depan.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email atau password salah. Periksa kembali data Anda.',
  'auth/wrong-password': 'Email atau password salah. Periksa kembali data Anda.',
  'auth/user-not-found': 'Akun dengan email tersebut tidak ditemukan. Silakan daftar terlebih dahulu.',
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/user-disabled': 'Akun ini telah dinonaktifkan. Hubungi admin.',
  'auth/too-many-requests': 'Terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.',
  'auth/network-request-failed': 'Gagal terhubung ke server. Periksa koneksi internet Anda.',
  'auth/operation-not-allowed': 'Metode login email/password belum diaktifkan. Hubungi admin.',
  'auth/email-already-in-use': 'Email sudah terdaftar. Silakan login.',
  'auth/weak-password': 'Password terlalu lemah, minimal 6 karakter.',
  'auth/missing-email': 'Masukkan alamat email terlebih dahulu.',
};

function getAuthErrorMessage(error: unknown, fallback: string): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : null;
  if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];
  return error instanceof Error ? error.message : fallback;
}

/**
* Mendaftarkan pengguna baru dengan email, password, dan role.
*/
export async function signUpWithEmail(email: string, password: string, role = 'user'): Promise<AuthResponse> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    // Simpan data tambahan pengguna ke Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      role: role,
      createdAt: new Date(),
    });
    return { user, error: null };
  } catch (error: unknown) {
    return { error: getAuthErrorMessage(error, 'Terjadi kesalahan tidak diketahui saat mendaftar.') };
  }
}

/**
* Melakukan login pengguna dengan email dan password.
*/
export async function signInWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: unknown) {
      return { error: getAuthErrorMessage(error, 'Terjadi kesalahan tidak diketahui saat login.') };
  }
}

/**
* Mengirim email reset password ke alamat email yang didaftarkan.
* Firebase tidak memberi tahu apakah email terdaftar atau tidak (demi keamanan),
* jadi pesan sukses selalu generik meskipun emailnya tidak ada di sistem.
*/
export async function sendResetPasswordEmail(email: string): Promise<{ error: string | null }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error: unknown) {
    return { error: getAuthErrorMessage(error, 'Gagal mengirim email reset password.') };
  }
}

/**
* Melakukan logout pengguna yang sedang aktif.
*/
export function logOut() {
  return signOut(auth);
}

/**
* Memperbarui password pengguna yang sedang login.
*/
export async function updateUserPassword(newPassword: string): Promise<{ error: string | null }> {
  const user = auth.currentUser;
  if (!user) {
      return { error: "Tidak ada pengguna yang sedang login." };
  }
  try {
      await updatePassword(user, newPassword);
      return { error: null };
  } catch (error: unknown) {
      // Firebase akan error jika login sudah terlalu lama, ini adalah pesan yang umum
      if (error instanceof Error && error.message.includes('auth/requires-recent-login')) {
          return { error: 'Harap logout dan login kembali untuk melakukan tindakan ini.' };
      }
      return { error: error instanceof Error ? error.message : 'Gagal memperbarui password.' };
  }
}

/**
* Menghapus akun pengguna yang sedang login.
*/
export async function deleteUserAccount(): Promise<{ error: string | null }> {
  const user = auth.currentUser;
  if (!user) {
      return { error: "Tidak ada pengguna yang sedang login." };
  }
  try {
      await deleteUser(user);
      return { error: null };
  } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('auth/requires-recent-login')) {
          return { error: 'Harap logout dan login kembali untuk melakukan tindakan ini.' };
      }
      return { error: error instanceof Error ? error.message : 'Gagal menghapus akun.' };
  }
}

