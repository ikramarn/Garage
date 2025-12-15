import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-brand-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`

export default function Nav() {
  const { user, logout } = useAuth()
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800 backdrop-blur bg-white/70 dark:bg-gray-950/70">
      <div className="container flex items-center justify-between py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-brand-700 dark:text-brand-300">
          <span className="text-xl">🛠️</span>
          <span>Garage</span>
        </Link>
        <nav className="flex items-center gap-2">
          <NavLink to="/" className={linkClass} end>Home</NavLink>
          <NavLink to="/appointments" className={linkClass}>Appointments</NavLink>
          {user && user.role !== 'admin' && (
            <NavLink to="/payments" className={linkClass}>Payments</NavLink>
          )}
          <NavLink to="/invoices" className={linkClass}>Invoices</NavLink>
          <NavLink to="/contactus" className={linkClass}>Contact Us</NavLink>
          <NavLink to="/services" className={linkClass}>Services</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-gray-600 dark:text-gray-300">{user.username} ({user.role})</span>
              <button className="btn btn-outline" onClick={logout}>Logout</button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink to="/signup" className="btn btn-outline">Sign up</NavLink>
              <NavLink to="/login" className="btn btn-primary">Login</NavLink>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
