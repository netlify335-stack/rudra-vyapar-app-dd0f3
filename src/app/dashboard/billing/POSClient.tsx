"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/format";

type Product = {
  id: string;
  name: string;
  hsnCode: string | null;
  unit: string;
  sellingPrice: number;
  gstRate: number;
  currentStock: number;
  category: string | null;
  barcode: string | null;
};

type Customer = { id: string; name: string; phone: string | null; gstin: string | null; address?: string | null };

type CartLine = {
  productId: string;
  name: string;
  hsnCode: string | null;
  unit: string;
  rate: number;
  quantity: number;
  discountPercent: number;
  gstRate: number;
};

export function POSClient({ products, customers, isPurchase = false, storeName }: { products: Product[]; customers: Customer[]; isPurchase?: boolean; storeName: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string>("walkin");
  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinAddress, setWalkinAddress] = useState("");
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "card" | "credit">("cash");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedInvoiceNo, setSavedInvoiceNo] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F1") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "F8") { e.preventDefault(); setCart([]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 24);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.barcode ?? "").includes(q),
      )
      .slice(0, 30);
  }, [query, products]);

  function addProduct(p: Product) {
    if (!isPurchase && p.currentStock <= 0) {
      alert("Item is out of stock!");
      return;
    }
    setCart((c) => {
      const idx = c.findIndex((x) => x.productId === p.id);
      if (idx >= 0) {
        const copy = c.slice();
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [
        ...c,
        {
          productId: p.id,
          name: p.name,
          hsnCode: p.hsnCode,
          unit: p.unit,
          rate: p.sellingPrice,
          quantity: 1,
          discountPercent: 0,
          gstRate: p.gstRate,
        },
      ];
    });
  }

  function updateLine(i: number, patch: Partial<CartLine>) {
    setCart((c) => c.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function removeLine(i: number) {
    setCart((c) => c.filter((_, idx) => idx !== i));
  }

  const totals = useMemo(() => {
    let subtotal = 0, discount = 0, taxable = 0, tax = 0;
    for (const it of cart) {
      const g = it.rate * it.quantity;
      const d = (g * it.discountPercent) / 100;
      const t = g - d;
      const tx = (t * it.gstRate) / 100;
      subtotal += g; discount += d; taxable += t; tax += tx;
    }
    const total = taxable + tax;
    return {
      subtotal: r2(subtotal),
      discount: r2(discount),
      taxable: r2(taxable),
      cgst: r2(tax / 2),
      sgst: r2(tax / 2),
      total: r2(total),
    };
  }, [cart]);

  async function saveInvoice(action: "print" | "whatsapp" | "sms", includePdf: boolean = false) {
    if (!cart.length) return;
    setSaving(true);
    try {
      const partyId = customerId === "walkin" ? null : customerId;
      const partyName = customerId === "walkin"
        ? (walkinName.trim() || (isPurchase ? "Cash Supplier" : "Walk-in Customer"))
        : customers.find((c) => c.id === customerId)?.name ?? (isPurchase ? "Supplier" : "Customer");
      const partyPhone = customerId === "walkin"
        ? walkinPhone.trim()
        : customers.find((c) => c.id === customerId)?.phone ?? "";

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: isPurchase ? "purchase" : "sale",
          partyId,
          partyName,
          partyPhone,
          partyAddress: customerId === "walkin" ? walkinAddress.trim() : (customers.find((c) => c.id === customerId)?.address ?? ""),
          paymentMode,
          notes,
          items: cart,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSavedInvoiceNo(data.invoiceNo);
        setCart([]);
        setNotes("");
        setWalkinName("");
        setWalkinPhone("");
        setWalkinAddress("");
        
        const amount = totals.total;
        const msg = encodeURIComponent(
          `Hi! Your invoice ${data.invoiceNo} for ${formatINR(amount)} from ${storeName} is ready. Thank you! 🙏`
        );
        
        if (action === "print" || includePdf) {
          const newTab = window.open(`/dashboard/invoices/${data.invoiceId}`, "_blank");
          if (!newTab) router.push(`/dashboard/invoices/${data.invoiceId}`);
        } else if (action === "whatsapp") {
          const waNum = partyPhone.replace(/[^0-9]/g, "").replace(/^91/, "");
          const waLink = waNum ? `https://wa.me/91${waNum}?text=${msg}` : `https://wa.me/?text=${msg}`;
          const newTab = window.open(waLink, "_blank");
          if (!newTab) window.location.href = waLink;
        } else if (action === "sms") {
          const smsNum = partyPhone.replace(/[^0-9]/g, "").replace(/^91/, "");
          const smsLink = `sms:${smsNum}?body=${msg}`;
          window.location.href = smsLink;
        }

        router.refresh();
      } else {
        alert(data.error || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      {/* Left: product search + grid */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Point of Sale</h1>
            <p className="text-xs text-slate-500">Press F1 to focus search · F8 to clear cart</p>
          </div>
          {savedInvoiceNo && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              ✅ Saved {savedInvoiceNo}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product by name, category or scan barcode..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-11 text-sm font-medium outline-none focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
            />
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
          <div className="mt-4 grid max-h-[60vh] grid-cols-2 gap-2.5 overflow-y-auto sm:grid-cols-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="group rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3 text-left transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
              >
                <div className="line-clamp-2 text-xs font-semibold text-slate-800 group-hover:text-orange-700">{p.name}</div>
                <div className="mt-1 flex items-end justify-between gap-1">
                  <span className="text-base font-bold text-slate-900">{formatINR(p.sellingPrice, true)}</span>
                  <span className="text-[10px] text-slate-500">{p.gstRate}% GST</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">{p.category}</span>
                  <span className={p.currentStock <= 0 ? "font-bold text-rose-600" : "text-slate-600"}>
                    Stock {p.currentStock} {p.unit}
                  </span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-10 text-center text-sm text-slate-400">No products match &ldquo;{query}&rdquo;</div>
            )}
          </div>
        </div>
      </div>

      {/* Right: cart + checkout */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">{isPurchase ? "Supplier" : "Customer"}</h3>
            {customerId !== "walkin" && (
              <button onClick={() => setCustomerId("walkin")} className="text-xs font-semibold text-orange-600">Change</button>
            )}
          </div>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white"
          >
            <option value="walkin">{isPurchase ? "Cash Supplier" : "Walk-in Customer"}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `· ${c.phone}` : ""}
              </option>
            ))}
          </select>
          {customerId === "walkin" && (
            <div className="mt-2 space-y-2">
              <input
                placeholder={isPurchase ? "Supplier name (optional)" : "Customer name (optional)"}
                value={walkinName}
                onChange={(e) => setWalkinName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white"
              />
              <input
                placeholder="Phone number (optional)"
                type="tel"
                value={walkinPhone}
                onChange={(e) => setWalkinPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white"
              />
              <input
                placeholder="Address (optional)"
                value={walkinAddress}
                onChange={(e) => setWalkinAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:bg-white"
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h3 className="text-sm font-bold">Cart ({cart.length} items)</h3>
          </div>
          <div className="max-h-[40vh] overflow-y-auto p-2">
            {cart.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-400">No items. Click a product to add →</div>
            )}
            {cart.map((it, i) => (
              <div key={i} className="rounded-xl p-2 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{it.name}</div>
                    <div className="text-[11px] text-slate-500">{formatINR(it.rate)} × {it.quantity} {it.unit} · GST {it.gstRate}%</div>
                  </div>
                  <button onClick={() => removeLine(i)} className="text-slate-400 hover:text-rose-500" aria-label="Remove">✕</button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                    <button onClick={() => updateLine(i, { quantity: Math.max(1, it.quantity - 1) })} className="px-2 py-1 text-slate-600 hover:bg-slate-50">−</button>
                    <input
                      type="number"
                      min={1}
                      step="0.01"
                      value={it.quantity}
                      onChange={(e) => {
                        let val = Math.max(0.01, Number(e.target.value));
                        if (!isPurchase) {
                          const p = products.find(p => p.id === it.productId);
                          if (p && val > p.currentStock) {
                            alert("Cannot exceed available stock!");
                            val = p.currentStock;
                          }
                        }
                        updateLine(i, { quantity: val });
                      }}
                      className="w-14 border-x border-slate-200 px-1 py-1 text-center text-sm outline-none"
                    />
                    <button onClick={() => {
                      if (!isPurchase) {
                        const p = products.find(p => p.id === it.productId);
                        if (p && it.quantity >= p.currentStock) {
                          alert("Cannot exceed available stock!");
                          return;
                        }
                      }
                      updateLine(i, { quantity: it.quantity + 1 });
                    }} className="px-2 py-1 text-slate-600 hover:bg-slate-50">+</button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={it.discountPercent}
                    onChange={(e) => updateLine(i, { discountPercent: Math.max(0, Math.min(100, Number(e.target.value))) })}
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm outline-none"
                    placeholder="0%"
                  />
                  <div className="ml-auto text-sm font-bold text-slate-900">
                    {formatINR(it.rate * it.quantity * (1 - it.discountPercent / 100) * (1 + it.gstRate / 100))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 border-t border-slate-100 p-4 text-sm">
            <Row label="Subtotal" value={formatINR(totals.subtotal)} />
            {totals.discount > 0 && <Row label="Discount" value={`− ${formatINR(totals.discount)}`} color="text-emerald-600" />}
            <Row label="Taxable" value={formatINR(totals.taxable)} />
            <Row label="CGST" value={formatINR(totals.cgst)} muted />
            <Row label="SGST" value={formatINR(totals.sgst)} muted />
            <div className="mt-2 flex items-baseline justify-between border-t border-dashed border-slate-200 pt-2">
              <span className="text-sm font-bold text-slate-700">Total</span>
              <span className="text-2xl font-bold text-slate-950">{formatINR(totals.total)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold">Payment Mode</h3>
          <div className="grid grid-cols-4 gap-2">
            {([
              { v: "cash", l: "Cash", e: "💵" },
              { v: "upi", l: "UPI", e: "📱" },
              { v: "card", l: "Card", e: "💳" },
              { v: "credit", l: "Udhaar", e: "📒" },
            ] as const).map((m) => (
              <button
                key={m.v}
                onClick={() => setPaymentMode(m.v)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${
                  paymentMode === m.v
                    ? "border-orange-400 bg-orange-50 text-orange-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <span className="text-base">{m.e}</span>
                {m.l}
              </button>
            ))}
          </div>
          {paymentMode === "credit" && customerId === "walkin" && (
            <p className="mt-2 text-[11px] text-rose-600">⚠ Select a customer for udhaar / credit sale.</p>
          )}

          <input
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:bg-white"
          />

          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
               <input type="checkbox" id="includePdf" className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
               <label htmlFor="includePdf" className="text-xs font-semibold text-slate-700">Include PDF (Open Print Dialog)</label>
            </div>
            <button
              onClick={() => {
                const incPdf = (document.getElementById("includePdf") as HTMLInputElement)?.checked;
                saveInvoice("print", incPdf);
              }}
              disabled={saving || cart.length === 0 || (paymentMode === "credit" && customerId === "walkin")}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : `Save & Print  ·  ${formatINR(totals.total)}`}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const incPdf = (document.getElementById("includePdf") as HTMLInputElement)?.checked;
                  saveInvoice("whatsapp", incPdf);
                }}
                disabled={saving || cart.length === 0 || (paymentMode === "credit" && customerId === "walkin")}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-2 py-2.5 text-xs font-bold text-white shadow-md transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
              >
                📱 Save & WhatsApp
              </button>
              <button
                onClick={() => {
                  const incPdf = (document.getElementById("includePdf") as HTMLInputElement)?.checked;
                  saveInvoice("sms", incPdf);
                }}
                disabled={saving || cart.length === 0 || (paymentMode === "credit" && customerId === "walkin")}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-2 py-2.5 text-xs font-bold text-white shadow-md transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
              >
                💬 Save & SMS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function r2(n: number) { return Math.round(n * 100) / 100; }

function Row({ label, value, muted, color }: { label: string; value: string; muted?: boolean; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-slate-500" : "text-slate-700"}>{label}</span>
      <span className={`font-semibold ${color || (muted ? "text-slate-600" : "text-slate-900")}`}>{value}</span>
    </div>
  );
}
