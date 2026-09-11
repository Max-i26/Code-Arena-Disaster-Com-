import React, { useEffect, useState } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon, 
  Polyline, 
  Circle,
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  HazardCase, 
  SensorTelemetry, 
  Shelter, 
  FieldCrew, 
  WardDefinition 
} from '../types';

// Fix leaflet default icon markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export type MapTileTheme = 'osm' | 'dark' | 'satellite' | 'topo';

interface ThemeConfig {
  name: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom?: number;
}

const MAP_THEMES: Record<MapTileTheme, ThemeConfig> = {
  osm: {
    name: '🗺️ OpenStreetMap (Sri Lanka HD)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  dark: {
    name: '🌙 Dark Canvas',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16,
  },
  satellite: {
    name: '🛰️ Satellite Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
    maxZoom: 18,
  },
  topo: {
    name: '⛰️ Topographic / Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
    maxZoom: 18,
  },
};

// Custom HTML Pin Icons
const createCustomIcon = (bgColor: string, iconText: string, isPulse = false) => {
  return L.divIcon({
    className: 'custom-leaflet-pin',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        ${isPulse ? 'animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;' : ''}
      ">
        ${iconText}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

interface MapComponentProps {
  wards: WardDefinition[];
  cases: HazardCase[];
  sensors: SensorTelemetry[];
  shelters: Shelter[];
  crews: FieldCrew[];
  activeDetourPath?: [number, number][];
  onSelectCase?: (hazardCase: HazardCase) => void;
  selectedWardId?: string;
  center?: [number, number];
  zoom?: number;
}

const ChangeMapView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
};

export const MapComponent: React.FC<MapComponentProps> = ({
  wards,
  cases,
  sensors,
  shelters,
  crews,
  activeDetourPath,
  onSelectCase,
  selectedWardId,
}) => {
  // Default to Full Sri Lanka view with OpenStreetMap as primary
  const [currentCenter, setCurrentCenter] = useState<[number, number]>([7.8731, 80.7718]);
  const [currentZoom, setCurrentZoom] = useState<number>(7.5);
  const [mapTheme, setMapTheme] = useState<MapTileTheme>('osm');
  const [layers, setLayers] = useState({
    wards: true,
    hazards: true,
    sensors: true,
    shelters: true,
    crews: true,
  });

  const presetViews = [
    { label: '🇱🇰 Full Sri Lanka (National)', center: [7.8731, 80.7718] as [number, number], zoom: 7.5 },
    { label: '🏙️ Metro Colombo & Kelani', center: [6.9344, 79.8800] as [number, number], zoom: 12 },
    { label: '💎 Ratnapura Flood Basin', center: [6.6828, 80.4034] as [number, number], zoom: 13 },
    { label: '🏞️ Kandy Mahaweli Basin', center: [7.2906, 80.6337] as [number, number], zoom: 12.5 },
    { label: '🌊 Galle Coastal Zone', center: [6.0535, 80.2210] as [number, number], zoom: 13 },
  ];

  const currentThemeConfig = MAP_THEMES[mapTheme] || MAP_THEMES.osm;

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top Map Toolbar: Geo-Focus & Basemap Switcher */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Quick Geo Focus Buttons */}
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-2xl shadow-2xl flex flex-wrap items-center gap-1.5 pointer-events-auto">
          <span className="text-[10px] text-cyan-400 font-bold uppercase px-1 font-mono">Focus View:</span>
          {presetViews.map((v, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentCenter(v.center);
                setCurrentZoom(v.zoom);
              }}
              className="bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 px-2.5 py-1 rounded-xl text-[11px] font-medium transition shadow-sm"
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Right: Theme Switcher & Layer Toggles */}
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-2xl shadow-2xl flex flex-wrap items-center gap-2 pointer-events-auto text-xs font-mono">
          {/* Basemap Switcher */}
          <div className="flex items-center space-x-1 border-r border-slate-700 pr-2">
            {(['osm', 'dark', 'satellite', 'topo'] as MapTileTheme[]).map((thm) => (
              <button
                key={thm}
                onClick={() => setMapTheme(thm)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                  mapTheme === thm
                    ? 'bg-cyan-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {MAP_THEMES[thm].name}
              </button>
            ))}
          </div>

          {/* Layer Checkboxes */}
          <div className="flex items-center space-x-2 text-[11px]">
            <label className="flex items-center space-x-1 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={layers.wards}
                onChange={(e) => setLayers({ ...layers, wards: e.target.checked })}
                className="rounded border-slate-700 text-cyan-600 focus:ring-0"
              />
              <span>Wards</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={layers.hazards}
                onChange={(e) => setLayers({ ...layers, hazards: e.target.checked })}
                className="rounded border-slate-700 text-rose-600 focus:ring-0"
              />
              <span>Hazards</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={layers.sensors}
                onChange={(e) => setLayers({ ...layers, sensors: e.target.checked })}
                className="rounded border-slate-700 text-amber-600 focus:ring-0"
              />
              <span>Sensors</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={layers.shelters}
                onChange={(e) => setLayers({ ...layers, shelters: e.target.checked })}
                className="rounded border-slate-700 text-purple-600 focus:ring-0"
              />
              <span>Shelters</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={layers.crews}
                onChange={(e) => setLayers({ ...layers, crews: e.target.checked })}
                className="rounded border-slate-700 text-emerald-600 focus:ring-0"
              />
              <span>Crews</span>
            </label>
          </div>
        </div>
      </div>

      {/* Map Attribution / Status Pill */}
      <div className="absolute bottom-2 left-2 z-[400] bg-slate-900/90 backdrop-blur-sm border border-slate-800 px-3 py-1 rounded-xl text-[10px] font-mono text-slate-200 flex items-center space-x-2 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Sri Lanka National GIS Telemetry Map · Live {currentThemeConfig.name.split(' ')[1]}</span>
      </div>

      <MapContainer
        center={currentCenter}
        zoom={currentZoom}
        minZoom={6}
        maxZoom={19}
        style={{ width: '100%', height: '100%' }}
        className="z-0"
      >
        <ChangeMapView center={currentCenter} zoom={currentZoom} />

        {/* Dynamic High-Definition Tile Layer */}
        <TileLayer
          key={mapTheme}
          attribution={currentThemeConfig.attribution}
          url={currentThemeConfig.url}
          maxZoom={currentThemeConfig.maxZoom || 19}
        />

        {/* 1. Ward Polygons */}
        {layers.wards &&
          wards.map((ward) => {
            const isSelected = selectedWardId === ward.id;
            const color =
              ward.riskLevel === 'EXTREME'
                ? '#e11d48'
                : ward.riskLevel === 'HIGH'
                ? '#f97316'
                : '#0ea5e9';
            return (
              <Polygon
                key={ward.id}
                positions={ward.polygon}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: isSelected ? 0.35 : 0.18,
                  weight: isSelected ? 3 : 1.5,
                  dashArray: isSelected ? '4, 4' : undefined,
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <h4 className="font-bold text-white">{ward.name}</h4>
                    <p className="text-slate-300">Risk Profile: <span className="font-bold text-rose-400">{ward.riskLevel}</span></p>
                    <p className="text-slate-400">Population: {ward.population.toLocaleString()}</p>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

        {/* 2. Hazard Cases Pins */}
        {layers.hazards &&
          cases.map((c) => {
            const isResolved = c.status === 'RESOLVED';
            const isCritical = c.verdictData?.urgency === 'CRITICAL' || c.roadClosed;
            const pinColor = isResolved ? '#10b981' : isCritical ? '#ef4444' : '#f59e0b';
            const iconSymbol = c.hazardType === 'FLOOD' ? '🌊' : c.hazardType === 'FALLEN_TREE' ? '🌳' : '⚠️';

            return (
              <React.Fragment key={c.id}>
                <Marker
                  position={[c.location.lat, c.location.lng]}
                  icon={createCustomIcon(pinColor, iconSymbol, isCritical && !isResolved)}
                >
                  <Popup>
                    <div className="text-xs space-y-2 max-w-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white uppercase">{c.hazardType.replace('_', ' ')}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          c.status === 'RESOLVED' ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <p className="text-slate-300">{c.description || 'Hazard reported on road segment.'}</p>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800 space-y-1 font-mono text-[11px]">
                        <div>Road: <span className="text-cyan-400">{c.location.roadName}</span></div>
                        <div>Status: {c.roadClosed ? <span className="text-rose-400 font-bold">⛔ ROAD CLOSED</span> : <span className="text-emerald-400">OPEN</span>}</div>
                        {c.verdictData && <div>AI Confidence: <span className="text-white font-bold">{(c.verdictData.confidenceScore * 100).toFixed(0)}%</span></div>}
                      </div>
                      {onSelectCase && (
                        <button
                          onClick={() => onSelectCase(c)}
                          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-1.5 rounded-lg text-xs transition"
                        >
                          Inspect 5-Check AI Diagnostics
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>

                {/* Flood Hazard Buffer Zone */}
                {c.hazardType === 'FLOOD' && !isResolved && (
                  <Circle
                    center={[c.location.lat, c.location.lng]}
                    radius={250}
                    pathOptions={{
                      color: '#ef4444',
                      fillColor: '#ef4444',
                      fillOpacity: 0.2,
                      weight: 1,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

        {/* 3. Sensor Station Markers */}
        {layers.sensors &&
          sensors.map((s) => {
            const isDanger = s.status === 'DANGER';
            const isWarning = s.status === 'WARNING';
            const color = isDanger ? '#dc2626' : isWarning ? '#d97706' : '#2563eb';
            const iconSymbol = s.stationType === 'RAIN_GAUGE' ? '🌧️' : '📏';

            return (
              <Marker
                key={s.stationId}
                position={[s.lat, s.lng]}
                icon={createCustomIcon(color, iconSymbol)}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <h4 className="font-bold text-white">{s.stationName}</h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {s.stationType}
                    </span>
                    <div className="mt-1 space-y-0.5 font-mono text-[11px] text-slate-300">
                      {s.stationType === 'RAIN_GAUGE' ? (
                        <>
                          <div>Rainfall Rate: <span className="text-cyan-400 font-bold">{s.rainfallRateMmH.toFixed(1)} mm/h</span></div>
                          <div>Accumulated (3h): {s.rainfallAccumulated3h.toFixed(1)} mm</div>
                        </>
                      ) : (
                        <>
                          <div>River Crest Capacity: <span className={`font-bold ${isDanger ? 'text-rose-400' : 'text-cyan-400'}`}>{s.riverCapacityPct.toFixed(1)}%</span></div>
                          <div>River Depth: {s.riverLevelMeters.toFixed(2)} m</div>
                        </>
                      )}
                      <div>Status: <span className={`font-bold ${isDanger ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>{s.status}</span></div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 4. Evacuation Shelter Markers */}
        {layers.shelters &&
          shelters.map((sh) => {
            const occupancyPct = Math.round((sh.currentOccupancy / sh.totalCapacity) * 100);
            const isFull = occupancyPct >= 95;
            return (
              <Marker
                key={sh.id}
                position={[sh.location.lat, sh.location.lng]}
                icon={createCustomIcon('#9333ea', '🏠')}
              >
                <Popup>
                  <div className="text-xs space-y-1.5 max-w-xs">
                    <h4 className="font-bold text-white">{sh.name}</h4>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Bed Capacity:</span>
                      <span className="font-bold text-white font-mono">{sh.currentOccupancy} / {sh.totalCapacity} ({occupancyPct}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${isFull ? 'bg-rose-500' : 'bg-purple-500'}`}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Supplies: {sh.supplies.foodPacks} food packs · {sh.supplies.waterLitres}L water · {sh.supplies.medicalKits} med kits
                    </div>
                    <div className="text-[10px] text-cyan-400 font-mono">Emergency Hotline: {sh.contactPhone}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 5. Field Crew Markers */}
        {layers.crews &&
          crews.map((cr) => {
            return (
              <Marker
                key={cr.id}
                position={[cr.currentLocation.lat, cr.currentLocation.lng]}
                icon={createCustomIcon('#059669', '🚒')}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <h4 className="font-bold text-white">{cr.name}</h4>
                    <div className="text-[10px] text-slate-400">Specialization: <span className="text-emerald-400 font-mono">{cr.specialization}</span></div>
                    <div className="text-[10px] text-slate-400">Status: <span className="font-bold text-white">{cr.status}</span></div>
                    <div className="text-[10px] text-slate-400 font-mono">Radio: {cr.contactPhone}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 6. Active Safe Detour Route Polyline */}
        {activeDetourPath && activeDetourPath.length > 0 && (
          <Polyline
            positions={activeDetourPath}
            pathOptions={{
              color: '#38bdf8',
              weight: 5,
              opacity: 0.9,
              dashArray: '8, 8',
            }}
          />
        )}
      </MapContainer>
    </div>
  );
};
