import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LocateFixed,
  Minus,
  Plus,
  MapPin,
  Navigation,
  Loader2,
  Smartphone,
  Square,
  Settings2,
  Search,
  Check,
  HelpCircle,
  Radio,
  CheckCircle2,
  Sparkles,
  Radar,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { NatanAutomation } from '../utils/natanAutomation';

type LatLng = { lat: number; lng: number; radiusKm?: number };

interface LocationMapPickerProps {
  value?: { lat: number; lng: number } | null;
  onChange: (value: LatLng) => void;
  isAr?: boolean;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
const DEFAULT_CENTER = { lat: 26.4207, lng: 50.0888 }; // Dammam/Khobar area

const SAUDI_CITIES_PRESETS: Array<{ id: string; name: string; nameEn: string; lat: number; lng: number }> = [
  { id: 'riyadh', name: 'الرياض', nameEn: 'Riyadh', lat: 24.7136, lng: 46.6753 },
  { id: 'jeddah', name: 'جدة', nameEn: 'Jeddah', lat: 21.5433, lng: 39.1728 },
  { id: 'makkah', name: 'مكة المكرمة', nameEn: 'Makkah', lat: 21.3891, lng: 39.8579 },
  { id: 'madinah', name: 'المدينة المنورة', nameEn: 'Madinah', lat: 24.5247, lng: 39.5692 },
  { id: 'dammam', name: 'الدمام', nameEn: 'Dammam', lat: 26.4207, lng: 50.0888 },
  { id: 'khobar', name: 'الخبر', nameEn: 'Al Khobar', lat: 26.2172, lng: 50.1971 },
  { id: 'dhahran', name: 'الظهران', nameEn: 'Dhahran', lat: 26.2758, lng: 50.1481 },
  { id: 'ahsa', name: 'الأحساء', nameEn: 'Al Ahsa', lat: 25.3833, lng: 49.5864 },
  { id: 'qassim', name: 'القصيم / بريدة', nameEn: 'Al Qassim', lat: 26.3592, lng: 43.9818 },
  { id: 'tabuk', name: 'تبوك', nameEn: 'Tabuk', lat: 28.3835, lng: 36.5662 },
  { id: 'abha', name: 'أبها / خميس مشيط', nameEn: 'Abha', lat: 18.2164, lng: 42.5053 },
  { id: 'taif', name: 'الطائف', nameEn: 'Taif', lat: 21.2854, lng: 40.4244 },
];

function clampLat(lat: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

function project({ lat, lng }: { lat: number; lng: number }, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const sin = Math.sin((clampLat(lat) * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function unproject(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat: clampLat(lat), lng };
}

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({ value, onChange, isAr = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const centerRef = useRef<{ lat: number; lng: number }>(value || DEFAULT_CENTER);
  const [center, setCenter] = useState<{ lat: number; lng: number }>(value || DEFAULT_CENTER);
  const [zoom, setZoom] = useState(13);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [locating, setLocating] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mocking, setMocking] = useState(false);
  const [coverageRadiusKm, setCoverageRadiusKm] = useState<number>(15);
  const [mockActive, setMockActive] = useState(() => {
    try {
      const saved = localStorage.getItem('natan_gps_spoof');
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!parsed.active;
      }
    } catch {
      // safe
    }
    return false;
  });
  const [mockMessage, setMockMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCurrentLocation, setIsCurrentLocation] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!value) return;
    centerRef.current = value;
    setCenter(value);
  }, [value?.lat, value?.lng]);

