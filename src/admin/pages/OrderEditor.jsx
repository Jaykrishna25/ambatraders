import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api/index.js';
import { SIZES, ORDER_STATUSES, STOCK_STATUSES, SOURCES, formatINR } from '../../lib/api/shape.js';
import { useAsync, useToast, PageHead, Loading, ErrorBox, Field, Modal, Icon, navigate } from '../ui.jsx';
import CustomerForm from '../CustomerForm.jsx';

const blankQty = () => Object.fromEntries(SIZES.map((s) => [s, '']));

export default function OrderEditor({ id }) {
  const toast = useToast();
  const isNew = !id;
  const presetCustomer = new URLSearchParams(window.location.search).get('customer');

  const { data, error, loading, reload } = useAsync(async () => {
    const [{ products }, customers, existing] = await Promise.all([
      api.listProductsAdmin(),
      api.listCustomers(),
      id ? api.getOrder(id) : Promise.resolve(null),
    ]);
    return { products, customers, existing };
  }, [id]);

  const [form, setForm] = useState(null);
  const [rows, setRows] = useState([]);
  const [find, setFind] = useState('');
  const [custOpen, setCustOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Initialise the form once data arrives.
  useEffect(() => {
    if (!data || form) return;
    const byPid = new Map(data.products.map((p) => [p.pid, p]));
    if (data.existing) {
      const { order, items } = data.existing;
      const map = new Map();
      items.forEach((i) => {
        if (!map.has(i.product_id)) {
          const p = byPid.get(i.product_id);
          map.set(i.product_id, { pid: i.product_id, product: p, dno: i.dno, name: i.name, qty: blankQty(), orig: {}, rate: i.rate ? String(i.rate) : '' });
        }
        const r = map.get(i.product_id);
        r.qty[i.size] = String(i.qty);
        r.orig[i.size] = i.qty;
      });
      setRows([...map.values()].sort((a, b) => a.dno - b.dno));
      setForm({
        customer_id: order.customer_id,
        source: order.source,
        status: order.status,
        discount: order.discount ? String(order.discount) : '',
        notes: order.notes || '',
        wasDeducted: order.stock_deducted,
      });
    } else {
      setForm({ customer_id: presetCustomer || '', source: 'whatsapp', status: 'new', discount: '', notes: '', wasDeducted: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const matches = useMemo(() => {
    const t = find.trim().toLowerCase();
    if (!t || !data) return [];
    return data.products
      .filter((p) => String(p.dno).includes(t) || p.name.toLowerCase().includes(t) || (p.colour || '').toLowerCase().includes(t))
      .slice(0, 8);
  }, [find, data]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!form) return <Loading />;

  const addProduct = (p) => {
    setFind('');
    if (rows.some((r) => r.pid === p.pid)) return;
    setRows((rs) => [...rs, { pid: p.pid, product: p, dno: p.dno, name: p.name, qty: blankQty(), orig: {}, rate: p.price != null ? String(p.price) : '' }]);
  };
  const setRow = (pid, patch) => setRows((rs) => rs.map((r) => (r.pid === pid ? { ...r, ...patch } : r)));
  const setQty = (pid, size, v) =>
    setRows((rs) => rs.map((r) => (r.pid === pid ? { ...r, qty: { ...r.qty, [size]: v.replace(/\D/g, '').slice(0, 5) } } : r)));
  const addSet = (pid) =>
    setRows((rs) => rs.map((r) => (r.pid === pid ? { ...r, qty: Object.fromEntries(SIZES.map((s) => [s, String((parseInt(r.qty[s], 10) || 0) + 1)])) } : r)));

  const pcs = (r) => SIZES.reduce((a, s) => a + (parseInt(r.qty[s], 10) || 0), 0);
  const subtotal = rows.reduce((a, r) => a + pcs(r) * (Number(r.rate) || 0), 0);
  const total = subtotal - (Number(form.discount) || 0);
  const totalPcs = rows.reduce((a, r) => a + pcs(r), 0);
  const willDeduct = STOCK_STATUSES.includes(form.status);
  const available = (r, s) => (r.product?.stock?.[s] ?? 0) + (form.wasDeducted ? r.orig[s] || 0 : 0);
  const short = willDeduct
    ? rows.flatMap((r) => SIZES.filter((s) => (parseInt(r.qty[s], 10) || 0) > available(r, s)).map((s) => `D.No ${r.dno} ${s}`))
    : [];

  const save = async (e) => {
    e.preventDefault();
    setErr('');
    const items = rows.flatMap((r) =>
      SIZES.filter((s) => parseInt(r.qty[s], 10) > 0).map((s) => ({ pid: r.pid, size: s, qty: parseInt(r.qty[s], 10), rate: r.rate })),
    );
    if (!form.customer_id) return setErr('Choose a customer.');
    if (!items.length) return setErr('Add at least one design with a quantity.');
    setBusy(true);
    try {
      const savedId = await api.saveOrder({ id, ...form, items });
      toast(isNew ? 'Order saved' : 'Order updated');
      navigate(`/admin/orders/${savedId}`, { replace: true });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const customers = data.customers;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHead
        back={id ? `/admin/orders/${id}` : '/admin/orders'}
        title={isNew ? 'New order' : `Edit ${data.existing.order.order_no}`}
        sub={isNew ? 'Log an order received on WhatsApp, a call or at the shop.' : 'Changing items re-calculates stock automatically.'}
      />

      <form onSubmit={save} className="editor">
        <section className="card">
          <header className="card__head">
            <h2>Customer & details</h2>
          </header>
          <div className="agrid">
            <Field label="Customer *" full>
              <div className="inline">
                <select value={form.customer_id} onChange={set('customer_id')} required>
                  <option value="">Choose customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shop_name} — {c.phone}
                      {c.city ? ` (${c.city})` : ''}
                    </option>
                  ))}
                </select>
                <button type="button" className="abtn abtn--ghost" onClick={() => setCustOpen(true)}>
                  <Icon name="plus" size={16} /> New
                </button>
              </div>
            </Field>
            <Field label="Received via">
              <select value={form.source} onChange={set('source')}>
                {SOURCES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status" hint={willDeduct ? 'Stock will be deducted on save' : 'Stock is not touched yet'}>
              <select value={form.status} onChange={set('status')}>
                {ORDER_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="card">
          <header className="card__head">
            <h2>Items</h2>
            <span className="muted">{totalPcs} pcs</span>
          </header>

          <div className="finder">
            <label className="search">
              <Icon name="search" size={16} />
              <input
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="Add design — type D.No or name (e.g. 1252)"
                aria-label="Find a design to add"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (matches[0]) addProduct(matches[0]);
                  }
                }}
              />
            </label>
            {matches.length > 0 && (
              <ul className="finder__list" role="listbox" aria-label="Matching designs">
                {matches.map((p) => (
                  <li key={p.pid}>
                    <button type="button" onClick={() => addProduct(p)} role="option" aria-selected="false">
                      <img src={p.model || p.thumb} alt="" width="32" height="48" />
                      <span>
                        <strong>D.No {p.dno}</strong> {p.name}
                        <small>
                          Stock {SIZES.map((s) => `${s} ${p.stock[s]}`).join(' · ')}
                          {p.price != null ? ` · ${formatINR(p.price)}/pc` : ''}
                          {!p.isActive ? ' · hidden on website' : ''}
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {rows.length === 0 ? (
            <p className="muted pad">No designs added yet.</p>
          ) : (
            <div className="ed-items">
              {rows.map((r) => (
                <div key={r.pid} className="ed-item">
                  <div className="ed-item__head">
                    {r.product && <img src={r.product.model || r.product.thumb} alt="" width="36" height="54" />}
                    <span className="cell-main">
                      <strong>D.No {r.dno}</strong>
                      <small>{r.name}</small>
                    </span>
                    <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => addSet(r.pid)}>
                      +1 set
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Remove D.No ${r.dno}`} onClick={() => setRows((rs) => rs.filter((x) => x.pid !== r.pid))}>
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                  <div className="ed-item__grid">
                    {SIZES.map((s) => {
                      const q = parseInt(r.qty[s], 10) || 0;
                      const av = available(r, s);
                      return (
                        <label key={s} className={`qty ${willDeduct && q > av ? 'is-short' : ''}`}>
                          <span>{s}</span>
                          <input inputMode="numeric" value={r.qty[s]} onChange={(e) => setQty(r.pid, s, e.target.value)} placeholder="0" aria-label={`D.No ${r.dno} size ${s} quantity`} />
                          <small>{av} in stock</small>
                        </label>
                      );
                    })}
                    <label className="qty qty--rate">
                      <span>Rate ₹/pc</span>
                      <input inputMode="decimal" value={r.rate} onChange={(e) => setRow(r.pid, { rate: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" aria-label={`D.No ${r.dno} rate per piece`} />
                      <small>
                        {pcs(r)} pcs · {formatINR(pcs(r) * (Number(r.rate) || 0))}
                      </small>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
          {short.length > 0 && (
            <p className="aerror">
              Not enough stock for {short.join(', ')}. Save as <strong>New</strong>, or update stock first.
            </p>
          )}
        </section>

        <section className="card">
          <div className="agrid">
            <Field label="Discount (₹)">
              <input inputMode="decimal" value={form.discount} onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value.replace(/[^\d.]/g, '') }))} placeholder="0" />
            </Field>
            <Field label="Internal note" full>
              <textarea value={form.notes} onChange={set('notes')} rows={2} maxLength={1000} placeholder="Transport, delivery date, anything to remember…" />
            </Field>
          </div>
          <dl className="totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatINR(subtotal)}</dd>
            </div>
            <div className="totals__grand">
              <dt>Total</dt>
              <dd>{formatINR(total)}</dd>
            </div>
          </dl>
        </section>

        {err && (
          <p className="aerror" role="alert">
            {err}
          </p>
        )}
        <div className="sticky-actions">
          <button type="button" className="abtn abtn--ghost" onClick={() => navigate(id ? `/admin/orders/${id}` : '/admin/orders')}>
            Cancel
          </button>
          <button className="abtn abtn--primary" disabled={busy}>
            {busy ? 'Saving…' : isNew ? 'Save order' : 'Save changes'}
          </button>
        </div>
      </form>

      <Modal open={custOpen} onClose={() => setCustOpen(false)} title="New customer">
        <CustomerForm
          onCancel={() => setCustOpen(false)}
          onSaved={async (newId) => {
            setCustOpen(false);
            const customers2 = await api.listCustomers();
            data.customers.splice(0, data.customers.length, ...customers2);
            setForm((f) => ({ ...f, customer_id: newId }));
            toast('Customer added');
          }}
        />
      </Modal>
    </>
  );
}
