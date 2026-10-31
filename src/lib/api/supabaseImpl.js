// Live backend: Supabase (Postgres + Auth + Storage).
// All business rules (stock deduction, validation, permissions) live in
// supabase/schema.sql — this file only calls them.
import { createClient } from '@supabase/supabase-js';
import { toProduct, fromProduct, normalizePhone } from './shape.js';
import { makeImageSet } from './images.js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

function must({ data, error }) {
  if (error) {
    // Postgres RAISE messages are already written for people.
    throw new Error(error.message?.replace(/^.*?ERROR:\s*/, '') || 'Something went wrong');
  }
  return data;
}

/* ----------------------------- Public ----------------------------- */

export async function fetchCatalog() {
  const [cats, prods] = await Promise.all([
    supabase.from('categories').select('*').order('sort'),
    supabase.from('products').select('*, stock(size, qty)').eq('is_active', true).order('sort').order('dno'),
  ]);
  return { categories: must(cats), products: must(prods).map((r) => toProduct(r)) };
}

export async function placeOrder({ customer, items, note }) {
  const orderNo = must(
    await supabase.rpc('place_order', {
      p_customer: customer,
      p_items: items.map((i) => ({ product_id: i.pid, size: i.size, qty: i.qty })),
      p_note: note || null,
    }),
  );
  return { orderNo };
}

/* ------------------------------ Auth ------------------------------ */

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  const { data: row, error } = await supabase.from('admins').select('user_id, name').eq('user_id', user.id).maybeSingle();
  if (error) throw new Error(`Could not check admin access: ${error.message}. Run supabase/fix-permissions.sql in Supabase.`);
  return { email: user.email, name: row?.name || user.email, isAdmin: Boolean(row) };
}

export async function signIn(email, password) {
  must(await supabase.auth.signInWithPassword({ email: email.trim(), password }));
  const s = await getSession();
  if (!s?.isAdmin) {
    await supabase.auth.signOut();
    throw new Error('This account is not an admin. Ask the owner to add it in Supabase.');
  }
  return s;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange(() => cb());
  return () => data.subscription.unsubscribe();
}

/* ----------------------------- Orders ----------------------------- */

export async function listOrders({ status, source, q } = {}) {
  let query = supabase.from('order_summary').select('*').order('created_at', { ascending: false }).limit(500);
  if (status && status !== 'all') query = query.eq('status', status);
  if (source && source !== 'all') query = query.eq('source', source);
  if (q?.trim()) {
    const t = q.trim().replace(/[%,()]/g, '');
    query = query.or(`order_no.ilike.%${t}%,shop_name.ilike.%${t}%,phone.ilike.%${t}%,city.ilike.%${t}%`);
  }
  return must(await query);
}

export async function getOrder(id) {
  const [o, items, pays] = await Promise.all([
    supabase.from('order_summary').select('*').eq('id', id).single(),
    supabase.from('order_items').select('*').eq('order_id', id).order('dno').order('size'),
    supabase.from('payments').select('*').eq('order_id', id).order('paid_on', { ascending: false }),
  ]);
  return { order: must(o), items: must(items), payments: must(pays) };
}

export async function saveOrder({ id, customer_id, source, status, discount, notes, items }) {
  return must(
    await supabase.rpc('admin_save_order', {
      p_order: id || null,
      p_customer: customer_id,
      p_source: source,
      p_status: status,
      p_discount: Number(discount) || 0,
      p_notes: notes || null,
      p_items: items.map((i) => ({ product_id: i.pid, size: i.size, qty: Number(i.qty), rate: i.rate === '' ? null : Number(i.rate) })),
    }),
  );
}

export async function setOrderStatus(id, status) {
  must(await supabase.rpc('set_order_status', { p_order: id, p_status: status }));
}

export async function deleteOrder(id) {
  // Put stock back first if it was deducted, then delete.
  const { data } = await supabase.from('orders').select('stock_deducted').eq('id', id).single();
  if (data?.stock_deducted) await setOrderStatus(id, 'cancelled');
  must(await supabase.from('orders').delete().eq('id', id));
}

/* ---------------------------- Payments ---------------------------- */

export async function addPayment(p) {
  must(
    await supabase.from('payments').insert({
      order_id: p.order_id,
      amount: Number(p.amount),
      mode: p.mode,
      reference: p.reference?.trim() || null,
      paid_on: p.paid_on || undefined,
      note: p.note?.trim() || null,
    }),
  );
}

export async function deletePayment(id) {
  must(await supabase.from('payments').delete().eq('id', id));
}

