// Shared constants and helpers used by both data backends and the UI.

export const SIZES = ['M', 'L', 'XL', 'XXL'];

export const ORDER_STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'packed', label: 'Packed' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];
export const STOCK_STATUSES = ['confirmed', 'packed', 'dispatched', 'delivered'];

export const SOURCES = [
  { id: 'website', label: 'Website' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'shop', label: 'Shop / walk-in' },
  { id: 'phone', label: 'Phone call' },
  { id: 'other', label: 'Other' },
];

export const PAY_MODES = [
  { id: 'upi', label: 'UPI' },
  { id: 'cash', label: 'Cash' },
  { id: 'bank', label: 'Bank transfer' },
  { id: 'cheque', label: 'Cheque' },
  { id: 'other', label: 'Other' },
];

export const label = (list, id) => list.find((x) => x.id === id)?.label ?? id;

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
export const formatINR = (n) => inr.format(Number(n) || 0).replace(/\.00$/, '');

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
export const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';

export const emptyStock = () => Object.fromEntries(SIZES.map((s) => [s, 0]));

/** Database row (+ stock rows) → product object used across the UI. */
export function toProduct(row, stockRows = row.stock) {
  const stock = emptyStock();
  (stockRows || []).forEach((s) => {
    stock[s.size] = Number(s.qty) || 0;
  });
  return {
    pid: row.id,
    id: String(row.dno),
    dno: row.dno,
    name: row.name,
    colour: row.colour,
    category: row.category_id,
    fabric: row.fabric,
    pieces: row.pieces,
    bottom: row.bottom,
    dupatta: row.dupatta,
    sizes: row.sizes_note,
    description: row.description,
    image: row.image,
    thumb: row.thumb || row.image,
    model: row.model || row.thumb || row.image,
    price: row.price == null ? null : Number(row.price),
    isActive: row.is_active !== false,
    sort: row.sort ?? 0,
    stock,
  };
}

/** Product object → database row. */
export const fromProduct = (p) => ({
  dno: Number(p.dno),
  name: p.name?.trim(),
  colour: p.colour?.trim() || null,
  category_id: p.category || null,
  fabric: p.fabric?.trim() || null,
  pieces: Number(p.pieces) || 3,
  bottom: p.bottom?.trim() || null,
  dupatta: p.dupatta?.trim() || null,
  sizes_note: p.sizes?.trim() || null,
  description: p.description?.trim() || null,
  image: p.image || null,
  thumb: p.thumb || null,
  model: p.model || null,
  price: p.price === '' || p.price == null ? null : Number(p.price),
  is_active: p.isActive !== false,
  sort: Number(p.sort) || 0,
});

export function paymentStatus(o) {
  if (o.status === 'cancelled') return { id: 'na', label: '—' };
  const total = Number(o.total) || 0;
  const paid = Number(o.paid) || 0;
  if (total <= 0) return o.unpriced_lines > 0 ? { id: 'unpriced', label: 'Rates pending' } : { id: 'na', label: '—' };
  if (paid >= total) return { id: 'paid', label: 'Paid' };
  if (paid > 0) return { id: 'partial', label: 'Part paid' };
  return { id: 'unpaid', label: 'Unpaid' };
}

export const normalizePhone = (v) => {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  return d;
};

export function groupLines(lines) {
  // [{dno, name, size, qty, ...}] → [{dno, name, sizes: {M: 2, ...}, pieces}]
  const map = new Map();
  lines.forEach((l) => {
    const key = l.product_id || l.pid || l.dno;
    if (!map.has(key)) map.set(key, { key, dno: l.dno, name: l.name, rate: l.rate, sizes: {}, pieces: 0, amount: 0 });
    const g = map.get(key);
    g.sizes[l.size] = (g.sizes[l.size] || 0) + Number(l.qty);
    g.pieces += Number(l.qty);
    g.amount += Number(l.qty) * Number(l.rate || 0);
  });
  return [...map.values()].sort((a, b) => a.dno - b.dno);
}
