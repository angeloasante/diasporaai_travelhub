"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Airport coordinates database
const airportCoordinates: Record<string, [number, number]> = {
  // Africa
  ACC: [5.6052, -0.1668],     // Accra, Ghana
  LOS: [6.5774, 3.3212],      // Lagos, Nigeria
  ABJ: [5.2614, -3.9262],     // Abidjan, Ivory Coast
  NBO: [-1.3192, 36.9278],    // Nairobi, Kenya
  JNB: [-26.1392, 28.2460],   // Johannesburg, South Africa
  CPT: [-33.9649, 18.6017],   // Cape Town, South Africa
  CAI: [30.1219, 31.4056],    // Cairo, Egypt
  ADD: [8.9779, 38.7993],     // Addis Ababa, Ethiopia
  DSS: [14.7397, -17.4902],   // Dakar, Senegal
  CMN: [33.3675, -7.5898],    // Casablanca, Morocco
  
  // Europe
  LHR: [51.4700, -0.4543],    // London Heathrow
  LGW: [51.1537, -0.1821],    // London Gatwick
  STN: [51.8860, 0.2389],     // London Stansted
  CDG: [49.0097, 2.5479],     // Paris CDG
  ORY: [48.7262, 2.3652],     // Paris Orly
  AMS: [52.3105, 4.7683],     // Amsterdam
  FRA: [50.0379, 8.5622],     // Frankfurt
  MUC: [48.3538, 11.7861],    // Munich
  FCO: [41.8003, 12.2389],    // Rome
  MAD: [40.4983, -3.5676],    // Madrid
  BCN: [41.2971, 2.0785],     // Barcelona
  LIS: [38.7742, -9.1342],    // Lisbon
  ZRH: [47.4647, 8.5492],     // Zurich
  VIE: [48.1103, 16.5697],    // Vienna
  BRU: [50.9014, 4.4844],     // Brussels
  DUB: [53.4264, -6.2499],    // Dublin
  CPH: [55.6180, 12.6508],    // Copenhagen
  OSL: [60.1939, 11.1004],    // Oslo
  ARN: [59.6519, 17.9186],    // Stockholm
  HEL: [60.3172, 24.9633],    // Helsinki
  ATH: [37.9364, 23.9445],    // Athens
  IST: [41.2753, 28.7519],    // Istanbul
  BEG: [44.8184, 20.3091],    // Belgrade
  DUS: [51.2895, 6.7668],     // Dusseldorf
  
  // North America
  JFK: [40.6413, -73.7781],   // New York JFK
  EWR: [40.6895, -74.1745],   // Newark
  LGA: [40.7769, -73.8740],   // LaGuardia
  LAX: [33.9416, -118.4085],  // Los Angeles
  ORD: [41.9742, -87.9073],   // Chicago O'Hare
  ATL: [33.6407, -84.4277],   // Atlanta
  DFW: [32.8998, -97.0403],   // Dallas
  SFO: [37.6213, -122.3790],  // San Francisco
  MIA: [25.7959, -80.2870],   // Miami
  BOS: [42.3656, -71.0096],   // Boston
  SEA: [47.4502, -122.3088],  // Seattle
  DEN: [39.8561, -104.6737],  // Denver
  IAD: [38.9531, -77.4565],   // Washington Dulles
  YYZ: [43.6777, -79.6248],   // Toronto
  YVR: [49.1967, -123.1815],  // Vancouver
  YUL: [45.4706, -73.7408],   // Montreal
  
  // Asia
  DXB: [25.2532, 55.3657],    // Dubai
  DOH: [25.2731, 51.6081],    // Doha
  AUH: [24.4330, 54.6511],    // Abu Dhabi
  SIN: [1.3644, 103.9915],    // Singapore
  HKG: [22.3080, 113.9185],   // Hong Kong
  BKK: [13.6900, 100.7501],   // Bangkok
  KUL: [2.7456, 101.7099],    // Kuala Lumpur
  NRT: [35.7720, 140.3929],   // Tokyo Narita
  HND: [35.5494, 139.7798],   // Tokyo Haneda
  ICN: [37.4602, 126.4407],   // Seoul Incheon
  PEK: [40.0799, 116.6031],   // Beijing
  PVG: [31.1443, 121.8083],   // Shanghai
  DEL: [28.5562, 77.1000],    // Delhi
  BOM: [19.0896, 72.8656],    // Mumbai
  
  // Oceania
  SYD: [-33.9399, 151.1753],  // Sydney
  MEL: [-37.6690, 144.8410],  // Melbourne
  AKL: [-37.0082, 174.7850],  // Auckland
  
  // South America
  GRU: [-23.4356, -46.4731],  // São Paulo
  EZE: [-34.8222, -58.5358],  // Buenos Aires
  BOG: [4.7016, -74.1469],    // Bogota
  SCL: [-33.3930, -70.7858],  // Santiago
  LIM: [-12.0219, -77.1143],  // Lima
};

