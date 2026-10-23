import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { roleNames } from '../utils';

export default function Profile() {
  const {user,updateUser}=useAuth();const [form,setForm]=useState({name:'',phone:'',address:''});const [error,setError]=useState('');const [message,setMessage]=useState('');
  useEffect(()=>{api.get('/profile').then(({data})=>setForm({name:data.name||'',phone:data.phone||'',address:data.address||''})).catch(e=>setError(e.response?.data?.message||'Could not load your profile.'));},[]);
  const save=async(e)=>{e.preventDefault();setError('');setMessage('');try{const {data}=await api.patch('/profile',form);setForm({name:data.name,phone:data.phone||'',address:data.address||''});updateUser({name:data.name});setMessage('Your profile has been updated.');}catch(err){setError(err.response?.data?.message||'Could not save your profile.');}};
  return <div className="page-wrap"><div className="page-heading"><div><span className="eyebrow">A few details for a smoother visit</span><h1>Your profile</h1><p>Manage the contact details used for reservations and delivery.</p></div></div>{error&&<div className="alert error">{error}</div>}{message&&<div className="alert success">{message}</div>}<form className="panel profile-form form-stack" onSubmit={save}><span className="role-icon large"><UserRound/></span><h3>{roleNames[user?.role]}</h3><label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Email address<input value={user?.email||''} disabled/><small>Email and role are managed by the restaurant.</small></label><label>Phone number<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Optional"/></label><label>Delivery address<textarea rows="3" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Building, street, area, city"/></label><button className="button button-primary">Save profile</button></form></div>;
}
