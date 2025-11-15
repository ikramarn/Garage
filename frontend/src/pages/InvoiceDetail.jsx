import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'

export default function InvoiceDetail() {
  const { invoiceId } = useParams()
  const [err, setErr] = useState('')
  const [inv, setInv] = useState(null)

  useEffect(() => {
    (async () => {
      try { setInv(await api(`/api/invoices/${invoiceId}`)) } catch (e) { setErr(e.message) }
    })()
  }, [invoiceId])

  const printInvoice = () => {
    window.print()
  }

  const downloadPdf = async () => {
    try {
      const blob = await api(`/api/invoices/${invoiceId}/pdf`)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoiceId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      setErr(e.message)
    }
  }

  if (err) return <p className="text-red-600">{err}</p>
  if (!inv) return <p>Loading…</p>

  const items = Array.isArray(inv.items) ? inv.items : []
  const total = inv.amount ?? items.reduce((s,i) => s + Number(i.price||0), 0)

  return (
    <div className="grid gap-6 print:p-0 print:bg-white">
      <div className="card p-6 print:shadow-none print:border-0 print:p-0 print:rounded-none">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Invoice</h1>
            <div className="text-sm text-gray-600">#{invoiceId}</div>
          </div>
          <div className="text-right">
            <div className="text-sm">Status: <b>{inv.status}</b></div>
            <div className="text-sm">Date: {new Date(inv.issued_at).toLocaleString()}</div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <div className="label">Billed To</div>
            <div className="input">{inv.customer_name || 'Customer'} </div>
          </div>
          <div>
            <div className="label">Appointment</div>
            <div className="input">{inv.appointment_id}</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                <th className="py-2">Description</th>
                <th className="py-2 w-32 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2">{it.description}</td>
                  <td className="py-2 text-right">${Number(it.price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="py-2 font-semibold">Total</td>
                <td className="py-2 text-right font-semibold">${Number(total).toFixed(2)} {inv.currency}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="mt-6 flex gap-2 no-print">
          <button className="btn btn-outline" onClick={printInvoice}>Print / Download PDF</button>
          <button className="btn btn-primary" onClick={downloadPdf}>Download PDF (server)</button>
        </div>
      </div>
    </div>
  )
}
