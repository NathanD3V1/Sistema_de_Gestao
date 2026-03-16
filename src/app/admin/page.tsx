/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { ChatPanel } from '@/components/ChatPanel';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

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

// ====================== FETCHER PARA EQUIPES ======================
// A API de equipes retorna { success: true, data: [...] }, precisamos extrair o array
const teamsFetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Falha ao carregar equipes');
    return r.json();
  }).then((json) => {
    // Se a resposta tiver o formato { success, data }, extrai o data
    if (json && json.data && Array.isArray(json.data)) return json.data;
    // Se já for um array, retorna diretamente
    if (Array.isArray(json)) return json;
    return [];
  });

// ====================== TIPOS DE EQUIPE ======================
type TeamServer = {
  id: string;
  name: string;
  matricula: string;
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

// ====================== CONFIGS DE COR (DARK MODE) ======================
const statusConfig: Record<string, { label: string; color: string; textColor: string }> = {
  PENDING: { label: 'Aguardando', color: 'bg-amber-500/15', textColor: 'text-amber-400' },
  IN_TRANSIT: { label: 'Em Trânsito', color: 'bg-sky-500/15', textColor: 'text-sky-400' },
  ON_SITE: { label: 'No Local', color: 'bg-orange-500/15', textColor: 'text-orange-400' },
  COMPLETED: { label: 'Concluído', color: 'bg-emerald-500/15', textColor: 'text-emerald-400' },
};

const priorityConfig: Record<string, { label: string; color: string; textColor: string }> = {
  LOW: { label: 'Baixa', color: 'bg-slate-500/15', textColor: 'text-slate-400' },
  NORMAL: { label: 'Normal', color: 'bg-sky-500/15', textColor: 'text-sky-400' },
  HIGH: { label: 'Alta', color: 'bg-orange-500/15', textColor: 'text-orange-400' },
  CRITICAL: { label: 'Crítica', color: 'bg-red-500/15', textColor: 'text-red-400' },
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
  
  // Dados das equipes da API (usa teamsFetcher para extrair o array do envelope { success, data })
  const { data: teamsData, isLoading: teamsLoading, error: teamsError, mutate: mutateTeams } = useSWR<TeamServer[]>('/api/teams', teamsFetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  });
  
  // Formulário de equipe
  const [teamForm, setTeamForm] = useState({
    id: '',
    name: '',
    matricula: '',
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
    teamId: '', // Inicializa vazio, será preenchido via useEffect
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
    const teams = teamsData ?? [];
    const teamById = new Map(teams.map((t) => [t.id, t.name] as const));
    return raw.map((i) => ({
      ...i,
      uiStatus: serverToAdmin[i.status],
      teamLabel: teamById.get(i.teamId) ?? i.teamId,
    }));
  }, [data, teamsData]);

  // Calculate dynamic team status based on active incidents (not COMPLETED)
  // (removido mockTeamsBase - agora usa teamsData do Supabase)

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
      teamId: '',
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
      matricula: '',
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
      matricula: team.matricula || '',
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
      matricula: '',
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

  // Obter equipes para exibição (diretamente da API do Supabase)
  const displayTeams = useMemo(() => {
    const teams = teamsData ?? [];
    // Calcular status dinâmico baseado em incidentes ativos
    const activeTeamIds = new Set(
      (data ?? [])
        .filter((i: IncidentServer) => i.status !== 'CONCLUIDO')
        .map((i: IncidentServer) => i.teamId)
    );
    
    return teams.map((team) => ({
      ...team,
      status: activeTeamIds.has(team.id) ? 'BUSY' : team.status,
    }));
  }, [teamsData, data]);

  // Chart data calculation
  const chartData = useMemo(() => {
    const counts = { PENDING: 0, IN_TRANSIT: 0, ON_SITE: 0, COMPLETED: 0 };
    incidents.forEach(i => {
      counts[i.uiStatus as keyof typeof counts] = (counts[i.uiStatus as keyof typeof counts] || 0) + 1;
    });
    return [
      { name: 'Aguardando', value: counts.PENDING, color: '#f59e0b' },
      { name: 'Em Trânsito', value: counts.IN_TRANSIT, color: '#3b82f6' },
      { name: 'No Local', value: counts.ON_SITE, color: '#f97316' },
      { name: 'Concluído', value: counts.COMPLETED, color: '#22c55e' }
    ].filter(i => i.value > 0);
  }, [incidents]);

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Header */}
      <header className="bg-[#0d1117]/90 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex justify-between items-center">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <span className="text-white font-semibold text-base tracking-tight">Central de Operações</span>
              <p className="text-[11px] text-slate-500 font-medium -mt-0.5">Painel Administrativo</p>
            </div>
          </Link>

          <button
            onClick={() => {
              localStorage.removeItem('usuarioLogado');
              router.push('/');
            }}
            className="flex items-center gap-2 text-slate-400 text-sm hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card-dark p-5 hover-lift stat-glow">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{incidents.length}</div>
                <p className="text-slate-500 text-xs font-medium">Total Ocorrências</p>
              </div>
            </div>
          </div>

          <div className="card-dark p-5 hover-lift stat-glow">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {incidents.filter((i) => i.uiStatus === 'PENDING').length}
                </div>
                <p className="text-slate-500 text-xs font-medium">Aguardando</p>
              </div>
            </div>
          </div>

          <div className="card-dark p-5 hover-lift stat-glow">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                displayTeams.filter((t) => t.status === 'AVAILABLE').length === 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'
              }`}>
                <svg className={`w-5 h-5 ${
                  displayTeams.filter((t) => t.status === 'AVAILABLE').length === 0 ? 'text-red-400' : 'text-emerald-400'
                }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  displayTeams.filter((t) => t.status === 'AVAILABLE').length === 0 ? 'text-red-400' : 'text-white'
                }`}>
                  {displayTeams.filter((t) => t.status === 'AVAILABLE').length}
                </div>
                <p className={`text-xs font-medium ${
                  displayTeams.filter((t) => t.status === 'AVAILABLE').length === 0 ? 'text-red-400/70' : 'text-slate-500'
                }`}>
                  {displayTeams.filter((t) => t.status === 'AVAILABLE').length === 0 ? 'Nenhuma Disponível!' : 'Equipes Disponíveis'}
                </p>
              </div>
            </div>
          </div>

          <div className="card-dark p-5 hover-lift stat-glow">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{displayTeams.length}</div>
                <p className="text-slate-500 text-xs font-medium">Total de Equipes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Charts */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <div className="card-dark p-5">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Distribuição de Status</h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#e2e8f0', fontSize: '13px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend 
                      iconSize={8}
                      wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-dark p-5">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Volume por Categoria</h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#e2e8f0', fontSize: '13px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Incidents List */}
          <div className="lg:col-span-2">
            <div className="card-dark p-5">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-base font-semibold text-slate-200">Ocorrências</h2>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium hover:shadow-lg hover:shadow-sky-500/20"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Nova Ocorrência
                </button>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {(['ALL', 'PENDING', 'IN_TRANSIT', 'ON_SITE', 'COMPLETED'] as AdminStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                        filterStatus === status
                          ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
                          : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-300 border border-transparent'
                      }`}
                    >
                      {status === 'ALL' ? 'Todas' : status === 'PENDING' ? 'Aguardando' : status === 'IN_TRANSIT' ? 'Em Trânsito' : status === 'ON_SITE' ? 'No Local' : 'Concluído'}
                    </button>
                  )
                )}
              </div>

              {/* Lista */}
              <div className="space-y-2">
                {isLoading && incidents.length === 0 && (
                  <div className="text-slate-500 text-sm py-8 text-center">Carregando ocorrências...</div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-400 text-sm">
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
                      className={`group p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedId === incident.id
                          ? 'bg-sky-500/[0.08] border-sky-500/30'
                          : 'bg-white/[0.02] border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm mb-2 text-slate-200 group-hover:text-white transition-colors truncate">{incident.title}</h3>
                          <div className="flex gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${st.color} ${st.textColor}`}>
                              {st.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${pr.color} ${pr.textColor}`}>
                              {pr.label}
                            </span>
                          </div>
                        </div>

                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-xs text-slate-400 font-medium">{incident.teamLabel}</p>
                          <p className="text-[10px] text-slate-600 mt-1">
                            {Math.floor((Date.now() - new Date(incident.updatedAt).getTime()) / 60000)} min atrás
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredIncidents.length === 0 && !isLoading && (
                  <div className="text-slate-600 text-sm py-8 text-center">Nenhuma ocorrência para o filtro selecionado.</div>
                )}
              </div>
            </div>
          </div>

          {/* Detail Panel */}
          <div>
            <div className="card-dark-elevated p-5 sticky top-20">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-sky-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-slate-300">Detalhes da Ocorrência</h3>
              </div>

              {!selectedIncident ? (
                <div className="text-slate-600 text-sm text-center py-6">Selecione uma ocorrência.</div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-500 text-[11px] uppercase tracking-wider font-medium">Título</label>
                    <p className="text-slate-200 font-medium text-sm mt-0.5">{selectedIncident.title}</p>
                  </div>

                  <div>
                    <label className="text-slate-500 text-[11px] uppercase tracking-wider font-medium">Status</label>
                    <p className={`mt-1 px-2.5 py-1 rounded-md text-xs font-semibold inline-block ${getStatusColor(selectedIncident.uiStatus).color} ${getStatusColor(selectedIncident.uiStatus).textColor}`}>
                      {getStatusColor(selectedIncident.uiStatus).label}
                    </p>
                  </div>

                  <div>
                    <label className="text-slate-500 text-[11px] uppercase tracking-wider font-medium">Prioridade</label>
                    <p className={`mt-1 px-2.5 py-1 rounded-md text-xs font-semibold inline-block ${getPriorityColor(normalizePriority(selectedIncident.priority)).color} ${getPriorityColor(normalizePriority(selectedIncident.priority)).textColor}`}>
                      {getPriorityColor(normalizePriority(selectedIncident.priority)).label}
                    </p>
                  </div>

                  <div>
                    <label className="text-slate-500 text-[11px] uppercase tracking-wider font-medium">Equipe</label>
                    <p className="text-slate-200 font-medium text-sm mt-0.5">{selectedIncident.teamLabel}</p>
                  </div>

                  <div>
                    <label className="text-slate-500 text-[11px] uppercase tracking-wider font-medium">Endereço</label>
                    <p className="text-slate-300 text-sm mt-0.5">{selectedIncident.address}</p>
                  </div>

                  <div>
                    <label className="text-slate-500 text-[11px] uppercase tracking-wider font-medium">Atualização</label>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {new Date(selectedIncident.updatedAt).toLocaleString('pt-BR', { timeZone: 'America/Bahia' })}
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-white/[0.06]">
                    <button 
                      onClick={handleEditClick}
                      className="w-full flex items-center justify-center gap-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 py-2 rounded-lg transition-all text-sm font-medium"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button 
                      onClick={handleDeleteIncident}
                      className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg transition-all text-sm font-medium"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Excluir
                    </button>
                    <button 
                      onClick={handleToggleMap}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-all text-sm font-medium ${
                        showMap ? 'bg-white/[0.08] text-slate-300' : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {showMap ? 'Ocultar Mapa' : 'Ver Localização'}
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
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-slate-200">Equipes em Operação</h2>
            <button
              onClick={() => handleOpenNewTeam()}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium hover:shadow-lg hover:shadow-sky-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nova Equipe
            </button>
          </div>
          
          {/* Loading/Error state for teams */}
          {teamsLoading && (
            <div className="text-slate-500 text-sm mb-4">Carregando equipes...</div>
          )}
          
          {teamsError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-400 text-sm mb-4">
              Erro ao carregar equipes
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {displayTeams.map((team) => (
              <div key={team.id} className="card-dark p-4 hover-lift">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-slate-700/50 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200">{team.name}</h3>
                      <p className="text-[10px] text-slate-500">{team.members} membros</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${team.status === 'AVAILABLE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                    <span className={`w-1 h-1 rounded-full ${team.status === 'AVAILABLE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                    {team.status === 'AVAILABLE' ? 'Disponível' : 'Ocupada'}
                  </span>
                </div>

                <div className="space-y-1.5 text-slate-400 mt-3">
                  <p className="flex items-center gap-2 text-xs">
                    <svg className="w-3 h-3 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="truncate">{(team as any).vehicle || 'Sem veículo'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-xs">
                    <svg className="w-3 h-3 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="font-mono text-slate-500 bg-white/[0.04] px-1 rounded text-[10px]">{(team as any).matricula || '—'}</span>
                  </p>
                  <p className="flex items-center gap-2 text-xs">
                    <svg className="w-3 h-3 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{(team as any).location || 'Não definida'}</span>
                  </p>
                </div>

                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => {
                      const teamIncident = incidents.find(i => i.teamId === team.id && i.status !== 'CONCLUIDO');
                      if (teamIncident) {
                        setSelectedId(teamIncident.id);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-sky-600/15 hover:bg-sky-600/25 text-sky-400 py-1.5 rounded-lg transition-all text-xs font-medium"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat
                  </button>
                  <button 
                    onClick={() => handleEditTeam(team as TeamServer)}
                    className="px-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 py-1.5 rounded-lg transition-all text-xs"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            
            {displayTeams.length === 0 && !teamsLoading && (
              <div className="col-span-full text-slate-600 text-sm text-center py-8">
                Nenhuma equipe cadastrada.
              </div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="mt-6 mb-8 card-dark p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat com a Equipe
              {selectedIncident && (
                <span className="text-xs font-normal text-slate-500 ml-1">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-6 w-full max-w-lg mx-4 animate-slide-in shadow-2xl">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 bg-sky-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-slate-200">Nova Ocorrência</h3>
            </div>

            <form className="space-y-3" onSubmit={handleCreateIncident}>
              <div>
                <label className="block text-xs text-slate-500 font-medium mb-1">Título</label>
                <input
                  className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none placeholder:text-slate-600"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="Título da ocorrência"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 font-medium mb-1">Endereço</label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(address) => setForm((f) => ({ ...f, address }))}
                  placeholder="Digite o endereço..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1">Prioridade</label>
                  <select
                    className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none"
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
                  <label className="block text-xs text-slate-500 font-medium mb-1">Status</label>
                  <select
                    className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none"
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
                  <label className="block text-xs text-slate-500 font-medium mb-1">Equipe</label>
                  <select
                    className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none"
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

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] transition-all text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-sky-500/20"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-6 w-full max-w-lg mx-4 animate-slide-in shadow-2xl">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-slate-200">Editar Ocorrência</h3>
            </div>

            <form className="space-y-3" onSubmit={handleUpdateIncident}>
              <div>
                <label className="block text-xs text-slate-500 font-medium mb-1">Título</label>
                <input
                  className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none placeholder:text-slate-600"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 font-medium mb-1">Endereço</label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(address) => setForm((f) => ({ ...f, address }))}
                  placeholder="Digite o endereço..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1">Prioridade</label>
                  <select
                    className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none"
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
                  <label className="block text-xs text-slate-500 font-medium mb-1">Status</label>
                  <select
                    className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none"
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
                  <label className="block text-xs text-slate-500 font-medium mb-1">Equipe</label>
                  <select
                    className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none"
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

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] transition-all text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-sky-500/20"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-6 w-full max-w-lg mx-4 animate-slide-in shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-200">
                  {selectedTeamId ? 'Editar Equipe' : 'Nova Equipe'}
                </h3>
              </div>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-500 hover:text-slate-300 flex items-center justify-center transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form className="space-y-3" onSubmit={selectedTeamId ? handleUpdateTeam : handleCreateTeam}>
              <div>
                <label className="block text-xs text-slate-500 font-medium mb-1">ID da Equipe</label>
                <input
                  className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none placeholder:text-slate-600 disabled:opacity-50"
                  value={teamForm.id}
                  onChange={(e) => setTeamForm((f) => ({ ...f, id: e.target.value }))}
                  required
                  disabled={!!selectedTeamId}
                  placeholder="ex: eqp-001"
                />
                {!selectedTeamId && (
                  <p className="text-[10px] text-slate-600 mt-1">ID único para identificar a equipe</p>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-500 font-medium mb-1">Nome da Equipe</label>
                <input
                  className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none placeholder:text-slate-600"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="ex: Equipe de Manutenção Sul"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 font-medium mb-1">Matrícula</label>
                <input
                  className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none placeholder:text-slate-600"
                  value={teamForm.matricula}
                  onChange={(e) => setTeamForm((f) => ({ ...f, matricula: e.target.value }))}
                  placeholder="ex: 1001"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 font-medium mb-1">Status</label>
                  <select
                    className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none"
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
                  <label className="block text-xs text-slate-500 font-medium mb-1">Membros</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none"
                    value={teamForm.members}
                    onChange={(e) => setTeamForm((f) => ({ ...f, members: parseInt(e.target.value) || 1 }))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 font-medium mb-1">Localização</label>
                <input
                  className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none placeholder:text-slate-600"
                  value={teamForm.location}
                  onChange={(e) => setTeamForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="ex: Zona Sul"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 font-medium mb-1">Veículo</label>
                <input
                  className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none placeholder:text-slate-600"
                  value={teamForm.vehicle}
                  onChange={(e) => setTeamForm((f) => ({ ...f, vehicle: e.target.value }))}
                  placeholder="ex: Fiat Strada - ABC-1234"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 font-medium mb-1">Telefone</label>
                <input
                  className="w-full bg-white/[0.04] text-slate-200 border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 outline-none placeholder:text-slate-600"
                  value={teamForm.phone}
                  onChange={(e) => setTeamForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="ex: (11) 99999-0001"
                />
              </div>

              <div className="flex justify-between gap-2 pt-3">
                {selectedTeamId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTeam(selectedTeamId)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Excluir
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsTeamModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] transition-all text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-sky-500/20"
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

