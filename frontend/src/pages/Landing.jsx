import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="brand" style={{ color: 'white', marginBottom: '1rem' }}>
            Nestora
          </div>
          <h1>Find a room. Pay rent. Stay sorted.</h1>
          <p>
            Search nearby hostels, book a bed, manage leave deductions, and pay monthly rent —
            all in one place for students, tenants, and owners.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/search">Browse hostels</Link>
            <Link className="btn btn-secondary" to="/register">Create account</Link>
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="section-head">
          <h2>Built for every side of hostel life</h2>
        </div>
        <div className="grid grid-3">
          <div className="panel">
            <h3>Tenants</h3>
            <p className="muted">Search by city, budget, and amenities. Book online, request leave, pay rent, download PDF receipts.</p>
          </div>
          <div className="panel">
            <h3>Owners</h3>
            <p className="muted">List rooms, approve bookings and leave, track dues, and watch occupancy from one dashboard.</p>
          </div>
          <div className="panel">
            <h3>Admins</h3>
            <p className="muted">Verify listings, manage users, and monitor platform-wide activity and revenue.</p>
          </div>
        </div>
      </section>
    </>
  );
}
