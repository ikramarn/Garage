import { useEffect, useState } from 'react'
import { api } from '../api'

export default function ContactUs() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [err, setErr] = useState('')

  const load = async () => {
    try {
      const data = await api('/api/contactus')
      const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : [])
      setItems(list)
    } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await api('/api/contactus', { method: 'POST', body: JSON.stringify(form) })
      setForm({ name: '', email: '', message: '' })
      load()
    } catch (e) { setErr(e.message) }
  }

  return (
    <div className="grid gap-6">
      <div className="card p-6 max-w-xl">
        <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
        {err && <p className="text-red-600 mb-3">{err}</p>}
        <form onSubmit={submit} className="grid gap-3">
          <input className="input" required placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} />
          <input className="input" required type="email" placeholder="Email" value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))} />
          <textarea className="input" rows="4" required placeholder="Message" value={form.message} onChange={e=>setForm(f=>({...f, message:e.target.value}))} />
          <button className="btn btn-primary w-fit">Send</button>
        </form>
      </div>
      <div className="grid gap-3">
        {Array.isArray(items) && items.map(m => (
          <div key={m.id} className="card p-4">
            <div className="font-medium">{m.name} <span className="text-xs text-gray-500">({m.email})</span></div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{new Date(m.created_at).toLocaleString()}</div>
            <p className="mt-1">{m.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
