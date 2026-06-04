import { NextResponse } from "next/server";
import { db } from "@/db";
import { licenses, stores, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { setActiveStoreId } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { licenseKey, deviceId } = await req.json();

    if (!licenseKey || !deviceId) {
      return NextResponse.json({ error: "Missing license key or device ID" }, { status: 400 });
    }

    // Find license
    const [license] = await db.select().from(licenses).where(eq(licenses.key, licenseKey)).limit(1);

    if (!license) {
      return NextResponse.json({ error: "Invalid license key" }, { status: 401 });
    }

    if (license.isRevoked) {
      return NextResponse.json({ error: "This license key has been revoked by the admin." }, { status: 403 });
    }

    if (new Date() > license.expiresAt) {
      return NextResponse.json({ error: "This license key has expired." }, { status: 403 });
    }

    if (license.isPaused) {
      return NextResponse.json({ error: "This license key is currently paused. Please contact Admin." }, { status: 403 });
    }

    // Device Binding Logic
    const deviceIds = Array.isArray(license.deviceIds) ? license.deviceIds : [];
    
    if (!deviceIds.includes(deviceId)) {
      // New device trying to log in
      if (deviceIds.length >= license.maxDevices) {
        return NextResponse.json({ error: `Volume Exceeded: This key is only valid for ${license.maxDevices} device(s).` }, { status: 403 });
      }
      
      // Bind new device
      deviceIds.push(deviceId);
      await db.update(licenses).set({ deviceIds }).where(eq(licenses.id, license.id));
    }

    // Handle Store / Data linking
    let activeStoreId = license.storeId;

    // If still no store, create a new one
    if (!activeStoreId) {
      // Create a unique owner for this specific license
      const ownerEmail = `owner-${license.id}@vyapar.in`;
      let [owner] = await db.select().from(users).where(eq(users.email, ownerEmail)).limit(1);
      
      if (!owner) {
        const inserted = await db.insert(users).values({ 
          name: license.name, 
          email: ownerEmail 
        }).returning();
        owner = inserted[0];
      }

      // Create new store for this license
      const [newStore] = await db.insert(stores).values({
        ownerId: owner.id,
        name: `${license.name}'s Store`,
        type: "kirana",
      }).returning();

      activeStoreId = newStore.id;
      // Link store to license
      await db.update(licenses).set({ storeId: activeStoreId }).where(eq(licenses.id, license.id));
    }

    // Set cookie
    await setActiveStoreId(activeStoreId!);

    return NextResponse.json({ success: true, storeId: activeStoreId });
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
