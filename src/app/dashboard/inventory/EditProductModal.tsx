"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const GST_RATES = [0, 5, 12, 18, 28];

export function EditProductModal({ product, onClose }: { product: any; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: product.name || "",
    category: product.category || "Grocery",
    hsnCode: product.hsnCode || "",
    unit: product.unit || "PCS",
    purchasePrice: product.purchasePrice || "",
    sellingPrice: product.sellingPrice || "",
    mrp: product.mrp || "",
    gstRate: Number(product.gstRate) || 18,
    minStockLevel: product.minStockLevel || "10",
    currentStock: product.currentStock || "0",
    trackExpiry: product.trackExpiry || false,
    description: product.description || "",
    expiryPeriod: "none",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name || !form.sellingPrice) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        onClose();
        router.refresh();
      } else alert(data.error || "Failed");
    } finally { setSaving(false); }
  }

  function update<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="mb-4 flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-slate-900">Edit Product: {product.name}</h3>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Product name *">
            <input value={form.name} onChange={(e) => update("name", e.target.value)} className={INPUT} />
          </Field>
          <Field label="Description">
            <input value={form.description} onChange={(e) => update("description", e.target.value)} className={INPUT} placeholder="Enter description..." />
          </Field>
          <Field label="Category"><input value={form.category} onChange={(e) => update("category", e.target.value)} className={INPUT} /></Field>
          <Field label="HSN Code"><input value={form.hsnCode} onChange={(e) => update("hsnCode", e.target.value)} className={INPUT} /></Field>
          <Field label="Unit"><input value={form.unit} onChange={(e) => update("unit", e.target.value)} className={INPUT} /></Field>
          <Field label="Purchase Price"><input type="number" value={form.purchasePrice} onChange={(e) => update("purchasePrice", e.target.value)} className={INPUT} /></Field>
          <Field label="Selling Price *"><input type="number" value={form.sellingPrice} onChange={(e) => update("sellingPrice", e.target.value)} className={INPUT} /></Field>
          <Field label="MRP"><input type="number" value={form.mrp} onChange={(e) => update("mrp", e.target.value)} className={INPUT} /></Field>
          <Field label="GST %">
            <select value={form.gstRate} onChange={(e) => update("gstRate", Number(e.target.value))} className={INPUT}>
              {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
            </select>
          </Field>
          <Field label="Min Stock"><input type="number" value={form.minStockLevel} onChange={(e) => update("minStockLevel", e.target.value)} className={INPUT} /></Field>
          <Field label="Current Stock"><input type="number" value={form.currentStock} onChange={(e) => update("currentStock", e.target.value)} className={INPUT} /></Field>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" checked={form.trackExpiry} onChange={(e) => update("trackExpiry", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
            Track expiry (pharmacy)
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
          <button onClick={onClose} className="rounded-xl px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={saving || !form.name || !form.sellingPrice} className="rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2 text-sm font-bold text-white shadow-md disabled:opacity-50 transition hover:scale-[1.02]">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold text-slate-600">{label}</div>
      {children}
    </div>
  );
}
