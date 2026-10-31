import { api } from '../../lib/api/index.js';
import { SIZES, formatDateTime, label, SOURCES } from '../../lib/api/shape.js';
import { useAsync, PageHead, Loading, ErrorBox, Empty, StatusBadge, PayBadge, Money, Link, Icon } from '../ui.jsx';

const LOW = 5; // a size with 1–5 pieces counts as running low

export default function Dashboard() {
  const { data, error, loading, reload } = useAsync(() => api.dashboard());
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const since = data.since;
  const month = data.orders.filter((o) => o.created_at >= since && o.status !== 'cancelled');
  const newOrders = data.orders.filter((o) => o.status === 'new');
  const toDispatch = data.orders.filter((o) => o.status === 'confirmed' || o.status === 'packed');
  const sales = month.reduce((a, o) => a + Number(o.total), 0);
  const received = data.paymentsThisMonth.reduce((a, p) => a + Number(p.amount), 0);
  const dues = data.balances.reduce((a, c) => a + Math.max(0, Number(c.balance)), 0);
  const low = [];
  let noStock = 0;
  data.products.forEach((p) => {
    const total = SIZES.reduce((a, s) => a + p.stock[s], 0);
    if (total === 0) noStock++;
    const lowSizes = SIZES.filter((s) => p.stock[s] > 0 && p.stock[s] <= LOW);
    if (lowSizes.length) low.push({ p, lowSizes });
  });
  const monthName = new Date(since).toLocaleDateString('en-IN', { month: 'long' });

  return (
    <>
      <PageHead
        title="Dashboard"
        sub={`Overview for ${monthName}`}
        actions={
          <Link to="/admin/orders/new" className="abtn abtn--primary">
            <Icon name="plus" size={16} /> New order
          </Link>
        }
      />

      <section className="kpis" aria-label="Key numbers">
        <Link to="/admin/orders?status=new" className={`kpi ${newOrders.length ? 'kpi--alert' : ''}`}>
          <span className="kpi__label">New orders to review</span>
          <strong className="kpi__value">{newOrders.length}</strong>
          <span className="kpi__sub">{newOrders.filter((o) => o.source === 'website').length} from website</span>
        </Link>
        <Link to="/admin/orders?status=confirmed" className="kpi">
          <span className="kpi__label">To pack / dispatch</span>
          <strong className="kpi__value">{toDispatch.length}</strong>
          <span className="kpi__sub">confirmed or packed</span>
        </Link>
        <div className="kpi">
          <span className="kpi__label">Order value in {monthName}</span>
          <strong className="kpi__value">
            <Money value={sales} />
          </strong>
          <span className="kpi__sub">{month.length} {month.length === 1 ? 'order' : 'orders'} (not cancelled)</span>
        </div>
        <Link to="/admin/payments" className="kpi">
          <span className="kpi__label">Received in {monthName}</span>
          <strong className="kpi__value">
            <Money value={received} />
          </strong>
          <span className="kpi__sub">
            {data.paymentsThisMonth.length} {data.paymentsThisMonth.length === 1 ? 'payment' : 'payments'}
          </span>
        </Link>
        <Link to="/admin/customers?dues=1" className={`kpi ${dues > 0 ? 'kpi--warn' : ''}`}>
          <span className="kpi__label">Outstanding dues</span>
          <strong className="kpi__value">
            <Money value={dues} />
          </strong>
          <span className="kpi__sub">
            {(() => {
              const n = data.balances.filter((c) => Number(c.balance) > 0).length;
              return `${n} ${n === 1 ? 'customer' : 'customers'}`;
            })()}
          </span>
        </Link>
        <Link to="/admin/products" className="kpi">
          <span className="kpi__label">Stock alerts</span>
          <strong className="kpi__value">{low.length}</strong>
          <span className="kpi__sub">
            running low · {noStock} with no stock
          </span>
        </Link>
      </section>

      <div className="dash-grid">
        <section className="card">
          <header className="card__head">
            <h2>Latest orders</h2>
            <Link to="/admin/orders" className="alink">
              All orders →
            </Link>
          </header>
          {data.orders.length === 0 ? (
            <Empty
              action={
                <Link to="/admin/orders/new" className="abtn abtn--ghost abtn--sm">
                  Log a WhatsApp order
                </Link>
              }
            >
              No orders yet. Website orders will appear here automatically.
            </Empty>
          ) : (
            <ul className="rows">
              {data.orders.slice(0, 8).map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`} className="row">
                    <span className="row__main">
                      <strong>{o.order_no}</strong> · {o.shop_name}
                      <small>
                        {formatDateTime(o.created_at)} · {label(SOURCES, o.source)} · {o.pieces} pcs
                      </small>
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
            <h2>Running low</h2>
            <Link to="/admin/products" className="alink">
              Update stock →
            </Link>
          </header>
          {low.length === 0 ? (
            <Empty>
              {noStock === data.products.length
                ? 'No stock entered yet. Open Products & Stock to add ready stock per size.'
                : `Nothing is running low (${LOW} or fewer pieces in a size).`}
            </Empty>
          ) : (
            <ul className="rows">
              {low.slice(0, 10).map(({ p, lowSizes }) => (
                <li key={p.pid}>
                  <Link to={`/admin/products/${p.pid}`} className="row">
                    <span className="row__main">
                      <strong>D.No {p.dno}</strong> {p.name}
                    </span>
                    <span className="row__end">
                      {lowSizes.map((s) => (
                        <span key={s} className="mini-stock is-low">
                          {s} {p.stock[s]}
                        </span>
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
