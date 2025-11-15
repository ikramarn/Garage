import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Services() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', description: '', price: 0 })
  const [err, setErr] = useState('')

  const load = async () => {
    try { setItems(await api('/api/services')) } catch (e) { setErr(e.message) }
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

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h2 className="text-2xl font-semibold mb-4">Services</h2>
        {err && <p className="text-red-600 mb-3">{err}</p>}
        <form onSubmit={submit} className="grid gap-3 max-w-xl">
          <input className="input" required placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} />
          <input className="input" placeholder="Description" value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} />
          <input className="input" required type="number" step="0.01" placeholder="Price" value={form.price} onChange={e=>setForm(f=>({...f, price:e.target.value}))} />
          <button className="btn btn-primary w-fit">Add service</button>
        </form>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(s => (
          <div key={s.id} className="card p-4">
            <div className="font-semibold">{s.name} <span className="text-brand-700 dark:text-brand-300">${'{'}s.price{'}'}</span></div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{s.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
