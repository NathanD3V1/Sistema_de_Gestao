/**
 * Tipos unificados para o banco de dados
 * Usados em toda a aplicação
 */

// ==================== INCIDENT ====================
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
  description?: string;
  address: string;
  priority: string;
  status: IncidentStatus;

  // Campos do banco
  companyId?: string;
  teamId?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  city?: string;
  state?: string;
  zipCode?: string;

  // Timestamps
  departedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
}

// ==================== TEAM ====================
export type TeamStatus = 'AVAILABLE' | 'ON_CALL' | 'IN_TRANSIT' | 'ON_SITE' | 'BUSY';

export interface Team {
  id: string;
  name: string;
  companyId: string;
  status: TeamStatus;
  location?: string;
  members?: number;
  vehicle?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== MESSAGE ====================
export interface Message {
  id: string;
  content: string;
  senderId: string;
  incidentId: string;
  createdAt: string;
  senderName?: string;
}

// ==================== STATUS HISTORY ====================
export interface StatusHistory {
  id: string;
  incidentId: string;
  status: IncidentStatus;
  timestamp: string;
  notes?: string;
}

// ==================== USER ====================
export type UserRole = 'ADMIN' | 'COMPANY_MANAGER' | 'TEAM_LEADER' | 'TEAM_MEMBER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string;
  teamId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== COMPANY ====================
export interface Company {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== LOCATION ====================
export interface TeamLocation {
  teamId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  battery: number | null;
  timestamp: string;
  source: string;
}

export interface LocationHistory {
  teamId: string;
  locations: TeamLocation[];
}

