import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { formatMonthDayYearTime } from "@/lib/date-format";

/**
 * Trip-history pieces shared by the admin fleet view (`admin/bouncie-trips`)
 * and the client's own-vehicle view (`client/vehicle-trips`).
 *
 * Only the genuinely identical parts live here. The two pages keep their own
 * shells on purpose: they read different endpoints (`/api/bouncie/*` is the
 * whole fleet, `/api/client/bouncie/*` is scoped to the signed-in client's
 * cars), the admin page has a device filter and a fleet back-link the client
 * must not get, and the empty-state copy differs by audience. Merging the
 * shells would put a role boundary behind a prop, which is exactly where
 * scoping bugs hide.
 */

export interface StoredTrip {
  id: string;
  device_id: string;
  imei: string;
  device_nickname: string | null;
  car_id: string | null;
  make: string | null;
  model: string | null;
  year: string | null;
  plate: string | null;
  trip_id: string | null;
  start_time: string;
  end_time: string | null;
  start_latitude: number | null;
  start_longitude: number | null;
  start_address: string | null;
  end_latitude: number | null;
  end_longitude: number | null;
  end_address: string | null;
  distance_miles: number | null;
  duration_seconds: number | null;
  max_speed_mph: number | null;
  avg_speed_mph: number | null;
  fuel_used_gallons: number | null;
  status: string;
}

export interface TripLocation {
  latitude: number;
  longitude: number;
  speed_mph: number | null;
  heading: number | null;
  timestamp: string;
}

export function formatDuration(secs: number | null): string {
  if (!secs) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDate(dateStr: string | null): string {
  return formatMonthDayYearTime(dateStr);
}

export function vehicleName(trip: StoredTrip): string {
  if (trip.year && trip.make) return `${trip.year} ${trip.make} ${trip.model || ""}`.trim();
  if (trip.device_nickname) return trip.device_nickname;
  return `Device ${trip.imei}`;
}

/**
 * Route playback map for one trip.
 *
 * `basePath` selects which trips endpoint to read locations from, and is the
 * only thing that differs between the admin and client callers. It is also
 * the access-control boundary, so each page passes its own literal rather
 * than deriving one from the current user.
 */
export function TripRouteMap({
  tripId,
  startLat,
  startLng,
  endLat,
  endLng,
  basePath,
}: {
  tripId: string;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  basePath: "/api/bouncie/trips" | "/api/client/bouncie/trips";
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const { data, isLoading } = useQuery<{ success: boolean; data: TripLocation[] }>({
    queryKey: [basePath, tripId, "locations"],
    queryFn: async () => {
      return api.get(`${basePath}/${tripId}/locations`, {
        fallbackMessage: "Failed to fetch route",
      });
    },
  });

  const locations = data?.data ?? [];

  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      if (!mapInstanceRef.current) {
        const centerLat = startLat ?? 36.1699;
        const centerLng = startLng ?? -115.1398;
        const map = L.map(mapRef.current!).setView([centerLat, centerLng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clear all non-tile layers before drawing new route
      map.eachLayer((layer: any) => {
        if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
      });

      // Draw route polyline
      if (locations.length >= 2) {
        const coords: [number, number][] = locations.map(p => [p.latitude, p.longitude]);
        const poly = L.polyline(coords, { color: "#3b82f6", weight: 4, opacity: 0.8 }).addTo(map);
        map.fitBounds(poly.getBounds().pad(0.1));

        // Start marker (green)
        L.circleMarker(coords[0], { radius: 8, fillColor: "#22c55e", color: "white", weight: 2, fillOpacity: 1 })
          .addTo(map).bindPopup("Start");

        // End marker (red)
        L.circleMarker(coords[coords.length - 1], { radius: 8, fillColor: "#ef4444", color: "white", weight: 2, fillOpacity: 1 })
          .addTo(map).bindPopup("End");
      } else if (startLat && startLng) {
        // Fallback: just show start/end markers
        const sIcon = L.divIcon({ html: `<div style="width:12px;height:12px;border-radius:50%;background:#22c55e;border:2px solid white"></div>`, className: "", iconSize: [12, 12], iconAnchor: [6, 6] });
        L.marker([startLat, startLng], { icon: sIcon }).addTo(map).bindPopup("Start");
        if (endLat && endLng) {
          const eIcon = L.divIcon({ html: `<div style="width:12px;height:12px;border-radius:50%;background:#ef4444;border:2px solid white"></div>`, className: "", iconSize: [12, 12], iconAnchor: [6, 6] });
          L.marker([endLat, endLng], { icon: eIcon }).addTo(map).bindPopup("End");
          map.fitBounds([[startLat, startLng], [endLat, endLng]], { padding: [40, 40] });
        }
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locations, startLat, startLng, endLat, endLng]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading route…
      </div>
    );
  }

  return <div ref={mapRef} style={{ height: "300px", width: "100%", borderRadius: "8px" }} />;
}
