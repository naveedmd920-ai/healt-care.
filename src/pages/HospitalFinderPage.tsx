import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Search, LocateFixed } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useLanguage } from '../context/LanguageContext';
import { api, getApiErrorMessage } from '../services/api';
import { translateEnum } from '../utils/i18nHelpers';

const CATEGORIES = [
  'all',
  'Primary Health Centre',
  'Community Health Centre',
  'Rural Clinic',
  'District Referral Hospital',
  'Sub-Centre',
];

export function HospitalFinderPage() {
  const { t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedHospital, setSelectedHospital] = useState<any>(null);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoNotice, setGeoNotice] = useState('');

  const fetchHospitals = async (coords?: { lat: number; lng: number } | null) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (locationQuery.trim()) params.location = locationQuery.trim();
      if (category !== 'all') params.category = category;
      const activeCoords = coords !== undefined ? coords : userCoords;
      if (activeCoords) {
        params.lat = String(activeCoords.lat);
        params.lng = String(activeCoords.lng);
      }

      const res = await api.get('/hospitals', { params });
      const list = res.data.hospitals || [];
      setHospitals(list);
      if (list.length > 0 && !selectedHospital) {
        setSelectedHospital(list[0]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('common.genericError')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, [category]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [17.46, 78.69],
      zoom: 12,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = layerGroup;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = markersLayerRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const bounds: L.LatLngTuple[] = [];

    if (userCoords) {
      bounds.push([userCoords.lat, userCoords.lng]);
      L.circleMarker([userCoords.lat, userCoords.lng], {
        radius: 8,
        color: '#0369a1',
        fillColor: '#0ea5e9',
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindPopup(`<strong>${t('hospitalsPage.yourLocation')}</strong>`)
        .addTo(group);
    }

    hospitals.forEach((h) => {
      const lat = Number(h.latitude);
      const lng = Number(h.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      bounds.push([lat, lng]);
      const marker = L.circleMarker([lat, lng], {
        radius: selectedHospital?.id === h.id ? 11 : 8,
        color: selectedHospital?.id === h.id ? '#9a3412' : '#15803d',
        fillColor: selectedHospital?.id === h.id ? '#ea580c' : '#16a34a',
        fillOpacity: 0.85,
        weight: 2,
      });

      marker.bindPopup(
        `<div style="min-width:180px">
          <div style="font-weight:700;font-size:13px">${h.name}</div>
          <div style="font-size:11px;color:#475569;margin-top:2px">${translateEnum(
            t,
            'hospitalCategory',
            h.category
          )} · ${h.village_town}</div>
          <div style="font-size:11px;margin-top:4px">${h.operating_hours}</div>
        </div>`
      );
      marker.on('click', () => setSelectedHospital(h));
      marker.addTo(group);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
    }
  }, [hospitals, selectedHospital, userCoords, t]);

  const handleRequestLocation = () => {
    setGeoNotice('');
    if (!navigator.geolocation) {
      setGeoNotice(t('hospitalsPage.geoUnavailable'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setGeoNotice(t('hospitalsPage.geoSuccess'));
        fetchHospitals(coords);
      },
      () => {
        setGeoNotice(t('hospitalsPage.geoDenied'));
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Navbar />
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-950">
              {t('hospitalsPage.title')}
            </h1>
            <p className="text-sm text-slate-600 mt-1">{t('hospitalsPage.subtitle')}</p>
          </div>

          <button
            type="button"
            onClick={handleRequestLocation}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-700/25 hover:border-emerald-700 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LocateFixed className="w-4 h-4 text-emerald-700" />
            <span>{t('hospitalsPage.useLocation')}</span>
          </button>
        </div>

        {geoNotice && (
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900">
            {geoNotice}
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="bg-white border border-emerald-950/10 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchHospitals()}
              placeholder={t('hospitalsPage.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
            />
          </div>

          <div className="md:col-span-4 relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchHospitals()}
              placeholder={t('hospitalsPage.locationPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="md:col-span-2 px-3 py-2 text-sm rounded-lg border border-emerald-950/15 bg-[#F8FAF9]"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? t('common.all') : translateEnum(t, 'hospitalCategory', c)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => fetchHospitals()}
            className="md:col-span-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
          >
            {t('common.search')}
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Hospital Results List */}
          <div className="lg:col-span-5 space-y-3 max-h-[540px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-6 bg-white rounded-xl border border-emerald-950/10 text-sm text-slate-500">
                {t('hospitalsPage.loading')}
              </div>
            ) : hospitals.length === 0 ? (
              <div className="p-6 bg-white rounded-xl border border-emerald-950/10 text-sm text-slate-600">
                {t('hospitalsPage.noMatch')}
              </div>
            ) : (
              hospitals.map((h) => {
                const isSelected = selectedHospital?.id === h.id;
                return (
                  <div
                    key={h.id}
                    onClick={() => {
                      setSelectedHospital(h);
                      mapRef.current?.setView([Number(h.latitude), Number(h.longitude)], 13);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-700'
                        : 'bg-white border-emerald-950/10 hover:border-emerald-700/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-teal-800 font-medium">
                      <span>
                        {translateEnum(t, 'hospitalCategory', h.category)} · {h.village_town}
                      </span>
                      {h.distance_km !== null && (
                        <span className="font-mono tabular-nums text-emerald-900">
                          {t('hospitalsPage.kmAway', { km: h.distance_km })}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-semibold text-slate-900 mt-1">{h.name}</h2>
                    <p className="text-xs text-slate-600 mt-1">{h.address}</p>
                    <p className="text-xs text-slate-500 mt-1.5">
                      {t('hospitalsPage.facilities')}: {h.facilities}
                    </p>
                    <div className="pt-2.5 mt-2.5 border-t border-emerald-950/10 flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-slate-700">{h.phone}</span>
                      <a
                        href={`https://www.openstreetmap.org/directions?from=&to=${h.latitude}%2C${h.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:underline"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>{t('hospitalsPage.directions')}</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Interactive Leaflet Map */}
          <div className="lg:col-span-7 space-y-3">
            <div className="rounded-xl overflow-hidden border border-emerald-950/10 bg-white">
              <div ref={mapContainerRef} className="w-full h-[460px]" />
            </div>

            {selectedHospital && (
              <div className="p-4 rounded-xl bg-white border border-emerald-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">
                    {translateEnum(t, 'hospitalCategory', selectedHospital.category)} ·{' '}
                    {selectedHospital.operating_hours}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedHospital.name}</h3>
                  <p className="text-xs text-slate-600">
                    {selectedHospital.address}, {selectedHospital.district}
                  </p>
                </div>
                <a
                  href={`https://www.openstreetmap.org/directions?from=${
                    userCoords ? `${userCoords.lat}%2C${userCoords.lng}` : ''
                  }&to=${selectedHospital.latitude}%2C${selectedHospital.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{t('hospitalsPage.openDirections')}</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
