"use client";

import React, { useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface TransactionItem {
  tanggal: string;
  keterangan: string;
  jumlah: number;
}

interface SaldoItem {
  tanggal: string;
  keterangan: string;
  jumlah: number;
}

export default function FinancialReportPDF({
  transactions,
  saldoData,
  title,
}: {
  transactions: TransactionItem[];
  saldoData: SaldoItem[];
  title?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleExport = async () => {
    try {
      const el = ref.current;
      if (!el) return;

      const isDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      // CLONE DOM
      const clone = el.cloneNode(true) as HTMLElement;
      clone.style.width = getComputedStyle(el).width;
      clone.style.backgroundColor = isDark ? "#0f172a" : "#ffffff";
      clone.style.color = isDark ? "#f8fafc" : "#000000";

      // Inject inline styles for all children (fix oklch issue)
      const walker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT);
      const nodes: HTMLElement[] = [];
      let n: Node | null;
      while ((n = walker.nextNode())) nodes.push(n as HTMLElement);
      nodes.unshift(clone);

      nodes.forEach((node) => {
        const cs = window.getComputedStyle(node);
        if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
          node.style.backgroundColor = cs.backgroundColor;
        }
        if (cs.color) node.style.color = cs.color;
        if (cs.borderColor) node.style.borderColor = cs.borderColor;
        node.style.removeProperty("--tw-ring-color");
      });

      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-9999px";
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      // CAPTURE
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      if (!imgData.startsWith("data:image/png")) {
        throw new Error("Invalid PNG output");
      }

      // PDF SETUP
      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.setTextColor(isDark ? 248 : 0);
      pdf.text(
        title || `Laporan Keuangan ${format(new Date(), "MMMM yyyy")}`,
        margin,
        30
      );

      pdf.addImage(imgData, "PNG", margin, 45, imgWidth, imgHeight);
      pdf.save(`laporan-keuangan-${format(new Date(), "yyyy-MM-dd")}.pdf`);

      document.body.removeChild(wrapper);
    } catch (err) {
      console.error(err);
      alert("Gagal membuat PDF");
    }
  };

  return (
    <>
      <div className="hidden" aria-hidden>
        <div
          ref={ref}
          className="p-6 w-[800px] bg-white dark:bg-slate-900 text-black dark:text-white"
          id="pdf-capture"
        >
          <h2 className="text-lg font-bold mb-4">
            {title || "Laporan Keuangan"}
          </h2>

          <section className="mb-4">
            <h3 className="font-semibold mb-2">
              Ringkasan Transaksi ({transactions.length})
            </h3>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2">Tanggal</th>
                  <th className="text-left p-2">Keterangan</th>
                  <th className="text-right p-2">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i}>
                    <td className="p-2">
                      {format(new Date(t.tanggal), "dd MMM yyyy")}
                    </td>
                    <td className="p-2">{t.keterangan}</td>
                    <td className="p-2 text-right">
                      {new Intl.NumberFormat("id-ID").format(t.jumlah)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h3 className="font-semibold mb-2">
              Ringkasan Saldo ({saldoData.length})
            </h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2">Tanggal</th>
                  <th className="text-left p-2">Keterangan</th>
                  <th className="text-right p-2">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {saldoData.map((s, i) => (
                  <tr key={i}>
                    <td className="p-2">
                      {format(new Date(s.tanggal), "dd MMM yyyy")}
                    </td>
                    <td className="p-2">{s.keterangan}</td>
                    <td className="p-2 text-right">
                      {new Intl.NumberFormat("id-ID").format(s.jumlah)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>

      <Button onClick={handleExport}>Export PDF</Button>
    </>
  );
}
