import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SIZES } from './api/shape.js';
import { useCatalog } from './catalog.jsx';

const CartContext = createContext(null);
const KEY = 'amba-cart-v1';

const load = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((l) => l.pid && SIZES.includes(l.size) && l.qty > 0) : [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const { byPid } = useCatalog();
  const [lines, setLines] = useState(load);
  const [sheetProduct, setSheetProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      // storage unavailable — cart still works for this visit
    }
  }, [lines]);

  const setQty = useCallback((pid, size, qty) => {
    const n = Math.max(0, Math.min(5000, parseInt(qty, 10) || 0));
    setLines((ls) => {
      const rest = ls.filter((l) => !(l.pid === pid && l.size === size));
      return n > 0 ? [...rest, { pid, size, qty: n }] : rest;
    });
  }, []);

  /** Replace the quantities for one design: { M: 2, L: 2, ... } */
  const setDesign = useCallback((pid, bySize) => {
    setLines((ls) => {
      const rest = ls.filter((l) => l.pid !== pid);
      const add = SIZES.map((s) => ({ pid, size: s, qty: Math.min(5000, parseInt(bySize[s], 10) || 0) })).filter((l) => l.qty > 0);
      return [...rest, ...add];
    });
  }, []);

  const removeDesign = useCallback((pid) => setLines((ls) => ls.filter((l) => l.pid !== pid)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    const designs = [];
    const seen = new Map();
    lines.forEach((l) => {
      const product = byPid.get(l.pid);
      if (!product) return;
      if (!seen.has(l.pid)) {
        const g = { pid: l.pid, product, sizes: {}, pieces: 0 };
        seen.set(l.pid, g);
        designs.push(g);
      }
      const g = seen.get(l.pid);
      g.sizes[l.size] = l.qty;
      g.pieces += l.qty;
    });
    designs.sort((a, b) => a.product.dno - b.product.dno);
    const pieces = designs.reduce((a, d) => a + d.pieces, 0);
    const allPriced = designs.length > 0 && designs.every((d) => d.product.price != null);
    const total = designs.reduce((a, d) => a + d.pieces * (d.product.price || 0), 0);
    return {
      lines: lines.filter((l) => byPid.has(l.pid)),
      designs,
      pieces,
      allPriced,
      total,
      setQty,
      setDesign,
      removeDesign,
      clear,
      quantitiesFor: (pid) => Object.fromEntries(SIZES.map((s) => [s, lines.find((l) => l.pid === pid && l.size === s)?.qty || 0])),
      sheetProduct,
      openSheet: setSheetProduct,
      closeSheet: () => setSheetProduct(null),
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
    };
  }, [lines, byPid, setQty, setDesign, removeDesign, clear, sheetProduct, cartOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
