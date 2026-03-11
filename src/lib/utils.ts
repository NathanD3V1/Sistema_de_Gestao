// Utilitários para cores e labels de status
export const statusConfig = {
  PENDING: { label: 'Pendente', color: 'bg-gray-100', textColor: 'text-gray-700' },
  ASSIGNED: { label: 'Atribuída', color: 'bg-blue-100', textColor: 'text-blue-700' },
  DEPARTED: { label: 'Saiu', color: 'bg-yellow-100', textColor: 'text-yellow-700' },
  ARRIVED: { label: 'Chegou', color: 'bg-blue-100', textColor: 'text-blue-700' },
  EVALUATING: { label: 'Avaliando', color: 'bg-orange-100', textColor: 'text-orange-700' },
  REPAIRING: { label: 'Reparando', color: 'bg-purple-100', textColor: 'text-purple-700' },
  COMPLETED: { label: 'Concluída', color: 'bg-green-100', textColor: 'text-green-700' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100', textColor: 'text-red-700' },
};

export const priorityConfig = {
  LOW: { label: 'Baixa', color: 'bg-green-100', textColor: 'text-green-700' },
  NORMAL: { label: 'Normal', color: 'bg-blue-100', textColor: 'text-blue-700' },
  HIGH: { label: 'Alta', color: 'bg-orange-100', textColor: 'text-orange-700' },
  CRITICAL: { label: 'Crítica', color: 'bg-red-100', textColor: 'text-red-700' },
};

export const teamStatusConfig = {
  AVAILABLE: { label: 'Disponível', color: 'bg-green-100', textColor: 'text-green-700' },
  ON_CALL: { label: 'Em Alerta', color: 'bg-yellow-100', textColor: 'text-yellow-700' },
  IN_TRANSIT: { label: 'Em Trânsito', color: 'bg-blue-100', textColor: 'text-blue-700' },
  ON_SITE: { label: 'No Local', color: 'bg-purple-100', textColor: 'text-purple-700' },
  BUSY: { label: 'Ocupada', color: 'bg-red-100', textColor: 'text-red-700' },
};

// Formatação de datas
export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Validação de email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validação de CNPJ
export const isValidCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  return cleanCNPJ.length === 14;
};

// Gerar ID único
export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
