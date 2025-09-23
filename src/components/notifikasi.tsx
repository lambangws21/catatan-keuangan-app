
export function requestNotificationPermission() {
    // Cek apakah browser mendukung notifikasi
    if (!("Notification" in window)) {
      console.log("Browser ini tidak mendukung notifikasi desktop.");
      return;
    }
  
    // Minta izin. Hasilnya bisa 'granted', 'denied', atau 'default'.
    Notification.requestPermission();
  }
  
  /**
   * Menampilkan notifikasi keberhasilan registrasi.
   * Notifikasi hanya akan muncul jika pengguna telah memberikan izin.
   */
  export function showRegistrationSuccessNotification() {
    if (Notification.permission === "granted") {
      const title = "Registrasi Berhasil!";
      const options = {
        body: "Selamat datang! Akun Anda telah berhasil dibuat. Silakan login untuk melanjutkan.",
        // Anda bisa mengganti icon ini dengan logo aplikasi Anda
        icon: "/favicon.ico", 
        badge: "/logo-badge.png", // Ikon untuk notifikasi di Android
      };
      new Notification(title, options);
    }
  }
  