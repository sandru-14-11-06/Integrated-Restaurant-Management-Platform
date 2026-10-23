import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Utensils, ClipboardList, Boxes, BarChart3, Leaf, LogOut, Menu, X, CalendarDays, Users, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { roleNames } from '../utils';

const navByRole = {
  admin: [['Overview','/admin/dashboard',LayoutDashboard],['Menu management','/admin/menu',Utensils],['Orders','/admin/orders',ClipboardList],['Staff','/admin/staff',Users],['Inventory','/admin/inventory',Boxes],['Forecast','/admin/forecast',BarChart3],['Waste & surplus','/admin/sustainability',Leaf],['Reservations','/admin/reservations',CalendarDays],['Reports','/admin/reports',BarChart3]],
  customer: [['Discover menu','/menu',Utensils],['My orders','/customer/orders',ClipboardList],['Surplus deals','/surplus',Leaf],['Reservations','/reservations',CalendarDays],['My profile','/customer/profile',Users]],
  kitchen: [['Kitchen board','/kitchen/dashboard',LayoutDashboard],['Orders','/kitchen/orders',ClipboardList]],
  inventory: [['Inventory overview','/inventory/dashboard',LayoutDashboard],['Ingredients','/inventory/ingredients',Boxes],['Forecast','/inventory/forecast',BarChart3],['Waste log','/inventory/waste',Leaf]],
  cashier: [['Cashier desk','/cashier/dashboard',LayoutDashboard],['Orders & billing','/cashier/orders',ClipboardList],['Reservations','/cashier/reservations',CalendarDays]],
  delivery: [['Delivery runs','/delivery/dashboard',ShoppingBag]],
  'food-rescue': [['Rescue listings','/food-rescue/listings',Leaf],['My collections','/food-rescue/claims',ClipboardList]]
};

export default function Shell() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const links = navByRole[user?.role] || [];
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <Link className="brand-lockup" to="/"><span className="brand-symbol">आ</span><span><b>IRMP</b><small>Restaurant OS</small></span></Link>
      <div className="side-caption">{roleNames[user?.role]}</div>
      <nav>{links.map(([label, href, Icon]) => <NavLink key={href} to={href} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon size={18} />{label}</NavLink>)}
        {user?.role === 'customer' && <NavLink to="/cart" onClick={() => setOpen(false)} className="nav-link"><ShoppingBag size={18} />Your cart <span className="cart-count">{count}</span></NavLink>}
      </nav>
      <div className="sidebar-bottom"><div className="user-mini"><div className="avatar">{user?.name?.[0]?.toUpperCase()}</div><div><b>{user?.name}</b><small>{user?.email}</small></div></div>
        <button className="logout-link" onClick={() => { logout(); navigate('/'); }}><LogOut size={17} /> Sign out</button>
      </div>
    </aside>
    {open && <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <div className="main-column">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
        <div className="breadcrumb"><span>Restaurant</span><b>/</b><strong>{roleNames[user?.role]}</strong></div>
        <div className="topbar-right"><span className="open-indicator"><i /> Open today</span><span className="top-avatar">{user?.name?.[0]?.toUpperCase()}</span></div>
      </header>
      <main className="content"><Outlet /></main>
      <footer className="app-footer"><span>IRMP · Integrated Restaurant Management Platform</span><span>Fresh food. Thoughtful operations.</span></footer>
    </div>
  </div>;
}
