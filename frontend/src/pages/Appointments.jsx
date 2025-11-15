import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Appointments() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ customer_name: '', service_id: '', scheduled_at: '' })
  const [err, setErr] = useState('')

  const load = async () => {
    try { setItems(await api('/api/appointments')) } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await api('/api/appointments', { method: 'POST', body: JSON.stringify(form) })
      setForm({ customer_name: '', service_id: '', scheduled_at: '' })
      load()
    } catch (e) { setErr(e.message) }
  }

  return (
    <div>
      <h2>Appointments</h2>
      {err && <p style={{color:'crimson'}}>{err}</p>}
      <form onSubmit={submit} style={{ display:'grid', gap:8, maxWidth: 420 }}>
        <input required placeholder="Customer name" value={form.customer_name} onChange={e=>setForm(f=>({...f, customer_name:e.target.value}))} />
        <input placeholder="Service ID (optional)" value={form.service_id} onChange={e=>setForm(f=>({...f, service_id:e.target.value}))} />
        <input required type="datetime-local" value={form.scheduled_at} onChange={e=>setForm(f=>({...f, scheduled_at:e.target.value}))} />
        <button>Add</button>
      </form>
      <ul>
        {items.map(a => (
          <li key={a.id}><b>{a.customer_name}</b> — {new Date(a.scheduled_at).toLocaleString()} {a.service_id && `(service ${a.service_id})`}</li>
        ))}
      </ul>
    </div>
  )
}
