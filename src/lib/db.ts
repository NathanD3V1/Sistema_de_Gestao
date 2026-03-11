/**
 * Camada de abstração do banco de dados
 * Suporta tanto JSON (desenvolvimento local) quanto Supabase (produção)
 * 
 * Configure USE_SUPABASE=true no .env.local para usar Supabase
 */

import { supabaseAdmin } from './supabase';
import { 
  getAllIncidents, 
  getIncidentById, 
  getIncidentsByTeam, 
  createIncident, 
  patchIncident, 
  updateIncidentStatus,
  deleteIncident,
  Incident as IncidentJson,
  IncidentStatus as IncidentStatusJson
} from './incidentStore';

import { 
  getAllTeams, 
  getTeamById, 
  createTeam, 
  updateTeam, 
  deleteTeam,
  Team as TeamJson
} from './teamStore';

// Determina qual backend usar
const USE_SUPABASE = process.env.USE_SUPABASE === 'true';

/**
 * ==================== INCIDENTS ====================
 */

// GET - Listar todas as ocorrências ou filtrar por equipe
export async function dbGetIncidents(teamId?: string): Promise<IncidentJson[]> {
  if (USE_SUPABASE) {
    let query = supabaseAdmin.from('incident').select('*').order('updated_at', { ascending: false });
    
    if (teamId) {
      // Converter teamId do formato frontend (eqp-1) para UUID do banco
      const dbTeamId = convertTeamIdToDb(teamId);
      console.log('🔍 dbGetIncidents - Filtrando por teamId:', teamId, '-> UUID:', dbTeamId);
      query = query.eq('team_id', dbTeamId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }
    
    // Converter para formato do app (mapeia status em inglês para português)
    return (data || []).map(convertDbIncidentToJson);
  }
  
  // Fallback para JSON
  return teamId ? getIncidentsByTeam(teamId) : getAllIncidents();
}

// GET - Obter uma ocorrência pelo ID
export async function dbGetIncidentById(id: string): Promise<IncidentJson | null> {
  if (USE_SUPABASE) {
    const { data, error } = await supabaseAdmin
      .from('incident')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }
    
    return convertDbIncidentToJson(data);
  }
  
  return getIncidentById(id);
}

// POST - Criar ocorrência
export async function dbCreateIncident(incident: any): Promise<IncidentJson> {
  if (USE_SUPABASE) {
    // Converte status de português para inglês
    const statusMap: Record<string, string> = {
      'PENDENTE': 'PENDING',
      'EM_TRANSITO': 'DEPARTED',
      'NO_LOCAL': 'ARRIVED',
      'EM_EXECUCAO': 'EVALUATING',
      'CONCLUIDO': 'COMPLETED',
    };
    
    // Converte teamId e companyId do formato frontend para UUID do banco
    // Usa toUuidString para garantir que são tratados como strings, não números
    const dbCompanyId = toUuidString(incident.companyId || 'default', 'company_id');
    const dbTeamId = incident.teamId ? toUuidString(incident.teamId, 'team_id') : null;
    
    console.log('🔍 dbCreateIncident - company_id:', dbCompanyId, 'team_id:', dbTeamId);
    
    const dbIncident = {
      id: incident.id,
      title: incident.title,
      description: incident.description || '',
      priority: incident.priority || 'NORMAL',
      status: statusMap[incident.status] || incident.status || 'PENDING',
      company_id: dbCompanyId,
      team_id: dbTeamId,
      client_name: incident.clientName || 'Cliente',
      client_phone: incident.clientPhone || null,
      client_email: incident.clientEmail || null,
      address: incident.address,
      city: incident.city || 'Salvador',
      state: incident.state || 'BA',
      zip_code: incident.zipCode || null,
      departed_at: incident.departedAt || null,
      arrived_at: incident.arrivedAt || null,
      started_at: incident.startedAt || null,
      finished_at: incident.finishedAt || null,
    };
    
    const { data, error } = await supabaseAdmin
      .from('incident')
      .insert(dbIncident)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }
    
    return convertDbIncidentToJson(data);
  }
  
  return createIncident(incident);
}

// PATCH - Atualizar ocorrência
export async function dbUpdateIncident(id: string, data: any): Promise<IncidentJson | null> {
  if (USE_SUPABASE) {
    // Converte status de português para inglês
    const statusMap: Record<string, string> = {
      'PENDENTE': 'PENDING',
      'EM_TRANSITO': 'DEPARTED',
      'NO_LOCAL': 'ARRIVED',
      'EM_EXECUCAO': 'EVALUATING',
      'CONCLUIDO': 'COMPLETED',
    };
    
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = statusMap[data.status] || data.status;
    if (data.teamId !== undefined) updateData.team_id = convertTeamIdToDb(data.teamId);
    if (data.clientName !== undefined) updateData.client_name = data.clientName;
    if (data.clientPhone !== undefined) updateData.client_phone = data.clientPhone;
    if (data.clientEmail !== undefined) updateData.client_email = data.clientEmail;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.zipCode !== undefined) updateData.zip_code = data.zipCode;
    
    const { data: result, error } = await supabaseAdmin
      .from('incident')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }
    
    return convertDbIncidentToJson(result);
  }
  
  return patchIncident(id, data);
}

