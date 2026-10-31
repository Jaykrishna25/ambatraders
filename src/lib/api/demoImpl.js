// Demo backend — used automatically when Supabase is not configured.
// Data lives in this browser's localStorage only. It mirrors the rules in
// supabase/schema.sql so the site and admin panel can be tried end-to-end.
import { categories as seedCategories, products as seedProducts } from '../../data/products.js';
import { SIZES, STOCK_STATUSES, toProduct, fromProduct, normalizePhone, emptyStock } from './shape.js';
import { makeImageSet, blobToDataURL } from './images.js';

const KEY = 'amba-demo-db-v1';
const SESSION = 'amba-demo-session';
const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
const now = () => new Date().toISOString();
const delay = (v) => new Promise((r) => setTimeout(() => r(v), 120));

function seed() {
  return {
    v: 1,
    seq: 1000,
    categories: seedCategories.map((c, i) => ({ id: c.id, name: c.name, blurb: c.blurb, cover: c.cover, sort: i })),
    products: seedProducts.map((p, i) => ({ id: uid(), ...fromProduct({ ...p, sort: i }), created_at: now() })),
    stock: {},
    customers: [],
    orders: [],
    items: [],
    payments: [],
    movements: [],
  };
}

let memory = null;
function db() {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    memory = raw ? JSON.parse(raw) : seed();
  } catch {
    memory = seed();
  }
  memory.products.forEach((p) => {
    memory.stock[p.id] ??= emptyStock();
  });
  return memory;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // Storage full or blocked: keep working in memory for this visit.
  }
}
const fail = (msg) => {
  throw new Error(msg);
};

const productRow = (p) => ({ ...p, stock: SIZES.map((s) => ({ size: s, qty: db().stock[p.id]?.[s] ?? 0 })) });

function summarize(o) {
  const d = db();
  const c = d.customers.find((x) => x.id === o.customer_id) || {};
  const items = d.items.filter((i) => i.order_id === o.id);
  const subtotal = items.reduce((a, i) => a + i.qty * i.rate, 0);
  const paid = d.payments.filter((p) => p.order_id === o.id).reduce((a, p) => a + Number(p.amount), 0);
  const total = subtotal - Number(o.discount || 0);
  return {
    ...o,
    shop_name: c.shop_name,
    contact_name: c.contact_name,
    phone: c.phone,
    city: c.city,
    pieces: items.reduce((a, i) => a + i.qty, 0),
    lines: items.length,
    unpriced_lines: items.filter((i) => !i.rate).length,
    subtotal,
    total,
    paid,
    balance: total - paid,
  };
}

function balanceOf(c) {
  const orders = db().orders.filter((o) => o.customer_id === c.id).map(summarize);
  const live = orders.filter((o) => o.status !== 'cancelled');
  const billed = live.reduce((a, o) => a + o.total, 0);
  const paid = orders.reduce((a, o) => a + o.paid, 0);
  return {
    ...c,
    order_count: live.length,
    billed,
    paid,
    balance: billed - paid,
    last_order_at: orders.map((o) => o.created_at).sort().at(-1) ?? null,
  };
}

function applyStatus(orderId, status) {
  const d = db();
  const o = d.orders.find((x) => x.id === orderId) || fail('Order not found');
  const needs = STOCK_STATUSES.includes(status);
  const grouped = {};
  d.items
    .filter((i) => i.order_id === orderId && i.product_id)
    .forEach((i) => {
      const k = `${i.product_id}|${i.size}`;
      grouped[k] ??= { product_id: i.product_id, size: i.size, qty: 0, dno: i.dno };
      grouped[k].qty += i.qty;
    });
  const lines = Object.values(grouped);
  if (needs && !o.stock_deducted) {
    for (const l of lines) {
      const have = d.stock[l.product_id]?.[l.size] ?? 0;
      if (have < l.qty) fail(`Not enough stock for D.No ${l.dno} size ${l.size} (needs ${l.qty}). Update stock first.`);
    }
    lines.forEach((l) => {
      d.stock[l.product_id][l.size] -= l.qty;
      d.movements.push({ id: uid(), product_id: l.product_id, size: l.size, change: -l.qty, reason: `Order ${o.order_no}`, order_id: o.id, created_at: now() });
    });
    o.stock_deducted = true;
  } else if (!needs && o.stock_deducted) {
    lines.forEach((l) => {
      d.stock[l.product_id] ??= emptyStock();
      d.stock[l.product_id][l.size] += l.qty;
      d.movements.push({ id: uid(), product_id: l.product_id, size: l.size, change: l.qty, reason: `Order ${o.order_no} → ${status}`, order_id: o.id, created_at: now() });
    });
    o.stock_deducted = false;
  }
  o.status = status;
  o.updated_at = now();
}

