/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { ChatPanel } from '@/components/ChatPanel';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';

// Import dinâmico do mapa
const TeamLiveMap = dynamic(() => import('@/components/TeamLiveMap'), { ssr: false });

// ====================== TIPOS ======================
type ServerStatus =
  | 'PENDENTE'
  | 'EM_TRANSITO'
  | 'NO_LOCAL'
  | 'EM_EXECUCAO'
  | 'CONCLUIDO';

type AdminStatus = 'ALL' | 'PENDING' | 'IN_TRANSIT' | 'ON_SITE' | 'COMPLETED';

type IncidentServer = {
  id: string;
  teamId: string;
  title: string;
  address: string;
  priority: string;
  status: ServerStatus;
  departedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
};

type IncidentUI = IncidentServer & {
  uiStatus: Exclude<AdminStatus, 'ALL'>;
  teamLabel: string;
};

// ====================== MOCK DE EQUIPES ======================
const mockTeamsBase = [
  { id: 'eqp-1', name: 'Equipe A', members: 4, location: 'Zona Sul', vehicle: 'Fiat Strada - OEX-9090' },
  { id: 'eqp-2', name: 'Equipe B', members: 3, location: 'Zona Norte', vehicle: 'Ford Ranger - ABC-1234' },
  { id: 'eqp-3', name: 'Equipe C', members: 5, location: 'Centro', vehicle: 'Chevrolet S10 - XYZ-5678' },
];

// ====================== TIPOS DE EQUIPE ======================
type TeamServer = {
  id: string;
  name: string;
  status: string;
  location: string;
  members: number;
  vehicle: string;
  phone: string;
};

// ====================== MAPEAMENTOS DE STATUS ======================
const serverToAdmin: Record<ServerStatus, Exclude<AdminStatus, 'ALL'>> = {
  PENDENTE: 'PENDING',
  EM_TRANSITO: 'IN_TRANSIT',
  NO_LOCAL: 'ON_SITE',
  EM_EXECUCAO: 'ON_SITE',
  CONCLUIDO: 'COMPLETED',
};

const adminToServer: Record<Exclude<AdminStatus, 'ALL'>, ServerStatus> = {
  PENDING: 'PENDENTE',
  IN_TRANSIT: 'EM_TRANSITO',
  ON_SITE: 'NO_LOCAL',
  COMPLETED: 'CONCLUIDO',
};

// ====================== CONFIGS DE COR ======================
const statusConfig: Record<string, { label: string; color: string; textColor: string }> = {
  PENDING: { label: 'Aguardando', color: 'bg-yellow-100', textColor: 'text-yellow-800' },
  IN_TRANSIT: { label: 'Em Trânsito', color: 'bg-blue-100', textColor: 'text-blue-800' },
  ON_SITE: { label: 'No Local', color: 'bg-orange-100', textColor: 'text-orange-800' },
  COMPLETED: { label: 'Concluído', color: 'bg-green-100', textColor: 'text-green-800' },
};

const priorityConfig: Record<string, { label: string; color: string; textColor: string }> = {
  LOW: { label: 'Baixa', color: 'bg-gray-100', textColor: 'text-gray-800' },
  NORMAL: { label: 'Normal', color: 'bg-blue-100', textColor: 'text-blue-800' },
  HIGH: { label: 'Alta', color: 'bg-orange-100', textColor: 'text-orange-800' },
  CRITICAL: { label: 'Crítica', color: 'bg-red-100', textColor: 'text-red-800' },
};

function normalizePriority(p: string): keyof typeof priorityConfig {
  const up = (p ?? '').toUpperCase();
  if (up in priorityConfig) return up as keyof typeof priorityConfig;
  if (up.includes('ALTA')) return 'HIGH';
  if (up.includes('BAIXA')) return 'LOW';
  if (up.includes('CRIT')) return 'CRITICAL';
  return 'NORMAL';
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Falha ao carregar');
    return r.json();
  });

