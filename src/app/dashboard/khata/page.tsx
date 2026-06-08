import { db } from "@/db";
import { parties } from "@/db/schema";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import Link from "next/link";
import { getActiveStoreId } from "@/lib/session";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function KhataPage() {
  const storeId = (await getActiveStoreId())!;
  const customers = await db
    .select()
    .from(parties)
    .where(and(eq(parties.storeId, storeId), eq(parties.type, "customer")))
    .orderBy(sql`${parties.outstandingBalance} DESC`);

  const suppliers = await db
    .select()
    .from(parties)
    .where(and(eq(parties.storeId, storeId), eq(parties.type, "supplier")))
    .orderBy(asc(parties.name));

  const totalReceivable = customers.reduce((s, c) => s + Math.max(0, Number(c.outstandingBalance)), 0);
  const totalPayable = suppliers.reduce((s, c) => s + Math.max(0, -Number(c.outstandingBalance)), 0);
  const net = totalReceivable - totalPayable;

  const overdueCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(parties)
    .where(and(eq(parties.storeId, storeId), eq(parties.type, "customer"), gt(parties.outstandingBalance, "0")));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Digital Khata 📒</h1>
          <p className="text-sm text-slate-500">Track udhaar from customers and dues to suppliers.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-orange-200 dark:border-orange-900/30 bg-gradient-to-r from-orange-50 via-rose-50 to-amber-50 dark:from-orange-900/10 dark:via-rose-900/10 dark:to-amber-900/10 p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-500">Aapko Milenge (Customers owe you)</div>
            <div className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">{formatINR(totalReceivable)}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">{overdueCount[0]?.count ?? 0} parties pending</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-500">Aapko Dena Hai (You owe suppliers)</div>
            <div className="mt-1 text-3xl font-bold text-slate-950 dark:text-white">{formatINR(totalPayable)}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Across {suppliers.length} suppliers</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Net Position</div>
            <div className={`mt-1 text-3xl font-bold ${net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {net >= 0 ? "+" : ""}{formatINR(net)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">{net >= 0 ? "You are net receivable ✅" : "You are net payable ⚠"}</div>
          </div>
        </div>
      </div>

      {/* Customers */}
      <Section
        title="Customers on Udhaar"
        sub="Outstanding receivables — send reminders to collect faster."
        items={customers}
        kind="customer"
      />

      {/* Suppliers */}
      <Section
        title="Suppliers"
        sub="Amounts you owe to your suppliers."
        items={suppliers}
        kind="supplier"
      />
    </div>
  );
}

type Party = typeof parties.$inferSelect;

function Section({ title, sub, items, kind }: { title: string; sub: string; items: Party[]; kind: "customer" | "supplier" }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
        </div>
        <Link href="/dashboard/parties" className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline">Manage parties →</Link>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.length === 0 && <div className="p-8 text-center text-sm text-slate-400">No {kind}s yet</div>}
        {items.map((p) => {
          const bal = Number(p.outstandingBalance);
          const isReceivable = kind === "customer" && bal > 0;
          const isPayable = kind === "supplier" && bal < 0;
          return (
            <Link
              key={p.id}
              href={`/dashboard/khata/${p.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${
                  isReceivable ? "bg-gradient-to-br from-orange-400 to-rose-500" :
                  isPayable ? "bg-gradient-to-br from-purple-500 to-indigo-600" :
                  "bg-gradient-to-br from-slate-400 to-slate-500"
                }`}>
                  {p.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-semibold text-slate-900 dark:text-white">{p.name}</div>
                    {p.tag && (
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        p.tag === "vip" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                        p.tag === "defaulter" ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400" :
                        "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}>{p.tag}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{p.phone || "—"} {p.city ? `· ${p.city}` : ""}</div>
                </div>
              </div>
              <div className="text-right">
                {bal === 0 ? (
                  <span className="text-xs font-semibold text-slate-400">Settled</span>
                ) : (
                  <>
                    <div className={`text-base font-bold ${isReceivable ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {formatINR(Math.abs(bal))}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {isReceivable ? "Aapko Milenge" : "Aapko Dena Hai"}
                    </div>
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