function addItems(orderId, items, fromWebsite) {
  const d = db();
  for (const it of items) {
    if (!SIZES.includes(it.size)) fail('Invalid size');
    const qty = parseInt(it.qty, 10);
    if (!qty || qty < 1 || (fromWebsite && qty > 5000)) fail(fromWebsite ? 'Invalid quantity in order' : 'Quantity must be at least 1');
    const p = d.products.find((x) => x.id === it.pid && (!fromWebsite || x.is_active));
    if (!p) fail(fromWebsite ? 'A design in your order is no longer available' : 'Product not found');
    const rate = fromWebsite ? p.price ?? 0 : it.rate === '' || it.rate == null ? p.price ?? 0 : Number(it.rate);
    const existing = d.items.find((x) => x.order_id === orderId && x.product_id === p.id && x.size === it.size);
    if (existing) existing.qty += qty;
    else d.items.push({ id: uid(), order_id: orderId, product_id: p.id, dno: p.dno, name: p.name, size: it.size, qty, rate });
  }
}

const requireAdmin = () => {
  try {
    if (sessionStorage.getItem(SESSION) !== '1') fail('Not allowed');
  } catch (e) {
    if (e.message === 'Not allowed') throw e;
  }
};

/* ----------------------------- Public ----------------------------- */

export async function fetchCatalog() {
  const d = db();
  return delay({
    categories: [...d.categories].sort((a, b) => a.sort - b.sort),
    products: d.products
      .filter((p) => p.is_active)
      .sort((a, b) => a.sort - b.sort || a.dno - b.dno)
      .map((p) => toProduct(productRow(p))),
  });
}

export async function placeOrder({ customer, items, note }) {
  const d = db();
  const phone = normalizePhone(customer.phone);
  if (phone.length !== 10) fail('Please enter a valid 10-digit mobile number');
  const shop = (customer.shop_name || '').trim();
  if (!shop) fail('Please enter your shop name');
  if (!items?.length) fail('Your order is empty');
  let c = d.customers.find((x) => x.phone === phone);
  if (!c) {
    c = {
      id: uid(),
      shop_name: shop,
      contact_name: customer.contact_name?.trim() || null,
      phone,
      city: customer.city?.trim() || null,
      gstin: customer.gstin?.trim().toUpperCase() || null,
      address: customer.address?.trim() || null,
      notes: null,
      created_at: now(),
    };
    d.customers.push(c);
  }
  const o = {
    id: uid(),
    order_no: `AT-${++d.seq}`,
    customer_id: c.id,
    source: 'website',
    status: 'new',
    stock_deducted: false,
    discount: 0,
    notes: null,
    customer_note: note?.trim() || null,
    contact_snapshot: { ...customer, phone },
    created_at: now(),
    updated_at: now(),
  };
  d.orders.push(o);
  try {
    addItems(o.id, items, true);
  } catch (e) {
    d.orders = d.orders.filter((x) => x.id !== o.id);
    d.items = d.items.filter((x) => x.order_id !== o.id);
    throw e;
  }
  save();
  return delay({ orderNo: o.order_no });
}

/* ------------------------------ Auth ------------------------------ */

export const DEMO_LOGIN = { email: 'admin@demo', password: 'demo' };

export async function getSession() {
  try {
    return sessionStorage.getItem(SESSION) === '1'
      ? { email: DEMO_LOGIN.email, name: 'Demo admin', isAdmin: true }
      : null;
  } catch {
    return null;
  }
}
const listeners = new Set();
export async function signIn(email, password) {
  if (email.trim() !== DEMO_LOGIN.email || password !== DEMO_LOGIN.password) fail('Wrong email or password');
  try {
    sessionStorage.setItem(SESSION, '1');
  } catch {
    // ignore
  }
  listeners.forEach((f) => f());
  return getSession();
}
export async function signOut() {
  try {
    sessionStorage.removeItem(SESSION);
  } catch {
    // ignore
  }
  listeners.forEach((f) => f());
}
export async function onAuthChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/* ----------------------------- Orders ----------------------------- */

export async function listOrders({ status, source, q } = {}) {
  requireAdmin();
  const t = q?.trim().toLowerCase();
  return delay(
    db()
      .orders.map(summarize)
      .filter((o) => !status || status === 'all' || o.status === status)
      .filter((o) => !source || source === 'all' || o.source === source)
      .filter((o) => !t || [o.order_no, o.shop_name, o.phone, o.city].some((v) => v?.toLowerCase().includes(t)))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  );
}

