import { db } from "@/db";
import { products, parties, stores } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { getActiveStoreId } from "@/lib/session";
import { POSClient } from "./POSClient";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const storeId = (await getActiveStoreId())!;
  const prodList = await db
    .select()
    .from(products)
    .where(and(eq(products.storeId, storeId), eq(products.isActive, true)))
    .orderBy(asc(products.name));
  const customerList = await db
    .select({ id: parties.id, name: parties.name, phone: parties.phone, gstin: parties.gstin })
    .from(parties)
    .where(and(eq(parties.storeId, storeId), eq(parties.type, "customer")))
    .orderBy(asc(parties.name));

  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);

  return (
    <POSClient
      storeName={store.name}
      products={prodList.map((p) => ({
        id: p.id,
        name: p.name,
        hsnCode: p.hsnCode,
        unit: p.unit,
        sellingPrice: Number(p.sellingPrice),
        gstRate: Number(p.gstRate),
        currentStock: Number(p.currentStock),
        category: p.category,
        barcode: p.barcode,
      }))}
      customers={customerList}
    />
  );
}
