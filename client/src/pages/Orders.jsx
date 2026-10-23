import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Clock3, Plus, Printer } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { formatCurrency, fallbackImage, resolveImage } from '../utils';

const nextStatuses = { Pending: 'Confirmed', Confirmed: 'Preparing', Preparing: 'Ready', Ready: 'Completed', 'Out for Delivery': 'Completed' };
const roleNext = (role, status, type) => {
  if (role === 'kitchen') return ({ Pending: 'Confirmed', Confirmed: 'Preparing', Preparing: 'Ready' })[status];
  if (role === 'delivery' && type === 'delivery') return status === 'Ready' ? 'Out for Delivery' : status === 'Out for Delivery' ? 'Completed' : null;
  if (role === 'cashier') return nextStatuses[status];
  return null;
};

function WalkInOrder({ onCreated }) {
  const [menu, setMenu] = useState([]);
  const [items, setItems] = useState([]);
  const [discountPercent,setDiscountPercent]=useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState('takeaway');
  const [tableNumber, setTableNumber] = useState('');
  useEffect(() => { api.get('/menu').then(({data})=>setMenu(data)).catch(()=>setError('Unable to load the menu for a walk-in order.')); }, []);
  const add = (dish) => setItems(current => current.some(i=>i._id===dish._id) ? current.map(i=>i._id===dish._id?{...i,quantity:i.quantity+1}:i) : [...current,{...dish,quantity:1}]);
  const submit = async () => {
    if (!items.length) { setError('Add at least one dish.'); return; }
    setError(''); setBusy(true);
    try {
      await api.post('/orders',{items:items.map(i=>({menuItem:i._id,quantity:i.quantity})),orderType:type,tableNumber,discountPercent:Number(discountPercent)});
      setItems([]); setTableNumber(''); setDiscountPercent(0); onCreated();
    } catch (err) { setError(err.response?.data?.message||'Could not create the walk-in order.'); }
    finally { setBusy(false); }
  };
  return <section className="panel cashier-create"><div className="panel-heading"><div><span className="eyebrow">At the counter</span><h3>Create a walk-in order</h3></div><select value={type} onChange={e=>setType(e.target.value)}><option value="takeaway">Takeaway</option><option value="dine-in">Dine-in</option></select></div>
    <div className="walkin-body"><div className="walkin-menu">{menu.slice(0,8).map(dish=><button key={dish._id} onClick={()=>add(dish)}><img src={resolveImage(dish.image)} onError={(e)=>{e.currentTarget.src=fallbackImage;}} alt=""/><span><b>{dish.name}</b><small>{formatCurrency(dish.price)}</small></span><Plus size={15}/></button>)}</div>
      <div className="walkin-bill">{type==='dine-in'&&<label>Table number<input value={tableNumber} onChange={e=>setTableNumber(e.target.value)} placeholder="e.g. T4"/></label>}<label>Authorized discount<select value={discountPercent} onChange={e=>setDiscountPercent(Number(e.target.value))}><option value="0">No discount</option><option value="5">5% discount</option><option value="10">10% discount</option><option value="15">15% discount</option><option value="20">20% discount · maximum</option></select></label>
        {items.map(item=><div className="walkin-line" key={item._id}><span>{item.quantity}× {item.name}</span><b>{formatCurrency(item.price*item.quantity)}</b><button className="text-link" onClick={()=>setItems(items.filter(i=>i._id!==item._id))}>Remove</button></div>)}
        <div className="walkin-total"><span>Estimate incl. {discountPercent}% discount · tax calculated by server</span><b>{formatCurrency(items.reduce((sum,i)=>sum+i.price*i.quantity,0)*(1-discountPercent/100))}</b></div>
        {error&&<div className="alert error">{error}</div>}<button className="button button-primary full-width" onClick={submit} disabled={busy}>{busy?'Creating…':'Create order'}</button><small className="muted">The final amount is calculated using database prices. DEMO payment only.</small>
      </div></div>
  </section>;
}

