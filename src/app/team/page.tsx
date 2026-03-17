
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
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] p-4 md:p-6 relative overflow-hidden text-slate-300">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 relative z-10">
        <div>
          <h1 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Painel da Equipe
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Olá, <span className="text-slate-400">{usuario.nome}</span> ({usuario.cargo === 'EQUIPE' ? 'Líder' : usuario.cargo}) | Matrícula: <span className="text-slate-400 font-mono">{usuario.matricula}</span>
          </p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('usuarioLogado');
            router.push('/');
          }}
          className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair
        </button>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
        
        {/* DADOS DA VIATURA */}
        <div className="card-dark p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Dados da Viatura
          </h2>
          
          <div className="space-y-3 bg-white/[0.02] rounded-xl p-3.5 border border-white/[0.04]">
            {/* Status GPS */}
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1.5">Rastreamento GPS</p>
              <div className="flex items-center gap-2 bg-white/[0.03] p-2 rounded-lg border border-white/[0.04] inline-flex">
                <span className={`w-2 h-2 rounded-full ${
                  gpsStatus === 'active' ? 'bg-emerald-400 animate-pulse' :
                  gpsStatus === 'searching' ? 'bg-amber-400 animate-pulse' :
                  gpsStatus === 'error' ? 'bg-red-400' : 'bg-slate-600'
                }`}></span>
                <span className={`text-xs font-semibold ${
                  gpsStatus === 'active' ? 'text-emerald-400' :
                  gpsStatus === 'searching' ? 'text-amber-400' :
                  gpsStatus === 'error' ? 'text-red-400' : 'text-slate-500'
                }`}>
                  {gpsStatus === 'active' ? 'Ativo — Coordenadas OK' :
                   gpsStatus === 'searching' ? 'Buscando sinal GPS...' :
                   gpsStatus === 'error' ? 'Erro de Permissão' : 'Inativo'}
                </span>
              </div>
              {lastCoords && (
                <p className="text-[10px] text-slate-600 mt-1.5 font-mono bg-white/[0.03] px-2 py-0.5 rounded inline-block">
                  {lastCoords.lat.toFixed(6)}, {lastCoords.lng.toFixed(6)}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-white/[0.04]">
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Equipe</p>
              <p className="text-slate-200 font-semibold text-sm mt-0.5">{usuario.equipeId === 'eqp-1' ? 'Equipe A' : usuario.equipeId === 'eqp-2' ? 'Equipe B' : usuario.equipeId === 'eqp-3' ? 'Equipe C' : usuario.equipeId}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Veículo</p>
              <p className="text-slate-200 font-semibold text-sm mt-0.5">{usuario.vehicle || 'Não atribuído'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Status</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                Disponível
              </span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Contato</p>
              <p className="text-slate-300 font-medium text-sm mt-0.5">(11) 99999-0001</p>
            </div>
          </div>
        </div>

        {/* OCORRÊNCIA ATUAL */}
        <div className="lg:col-span-2 card-dark p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Ocorrência Atual</h2>

          {isLoading ? (
            <p className="text-slate-500 text-sm">Carregando ocorrência...</p>
          ) : incident ? (
            <>
              <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-xl mb-4">
                <h3 className="text-base font-semibold text-slate-200 mb-0.5">{incident.title}</h3>
                <p className="text-slate-400 text-sm mb-3">{incident.address}</p>

                <div className="flex gap-2">
                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">
                    PRIORIDADE {incident.priority}
                  </span>
                  <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">
                    STATUS: {incident.status}
                  </span>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="space-y-2 mt-3">
                {incident.status === 'PENDENTE' && (
                  <button
                    onClick={() => handleStatusChange('EM_TRANSITO')}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3.5 rounded-xl transition-all text-sm hover:shadow-lg hover:shadow-sky-500/20"
                  >
                    <span className="flex items-center justify-center gap-2">
                       INICIAR DESLOCAMENTO →
                    </span>
                  </button>
                )}

                {incident.status === 'EM_TRANSITO' && (
                  <button
                    onClick={() => handleStatusChange('NO_LOCAL')}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-white font-semibold py-3.5 rounded-xl transition-all text-sm hover:shadow-lg hover:shadow-amber-500/20"
                  >
                    <span className="flex items-center justify-center gap-2">
                      CONFIRMAR CHEGADA NO LOCAL →
                    </span>
                  </button>
                )}

                {incident.status === 'NO_LOCAL' && (
                  <>
                    <p className="text-amber-400/80 text-xs text-center font-medium my-2 flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Faça a APR antes de iniciar.
                    </p>
                    <button
                      onClick={() => handleStatusChange('EM_EXECUCAO')}
                      className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3.5 rounded-xl transition-all text-sm hover:shadow-lg hover:shadow-orange-500/20"
                    >
                      <span className="flex items-center justify-center gap-2">
                        INICIAR REPARO (APR OK) →
                      </span>
                    </button>
                  </>
                )}

                {incident.status === 'EM_EXECUCAO' && (
                  <button
                    onClick={() => handleStatusChange('CONCLUIDO')}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-xl transition-all text-sm hover:shadow-lg hover:shadow-emerald-500/20"
                  >
                    <span className="flex items-center justify-center gap-2">
                      FINALIZAR OCORRÊNCIA →
                    </span>
                  </button>
                )}

                {incident.status === 'CONCLUIDO' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                    <p className="text-emerald-400 font-semibold text-sm">
                      Ocorrência Baixada com Sucesso
                    </p>
                    <p className="text-emerald-400/60 text-xs mt-1">
                      Aguarde nova atribuição da central.
                    </p>
                  </div>
                )}

                {/* Botão para ver mapa */}
                <button
                  onClick={() => setShowMap(!showMap)}
                  className="w-full mt-3 py-3 rounded-xl font-medium transition-all text-sm bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.06] flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {showMap ? 'Ocultar Mapa' : 'Ver Localização no Mapa'}
                </button>
              </div>

              {/* Mapa de localização */}
              {showMap && (
                <div className="mt-4 rounded-xl overflow-hidden border border-white/[0.06]">
                  <TeamLiveMap 
                    teamName={usuario?.equipeId} 
                    destinationCoords={incidentCoords}
                  />
                </div>
              )}

              {/* CRONOGRAMA */}
              <div className="mt-6 card-dark p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cronograma da Ocorrência
                  </h3>
                  {incident.status === 'CONCLUIDO' && (
                    <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded">
                      CONCLUÍDO
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {/* SAÍDA */}
                  <div className={`rounded-lg p-3 text-center transition-all ${
                    incident.status === 'EM_TRANSITO' || incident.status === 'NO_LOCAL' || incident.status === 'EM_EXECUCAO' || incident.status === 'CONCLUIDO'
                      ? 'bg-sky-500/8 border border-sky-500/15' 
                      : 'bg-white/[0.02] border border-white/[0.04] opacity-50'
                  }`}>
                    <svg className="w-5 h-5 mx-auto mb-1 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase mb-0.5">Saída</p>
                    <p className={`text-lg font-bold ${
                      incident?.departedAt ? 'text-sky-400' : 'text-slate-600'
                    }`}>
                      {incident?.departedAt
                        ? new Date(incident.departedAt).toLocaleTimeString('pt-BR', {
                            timeZone: 'America/Bahia',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--:--'}
                    </p>
                    {!incident?.departedAt && incident.status === 'PENDENTE' && (
                      <p className="text-slate-600 text-[10px] mt-0.5">Aguardando...</p>
                    )}
                  </div>

                  {/* CHEGADA */}
                  <div className={`rounded-lg p-3 text-center transition-all ${
                    incident.status === 'NO_LOCAL' || incident.status === 'EM_EXECUCAO' || incident.status === 'CONCLUIDO'
                      ? 'bg-amber-500/8 border border-amber-500/15' 
                      : 'bg-white/[0.02] border border-white/[0.04] opacity-50'
                  }`}>
                    <svg className="w-5 h-5 mx-auto mb-1 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase mb-0.5">Chegada</p>
                    <p className={`text-lg font-bold ${
                      incident?.arrivedAt ? 'text-amber-400' : 'text-slate-600'
                    }`}>
                      {incident?.arrivedAt
                        ? new Date(incident.arrivedAt).toLocaleTimeString('pt-BR', {
                            timeZone: 'America/Bahia',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--:--'}
                    </p>
                    {!incident?.arrivedAt && incident.status === 'EM_TRANSITO' && (
                      <p className="text-slate-600 text-[10px] mt-0.5">A caminho...</p>
                    )}
                  </div>

                  {/* INÍCIO */}
                  <div className={`rounded-lg p-3 text-center transition-all ${
                    incident.status === 'EM_EXECUCAO' || incident.status === 'CONCLUIDO'
                      ? 'bg-orange-500/8 border border-orange-500/15' 
                      : 'bg-white/[0.02] border border-white/[0.04] opacity-50'
                  }`}>
                    <svg className="w-5 h-5 mx-auto mb-1 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase mb-0.5">Início</p>
                    <p className={`text-lg font-bold ${
                      incident?.startedAt ? 'text-orange-400' : 'text-slate-600'
                    }`}>
                      {incident?.startedAt
                        ? new Date(incident.startedAt).toLocaleTimeString('pt-BR', {
                            timeZone: 'America/Bahia',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--:--'}
                    </p>
                    {!incident?.startedAt && incident.status === 'NO_LOCAL' && (
                      <p className="text-slate-600 text-[10px] mt-0.5">Aguardando...</p>
                    )}
                  </div>

                  {/* FIM */}
                  <div className={`rounded-lg p-3 text-center transition-all ${
                    incident.status === 'CONCLUIDO'
                      ? 'bg-emerald-500/8 border border-emerald-500/15' 
                      : 'bg-white/[0.02] border border-white/[0.04] opacity-50'
                  }`}>
                    <svg className="w-5 h-5 mx-auto mb-1 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase mb-0.5">Fim</p>
                    <p className={`text-lg font-bold ${
                      incident?.finishedAt ? 'text-emerald-400' : 'text-slate-600'
                    }`}>
                      {incident?.finishedAt
                        ? new Date(incident.finishedAt).toLocaleTimeString('pt-BR', {
                            timeZone: 'America/Bahia',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--:--'}
                    </p>
                    {!incident?.finishedAt && incident.status === 'EM_EXECUCAO' && (
                      <p className="text-slate-600 text-[10px] mt-0.5">Em execução...</p>
                    )}
                  </div>
                </div>

                {/* BARRA DE PROGRESSO */}
                {incident && incident.status !== 'CONCLUIDO' && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-medium">
                      <span>Progresso</span>
                      <span>
                        {incident.status === 'PENDENTE' ? '0%' :
                         incident.status === 'EM_TRANSITO' ? '25%' :
                         incident.status === 'NO_LOCAL' ? '50%' :
                         incident.status === 'EM_EXECUCAO' ? '75%' : '0%'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          incident.status === 'PENDENTE' ? 'bg-slate-600 w-0' :
                          incident.status === 'EM_TRANSITO' ? 'bg-sky-500 w-1/4' :
                          incident.status === 'NO_LOCAL' ? 'bg-amber-500 w-2/4' :
                          incident.status === 'EM_EXECUCAO' ? 'bg-sky-500 w-3/4' : 'bg-slate-600 w-0'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-slate-600 text-sm p-6 text-center">Nenhuma ocorrência atribuída.</p>
          )}
        </div>
      </div>

      {/* FILA DE OCORRÊNCIAS */}
      {queuedIncidents.length > 0 && (
        <div className="mt-6 relative z-10 card-dark p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-200 mb-3">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Fila de Ocorrências
            <span className="bg-sky-500/15 text-sky-400 text-[10px] px-1.5 py-0.5 rounded font-semibold">{queuedIncidents.length}</span>
          </h2>
          <div className="space-y-2">
            {queuedIncidents.map((queued: any) => (
              <div key={queued.id} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3.5 flex justify-between items-center transition-all hover:bg-white/[0.04]">
                <div>
                  <h3 className="font-semibold text-sm text-slate-200">{queued.title}</h3>
                  <p className="text-xs text-slate-500">{queued.address}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    queued.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-400' :
                    queued.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                    queued.priority === 'NORMAL' ? 'bg-sky-500/10 text-sky-400' :
                    'bg-white/[0.04] text-slate-400'
                  }`}>
                    {queued.priority}
                  </span>
                  <span className="text-[10px] text-slate-600 font-medium">Aguardando</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHAT */}
      <div className="mt-6 relative z-10 card-dark p-5">
        <ChatPanel
          channel={incident ? incident.id : `equipe-${usuario.equipeId}`}
          senderName={usuario.nome}
          title={incident ? `Chat — ${incident.title}` : 'Chat da Equipe'}
        />
      </div>
    </div>
  );
}
