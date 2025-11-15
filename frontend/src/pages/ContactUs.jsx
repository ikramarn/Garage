import { useEffect, useState } from 'react'
import { api } from '../api'

export default function ContactUs() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [err, setErr] = useState('')

  const load = async () => {
    try { setItems(await api('/api/contactus')) } catch (e) { setErr(e.message) }
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
    <div>
      <h2>Contact Us</h2>
      {err && <p style={{color:'crimson'}}>{err}</p>}
      <form onSubmit={submit} style={{ display:'grid', gap:8, maxWidth: 420 }}>
        <input required placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} />
        <input required type="email" placeholder="Email" value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))} />
        <textarea required placeholder="Message" value={form.message} onChange={e=>setForm(f=>({...f, message:e.target.value}))} />
        <button>Send</button>
      </form>
      <ul>
        {items.map(m => (
          <li key={m.id}><b>{m.name}</b> ({m.email}) — {new Date(m.created_at).toLocaleString()}<br />{m.message}</li>
        ))}
      </ul>
    </div>
  )
}
