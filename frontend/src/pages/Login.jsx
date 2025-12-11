import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const { setToken, user } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      setToken(res.token)
      navigate('/invoices')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold mb-4">Login</h1>
        {error && <p className="text-red-600 mb-3">{error}</p>}
        {user && <p className="text-green-700 mb-3">You are logged in as {user.username}. <button type="button" className="underline" onClick={()=>navigate('/')}>Go to home</button></p>}
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Username</label>
            <input className="input" value={username} onChange={e=>setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary w-full">Sign in</button>
        </form>
        <p className="text-sm text-gray-600 mt-3">No account? Use the API to register or ask admin to create one.</p>
      </div>
    </div>
  )
}
