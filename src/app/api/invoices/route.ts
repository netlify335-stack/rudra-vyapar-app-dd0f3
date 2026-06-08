import { db } from "@/db";
import { invoices, invoiceItems, parties, products, stores, khataEntries } from "@/db/schema";
import { getActiveStoreId } from "@/lib/session";
import { calcInvoiceTotals, round2 } from "@/lib/gst";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface ItemBody {
  productId: string;
  name: string;
  hsnCode?: string | null;
  unit?: string;
  rate: number;
  quantity: number;
  discountPercent?: number;
  gstRate: number;
}

export async function POST(req: Request) {
  try {
    const storeId = await getActiveStoreId();
    if (!storeId) return Response.json({ ok: false, error: "No active store" }, { status: 400 });
    const body = (await req.json()) as {
      type?: "sale" | "purchase";
      partyId?: string | null;
      partyName?: string;
      partyPhone?: string;
      partyGstin?: string;
      partyAddress?: string;
      paymentMode?: "cash" | "upi" | "card" | "credit" | "bank";
      notes?: string;
      items: ItemBody[];
    };

    if (!body.items?.length) return Response.json({ ok: false, error: "No items" }, { status: 400 });

    const type = body.type ?? "sale";
    const totals = calcInvoiceTotals({
      items: body.items.map((it) => ({
        rate: it.rate,
        quantity: it.quantity,
        discountPercent: it.discountPercent ?? 0,
        gstRate: it.gstRate,
      })),
      isIgst: false,
    });

    // Generate invoice number
    const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
    const next = (store?.invoiceCounter ?? 1);
    const prefix = store?.invoicePrefix ?? "INV";
    const invoiceNo = `${prefix}-${String(next).padStart(5, "0")}`;
    await db.execute(sql`UPDATE stores SET invoice_counter = invoice_counter + 1 WHERE id = ${storeId}`);

    const paymentMode = body.paymentMode ?? "cash";
    const paid = paymentMode === "credit" ? 0 : totals.totalAmount;
    const balance = round2(totals.totalAmount - paid);

    const [inv] = await db
      .insert(invoices)
      .values({
        storeId,
        invoiceNo,
        type,
        status: "confirmed",
        partyId: body.partyId ?? null,
        partyName: body.partyName ?? "Walk-in Customer",
        partyPhone: body.partyPhone,
        partyGstin: body.partyGstin,
        partyAddress: body.partyAddress,
        invoiceDate: new Date().toISOString().slice(0, 10),
        isIgst: false,
        subtotal: String(totals.subtotal),
        discountAmount: String(totals.discountAmount),
        taxableAmount: String(totals.taxableAmount),
        cgstAmount: String(totals.cgstAmount),
        sgstAmount: String(totals.sgstAmount),
        igstAmount: String(totals.igstAmount),
        totalAmount: String(totals.totalAmount),
        paidAmount: String(paid),
        balanceDue: String(balance),
        paymentMode,
        notes: body.notes,
      })
      .returning();

    // Insert items + update stock
    for (const it of body.items) {
      const gross = it.rate * it.quantity;
      const disc = (gross * (it.discountPercent ?? 0)) / 100;
      const tx = gross - disc;
      const tax = (tx * it.gstRate) / 100;
      await db.insert(invoiceItems).values({
        invoiceId: inv.id,
        productId: it.productId,
        productName: it.name,
        hsnCode: it.hsnCode ?? null,
        quantity: String(it.quantity),
        unit: it.unit ?? "PCS",
        rate: String(it.rate),
        discountPercent: String(it.discountPercent ?? 0),
        taxableAmount: String(round2(tx)),
        gstRate: String(it.gstRate),
        taxAmount: String(round2(tax)),
        totalAmount: String(round2(tx + tax)),
      });
      // Decrement stock for sales, increment for purchase
      if (type === "sale") {
        await db
          .update(products)
          .set({ currentStock: sql`${products.currentStock} - ${it.quantity}` })
          .where(eq(products.id, it.productId));
      } else {
        await db
          .update(products)
          .set({ currentStock: sql`${products.currentStock} + ${it.quantity}` })
          .where(eq(products.id, it.productId));
      }
    }

    // Khata + party balance update on credit
    if (paymentMode === "credit" && body.partyId) {
      const isSale = type === "sale";
      
      await db.insert(khataEntries).values({
        storeId,
        partyId: body.partyId,
        type: isSale ? "credit" : "credit", // For both, we are recording credit given/taken
        amount: String(totals.totalAmount),
        notes: isSale ? `Goods sold — ${invoiceNo}` : `Goods purchased — ${invoiceNo}`,
        entryDate: new Date().toISOString().slice(0, 10),
        invoiceId: inv.id,
      });

      if (isSale) {
        // Customer owes us money (outstandingBalance increases positively)
        await db
          .update(parties)
          .set({ outstandingBalance: sql`${parties.outstandingBalance} + ${totals.totalAmount}` })
          .where(eq(parties.id, body.partyId));
      } else {
        // We owe Supplier money (outstandingBalance decreases negatively)
        await db
          .update(parties)
          .set({ outstandingBalance: sql`${parties.outstandingBalance} - ${totals.totalAmount}` })
          .where(eq(parties.id, body.partyId));
      }
    }

    return Response.json({ ok: true, invoiceId: inv.id, invoiceNo });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
