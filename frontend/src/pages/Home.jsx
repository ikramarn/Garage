export default function Home() {
  return (
    <div className="grid gap-6">
      <section className="text-center py-12 rounded-3xl bg-gradient-to-r from-brand-500 to-blue-600 text-white">
        <h1 className="text-4xl font-bold mb-3">Welcome to Garage</h1>
        <p className="opacity-90">Manage appointments, payments, invoices, and services with a modern, fast UI.</p>
      </section>
      <section className="grid md:grid-cols-3 gap-4">
        {[{title:'Appointments',desc:'Schedule and track visits.'},{title:'Invoices',desc:'View and manage billing.'},{title:'Services',desc:'Browse our catalog.'}].map((c,i)=> (
          <div key={i} className="card p-5">
            <h3 className="text-lg font-semibold mb-2">{c.title}</h3>
            <p className="text-gray-600 dark:text-gray-300">{c.desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
