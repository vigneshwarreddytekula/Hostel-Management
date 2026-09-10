import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import HostelMap from '../components/HostelMap';
import { mediaUrl, useAuth } from '../AuthContext';
import { calculateDistanceKm, getCurrentCoordinates, reverseGeocode } from '../utils/location';

export default function TenantDashboard() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [rents, setRents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ bookingId: '', startDate: '', endDate: '', reason: '' });
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    gender: 'ANY',
    address: '',
    aadhaarNumber: '',
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [uploading, setUploading] = useState('');

  // Nearby hostels state for tenant dashboard widget & map
  const [allHostels, setAllHostels] = useState([]);
  const [tenantCoords, setTenantCoords] = useState(null);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [tenantRadiusKm, setTenantRadiusKm] = useState('5'); // Default radius 5 km

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        gender: user.gender || 'ANY',
        address: user.address || '',
        aadhaarNumber: user.aadhaarNumber || '',
      });
    }
  }, [user]);

  const reload = async () => {
    const [b, l, r, p, h] = await Promise.all([
      api.get('/bookings'),
      api.get('/leaves'),
      api.get('/rents'),
      api.get('/payments'),
      api.get('/hostels'),
    ]);
    setBookings(b.data);
    setLeaves(l.data);
    setRents(r.data);
    setPayments(p.data);
    setAllHostels(h.data);
    if (!leaveForm.bookingId) {
      const active = b.data.find((x) => x.status === 'ACTIVE');
      if (active) setLeaveForm((f) => ({ ...f, bookingId: String(active.id) }));
    }
  };

  useEffect(() => { reload(); }, []);

  // Tenant GPS Location detection for nearby hostels widget
  const fetchTenantNearbyHostels = async () => {
    setErr('');
    setLoadingNearby(true);
    try {
      const coords = await getCurrentCoordinates();
      setTenantCoords(coords);
    } catch (ex) {
      setErr(ex.message || 'Could not access location');
    } finally {
      setLoadingNearby(false);
    }
  };

  // Auto-fill address in Profile using reverse geocoding
  const autoFillProfileAddress = async () => {
    setErr(''); setMsg('');
    setLoadingNearby(true);
    try {
      const coords = await getCurrentCoordinates();
      const address = await reverseGeocode(coords.latitude, coords.longitude);
      if (address) {
        setProfileForm((f) => ({ ...f, address }));
        setMsg('Address auto-detected from your current location!');
      } else {
        setMsg(`Location detected (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`);
      }
    } catch (ex) {
      setErr(ex.message || 'Could not fetch address');
    } finally {
      setLoadingNearby(false);
    }
  };

  // Process nearby hostels within tenant radius
  const nearbyHostels = allHostels
    .map((h) => {
      const dist = tenantCoords && h.latitude != null && h.longitude != null
        ? calculateDistanceKm(tenantCoords.latitude, tenantCoords.longitude, h.latitude, h.longitude)
        : null;
      return { ...h, distance: dist };
    })
    .filter((h) => {
      if (tenantCoords && tenantRadiusKm !== 'any' && h.distance != null) {
        return h.distance <= Number(tenantRadiusKm);
      }
      return true;
    })
    .sort((a, b) => {
      if (a.distance != null && b.distance != null) return a.distance - b.distance;
      if (a.distance != null) return -1;
      if (b.distance != null) return 1;
      return 0;
    });

  const saveProfile = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      const { data } = await api.put('/auth/profile', profileForm);
      setUser(data);
      setMsg('Profile updated successfully');
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Could not update profile');
    }
  };

  const uploadFile = async (endpoint, file) => {
    if (!file) return;
    setErr(''); setMsg('');
    setUploading(endpoint);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post(endpoint, fd);
      setUser(data);
      setMsg(endpoint.includes('aadhaar') ? 'Aadhaar document uploaded as proof' : 'Profile photo updated');
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Upload failed');
    } finally {
      setUploading('');
    }
  };

  const applyLeave = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      await api.post('/leaves', {
        ...leaveForm,
        bookingId: Number(leaveForm.bookingId),
      });
      setMsg('Leave request submitted');
      reload();
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Failed');
    }
  };

  const payRent = async (rentId) => {
    setErr(''); setMsg('');
    try {
      const { data: order } = await api.post(`/payments/order/${rentId}`);
      if (order.mock || !import.meta.env.VITE_RAZORPAY_KEY_ID) {
        const { data } = await api.post('/payments/verify', {
          paymentId: order.paymentId,
          razorpayOrderId: order.orderId,
          mockSuccess: true,
        });
        setMsg(`Payment successful. Receipt ${data.receiptNumber}`);
        reload();
        return;
      }
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || order.keyId,
        amount: Math.round(Number(order.amount) * 100),
        currency: order.currency,
        name: 'Nestora Hostels',
        description: 'Monthly rent',
        order_id: order.orderId,
        handler: async (response) => {
          await api.post('/payments/verify', {
            paymentId: order.paymentId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          setMsg('Payment successful');
          reload();
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Payment failed');
    }
  };

  const downloadReceipt = async (paymentId) => {
    const res = await api.get(`/payments/${paymentId}/receipt`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${paymentId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isAadhaarComplete = !!(user?.aadhaarNumber && user?.aadhaarUploaded);

  const tabs = [
    ['bookings', 'Bookings & Nearby Map'],
    ['leave', 'Leave'],
    ['rent', 'Rent & pay'],
    ['payments', 'Receipts'],
    ['profile', 'Profile'],
  ];

  return (
    <div className="container section">
      <div className="section-head">
        <h1>Hello, {user?.name}</h1>
        {!isAadhaarComplete && (
          <p style={{ color: 'var(--danger)', fontWeight: 700, margin: '0.25rem 0 0 0' }}>
            ⚠️ Both Aadhaar Number and Aadhaar Document Photo must be added in Profile before you can book hostels.
          </p>
        )}
      </div>
      <div className="actions" style={{ marginBottom: '1rem' }}>
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {msg && <p className="success">{msg}</p>}
      {err && <p className="error">{err}</p>}

      {tab === 'bookings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Hostels Near Me & Live Map Tenant Section */}
          <div className="panel" style={{ borderLeft: '4px solid var(--accent, #1a6b63)', padding: '1.25rem' }}>
            <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🗺️ Nearby Hostels & Live Radius Map
                </h3>
              </div>

              <div className="actions" style={{ alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>
                  Radius:
                  <select
                    value={tenantRadiusKm}
                    onChange={(e) => setTenantRadiusKm(e.target.value)}
                    style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid var(--sand-200)', fontWeight: 600 }}
                  >
                    <option value="1">1 km</option>
                    <option value="5">5 km (Default)</option>
                    <option value="10">10 km</option>
                    <option value="25">25 km</option>
                    <option value="50">50 km</option>
                    <option value="any">Any distance</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={fetchTenantNearbyHostels}
                  disabled={loadingNearby}
                  style={{ fontWeight: 800 }}
                >
                  {loadingNearby ? 'Locating...' : '📍 Detect My Location'}
                </button>
              </div>
            </div>

            {tenantCoords && (
              <p className="success" style={{ margin: '0 0 1rem 0', fontWeight: 600 }}>
                ✓ Live GPS Active. Highlighting hostels within {tenantRadiusKm === 'any' ? 'all distances' : `${tenantRadiusKm} km`} radius:
              </p>
            )}

            {/* Split Layout: Left Nearby Hostels List | Right Interactive Map */}
            <div className="layout-split" style={{ alignItems: 'start' }}>
              <div>
                {nearbyHostels.length === 0 ? (
                  <div className="panel empty" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                    No registered hostels found within {tenantRadiusKm} km of your location.{' '}
                    <Link to="/hostels" style={{ fontWeight: 700, textDecoration: 'underline' }}>Browse all hostels →</Link>
                  </div>
                ) : (
                  <div className="grid grid-1" style={{ gap: '0.75rem' }}>
                    {nearbyHostels.slice(0, 6).map((h) => (
                      <div key={h.id} className="panel" style={{ padding: '0.85rem 1rem', background: 'white', borderRadius: '10px' }}>
                        <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--teal-900)' }}>{h.name}</strong>
                          {h.distance != null && (
                            <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                              📍 {h.distance} km away
                            </span>
                          )}
                        </div>
                        <div className="meta" style={{ marginBottom: '0.5rem' }}>
                          {h.city} · From ₹{h.minRent ?? '—'}/mo · {h.availableBeds} beds available
                        </div>
                        <Link to={`/hostels/${h.id}`} className="btn btn-secondary btn-sm" style={{ fontWeight: 700 }}>
                          View Details & Request Bed →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Interactive Map Highlighting Radius Hostels */}
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  📍 Interactive Location Map
                </h4>
                <HostelMap hostels={nearbyHostels} userCoords={tenantCoords} />
              </div>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="panel table-wrap">
            <h3>My Bookings</h3>
            <table>
              <thead>
                <tr><th>Hostel</th><th>Room</th><th>Status</th><th>Check-in</th></tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.hostelName}</td>
                    <td>{b.roomCategory}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>{b.checkIn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookings.length === 0 && <div className="empty">No bookings yet. Browse hostels to request a bed.</div>}
          </div>
        </div>
      )}

      {tab === 'leave' && (
        <div className="grid grid-2">
          <form className="panel form" onSubmit={applyLeave}>
            <h3>Apply for leave</h3>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
              Booking
              <select
                value={leaveForm.bookingId}
                onChange={(e) => setLeaveForm({ ...leaveForm, bookingId: e.target.value })}
                required
              >
                <option value="">Select booking...</option>
                {bookings.filter((b) => b.status === 'ACTIVE').map((b) => (
                  <option key={b.id} value={b.id}>{b.hostelName} #{b.id}</option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>From<input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} required /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>To<input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} required /></label>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>Reason<textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} /></label>
            <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '0.75rem' }}>Submit leave</button>
          </form>
          <div className="panel table-wrap">
            <h3>My leave requests</h3>
            <table>
              <thead><tr><th>Dates</th><th>Days</th><th>Status</th></tr></thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id}>
                    <td>{l.startDate} → {l.endDate}</td>
                    <td>{l.approvedDays ?? '—'}</td>
                    <td><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'rent' && (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr><th>Period</th><th>Base</th><th>Leave −</th><th>Extra +</th><th>Final</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {rents.map((r) => (
                <tr key={r.id}>
                  <td>{r.month}/{r.year}</td>
                  <td>₹{r.baseRent}</td>
                  <td>₹{r.leaveDeduction}</td>
                  <td>₹{r.additionalCharges}</td>
                  <td><strong>₹{r.finalRent}</strong></td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>
                    {(r.status === 'PENDING' || r.status === 'OVERDUE' || r.status === 'FAILED') && (
                      <button className="btn btn-primary btn-sm" type="button" onClick={() => payRent(r.id)}>
                        Pay now
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rents.length === 0 && <div className="empty">No rent records yet. They appear after a booking is approved.</div>}
        </div>
      )}

      {tab === 'payments' && (
        <div className="panel table-wrap">
          <table>
            <thead><tr><th>Amount</th><th>Status</th><th>Receipt</th><th /></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>₹{p.amount}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{p.receiptNumber || '—'}</td>
                  <td>
                    {p.status === 'SUCCESS' && (
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => downloadReceipt(p.id)}>
                        Download PDF
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'profile' && (
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          {/* Neatly Aligned Tenant Profile Details Form */}
          <form className="panel form" onSubmit={saveProfile} style={{ gap: '1rem' }}>
            <div style={{ borderBottom: '1px solid var(--sand-200)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
              <h3 style={{ margin: 0 }}>Personal & Identity Details</h3>
            </div>

            {/* Profile Avatar & Photo Change Row */}
            <div className="profile-photo-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--sand-100, #f8f6f0)', padding: '0.75rem 1rem', borderRadius: '12px' }}>
              <div
                className="avatar"
                style={{
                  backgroundImage: user?.profileImageUrl
                    ? `url(${mediaUrl(user.profileImageUrl)})`
                    : undefined,
                }}
              >
                {!user?.profileImageUrl && (user?.name?.[0] || '?')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user?.name || 'Tenant User'}</span>
                <label className="btn btn-secondary btn-sm" style={{ width: 'fit-content', margin: 0 }}>
                  {uploading === '/auth/profile/photo' ? 'Uploading…' : '📷 Change Profile Photo'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={!!uploading}
                    onChange={(e) => uploadFile('/auth/profile/photo', e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>

            <div className="form-row">
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                Full Name
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="Enter your full name"
                  required
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                Phone Number
                <input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </label>
            </div>

            <div className="form-row">
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                Email Address
                <input value={user?.email || ''} disabled style={{ background: '#f1f5f9' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                Gender
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                >
                  <option value="ANY">Prefer not to say</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </label>
            </div>

            {/* Mandatory 12-Digit Aadhaar Number Field */}
            <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 700, color: 'var(--teal-900)' }}>
                🪪 12-Digit Aadhaar Number (Mandatory for Booking)
                <input
                  value={profileForm.aadhaarNumber}
                  onChange={(e) => setProfileForm({ ...profileForm, aadhaarNumber: e.target.value })}
                  placeholder="e.g. 1234 5678 9012"
                  maxLength={12}
                  style={{ fontWeight: 600, letterSpacing: '0.05em' }}
                />
              </label>
            </div>
            
            {/* Neatly Aligned Address Field with Location Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ margin: 0, fontWeight: 600 }}>Current / Permanent Address</label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={autoFillProfileAddress}
                  disabled={loadingNearby}
                >
                  📍 Use Current Location
                </button>
              </div>
              <textarea
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                placeholder="Enter your permanent / current home address"
                style={{ minHeight: '80px' }}
              />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem 1.25rem', fontSize: '0.95rem' }}
            >
              💾 Save Profile Details
            </button>
          </form>

          {/* Neatly Aligned Aadhaar Verification Proof Card */}
          <div className="panel form" style={{ gap: '1rem' }}>
            <div style={{ borderBottom: '1px solid var(--sand-200)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
              <h3 style={{ margin: 0 }}>Aadhaar Verification Status</h3>
            </div>

            {isAadhaarComplete ? (
              <div className="badge badge-ok" style={{ padding: '0.65rem 1rem', fontSize: '0.9rem', width: '100%', textAlign: 'center' }}>
                ✓ Fully Verified: 12-Digit Aadhaar No. ({user.aadhaarNumber}) & Document Uploaded
              </div>
            ) : (
              <div className="badge badge-bad" style={{ padding: '0.65rem 1rem', fontSize: '0.88rem', width: '100%', lineHeight: '1.4' }}>
                ⚠️ Booking Locked: Both 12-digit Aadhaar Number and Aadhaar Document upload are required.
                {!user?.aadhaarNumber && <div style={{ marginTop: '0.2rem' }}>• Missing: 12-Digit Aadhaar Number</div>}
                {!user?.aadhaarUploaded && <div style={{ marginTop: '0.2rem' }}>• Missing: Aadhaar Document Scan/Photo</div>}
              </div>
            )}

            {user?.aadhaarDocumentUrl && (
              <a
                className="btn btn-secondary btn-sm"
                href={mediaUrl(user.aadhaarDocumentUrl)}
                target="_blank"
                rel="noreferrer"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                📄 View Uploaded Aadhaar Document
              </a>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <label className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
                {uploading === '/auth/profile/aadhaar' ? 'Uploading…' : '📤 Upload Aadhaar Copy (PDF / Image)'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  hidden
                  disabled={!!uploading}
                  onChange={(e) => uploadFile('/auth/profile/aadhaar', e.target.files?.[0])}
                />
              </label>
              <p className="meta" style={{ textAlign: 'center', margin: 0, fontSize: '0.82rem' }}>
                Accepted Formats: JPG, PNG, or PDF · Maximum file size: 10 MB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
