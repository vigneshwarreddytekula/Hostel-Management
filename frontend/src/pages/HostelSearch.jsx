import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { mediaUrl } from '../AuthContext';
import HostelMap from '../components/HostelMap';
import { calculateDistanceKm, geocodeAddress, getCurrentCoordinates } from '../utils/location';

const PLACEHOLDER = 'linear-gradient(135deg, #1a6b63, #3d6b5f)';

export default function Search() {
  const [filters, setFilters] = useState({
    city: '', minRent: '', maxRent: '', sharingType: '', gender: '', amenity: '', availableOnly: true,
  });

  // Location search state
  const [locationMode, setLocationMode] = useState('any'); // 'any', 'current', 'custom'
  const [customLocationText, setCustomLocationText] = useState('');
  const [maxRadiusKm, setMaxRadiusKm] = useState('5'); // Default radius 5 km
  const [userCoords, setUserCoords] = useState(null); // { latitude, longitude }
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);

  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Handle "Use Current Location" button click
  const useCurrentLocation = async () => {
    setLocationError('');
    setLocating(true);
    try {
      const coords = await getCurrentCoordinates();
      setUserCoords(coords);
      setLocationMode('current');
    } catch (err) {
      setLocationError(err.message || 'Could not get current location');
    } finally {
      setLocating(false);
    }
  };

  // Handle "Search Custom Location"
  const handleCustomLocationSearch = async () => {
    if (!customLocationText.trim()) return;
    setLocationError('');
    setLocating(true);
    try {
      const result = await geocodeAddress(customLocationText);
      if (result) {
        setUserCoords({ latitude: result.latitude, longitude: result.longitude });
        setLocationMode('custom');
      } else {
        setLocationError(`Location "${customLocationText}" not found. Showing city matches.`);
        setUserCoords(null);
      }
    } catch (err) {
      setLocationError('Geocoding failed');
    } finally {
      setLocating(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== '' && v !== false) params[k] = v;
      });
      if (filters.availableOnly) params.availableOnly = true;

      const { data } = await api.get('/hostels', { params });
      setHostels(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFilters((f) => ({ ...f, [k]: value }));
  };

  // Compute distances & filter/sort hostels by location if userCoords are available
  const processedHostels = hostels.map((h) => {
    let distance = null;
    if (userCoords && h.latitude != null && h.longitude != null) {
      distance = calculateDistanceKm(userCoords.latitude, userCoords.longitude, h.latitude, h.longitude);
    }
    return { ...h, distance };
  }).filter((h) => {
    if (locationMode !== 'any' && userCoords && maxRadiusKm !== 'any' && h.distance != null) {
      return h.distance <= Number(maxRadiusKm);
    }
    return true;
  }).sort((a, b) => {
    if (locationMode !== 'any' && userCoords) {
      if (a.distance != null && b.distance != null) return a.distance - b.distance;
      if (a.distance != null) return -1;
      if (b.distance != null) return 1;
    }
    return 0;
  });

  return (
    <div className="container section">
      {/* Attractive Main Title Banner */}
      <div className="section-head" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{
          fontSize: 'clamp(2rem, 4vw, 2.75rem)',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #0a2f2c 0%, #1a6b63 55%, #2a9d8f 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
          letterSpacing: '-0.02em'
        }}>
          ✨ Discover & Find Your Ideal Hostel
        </h1>
      </div>

      {/* Premium Stylish Location Search Bar Panel */}
      <div style={{
        marginBottom: '1.5rem',
        background: 'linear-gradient(135deg, #0f3d39 0%, #1a6b63 100%)',
        color: 'white',
        borderRadius: '16px',
        boxShadow: '0 12px 32px rgba(15, 61, 57, 0.22)',
        padding: '1.35rem 1.5rem',
        border: '1px solid rgba(255,255,255,0.15)'
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          margin: '0 0 1rem 0',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <span style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '0.3rem 0.6rem',
            borderRadius: '8px',
            fontSize: '1.1rem'
          }}>📍</span>
          Location Search & Distance Radius
        </h3>
        
        <div className="actions" style={{ gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button
            type="button"
            className="btn"
            style={{
              background: locationMode === 'current' ? '#ffffff' : 'rgba(255,255,255,0.18)',
              color: locationMode === 'current' ? '#0f3d39' : '#ffffff',
              fontWeight: 800,
              border: '1px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(4px)'
            }}
            onClick={useCurrentLocation}
            disabled={locating}
          >
            {locating && locationMode === 'current' ? 'Locating...' : '📍 Use Current Location'}
          </button>

          <button
            type="button"
            className="btn"
            style={{
              background: locationMode === 'any' ? '#ffffff' : 'rgba(255,255,255,0.18)',
              color: locationMode === 'any' ? '#0f3d39' : '#ffffff',
              fontWeight: 800,
              border: '1px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => {
              setLocationMode('any');
              setUserCoords(null);
              setLocationError('');
            }}
          >
            🌐 Any Location / City
          </button>
        </div>

        {/* Custom Location Text Search Form */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.85rem' }}>
          <input
            type="text"
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: 'none',
              fontSize: '0.98rem',
              outline: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              color: '#0f3d39',
              fontWeight: 600
            }}
            placeholder="Type city, landmark, or address (e.g. T. Nagar, Chennai)..."
            value={customLocationText}
            onChange={(e) => setCustomLocationText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCustomLocationSearch(); } }}
          />
          <button
            type="button"
            className="btn"
            style={{
              background: '#000000',
              color: '#ffffff',
              fontWeight: 800,
              padding: '0.75rem 1.3rem',
              borderRadius: '10px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
            }}
            onClick={handleCustomLocationSearch}
            disabled={locating || !customLocationText.trim()}
          >
            {locating && locationMode === 'custom' ? 'Searching...' : '🔍 Search Location'}
          </button>
        </div>

        {/* Location Status & Distance Radius Filter */}
        {userCoords && (
          <div className="actions" style={{
            alignItems: 'center',
            gap: '1rem',
            background: 'rgba(255,255,255,0.95)',
            color: '#0f3d39',
            padding: '0.65rem 1rem',
            borderRadius: '10px',
            marginTop: '0.5rem'
          }}>
            <span style={{ fontWeight: 700 }}>
              {locationMode === 'current' ? '✓ Active GPS Location' : `✓ Location: ${customLocationText}`}
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 700 }}>
              Max Distance:
              <select
                value={maxRadiusKm}
                onChange={(e) => setMaxRadiusKm(e.target.value)}
                style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}
              >
                <option value="1">Within 1 km</option>
                <option value="5">Within 5 km (Default)</option>
                <option value="10">Within 10 km</option>
                <option value="25">Within 25 km</option>
                <option value="50">Within 50 km</option>
                <option value="any">Any distance</option>
              </select>
            </label>
          </div>
        )}

        {locationError && <p className="error" style={{ marginTop: '0.6rem', background: '#fef2f2', padding: '0.5rem 0.8rem', borderRadius: '8px', color: '#991b1b' }}>{locationError}</p>}
      </div>

      {/* Main Filter Form */}
      <div className="panel" style={{ marginBottom: '1.25rem' }}>
        <form
          className="form"
          onSubmit={(e) => { e.preventDefault(); load(); }}
        >
          <div className="form-row">
            <label>City<input value={filters.city} onChange={set('city')} placeholder="Chennai, Bengaluru…" /></label>
            <label>Sharing type<input value={filters.sharingType} onChange={set('sharingType')} placeholder="2-sharing" /></label>
          </div>
          <div className="form-row">
            <label>Min rent<input type="number" value={filters.minRent} onChange={set('minRent')} /></label>
            <label>Max rent<input type="number" value={filters.maxRent} onChange={set('maxRent')} /></label>
          </div>
          <div className="form-row">
            <label>Gender
              <select value={filters.gender} onChange={set('gender')}>
                <option value="">Any</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </label>
            <label>Amenity<input value={filters.amenity} onChange={set('amenity')} placeholder="WiFi" /></label>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={filters.availableOnly} onChange={set('availableOnly')} />
            Only show available beds
          </label>
          <button className="btn btn-primary" type="submit">Filter Results</button>
        </form>
      </div>

      <div className="layout-split">
        <div>
          {loading && <div className="empty">Searching…</div>}
          {!loading && processedHostels.length === 0 && (
            <div className="panel empty">
              No hostels matched your search filters
              {userCoords && maxRadiusKm !== 'any' ? ` within ${maxRadiusKm} km.` : '.'}
            </div>
          )}
          <div className="grid grid-2">
            {processedHostels.map((h) => (
              <Link key={h.id} to={`/hostels/${h.id}`} className="panel hostel-card">
                <div
                  className="thumb"
                  style={{
                    backgroundImage: h.imageUrls?.[0]
                      ? `url(${mediaUrl(h.imageUrls[0])})`
                      : PLACEHOLDER,
                  }}
                />
                <div style={{ paddingTop: '0.85rem' }}>
                  <div className="actions" style={{ justifyContent: 'space-between' }}>
                    <h3>{h.name}</h3>
                    {h.verified && <span className="badge badge-ok">Verified</span>}
                  </div>
                  
                  {/* Location & Distance Display */}
                  <p className="meta" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <span>📍 {h.city}</span>
                    {h.distance != null && (
                      <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                        {h.distance} km away
                      </span>
                    )}
                    <span className="chip" style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: h.genderPreference === 'MALE' ? '#e0f2fe' : h.genderPreference === 'FEMALE' ? '#fce7f3' : '#f1f5f9',
                      color: h.genderPreference === 'MALE' ? '#0369a1' : h.genderPreference === 'FEMALE' ? '#be185d' : '#475569'
                    }}>
                      {h.genderPreference === 'MALE' ? '♂️ Men Only' : h.genderPreference === 'FEMALE' ? '♀️ Women Only' : '🚻 Unisex'}
                    </span>
                  </p>

                  <p className="meta">
                    From ₹{h.minRent ?? '—'} · {h.availableBeds} beds open
                  </p>
                  <div className="chip-row">
                    {(h.amenities || []).slice(0, 4).map((a) => (
                      <span className="chip" key={a}>{a}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3>Map View</h3>
          <HostelMap hostels={processedHostels} userCoords={userCoords} />
        </div>
      </div>
    </div>
  );
}
