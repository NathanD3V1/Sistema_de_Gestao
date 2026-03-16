
'use client';

import { useEffect, useState, useRef } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ChatPanel } from '@/components/ChatPanel';

// Import dinâmico do mapa para evitar problemas de SSR
const TeamLiveMap = dynamic(() => import('@/components/TeamLiveMap'), { ssr: false });

const fetcher = (url: string) => fetch(url).then(res => res.json());

type Status = 'PENDENTE' | 'EM_TRANSITO' | 'NO_LOCAL' | 'EM_EXECUCAO' | 'CONCLUIDO';

export default function TeamPanel() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [gpsStatus, setGpsStatus] = useState<'inactive' | 'searching' | 'active' | 'error'>('inactive');
  const [lastCoords, setLastCoords] = useState<{lat: number; lng: number} | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [incidentCoords, setIncidentCoords] = useState<[number, number] | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    const dadosSalvos = localStorage.getItem('usuarioLogado');
    if (!dadosSalvos) {
      router.push('/');
      return;
    }
    const user = JSON.parse(dadosSalvos);
    setUsuario(user);

    if (user.cargo === 'ADMIN') {
      router.push('/admin');
      return;
    }
  }, [router]);

  // 🔹 Agora buscamos as ocorrências da equipe via API/SWR
  const {
    data: incidents,
    isLoading,
    mutate
  } = useSWR(
    usuario ? `/api/incidents?teamId=${usuario.equipeId}` : null,
    fetcher,
    { refreshInterval: 3000 }
  );

  // Consider the current incident the first active one, or the next pending one.
  const activeOrPendingIncidents = incidents?.filter((i: any) => i.status !== 'CONCLUIDO') || [];
  const incident = activeOrPendingIncidents[0] ?? null;
  const queuedIncidents = activeOrPendingIncidents.slice(1);
  const handleStatusChange = async (novoStatus: Status) => {
    if (!incident) return;


    const res = await fetch(`/api/incidents/${incident.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    });

    if (!res.ok) return;

    const atualizado = await res.json();

    mutate(
      (prev: any) =>
        [atualizado, ...(prev || []).filter((i: any) => i.id !== atualizado.id)],
      false
    );
  };

  // ====== GPS TRACKING - Captura localização do navegador/telefone ======
  const sendLocationToServer = async (lat: number, lng: number, accuracy: number) => {
    if (!usuario?.equipeId || sendingRef.current) return;
    
    sendingRef.current = true;
    try {
      const response = await fetch(`/api/teams/${usuario.equipeId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          accuracy: accuracy,
          timestamp: new Date().toISOString()
        }),
      });
      
      if (response.ok) {
        console.log('📍 GPS enviado para servidor:', lat, lng);
      }
    } catch (error) {
      console.error('Erro ao enviar GPS:', error);
    } finally {
      sendingRef.current = false;
    }
  };

  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      console.error('Geolocation não suportado');
      return;
    }

    setGpsStatus('searching');
    console.log('🛰️ Iniciando rastreamento GPS...');

    // Primeiro, tenta obter posição imediata
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('📍 Posição inicial obtida:', latitude, longitude, accuracy);
        setLastCoords({ lat: latitude, lng: longitude });
        setGpsStatus('active');
        sendLocationToServer(latitude, longitude, accuracy);
      },
      (error) => {
        console.error('Erro ao obter posição:', error);
        setGpsStatus('error');
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    // Depois, watch position para atualizações contínuas
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLastCoords({ lat: latitude, lng: longitude });
        setGpsStatus('active');
        
        // Enviar para servidor a cada 5 segundos (ou se precisão melhorar muito)
        sendLocationToServer(latitude, longitude, accuracy);
      },
      (error) => {
        console.error('Erro no watch:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus('error');
        }
      },
      { 
        enableHighAccuracy: true, 
        maximumAge: 5000,
        timeout: 15000
      }
    );
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setGpsStatus('inactive');
      console.log('🛑 Rastreamento GPS parado');
    }
  };

  // Iniciar GPS quando a equipe carregar
  useEffect(() => {
    if (usuario?.equipeId) {
      startGpsTracking();
    }
    
    return () => {
      stopGpsTracking();
    };
  }, [usuario?.equipeId]);

  // Função para geocodificar endereço usando Nominatim
  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    if (!address || address.length < 3) return null;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&countrycodes=br&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'IncidentManagementSystem/1.0',
          },
        }
      );
      
      if (!response.ok) {
        console.error('Erro na resposta da geocodificação:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const coords: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
        
        if (!isNaN(coords[0]) && !isNaN(coords[1]) && coords[0] !== 0 && coords[1] !== 0) {
          console.log('Coordenadas encontradas:', coords);
          return coords;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro na geocodificação:', error);
      return null;
    }
  };

  // Atualiza coordenadas quando a ocorrência mudar
  useEffect(() => {
    if (incident?.address) {
      geocodeAddress(incident.address).then((coords) => {
        setIncidentCoords(coords);
      });
    } else {
      setIncidentCoords(null);
    }
  }, [incident?.address]);

  if (!usuario) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 relative overflow-hidden text-slate-800">
      {/* Background blobs removidos para um visual mais profissional */}

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 relative z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel da Equipe</h1>
          <p className="text-slate-500 font-medium">
            Olá, <span className="text-slate-700">{usuario.nome}</span> | Matrícula: <span className="text-slate-700">{usuario.matricula}</span>
          </p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('usuarioLogado');
            router.push('/');
          }}
          className="text-red-400 text-sm hover:underline"
        >
          Sair
        </button>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        <div className="corporate-card p-6">
          <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">🚜 Dados da Viatura</h2>
          
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
            {/* Status GPS */}
            <div>
              <p className="text-slate-500 text-sm font-medium">Rastreamento GPS</p>
              <div className="flex items-center gap-2 mt-1 bg-white p-2 rounded-lg border border-slate-200 inline-flex">
                <span className={`w-3 h-3 rounded-full shadow-sm ${
                  gpsStatus === 'active' ? 'bg-green-500 animate-pulse' :
                  gpsStatus === 'searching' ? 'bg-amber-500 animate-pulse' :
                  gpsStatus === 'error' ? 'bg-red-500' : 'bg-slate-400'
                }`}></span>
                <span className={`text-sm font-bold tracking-wide ${
                  gpsStatus === 'active' ? 'text-green-700' :
                  gpsStatus === 'searching' ? 'text-amber-700' :
                  gpsStatus === 'error' ? 'text-red-700' : 'text-slate-600'
                }`}>
                  {gpsStatus === 'active' ? 'Ativo - Coordenadas OK' :
                   gpsStatus === 'searching' ? 'Buscando sinal GPS...' :
                   gpsStatus === 'error' ? 'Erro de Permissão' : 'Inativo'}
                </span>
              </div>
              {lastCoords && (
                <p className="text-xs text-slate-500 mt-2 font-mono bg-slate-100 px-2 py-1 rounded inline-block">
                  {lastCoords.lat.toFixed(6)}, {lastCoords.lng.toFixed(6)}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200">
              <p className="text-slate-500 text-sm font-medium">Equipe</p>
              <p className="text-slate-800 font-bold text-lg">{usuario.equipeId === 'eqp-1' ? 'Equipe A' : usuario.equipeId === 'eqp-2' ? 'Equipe B' : usuario.equipeId === 'eqp-3' ? 'Equipe C' : usuario.equipeId}</p>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Veículo</p>
              <p className="text-slate-800 font-bold">{usuario.equipeId === 'eqp-1' ? 'Fiat Strada - OEX-9090' : usuario.equipeId === 'eqp-2' ? 'Ford Ranger - ABC-1234' : usuario.equipeId === 'eqp-3' ? 'Chevrolet S10 - XYZ-5678' : 'Não atribuído'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Status</p>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                Disponível
              </span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Contato</p>
              <p className="text-white font-semibold">(11) 99999-0001</p>
            </div>
          </div>
        </div>

        {/* OCORRÊNCIA ATUAL */}
        <div className="lg:col-span-2 corporate-card p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Ocorrência Atual</h2>

          {isLoading ? (
            <p className="text-slate-500">Carregando ocorrência...</p>
          ) : incident ? (
            <>
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl mb-6 shadow-sm">
                <h3 className="text-xl font-bold text-slate-800 mb-1">{incident.title}</h3>
                <p className="text-slate-600 mb-3">{incident.address}</p>

                <div className="mt-2 flex gap-2">
                  <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded text-xs font-bold">
                    PRIORIDADE {incident.priority}
                  </span>
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded text-xs font-bold">
                    STATUS: {incident.status}
                  </span>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="space-y-3 mt-4">
                {incident.status === 'PENDENTE' && (
                  <button
                    onClick={() => handleStatusChange('EM_TRANSITO')}
                    className="w-full relative bg-blue-600 text-white font-bold py-4 rounded-xl transition-all duration-300 hover:bg-blue-700 shadow-sm hover:shadow"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                       INICIAR DESLOCAMENTO <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </button>
                )}

                {incident.status === 'EM_TRANSITO' && (
                  <button
                    onClick={() => handleStatusChange('NO_LOCAL')}
                    className="w-full relative bg-amber-500 text-white font-bold py-4 rounded-xl transition-all duration-300 hover:bg-amber-600 shadow-sm hover:shadow"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      CONFIRMAR CHEGADA NO LOCAL <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </button>
                )}

                {incident.status === 'NO_LOCAL' && (
                  <>
                    <p className="text-amber-600 text-sm text-center font-medium my-2">
                      ⚠️ Faça a APR antes de iniciar.
                    </p>
                    <button
                      onClick={() => handleStatusChange('EM_EXECUCAO')}
                      className="w-full relative bg-orange-600 text-white font-bold py-4 rounded-xl transition-all duration-300 hover:bg-orange-700 shadow-sm hover:shadow"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        INICIAR REPARO (APR OK) <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </span>
                    </button>
                  </>
                )}

                {incident.status === 'EM_EXECUCAO' && (
                  <button
                    onClick={() => handleStatusChange('CONCLUIDO')}
                    className="w-full relative bg-emerald-600 text-white font-bold py-4 rounded-xl transition-all duration-300 hover:bg-emerald-700 shadow-sm hover:shadow"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      FINALIZAR OCORRÊNCIA <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </button>
                )}

                {incident.status === 'CONCLUIDO' && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
                    <p className="text-emerald-700 font-bold text-lg">
                      Ocorrência Baixada com Sucesso
                    </p>
                    <p className="text-emerald-600 text-sm">
                      Aguarde nova atribuição da central.
                    </p>
                  </div>
                )}

                {/* Botão para ver mapa */}
                <button
                  onClick={() => setShowMap(!showMap)}
                  className={`w-full mt-4 py-4 rounded-xl font-semibold transition-all duration-300 ${
                    showMap 
                      ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600' 
                      : 'glass-card hover-lift text-white border border-white/10'
                  }`}
                >
                  {showMap ? '🗺️ Ocultar Mapa' : '📍 Ver Localização no Mapa'}
                </button>
              </div>

              {/* Mapa de localização */}
              {showMap && (
                <div className="mt-6 rounded-2xl overflow-hidden border border-slate-700 shadow-xl">
                  <TeamLiveMap 
                    teamName={usuario?.equipeId} 
                    destinationCoords={incidentCoords}
                  />
                </div>
              )}

              {/* CARD DE HORÁRIOS - DESTAQUE */}
              <div className={`mt-8 rounded-2xl p-5 border transition-colors duration-500 shadow-sm ${
                incident.status === 'CONCLUIDO' ? 'bg-emerald-50 border-emerald-200' :
                incident.status === 'EM_EXECUCAO' ? 'bg-orange-50 border-orange-200' :
                incident.status === 'NO_LOCAL' ? 'bg-amber-50 border-amber-200' :
                incident.status === 'EM_TRANSITO' ? 'bg-blue-50 border-blue-200' :
                'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-2xl">⏱️</span> Cronograma da Ocorrência
                  </h3>
                  {incident.status === 'CONCLUIDO' && (
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                      ✅ CONCLUÍDO
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* SAÍDA */}
                  <div className={`rounded-xl p-4 text-center transition-all ${
                    incident.status === 'EM_TRANSITO' || incident.status === 'NO_LOCAL' || incident.status === 'EM_EXECUCAO' || incident.status === 'CONCLUIDO'
                      ? 'bg-white border border-blue-200 shadow-sm' 
                      : 'bg-white/50 border border-slate-200 opacity-60'
                  }`}>
                    <div className="text-2xl mb-1">🚀</div>
                    <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Saída</p>
                    <p className={`text-xl font-bold ${
                      incident?.departedAt ? 'text-blue-700' : 'text-slate-400'
                    }`}>
                      {incident?.departedAt
                        ? new Date(incident.departedAt).toLocaleTimeString('pt-BR', {
                            timeZone: 'America/Bahia',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--:--'}
                    </p>
                    {incident?.departedAt && (
                      <p className="text-blue-600 text-xs mt-1 font-medium">✓ Registrado</p>
                    )}
                    {!incident?.departedAt && incident.status === 'PENDENTE' && (
                      <p className="text-slate-500 text-xs mt-1">Aguardando...</p>
                    )}
                  </div>

                  {/* CHEGADA */}
                  <div className={`rounded-xl p-4 text-center transition-all ${
                    incident.status === 'NO_LOCAL' || incident.status === 'EM_EXECUCAO' || incident.status === 'CONCLUIDO'
                      ? 'bg-white border border-amber-200 shadow-sm' 
                      : 'bg-white/50 border border-slate-200 opacity-60'
                  }`}>
                    <div className="text-2xl mb-1">🎯</div>
                    <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Chegada</p>
                    <p className={`text-xl font-bold ${
                      incident?.arrivedAt ? 'text-amber-700' : 'text-slate-400'
                    }`}>
                      {incident?.arrivedAt
                        ? new Date(incident.arrivedAt).toLocaleTimeString('pt-BR', {
                            timeZone: 'America/Bahia',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--:--'}
                    </p>
                    {incident?.arrivedAt && (
                      <p className="text-amber-600 text-xs mt-1 font-medium">✓ Registrado</p>
                    )}
                    {!incident?.arrivedAt && incident.status === 'EM_TRANSITO' && (
                      <p className="text-slate-500 text-xs mt-1">A caminho...</p>
                    )}
                  </div>

                  {/* INÍCIO */}
                  <div className={`rounded-xl p-4 text-center transition-all ${
                    incident.status === 'EM_EXECUCAO' || incident.status === 'CONCLUIDO'
                      ? 'bg-white border border-orange-200 shadow-sm' 
                      : 'bg-white/50 border border-slate-200 opacity-60'
                  }`}>
                    <div className="text-2xl mb-1">🔧</div>
                    <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Início</p>
                    <p className={`text-xl font-bold ${
                      incident?.startedAt ? 'text-orange-700' : 'text-slate-400'
                    }`}>
                      {incident?.startedAt
                        ? new Date(incident.startedAt).toLocaleTimeString('pt-BR', {
                            timeZone: 'America/Bahia',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--:--'}
                    </p>
                    {incident?.startedAt && (
                      <p className="text-orange-600 text-xs mt-1 font-medium">✓ Registrado</p>
                    )}
                    {!incident?.startedAt && incident.status === 'NO_LOCAL' && (
                      <p className="text-slate-500 text-xs mt-1">Aguardando...</p>
                    )}
                  </div>

                  {/* FIM */}
                  <div className={`rounded-xl p-4 text-center transition-all ${
                    incident.status === 'CONCLUIDO'
                      ? 'bg-white border-2 border-emerald-400 shadow-sm' 
                      : 'bg-white/50 border border-slate-200 opacity-60'
                  }`}>
                    <div className="text-2xl mb-1">✅</div>
                    <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Fim</p>
                    <p className={`text-xl font-bold ${
                      incident?.finishedAt ? 'text-emerald-700' : 'text-slate-400'
                    }`}>
                      {incident?.finishedAt
                        ? new Date(incident.finishedAt).toLocaleTimeString('pt-BR', {
                            timeZone: 'America/Bahia',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--:--'}
                    </p>
                    {incident?.finishedAt && (
                      <p className="text-emerald-600 text-xs mt-1 font-medium">✓ Concluído</p>
                    )}
                    {!incident?.finishedAt && incident.status === 'EM_EXECUCAO' && (
                      <p className="text-slate-500 text-xs mt-1">Em execução...</p>
                    )}
                  </div>
                </div>

                {/* BARRA DE PROGRESSO VISUAL */}
                {incident && incident.status !== 'CONCLUIDO' && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium">
                      <span>Progresso</span>
                      <span>
                        {incident.status === 'PENDENTE' ? '0%' :
                         incident.status === 'EM_TRANSITO' ? '25%' :
                         incident.status === 'NO_LOCAL' ? '50%' :
                         incident.status === 'EM_EXECUCAO' ? '75%' : '0%'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          incident.status === 'PENDENTE' ? 'bg-slate-400 w-0' :
                          incident.status === 'EM_TRANSITO' ? 'bg-blue-500 w-1/4' :
                          incident.status === 'NO_LOCAL' ? 'bg-orange-500 w-2/4' :
                          incident.status === 'EM_EXECUCAO' ? 'bg-blue-600 w-3/4' : 'bg-slate-400 w-0'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-slate-500 p-6 text-center">Nenhuma ocorrência atribuída.</p>
          )}
        </div>
      </div>

      {/* FILA DE OCORRÊNCIAS */}
      {queuedIncidents.length > 0 && (
        <div className="mt-8 relative z-10 corporate-card p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 mb-4">
            📋 Fila de Ocorrências
            <span className="bg-blue-50 text-blue-600 border border-blue-200 text-xs px-2 py-1 rounded-full">{queuedIncidents.length}</span>
          </h2>
          <div className="space-y-3">
            {queuedIncidents.map((queued: any) => (
              <div key={queued.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center transition-colors hover:bg-slate-100 cursor-default">
                <div>
                  <h3 className="font-bold text-slate-800">{queued.title}</h3>
                  <p className="text-sm text-slate-600">{queued.address}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    queued.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 border border-red-200' :
                    queued.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                    queued.priority === 'NORMAL' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                    'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {queued.priority}
                  </span>
                  <span className="text-xs text-slate-500 font-medium tracking-wide">Aguardando</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHAT */}
      <div className="mt-8 relative z-10 corporate-card-dark p-6">
        <ChatPanel
          channel={incident ? incident.id : `equipe-${usuario.equipeId}`}
          senderName={usuario.nome}
          title={incident ? `Chat — ${incident.title}` : 'Chat da Equipe'}
        />
      </div>
    </div>
  );
}
