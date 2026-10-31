import { useEffect, useState } from 'react';
import { api } from '../../lib/api/index.js';
import { SIZES, formatDateTime } from '../../lib/api/shape.js';
import { useAsync, useToast, PageHead, Loading, ErrorBox, Field, Icon, navigate } from '../ui.jsx';

const blank = {
  pid: null,
  dno: '',
  colour: '',
  name: '',
  category: '',
  fabric: '',
  pieces: 3,
  bottom: '',
  dupatta: '',
  sizes: 'M to XXL',
  description: '',
  price: '',
  isActive: true,
  sort: 0,
  image: '',
  thumb: '',
  model: '',
};

export default function ProductEditor({ id }) {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(async () => {
    const res = await api.listProductsAdmin();
    const history = id ? await api.stockHistory(id) : [];
    return { ...res, history };
  }, [id]);
  const [f, setF] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [catalogCard, setCatalogCard] = useState(true);
  const [stock, setStock] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!data || f) return;
    if (id) {
      const p = data.products.find((x) => x.pid === id);
      if (p) {
        setF({ ...blank, ...p, price: p.price ?? '' });
        setStock(Object.fromEntries(SIZES.map((s) => [s, String(p.stock[s])])));
      }
    } else {
      const maxSort = Math.max(0, ...data.products.map((p) => p.sort));
      setF({ ...blank, category: data.categories[0]?.id || '', sort: maxSort + 1 });
      setStock(Object.fromEntries(SIZES.map((s) => [s, '0'])));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!f) return id ? <ErrorBox error={new Error('Design not found')} /> : <Loading />;

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const suggestedName = [f.colour, f.fabric].filter(Boolean).join(' ');

  const save = async (e) => {
    e.preventDefault();
    setErr('');
    if (!f.dno) return setErr('Enter the D.No.');
    if (!f.name.trim() && !suggestedName) return setErr('Enter a name.');
    if (!id && !file) return setErr('Choose the catalogue image for this design.');
    setBusy(true);
    try {
      let images = {};
      if (file) images = await api.uploadProductImages(file, f.dno, { catalogCard });
      const pid = await api.saveProduct({ ...f, name: f.name.trim() || suggestedName, ...images });
      // Save any stock changes
      const before = id ? data.products.find((x) => x.pid === id).stock : Object.fromEntries(SIZES.map((s) => [s, 0]));
      for (const s of SIZES) {
        const n = parseInt(stock[s], 10) || 0;
        if (n !== before[s]) await api.setStock(pid, s, n, id ? 'Stock count' : 'Opening stock');
      }
      toast(id ? 'Design updated' : 'Design added');
      navigate('/admin/products');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const img = preview || f.thumb || f.image;

  return (
    <>
      <PageHead back="/admin/products" title={id ? `D.No ${f.dno}` : 'Add design'} sub={id ? f.name : 'Upload the catalogue card and fill in the details.'} />
      <form className="editor product-editor" onSubmit={save}>
        <section className="card pe-image">
          <header className="card__head">
            <h2>Catalogue image</h2>
          </header>
          <div className="pe-image__box">
            {img ? <img src={img} alt="Catalogue card preview" /> : <span className="muted">No image yet</span>}
          </div>
          <label className="abtn abtn--ghost file-btn">
            <Icon name="plus" size={16} /> {img ? 'Replace image' : 'Choose image'}
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          {file && (
            <label className="check">
              <input type="checkbox" checked={catalogCard} onChange={(e) => setCatalogCard(e.target.checked)} />
              Standard catalogue card — crop the model photo from the left panel
            </label>
          )}
          <p className="muted small">Images are resized and converted to WebP automatically.</p>
        </section>

        <section className="card">
          <header className="card__head">
            <h2>Details</h2>
          </header>
          <div className="agrid">
            <Field label="D.No *">
              <input inputMode="numeric" value={f.dno} onChange={(e) => setF((x) => ({ ...x, dno: e.target.value.replace(/\D/g, '').slice(0, 6) }))} required />
            </Field>
            <Field label="Category">
              <select value={f.category || ''} onChange={set('category')}>
                <option value="">— none —</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Colour">
              <input value={f.colour || ''} onChange={set('colour')} maxLength={40} placeholder="e.g. Azure Blue" />
            </Field>
            <Field label="Fabric / set name">
              <input value={f.fabric || ''} onChange={set('fabric')} maxLength={60} placeholder="e.g. Roman Glass Palazzo Set" />
            </Field>
            <Field label="Display name" full hint={suggestedName && !f.name ? `Leave empty to use “${suggestedName}”` : undefined}>
              <input value={f.name} onChange={set('name')} maxLength={90} placeholder={suggestedName} />
            </Field>
            <Field label="Bottom">
              <input value={f.bottom || ''} onChange={set('bottom')} maxLength={60} placeholder="e.g. Palazzo with pocket" />
            </Field>
            <Field label="Dupatta">
              <input value={f.dupatta || ''} onChange={set('dupatta')} maxLength={60} placeholder="e.g. Jacquard dupatta" />
            </Field>
            <Field label="Pieces in set">
              <input type="number" min="1" max="9" value={f.pieces} onChange={set('pieces')} />
            </Field>
            <Field label="Size range text">
              <input value={f.sizes || ''} onChange={set('sizes')} maxLength={30} placeholder="M to XXL" />
            </Field>
            <Field label="Description" full>
              <textarea value={f.description || ''} onChange={set('description')} rows={2} maxLength={300} />
            </Field>
            <Field label="Wholesale rate (₹ per piece)" hint="Leave empty to show “rate on request”">
              <input inputMode="decimal" value={f.price} onChange={(e) => setF((x) => ({ ...x, price: e.target.value.replace(/[^\d.]/g, '') }))} />
            </Field>
            <Field label="Position on website" hint="Lower numbers show first">
              <input type="number" value={f.sort} onChange={set('sort')} />
            </Field>
            <label className="check af--full">
              <input type="checkbox" checked={f.isActive} onChange={set('isActive')} />
              Show this design on the website
            </label>
          </div>
        </section>

        <section className="card">
          <header className="card__head">
            <h2>Stock (pieces ready)</h2>
          </header>
          <div className="pe-stock">
            {SIZES.map((s) => (
              <Field key={s} label={s}>
                <input inputMode="numeric" value={stock[s]} onChange={(e) => setStock((x) => ({ ...x, [s]: e.target.value.replace(/\D/g, '').slice(0, 5) }))} onFocus={(e) => e.target.select()} />
              </Field>
            ))}
          </div>
          {id && data.history.length > 0 && (
            <details className="history">
              <summary>Stock history ({data.history.length})</summary>
              <ul className="rows">
                {data.history.map((m) => (
                  <li key={m.id} className="row row--static">
                    <span className="row__main">
                      <strong className={m.change > 0 ? 'pos' : 'neg'}>
                        {m.change > 0 ? '+' : ''}
                        {m.change}
                      </strong>{' '}
                      size {m.size}
                      <small>
                        {formatDateTime(m.created_at)} · {m.reason}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        {err && (
          <p className="aerror" role="alert">
            {err}
          </p>
        )}
        <div className="sticky-actions">
          <button type="button" className="abtn abtn--ghost" onClick={() => navigate('/admin/products')}>
            Cancel
          </button>
          <button className="abtn abtn--primary" disabled={busy}>
            {busy ? (file ? 'Uploading…' : 'Saving…') : id ? 'Save changes' : 'Add design'}
          </button>
        </div>
      </form>
    </>
  );
}
