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
  const [filter, setFilter] = useState('all')
  const [payChoice, setPayChoice] = useState(null)
  const paymentsEnabled = (import.meta.env?.VITE_PAYMENTS_ENABLED === 'true')

  const load = async () => {
    try {
      const data = await api('/api/invoices')
      setItems(Array.isArray(data) ? data : [])
    } catch (e) { setErr(e.message) }
  }
  useEffect(() => { load() }, [token])

  useEffect(() => {
    if (user?.role === 'admin') {
      (async () => {
        try {
          const data = await api('/api/appointments')
          setAppts(Array.isArray(data) ? data : [])
        } catch {}
      })()
    }
  }, [user])

  return (
    <div className="grid gap-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-semibold">Invoices</h2>
          <div className="flex items-center gap-2">
            <button className={`btn ${filter==='all'?'btn-primary':'btn-outline'}`} onClick={()=>setFilter('all')}>All</button>
            <button className={`btn ${filter==='paid'?'btn-primary':'btn-outline'}`} onClick={()=>setFilter('paid')}>Paid</button>
            <button className={`btn ${filter==='unpaid'?'btn-primary':'btn-outline'}`} onClick={()=>setFilter('unpaid')}>Unpaid</button>
          </div>
        </div>
        {user && <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Signed in as <b>{user.username}</b> ({user.role}). {user.role !== 'admin' ? 'You will only see your invoices.' : 'You can see all invoices.'}</p>}
        {user && user.role === 'admin' && (
          <button className="btn btn-primary mb-4" onClick={() => setPickerOpen(true)}>Create invoice from appointment</button>
        )}
      <div className="grid gap-3">
        {items
          .filter(inv => filter==='all' ? true : filter==='paid' ? !!inv.paid || inv.status==='Paid' : !(inv.paid || inv.status==='Paid'))
          .map(inv => (
            <div key={inv.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${inv.paid || inv.status==='Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>{inv.paid || inv.status==='Paid' ? 'Paid' : (inv.status || 'Unpaid')}</span>
                <Link className="btn btn-outline" to={`/invoices/${inv.id}`}>View</Link>
              </div>
              <div className="flex items-center gap-2">
                {user && user.role === 'admin' ? (
                  <button className="btn btn-secondary" onClick={()=>setPayChoice(inv)}>Print</button>
                ) : (!inv.paid && (
                  <button className="btn btn-primary" onClick={()=>{
                    (async()=>{
                      try {
                        const session = await api('/api/payments/stripe/create-session', { method: 'POST', body: JSON.stringify({ invoice_id: inv.id }) })
                        if (session && session.url) window.location.href = session.url; else window.location.href = `/payments?invoice=${inv.id}`
                      } catch(e){ setErr(e.message) }
                    })()
                  }}>Pay Online</button>
                ))}
              </div>
            </div>
          ))}
      </div>
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
                    <div className="text-sm text-gray-600 dark:text-gray-300">{new Date(a.scheduled_at).toLocaleString()} · {Array.isArray(a.service_ids) ? a.service_ids.length : 0} service(s)</div>
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

      {payChoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-2">Select payment type</h3>
            <p className="mb-4 text-gray-700">Before printing, choose how to mark invoice #{payChoice.id} as paid.</p>
            <div className="grid grid-cols-2 gap-3">
              <button className="btn btn-secondary" onClick={async()=>{
                try { await api(`/api/invoices/${payChoice.id}/mark-paid`, { method: 'POST' }); setPayChoice(null); load(); }
                catch(e){ setErr(e.message) }
              }}>Manual Payment</button>
              <button className="btn btn-primary" onClick={async()=>{
                try {
                  const session = await api('/api/payments/stripe/create-session', { method: 'POST', body: JSON.stringify({ invoice_id: payChoice.id }) })
                  if (session?.url) window.location.href = session.url; else window.location.href = `/payments?invoice=${payChoice.id}`
                } catch(e){ setErr(e.message) }
              }}>Online Payment</button>
            </div>
            <div className="flex items-center justify-end mt-4">
              <button className="btn btn-outline" onClick={()=>setPayChoice(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
