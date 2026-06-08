import { db } from "@/db";
import { khataEntries, parties } from "@/db/schema";
import { getActiveStoreId } from "@/lib/session";
import { and, eq, sql } from "drizzle-orm";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const storeId = await getActiveStoreId();
  if (!storeId) return Response.json({ ok: false, error: "No store" }, { status: 400 });

  const { id } = await params;

  const [entry] = await db.select().from(khataEntries).where(and(eq(khataEntries.id, id), eq(khataEntries.storeId, storeId))).limit(1);
  if (!entry) return Response.json({ ok: false, error: "Entry not found" }, { status: 404 });

  // Reverse the balance impact
  const delta = entry.type === "credit" ? -Number(entry.amount) : Number(entry.amount);

  await db
    .update(parties)
    .set({ outstandingBalance: sql`${parties.outstandingBalance} + ${delta}` })
    .where(eq(parties.id, entry.partyId!));

  await db.delete(khataEntries).where(eq(khataEntries.id, id));

  return Response.json({ ok: true });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const storeId = await getActiveStoreId();
  if (!storeId) return Response.json({ ok: false, error: "No store" }, { status: 400 });

  const { id } = await params;
  const body = await req.json() as { amount: number; type: "credit" | "debit"; notes?: string };

  const [entry] = await db.select().from(khataEntries).where(and(eq(khataEntries.id, id), eq(khataEntries.storeId, storeId))).limit(1);
  if (!entry) return Response.json({ ok: false, error: "Entry not found" }, { status: 404 });

  // Reverse the OLD balance impact
  const oldDelta = entry.type === "credit" ? -Number(entry.amount) : Number(entry.amount);

  // Apply the NEW balance impact
  const newDelta = body.type === "credit" ? Number(body.amount) : -Number(body.amount);
  const netDelta = oldDelta + newDelta;

  await db
    .update(parties)
    .set({ outstandingBalance: sql`${parties.outstandingBalance} + ${netDelta}` })
    .where(eq(parties.id, entry.partyId!));

  await db
    .update(khataEntries)
    .set({
      amount: String(body.amount),
      type: body.type,
      notes: body.notes,
    })
    .where(eq(khataEntries.id, id));

  return Response.json({ ok: true });
}
