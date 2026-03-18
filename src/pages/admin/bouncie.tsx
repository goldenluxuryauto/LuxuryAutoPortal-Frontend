import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl } from "@/lib/queryClient";
import {
  RefreshCw, MapPin, Car, Navigation,
  Clock, Gauge, AlertCircle, CheckCircle2, Link2, Link2Off,
  Timer, Battery, BatteryLow, Route, BarChart3, ShieldAlert,
  Zap, Search, ExternalLink, X, Fuel, Activity, Layers, Map as MapIcon,
} from "lucide-react";
import { Link } from "wouter";

/* ─── Types ──────────────────────────────────────────────────────── */
interface VehicleEntry {
  device_id: string;
  imei: string;
  device_nickname: string | null;
  car_id: string | null;
  is_active: boolean;
  status: string | null;
  last_seen: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_speed_mph: number | null;
  battery_level: number | null;
  odometer_miles: number | null;
  make: string | null;
  model: string | null | Record<string, any>;
  year: string | null;
  license_plate: string | null;
  color: string | null;
  car_photo_url: string | null;
  displayStatus: string;
  liveStatus: {
    isRunning: boolean;
    speed: number;
    latitude: number | null;
    longitude: number | null;
    lastSeen: string | null;
    fuelLevel: number | null;
    odometer: number | null;
    vehicleInfo: { make: string | null; model: string | null; year: string | null; nickname: string | null };
  } | null;
}
interface FleetOverview {
  summary: { total: number; online: number; offline: number; driving: number };
  vehicles: VehicleEntry[];
  apiConnected: boolean;
}
interface ConnectionStatus {
  connected: boolean;
  expiresAt: string | null;
  isExpired: boolean;
  expiresInMinutes: number | null;
  source: "database" | "env" | "none";
  hasRefreshToken: boolean;
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function vehicleDisplayName(v: VehicleEntry): string {
  const year = v.year || v.liveStatus?.vehicleInfo?.year;
  const make = v.make || v.liveStatus?.vehicleInfo?.make;
  const rawModel = v.model || v.liveStatus?.vehicleInfo?.model;
  const model = rawModel && typeof rawModel === "object" ? (rawModel as any).name : rawModel;
  const nick = v.liveStatus?.vehicleInfo?.nickname ||
    (v.device_nickname && v.device_nickname !== "[object Object]" ? v.device_nickname : null);
  if (year && make && model) return `${year} ${make} ${model}`;
  if (make && model) return `${make} ${model}`;
  if (nick) return nick;
  return `Device ${v.imei}`;
}

function vehicleInitials(v: VehicleEntry): string {
  const name = vehicleDisplayName(v);
  const words = name.split(/[\s\-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words[0]?.slice(0, 2).toUpperCase() || "?";
}

function vehicleSubline(v: VehicleEntry): string {
  const year = v.year || v.liveStatus?.vehicleInfo?.year;
  const make = v.make || v.liveStatus?.vehicleInfo?.make;
  return [year, make].filter(Boolean).join(" ");
}

function formatLastSeen(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function getStatusInfo(status: string) {
  switch (status) {
    case "driving":
      return { label: "Driving", color: "#3b82f6", bg: "bg-blue-500", textClass: "text-blue-400" };
    case "parked":
    case "online":
      return { label: status === "parked" ? "Parked" : "Online", color: "#22c55e", bg: "bg-green-500", textClass: "text-green-400" };
    default:
      return { label: "Offline", color: "#6b7280", bg: "bg-gray-500", textClass: "text-gray-500" };
  }
}

function BatteryIndicator({ level }: { level: number | null }) {
  if (level == null) return null;
  const pct = Math.round(level);
  const color = pct <= 20 ? "text-red-400" : pct <= 50 ? "text-yellow-400" : "text-green-400";
  const Icon = pct <= 20 ? BatteryLow : Battery;
  return (
    <span className={`flex items-center gap-0.5 text-xs ${color}`}>
      <Icon className="w-3 h-3" />{pct}%
    </span>
  );
}

function slideMarkerTo(marker: any, newLat: number, newLng: number, durationMs = 1500) {
  const start = marker.getLatLng();
  const startTime = performance.now();
  function step(now: number) {
    const t = Math.min((now - startTime) / durationMs, 1);
    const ease = t * (2 - t);
    marker.setLatLng([
      start.lat + (newLat - start.lat) * ease,
      start.lng + (newLng - start.lng) * ease,
    ]);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ─── Vehicle Avatar ─────────────────────────────────────────────── */
function VehicleAvatar({
  v, size = 48, className = "",
}: { v: VehicleEntry; size?: number; className?: string }) {
  const [err, setErr] = useState(false);
  const photo = !err ? v.car_photo_url : null;
  const si = getStatusInfo(v.displayStatus);
  const initials = vehicleInitials(v);

  if (photo) {
    return (
      <img
        src={photo}
        alt={vehicleDisplayName(v)}
        onError={() => setErr(true)}
        style={{ width: size, height: size, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
        className={className}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, background: si.color, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "white", fontWeight: 700, fontSize: size * 0.3,
    }} className={className}>
      {initials}
    </div>
  );
}

/* ─── Vehicle Detail Panel ───────────────────────────────────────── */
function VehicleDetailPanel({ v, onClose }: { v: VehicleEntry; onClose: () => void }) {
  const si = getStatusInfo(v.displayStatus);
  const speed = Number(v.liveStatus?.speed ?? v.last_speed_mph ?? 0);
  const lat = v.liveStatus?.latitude ?? v.last_latitude;
  const lng = v.liveStatus?.longitude ?? v.last_longitude;
  const lastSeen = formatLastSeen(v.liveStatus?.lastSeen || v.last_seen);
  const odometer = v.liveStatus?.odometer ?? v.odometer_miles;
  const fuelLevel = v.liveStatus?.fuelLevel;
  const plate = v.license_plate;
  const name = vehicleDisplayName(v);

  return (
    <div
      className="absolute bottom-4 right-4 z-[1000] w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 text-gray-900 overflow-hidden"
      style={{ animation: "slideUp .25s ease-out" }}
    >
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }`}</style>

      <div className="flex items-start gap-3 p-4 pb-3">
        <VehicleAvatar v={v} size={52} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold truncate leading-tight">{name}</h3>
          {plate && <p className="text-xs text-gray-500 mt-0.5">{plate}</p>}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: si.color + "18", color: si.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: si.color }} />
              {si.label}
            </span>
            {si.label === "Driving" && speed > 0 && (
              <span className="text-[11px] font-bold text-blue-600 flex items-center gap-0.5">
                <Gauge className="w-3 h-3" />{speed.toFixed(0)} mph
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1 -mt-1 -mr-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-px bg-gray-100 mx-4 rounded-lg overflow-hidden mb-3">
        {[
          { icon: Clock, value: lastSeen, label: "Last seen" },
          { icon: Activity, value: odometer != null ? `${Number(odometer).toLocaleString()}` : "—", label: "Miles" },
          { icon: fuelLevel != null ? Fuel : Battery, value: fuelLevel != null ? `${Math.round(fuelLevel)}%` : (v.battery_level != null ? `${Math.round(v.battery_level)}%` : "—"), label: fuelLevel != null ? "Fuel" : "Battery" },
        ].map((s, i) => (
          <div key={i} className="bg-white p-2.5 text-center">
            <s.icon className="w-3.5 h-3.5 mx-auto text-gray-400 mb-1" />
            <p className="text-xs font-semibold">{s.value}</p>
            <p className="text-[10px] text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 pb-2 space-y-1.5">
        {v.color && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Color</span>
            <span className="font-medium capitalize">{v.color}</span>
          </div>
        )}
        {v.imei && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">IMEI</span>
            <span className="font-mono text-gray-500 text-[11px]">{v.imei}</span>
          </div>
        )}
        {lat != null && lng != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Coordinates</span>
            <span className="font-mono text-gray-500 text-[11px]">{Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 p-4 pt-2 border-t border-gray-100 mt-1">
        {lat != null && lng != null && (
          <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-gray-50 hover:bg-gray-100 rounded-lg py-2 transition-colors text-gray-700">
            <MapPin className="w-3.5 h-3.5" />Google Maps
          </a>
        )}
        <Link href={`/admin/bouncie-trips?deviceId=${v.device_id}`}>
          <span className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg py-2 px-4 transition-colors cursor-pointer">
            <Route className="w-3.5 h-3.5" />Trips
          </span>
        </Link>
      </div>
    </div>
  );
}

/* ─── Tile layer configs ─────────────────────────────────────────── */
const TILES = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    opts: { maxZoom: 19, attribution: "&copy; Esri" },
  },
  satelliteLabels: {
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    opts: { maxZoom: 19, pane: "overlayPane" },
  },
  road: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    opts: { maxZoom: 19, subdomains: "abcd", attribution: "&copy; OSM &copy; CARTO" },
  },
};

/* ─── Map ────────────────────────────────────────────────────────── */
function FleetMap({
  vehicles, selectedId, onSelect,
}: { vehicles: VehicleEntry[]; selectedId: string | null; onSelect: (v: VehicleEntry) => void }) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const mapInst    = useRef<any>(null);
  const markerMap  = useRef<Record<string, any>>({});
  const fittedRef  = useRef(false);
  const layersRef  = useRef<{ sat: any; labels: any; road: any }>({ sat: null, labels: null, road: null });
  const onSelectRef = useRef(onSelect);
  const prevStateRef = useRef<Record<string, string>>({});

  const [mapType, setMapType] = useState<"satellite" | "road">("satellite");

  useEffect(() => { onSelectRef.current = onSelect; });

  const withCoords = useMemo(() => vehicles.filter(v => {
    const lat = v.liveStatus?.latitude ?? v.last_latitude;
    const lng = v.liveStatus?.longitude ?? v.last_longitude;
    return lat != null && lng != null;
  }), [vehicles]);

  const buildIcon = useCallback((L: any, v: VehicleEntry, selected: boolean) => {
    const si = getStatusInfo(v.displayStatus);
    const ring  = selected ? "3px solid #f59e0b" : "2.5px solid white";
    const glow  = selected
      ? "0 0 0 4px rgba(245,158,11,0.35), 0 4px 14px rgba(0,0,0,0.3)"
      : "0 2px 8px rgba(0,0,0,0.35)";
    const size = selected ? 46 : 40;
    const photoUrl = v.car_photo_url;
    const initials = vehicleInitials(v);

    const inner = photoUrl
      ? `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"
           onerror="this.style.display='none';this.nextSibling.style.display='flex'" />
         <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;
           background:${si.color};border-radius:50%;color:white;font-weight:700;font-size:${size * 0.32}px">
           ${initials}</div>`
      : `<span style="color:white;font-weight:700;font-size:${size * 0.32}px">${initials}</span>`;

    return L.divIcon({
      html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${si.color};
        border:${ring};box-shadow:${glow};overflow:hidden;
        display:flex;align-items:center;justify-content:center">${inner}</div>`,
      className: "",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }, []);

  const buildLabel = useCallback((v: VehicleEntry) => {
    const name  = vehicleDisplayName(v);
    const short = name.length > 22 ? name.slice(0, 20) + "…" : name;
    const speed = v.liveStatus?.speed ?? v.last_speed_mph ?? 0;
    const mph   = v.displayStatus === "driving" && Number(speed) > 0
      ? ` <b style="color:#60a5fa">${Number(speed).toFixed(0)} mph</b>` : "";
    return `<div style="background:rgba(15,23,42,0.88);backdrop-filter:blur(6px);
      color:white;border-radius:6px;padding:3px 9px;font-family:system-ui;font-size:11px;
      font-weight:500;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);
      pointer-events:none;margin-top:4px">${short}${mph}</div>`;
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;
    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      const map = L.map(mapRef.current!, { zoomControl: false }).setView([40.5, -111.9], 7);

      const sat    = L.tileLayer(TILES.satellite.url, TILES.satellite.opts);
      const labels = L.tileLayer(TILES.satelliteLabels.url, TILES.satelliteLabels.opts);
      const road   = L.tileLayer(TILES.road.url, TILES.road.opts);

      sat.addTo(map);
      labels.addTo(map);
      layersRef.current = { sat, labels, road };

      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapInst.current = map;
    });

    return () => {
      if (mapInst.current) {
        mapInst.current.remove();
        mapInst.current = null;
        markerMap.current = {};
        prevStateRef.current = {};
        fittedRef.current = false;
      }
    };
  }, []);

  // Toggle satellite / road
  useEffect(() => {
    const map = mapInst.current;
    if (!map) return;
    const { sat, labels, road } = layersRef.current;
    if (!sat || !road) return;
    if (mapType === "satellite") {
      if (map.hasLayer(road)) map.removeLayer(road);
      if (!map.hasLayer(sat)) sat.addTo(map);
      if (!map.hasLayer(labels)) labels.addTo(map);
    } else {
      if (map.hasLayer(sat)) map.removeLayer(sat);
      if (map.hasLayer(labels)) map.removeLayer(labels);
      if (!map.hasLayer(road)) road.addTo(map);
    }
  }, [mapType]);

  // Update markers — only touches DOM when something visually changed
  useEffect(() => {
    if (!mapInst.current) return;
    import("leaflet").then((L) => {
      const map = mapInst.current;
      if (!map) return;
      const existing = new Set(Object.keys(markerMap.current));

      withCoords.forEach(v => {
        const lat = (v.liveStatus?.latitude ?? v.last_latitude) as number;
        const lng = (v.liveStatus?.longitude ?? v.last_longitude) as number;
        const sel = v.device_id === selectedId;
        const speed = Number(v.liveStatus?.speed ?? v.last_speed_mph ?? 0);
        const stateKey = `${v.displayStatus}|${sel}|${v.car_photo_url || ""}|${speed.toFixed(0)}`;

        if (markerMap.current[v.device_id]) {
          const m = markerMap.current[v.device_id];
          existing.delete(v.device_id);

          // Animate position change
          const old = m.getLatLng();
          const moved = Math.abs(old.lat - lat) > 0.00001 || Math.abs(old.lng - lng) > 0.00001;
          if (moved) {
            slideMarkerTo(m, lat, lng, v.displayStatus === "driving" ? 2000 : 400);
          }

          // Only rebuild icon if visual state changed — prevents flickering
          if (prevStateRef.current[v.device_id] !== stateKey) {
            m.setIcon(buildIcon(L, v, sel));
            prevStateRef.current[v.device_id] = stateKey;
          }

          if (m.getTooltip()) m.setTooltipContent(buildLabel(v));
        } else {
          const icon = buildIcon(L, v, sel);
          const marker = L.marker([lat, lng], { icon })
            .addTo(map)
            .bindTooltip(buildLabel(v), { permanent: true, direction: "bottom", offset: [0, 4], className: "bouncie-label" })
            .on("click", () => onSelectRef.current(v));
          markerMap.current[v.device_id] = marker;
          prevStateRef.current[v.device_id] = stateKey;
        }
      });

      existing.forEach(id => {
        map.removeLayer(markerMap.current[id]);
        delete markerMap.current[id];
        delete prevStateRef.current[id];
      });

      if (!fittedRef.current && Object.keys(markerMap.current).length > 0) {
        const group = L.featureGroup(Object.values(markerMap.current));
        map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 13 });
        fittedRef.current = true;
      }
    });
  }, [withCoords, selectedId, buildIcon, buildLabel]);

  // Fly to selected vehicle
  useEffect(() => {
    if (!selectedId || !mapInst.current) return;
    const m = markerMap.current[selectedId];
    if (!m) return;
    mapInst.current.flyTo(m.getLatLng(), 16, { duration: 0.8 });
  }, [selectedId]);

  const drivingCount = withCoords.filter(v => v.displayStatus === "driving").length;
  const parkedCount  = withCoords.filter(v => ["parked", "online"].includes(v.displayStatus)).length;
  const offlineCount = withCoords.length - drivingCount - parkedCount;

  if (withCoords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50">
        <MapPin className="w-14 h-14 opacity-15 mb-3" />
        <p className="font-semibold text-base">No vehicle locations available</p>
        <p className="text-sm mt-1 text-gray-400">Sync from Bouncie to get live coordinates</p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <style>{`
        .bouncie-label { background:transparent !important; border:none !important; box-shadow:none !important; padding:0 !important; }
        .bouncie-label::before { display:none !important; }
      `}</style>

      {/* Floating stats pill */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-gray-200/80 flex items-center gap-4 text-xs text-gray-700 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <b>{drivingCount}</b> driving
        </span>
        <span className="w-px h-3 bg-gray-200" />
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <b>{parkedCount}</b> parked
        </span>
        <span className="w-px h-3 bg-gray-200" />
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-400" />
          <b>{offlineCount}</b> offline
        </span>
      </div>

      {/* Map type toggle */}
      <button
        onClick={() => setMapType(t => t === "satellite" ? "road" : "satellite")}
        className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-md rounded-lg p-2 shadow-lg border border-gray-200/80 text-gray-600 hover:text-gray-900 transition-colors"
        title={mapType === "satellite" ? "Switch to road map" : "Switch to satellite"}
      >
        {mapType === "satellite" ? <MapIcon className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
      </button>

      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
const LIVE_POLL_MS = 15_000;

export default function BouncieFleetPage() {
  const { toast }   = useToast();
  const queryClient = useQueryClient();
  const [sseStatus, setSseStatus]     = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const sseRef                        = useRef<EventSource | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo]   = useState(0);
  const [search, setSearch]           = useState("");
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const tokenExpiredNotifiedRef       = useRef(false);
  const connectGraceRef               = useRef(0);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const connected = p.get("bouncie_connected");
    const error     = p.get("bouncie_error");
    if (connected === "true") {
      tokenExpiredNotifiedRef.current = false;
      connectGraceRef.current = Date.now();
      toast({ title: "Bouncie Connected", description: "Live tracking is now active." });
      window.history.replaceState({}, "", window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ["/api/bouncie/connection-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bouncie/fleet-overview"] });
    } else if (error) {
      toast({ title: "Connection Failed", description: `Error: ${error}`, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;
    const connect = () => {
      if (sseRef.current) sseRef.current.close();
      setSseStatus("connecting");
      const es = new EventSource(buildApiUrl("/api/bouncie/sse"), { withCredentials: true });
      sseRef.current = es;
      es.addEventListener("connected", () => { setSseStatus("connected"); tokenExpiredNotifiedRef.current = false; });
      es.addEventListener("fleet_event", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data || "{}");
          if (payload?.type === "token_expired") {
            // Ignore stale token_expired events that arrive within 30s after a
            // successful OAuth connect — the new token is already saved but an
            // in-flight request with the old token may have triggered this event.
            if (Date.now() - connectGraceRef.current < 30_000) return;
            queryClient.invalidateQueries({ queryKey: ["/api/bouncie/connection-status"] });
            if (!tokenExpiredNotifiedRef.current) {
              tokenExpiredNotifiedRef.current = true;
              toast({ title: "Bouncie Token Expired", description: "Reconnect to resume live tracking.", variant: "destructive" });
            }
            return;
          }
          if (payload?.type === "token_refreshed") {
            tokenExpiredNotifiedRef.current = false;
            connectGraceRef.current = Date.now();
            queryClient.invalidateQueries({ queryKey: ["/api/bouncie/connection-status"] });
            queryClient.invalidateQueries({ queryKey: ["/api/bouncie/fleet-overview"] });
            return;
          }
        } catch {}
        queryClient.invalidateQueries({ queryKey: ["/api/bouncie/fleet-overview"] });
      });
      es.addEventListener("fleet_update", () => { queryClient.invalidateQueries({ queryKey: ["/api/bouncie/fleet-overview"] }); });
      es.onerror = () => { setSseStatus("disconnected"); es.close(); reconnectTimer = setTimeout(connect, 10000); };
    };
    connect();
    return () => { sseRef.current?.close(); clearTimeout(reconnectTimer); };
  }, []);

  const { data: connData, isLoading: connLoading } = useQuery<{ success: boolean; data: ConnectionStatus }>({
    queryKey: ["/api/bouncie/connection-status"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/bouncie/connection-status"), { credentials: "include" });
      if (!res.ok) throw new Error();
      return res.json();
    },
    refetchInterval: 60000,
  });

  const connActive = connData?.data?.connected === true;

  const { data, isLoading, isFetching } = useQuery<{ success: boolean; data: FleetOverview }>({
    queryKey: ["/api/bouncie/fleet-overview"],
    queryFn: async () => {
      const res = await fetch(buildApiUrl("/api/bouncie/fleet-overview"), { credentials: "include" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setLastUpdated(new Date());
      setSecondsAgo(0);
      return json;
    },
    refetchInterval: connActive ? LIVE_POLL_MS : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!lastUpdated) return;
    const id = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000)), 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(buildApiUrl("/api/bouncie/sync-from-bouncie"), { method: "POST", credentials: "include" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Sync failed"); }
      return res.json();
    },
    onSuccess: (r) => { queryClient.invalidateQueries({ queryKey: ["/api/bouncie/fleet-overview"] }); toast({ title: "Sync Complete", description: `Synced ${r.data?.synced ?? 0} vehicle(s).` }); },
    onError: (e: Error) => toast({ title: "Sync Failed", description: e.message, variant: "destructive" }),
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(buildApiUrl("/api/bouncie/disconnect"), { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bouncie/connection-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bouncie/fleet-overview"] });
      toast({ title: "Disconnected", description: "Bouncie connection removed." });
    },
  });

  const conn    = connData?.data;
  const overview = data?.data;
  const summary  = overview?.summary;

  // Stable reference — only changes when server data changes, not on every render
  const allVehicles = useMemo(() => overview?.vehicles ?? [], [overview]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allVehicles;
    const q = search.toLowerCase();
    return allVehicles.filter(v =>
      vehicleDisplayName(v).toLowerCase().includes(q)
      || (v.license_plate || "").toLowerCase().includes(q)
      || (v.imei || "").includes(q)
    );
  }, [allVehicles, search]);

  const selectedVehicle = useMemo(
    () => allVehicles.find(v => v.device_id === selectedId) ?? null,
    [allVehicles, selectedId]
  );

  const handleConnect = useCallback(() => { window.location.href = buildApiUrl("/api/bouncie/connect"); }, []);

  // Stable callback — never changes reference, so FleetMap doesn't re-render from this
  const handleMapSelect = useCallback((v: VehicleEntry) => {
    setSelectedId(prev => prev === v.device_id ? null : v.device_id);
  }, []);

  const isConnected = conn?.connected && (conn.source === "database" || conn.source === "env");

  return (
    <AdminLayout>
      <div className="flex overflow-hidden -mx-3 -my-3 sm:-mx-4 sm:-my-4 md:-mx-6 md:-my-6" style={{ height: "calc(100vh - 56px)" }}>

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <div className="flex flex-col w-72 lg:w-80 flex-shrink-0 bg-[#0f172a] text-white overflow-hidden border-r border-[#1e293b]">

          <div className="px-4 pt-4 pb-3 border-b border-[#1e293b]">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-400" /> Fleet Tracking
              </h1>
              <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                sseStatus === "connected" ? "text-green-400 bg-green-400/10"
                  : sseStatus === "connecting" ? "text-yellow-400 bg-yellow-400/10"
                  : "text-gray-500 bg-gray-500/10"
              }`}>
                <Zap className="w-3 h-3" />
                {sseStatus === "connected" ? "Live" : sseStatus === "connecting" ? "…" : "Off"}
              </span>
            </div>

            {!connLoading && conn && (
              isConnected ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {conn.source === "database" && conn.expiresInMinutes != null ? `Connected · ${conn.expiresInMinutes}m` : "API Connected"}
                  </span>
                  {conn.source === "database" && (
                    <button onClick={() => confirm("Disconnect Bouncie?") && disconnectMutation.mutate()}
                      className="text-[11px] text-gray-600 hover:text-red-400 transition-colors flex items-center gap-1">
                      <Link2Off className="w-3 h-3" /> Disconnect
                    </button>
                  )}
                </div>
              ) : (
                <button onClick={handleConnect}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors">
                  <Link2 className="w-3.5 h-3.5" />
                  {conn.isExpired ? "Reconnect to Bouncie" : "Connect to Bouncie"}
                </button>
              )
            )}

            {lastUpdated && (
              <p className="text-[11px] text-gray-600 mt-2 flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
                Updated {secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 border-b border-[#1e293b]">
            {[
              { label: "Total",   value: summary?.total,   color: "text-white",     dot: "bg-white/30" },
              { label: "Online",  value: summary?.online,  color: "text-green-400", dot: "bg-green-500" },
              { label: "Driving", value: summary?.driving, color: "text-blue-400",  dot: "bg-blue-500" },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center py-3 border-r last:border-0 border-[#1e293b]">
                <span className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value ?? "—"}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="px-3 py-2.5 border-b border-[#1e293b]">
            <div className="flex items-center gap-2 bg-[#1e293b] rounded-lg px-3 py-2">
              <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vehicles…"
                className="bg-transparent text-sm text-white placeholder-gray-500 outline-none flex-1 min-w-0" />
              {search && <button onClick={() => setSearch("")} className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
            </div>
          </div>

          <div className="px-4 py-2 border-b border-[#1e293b]">
            <p className="text-[11px] text-gray-500">
              <span className="text-white font-semibold">{filtered.length}</span> of{" "}
              <span className="text-white font-semibold">{allVehicles.length}</span> vehicle{allVehicles.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-600 gap-2">
                <Car className="w-8 h-8 opacity-20" />
                <p className="text-sm">{search ? "No matches" : "No vehicles"}</p>
              </div>
            ) : (
              filtered.map(v => {
                const si = getStatusInfo(v.displayStatus);
                const isSelected = v.device_id === selectedId;
                const speed = v.liveStatus?.speed ?? v.last_speed_mph ?? 0;
                const lastSeen = formatLastSeen(v.liveStatus?.lastSeen || v.last_seen);
                const hasCoords = (v.liveStatus?.latitude ?? v.last_latitude) != null;

                return (
                  <button key={v.device_id}
                    onClick={() => setSelectedId(isSelected ? null : v.device_id)}
                    className={`w-full text-left px-3 py-3 flex items-center gap-3 border-b border-[#1e293b] transition-colors
                      hover:bg-[#1e293b]/70 ${isSelected ? "bg-blue-950/50 border-l-2 border-l-blue-500 pl-[10px]" : ""}`}>
                    <div className="relative flex-shrink-0">
                      <VehicleAvatar v={v} size={44} />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f172a] ${si.bg}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-white truncate leading-tight">{vehicleDisplayName(v)}</div>
                      <div className="text-[11px] text-gray-500 truncate mt-0.5">{v.license_plate || vehicleSubline(v) || v.imei}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {v.displayStatus === "driving" && Number(speed) > 0 && (
                          <span className="text-[11px] text-blue-400 font-bold flex items-center gap-0.5">
                            <Gauge className="w-3 h-3" />{Number(speed).toFixed(0)} mph
                          </span>
                        )}
                        <span className="text-[11px] text-gray-600 flex items-center gap-0.5"><Clock className="w-3 h-3" />{lastSeen}</span>
                        <BatteryIndicator level={v.battery_level} />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {hasCoords && (
                        <a href={`https://www.google.com/maps?q=${v.liveStatus?.latitude ?? v.last_latitude},${v.liveStatus?.longitude ?? v.last_longitude}`}
                          target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          className="text-gray-600 hover:text-blue-400 transition-colors" title="Google Maps">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <Link href={`/admin/bouncie-trips?deviceId=${v.device_id}`} onClick={(e: any) => e.stopPropagation()}>
                        <span title="Trip history"><Route className="w-3.5 h-3.5 text-gray-600 hover:text-blue-400 transition-colors" /></span>
                      </Link>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-[#1e293b] p-2 grid grid-cols-4 gap-1">
            {[
              { href: "/admin/bouncie-trips",     icon: Route,       label: "Trips"    },
              { href: "/admin/bouncie-behavior",  icon: ShieldAlert, label: "Behavior" },
              { href: "/admin/bouncie-geofence",  icon: MapPin,      label: "Geofence" },
              { href: "/admin/bouncie-analytics", icon: BarChart3,   label: "Analytics" },
            ].map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}>
                <span className="flex flex-col items-center gap-0.5 text-[10px] text-gray-500 hover:text-white hover:bg-[#1e293b] rounded-lg px-1.5 py-1.5 transition-colors cursor-pointer">
                  <Icon className="w-3.5 h-3.5" />{label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Map area ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 gap-3 flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              {!connLoading && conn && !isConnected && (
                <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border font-medium ${
                  conn.isExpired ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {conn.isExpired ? <Timer className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {conn.isExpired ? "Token expired" : "Not connected"} —
                  <button onClick={handleConnect} className="font-bold underline hover:no-underline ml-1">
                    {conn.isExpired ? "Reconnect" : "Connect now"}
                  </button>
                </div>
              )}
              {(summary?.driving ?? 0) > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
                  <Navigation className="w-3.5 h-3.5" />{summary!.driving} driving now
                </span>
              )}
              {selectedVehicle && (
                <span className="flex items-center gap-2 text-xs bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg">
                  <VehicleAvatar v={selectedVehicle} size={18} />
                  <span className="max-w-[140px] truncate font-medium">{vehicleDisplayName(selectedVehicle)}</span>
                  <button onClick={() => setSelectedId(null)} className="ml-1 text-gray-400 hover:text-gray-700"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/bouncie/fleet-overview"] })}
                disabled={isFetching} className="h-8 text-xs">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />Refresh
              </Button>
              <Button size="sm" onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || !conn?.connected}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                {syncMutation.isPending ? "Syncing…" : "Sync"}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <FleetMap vehicles={allVehicles} selectedId={selectedId} onSelect={handleMapSelect} />
            {selectedVehicle && <VehicleDetailPanel v={selectedVehicle} onClose={() => setSelectedId(null)} />}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
