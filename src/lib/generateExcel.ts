import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Incident {
  id: string;
  title: string;
  address: string;
  priority: string;
  status: string;
  teamId: string;
  updatedAt: string;
  departedAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

interface Team {
  id: string;
  name: string;
  members: number;
  vehicle: string;
}

const statusLabels: Record<string, string> = {
  PENDENTE: 'Aguardando',
  EM_TRANSITO: 'Em Trânsito',
  NO_LOCAL: 'No Local',
  EM_EXECUCAO: 'Em Execução',
  CONCLUIDO: 'Concluído',
};

const priorityLabels: Record<string, string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export function generateExcel(incidents: Incident[], teams: Team[]) {
  const wb = XLSX.utils.book_new();
  const now = new Date();
  const teamMap = new Map(teams.map((t) => [t.id, t.name]));

  // =============== ABA 1: OCORRÊNCIAS ===============
  const incidentRows = incidents.map((inc) => ({
    'Título': inc.title,
    'Status': statusLabels[inc.status] || inc.status,
    'Prioridade': priorityLabels[inc.priority] || inc.priority,
    'Equipe': teamMap.get(inc.teamId) || inc.teamId,
    'Endereço': inc.address,
    'Atualizado em': format(new Date(inc.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    'Saída': inc.departedAt ? format(new Date(inc.departedAt), "dd/MM/yyyy HH:mm") : '—',
    'Chegada': inc.arrivedAt ? format(new Date(inc.arrivedAt), "dd/MM/yyyy HH:mm") : '—',
    'Início': inc.startedAt ? format(new Date(inc.startedAt), "dd/MM/yyyy HH:mm") : '—',
    'Fim': inc.finishedAt ? format(new Date(inc.finishedAt), "dd/MM/yyyy HH:mm") : '—',
  }));

  const wsIncidents = XLSX.utils.json_to_sheet(incidentRows);
  
  // Ajustar largura das colunas
  wsIncidents['!cols'] = [
    { wch: 35 }, // Título
    { wch: 14 }, // Status
    { wch: 12 }, // Prioridade
    { wch: 25 }, // Equipe
    { wch: 30 }, // Endereço
    { wch: 18 }, // Atualizado
    { wch: 18 }, // Saída
    { wch: 18 }, // Chegada
    { wch: 18 }, // Início
    { wch: 18 }, // Fim
  ];

  XLSX.utils.book_append_sheet(wb, wsIncidents, 'Ocorrências');

  // =============== ABA 2: RESUMO POR EQUIPE ===============
  const teamRows = teams.map((team) => {
    const teamIncidents = incidents.filter((i) => i.teamId === team.id);
    const completed = teamIncidents.filter((i) => i.status === 'CONCLUIDO').length;
    const pending = teamIncidents.filter((i) => i.status === 'PENDENTE').length;
    const inProgress = teamIncidents.length - completed - pending;
    const rate = teamIncidents.length > 0
      ? ((completed / teamIncidents.length) * 100).toFixed(1) + '%'
      : '0%';

    return {
      'Equipe': team.name,
      'Membros': team.members,
      'Veículo': team.vehicle || '—',
      'Total de Ocorrências': teamIncidents.length,
      'Concluídas': completed,
      'Em Andamento': inProgress,
      'Aguardando': pending,
      'Taxa de Conclusão': rate,
    };
  });

  const wsTeams = XLSX.utils.json_to_sheet(teamRows);
  wsTeams['!cols'] = [
    { wch: 25 }, // Equipe
    { wch: 10 }, // Membros
    { wch: 20 }, // Veículo
    { wch: 20 }, // Total
    { wch: 12 }, // Concluídas
    { wch: 14 }, // Em Andamento
    { wch: 12 }, // Aguardando
    { wch: 18 }, // Taxa
  ];

  XLSX.utils.book_append_sheet(wb, wsTeams, 'Equipes');

  // Download
  const filename = `relatorio-ocorrencias-${format(now, 'yyyy-MM-dd-HHmm')}.xlsx`;
  XLSX.writeFile(wb, filename);
  return filename;
}
