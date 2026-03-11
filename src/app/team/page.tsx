
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

  const incident = incidents?.[0] ?? null;

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
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Painel da Equipe</h1>
          <p className="text-gray-400">
            Olá, {usuario.nome} | Matrícula: {usuario.matricula}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CARD DA VIATURA */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h2 className="text-xl font-bold text-blue-400 mb-4">Dados da Viatura</h2>
          
          <div className="space-y-3">
            {/* Status GPS */}
            <div>
              <p className="text-gray-400 text-sm">Rastreamento GPS</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-3 h-3 rounded-full ${
                  gpsStatus === 'active' ? 'bg-green-500 animate-pulse' :
                  gpsStatus === 'searching' ? 'bg-yellow-500 animate-pulse' :
                  gpsStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`}></span>
                <span className={`text-sm font-semibold ${
                  gpsStatus === 'active' ? 'text-green-400' :
                  gpsStatus === 'searching' ? 'text-yellow-400' :
                  gpsStatus === 'error' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {gpsStatus === 'active' ? 'Ativo - Coordenadas sendo enviadas' :
                   gpsStatus === 'searching' ? 'Buscando sinal GPS...' :
                   gpsStatus === 'error' ? 'Erro - Verifique permissões' : 'Inativo'}
                </span>
              </div>
              {lastCoords && (
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  {lastCoords.lat.toFixed(6)}, {lastCoords.lng.toFixed(6)}
                </p>
              )}
            </div>

            <div>
              <p className="text-gray-400 text-sm">Equipe</p>
              <p className="text-white font-semibold">{usuario.equipeId === 'eqp-1' ? 'Equipe A' : usuario.equipeId === 'eqp-2' ? 'Equipe B' : usuario.equipeId === 'eqp-3' ? 'Equipe C' : usuario.equipeId}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Veículo</p>
              <p className="text-white font-semibold">{usuario.equipeId === 'eqp-1' ? 'Fiat Strada - OEX-9090' : usuario.equipeId === 'eqp-2' ? 'Ford Ranger - ABC-1234' : usuario.equipeId === 'eqp-3' ? 'Chevrolet S10 - XYZ-5678' : 'Não atribuído'}</p>
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
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-6">Ocorrência Atual</h2>

          {isLoading ? (
            <p className="text-gray-400">Carregando ocorrência...</p>
          ) : incident ? (
            <>
              <div className="bg-gray-700 p-4 rounded mb-6">
                <h3 className="text-lg font-bold text-white">{incident.title}</h3>
                <p className="text-gray-300">{incident.address}</p>

                <div className="mt-2 flex gap-2">
                  <span className="bg-red-900 text-red-200 px-3 py-1 rounded text-xs font-bold">
                    PRIORIDADE {incident.priority}
                  </span>
                  <span className="bg-blue-900 text-blue-200 px-3 py-1 rounded text-xs font-bold">
                    STATUS: {incident.status}
                  </span>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="space-y-3">
                {incident.status === 'PENDENTE' && (
                  <button
                    onClick={() => handleStatusChange('EM_TRANSITO')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg font-bold text-lg"
                  >
                    INICIAR DESLOCAMENTO
                  </button>
                )}

                {incident.status === 'EM_TRANSITO' && (
                  <button
                    onClick={() => handleStatusChange('NO_LOCAL')}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white p-4 rounded-lg font-bold text-lg"
                  >
                    CONFIRMAR CHEGADA NO LOCAL
                  </button>
                )}

                {incident.status === 'NO_LOCAL' && (
                  <>
                    <p className="text-gray-400 text-sm text-center">
                      Faça a APR antes de iniciar.
                    </p>
                    <button
                      onClick={() => handleStatusChange('EM_EXECUCAO')}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-lg font-bold text-lg"
                    >
                      INICIAR REPARO (APR OK)
                    </button>
                  </>
                )}

                {incident.status === 'EM_EXECUCAO' && (
                  <button
                    onClick={() => handleStatusChange('CONCLUIDO')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg font-bold text-lg"
                  >
                    FINALIZAR OCORRÊNCIA
                  </button>
                )}

                {incident.status === 'CONCLUIDO' && (
                  <div className="bg-green-900/30 border border-green-800 p-4 rounded text-center">
                    <p className="text-green-400 font-bold text-lg">
                      Ocorrência Baixada com Sucesso
                    </p>
                    <p className="text-gray-400 text-sm">
                      Aguarde nova atribuição da central.
                    </p>
                  </div>
                )}

                {/* Botão para ver mapa */}
                <button
                  onClick={() => setShowMap(!showMap)}
                  className={`w-full mt-4 py-3 rounded-lg font-semibold transition ${
                    showMap 
                      ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {showMap ? '🗺️ Ocultar Mapa' : '📍 Ver Localização no Mapa'}
                </button>
              </div>

              {/* Mapa de localização */}
              {showMap && (
                <div className="mt-6">
                  <TeamLiveMap 
                    teamName={usuario?.equipeId} 
                    destinationCoords={incidentCoords}
                  />
                </div>
              )}

              {/* CARD DE HORÁRIOS - DESTAQUE */}
              <div className={`mt-6 rounded-xl p-4 border-2 ${
                incident.status === 'CONCLUIDO' ? 'bg-green-900/40 border-green-500' :
                incident.status === 'EM_EXECUCAO' ? 'bg-orange-900/30 border-orange-500' :
                incident.status === 'NO_LOCAL' ? 'bg-yellow-900/30 border-yellow-500' :
                incident.status === 'EM_TRANSITO' ? 'bg-blue-900/30 border-blue-500' :
                'bg-gray-700/50 border-gray-600'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">⏱️</span> Cronograma da Ocorrência
                  </h3>
                  {incident.status === 'CONCLUIDO' && (
                    <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      ✅ CONCLUÍDO
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* SAÍDA */}
                  <div className={`rounded-lg p-3 text-center transition-all ${
                    incident.status === 'EM_TRANSITO' || incident.status === 'NO_LOCAL' || incident.status === 'EM_EXECUCAO' || incident.status === 'CONCLUIDO'
                      ? 'bg-blue-800/50 border border-blue-500' 
                      : 'bg-gray-700/50 border border-gray-600 opacity-60'
                  }`}>
                    <div className="text-2xl mb-1">🚀</div>
                    <p className="text-gray-300 text-xs font-semibold uppercase mb-1">Saída</p>
                    <p className={`text-xl font-bold ${
                      incident?.departedAt ? 'text-blue-300' : 'text-gray-500'
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
                      <p className="text-blue-400 text-xs mt-1">✓ Registrado</p>
                    )}
                    {!incident?.departedAt && incident.status === 'PENDENTE' && (
                      <p className="text-gray-500 text-xs mt-1">Aguardando...</p>
                    )}
                  </div>

                  {/* CHEGADA */}
                  <div className={`rounded-lg p-3 text-center transition-all ${
                    incident.status === 'NO_LOCAL' || incident.status === 'EM_EXECUCAO' || incident.status === 'CONCLUIDO'
                      ? 'bg-yellow-800/50 border border-yellow-500' 
                      : 'bg-gray-700/50 border border-gray-600 opacity-60'
                  }`}>
                    <div className="text-2xl mb-1">🎯</div>
                    <p className="text-gray-300 text-xs font-semibold uppercase mb-1">Chegada</p>
                    <p className={`text-xl font-bold ${
                      incident?.arrivedAt ? 'text-yellow-300' : 'text-gray-500'
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
                      <p className="text-yellow-400 text-xs mt-1">✓ Registrado</p>
                    )}
                    {!incident?.arrivedAt && incident.status === 'EM_TRANSITO' && (
                      <p className="text-gray-500 text-xs mt-1">A caminho...</p>
                    )}
                  </div>

                  {/* INÍCIO */}
                  <div className={`rounded-lg p-3 text-center transition-all ${
                    incident.status === 'EM_EXECUCAO' || incident.status === 'CONCLUIDO'
                      ? 'bg-orange-800/50 border border-orange-500' 
                      : 'bg-gray-700/50 border border-gray-600 opacity-60'
                  }`}>
                    <div className="text-2xl mb-1">🔧</div>
                    <p className="text-gray-300 text-xs font-semibold uppercase mb-1">Início</p>
                    <p className={`text-xl font-bold ${
                      incident?.startedAt ? 'text-orange-300' : 'text-gray-500'
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
                      <p className="text-orange-400 text-xs mt-1">✓ Registrado</p>
                    )}
                    {!incident?.startedAt && incident.status === 'NO_LOCAL' && (
                      <p className="text-gray-500 text-xs mt-1">Aguardando...</p>
                    )}
                  </div>

                  {/* FIM */}
                  <div className={`rounded-lg p-3 text-center transition-all ${
                    incident.status === 'CONCLUIDO'
                      ? 'bg-green-800/50 border-2 border-green-400' 
                      : 'bg-gray-700/50 border border-gray-600 opacity-60'
                  }`}>
                    <div className="text-2xl mb-1">✅</div>
                    <p className="text-gray-300 text-xs font-semibold uppercase mb-1">Fim</p>
                    <p className={`text-xl font-bold ${
                      incident?.finishedAt ? 'text-green-300' : 'text-gray-500'
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
                      <p className="text-green-400 text-xs mt-1">✓ Concluído</p>
                    )}
                    {!incident?.finishedAt && incident.status === 'EM_EXECUCAO' && (
                      <p className="text-gray-500 text-xs mt-1">Em execução...</p>
                    )}
                  </div>
                </div>

                {/* BARRA DE PROGRESSO VISUAL */}
                {incident && incident.status !== 'CONCLUIDO' && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progresso</span>
                      <span>
                        {incident.status === 'PENDENTE' ? '0%' :
                         incident.status === 'EM_TRANSITO' ? '25%' :
                         incident.status === 'NO_LOCAL' ? '50%' :
                         incident.status === 'EM_EXECUCAO' ? '75%' : '0%'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          incident.status === 'PENDENTE' ? 'bg-gray-500 w-0' :
                          incident.status === 'EM_TRANSITO' ? 'bg-blue-500 w-1/4' :
                          incident.status === 'NO_LOCAL' ? 'bg-yellow-500 w-2/4' :
                          incident.status === 'EM_EXECUCAO' ? 'bg-orange-500 w-3/4' : 'bg-gray-500 w-0'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-gray-400">Nenhuma ocorrência atribuída.</p>
          )}
        </div>
      </div>

      {/* CHAT */}
      <div className="mt-6">
        <ChatPanel
          channel={incident ? incident.id : `equipe-${usuario.equipeId}`}
          senderName={usuario.nome}
          title={incident ? `Chat — ${incident.title}` : 'Chat da Equipe'}
        />
      </div>
    </div>
  );
}