// PUT - Atualizar status
export async function dbUpdateIncidentStatus(id: string, status: string): Promise<IncidentJson | null> {
  if (USE_SUPABASE) {
    // Converte status de português para inglês
    const statusMap: Record<string, string> = {
      'PENDENTE': 'PENDING',
      'EM_TRANSITO': 'DEPARTED',
      'NO_LOCAL': 'ARRIVED',
      'EM_EXECUCAO': 'EVALUATING',
      'CONCLUIDO': 'COMPLETED',
    };
    
    const dbStatus = statusMap[status] || status;
    const now = new Date().toISOString();
    
    // Mapeamento de status para campos de timestamp
    const timestampFields: Record<string, { field: string; value: string }> = {
      'DEPARTED': { field: 'departed_at', value: now },
      'EM_TRANSITO': { field: 'departed_at', value: now },
      'ARRIVED': { field: 'arrived_at', value: now },
      'NO_LOCAL': { field: 'arrived_at', value: now },
      'EVALUATING': { field: 'started_at', value: now },
      'EM_EXECUCAO': { field: 'started_at', value: now },
      'COMPLETED': { field: 'finished_at', value: now },
      'CONCLUIDO': { field: 'finished_at', value: now },
    };
    
    const updateData: any = { 
      status: dbStatus,
      updated_at: now 
    };
    
    if (timestampFields[status]) {
      updateData[timestampFields[status].field] = timestampFields[status].value;
    }
    
    const { data, error } = await supabaseAdmin
      .from('incident')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }
    
    // Criar registro no histórico de status
    await supabaseAdmin.from('status_history').insert({
      incident_id: id,
      status: dbStatus,
      timestamp: now,
    });
    
    return convertDbIncidentToJson(data);
  }
  
  return updateIncidentStatus(id, status as IncidentStatusJson);
}

// DELETE - Excluir ocorrência
export async function dbDeleteIncident(id: string): Promise<boolean> {
  if (USE_SUPABASE) {
    const { error } = await supabaseAdmin
      .from('incident')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }
    
    return true;
  }
  
  return deleteIncident(id);
}

/**
 * ==================== TEAMS ====================
 */

// GET - Listar todas as equipes ou filtrar
export async function dbGetTeams(status?: string): Promise<TeamJson[]> {
  if (USE_SUPABASE) {
    let query = supabaseAdmin.from('team').select('*').order('name');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }
    
    return (data || []).map(convertDbTeamToJson);
  }
  
  // Fallback para JSON
  return getAllTeams();
}

// GET - Obter equipe pelo ID
export async function dbGetTeamById(id: string): Promise<TeamJson | null> {
  if (USE_SUPABASE) {
    const { data, error } = await supabaseAdmin
      .from('team')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }
    
    return convertDbTeamToJson(data);
  }
  
  return getTeamById(id);
}

// POST - Criar equipe
export async function dbCreateTeam(team: any): Promise<TeamJson> {
  if (USE_SUPABASE) {
    // Garante que company_id seja um UUID válido
    const dbCompanyId = toUuidString(team.companyId || 'default', 'company_id');
    
    console.log('🔍 dbCreateTeam - id:', team.id, 'company_id:', dbCompanyId);
    
    const dbTeam = {
      id: team.id,
      name: team.name,
      company_id: dbCompanyId,
      status: team.status || 'AVAILABLE',
      location: team.location || null,
    };
    
    const { data, error } = await supabaseAdmin
      .from('team')
      .insert(dbTeam)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }
    
    return convertDbTeamToJson(data);
  }
  
  return createTeam(team);
}

// PATCH - Atualizar equipe
export async function dbUpdateTeam(id: string, data: any): Promise<TeamJson | null> {
  if (USE_SUPABASE) {
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.location !== undefined) updateData.location = data.location;
    
    const { data: result, error } = await supabaseAdmin
      .from('team')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }
    
    return convertDbTeamToJson(result);
  }
  
  return updateTeam(id, data);
}

// DELETE - Excluir equipe
export async function dbDeleteTeam(id: string): Promise<boolean> {
  if (USE_SUPABASE) {
    const { error } = await supabaseAdmin
      .from('team')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }
    
    return true;
  }
  
  return deleteTeam(id);
}

/**
 * ==================== MESSAGES ====================
 */

// GET - Listar mensagens de uma ocorrência
export async function dbGetMessages(incidentId: string): Promise<any[]> {
  if (USE_SUPABASE) {
    const { data, error } = await supabaseAdmin
      .from('message')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  }
  
  return [];
}

