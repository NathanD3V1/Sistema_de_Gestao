import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const LOCATION_DATA_DIR = path.join(process.cwd(), 'src', 'data', 'locations');

// Garante que o diretório existe
async function ensureDir() {
  try {
    await fs.access(LOCATION_DATA_DIR);
  } catch {
    await fs.mkdir(LOCATION_DATA_DIR, { recursive: true });
  }
}

// Arquivo para armazenar localização atual
function getLocationFile(teamId: string) {
  return path.join(LOCATION_DATA_DIR, `${teamId}.json`);
}

// Arquivo para histórico de localizações
function getHistoryFile(teamId: string) {
  return path.join(LOCATION_DATA_DIR, `${teamId}_history.json`);
}

// GET - Obter localização atual da equipe
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  
  console.log(`📍 GET location para equipe: ${teamId}`);
  
  try {
    await ensureDir();
    const filePath = getLocationFile(teamId);
    console.log(`   Arquivo: ${filePath}`);
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const location = JSON.parse(data);
      console.log(`   Dados encontrados:`, location);
      return NextResponse.json({
        success: true,
        data: location
      });
    } catch (fileError) {
      // Se arquivo não existe, retorna null
      console.log(`   Arquivo não encontrado, retornando null`);
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Localização não disponível'
      });
    }
  } catch (error: any) {
    console.error(`   Erro:`, error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Atualizar localização da equipe
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  
  console.log(`📍 POST location para equipe: ${teamId}`);
  
  try {
    const body = await request.json();
    console.log(`   Body recebido:`, body);
    
    const { latitude, longitude, accuracy, speed, heading, battery } = body;

    // Validação básica
    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: 'Latitude e longitude são obrigatórios' },
        { status: 400 }
      );
    }

    // Valida se são números válidos
    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { success: false, error: 'Coordenadas inválidas' },
        { status: 400 }
      );
    }

    await ensureDir();
    const now = new Date().toISOString();

    // Salvar localização atual
    const locationData = {
      teamId,
      latitude: parseFloat(latitude.toFixed(6)),
      longitude: parseFloat(longitude.toFixed(6)),
      accuracy: accuracy ? parseFloat(accuracy.toFixed(2)) : null,
      speed: speed ? parseFloat(speed.toFixed(2)) : null,
      heading: heading ? parseFloat(heading.toFixed(2)) : null,
      battery: battery ? parseInt(battery) : null,
      timestamp: now,
      source: 'mobile_app' // Indica que veio do app móvel
    };

    await fs.writeFile(
      getLocationFile(teamId),
      JSON.stringify(locationData, null, 2),
      'utf-8'
    );
    
    console.log(`   Localização salva:`, locationData);

    // Adicionar ao histórico (mantém últimas 1000 localizações)
    try {
      const historyFilePath = getHistoryFile(teamId);
      let history: any[] = [];
      
      try {
        const historyData = await fs.readFile(historyFilePath, 'utf-8');
        history = JSON.parse(historyData);
      } catch {
        // Histórico não existe ainda
      }

      // Adiciona nova localização no início
      history.unshift(locationData);

      // Mantém apenas as últimas 1000 localizações (aproximadamente 2.7 horas a cada 10 segundos)
      if (history.length > 1000) {
        history = history.slice(0, 1000);
      }

      await fs.writeFile(
        historyFilePath,
        JSON.stringify(history, null, 2),
        'utf-8'
      );
    } catch (historyError) {
      console.error('Erro ao salvar histórico:', historyError);
    }

    return NextResponse.json({
      success: true,
      data: locationData,
      message: 'Localização atualizada com sucesso'
    });
  } catch (error: any) {
    console.error(`   Erro:`, error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

