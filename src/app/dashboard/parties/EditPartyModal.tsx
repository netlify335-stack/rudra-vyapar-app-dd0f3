"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function EditPartyModal({ party, onClose }: { party: any; onClose: () => void }) {
  const router = useRouter();
  const [type, setType] = useState<"customer" | "supplier">(party.type);
  const [name, setName] = useState(party.name || "");
  const [phone, setPhone] = useState(party.phone || "");
  const [gstin, setGstin] = useState(party.gstin || "");
  const [city, setCity] = useState(party.city || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/parties/${party.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name, phone, gstin, city }),
      });
      const data = await res.json();
      if (data.ok) {
        onClose();
        router.refresh();
      } else {
        alert(data.error || "Failed");
      }
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold">Edit Party</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(["customer", "supplier"] as const).map((t) => (
              <button key={t} onClick={() => setType(t)} className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase ${type === t ? "bg-white shadow text-orange-700" : "text-slate-500"}`}>{t}</button>
            ))}
          </div>
          <Input placeholder="Name *" value={name} onChange={setName} />
          <Input placeholder="Phone (+91)" value={phone} onChange={setPhone} />
          <Input placeholder="GSTIN (optional)" value={gstin} onChange={setGstin} />
          <Input placeholder="City" value={city} onChange={setCity} />
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
          <button onClick={onClose} className="rounded-xl px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={save}
            disabled={!name || saving}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2 text-sm font-bold text-white shadow-md disabled:opacity-50 transition hover:scale-[1.02]"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white md:col-span-1"
    />
  );
}