export async function getOrder(id) {
  requireAdmin();
  const d = db();
  const o = d.orders.find((x) => x.id === id) || fail('Order not found');
  return delay({
    order: summarize(o),
    items: d.items.filter((i) => i.order_id === id).sort((a, b) => a.dno - b.dno || SIZES.indexOf(a.size) - SIZES.indexOf(b.size)),
    payments: d.payments.filter((p) => p.order_id === id).sort((a, b) => b.paid_on.localeCompare(a.paid_on)),
  });
}

export async function saveOrder({ id, customer_id, source, status, discount, notes, items }) {
  requireAdmin();
  const d = db();
  if (!customer_id) fail('Choose a customer');
  if (!items?.length) fail('Add at least one item');
  const snapshot = JSON.stringify(d);
  try {
    let o;
    if (!id) {
      o = {
        id: uid(),
        order_no: `AT-${++d.seq}`,
        customer_id,
        source: source || 'other',
        status: 'new',
        stock_deducted: false,
        discount: Number(discount) || 0,
        notes: notes?.trim() || null,
        customer_note: null,
        contact_snapshot: null,
        created_at: now(),
        updated_at: now(),
      };
      d.orders.push(o);
    } else {
      o = d.orders.find((x) => x.id === id) || fail('Order not found');
      if (o.stock_deducted) applyStatus(o.id, 'new');
      Object.assign(o, { customer_id, source: source || o.source, discount: Number(discount) || 0, notes: notes?.trim() || null, updated_at: now() });
      d.items = d.items.filter((i) => i.order_id !== o.id);
    }
    addItems(o.id, items, false);
    applyStatus(o.id, status || 'new');
    save();
    return delay(o.id);
  } catch (e) {
    memory = JSON.parse(snapshot); // roll back, like a database transaction
    throw e;
  }
}

export async function setOrderStatus(id, status) {
  requireAdmin();
  const snapshot = JSON.stringify(db());
  try {
    applyStatus(id, status);
    save();
  } catch (e) {
    memory = JSON.parse(snapshot);
    throw e;
  }
  return delay();
}

export async function deleteOrder(id) {
  requireAdmin();
  const d = db();
  const o = d.orders.find((x) => x.id === id);
  if (o?.stock_deducted) applyStatus(id, 'cancelled');
  d.orders = d.orders.filter((x) => x.id !== id);
  d.items = d.items.filter((x) => x.order_id !== id);
  d.payments = d.payments.filter((x) => x.order_id !== id);
  save();
  return delay();
}

/* ---------------------------- Payments ---------------------------- */

export async function addPayment(p) {
  requireAdmin();
  const amount = Number(p.amount);
  if (!(amount > 0)) fail('Amount must be more than 0');
  db().payments.push({
    id: uid(),
    order_id: p.order_id,
    amount,
    mode: p.mode || 'upi',
    reference: p.reference?.trim() || null,
    paid_on: p.paid_on || now().slice(0, 10),
    note: p.note?.trim() || null,
    created_at: now(),
  });
  save();
  return delay();
}

export async function deletePayment(id) {
  requireAdmin();
  const d = db();
  d.payments = d.payments.filter((p) => p.id !== id);
  save();
  return delay();
}

export async function listPayments({ from, to } = {}) {
  requireAdmin();
  const d = db();
  return delay(
    d.payments
      .filter((p) => (!from || p.paid_on >= from) && (!to || p.paid_on <= to))
      .map((p) => {
        const o = d.orders.find((x) => x.id === p.order_id);
        const c = d.customers.find((x) => x.id === o?.customer_id);
        return { ...p, order_no: o?.order_no, shop_name: c?.shop_name, phone: c?.phone };
      })
      .sort((a, b) => b.paid_on.localeCompare(a.paid_on) || b.created_at.localeCompare(a.created_at)),
  );
}

/* ---------------------------- Customers --------------------------- */

export async function listCustomers(q) {
  requireAdmin();
  const t = q?.trim().toLowerCase();
  return delay(
    db()
      .customers.filter((c) => !t || [c.shop_name, c.phone, c.city, c.contact_name].some((v) => v?.toLowerCase().includes(t)))
      .map(balanceOf)
      .sort((a, b) => a.shop_name.localeCompare(b.shop_name)),
  );
}

