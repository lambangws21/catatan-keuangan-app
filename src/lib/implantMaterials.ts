// src/lib/implantMaterials.ts

export type ImplantProcedure = "THR" | "TKR" | "UKA" | "OTHER";

export type ImplantMaterialItem = {
  id: string;
  procedure: ImplantProcedure;
  implant: string;
  component?: string;
  material: string;
  vendor?: string;
  notes?: string;
};

export const IMPLANT_MATERIALS: ImplantMaterialItem[] = [
  {
    id: "tkr-nexgen",
    procedure: "TKR",
    implant: "TKR NexGen",
    component: "Knee System",
    material: "Metal",
    vendor: "Zimmer",
    notes:
      "Zimmer NexGen Knee System adalah sistem total knee replacement yang sudah lama terbukti secara klinis, menyediakan pilihan CR, PS hingga constrained dengan ukuran yang lengkap sehingga memudahkan penyesuaian anatomi pasien serta memberikan stabilitas dan presisi pemotongan yang baik di kamar operasi.",
  },
  {
    id: "tkr-vanguard",
    procedure: "TKR",
    implant: "TKR Vanguard",
    component: "Knee System",
    material: "Metal",
    notes:
      "Vanguard Knee System merupakan sistem TKR yang fleksibel karena memungkinkan perubahan intraoperatif dari CR ke PS dalam satu platform implant, sehingga memberikan keleluasaan bagi dokter dalam pengambilan keputusan tanpa perlu mengganti sistem saat operasi berlangsung.",
  },
  {
    id: "tkr-lcck",
    procedure: "TKR",
    implant: "TKR LCCK",
    component: "Constrained Knee",
    material: "Metal",
    notes:
      "TKR LCCK adalah sistem knee dengan tingkat constraint lebih tinggi yang digunakan pada kasus instabilitas ligament, deformitas berat, atau revisi, dirancang untuk memberikan stabilitas tambahan tanpa menggunakan hinge penuh serta tetap menjaga kontrol gerak sendi.",
  },
  {
    id: "tkr-persona",
    procedure: "TKR",
    implant: "TKR Persona",
    component: "Knee System",
    material: "Metal",
    vendor: "Zimmer",
    notes:
      "TKR Persona adalah sistem total knee replacement yang dirancang berdasarkan konsep anatomi individual pasien, dengan variasi ukuran femoral dan tibial yang lebih spesifik untuk meningkatkan kesesuaian implant, stabilitas sendi, dan potensi fungsi lutut yang lebih natural pascaoperasi.",
  },
  {
    id: "thr-trilogy-it",
    procedure: "THR",
    implant: "THR Trilogy IT",
    component: "Acetabular Cup",
    material: "Metal",
    notes:
      "Trilogy IT Acetabular System adalah cup acetabulum modular untuk total hip replacement yang kompatibel dengan berbagai pilihan liner dan bearing, memberikan stabilitas yang baik serta fleksibilitas penggunaan baik pada kasus primer maupun kasus kompleks.",
  },
  {
    id: "thr-mop",
    procedure: "THR",
    implant: "THR MOP",
    component: "Bearing",
    material: "Metal on Polyethylene",
    notes:
      "THR Metal on Polyethylene merupakan kombinasi bearing yang paling umum digunakan karena memiliki teknik yang familiar, stabilitas yang baik, serta keandalan jangka panjang dengan tingkat keausan yang dapat dikontrol.",
  },
  {
    id: "thr-cop",
    procedure: "THR",
    implant: "THR COP",
    component: "Bearing",
    material: "Ceramic on Polyethylene",
    notes:
      "THR Ceramic on Polyethylene mengombinasikan head ceramic dengan liner polyethylene untuk menurunkan tingkat keausan dibanding MOP, sehingga cocok untuk pasien aktif dengan kebutuhan durabilitas lebih baik.",
  },
  {
    id: "thr-hybrid",
    procedure: "THR",
    implant: "THR Hybrid",
    component: "Fixation",
    material: "Hybrid (cemented/cementless)",
    notes:
      "THR Hybrid adalah kombinasi teknik pemasangan di mana komponen femoral menggunakan cemented stem sementara acetabular cup bersifat cementless, bertujuan mengoptimalkan fiksasi berdasarkan kondisi tulang pasien.",
  },
  {
    id: "bipolar-ringloc",
    procedure: "OTHER",
    implant: "Bipolar RingLoc",
    component: "Bipolar Head",
    material: "Metal",
    notes:
      "Bipolar RingLoc adalah sistem kepala ganda yang umum digunakan pada hemiarthroplasty, dirancang untuk meningkatkan stabilitas sendi dan mengurangi gesekan pada acetabulum melalui mekanisme penguncian yang aman dan ukuran yang bervariasi.",
  },
  {
    id: "bipolar-multipolar",
    procedure: "OTHER",
    implant: "Multipolar",
    component: "Bipolar Head",
    material: "Metal",
    notes:
      "Multipolar hip system merupakan pengembangan konsep kepala ganda dengan variasi ukuran dan konfigurasi yang lebih luas, bertujuan meningkatkan rentang gerak, stabilitas, dan kenyamanan pasien terutama pada kasus fraktur panggul.",
  },
  {
    id: "stem-wagner",
    procedure: "THR",
    implant: "Wagner Stem",
    component: "Stem",
    material: "Metal",
    notes:
      "Wagner femoral stem adalah stem dengan fiksasi distal yang kuat dan umumnya digunakan pada kasus revisi, memberikan stabilitas optimal pada kondisi tulang proksimal yang sudah tidak memadai.",
  },
  {
    id: "stem-ml-taper",
    procedure: "THR",
    implant: "M/L Taper Stem",
    component: "Stem",
    material: "Metal",
    notes:
      "M/L Taper stem adalah stem cementless dengan desain tapered wedge yang mengandalkan fiksasi metafisis, bersifat bone preserving, dan sering digunakan pada kasus total hip replacement primer dengan kualitas tulang yang baik.",
  },
  {
    id: "stem-cpt",
    procedure: "THR",
    implant: "CPT",
    component: "Stem",
    material: "Metal",
    notes:
      "CPT adalah stem cemented dengan desain taper klasik yang banyak digunakan pada pasien usia lanjut atau kualitas tulang rendah, dengan keberhasilan pemasangan sangat bergantung pada teknik cementing yang baik.",
  },
  {
    id: "bipolar-wagner",
    procedure: "OTHER",
    implant: "Bipolar Wagner",
    component: "Stem + Bipolar",
    material: "Metal",
    notes:
      "Bipolar Wagner adalah kombinasi sistem bipolar head dengan Wagner stem yang umumnya digunakan pada kasus fraktur atau kondisi tulang proksimal yang kurang baik, memberikan stabilitas kuat melalui fiksasi distal stem.",
  },
  {
    id: "bipolar-cpt-longstem",
    procedure: "OTHER",
    implant: "Bipolar CPT Long Stem",
    component: "Stem + Bipolar",
    material: "Metal",
    notes:
      "Bipolar CPT long stem merupakan stem cemented panjang yang dikombinasikan dengan kepala bipolar, digunakan pada kasus fraktur dengan kualitas tulang rendah atau kebutuhan stabilitas tambahan di femur distal.",
  },
  {
    id: "head-ceramic",
    procedure: "THR",
    implant: "Head Ceramic",
    component: "Head",
    material: "Ceramic",
    notes:
      "Head ceramic adalah komponen kepala femoral dengan tingkat keausan sangat rendah dan biokompatibilitas tinggi, sering digunakan pada total hip replacement untuk mengurangi debris partikel serta meningkatkan daya tahan implant jangka panjang.",
  },
];

