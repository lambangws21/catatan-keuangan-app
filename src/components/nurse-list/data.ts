// PERBAIKAN: Tambahkan 'export' agar file ini menjadi module
export type HospitalName = string;
export type NurseName = string;
export type HospitalData = Record<HospitalName, NurseName[]>;

// PERBAIKAN: Tambahkan 'export' agar bisa di-import
export const hospitalDatabase: HospitalData = {
  "BIMC NUSA DUA": [
    "Artha",
    "Karuna",
    "Rosi",
    "Yuni",
    "Indah",
    "Lilik",
    "Sumajaya",
    "Gama",
    "Eka",
    "Komang",
    "Evi",
  ],
  "SILOAM DENPASAR": [
    "Yuni",
    "Made",
    "Nugraha",
    "Desi",
    "Ayu",
    "Rita",
    "Agung",
    "Made Agus",
  ],
  "BALI ROYAL": [
    "Nuarta",
    "Made Dwi",
    "Krisna",
    "Dendi",
    "Agus",
    "Dhifa",
    "Komang Ayu",
    "Desi",
  ],
  "BIMC KUTA": ["Mbak BINK", "Mbak Dwi", "Mbak Komang", "VITA", "Bli Gali", "EDU"],
};