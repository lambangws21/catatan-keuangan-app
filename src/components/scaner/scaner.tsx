"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { parseGS1 } from "@/utils/GS1Parser";

interface ScannerProps {
  onDetected: (data: { ref: string; lot: string; exp?: string }) => void;
}

export default function Scanner({ onDetected }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const [loading, setLoading] = useState(true);
  const [rawScan, setRawScan] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    const video = videoRef.current;

    if (video) {
      reader
        .decodeFromVideoDevice(undefined, video, (result) => {
          if (result) {
            const text = result.getText();
            setRawScan(text);

            const parsed = parseGS1(text);

            onDetected({
              ref: parsed.gtin ? convertGTINtoREF(parsed.gtin) : "",
              lot: parsed.lot ?? "",
              exp: parsed.exp,
            });
          }
        })
        .then(() => setLoading(false))
        .catch((err) => console.error("Camera Error:", err));
    }

    return () => {
      // STOP CAMERA STREAM (cara resmi, tanpa reset())
      if (video?.srcObject instanceof MediaStream) {
        video.srcObject.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
    };
  }, [onDetected]);

  return (
    <div className="w-full space-y-2">
      <video
        ref={videoRef}
        className="w-full rounded-lg border border-gray-600"
        autoPlay
        muted
      />

      {loading && (
        <p className="text-xs text-gray-400">Mengakses kamera...</p>
      )}

      {rawScan && (
        <p className="text-xs text-green-500 break-all">Raw GS1: {rawScan}</p>
      )}
    </div>
  );
}

/* Convert GTIN → REF */
function convertGTINtoREF(gtin: string): string {
  if (gtin.length === 14) {
    return `${gtin.substring(2, 6)}-${gtin.substring(6, 9)}-${gtin.substring(
      9,
      11
    )}-${gtin.substring(11, 14)}`;
  }
  return gtin;
}
