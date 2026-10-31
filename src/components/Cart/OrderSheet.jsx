import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/ui.jsx';
import { useCart } from '../../lib/cart.jsx';
import { SIZES, formatINR } from '../../lib/api/shape.js';
import './Cart.css';

/** Pick quantities per size for one design. */
export default function OrderSheet() {
  const cart = useCart();
  const product = cart.sheetProduct;
  const ref = useRef(null);
  const [qty, setQty] = useState({});

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (product) {
      setQty(cart.quantitiesFor(product.pid));
      if (!d.open) d.showModal();
    } else if (d.open) d.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const pieces = SIZES.reduce((a, s) => a + (parseInt(qty[s], 10) || 0), 0);
  const hadBefore = product ? cart.designs.some((d) => d.pid === product.pid) : false;
  const over = product?.stock ? SIZES.filter((s) => (parseInt(qty[s], 10) || 0) > (product.stock[s] || 0)) : [];

  const bump = (s, d) => setQty((q) => ({ ...q, [s]: Math.max(0, Math.min(5000, (parseInt(q[s], 10) || 0) + d)) }));
  const addSet = (n) => setQty((q) => Object.fromEntries(SIZES.map((s) => [s, Math.min(5000, (parseInt(q[s], 10) || 0) + n)])));

  const submit = (e) => {
    e.preventDefault();
    cart.setDesign(product.pid, qty);
    cart.closeSheet();
    if (pieces > 0) cart.openCart();
  };

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="sheet-title" onClose={cart.closeSheet} onClick={(e) => e.target === ref.current && cart.closeSheet()}>
      {product && (
        <form className="sheet__panel" onSubmit={submit}>
          <header className="sheet__head">
            <img src={product.model || product.thumb} alt="" width="72" height="110" />
            <div>
              <p className="sheet__dno">D.No {product.dno}</p>
              <h2 id="sheet-title">{product.name}</h2>
              <p className="sheet__meta">
                {product.price != null ? `${formatINR(product.price)} per piece` : 'Rate confirmed on order'}
                {product.sizes ? ` · ${product.sizes}` : ''}
              </p>
            </div>
            <button type="button" className="sheet__x" onClick={cart.closeSheet} aria-label="Close">
              <Icon name="close" size={20} />
            </button>
          </header>

          <div className="sheet__quick">
            <span>Quick add</span>
            <button type="button" className="chip-btn" onClick={() => addSet(1)}>
              +1 full set (M–XXL)
            </button>
            <button type="button" className="chip-btn" onClick={() => addSet(5)}>
              +5 sets
            </button>
          </div>

          <fieldset className="sizes">
            <legend className="sr-only">Quantity per size</legend>
            {SIZES.map((s) => {
              const ready = product.stock?.[s] ?? null;
              return (
                <div key={s} className="size-row">
                  <label htmlFor={`q-${s}`} className="size-row__label">
                    <strong>{s}</strong>
                    {ready != null && (
                      <span className={ready > 0 ? 'is-in' : 'is-req'}>{ready > 0 ? `${ready} ready` : 'On request'}</span>
                    )}
                  </label>
                  <div className="stepper">
                    <button type="button" onClick={() => bump(s, -1)} aria-label={`One less ${s}`}>
                      −
                    </button>
                    <input
                      id={`q-${s}`}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="5000"
                      value={qty[s] || ''}
                      placeholder="0"
                      onChange={(e) => setQty((q) => ({ ...q, [s]: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    />
                    <button type="button" onClick={() => bump(s, 1)} aria-label={`One more ${s}`}>
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </fieldset>

          {over.length > 0 && (
            <p className="sheet__note">
              More than ready stock in {over.join(', ')} — we&rsquo;ll confirm availability and timing when we reply.
            </p>
          )}

          <footer className="sheet__foot">
            <p>
              <strong>{pieces}</strong> {pieces === 1 ? 'piece' : 'pieces'}
              {product.price != null && pieces > 0 && <span> · {formatINR(pieces * product.price)}</span>}
            </p>
            <button type="submit" className="btn btn--primary" disabled={pieces === 0 && !hadBefore}>
              {pieces === 0 && hadBefore ? 'Remove from order' : hadBefore ? 'Update order' : 'Add to order'}
            </button>
          </footer>
        </form>
      )}
    </dialog>
  );
}
