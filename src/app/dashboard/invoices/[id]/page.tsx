import { db } from "@/db";
import { invoices, invoiceItems, stores } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveStoreId } from "@/lib/session";
import { formatINR, formatDate } from "@/lib/format";
import { ShareButtons } from "./ShareButtons";

export const dynamic = "force-dynamic";

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const storeId = (await getActiveStoreId())!;
  const [inv] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.storeId, storeId)))
    .limit(1);
  if (!inv) notFound();
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/invoices" className="text-sm font-semibold text-slate-600 hover:text-slate-900">← Back to invoices</Link>
        <ShareButtons invoiceNo={inv.invoiceNo} amount={Number(inv.totalAmount)} phone={inv.partyPhone} storeName={store.name} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="text-2xl font-bold text-slate-950">{store.name}</div>
            <div className="mt-1 text-xs text-slate-600">{store.address}</div>
            <div className="text-xs text-slate-600">{store.state} - {store.pincode} · {store.phone}</div>
            {store.gstin && <div className="mt-1 text-xs font-semibold text-slate-700">GSTIN: {store.gstin}</div>}
            {store.fssaiNo && <div className="text-xs text-slate-700">FSSAI: {store.fssaiNo}</div>}
          </div>
          <div className="text-right">
            <div className="rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Tax Invoice
            </div>
            <div className="mt-2 text-lg font-bold text-slate-900">{inv.invoiceNo}</div>
            <div className="text-xs text-slate-600">Date: {formatDate(inv.invoiceDate)}</div>
            <div className="text-xs text-slate-600">Payment: {inv.paymentMode?.toUpperCase()}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Billed To</div>
            <div className="mt-1 text-base font-semibold text-slate-900">{inv.partyName}</div>
            {inv.partyPhone && <div className="text-xs text-slate-600">{inv.partyPhone}</div>}
            {inv.partyGstin && <div className="text-xs text-slate-600">GSTIN: {inv.partyGstin}</div>}
            {inv.partyAddress && <div className="mt-1 text-xs text-slate-600">{inv.partyAddress}</div>}
          </div>
          <div className="md:text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pay via UPI</div>
            <div className="mt-1 text-sm font-mono text-slate-800">{store.upiId}</div>
            <div className="text-xs text-slate-600">{store.bankName} · A/c {store.bankAccountNo}</div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">HSN</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">GST %</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, i) => (
                <tr key={it.id}>
                  <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{it.productName}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{it.hsnCode || "—"}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{it.quantity} {it.unit}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{formatINR(it.rate)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{it.gstRate}%</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatINR(it.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 ml-auto w-full max-w-sm space-y-1.5 text-sm">
          <Row label="Subtotal" value={formatINR(inv.subtotal)} />
          {Number(inv.discountAmount) > 0 && <Row label="Discount" value={`− ${formatINR(inv.discountAmount)}`} />}
          <Row label="Taxable Value" value={formatINR(inv.taxableAmount)} />
          {Number(inv.cgstAmount) > 0 && <Row label="CGST" value={formatINR(inv.cgstAmount)} muted />}
          {Number(inv.sgstAmount) > 0 && <Row label="SGST" value={formatINR(inv.sgstAmount)} muted />}
          {Number(inv.igstAmount) > 0 && <Row label="IGST" value={formatINR(inv.igstAmount)} muted />}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
            <span className="font-bold text-slate-700">Grand Total</span>
            <span className="font-bold text-slate-950">{formatINR(inv.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Paid</span><span>{formatINR(inv.paidAmount)}</span>
          </div>
          {Number(inv.balanceDue) > 0 && (
            <div className="flex justify-between rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
              <span>Balance Due</span><span>{formatINR(inv.balanceDue)}</span>
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-dashed border-slate-200 pt-4 text-center text-[11px] text-slate-500">
          Thank you for your business! · Goods once sold will not be taken back · E&OE
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-slate-500" : "text-slate-700"}>{label}</span>
      <span className={`font-semibold ${muted ? "text-slate-600" : "text-slate-900"}`}>{value}</span>
    </div>
  );
}
