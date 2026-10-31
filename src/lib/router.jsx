// Tiny path router for the admin panel (no dependency needed).
import { useSyncExternalStore } from 'react';

const subscribe = (cb) => {
  window.addEventListener('popstate', cb);
  return () => window.removeEventListener('popstate', cb);
};
const getPath = () => window.location.pathname + window.location.search;

export function navigate(to, { replace = false } = {}) {
  if (to === getPath()) return;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0 });
}

export const usePath = () => useSyncExternalStore(subscribe, getPath, () => '/');

/** Match '/admin/orders/:id' style patterns. Returns params or null. */
export function match(pattern, path) {
  const p = pattern.split('/').filter(Boolean);
  const a = path.split('?')[0].split('/').filter(Boolean);
  if (p.length !== a.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}

export function Link({ to, onClick, ...rest }) {
  return (
    <a
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    />
  );
}
