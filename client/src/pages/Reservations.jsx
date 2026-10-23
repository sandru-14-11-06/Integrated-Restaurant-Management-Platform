import { useEffect, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import api from '../services/api';

export default function Reservations({ management = false }) {
  const [rows, setRows] = useState([]); const [form, setForm] = useState({ name: '', phone: '', date: '', timeSlot: '', partySize: 2 });
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const load = () => api.get('/reservations').then(({ data }) => setRows(data)).catch((e) => setError(e.response?.data?.message || 'Unable to load reservations.'));
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault(); setError(''); setMessage('');
    try { await api.post('/reservations', { ...form, partySize: Number(form.partySize), date: new Date(`${form.date}T${form.timeSlot || '19:00'}:00`).toISOString() }); setMessage('Your reservation request is confirmed.'); setForm({ name: '', phone: '', date: '', timeSlot: '', partySize: 2 }); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Could not create reservation.'); }
  };
  const update = async (id, status) => { try { await api.patch(`/reservations/${id}/status`, { status }); await load(); } catch (err) { setError(err.response?.data?.message || 'Reservation update failed.'); } };
  return <div className="page-wrap"><div className="page-heading"><div><span className="eyebrow">Make room for a good time</span><h1>{management ? 'Reservations' : 'Save your seat'}</h1><p>{management ? 'Guest bookings and table assignments.' : 'Tell us when you’re coming, and we’ll set the table.'}</p></div></div>
    {error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}
    <div className="reservation-layout">{!management && <form className="panel form-stack" onSubmit={submit}><h3><CalendarDays size={19} /> Request a reservation</h3><label>Your name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Phone number<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><div className="form-row"><label>Date<input type="date" required min={new Date().toISOString().slice(0,10)} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Time<select required value={form.timeSlot} onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}><option value="">Choose a time</option>{['12:00','13:00','18:00','19:00','20:00','21:00'].map((time) => <option key={time}>{time}</option>)}</select></label></div><label>Party size<select value={form.partySize} onChange={(e) => setForm({ ...form, partySize: e.target.value })}>{[1,2,3,4,5,6,7,8].map((n)=><option key={n} value={n}>{n} {n===1?'guest':'guests'}</option>)}</select></label><button className="button button-primary">Request a table</button></form>}
      <section className="panel"><h3>{management ? 'Booking list' : 'Your upcoming bookings'}</h3>{rows.length ? <div className="table-scroll"><table><thead><tr><th>Guest</th><th>Date & time</th><th>Party</th><th>Table</th><th>Status</th>{management&&<th>Actions</th>}</tr></thead><tbody>{rows.map((row)=><tr key={row._id}><td>{row.name}</td><td>{new Date(row.date).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</td><td>{row.partySize}</td><td>{row.table?.number || 'Pending'}</td><td><span className="status-badge">{row.status}</span></td>{management&&<td><select value={row.status} onChange={(e)=>update(row._id,e.target.value)}><option>Booked</option><option>Seated</option><option>Completed</option><option>Cancelled</option></select></td>}{!management&&row.status==='Booked'&&<td><button className="icon-button danger-icon" title="Cancel reservation" onClick={()=>update(row._id,'Cancelled')}><X size={16}/></button></td>}</tr>)}</tbody></table></div> : <div className="empty-inline">No reservations yet.</div>}</section></div></div>;
}
