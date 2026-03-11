// Tipos de Usuários
export type UserRole = 'ADMIN' | 'COMPANY_MANAGER' | 'TEAM_LEADER' | 'TEAM_MEMBER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string;
  teamId?: string;
}

// Tipos de Empresa
export interface Company {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
}

// Tipos de Equipe
export type TeamStatus = 'AVAILABLE' | 'ON_CALL' | 'IN_TRANSIT' | 'ON_SITE' | 'BUSY';

export interface Team {
  id: string;
  name: string;
  companyId: string;
  status: TeamStatus;
  location?: string;
  members?: User[];
}

// Tipos de Ocorrência
export type IncidentStatus = 
  | 'PENDING' 
  | 'ASSIGNED' 
  | 'DEPARTED' 
  | 'ARRIVED' 
  | 'EVALUATING' 
  | 'REPAIRING' 
  | 'COMPLETED' 
  | 'CANCELLED';

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface Incident {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: IncidentStatus;
  companyId: string;
  teamId?: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tipos de Status History
export interface StatusHistory {
  id: string;
  incidentId: string;
  status: IncidentStatus;
  timestamp: Date;
  notes?: string;
}

// Tipos de Chat/Mensagens
export interface Message {
  id: string;
  content: string;
  senderId: string;
  incidentId: string;
  createdAt: Date;
  sender?: User;
}

// Resposta de API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
