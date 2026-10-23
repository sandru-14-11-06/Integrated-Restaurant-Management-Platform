import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ShoppingBag } from 'lucide-react';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import DishCard from '../components/DishCard';

export default function Menu() {
  const [dishes, setDishes] = useState([]); const [error, setError] = useState(''); const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All'); const [foodType, setFoodType] = useState('All'); const [sort, setSort] = useState('recommended');
  const { add, count } = useCart(); const { user } = useAuth();
  useEffect(() => { api.get('/menu').then(({ data }) => setDishes(data)).catch(() => setError('Could not load the menu. Check that the API and MongoDB are running.')); }, []);
  const categories = useMemo(() => ['All', ...new Set(dishes.map((d) => d.category))], [dishes]);
  const visible = useMemo(() => {
    const rows = dishes.filter((d) => (category === 'All' || d.category === category) && (foodType === 'All' || d.foodType === foodType) && `${d.name} ${d.description}`.toLowerCase().includes(search.toLowerCase()));
    if (sort === 'price-low') rows.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') rows.sort((a, b) => b.price - a.price);
    return rows;
  }, [dishes, category, foodType, search, sort]);
  return <div className="menu-page">
    <section className="menu-banner"><div><span className="eyebrow">A little something, made fresh</span><h1>Made for the<br /><em>moments around food.</em></h1><p>Find your favourites, or let a new one find you.</p></div><img src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80" onError={(e)=>{e.currentTarget.src='/images/food-fallback.svg';}} alt="Indian thali" /><div className="banner-sticker">Cooked<br />with care <span>✳</span></div></section>
    <div className="menu-toolbar"><div className="search-box"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the menu…" /></div>
      <div className="filter-group"><SlidersHorizontal size={17} /><select value={foodType} onChange={(e) => setFoodType(e.target.value)}><option>All</option><option>Vegetarian</option><option>Non-Vegetarian</option></select><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="recommended">Recommended</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></div>
      <Link to={user ? '/cart' : '/login/customer'} className="button button-dark cart-shortcut"><ShoppingBag size={17} /> Bag <span>{count}</span></Link>
    </div>
    <div className="category-pills">{categories.map((cat) => <button key={cat} className={category === cat ? 'pill active' : 'pill'} onClick={() => setCategory(cat)}>{cat}</button>)}</div>
    {error && <div className="alert error">{error}</div>}
    {visible.length ? <div className="dish-grid">{visible.map((dish) => <DishCard key={dish._id} dish={dish} onAdd={(item) => add(item)} />)}</div> : <div className="empty-state"><span>🍽️</span><h3>No dishes just yet</h3><p>{dishes.length ? 'Try a different search or category.' : 'The team is preparing today’s menu.'}</p></div>}
    <div className="menu-bottom-note">All prices are in Indian Rupees. <span>Prepared fresh when you order.</span></div>
  </div>;
}
