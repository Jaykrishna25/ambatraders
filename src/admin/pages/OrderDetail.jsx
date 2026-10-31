import { useState } from 'react';
import { api } from '../../lib/api/index.js';
import {
  SIZES,
  ORDER_STATUSES,
  STOCK_STATUSES,
  SOURCES,
  PAY_MODES,
  formatDate,
  formatDateTime,
  formatINR,
  groupLines,
  label,
} from '../../lib/api/shape.js';
import {
  useAsync,
  useToast,
  PageHead,
  Loading,
  ErrorBox,
  StatusBadge,
  PayBadge,
  Money,
  Field,
  Modal,
  Link,
  Icon,
  navigate,
  waLink,
  telLink,
  todayISO,
} from '../ui.jsx';

const NEXT = {
  new: { to: 'confirmed', label: 'Confirm order', hint: 'Deducts stock' },
  confirmed: { to: 'packed', label: 'Mark packed' },
  packed: { to: 'dispatched', label: 'Mark dispatched' },
  dispatched: { to: 'delivered', label: 'Mark delivered' },
};

export function PaymentForm({ order, onSaved, onCancel }) {
  const toast = useToast();
  const [f, setF] = useState({ amount: order.balance > 0 ? String(order.balance) : '', mode: 'upi', reference: '', paid_on: todayISO(), note: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      className="aform"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr('');
        if (!(Number(f.amount) > 0)) return setErr('Enter an amount');
        setBusy(true);
        try {
          await api.addPayment({ ...f, order_id: order.id });
          toast(`Payment of ${formatINR(f.amount)} recorded`);
          onSaved();
        } catch (e2) {
          setErr(e2.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="agrid">
        <Field label="Amount (₹)">
          <input type="number" inputMode="decimal" min="0" step="0.01" value={f.amount} onChange={set('amount')} autoFocus required />
        </Field>
        <Field label="Mode">
          <select value={f.mode} onChange={set('mode')}>
            {PAY_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={f.paid_on} onChange={set('paid_on')} max={todayISO()} />
        </Field>
        <Field label="Reference" hint="UTR / cheque no.">
          <input value={f.reference} onChange={set('reference')} maxLength={80} />
        </Field>
        <Field label="Note" full>
          <input value={f.note} onChange={set('note')} maxLength={200} />
        </Field>
      </div>
      {err && <p className="aerror">{err}</p>}
      <div className="aform__actions">
        <button type="button" className="abtn abtn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="abtn abtn--primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save payment'}
        </button>
      </div>
    </form>
  );
}

function summaryText(order, groups) {
  const lines = groups.map((g) => {
    const sizes = SIZES.filter((s) => g.sizes[s]).map((s) => `${s}×${g.sizes[s]}`).join(', ');
    return `• D.No ${g.dno}: ${sizes} = ${g.pieces} pcs${g.rate ? ` @ ${formatINR(g.rate)}` : ''}`;
  });
  return [
    `Amba Traders — Order ${order.order_no}`,
    `Status: ${label(ORDER_STATUSES, order.status)}`,
    '',
    ...lines,
    '',
    `Total pieces: ${order.pieces}`,
    order.total > 0 ? `Amount: ${formatINR(order.total)}` : null,
    order.paid > 0 ? `Paid: ${formatINR(order.paid)}` : null,
    order.total > 0 && order.balance > 0 ? `Balance due: ${formatINR(order.balance)}` : null,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

export default function OrderDetail({ id }) {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.getOrder(id), [id]);
  const [busy, setBusy] = useState(false);
  const [statusErr, setStatusErr] = useState('');
  const [payOpen, setPayOpen] = useState(false);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const { order, items, payments } = data;
  const groups = groupLines(items);
  const next = NEXT[order.status];
  const snap = order.contact_snapshot || {};

  const changeStatus = async (to) => {
    if (to === 'cancelled' && !window.confirm(`Cancel ${order.order_no}?${order.stock_deducted ? ' Its stock will be added back.' : ''}`)) return;
    setBusy(true);
    setStatusErr('');
    try {
      await api.setOrderStatus(order.id, to);
      toast(`${order.order_no} → ${label(ORDER_STATUSES, to)}`);
      reload();
    } catch (e) {
      setStatusErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${order.order_no} permanently?${order.stock_deducted ? ' Its stock will be added back.' : ''}`)) return;
    try {
      await api.deleteOrder(order.id);
      toast(`${order.order_no} deleted`);
      navigate('/admin/orders');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <>
      <PageHead
        back="/admin/orders"
        title={
          <>
            {order.order_no} <StatusBadge status={order.status} /> <PayBadge order={order} />
          </>
        }
        sub={`${formatDateTime(order.created_at)} · ${label(SOURCES, order.source)}${order.stock_deducted ? ' · stock deducted' : ''}`}
        actions={
          <>
            <Link to={`/admin/orders/${order.id}/edit`} className="abtn abtn--ghost">
              <Icon name="edit" size={16} /> Edit
            </Link>
            <button type="button" className="abtn abtn--ghost no-print" onClick={() => window.print()}>
              <Icon name="printer" size={16} /> Print
            </button>
          </>
        }
      />

      <div className="detail-grid">
        <div className="detail-main">
          <section className="card no-print">
            <header className="card__head">
              <h2>Status</h2>
            </header>
            <ol className="steps" aria-label="Order progress">
              {ORDER_STATUSES.filter((s) => s.id !== 'cancelled').map((s, i, arr) => {
                const cur = arr.findIndex((x) => x.id === order.status);
                return (
                  <li key={s.id} className={order.status === 'cancelled' ? '' : i < cur ? 'is-done' : i === cur ? 'is-current' : ''}>
                    {s.label}
                  </li>
                );
              })}
            </ol>
            {statusErr && (
              <p className="aerror" role="alert">
                {statusErr}{' '}
                {statusErr.includes('stock') && (
                  <Link to="/admin/products" className="alink">
                    Update stock →
                  </Link>
                )}
              </p>
            )}
            <div className="status-actions">
              {next && (
                <button type="button" className="abtn abtn--primary" disabled={busy} onClick={() => changeStatus(next.to)}>
                  <Icon name="check" size={16} /> {next.label}
                  {next.hint && <small>{next.hint}</small>}
                </button>
              )}
              {order.status !== 'cancelled' ? (
                <button type="button" className="abtn abtn--ghost" disabled={busy} onClick={() => changeStatus('cancelled')}>
                  Cancel order
                </button>
              ) : (
                <button type="button" className="abtn abtn--ghost" disabled={busy} onClick={() => changeStatus('new')}>
                  Reopen as New
                </button>
              )}
              <label className="status-set">
                <span>Set status</span>
                <select value={order.status} disabled={busy} onChange={(e) => changeStatus(e.target.value)} className="aselect">
                  {ORDER_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                      {STOCK_STATUSES.includes(s.id) ? ' (stock out)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="card">
            <header className="card__head">
              <h2>Items</h2>
              <span className="muted">
                {groups.length} designs · {order.pieces} pcs
              </span>
            </header>
            <div className="items">
              <div className="items__head">
                <span>Design</span>
                {SIZES.map((s) => (
                  <span key={s} className="num">
                    {s}
                  </span>
                ))}
                <span className="num">Pcs</span>
                <span className="num">Rate</span>
                <span className="num">Amount</span>
              </div>
              {groups.map((g) => (
                <div key={g.key} className="items__row">
                  <span className="cell-main">
                    <strong>D.No {g.dno}</strong>
                    <small>{g.name}</small>
                  </span>
                  {SIZES.map((s) => (
                    <span key={s} className="num" data-label={s}>
                      {g.sizes[s] || '–'}
                    </span>
                  ))}
                  <span className="num" data-label="Pcs">
                    {g.pieces}
                  </span>
                  <span className="num" data-label="Rate">
                    {g.rate ? formatINR(g.rate) : <em className="muted">not set</em>}
                  </span>
                  <span className="num" data-label="Amount">
                    <Money value={g.amount} />
                  </span>
                </div>
              ))}
            </div>
            {order.unpriced_lines > 0 && (
              <p className="note">
                Some items have no rate yet. <Link to={`/admin/orders/${order.id}/edit`}>Edit the order</Link> to add rates.
              </p>
            )}
            <dl className="totals">
              <div>
                <dt>Subtotal</dt>
                <dd>
                  <Money value={order.subtotal} />
                </dd>
              </div>
              {Number(order.discount) > 0 && (
                <div>
                  <dt>Discount</dt>
                  <dd>− {formatINR(order.discount)}</dd>
                </div>
              )}
              <div className="totals__grand">
                <dt>Total</dt>
                <dd>
                  <Money value={order.total} />
                </dd>
              </div>
              <div>
                <dt>Paid</dt>
                <dd>
                  <Money value={order.paid} />
                </dd>
              </div>
              <div className={order.balance > 0 ? 'is-due' : ''}>
                <dt>Balance</dt>
                <dd>
                  <Money value={order.balance} strong />
                </dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <header className="card__head">
              <h2>Payments</h2>
              {order.status !== 'cancelled' && (
                <button type="button" className="abtn abtn--primary abtn--sm no-print" onClick={() => setPayOpen(true)}>
                  <Icon name="plus" size={16} /> Record payment
                </button>
              )}
            </header>
            {payments.length === 0 ? (
              <p className="muted">No payments recorded yet.</p>
            ) : (
              <ul className="rows">
                {payments.map((p) => (
                  <li key={p.id} className="row row--static">
                    <span className="row__main">
                      <strong>{formatINR(p.amount)}</strong> · {label(PAY_MODES, p.mode)}
                      <small>
                        {formatDate(p.paid_on)}
                        {p.reference ? ` · Ref ${p.reference}` : ''}
                        {p.note ? ` · ${p.note}` : ''}
                      </small>
                    </span>
                    <button
                      type="button"
                      className="icon-btn no-print"
                      aria-label="Delete payment"
                      onClick={async () => {
                        if (!window.confirm(`Delete payment of ${formatINR(p.amount)}?`)) return;
                        try {
                          await api.deletePayment(p.id);
                          toast('Payment deleted');
                          reload();
                        } catch (e) {
                          toast(e.message, 'error');
                        }
                      }}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="detail-side">
          <section className="card">
            <header className="card__head">
              <h2>Customer</h2>
              <Link to={`/admin/customers/${order.customer_id}`} className="alink no-print">
                Open →
              </Link>
            </header>
            <p className="cust-name">{order.shop_name}</p>
            <p className="muted">
              {[order.contact_name, order.city].filter(Boolean).join(' · ')}
              <br />
              {order.phone}
            </p>
            {snap.gstin && <p className="muted">GSTIN {snap.gstin}</p>}
            {snap.address && <p className="muted">{snap.address}</p>}
            <div className="btn-row no-print">
              <a className="abtn abtn--ghost abtn--sm" href={telLink(order.phone)}>
                <Icon name="phone" size={15} /> Call
              </a>
              <a className="abtn abtn--primary abtn--sm" href={waLink(order.phone, summaryText(order, groups))} target="_blank" rel="noopener noreferrer">
                <Icon name="chat" size={15} /> Send summary
              </a>
            </div>
          </section>

          {order.customer_note && (
            <section className="card">
              <header className="card__head">
                <h2>Customer&rsquo;s note</h2>
              </header>
              <p className="pre">{order.customer_note}</p>
            </section>
          )}
          {order.notes && (
            <section className="card">
              <header className="card__head">
                <h2>Internal note</h2>
              </header>
              <p className="pre">{order.notes}</p>
            </section>
          )}

          <button type="button" className="abtn abtn--danger abtn--sm no-print" onClick={remove} disabled={payments.length > 0} title={payments.length ? 'Delete its payments first' : undefined}>
            <Icon name="trash" size={15} /> Delete order
          </button>
        </aside>
      </div>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={`Payment for ${order.order_no}`}>
        <PaymentForm
          order={order}
          onCancel={() => setPayOpen(false)}
          onSaved={() => {
            setPayOpen(false);
            reload();
          }}
        />
      </Modal>
    </>
  );
}
