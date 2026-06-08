"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function KhataAdd({ partyId }: { partyId: string }) {
  const router = useRouter();
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!amount || Number(amount) <= 0) return;
    setSaving(true);
    try {
      await fetch("/api/khata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId, type, amount: Number(amount), notes }),
      });
      setAmount("");
      setNotes("");
      router.refresh();
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-slate-900">Add entry</h3>
      <div className="flex flex-wrap items-stretch gap-2">
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setType("credit")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${type === "credit" ? "bg-rose-500 text-white shadow" : "text-slate-600"}`}
          >Gave (Udhaar)</button>
          <button
            onClick={() => setType("debit")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${type === "debit" ? "bg-emerald-500 text-white shadow" : "text-slate-600"}`}
          >Advance / Jama (Received)</button>
        </div>
        <input
          type="number"
          placeholder="₹ Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-32 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-orange-400 focus:bg-white"
        />
        <input
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-w-[140px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:bg-white"
        />
        <button
          onClick={save}
          disabled={saving || !amount}
          className="rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-2 text-sm font-bold text-white shadow-md hover:scale-[1.02] disabled:opacity-50"
        >
          {saving ? "Saving..." : "+ Add"}
        </button>
      </div>
    </div>
  );
}
