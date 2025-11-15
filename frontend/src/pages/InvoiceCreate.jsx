import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function InvoiceCreate() {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const [err, setErr] = useState('')
  const [appt, setAppt] = useState(null)
  const [services, setServices] = useState([])
  const [rows, setRows] = useState([]) // {service_id, description, price, included}
  const [extraDesc, setExtraDesc] = useState('')
  const [extraPrice, setExtraPrice] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const [a, s] = await Promise.all([
          api(`/api/appointments/${appointmentId}`),
          api('/api/services')
        ])
        setAppt(a)
        setServices(s)
        const map = new Map(s.map(x => [x.id, x]))
        const base = Array.isArray(a.service_ids) ? a.service_ids.map(id => {
          const svc = map.get(id)
          return { service_id: id, description: svc?.name || id, price: Number(svc?.price || 0), included: true }
        }) : []
        setRows(base)
      } catch (e) {
        setErr(e.message)
      }
    })()
  }, [appointmentId])

  const total = useMemo(() => rows.filter(r => r.included).reduce((sum, r) => sum + Number(r.price || 0), 0), [rows])

  const addExtra = () => {
    if (!extraDesc || !extraPrice) return
    setRows(r => [...r, { service_id: null, description: extraDesc, price: Number(extraPrice), included: true }])
    setExtraDesc('')
    setExtraPrice('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      const items = rows.filter(r => r.included).map(r => ({ description: r.description, price: Number(r.price), service_id: r.service_id || undefined }))
      const payload = {
        appointment_id: appointmentId,
        items,
        amount: Number(total.toFixed(2)),
        currency: 'USD',
        owner_id: appt?.owner_id,
        customer_name: appt?.customer_name,
      }
      const created = await api('/api/invoices', { method: 'POST', body: JSON.stringify(payload) })
      navigate(`/invoices/${created.id}`)
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="card p-6 max-w-3xl">
        <h2 className="text-2xl font-semibold mb-4">Create Invoice</h2>
        {err && <p className="text-red-600 mb-3">{err}</p>}
        {appt ? (
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="label">Customer</div>
                <div className="input">{appt.customer_name}</div>
              </div>
              <div>
                <div className="label">Appointment</div>
                <div className="input">{appointmentId}</div>
              </div>
            </div>
            <div>
              <div className="label mb-2">Services</div>
              <div className="grid gap-2">
                {rows.map((r, idx) => (
                  <label key={idx} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={r.included} onChange={e => setRows(rs => rs.map((x,i) => i===idx ? { ...x, included: e.target.checked } : x))} />
                      <span>{r.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">$</span>
                      <input className="input w-28" type="number" step="0.01" value={r.price} onChange={e => setRows(rs => rs.map((x,i) => i===idx ? { ...x, price: e.target.value } : x))} />
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex items-end gap-2 mt-3">
                <div className="flex-1">
                  <div className="label">Extra work description</div>
                  <input className="input w-full" placeholder="e.g., Bulb replacement" value={extraDesc} onChange={e=>setExtraDesc(e.target.value)} />
                </div>
                <div>
                  <div className="label">Price</div>
                  <input className="input w-28" type="number" step="0.01" placeholder="0.00" value={extraPrice} onChange={e=>setExtraPrice(e.target.value)} />
                </div>
                <button type="button" className="btn btn-outline" onClick={addExtra}>Add</button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-lg">Total: <b>${total.toFixed(2)}</b></div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
                <button className="btn btn-primary">Create invoice</button>
              </div>
            </div>
          </form>
        ) : (
          <p>Loading appointment…</p>
        )}
      </div>
    </div>
  )
}
