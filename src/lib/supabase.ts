import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Credenciais do Supabase
// Hardcoded porque o .env.local não está sendo carregado pelo Next.js neste ambiente
// ============================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngofniiznjvmowbnpgja.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nb2ZuaWl6bmp2bW93Ym5wZ2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjkzMzIsImV4cCI6MjA4ODgwNTMzMn0.v0AtkEEmlLaHnw7Lys9zJWXAJmdSNAGQXQbNQXzAYKw';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nb2ZuaWl6bmp2bW93Ym5wZ2phIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIyOTMzMiwiZXhwIjoyMDg4ODA1MzMyfQ.8ELZeOLxAECXM2zCJSXJvUA6PkAXpAi1v4QFlvgGhI4';

console.log('🔗 Supabase URL:', SUPABASE_URL);

// Cliente Supabase para uso no frontend (usa a chave pública)
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Cliente admin para uso no backend (tem acesso total)
// Este cliente ignora RLS (Row Level Security)
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
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

