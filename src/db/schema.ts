import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  date,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

// Users / store owners
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: varchar("phone", { length: 15 }).unique(),
  email: varchar("email", { length: 255 }).unique(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Stores
export const stores = pgTable("stores", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).default("kirana"),
  gstin: varchar("gstin", { length: 15 }),
  pan: varchar("pan", { length: 10 }),
  fssaiNo: varchar("fssai_no", { length: 20 }),
  drugLicenseNo: varchar("drug_license_no", { length: 50 }),
  address: text("address"),
  state: varchar("state", { length: 50 }),
  stateCode: varchar("state_code", { length: 2 }),
  pincode: varchar("pincode", { length: 6 }),
  phone: varchar("phone", { length: 15 }),
  email: varchar("email", { length: 255 }),
  upiId: varchar("upi_id", { length: 100 }),
  bankName: varchar("bank_name", { length: 100 }),
  bankAccountNo: varchar("bank_account_no", { length: 20 }),
  bankIfsc: varchar("bank_ifsc", { length: 11 }),
  invoicePrefix: varchar("invoice_prefix", { length: 10 }).default("INV"),
  invoiceCounter: integer("invoice_counter").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Parties: customers and suppliers
export const parties = pgTable(
  "parties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id").references(() => stores.id).notNull(),
    type: varchar("type", { length: 20 }).notNull(), // customer | supplier
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 15 }),
    email: varchar("email", { length: 255 }),
    gstin: varchar("gstin", { length: 15 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 50 }),
    stateCode: varchar("state_code", { length: 2 }),
    creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }).default("0"),
    // positive => party owes the store (receivable)
    // negative => store owes party (payable)
    outstandingBalance: numeric("outstanding_balance", { precision: 12, scale: 2 }).default("0").notNull(),
    tag: varchar("tag", { length: 30 }), // regular | vip | defaulter
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    storeIdx: index("parties_store_idx").on(t.storeId),
  }),
);

// Products
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id").references(() => stores.id).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 100 }),
    barcode: varchar("barcode", { length: 100 }),
    category: varchar("category", { length: 100 }),
    hsnCode: varchar("hsn_code", { length: 8 }),
    unit: varchar("unit", { length: 20 }).default("PCS").notNull(),
    purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }).default("0").notNull(),
    sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }).default("0").notNull(),
    mrp: numeric("mrp", { precision: 10, scale: 2 }).default("0").notNull(),
    gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).default("18").notNull(),
    minStockLevel: numeric("min_stock_level", { precision: 10, scale: 3 }).default("0").notNull(),
    currentStock: numeric("current_stock", { precision: 10, scale: 3 }).default("0").notNull(),
    trackExpiry: boolean("track_expiry").default(false).notNull(),
    isScheduleH: boolean("is_schedule_h").default(false).notNull(),
    composition: text("composition"),
    description: text("description"),
    manufacturer: varchar("manufacturer", { length: 255 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    storeIdx: index("products_store_idx").on(t.storeId),
    nameIdx: index("products_name_idx").on(t.name),
  }),
);

// Batches (for pharmacy expiry tracking)
export const batches = pgTable("batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  batchNo: varchar("batch_no", { length: 100 }).notNull(),
  mfgDate: date("mfg_date"),
  expiryDate: date("expiry_date").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).default("0").notNull(),
  mrp: numeric("mrp", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Invoices
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id").references(() => stores.id).notNull(),
    invoiceNo: varchar("invoice_no", { length: 50 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(), // sale | purchase
    status: varchar("status", { length: 20 }).default("confirmed").notNull(),
    partyId: uuid("party_id").references(() => parties.id),
    partyName: varchar("party_name", { length: 255 }),
    partyPhone: varchar("party_phone", { length: 15 }),
    partyGstin: varchar("party_gstin", { length: 15 }),
    partyAddress: text("party_address"),
    invoiceDate: date("invoice_date").notNull(),
    isIgst: boolean("is_igst").default(false).notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    cgstAmount: numeric("cgst_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    sgstAmount: numeric("sgst_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    igstAmount: numeric("igst_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    balanceDue: numeric("balance_due", { precision: 12, scale: 2 }).default("0").notNull(),
    paymentMode: varchar("payment_mode", { length: 50 }).default("cash").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    storeIdx: index("invoices_store_idx").on(t.storeId),
    dateIdx: index("invoices_date_idx").on(t.invoiceDate),
  }),
);

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id),
  productName: varchar("product_name", { length: 255 }).notNull(),
  hsnCode: varchar("hsn_code", { length: 8 }),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0").notNull(),
  taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2 }).notNull(),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
});

// Khata entries (credit ledger)
export const khataEntries = pgTable(
  "khata_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storeId: uuid("store_id").references(() => stores.id).notNull(),
    partyId: uuid("party_id").references(() => parties.id).notNull(),
    // "credit" = party took goods on udhaar (party owes you, balance += amount)
    // "debit"  = party paid back (balance -= amount)
    type: varchar("type", { length: 10 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    notes: text("notes"),
    entryDate: date("entry_date").notNull(),
    invoiceId: uuid("invoice_id").references(() => invoices.id),
    paymentMode: varchar("payment_mode", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    partyIdx: index("khata_party_idx").on(t.partyId),
  }),
);

// Expenses
export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMode: varchar("payment_mode", { length: 50 }).default("cash").notNull(),
  expenseDate: date("expense_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Licenses for Admin App
export const licenses = pgTable("licenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 50 }).unique().notNull(), // e.g. RUDRA-XYZ
  name: varchar("name", { length: 255 }).notNull(), // User assigned name
  deviceIds: jsonb("device_ids").default('[]').notNull(), // Array of bound device IDs
  maxDevices: integer("max_devices").default(1).notNull(), // Volume constraint
  storeId: uuid("store_id").references(() => stores.id), // The store linked to this license
  validMonths: integer("valid_months").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isPaused: boolean("is_paused").default(false).notNull(), // User or Admin can pause
  isRevoked: boolean("is_revoked").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
