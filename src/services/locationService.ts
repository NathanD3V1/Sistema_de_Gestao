// src/services/locationService.ts

// Mapeamento de IDs de equipe para coordenadas base (fallback)
// Agora com coordenadas mais precisas de Salvador/BA
const TEAM_ID_MAP: Record<string, string> = {
  'eqp-1': 'Equipe A',
  'eqp-2': 'Equipe B',
  'eqp-3': 'Equipe C',
  'EQ-01': 'Equipe A',
  'EQ-02': 'Equipe B',
  'EQ-03': 'Equipe C',
};

// Coordenadas base para fallback por estado
// BA = Salvador, SP = São Paulo
// Agora com coordenadas mais precisas de bairros de Salvador
const STATE_LOCATIONS: Record<string, Record<string, [number, number]>> = {
  'BA': {  // Bahia - Salvador - Coordenadas reais de bairros
    'Equipe A': [-12.9356, -38.5311], // Pituba - centro de Salvador
    'Equipe B': [-12.9714, -38.5014], // Barra - orla
    'Equipe C': [-12.8934, -38.5047], // Rio Vermelho - orla
  },
  'SP': {  // São Paulo
    'Equipe A': [-23.561684, -46.655981], // Avenida Paulista, SP
    'Equipe B': [-23.550520, -46.633308], // Praça da Sé, SP
    'Equipe C': [-23.589136, -46.674991], // Itaim Bibi, SP
  },
};

// Estado padrão quando não especificado
const DEFAULT_STATE = 'BA';

// Cache em memória para evitar muitas requisições
let locationCache: Map<string, { data: any; timestamp: number }> = new Map();
const CACHE_TTL = 5000; // 5 segundos de cache

/**
 * Obtém informações da equipe incluindo o estado (BA/SP)
 */
async function getTeamInfo(teamId: string): Promise<{ state: string; name: string } | null> {
  try {
    const response = await fetch(`/api/teams?id=${teamId}`, {
      next: { revalidate: 0 }
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        const team = result.data;
        return {
          state: team.state || DEFAULT_STATE,
          name: team.name || teamId
        };
      }
    }
  } catch (error) {
    console.log(`   Erro ao buscar info da equipe:`, error);
  }
  return null;
}

/**
 * Obtém a localização atual da equipe.
 * Primeiro tenta buscar da API real, se não encontrar usa o fallback.
 */
export async function getTeamLocation(teamIdOrName: string): Promise<[number, number] | null> {
  // Normaliza o ID/nome da equipe
  const normalizedName = TEAM_ID_MAP[teamIdOrName] || teamIdOrName;
  
  console.log(`🔍 Buscando localização para: ${teamIdOrName} (normalizado: ${normalizedName})`);
  
  // Tenta buscar da API de localização (GPS real do app móvel)
  try {
    const apiUrl = `/api/teams/${teamIdOrName}/location`;
    console.log(`   URL da API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      next: { revalidate: 0 } // Sempre buscar fresco
    });
    
    console.log(`   Response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   Resultado da API:`, JSON.stringify(result));
      
      if (result.success && result.data && result.data.latitude && result.data.longitude) {
        const location = result.data;
        
        // Cache o resultado
        locationCache.set(teamIdOrName, {
          data: location,
          timestamp: Date.now()
        });
        
        console.log(`📍 GPS Real - Equipe ${teamIdOrName}:`, location.latitude, location.longitude);
        return [location.latitude, location.longitude];
      } else {
        console.log(`   API retornou mas sem dados válidos:`, result);
      }
    } else {
      console.log(`   API retornou erro: ${response.status}`);
    }
  } catch (apiError: any) {
    console.log(`   Erro na API:`, apiError.message || apiError);
  }

  // Fallback: busca informações da equipe para determinar o estado
  let teamState = DEFAULT_STATE;
  let teamName = normalizedName;
  
  // Tenta obter o estado da equipe
  const teamInfo = await getTeamInfo(teamIdOrName);
  if (teamInfo) {
    teamState = teamInfo.state || DEFAULT_STATE;
    teamName = teamInfo.name || normalizedName;
    console.log(`   Equipe ${teamName} - Estado: ${teamState}`);
  }
  
  // Fallback: retorna coordenadas base com pequeno ruído (simulação)
  // Usa as coordenadas do estado correto (BA = Salvador, SP = São Paulo)
  const stateCoords = STATE_LOCATIONS[teamState] || STATE_LOCATIONS[DEFAULT_STATE];
  const base = stateCoords[teamName] || stateCoords['Equipe A'] || [-12.9714, -38.5014];
  
  // Adiciona pequeno ruído para simular posição próxima
  const lat = base[0] + (Math.random() - 0.5) * 0.002;
  const lng = base[1] + (Math.random() - 0.5) * 0.002;
  
  console.log(`⚠️ Usando fallback para ${teamName} (${teamState}):`, lat, lng);
  
  return [lat, lng];
}

/**
 * Obtém dados completos de localização incluindo precisão, velocidade, etc.
 */
export async function getTeamLocationDetails(teamIdOrName: string): Promise<any | null> {
  // Verifica cache primeiro
  const cached = locationCache.get(teamIdOrName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const apiUrl = `/api/teams/${teamIdOrName}/location`;
    const response = await fetch(apiUrl);
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        locationCache.set(teamIdOrName, {
          data: result.data,
          timestamp: Date.now()
        });
        return result.data;
      }
    }
  } catch (apiError) {
    console.error('Erro ao buscar localização:', apiError);
  }

  return null;
}

/**
 * Obtém o histórico de localizações da equipe.
 */
export async function getTeamHistory(
  teamIdOrName: string, 
  limit: number = 100
): Promise<any[]> {
  try {
    const apiUrl = `/api/teams/${teamIdOrName}/history?limit=${limit}`;
    const response = await fetch(apiUrl);
    
    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        return result.data || [];
      }
    }
  } catch (apiError) {
    console.error('Erro ao buscar histórico:', apiError);
  }

  return [];
}

/**
 * Envia localização para a API (chamado pelo app móvel)
 */
export async function sendTeamLocation(
  teamId: string,
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    battery?: number;
  }
): Promise<boolean> {
  try {
    const response = await fetch(`/api/teams/${teamId}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(location),
    });

    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar localização:', error);
    return false;
  }
}

/**
 * Calcula distância entre dois pontos em km (fórmula de Haversine)
 */
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Estima tempo de chegada em minutos (assumindo velocidade média de 40 km/h em cidade)
 */
export function estimateArrivalTime(
  teamLat: number,
  teamLon: number,
  destLat: number,
  destLon: number
): number {
  const distance = calculateDistance(teamLat, teamLon, destLat, destLon);
  const avgSpeed = 40; // km/h em cidade
  const timeHours = distance / avgSpeed;
  return Math.round(timeHours * 60); // em minutos
}

