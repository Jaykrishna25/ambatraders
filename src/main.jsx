import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { CatalogProvider } from './lib/catalog.jsx';
import { CartProvider } from './lib/cart.jsx';

// The admin panel is a separate bundle, downloaded only when someone opens /admin.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));
const isAdmin = window.location.pathname.startsWith('/admin');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={<div className="admin-boot">Loading admin…</div>}>
        <AdminApp />
      </Suspense>
    ) : (
      <CatalogProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </CatalogProvider>
    )}
  </StrictMode>,
);
