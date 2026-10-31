import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/ui.jsx';
import { useCart } from '../../lib/cart.jsx';
import { api, isDemo } from '../../lib/api/index.js';
import { SIZES, formatINR, normalizePhone } from '../../lib/api/shape.js';
import { business } from '../../data/business.js';
import { whatsappHref } from '../../lib/contact.js';
import './Cart.css';

const FORM_KEY = 'amba-buyer-v1';
const emptyForm = { shop_name: '', contact_name: '', phone: '', city: '', gstin: '', address: '', note: '' };
const loadForm = () => {
  try {
    return { ...emptyForm, ...JSON.parse(localStorage.getItem(FORM_KEY) || '{}'), note: '' };
  } catch {
    return emptyForm;
  }
};

function orderMessage(orderNo, designs, form) {
  const lines = designs.map((d) => {
    const sizes = SIZES.filter((s) => d.sizes[s]).map((s) => `${s}×${d.sizes[s]}`).join(', ');
    return `• D.No ${d.product.dno} ${d.product.name}: ${sizes} (${d.pieces} pcs)`;
  });
  const out = [`Hello Amba Traders, I placed order ${orderNo} on your website.`, '', ...lines, ''];
  out.push(`Shop: ${form.shop_name}${form.city ? `, ${form.city}` : ''}`);
  if (form.contact_name) out.push(`Name: ${form.contact_name}`);
  if (form.note) out.push(`Note: ${form.note}`);
  return out.join('\n');
}

