import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cliente Supabase para uso no frontend (usa a chave pública)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'
);

// Cliente admin para uso no backend (tem acesso total)
// Este cliente ignora RLS (Row Level Security)
export const supabaseAdmin: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    // Configurações globais para evitar conversão automática de tipos
    // que pode causar erros como "invalid input syntax for type bigint"
    global: {
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    },
  }
);

/**
 * Tipos TypeScript para as tabelas do banco
 * Estes devem corresponder ao schema do Prisma
 */

export type DbIncident = {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'ASSIGNED' | 'DEPARTED' | 'ARRIVED' | 'EVALUATING' | 'REPAIRING' | 'COMPLETED' | 'CANCELLED';
  companyId: string;
  teamId: string | null;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DbTeam = {
  id: string;
  name: string;
  companyId: string;
  status: 'AVAILABLE' | 'ON_CALL' | 'IN_TRANSIT' | 'ON_SITE' | 'BUSY';
  location: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DbMessage = {
  id: string;
  content: string;
  senderId: string;
  incidentId: string;
  createdAt: string;
};

export type DbStatusHistory = {
  id: string;
  incidentId: string;
  status: string;
  timestamp: string;
  notes: string | null;
};

export type DbUser = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'COMPANY_MANAGER' | 'TEAM_LEADER' | 'TEAM_MEMBER';
  companyId: string | null;
  teamId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DbCompany = {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Função helper para configurar realtime em uma tabela
 */
export function subscribeToTable<T>(
  tableName: string,
  callback: (payload: { eventType: string; new: T; old: T }) => void
) {
  return supabase
    .channel(`public:${tableName}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName,
      },
      (payload) => callback(payload as any)
    )
    .subscribe();
}

/**
 * Função para configurar realtime de incidents
 */
export function subscribeToIncidents(
  callback: (payload: { eventType: string; new: DbIncident; old: DbIncident }) => void
) {
  return subscribeToTable<DbIncident>('incident', callback);
}

/**
 * Função para configurar realtime de teams
 */
export function subscribeToTeams(
  callback: (payload: { eventType: string; new: DbTeam; old: DbTeam }) => void
) {
  return subscribeToTable<DbTeam>('team', callback);
}

/**
 * Função para configurar realtime de messages
 */
export function subscribeToMessages(
  callback: (payload: { eventType: string; new: DbMessage; old: DbMessage }) => void
) {
  return subscribeToTable<DbMessage>('message', callback);
}

