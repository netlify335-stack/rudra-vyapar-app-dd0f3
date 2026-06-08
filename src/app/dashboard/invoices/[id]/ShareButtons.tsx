"use client";
import { formatINR } from "@/lib/format";

export function ShareButtons({ invoiceNo, amount, phone, storeName }: { invoiceNo: string; amount: number; phone: string | null; storeName: string }) {
  const msg = encodeURIComponent(
    `Hi! Your invoice ${invoiceNo} for ${formatINR(amount)} from ${storeName} is ready. Thank you! 🙏`,
  );
  const waNum = (phone || "").replace(/[^0-9]/g, "").replace(/^91/, "");
  const wa = waNum ? `https://wa.me/91${waNum}?text=${msg}` : `https://wa.me/?text=${msg}`;
  return (
    <div className="flex gap-2">
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-600"
      >
        📱 WhatsApp
      </a>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        🖨 Print
      </button>
    </div>
  );
}
