import { db } from "@/db";
import { products } from "@/db/schema";
import { getActiveStoreId } from "@/lib/session";
import { eq, and } from "drizzle-orm";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const storeId = await getActiveStoreId();
  if (!storeId) return Response.json({ ok: false, error: "No store" }, { status: 400 });

  const { id } = await params;
  const b = await req.json();

  await db
    .update(products)
    .set({
      name: b.name,
      category: b.category,
      hsnCode: b.hsnCode,
      unit: b.unit,
      purchasePrice: String(b.purchasePrice),
      sellingPrice: String(b.sellingPrice),
      mrp: String(b.mrp),
      gstRate: String(b.gstRate),
      minStockLevel: String(b.minStockLevel),
      currentStock: String(b.currentStock),
      trackExpiry: b.trackExpiry,
      description: b.description,
    })
    .where(and(eq(products.id, id), eq(products.storeId, storeId)));

  return Response.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const storeId = await getActiveStoreId();
  if (!storeId) return Response.json({ ok: false, error: "No store" }, { status: 400 });

  const { id } = await params;

  // Soft delete so invoice history doesn't break
  await db
    .update(products)
    .set({ isActive: false })
    .where(and(eq(products.id, id), eq(products.storeId, storeId)));

  return Response.json({ ok: true });
}
