"use client";
import { formatINR } from "@/lib/format";

export function RemindButton({ partyId, amount, name, phone, storeName }: { partyId: string; amount: number; name: string; phone: string; storeName: string }) {
  const num = phone.replace(/[^0-9]/g, "").replace(/^91/, "");
  const text = encodeURIComponent(
    `Namaste ${name} ji 🙏\n\nReminder: Aapka udhaar balance ${formatINR(amount)} hai. Kripya jald hi payment kar dein.\n\nDhanyavaad,\n${storeName}`,
  );
  void partyId;
  return (
    <a
      href={`https://wa.me/91${num}?text=${text}`}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-600"
    >
      📱 Remind on WhatsApp
    </a>
  );
}
