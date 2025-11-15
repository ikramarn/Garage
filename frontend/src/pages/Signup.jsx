import { useState } from 'react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

export default function Signup() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password, role: 'customer' }) })
      setMessage('Account created. Redirecting to login...')
      setTimeout(() => navigate('/login'), 800)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold mb-4">Create your account</h1>
        {error && <p className="text-red-600 mb-3">{error}</p>}
        {message && <p className="text-green-600 mb-3">{message}</p>}
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Username</label>
            <input className="input" value={username} onChange={e=>setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary w-full">Sign up</button>
        </form>
      </div>
    </div>
  )
}