function printReceipt(order) {
  const escapeHtml = (value) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const itemRows=order.items.map(item=>`<tr><td>${escapeHtml(item.name)} × ${item.quantity}</td><td>${formatCurrency(item.itemTotal)}</td></tr>`).join('');
  const documentText=`<!doctype html><html><head><title>IRMP Receipt ${escapeHtml(order.orderNumber)}</title><style>body{font:14px Arial;max-width:420px;margin:35px auto;color:#25251f}h1{text-align:center;font-size:21px}p{text-align:center;color:#777}table{width:100%;border-collapse:collapse;margin:22px 0}td{padding:9px 0;border-bottom:1px solid #ddd}td:last-child{text-align:right}.total{font-weight:bold;font-size:18px;border-top:2px solid #333;padding-top:12px}.demo{text-align:center;color:#a65a2f;font-weight:bold}</style></head><body><h1>IRMP Restaurant</h1><p>Integrated Restaurant Management Platform</p><hr/><p>Order ${escapeHtml(order.orderNumber)}<br/>${new Date(order.createdAt).toLocaleString('en-IN')}<br/>${escapeHtml(order.orderType)}</p><table>${itemRows}<tr><td>Subtotal</td><td>${formatCurrency(order.subtotal)}</td></tr><tr><td>Discount</td><td>−${formatCurrency(order.discount)}</td></tr><tr><td>Tax</td><td>${formatCurrency(order.tax)}</td></tr><tr><td>Delivery</td><td>${formatCurrency(order.deliveryFee)}</td></tr><tr><td class="total">Total</td><td class="total">${formatCurrency(order.total)}</td></tr></table><p>Payment: ${escapeHtml(order.paymentStatus)} · ${escapeHtml(order.paymentMethod)}</p><p class="demo">DEMO RECEIPT · NO REAL PAYMENT TAKEN</p><script>window.print()<\/script></body></html>`;
  const receipt=window.open('','_blank','width=480,height=720');
  if (!receipt) { window.alert('Allow pop-ups to print the receipt.'); return; }
  receipt.document.write(documentText); receipt.document.close();
}

