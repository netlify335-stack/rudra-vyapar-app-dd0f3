"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR, formatDate } from "@/lib/format";

export function KhataEntryRow({ entry }: { entry: any }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    amount: entry.amount,
    type: entry.type,
    notes: entry.notes || "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.amount || Number(form.amount) <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/khata/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else alert("Failed to update");
    } finally { setSaving(false); }
  }

  async function del() {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/khata/${entry.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else alert("Failed to delete");
    } finally { setSaving(false); }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-3 bg-slate-50 p-4 shadow-inner">
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded border px-2 py-1 text-sm outline-none">
          <option value="credit">Udhaar (Given)</option>
          <option value="debit">Advance / Jama</option>
        </select>
        <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-24 rounded border px-2 py-1 text-sm outline-none" />
        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="flex-1 rounded border px-2 py-1 text-sm outline-none" />
        <button onClick={save} disabled={saving} className="rounded bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-sm disabled:opacity-50">Save</button>
        <button onClick={() => setEditing(false)} className="rounded px-3 py-1 text-xs text-slate-500 hover:bg-slate-200">Cancel</button>
      </div>
    );
  }

  return (
    <div className="group flex items-center justify-between gap-4 p-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`grid h-9 w-9 place-items-center rounded-full text-base ${entry.type === "credit" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
          {entry.type === "credit" ? "↑" : "↓"}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-800">{entry.type === "credit" ? "Udhaar (Given)" : "Advance / Jama (Received)"}</div>
          <div className="text-[11px] text-slate-500">{formatDate(entry.entryDate)} · {entry.notes || "—"}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button onClick={() => setEditing(true)} className="text-xs font-semibold text-orange-600 hover:text-orange-700">Edit</button>
          <button onClick={del} disabled={saving} className="text-xs font-semibold text-rose-500 hover:text-rose-600 disabled:opacity-50">Delete</button>
        </div>
        <div className={`text-base font-bold ${entry.type === "credit" ? "text-rose-600" : "text-emerald-600"}`}>
          {entry.type === "credit" ? "+" : "−"} {formatINR(entry.amount)}
        </div>
      </div>
    </div>
  );
}
