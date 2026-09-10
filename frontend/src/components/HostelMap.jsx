export default function HostelMap({ hostels = [], focus, userCoords, myHostelIds = [] }) {
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  const points = focus ? [focus] : hostels.filter((h) => h.latitude != null && h.longitude != null);
  const myIdSet = new Set(myHostelIds.map((id) => String(id)));

  // If Google Maps key is present
  if (mapsKey && (points.length || userCoords)) {
    const center = points[0] || userCoords;
    let markers = points
      .map((h) => {
        const isMine = myIdSet.has(String(h.id));
        const color = isMine ? 'color:0xd97706%7Clabel:MINE' : 'color:0x1a6b63';
        return `&markers=${color}%7C${h.latitude},${h.longitude}`;
      })
      .join('');

    if (userCoords) {
      markers += `&markers=color:blue%7Clabel:YOU%7C${userCoords.latitude},${userCoords.longitude}`;
    }

    const src = `https://www.google.com/maps/embed/v1/view?key=${mapsKey}&center=${center.latitude},${center.longitude}&zoom=13${markers}`;
    return <iframe className="map-frame" title="Hostel map" loading="lazy" src={src} />;
  }

  // OpenStreetMap Fallback
  if (points.length || userCoords) {
    const centerLat = points[0]?.latitude ?? userCoords?.latitude;
    const centerLng = points[0]?.longitude ?? userCoords?.longitude;
    const delta = 0.03;
    const bbox = `${centerLng - delta},${centerLat - delta},${centerLng + delta},${centerLat + delta}`;
    const marker = `${centerLat}%2C${centerLng}`;
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
    return (
      <div>
        <iframe className="map-frame" title="Hostel map" loading="lazy" src={src} />
        {points.length > 0 && (
          <ul className="meta" style={{ marginTop: '0.75rem', paddingLeft: '0.5rem', listStyle: 'none' }}>
            {points.map((h) => {
              const isMine = myIdSet.has(String(h.id));
              return (
                <li key={h.id || h.name} style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {isMine ? '⭐' : '📍'} {h.name}
                  </span>
                  
                  {myHostelIds.length > 0 && (
                    isMine ? (
                      <span className="badge badge-ok" style={{ fontWeight: 800 }}>
                        Your Hostel
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                        Neighboring
                      </span>
                    )
                  )}

                  <span className="muted">({h.city || h.address})</span>

                  {h.distance != null && (
                    <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                      {h.distance} km away
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  return <div className="panel empty">No location coordinates available for these hostels.</div>;
}
