import { useEffect, useState } from 'react';
import api from '../api';
import StatusBadge from '../components/StatusBadge';
import HostelMap from '../components/HostelMap';
import { geocodeAddress, getCurrentCoordinates, reverseGeocode } from '../utils/location';

const emptyHostel = {
  name: '', description: '', address: '', city: '', latitude: '', longitude: '',
  genderPreference: 'ANY', amenities: 'WiFi,Meals', leaveDeductionEnabled: true,
};
const emptyRoom = {
  category: 'DOUBLE', sharingType: '2-sharing', monthlyRent: 8000, totalBeds: 4, amenities: 'WiFi',
};

export default function OwnerDashboard() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [hostels, setHostels] = useState([]); // Owner's own hostels
  const [allPlatformHostels, setAllPlatformHostels] = useState([]); // All hostels on platform
  const [bookings, setBookings] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [rents, setRents] = useState([]);
  const [reports, setReports] = useState(null);
  const [hostelForm, setHostelForm] = useState(emptyHostel);
  const [roomForm, setRoomForm] = useState(emptyRoom);
  const [selectedHostel, setSelectedHostel] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [locating, setLocating] = useState(false);

  // Map display filter: 'all' (mine + neighbors) vs 'mine' (only owner's hostels)
  const [mapFilterMode, setMapFilterMode] = useState('all');

  const reload = async () => {
    const [d, h, b, l, r, rep, allH] = await Promise.all([
      api.get('/owner/dashboard'),
      api.get('/hostels/mine'),
      api.get('/bookings'),
      api.get('/leaves'),
      api.get('/rents'),
      api.get('/owner/reports'),
      api.get('/hostels'),
    ]);
    setStats(d.data);
    setHostels(h.data);
    setBookings(b.data);
    setLeaves(l.data);
    setRents(r.data);
    setReports(rep.data);
    setAllPlatformHostels(allH.data);
    if (!selectedHostel && h.data[0]) setSelectedHostel(String(h.data[0].id));
  };

  useEffect(() => { reload(); }, []);

  // Use current GPS location for creating hostel
  const useCurrentLocationForHostel = async () => {
    setErr(''); setMsg('');
    setLocating(true);
    try {
      const coords = await getCurrentCoordinates();
      const addr = await reverseGeocode(coords.latitude, coords.longitude);
      setHostelForm((f) => ({
        ...f,
        latitude: String(coords.latitude),
        longitude: String(coords.longitude),
        address: f.address || addr || '',
      }));
      setMsg('Location captured from your current GPS position!');
    } catch (ex) {
      setErr(ex.message || 'Could not detect location');
    } finally {
      setLocating(false);
    }
  };

  // Auto-detect coordinates from address & city
  const detectCoordinatesFromAddress = async () => {
    if (!hostelForm.address && !hostelForm.city) {
      setErr('Please enter an address or city first.');
      return;
    }
    setErr(''); setMsg('');
    setLocating(true);
    try {
      const query = `${hostelForm.address}, ${hostelForm.city}`;
      const result = await geocodeAddress(query);
      if (result) {
        setHostelForm((f) => ({
          ...f,
          latitude: String(result.latitude),
          longitude: String(result.longitude),
        }));
        setMsg(`Coordinates found for "${hostelForm.city || hostelForm.address}"!`);
      } else {
        setErr('Could not resolve location coordinates for this address.');
      }
    } catch (ex) {
      setErr('Geocoding failed');
    } finally {
      setLocating(false);
    }
  };

  // Handle manual location selection by clicking on the interactive map
  const handleMapLocationSelect = (locData) => {
    setErr('');
    setHostelForm((f) => ({
      ...f,
      latitude: String(locData.latitude),
      longitude: String(locData.longitude),
      address: locData.address || f.address,
      city: locData.city || f.city,
    }));
    setMsg(`📍 Location pinned from map: ${locData.address || `${locData.latitude}, ${locData.longitude}`}`);
  };

  const createHostel = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      await api.post('/hostels', {
        ...hostelForm,
        latitude: hostelForm.latitude ? Number(hostelForm.latitude) : null,
        longitude: hostelForm.longitude ? Number(hostelForm.longitude) : null,
        amenities: hostelForm.amenities.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setHostelForm(emptyHostel);
      setMsg('Hostel created (pending admin verification)');
      reload();
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Failed');
    }
  };

  const createRoom = async (e) => {
    e.preventDefault();
    if (!selectedHostel) return;
    setErr(''); setMsg('');
    try {
      await api.post(`/rooms/hostel/${selectedHostel}`, {
        ...roomForm,
        monthlyRent: Number(roomForm.monthlyRent),
        totalBeds: Number(roomForm.totalBeds),
        amenities: String(roomForm.amenities).split(',').map((s) => s.trim()).filter(Boolean),
      });
      setMsg('Room added');
      reload();
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Failed');
    }
  };

  const uploadImages = async (hostelId, files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('files', f));
    await api.post(`/hostels/${hostelId}/images`, fd);
    setMsg('Images uploaded');
    reload();
  };

  const deleteHostel = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}" from the webpage?`)) return;
    setErr(''); setMsg('');
    try {
      await api.delete(`/hostels/${id}`);
      setMsg(`Hostel "${name}" deleted successfully.`);
      reload();
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Could not delete hostel.');
    }
  };

  const decideBooking = async (id, approve) => {
    await api.post(`/bookings/${id}/${approve ? 'approve' : 'reject'}`);
    reload();
  };

  const decideLeave = async (id, approve) => {
    await api.post(`/leaves/${id}/${approve ? 'approve' : 'reject'}`);
    reload();
  };

  const generateRents = async () => {
    await api.post('/rents/generate');
    setMsg('Monthly rents generated');
    reload();
  };

  const myHostelIds = hostels.map((h) => h.id);
  const displayedMapHostels = mapFilterMode === 'mine' ? hostels : allPlatformHostels;

  const tabs = [
    ['overview', 'Overview'],
    ['hostels', 'Hostels & rooms'],
    ['map', 'Map & Neighbors'],
    ['bookings', 'Bookings'],
    ['leaves', 'Leave'],
    ['rents', 'Rent tracking'],
    ['reports', 'Reports'],
  ];

  return (
    <div className="container section">
      <div className="section-head">
        <h1>Owner dashboard</h1>
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

      {tab === 'overview' && stats && (
        <div className="grid grid-3">
          <div className="panel stat"><div className="value">{stats.totalTenants}</div><div className="label">Active tenants</div></div>
          <div className="panel stat"><div className="value">{stats.occupiedBeds}</div><div className="label">Occupied beds</div></div>
          <div className="panel stat"><div className="value">{stats.vacantBeds}</div><div className="label">Vacant beds</div></div>
          <div className="panel stat"><div className="value">₹{stats.monthlyIncome}</div><div className="label">Paid this month</div></div>
          <div className="panel stat"><div className="value">{stats.pendingPayments}</div><div className="label">Pending payments</div></div>
          <div className="panel stat"><div className="value">{stats.overduePayments}</div><div className="label">Overdue</div></div>
        </div>
      )}

      {tab === 'hostels' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Map Preview Banner on Hostels Tab */}
          <div className="panel" style={{ borderLeft: '4px solid var(--teal-700)' }}>
            <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>🗺️ Your Hostels & Neighboring Map</h3>
                <p className="muted" style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
                  View your listed hostels alongside neighboring hostels on the interactive map.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setTab('map')}
                style={{ fontWeight: 700 }}
              >
                Open Full Map View →
              </button>
            </div>
            <HostelMap
              hostels={allPlatformHostels}
              myHostelIds={myHostelIds}
              selectedCoords={hostelForm.latitude && hostelForm.longitude ? { latitude: Number(hostelForm.latitude), longitude: Number(hostelForm.longitude) } : null}
              onSelectLocation={handleMapLocationSelect}
            />
          </div>

          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            {/* Neatly Aligned Add Hostel Form */}
            <form className="panel form" onSubmit={createHostel} style={{ gap: '1rem' }}>
              <div style={{ borderBottom: '1px solid var(--sand-200)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
                <h3 style={{ margin: 0 }}>Add New Hostel</h3>
                <p className="muted" style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>Create a hostel listing for tenants to browse and book.</p>
              </div>
              
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                Hostel Name
                <input
                  value={hostelForm.name}
                  onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })}
                  placeholder="e.g. Sunshine Executive Hostel"
                  required
                />
              </label>
              
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                Address
                <input
                  value={hostelForm.address}
                  onChange={(e) => setHostelForm({ ...hostelForm, address: e.target.value })}
                  placeholder="e.g. 123 Main Road, Anna Nagar"
                  required
                />
              </label>

              <div className="form-row">
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                  City
                  <input
                    value={hostelForm.city}
                    onChange={(e) => setHostelForm({ ...hostelForm, city: e.target.value })}
                    placeholder="e.g. Chennai"
                    required
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                  Gender Preference
                  <select
                    value={hostelForm.genderPreference}
                    onChange={(e) => setHostelForm({ ...hostelForm, genderPreference: e.target.value })}
                  >
                    <option value="ANY">Any / Unisex</option>
                    <option value="MALE">Male Only</option>
                    <option value="FEMALE">Female Only</option>
                  </select>
                </label>
              </div>

              {/* Smart Aligned Location Selector Box */}
              <div style={{
                background: 'var(--sand-100, #f8f6f0)',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--sand-200)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--teal-900)' }}>
                  📍 Hostel Geolocation & Maps Positioning
                </label>
                
                <div className="actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={useCurrentLocationForHostel}
                    disabled={locating}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {locating ? 'Detecting...' : '📍 Use Current Location'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={detectCoordinatesFromAddress}
                    disabled={locating || (!hostelForm.address && !hostelForm.city)}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    🔍 Auto-detect from Address
                  </button>
                </div>

                {hostelForm.latitude && hostelForm.longitude ? (
                  <p className="success" style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', fontWeight: 600 }}>
                    ✓ Location captured ({Number(hostelForm.latitude).toFixed(4)}, {Number(hostelForm.longitude).toFixed(4)})
                  </p>
                ) : (
                  <p className="muted" style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem' }}>
                    Click one of the buttons above to set your hostel's map location.
                  </p>
                )}
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                Description
                <textarea
                  value={hostelForm.description}
                  onChange={(e) => setHostelForm({ ...hostelForm, description: e.target.value })}
                  placeholder="Describe facilities, rules, nearby landmarks..."
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                Amenities (comma separated)
                <input
                  value={hostelForm.amenities}
                  onChange={(e) => setHostelForm({ ...hostelForm, amenities: e.target.value })}
                  placeholder="WiFi, Meals, AC, Gym, Laundry"
                />
              </label>

              <button
                className="btn btn-primary"
                type="submit"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem 1.25rem', fontSize: '0.95rem' }}
              >
                ➕ Add Hostel Listing
              </button>
            </form>

            {/* Neatly Aligned Add Room Form */}
            <form className="panel form" onSubmit={createRoom} style={{ gap: '1rem' }}>
              <div style={{ borderBottom: '1px solid var(--sand-200)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
                <h3 style={{ margin: 0 }}>Add Room</h3>
                <p className="muted" style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>Add available rooms and bed capacity to a hostel.</p>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                Select Hostel
                <select value={selectedHostel} onChange={(e) => setSelectedHostel(e.target.value)} required>
                  <option value="">Choose hostel listing...</option>
                  {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
              
              <div className="form-row">
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                  Room Category
                  <select value={roomForm.category} onChange={(e) => setRoomForm({ ...roomForm, category: e.target.value })}>
                    {['SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD', 'DORMITORY'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                  Sharing Type
                  <input value={roomForm.sharingType} onChange={(e) => setRoomForm({ ...roomForm, sharingType: e.target.value })} placeholder="2-sharing" />
                </label>
              </div>

              <div className="form-row">
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                  Monthly Rent (₹)
                  <input type="number" value={roomForm.monthlyRent} onChange={(e) => setRoomForm({ ...roomForm, monthlyRent: e.target.value })} required />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                  Total Beds
                  <input type="number" value={roomForm.totalBeds} onChange={(e) => setRoomForm({ ...roomForm, totalBeds: e.target.value })} required />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 600 }}>
                Room Amenities
                <input value={roomForm.amenities} onChange={(e) => setRoomForm({ ...roomForm, amenities: e.target.value })} placeholder="WiFi, Attached Bath" />
              </label>

              <button
                className="btn btn-primary"
                type="submit"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem 1.25rem', fontSize: '0.95rem' }}
              >
                ➕ Add Room
              </button>
            </form>

            {/* Hostel Listings Table */}
            <div className="panel" style={{ gridColumn: '1 / -1' }}>
              <h3>Your Hostels</h3>
              {hostels.map((h) => (
                <div key={h.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--sand-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <strong>{h.name}</strong> · {h.city}{' '}
                    {h.verified ? <StatusBadge status="VERIFIED" /> : <StatusBadge status="PENDING" />}
                    <div className="meta">{h.availableBeds} beds open · min ₹{h.minRent ?? '—'}</div>
                  </div>
                  <div className="actions" style={{ alignItems: 'center' }}>
                    <label className="btn btn-secondary btn-sm">
                      Upload images
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        hidden
                        onChange={(e) => uploadImages(h.id, e.target.files)}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteHostel(h.id, h.name)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Map & Neighbors Tab */}
      {tab === 'map' && (
        <div className="panel" style={{ padding: '1.25rem' }}>
          <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>🗺️ Interactive Hostel Location & Neighborhood Map</h3>
              <p className="muted" style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
                View your registered hostels alongside neighboring hostels listed on the platform.
              </p>
            </div>

            <div className="actions" style={{ gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${mapFilterMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMapFilterMode('all')}
                style={{ fontWeight: 700 }}
              >
                🌐 All Hostels & Neighbors ({allPlatformHostels.length})
              </button>

              <button
                type="button"
                className={`btn btn-sm ${mapFilterMode === 'mine' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMapFilterMode('mine')}
                style={{ fontWeight: 700 }}
              >
                ⭐ Only My Hostels ({hostels.length})
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span className="badge badge-ok" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
              ⭐ Your Listed Hostels: {hostels.length}
            </span>
            <span className="badge" style={{ background: '#f1f5f9', color: '#475569', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
              🏘️ Neighboring Hostels: {Math.max(0, allPlatformHostels.length - hostels.length)}
            </span>
          </div>

          <HostelMap hostels={displayedMapHostels} myHostelIds={myHostelIds} />
        </div>
      )}

      {tab === 'bookings' && (
        <div className="panel table-wrap">
          <table>
            <thead><tr><th>Tenant</th><th>Hostel</th><th>Status</th><th /></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.tenantName}</td>
                  <td>{b.hostelName} · {b.roomCategory}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td className="actions">
                    {b.status === 'PENDING' && (
                      <>
                        <button className="btn btn-primary btn-sm" type="button" onClick={() => decideBooking(b.id, true)}>Approve</button>
                        <button className="btn btn-danger btn-sm" type="button" onClick={() => decideBooking(b.id, false)}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'leaves' && (
        <div className="panel table-wrap">
          <table>
            <thead><tr><th>Tenant</th><th>Dates</th><th>Reason</th><th>Status</th><th /></tr></thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id}>
                  <td>{l.tenantName}</td>
                  <td>{l.startDate} → {l.endDate}</td>
                  <td>{l.reason}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td className="actions">
                    {l.status === 'PENDING' && (
                      <>
                        <button className="btn btn-primary btn-sm" type="button" onClick={() => decideLeave(l.id, true)}>Approve</button>
                        <button className="btn btn-danger btn-sm" type="button" onClick={() => decideLeave(l.id, false)}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'rents' && (
        <div className="panel table-wrap">
          <div className="actions" style={{ marginBottom: '0.75rem' }}>
            <button className="btn btn-secondary btn-sm" type="button" onClick={generateRents}>Generate current month rents</button>
          </div>
          <table>
            <thead><tr><th>Tenant</th><th>Period</th><th>Final</th><th>Status</th></tr></thead>
            <tbody>
              {rents.map((r) => (
                <tr key={r.id}>
                  <td>{r.tenantName}</td>
                  <td>{r.month}/{r.year}</td>
                  <td>₹{r.finalRent}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'reports' && reports && (
        <div className="grid grid-2">
          <div className="panel">
            <h3>Occupancy</h3>
            <p>Total beds: {reports.occupancy?.totalBeds}</p>
            <p>Vacant: {reports.occupancy?.vacantBeds}</p>
          </div>
          <div className="panel">
            <h3>Collections</h3>
            <p>Income this month: ₹{reports.incomeThisMonth}</p>
            <p>Pending: {reports.pending} · Overdue: {reports.overdue}</p>
          </div>
        </div>
      )}
    </div>
  );
}