export async function getCustomer(id) {
  requireAdmin();
  const d = db();
  const c = d.customers.find((x) => x.id === id) || fail('Customer not found');
  const orders = d.orders.filter((o) => o.customer_id === id).map(summarize).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const ids = new Set(orders.map((o) => o.id));
  const payments = d.payments
    .filter((p) => ids.has(p.order_id))
    .map((p) => ({ ...p, order_no: d.orders.find((o) => o.id === p.order_id)?.order_no }))
    .sort((a, b) => b.paid_on.localeCompare(a.paid_on));
  return delay({ customer: balanceOf(c), orders, payments });
}

export async function saveCustomer(c) {
  requireAdmin();
  const d = db();
  const row = {
    shop_name: c.shop_name?.trim(),
    contact_name: c.contact_name?.trim() || null,
    phone: normalizePhone(c.phone),
    city: c.city?.trim() || null,
    gstin: c.gstin?.trim().toUpperCase() || null,
    address: c.address?.trim() || null,
    notes: c.notes?.trim() || null,
  };
  if (!row.shop_name) fail('Shop name is required');
  if (row.phone.length !== 10) fail('Enter a valid 10-digit mobile number');
  if (d.customers.some((x) => x.phone === row.phone && x.id !== c.id)) fail('A customer with this mobile number already exists');
  let id = c.id;
  if (id) Object.assign(d.customers.find((x) => x.id === id), row);
  else {
    id = uid();
    d.customers.push({ id, ...row, created_at: now() });
  }
  save();
  return delay(id);
}

/* ---------------------------- Products ---------------------------- */

export async function listProductsAdmin() {
  requireAdmin();
  const d = db();
  return delay({
    categories: [...d.categories].sort((a, b) => a.sort - b.sort),
    products: [...d.products].sort((a, b) => a.sort - b.sort || a.dno - b.dno).map((p) => toProduct(productRow(p))),
  });
}

export async function saveProduct(p) {
  requireAdmin();
  const d = db();
  const row = fromProduct(p);
  if (!row.dno) fail('D.No is required');
  if (!row.name) fail('Name is required');
  if (d.products.some((x) => x.dno === row.dno && x.id !== p.pid)) fail(`D.No ${row.dno} already exists`);
  let id = p.pid;
  if (id) Object.assign(d.products.find((x) => x.id === id), row, { updated_at: now() });
  else {
    id = uid();
    d.products.push({ id, ...row, created_at: now() });
    d.stock[id] = emptyStock();
  }
  save();
  return delay(id);
}

export async function setStock(pid, size, qty, reason) {
  requireAdmin();
  const n = parseInt(qty, 10);
  if (!(n >= 0)) fail('Stock cannot be negative');
  const d = db();
  d.stock[pid] ??= emptyStock();
  const old = d.stock[pid][size] ?? 0;
  d.stock[pid][size] = n;
  if (old !== n) d.movements.push({ id: uid(), product_id: pid, size, change: n - old, reason: reason?.trim() || 'Manual update', order_id: null, created_at: now() });
  save();
  return delay();
}

export async function stockHistory(pid) {
  requireAdmin();
  const d = db();
  return delay(
    d.movements
      .filter((m) => m.product_id === pid)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 50)
      .map((m) => ({ ...m, orders: m.order_id ? { order_no: d.orders.find((o) => o.id === m.order_id)?.order_no } : null })),
  );
}

export async function uploadProductImages(file, _dno, opts) {
  requireAdmin();
  const set = await makeImageSet(file, opts);
  const out = {};
  for (const [k, blob] of Object.entries(set)) out[k] = await blobToDataURL(blob);
  return out;
}

export async function saveCategory(c) {
  requireAdmin();
  const d = db();
  if (!c.id || !c.name?.trim()) fail('Category needs a name');
  const row = { id: c.id, name: c.name.trim(), blurb: c.blurb?.trim() || null, cover: c.cover || null, sort: Number(c.sort) || 0 };
  const i = d.categories.findIndex((x) => x.id === c.id);
  if (i >= 0) d.categories[i] = row;
  else d.categories.push(row);
  save();
  return delay();
}

/* ---------------------------- Dashboard --------------------------- */

export async function dashboard() {
  requireAdmin();
  const d = db();
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  const s = since.toISOString().slice(0, 10);
  return delay({
    orders: d.orders.map(summarize).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    balances: d.customers.map(balanceOf),
    products: d.products.filter((p) => p.is_active).map((p) => toProduct(productRow(p))),
    paymentsThisMonth: d.payments.filter((p) => p.paid_on >= s),
    since: since.toISOString(),
  });
}

export function resetDemo() {
  memory = seed();
  memory.products.forEach((p) => {
    memory.stock[p.id] = emptyStock();
  });
  save();
}
