"use client";

import { useState } from "react";
import { hospitalDatabase } from "./data"; 
import {  Hospital, User2 } from "lucide-react";

const hospitalNames = Object.keys(hospitalDatabase);

type HospitalName = string;
type CopyStatus = "idle" | "success" | "error";

export default function NurseLister() {
  const [selectedHospital, setSelectedHospital] =
    useState<HospitalName>(hospitalNames[0]); 

  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  const currentNurses = hospitalDatabase[selectedHospital] || [];

  const handleCopyToClipboard = async () => {
    if (currentNurses.length === 0) return;
    const textToCopy = currentNurses.join("\n");
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyStatus("success");
      setTimeout(() => setCopyStatus("idle"), 2000);
    
    // PERBAIKAN DI SINI:
    // Menambahkan { ... } untuk membungkus blok catch
    } catch (err) { 
      console.error("Gagal menyalin ke clipboard: ", err);
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
    // PERBAIKAN BERAKHIR DI SINI
  };

  const getCopyButtonText = () => {
    switch (copyStatus) {
      case "success":
        return "✅ Tercopy!";
      case "error":
        return "❌ Gagal";
      default:
        return "Salin Daftar Perawat";
    }
  };

  return (
    <div className="w-full max-w-2xl p-4 mx-auto font-sans">
      <div className="bg-white border border-gray-200 shadow-lg rounded-xl flex flex-col h-[640px] dark:bg-gray-800 dark:border-gray-700">
        
        {/* Header: Pilihan Rumah Sakit */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 dark:text-gray-100">
            Pilih Rumah Sakit
          </h2>
          
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2">
            {hospitalNames.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedHospital(name)}
                className={`
                  px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                  flex items-center gap-2
                  flex-shrink-0
                  ${
                    selectedHospital === name
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  }
                `}
              >
                <Hospital className="w-5 h-5" />
                <span>{name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body: Daftar Perawat (Bisa scroll) */}
        <div className="p-6 flex-1 overflow-y-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-4 dark:text-white">
            {selectedHospital}
          </h3>
          {currentNurses.length > 0 ? (
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              {currentNurses.map((nurse: string, index: number) => (
                <li key={`${nurse}-${index}`} className="text-base flex items-center gap-3">
                  <User2 className="w-5 h-5 text-blue-500" />
                  <span>{nurse}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Tidak ada data perawat untuk rumah sakit ini.
            </p>
          )}

          {/* Tombol Copy (Tetap di bawah) */}
          {currentNurses.length > 0 && (
            <div className="mt-6 text-right">
              <button
                onClick={handleCopyToClipboard}
                disabled={copyStatus !== "idle"}
                className={`
                  px-5 py-2.5 font-medium text-white rounded-lg shadow-sm transition-all duration-200
                  ${
                    copyStatus === "success"
                      ? "bg-green-500"
                      // FIX KECIL: Menghapus tanda kutip ekstra
                      : copyStatus === "error" 
                      ? "bg-red-500"
                      : "bg-blue-600 hover:bg-blue-700"
                  }
                  disabled:opacity-70 disabled:cursor-not-allowed
                `}
              >
                {getCopyButtonText()}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}