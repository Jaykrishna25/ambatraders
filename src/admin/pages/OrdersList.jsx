import { useState } from 'react';
import { api } from '../../lib/api/index.js';
import { ORDER_STATUSES, SOURCES, formatDateTime, label } from '../../lib/api/shape.js';
import { useAsync, PageHead, Loading, ErrorBox, Empty, StatusBadge, PayBadge, Money, Link, Icon, navigate } from '../ui.jsx';

export default function OrdersList() {
  const params = new URLSearchParams(window.location.search);
  const [status, setStatus] = useState(params.get('status') || 'all');
  const [source, setSource] = useState('all');
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useAsync(() => api.listOrders({}));

  const setStatusUrl = (s) => {
    setStatus(s);
    navigate(s === 'all' ? '/admin/orders' : `/admin/orders?status=${s}`, { replace: true });
  };

  const all = data || [];
  const t = q.trim().toLowerCase();
  const list = all
    .filter((o) => status === 'all' || o.status === status)
    .filter((o) => source === 'all' || o.source === source)
    .filter((o) => !t || [o.order_no, o.shop_name, o.phone, o.city].some((v) => v?.toLowerCase().includes(t)));

  return (
    <>
      <PageHead
        title="Orders"
        sub="Website orders arrive as New. Confirming an order deducts its stock."
        actions={
          <Link to="/admin/orders/new" className="abtn abtn--primary">
            <Icon name="plus" size={16} /> New order
          </Link>
        }
      />

      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter by status">
          {[{ id: 'all', label: 'All' }, ...ORDER_STATUSES].map((s) => {
            const n = s.id === 'all' ? all.length : all.filter((o) => o.status === s.id).length;
            return (
              <button key={s.id} type="button" className="chip" aria-pressed={status === s.id} onClick={() => setStatusUrl(s.id)}>
                {s.label} <span>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="toolbar__row">
          <label className="search">
            <Icon name="search" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order no, shop, phone, city" aria-label="Search orders" />
          </label>
          <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by source" className="aselect">
            <option value="all">All sources</option>
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <Empty>{all.length ? 'No orders match these filters.' : 'No orders yet.'}</Empty>
      ) : (
        <div className="table" role="table" aria-label="Orders">
          <div className="table__head" role="row">
            <span role="columnheader">Order</span>
            <span role="columnheader">Customer</span>
            <span role="columnheader">Source</span>
            <span role="columnheader" className="num">
              Pcs
            </span>
            <span role="columnheader" className="num">
              Total
            </span>
            <span role="columnheader" className="num">
              Balance
            </span>
            <span role="columnheader">Status</span>
          </div>
          {list.map((o) => (
            <Link key={o.id} to={`/admin/orders/${o.id}`} className="table__row" role="row">
              <span role="cell" className="cell-main">
                <strong>{o.order_no}</strong>
                <small>{formatDateTime(o.created_at)}</small>
              </span>
              <span role="cell" className="cell-main">
                {o.shop_name}
                <small>
                  {o.city || ''} {o.phone}
                </small>
              </span>
              <span role="cell" className="cell-muted">
                {label(SOURCES, o.source)}
              </span>
              <span role="cell" className="num" data-label="Pieces">
                {o.pieces}
              </span>
              <span role="cell" className="num" data-label="Total">
                <Money value={o.total} />
              </span>
              <span role="cell" className={`num ${o.balance > 0 && o.status !== 'cancelled' ? 'is-due' : ''}`} data-label="Balance">
                {o.status === 'cancelled' ? '—' : <Money value={o.balance} />}
              </span>
              <span role="cell" className="row__badges">
                <StatusBadge status={o.status} />
                <PayBadge order={o} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
