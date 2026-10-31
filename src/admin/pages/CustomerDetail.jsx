import { api } from '../../lib/api/index.js';
import { PAY_MODES, formatDate, formatDateTime, formatINR, label } from '../../lib/api/shape.js';
import { business } from '../../data/business.js';
import { useAsync, PageHead, Loading, ErrorBox, Empty, StatusBadge, PayBadge, Money, Link, Icon, waLink, telLink } from '../ui.jsx';

export default function CustomerDetail({ id }) {
  const { data, error, loading, reload } = useAsync(() => api.getCustomer(id), [id]);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const { customer: c, orders, payments } = data;

  const dueOrders = orders.filter((o) => o.status !== 'cancelled' && o.balance > 0);
  const reminder = [
    `Namaste ${c.contact_name || c.shop_name},`,
    `This is a friendly reminder from ${business.name} about your pending balance of ${formatINR(c.balance)}.`,
    ...dueOrders.map((o) => `• ${o.order_no} (${formatDate(o.created_at)}): ${formatINR(o.balance)} due`),
    '',
    'Thank you!',
  ].join('\n');

  return (
    <>
      <PageHead
        back="/admin/customers"
        title={c.shop_name}
        sub={[c.contact_name, c.city, c.phone].filter(Boolean).join(' · ')}
        actions={
          <>
            <Link to={`/admin/customers/${c.id}/edit`} className="abtn abtn--ghost">
              <Icon name="edit" size={16} /> Edit
            </Link>
            <Link to={`/admin/orders/new?customer=${c.id}`} className="abtn abtn--primary">
              <Icon name="plus" size={16} /> New order
            </Link>
          </>
        }
      />

      <section className="kpis kpis--3">
        <div className="kpi">
          <span className="kpi__label">Billed</span>
          <strong className="kpi__value">
            <Money value={c.billed} />
          </strong>
          <span className="kpi__sub">{c.order_count} orders</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">Paid</span>
          <strong className="kpi__value">
            <Money value={c.paid} />
          </strong>
          <span className="kpi__sub">{payments.length} payments</span>
        </div>
        <div className={`kpi ${Number(c.balance) > 0 ? 'kpi--warn' : ''}`}>
          <span className="kpi__label">Balance due</span>
          <strong className="kpi__value">
            <Money value={c.balance} />
          </strong>
          <span className="kpi__sub">{dueOrders.length} orders with dues</span>
        </div>
      </section>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="card">
            <header className="card__head">
              <h2>Orders</h2>
            </header>
            {orders.length === 0 ? (
              <Empty>No orders yet.</Empty>
            ) : (
              <ul className="rows">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link to={`/admin/orders/${o.id}`} className="row">
                      <span className="row__main">
                        <strong>{o.order_no}</strong> · {o.pieces} pcs
                        <small>{formatDateTime(o.created_at)}</small>
                      </span>
                      <span className="row__end">
                        <Money value={o.total} />
                        <span className="row__badges">
                          <StatusBadge status={o.status} />
                          <PayBadge order={o} />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card">
            <header className="card__head">
              <h2>Payments</h2>
            </header>
            {payments.length === 0 ? (
              <p className="muted">No payments yet.</p>
            ) : (
              <ul className="rows">
                {payments.map((p) => (
                  <li key={p.id} className="row row--static">
                    <span className="row__main">
                      <strong>{formatINR(p.amount)}</strong> · {label(PAY_MODES, p.mode)} · {p.order_no}
                      <small>
                        {formatDate(p.paid_on)}
                        {p.reference ? ` · Ref ${p.reference}` : ''}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside className="detail-side">
          <section className="card">
            <header className="card__head">
              <h2>Contact</h2>
            </header>
            <p className="muted">
              {c.phone}
              {c.gstin && (
                <>
                  <br />
                  GSTIN {c.gstin}
                </>
              )}
              {c.address && (
                <>
                  <br />
                  {c.address}
                </>
              )}
            </p>
            {c.notes && <p className="pre">{c.notes}</p>}
            <div className="btn-row">
              <a className="abtn abtn--ghost abtn--sm" href={telLink(c.phone)}>
                <Icon name="phone" size={15} /> Call
              </a>
              <a className="abtn abtn--ghost abtn--sm" href={waLink(c.phone, `Namaste ${c.contact_name || ''}`.trim())} target="_blank" rel="noopener noreferrer">
                <Icon name="chat" size={15} /> WhatsApp
              </a>
            </div>
            {Number(c.balance) > 0 && (
              <a className="abtn abtn--primary abtn--sm full" href={waLink(c.phone, reminder)} target="_blank" rel="noopener noreferrer">
                <Icon name="chat" size={15} /> Send dues reminder
              </a>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
