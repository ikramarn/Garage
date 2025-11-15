import { useEffect, useState } from 'react'
import { api } from '../api'

import { useAuth } from '../auth/AuthContext'
import { Link, useNavigate } from 'react-router-dom'

export default function Invoices() {
  const [items, setItems] = useState([])
  const [err, setErr] = useState('')
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [appts, setAppts] = useState([])

  const load = async () => {
    try { setItems(await api('/api/invoices')) } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [token])

  useEffect(() => {
    if (user?.role === 'admin') {
      (async () => {
        try { setAppts(await api('/api/appointments')) } catch {}
      })()
    }
  }, [user])

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <h2 className="text-2xl font-semibold mb-4">Invoices</h2>
        {user && <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Signed in as <b>{user.username}</b> ({user.role}). {user.role !== 'admin' ? 'You will only see your invoices.' : 'You can see all invoices.'}</p>}
        {err && <p className="text-red-600 mb-3">{err}</p>}
        {user?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setPickerOpen(true)}>Create invoice from appointment</button>
        )}
      </div>
      <div className="grid gap-3">
        {items.map(inv => (
          <div key={inv.id} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">${'{'}Number(inv.amount).toFixed(2){'}'} { '{'}inv.currency{'}'}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">for appt {inv.appointment_id}</div>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{inv.status}</span>
            <Link className="btn btn-outline ml-3" to={`/invoices/${inv.id}`}>View</Link>
          </div>
        ))}
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold mb-3">Select appointment</h3>
            <div className="max-h-64 overflow-auto grid gap-2 mb-3">
              {appts.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div>
                    <div className="font-medium">{a.customer_name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{new Date(a.scheduled_at).toLocaleString()} · {Array.isArray(a.service_ids) ? `${'{'}a.service_ids.length{'}'}` : '0'} service(s)</div>
                  </div>
                  <button className="btn btn-outline" onClick={() => navigate(`/invoices/new/${a.id}`)}>Select</button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button className="btn btn-outline" onClick={() => setPickerOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
