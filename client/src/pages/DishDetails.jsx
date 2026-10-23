import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Leaf } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { fallbackImage, formatCurrency, resolveImage } from '../utils';

export default function DishDetails() {
  const { id } = useParams(); const [dish,setDish]=useState(null); const [error,setError]=useState('');
  const { add }=useCart();
  useEffect(()=>{api.get(`/menu/${id}`).then(({data})=>setDish(data)).catch(e=>setError(e.response?.data?.message||'Dish details could not be loaded.'));},[id]);
  if(error)return <div className="detail-page"><Link className="text-link" to="/menu"><ArrowLeft size={16}/> Back to menu</Link><div className="alert error">{error}</div></div>;
  if(!dish)return <div className="page-loader">Finding something delicious…</div>;
  return <div className="detail-page"><Link className="text-link" to="/menu"><ArrowLeft size={16}/> Back to menu</Link><div className="detail-card"><div className="detail-image"><img src={resolveImage(dish.image)} onError={e=>{e.currentTarget.src=fallbackImage;}} alt={dish.name}/><span className={`food-mark ${dish.foodType==='Vegetarian'?'veg':'nonveg'}`}/></div><section className="detail-copy"><span className="eyebrow">{dish.category}</span><h1>{dish.name}</h1><p className="detail-description">{dish.description}</p><div className="detail-facts"><span><Clock size={16}/> Ready in about {dish.preparationTime} minutes</span><span><Leaf size={16}/> {dish.foodType}</span></div><div className="detail-price">{formatCurrency(dish.price)}</div><button className="button button-primary" disabled={!dish.available} onClick={()=>add(dish)}>{dish.available?'Add to your bag':'Currently unavailable'}</button><div className="detail-columns"><div><h3>Ingredients</h3><p>{dish.ingredients?.length?dish.ingredients.join(', '):'Ask our team about today’s ingredients.'}</p></div><div><h3>Allergen information</h3><p>{dish.allergens?.length?dish.allergens.join(', '):'No allergens listed.'}</p></div></div>{dish.dietaryTags?.length>0&&<div className="detail-tags">{dish.dietaryTags.map(tag=><span key={tag}>{tag}</span>)}</div>}</section></div></div>;
}