export default function Orders({ mode = 'customer' }) {
  const [orders, setOrders] = useState([]); const [error, setError] = useState(''); const [busyId, setBusyId] = useState('');
  const [deliveryStaff, setDeliveryStaff] = useState([]);
  const [params] = useSearchParams(); const role = mode === 'customer' ? 'customer' : mode;
  const reload = () => api.get('/orders').then(({ data }) => setOrders(data)).catch((err) => setError(err.response?.data?.message || 'Could not load orders.'));
  useEffect(() => {
    reload();
    if (role === 'admin') api.get('/users').then(({data})=>setDeliveryStaff(data.filter(user=>user.role==='delivery'))).catch(()=>{});
    const socketOrigin=(import.meta.env.VITE_API_URL||'http://localhost:5000/api').replace(/\/api\/?$/,'');
    const socket=io(socketOrigin);
    socket.on('orders:changed',reload);
    const timer = setInterval(reload, 20000);
    return () => { clearInterval(timer); socket.disconnect(); };
  }, []);
  const changeStatus = async (order, status) => {
    setBusyId(order._id); setError('');
    try { await api.patch(`/orders/${order._id}/status`, { status }); await reload(); }
    catch (err) { setError(err.response?.data?.message || 'Order update failed.'); }
    finally { setBusyId(''); }
  };
  const markPaid = async (order) => { try { await api.patch(`/orders/${order._id}/payment`, { paymentStatus: 'paid' }); await reload(); } catch (err) { setError(err.response?.data?.message || 'Payment update failed.'); } };
  const assignDelivery = async (order, staffId) => {
    if (!staffId) return;
    try { await api.patch(`/orders/${order._id}/assign-delivery`, { staffId }); await reload(); }
    catch (err) { setError(err.response?.data?.message || 'Could not assign delivery staff.'); }
  };
  const headings = { customer: ['Your orders','Every step, from our kitchen to you.'], kitchen: ['Kitchen board','Keep the good things moving.'], delivery: ['Delivery runs','Your assigned delivery queue.'], cashier: ['Orders & billing','Walk-ins, bills and payments.'], admin: ['Order management','A live view of the restaurant floor.'] };
  const [title, subtitle] = headings[role] || headings.admin;
  const visible = role === 'customer' ? orders : orders;
  return <div className="page-wrap"><div className="page-heading"><div><span className="eyebrow">{role === 'kitchen' ? 'Pass & prep' : role === 'delivery' ? 'Out in the neighbourhood' : 'Restaurant floor'}</span><h1>{title}</h1><p>{subtitle}</p></div><button className="button button-outline" onClick={reload}><Clock3 size={16} /> Refresh</button></div>
    {role==='cashier'&&<WalkInOrder onCreated={reload}/>}
    {params.get('new') && <div className="alert success"><Check size={17} /> Your order has been placed. It’s now with the restaurant team.</div>}
    {error && <div className="alert error">{error}</div>}
    {visible.length === 0 ? <div className="empty-state"><span>🧾</span><h3>No orders to show</h3><p>New orders will appear here automatically.</p></div> : <div className={`orders-grid ${role === 'kitchen' ? 'kitchen-grid' : ''}`}>{visible.map((order) => {
      const next = roleNext(role, order.status, order.orderType);
      return <article className="order-card" key={order._id}><div className="order-card-head"><div><small>ORDER {order.orderNumber}</small><h3>{role !== 'customer' && order.customer?.name ? order.customer.name : order.orderType.replace('-', ' ')}</h3></div><span className={`status-badge status-${order.status.toLowerCase().replaceAll(' ', '-')}`}>{order.status}</span></div>
        <div className="order-items">{order.items.map((item, index) => <div key={`${item.name}-${index}`}><span><b>{item.quantity}×</b> {item.name}</span><span>{formatCurrency(item.itemTotal)}</span></div>)}</div>
        {order.instructions && <div className="order-instructions">Note: {order.instructions}</div>}
        {order.address && <div className="order-instructions">Deliver to: {order.address}</div>}
        <div className="order-details"><span>{new Date(order.createdAt).toLocaleString('en-IN',{ dateStyle: 'medium', timeStyle: 'short' })}</span><span>{order.orderType}</span>
          {role==='admin'&&order.orderType==='delivery'&&<select aria-label="Assign delivery staff" value={order.deliveryStaff?._id||''} onChange={e=>assignDelivery(order,e.target.value)}><option value="">Assign delivery staff</option>{deliveryStaff.map(staff=><option key={staff._id} value={staff._id}>{staff.name}</option>)}</select>}
          {role==='admin'&&order.deliveryStaff&&<span>Assigned: {order.deliveryStaff.name}</span>}
        </div>
        <div className="order-card-bottom"><div><small>Order total</small><strong>{formatCurrency(order.total)}</strong><small className="demo-label">DEMO · {order.paymentStatus}</small></div>
          <div className="order-actions">{next && <button disabled={busyId === order._id} className="button button-primary button-small" onClick={() => changeStatus(order, next)}>{busyId === order._id ? 'Updating…' : role === 'delivery' ? next === 'Completed' ? 'Mark delivered' : 'Pick up order' : `Mark ${next.toLowerCase()}`}</button>}
            {role === 'cashier' && <button className="button button-outline button-small" onClick={() => printReceipt(order)}><Printer size={14}/> Receipt</button>}
            {role === 'cashier' && order.paymentStatus !== 'paid' && <button className="button button-outline button-small" onClick={() => markPaid(order)}>Mark paid · DEMO</button>}
          </div>
        </div>
      </article>;
    })}</div>}</div>;
}
