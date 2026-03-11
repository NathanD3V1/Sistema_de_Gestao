import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const LOCATION_DATA_DIR = path.join(process.cwd(), 'src', 'data', 'locations');

// GET - Obter histórico de localizações da equipe
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  const { searchParams } = new URL(request.url);
  
  // Parâmetros opcionais de filtragem
  const limit = parseInt(searchParams.get('limit') || '100');
  const from = searchParams.get('from'); // ISO date
  const to = searchParams.get('to'); // ISO date
  
  try {
    const historyFilePath = path.join(LOCATION_DATA_DIR, `${teamId}_history.json`);
    
    try {
      const data = await fs.readFile(historyFilePath, 'utf-8');
      let history = JSON.parse(data);

      // Filtrar por período se fornecido
      if (from || to) {
        history = history.filter((loc: any) => {
          const locTime = new Date(loc.timestamp).getTime();
          if (from && locTime < new Date(from).getTime()) return false;
          if (to && locTime > new Date(to).getTime()) return false;
          return true;
        });
      }

      // Limitar quantidade
      history = history.slice(0, limit);

      return NextResponse.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (fileError) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        message: 'Histórico não disponível'
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

