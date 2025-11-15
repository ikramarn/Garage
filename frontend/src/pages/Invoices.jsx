import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Invoices() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ appointment_id: '', amount: 0, currency: 'USD' })
  const [err, setErr] = useState('')

  const load = async () => {
    try { setItems(await api('/api/invoices')) } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await api('/api/invoices', { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount) }) })
      setForm({ appointment_id: '', amount: 0, currency: 'USD' })
      load()
    } catch (e) { setErr(e.message) }
  }

  return (
    <div>
      <h2>Invoices</h2>
      {err && <p style={{color:'crimson'}}>{err}</p>}
      <form onSubmit={submit} style={{ display:'grid', gap:8, maxWidth: 420 }}>
        <input required placeholder="Appointment ID" value={form.appointment_id} onChange={e=>setForm(f=>({...f, appointment_id:e.target.value}))} />
        <input required type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} />
        <input placeholder="Currency" value={form.currency} onChange={e=>setForm(f=>({...f, currency:e.target.value}))} />
        <button>Create invoice</button>
      </form>
      <ul>
        {items.map(inv => (
          <li key={inv.id}><b>${'{'}inv.amount{'}'} { '{'}inv.currency{'}'}</b> for appt {inv.appointment_id} — {inv.status}</li>
        ))}
      </ul>
    </div>
  )
}
