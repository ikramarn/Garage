import { NavLink } from 'react-router-dom'

const linkStyle = ({ isActive }) => ({
  padding: '8px 12px',
  textDecoration: 'none',
  color: isActive ? '#fff' : '#333',
  background: isActive ? '#0078d4' : 'transparent',
  borderRadius: 6,
})

export default function Nav() {
  return (
    <nav style={{ display: 'flex', gap: 8, padding: 12, borderBottom: '1px solid #eee' }}>
      <NavLink to="/" style={linkStyle} end>Home</NavLink>
      <NavLink to="/appointments" style={linkStyle}>Appointments</NavLink>
      <NavLink to="/payments" style={linkStyle}>Payments</NavLink>
      <NavLink to="/invoices" style={linkStyle}>Invoices</NavLink>
      <NavLink to="/contactus" style={linkStyle}>Contact Us</NavLink>
      <NavLink to="/services" style={linkStyle}>Services</NavLink>
    </nav>
  )
}
