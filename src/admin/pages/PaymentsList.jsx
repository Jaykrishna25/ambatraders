import { useState } from 'react';
import { api } from '../../lib/api/index.js';
import { PAY_MODES, formatDate, formatINR, label } from '../../lib/api/shape.js';
import { useAsync, useToast, PageHead, Loading, ErrorBox, Empty, Money, Modal, Field, Link, Icon, todayISO } from '../ui.jsx';
import { PaymentForm } from './OrderDetail.jsx';

const monthStart = () => todayISO().slice(0, 8) + '01';

function RecordPayment({ onDone }) {
  const { data, loading } = useAsync(() => api.listOrders({}));
  const [orderId, setOrderId] = useState('');
  if (loading) return <Loading />;
  const open = (data || []).filter((o) => o.status !== 'cancelled' && o.balance > 0);
  const order = open.find((o) => o.id === orderId);
  return (
    <div className="aform">
      <Field label="Order" full>
        <select value={orderId} onChange={(e) => setOrderId(e.target.value)} autoFocus>
          <option value="">Choose an order with balance due…</option>
          {open.map((o) => (
            <option key={o.id} value={o.id}>
              {o.order_no} · {o.shop_name} · {formatINR(o.balance)} due
            </option>
          ))}
        </select>
      </Field>
      {open.length === 0 && <p className="muted">No orders have a balance due.</p>}
      {order && <PaymentForm key={order.id} order={order} onCancel={onDone} onSaved={onDone} />}
    </div>
  );
}

export default function PaymentsList() {
  const toast = useToast();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState('');
  const [open, setOpen] = useState(false);
  const { data, error, loading, reload } = useAsync(() => api.listPayments({ from: from || undefined, to: to || undefined }), [from, to]);

  const list = data || [];
  const total = list.reduce((a, p) => a + Number(p.amount), 0);
  const byMode = PAY_MODES.map((m) => ({ ...m, sum: list.filter((p) => p.mode === m.id).reduce((a, p) => a + Number(p.amount), 0) })).filter((m) => m.sum > 0);

  return (
    <>
      <PageHead
        title="Payments"
        sub="Every payment is linked to an order, so balances stay correct."
        actions={
          <button type="button" className="abtn abtn--primary" onClick={() => setOpen(true)}>
            <Icon name="plus" size={16} /> Record payment
          </button>
        }
      />
      <div className="toolbar">
        <div className="toolbar__row">
          <label className="af af--inline">
            <span className="af__label">From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="af af--inline">
            <span className="af__label">To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button
            type="button"
            className="chip"
            onClick={() => {
              setFrom('');
              setTo('');
            }}
          >
            All time
          </button>
        </div>
      </div>

      <section className="kpis kpis--3">
        <div className="kpi">
          <span className="kpi__label">Received</span>
          <strong className="kpi__value">
            <Money value={total} />
          </strong>
          <span className="kpi__sub">{list.length} payments</span>
        </div>
        {byMode.slice(0, 2).map((m) => (
          <div key={m.id} className="kpi">
            <span className="kpi__label">{m.label}</span>
            <strong className="kpi__value">
              <Money value={m.sum} />
            </strong>
          </div>
        ))}
      </section>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <Empty>No payments in this period.</Empty>
      ) : (
        <ul className="rows card">
          {list.map((p) => (
            <li key={p.id} className="row row--static">
              <span className="row__main">
                <strong>{formatINR(p.amount)}</strong> · {label(PAY_MODES, p.mode)} · {p.shop_name}
                <small>
                  {formatDate(p.paid_on)} · <Link to={`/admin/orders/${p.order_id}`}>{p.order_no}</Link>
                  {p.reference ? ` · Ref ${p.reference}` : ''}
                  {p.note ? ` · ${p.note}` : ''}
                </small>
              </span>
              <button
                type="button"
                className="icon-btn"
                aria-label="Delete payment"
                onClick={async () => {
                  if (!window.confirm(`Delete payment of ${formatINR(p.amount)} from ${p.shop_name}?`)) return;
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

      <Modal open={open} onClose={() => setOpen(false)} title="Record payment">
        <RecordPayment
          onDone={() => {
            setOpen(false);
            reload();
          }}
        />
      </Modal>
    </>
  );
}
