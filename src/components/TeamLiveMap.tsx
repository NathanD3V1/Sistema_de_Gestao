'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { getTeamLocation } from '@/services/locationService';

// Import CSS do Leaflet via link dinâmico para garantir carregamento
let leafletCssLoaded = false;

function loadLeafletCSS() {
  if (typeof window !== 'undefined' && !leafletCssLoaded) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-4nNxqr6m24h5ni7g5b5v5c5e5c5e5c5e5c5e5c5e5c';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    leafletCssLoaded = true;
  }
}

interface RouteInfo {
  distance: number;
  duration: number;
  geometry: [number, number][];
}

function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, map.getZoom());
  }, [position, map]);
  return null;
}

function RoutePolyline({ route }: { route: [number, number][] }) {
  if (!route || route.length === 0) return null;
  
  return (
    <Polyline
      positions={route}
      pathOptions={{
        color: '#22d3ee',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10',
      }}
    />
  );
}

export default function TeamLiveMap({
  teamName,
  destinationCoords,
  initialCenter,
  initialZoom = 15,
}: {
  teamName: string;
  destinationCoords?: [number, number] | null;
  initialCenter?: [number, number];
  initialZoom?: number;
}) {
  const [teamPosition, setTeamPosition] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Carregar CSS do Leaflet ao montar
  useEffect(() => {
    loadLeafletCSS();
  }, []);

  // Centro padrão do mapa - Salvador/BA (onde operam as equipes)
  const defaultCenterCoords: [number, number] = [-12.9714, -38.5014]; // Barra, Salvador
  
  // Se tiver coordenadas de destino, usa elas como centro inicial
  // Caso contrário, usa a posição da equipe ou o centro padrão
  const mapCenter: [number, number] = destinationCoords || teamPosition || initialCenter || defaultCenterCoords;

  // Zoom maior quando temos coordenadas de destino para ver melhor a área
  const currentZoom = destinationCoords ? initialZoom : 12;

  const teamIcon = useMemo(
    () =>
      L.divIcon({
        className: 'team-marker',
        html: `<div class="team-marker-dot"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    []
  );

  // Ícone para o destino (endereço da ocorrência)
  const destinationIcon = useMemo(
    () =>
      L.divIcon({
        className: 'destination-marker',
        html: `<div class="destination-marker-dot"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    []
  );

  // Calcular rota usando OSRM
  const calculateRoute = useCallback(async (
    start: [number, number], 
    end: [number, number]
  ): Promise<RouteInfo | null> => {
    try {
      setIsLoadingRoute(true);
      setRouteError(null);
      
      // Formato: lon,lat;lon,lat
      const coordinates = `${start[1]},${start[0]};${end[1]},${end[0]}`;
      const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error(data.message || 'Não foi possível calcular a rota');
      }
      
      const routeData = data.routes[0];
      
      // Converter coordenadas do GeoJSON para formato Leaflet [lat, lon]
      const geometry: [number, number][] = routeData.geometry.coordinates.map(
        (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
      );
      
      return {
        distance: routeData.distance,
        duration: routeData.duration,
        geometry,
      };
    } catch (error: any) {
      console.error('Erro ao calcular rota:', error);
      setRouteError(error.message || 'Erro ao calcular rota');
      return null;
    } finally {
      setIsLoadingRoute(false);
    }
  }, []);

  // Buscar localização da equipe e calcular rota quando mudar
  useEffect(() => {
    let isMounted = true;

    const fetchLocation = async () => {
      try {
        console.log(`🔍 TeamLiveMap: Buscando localização para ${teamName}`);
        const newCoords = await getTeamLocation(teamName);
        console.log(`📍 TeamLiveMap: Coordenadas recebidas:`, newCoords);
        
        if (isMounted && Array.isArray(newCoords) && newCoords.length === 2) {
          const position: [number, number] = [Number(newCoords[0]), Number(newCoords[1])];
          setTeamPosition(position);
          console.log(`✅ TeamLiveMap: Posição atualizada para:`, position);
        } else {
          console.warn(`⚠️ TeamLiveMap: Coordenadas inválidas:`, newCoords);
        }
      } catch (error) {
        console.error('❌ TeamLiveMap: Erro GPS', error);
      }
    };

    fetchLocation();
    const intervalId = setInterval(fetchLocation, 5000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [teamName]);

  // Calcular rota quando tiver posição da equipe e destino
  useEffect(() => {
    if (teamPosition && destinationCoords) {
      calculateRoute(teamPosition, destinationCoords).then((routeData) => {
        if (routeData) {
          setRoute(routeData);
        }
      });
    }
  }, [teamPosition, destinationCoords, calculateRoute]);

  // Formatar distância
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Formatar duração
  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  // Marca como mountado após um pequeno delay para permitir renderização do mapa
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-72 bg-slate-800 rounded-lg border border-slate-700 animate-pulse flex items-center justify-center">
        <div className="text-slate-400">Carregando mapa...</div>
      </div>
    );
  }

  // Verificar se há erro no mapa
  if (mapError) {
    return (
      <div className="w-full h-72 bg-slate-800 rounded-lg border border-red-700 flex items-center justify-center">
        <div className="text-red-400 text-center p-4">
          <p className="font-bold">Erro ao carregar mapa</p>
          <p className="text-sm">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-72 rounded-lg overflow-hidden border border-slate-700 relative z-0">
      <MapContainer
        center={mapCenter}
        zoom={currentZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <RecenterMap position={mapCenter} />

        <TileLayer
          attribution={'© CARTO | © OpenStreetMap contributors'}
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Polyline da rota */}
        {route && route.geometry.length > 0 && (
          <RoutePolyline route={route.geometry} />
        )}

        {/* Marker do destino (endereço da ocorrência) */}
        {destinationCoords && (
          <Marker position={destinationCoords} icon={destinationIcon}>
            <Popup>
              <div className="text-sm">
                <strong>📍 Endereço da Ocorrência</strong>
                <br />
                Lat: {destinationCoords[0].toFixed(6)} | Lng: {destinationCoords[1].toFixed(6)}
                {route && (
                  <>
                    <br />
                    <span className="text-cyan-400">
                      📏 {formatDistance(route.distance)} • ⏱️ {formatDuration(route.duration)}
                    </span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marker da equipe */}
        {teamPosition && (
          <Marker position={teamPosition} icon={teamIcon}>
            <Popup>
              <div className="text-sm">
                <strong>🚐 Equipe: {teamName}</strong>
                <br />
                Lat: {teamPosition[0].toFixed(6)} | Lng: {teamPosition[1].toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Info da rota */}
      {route && destinationCoords && (
        <div className="absolute bottom-2 left-2 right-2 z-[1000]">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-cyan-400">
                <span>📏</span>
                <span className="text-sm font-medium">{formatDistance(route.distance)}</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                <span>⏱️</span>
                <span className="text-sm font-medium">{formatDuration(route.duration)}</span>
              </div>
            </div>
            {isLoadingRoute && (
              <div className="text-slate-400 text-xs">Calculando rota...</div>
            )}
          </div>
        </div>
      )}

      {/* Erro na rota */}
      {routeError && (
        <div className="absolute top-2 left-2 right-2 z-[1000]">
          <div className="bg-red-900/80 backdrop-blur-sm rounded-lg px-3 py-2">
            <span className="text-red-200 text-sm">{routeError}</span>
          </div>
        </div>
      )}

      <style jsx global>{`
        .team-marker-dot {
          width: 16px;
          height: 16px;
          background: #22d3ee;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.35);
          animation: pulse 2s infinite;
        }
        .destination-marker-dot {
          width: 20px;
          height: 20px;
          background: #ef4444;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.35);
        }
        .leaflet-pane {
          z-index: 0;
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.35);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 0 0 5px rgba(34, 211, 238, 0.2);
          }
        }
      `}</style>
    </div>
  );
}

