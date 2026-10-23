import { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('irmp-cart')) || []; } catch { return []; }
  });
  const save = (next) => { setItems(next); localStorage.setItem('irmp-cart', JSON.stringify(next)); };
  const add = (dish) => save(items.some((i) => i._id === dish._id)
    ? items.map((i) => i._id === dish._id ? { ...i, quantity: Math.min(i.quantity + 1, 50) } : i)
    : [...items, { ...dish, quantity: 1 }]);
  const change = (id, delta) => save(items.map((item) => item._id === id ? { ...item, quantity: Math.max(1, Math.min(50, item.quantity + delta)) } : item));
  const remove = (id) => save(items.filter((item) => item._id !== id));
  const clear = () => save([]);
  const value = useMemo(() => ({ items, add, change, remove, clear, count: items.reduce((n, i) => n + i.quantity, 0) }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
