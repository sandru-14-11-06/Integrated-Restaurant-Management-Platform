import { useEffect, useState } from 'react';
import { Edit3, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import api from '../services/api';
import { fallbackImage, formatCurrency, resolveImage } from '../utils';

const categories = ['South Indian','North Indian','Indian Breakfast','Indian Meals and Thali','Biryani and Rice','Indian Snacks and Starters','Indian Street Food','Indian Breads','Indian Desserts and Sweets','Indian Beverages'];
const blank = { name:'', description:'', image:'', category:categories[0], price:'', foodType:'Vegetarian', ingredients:'', allergens:'', preparationTime:15, available:true, spiceLevel:'Medium', dietaryTags:'', popular:false };

export default function AdminMenu() {
  const [dishes, setDishes] = useState([]); const [ingredients, setIngredients] = useState([]);
  const [form, setForm] = useState(blank); const [editing, setEditing] = useState(''); const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all'); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const [recipeRows, setRecipeRows] = useState([]);
  const load = () => api.get('/menu?available=all').then(({data})=>setDishes(data)).catch((e)=>setError(e.response?.data?.message||'Could not load dishes.'));
  useEffect(() => { load(); api.get('/ingredients').then(({data})=>setIngredients(data)).catch(()=>{}); }, []);
  const openNew = () => { setForm(blank); setEditing(''); setRecipeRows([]); setShowForm(true); setError(''); setMessage(''); };
  const openEdit = (dish) => {
    setForm({ ...dish, ingredients:(dish.ingredients||[]).join(', '), allergens:(dish.allergens||[]).join(', '), dietaryTags:(dish.dietaryTags||[]).join(', '), price:String(dish.price) });
    setRecipeRows((dish.recipe||[]).map((r)=>({ ingredient:r.ingredient?._id||r.ingredient, quantity:r.quantity })));
    setEditing(dish._id); setShowForm(true); setError(''); setMessage('');
  };
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const payload = { ...form, price:Number(form.price), preparationTime:Number(form.preparationTime), ingredients:form.ingredients.split(',').map(x=>x.trim()).filter(Boolean), allergens:form.allergens.split(',').map(x=>x.trim()).filter(Boolean), dietaryTags:form.dietaryTags.split(',').map(x=>x.trim()).filter(Boolean), recipe:recipeRows.filter(r=>r.ingredient&&Number(r.quantity)>0).map(r=>({ingredient:r.ingredient,quantity:Number(r.quantity)})) };
    try {
      const { data } = editing ? await api.put(`/menu/${editing}`,payload) : await api.post('/menu',payload);
      setDishes((current)=>editing?current.map(d=>d._id===editing?data:d):[data,...current]);
      setMessage(editing?'Dish details updated.':'Dish added to the menu and visible to customers.');
      setShowForm(false); setForm(blank); setEditing('');
    } catch(e) { setError(e.response?.data?.message||'Could not save this dish.'); }
    finally { setBusy(false); }
  };
  const remove = async (dish) => {
    if (!window.confirm(`Remove ${dish.name}? Historical orders will be preserved.`)) return;
    try { const {data}=await api.delete(`/menu/${dish._id}`); setMessage(data.message); await load(); }
    catch(e){setError(e.response?.data?.message||'Could not remove dish.');}
  };
  const availability = async(dish) => {
    try { const {data}=await api.patch(`/menu/${dish._id}/availability`,{available:!dish.available}); setDishes(dishes.map(d=>d._id===dish._id?data:d)); }
    catch(e){setError(e.response?.data?.message||'Availability update failed.');}
  };
  const uploadImage = async (file) => {
    if (!file) return; const data = new FormData(); data.append('image',file);
    try { const response=await api.post('/menu/upload',data,{headers:{'Content-Type':'multipart/form-data'}}); setForm({...form,image:response.data.url}); }
    catch(e){setError(e.response?.data?.message||'Image upload failed.');}
  };
  const shown = dishes.filter(d=>(filter==='all'||(filter==='available'?d.available:!d.available))&&`${d.name} ${d.category}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="page-wrap"><div className="page-heading"><div><span className="eyebrow">Your kitchen, your menu</span><h1>Menu management</h1><p>{dishes.length} dishes, each one made yours.</p></div><button className="button button-primary" onClick={openNew}><Plus size={18}/> Add new dish</button></div>
    {error&&<div className="alert error">{error}</div>}{message&&<div className="alert success">{message}</div>}
    <div className="table-toolbar"><div className="search-box"><Search size={17}/><input placeholder="Find a dish…" value={search} onChange={e=>setSearch(e.target.value)}/></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All availability</option><option value="available">Available</option><option value="unavailable">Unavailable</option></select></div>
    <div className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Dish</th><th>Category</th><th>Type</th><th>Price</th><th>Prep</th><th>Availability</th><th>Actions</th></tr></thead><tbody>{shown.map(d=><tr key={d._id}><td><div className="dish-table-cell"><img src={resolveImage(d.image)} onError={(e)=>{e.currentTarget.src=fallbackImage;}} alt=""/><b>{d.name}</b></div></td><td>{d.category}</td><td><span className={`food-label ${d.foodType==='Vegetarian'?'veg-label':'nonveg-label'}`}>{d.foodType}</span></td><td><b>{formatCurrency(d.price)}</b></td><td>{d.preparationTime} min</td><td><button className={`availability-toggle ${d.available?'on':''}`} onClick={()=>availability(d)}><i/>{d.available?'Available':'Paused'}</button></td><td><div className="row-actions"><button className="icon-button" title="Edit dish" onClick={()=>openEdit(d)}><Edit3 size={16}/></button><button className="icon-button danger-icon" title="Delete dish" onClick={()=>remove(d)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{!shown.length&&<div className="empty-inline">No matching dishes.</div>}</div></div>
    {showForm&&<div className="modal-backdrop" onClick={()=>setShowForm(false)}><div className="dish-modal" onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">{editing?'Refine your recipe':'A new favourite'}</span><h2>{editing?'Edit dish':'Add a new dish'}</h2></div><button className="icon-button" onClick={()=>setShowForm(false)} aria-label="Close"><X/></button></div>
      <form onSubmit={save} className="form-stack modal-form"><div className="form-row"><label>Dish name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label></div>
        <label>Description<textarea rows="2" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <div className="form-row"><label>Price (₹)<input type="number" min="0" step="0.01" required value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>Food type<select value={form.foodType} onChange={e=>setForm({...form,foodType:e.target.value})}><option>Vegetarian</option><option>Non-Vegetarian</option></select></label><label>Prep time (min)<input type="number" min="1" max="300" value={form.preparationTime} onChange={e=>setForm({...form,preparationTime:e.target.value})}/></label></div>
        <label>Image URL<input value={form.image} onChange={e=>setForm({...form,image:e.target.value})} placeholder="Paste an image URL or upload below"/></label><label className="upload-control"><Upload size={16}/> Upload image (JPG, PNG, WEBP · max 3 MB)<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>uploadImage(e.target.files?.[0])}/></label>
        <label>Ingredients <small>Separate with commas</small><input value={form.ingredients} onChange={e=>setForm({...form,ingredients:e.target.value})} placeholder="Rice batter, potato, onion"/></label>
        <div className="form-row"><label>Allergens<input value={form.allergens} onChange={e=>setForm({...form,allergens:e.target.value})} placeholder="Dairy, nuts"/></label><label>Dietary tags<input value={form.dietaryTags} onChange={e=>setForm({...form,dietaryTags:e.target.value})} placeholder="Gluten-free, Jain"/></label></div>
        <div className="form-row"><label>Spice level<select value={form.spiceLevel} onChange={e=>setForm({...form,spiceLevel:e.target.value})}><option>Mild</option><option>Medium</option><option>Hot</option></select></label><label className="checkbox-label"><input type="checkbox" checked={form.available} onChange={e=>setForm({...form,available:e.target.checked})}/> Available to order</label><label className="checkbox-label"><input type="checkbox" checked={form.popular} onChange={e=>setForm({...form,popular:e.target.checked})}/> Mark as popular</label></div>
        <div className="recipe-builder"><div className="recipe-heading"><b>Recipe mapping</b><button type="button" className="text-link" onClick={()=>setRecipeRows([...recipeRows,{ingredient:'',quantity:''}])}><Plus size={15}/> Add ingredient</button></div>{recipeRows.map((row,index)=><div className="form-row recipe-row" key={index}><select value={row.ingredient} onChange={e=>setRecipeRows(recipeRows.map((r,i)=>i===index?{...r,ingredient:e.target.value}:r))}><option value="">Choose inventory ingredient</option>{ingredients.map(i=><option key={i._id} value={i._id}>{i.name} ({i.unit})</option>)}</select><input aria-label="Recipe quantity" type="number" min="0.01" step="0.01" placeholder="Qty per dish" value={row.quantity} onChange={e=>setRecipeRows(recipeRows.map((r,i)=>i===index?{...r,quantity:e.target.value}:r))}/><button className="icon-button" type="button" onClick={()=>setRecipeRows(recipeRows.filter((_,i)=>i!==index))}><X size={16}/></button></div>)}{!ingredients.length&&<small className="muted">Add inventory ingredients first to map stock usage.</small>}</div>
        <div className="modal-actions"><button className="button button-outline" type="button" onClick={()=>setShowForm(false)}>Cancel</button><button className="button button-primary" disabled={busy}>{busy?'Saving…':editing?'Save changes':'Add dish'}</button></div>
      </form></div></div>}
  </div>;
}
