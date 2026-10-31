// Small building blocks for the admin panel.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Icon } from '../components/ui/ui.jsx';
import { Link, navigate } from '../lib/router.jsx';
import { ORDER_STATUSES, label, paymentStatus, formatINR } from '../lib/api/shape.js';

export { Icon, Link, navigate };

/** Run an async loader; re-runs when deps change. */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`}>
            <Icon name={t.kind === 'error' ? 'close' : 'check'} size={16} />
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------- Layout bits ---------- */
export function PageHead({ title, sub, back, actions }) {
  return (
    <header className="ph">
      <div className="ph__main">
        {back && (
          <Link to={back} className="ph__back" aria-label="Back">
            <Icon name="back" size={18} />
          </Link>
        )}
        <div>
          <h1>{title}</h1>
          {sub && <p className="ph__sub">{sub}</p>}
        </div>
      </div>
      {actions && <div className="ph__actions">{actions}</div>}
    </header>
  );
}

export function Loading({ label: text = 'Loading…' }) {
  return (
    <div className="state">
      <span className="spinner" aria-hidden="true" />
      {text}
    </div>
  );
}
export function ErrorBox({ error, onRetry }) {
  return (
    <div className="state state--error" role="alert">
      {error?.message || String(error)}
      {onRetry && (
        <button type="button" className="abtn abtn--ghost abtn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Empty({ children, action }) {
  return (
    <div className="state state--empty">
      <p>{children}</p>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge badge--${status}`}>{label(ORDER_STATUSES, status)}</span>;
}
export function PayBadge({ order }) {
  const p = paymentStatus(order);
  if (p.id === 'na') return null;
  return <span className={`badge badge--pay-${p.id}`}>{p.label}</span>;
}
export const Money = ({ value, strong }) => {
  const v = formatINR(value);
  return strong ? <strong className="money">{v}</strong> : <span className="money">{v}</span>;
};

export function Field({ label: text, hint, children, full }) {
  return (
    <label className={`af ${full ? 'af--full' : ''}`}>
      <span className="af__label">{text}</span>
      {children}
      {hint && <span className="af__hint">{hint}</span>}
    </label>
  );
}

/** Modal built on <dialog> (focus trap, Esc to close). */
export function Modal({ open, onClose, title, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={`amodal ${wide ? 'amodal--wide' : ''}`} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-label={title}>
      {open && (
        <div className="amodal__panel">
          <header className="amodal__head">
            <h2>{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="close" size={18} />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}

export const waLink = (phone, text) => `https://wa.me/91${String(phone || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(text)}`;
export const telLink = (phone) => `tel:+91${String(phone || '').replace(/\D/g, '').slice(-10)}`;
export const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
