import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'

export default function Payments() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [invoices, setInvoices] = useState([])
  const [form, setForm] = useState({ invoice_id: '', amount: 0, currency: 'USD', method: 'card' })
  const [err, setErr] = useState('')

  const load = async () => {
    try {
      const [p, inv] = await Promise.all([
        api('/api/payments'),
        api('/api/invoices')
      ])
      setItems(p)
      // If not admin, only show user's invoices (API already filters)
      setInvoices(inv)
    } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await api('/api/payments', { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount) }) })
      setForm({ invoice_id: '', amount: 0, currency: 'USD', method: 'card' })
      load()
    } catch (e) { setErr(e.message) }
  }

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h2 className="text-2xl font-semibold mb-4">Payments</h2>
        {err && <p className="text-red-600 mb-3">{err}</p>}
        <form onSubmit={submit} className="grid gap-3 max-w-xl">
          <div>
            <label className="label">Invoice</label>
            <select className="input" required value={form.invoice_id} onChange={e=>setForm(f=>({...f, invoice_id:e.target.value}))}>
              <option value="">Select invoice</option>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>#{'{'}inv.id{'}'} · ${'{'}Number(inv.amount).toFixed(2){'}'} { '{'}inv.currency{'}'} (appt { '{'}inv.appointment_id{'}'})</option>
              ))}
            </select>
          </div>
          <input className="input" required type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Currency" value={form.currency} onChange={e=>setForm(f=>({...f, currency:e.target.value}))} />
            <select className="input" value={form.method} onChange={e=>setForm(f=>({...f, method:e.target.value}))}>
              <option value="card">Card</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>
          <button className="btn btn-primary w-fit">Make payment</button>
        </form>
      </div>
      <div className="grid gap-3">
        {items.map(p => (
          <div key={p.id} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">${'{'}p.amount{'}'} { '{'}p.currency{'}'}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">for invoice { '{'}p.invoice_id || '—'{'}'}</div>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">{p.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
