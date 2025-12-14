import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Link } from 'react-router-dom'

export default function Appointments() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ customer_name: '', service_ids: [], total_price: 0, scheduled_at: '' })
  const [err, setErr] = useState('')
  const [services, setServices] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])

  const load = async () => {
    if (!user) { setItems([]); return }
    try { setItems(await api('/api/appointments')) } catch (e) {
      if (String(e.message).includes('401')) setErr('Please login to make an appointment.')
      else setErr(e.message)
    }
  }
  useEffect(() => { load() }, [user])

  useEffect(() => {
    // services are public; load once for picker
    (async () => {
      try { setServices(await api('/api/services')) } catch {}
    })()
  }, [])

  useEffect(() => {
    // keep form in sync with selected services
    const map = new Map(services.map(s => [s.id, s]))
    const total = selectedIds.reduce((sum, id) => sum + (map.get(id)?.price || 0), 0)
    setForm(f => ({ ...f, service_ids: selectedIds, total_price: Number(total.toFixed(2)) }))
  }, [selectedIds, services])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      await api('/api/appointments', { method: 'POST', body: JSON.stringify(form) })
      setForm({ customer_name: '', service_ids: [], total_price: 0, scheduled_at: '' })
      setSelectedIds([])
      load()
    } catch (e) {
      if (String(e.message).includes('401')) setErr('Please login to make an appointment.')
      else setErr(e.message)
    }
  }

  const remove = async (id) => {
    setErr('')
    try {
      await api(`/api/appointments/${id}`, { method: 'DELETE' })
      load()
    } catch (e) { setErr(e.message) }
  }

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h2 className="text-2xl font-semibold mb-4">Appointments</h2>
        {err && <p className="text-red-600 mb-3">{err}</p>}
        {!user && <p className="text-gray-600 dark:text-gray-300 mb-3">Please login to make an appointment.</p>}
        {user && (
          <form onSubmit={submit} className="grid gap-3 max-w-xl">
            <input className="input" required placeholder="Customer name" value={form.customer_name} onChange={e=>setForm(f=>({...f, customer_name:e.target.value}))} />
            <div>
              <button type="button" className="btn btn-outline" onClick={() => setPickerOpen(true)}>Select services</button>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                {form.service_ids.length ? `${form.service_ids.length} service(s) selected · Total: $${form.total_price}` : 'No services selected'}
              </div>
            </div>
            <input className="input" required type="datetime-local" value={form.scheduled_at} onChange={e=>setForm(f=>({...f, scheduled_at:e.target.value}))} />
            <button className="btn btn-primary w-fit">Add appointment</button>
          </form>
        )}
      </div>
      <div className="grid gap-3">
        {items.map(a => (
          <div key={a.id} className="card p-4">
            <div className="font-medium">{a.customer_name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {new Date(a.scheduled_at).toLocaleString()} · {Array.isArray(a.service_ids) ? `${a.service_ids.length} service(s)` : '0 services'} · ${'{'}Number(a.total_price || 0).toFixed(2){'}'}
            </div>
            {user?.role === 'admin' && (
              <div className="flex gap-2 mt-2">
                <button className="btn btn-outline" onClick={() => remove(a.id)}>Delete</button>
                  <Link className="btn btn-primary" to={`/invoices/new/${a.id}`}>Create invoice</Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold mb-3">Select services</h3>
            <div className="max-h-64 overflow-auto grid gap-2 mb-3">
              {services.map(s => (
                <label key={s.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={e => {
                      setSelectedIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))
                    }} />
                    <span>{s.name}</span>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">${'{'}s.price{'}'}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-200">Total: <span className="font-semibold">${'{'}form.total_price{'}'}</span></div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-outline" onClick={() => setPickerOpen(false)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={() => setPickerOpen(false)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
