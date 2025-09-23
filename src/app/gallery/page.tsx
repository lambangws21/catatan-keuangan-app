// app/gallery/page.tsx

"use client";

// 1. Impor komponen ImageGallery Anda
// import ImageGallery from "@/components/FirebaseGallery";
import ImageGallery from "@/components/dash-image";
// 2. Buat komponen halaman
export default function GalleryPage() {
  return (
    // Anda bisa membungkusnya dengan div atau elemen lain jika perlu
    <div>
      {/* 3. Panggil komponen ImageGallery langsung tanpa props */}
      <ImageGallery />
    </div>
  );
}