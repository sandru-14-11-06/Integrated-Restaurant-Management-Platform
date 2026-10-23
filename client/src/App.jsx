import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import Shell from './components/Shell';
import Home from './pages/Home';
import Login, { LoginSelection, Register } from './pages/Login';
import Menu from './pages/Menu';
import DishDetails from './pages/DishDetails';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Reservations from './pages/Reservations';
import AdminMenu from './pages/AdminMenu';
import { ForecastPage, InventoryPage, ReportsPage, StaffPage, SurplusPage, WastePage } from './pages/Operations';
import './index.css';

function DashboardRedirect() {
  const { user } = useAuth();
  const paths = { admin:'/admin/dashboard', customer:'/customer/dashboard', kitchen:'/kitchen/dashboard', inventory:'/inventory/dashboard', cashier:'/cashier/dashboard', delivery:'/delivery/dashboard', 'food-rescue':'/food-rescue/dashboard' };
  return <Navigate to={paths[user?.role] || '/'} replace />;
}

function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/login" element={<LoginSelection/>}/>
    <Route path="/login/:role" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/menu" element={<Menu/>}/>
    <Route path="/menu/:id" element={<DishDetails/>}/>
    <Route path="/cart" element={<Cart/>}/>
    <Route element={<ProtectedRoute/>}>
      <Route element={<Shell/>}>
        <Route path="/dashboard" element={<DashboardRedirect/>}/>
        <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}/> }><Route index element={<Dashboard/>}/></Route>
        <Route path="/customer/dashboard" element={<ProtectedRoute roles={['customer']}/> }><Route index element={<Dashboard/>}/></Route>
        <Route path="/kitchen/dashboard" element={<ProtectedRoute roles={['kitchen']}/> }><Route index element={<Dashboard/>}/></Route>
        <Route path="/inventory/dashboard" element={<ProtectedRoute roles={['inventory']}/> }><Route index element={<Dashboard/>}/></Route>
        <Route path="/cashier/dashboard" element={<ProtectedRoute roles={['cashier']}/> }><Route index element={<Dashboard/>}/></Route>
        <Route path="/delivery/dashboard" element={<ProtectedRoute roles={['delivery']}/> }><Route index element={<Dashboard/>}/></Route>
        <Route path="/food-rescue/dashboard" element={<ProtectedRoute roles={['food-rescue']}/> }><Route index element={<Dashboard/>}/></Route>

        <Route path="/admin/menu" element={<ProtectedRoute roles={['admin']}/> }><Route index element={<AdminMenu/>}/></Route>
        <Route path="/admin/orders" element={<ProtectedRoute roles={['admin']}/> }><Route index element={<Orders mode="admin"/>}/></Route>
        <Route path="/admin/staff" element={<ProtectedRoute roles={['admin']}/> }><Route index element={<StaffPage/>}/></Route>
        <Route path="/admin/inventory" element={<ProtectedRoute roles={['admin']}/> }><Route index element={<InventoryPage/>}/></Route>
        <Route path="/inventory/ingredients" element={<ProtectedRoute roles={['inventory']}/> }><Route index element={<InventoryPage/>}/></Route>
        <Route path="/admin/forecast" element={<ProtectedRoute roles={['admin']}/> }><Route index element={<ForecastPage/>}/></Route>
        <Route path="/inventory/forecast" element={<ProtectedRoute roles={['inventory']}/> }><Route index element={<ForecastPage/>}/></Route>
        <Route path="/admin/sustainability" element={<ProtectedRoute roles={['admin']}/> }><Route index element={<SurplusPage mode="admin"/>}/></Route>
        <Route path="/inventory/waste" element={<ProtectedRoute roles={['inventory']}/> }><Route index element={<WastePage/>}/></Route>
        <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}/> }><Route index element={<ReportsPage/>}/></Route>
        <Route path="/admin/reservations" element={<ProtectedRoute roles={['admin']}/> }><Route index element={<Reservations management/>}/></Route>
        <Route path="/cashier/reservations" element={<ProtectedRoute roles={['cashier']}/> }><Route index element={<Reservations management/>}/></Route>
        <Route path="/reservations" element={<ProtectedRoute roles={['customer']}/> }><Route index element={<Reservations/>}/></Route>
        <Route path="/customer/orders" element={<ProtectedRoute roles={['customer']}/> }><Route index element={<Orders mode="customer"/>}/></Route>
        <Route path="/customer/profile" element={<ProtectedRoute roles={['customer']}/> }><Route index element={<Profile/>}/></Route>
        <Route path="/kitchen/orders" element={<ProtectedRoute roles={['kitchen']}/> }><Route index element={<Orders mode="kitchen"/>}/></Route>
        <Route path="/cashier/orders" element={<ProtectedRoute roles={['cashier']}/> }><Route index element={<Orders mode="cashier"/>}/></Route>
        <Route path="/delivery/orders" element={<ProtectedRoute roles={['delivery']}/> }><Route index element={<Orders mode="delivery"/>}/></Route>
        <Route path="/surplus" element={<ProtectedRoute roles={['customer']}/> }><Route index element={<SurplusPage/>}/></Route>
        <Route path="/food-rescue/claims" element={<ProtectedRoute roles={['food-rescue']}/> }><Route index element={<SurplusPage mode="claims"/>}/></Route>
        <Route path="/food-rescue/listings" element={<ProtectedRoute roles={['food-rescue']}/> }><Route index element={<SurplusPage mode="food-rescue"/>}/></Route>
      </Route>
    </Route>
    <Route path="*" element={<main className="not-found"><span>404</span><h1>That page wandered off.</h1><a className="button button-primary" href="/">Back to home</a></main>}/>
  </Routes>;
}

export default function App() {
  return <BrowserRouter><AuthProvider><CartProvider><AppRoutes/></CartProvider></AuthProvider></BrowserRouter>;
}
