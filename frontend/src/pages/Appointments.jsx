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
    <div className="grid gap-6">
      <div className="card p-6">
        <h2 className="text-2xl font-semibold mb-4">Appointments</h2>
        {err && <p className="text-red-600 mb-3">{err}</p>}
        <form onSubmit={submit} className="grid gap-3 max-w-xl">
          <input className="input" required placeholder="Customer name" value={form.customer_name} onChange={e=>setForm(f=>({...f, customer_name:e.target.value}))} />
          <input className="input" placeholder="Service ID (optional)" value={form.service_id} onChange={e=>setForm(f=>({...f, service_id:e.target.value}))} />
          <input className="input" required type="datetime-local" value={form.scheduled_at} onChange={e=>setForm(f=>({...f, scheduled_at:e.target.value}))} />
          <button className="btn btn-primary w-fit">Add appointment</button>
        </form>
      </div>
      <div className="grid gap-3">
        {items.map(a => (
          <div key={a.id} className="card p-4">
            <div className="font-medium">{a.customer_name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{new Date(a.scheduled_at).toLocaleString()} {a.service_id && `(service ${a.service_id})`}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