export async function listPayments({ from, to } = {}) {
  let query = supabase
    .from('payments')
    .select('*, orders(order_no, customers(shop_name, phone))')
    .order('paid_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);
  if (from) query = query.gte('paid_on', from);
  if (to) query = query.lte('paid_on', to);
  return must(await query).map((p) => ({
    ...p,
    order_no: p.orders?.order_no,
    shop_name: p.orders?.customers?.shop_name,
    phone: p.orders?.customers?.phone,
  }));
}

/* ---------------------------- Customers --------------------------- */

export async function listCustomers(q) {
  let query = supabase.from('customer_balances').select('*').order('shop_name');
  if (q?.trim()) {
    const t = q.trim().replace(/[%,()]/g, '');
    query = query.or(`shop_name.ilike.%${t}%,phone.ilike.%${t}%,city.ilike.%${t}%,contact_name.ilike.%${t}%`);
  }
  return must(await query);
}

export async function getCustomer(id) {
  const [c, orders] = await Promise.all([
    supabase.from('customer_balances').select('*').eq('id', id).single(),
    supabase.from('order_summary').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
  ]);
  const ids = must(orders).map((o) => o.id);
  const pays = ids.length
    ? must(await supabase.from('payments').select('*, orders(order_no)').in('order_id', ids).order('paid_on', { ascending: false }))
    : [];
  return { customer: must(c), orders: must(orders), payments: pays.map((p) => ({ ...p, order_no: p.orders?.order_no })) };
}

export async function saveCustomer(c) {
  const row = {
    shop_name: c.shop_name?.trim(),
    contact_name: c.contact_name?.trim() || null,
    phone: normalizePhone(c.phone),
    city: c.city?.trim() || null,
    gstin: c.gstin?.trim().toUpperCase() || null,
    address: c.address?.trim() || null,
    notes: c.notes?.trim() || null,
  };
  if (!row.shop_name) throw new Error('Shop name is required');
  if (row.phone.length !== 10) throw new Error('Enter a valid 10-digit mobile number');
  const res = c.id
    ? await supabase.from('customers').update(row).eq('id', c.id).select('id').single()
    : await supabase.from('customers').insert(row).select('id').single();
  if (res.error?.code === '23505') throw new Error('A customer with this mobile number already exists');
  return must(res).id;
}

/* ---------------------------- Products ---------------------------- */

export async function listProductsAdmin() {
  const [cats, prods] = await Promise.all([
    supabase.from('categories').select('*').order('sort'),
    supabase.from('products').select('*, stock(size, qty)').order('sort').order('dno'),
  ]);
  return { categories: must(cats), products: must(prods).map((r) => toProduct(r)) };
}

export async function saveProduct(p) {
  const row = { ...fromProduct(p), updated_at: new Date().toISOString() };
  if (!row.dno) throw new Error('D.No is required');
  if (!row.name) throw new Error('Name is required');
  const res = p.pid
    ? await supabase.from('products').update(row).eq('id', p.pid).select('id').single()
    : await supabase.from('products').insert(row).select('id').single();
  if (res.error?.code === '23505') throw new Error(`D.No ${row.dno} already exists`);
  return must(res).id;
}

export async function setStock(pid, size, qty, reason) {
  must(await supabase.rpc('admin_set_stock', { p_product: pid, p_size: size, p_qty: Number(qty), p_reason: reason || null }));
}

export async function stockHistory(pid) {
  return must(
    await supabase
      .from('stock_movements')
      .select('*, orders(order_no)')
      .eq('product_id', pid)
      .order('created_at', { ascending: false })
      .limit(50),
  );
}

export async function uploadProductImages(file, dno, opts) {
  const set = await makeImageSet(file, opts);
  const stamp = Date.now();
  const bucket = supabase.storage.from('product-images');
  const out = {};
  for (const [kind, blob] of Object.entries(set)) {
    const path = `${dno}/${kind}-${stamp}.webp`;
    must(await bucket.upload(path, blob, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' }));
    out[kind] = bucket.getPublicUrl(path).data.publicUrl;
  }
  return out;
}

export async function saveCategory(c) {
  const row = { id: c.id, name: c.name?.trim(), blurb: c.blurb?.trim() || null, cover: c.cover || null, sort: Number(c.sort) || 0 };
  if (!row.id || !row.name) throw new Error('Category needs a name');
  must(await supabase.from('categories').upsert(row));
}

/* ---------------------------- Dashboard --------------------------- */

export async function dashboard() {
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  const [orders, balances, prods, pays] = await Promise.all([
    supabase.from('order_summary').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('customer_balances').select('balance'),
    supabase.from('products').select('*, stock(size, qty)').eq('is_active', true),
    supabase.from('payments').select('amount').gte('paid_on', since.toISOString().slice(0, 10)),
  ]);
  return {
    orders: must(orders),
    balances: must(balances),
    products: must(prods).map((r) => toProduct(r)),
    paymentsThisMonth: must(pays),
    since: since.toISOString(),
  };
}
