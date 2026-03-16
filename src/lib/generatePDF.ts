import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

export function generatePDF(incidents: Incident[], teams: Team[]) {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = format(now, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });

  // =============== CABEÇALHO ===============
  doc.setFillColor(10, 14, 26); // #0a0e1a
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Ocorrências', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Central de Operações • Gerado em ${dateStr}`, 14, 27);

  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Total: ${incidents.length} ocorrências`, 14, 34);

  // =============== RESUMO ESTATÍSTICO ===============
  let y = 50;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('Resumo Geral', 14, y);
  y += 8;

  const statusCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};

  incidents.forEach((inc) => {
    statusCounts[inc.status] = (statusCounts[inc.status] || 0) + 1;
    priorityCounts[inc.priority] = (priorityCounts[inc.priority] || 0) + 1;
  });

  // Status summary
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-600

  const statusKeys = Object.keys(statusLabels);
  statusKeys.forEach((key) => {
    const count = statusCounts[key] || 0;
    const label = statusLabels[key] || key;
    doc.text(`• ${label}: ${count}`, 16, y);
    y += 5;
  });

  y += 3;
  const priorityKeys = Object.keys(priorityLabels);
  priorityKeys.forEach((key) => {
    const count = priorityCounts[key] || 0;
    const label = priorityLabels[key] || key;
    doc.text(`• Prioridade ${label}: ${count}`, 16, y);
    y += 5;
  });

  // =============== TABELA DE OCORRÊNCIAS ===============
  y += 8;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Detalhamento de Ocorrências', 14, y);
  y += 5;

  const teamMap = new Map(teams.map((t) => [t.id, t.name]));

  const tableData = incidents.map((inc) => [
    inc.title.length > 30 ? inc.title.substring(0, 30) + '...' : inc.title,
    statusLabels[inc.status] || inc.status,
    priorityLabels[inc.priority] || inc.priority,
    teamMap.get(inc.teamId) || inc.teamId,
    inc.address.length > 25 ? inc.address.substring(0, 25) + '...' : inc.address,
    format(new Date(inc.updatedAt), 'dd/MM/yy HH:mm'),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Título', 'Status', 'Prioridade', 'Equipe', 'Endereço', 'Atualizado']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [226, 232, 240],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      cellPadding: 3,
      lineColor: [226, 232, 240],
      lineWidth: 0.25,
    },
    margin: { left: 14, right: 14 },
  });

  // =============== TABELA DE EQUIPES ===============
  // @ts-ignore - lastAutoTable is injected by jspdf-autotable
  const finalY = (doc as any).lastAutoTable?.finalY ?? y + 20;

  if (finalY + 30 > doc.internal.pageSize.height) {
    doc.addPage();
  }

  const teamY = finalY + 15;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Resumo por Equipe', 14, teamY);

  const teamTableData = teams.map((team) => {
    const teamIncidents = incidents.filter((i) => i.teamId === team.id);
    const completed = teamIncidents.filter((i) => i.status === 'CONCLUIDO').length;
    const rate = teamIncidents.length > 0
      ? ((completed / teamIncidents.length) * 100).toFixed(1)
      : '0';
    return [
      team.name,
      String(team.members),
      team.vehicle || '—',
      String(teamIncidents.length),
      String(completed),
      `${rate}%`,
    ];
  });

  autoTable(doc, {
    startY: teamY + 5,
    head: [['Equipe', 'Membros', 'Veículo', 'Total', 'Concluídas', 'Taxa']],
    body: teamTableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [226, 232, 240],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      cellPadding: 3,
      lineColor: [226, 232, 240],
      lineWidth: 0.25,
    },
    margin: { left: 14, right: 14 },
  });

  // =============== RODAPÉ ===============
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Central de Operações — Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 8,
      { align: 'center' }
    );
  }

  // Download
  const filename = `relatorio-ocorrencias-${format(now, 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(filename);
  return filename;
}
