import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Utensils, Shield, ChefHat, Boxes, Banknote, Bike, HeartHandshake, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fallbackImage, roleHomes, roleNames } from '../utils';

export const roleConfig = [
  { role: 'admin', label: 'Administrator', desc: 'Manage the whole restaurant', Icon: Shield },
  { role: 'customer', label: 'Customer', desc: 'Order meals and track deliveries', Icon: UserRound },
  { role: 'kitchen', label: 'Kitchen Staff', desc: 'Prepare and update live orders', Icon: ChefHat },
  { role: 'inventory', label: 'Inventory Manager', desc: 'Track stock and suppliers', Icon: Boxes },
  { role: 'cashier', label: 'Cashier', desc: 'Bills, payments and walk-ins', Icon: Banknote },
  { role: 'delivery', label: 'Delivery Staff', desc: 'Manage your delivery runs', Icon: Bike },
  { role: 'food-rescue', label: 'Food Rescue Partner', desc: 'Collect surplus meals', Icon: HeartHandshake }
];

export function LoginSelection() {
  return <div className="auth-page"><div className="auth-brand"><Link to="/" className="brand-lockup"><img className="brand-logo" src="/images/restaurentimages.png" alt="IRMP" /><span><b>IRMP</b><small>Restaurant OS</small></span></Link><Link to="/"><ArrowLeft size={16} /> Back to home</Link></div>
    <div className="auth-heading"><span className="eyebrow">Welcome to the table</span><h1>Who’s signing in?</h1><p>Choose your workspace to continue.</p></div>
    <div className="role-grid">{roleConfig.map(({ role, label, desc, Icon }) => <Link to={`/login/${role}`} className="role-card" key={role}><span className="role-icon"><Icon size={21} /></span><strong>{label}</strong><small>{desc}</small><span className="role-arrow">→</span></Link>)}</div>
    <p className="auth-signup">Joining us as a customer? <Link to="/register">Create an account</Link></p>
  </div>;
}

export default function Login() {
  const { role } = useParams();
  const config = roleConfig.find((r) => r.role === role);
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!config) return <LoginSelection />;
  const submit = async (event) => {
    event.preventDefault(); setError('');
    if (!/^\S+@\S+\.\S+$/.test(email) || !password) { setError('Enter a valid email and password.'); return; }
    setBusy(true);
    try {
      const user = await login(email, password);
      if (user.role !== role) { logout(); setError(`This account belongs to ${roleNames[user.role]}. Choose the matching login.`); return; }
      navigate(roleHomes[user.role]);
    } catch (err) { setError(err.response?.data?.message || 'Could not connect to the restaurant server.'); }
    finally { setBusy(false); }
  };
  const Icon = config.Icon;
  return <div className="login-page"><div className="login-photo"><img src="https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=85" onError={(e)=>{e.currentTarget.src=fallbackImage;}} alt="A spread of Indian dishes" /><Link to="/" className="photo-brand"><span className="brand-symbol">आ</span><b>IRMP</b></Link><div className="photo-quote"><span>“</span><p>Hospitality is not a task.<br />It’s how we make people feel.</p></div></div>
    <div className="login-panel"><Link className="back-link" to="/login"><ArrowLeft size={16} /> All workspaces</Link><div className="login-form-wrap"><span className="role-icon large"><Icon size={24} /></span><span className="eyebrow">{config.label} workspace</span><h1>Welcome back.</h1><p className="muted">Sign in to pick up where you left off.</p>
      <form onSubmit={submit} className="form-stack"><label>Email address<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@restaurant.com" required /></label>
        <label>Password<div className="password-wrap"><input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required /><button type="button" className="password-toggle" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
        {error && <div className="alert error">{error}</div>}<button className="button button-primary full-width" disabled={busy}>{busy ? <span className="spinner" /> : 'Sign in'}{!busy && <ArrowLeft className="arrow-forward" size={17} />}</button>
      </form>{role === 'customer' && <p className="auth-signup">New around here? <Link to="/register">Create an account</Link></p>}
      <div className="login-foot"><Utensils size={15} /> Secure access for the people who make it happen.</div>
    </div></div></div>;
}

export function Register() {
  const { register } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setError(''); setBusy(true); try { await register(form); navigate('/menu'); } catch (err) { setError(err.response?.data?.message || 'Registration failed'); } finally { setBusy(false); } };
  return <div className="register-page"><Link className="back-link" to="/login"><ArrowLeft size={16} /> Back to sign in</Link><div className="register-card"><span className="role-icon large"><UserRound /></span><span className="eyebrow">Join the table</span><h1>Create your account</h1><p className="muted">A few details and the menu is yours.</p><form className="form-stack" onSubmit={submit}><label>Your name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Email address<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label>Password<input type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>{error && <div className="alert error">{error}</div>}<button className="button button-primary full-width" disabled={busy}>{busy ? 'Creating account…' : 'Create customer account'}</button></form></div></div>;
}
