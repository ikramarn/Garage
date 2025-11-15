import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Payments() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ appointment_id: '', amount: 0, currency: 'USD', method: 'card' })
  const [err, setErr] = useState('')

  const load = async () => {
    try { setItems(await api('/api/payments')) } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await api('/api/payments', { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount) }) })
      setForm({ appointment_id: '', amount: 0, currency: 'USD', method: 'card' })
      load()
    } catch (e) { setErr(e.message) }
  }

  return (
    <div>
      <h2>Payments</h2>
      {err && <p style={{color:'crimson'}}>{err}</p>}
      <form onSubmit={submit} style={{ display:'grid', gap:8, maxWidth: 420 }}>
        <input required placeholder="Appointment ID" value={form.appointment_id} onChange={e=>setForm(f=>({...f, appointment_id:e.target.value}))} />
        <input required type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} />
        <input placeholder="Currency" value={form.currency} onChange={e=>setForm(f=>({...f, currency:e.target.value}))} />
        <input placeholder="Method" value={form.method} onChange={e=>setForm(f=>({...f, method:e.target.value}))} />
        <button>Create payment</button>
      </form>
      <ul>
        {items.map(p => (
          <li key={p.id}><b>${'{'}p.amount{'}'} { '{'}p.currency{'}'}</b> for appt {p.appointment_id} — {p.status}</li>
        ))}
      </ul>
    </div>
  )
}
