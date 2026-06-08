import { db } from "@/db";
import { parties } from "@/db/schema";
import { getActiveStoreId } from "@/lib/session";
import { eq, and } from "drizzle-orm";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const storeId = await getActiveStoreId();
  if (!storeId) return Response.json({ ok: false, error: "No store" }, { status: 400 });

  const { id } = await params;
  const b = await req.json();

  await db
    .update(parties)
    .set({
      name: b.name,
      phone: b.phone,
      city: b.city,
      gstin: b.gstin,
      type: b.type,
    })
    .where(and(eq(parties.id, id), eq(parties.storeId, storeId)));

  return Response.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const storeId = await getActiveStoreId();
  if (!storeId) return Response.json({ ok: false, error: "No store" }, { status: 400 });

  const { id } = await params;

  // Real delete
  await db
    .delete(parties)
    .where(and(eq(parties.id, id), eq(parties.storeId, storeId)));

  return Response.json({ ok: true });
}
