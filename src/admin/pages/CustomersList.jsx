import { useState } from 'react';
import { api } from '../../lib/api/index.js';
import { formatDate } from '../../lib/api/shape.js';
import { useAsync, PageHead, Loading, ErrorBox, Empty, Money, Link, Icon } from '../ui.jsx';

export default function CustomersList() {
  const [q, setQ] = useState('');
  const [duesOnly, setDuesOnly] = useState(new URLSearchParams(window.location.search).get('dues') === '1');
  const { data, error, loading, reload } = useAsync(() => api.listCustomers());

  const all = data || [];
  const t = q.trim().toLowerCase();
  const list = all
    .filter((c) => !duesOnly || Number(c.balance) > 0)
    .filter((c) => !t || [c.shop_name, c.phone, c.city, c.contact_name].some((v) => v?.toLowerCase().includes(t)))
    .sort((a, b) => (duesOnly ? Number(b.balance) - Number(a.balance) : a.shop_name.localeCompare(b.shop_name)));
  const totalDue = all.reduce((a, c) => a + Math.max(0, Number(c.balance)), 0);

  return (
    <>
      <PageHead
        title="Customers"
        sub={`${all.length} buyers · ${Number(totalDue) > 0 ? `dues outstanding` : 'no dues outstanding'}`}
        actions={
          <Link to="/admin/customers/new" className="abtn abtn--primary">
            <Icon name="plus" size={16} /> Add customer
          </Link>
        }
      />
      <div className="toolbar">
        <div className="toolbar__row">
          <label className="search">
            <Icon name="search" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shop, phone, city" aria-label="Search customers" />
          </label>
          <button type="button" className="chip" aria-pressed={duesOnly} onClick={() => setDuesOnly((d) => !d)}>
            With dues · <Money value={totalDue} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <Empty>{all.length ? 'No customers match.' : 'No customers yet. Website buyers are added automatically when they order.'}</Empty>
      ) : (
        <div className="table table--cust" role="table" aria-label="Customers">
          <div className="table__head" role="row">
            <span role="columnheader">Shop</span>
            <span role="columnheader">Phone</span>
            <span role="columnheader" className="num">
              Orders
            </span>
            <span role="columnheader" className="num">
              Billed
            </span>
            <span role="columnheader" className="num">
              Paid
            </span>
            <span role="columnheader" className="num">
              Balance
            </span>
          </div>
          {list.map((c) => (
            <Link key={c.id} to={`/admin/customers/${c.id}`} className="table__row" role="row">
              <span role="cell" className="cell-main">
                <strong>{c.shop_name}</strong>
                <small>
                  {[c.contact_name, c.city].filter(Boolean).join(' · ')}
                  {c.last_order_at ? ` · last order ${formatDate(c.last_order_at)}` : ''}
                </small>
              </span>
              <span role="cell" className="cell-muted">
                {c.phone}
              </span>
              <span role="cell" className="num" data-label="Orders">
                {c.order_count}
              </span>
              <span role="cell" className="num" data-label="Billed">
                <Money value={c.billed} />
              </span>
              <span role="cell" className="num" data-label="Paid">
                <Money value={c.paid} />
              </span>
              <span role="cell" className={`num ${Number(c.balance) > 0 ? 'is-due' : ''}`} data-label="Balance">
                <Money value={c.balance} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
