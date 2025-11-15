import { useEffect, useState } from 'react'
import { api } from '../api'

import { useAuth } from '../auth/AuthContext'

export default function Invoices() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ appointment_id: '', amount: 0, currency: 'USD' })
  const [err, setErr] = useState('')
  const { token, user } = useAuth()

  const load = async () => {
    try { setItems(await api('/api/invoices')) } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await api('/api/invoices', { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount) }), headers: { Authorization: `Bearer ${token}` } })
      setForm({ appointment_id: '', amount: 0, currency: 'USD' })
      load()
    } catch (e) { setErr(e.message) }
  }

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h2 className="text-2xl font-semibold mb-4">Invoices</h2>
        {user && <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Signed in as <b>{user.username}</b> ({user.role}). {user.role !== 'admin' ? 'You will only see your invoices.' : 'You can see all invoices.'}</p>}
        {err && <p className="text-red-600 mb-3">{err}</p>}
        <form onSubmit={submit} className="grid gap-3 max-w-xl">
          <input className="input" required placeholder="Appointment ID" value={form.appointment_id} onChange={e=>setForm(f=>({...f, appointment_id:e.target.value}))} />
          <input className="input" required type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} />
          <input className="input" placeholder="Currency" value={form.currency} onChange={e=>setForm(f=>({...f, currency:e.target.value}))} />
          <button className="btn btn-primary w-fit">Create invoice</button>
        </form>
      </div>
      <div className="grid gap-3">
        {items.map(inv => (
          <div key={inv.id} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">${'{'}inv.amount{'}'} { '{'}inv.currency{'}'}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">for appt {inv.appointment_id}</div>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{inv.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