function getAirportCoords(code: string): [number, number] | null {
  return airportCoordinates[code.toUpperCase()] || null;
}

// Calculate center point between two coordinates
function getMidpoint(coord1: [number, number], coord2: [number, number]): [number, number] {
  return [(coord1[0] + coord2[0]) / 2, (coord1[1] + coord2[1]) / 2];
}

// Calculate appropriate zoom level based on distance
function getZoomLevel(coord1: [number, number], coord2: [number, number]): number {
  const latDiff = Math.abs(coord1[0] - coord2[0]);
  const lngDiff = Math.abs(coord1[1] - coord2[1]);
  const maxDiff = Math.max(latDiff, lngDiff);
  
  if (maxDiff > 100) return 2;
  if (maxDiff > 50) return 3;
  if (maxDiff > 25) return 4;
  if (maxDiff > 10) return 5;
  if (maxDiff > 5) return 6;
  return 7;
}

interface FlightMapProps {
  originCode: string;
  destinationCode: string;
  originCity?: string;
  destinationCity?: string;
}

// Dynamic import for Leaflet components (required for SSR)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

export function FlightMap({ originCode, destinationCode, originCity, destinationCity }: FlightMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Import Leaflet dynamically on client side
    import("leaflet").then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  const originCoords = getAirportCoords(originCode);
  const destCoords = getAirportCoords(destinationCode);

  if (!isClient || !L) {
    return (
      <div className="w-full h-full bg-zinc-800/50 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading map...</div>
      </div>
    );
  }

  if (!originCoords || !destCoords) {
    return (
      <div className="w-full h-full bg-zinc-800/50 flex items-center justify-center flex-col gap-2 p-4">
        <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className="text-zinc-500 text-sm text-center">
          Map unavailable for<br />
          {originCode} → {destinationCode}
        </p>
      </div>
    );
  }

  const center = getMidpoint(originCoords, destCoords);
  const zoom = getZoomLevel(originCoords, destCoords);

  // Create curved path points for the flight route
  const createCurvedPath = (start: [number, number], end: [number, number]): [number, number][] => {
    const points: [number, number][] = [];
    const midLat = (start[0] + end[0]) / 2;
    const midLng = (start[1] + end[1]) / 2;
    
    // Calculate curve offset (higher for longer distances)
    const distance = Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2);
    const curveOffset = Math.min(distance * 0.2, 15);
    
    // Determine curve direction based on longitude difference
    const curveLat = midLat + curveOffset;
    
    // Generate points along a quadratic bezier curve
    for (let t = 0; t <= 1; t += 0.05) {
      const lat = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * curveLat + t * t * end[0];
      const lng = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * midLng + t * t * end[1];
      points.push([lat, lng]);
    }
    points.push(end);
    
    return points;
  };

  const flightPath = createCurvedPath(originCoords, destCoords);

  // Custom icons with city labels
  const originIcon = L.divIcon({
    className: "custom-marker origin-marker",
    html: `
      <div style="position: relative;">
        <div class="marker-pulse"></div>
        <div style="width: 16px; height: 16px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);"></div>
        <div style="position: absolute; top: -32px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: rgba(15, 15, 17, 0.95); padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.3); box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
          <span style="color: #3b82f6; font-weight: 700; font-size: 14px;">${originCode}</span>
          <span style="color: #d4d4d8; font-size: 12px; margin-left: 6px;">${originCity || ''}</span>
        </div>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  const destIcon = L.divIcon({
    className: "custom-marker dest-marker",
    html: `
      <div style="position: relative;">
        <div style="width: 14px; height: 14px; background: linear-gradient(135deg, #60a5fa, #3b82f6); border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(96, 165, 250, 0.5);"></div>
        <div style="position: absolute; bottom: -32px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: rgba(15, 15, 17, 0.95); padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(96, 165, 250, 0.3); box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
          <span style="color: #60a5fa; font-weight: 700; font-size: 14px;">${destinationCode}</span>
          <span style="color: #d4d4d8; font-size: 12px; margin-left: 6px;">${destinationCity || ''}</span>
        </div>
      </div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

  return (
    <>
      {/* Leaflet CSS */}
      <style jsx global>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        
        .leaflet-container {
          background: #1f1f23 !important;
          font-family: inherit;
        }
        
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
        }
        
        .leaflet-control-zoom a {
          background: rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(8px);
          color: white !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
          font-size: 18px !important;
        }
        
        .leaflet-control-zoom a:hover {
          background: rgba(255, 255, 255, 0.2) !important;
        }
        
        .leaflet-control-zoom-in {
          border-radius: 8px 8px 0 0 !important;
        }
        
        .leaflet-control-zoom-out {
          border-radius: 0 0 8px 8px !important;
        }
        
        .leaflet-popup-content-wrapper {
          background: rgba(15, 15, 17, 0.95) !important;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
        }
        
        .leaflet-popup-content {
          color: white !important;
          margin: 12px 16px !important;
          font-size: 14px !important;
        }
        
        .leaflet-popup-tip {
          background: rgba(15, 15, 17, 0.95) !important;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .leaflet-control-attribution {
          background: rgba(0, 0, 0, 0.5) !important;
          color: rgba(255, 255, 255, 0.5) !important;
          font-size: 10px !important;
          padding: 2px 6px !important;
        }
        
        .leaflet-control-attribution a {
          color: rgba(255, 255, 255, 0.6) !important;
        }
        
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .marker-label {
          position: absolute;
          white-space: nowrap;
          font-size: 12px;
          pointer-events: none;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.6);
          transform: translateY(8px);
        }
        
        .marker-label .code {
          font-weight: 700;
          font-size: 14px;
        }
        
        .marker-label .city {
          opacity: 0.8;
          margin-left: 4px;
        }
        
        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        
        .marker-pulse {
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.3);
          animation: pulse-ring 2s ease-out infinite;
          top: -4px;
          left: -4px;
        }
      `}</style>
      
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
        scrollWheelZoom={true}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Flight path */}
        <Polyline
          positions={flightPath}
          pathOptions={{
            color: "#3b82f6",
            weight: 2,
            opacity: 0.7,
            dashArray: "8, 8",
          }}
        />
        
        {/* Origin marker */}
        <Marker position={originCoords} icon={originIcon}>
          <Popup>
            <div className="text-center">
              <p className="font-bold text-lg">{originCode}</p>
              <p className="text-zinc-400 text-sm">{originCity || "Origin"}</p>
            </div>
          </Popup>
        </Marker>
        
        {/* Destination marker */}
        <Marker position={destCoords} icon={destIcon}>
          <Popup>
            <div className="text-center">
              <p className="font-bold text-lg">{destinationCode}</p>
              <p className="text-zinc-400 text-sm">{destinationCity || "Destination"}</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </>
  );
}
