import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const LOCATION_DATA_DIR = path.join(process.cwd(), 'src', 'data', 'locations');

// GET - Testar se os dados de localização estão sendo salvos
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId') || 'eqp-1';
  
  try {
    // Verificar arquivo de localização atual
    const locationFile = path.join(LOCATION_DATA_DIR, `${teamId}.json`);
    let currentLocation = null;
    
    try {
      const data = await fs.readFile(locationFile, 'utf-8');
      currentLocation = JSON.parse(data);
    } catch {
      currentLocation = null;
    }
    
    // Verificar arquivo de histórico
    const historyFile = path.join(LOCATION_DATA_DIR, `${teamId}_history.json`);
    let history = [];
    
    try {
      const historyData = await fs.readFile(historyFile, 'utf-8');
      history = JSON.parse(historyData);
    } catch {
      history = [];
    }
    
    // Listar todos os arquivos no diretório
    let allFiles: string[] = [];
    try {
      const files = await fs.readdir(LOCATION_DATA_DIR);
      allFiles = files;
    } catch {
      allFiles = [];
    }
    
    return NextResponse.json({
      success: true,
      teamId,
      currentLocation,
      historyCount: history.length,
      allFiles,
      dataDir: LOCATION_DATA_DIR
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Enviar localização de teste
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, latitude, longitude } = body;
    
    if (!teamId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: 'teamId, latitude e longitude são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Garantir que diretório existe
    try {
      await fs.access(LOCATION_DATA_DIR);
    } catch {
      await fs.mkdir(LOCATION_DATA_DIR, { recursive: true });
    }
    
    // Salvar localização
    const locationData = {
      teamId,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
      source: 'test_api'
    };
    
    const locationFile = path.join(LOCATION_DATA_DIR, `${teamId}.json`);
    await fs.writeFile(locationFile, JSON.stringify(locationData, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      message: 'Localização de teste salva',
      data: locationData
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

