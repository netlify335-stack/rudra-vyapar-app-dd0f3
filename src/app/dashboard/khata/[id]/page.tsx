import { db } from "@/db";
import { parties, khataEntries, stores } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveStoreId } from "@/lib/session";
import { formatINR, formatDate } from "@/lib/format";
import { KhataAdd } from "./KhataAdd";
import { RemindButton } from "./RemindButton";

export const dynamic = "force-dynamic";

export default async function KhataDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const storeId = (await getActiveStoreId())!;
  const [party] = await db.select().from(parties).where(and(eq(parties.id, id), eq(parties.storeId, storeId))).limit(1);
  if (!party) notFound();
  const entries = await db.select().from(khataEntries).where(eq(khataEntries.partyId, id)).orderBy(desc(khataEntries.entryDate), desc(khataEntries.createdAt));
  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);

  const bal = Number(party.outstandingBalance);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/dashboard/khata" className="text-sm font-semibold text-slate-600 hover:text-slate-900">← Back to khata</Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-lg font-bold text-white">
              {party.name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950">{party.name}</h1>
              <div className="text-xs text-slate-500">{party.phone || "—"} {party.city ? `· ${party.city}` : ""}</div>
              {party.gstin && <div className="text-xs font-mono text-slate-600">GSTIN: {party.gstin}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Balance</div>
            <div className={`text-2xl font-bold ${bal > 0 ? "text-rose-600" : bal < 0 ? "text-emerald-600" : "text-slate-700"}`}>
              {bal === 0 ? "Settled ✓" : formatINR(Math.abs(bal))}
            </div>
            <div className="text-[11px] text-slate-500">
              {bal > 0 ? `${party.name} will give you` : bal < 0 ? `You owe ${party.name}` : ""}
            </div>
            {bal > 0 && party.phone && <RemindButton partyId={party.id} amount={bal} name={party.name} phone={party.phone} storeName={store.name} />}
          </div>
        </div>
      </div>

      <KhataAdd partyId={party.id} />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <h3 className="text-sm font-bold text-slate-900">Ledger entries</h3>
          <p className="text-[11px] text-slate-500">{entries.length} entries</p>
        </div>
        <div className="divide-y divide-slate-100">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                <div className={`grid h-9 w-9 place-items-center rounded-full text-base ${e.type === "credit" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                  {e.type === "credit" ? "↑" : "↓"}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{e.type === "credit" ? "Gave on credit" : "Received payment"}</div>
                  <div className="text-[11px] text-slate-500">{formatDate(e.entryDate)} · {e.notes || "—"}</div>
                </div>
              </div>
              <div className={`text-base font-bold ${e.type === "credit" ? "text-rose-600" : "text-emerald-600"}`}>
                {e.type === "credit" ? "+" : "−"} {formatINR(e.amount)}
              </div>
            </div>
          ))}
          {entries.length === 0 && <div className="p-8 text-center text-sm text-slate-400">No entries yet</div>}
        </div>
      </div>
    </div>
  );
}
