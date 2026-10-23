import { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fallbackImage, formatCurrency, resolveImage } from '../utils';

export default function DishCard({ dish, onAdd }) {
  const [broken, setBroken] = useState(false);
  return <article className="dish-card">
    <div className="dish-image-wrap">
      <Link to={`/menu/${dish._id}`} className="dish-image-link"><img src={broken ? fallbackImage : resolveImage(dish.image)} onError={() => setBroken(true)} alt={dish.name} /></Link>
      <span className={`food-mark ${dish.foodType === 'Vegetarian' ? 'veg' : 'nonveg'}`} aria-label={dish.foodType} />
      {dish.popular && <span className="popular-tag">Popular</span>}
    </div>
    <div className="dish-content">
      <div className="dish-meta"><span>{dish.category}</span><span><Clock size={13} /> {dish.preparationTime} min</span></div>
      <Link to={`/menu/${dish._id}`} className="dish-title-link"><h3>{dish.name}</h3></Link><p>{dish.description || 'Made fresh with traditional Indian flavours.'}</p>
      <div className="dish-bottom"><strong>{formatCurrency(dish.price)}</strong><button className="add-button" onClick={() => onAdd(dish)} disabled={!dish.available}><Plus size={17} /> Add</button></div>
    </div>
  </article>;
}