  const tiles = useMemo(() => {
    const projected = project(center, zoom);
    const tileX = Math.floor(projected.x / TILE_SIZE);
    const tileY = Math.floor(projected.y / TILE_SIZE);
    const maxTile = 2 ** zoom;
    const items: Array<{ x: number; y: number; left: number; top: number; key: string }> = [];
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const rawX = tileX + dx;
        const y = tileY + dy;
        if (y < 0 || y >= maxTile) continue;
        const x = ((rawX % maxTile) + maxTile) % maxTile;
        items.push({
          x,
          y,
          left: (tileX + dx) * TILE_SIZE - projected.x,
          top: (tileY + dy) * TILE_SIZE - projected.y,
          key: `${zoom}-${rawX}-${y}`,
        });
      }
    }
    return items;
  }, [center, zoom]);

  const moveByPixels = useCallback((dx: number, dy: number) => {
    const p = project(centerRef.current, zoom);
    const next = unproject(p.x - dx, p.y - dy, zoom);
    centerRef.current = next;
    setCenter(next);
  }, [zoom]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    lastPointRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragOffset({ x: 0, y: 0 });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = event.clientX - lastPointRef.current.x;
    const dy = event.clientY - lastPointRef.current.y;
    lastPointRef.current = { x: event.clientX, y: event.clientY };
    moveByPixels(dx, dy);
    setDragOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
    setDragOffset({ x: 0, y: 0 });
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (Math.abs(dragOffset.x) + Math.abs(dragOffset.y) > 8) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const p = project(center, zoom);
    const worldX = p.x + (event.clientX - rect.left - rect.width / 2);
    const worldY = p.y + (event.clientY - rect.top - rect.height / 2);
    const next = unproject(worldX, worldY, zoom);
    onChange({ ...next, radiusKm: coverageRadiusKm });
    centerRef.current = next;
    setCenter(next);
    setIsCurrentLocation(false);
  };

  const zoomAtCenter = (nextZoom: number) => {
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom)));
  };

  // 1. Locate Me (Get Current Device Location)
  const locateMe = async () => {
    setLocating(true);
    setMapError(false);

    try {
      if (Capacitor.getPlatform() === 'android') {
        const position = await NatanAutomation.getCurrentLocation();
        const next = { lat: position.latitude, lng: position.longitude };
        onChange({ ...next, radiusKm: coverageRadiusKm });
        centerRef.current = next;
        setCenter(next);
        setZoom(16);
        setIsCurrentLocation(true);
        setLocating(false);
        setMockMessage(isAr ? 'تم تحديد موقع الهاتف الحالي بنجاح عبر GPS وتحديث نطاق التغطية.' : 'Phone location detected successfully via GPS.');
        return;
      }

      if (!navigator.geolocation) {
        throw new Error('Geolocation unavailable');
      }

      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const next = { lat: position.coords.latitude, lng: position.coords.longitude };
            onChange({ ...next, radiusKm: coverageRadiusKm });
            centerRef.current = next;
            setCenter(next);
            setZoom(16);
            setIsCurrentLocation(true);
            setMockMessage(isAr ? 'تم تحديد موقع الهاتف الحالي وتحديث نطاق رصد الشفتات حوله.' : 'Current phone GPS location detected.');
            resolve();
          },
          (err) => {
            reject(err);
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
        );
      });
    } catch {
      setMapError(true);
      setMockMessage(isAr ? 'تعذر جلب موقع GPS. يرجى التأكد من تشغيل الموقع في الهاتف والسماح للمتصفح.' : 'GPS unavailable. Please enable location permissions.');
    } finally {
      setLocating(false);
    }
  };

  // Jump to a Preset City
  const handleSelectCity = (preset: typeof SAUDI_CITIES_PRESETS[0]) => {
    const next = { lat: preset.lat, lng: preset.lng };
    onChange({ ...next, radiusKm: coverageRadiusKm });
    centerRef.current = next;
    setCenter(next);
    setZoom(14);
    setIsCurrentLocation(false);
    setMockMessage(isAr ? `تم نقل اللوكيشن إلى ${preset.name} وضبط رصد التغطية حولها.` : `Moved to ${preset.nameEn}`);
  };

  // 2. Apply to Phone (GPS Spoofing / Mock Location)
  const applyToPhoneGps = async () => {
    const target = value || center;
    setMocking(true);
    setMockMessage('');

    try {
      if (Capacitor.getPlatform() === 'android') {
        const result = await NatanAutomation.setMockLocation({
          latitude: Number(target.lat.toFixed(6)),
          longitude: Number(target.lng.toFixed(6)),
        });
        setMockActive(result.active);
        setMockMessage(
          result.detail ||
            (isAr
              ? `🚀 تم تغيير موقع GPS للهاتف بنجاح إلى: (${target.lat.toFixed(5)}, ${target.lng.toFixed(5)})`
              : `🚀 Phone GPS location successfully changed to: (${target.lat.toFixed(5)}, ${target.lng.toFixed(5)})`)
        );
      } else {
        // Web / PWA simulation mode
        localStorage.setItem(
          'natan_gps_spoof',
          JSON.stringify({
            active: true,
            lat: target.lat,
            lng: target.lng,
            timestamp: Date.now(),
          })
        );
        setMockActive(true);
        setMockMessage(
          isAr
            ? `🟢 تم تغيير وتثبيت موقع GPS للهاتف بنجاح! الإحداثيات نشطة: (${target.lat.toFixed(5)}, ${target.lng.toFixed(5)})`
            : `🟢 Phone GPS simulated location active: (${target.lat.toFixed(5)}, ${target.lng.toFixed(5)})`
        );
      }
    } catch (error) {
      setMockActive(false);
      setMockMessage(
        error instanceof Error
          ? error.message
          : isAr
          ? 'تأكد من تفعيل NATAN كتطبيق Mock Location في خيارات المطور.'
          : 'Please enable NATAN as the Mock Location app in Developer Options.'
      );
    } finally {
      setMocking(false);
    }
  };

  const openMockSettings = async () => {
    try {
      if (Capacitor.getPlatform() === 'android') {
        await NatanAutomation.openMockLocationSettings();
      }
      setShowGuide(true);
      setMockMessage(
        isAr
          ? 'من خيارات المطور بالهاتف، اختر NATAN كتطبيق للموقع الوهمي (Mock Location).'
          : 'From Developer Options, select NATAN as the Mock Location app.'
      );
    } catch {
      setShowGuide(true);
    }
  };

  const stopMock = async () => {
    try {
      if (Capacitor.getPlatform() === 'android') {
        const result = await NatanAutomation.stopMockLocation();
        setMockMessage(result.detail || (isAr ? 'تم إيقاف الموقع والعودة للموقع الحقيقي.' : 'Mock location stopped.'));
      } else {
        localStorage.removeItem('natan_gps_spoof');
        setMockMessage(isAr ? 'تم إيقاف تغيير الموقع والعودة إلى موقع الهاتف الحقيقي.' : 'Location reset to real phone GPS.');
      }
      setMockActive(false);
    } catch (error) {
      setMockMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const selected = value || center;
  const selectedPx = project(selected, zoom);
  const centerPx = project(center, zoom);
  const markerLeft = selectedPx.x - centerPx.x;
  const markerTop = selectedPx.y - centerPx.y;

  // Approximate pixel radius of coverage circle based on zoom & latitude
  const metersPerPx = useMemo(() => {
    return (156543.03392 * Math.cos((selected.lat * Math.PI) / 180)) / (2 ** zoom);
  }, [selected.lat, zoom]);

  const coverageRadiusPx = useMemo(() => {
    const px = (coverageRadiusKm * 1000) / metersPerPx;
    return Math.max(35, Math.min(650, px));
  }, [coverageRadiusKm, metersPerPx]);

  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return SAUDI_CITIES_PRESETS;
    const q = searchQuery.toLowerCase().trim();
    return SAUDI_CITIES_PRESETS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="rounded-3xl overflow-hidden border border-cyan-500/25 bg-slate-950 shadow-2xl space-y-0">
      
      {/* ====================================================
          TOP TOOLBAR: LOCATE ME + CITY SHORTCUTS + SEARCH + COVERAGE RADIUS
          ==================================================== */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-850 space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* LOCATE CURRENT GPS BUTTON */}
          <button
            type="button"
            onClick={locateMe}
            disabled={locating}
            className={`
              flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer shadow-lg active:scale-95
              ${
                isCurrentLocation
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/50'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/25'
              }
              disabled:opacity-60
            `}
            title={isAr ? 'تحديد مكاني الحالي عبر GPS' : 'Locate my current position via GPS'}
          >
            {locating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4 animate-pulse" />
            )}
            <span>
              {isAr ? '📍 إظهار وتحديد مكاني الحالي' : '📍 Show My Current Location'}
            </span>
            {isCurrentLocation && (
              <span className="text-[10px] bg-emerald-950/60 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/40">
                {isAr ? 'موقعي نشط' : 'GPS Active'}
              </span>
            )}
          </button>

          {/* SEARCH CITY INPUT */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث عن مدينة أو فرع...' : 'Search city or branch...'}
              className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition"
            />
          </div>
        </div>

        {/* QUICK SAUDI CITIES PILLS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] text-slate-400 font-bold shrink-0 ml-1">
            {isAr ? 'المدن والمناطق:' : 'Cities & Regions:'}
          </span>
          {filteredPresets.map((preset) => {
            const isNear =
              Math.abs(selected.lat - preset.lat) < 0.15 &&
              Math.abs(selected.lng - preset.lng) < 0.15;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectCity(preset)}
                className={`
                  shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1
                  ${
                    isNear
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }
                `}
              >
                {isNear && <Check className="w-3 h-3 text-cyan-400" />}
                <span>{isAr ? preset.name : preset.nameEn}</span>
              </button>
            );
          })}
        </div>

        {/* COVERAGE RADIUS SELECTOR (حسب التغطية) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="text-xs font-bold text-white">
              {isAr ? 'نطاق تغطية رصد الشفتات في المنطقة وحولها:' : 'Shift Monitoring Coverage Radius:'}
            </span>
            <span className="text-[11px] font-black text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
              {coverageRadiusKm} {isAr ? 'كم' : 'km'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[5, 10, 15, 25, 50].map((radius) => (
              <button
                key={radius}
                type="button"
                onClick={() => {
                  setCoverageRadiusKm(radius);
                  onChange({ lat: selected.lat, lng: selected.lng, radiusKm: radius });
                }}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  coverageRadiusKm === radius
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30 border border-cyan-400 ring-2 ring-cyan-400/40'
                    : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {radius} {isAr ? 'كم' : 'km'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ====================================================
          MAP CANVAS WITH INTERACTIVE CONTROLS & VISUAL COVERAGE CIRCLE
          ==================================================== */}
      <div
        ref={containerRef}
        className="relative h-[430px] sm:h-[490px] overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing bg-slate-950"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleMapClick}
      >
        {/* OpenStreetMap Tiles */}
        <div className="absolute inset-0">
          {tiles.map((tile) => (
            <img
              key={tile.key}
              src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
              alt=""
              draggable={false}
              onError={() => setMapError(true)}
              className="absolute w-[256px] h-[256px] max-w-none transition-opacity duration-200"
              style={{
                left: `calc(50% + ${tile.left}px)`,
                top: `calc(50% + ${tile.top}px)`,
                filter: 'brightness(0.92) contrast(1.05)',
              }}
            />
          ))}
        </div>

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950/40" />

        {/* VISUAL COVERAGE RADIUS CIRCLE (نطاق التغطية) */}
        <div
          className="absolute left-1/2 top-1/2 pointer-events-none transition-transform duration-100"
          style={{
            transform: `translate(${markerLeft}px, ${markerTop}px) translate(-50%, -50%)`,
            width: `${coverageRadiusPx * 2}px`,
            height: `${coverageRadiusPx * 2}px`,
          }}
        >
          <div className="w-full h-full rounded-full border-2 border-dashed border-cyan-400/60 bg-cyan-500/10 backdrop-blur-[0.5px] shadow-[0_0_40px_rgba(6,182,212,0.3)] flex items-center justify-center">
            <span className="text-[10px] font-black font-mono text-cyan-300 bg-slate-950/85 px-2.5 py-0.5 rounded-full border border-cyan-500/50 shadow-md">
              {isAr ? `نطاق التغطية: ${coverageRadiusKm} كم` : `${coverageRadiusKm} km coverage`}
            </span>
          </div>
        </div>

        {/* PIN MARKER */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none transition-transform duration-75"
          style={{ transform: `translate(${markerLeft}px, ${markerTop}px) translate(-50%, -100%)` }}
        >
          <div className="relative flex flex-col items-center">
            {/* Pulsing ring around marker */}
            <div className="absolute -inset-2 rounded-full bg-cyan-400/25 animate-ping" />
            <div className="w-12 h-12 rounded-full bg-slate-950/90 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.7)] backdrop-blur-md">
              <MapPin className="w-7 h-7 text-cyan-400 fill-cyan-400/40" />
            </div>
            {/* Center target needle */}
            <div className="w-3 h-3 rounded-full bg-cyan-400 border border-slate-950 shadow-[0_0_12px_rgba(6,182,212,1)] -mt-1.5" />
          </div>
        </div>

        {/* TOP MAP INSTRUCTION BADGE & ZOOM CONTROLS */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-3 pointer-events-none">
          <div className="rounded-xl border border-cyan-500/30 bg-slate-950/90 backdrop-blur-xl px-3.5 py-2 text-xs text-white shadow-2xl flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <div className="font-black text-cyan-200">
                {isAr ? 'الخريطة التفاعلية' : 'Interactive Map'}
              </div>
              <div className="text-[10px] text-slate-400">
                {isAr ? 'انقر على أي نقطة لتغيير اللوكيشن ورصد الشفتات حولها' : 'Tap anywhere to set location & monitor shifts'}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={() => zoomAtCenter(zoom + 1)}
              className="w-9 h-9 rounded-xl bg-slate-950/90 border border-slate-700 text-white flex items-center justify-center backdrop-blur-xl hover:bg-slate-800 transition active:scale-95 shadow-lg"
              title="تكبير"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => zoomAtCenter(zoom - 1)}
              className="w-9 h-9 rounded-xl bg-slate-950/90 border border-slate-700 text-white flex items-center justify-center backdrop-blur-xl hover:bg-slate-800 transition active:scale-95 shadow-lg"
              title="تصغير"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAP STATUS / ERROR */}
        {mapError && (
          <div className="absolute bottom-4 left-4 max-w-[280px] rounded-xl border border-amber-400/30 bg-slate-950/95 backdrop-blur-xl px-3.5 py-2.5 text-[11px] text-amber-200 shadow-xl">
            {isAr
              ? 'تنبيه: يمكنك اختيار أي نقطة مباشرة على الشاشة لحفظ الإحداثيات.'
              : 'You can tap any point directly to save coordinates.'}
          </div>
        )}

        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-slate-600 pointer-events-none">
          © OpenStreetMap contributors
        </div>
      </div>

      {/* ====================================================
          PHONE GPS SPOOFING CONTROLLER (MAIN ACTION)
          ==================================================== */}
      <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-850 space-y-4">
        
        {/* GPS SPOOFER HEADER CARD */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${mockActive ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'}`}>
              <Radio className={`w-5 h-5 ${mockActive ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white">
                  {isAr ? 'تغيير موقع GPS للهاتف' : 'Phone GPS Location Control'}
                </h4>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${mockActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  {mockActive ? (isAr ? '🟢 الموقع الوهمي شغال' : '🟢 Mock Active') : (isAr ? '⚪ الموقع الحقيقي' : '⚪ Real GPS')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'تطبيق النقطة المختارة على نظام Android ليصبح موقع جهازك في نفس مكان رصد الشفتات'
                  : 'Broadcast picked location to Android system GPS'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="self-start sm:self-auto flex items-center gap-1.5 text-xs text-cyan-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{isAr ? 'شرح التفعيل في الهاتف' : 'Setup Guide'}</span>
          </button>
        </div>

        {/* ACTION BUTTONS: CHANGE GPS / STOP / OPEN SETTINGS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={applyToPhoneGps}
            disabled={mocking}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 px-4 py-3.5 text-xs font-black text-white shadow-lg shadow-cyan-600/30 border border-cyan-400/40 transition active:scale-95 cursor-pointer disabled:opacity-60"
          >
            {mocking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Smartphone className="w-4 h-4" />
            )}
            <span>
              {isAr ? 'تطبيق وتغيير موقع الهاتف الآن ⚡' : 'Change Phone GPS Now ⚡'}
            </span>
          </button>

          <button
            type="button"
            onClick={stopMock}
            disabled={!mockActive}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-3 text-xs font-black text-rose-300 transition active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Square className="w-4 h-4" />
            <span>
              {isAr ? 'استعادة موقع الهاتف الحقيقي' : 'Reset to Real Location'}
            </span>
          </button>

          <button
            type="button"
            onClick={openMockSettings}
            className="flex items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-3 text-xs font-black text-amber-200 transition active:scale-95 cursor-pointer"
          >
            <Settings2 className="w-4 h-4" />
            <span>
              {isAr ? 'إعدادات Mock Location' : 'Mock Settings'}
            </span>
          </button>
        </div>

        {/* FEEDBACK STATUS MESSAGE */}
        {mockMessage && (
          <div
            className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs ${
              mockActive
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{mockMessage}</span>
          </div>
        )}

        {/* DEVELOPER SETUP GUIDE (COLLAPSIBLE) */}
        {showGuide && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-200 space-y-2 leading-relaxed">
            <div className="font-bold flex items-center gap-2 text-sm text-amber-300">
              <Sparkles className="w-4 h-4" />
              <span>{isAr ? 'خطوات تغيير موقع GPS في هواتف أندرويد:' : 'How to spoof GPS on Android:'}</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] pr-2">
              <li>{isAr ? 'افتح إعدادات هاتفك > حول الهاتف (About Phone) > اضغط 7 مرات على "رقم الإصدار" لتفعيل خيارات المطور.' : 'Enable Developer Options in Android Settings by tapping Build Number 7 times.'}</li>
              <li>{isAr ? 'اذهب إلى الإعدادات الإضافية > خيارات المطور (Developer Options).' : 'Go to Developer Options.'}</li>
              <li>{isAr ? 'ابحث عن "تطبيق الموقع الوهمي" (Select mock location app) واختر NATAN.' : 'Find "Select mock location app" and choose NATAN.'}</li>
              <li>{isAr ? 'ارجع للتطبيق واضغط "تطبيق وتغيير موقع الهاتف الآن" وسيصبح موقع جهازك بالكامل في النقطة المختارة!' : 'Return here and click "Change Phone GPS Now" to instantly spoof device location.'}</li>
            </ol>
          </div>
        )}

        {/* COORDINATES TELEMETRY */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="text-[10px] text-slate-500 font-bold uppercase">{isAr ? 'خط العرض (Lat)' : 'Latitude'}</div>
            <div className="mt-1 text-xs sm:text-sm font-black text-cyan-300 font-mono tabular-nums">
              {selected.lat.toFixed(6)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="text-[10px] text-slate-500 font-bold uppercase">{isAr ? 'خط الطول (Lng)' : 'Longitude'}</div>
            <div className="mt-1 text-xs sm:text-sm font-black text-cyan-300 font-mono tabular-nums">
              {selected.lng.toFixed(6)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="text-[10px] text-slate-500 font-bold uppercase">{isAr ? 'نطاق التغطية' : 'Coverage Radius'}</div>
            <div className="mt-1 text-xs sm:text-sm font-black text-emerald-400 font-mono">
              {coverageRadiusKm} {isAr ? 'كم' : 'km'}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="text-[10px] text-slate-500 font-bold uppercase">{isAr ? 'حالة الرصد' : 'Monitoring'}</div>
            <div className="mt-1 text-xs sm:text-sm font-black text-purple-300 truncate">
              {isAr ? 'رصد المنطقة وحولها' : 'Area & Coverage'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
