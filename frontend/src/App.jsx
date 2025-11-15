import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Home from './pages/Home'
import Appointments from './pages/Appointments'
import Payments from './pages/Payments'
import Invoices from './pages/Invoices'
import ContactUs from './pages/ContactUs'
import Services from './pages/Services'

export default function App() {
  return (
    <div>
      <Nav />
      <div style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/contactus" element={<ContactUs />} />
          <Route path="/services" element={<Services />} />
        </Routes>
      </div>
    </div>
  )
}
