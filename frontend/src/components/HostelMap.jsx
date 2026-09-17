import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reverseGeocode } from '../utils/location';

// Custom Marker Icons for Leaflet
const defaultIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const myHostelIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const selectedIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Tile Layers: Street (Normal), Satellite (Geographical), Topo (Terrain)
const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19,
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
  maxZoom: 18,
});

const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data &copy; OpenStreetMap, SRTM | Style &copy; OpenTopoMap',
  maxZoom: 17,
});

export default function HostelMap({
  hostels = [],
  focus,
  userCoords,
  selectedCoords,
  myHostelIds = [],
  selectable = true,
  onSelectLocation,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const activeTileLayerRef = useRef(null);
  const [mapType, setMapType] = useState('street'); // 'street' (Normal) | 'satellite' (Geographical) | 'topo' (Terrain)
  const [clickedLocationInfo, setClickedLocationInfo] = useState(null);

  // Initialize Interactive Leaflet Map with Layer Switcher
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let centerLat = 13.0827; // Default Chennai center
    let centerLng = 80.2707;
    let zoom = 12;

    if (focus?.latitude != null && focus?.longitude != null) {
      centerLat = focus.latitude;
      centerLng = focus.longitude;
      zoom = 14;
    } else if (selectedCoords?.latitude != null && selectedCoords?.longitude != null) {
      centerLat = selectedCoords.latitude;
      centerLng = selectedCoords.longitude;
      zoom = 14;
    } else if (userCoords?.latitude != null && userCoords?.longitude != null) {
      centerLat = userCoords.latitude;
      centerLng = userCoords.longitude;
      zoom = 13;
    } else if (hostels[0]?.latitude != null && hostels[0]?.longitude != null) {
      centerLat = hostels[0].latitude;
      centerLng = hostels[0].longitude;
      zoom = 12;
    }

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([centerLat, centerLng], zoom);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Add default street layer
      streetLayer.addTo(map);
      activeTileLayerRef.current = streetLayer;

      // Add native Leaflet layer control
      const baseMaps = {
        '🗺️ Normal Street': streetLayer,
        '🛰️ Geographical / Satellite': satelliteLayer,
        '⛰️ Terrain / Topo': topoLayer,
      };
      L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Click to pick location manually on map
      map.on('click', async (e) => {
        if (!selectable) return;
        const { lat, lng } = e.latlng;
        const roundedLat = Math.round(lat * 1000000) / 1000000;
        const roundedLng = Math.round(lng * 1000000) / 1000000;

        const fullAddr = await reverseGeocode(roundedLat, roundedLng);
        const locationData = {
          latitude: roundedLat,
          longitude: roundedLng,
          address: fullAddr || '',
          city: fullAddr ? (fullAddr.split(',').slice(-2, -1)[0] || '').trim() : '',
        };

        setClickedLocationInfo({ ...locationData, fullAddr });

        if (onSelectLocation) {
          onSelectLocation(locationData);
        }
      });
    } else {
      mapInstanceRef.current.setView([centerLat, centerLng], zoom);
    }
  }, []);

  // Switch Tile Layer (Normal Street vs Geographical Satellite vs Terrain Topo)
  const switchMapLayer = (type) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    let targetLayer = streetLayer;
    if (type === 'satellite') targetLayer = satelliteLayer;
    if (type === 'topo') targetLayer = topoLayer;

    targetLayer.addTo(map);
    activeTileLayerRef.current = targetLayer;
    setMapType(type);
  };

  // Update Markers dynamically when hostels, focus, userCoords or selectedCoords change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    const myIdSet = new Set(myHostelIds.map((id) => String(id)));
    const points = focus ? [focus] : hostels.filter((h) => h.latitude != null && h.longitude != null);
    const bounds = [];

    // 1. Hostel Markers
    points.forEach((h) => {
      const isMine = myIdSet.has(String(h.id));
      const icon = isMine ? myHostelIcon : defaultIcon;
      const marker = L.marker([h.latitude, h.longitude], { icon });

      const popupContent = `
        <div style="font-family: sans-serif; min-width: 160px;">
          <strong style="font-size: 1rem; color: #0a2f2c;">${h.name}</strong><br/>
          <span style="font-size: 0.85rem; color: #475569;">📍 ${h.city || h.address || ''}</span><br/>
          ${h.minRent ? `<span style="font-weight:700; color:#1a6b63;">From ₹${h.minRent}/mo</span><br/>` : ''}
          <span style="font-size: 0.8rem; color: #64748b;">${h.availableBeds != null ? `${h.availableBeds} beds available` : ''}</span>
          ${isMine ? '<br/><span style="background:#e8f8ef; color:#067647; padding:2px 6px; border-radius:4px; font-weight:700; font-size:0.75rem;">Your Hostel</span>' : ''}
        </div>
      `;
      marker.bindPopup(popupContent);
      markersGroup.addLayer(marker);
      bounds.push([h.latitude, h.longitude]);
    });

    // 2. User GPS Location Marker
    if (userCoords?.latitude != null && userCoords?.longitude != null) {
      const uMarker = L.marker([userCoords.latitude, userCoords.longitude], { icon: userIcon });
      uMarker.bindPopup('<strong style="color:#0369a1;">📍 Your GPS Location</strong>');
      markersGroup.addLayer(uMarker);
      bounds.push([userCoords.latitude, userCoords.longitude]);
    }

    // 3. Selected / Clicked Manual Location Pin
    const activeSelected = selectedCoords || (clickedLocationInfo ? { latitude: clickedLocationInfo.latitude, longitude: clickedLocationInfo.longitude } : null);
    if (activeSelected?.latitude != null && activeSelected?.longitude != null) {
      const sMarker = L.marker([activeSelected.latitude, activeSelected.longitude], { icon: selectedIcon });
      sMarker.bindPopup(`
        <div style="font-family: sans-serif;">
          <strong style="color:#be185d;">📍 Pinned Location</strong><br/>
          <span style="font-size:0.85rem;">${clickedLocationInfo?.fullAddr || `${activeSelected.latitude}, ${activeSelected.longitude}`}</span>
        </div>
      `);
      markersGroup.addLayer(sMarker);
      sMarker.openPopup();
      bounds.push([activeSelected.latitude, activeSelected.longitude]);
    }

    if (bounds.length > 1 && !focus) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (_err) {
        // ignore fitBounds edge cases
      }
    }
  }, [hostels, focus, userCoords, selectedCoords, myHostelIds, clickedLocationInfo]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Top Map Mode Switcher Bar (Normal Street vs Geographical Satellite vs Terrain Topo) */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1000,
          display: 'flex',
          gap: '0.35rem',
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(6px)',
          padding: '0.3rem 0.4rem',
          borderRadius: '10px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          flexWrap: 'wrap'
        }}
      >
        <button
          type="button"
          onClick={() => switchMapLayer('street')}
          style={{
            background: mapType === 'street' ? '#0f3d39' : '#ffffff',
            color: mapType === 'street' ? '#ffffff' : '#0f3d39',
            border: mapType === 'street' ? 'none' : '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '0.35rem 0.65rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          🗺️ Normal Street
        </button>

        <button
          type="button"
          onClick={() => switchMapLayer('satellite')}
          style={{
            background: mapType === 'satellite' ? '#0f3d39' : '#ffffff',
            color: mapType === 'satellite' ? '#ffffff' : '#0f3d39',
            border: mapType === 'satellite' ? 'none' : '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '0.35rem 0.65rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          🛰️ Geographical / Satellite
        </button>

        <button
          type="button"
          onClick={() => switchMapLayer('topo')}
          style={{
            background: mapType === 'topo' ? '#0f3d39' : '#ffffff',
            color: mapType === 'topo' ? '#ffffff' : '#0f3d39',
            border: mapType === 'topo' ? 'none' : '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '0.35rem 0.65rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          ⛰️ Terrain
        </button>
      </div>

      <div
        ref={mapContainerRef}
        className="map-frame"
        style={{ width: '100%', height: '360px', borderRadius: '14px', zIndex: 1 }}
      />

      {selectable && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            right: '10px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(6px)',
            padding: '0.45rem 0.75rem',
            borderRadius: '10px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#0f3d39',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}
        >
          <span>👉 <strong>Interactive Map:</strong> Click anywhere to manually pick location coordinates.</span>
          {clickedLocationInfo && (
            <span style={{ color: '#be185d', fontWeight: 700 }}>
              Pinned: {clickedLocationInfo.fullAddr ? clickedLocationInfo.fullAddr.slice(0, 40) + '…' : `${clickedLocationInfo.latitude}, ${clickedLocationInfo.longitude}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
