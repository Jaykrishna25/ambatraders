import { useEffect, useState } from 'react';
import { api, isDemo } from '../lib/api/index.js';
import { usePath, match } from '../lib/router.jsx';
import { business } from '../data/business.js';
import { Icon, Link, Loading, ToastProvider, navigate } from './ui.jsx';
import Dashboard from './pages/Dashboard.jsx';
import OrdersList from './pages/OrdersList.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import OrderEditor from './pages/OrderEditor.jsx';
import ProductsList from './pages/ProductsList.jsx';
import ProductEditor from './pages/ProductEditor.jsx';
import CustomersList from './pages/CustomersList.jsx';
import CustomerDetail from './pages/CustomerDetail.jsx';
import CustomerEditor from './pages/CustomerEditor.jsx';
import PaymentsList from './pages/PaymentsList.jsx';
import './admin.css';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', exact: true },
  { to: '/admin/orders', label: 'Orders', icon: 'receipt' },
  { to: '/admin/products', label: 'Stock', icon: 'box' },
  { to: '/admin/customers', label: 'Customers', icon: 'users' },
  { to: '/admin/payments', label: 'Payments', icon: 'wallet' },
];

const ROUTES = [
  ['/admin', Dashboard],
  ['/admin/orders', OrdersList],
  ['/admin/orders/new', OrderEditor],
  ['/admin/orders/:id/edit', OrderEditor],
  ['/admin/orders/:id', OrderDetail],
  ['/admin/products', ProductsList],
  ['/admin/products/new', ProductEditor],
  ['/admin/products/:id', ProductEditor],
  ['/admin/customers', CustomersList],
  ['/admin/customers/new', CustomerEditor],
  ['/admin/customers/:id/edit', CustomerEditor],
  ['/admin/customers/:id', CustomerDetail],
  ['/admin/payments', PaymentsList],
];

function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [demoLogin, setDemoLogin] = useState(null);

  useEffect(() => {
    if (isDemo) import('../lib/api/demoImpl.js').then((m) => setDemoLogin(m.DEMO_LOGIN));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onDone(await api.signIn(email, password));
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Wrong email or password' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <form className="login__card" onSubmit={submit}>
        <img src={business.logoFull} alt="Amba Traders" width="160" height="173" />
        <h1>Admin login</h1>
        <label className="af">
          <span className="af__label">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label className="af">
          <span className="af__label">Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && (
          <p className="aerror" role="alert">
            {error}
          </p>
        )}
        <button className="abtn abtn--primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {demoLogin && (
          <p className="login__demo">
            Demo mode — sign in with <code>{demoLogin.email}</code> / <code>{demoLogin.password}</code>. Data is saved only in this
            browser until Supabase is connected.
          </p>
        )}
        <a href="/" className="login__back">
          ← Back to website
        </a>
      </form>
    </main>
  );
}

function Shell({ session, onSignOut, children, path }) {
  const isActive = (n) => (n.exact ? path.split('?')[0] === n.to : path.startsWith(n.to));
  return (
    <div className="shell">
      <aside className="side" aria-label="Admin navigation">
        <Link to="/admin" className="side__brand">
          <img src={business.logo} alt="" width="38" height="38" />
          <span>
            Amba Traders
            <small>Admin</small>
          </span>
        </Link>
        <nav>
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`side__link ${isActive(n) ? 'is-active' : ''}`} aria-current={isActive(n) ? 'page' : undefined}>
              <Icon name={n.icon} size={19} /> {n.label === 'Stock' ? 'Products & Stock' : n.label}
            </Link>
          ))}
        </nav>
        <div className="side__foot">
          <Link to="/admin/orders/new" className="abtn abtn--primary">
            <Icon name="plus" size={16} /> New order
          </Link>
          <a href="/" target="_blank" rel="noopener noreferrer" className="side__link">
            <Icon name="external" size={18} /> View website
          </a>
          <button type="button" className="side__link" onClick={onSignOut}>
            <Icon name="logout" size={18} /> Sign out
          </button>
          <p className="side__user">{session.name}</p>
        </div>
      </aside>

      <header className="topbar">
        <Link to="/admin" className="side__brand">
          <img src={business.logo} alt="" width="34" height="34" />
          <span>Admin</span>
        </Link>
        <div className="topbar__actions">
          <Link to="/admin/orders/new" className="abtn abtn--primary abtn--sm">
            <Icon name="plus" size={16} /> Order
          </Link>
          <button type="button" className="icon-btn" onClick={onSignOut} aria-label="Sign out">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </header>

      <main className="main" id="admin-main">
        {isDemo && (
          <p className="demo-bar">
            <strong>Demo mode.</strong> Changes are saved only in this browser. Connect Supabase (see README) to go live.
          </p>
        )}
        {children}
      </main>

      <nav className="tabbar" aria-label="Admin sections">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={isActive(n) ? 'is-active' : ''} aria-current={isActive(n) ? 'page' : undefined}>
            <Icon name={n.icon} size={20} />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function AdminApp() {
  const path = usePath();
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    document.title = 'Admin — Amba Traders';
    let unsub = () => {};
    const refresh = () => api.getSession().then(setSession).catch(() => setSession(null));
    refresh();
    api.onAuthChange(refresh).then((u) => (unsub = u));
    return () => unsub();
  }, []);

  if (session === undefined) return <Loading label="Loading admin…" />;
  if (!session?.isAdmin) return <Login onDone={setSession} />;

  let Page = null;
  let params = {};
  for (const [pattern, Comp] of ROUTES) {
    const m = match(pattern, path);
    if (m) {
      Page = Comp;
      params = m;
      break;
    }
  }

  return (
    <ToastProvider>
      <Shell
        session={session}
        path={path}
        onSignOut={async () => {
          await api.signOut();
          setSession(null);
          navigate('/admin');
        }}
      >
        {Page ? (
          <Page key={path.split('?')[0]} {...params} />
        ) : (
          <p className="state">
            Page not found. <Link to="/admin">Go to dashboard</Link>
          </p>
        )}
      </Shell>
    </ToastProvider>
  );
}
