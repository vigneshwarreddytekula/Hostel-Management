import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { mediaUrl, useAuth } from '../AuthContext';
import HostelMap from '../components/HostelMap';
import { calculateDistanceKm, getCurrentCoordinates } from '../utils/location';

export default function HostelDetail() {
  const { id } = useParams();
  const { user, isAuth } = useAuth();
  const navigate = useNavigate();
  const [hostel, setHostel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // User location distance state
  const [userCoords, setUserCoords] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/hostels/${id}`),
      api.get(`/rooms/hostel/${id}`),
    ]).then(([h, r]) => {
      setHostel(h.data);
      setRooms(r.data);
    });
  }, [id]);

  // Check distance from current location
  const checkDistanceFromCurrentLocation = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentCoordinates();
      setUserCoords(coords);
      if (hostel?.latitude != null && hostel?.longitude != null) {
        const dist = calculateDistanceKm(coords.latitude, coords.longitude, hostel.latitude, hostel.longitude);
        setDistanceKm(dist);
      }
    } catch (err) {
      console.error('Location error:', err);
    } finally {
      setLocating(false);
    }
  };

  const book = async (roomId) => {
    if (!isAuth) return navigate('/login');
    if (user.role !== 'TENANT') {
      setError('Only tenant accounts can book rooms.');
      return;
    }

    // Strict validation: Require BOTH Aadhaar Number and Aadhaar Photo Document
    if (!user.aadhaarNumber || !user.aadhaarNumber.trim()) {
      setError('⚠️ Aadhaar Number missing: Please enter your 12-digit Aadhaar Number in your Profile before requesting a booking.');
      return;
    }

    if (!user.aadhaarUploaded) {
      setError('⚠️ Aadhaar Photo missing: Please upload your Aadhaar document/photo in your Profile before requesting a booking.');
      return;
    }

    // Gender compatibility validation
    const hGender = hostel?.genderPreference;
    const uGender = user?.gender;
    if (hGender === 'MALE' && uGender === 'FEMALE') {
      setError("⚠️ Gender Mismatch: This is a Men's hostel. Female tenants cannot book rooms in this hostel.");
      return;
    }
    if (hGender === 'FEMALE' && uGender === 'MALE') {
      setError("⚠️ Gender Mismatch: This is a Women's hostel. Male tenants cannot book rooms in this hostel.");
      return;
    }
    if (hGender === 'MALE' && uGender !== 'MALE') {
      setError("⚠️ Gender Mismatch: This is a Men's hostel. Please set your gender to Male in your Profile before requesting a booking.");
      return;
    }
    if (hGender === 'FEMALE' && uGender !== 'FEMALE') {
      setError("⚠️ Gender Mismatch: This is a Women's hostel. Please set your gender to Female in your Profile before requesting a booking.");
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.post('/bookings', { roomId, message: 'I would like to book this room.' });
      setMessage('Booking request sent. Track it in your dashboard.');
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed');
    } finally {
      setBusy(false);
    }
  };

  if (!hostel) return <div className="container section">Loading…</div>;

  const img = hostel.imageUrls?.[0];
  const imgUrl = img ? mediaUrl(img) : null;

  const isAadhaarComplete = !!(user?.aadhaarNumber && user?.aadhaarUploaded);

  const isGenderMismatch = isAuth && user?.role === 'TENANT' && (
    (hostel.genderPreference === 'MALE' && user?.gender === 'FEMALE') ||
    (hostel.genderPreference === 'FEMALE' && user?.gender === 'MALE')
  );

  const isGenderUnspecifiedForRestrictedHostel = isAuth && user?.role === 'TENANT' && (
    (hostel.genderPreference === 'MALE' || hostel.genderPreference === 'FEMALE') &&
    (!user?.gender || user?.gender === 'ANY')
  );

  return (
    <div className="container section">
      <div className="layout-split">
        <div>
          <div
            className="panel"
            style={{
              minHeight: 240,
              background: imgUrl
                ? `center/cover url(${imgUrl})`
                : 'linear-gradient(135deg, #1a6b63, #0f3d39)',
              color: 'white',
              display: 'flex',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <h1>{hostel.name}</h1>
              <p>{hostel.address}, {hostel.city}</p>
            </div>
          </div>
          <div className="panel" style={{ marginTop: '1rem' }}>
            <p>{hostel.description}</p>
            <div className="chip-row">
              {(hostel.amenities || []).map((a) => <span className="chip" key={a}>{a}</span>)}
            </div>
            <p className="meta" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span>Gender:</span>
              <span className="chip" style={{
                fontWeight: 700,
                background: hostel.genderPreference === 'MALE' ? '#e0f2fe' : hostel.genderPreference === 'FEMALE' ? '#fce7f3' : '#f1f5f9',
                color: hostel.genderPreference === 'MALE' ? '#0369a1' : hostel.genderPreference === 'FEMALE' ? '#be185d' : '#475569'
              }}>
                {hostel.genderPreference === 'MALE' ? '♂️ Men Only' : hostel.genderPreference === 'FEMALE' ? '♀️ Women Only' : '🚻 Unisex / Any'}
              </span>
              <span>· Owner: {hostel.ownerName}</span>
            </p>
            {hostel.verified && <span className="badge badge-ok">Verified listing</span>}
          </div>
          <div style={{ marginTop: '1rem' }}>
            <h3>Rooms</h3>
            
            {isAuth && user?.role === 'TENANT' && !isAadhaarComplete && (
              <div className="panel" style={{ background: '#fff1f2', border: '1px solid #fda4af', marginBottom: '1rem', color: '#9f1239' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>
                  ⚠️ Profile Incomplete: Both your 12-digit Aadhaar Number and Aadhaar Photo Document are mandatory before booking.
                </p>
                <Link to="/tenant" className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                  Complete Profile & Aadhaar Details →
                </Link>
              </div>
            )}

            {isAuth && user?.role === 'TENANT' && isGenderMismatch && (
              <div className="panel" style={{ background: '#fff1f2', border: '1px solid #fda4af', marginBottom: '1rem', color: '#9f1239' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  🚫 Gender Restricted Hostel: This is a {hostel.genderPreference === 'MALE' ? "Men's (Male-only)" : "Women's (Female-only)"} hostel. You cannot book rooms here as your profile gender is registered as {user?.gender === 'MALE' ? 'Male' : 'Female'}.
                </p>
              </div>
            )}

            {isAuth && user?.role === 'TENANT' && isGenderUnspecifiedForRestrictedHostel && (
              <div className="panel" style={{ background: '#fffbeb', border: '1px solid #fcd34d', marginBottom: '1rem', color: '#92400e' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>
                  ⚠️ Gender Selection Required: This is a {hostel.genderPreference === 'MALE' ? "Men's" : "Women's"} hostel. Please update your profile gender to {hostel.genderPreference === 'MALE' ? 'Male' : 'Female'} in your Profile to book rooms here.
                </p>
                <Link to="/tenant" className="btn btn-secondary btn-sm" style={{ fontWeight: 700 }}>
                  Update Profile Gender →
                </Link>
              </div>
            )}

            {rooms.length === 0 && <div className="panel empty">No rooms listed yet.</div>}
            <div className="grid" style={{ marginTop: '0.75rem' }}>
              {rooms.map((room) => (
                <div className="panel" key={room.id}>
                  <div className="actions" style={{ justifyContent: 'space-between' }}>
                    <strong>{room.category} · {room.sharingType}</strong>
                    <span>₹{room.monthlyRent}/mo</span>
                  </div>
                  <p className="meta">{room.availableBeds} of {room.totalBeds} beds available</p>
                  <div className="chip-row">
                    {(room.amenities || []).map((a) => <span className="chip" key={a}>{a}</span>)}
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={busy || room.availableBeds <= 0 || isGenderMismatch}
                    onClick={() => book(room.id)}
                  >
                    {isGenderMismatch ? 'Gender Mismatch' : room.availableBeds > 0 ? 'Request booking' : 'Full'}
                  </button>
                </div>
              ))}
            </div>
            {message && <p className="success" style={{ marginTop: '0.75rem' }}>{message} <Link to="/tenant">Open dashboard</Link></p>}
            {error && (
              <div style={{ marginTop: '0.75rem' }}>
                <p className="error" style={{ margin: '0 0 0.35rem 0' }}>{error}</p>
                <Link to="/tenant" className="btn btn-secondary btn-sm" style={{ fontWeight: 700 }}>
                  Go to Profile to Update Details →
                </Link>
              </div>
            )}
          </div>
        </div>
        <div>
          <h3>Location</h3>
          <HostelMap focus={hostel} userCoords={userCoords} />
          
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {distanceKm != null ? (
              <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.9rem', padding: '0.35rem 0.6rem', width: 'fit-content' }}>
                📍 {distanceKm} km away from your location
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={checkDistanceFromCurrentLocation}
                disabled={locating}
                style={{ width: 'fit-content' }}
              >
                {locating ? 'Calculating...' : '📍 Check distance from my location'}
              </button>
            )}

            {hostel.latitude && (
              <p className="meta" style={{ margin: 0 }}>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${hostel.latitude},${hostel.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-block' }}
                >
                  🗺️ Get Directions in Google Maps
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
