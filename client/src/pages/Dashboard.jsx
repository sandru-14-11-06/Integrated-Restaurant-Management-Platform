import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Boxes, ClipboardList, IndianRupee, Leaf, ShoppingBag, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatCurrency, roleHomes, roleNames } from '../utils';
import { useAuth } from '../context/AuthContext';

const config = {
  admin: { eyebrow:'Your restaurant at a glance', title:'Good morning', description:'Here’s what’s happening across the restaurant today.', links:[['Manage menu','/admin/menu',Utensils],['View orders','/admin/orders',ClipboardList],['Team & access','/admin/staff',ShoppingBag]] },
  customer: { eyebrow:'A lovely day for something delicious', title:'Welcome back', description:'Take a look at the menu and find your next favourite.', links:[['Browse the menu','/menu',Utensils],['Track your orders','/customer/orders',ClipboardList],['Find surplus deals','/surplus',Leaf]] },
  kitchen: { eyebrow:'The pass is yours', title:'Kitchen board', description:'Fresh tickets, clear priorities. Let’s get cooking.', links:[['Open live orders','/kitchen/orders',ClipboardList]] },
  inventory: { eyebrow:'Keep the kitchen ready', title:'Stock & supply', description:'Stay ahead of what’s running low and what’s coming next.', links:[['Ingredients','/inventory/ingredients',Boxes],['Demand forecast','/inventory/forecast',BarChart3],['Record food waste','/inventory/waste',Leaf]] },
  cashier: { eyebrow:'A smooth finish to every meal', title:'Cashier desk', description:'Orders, bills and payment status in one place.', links:[['Orders & billing','/cashier/orders',ClipboardList],['Reservations','/cashier/reservations',ShoppingBag]] },
  delivery: { eyebrow:'Good food is on its way', title:'Delivery runs', description:'Keep your assigned deliveries moving safely.', links:[['Open delivery queue','/delivery/orders',ClipboardList]] },
  'food-rescue': { eyebrow:'Good food deserves a second chance', title:'Rescue hub', description:'Find available meals and coordinate a thoughtful pickup.', links:[['View rescue listings','/food-rescue/listings',Leaf],['My collections','/food-rescue/claims',ClipboardList]] }
};

export default function Dashboard() {
  const { user } = useAuth(); const role=user?.role; const details=config[role]||config.customer;
  const [analytics,setAnalytics]=useState(null); const [error,setError]=useState('');
  useEffect(()=>{if(role==='admin'||role==='cashier')api.get('/analytics').then(({data})=>setAnalytics(data)).catch(e=>setError(e.response?.data?.message||'Dashboard data is unavailable.'));},[role]);
  const salutation=new Date().getHours()<12?'Good morning':new Date().getHours()<17?'Good afternoon':'Good evening';
  const stats=role==='admin'&&analytics?[
    ['Completed sales',formatCurrency(analytics.sales),IndianRupee,'orange'],
    ['Total orders',analytics.totalOrders,ClipboardList,'blue'],
    ['Awaiting attention',analytics.pendingOrders,ShoppingBag,'purple'],
    ['Low stock items',analytics.lowStock,Boxes,'green']
  ]:role==='cashier'&&analytics?[
    ['Completed orders',analytics.completedOrders,ClipboardList,'orange'],
    ['Sales',formatCurrency(analytics.sales),IndianRupee,'green'],
    ['Average bill',formatCurrency(analytics.averageOrderValue),BarChart3,'blue'],
    ['Open orders',analytics.pendingOrders,ShoppingBag,'purple']
  ]:[];
  return <div className="dashboard-page"><section className="welcome-banner"><div><span className="eyebrow">{details.eyebrow}</span><h1>{role==='admin'?`${salutation}, ${user?.name?.split(' ')[0]}.`:role==='customer'?`${salutation}, ${user?.name?.split(' ')[0]}.`:details.title}</h1><p>{details.description}</p></div><div className="welcome-mark"><Utensils size={50}/><span>✳</span></div></section>
    {error&&<div className="alert error">{error}</div>}
    {stats.length>0&&    <div className="stat-grid">{stats.map(([label,value,Icon,color])=><div className="stat-card" key={label}><span className={`stat-icon ${color}`}><Icon size={19}/></span><span className="stat-label">{label}</span><strong>{value}</strong><small>{label==='Completed sales'?'Completed order revenue':label==='Low stock items'?'At or below minimum level':'Database-backed live total'}</small></div>)}</div>}
    <section className="dashboard-section-heading"><div><span className="eyebrow">Your shortcuts</span><h2>Where would you like to go?</h2></div><span className="today-date">{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</span></section>
    <div className="shortcut-grid">{details.links.map(([label,href,Icon],index)=><Link className={`shortcut-card shortcut-${index+1}`} to={href} key={href}><span className="shortcut-icon"><Icon size={21}/></span><strong>{label}</strong><p>Open your {label.toLowerCase()} workspace.</p><span className="shortcut-arrow"><ArrowRight size={17}/></span></Link>)}</div>
    {role==='admin'&&analytics&&<div className="dashboard-lower"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Just came in</span><h3>Recent orders</h3></div><Link className="text-link" to="/admin/orders">All orders <ArrowRight size={15}/></Link></div>{analytics.recentOrders?.length?<div className="recent-list">{analytics.recentOrders.slice(0,5).map(o=><div key={o._id}><div><b>{o.orderNumber}</b><small>{new Date(o.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})} · {o.items.length} items</small></div><span className={`status-badge`}>{o.status}</span><strong>{formatCurrency(o.total)}</strong></div>)}</div>:<div className="empty-inline">Your first order is just around the corner.</div>}</section><section className="sustainability-card"><span className="value-icon green"><Leaf/></span><span className="eyebrow">Thoughtful operations</span><h3>Make good food go further.</h3><p>Track waste, forecast demand and share surplus with local rescue partners.</p><Link className="text-link" to="/admin/sustainability">Explore sustainability <ArrowRight size={15}/></Link></section></div>}
    {role==='customer'&&<div className="customer-note"><span>☀️</span><div><b>Something good is cooking.</b><p>All dishes are prepared fresh after you order. Prices are shown in Indian Rupees.</p></div><Link className="text-link" to="/menu">See today’s menu <ArrowRight size={15}/></Link></div>}
  </div>;
}
