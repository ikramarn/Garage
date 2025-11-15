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
    <div>
      <h2>Services</h2>
      {err && <p style={{color:'crimson'}}>{err}</p>}
      <form onSubmit={submit} style={{ display:'grid', gap:8, maxWidth: 420 }}>
        <input required placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} />
        <input placeholder="Description" value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} />
        <input required type="number" step="0.01" placeholder="Price" value={form.price} onChange={e=>setForm(f=>({...f, price:e.target.value}))} />
        <button>Add service</button>
      </form>
      <ul>
        {items.map(s => (
          <li key={s.id}><b>{s.name}</b> — ${'{'}s.price{'}'}<br />{s.description}</li>
        ))}
      </ul>
    </div>
  )
}
