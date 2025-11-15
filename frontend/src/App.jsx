import { Routes, Route, Navigate } from 'react-router-dom'
import Nav from './components/Nav'
import Home from './pages/Home'
import Appointments from './pages/Appointments'
import Payments from './pages/Payments'
import Invoices from './pages/Invoices'
import ContactUs from './pages/ContactUs'
import Services from './pages/Services'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './auth/AuthContext'
import Signup from './pages/Signup'

function PrivateRoute({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-dvh">
        <Nav />
        <main className="container py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/invoices" element={<PrivateRoute><Invoices /></PrivateRoute>} />
            <Route path="/contactus" element={<ContactUs />} />
            <Route path="/services" element={<Services />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}
