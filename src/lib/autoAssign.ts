// src/lib/autoAssign.ts

import { getTeamLocation, calculateDistance, estimateArrivalTime } from '@/services/locationService';

// Tipos
export type IncidentPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface IncidentLocation {
  latitude: number;
  longitude: number;
}

export interface Team {
  id: string;
  name: string;
  status: 'AVAILABLE' | 'ON_CALL' | 'IN_TRANSIT' | 'ON_SITE' | 'BUSY';
  location?: string;
}

export interface TeamScore {
  team: Team;
  distance: number; // em km
  estimatedTime: number; // em minutos
  score: number; // score final (quanto menor, melhor)
  reasons: string[];
}

/**
 * Verifica se uma equipe está disponível para receber uma ocorrência
 */
export function isTeamAvailable(team: Team): boolean {
  return team.status === 'AVAILABLE' || team.status === 'ON_CALL';
}

/**
 * Obtém a prioridade numérica para cálculos (1 = lowest, 4 = highest)
 */
export function getPriorityValue(priority: IncidentPriority): number {
  const values: Record<IncidentPriority, number> = {
    'LOW': 1,
    'NORMAL': 2,
    'HIGH': 3,
    'CRITICAL': 4
  };
  return values[priority];
}

/**
 * Calcula o score de uma equipe para uma determinada ocorrência.
 * 
 * Fatores considerados (com pesos):
 * - Distância: 40% (equipe mais próxima é melhor)
 * - Tempo estimado: 30% (chegada mais rápida é melhor)
 * - Status da equipe: 20% (AVAILABLE é melhor que ON_CALL)
 * - Prioridade: 10% (ocorrências críticas podem priorizar equipes mais distantes)
 * 
 * Score menor = melhor escolha
 */
export async function calculateTeamScore(
  team: Team,
  incidentLocation: IncidentLocation,
  incidentPriority: IncidentPriority
): Promise<TeamScore> {
  const reasons: string[] = [];
  
  // Buscar localização atual da equipe
  let teamLocation = { latitude: 0, longitude: 0 };
  
  try {
    const location = await getTeamLocation(team.id);
    if (location) {
      teamLocation = { latitude: location[0], longitude: location[1] };
    }
  } catch (error) {
    console.error(`Erro ao buscar localização da equipe ${team.id}:`, error);
  }

  // Calcular distância
  const distance = calculateDistance(
    teamLocation.latitude,
    teamLocation.longitude,
    incidentLocation.latitude,
    incidentLocation.longitude
  );

  // Estimar tempo de chegada
  const estimatedTime = estimateArrivalTime(
    teamLocation.latitude,
    teamLocation.longitude,
    incidentLocation.latitude,
    incidentLocation.longitude
  );

  // Calcular score (quanto menor, melhor)
  // Normalização: distância em km, tempo em minutos
  
  // Peso da distância: 40%
  const distanceScore = distance * 1.0;
  
  // Peso do tempo: 30%
  const timeScore = estimatedTime * 0.5;
  
  // Peso do status: 20%
  const statusScore = team.status === 'AVAILABLE' ? 0 : 10; // Penaliza ON_CALL
  
  // Peso da prioridade: 10% (prioridades altas podem aceitar equipes mais distantes)
  const priorityValue = getPriorityValue(incidentPriority);
  const priorityBonus = priorityValue * 2; // Maior prioridade = aceita distância maior
  
  const totalScore = distanceScore + timeScore + statusScore - priorityBonus;

  // Gerar razões
  if (distance < 2) {
    reasons.push('✅ Muito próxima do local');
  } else if (distance < 5) {
    reasons.push('✅ Próxima do local');
  } else if (distance < 10) {
    reasons.push('⚠️ Distância moderada');
  } else {
    reasons.push('❌ Distante do local');
  }

  if (estimatedTime < 15) {
    reasons.push('⏱️ Chegada rápida (< 15 min)');
  } else if (estimatedTime < 30) {
    reasons.push('⏱️ Tempo de chegada razoável');
  } else {
    reasons.push('⏱️ Tempo de chegada longo');
  }

  if (team.status === 'AVAILABLE') {
    reasons.push('📌 Equipe disponível');
  } else {
    reasons.push('📌 Equipe em chamada');
  }

  return {
    team,
    distance: Math.round(distance * 100) / 100,
    estimatedTime,
    score: Math.round(totalScore * 100) / 100,
    reasons
  };
}

/**
 * Encontra a melhor equipe para uma ocorrência.
 * Retorna null se nenhuma equipe estiver disponível.
 */
export async function findBestTeam(
  teams: Team[],
  incidentLocation: IncidentLocation,
  incidentPriority: IncidentPriority
): Promise<TeamScore | null> {
  // Filtrar apenas equipes disponíveis
  const availableTeams = teams.filter(isTeamAvailable);
  
  if (availableTeams.length === 0) {
    console.log('Nenhuma equipe disponível para atribuição');
    return null;
  }

  // Calcular score para cada equipe
  const scoredTeams = await Promise.all(
    availableTeams.map(team => calculateTeamScore(team, incidentLocation, incidentPriority))
  );

  // Ordenar por score (menor = melhor)
  scoredTeams.sort((a, b) => a.score - b.score);

  // Retornar a melhor opção
  return scoredTeams[0] || null;
}

/**
 * Retorna um ranking de todas as equipes para uma ocorrência.
 * Útil para mostrar sugestões ao usuário.
 */
export async function getTeamRanking(
  teams: Team[],
  incidentLocation: IncidentLocation,
  incidentPriority: IncidentPriority
): Promise<TeamScore[]> {
  // Filtrar apenas equipes disponíveis
  const availableTeams = teams.filter(isTeamAvailable);

  // Calcular score para cada equipe
  const scoredTeams = await Promise.all(
    availableTeams.map(team => calculateTeamScore(team, incidentLocation, incidentPriority))
  );

  // Ordenar por score (menor = melhor)
  scoredTeams.sort((a, b) => a.score - b.score);

  return scoredTeams;
}

/**
 * Sugere equipes baseado em critérios flexíveis.
 * Útil para quando a melhor equipe não está disponível.
 */
export async function getSuggestedTeams(
  teams: Team[],
  incidentLocation: IncidentLocation,
  incidentPriority: IncidentPriority,
  maxDistance: number = 50, // km
  maxTime: number = 120 // minutos
): Promise<TeamScore[]> {
  const ranking = await getTeamRanking(teams, incidentLocation, incidentPriority);
  
  // Filtrar por critérios
  return ranking.filter(
    ts => ts.distance <= maxDistance && ts.estimatedTime <= maxTime
  );
}

/**
 * Atribui automaticamente a melhor equipe para uma ocorrência.
 * Versão simplificada que retorna apenas o ID da equipe.
 */
export async function autoAssignTeam(
  teams: Team[],
  incidentLocation: IncidentLocation,
  incidentPriority: IncidentPriority
): Promise<string | null> {
  const best = await findBestTeam(teams, incidentLocation, incidentPriority);
  return best?.team.id || null;
}

