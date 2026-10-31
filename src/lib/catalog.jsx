import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { categories as staticCategories, products as staticProducts } from '../data/products.js';
import { api } from './api/index.js';

const CatalogContext = createContext(null);

// First paint uses the bundled catalogue so the page is never empty;
// it is replaced by live data (prices, stock, new designs) as soon as it loads.
const initial = {
  categories: staticCategories,
  products: staticProducts.map((p) => ({ ...p, pid: null, stock: null })),
  live: false,
  error: null,
};

export function CatalogProvider({ children }) {
  const [state, setState] = useState(initial);

  const refresh = useCallback(async () => {
    try {
      const { categories, products } = await api.fetchCatalog();
      setState({ categories, products, live: true, error: null });
    } catch (e) {
      setState((s) => ({ ...s, error: e.message }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => {
    const byPid = new Map(state.products.filter((p) => p.pid).map((p) => [p.pid, p]));
    return {
      ...state,
      refresh,
      byPid,
      categoryName: (id) => state.categories.find((c) => c.id === id)?.name ?? id,
    };
  }, [state, refresh]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => useContext(CatalogContext);
