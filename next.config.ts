/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tambahkan konfigurasi 'images' di sini
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/**',
      },
    ],
  },
};

module.exports = nextConfig;