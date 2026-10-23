import { useState } from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { fallbackImage, formatCurrency, resolveImage } from '../utils';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Cart() {
  const { items, change, remove, clear } = useCart(); const { user } = useAuth(); const navigate = useNavigate();
  const [type, setType] = useState('takeaway'); const [address, setAddress] = useState(user?.address || ''); const [tableNumber, setTableNumber] = useState('');
  const [instructions, setInstructions] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 5) / 100; const delivery = type === 'delivery' ? 40 : 0; const total = subtotal + tax + delivery;
  const checkout = async () => {
    if (!user) { navigate('/login/customer'); return; }
    if (!items.length) return;
    if (type === 'delivery' && !address.trim()) { setError('Please add a delivery address.'); return; }
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/orders', { items: items.map((i) => ({ menuItem: i._id, quantity: i.quantity })), orderType: type, address, tableNumber, instructions }, { headers: { 'Idempotency-Key': idempotencyKey } });
      clear(); setIdempotencyKey(crypto.randomUUID()); navigate(`/customer/orders?new=${data._id}`);
    } catch (err) { setError(err.response?.data?.message || 'We could not place your order.'); }
    finally { setBusy(false); }
  };
  if (!items.length) return <div className="empty-state cart-empty"><span>🛍️</span><h2>Your bag is taking a breather.</h2><p>When something catches your eye, it’ll be right here.</p><Link to="/menu" className="button button-primary">Explore the menu <ArrowRight size={17} /></Link></div>;
  return <div className="page-wrap"><div className="page-heading"><div><span className="eyebrow">Almost there</span><h1>Your bag</h1><p>A good meal is just around the corner.</p></div><Link to="/menu" className="text-link">← Keep browsing</Link></div>
    <div className="cart-layout"><section className="cart-list">{items.map((item) => <article className="cart-row" key={item._id}><img src={resolveImage(item.image)} onError={(e)=>{e.currentTarget.src=fallbackImage;}} alt="" /><div className="cart-item-info"><small>{item.category}</small><h3>{item.name}</h3><b>{formatCurrency(item.price)}</b></div><div className="quantity-control"><button onClick={() => change(item._id, -1)} aria-label="Decrease quantity"><Minus size={14} /></button><span>{item.quantity}</span><button onClick={() => change(item._id, 1)} aria-label="Increase quantity"><Plus size={14} /></button></div><strong className="line-total">{formatCurrency(item.price * item.quantity)}</strong><button className="icon-button remove-button" aria-label="Remove item" onClick={() => remove(item._id)}><Trash2 size={17} /></button></article>)}
      <div className="order-options"><h3>How would you like it?</h3><div className="choice-row">{[['takeaway','Takeaway'],['dine-in','Dine in'],['delivery','Delivery']].map(([value,label]) => <button className={`choice-card ${type === value ? 'selected' : ''}`} key={value} onClick={() => setType(value)}><span>{value === 'delivery' ? '🛵' : value === 'dine-in' ? '🍽️' : '🥡'}</span><b>{label}</b></button>)}</div>
        {type === 'delivery' && <label>Delivery address<textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Building, street, area, city" rows="2" required /></label>}
        {type === 'dine-in' && <label>Table number <input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Optional, e.g. T4" /></label>}
        <label>Special instructions <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows="2" placeholder="Anything we should know?" /></label>
      </div>
    </section>
    <aside className="summary-card"><h3>Order summary</h3><div className="summary-line"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div><div className="summary-line"><span>Tax <small>(5%)</small></span><span>{formatCurrency(tax)}</span></div><div className="summary-line"><span>Delivery</span><span>{delivery ? formatCurrency(delivery) : 'Complimentary'}</span></div><div className="summary-total"><span>Total</span><strong>{formatCurrency(total)}</strong></div><button className="button button-primary full-width" onClick={checkout} disabled={busy}>{busy ? 'Placing order…' : user ? 'Place demo order' : 'Sign in to checkout'}<ArrowRight size={17} /></button><small className="demo-note">Payments are simulated for this demo; no charge will be made.</small>{error && <div className="alert error">{error}</div>}</aside></div></div>;
}
