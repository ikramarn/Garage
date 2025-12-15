export default function AboutUs() {
  return (
    <div className="grid gap-6">
      <section className="text-center py-10 rounded-3xl bg-gradient-to-r from-brand-500 to-blue-600 text-white">
        <h1 className="text-3xl font-bold mb-2">About Us</h1>
        <p className="opacity-90">Learn more about Garage and our mission.</p>
      </section>
      <section className="grid gap-4">
        <div className="card p-5">
          <h2 className="text-xl font-semibold mb-2">Who We Are</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Garage is a simple, modern platform to manage appointments, invoices, and payments for auto services.
            We focus on speed, clarity, and a hassle-free experience for both customers and admins.
          </p>
        </div>
        <div className="card p-5">
          <h2 className="text-xl font-semibold mb-2">What We Do</h2>
          <p className="text-gray-700 dark:text-gray-300">
            From booking appointments to tracking services and billing, Garage brings everything together so you can
            focus on great service. The app is built with a lightweight frontend and a modular backend of microservices.
          </p>
        </div>
        <div className="card p-5">
          <h2 className="text-xl font-semibold mb-2">Contact</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Have questions? Visit the Contact Us page or reach out to our team.
          </p>
        </div>
      </section>
    </div>
  )
}