// ====================== COMPONENTE ======================
export default function Page() {
  const router = useRouter();

  // Estado da UI
  const [filterStatus, setFilterStatus] = useState<AdminStatus>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  
  // Coordenadas do endereço da ocorrência selecionada
  const [incidentCoords, setIncidentCoords] = useState<[number, number] | null>(null);

  // Modal "Nova Ocorrência"
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Modal "Gerenciar Equipes"
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isTeamEditOpen, setIsTeamEditOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  
  // Dados das equipes da API
  const { data: teamsData, isLoading: teamsLoading, error: teamsError, mutate: mutateTeams } = useSWR<TeamServer[]>('/api/teams', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  });
  
  // Formulário de equipe
  const [teamForm, setTeamForm] = useState({
    id: '',
    name: '',
    status: 'AVAILABLE',
    location: '',
    members: 1,
    vehicle: '',
    phone: '',
  });

  // Formulário de Ocorrência
  const [form, setForm] = useState<{
    title: string;
    address: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
    uiStatus: Exclude<AdminStatus, 'ALL'>;
    teamId: string;
  }>({
    title: '',
    address: '',
    priority: 'NORMAL',
    uiStatus: 'PENDING',
    teamId: mockTeamsBase[0]?.id ?? 'eqp-1',
  });

  // Modal "Editar Ocorrência"
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Dados do backend
  const { data, isLoading, error, mutate } = useSWR<IncidentServer[]>('/api/incidents', fetcher, {
    refreshInterval: 3000,
    revalidateOnFocus: true,
  });

  // Normaliza incidents para a UI
  const incidents: IncidentUI[] = useMemo(() => {
    const raw = data ?? [];
    const teamById = new Map(mockTeamsBase.map((t) => [t.id, t.name] as const));
    return raw.map((i) => ({
      ...i,
      uiStatus: serverToAdmin[i.status],
      teamLabel: teamById.get(i.teamId) ?? i.teamId,
    }));
  }, [data]);

  // Calculate dynamic team status based on active incidents (not COMPLETED)
  const mockTeams = useMemo(() => {
    const activeTeamIds = new Set(
      (data ?? [])
        .filter((i: IncidentServer) => i.status !== 'CONCLUIDO')
        .map((i: IncidentServer) => i.teamId)
    );
    
    return mockTeamsBase.map((team) => ({
      ...team,
      status: activeTeamIds.has(team.id) ? 'BUSY' : 'AVAILABLE',
    }));
  }, [data]);

  // Seleciona automaticamente o primeiro quando carregar
  useEffect(() => {
    if (!selectedId && incidents.length > 0) {
      setSelectedId(incidents[0].id);
    }
  }, [incidents, selectedId]);

  const selectedIncident = useMemo(
    () => incidents.find((i) => i.id === selectedId) ?? null,
    [incidents, selectedId]
  );

  // Chat: usar o canal da ocorrência quando selecionada, senão usar o canal da equipe
  const chatCanal = useMemo(() => {
    if (selectedIncident) {
      // Se há uma ocorrência selecionada, usar o ID da ocorrência como canal
      return selectedIncident.id;
    }
    // Senão, usar o canal da equipe padrão
    return 'equipe-eqp-1';
  }, [selectedIncident]);

  // Lista filtrada
  const filteredIncidents = useMemo(() => {
    if (filterStatus === 'ALL') return incidents;
    return incidents.filter((i) => i.uiStatus === filterStatus);
  }, [incidents, filterStatus]);

  const getStatusColor = (status: string) =>
    statusConfig[status] ?? { color: 'bg-gray-100', textColor: 'text-gray-800', label: status };
  const getPriorityColor = (priority: string) =>
    priorityConfig[priority] ?? priorityConfig[normalizePriority(priority)];

  // Criar ocorrência
  async function handleCreateIncident(e: React.FormEvent) {
    e.preventDefault();
    // Generate proper UUID for Supabase compatibility
    const id = crypto.randomUUID();
    const serverStatus: ServerStatus = adminToServer[form.uiStatus];

    const payload: Omit<IncidentServer, 'updatedAt'> = {
      id,
      teamId: form.teamId,
      title: form.title,
      address: form.address,
      priority: form.priority,
      status: serverStatus,
      departedAt: null,
      arrivedAt: null,
      startedAt: null,
      finishedAt: null,
    };

    const res = await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error('Falha ao criar', await res.text());
      return;
    }

    await mutate();
    setIsCreateOpen(false);
    setForm({
      title: '',
      address: '',
      priority: 'NORMAL',
      uiStatus: 'PENDING',
      teamId: mockTeamsBase[0]?.id ?? 'eqp-1',
    });
    setSelectedId(id);
  }

  // Editar ocorrência - abre o modal
  function handleEditClick() {
    if (!selectedIncident) return;
    setForm({
      title: selectedIncident.title,
      address: selectedIncident.address,
      priority: selectedIncident.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL',
      uiStatus: selectedIncident.uiStatus,
      teamId: selectedIncident.teamId,
    });
    setIsEditOpen(true);
  }

  // Salvar edição
  async function handleUpdateIncident(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;

    const serverStatus: ServerStatus = adminToServer[form.uiStatus];

    const payload = {
      title: form.title,
      address: form.address,
      priority: form.priority,
      status: serverStatus,
      teamId: form.teamId,
    };

    const res = await fetch(`/api/incidents/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error('Falha ao atualizar', await res.text());
      return;
    }

    await mutate();
    setIsEditOpen(false);
  }

  // Deletar ocorrência
  async function handleDeleteIncident() {
    if (!selectedId || !selectedIncident) return;
    
    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir a ocorrência "${selectedIncident.title}"?`
    );
    
    if (!confirmDelete) return;

    const res = await fetch(`/api/incidents/${selectedId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      console.error('Falha ao excluir', await res.text());
      return;
    }

    await mutate();
    setSelectedId(null);
  }

  // Toggle mapa
  function handleToggleMap() {
    setShowMap(!showMap);
  }

  // Função para geocodificar endereço usando Nominatim
  async function geocodeAddress(address: string): Promise<[number, number] | null> {
    if (!address || address.length < 3) return null;
    
    try {
      // Primeiro tenta com o endereço completo para obter a região correta
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
      console.log('Geocodificação result:', data);
      
      if (data && data.length > 0) {
        // Pegar o primeiro resultado que tem coordenadas válidas
        const result = data[0];
        const coords: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
        
        // Verificar se as coordenadas são válidas
        if (!isNaN(coords[0]) && !isNaN(coords[1]) && coords[0] !== 0 && coords[1] !== 0) {
          console.log('Coordenadas encontradas:', coords);
          console.log('Endereço encontrado:', result.display_name);
          return coords;
        }
      }
      
      console.log('Nenhum resultado encontrado para o endereço');
      return null;
    } catch (error) {
      console.error('Erro na geocodificação:', error);
      return null;
    }
  }

  // Atualiza coordenadas quando a ocorrência selecionada mudar
  useEffect(() => {
    if (selectedIncident?.address) {
      geocodeAddress(selectedIncident.address).then((coords) => {
        setIncidentCoords(coords);
      });
    } else {
      setIncidentCoords(null);
    }
  }, [selectedIncident]);

  // ====== FUNÇÕES DE GERENCIAMENTO DE EQUIPES ======

  // Abrir modal de nova equipe
  function handleOpenNewTeam() {
    setTeamForm({
      id: `eqp-${Date.now()}`,
      name: '',
      status: 'AVAILABLE',
      location: '',
      members: 1,
      vehicle: '',
      phone: '',
    });
    setSelectedTeamId(null);
    setIsTeamModalOpen(true);
  }

  // Abrir modal de editar equipe
  function handleEditTeam(team: TeamServer) {
    setTeamForm({
      id: team.id,
      name: team.name,
      status: team.status,
      location: team.location,
      members: team.members,
      vehicle: team.vehicle,
      phone: team.phone,
    });
    setSelectedTeamId(team.id);
    setIsTeamModalOpen(true);
  }

  // Criar equipe
  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamForm),
    });

    if (!res.ok) {
      const errorData = await res.json();
      alert(errorData.error || 'Erro ao criar equipe');
      return;
    }

    await mutateTeams();
    setIsTeamModalOpen(false);
    setTeamForm({
      id: '',
      name: '',
      status: 'AVAILABLE',
      location: '',
      members: 1,
      vehicle: '',
      phone: '',
    });
  }

  // Atualizar equipe
  async function handleUpdateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeamId) return;

    const res = await fetch('/api/teams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamForm),
    });

    if (!res.ok) {
      const errorData = await res.json();
      alert(errorData.error || 'Erro ao atualizar equipe');
      return;
    }

    await mutateTeams();
    setIsTeamModalOpen(false);
  }

  // Excluir equipe
  async function handleDeleteTeam(teamId: string) {
    const confirmDelete = window.confirm(
      'Tem certeza que deseja excluir esta equipe? Esta ação não pode ser desfeita.'
    );
    
    if (!confirmDelete) return;

    const res = await fetch(`/api/teams?id=${teamId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const errorData = await res.json();
      alert(errorData.error || 'Erro ao excluir equipe');
      return;
    }

    await mutateTeams();
    setIsTeamModalOpen(false);
  }

  // Obter equipes para exibição (da API ou fallback para mock)
  const displayTeams = useMemo(() => {
    if (teamsData && teamsData.length > 0) {
      // Calcular status dinâmico baseado em incidentes ativos
      const activeTeamIds = new Set(
        (data ?? [])
          .filter((i: IncidentServer) => i.status !== 'CONCLUIDO')
          .map((i: IncidentServer) => i.teamId)
      );
      
      return teamsData.map((team) => ({
        ...team,
        status: activeTeamIds.has(team.id) ? 'BUSY' : team.status,
      }));
    }
    return mockTeams;
  }, [teamsData, data, mockTeams]);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src="https://www.neoenergia.com/documents/d/bahia/ImagemCoelbaNeo" 
                alt="Neoenergia" 
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-white font-bold text-lg">Painel Admin</span>
          </Link>

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
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600 rounded-2xl p-6 text-white hover-lift">
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="w-20 h-20 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl"></div>
              </div>
              <div className="text-4xl font-bold mb-1">{incidents.length}</div>
              <p className="text-blue-100 text-sm font-medium">Total de Ocorrências</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 rounded-2xl p-6 text-white hover-lift">
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl">⏳</span>
                </div>
                <div className="w-20 h-20 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl"></div>
              </div>
              <div className="text-4xl font-bold mb-1">
                {incidents.filter((i) => i.uiStatus === 'PENDING').length}
              </div>
              <p className="text-orange-100 text-sm font-medium">Aguardando</p>
            </div>
          </div>

          {displayTeams.filter((t) => t.status === 'AVAILABLE').length === 0 ? (
            <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-2xl p-6 text-white hover-lift animate-pulse">
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <div className="w-20 h-20 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl"></div>
                </div>
                <div className="text-4xl font-bold mb-1">
                  {displayTeams.filter((t) => t.status === 'AVAILABLE').length}
                </div>
                <p className="text-red-100 text-sm font-medium">Nenhuma Equipe Disponível!</p>
              </div>
            </div>
          ) : (
            <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl p-6 text-white hover-lift">
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="w-20 h-20 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl"></div>
                </div>
                <div className="text-4xl font-bold mb-1">
                  {displayTeams.filter((t) => t.status === 'AVAILABLE').length}
                </div>
                <p className="text-green-100 text-sm font-medium">Equipes Disponíveis</p>
              </div>
            </div>
          )}

          <div className="group relative overflow-hidden bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white hover-lift">
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="w-20 h-20 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl"></div>
              </div>
              <div className="text-4xl font-bold mb-1">{displayTeams.length}</div>
              <p className="text-violet-100 text-sm font-medium">Total de Equipes</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Incidents List */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Ocorrências</h2>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-5 py-2.5 rounded-xl transition-all hover-lift shadow-lg shadow-blue-500/20 font-medium"
                >
                  ➕ Nova Ocorrência
                </button>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap gap-2 mb-6">
                {(['ALL', 'PENDING', 'IN_TRANSIT', 'ON_SITE', 'COMPLETED'] as AdminStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-4 py-2 rounded-full transition-all text-sm font-medium ${
                        filterStatus === status
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50'
                      }`}
                    >
                      {status === 'ALL' ? 'Todas' : status === 'PENDING' ? '⏳ Aguardando' : status === 'IN_TRANSIT' ? '🚗 Em Trânsito' : status === 'ON_SITE' ? '📍 No Local' : '✅ Concluído'}
                    </button>
                  )
                )}
              </div>

              {/* Lista */}
              <div className="space-y-3">
                {isLoading && incidents.length === 0 && (
                  <div className="text-slate-400">Carregando ocorrências...</div>
                )}

                {error && (
                  <div className="rounded border border-red-800 bg-red-950/40 px-3 py-2 text-red-300">
                    Erro ao carregar: {String((error as any)?.message ?? error)}
                  </div>
                )}

                {filteredIncidents.map((incident) => {
                  const prKey = normalizePriority(incident.priority);
                  const pr = getPriorityColor(prKey);
                  const st = getStatusColor(incident.uiStatus);

                  return (
                    <div
                      key={incident.id}
                      onClick={() => setSelectedId(incident.id)}
                      className={`group p-4 rounded-xl border cursor-pointer transition-all duration-300 hover-lift ${
                        selectedId === incident.id
                          ? 'bg-gradient-to-r from-blue-600/80 to-blue-500/60 border-blue-400 shadow-lg shadow-blue-500/20'
                          : 'bg-slate-700/50 border-slate-600/50 hover:border-slate-400 hover:bg-slate-700/80'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-white mb-2 group-hover:text-blue-100 transition-colors">{incident.title}</h3>
                          <div className="flex gap-2 flex-wrap">
                            <span className={`px-2 py-1 rounded text-sm font-semibold backdrop-blur-sm ${st.color} ${st.textColor}`}>
                              {st.label}
                            </span>
                            <span className={`px-2 py-1 rounded text-sm font-semibold backdrop-blur-sm ${pr.color} ${pr.textColor}`}>
                              {pr.label}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-slate-300 font-medium">{incident.teamLabel}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {Math.floor((Date.now() - new Date(incident.updatedAt).getTime()) / 60000)} min atrás
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredIncidents.length === 0 && !isLoading && (
                  <div className="text-slate-400">Nenhuma ocorrência para o filtro selecionado.</div>
                )}
              </div>
            </div>
          </div>

          {/* Painel de Detalhes */}
          <div>
            <div className="glass-card rounded-2xl p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <span className="text-lg">📋</span>
                </div>
                <h3 className="text-xl font-bold text-white">Detalhes da Ocorrência</h3>
              </div>

              {!selectedIncident ? (
                <div className="text-slate-400">Selecione uma ocorrência na lista ao lado.</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-400 text-sm">Título</label>
                    <p className="text-white font-semibold">{selectedIncident.title}</p>
                  </div>

                  <div>
                    <label className="text-slate-400 text-sm">Status</label>
                    <p className={`px-3 py-1 rounded-full text-sm font-semibold inline-block ${getStatusColor(selectedIncident.uiStatus).color} ${getStatusColor(selectedIncident.uiStatus).textColor}`}>
                      {getStatusColor(selectedIncident.uiStatus).label}
                    </p>
                  </div>

                  <div>
                    <label className="text-slate-400 text-sm">Prioridade</label>
                    <p className={`px-3 py-1 rounded-full text-sm font-semibold inline-block ${getPriorityColor(normalizePriority(selectedIncident.priority)).color} ${getPriorityColor(normalizePriority(selectedIncident.priority)).textColor}`}>
                      {getPriorityColor(normalizePriority(selectedIncident.priority)).label}
                    </p>
                  </div>

                  <div>
                    <label className="text-slate-400 text-sm">Equipe Atribuída</label>
                    <p className="text-white font-semibold">{selectedIncident.teamLabel}</p>
                  </div>

                  <div>
                    <label className="text-slate-400 text-sm">Endereço</label>
                    <p className="text-white font-semibold">{selectedIncident.address}</p>
                  </div>

                  <div>
                    <label className="text-slate-400 text-sm">Última Atualização</label>
                    <p className="text-white font-semibold">
                      {new Date(selectedIncident.updatedAt).toLocaleString('pt-BR', { timeZone: 'America/Bahia' })}
                    </p>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex flex-col gap-3 pt-2">
                    <button 
                      onClick={handleEditClick}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2.5 rounded-xl transition-all hover-lift shadow-lg shadow-blue-500/20"
                    >
                      ✏️ Editar Ocorrência
                    </button>
                    <button 
                      onClick={handleDeleteIncident}
                      className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white py-2.5 rounded-xl transition-all hover-lift shadow-lg shadow-red-500/20"
                    >
                      🗑️ Excluir
                    </button>
                    <button 
                      onClick={handleToggleMap}
                      className={`w-full py-2.5 rounded-xl transition-all hover-lift ${showMap ? 'bg-gradient-to-r from-slate-600 to-slate-500' : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500'} text-white shadow-lg`}
                    >
                      {showMap ? '🗺️ Ocultar Mapa' : '📍 Ver Localização'}
                    </button>
                  </div>

                  {/* Mapa de rastreamento em tempo real */}
                  {showMap && (
                    <div className="mt-4">
                      <TeamLiveMap 
                        teamName={selectedIncident.teamId} 
                        destinationCoords={incidentCoords}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Teams Section */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Equipes em Operação</h2>
            <button
              onClick={() => handleOpenNewTeam()}
              className="bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white px-5 py-2.5 rounded-xl transition-all hover-lift shadow-lg shadow-cyan-500/20 font-medium"
            >
              ➕ Nova Equipe
            </button>
          </div>
          
          {/* Loading/Error state for teams */}
          {teamsLoading && (
            <div className="text-slate-400 mb-4">Carregando equipes...</div>
          )}
          
          {teamsError && (
            <div className="rounded border border-red-800 bg-red-950/40 px-3 py-2 text-red-300 mb-4">
              Erro ao carregar equipes
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayTeams.map((team) => (
              <div key={team.id} className="group relative overflow-hidden glass-card rounded-2xl p-6 hover-lift border border-white/5">
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-600 rounded-xl flex items-center justify-center">
                        <span className="text-xl">👷</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">{team.name}</h3>
                        <p className="text-xs text-slate-400">{team.members} membros</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${team.status === 'AVAILABLE' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${team.status === 'AVAILABLE' ? 'bg-green-400' : 'bg-orange-400'} ${team.status === 'AVAILABLE' ? 'animate-pulse' : ''}`}></span>
                      {team.status === 'AVAILABLE' ? 'Disponível' : 'Ocupada'}
                    </span>
                  </div>

                  <div className="space-y-2 text-slate-300">
                    <p className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">🚗</span>
                      <span className="truncate">{(team as any).vehicle || 'Não atribuído'}</span>
                    </p>
                    <p className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500">📍</span>
                      <span>{(team as any).location || 'Não definida'}</span>
                    </p>
                    {(team as any).phone && (
                      <p className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500">📞</span>
                        <span>{(team as any).phone}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 mt-5">
                    <button 
                      onClick={() => {
                        // Selecionar a ocorrência da equipe para ativar o chat correto
                        const teamIncident = incidents.find(i => i.teamId === team.id && i.status !== 'CONCLUIDO');
                        if (teamIncident) {
                          setSelectedId(teamIncident.id);
                        }
                      }}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-2 rounded-xl transition-all text-sm font-medium shadow-lg shadow-blue-500/20"
                    >
                      💬 Chat
                    </button>
                    <button 
                      onClick={() => handleEditTeam(team as TeamServer)}
                      className="px-4 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white py-2 rounded-xl transition-all text-sm"
                    >
                      ✏️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {displayTeams.length === 0 && !teamsLoading && (
              <div className="col-span-full text-slate-400 text-center py-8">
                Nenhuma equipe cadastrada. Clique em "+ Nova Equipe" para adicionar.
              </div>
            )}
          </div>
        </div>

        {/* Chat com a Equipe */}
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-white">
              Chat com a Equipe
              {selectedIncident && (
                <span className="text-sm font-normal text-slate-400 ml-2">
                  — {selectedIncident.title}
                </span>
              )}
            </h2>
          </div>

          <ChatPanel
            key={chatCanal}
            channel={chatCanal}
            senderName="Central"
            title="Chat com a Equipe"
          />
        </div>
      </div>

      {/* MODAL - Nova Ocorrência */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-modal rounded-2xl p-6 w-full max-w-lg mx-4 animate-slide-in border border-white/10 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <span className="text-lg">➕</span>
              </div>
              <h3 className="text-xl font-bold text-white">Nova Ocorrência</h3>
            </div>

            <form className="space-y-4" onSubmit={handleCreateIncident}>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Título</label>
                <input
                  className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Endereço</label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(address) => setForm((f) => ({ ...f, address }))}
                  placeholder="Digite o endereço..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Prioridade</label>
                  <select
                    className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as any }))}
                  >
                    <option value="LOW">Baixa</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Status inicial</label>
                  <select
                    className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={form.uiStatus}
                    onChange={(e) => setForm((f) => ({ ...f, uiStatus: e.target.value as any }))}
                  >
                    <option value="PENDING">Aguardando</option>
                    <option value="IN_TRANSIT">Em Trânsito</option>
                    <option value="ON_SITE">No Local</option>
                    <option value="COMPLETED">Concluído</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Equipe</label>
                  <select
                    className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={form.teamId}
                    onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value }))}
                  >
                    {displayTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-700/50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium transition-all hover-lift shadow-lg shadow-blue-500/20"
                >
                  Criar Ocorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - Editar Ocorrência */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-modal rounded-2xl p-6 w-full max-w-lg mx-4 animate-slide-in border border-white/10 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                <span className="text-lg">✏️</span>
              </div>
              <h3 className="text-xl font-bold text-white">Editar Ocorrência</h3>
            </div>

            <form className="space-y-4" onSubmit={handleUpdateIncident}>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Título</label>
                <input
                  className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Endereço</label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(address) => setForm((f) => ({ ...f, address }))}
                  placeholder="Digite o endereço..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Prioridade</label>
                  <select
                    className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as any }))}
                  >
                    <option value="LOW">Baixa</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Status</label>
                  <select
                    className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={form.uiStatus}
                    onChange={(e) => setForm((f) => ({ ...f, uiStatus: e.target.value as any }))}
                  >
                    <option value="PENDING">Aguardando</option>
                    <option value="IN_TRANSIT">Em Trânsito</option>
                    <option value="ON_SITE">No Local</option>
                    <option value="COMPLETED">Concluído</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Equipe</label>
                  <select
                    className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={form.teamId}
                    onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value }))}
                  >
                    {displayTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-700/50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium transition-all hover-lift shadow-lg shadow-blue-500/20"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL - Gerenciar Equipes */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-modal rounded-2xl p-6 w-full max-w-lg mx-4 animate-slide-in border border-white/10 shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
                  <span className="text-lg">👥</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  {selectedTeamId ? 'Editar Equipe' : 'Nova Equipe'}
                </h3>
              </div>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={selectedTeamId ? handleUpdateTeam : handleCreateTeam}>
              <div>
                <label className="block text-sm text-slate-300 mb-1">ID da Equipe</label>
                <input
                  className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  value={teamForm.id}
                  onChange={(e) => setTeamForm((f) => ({ ...f, id: e.target.value }))}
                  required
                  disabled={!!selectedTeamId}
                  placeholder="ex: eqp-001"
                />
                {!selectedTeamId && (
                  <p className="text-xs text-slate-500 mt-1">ID único para identificar a equipe</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Nome da Equipe</label>
                <input
                  className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="ex: Equipe de Manutenção Sul"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Status</label>
                  <select
                    className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                    value={teamForm.status}
                    onChange={(e) => setTeamForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="AVAILABLE">Disponível</option>
                    <option value="ON_CALL">Em Chamado</option>
                    <option value="IN_TRANSIT">Em Trânsito</option>
                    <option value="ON_SITE">No Local</option>
                    <option value="BUSY">Ocupada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Número de Membros</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                    value={teamForm.members}
                    onChange={(e) => setTeamForm((f) => ({ ...f, members: parseInt(e.target.value) || 1 }))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Localização</label>
                <input
                  className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  value={teamForm.location}
                  onChange={(e) => setTeamForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="ex: Zona Sul"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Veículo</label>
                <input
                  className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  value={teamForm.vehicle}
                  onChange={(e) => setTeamForm((f) => ({ ...f, vehicle: e.target.value }))}
                  placeholder="ex: Fiat Strada - ABC-1234"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Telefone</label>
                <input
                  className="w-full bg-slate-900/80 text-white border border-slate-600 rounded-xl px-4 py-3 transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  value={teamForm.phone}
                  onChange={(e) => setTeamForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="ex: (11) 99999-0001"
                />
              </div>

              <div className="flex justify-between gap-3 pt-4">
                {selectedTeamId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTeam(selectedTeamId)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-medium transition-all hover-lift shadow-lg shadow-red-500/20"
                  >
                    🗑️ Excluir
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsTeamModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-700/50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-medium transition-all hover-lift shadow-lg shadow-cyan-500/20"
                  >
                    {selectedTeamId ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