// POST - Criar mensagem
export async function dbCreateMessage(message: any): Promise<any> {
  if (USE_SUPABASE) {
    const { data, error } = await supabaseAdmin
      .from('message')
      .insert(message)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message);
    }
    
    return data;
  }
  
  throw new Error('Mensagens via JSON não implementado');
}

/**
 * ==================== HELPER FUNCTIONS ====================
 */

// Mapeamento de IDs de equipes do frontend para UUIDs do banco
// Frontend usa "eqp-1", "eqp-2", "eqp-3" mas o banco usa UUID
const TEAM_ID_MAP: Record<string, string> = {
  'eqp-1': '00000000-0000-0000-0000-000000000001',
  'eqp-2': '00000000-0000-0000-0000-000000000002',
  'eqp-3': '00000000-0000-0000-0000-000000000003',
};

// Mapeamento de companyId do frontend para UUID do banco
// Única empresa: NeoEnergia
const COMPANY_ID_MAP: Record<string, string> = {
  'neoenergia': '00000000-0000-0000-0000-000000000001',
  'default': '00000000-0000-0000-0000-000000000001',
};

/**
 * Converte ID de empresa do formato do frontend para UUID do banco
 * @param companyId - ID da empresa
 * @returns UUID do banco
 */
export function convertCompanyIdToDb(companyId: string | null | undefined): string {
  if (!companyId) return '00000000-0000-0000-0000-000000000001';
  // Se já for UUID válido, retorna como está
  if (companyId.includes('-') && companyId.length > 10) return companyId;
  // Mapeia ID legacy para UUID
  return COMPANY_ID_MAP[companyId.toLowerCase()] || '00000000-0000-0000-0000-000000000001';
}

/**
 * Converte ID de equipe do formato do frontend para UUID do banco
 * @param teamId - ID da equipe (ex: "eqp-1")
 * @returns UUID do banco ou null se não encontrado
 */
export function convertTeamIdToDb(teamId: string | null | undefined): string | null {
  if (!teamId) return null;
  // Se já for UUID válido, retorna como está
  if (teamId.includes('-') && teamId.length > 10) return teamId;
  // Mapeia ID legacy para UUID
  return TEAM_ID_MAP[teamId] || teamId;
}

/**
 * Garante que um valor seja tratado como string para o Supabase
 * Evita conversão automática para números que causa o erro BIGINT
 */
function toUuidString(value: any, fieldName: string): string {
  if (value === null || value === undefined) {
    console.error(`Null value for ${fieldName}`);
    return '00000000-0000-0000-0000-000000000001';
  }
  
  const stringValue = String(value);
  
  // Verifica se é um UUID válido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(stringValue)) {
    console.warn(`${fieldName} is not a valid UUID: ${stringValue}, attempting to map...`);
    
    // Tenta usar o mapeamento
    if (fieldName === 'team_id') {
      const mapped = convertTeamIdToDb(stringValue);
      if (mapped) return mapped;
    }
    
    if (fieldName === 'company_id') {
      return convertCompanyIdToDb(stringValue);
    }
    
    return stringValue;
  }
  
  return stringValue;
}

/**
 * Converte UUID do banco para ID do frontend
 * @param dbId - UUID do banco
 * @returns ID do frontend (ex: "eqp-1") ou o ID original se não mapeado
 */
export function convertDbIdToFrontend(dbId: string | null | undefined): string {
  if (!dbId) return '';
  // Inverte o mapeamento
  const reverseMap: Record<string, string> = Object.entries(TEAM_ID_MAP).reduce(
    (acc, [key, value]) => ({ ...acc, [value]: key }),
    {}
  );
  return reverseMap[dbId] || dbId;
}

// Converter incidente do banco (inglês) para JSON (português)
function convertDbIncidentToJson(db: any): IncidentJson {
  // Mapeia status de inglês para português
  const statusMap: Record<string, string> = {
    'PENDING': 'PENDENTE',
    'ASSIGNED': 'PENDENTE',
    'DEPARTED': 'EM_TRANSITO',
    'ARRIVED': 'NO_LOCAL',
    'EVALUATING': 'EM_EXECUCAO',
    'REPAIRING': 'EM_EXECUCAO',
    'COMPLETED': 'CONCLUIDO',
    'CANCELLED': 'PENDENTE',
  };
  
  return {
    id: db.id,
    teamId: convertDbIdToFrontend(db.team_id) || '',
    title: db.title,
    address: db.address,
    priority: db.priority,
    status: statusMap[db.status] || db.status || 'PENDENTE',
    departedAt: db.departed_at,
    arrivedAt: db.arrived_at,
    startedAt: db.started_at,
    finishedAt: db.finished_at,
    updatedAt: db.updated_at,
  };
}

// Converter equipe do banco para JSON
function convertDbTeamToJson(db: any): TeamJson {
  return {
    id: db.id,
    name: db.name,
    companyId: db.company_id,
    status: db.status,
    location: db.location,
  };
}

