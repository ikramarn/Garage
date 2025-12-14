import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Checkout() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const invoiceId = params.get('invoice')
  const success = params.get('success') === 'true'
  const [clientSecret, setClientSecret] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      try {
        if (success && invoiceId) {
          // verify and mark paid after hosted checkout returns
          await api(`/api/payments/stripe/verify-session`, { method: 'POST', body: JSON.stringify({ invoice_id: invoiceId }) })
          navigate('/invoices')
          return
        }
        const res = await api('/api/payments/stripe/create-intent', { method: 'POST', body: JSON.stringify({ invoice_id: invoiceId }) })
        setClientSecret(res?.client_secret || '')
      } catch (e) { setErr(e.message) }
    })()
  }, [invoiceId, success, navigate])

  return (
    <div className="card p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-semibold mb-3">Checkout</h2>
      {err && <p className="text-red-600 mb-3">{err}</p>}
      {!success && !clientSecret ? (
        <p className="text-gray-700">Preparing payment…</p>
      ) : (
        <div className="grid gap-3">
          {/* Placeholder for Stripe Elements card form */}
          {success ? (
            <p className="text-green-700">Payment succeeded. Redirecting to invoices…</p>
          ) : (
            <p className="text-gray-700">Stripe Elements would render here. Client secret ready.</p>
          )}
          <p className="text-xs text-gray-500">Invoice #{invoiceId}</p>
        </div>
      )}
    </div>
  )
}
