import { useState } from 'react';
import { api } from '../../lib/api/index.js';
import { SIZES, formatINR } from '../../lib/api/shape.js';
import { useAsync, useToast, PageHead, Loading, ErrorBox, Empty, Field, Modal, Link, Icon } from '../ui.jsx';

/** One stock cell: edit, press Enter or leave the field to save. */
function StockCell({ product, size, onSaved }) {
  const toast = useToast();
  const [val, setVal] = useState(String(product.stock[size]));
  const [state, setState] = useState('idle'); // idle | saving | saved | error
  const original = product.stock[size];

  const commit = async () => {
    const n = parseInt(val, 10);
    if (Number.isNaN(n) || n < 0) {
      setVal(String(original));
      return;
    }
    if (n === original) return;
    setState('saving');
    try {
      await api.setStock(product.pid, size, n, 'Stock count');
      setState('saved');
      onSaved(product.pid, size, n);
      setTimeout(() => setState('idle'), 1200);
    } catch (e) {
      setState('error');
      setVal(String(original));
      toast(e.message, 'error');
    }
  };

  const n = parseInt(val, 10) || 0;
  return (
    <label className={`stock-cell ${n === 0 ? 'is-zero' : n <= 5 ? 'is-low' : ''} is-${state}`}>
      <span>{size}</span>
      <input
        inputMode="numeric"
        value={val}
        onChange={(e) => setVal(e.target.value.replace(/\D/g, '').slice(0, 5))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setVal(String(original));
            e.currentTarget.blur();
          }
        }}
        onFocus={(e) => e.target.select()}
        aria-label={`D.No ${product.dno} size ${size} stock`}
      />
    </label>
  );
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function Categories({ categories, products, onChanged }) {
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const save = async (e) => {
    e.preventDefault();
    try {
      await api.saveCategory({ ...edit, id: edit.id || slugify(edit.name) });
      toast('Category saved');
      setEdit(null);
      onChanged();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  return (
    <details className="card cat-panel">
      <summary>
        <h2>Categories</h2>
        <span className="muted">{categories.length} fabric lines · tap to manage</span>
      </summary>
      <ul className="rows">
        {categories.map((c) => (
          <li key={c.id} className="row row--static">
            <span className="row__main">
              <strong>{c.name}</strong>
              <small>
                {products.filter((p) => p.category === c.id).length} designs · {c.blurb || 'no description'}
              </small>
            </span>
            <button type="button" className="icon-btn" aria-label={`Edit ${c.name}`} onClick={() => setEdit({ ...c })}>
              <Icon name="edit" size={16} />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setEdit({ id: '', name: '', blurb: '', cover: '', sort: categories.length })}>
        <Icon name="plus" size={15} /> Add category
      </button>
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? 'Edit category' : 'New category'}>
        {edit && (
          <form className="aform" onSubmit={save}>
            <div className="agrid">
              <Field label="Name *" full>
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required maxLength={60} autoFocus />
              </Field>
              <Field label="Short description" full>
                <input value={edit.blurb || ''} onChange={(e) => setEdit({ ...edit, blurb: e.target.value })} maxLength={140} />
              </Field>
              <Field label="Cover image" full hint="Pick a design whose photo represents this category">
                <select value={edit.cover || ''} onChange={(e) => setEdit({ ...edit, cover: e.target.value })}>
                  <option value="">— none —</option>
                  {products.map((p) => (
                    <option key={p.pid} value={p.model}>
                      D.No {p.dno} {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Order on website">
                <input type="number" value={edit.sort} onChange={(e) => setEdit({ ...edit, sort: e.target.value })} />
              </Field>
            </div>
            <div className="aform__actions">
              <button type="button" className="abtn abtn--ghost" onClick={() => setEdit(null)}>
                Cancel
              </button>
              <button className="abtn abtn--primary">Save</button>
            </div>
          </form>
        )}
      </Modal>
    </details>
  );
}

export default function ProductsList() {
  const { data, error, loading, reload } = useAsync(() => api.listProductsAdmin());
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [view, setView] = useState('all'); // all | low | zero | hidden
  const [local, setLocal] = useState({}); // optimistic stock edits

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const products = data.products.map((p) => (local[p.pid] ? { ...p, stock: { ...p.stock, ...local[p.pid] } } : p));
  const total = (p) => SIZES.reduce((a, s) => a + p.stock[s], 0);
  const t = q.trim().toLowerCase();
  const list = products
    .filter((p) => cat === 'all' || p.category === cat)
    .filter((p) => !t || String(p.dno).includes(t) || p.name.toLowerCase().includes(t))
    .filter((p) =>
      view === 'low'
        ? SIZES.some((s) => p.stock[s] > 0 && p.stock[s] <= 5)
        : view === 'zero'
          ? SIZES.some((s) => p.stock[s] === 0)
          : view === 'hidden'
            ? !p.isActive
            : true,
    );
  const grand = products.reduce((a, p) => a + total(p), 0);

  return (
    <>
      <PageHead
        title="Products & Stock"
        sub={`${products.length} designs · ${grand} pieces in stock. Type a number and press Enter to update stock.`}
        actions={
          <Link to="/admin/products/new" className="abtn abtn--primary">
            <Icon name="plus" size={16} /> Add design
          </Link>
        }
      />

      <div className="toolbar">
        <div className="toolbar__row">
          <label className="search">
            <Icon name="search" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search D.No or name" aria-label="Search designs" />
          </label>
          <select className="aselect" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="chips" role="group" aria-label="Stock filter">
          {[
            ['all', 'All'],
            ['low', 'Running low'],
            ['zero', 'A size at 0'],
            ['hidden', 'Hidden'],
          ].map(([id, l]) => (
            <button key={id} type="button" className="chip" aria-pressed={view === id} onClick={() => setView(id)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <Empty>No designs match.</Empty>
      ) : (
        <ul className="plist">
          {list.map((p) => (
            <li key={p.pid} className={`pitem ${p.isActive ? '' : 'is-hidden'}`}>
              <Link to={`/admin/products/${p.pid}`} className="pitem__info">
                <img src={p.model || p.thumb} alt="" width="44" height="66" loading="lazy" />
                <span className="cell-main">
                  <strong>D.No {p.dno}</strong>
                  <span>{p.name}</span>
                  <small>
                    {p.price != null ? `${formatINR(p.price)}/pc` : 'No rate set'}
                    {!p.isActive && ' · hidden'}
                  </small>
                </span>
              </Link>
              <div className="pitem__stock">
                {SIZES.map((s) => (
                  <StockCell
                    key={`${p.pid}-${s}-${data.products.find((x) => x.pid === p.pid).stock[s]}`}
                    product={p}
                    size={s}
                    onSaved={(pid, size, n) => setLocal((l) => ({ ...l, [pid]: { ...l[pid], [size]: n } }))}
                  />
                ))}
                <span className="pitem__total" aria-label="Total pieces">
                  {total(p)}
                  <small>total</small>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Categories categories={data.categories} products={data.products} onChanged={reload} />
    </>
  );
}
