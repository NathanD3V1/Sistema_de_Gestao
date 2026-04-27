import { NextRequest, NextResponse } from 'next/server';
import { dbGetIncidentById, dbUpdateIncident } from '@/lib/db';
import { getTeamRanking, getSuggestedTeams, TeamScore } from '@/lib/autoAssign';

// Mock de equipes - em produção viria do banco
const mockTeams = [
  { id: 'eqp-1', name: 'Equipe A', status: 'AVAILABLE' as const, location: 'Zona Sul' },
  { id: 'eqp-2', name: 'Equipe B', status: 'BUSY' as const, location: 'Zona Norte' },
  { id: 'eqp-3', name: 'Equipe C', status: 'AVAILABLE' as const, location: 'Centro' },
];

// Função auxiliar para geocodificar endereço
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=br`,
      {
        headers: {
          'User-Agent': 'IncidentManagementSystem/1.0',
        },
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }
  } catch (error) {
    console.error('Erro na geocodificação:', error);
  }
  return null;
}

// POST - Auto-atribuir equipe para a ocorrência
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: incidentId } = params;
  
  try {
    // Buscar a ocorrência
    const incident = await dbGetIncidentById(incidentId);
    if (!incident) {
      return NextResponse.json(
        { success: false, error: 'Ocorrência não encontrada' },
        { status: 404 }
      );
    }

    // Se já tem equipe atribuída, retorna erro
    if (incident.teamId) {
      return NextResponse.json(
        { success: false, error: 'Ocorrência já possui equipe atribuída' },
        { status: 400 }
      );
    }

    // Geocodificar o endereço da ocorrência
    let incidentLocation = await geocodeAddress(incident.address);
    
    if (!incidentLocation) {
      // Fallback: usa coordenadas de São Paulo
      incidentLocation = { latitude: -23.550520, longitude: -46.633308 };
      console.warn('Endereço não geocodificado, usando coordenadas padrão');
    }

    // Converter priority do formato do sistema para o formato esperado
    const priorityMap: Record<string, 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'> = {
      'Baixa': 'LOW',
      'Normal': 'NORMAL',
      'Alta': 'HIGH',
      'Crítica': 'CRITICAL',
      'LOW': 'LOW',
      'NORMAL': 'NORMAL',
      'HIGH': 'HIGH',
      'CRITICAL': 'CRITICAL',
    };
    
    const priority = priorityMap[incident.priority] || 'NORMAL';

    // Obter ranking de equipes
    const ranking = await getTeamRanking(mockTeams, incidentLocation, priority);

    if (ranking.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Nenhuma equipe disponível para atribuição',
          suggestions: []
        },
        { status: 404 }
      );
    }

    // Obter a melhor equipe
    const bestTeam = ranking[0];

    // Atualizar a ocorrência com a equipe atribuída
    const updated = await dbUpdateIncident(incidentId, {
      teamId: bestTeam.team.id,
      status: 'PENDENTE',
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Erro ao atualizar ocorrência' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Equipe atribuída automaticamente',
      assignedTeam: {
        id: bestTeam.team.id,
        name: bestTeam.team.name,
        distance: bestTeam.distance,
        estimatedTime: bestTeam.estimatedTime,
      },
      ranking: ranking.slice(0, 5).map(ts => ({
        id: ts.team.id,
        name: ts.team.name,
        score: ts.score,
        distance: ts.distance,
        estimatedTime: ts.estimatedTime,
        reasons: ts.reasons,
      })),
    });
  } catch (error: any) {
    console.error('Erro na auto-atribuição:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET - Obter sugestões de equipes para a ocorrência (sem atribuir)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: incidentId } = params;
  const { searchParams } = new URL(request.url);
  
  // Parâmetros opcionais para filtrar sugestões
  const maxDistance = parseFloat(searchParams.get('maxDistance') || '50');
  const maxTime = parseFloat(searchParams.get('maxTime') || '120');
  
  try {
    // Buscar a ocorrência
    const incident = await dbGetIncidentById(incidentId);
    if (!incident) {
      return NextResponse.json(
        { success: false, error: 'Ocorrência não encontrada' },
        { status: 404 }
      );
    }

    // Geocodificar o endereço
    let incidentLocation = await geocodeAddress(incident.address);
    
    if (!incidentLocation) {
      incidentLocation = { latitude: -23.550520, longitude: -46.633308 };
    }

    // Converter priority
    const priorityMap: Record<string, 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'> = {
      'Baixa': 'LOW',
      'Normal': 'NORMAL',
      'Alta': 'HIGH',
      'Crítica': 'CRITICAL',
      'LOW': 'LOW',
      'NORMAL': 'NORMAL',
      'HIGH': 'HIGH',
      'CRITICAL': 'CRITICAL',
    };
    
    const priority = priorityMap[incident.priority] || 'NORMAL';

    // Obter ranking ou sugestões
    let suggestions: TeamScore[];
    
    if (maxDistance || maxTime) {
      suggestions = await getSuggestedTeams(
        mockTeams, 
        incidentLocation, 
        priority,
        maxDistance,
        maxTime
      );
    } else {
      suggestions = await getTeamRanking(mockTeams, incidentLocation, priority);
    }

    return NextResponse.json({
      success: true,
      incident: {
        id: incident.id,
        title: incident.title,
        address: incident.address,
        priority: incident.priority,
      },
      location: incidentLocation,
      suggestions: suggestions.map(ts => ({
        id: ts.team.id,
        name: ts.team.name,
        status: ts.team.status,
        score: ts.score,
        distance: ts.distance,
        estimatedTime: ts.estimatedTime,
        reasons: ts.reasons,
      })),
    });
  } catch (error: any) {
    console.error('Erro ao buscar sugestões:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

