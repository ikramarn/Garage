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
    <div className="grid gap-6">
      <div className="card p-6">
        <h2 className="text-2xl font-semibold mb-4">Payments</h2>
        {err && <p className="text-red-600 mb-3">{err}</p>}
        <form onSubmit={submit} className="grid gap-3 max-w-xl">
          <input className="input" required placeholder="Appointment ID" value={form.appointment_id} onChange={e=>setForm(f=>({...f, appointment_id:e.target.value}))} />
          <input className="input" required type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Currency" value={form.currency} onChange={e=>setForm(f=>({...f, currency:e.target.value}))} />
            <input className="input" placeholder="Method" value={form.method} onChange={e=>setForm(f=>({...f, method:e.target.value}))} />
          </div>
          <button className="btn btn-primary w-fit">Create payment</button>
        </form>
      </div>
      <div className="grid gap-3">
        {items.map(p => (
          <div key={p.id} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">${'{'}p.amount{'}'} { '{'}p.currency{'}'}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">for appt {p.appointment_id}</div>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">{p.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