export default function CartDrawer() {
  const cart = useCart();
  const ref = useRef(null);
  const [step, setStep] = useState('cart'); // cart | details | done
  const [form, setForm] = useState(loadForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (cart.cartOpen && !d.open) {
      setError('');
      if (step === 'done') setStep('cart');
      d.showModal();
    }
    if (!cart.cartOpen && d.open) d.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.cartOpen]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.shop_name.trim()) return setError('Please enter your shop name.');
    if (normalizePhone(form.phone).length !== 10) return setError('Please enter a valid 10-digit mobile number.');
    setBusy(true);
    try {
      const { note, ...customer } = form;
      const { orderNo } = await api.placeOrder({ customer, items: cart.lines, note });
      try {
        localStorage.setItem(FORM_KEY, JSON.stringify({ ...customer }));
      } catch {
        // ignore
      }
      setDone({ orderNo, message: orderMessage(orderNo, cart.designs, form), pieces: cart.pieces });
      cart.clear();
      setForm((f) => ({ ...f, note: '' }));
      setStep('done');
    } catch (err) {
      setError(err.message || 'Could not place the order. Please try again or WhatsApp us.');
    } finally {
      setBusy(false);
    }
  };

  const empty = cart.designs.length === 0;

  return (
    <dialog ref={ref} className="drawer" aria-labelledby="drawer-title" onClose={cart.closeCart} onClick={(e) => e.target === ref.current && cart.closeCart()}>
      <div className="drawer__panel">
        <header className="drawer__head">
          <h2 id="drawer-title">
            {step === 'done' ? 'Order sent' : step === 'details' ? 'Your details' : 'Your order'}
          </h2>
          <button type="button" className="sheet__x" onClick={cart.closeCart} aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </header>

        {step === 'done' && done && (
          <div className="drawer__body drawer__done">
            <div className="done-mark" aria-hidden="true">
              ✓
            </div>
            <p className="done-no">{done.orderNo}</p>
            <p>
              Your order for <strong>{done.pieces} pieces</strong> has reached Amba Traders. We&rsquo;ll confirm availability,
              rates and dispatch with you on WhatsApp or a call.
            </p>
            {isDemo && <p className="drawer__demo">Demo mode — this order is saved only in this browser.</p>}
            <a className="btn btn--primary" href={whatsappHref(done.message)} target="_blank" rel="noopener noreferrer">
              <Icon name="chat" size={18} /> Also send on WhatsApp
            </a>
            <button type="button" className="btn btn--ghost" onClick={cart.closeCart}>
              Continue browsing
            </button>
          </div>
        )}

        {step === 'cart' && (
          <>
            <div className="drawer__body">
              {empty ? (
                <div className="drawer__empty">
                  <p>Your order is empty.</p>
                  <a href="#products" className="btn btn--ghost" onClick={cart.closeCart}>
                    Browse designs
                  </a>
                </div>
              ) : (
                <ul className="cart-list">
                  {cart.designs.map((d) => (
                    <li key={d.pid} className="cart-item">
                      <img src={d.product.model || d.product.thumb} alt="" width="56" height="86" />
                      <div className="cart-item__main">
                        <p className="cart-item__name">
                          <span>D.No {d.product.dno}</span> {d.product.name}
                        </p>
                        <ul className="cart-item__sizes">
                          {SIZES.filter((s) => d.sizes[s]).map((s) => (
                            <li key={s}>
                              {s} <strong>× {d.sizes[s]}</strong>
                            </li>
                          ))}
                        </ul>
                        <p className="cart-item__sum">
                          {d.pieces} pcs
                          {d.product.price != null && ` · ${formatINR(d.pieces * d.product.price)}`}
                        </p>
                      </div>
                      <div className="cart-item__actions">
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => {
                            cart.closeCart();
                            cart.openSheet(d.product);
                          }}
                        >
                          Edit
                        </button>
                        <button type="button" className="link-btn" onClick={() => cart.removeDesign(d.pid)} aria-label={`Remove D.No ${d.product.dno}`}>
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {!empty && (
              <footer className="drawer__foot">
                <div className="drawer__totals">
                  <span>
                    {cart.designs.length} {cart.designs.length === 1 ? 'design' : 'designs'} · <strong>{cart.pieces} pcs</strong>
                  </span>
                  <span>{cart.allPriced ? formatINR(cart.total) : 'Rates confirmed by Amba Traders'}</span>
                </div>
                <button type="button" className="btn btn--primary" onClick={() => setStep('details')}>
                  Continue <Icon name="arrow" size={18} />
                </button>
              </footer>
            )}
          </>
        )}

        {step === 'details' && (
          <form className="drawer__form" onSubmit={submit} noValidate>
            <div className="drawer__body">
              <p className="drawer__intro">
                No payment now. Amba Traders will confirm stock, rates and dispatch with you before anything is billed.
              </p>
              <div className="fgrid">
                <label className="field field--full">
                  <span>Shop / business name *</span>
                  <input value={form.shop_name} onChange={set('shop_name')} autoComplete="organization" required maxLength={120} />
                </label>
                <label className="field">
                  <span>Your name</span>
                  <input value={form.contact_name} onChange={set('contact_name')} autoComplete="name" maxLength={80} />
                </label>
                <label className="field">
                  <span>Mobile (WhatsApp) *</span>
                  <input value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" autoComplete="tel" required maxLength={16} />
                </label>
                <label className="field">
                  <span>City</span>
                  <input value={form.city} onChange={set('city')} autoComplete="address-level2" maxLength={80} />
                </label>
                <label className="field">
                  <span>GSTIN (optional)</span>
                  <input value={form.gstin} onChange={set('gstin')} maxLength={15} style={{ textTransform: 'uppercase' }} />
                </label>
                <label className="field field--full">
                  <span>Delivery address / transport</span>
                  <textarea value={form.address} onChange={set('address')} rows={2} maxLength={300} />
                </label>
                <label className="field field--full">
                  <span>Note for Amba Traders</span>
                  <textarea value={form.note} onChange={set('note')} rows={2} maxLength={1000} placeholder="Delivery date, colour changes, transport name…" />
                </label>
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <footer className="drawer__foot">
              <div className="drawer__totals">
                <button type="button" className="link-btn" onClick={() => setStep('cart')}>
                  ← Back to order
                </button>
                <span>
                  <strong>{cart.pieces} pcs</strong>
                  {cart.allPriced ? ` · ${formatINR(cart.total)}` : ''}
                </span>
              </div>
              <button type="submit" className="btn btn--primary" disabled={busy || empty}>
                {busy ? 'Sending…' : 'Place order'}
              </button>
              <p className="drawer__fine">
                Questions? Call {business.contacts[0]?.phone}.
              </p>
            </footer>
          </form>
        )}
      </div>
    </dialog>
  );
}
