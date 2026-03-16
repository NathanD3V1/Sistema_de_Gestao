'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { HiOutlineDocumentArrowDown, HiOutlineTableCells, HiOutlineArrowLeft } from 'react-icons/hi2';
import { generatePDF } from '@/lib/generatePDF';
import { generateExcel } from '@/lib/generateExcel';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

// Cores para os gráficos
const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6'];

interface IncidentStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byTeam: Record<string, number>;
  byDay: { date: string; count: number }[];
  avgResolutionTime: number; // em minutos
}

export default function ReportsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');

  // Buscar dados
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [incidentsRes, teamsRes] = await Promise.all([
          fetch('/api/incidents'),
          fetch('/api/teams'),
        ]);

        const incidentsData = await incidentsRes.json();
        const teamsData = await teamsRes.json();

        setIncidents(Array.isArray(incidentsData) ? incidentsData : []);
        setTeams(Array.isArray(teamsData?.data) ? teamsData.data : []);
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calcular estatísticas
  const stats: IncidentStats = useMemo(() => {
    const now = new Date();
    let filteredIncidents = incidents;

    // Filtrar por período
    if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredIncidents = incidents.filter(
        (i) => new Date(i.updatedAt) >= weekAgo
      );
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredIncidents = incidents.filter(
        (i) => new Date(i.updatedAt) >= monthAgo
      );
    } else if (dateRange === 'year') {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      filteredIncidents = incidents.filter(
        (i) => new Date(i.updatedAt) >= yearAgo
      );
    }

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byTeam: Record<string, number> = {};
    const byDayMap: Record<string, number> = {};
    let totalResolutionTime = 0;
    let completedCount = 0;

    filteredIncidents.forEach((incident) => {
      // Por status
      byStatus[incident.status] = (byStatus[incident.status] || 0) + 1;

      // Por prioridade
      byPriority[incident.priority] = (byPriority[incident.priority] || 0) + 1;

      // Por equipe
      if (incident.teamId) {
        byTeam[incident.teamId] = (byTeam[incident.teamId] || 0) + 1;
      }

      // Por dia
      const date = new Date(incident.updatedAt).toLocaleDateString('pt-BR');
      byDayMap[date] = (byDayMap[date] || 0) + 1;

      // Tempo de resolução (se concluído)
      if (incident.status === 'CONCLUIDO' && incident.startedAt && incident.finishedAt) {
        const start = new Date(incident.startedAt).getTime();
        const end = new Date(incident.finishedAt).getTime();
        totalResolutionTime += (end - start) / (1000 * 60); // em minutos
        completedCount++;
      }
    });

    // Converter byDay para array ordenado
    const byDay = Object.entries(byDayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14); // Últimos 14 dias

    return {
      total: filteredIncidents.length,
      byStatus,
      byPriority,
      byTeam,
      byDay,
      avgResolutionTime: completedCount > 0 ? totalResolutionTime / completedCount : 0,
    };
  }, [incidents, dateRange]);

  // Formatar dados para gráficos
  const statusData = Object.entries(stats.byStatus).map(([name, value]) => ({
    name: name === 'PENDENTE' ? 'Aguardando' :
          name === 'EM_TRANSITO' ? 'Em Trânsito' :
          name === 'NO_LOCAL' ? 'No Local' :
          name === 'EM_EXECUCAO' ? 'Em Execução' :
          name === 'CONCLUIDO' ? 'Concluído' : name,
    value,
  }));

  const priorityData = Object.entries(stats.byPriority).map(([name, value]) => ({
    name: name === 'LOW' ? 'Baixa' :
          name === 'NORMAL' ? 'Normal' :
          name === 'HIGH' ? 'Alta' :
          name === 'CRITICAL' ? 'Crítica' : name,
    value,
  }));

  const teamData = Object.entries(stats.byTeam).map(([name, value]) => ({
    name: teams.find((t) => t.id === name)?.name || name,
    value,
  }));

  // Formatar tempo médio
  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Carregando relatórios...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-slate-400 hover:text-white">
              ← Voltar
            </Link>
            <h1 className="text-xl font-bold text-white">Relatórios e Estatísticas</h1>
          </div>

          {/* Seletor de período */}
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {range === 'week' ? '7 dias' : range === 'month' ? '30 dias' : '1 ano'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📊</span>
              <span className="text-slate-400 text-sm">Total de Ocorrências</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">✅</span>
              <span className="text-slate-400 text-sm">Concluídas</span>
            </div>
            <div className="text-3xl font-bold text-green-400">
              {stats.byStatus['CONCLUIDO'] || 0}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">⏳</span>
              <span className="text-slate-400 text-sm">Aguardando</span>
            </div>
            <div className="text-3xl font-bold text-yellow-400">
              {stats.byStatus['PENDENTE'] || 0}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">⏱️</span>
              <span className="text-slate-400 text-sm">Tempo Médio de Resolução</span>
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {formatTime(stats.avgResolutionTime)}
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ocorrências por dia */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Ocorrências por Dia
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={{ fill: '#22d3ee' }}
                    name="Ocorrências"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ocorrências por status */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Ocorrências por Status
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ocorrências por prioridade */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Ocorrências por Prioridade
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" name="Ocorrências" radius={[4, 4, 0, 0]}>
                    {priorityData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.name === 'Crítica'
                            ? '#ef4444'
                            : entry.name === 'Alta'
                            ? '#f97316'
                            : entry.name === 'Normal'
                            ? '#eab308'
                            : '#6b7280'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ocorrências por equipe */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">
              Ocorrências por Equipe
            </h3>
            <div className="h-64">
              {teamData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#9ca3af"
                      fontSize={12}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" name="Ocorrências" radius={[0, 4, 4, 0]}>
                      {teamData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabela de detalhes */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Resumo por Equipe
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Equipe</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Total</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Concluídas</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Em Andamento</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Taxa de Conclusão</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => {
                  const teamIncidents = incidents.filter((i) => i.teamId === team.id);
                  const completed = teamIncidents.filter(
                    (i) => i.status === 'CONCLUIDO'
                  ).length;
                  const inProgress = teamIncidents.filter(
                    (i) => i.status !== 'CONCLUIDO'
                  ).length;
                  const rate = teamIncidents.length > 0
                    ? ((completed / teamIncidents.length) * 100).toFixed(1)
                    : '0';

                  return (
<tr key={team.id} className="border-b border-slate-700/50">
                      <td className="py-3 px-4 text-white font-medium">{team.name}</td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {teamIncidents.length}
                      </td>
                      <td className="py-3 px-4 text-right text-green-400">{completed}</td>
                      <td className="py-3 px-4 text-right text-yellow-400">{inProgress}</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2 py-1 rounded text-sm font-medium ${
                            Number(rate) >= 70
                              ? 'bg-green-500/20 text-green-400'
                              : Number(rate) >= 40
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botão de exportar */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => {
              try {
                const filename = generateExcel(incidents, teams);
                toast.success(`Excel exportado: ${filename}`);
              } catch {
                toast.error('Erro ao exportar Excel');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <HiOutlineTableCells className="w-4 h-4" />
            Exportar Excel
          </button>
          <button
            onClick={() => {
              try {
                const filename = generatePDF(incidents, teams);
                toast.success(`PDF exportado: ${filename}`);
              } catch {
                toast.error('Erro ao exportar PDF');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <HiOutlineDocumentArrowDown className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

