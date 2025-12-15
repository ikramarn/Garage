import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'

export default function Services() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', description: '', price: 0 })
  const [err, setErr] = useState('')
  const [booking, setBooking] = useState({ service_id: '', customer_name: '', scheduled_at: '' })
  const { user } = useAuth()

  const load = async () => {
    try {
      const data = await api('/api/services')
      setItems(Array.isArray(data) ? data : [])
    } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await api('/api/services', { method: 'POST', body: JSON.stringify({ ...form, price: Number(form.price) }) })
      setForm({ name: '', description: '', price: 0 })
      load()
    } catch (e) { setErr(e.message) }
  }

  const book = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      const svc = items.find(i => i.id === booking.service_id)
      const payload = {
        customer_name: booking.customer_name,
        service_ids: booking.service_id ? [booking.service_id] : [],
        total_price: svc ? Number(svc.price) : 0,
        scheduled_at: booking.scheduled_at,
      }
      await api('/api/appointments', { method: 'POST', body: JSON.stringify(payload) })
      setBooking({ service_id: '', customer_name: '', scheduled_at: '' })
      alert('Appointment booked')
    } catch (e) {
      if (String(e.message).includes('401')) setErr('Please login to make an appointment.')
      else setErr(e.message)
    }
  }

  const quickPick = (name) => {
    const svc = items.find(i => i.name.toLowerCase() === name.toLowerCase())
    if (svc) setBooking(b => ({ ...b, service_id: svc.id }))
  }

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h2 className="text-2xl font-semibold mb-4">Services</h2>
        {err && <p className="text-red-600 mb-3">{err}</p>}
        {user && user.role === 'admin' ? (
          <form onSubmit={submit} className="grid gap-3 max-w-xl">
            <input className="input" required placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} />
            <input className="input" placeholder="Description" value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} />
            <input className="input" required type="number" step="0.01" placeholder="Price" value={form.price} onChange={e=>setForm(f=>({...f, price:e.target.value}))} />
            <button className="btn btn-primary w-fit">Add service</button>
          </form>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">Only admins can add new services.</p>
        )}
      </div>
      <div className="card p-6">
        <h3 className="text-xl font-semibold mb-3">Quick booking</h3>
        <div className="flex gap-2 mb-3">
          <button type="button" className="btn btn-outline" onClick={() => quickPick('Book an MOT')}>MOT</button>
          <button type="button" className="btn btn-outline" onClick={() => quickPick('Book a service')}>Service</button>
          <button type="button" className="btn btn-outline" onClick={() => quickPick('Book a repair work')}>Repair</button>
        </div>
        <form onSubmit={book} className="grid gap-3 max-w-xl">
          <select className="input" required value={booking.service_id} onChange={e=>setBooking(b=>({...b, service_id:e.target.value}))}>
            <option value="">Select service</option>
            {items.map(s => <option key={s.id} value={s.id}>{s.name} (£{Number(s.price || 0).toFixed(2)})</option>)}
          </select>
          <input className="input" required placeholder="Customer name" value={booking.customer_name} onChange={e=>setBooking(b=>({...b, customer_name:e.target.value}))} />
          <input className="input" required type="datetime-local" value={booking.scheduled_at} onChange={e=>setBooking(b=>({...b, scheduled_at:e.target.value}))} />
          <button className="btn btn-primary w-fit">Book</button>
        </form>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(s => (
          <div key={s.id} className="card p-4">
            <div className="font-semibold">{s.name} <span className="text-brand-700 dark:text-brand-300">£{Number(s.price || 0).toFixed(2)}</span></div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{s.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
